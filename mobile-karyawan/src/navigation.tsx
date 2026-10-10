import React from "react";
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {Button,Copy,styles,useReducedMotion} from "./ui";

type IconName=React.ComponentProps<typeof Ionicons>["name"];
export const services:{title:string;icon:IconName;group:string;path?:string}[]=[
  {title:"Beranda",icon:"home-outline",group:"SAYA"},
  {title:"Peringkat",icon:"trophy-outline",group:"KINERJA",path:"/dapur/peringkat"},
  {title:"Jadwal",icon:"calendar-outline",group:"KINERJA"},
  {title:"SOP",icon:"book-outline",group:"KINERJA",path:"/dapur/sop"},
  {title:"Slip gaji",icon:"receipt-outline",group:"KEUANGAN"},
  {title:"Finansial",icon:"wallet-outline",group:"KEUANGAN",path:"/dapur/finansial"},
  {title:"Izin",icon:"document-text-outline",group:"PENGAJUAN"},
  {title:"Koreksi",icon:"create-outline",group:"PENGAJUAN"},
  {title:"Aspirasi",icon:"megaphone-outline",group:"PENGAJUAN",path:"/dapur/pengaduan"},
  {title:"People & Culture",icon:"people-outline",group:"SAYA",path:"/dapur/people"},
  {title:"Riwayat",icon:"time-outline",group:"SAYA"},
  {title:"Kartu saya",icon:"id-card-outline",group:"SAYA",path:"/dapur/profil"},
  {title:"Profil",icon:"person-circle-outline",group:"SAYA"},
  {title:"Pengumuman",icon:"newspaper-outline",group:"INFORMASI"},
  {title:"Notifikasi",icon:"notifications-outline",group:"INFORMASI"},
  {title:"Portal lengkap",icon:"grid-outline",group:"PINTASAN",path:"/dapur"},
];
export function ServiceTile({title,icon,onPress}:{title:string;icon:IconName;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({pressed})=>[nav.tile,pressed && {opacity:0.7}]}>
    <View style={nav.iconBox}><Ionicons name={icon} size={26} color="#8bcfff"/></View>
    <Text style={nav.tileText}>{title}</Text>
  </Pressable>;
}
export function BottomNav({active,onSelect,onMenu}:{active:string;onSelect:(title:string)=>void;onMenu:()=>void}) {
  const items:{title:string;label:string;icon:IconName}[]=[
    {title:"Peringkat",label:"Peringkat",icon:"trophy-outline"},{title:"Slip gaji",label:"Slip",icon:"receipt-outline"},
    {title:"Absensi",label:"Absen",icon:"location-outline"},{title:"Riwayat",label:"Riwayat",icon:"time-outline"},
    {title:"Menu",label:"Menu",icon:"grid-outline"},
  ];
  return <View style={nav.bottom}>{items.map(item=><Pressable key={item.title} accessibilityRole="button"
    accessibilityLabel={item.label} accessibilityState={{selected:active===item.title}} onPress={()=>item.title==="Menu"?onMenu():onSelect(item.title)}
    style={({pressed})=>[nav.tab,pressed && {opacity:0.65}]}>
    <View style={item.title==="Absensi"?nav.primary:undefined}><Ionicons name={item.icon} size={item.title==="Absensi"?30:24}
      color={item.title==="Absensi"?"#fff":active===item.title?"#81a9ff":"#b9c6de"}/></View>
    <Text style={[nav.tabText,active===item.title && {color:"#81a9ff"}]}>{item.label}</Text>
  </Pressable>)}</View>;
}
export function MenuSheet({visible,close,select,admin,logout}:{visible:boolean;close:()=>void;select:(title:string,path?:string)=>void;admin:boolean;logout:()=>void}) {
  const reduced=useReducedMotion();
  return <Modal visible={visible} transparent animationType={reduced?"none":"slide"} onRequestClose={close}>
    <View style={nav.overlay}><Pressable accessibilityLabel="Tutup menu" accessibilityRole="button" style={{flex:1,minHeight:24}} onPress={close}/>
      <SafeAreaView edges={["bottom"]} style={nav.sheet}>
        <View style={nav.sheetHeading}><Text accessibilityRole="header" style={[styles.title,{flex:1}]}>Layanan karyawan</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup menu" onPress={close} style={nav.close}><Ionicons name="close" color="#fff" size={26}/></Pressable></View>
        <ScrollView contentContainerStyle={{gap:20,padding:20}}>
          {["KINERJA","KEUANGAN","PENGAJUAN","SAYA","INFORMASI","PINTASAN"].map(group=><View key={group} style={{gap:12}}>
            <Copy>{group}</Copy><View style={nav.grid}>{services.filter(s=>s.group===group).map(s=><ServiceTile key={s.title} {...s} onPress={()=>select(s.title,s.path)}/>)}</View>
          </View>)}
          {admin && <Button title="Panel Admin" onPress={()=>select("Panel Admin","/admin")}/>}
          <Button title="Keluar dari akun" onPress={logout}/>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
export const nav=StyleSheet.create({
  bottom:{flexDirection:"row",alignItems:"center",backgroundColor:"#0e1b40",borderTopWidth:1,borderColor:"#28375c",paddingHorizontal:8,paddingVertical:10},
  tab:{flex:1,minHeight:64,alignItems:"center",justifyContent:"center",gap:6,paddingHorizontal:2},
  tabText:{color:"#b9c6de",fontSize:12,textAlign:"center",flexShrink:1},
  primary:{width:56,height:56,borderRadius:28,backgroundColor:"#4379f6",alignItems:"center",justifyContent:"center"},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:12},
  tile:{flexBasis:"46%",flexGrow:1,minHeight:100,backgroundColor:"#162750",borderWidth:1,borderColor:"#304268",borderRadius:20,padding:16,gap:12},
  iconBox:{width:44,height:44,alignItems:"center",justifyContent:"center",backgroundColor:"#20375e",borderRadius:14},
  tileText:{color:"#f7f9fc",fontSize:16,fontWeight:"600",flexShrink:1},
  overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.6)",justifyContent:"flex-end"},
  sheet:{maxHeight:"88%",backgroundColor:"#0d193d",borderTopLeftRadius:28,borderTopRightRadius:28,overflow:"hidden"},
  sheetHeading:{padding:20,flexDirection:"row",alignItems:"center",gap:12},
  close:{minWidth:48,minHeight:48,alignItems:"center",justifyContent:"center",marginLeft:"auto"},
});
