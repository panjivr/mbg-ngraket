import os
import base64
import uuid

# Paths and DeepFace env must be set before importing DeepFace (it resolves weights at import).
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_deepface_home = (os.environ.get("DEEPFACE_HOME") or "").strip() or os.path.join(_APP_DIR, "weights")
os.environ["DEEPFACE_HOME"] = _deepface_home
os.makedirs(os.path.join(_deepface_home, ".deepface", "weights"), exist_ok=True)
# DeepFace still uses ~/.deepface on some code paths; align HOME to a writable tree under DEEPFACE_HOME.
os.environ["HOME"] = _deepface_home

import numpy as np
import cv2
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import logging

from deepface.modules.exceptions import FaceNotDetected

# Do NOT import deepface at module load — TensorFlow init blocks for minutes and breaks Azure
# multi-container startup (health / port not open in time). Import on first use instead.
_deepface = None

def get_deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace as _D
        _deepface = _D
    return _deepface

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face_api")

app = FastAPI(title="MBG Face Recognition API")

FACES_DB_PATH = os.path.join(_APP_DIR, "storage", "faces")
_TMP_DIR = os.path.join(_APP_DIR, "tmp")
for _d in (FACES_DB_PATH, _TMP_DIR):
    os.makedirs(_d, exist_ok=True)

class RecognitionResponse(BaseModel):
    staff_id: str
    distance: float
    verified: bool

# Decode-side cap (client may send up to this; larger images are shrunk before DeepFace — saves CPU).
# Default 720: sedikit lebih detail dari 640 untuk crop wajah, dampak waktu kecil vs akurasi.
_FACE_DECODE_MAX_DIM = int(os.environ.get("FACE_DECODE_MAX_DIM", "720"))

def decode_image(data_url: str):
    try:
        if "," in data_url:
            header, encoded = data_url.split(",", 1)
        else:
            encoded = data_url
        
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            h, w = img.shape[:2]
            max_dim = max(320, min(_FACE_DECODE_MAX_DIM, 1024))
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                logger.info(f"Resized image for performance: {w}x{h} -> {img.shape[1]}x{img.shape[0]}")
        
        return img
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        return None

import asyncio

# Global lock to prevent concurrent write operations on DeepFace cache (pkl files)
# and avoid "data A identified as B" during simultaneous registration.
face_lock = asyncio.Lock()

def get_tenant_db_path(tenant_id: str):
    # Sanitize tenant_id just in case
    safe_tid = "".join([c for c in tenant_id if c.isalnum() or c in ("-", "_")]).strip()
    path = os.path.join(FACES_DB_PATH, safe_tid)
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path

# Precision and Performance Toggles
# VGG-Face cosine: ~0.71 default — sedikit lebih longgar dari 0.65 untuk recall foto HP/cahaya buruk,
# tanpa ganti model (Facenet512 lebih akurat tapi find() jelas lebih lambat pada galeri besar).
DEFAULT_MODEL_THRESHOLDS_COSINE = {
    "VGG-Face": 0.71,
    "Facenet": 0.40,
    "Facenet512": 0.30,
    "ArcFace": 0.68,
    "DeepFace": 0.23,
    "SFace": 0.593,
    "GhostFaceNet": 0.65,
    "OpenFace": 0.10,
}

MODEL_NAME = (os.environ.get("FACE_MODEL_NAME", "VGG-Face") or "VGG-Face").strip()
_th_raw = (os.environ.get("FACE_MATCH_THRESHOLD", "") or "").strip()
THRESHOLD = float(_th_raw) if _th_raw else float(DEFAULT_MODEL_THRESHOLDS_COSINE.get(MODEL_NAME, 0.71))

