"use client";

import { useMemo } from "react";
import {
  analisaShioFengshui,
  ELEMEN,
  type ShioFengshuiResult,
  type SfArahItem,
  type SfFengshui,
} from "@/lib/shioFengshui";

/* Palet & gaya "Pusaka Shio & Fengshui" (di-scope ke .sf-root agar tidak
   mengganggu tema aplikasi yang sudah ada). */
const STYLE = `
.sf-root{--ink:#0a1740;--surf:#0e1f55;--surf2:#16306e;--gold:#e0a92e;--gold-lite:#f3c349;
  --cinnabar:#ef4444;--cinnabar-lite:#f87171;--jade:#34d399;--parch:#e2e8f0;--muted:#94a3b8;
  --line:rgba(91,139,255,.22);--good:#34d399;--blue:#5b8bff;
  color:var(--parch);background:
   radial-gradient(900px 360px at 50% -10%,rgba(52,100,230,.16),transparent 60%),
   radial-gradient(700px 320px at 95% 0%,rgba(243,195,73,.07),transparent 55%),
   var(--ink);
  border:1px solid var(--line);border-radius:16px;overflow:hidden}
.sf-root *{box-sizing:border-box}
.sf-pad{padding:clamp(16px,3.5vw,28px)}
.sf-eyebrow{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.28em;
  text-transform:uppercase;color:var(--gold-lite)}
.sf-hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap;
  border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(52,100,230,.10),transparent)}
.sf-glyph{width:96px;height:96px;flex:none;border-radius:14px;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%,rgba(52,100,230,.38),rgba(10,23,64,.92));
  border:1px solid var(--line);box-shadow:inset 0 0 30px rgba(0,0,0,.45)}
.sf-glyph span{font-family:"Cormorant Garamond",serif;font-size:54px;line-height:1;color:var(--gold-lite);
  text-shadow:0 2px 12px rgba(52,100,230,.55)}
.sf-h2{font-family:"Cormorant Garamond",serif;font-size:clamp(26px,5vw,38px);font-weight:700;
  margin:.18em 0;line-height:1.05;color:var(--parch)}
.sf-sub{font-size:13px;color:var(--gold-lite)}
.sf-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.sf-pill{font-size:11.5px;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:var(--parch);
  background:rgba(255,255,255,.02)}
.sf-pill b{color:var(--gold-lite)}
.sf-block{border-top:1px solid var(--line)}
.sf-block:first-child{border-top:none}
.sf-h3{font-family:"Cormorant Garamond",serif;font-size:21px;font-weight:700;color:var(--parch);
  display:flex;align-items:center;gap:10px;margin:0 0 8px}
.sf-no{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:11px;color:var(--ink);
  background:var(--gold);border-radius:6px;padding:3px 7px;font-weight:700}
.sf-cap{color:var(--muted);font-size:12.5px;margin:0 0 12px}
.sf-prose{font-size:14.5px;line-height:1.62;color:#E9E1D2}
.sf-lead{float:left;font-family:"Cormorant Garamond",serif;font-size:48px;line-height:.78;
  padding:6px 12px 0 0;color:var(--cinnabar-lite)}
.sf-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.sf-card{border:1px solid var(--line);border-radius:12px;padding:14px;background:rgba(255,255,255,.018);
  display:flex;flex-direction:column;gap:4px}
.sf-card h4{margin:0 0 4px;font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--gold-lite)}
.sf-card p{margin:0;font-size:13.5px;line-height:1.55;color:#E4DCCC}
.sf-big{font-family:"Cormorant Garamond",serif;font-size:38px;font-weight:700;color:var(--gold-lite);line-height:1}
.sf-tick{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.sf-tick li{position:relative;padding-left:20px;font-size:13.5px;color:#E4DCCC}
.sf-tick li:before{content:"✦";position:absolute;left:0;color:var(--jade)}
.sf-tick.neg li:before{content:"▲";color:var(--cinnabar-lite);font-size:10px;top:2px}
.sf-chips{display:flex;flex-wrap:wrap;gap:6px}
.sf-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid var(--line);
  border-radius:8px;padding:4px 9px;color:var(--parch);background:rgba(255,255,255,.02)}
.sf-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(255,255,255,.25)}
.sf-tag-good{color:var(--jade)!important}
.sf-tag-bad{color:var(--cinnabar-lite)!important}
.sf-dir{width:100%;border-collapse:collapse;font-size:12.5px}
.sf-dir td{border-top:1px solid var(--line);padding:7px 6px;vertical-align:top;color:#E4DCCC}
.sf-dir td.q{font-weight:600;white-space:nowrap}
.sf-viz{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.sf-vizcard{border:1px solid var(--line);border-radius:12px;padding:14px;background:rgba(255,255,255,.018);
  display:flex;flex-direction:column;align-items:center;gap:8px}
.sf-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11.5px;color:var(--muted);justify-content:center}
.sf-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}
.sf-note{font-size:11.5px;color:var(--muted);line-height:1.6;border-top:1px solid var(--line)}
.sf-master{display:inline-block;margin-left:8px;font-size:11px;border:1px solid var(--cinnabar);border-radius:999px;
  padding:2px 8px;color:var(--cinnabar-lite)}
`;

