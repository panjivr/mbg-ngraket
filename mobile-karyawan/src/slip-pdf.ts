import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {SlipResponse} from "./types";
import {rupiah} from "./ui";
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export async function shareSlip(data:SlipResponse) {
  const s=data.slip;
  if(!data.visible || !s)throw new Error("Slip belum tersedia.");
  const rows=[["Upah kehadiran",s.upah_kehadiran],["Lembur",s.upah_lembur],["Potongan",s.potongan],["Kasbon",s.kasbon],["Total",s.total]] as const;
  const {uri}=await Print.printToFileAsync({html:`<!doctype html><html><meta charset="utf-8"><body style="font-family:sans-serif;padding:24px">
    <h1>Slip gaji</h1><p>${escape(data.dapur||"")} · ${escape(s.user.nama)}</p><p>${s.periode.from} – ${s.periode.to}</p>
    <table>${rows.map(([label,value])=>`<tr><td>${label}</td><td>${rupiah(value)}</td></tr>`).join("")}</table>
    <p>${escape(s.nb)}</p></body></html>`});
  if(!(await Sharing.isAvailableAsync()))throw new Error("Berbagi file tidak tersedia di perangkat ini.");
  await Sharing.shareAsync(uri,{mimeType:"application/pdf",dialogTitle:"Simpan atau bagikan slip gaji"});
}