# Registration: accurate detector (angles/lighting). Recognize: optional faster detector (env) to cut latency on HP.
DETECTOR_BACKEND = (os.environ.get("FACE_DETECTOR_BACKEND", "retinaface") or "retinaface").strip()
DETECTOR_RECOGNIZE = (
    os.environ.get("FACE_RECOGNIZE_DETECTOR_BACKEND", DETECTOR_BACKEND) or DETECTOR_BACKEND
).strip()
# Default opencv sama produksi Azure — tanpa ini adaptive fallback tidak pernah jalan (semua "tidak cocok" saat retinaface lemah).
FACE_RECOGNIZE_DETECTOR_FALLBACK = (os.environ.get("FACE_RECOGNIZE_DETECTOR_FALLBACK", "opencv") or "").strip()
DISTANCE_METRIC = "cosine"
# Jarak ke runner-up: default 0.017 — keseimbangan antara tolak "dua orang mirip" vs terlalu sering ambiguous.
FACE_MATCH_MIN_MARGIN = float(os.environ.get("FACE_MATCH_MIN_MARGIN", "0.017"))
# Saat False, DeepFace memakai SELURUH gambar sebagai "wajah" jika detektor gagal → sering salah nama (match ke orang terdekat di galeri).
def _env_bool(key: str, default: bool) -> bool:
    v = (os.environ.get(key, "") or "").strip().lower()
    if not v:
        return default
    return v in ("1", "true", "yes", "on")


FACE_ENFORCE_DETECTION_RECOGNIZE = _env_bool("FACE_ENFORCE_DETECTION_RECOGNIZE", True)
FACE_ENABLE_CLAHE = _env_bool("FACE_ENABLE_CLAHE", True)
# Fast mode: use primary detector only unless explicitly disabled.
FACE_RECOGNIZE_FAST_MODE = _env_bool("FACE_RECOGNIZE_FAST_MODE", True)
# Adaptive fallback: in fast mode, only try fallback detector when primary result is weak/ambiguous/face-not-detected.
FACE_RECOGNIZE_ADAPTIVE_FALLBACK = _env_bool("FACE_RECOGNIZE_ADAPTIVE_FALLBACK", True)
# Pendaftaran: default longgar — biarkan foto tersimpan; pengenalan ketat tetap di /recognize.
FACE_REGISTER_RELAXED = _env_bool("FACE_REGISTER_RELAXED", True)
FACE_REGISTER_SKIP_DUPLICATE_CHECK = _env_bool("FACE_REGISTER_SKIP_DUPLICATE_CHECK", False)
FACE_REGISTER_SKIP_FACE_VALIDATION = _env_bool("FACE_REGISTER_SKIP_FACE_VALIDATION", False)
_reg_dup_raw = (os.environ.get("FACE_REGISTER_DUPLICATE_THRESHOLD", "") or "").strip()
# Hanya tolak duplikat jika jarak sangat kecil (hampir identik dengan foto galeri). Saat RELAXED=False pakai THRESHOLD seperti sebelumnya.
REGISTER_DUPLICATE_THRESHOLD = (
    float(_reg_dup_raw)
    if _reg_dup_raw
    else (0.35 if FACE_REGISTER_RELAXED else THRESHOLD)
)
MAX_GALLERY_SAMPLES_PER_STAFF = max(1, int(os.environ.get("FACE_MAX_GALLERY_SAMPLES_PER_STAFF", "5") or "5"))
_JPEG_QUALITY = int(os.environ.get("FACE_GALLERY_JPEG_QUALITY", "92"))
_JPEG_QUALITY = max(75, min(_JPEG_QUALITY, 100))
# JPEG untuk frame sementara /recognize — sedikit lebih tinggi dari galeri agar edge wajah tidak hancur sebelum embedding.
_JPEG_QUALITY_RECOGNIZE = int(os.environ.get("FACE_RECOGNIZE_JPEG_QUALITY", "95"))
_JPEG_QUALITY_RECOGNIZE = max(85, min(_JPEG_QUALITY_RECOGNIZE, 98))
_FACE_CLAHE_CLIP = float(os.environ.get("FACE_CLAHE_CLIP", "2.35"))
_FACE_CLAHE_CLIP = max(1.5, min(_FACE_CLAHE_CLIP, 4.0))
logger.info(
    "face_api model=%s THRESHOLD=%s MIN_MARGIN=%s decode_max=%s jpeg_rec=%s clahe_clip=%s det_reg=%s det_rec=%s fallback=%s enforce_det_rec=%s clahe=%s "
    "fast_mode=%s adaptive_fallback=%s reg_relaxed=%s reg_dup_thr=%s reg_skip_dup=%s reg_skip_face=%s",
    MODEL_NAME,
    THRESHOLD,
    FACE_MATCH_MIN_MARGIN,
    _FACE_DECODE_MAX_DIM,
    _JPEG_QUALITY_RECOGNIZE,
    _FACE_CLAHE_CLIP,
    DETECTOR_BACKEND,
    DETECTOR_RECOGNIZE,
    FACE_RECOGNIZE_DETECTOR_FALLBACK or "(none)",
    FACE_ENFORCE_DETECTION_RECOGNIZE,
    FACE_ENABLE_CLAHE,
    FACE_RECOGNIZE_FAST_MODE,
    FACE_RECOGNIZE_ADAPTIVE_FALLBACK,
    FACE_REGISTER_RELAXED,
    REGISTER_DUPLICATE_THRESHOLD,
    FACE_REGISTER_SKIP_DUPLICATE_CHECK,
    FACE_REGISTER_SKIP_FACE_VALIDATION,
)


