import React, {useEffect,useRef,useState} from "react";
import {Alert,Image,Text,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {CameraView,useCameraPermissions} from "expo-camera";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import {api,legacyServer} from "./api";
import {Today} from "./types";
import {Button,Card,Copy,Label,styles,stamp} from "./ui";

function Clock({tz}:{tz:string}) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return ()=>clearInterval(timer);},[]);
  return <Text style={{fontSize:40,fontWeight:"700",color:"#81a9ff",fontVariant:["tabular-nums"],textAlign:"center"}}>{now.toLocaleTimeString("id-ID",{timeZone:tz})}</Text>;
}
export function distanceMeters(lat:number,lng:number,targetLat:number,targetLng:number) {
  const rad=(n:number)=>n*Math.PI/180;
  const a=Math.min(1,Math.max(0,Math.sin(rad(targetLat-lat)/2)**2+Math.cos(rad(lat))*Math.cos(rad(targetLat))*Math.sin(rad(targetLng-lng)/2)**2));
  return Math.round(6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

export default function AttendanceScreen({today,reload}:{today:Today;reload:()=>Promise<void>}) {
  const camera=useRef<CameraView>(null);
  const [permission,requestPermission]=useCameraPermissions();
  const [cameraOn,setCameraOn]=useState(false);
  const [photo,setPhoto]=useState<{data:string;at:number}|null>(null);
  const [shift,setShift]=useState<number|null>(null);
  const [point,setPoint]=useState<"dapur"|"event">("dapur");
  const [mood,setMood]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [gps,setGps]=useState<string|null>(null),[locating,setLocating]=useState(false);
  async function locate() {
    setLocating(true);
    try {
      if(!(await Location.requestForegroundPermissionsAsync()).granted)throw new Error("Izinkan lokasi di pengaturan Android.");
      const location=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      if(location.mocked)throw new Error("Lokasi palsu tidak diizinkan.");
      const target=point==="event"?today.event:today.settings;
      const accuracy=Math.round(location.coords.accuracy || 0);
      if(target?.lat!=null && target.lng!=null) {
        const distance=distanceMeters(location.coords.latitude,location.coords.longitude,target.lat,target.lng);
        setGps(`${distance} m dari ${point==="event"?"lokasi event":"dapur"} · akurasi ±${accuracy} m. ${today.settings?.geofence_aktif?`Batas ${today.settings.radius_m} m.`:"Lokasi dicatat."}`);
      }else setGps(`Lokasi tersedia · akurasi ±${accuracy} m.`);
    }catch(e){setGps(e instanceof Error?e.message:"Lokasi belum tersedia.");}
    finally{setLocating(false);}
  }
  // Preserve the exact payload after a timeout so retries cannot toggle attendance.
  const pending=useRef<Record<string,unknown>|null>(null);
  async function openCamera() {
    const granted=permission?.granted || (await requestPermission()).granted;
    if (!granted) {Alert.alert("Izin kamera","Aktifkan izin kamera di pengaturan Android.");return;}
    setCameraOn(true);setPhoto(null);
  }
  async function takePhoto() {
    try {
      const result=await camera.current?.takePictureAsync({quality:0.35,base64:true});
      if (!result?.base64) throw new Error("Foto belum tersedia. Coba lagi.");
      setPhoto({data:"data:image/jpeg;base64,"+result.base64,at:Date.now()});setCameraOn(false);
    } catch(e) {Alert.alert("Kamera",e instanceof Error?e.message:"Foto gagal.");}
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (!pending.current) {
        if (today.settings?.selfie_wajib && (!photo || Date.now()-photo.at>120000)) throw new Error("Ambil selfie baru sebelum absen.");
        if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error("Izinkan lokasi untuk absen.");
        const location=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
        if (location.mocked) throw new Error("Lokasi palsu tidak diizinkan.");
        pending.current={action:today.current?"check_out":"check_in",request_id:Crypto.randomUUID(),
          lat:location.coords.latitude,lng:location.coords.longitude,accuracy:location.coords.accuracy,
          captured_at:new Date(location.timestamp).toISOString(),mocked:false,
          selfie:photo?.data || null,shift_id:shift,titik:point,mood};
      }
      const result=await api<{action:string}>("/api/attendance/check","POST",pending.current);
      pending.current=null;setPhoto(null);
      Alert.alert("Absensi tersimpan",result.action==="check_in"?"Anda sudah absen masuk.":"Anda sudah absen pulang.");
      await reload();
    } catch(e) {Alert.alert("Absensi belum berhasil",e instanceof Error?e.message:"Coba lagi.");}
    finally {setBusy(false);}
  }
  return <>
    <Card><Label>{today.settings?.nama_dapur || "Dapur"}</Label><Copy>{today.settings?.alamat}</Copy>
      <Clock tz={today.settings?.tz || "Asia/Jakarta"}/>
      <Copy>{today.tanggal} · {today.shift?.divisi_nama}</Copy>
      <Label>{today.current?"Sedang bekerja":"Siap mulai bekerja"}</Label>
      <Copy>Jadwal {today.shift?.jam_masuk} – {today.shift?.jam_pulang}{today.shift?.lintas_hari?" · lintas hari":""}</Copy>
      {today.schedule?.libur && !today.event && <Label>Jadwal hari ini: libur</Label>}
      {today.shift?.jobdesk && <Copy>{today.shift.jobdesk}</Copy>}
      <Copy>Masuk terakhir: {stamp(today.last?.check_in,today.settings?.tz)}{"\n"}Pulang terakhir: {stamp(today.last?.check_out,today.settings?.tz)}</Copy>
      <Copy>{today.settings?.geofence_aktif?`GPS harus berada dalam radius ${today.settings.radius_m} m.`:"GPS dicatat sebagai bukti lokasi."}</Copy>
    </Card>
    <Card><View style={styles.row}><Ionicons name="location-outline" size={24} color="#83caff"/><Label>Lokasi Anda</Label></View>
      <Copy>{gps || "Periksa posisi Anda sebelum absen."}</Copy><Copy>Lokasi diperiksa kembali oleh server saat absensi dikirim.</Copy>
      <Button title={locating?"Mencari lokasi…":"Perbarui lokasi"} disabled={locating || busy} onPress={()=>{void locate();}}/>
    </Card>
    {today.event && <Card><Label>{today.event.nama}</Label><Copy>{today.event.jam_masuk} – {today.event.jam_pulang}</Copy>
      {today.event.lat!==null && today.event.lng!==null && <Button title={point==="event"?"Lokasi: event (ubah ke dapur)":"Lokasi: dapur (ubah ke event)"} disabled={busy || !!pending.current} onPress={()=>setPoint(point==="event"?"dapur":"event")}/>}</Card>}
    {!!today.shifts.length && !today.current && !today.event && <Card><Label>Pilih shift</Label>
      {today.shifts.map(s=><Button key={s.id} title={`${s.id===shift?"✓ ":""}${s.nama} · ${s.jam_masuk} – ${s.jam_pulang}`}
        disabled={busy || !!pending.current} onPress={()=>setShift(s.id)}/>)}</Card>}
    {!today.current && <Card><Label>Suasana hati (opsional)</Label><View style={styles.row}>
      {["senang","biasa","lelah"].map(value=><Button key={value} title={value===mood?"✓ "+value:value} disabled={busy || !!pending.current} onPress={()=>setMood(value)}/>)}
    </View></Card>}
    <Card><Label>Selfie langsung</Label>
      {cameraOn?<><CameraView ref={camera} facing="front" style={{height:340}}/><Button title="Ambil foto" onPress={()=>{void takePhoto();}}/></>
        :<>{photo && <Image accessibilityLabel="Selfie sebelum absen" source={{uri:photo.data}} style={styles.image}/>}
          <Button title={photo?"Ulangi selfie":"Buka kamera depan"} disabled={busy || !!pending.current} onPress={()=>{void openCamera();}}/></>}
      <Button title={busy?"Memproses…":pending.current?"Kirim ulang permintaan yang sama":today.current?"Absen pulang":"Absen masuk"} disabled={busy || cameraOn || (legacyServer() && !!pending.current) || !today.settings || (!today.current && !!today.schedule?.libur && !today.event)} onPress={()=>{void submit();}}/>
      {!!pending.current && <Button title="Muat status sebelum membuat permintaan baru" disabled={busy} onPress={()=>{void reload().then(()=>{pending.current=null;setPhoto(null);}).catch(e=>Alert.alert("Status",String(e)));}}/>}
    </Card>
  </>;
}
