// Filter wajah "lucu-lucu" ala TikTok — digambar sebagai bentuk (bukan emoji)
// di atas wajah memakai 68 titik landmark face-api. Wajah tetap terlihat jelas
// (penting untuk verifikasi absensi). Koordinat dalam ruang piksel native video.

import type { Pt } from "./faceapiLite";

type Ctx = CanvasRenderingContext2D;

export interface Refs {
  eyeL: Pt;
  eyeR: Pt;
  eyeMid: Pt;
  eyeDist: number;
  nose: Pt;
  mouthMid: Pt;
  chin: Pt;
  browMid: Pt;
  faceW: number;
  headTop: Pt;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Hitung titik acuan wajah dari 68 landmark face-api. Null bila tak lengkap. */
export function computeRefs(P: Pt[] | null): Refs | null {
  if (!P || P.length < 68) return null;
  const avg = (a: number, b: number): Pt => {
    let x = 0;
    let y = 0;
    for (let i = a; i <= b; i++) {
      x += P[i].x;
      y += P[i].y;
    }
    const n = b - a + 1;
    return { x: x / n, y: y / n };
  };
  const eyeL = avg(36, 41);
  const eyeR = avg(42, 47);
  const eyeMid = { x: (eyeL.x + eyeR.x) / 2, y: (eyeL.y + eyeR.y) / 2 };
  const nose = P[33];
  const chin = P[8];
  const browMid = { x: (P[19].x + P[24].x) / 2, y: (P[19].y + P[24].y) / 2 };
  const mouthMid = { x: (P[48].x + P[54].x) / 2, y: (P[51].y + P[57].y) / 2 };
  const eyeDist = dist(eyeL, eyeR);
  const faceW = dist(P[0], P[16]);
  const h = chin.y - browMid.y;
  const headTop = { x: browMid.x, y: browMid.y - h * 0.85 };
  return { eyeL, eyeR, eyeMid, eyeDist, nose, mouthMid, chin, browMid, faceW, headTop };
}

function kumis(ctx: Ctx, r: Refs): void {
  const cx = r.nose.x;
  const cy = (r.nose.y + r.mouthMid.y) / 2;
  const w = r.eyeDist * 1.2;
  const h = w * 0.55;
  ctx.fillStyle = "#241c14";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - w * 0.12, cy - h * 0.55, cx - w * 0.5, cy - h * 0.45, cx - w * 0.58, cy);
  ctx.bezierCurveTo(cx - w * 0.55, cy + h * 0.65, cx - w * 0.2, cy + h * 0.4, cx, cy + h * 0.18);
  ctx.bezierCurveTo(cx + w * 0.2, cy + h * 0.4, cx + w * 0.55, cy + h * 0.65, cx + w * 0.58, cy);
  ctx.bezierCurveTo(cx + w * 0.5, cy - h * 0.45, cx + w * 0.12, cy - h * 0.55, cx, cy);
  ctx.fill();
}

