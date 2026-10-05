export function FeatureIcon({ index = 0 }: { index?: number }) {
  const paths = [
    'M8 3v3m8-3v3M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1m3 9 3 3 5-5',
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',
    'M3 5h12v12H3V5m12 4h3l3 4v4h-6M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4m11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
    'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 3-3 9 0 9h2V3h-2m2 9v9',
    'm3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 4 9-4m-9 4v10',
    'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4m-4 9 3 3 5-5',
    'M5 3h14v18H5V3m4 5h6m-6 4h6m-6 4h3',
    'M4 20V4m0 16h16M8 16v-4m4 4V8m4 8v-6',
  ];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[index % paths.length]}/></svg>;
}
export default function ProductPreview() {
  return <div className="mk-preview" aria-label="Ilustrasi alur administrasi SPPG menggunakan data contoh">
    <div className="mk-preview-top"><span className="mk-preview-dots"><i/><i/><i/></span><span>Ilustrasi alur · Data contoh</span><span className="mk-online">●</span></div>
    <div className="mk-preview-body">
      <aside className="mk-preview-sidebar" aria-hidden="true"><span className="mk-mini-brand">MBG</span>{[0,1,2,3,7].map(i => <span key={i} className={i === 0 ? 'selected' : ''}><FeatureIcon index={i}/></span>)}</aside>
      <div className="mk-preview-content"><div className="mk-preview-heading"><div><span className="mk-eyebrow">OPERASIONAL DAPUR</span><p>Ringkasan tim SPPG</p></div><span className="mk-pill">Contoh</span></div>
        <div className="mk-mini-stats"><div><span>Kehadiran</span><strong>48<span>/ 50</span></strong><small>Catatan per shift</small></div><div><span>Distribusi</span><strong>12<span> tujuan</span></strong><small>Porsi & dokumentasi</small></div></div>
        <div className="mk-flow-card"><div><span className="mk-icon"><FeatureIcon/></span><div><strong>Absensi lintas tanggal</strong><small>Masuk → sesi kerja → pulang</small></div><span className="mk-status">Tercatat</span></div><div className="mk-shift-track"><span>22.00<small>Masuk</small></span><i/><span>06.00<small>Pulang</small></span></div></div>
        <div className="mk-preview-rows">{[['Rekap kehadiran','Periksa catatan'],['Slip & komponen gaji','Tinjau sebelum terbit'],['Laporan distribusi','Lengkapi dokumentasi']].map(([name,status],i) => <div key={name}><span className="mk-row-check"><FeatureIcon index={i+5}/></span><strong>{name}</strong><span>{status}</span></div>)}</div>
      </div>
    </div>
    <div className="mk-preview-caption">Catat oleh staf. Periksa oleh admin. Pantau bersama kepala SPPG.</div>
  </div>;
}
