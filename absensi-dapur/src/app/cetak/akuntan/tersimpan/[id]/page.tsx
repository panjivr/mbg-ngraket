"use client";

/**
 * Penampil BA tersimpan. Ambil satu BA (beserta konten_html) dari arsip lalu
 * render ulang untuk dilihat / dicetak. Dibuka dari /admin/akuntan/arsip.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SavedViewer } from "../../_components";

interface BaFull {
  id: number;
  judul: string;
  nomor: string;
  tanggal: string;
  konten_html: string;
}

export default function TersimpanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [item, setItem] = useState<BaFull | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/akuntan/ba/${id}`);
        const data = (await res.json().catch(() => ({}))) as {
          item?: BaFull;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Gagal memuat BA.");
        if (!batal) setItem(data.item ?? null);
      } catch (e) {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat.");
      }
    })();
    return () => {
      batal = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        {error} —{" "}
        <a href="/admin/akuntan/arsip" className="underline">
          kembali ke arsip
        </a>
      </div>
    );
  }

  if (!item) {
    return <div className="p-6 text-sm text-slate-400">Memuat…</div>;
  }

  return <SavedViewer html={item.konten_html} />;
}
