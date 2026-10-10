"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
type Correction={id:number;nama:string;attendance_id:number;check_in:string;check_out:string|null;alasan:string;status:string;catatan_admin:string|null;original:{check_in:string;check_out:string|null}};
export default function CorrectionsPanel() {
  const [rows,setRows]=useState<Correction[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [notes,setNotes]=useState<Record<number,string>>({});
  const load=useCallback(async()=>{
    const response=await fetch("/api/hr/corrections",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error || "Gagal memuat koreksi.");
    setRows(data.corrections);
  },[]);
  useEffect(()=>{void load().catch(e=>setError(String(e)));},[load]);
  async function review(id:number,status:string) {
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/hr/corrections",{method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id,status,catatan_admin:notes[id] || null})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || "Gagal memproses koreksi.");
      await load();
    } catch(e){setError(e instanceof Error?e.message:"Gagal.");}
    finally{setBusy(false);}
  }
  return <section className="space-y-4"><Link href="/admin/hr" className="text-emas-300">← Kembali ke HR</Link>
    <h1 className="text-2xl font-bold">Koreksi absensi karyawan</h1>
    <p className="text-slate-300">Persetujuan mengubah waktu absensi dan hitungan slip. Data asli disimpan untuk audit.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!rows.length && <p>Belum ada pengajuan koreksi.</p>}
    {rows.map(c=><article key={c.id} className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
      <h2 className="font-bold">{c.nama} · #{c.attendance_id} · {c.status}</h2>
      <p>Asli: {c.original.check_in} – {c.original.check_out || "belum pulang"}</p>
      <p>Diajukan: {c.check_in} – {c.check_out || "belum pulang"}</p>
      <p className="whitespace-pre-wrap">{c.alasan}</p>{c.catatan_admin && <p>{c.catatan_admin}</p>}
      {c.status==="pending" && <><label className="block">Catatan peninjauan
        <textarea className="block w-full rounded bg-ink-900 border border-white/30 p-3" maxLength={2000}
          value={notes[c.id]||""} onChange={e=>setNotes({...notes,[c.id]:e.target.value})}/></label>
        <div className="flex gap-3"><button disabled={busy} className="min-h-12 rounded bg-emas-500 px-4 text-ink-950 disabled:opacity-50"
          onClick={()=>{void review(c.id,"disetujui");}}>Setujui koreksi</button>
          <button disabled={busy} className="min-h-12 rounded border border-white/30 px-4 disabled:opacity-50"
            onClick={()=>{void review(c.id,"ditolak");}}>Tolak</button></div></>}
    </article>)}
  </section>;
}
