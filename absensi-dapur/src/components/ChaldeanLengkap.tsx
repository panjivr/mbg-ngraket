"use client";

import { useMemo } from "react";
import {
  analyzeName,
  analyzeBirthDay,
  analyzeLifePath,
  compatibility,
  COMPOUNDS,
  type NameResult,
} from "@/lib/chaldean";
import { analisaShioFengshui } from "@/lib/shioFengshui";

/* Palet seirama dengan tema web BGN (navy + royal blue + emas), konsisten
   dengan panel Shio & Fengshui di atasnya. Di-scope ke .cn-root. */
const STYLE = `
.cn-root{--ink:#0a1740;--surf:#0e1f55;--surf2:#16306e;--gold:#e0a92e;--gold-lite:#f3c349;
  --blue:#5b8bff;--blue-deep:#3464e6;--good:#34d399;--bad:#f87171;--sky:#38bdf8;
  --parch:#e2e8f0;--muted:#94a3b8;--line:rgba(91,139,255,.22);
  color:var(--parch);background:
   radial-gradient(900px 360px at 50% -10%,rgba(52,100,230,.16),transparent 60%),
   radial-gradient(700px 320px at 5% 0%,rgba(243,195,73,.06),transparent 55%),
   var(--ink);
  border:1px solid var(--line);border-radius:16px;overflow:hidden}
.cn-root *{box-sizing:border-box}
.cn-pad{padding:clamp(16px,3.5vw,28px)}
.cn-eyebrow{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.28em;
  text-transform:uppercase;color:var(--gold-lite)}
.cn-hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap;
  border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(52,100,230,.10),transparent)}
.cn-medal{width:96px;height:96px;flex:none;border-radius:50%;display:grid;place-items:center;position:relative;
  background:radial-gradient(circle at 50% 35%,rgba(52,100,230,.38),rgba(10,23,64,.92));
  border:1px solid var(--line);box-shadow:inset 0 0 26px rgba(0,0,0,.45)}
.cn-medal .num{font-family:"Cormorant Garamond",serif;font-weight:700;font-size:46px;line-height:1;color:var(--gold-lite);
  text-shadow:0 2px 12px rgba(52,100,230,.55)}
.cn-medal .sym{position:absolute;bottom:8px;font-size:16px;color:var(--blue)}
.cn-h2{font-family:"Cormorant Garamond",serif;font-size:clamp(24px,5vw,34px);font-weight:700;margin:.18em 0;line-height:1.05}
.cn-sub{font-size:13px;color:var(--muted)}
.cn-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.cn-pill{font-size:11.5px;border:1px solid var(--line);border-radius:999px;padding:4px 10px;background:rgba(255,255,255,.02)}
.cn-pill b{color:var(--gold-lite)}
.cn-block{border-top:1px solid var(--line)}
.cn-h3{font-family:"Cormorant Garamond",serif;font-size:21px;font-weight:700;display:flex;align-items:center;gap:10px;margin:0 0 8px}
.cn-no{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:11px;color:#0a1740;background:var(--gold);border-radius:6px;padding:3px 7px;font-weight:700}
.cn-cap{color:var(--muted);font-size:12.5px;margin:0 0 12px}
.cn-prose{font-size:14px;line-height:1.6;color:#dbe4f7}
.cn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.cn-card{border:1px solid var(--line);border-radius:12px;padding:14px;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:4px}
.cn-card h4{margin:0 0 4px;font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--gold-lite)}
.cn-card p{margin:0;font-size:13.5px;line-height:1.55;color:#dbe4f7}
.cn-big{font-family:"Cormorant Garamond",serif;font-size:38px;font-weight:700;color:var(--gold-lite);line-height:1}
.cn-tick{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.cn-tick li{position:relative;padding-left:20px;font-size:13.5px;color:#dbe4f7}
.cn-tick li:before{content:"✦";position:absolute;left:0;color:var(--good)}
.cn-tick.neg li:before{content:"▲";color:var(--bad);font-size:10px;top:2px}
.cn-chips{display:flex;flex-wrap:wrap;gap:6px}
.cn-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid var(--line);border-radius:8px;padding:4px 9px;background:rgba(255,255,255,.02)}
.cn-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(255,255,255,.3)}
.cn-bd{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.cn-bd .cell{display:flex;flex-direction:column;align-items:center;min-width:26px;border:1px solid var(--line);border-radius:7px;padding:4px 2px;background:rgba(255,255,255,.02)}
.cn-bd .cell .l{font-weight:700;font-size:13px;color:var(--parch)}
.cn-bd .cell .v{font-family:ui-monospace,monospace;font-size:11px;color:var(--gold-lite)}
.cn-verdict{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;border:1px solid currentColor}
.cn-note{font-size:11.5px;color:var(--muted);line-height:1.6;border-top:1px solid var(--line)}
`;

