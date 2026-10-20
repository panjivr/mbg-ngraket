# Tanda Tangan Elektronik (TTE) — Riset & Roadmap untuk Absensi MBG

Dokumen ini merangkum hasil riset tentang **Tanda Tangan Elektronik (TTE)** di
Indonesia — khususnya **BSrE** dan **PSrE** lain — dan cara menerapkannya di
aplikasi kita (`absensi-dapur`) secara **benar & jujur secara hukum**.

> Ringkasan penting: **TTE yang "tersertifikasi" (setara tanda tangan basah +
> kekuatan hukum sempurna) tidak bisa dibuat hanya dari kode kita.** Ia butuh
> **sertifikat elektronik** per penanda tangan dari sebuah **PSrE** (BSrE untuk
> instansi pemerintah, atau PSrE swasta berbayar). Kode kita hanya menghubungkan
> ke PSrE itu setelah organisasi terdaftar & punya kredensial.

---

## 1. Dasar hukum

- **UU ITE** — UU No. 11/2008, diubah UU No. 19/2016, dan UU No. 1/2024.
- **PP No. 71/2019** tentang Penyelenggaraan Sistem & Transaksi Elektronik (PSTE)
  — mengatur sertifikat elektronik & PSrE; mendorong layanan publik memakai
  sertifikat elektronik.
- Regulator: dulu **Kominfo**, sekarang **Komdigi** (Kementerian Komunikasi &
  Digital).

### Dua jenis TTE (ini inti yang wajib dipahami)

| Jenis | Dibuat dengan | Kekuatan hukum |
|---|---|---|
| **TTE Tersertifikasi** | Sertifikat elektronik dari **PSrE Indonesia** (BSrE/Privy/VIDA/Peruri/…) | **Sempurna** — setara tanda tangan basah; keandalannya dianggap terbukti |
| **TTE Tidak Tersertifikasi** | Tanpa sertifikat PSrE (mis. tanda tangan gambar, stempel elektronik buatan sendiri, HMAC) | **Tetap sah sebagai alat bukti**, tetapi pihak yang mengandalkan harus membuktikan keandalannya bila disengketakan |

**Posisi aplikasi kita saat ini = TTE *tidak* tersertifikasi** (lihat §5).
Jangan mengklaim "BSrE" atau "tersertifikasi" pada dokumen selama belum benar‑benar
memakai sertifikat PSrE — itu bisa menyesatkan.

---

## 2. PSrE: siapa penyedia sertifikat yang diakui

**PSrE = Penyelenggara Sertifikat Elektronik** (diakui/berinduk ke Komdigi).

- **Instansi pemerintah:** **BSrE** (Balai Besar Sertifikasi Elektronik) di bawah
  **BSSN**. (Dulu BPPT juga.)
- **Swasta (berbayar, untuk umum/bisnis):** **Privy**, **VIDA**, **Peruri (Peruri
  Sign)**, **Digisign**, **Tilaka**, **TekenAja!**, **Xignature**.

---

## 3. BSrE (jalur pemerintah) — detail

**Siapa yang boleh:** **hanya instansi pemerintah & ASN**, bukan publik umum.
→ **SPPG berada di bawah BGN (Badan Gizi Nasional) = instansi pemerintah**, jadi
secara prinsip **berhak** memakai BSrE melalui BGN. Ini jalur paling tepat &
umumnya **tanpa biaya** untuk pemerintah (perlu dikonfirmasi ke BSrE/BGN).

**Proses onboarding (organisasi, bukan kode):**
1. Instansi (BGN) menandatangani **PKS (Perjanjian Kerja Sama)** dengan BSrE +
   surat permohonan.
2. Instansi menunjuk **Verifikator** internal.
3. Verifikator mendaftarkan pengguna di **AMS (Aplikasi Manajemen Sertifikat)**.
   (Untuk ASN bisa lewat portal **MyASN / ASN Digital**.)