def enhance_for_recognition(img_bgr):
    """CLAHE pada saluran L — sedikit lebih agresif (clipLimit env) agar embedding lebih stabil vs pendaftaran."""
    if not FACE_ENABLE_CLAHE or img_bgr is None or img_bgr.size == 0:
        return img_bgr
    try:
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=_FACE_CLAHE_CLIP, tileGridSize=(8, 8))
        l2 = clahe.apply(l_ch)
        merged = cv2.merge((l2, a_ch, b_ch))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    except Exception as ex:
        logger.debug("CLAHE skip: %s", ex)
        return img_bgr


def _recognition_detector_chain():
    """Urutan detektor: utama dulu, lalu fallback (dedupe)."""
    base_chain = (DETECTOR_RECOGNIZE,) if FACE_RECOGNIZE_FAST_MODE else (DETECTOR_RECOGNIZE, FACE_RECOGNIZE_DETECTOR_FALLBACK)
    out = []
    for d in base_chain:
        ds = (d or "").strip()
        if not ds:
            continue
        if not out or out[-1].lower() != ds.lower():
            out.append(ds)
    return out


def _staff_id_from_identity(identity_path: str) -> str:
    base = os.path.splitext(os.path.basename(str(identity_path or "")))[0].strip()
    # Support multi-sample filenames: <staff_id>__sample_xxx.jpg
    if "__sample_" in base:
        base = base.split("__sample_", 1)[0].strip()
    return base


def _staff_face_files(tenant_path: str, staff_id: str):
    sid = str(staff_id or "").strip()
    if not sid:
        return []
    pref = f"{sid}__sample_"
    out = []
    for f in os.listdir(tenant_path):
        fl = f.lower()
        if not fl.endswith(".jpg"):
            continue
        if f == f"{sid}.jpg" or f.startswith(pref):
            out.append(os.path.join(tenant_path, f))
    out.sort(key=lambda p: os.path.getmtime(p) if os.path.exists(p) else 0)
    return out


def _register_ensure_face(DF, temp_path: str) -> None:
    """Validasi wajah untuk pendaftaran: mode longgar mengizinkan simpan meski detektor strict gagal."""
    if FACE_REGISTER_SKIP_FACE_VALIDATION:
        return
    backends = [DETECTOR_BACKEND, "opencv"]
    if FACE_REGISTER_RELAXED:
        backends.append("mtcnn")
    seen = set()
    for be in backends:
        bl = be.lower()
        if bl in seen:
            continue
        seen.add(bl)
        try:
            faces = DF.extract_faces(img_path=temp_path, detector_backend=be, enforce_detection=True)
            if faces and len(faces) > 0:
                return
        except (ValueError, Exception):
            continue
    if FACE_REGISTER_RELAXED:
        try:
            DF.extract_faces(img_path=temp_path, detector_backend=DETECTOR_BACKEND, enforce_detection=False)
            return
        except Exception as ex:
            logger.warning("register: extract_faces enforce=False skipped (%s) — tetap menyimpan foto.", ex)
            return
    raise ValueError("face not detected")


# Cache generation locks (per tenant to allow parallel cross-tenant scanning)
tenant_locks = {}