function tandukBanteng(ctx: Ctx, r: Refs): void {
  const s = r.faceW * 0.55;
  ctx.fillStyle = "#efe7d4";
  ctx.strokeStyle = "#8a7a58";
  ctx.lineWidth = s * 0.05;
  for (const dir of [-1, 1]) {
    const bx = r.headTop.x + dir * r.faceW * 0.34;
    const by = r.headTop.y + s * 0.2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + dir * s * 0.95, by - s * 0.3, bx + dir * s * 0.72, by - s * 1.05);
    ctx.quadraticCurveTo(bx + dir * s * 0.2, by - s * 0.6, bx - dir * s * 0.14, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function telingaGajah(ctx: Ctx, r: Refs): void {
  const w = r.faceW * 0.55;
  const h = r.faceW * 0.62;
  const cy = r.eyeMid.y + r.faceW * 0.08;
  ctx.fillStyle = "#9c9c9c";
  ctx.strokeStyle = "#6d6d6d";
  ctx.lineWidth = w * 0.06;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(r.eyeMid.x + dir * r.faceW * 0.72, cy, w, h, dir * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b3a0a0";
    ctx.beginPath();
    ctx.ellipse(r.eyeMid.x + dir * r.faceW * 0.72, cy + h * 0.15, w * 0.55, h * 0.6, dir * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9c9c9c";
  }
}

function anjing(ctx: Ctx, r: Refs): void {
  const earW = r.faceW * 0.32;
  const earH = r.faceW * 0.62;
  ctx.fillStyle = "#8a5a3c";
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(r.headTop.x + dir * r.faceW * 0.52, r.headTop.y + earH * 0.35, earW, earH, dir * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d9a679";
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(r.headTop.x + dir * r.faceW * 0.52, r.headTop.y + earH * 0.45, earW * 0.5, earH * 0.55, dir * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#20140d";
  ctx.beginPath();
  ctx.ellipse(r.nose.x, r.nose.y, r.eyeDist * 0.16, r.eyeDist * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function kelinci(ctx: Ctx, r: Refs): void {
  const w = r.faceW * 0.24;
  const h = r.faceW * 0.95;
  for (const dir of [-1, 1]) {
    const ex = r.headTop.x + dir * r.faceW * 0.22;
    const ey = r.headTop.y - h * 0.32;
    ctx.fillStyle = "#f6f6f6";
    ctx.strokeStyle = "#dcdcdc";
    ctx.lineWidth = w * 0.12;
    ctx.beginPath();
    ctx.ellipse(ex, ey, w, h * 0.5, dir * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffc0cb";
    ctx.beginPath();
    ctx.ellipse(ex, ey, w * 0.5, h * 0.34, dir * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function kucing(ctx: Ctx, r: Refs): void {
  const eh = r.faceW * 0.42;
  ctx.fillStyle = "#3a3a3a";
  for (const dir of [-1, 1]) {
    const bx = r.headTop.x + dir * r.faceW * 0.3;
    const by = r.headTop.y + eh * 0.45;
    ctx.beginPath();
    ctx.moveTo(bx - eh * 0.38, by);
    ctx.lineTo(bx, by - eh);
    ctx.lineTo(bx + eh * 0.38, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ff8fab";
  const n = r.nose;
  ctx.beginPath();
  ctx.moveTo(n.x - r.eyeDist * 0.09, n.y - r.eyeDist * 0.05);
  ctx.lineTo(n.x + r.eyeDist * 0.09, n.y - r.eyeDist * 0.05);
  ctx.lineTo(n.x, n.y + r.eyeDist * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(30,30,30,0.85)";
  ctx.lineWidth = r.eyeDist * 0.035;
  for (const s of [-1, 1]) {
    for (const off of [-0.05, 0.06, 0.17]) {
      ctx.beginPath();
      ctx.moveTo(n.x + s * r.eyeDist * 0.25, n.y + r.eyeDist * off);
      ctx.lineTo(n.x + s * r.eyeDist * 1.0, n.y + r.eyeDist * (off * 2 - 0.06));
      ctx.stroke();
    }
  }
}

function mahkota(ctx: Ctx, r: Refs): void {
  const w = r.faceW * 0.82;
  const h = r.faceW * 0.38;
  const cx = r.headTop.x;
  const by = r.headTop.y + h * 0.25;
  ctx.fillStyle = "#f4c430";
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = w * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, by);
  ctx.lineTo(cx - w / 2, by - h * 0.5);
  ctx.lineTo(cx - w * 0.25, by - h * 0.05);
  ctx.lineTo(cx, by - h);
  ctx.lineTo(cx + w * 0.25, by - h * 0.05);
  ctx.lineTo(cx + w / 2, by - h * 0.5);
  ctx.lineTo(cx + w / 2, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e0115f";
  for (const dx of [-w * 0.25, 0, w * 0.25]) {
    ctx.beginPath();
    ctx.arc(cx + dx, by - h * 0.12, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}

function kacamata(ctx: Ctx, r: Refs): void {
  const lens = r.eyeDist * 0.45;
  ctx.fillStyle = "rgba(12,12,14,0.9)";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = lens * 0.2;
  for (const e of [r.eyeL, r.eyeR]) {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, lens, lens * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(r.eyeL.x + lens * 0.85, r.eyeL.y);
  ctx.lineTo(r.eyeR.x - lens * 0.85, r.eyeR.y);
  ctx.stroke();
}

function tandukRusa(ctx: Ctx, r: Refs): void {
  const s = r.faceW * 0.55;
  ctx.strokeStyle = "#7a4f26";
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.08;
  for (const dir of [-1, 1]) {
    const bx = r.headTop.x + dir * r.faceW * 0.2;
    const by = r.headTop.y + s * 0.2;
    const tx = bx + dir * s * 0.5;
    const ty = by - s * 1.15;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + dir * s * 0.2, by - s * 0.4);
    ctx.lineTo(bx + dir * s * 0.62, by - s * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + dir * s * 0.36, by - s * 0.78);
    ctx.lineTo(bx + dir * s * 0.78, by - s * 0.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + dir * s * 0.28, ty - s * 0.16);
    ctx.stroke();
  }
}

function badut(ctx: Ctx, r: Refs): void {
  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(r.nose.x, r.nose.y, r.eyeDist * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,105,120,0.5)";
  for (const e of [r.eyeL, r.eyeR]) {
    ctx.beginPath();
    ctx.arc(e.x, e.y + r.eyeDist * 0.55, r.eyeDist * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bebek(ctx: Ctx, r: Refs): void {
  ctx.fillStyle = "#ffb300";
  ctx.strokeStyle = "#e08e00";
  ctx.lineWidth = r.eyeDist * 0.04;
  const cx = r.mouthMid.x;
  const cy = r.mouthMid.y;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r.eyeDist * 0.75, r.eyeDist * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#e08e00";
  ctx.beginPath();
  ctx.moveTo(cx - r.eyeDist * 0.55, cy);
  ctx.lineTo(cx + r.eyeDist * 0.55, cy);
  ctx.stroke();
}

export interface StickerDef {
  key: string;
  label: string;
  draw: (ctx: Ctx, r: Refs) => void;
}

export const STICKERS: StickerDef[] = [
  { key: "kumis", label: "👨 Kumis", draw: kumis },
  { key: "banteng", label: "🐂 Tanduk Banteng", draw: tandukBanteng },
  { key: "gajah", label: "🐘 Telinga Gajah", draw: telingaGajah },
  { key: "anjing", label: "🐶 Telinga Anjing", draw: anjing },
  { key: "kelinci", label: "🐰 Telinga Kelinci", draw: kelinci },
  { key: "kucing", label: "🐱 Kucing", draw: kucing },
  { key: "rusa", label: "🦌 Tanduk Rusa", draw: tandukRusa },
  { key: "mahkota", label: "👑 Mahkota", draw: mahkota },
  { key: "kacamata", label: "🕶️ Kacamata", draw: kacamata },
  { key: "badut", label: "🤡 Badut", draw: badut },
  { key: "bebek", label: "🦆 Paruh Bebek", draw: bebek },
];