function swatch(hex: string) {
  return `<span class="sf-swatch" style="background:${hex}"></span>`;
}

/* ── SVG: siklus lima elemen (port dari drawWheel) ── */
function wheelHTML(activeNama: string): string {
  const E = ELEMEN as Record<string, { nama: string; han: string; warna: string; hex: string }>;
  const order = ["kayu", "api", "tanah", "logam", "air"];
  const cx = 130, cy = 132, R = 86;
  const pts = order.map((id, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { id, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });
  let s = "";
  for (let i = 0; i < 5; i++) {
    const a = pts[i], b = pts[(i + 2) % 5];
    s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(239,68,68,.45)" stroke-width="1.3"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const a = pts[i], b = pts[(i + 1) % 5];
    s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(52,211,153,.6)" stroke-width="1.6"/>`;
  }
  pts.forEach((p) => {
    const on = E[p.id].nama === activeNama;
    s += `<circle cx="${p.x}" cy="${p.y}" r="${on ? 22 : 17}" fill="${on ? E[p.id].hex : "#0e1f55"}" stroke="${E[p.id].warna}" stroke-width="${on ? 3 : 1.6}"/>`;
    s += `<text x="${p.x}" y="${p.y + 1}" text-anchor="middle" dominant-baseline="middle" font-family="Cormorant Garamond,serif" font-size="${on ? 20 : 16}" fill="${on ? "#0a1740" : E[p.id].warna}" font-weight="700">${E[p.id].han}</text>`;
    s += `<text x="${p.x}" y="${p.y + (p.y < cy ? -28 : 30)}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="${on ? E[p.id].warna : "#94a3b8"}">${E[p.id].nama}</text>`;
  });
  return s;
}

/* ── SVG: kompas 8 arah Fengshui (port dari drawCompass) ── */
function compassHTML(k: SfFengshui): string {
  const cx = 150, cy = 150, R = 108;
  const order = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const ARAH: Record<string, string> = {
    U: "Utara", TL: "Timur Laut", T: "Timur", TG: "Tenggara",
    S: "Selatan", BD: "Barat Daya", B: "Barat", BL: "Barat Laut",
  };
  const q: Record<string, string> = {};
  k.baik.forEach((a) => (q[a.arahKode] = a.nama.includes("Sheng") ? "best" : "good"));
  k.buruk.forEach((a) => (q[a.arahKode] = a.nama.includes("Jue Ming") ? "worst" : "bad"));
  const COL: Record<string, string> = { best: "#e0a92e", good: "#34d399", bad: "#ef4444", worst: "#7f1d1d" };
  let str = `<circle cx="${cx}" cy="${cy}" r="${R + 18}" fill="none" stroke="rgba(243,195,73,.18)"/>`;
  order.forEach((code, i) => {
    const a0 = ((i * 45 - 22.5) * Math.PI) / 180 - Math.PI / 2;
    const a1 = ((i * 45 + 22.5) * Math.PI) / 180 - Math.PI / 2;
    const rIn = 34, rOut = R;
    const p = (rad: number, rr: number) => [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)];
    const [x0, y0] = p(a0, rIn), [x1, y1] = p(a0, rOut), [x2, y2] = p(a1, rOut), [x3, y3] = p(a1, rIn);
    const col = COL[q[code] || "good"];
    const op = q[code] === "best" || q[code] === "worst" ? 0.95 : 0.7;
    str += `<path d="M${x0},${y0} L${x1},${y1} A${rOut},${rOut} 0 0,1 ${x2},${y2} L${x3},${y3} A${rIn},${rIn} 0 0,0 ${x0},${y0} Z" fill="${col}" fill-opacity="${op}" stroke="#0E0B0A" stroke-width="1.5"/>`;
    const am = (i * 45 * Math.PI) / 180 - Math.PI / 2;
    const [lx, ly] = p(am, (rIn + rOut) / 2);
    str += `<text x="${lx}" y="${ly - 3}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="12" font-weight="700" fill="#0a1740">${code}</text>`;
    str += `<text x="${lx}" y="${ly + 10}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(10,23,64,.85)">${ARAH[code].slice(0, 8)}</text>`;
  });
  str += `<circle cx="${cx}" cy="${cy}" r="30" fill="#0e1f55" stroke="rgba(243,195,73,.5)"/>`;
  str += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="22" fill="#f3c349" font-weight="700">${k.kuaNo}</text>`;
  str += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="#94a3b8">KUA</text>`;
  return str;
}

