import React,{useEffect,useState} from "react";
import { AccessibilityInfo,Pressable, Text, TextInput, View, StyleSheet } from "react-native";

export function useReducedMotion() {
  const [reduced,setReduced]=useState(true);
  useEffect(()=>{
    let alive=true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReduced(value);});
    const sub=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduced);
    return ()=>{alive=false;sub.remove();};
  },[]);
  return reduced;
}

export const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:"#080f28"},
  content:{padding:20,paddingBottom:36,gap:20,width:"100%",maxWidth:680,alignSelf:"center"},
  card:{backgroundColor:"#111f49",padding:20,borderRadius:24,gap:12,borderWidth:1,borderColor:"#26355c"},
  title:{color:"#f7f9fc",fontSize:26,fontWeight:"700"},
  subtitle:{color:"#b9c6de",fontSize:16,lineHeight:24},
  label:{color:"#f7f9fc",fontSize:17,fontWeight:"600"},
  button:{minHeight:52,maxWidth:"100%",borderRadius:16,backgroundColor:"#3267df",padding:14,justifyContent:"center",alignItems:"center"},
  buttonText:{color:"#fff",fontSize:16,fontWeight:"700",textAlign:"center",flexShrink:1},
  input:{color:"#fff",backgroundColor:"#0b1534",borderColor:"#536584",borderWidth:1,borderRadius:16,minHeight:52,padding:14,fontSize:16},
  row:{flexDirection:"row",flexWrap:"wrap",gap:10},
  tabs:{flexDirection:"row",gap:10,alignItems:"center"},
  image:{width:"100%",height:240,borderRadius:12},
});
export function Card({children}:{children:React.ReactNode}) {return <View style={styles.card}>{children}</View>;}
export function Label({children}:{children:React.ReactNode}) {return <Text style={styles.label}>{children}</Text>;}
export function Copy({children}:{children:React.ReactNode}) {return <Text style={styles.subtitle}>{children}</Text>;}
export function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}}
    disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,disabled && {opacity:0.5},pressed && {opacity:0.75}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function Field({label,value,onChange,secure=false,multiline=false}:{label:string;value:string;onChange:(s:string)=>void;secure?:boolean;multiline?:boolean}) {
  return <View style={{gap:6}}><Copy>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} multiline={multiline} style={styles.input}/></View>;
}
export const stamp = (value:string|null|undefined,tz="Asia/Jakarta") => value ? new Date(value).toLocaleString("id-ID",{timeZone:tz}) : "—";
export const rupiah = (value:number) => Number(value).toLocaleString("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