def get_lock_for_tenant(tenant_id: str):
    if tenant_id not in tenant_locks:
        tenant_locks[tenant_id] = asyncio.Lock()
    return tenant_locks[tenant_id]

@app.post("/register")
async def register_face(
    staff_id: str = Form(...), 
    image_data: str = Form(...), 
    tenant_id: str = Form("default")
):
    # Registration MUST be serialized per tenant to maintain cache integrity
    async with get_lock_for_tenant(tenant_id):
        img = decode_image(image_data)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        tenant_path = get_tenant_db_path(tenant_id)
        temp_path = os.path.join(_TMP_DIR, f"reg_check_{uuid.uuid4()}.jpg")
        cv2.imwrite(temp_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), _JPEG_QUALITY])
        
        try:
            DF = get_deepface()
            _register_ensure_face(DF, temp_path)

            dup_enforce = not FACE_REGISTER_RELAXED
            dup_thr = REGISTER_DUPLICATE_THRESHOLD

            if (
                not FACE_REGISTER_SKIP_DUPLICATE_CHECK
                and any(f.endswith(".jpg") for f in os.listdir(tenant_path))
            ):
                results = DF.find(
                    img_path=temp_path,
                    db_path=tenant_path,
                    model_name=MODEL_NAME,
                    distance_metric=DISTANCE_METRIC,
                    detector_backend=DETECTOR_BACKEND,
                    enforce_detection=dup_enforce,
                    align=True,
                    silent=True,
                )

                if results and len(results[0]) > 0:
                    match = results[0].iloc[0]
                    distance = float(match["distance"])

                    if distance < dup_thr:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                        raise HTTPException(
                            status_code=409,
                            detail={"message": "Wajah sudah terdaftar pada dapur ini"},
                        )
        except HTTPException:
            raise
        except ValueError as ve:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(status_code=400, detail="Wajah tidak terdeteksi. Pastikan foto jelas.")
        except Exception as e:
            logger.error(f"Registration validation error: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(status_code=500, detail=f"Gagal validasi pendaftaran: {str(e)}")
        
        if os.path.exists(temp_path): os.remove(temp_path)

        file_path = os.path.join(tenant_path, f"{staff_id}.jpg")
        cv2.imwrite(file_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), _JPEG_QUALITY])
        
        # Clear cache to force re-indexing on next find()
        try:
            for f in os.listdir(tenant_path):
                if f.endswith(".pkl"): os.remove(os.path.join(tenant_path, f))
        except: pass

        return {"message": "Success", "staff_id": staff_id}


async def _deepface_find(
    DF,
    temp_path: str,
    tenant_path: str,
    tenant_id: str,
    detector_backend: str,
):
    """DeepFace.find dengan pola lock cache yang sama untuk recognize."""
    has_cache = any(f.endswith(".pkl") for f in os.listdir(tenant_path))
    if not has_cache:
        async with get_lock_for_tenant(tenant_id):
            if not any(f.endswith(".pkl") for f in os.listdir(tenant_path)):
                logger.info(f"Generating face cache for tenant: {tenant_id}")
            return DF.find(
                img_path=temp_path,
                db_path=tenant_path,
                model_name=MODEL_NAME,
                distance_metric=DISTANCE_METRIC,
                detector_backend=detector_backend,
                enforce_detection=FACE_ENFORCE_DETECTION_RECOGNIZE,
                align=True,
                silent=True,
            )
    return DF.find(
        img_path=temp_path,
        db_path=tenant_path,
        model_name=MODEL_NAME,
        distance_metric=DISTANCE_METRIC,
        detector_backend=detector_backend,
        enforce_detection=FACE_ENFORCE_DETECTION_RECOGNIZE,
        align=True,
        silent=True,
    )


