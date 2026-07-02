"use client";

import { useEffect, useState } from "react";

interface BirthdayData {
  birthday: boolean;
  nama?: string;
  usia?: number;
  pesan?: string;
  tanggal?: string;
}

/** Modal ucapan ulang tahun — muncul sekali per hari saat pengguna login. */
export default function BirthdayGreeting() {
  const [data, setData] = useState<BirthdayData | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/birthday", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BirthdayData | null) => {
        if (!d?.birthday || !d.tanggal) return;
        const key = `hbd-shown-${d.tanggal}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        setData(d);
        setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show || !data) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onClick={() => setShow(false)}
    >
      <div
        className="card w-full max-w-sm overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-b from-emas-500/25 to-transparent px-6 pt-8 pb-2">
          <div className="text-6xl">🎂</div>
          <h2 className="mt-4 text-2xl font-extrabold text-emas-300">
            Selamat Ulang Tahun!
          </h2>
          <p className="mt-1 text-lg font-semibold">
            {data.nama}
            {data.usia ? ` · ${data.usia} tahun` : ""}
          </p>
        </div>
        <div className="px-6 pb-6">
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {data.pesan}
          </p>
          <p className="mt-3 text-2xl">🎉 🎈 🥳</p>
          <button onClick={() => setShow(false)} className="btn-gold mt-5 w-full py-3">
            Aamiin, terima kasih! 🤲
          </button>
        </div>
      </div>
    </div>
  );
}
