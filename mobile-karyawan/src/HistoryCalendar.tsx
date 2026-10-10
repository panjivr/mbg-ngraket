import React,{useState} from "react";
import {Pressable,Text,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {Attendance} from "./types";
import {Card,Copy,Label,styles} from "./ui";

export default function HistoryCalendar({history}:{history:Attendance[]}) {
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const key=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  const rows=history.filter(a=>a.check_in && a.tanggal.startsWith(key));
  const present=new Set(rows.map(a=>a.tanggal)).size;
  const late=new Set(rows.filter(a=>a.status_masuk==="telat").map(a=>a.tanggal)).size;
  const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const weeks=Array.from({length:Math.ceil((month.getDay()+days)/7)},(_,week)=>Array.from({length:7},(_,index)=>{
    const day=week*7+index-month.getDay()+1;return day>0 && day<=days?day:null;
  }));
  return <Card>
    <View style={styles.row}><Label>Hadir {present} hari</Label><Copy>· Terlambat {late}</Copy></View>
    <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
      {[-1,0,1].map(direction=>direction===0?<Text key="title" style={[styles.label,{flex:1,textAlign:"center"}]}>{month.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</Text>:
        <Pressable key={direction} accessibilityRole="button" accessibilityLabel={direction<0?"Bulan sebelumnya":"Bulan berikutnya"}
          onPress={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+direction,1))} style={{minWidth:44,minHeight:48,alignItems:"center",justifyContent:"center"}}>
          <Ionicons name={direction<0?"chevron-back":"chevron-forward"} size={22} color="#b9c6de"/>
        </Pressable>)}
    </View>
    <View style={{flexDirection:"row"}}>{["Mi","Se","Sl","Ra","Ka","Ju","Sa"].map(d=><Text key={d} style={{flex:1,textAlign:"center",fontSize:12,color:"#b9c6de"}}>{d}</Text>)}</View>
    <View style={{gap:4}}>{weeks.map((week,w)=><View key={w} style={{flexDirection:"row",gap:4}}>{week.map((day,i)=>{
      const row=day?rows.find(a=>a.tanggal===`${key}-${String(day).padStart(2,"0")}`):undefined;
      const delayed=row?.status_masuk==="telat";
      return <View key={i} accessible={!!day} accessibilityLabel={day?`${day}, ${row?(delayed?"terlambat":"hadir"):"tidak ada absensi"}`:undefined}
        style={{flex:1,minHeight:52,borderRadius:10,backgroundColor:day?(row?delayed?"#493b21":"#17453f":"#1b2c53"):"transparent",alignItems:"center",justifyContent:"center"}}>
        <Text style={{color:"#fff",fontSize:14}}>{day || ""}</Text>{row && <Text style={{fontSize:12,color:delayed?"#ffe29d":"#91ead0"}}>{delayed?"T":"H"}</Text>}
      </View>;
    })}</View>)}</View>
    <Copy>H · Hadir   T · Terlambat</Copy><Copy>Ringkasan dari maksimal 180 catatan terbaru.</Copy>
  </Card>;
}
