import React,{useState} from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {View} from "react-native";
import {Button,Copy} from "./ui";
export default function DateField({label,value,onChange,time=false}:{label:string;value:Date;onChange:(d:Date)=>void;time?:boolean}) {
  const [mode,setMode]=useState<"date"|"time"|null>(null);
  return <View style={{gap:8}}><Copy>{label}: {value.toLocaleDateString("id-ID")}{time?" "+value.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):""}</Copy>
    <Button title={"Pilih tanggal "+label} onPress={()=>setMode("date")}/>
    {time && <Button title={"Pilih jam "+label} onPress={()=>setMode("time")}/>}
    {mode && <DateTimePicker value={value} mode={mode} is24Hour onChange={(_,date)=>{setMode(null);if(date)onChange(date);}}/>}
  </View>;
}
