import React from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:"#0b1522"},
  content:{padding:20,paddingBottom:40,gap:16},
  card:{backgroundColor:"#172639",padding:18,borderRadius:18,gap:10,borderWidth:1,borderColor:"#2a3a4d"},
  title:{color:"#f7f9fc",fontSize:26,fontWeight:"700"},
  subtitle:{color:"#b6c5d6",fontSize:15,lineHeight:23},
  label:{color:"#f7f9fc",fontSize:17,fontWeight:"600"},
  button:{minHeight:48,borderRadius:12,backgroundColor:"#efc56b",padding:12,justifyContent:"center",alignItems:"center"},
  buttonText:{color:"#152033",fontSize:16,fontWeight:"700"},
  input:{color:"#fff",backgroundColor:"#0b1522",borderColor:"#53657a",borderWidth:1,borderRadius:12,minHeight:48,padding:12,fontSize:16},
  row:{flexDirection:"row",flexWrap:"wrap",gap:10},
  image:{width:"100%",height:240,borderRadius:12},
});
export function Card({children}:{children:React.ReactNode}) {return <View style={styles.card}>{children}</View>;}
export function Label({children}:{children:React.ReactNode}) {return <Text style={styles.label}>{children}</Text>;}
export function Copy({children}:{children:React.ReactNode}) {return <Text style={styles.subtitle}>{children}</Text>;}
export function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}}
    disabled={disabled} onPress={onPress} style={[styles.button,disabled && {opacity:0.5}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function Field({label,value,onChange,secure=false,multiline=false}:{label:string;value:string;onChange:(s:string)=>void;secure?:boolean;multiline?:boolean}) {
  return <View style={{gap:6}}><Copy>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} multiline={multiline} style={styles.input}/></View>;
}
export const stamp = (value:string|null|undefined,tz="Asia/Jakarta") => value ? new Date(value).toLocaleString("id-ID",{timeZone:tz}) : "—";
export const rupiah = (value:number) => Number(value).toLocaleString("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
