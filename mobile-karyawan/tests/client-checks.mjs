import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const storage=new Map(),calls=[];
const secureStore={getItemAsync:async k=>storage.get(k),setItemAsync:async(k,v)=>storage.set(k,v),deleteItemAsync:async k=>storage.delete(k)};
function compile(file) {return ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;}
const context={exports:{},require:name=>{assert.equal(name,"expo-secure-store");return secureStore;},URL,AbortController,setTimeout,clearTimeout,
  process:{env:{EXPO_PUBLIC_API_URL:"https://untrusted.example"}},fetch:async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>({access_token:"a".repeat(43),refresh_token:"r".repeat(43)})};}};
vm.runInNewContext(compile("../src/api.ts"),context);
const client=context.exports;
storage.set("mbg_server","https://old-staging.example");storage.set("mbg_session",JSON.stringify({cookie:"old-account"}));
assert.equal(await client.restore(),false);
assert.equal(storage.has("mbg_session"),false);
assert.equal(storage.has("mbg_server"),false);
assert.equal(client.serverUrl(),"https://djati.web.id");
assert.equal(client.setServerUrl,undefined);
for(const value of ["null","{}",JSON.stringify({cookie:"absensi_session=bad; injected=x"}),JSON.stringify({access_token:"invalid",refresh_token:"invalid"})]) {
  storage.set("mbg_session",value);assert.equal(await client.restore(),false);assert.equal(storage.has("mbg_session"),false);
}
await client.login("employee","test-only");
assert.equal(calls[0].url,"https://djati.web.id/api/mobile/auth");
assert.equal(calls[0].init.credentials,"omit");
await client.logout();assert.equal(storage.has("mbg_session"),false);
let role="staff";
context.fetch=async(url,init)=>{
  calls.push({url,init});
  return url.endsWith("/api/mobile/auth")?{ok:false,status:404}:{ok:true,status:200,
    headers:{get:()=>"absensi_session=signed-test-session; Path=/; HttpOnly; Secure; SameSite=Lax"},
    json:async()=>({user:{role}})};
};
for(role of ["staff","admin"]) {
  await client.login(role,"test-only");assert.equal(client.legacyServer(),true);
  assert.equal(client.webSessionCookie(),"absensi_session=signed-test-session");
  await client.api("/api/me/profile");
  assert.equal(calls.at(-1).init.headers.Cookie,"absensi_session=signed-test-session");
  assert.equal(calls.at(-1).init.headers.Authorization,undefined);
  assert.equal(calls.at(-1).init.redirect,"error");
  await client.logout();assert.equal(calls.at(-1).url,"https://djati.web.id/api/auth/logout");
  assert.equal(client.legacyServer(),false);assert.equal(client.webSessionCookie(),null);
}
role="unknown";await assert.rejects(()=>client.login("unknown","test-only"));assert.equal(storage.has("mbg_session"),false);
calls.length=0;context.fetch=async(url,init)=>{calls.push({url,init});return {ok:false,status:401,json:async()=>({error:"invalid"})};};
await assert.rejects(()=>client.login("employee","test-only"));assert.equal(calls.length,1);
const web={exports:{},URL,require:name=>name==="./api"?client:{}};
vm.runInNewContext(compile("../src/WebFeature.tsx"),web);
for(const url of ["https://djati.web.id/dapur/sop","https://djati.web.id/admin","https://djati.web.id/login"])assert.equal(web.exports.allowedWebUrl(url),true);
for(const url of ["http://djati.web.id/dapur","https://evil.example","https://djati.web.id.evil.example","javascript:alert(1)","file:///etc/passwd","https://x:pass@djati.web.id/"])assert.equal(web.exports.allowedWebUrl(url),false);
const attendance={exports:{},require:()=>({})};
vm.runInNewContext(compile("../src/AttendanceScreen.tsx"),attendance);
assert.equal(attendance.exports.distanceMeters(-7,111,-7,111),0);
assert.ok(Math.abs(attendance.exports.distanceMeters(0,0,0,1)-111195)<=1);
assert.ok(Number.isFinite(attendance.exports.distanceMeters(0,0,0,180)));
for(const month of [new Date(2024,1,1),new Date(2026,9,1)]) {
  const calendar={exports:{},require:name=>name==="react"?{useState:()=>[month,()=>{}]}:
    name==="react/jsx-runtime"?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:name==="./ui"?{styles:{}}:{}};
  vm.runInNewContext(compile("../src/HistoryCalendar.tsx"),calendar);
  const tree=calendar.exports.default({history:[]}),weeks=[];
  function walk(node) {if(Array.isArray(node)){node.forEach(walk);return;}if(!node?.props)return;
    if(node.props.style?.flexDirection==="row" && node.props.style?.gap===4)weeks.push(node);
    walk(node.props.children);
  }
  walk(tree);assert.ok(weeks.length>=4 && weeks.length<=6);
  assert.ok(weeks.every(w=>w.props.children.length===7));
  assert.equal(weeks.flatMap(w=>w.props.children).filter(day=>day.props.accessible).length,new Date(month.getFullYear(),month.getMonth()+1,0).getDate());
  const tanggal=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-01`;
  const text=node=>Array.isArray(node)?node.map(text).join(""):node?.props?text(node.props.children):typeof node==="string" || typeof node==="number"?String(node):"";
  assert.ok(text(calendar.exports.default({history:[{id:1,tanggal,check_in:null,status_masuk:null}]})).includes("Hadir 0 hari"));
  assert.ok(text(calendar.exports.default({history:[1,2].map(id=>({id,tanggal,check_in:tanggal+"T07:00:00Z",status_masuk:"telat"}))})).includes("Hadir 1 hari"));
  assert.ok(text(calendar.exports.default({history:[1,2].map(id=>({id,tanggal,check_in:tanggal+"T07:00:00Z",status_masuk:"telat"}))})).includes("Terlambat 1"));
}
console.log("Fixed primary origin, upgrade isolation, staff/admin web sessions and WebView navigation checks passed");