4. Pengguna **mengaktifkan sertifikat** + menetapkan **passphrase**.
5. Untuk integrasi aplikasi: minta **izin + kredensial API** (Esign Client
   Service), endpoint, dan **whitelist IP** ke BSrE.

**Teknis integrasi BSrE (Esign Client Service, perlu izin BSrE-BSSN):**
- Aplikasi menghitung **hash SHA‑256** dokumen (PDF).
- Kirim hash + info penanda tangan (ID sertifikat) + PDF (sering **Base64**) ke
  **API BSrE** (JSON) melalui **HTTPS (TLS ≥1.2)**.
- BSrE menandatangani dgn **private key** pemilik sertifikat (disimpan aman di
  sisi BSrE/HSM) → mengembalikan **PDF ber‑TTE (PAdES)**.
- Hasil memuat **logo BSrE + keterangan "ditandatangani dengan sertifikat BSrE" +
  QR verifikasi**. Verifikasi publik via portal BSrE/Komdigi.
- Syarat sistem: SSL aktif, sertifikat pengguna disimpan terpisah & aman,
  proses sign tanpa error.

> Catatan: dokumentasi API BSrE **tidak publik** dan **berversi** (mis. Esign
> Client Service v2.x). Harus diambil langsung dari BSrE setelah PKS. Maka
> **kode integrasi final harus ditulis mengacu dokumen resmi + diuji di sandbox
> BSrE**, bukan ditebak.

---

## 4. PSrE swasta (jalur non‑pemerintah / fleksibel, berbayar)

Bila jalur BGN‑BSrE lambat/tak tersedia, pakai **PSrE swasta** (Privy/VIDA/Peruri).
- Punya **API/SDK publik** + onboarding **e‑KYC** (verifikasi identitas penanda
  tangan) + **materai elektronik** (e‑Meterai Peruri) opsional.
- **Berbayar** (per sertifikat / per tanda tangan / langganan) + butuh **akun
  bisnis** & **API key**.
- Cocok bila penanda tangan termasuk pihak non‑ASN (mis. kepala SPPG honorer,
  mitra, supplier).

---

## 5. Status aplikasi kita sekarang

Yang **sudah** ada (semua = **TTE tidak tersertifikasi**, sah sebagai bukti,
tapi bukan BSrE):
- **Slip gaji**: ditandatangani dengan **HMAC‑SHA256** (kunci `AUTH_SECRET`) +
  **QR** ke halaman `/verifikasi-slip` yang memverifikasi keasliannya. Ini sudah
  mendekati prinsip TTE (integritas + verifikasi), hanya saja kuncinya milik
  aplikasi, bukan sertifikat PSrE per orang.
- **Dokumen cetak** (`/cetak/*`): **stempel "Ditandatangani secara elektronik"**
  (opsional via checklist, waktu otomatis/manual), menyesuaikan jabatan & nama
  tiap kolom. Tanpa kriptografi karena dokumennya diisi‑lalu‑cetak di browser
  (tidak dipersistensi di server), sehingga belum bisa di‑hash/tandatangani
  secara kriptografis yang bermakna.

Kesimpulan kejujuran: **jangan beri label "BSrE/tersertifikasi"** pada keduanya
sampai benar‑benar terhubung ke PSrE.

---

## 6. Rekomendasi & roadmap

### Tahap 0 — Sekarang (bisa kita kerjakan tanpa pihak luar)
- **Perjelas label hukum**: beri keterangan halus pada dokumen bahwa ini "TTE —
  belum tersertifikasi" (opsional, bisa diaktifkan admin), agar tidak menyesatkan.
- **Perkuat yang self‑hosted** (slip): sudah ada hash + verifikasi; bisa ditambah
  **catatan audit** (siapa/kapan/hal apa) bila perlu.
- **Siapkan arsitektur adapter** (lihat §7) agar PSrE tinggal "dicolok".

