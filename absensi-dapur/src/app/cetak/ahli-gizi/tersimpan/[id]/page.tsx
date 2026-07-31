"use client";

/**
 * Penampil dokumen gizi tersimpan. Ambil satu dokumen (beserta konten_html)
 * dari arsip lalu render ulang untuk dilihat / dicetak. Dibuka dari
 * /admin/ahli-gizi/arsip. Formulir lebar dirender mendatar (landscape).
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SavedViewer } from "../../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

interface GiziFull {
  id: number;
  slug: string;
  judul: string;
  nomor: string;
  tanggal: string;
  konten_html: string;
}

export default function TersimpanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [item, setItem] = useState<GiziFull | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/ahli-gizi/dok/${id}`);
        const data = (await res.json().catch(() => ({}))) as {
          item?: GiziFull;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Gagal memuat dokumen.");
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
        <a href="/admin/ahli-gizi/arsip" className="underline">
          kembali ke arsip
        </a>
      </div>
    );
  }

  if (!item) {
    return <div className="p-6 text-sm text-slate-400">Memuat…</div>;
  }

  const landscape = getTemplateGizi(item.slug)?.landscape ?? false;
  return (
    <SavedViewer
      html={item.konten_html}
      backUrl="/admin/ahli-gizi/arsip"
      landscape={landscape}
    />
  );
}