const PLANET_GLYPH: Record<number, string> = {
  1: "☉", 2: "☽", 3: "♃", 4: "♅", 5: "☿", 6: "♀", 7: "♆", 8: "♄", 9: "♂",
};

const COLOR_HEX: Array<[string, string]> = [
  ["electric", "#38bdf8"], ["biru tua", "#1e3a8a"], ["biru", "#5b8bff"],
  ["emas", "#f3c349"], ["kuning", "#f3c349"], ["oranye", "#fb923c"], ["perunggu", "#b08d57"],
  ["krem", "#ede9d0"], ["putih berkilau", "#f1f5f9"], ["putih", "#e2e8f0"],
  ["hijau pucat", "#86efac"], ["hijau", "#34d399"],
  ["ungu", "#a78bfa"], ["violet", "#a78bfa"], ["mauve", "#c4a3d8"],
  ["merah ros", "#f472b6"], ["crimson", "#dc2626"], ["merah", "#ef4444"],
  ["pink", "#f9a8d4"], ["ros", "#fb7185"],
  ["abu gelap", "#475569"], ["abu terang", "#cbd5e1"], ["abu", "#94a3b8"],
  ["hitam", "#1e293b"],
];
function colorHex(name: string): string | null {
  const s = name.toLowerCase();
  for (const [key, hex] of COLOR_HEX) if (s.includes(key)) return hex;
  return null;
}

