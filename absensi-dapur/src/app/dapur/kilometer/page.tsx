"use client";

import KilometerInput from "@/components/KilometerInput";

export default function DapurKilometerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">🚗 Data Kilometer Kendaraan</h1>
        <p className="text-sm text-slate-400">
          Foto odometer <b>sebelum</b> dan <b>sesudah</b> memakai kendaraan. AI membaca angkanya otomatis — cek &amp; koreksi bila perlu, lalu simpan.
        </p>
      </div>
      <KilometerInput compact />
    </div>
  );
}
