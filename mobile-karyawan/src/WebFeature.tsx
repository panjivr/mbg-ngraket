import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,BackHandler,Modal,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {WebView} from "react-native-webview";
import CookieManager from "@preeternal/react-native-cookie-manager";
import {serverUrl,webSessionCookie} from "./api";
import {Button,Copy,Label,styles,useReducedMotion} from "./ui";

export function allowedWebUrl(value:string) {
  try {const url=new URL(value);return url.origin===serverUrl() && !url.username && !url.password;}catch{return false;}
}
export async function clearWebSession() {await CookieManager.clearAll();}

// Existing web modules keep their server-side rules and follow updates to the primary site.
export default function WebFeature({title,path,close}:{title:string;path:string;close:()=>void}) {
  const web=useRef<WebView>(null),back=useRef(false);
  const reduced=useReducedMotion();
  const [ready,setReady]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    void (async()=>{
      const cookie=webSessionCookie();
      if(cookie)await CookieManager.setFromResponse(serverUrl(),cookie+"; Path=/; Secure; HttpOnly; SameSite=Lax");
      if(alive)setReady(true);
    })().catch(()=>{if(alive)setError("Sesi portal belum dapat disiapkan. Tutup lalu coba lagi.");});
    return ()=>{alive=false;};
  },[]);
  useEffect(()=>{const handler=BackHandler.addEventListener("hardwareBackPress",()=>{
    if(back.current)web.current?.goBack();else close();return true;
  });return ()=>handler.remove();},[close]);
  return <Modal visible animationType={reduced?"none":"slide"} onRequestClose={()=>{if(back.current)web.current?.goBack();else close();}}>
    <SafeAreaView style={styles.page}>
      <View style={{padding:16,gap:12}}><Label>{title}</Label><Button title="Kembali ke aplikasi" onPress={close}/>
        {!!error && <><Copy>{error}</Copy>{ready && <Button title="Coba muat ulang" onPress={()=>{setError("");web.current?.reload();}}/>}</>}
      </View>
      {ready?<WebView ref={web} source={{uri:serverUrl()+path}} style={{flex:1,backgroundColor:"#080f28"}}
        originWhitelist={["*"]} onShouldStartLoadWithRequest={req=>allowedWebUrl(req.url)}
        onNavigationStateChange={state=>{back.current=state.canGoBack;}}
        sharedCookiesEnabled thirdPartyCookiesEnabled={false} mixedContentMode="never"
        allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
        setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically={false}
        startInLoadingState renderLoading={()=><ActivityIndicator color="#81a9ff"/>}
        onError={()=>setError("Portal tidak dapat dimuat. Periksa koneksi internet Anda.")}
        onHttpError={event=>{if(event.nativeEvent.statusCode>=400)setError("Halaman belum dapat dibuka. Coba muat ulang.");}}
      />:!error && <ActivityIndicator color="#81a9ff"/>}
    </SafeAreaView>
  </Modal>;
}