function mapGender(jk?: string | null): "pria" | "wanita" | null {
  if (!jk) return null;
  const s = String(jk).toLowerCase();
  if (s === "l" || s === "pria" || s.startsWith("laki")) return "pria";
  if (s === "p" || s === "wanita" || s.startsWith("perempuan")) return "wanita";
  return null;
}

function DirTable({ rows }: { rows: SfArahItem[] }) {
  return (
    <table className="sf-dir">
      <tbody>
        {rows.map((a, i) => (
          <tr key={i}>
            <td>{a.arah}</td>
            <td className={`q ${a.q === "good" ? "sf-tag-good" : "sf-tag-bad"}`}>{a.nama}</td>
            <td>
              {a.arti}
              <br />
              <span style={{ color: "var(--muted)", fontSize: 12 }}>→ {a.letak}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ShioFengshuiLengkap({
  nama,
  tgl,
  jenisKelamin,
}: {
  nama?: string | null;
  tgl: string | null | undefined;
  jenisKelamin?: string | null;
}) {
  const gender = mapGender(jenisKelamin);
  const r = useMemo<ShioFengshuiResult | null>(() => {
    if (!tgl || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return null;
    return analisaShioFengshui((nama || "").trim(), tgl, gender) as ShioFengshuiResult;
  }, [nama, tgl, gender]);

  if (!tgl) return null; // notifikasi tanggal lahir sudah ditampilkan blok weton
  if (!r) return null;

  const s = r.shio, et = r.elemenTahun, ef = r.elemenTetap;
  const k = r.fengshui, n = r.numerologi, tb = r.tahunBerjalan;
  const koc = r.kompatibilitas;
  const cocokTxt = [...koc.sanhe.map((x) => x.nama), koc.sahabat.nama].join(", ");
  const masterTag = (a?: number) =>
    a === 11 || a === 22 || a === 33 ? <span className="sf-master"><b>Master {a}</b></span> : null;
  const relColor = (t: string) =>
    t.includes("baik")
      ? "var(--good)"
      : t === "menantang" || t === "hati2" || t === "kurang"
      ? "var(--cinnabar-lite)"
      : "var(--parch)";

  return (
    <div className="sf-root">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* HERO */}
      <div className="sf-hero sf-pad">
        <div className="sf-glyph">
          <span>{s.glyph}</span>
        </div>
        <div>
          <div className="sf-eyebrow">乾坤 · Shio &amp; Fengshui Tionghoa</div>
          <div className="sf-sub" style={{ color: "var(--muted)", marginTop: 4 }}>
            {et.nama} {et.han} · {r.yinyang} · Tahun Lunar {r.input.tahunLunar}
          </div>
          <h2 className="sf-h2">
            Shio {s.nama} {et.nama}
          </h2>
          <div className="sf-sub" style={{ color: "var(--muted)" }}>
            {s.en} · {s.han} · {s.cabang} · Ganzhi {r.ganzhi}
          </div>
          <div className="sf-pills">
            <span className="sf-pill">Urutan ke-<b>{s.urutan}</b></span>
            <span className="sf-pill">Yin/Yang <b>{r.yinyang}</b></span>
            <span className="sf-pill">Jam <b>{s.jam}</b></span>
            <span className="sf-pill">Arah <b>{s.arah}</b></span>
            <span className="sf-pill">Elemen Tetap <b>{ef.nama} {ef.han}</b></span>
          </div>
        </div>
      </div>

      {/* 01 PERWATAKAN */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">01</span>Perwatakan {s.nama}</h3>
        <div className="sf-prose">
          <span className="sf-lead">{s.nama[0]}</span>
          {s.watak}
        </div>
        <div className="sf-cards" style={{ marginTop: 14 }}>
          <div className="sf-card">
            <h4>Bintang Positif (+)</h4>
            <ul className="sf-tick">{s.positif.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div className="sf-card">
            <h4>Bayangan / Waspadai (−)</h4>
            <ul className="sf-tick neg">{s.negatif.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* 02 PENGARUH ELEMEN */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">02</span>Pengaruh Elemen — {et.nama} {et.han}</h3>
        <p className="sf-cap">Elemen tahun (batang langit) mewarnai watak dasar shio.</p>
        <div className="sf-prose">{et.pengaruh}</div>
        <div className="sf-cards" style={{ marginTop: 14 }}>
          <div className="sf-card">
            <h4>Sifat Elemen {et.nama}</h4>
            <ul className="sf-tick">{et.sifat.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div className="sf-card">
            <h4>Atribut</h4>
            <p>
              Arah: <b style={{ color: "var(--gold-lite)" }}>{et.arah}</b>
              <br />
              Musim: <b style={{ color: "var(--gold-lite)" }}>{et.musim}</b>
              <br />
              Warna:{" "}
              <span dangerouslySetInnerHTML={{ __html: swatch(et.warna) }} />
              <b style={{ color: "var(--gold-lite)" }}>{et.nama}</b>
            </p>
            <div style={{ marginTop: 10 }} className="sf-chips">
              <span className="sf-chip">木 Kayu</span>
              <span className="sf-chip">火 Api</span>
              <span className="sf-chip">土 Tanah</span>
              <span className="sf-chip">金 Logam</span>
              <span className="sf-chip">水 Air</span>
            </div>
          </div>
          <div className="sf-vizcard">
            <h4 style={{ alignSelf: "flex-start", margin: 0, fontSize: 12.5, color: "var(--gold-lite)", textTransform: "uppercase", letterSpacing: ".04em" }}>
              Siklus Lima Elemen
            </h4>
            <svg viewBox="0 0 260 260" role="img" aria-label="Siklus lima elemen" dangerouslySetInnerHTML={{ __html: wheelHTML(ef.nama) }} />
            <div className="sf-legend">
              <span><i style={{ background: "var(--jade)" }} />Menghidupi (生)</span>
              <span><i style={{ background: "var(--cinnabar)" }} />Mengatasi (克)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 03 HIDUP & REZEKI */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">03</span>Hidup &amp; Rezeki</h3>
        <div className="sf-cards">
          <div className="sf-card"><h4>Karier</h4><p>{s.karier}</p></div>
          <div className="sf-card"><h4>Keuangan</h4><p>{s.keuangan}</p></div>
          <div className="sf-card"><h4>Cinta &amp; Jodoh</h4><p>{s.cinta}</p></div>
          <div className="sf-card"><h4>Kesehatan</h4><p>{s.kesehatan}</p></div>
        </div>
        <div className="sf-cards" style={{ marginTop: 14 }}>
          <div className="sf-card">
            <h4>Warna Hoki</h4>
            <div className="sf-chips">
              {s.warna.map((w, i) => (
                <span key={i} className="sf-chip">
                  <span className="sf-swatch" style={{ background: w[1] }} />
                  {w[0]}
                </span>
              ))}
            </div>
          </div>
          <div className="sf-card">
            <h4>Angka Hoki</h4>
            <div className="sf-chips">{s.angka.map((a, i) => <span key={i} className="sf-chip">{a}</span>)}</div>
          </div>
          <div className="sf-card">
            <h4>Arah Hoki</h4>
            <div className="sf-chips">{s.arahHoki.map((a, i) => <span key={i} className="sf-chip">{a}</span>)}</div>
          </div>
          <div className="sf-card">
            <h4>Bunga &amp; Batu</h4>
            <div className="sf-chips">
              {s.bunga.map((b, i) => <span key={i} className="sf-chip">{b}</span>)}
              <span className="sf-chip">{s.batu}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 04 JODOH & KECOCOKAN */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">04</span>Jodoh &amp; Kecocokan Shio</h3>
        <p className="sf-cap">
          San He (segitiga harmoni) · Liu He (sahabat rahasia) · Liu Chong (tabrakan) · Liu Hai (kurang serasi).
        </p>
        <div className="sf-cards">
          <div className="sf-card">
            <h4 className="sf-tag-good">★ Paling Cocok</h4>
            <p style={{ fontSize: 15 }}><b style={{ color: "var(--gold-lite)" }}>{cocokTxt}</b></p>
            <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Segitiga harmoni + sahabat rahasia (Liu He).</p>
          </div>
          <div className="sf-card">
            <h4>Sahabat Rahasia (Liu He)</h4>
            <p style={{ fontSize: 15 }}><b style={{ color: "var(--gold-lite)" }}>{koc.sahabat.nama}</b> {koc.sahabat.han}</p>
            <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Pasangan enam serasi yang saling melengkapi.</p>
          </div>
          <div className="sf-card">
            <h4 className="sf-tag-bad">⚡ Tabrakan (Liu Chong)</h4>
            <p style={{ fontSize: 15 }}><b style={{ color: "var(--cinnabar-lite)" }}>{koc.musuh.nama}</b> {koc.musuh.han}</p>
            <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Energi berlawanan, butuh ekstra kompromi.</p>
          </div>
          <div className="sf-card">
            <h4 className="sf-tag-bad">Kurang Serasi (Liu Hai)</h4>
            <p style={{ fontSize: 15 }}><b style={{ color: "var(--cinnabar-lite)" }}>{koc.kurang.nama}</b> {koc.kurang.han}</p>
            <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Rawan salah paham, perlu komunikasi.</p>
          </div>
        </div>
      </section>

      {/* 05 FENGSHUI — ANGKA KUA */}
      {k ? (
        <section className="sf-block sf-pad">
          <h3 className="sf-h3"><span className="sf-no">05</span>Fengshui Pribadi — Angka Kua</h3>
          <p className="sf-cap">
            Berdasarkan tahun lunar &amp; jenis kelamin. Hadapkan aktivitas penting ke arah baik, jauhi arah buruk.
          </p>
          <div className="sf-cards" style={{ marginBottom: 16 }}>
            <div className="sf-card">
              <h4>Angka Kua</h4>
              <div className="sf-big">{k.kuaNo}</div>
              <p style={{ marginTop: 6 }}>Istana {k.istana} · Elemen {k.elemenKua.nama} {k.elemenKua.han}</p>
            </div>
            <div className="sf-card">
              <h4>Kelompok</h4>
              <p className="sf-big" style={{ fontSize: 22 }}>{k.grup}</p>
              <p style={{ marginTop: 6 }}>{k.grup === "Timur" ? "Cocok hadap U · S · T · TG" : "Cocok hadap B · BL · BD · TL"}</p>
            </div>
            <div className="sf-card">
              <h4>Cara Pakai</h4>
              <p>
                Arahkan kepala saat tidur, pintu, dan meja kerja ke arah{" "}
                <b style={{ color: "var(--good)" }}>baik</b>. Letakkan toilet/gudang di arah{" "}
                <b style={{ color: "var(--cinnabar-lite)" }}>buruk</b>.
              </p>
            </div>
          </div>
          <div className="sf-viz">
            <div className="sf-vizcard">
              <h4 style={{ alignSelf: "flex-start", margin: 0, fontSize: 12.5, color: "var(--gold-lite)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Kompas Arah Keberuntungan
              </h4>
              <svg viewBox="0 0 300 300" role="img" aria-label="Kompas arah Fengshui" dangerouslySetInnerHTML={{ __html: compassHTML(k) }} />
              <div className="sf-legend">
                <span><i style={{ background: "var(--gold)" }} />Sangat Baik</span>
                <span><i style={{ background: "var(--jade)" }} />Baik</span>
                <span><i style={{ background: "var(--cinnabar)" }} />Buruk</span>
                <span><i style={{ background: "#7f1d1d" }} />Terburuk</span>
              </div>
            </div>
            <div className="sf-vizcard" style={{ alignItems: "stretch" }}>
              <h4 style={{ margin: 0, fontSize: 12.5, color: "var(--gold-lite)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Empat Arah Baik (吉)
              </h4>
              <DirTable rows={k.baik} />
              <h4 style={{ marginTop: 14, fontSize: 12.5, color: "var(--gold-lite)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Empat Arah Buruk (凶)
              </h4>
              <DirTable rows={k.buruk} />
            </div>
          </div>
        </section>
      ) : (
        <section className="sf-block sf-pad">
          <h3 className="sf-h3"><span className="sf-no">05</span>Fengshui Pribadi — Angka Kua</h3>
          <p className="sf-cap" style={{ margin: 0 }}>
            Lengkapi <b style={{ color: "var(--gold-lite)" }}>jenis kelamin</b> (di menu Pegawai → Edit)
            untuk menghitung Angka Kua, arah keberuntungan, dan kompas Fengshui pribadi.
          </p>
        </section>
      )}

      {/* 06 NUMEROLOGI */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">06</span>Bintang Angka (Numerologi Nama &amp; Lahir)</h3>
        <p className="sf-cap">
          Lapisan modern pelengkap — diturunkan dari huruf nama (Ekspresi/Takdir) &amp; tanggal lahir (Jalan Hidup).
        </p>
        <div className="sf-cards">
          <div className="sf-card">
            <h4>Angka Ekspresi / Takdir (dari Nama)</h4>
            {n.ekspresi.angka ? (
              <>
                <div className="sf-big">{n.ekspresi.angka}{masterTag(n.ekspresi.angka)}</div>
                <p style={{ marginTop: 8 }}><b style={{ color: "var(--gold-lite)" }}>{n.ekspresi.makna.judul}</b></p>
                <p style={{ marginTop: 4 }}>{n.ekspresi.makna.teks}</p>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>Total huruf: {n.ekspresi.total}</p>
              </>
            ) : (
              <p>Isi nama lengkap untuk melihat angka ekspresi.</p>
            )}
          </div>
          <div className="sf-card">
            <h4>Angka Jalan Hidup (dari Tanggal Lahir)</h4>
            <div className="sf-big">{n.jalanHidup.angka}{masterTag(n.jalanHidup.angka)}</div>
            <p style={{ marginTop: 8 }}><b style={{ color: "var(--gold-lite)" }}>{n.jalanHidup.makna.judul}</b></p>
            <p style={{ marginTop: 4 }}>{n.jalanHidup.makna.teks}</p>
          </div>
        </div>
      </section>

      {/* 07 PERUNTUNGAN TAHUN BERJALAN */}
      <section className="sf-block sf-pad">
        <h3 className="sf-h3"><span className="sf-no">07</span>Peruntungan Tahun {tb.tahun}</h3>
        <p className="sf-cap">
          Relasi shio kamu dengan tahun berjalan:{" "}
          <b style={{ color: "var(--gold-lite)" }}>{tb.shio.nama} {tb.elemen.nama}</b> {tb.shio.han}.
        </p>
        <div className="sf-cards">
          <div className="sf-card">
            <h4>Relasi Shio dengan Tahun</h4>
            <p style={{ fontSize: 14.5 }}><b style={{ color: relColor(tb.relasiShio.t) }}>{tb.relasiShio.jenis}</b></p>
            <p style={{ marginTop: 6 }}>{tb.relasiShio.ket}</p>
          </div>
          <div className="sf-card">
            <h4>Relasi Elemen dengan Tahun</h4>
            <p style={{ fontSize: 14.5 }}>{tb.relasiElemen.label}</p>
          </div>
        </div>
      </section>

      <p className="sf-note sf-pad">
        <b>Catatan akurasi.</b> Shio &amp; elemen dihitung dari batas Tahun Baru Imlek (tabel 1912–2070),
        bukan 1 Januari — penting bagi yang lahir Januari–Februari. Angka Kua memakai batas tahun lunar
        yang sama. Bintang angka adalah interpretasi simbolik pelengkap. Anggap seluruh hasil sebagai
        panduan refleksi budaya, bukan kepastian.
      </p>
    </div>
  );
}
