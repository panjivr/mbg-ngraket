import React,{useCallback,useEffect,useState} from "react";
import {ActivityIndicator,Alert,AppState,Image,KeyboardAvoidingView,RefreshControl,ScrollView,Text,View} from "react-native";
import {SafeAreaProvider,SafeAreaView} from "react-native-safe-area-context";
import {StatusBar} from "expo-status-bar";
import {api,login,logout,restore,setExpiryHandler} from "./src/api";
import {Today,Attendance,Schedule,Leave,Correction,Announcement,Notice,Profile,SlipResponse} from "./src/types";
import {Button,Card,Copy,Field,Label,styles,stamp,rupiah} from "./src/ui";
import AttendanceScreen from "./src/AttendanceScreen";
import DateField from "./src/DateField";
import {pickImage} from "./src/media";
import {setReminders,clearReminders} from "./src/reminders";
import {shareSlip} from "./src/slip-pdf";

const tabs=["Absensi","Jadwal","Riwayat","Izin","Koreksi","Slip gaji","Pengumuman","Notifikasi","Profil"] as const;
type Tab=typeof tabs[number];
const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function EmployeeApp() {
  const [ready,setReady]=useState(false),[signedIn,setSignedIn]=useState(false);
  const [username,setUsername]=useState(""),[password,setPassword]=useState("");
  const [tab,setTab]=useState<Tab>("Absensi"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [today,setToday]=useState<Today|null>(null),[schedule,setSchedule]=useState<Schedule[]>([]);
  const [history,setHistory]=useState<Attendance[]>([]),[leaves,setLeaves]=useState<Leave[]>([]),[corrections,setCorrections]=useState<Correction[]>([]);
  const [announcements,setAnnouncements]=useState<Announcement[]>([]),[notices,setNotices]=useState<Notice[]>([]);
  const [profile,setProfile]=useState<Profile|null>(null),[slip,setSlip]=useState<SlipResponse|null>(null);
  const [bio,setBio]=useState(""),[attachment,setAttachment]=useState<string|null>(null);
  const [jenis,setJenis]=useState("izin"),[reason,setReason]=useState("");
  const [from,setFrom]=useState(new Date()),[to,setTo]=useState(new Date());
  const [attendanceId,setAttendanceId]=useState<number|null>(null),[start,setStart]=useState(new Date()),[end,setEnd]=useState(new Date());
  const [includeOut,setIncludeOut]=useState(true);
  const tz=today?.settings?.tz || "Asia/Jakarta";

  const clearData=useCallback(()=>{
    setSignedIn(false);setTab("Absensi");setToday(null);setSchedule([]);setHistory([]);setLeaves([]);setCorrections([]);
    setAnnouncements([]);setNotices([]);setProfile(null);setSlip(null);setBio("");setReason("");setAttachment(null);setAttendanceId(null);
    void clearReminders().catch(()=>{});
  },[]);
  useEffect(()=>{
    setExpiryHandler(clearData);
    void restore().then(setSignedIn).catch(e=>setError(String(e))).finally(()=>setReady(true));
    return ()=>setExpiryHandler(()=>{});
  },[clearData]);
  const load=useCallback(async ()=>{
    if(!signedIn)return;
    setError("");
    try {
      switch(tab) {
        case "Absensi": setToday(await api<Today>("/api/attendance/today"));break;
        case "Jadwal": setSchedule((await api<{jadwal:Schedule[]}>("/api/jadwal")).jadwal);break;
        case "Riwayat": setHistory((await api<{riwayat:Attendance[]}>("/api/attendance/me?limit=180")).riwayat);break;
        case "Izin": setLeaves((await api<{izin:Leave[]}>("/api/izin")).izin);break;
        case "Koreksi": {
          const [c,h]=await Promise.all([api<{corrections:Correction[]}>("/api/me/corrections"),api<{riwayat:Attendance[]}>("/api/attendance/me?limit=180")]);
          setCorrections(c.corrections);setHistory(h.riwayat);break;
        }
        case "Slip gaji": setSlip(await api<SlipResponse>("/api/slip"));break;
        case "Pengumuman": setAnnouncements((await api<{pengumuman:Announcement[]}>("/api/pengumuman")).pengumuman);break;
        case "Notifikasi": setNotices((await api<{notifications:Notice[]}>("/api/me/notifications")).notifications);break;
        case "Profil": {const p=(await api<{profil:Profile}>("/api/me/profile")).profil;setProfile(p);setBio(p.bio||"");break;}
      }
    } catch(e) {setError(e instanceof Error?e.message:"Gagal memuat data.");throw e;}
  },[signedIn,tab]);
  useEffect(()=>{setBusy(true);void load().catch(()=>{}).finally(()=>setBusy(false));},[load]);
  useEffect(()=>{const sub=AppState.addEventListener("change",s=>{if(s==="active" && tab!=="Profil")void load().catch(()=>{});});return ()=>sub.remove();},[load,tab]);
  async function perform(task:()=>Promise<unknown>,message?:string) {
    if(busy)return;
    setBusy(true);setError("");
    try {await task();await load();if(message)Alert.alert("Berhasil",message);}
    catch(e){setError(e instanceof Error?e.message:"Gagal. Coba lagi.");}
    finally{setBusy(false);}
  }
  async function signIn() {
    setBusy(true);setError("");
    try {await login(username,password);setPassword("");setSignedIn(true);}
    catch(e){setError(e instanceof Error?e.message:"Login gagal.");}
    finally{setBusy(false);}
  }
  async function chooseImage() {
    if(busy)return;
    setBusy(true);
    try {const image=await pickImage();if(image)setAttachment(image);}
    catch(e){setError(e instanceof Error?e.message:"Foto gagal dipilih.");}
    finally{setBusy(false);}
  }
  function selectCorrection(a:Attendance) {
    setAttendanceId(a.id);setStart(new Date(a.check_in||Date.now()));setEnd(new Date(a.check_out||Date.now()));setIncludeOut(!!a.check_out);setReason("");
  }
  if(!ready)return <View style={styles.content}><ActivityIndicator color="#efc56b"/><Copy>Menyiapkan aplikasi…</Copy></View>;
  return <KeyboardAvoidingView style={styles.page} behavior="height">
    <StatusBar style="light"/>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
      refreshControl={signedIn?<RefreshControl refreshing={busy} tintColor="#efc56b" onRefresh={()=>{void perform(load);}}/>:undefined}>
      <Text accessibilityRole="header" style={styles.title}>MBG Karyawan</Text>
      <Copy>{signedIn?today?.settings?.nama_dapur || "Portal karyawan":"Masuk dengan akun karyawan dapur Anda."}</Copy>
      {!!error && <Text accessibilityRole="alert" style={{color:"#ffb4b4",fontSize:16}}>{error}</Text>}
      {!signedIn?<Card>
        <Field label="Username" value={username} onChange={setUsername}/>
        <Field label="Password" value={password} onChange={setPassword} secure/>
        <Button title={busy?"Memproses…":"Masuk"} disabled={busy} onPress={()=>{void signIn();}}/>
      </Card>:<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {tabs.map(t=><Button key={t} title={tab===t?"● "+t:t} disabled={busy} onPress={()=>{setTab(t);setAttachment(null);setReason("");}}/>)}
        </ScrollView>
        <Text accessibilityRole="header" style={styles.title}>{tab}</Text>
        {busy && <ActivityIndicator color="#efc56b"/>}
        {tab==="Absensi" && today && <AttendanceScreen today={today} reload={load}/>}
        {tab==="Jadwal" && <>
          <Card><Copy>Pengingat muncul 15 menit sebelum shift terjadwal. Jadwal yang berubah perlu disinkronkan lagi.</Copy>
            <Button title="Aktifkan / sinkronkan pengingat" disabled={busy} onPress={()=>{void perform(async()=>{const n=await setReminders(schedule);Alert.alert("Pengingat",`${n} pengingat tersimpan di Android.`);});}}/></Card>
          {!schedule.length && <Copy>Belum ada jadwal khusus. Lihat jadwal divisi di Absensi.</Copy>}
          {schedule.map(s=><Card key={s.tanggal}><Label>{s.tanggal} · {s.libur?"Libur":`${s.jam_masuk} – ${s.jam_pulang}`}</Label><Copy>{s.keterangan}</Copy></Card>)}
        </>}
        {tab==="Riwayat" && <>{!history.length && <Copy>Belum ada absensi.</Copy>}{history.map(a=><Card key={a.id}>
          <Label>{a.tanggal} · {a.status_masuk}</Label><Copy>Masuk: {stamp(a.check_in,tz)}{"\n"}Pulang: {stamp(a.check_out,tz)}</Copy>
          <Button title="Ajukan koreksi" disabled={busy} onPress={()=>{selectCorrection(a);setTab("Koreksi");}}/></Card>)}</>}
        {tab==="Izin" && <>
          <Card><Label>Ajukan izin, sakit, atau cuti</Label><View style={styles.row}>
            {["izin","sakit","cuti"].map(j=><Button key={j} title={jenis===j?"✓ "+j:j} onPress={()=>setJenis(j)}/>)}</View>
            <DateField label="Mulai" value={from} onChange={setFrom}/><DateField label="Selesai" value={to} onChange={setTo}/>
            <Field label="Alasan" value={reason} onChange={setReason} multiline/>
            {attachment && <Image source={{uri:attachment}} style={styles.image} accessibilityLabel="Lampiran izin"/>}
            <Button title="Pilih lampiran foto (opsional)" disabled={busy} onPress={()=>{void chooseImage();}}/>
            <Button title="Kirim pengajuan" disabled={busy || !reason.trim()} onPress={()=>{void perform(async()=>{
              await api("/api/izin","POST",{jenis,tanggal_mulai:localDate(from),tanggal_selesai:localDate(to),alasan:reason,lampiran:attachment});
              setReason("");setAttachment(null);
            },"Pengajuan dikirim untuk ditinjau.");}}/>
          </Card>
          {leaves.map(l=><Card key={l.id}><Label>{l.jenis} · {l.status}</Label><Copy>{l.tanggal_mulai} – {l.tanggal_selesai}{"\n"}{l.alasan}{"\n"}{l.catatan_admin}</Copy>
            {l.status==="pending" && <Button title="Batalkan pengajuan" disabled={busy} onPress={()=>Alert.alert("Batalkan izin?","Pengajuan pending akan dihapus.",[
              {text:"Kembali",style:"cancel"},{text:"Batalkan izin",style:"destructive",onPress:()=>{void perform(()=>api("/api/izin?id="+l.id,"DELETE"));}}])}/>}</Card>)}
        </>}
        {tab==="Koreksi" && <>
          <Card><Label>Koreksi waktu absensi</Label><Copy>Waktu mengikuti zona perangkat Android. Pastikan sesuai zona dapur: {tz}. Koreksi harus disetujui HR.</Copy>
            <ScrollView horizontal contentContainerStyle={styles.row}>{history.map(a=><Button key={a.id} title={`${attendanceId===a.id?"✓ ":""}${a.tanggal} (#${a.id})`} onPress={()=>selectCorrection(a)}/>)}</ScrollView>
            <DateField label="Masuk" value={start} onChange={setStart} time/>
            <Button title={includeOut?"Pulang diisi (ubah menjadi belum pulang)":"Belum pulang (isi jam pulang)"} onPress={()=>setIncludeOut(!includeOut)}/>
            {includeOut && <DateField label="Pulang" value={end} onChange={setEnd} time/>}
            <Field label="Alasan koreksi" value={reason} onChange={setReason} multiline/>
            <Button title="Kirim koreksi ke HR" disabled={busy || !attendanceId || reason.trim().length<5} onPress={()=>{void perform(async()=>{
              await api("/api/me/corrections","POST",{attendance_id:attendanceId,check_in:start.toISOString(),check_out:includeOut?end.toISOString():null,alasan:reason});
              setReason("");setAttendanceId(null);
            },"Koreksi dikirim. Absensi asli belum berubah.");}}/>
          </Card>
          {corrections.map(c=><Card key={c.id}><Label>Absensi #{c.attendance_id} · {c.status}</Label><Copy>{stamp(c.check_in,tz)} – {stamp(c.check_out,tz)}{"\n"}{c.alasan}{"\n"}{c.catatan_admin}</Copy></Card>)}
        </>}
        {tab==="Slip gaji" && (slip?.visible && slip.slip?<Card>
          <Label>{slip.slip.user.nama}</Label><Copy>{slip.slip.periode.from} – {slip.slip.periode.to}{"\n"}{slip.slip.user.jabatan}</Copy>
          <Label>{rupiah(slip.slip.total)}</Label><Copy>Hadir {slip.slip.hadir} hari · Telat {slip.slip.telat} · Lembur {slip.slip.lembur_hari} hari</Copy>
          <Copy>Upah kehadiran: {rupiah(slip.slip.upah_kehadiran)}{"\n"}Lembur: {rupiah(slip.slip.upah_lembur)}{"\n"}Potongan: {rupiah(slip.slip.potongan)}{"\n"}Kasbon: {rupiah(slip.slip.kasbon)}{"\n"}BPJS TK: {slip.slip.user.bpjs_tk?"Terbayar":"—"}</Copy>
          {slip.slip.kasbon_items.map(k=><Copy key={k.id}>{k.tanggal} · {k.keterangan} · {rupiah(k.jumlah)}</Copy>)}
          <Copy>{slip.slip.nb}</Copy>
          <Button title="Simpan / bagikan PDF" disabled={busy} onPress={()=>{void perform(()=>shareSlip(slip));}}/>
          <Button title={slip.slip.confirmed_at?"Sudah dikonfirmasi":"Konfirmasi menerima slip"} disabled={busy || !!slip.slip.confirmed_at} onPress={()=>{void perform(()=>api("/api/slip","POST"),"Penerimaan slip dikonfirmasi.");}}/>
          {slip.slip.hari.map(h=><Copy key={h.tanggal}>{h.tanggal} · {h.status} · {rupiah(h.upah)}{h.lembur?" · lembur":""} {h.catatan}</Copy>)}
        </Card>:<Copy>{slip?.pesan || "Memuat slip…"}</Copy>)}
        {tab==="Pengumuman" && <>{!announcements.length && <Copy>Belum ada pengumuman.</Copy>}
          {announcements.map(p=><Card key={p.id}><Label>{p.judul}</Label><Copy>{p.isi}</Copy>
            {p.gambar && <Image source={{uri:p.gambar}} style={styles.image} accessibilityLabel={p.judul}/>}
            {!p.dibaca && <Button title="Tandai sudah dibaca" disabled={busy} onPress={()=>{void perform(()=>api("/api/pengumuman","POST",{id:p.id}));}}/>}</Card>)}</>}
        {tab==="Notifikasi" && <><Copy>Status izin, koreksi, dan pengumuman diperbarui saat aplikasi dibuka. Pengingat jadwal tetap berjalan dari Android.</Copy>
          {!notices.length && <Copy>Belum ada notifikasi.</Copy>}{notices.map(n=><Card key={n.key}><Label>{n.read?"":"● "}{n.title}</Label>
          <Copy>{n.body}{"\n"}{stamp(n.at,tz)}</Copy>{!n.read && <Button title="Tandai sudah dibaca" disabled={busy} onPress={()=>{void perform(()=>api("/api/me/notifications","POST",{key:n.key}));}}/>}</Card>)}</>}
        {tab==="Profil" && profile && <Card><Label>{profile.nama}</Label><Copy>@{profile.username} · {profile.jabatan}</Copy>
          {(attachment || profile.foto_profil) && <Image source={{uri:attachment || profile.foto_profil!}} style={styles.image} accessibilityLabel="Foto profil"/>}
          <Field label="Bio (maksimal 200 karakter)" value={bio} onChange={v=>setBio(v.slice(0,200))} multiline/>
          <Button title="Ganti foto profil" disabled={busy} onPress={()=>{void chooseImage();}}/>
          <Button title="Simpan profil" disabled={busy} onPress={()=>{void perform(async()=>{await api("/api/me/profile","PUT",{bio,...(attachment?{foto_profil:attachment}:{})});setAttachment(null);},"Profil tersimpan.");}}/>
          <Button title="Keluar" disabled={busy} onPress={()=>{setBusy(true);void logout().then(async()=>{clearData();await clearReminders();})
            .catch(e=>setError(e instanceof Error?e.message:"Logout gagal.")).finally(()=>setBusy(false));}}/>
        </Card>}
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
export default function App() {return <SafeAreaProvider><SafeAreaView style={styles.page}><EmployeeApp/></SafeAreaView></SafeAreaProvider>;}