### Tahap 1 — Pilih jalur TTE tersertifikasi (butuh keputusan + aksi organisasi)
- **Jalur A — BSrE lewat BGN** (disarankan karena instansi pemerintah, umumnya
  gratis): ajukan PKS, tunjuk verifikator, daftarkan penanda tangan (kepala SPPG,
  ahli gizi, koordinator, dll) di AMS, minta kredensial API.
- **Jalur B — PSrE swasta** (Privy/VIDA/Peruri): buat akun bisnis, e‑KYC penanda
  tangan, ambil API key. Berbayar, tapi cepat & fleksibel untuk non‑ASN.

### Tahap 2 — Integrasi teknis (setelah kredensial ada)
- Dokumen yang perlu TTE sah **dipersistensi sebagai PDF di server** (bukan hanya
  cetak dari browser) → di‑hash → dikirim ke PSrE → simpan **PDF ber‑TTE (PAdES)**
  + QR verifikasi resmi PSrE.
- Uji di **sandbox** PSrE sebelum produksi.

---

## 7. Arsitektur integrasi yang kita siapkan (provider‑agnostik)

Agar tidak terkunci ke satu PSrE, integrasi dirancang lewat **satu antarmuka**:

```ts
// Konsep (src/lib/tte/provider.ts) — ditulis final saat kredensial + dok API ada
export interface PenandaTangan { nama: string; jabatan: string; nik?: string; sertifikatId?: string }
export interface HasilTTE { pdf: Uint8Array; idDokumen: string; urlVerifikasi: string; waktu: string }

export interface PSrEProvider {
  nama: "bsre" | "privy" | "vida" | "peruri" | "mandiri";
  tersertifikasi: boolean;
  tandatangani(pdf: Uint8Array, penandatangan: PenandaTangan, opsi?: { alasan?: string }): Promise<HasilTTE>;
  verifikasi(idDokumen: string): Promise<{ sah: boolean; penandatangan?: PenandaTangan; waktu?: string }>;
}
```

- **`mandiri`** = implementasi sekarang (HMAC + QR) — default, non‑tersertifikasi.
- **`bsre` / `privy` / …** = adapter yang membaca kredensial dari **environment
  variables** (mis. `BSRE_BASE_URL`, `BSRE_USER`, `BSRE_PASS`, atau `PRIVY_*`)
  dan memanggil API PSrE sesuai dokumen resminya. Aktif otomatis saat env terisi.
- **Rahasia (kredensial/kunci) di env/secret manager**, tidak di kode.

---

## 8. Yang dibutuhkan dari pihak kita untuk integrasi *live*

Untuk melanjutkan ke TTE **tersertifikasi**, siapkan salah satu:

- **BSrE (via BGN):** nomor/skema PKS, akun verifikator & AMS, daftar penanda
  tangan + sertifikatnya, **kredensial + endpoint + dokumen API** Esign BSrE,
  dan IP server untuk whitelist.
- **PSrE swasta:** akun bisnis + **API key/secret** + dokumentasi API + daftar
  penanda tangan yang sudah e‑KYC.

Begitu salah satu tersedia, adapter di §7 ditulis final mengacu dokumen resmi
dan diuji di sandbox sebelum produksi.

---

### Sumber (ringkas)
- BSSN — Sertifikat Elektronik: https://www.bssn.go.id/sertifikat-elektronik/
- Kominfo/Aptika — PSrE Induk: https://aptika.kominfo.go.id/2020/01/penyelenggara-sertifikat-elektronik-psre-induk/
- Hukumonline — Sertifikasi Elektronik oleh BSSN
- Vinotek — Perbedaan PSrE dan BSrE
- Petunjuk Teknis API ESIGN (contoh instansi, JDIH Bintan) & repo komunitas
  (E‑Sign BSrE PHP/Node) — rujukan alur, **bukan** pengganti dokumen resmi BSrE.