/* Jembatan planet→elemen Wu Xing (markdown §3): 4 Rahu & 7 Ketu = bayangan. */
const ROOT_ELEM: Record<number, string | null> = {
  1: "api", 2: "air", 3: "kayu", 4: null, 5: "air", 6: "logam", 7: null, 8: "tanah", 9: "api",
};
const PRODUKTIF: Record<string, string> = { kayu: "api", api: "tanah", tanah: "logam", logam: "air", air: "kayu" };
const DESTRUKTIF: Record<string, string> = { kayu: "tanah", tanah: "air", air: "api", api: "logam", logam: "kayu" };
const NAMA2KEY: Record<string, string> = { Kayu: "kayu", Api: "api", Tanah: "tanah", Logam: "logam", Air: "air" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function relasiElemen(a: string, b: string): { label: string; tone: "good" | "warn" | "neutral" } {
  if (a === b) return { label: `Sama-sama ${cap(a)} — saling menguatkan & nyaman`, tone: "good" };
  if (PRODUKTIF[a] === b) return { label: `${cap(a)} menghidupi ${cap(b)} — energi nama mendukung shio`, tone: "good" };
  if (PRODUKTIF[b] === a) return { label: `${cap(b)} menghidupi ${cap(a)} — shio menyuburkan energi nama`, tone: "good" };
  if (DESTRUKTIF[a] === b) return { label: `${cap(a)} mengatasi ${cap(b)} — nama mendominasi/menguras shio`, tone: "warn" };
  if (DESTRUKTIF[b] === a) return { label: `${cap(b)} mengatasi ${cap(a)} — shio menekan energi nama, perlu penyeimbang`, tone: "warn" };
  return { label: "Netral", tone: "neutral" };
}

const VERDICT_COL: Record<string, string> = {
  baik: "var(--good)", buruk: "var(--bad)", netral: "var(--muted)", "hati-hati": "var(--gold-lite)",
};
const HOKI_COMPOUND = [19, 23, 27, 37, 21, 24, 17];
const HINDARI_COMPOUND = [11, 16, 18, 22, 26, 28, 29, 43, 52];

function ColorChips({ colors }: { colors: string[] }) {
  return (
    <div className="cn-chips">
      {colors.map((c, i) => {
        const hex = colorHex(c);
        return (
          <span key={i} className="cn-chip">
            {hex && <span className="cn-swatch" style={{ background: hex }} />}
            {c}
          </span>
        );
      })}
    </div>
  );
}

function CompoundLine({ num }: { num: number }) {
  const info = COMPOUNDS[num];
  if (!info) return null;
  return (
    <>
      <p style={{ marginTop: 8 }}>
        <b style={{ color: "var(--gold-lite)" }}>{info.symbol}</b>{" "}
        <span className="cn-verdict" style={{ color: VERDICT_COL[info.verdict] }}>{info.verdict}</span>
      </p>
      <p style={{ marginTop: 4 }}>{info.meaning}</p>
    </>
  );
}

export default function ChaldeanLengkap({
  nama,
  tgl,
}: {
  nama?: string | null;
  tgl?: string | null;
}) {
  const data = useMemo(() => {
    const bersih = (nama || "").trim();
    if (!bersih || !/[A-Za-z]/.test(bersih)) return null;
    const name: NameResult = analyzeName(bersih);
    const valid = tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl);
    const day = valid ? parseInt(tgl!.slice(8, 10), 10) : null;
    const birth = day ? analyzeBirthDay(day) : null;
    const lifePath = valid ? analyzeLifePath(tgl!) : null;
    const nameVsBirth = birth ? compatibility(name.root, birth.root) : null;
    // Jembatan ke Shio & Fengshui (elemen tahun lahir Tionghoa)
    let bridge: { nameEl: string | null; shioEl: string; rel: ReturnType<typeof relasiElemen> | null } | null = null;
    if (valid) {
      const sf = analisaShioFengshui(bersih, tgl!, null) as { elemenTahun: { nama: string } };
      const shioKey = NAMA2KEY[sf.elemenTahun.nama];
      const nameKey = ROOT_ELEM[name.root];
      bridge = {
        nameEl: nameKey,
        shioEl: shioKey,
        rel: nameKey && shioKey ? relasiElemen(nameKey, shioKey) : null,
      };
    }
    return { name, birth, lifePath, nameVsBirth, bridge };
  }, [nama, tgl]);

  if (!data) {
    return (
      <div className="card p-4 text-sm text-slate-400">
        🔢 Numerologi Chaldean belum tersedia — nama belum terisi.
      </div>
    );
  }

  const { name, birth, lifePath, nameVsBirth, bridge } = data;
  const p = name.planet;
  const perluKoreksi =
    (name.compoundInfo && (name.compoundInfo.verdict === "buruk" || name.compoundInfo.verdict === "hati-hati")) ||
    HINDARI_COMPOUND.includes(name.compound);

  return (
    <div className="cn-root">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* HERO */}
      <div className="cn-hero cn-pad">
        <div className="cn-medal">
          <span className="num">{name.root}</span>
          <span className="sym">{PLANET_GLYPH[name.root]}</span>
        </div>
        <div>
          <div className="cn-eyebrow">Numerologi Chaldean · Planetary</div>
          <h2 className="cn-h2">Angka {name.root} — {p.planet}</h2>
          <div className="cn-sub">
            {name.name} · Angka Nama (compound) <b style={{ color: "var(--gold-lite)" }}>{name.compound}</b>
            {name.compoundInfo ? ` · ${name.compoundInfo.symbol}` : ""}
          </div>
          <div className="cn-pills">
            <span className="cn-pill">Planet <b>{p.planet}</b></span>
            <span className="cn-pill">Vedic <b>{p.vedic}</b></span>
            <span className="cn-pill">Elemen <b>{p.element}</b></span>
            {birth && <span className="cn-pill">Angka Lahir <b>{birth.root}</b></span>}
            {lifePath && <span className="cn-pill">Jalan Hidup <b>{lifePath.root}</b></span>}
          </div>
        </div>
      </div>

      {/* 01 ANGKA NAMA */}
      <section className="cn-block cn-pad">
        <h3 className="cn-h3"><span className="cn-no">01</span>Angka Nama (Ekspresi / Takdir)</h3>
        <p className="cn-cap">
          Dihitung dari getaran tiap huruf nama (tabel Chaldean 1–8). Compound = pengaruh tersembunyi
          &amp; nasib; Root = kepribadian luar.
        </p>
        <div className="cn-cards">
          <div className="cn-card">
            <h4>Compound Number (Pengaruh &amp; Nasib)</h4>
            <div className="cn-big">{name.compound}</div>
            {name.compoundInfo ? (
              <CompoundLine num={name.compound} />
            ) : (
              <p style={{ marginTop: 8 }}>
                Total nama tereduksi langsung ke angka tunggal <b style={{ color: "var(--gold-lite)" }}>{name.root}</b>{" "}
                (tanpa makna compound khusus 10–52).
              </p>
            )}
          </div>
          <div className="cn-card">
            <h4>Root Number (Kepribadian Luar)</h4>
            <div className="cn-big">{name.root} <span style={{ fontSize: 20, color: "var(--blue)" }}>{PLANET_GLYPH[name.root]}</span></div>
            <p style={{ marginTop: 8 }}><b style={{ color: "var(--gold-lite)" }}>{p.planet} · {p.vedic}</b></p>
            <p style={{ marginTop: 4 }}>{p.trait}</p>
          </div>
        </div>
        <div className="cn-cards" style={{ marginTop: 12 }}>
          <div className="cn-card">
            <h4>Sisi Kuat (+)</h4>
            <ul className="cn-tick">{p.positive.split(", ").map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div className="cn-card">
            <h4>Sisi Waspadai (−)</h4>
            <ul className="cn-tick neg">{p.negative.split(", ").map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div className="cn-card">
            <h4>Rincian Huruf → Angka</h4>
            <div className="cn-bd">
              {name.breakdown.map((b, i) => (
                <span key={i} className="cell"><span className="l">{b.letter}</span><span className="v">{b.value}</span></span>
              ))}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
              Jumlah getaran huruf → compound {name.compound} → root {name.root}.
            </p>
          </div>
        </div>
      </section>

      {/* 02 PLANET & HOKI */}
      <section className="cn-block cn-pad">
        <h3 className="cn-h3"><span className="cn-no">02</span>Penguasa Planet &amp; Keberuntungan</h3>
        <p className="cn-cap">Atribut hoki dari planet penguasa angka — menyambung ke warna/hari/elemen pada Shio &amp; Fengshui.</p>
        <div className="cn-cards">
          <div className="cn-card">
            <h4>Elemen (Wu Xing)</h4>
            <p style={{ fontSize: 15 }}><b style={{ color: "var(--gold-lite)" }}>{p.element}</b></p>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>Jembatan ke sistem Shio &amp; Fengshui Tionghoa.</p>
          </div>
          <div className="cn-card">
            <h4>Hari Baik</h4>
            <div className="cn-chips">{p.days.map((d, i) => <span key={i} className="cn-chip">{d}</span>)}</div>
          </div>
          <div className="cn-card">
            <h4>Warna Hoki</h4>
            <ColorChips colors={p.colors} />
          </div>
          <div className="cn-card">
            <h4>Permata / Batu</h4>
            <div className="cn-chips">{p.gems.map((g, i) => <span key={i} className="cn-chip">{g}</span>)}</div>
          </div>
        </div>
      </section>

      {/* 03 ANGKA LAHIR & JALAN HIDUP */}
      {(birth || lifePath) && (
        <section className="cn-block cn-pad">
          <h3 className="cn-h3"><span className="cn-no">03</span>Angka Lahir &amp; Jalan Hidup</h3>
          <p className="cn-cap">Dari tanggal lahir: Angka Lahir (watak dasar) &amp; Jalan Hidup (arah hidup keseluruhan).</p>
          <div className="cn-cards">
            {birth && (
              <div className="cn-card">
                <h4>Angka Lahir (Psychic / Mulank)</h4>
                <div className="cn-big">{birth.root} <span style={{ fontSize: 20, color: "var(--blue)" }}>{PLANET_GLYPH[birth.root]}</span></div>
                <p style={{ marginTop: 8 }}><b style={{ color: "var(--gold-lite)" }}>{birth.planet.planet}</b></p>
                <p style={{ marginTop: 4 }}>{birth.planet.trait}. Menggambarkan watak dasar, kesehatan, &amp; kepribadian inti.</p>
              </div>
            )}
            {lifePath && (
              <div className="cn-card">
                <h4>Jalan Hidup (Life Path)</h4>
                <div className="cn-big">{lifePath.root} <span style={{ fontSize: 20, color: "var(--blue)" }}>{PLANET_GLYPH[lifePath.root]}</span></div>
                <p style={{ marginTop: 8 }}><b style={{ color: "var(--gold-lite)" }}>{lifePath.planet.planet}</b> · compound {lifePath.compound}</p>
                {COMPOUNDS[lifePath.compound] ? <CompoundLine num={lifePath.compound} /> : <p style={{ marginTop: 4 }}>{lifePath.planet.trait}.</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 04 KESELARASAN NAMA ↔ LAHIR */}
      {nameVsBirth && birth && (
        <section className="cn-block cn-pad">
          <h3 className="cn-h3"><span className="cn-no">04</span>Keselarasan Nama ↔ Lahir</h3>
          <p className="cn-cap">Apakah planet penguasa nama (root {name.root}) bersahabat dengan planet tanggal lahir (angka {birth.root}).</p>
          <div className="cn-cards">
            <div className="cn-card">
              <h4>Status Keselarasan</h4>
              <p style={{ fontSize: 16 }}>
                <b style={{ color: nameVsBirth.score === 1 ? "var(--good)" : nameVsBirth.score === -1 ? "var(--bad)" : "var(--muted)" }}>
                  {nameVsBirth.label}
                </b>
              </p>
              <p style={{ marginTop: 6 }}>
                {nameVsBirth.score === 1
                  ? "Energi nama & tanggal lahir saling mendukung — karier, relasi, dan rezeki cenderung lebih lancar."
                  : nameVsBirth.score === -1
                  ? "Energi nama & tanggal lahir kurang sejalan — bisa muncul hambatan; pertimbangkan koreksi/penyelarasan nama."
                  : "Energi nama & tanggal lahir netral — tidak menghambat, tidak pula sangat mendukung."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 05 JEMBATAN KE SHIO & FENGSHUI */}
      {bridge && (
        <section className="cn-block cn-pad">
          <h3 className="cn-h3"><span className="cn-no">05</span>Keterkaitan dengan Shio &amp; Fengshui</h3>
          <p className="cn-cap">Menyambungkan numerologi nama dengan elemen tahun lahir Tionghoa lewat jembatan planet → Wu Xing.</p>
          <div className="cn-cards">
            <div className="cn-card">
              <h4>Elemen Nama (dari planet)</h4>
              <p style={{ fontSize: 15 }}><b style={{ color: "var(--gold-lite)" }}>{bridge.nameEl ? cap(bridge.nameEl) : "Bayangan (Rahu/Ketu)"}</b></p>
              <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>
                {bridge.nameEl ? "Padanan Wu Xing dari planet penguasa nama." : "Angka 4/7 = simpul bulan (bayangan), tanpa padanan elemen klasik."}
              </p>
            </div>
            <div className="cn-card">
              <h4>Elemen Shio (tahun lahir)</h4>
              <p style={{ fontSize: 15 }}><b style={{ color: "var(--gold-lite)" }}>{bridge.shioEl ? cap(bridge.shioEl) : "—"}</b></p>
              <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>Elemen batang langit tahun kelahiran (lihat panel Shio di atas).</p>
            </div>
            <div className="cn-card">
              <h4>Hubungan Energi</h4>
              {bridge.rel ? (
                <p style={{ fontSize: 14 }}>
                  <b style={{ color: bridge.rel.tone === "good" ? "var(--good)" : bridge.rel.tone === "warn" ? "var(--bad)" : "var(--muted)" }}>
                    {bridge.rel.label}
                  </b>
                </p>
              ) : (
                <p>Tak ada padanan elemen untuk angka bayangan (4/7); pakai pembacaan shio &amp; numerologi secara terpisah.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 06 KOREKSI NAMA */}
      {perluKoreksi && (
        <section className="cn-block cn-pad">
          <h3 className="cn-h3"><span className="cn-no">06</span>Catatan Koreksi Nama</h3>
          <p className="cn-prose">
            Compound nama <b style={{ color: "var(--gold-lite)" }}>{name.compound}</b> tergolong getaran yang
            perlu diwaspadai. Dalam tradisi Chaldean, ejaan nama panggilan bisa disesuaikan (tambah/kurang/ubah
            huruf) agar total jatuh ke angka yang lebih hoki — misalnya compound{" "}
            <b style={{ color: "var(--good)" }}>{HOKI_COMPOUND.join(", ")}</b>. Bersifat tradisi; gunakan sebagai
            bahan refleksi, bukan keharusan.
          </p>
        </section>
      )}

      <p className="cn-note cn-pad">
        <b>Catatan.</b> Numerologi Chaldean (Cheiro, <i>The Book of Numbers</i>) menilai getaran suara huruf
        (nilai 1–8; angka 9 dianggap suci). Hasil bersifat interpretasi simbolik/tradisi untuk refleksi diri,
        bukan klaim ilmiah maupun kepastian.
      </p>
    </div>
  );
}