@app.post("/recognize")
async def recognize_face(image_data: str = Form(...), tenant_id: str = Form("default")):
    img = decode_image(image_data)
    if img is None:
        return {"staff_id": "", "distance": 0.0, "verified": False, "message": "Invalid image data"}

    tenant_path = get_tenant_db_path(tenant_id)
    # Avoid DeepFace hard-fail / noisy ERROR logs on empty or wrong gallery folder (e.g. legacy slug path).
    try:
        gallery_jpgs = [f for f in os.listdir(tenant_path) if f.lower().endswith(".jpg")]
    except OSError as oe:
        logger.warning("recognize listdir failed tenant_id=%r path=%r: %s", tenant_id, tenant_path, oe)
        return {"staff_id": "", "distance": 0.0, "verified": False, "message": "Galeri wajah tidak dapat dibaca untuk dapur ini."}
    if not gallery_jpgs:
        logger.info("recognize empty gallery tenant_id=%r path=%r (no .jpg)", tenant_id, tenant_path)
        return {
            "staff_id": "",
            "distance": 0.0,
            "verified": False,
            "message": "Belum ada wajah terdaftar untuk dapur ini — daftar ulang atau hubungi admin.",
        }

    img = enhance_for_recognition(img)
    temp_path = os.path.join(_TMP_DIR, f"temp_{uuid.uuid4()}.jpg")
    cv2.imwrite(temp_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), _JPEG_QUALITY_RECOGNIZE])

    try:
        DF = get_deepface()
        detectors = _recognition_detector_chain() or ["retinaface"]
        fallback_detector = (FACE_RECOGNIZE_DETECTOR_FALLBACK or "").strip()

        best_weak_distance = None  # closest match that still failed threshold (too different)
        ambiguous_candidates = []  # (d, d2) when threshold OK but runner-up too close
        saw_face_not_detected = False

        async def try_detector(det: str):
            nonlocal best_weak_distance, saw_face_not_detected
            det_name = str(det or "").strip()
            if not det_name:
                return None
            try:
                results = await _deepface_find(DF, temp_path, tenant_path, tenant_id, det_name)
            except FaceNotDetected:
                saw_face_not_detected = True
                logger.info("recognize FaceNotDetected tenant_id=%r detector=%s", tenant_id, det_name)
                return None

            if not results or len(results[0]) == 0:
                return None

            df = results[0]
            match = df.iloc[0]
            distance = float(match["distance"])

            if distance > THRESHOLD:
                logger.info(
                    "recognize weak match tenant_id=%r detector=%s distance=%.3f > %.3f identity=%s",
                    tenant_id,
                    det_name,
                    distance,
                    THRESHOLD,
                    match.get("identity", "unknown"),
                )
                if best_weak_distance is None or distance < best_weak_distance:
                    best_weak_distance = distance
                return None

            if FACE_MATCH_MIN_MARGIN > 0 and len(df) >= 2:
                d2 = float(df.iloc[1]["distance"])
                if (d2 - distance) < FACE_MATCH_MIN_MARGIN:
                    logger.info(
                        "recognize ambiguous tenant_id=%r detector=%s d1=%.3f d2=%.3f",
                        tenant_id,
                        det_name,
                        distance,
                        d2,
                    )
                    ambiguous_candidates.append((distance, d2))
                    return None

            _ident = str(match["identity"])
            staff_id = _staff_id_from_identity(_ident)
            if len(staff_id) == 36 and staff_id.count("-") == 4:
                staff_id = staff_id.lower()
            logger.info(
                "Match success for tenant %s: %s distance %.3f detector=%s",
                tenant_id,
                staff_id,
                distance,
                det_name,
            )
            return {"staff_id": staff_id, "distance": distance, "verified": True, "message": "Success"}

        for det in detectors:
            hit = await try_detector(det)
            if hit:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return hit

        # Adaptive fallback for fast mode: only retry once when primary signal indicates uncertainty.
        should_try_adaptive_fallback = (
            FACE_RECOGNIZE_FAST_MODE
            and FACE_RECOGNIZE_ADAPTIVE_FALLBACK
            and bool(fallback_detector)
            and all(str(d or "").strip().lower() != fallback_detector.lower() for d in detectors)
            and (best_weak_distance is not None or bool(ambiguous_candidates) or saw_face_not_detected)
        )
        if should_try_adaptive_fallback:
            logger.info(
                "recognize adaptive fallback tenant_id=%r detector=%s reason weak=%s ambiguous=%s face_not_detected=%s",
                tenant_id,
                fallback_detector,
                best_weak_distance is not None,
                bool(ambiguous_candidates),
                saw_face_not_detected,
            )
            hit = await try_detector(fallback_detector)
            if hit:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return hit
        elif (
            fallback_detector
            and all(str(d or "").strip().lower() != fallback_detector.lower() for d in detectors)
        ):
            # Retinaface kadang mengembalikan baris kosong tanpa "weak distance" → adaptive tidak jalan.
            logger.info("recognize last-resort fallback tenant_id=%r detector=%s", tenant_id, fallback_detector)
            hit = await try_detector(fallback_detector)
            if hit:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return hit

        if os.path.exists(temp_path):
            os.remove(temp_path)

        if ambiguous_candidates:
            ambiguous_candidates.sort(key=lambda t: t[0])
            d1, d2 = ambiguous_candidates[0]
            return {
                "staff_id": "",
                "distance": d1,
                "verified": False,
                "message": f"Match ambiguous — two faces too similar ({d1:.3f} vs {d2:.3f}). Try again with clearer lighting.",
            }

        if best_weak_distance is not None:
            logger.info(
                "Match too weak for tenant %s after %s detector(s): best=%.3f > %.3f",
                tenant_id,
                len(detectors),
                best_weak_distance,
                THRESHOLD,
            )
            return {
                "staff_id": "",
                "distance": best_weak_distance,
                "verified": False,
                "message": f"Match too weak ({best_weak_distance:.3f})",
            }

        if saw_face_not_detected:
            return {
                "staff_id": "",
                "distance": 0.0,
                "verified": False,
                "message": "Wajah tidak terdeteksi. Arahkan wajah ke kamera dan pastikan pencahayaan cukup.",
            }

        return {"staff_id": "", "distance": 0.0, "verified": False, "message": "Face not recognized"}

    except FaceNotDetected:
        if os.path.exists(temp_path): os.remove(temp_path)
        logger.info("recognize FaceNotDetected tenant_id=%r enforce=%s", tenant_id, FACE_ENFORCE_DETECTION_RECOGNIZE)
        return {
            "staff_id": "",
            "distance": 0.0,
            "verified": False,
            "message": "Wajah tidak terdeteksi. Arahkan wajah ke kamera dan pastikan pencahayaan cukup.",
        }
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        logger.error(f"Recognition error: {e}")
        return {"staff_id": "", "distance": 0.0, "verified": False, "message": str(e)}

