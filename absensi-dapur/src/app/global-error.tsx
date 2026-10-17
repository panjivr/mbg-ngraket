"use client";

/**
 * Error boundary tingkat root (mengganti layout utama bila error terjadi di
 * sana). Harus menyertakan <html>/<body> sendiri. Dibuat sederhana & mandiri
 * (tanpa bergantung komponen lain) agar selalu tampil meski sistem bermasalah.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#070f29", color: "#e2e8f0", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Terjadi gangguan sementara</h1>
            <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 6 }}>
              Sistem sedang sibuk sesaat. Silakan muat ulang beberapa saat lagi.
            </p>
            <button
              onClick={reset}
              style={{ marginTop: 18, padding: "10px 20px", borderRadius: 12, border: "none", background: "#3464e6", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