@app.post("/delete")
async def delete_face(staff_id: str = Form(...), tenant_id: str = Form("default")):
    async with get_lock_for_tenant(tenant_id):
        tenant_path = get_tenant_db_path(tenant_id)
        try:
            for fp in _staff_face_files(tenant_path, staff_id):
                try:
                    os.remove(fp)
                except Exception:
                    pass
            for f in os.listdir(tenant_path):
                if f.endswith(".pkl"): os.remove(os.path.join(tenant_path, f))
            return {"message": "Success", "staff_id": staff_id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/add-sample")
async def add_face_sample(
    staff_id: str = Form(...),
    image_data: str = Form(...),
    tenant_id: str = Form("default"),
):
    async with get_lock_for_tenant(tenant_id):
        img = decode_image(image_data)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        tenant_path = get_tenant_db_path(tenant_id)
        sid = str(staff_id or "").strip()
        if not sid:
            raise HTTPException(status_code=400, detail="Missing staff_id")
        try:
            sample_name = f"{sid}__sample_{uuid.uuid4().hex[:12]}.jpg"
            sample_path = os.path.join(tenant_path, sample_name)
            cv2.imwrite(sample_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), _JPEG_QUALITY])

            files = _staff_face_files(tenant_path, sid)
            while len(files) > MAX_GALLERY_SAMPLES_PER_STAFF:
                oldest = files.pop(0)
                try:
                    os.remove(oldest)
                except Exception:
                    pass

            # Clear cache so the new sample is included on next recognize.
            for f in os.listdir(tenant_path):
                if f.endswith(".pkl"):
                    try:
                        os.remove(os.path.join(tenant_path, f))
                    except Exception:
                        pass
            return {
                "message": "Success",
                "staff_id": sid,
                "samples_kept": len(_staff_face_files(tenant_path, sid)),
                "max_samples": MAX_GALLERY_SAMPLES_PER_STAFF,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
