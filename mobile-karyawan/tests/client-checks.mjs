import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const storage=new Map();
const calls=[];
const secureStore={getItemAsync:async k=>storage.get(k),setItemAsync:async(k,v)=>storage.set(k,v),deleteItemAsync:async k=>storage.delete(k)};
const source=ts.transpileModule(fs.readFileSync(new URL("../src/api.ts",import.meta.url),"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},require:name=>{assert.equal(name,"expo-secure-store");return secureStore;},URL,AbortController,setTimeout,clearTimeout,
  process:{env:{}},fetch:async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>({access_token:"access",refresh_token:"refresh"})};}};
vm.runInNewContext(source,context);
const client=context.exports;
assert.equal(await client.restore(),false);
for(const url of ["http://example.test","https://example.test/api","https://user:pass@example.test","https://example.test?x=1","https://example.test/#x"])
  await assert.rejects(()=>client.setServerUrl(url));
await client.setServerUrl(" https://staging.example.test/ ");
assert.equal(client.serverUrl(),"https://staging.example.test");
assert.equal(storage.get("mbg_server"),"https://staging.example.test");
await client.login("employee","test-only");
assert.equal(calls[0].url,"https://staging.example.test/api/mobile/auth");
assert.equal(calls[0].init.credentials,"omit");
await assert.rejects(()=>client.setServerUrl("https://other.example.test"));
await client.logout();
assert.equal(storage.has("mbg_session"),false);
await client.setServerUrl("https://other.example.test");
await client.restore();
assert.equal(client.serverUrl(),"https://other.example.test");
await client.setServerUrl("https://djati.web.id");
context.fetch=async(url,init)=>{
  calls.push({url,init});
  return url.endsWith("/api/mobile/auth")?{ok:false,status:404}:{ok:true,status:200,
    headers:{get:()=>"absensi_session=signed-test-session; Path=/; HttpOnly; Secure; SameSite=Lax"},
    json:async()=>({user:{role:"staff"}})};
};
await client.login("employee","test-only");
assert.equal(client.legacyServer(),true);
await client.api("/api/me/profile");
assert.equal(calls.at(-1).init.headers.Cookie,"absensi_session=signed-test-session");
assert.equal(calls.at(-1).init.headers.Authorization,undefined);
assert.equal(calls.at(-1).init.redirect,"error");
await client.logout();
assert.equal(calls.at(-1).url,"https://djati.web.id/api/auth/logout");
assert.equal(client.legacyServer(),false);
context.fetch=async url=>url.endsWith("/api/mobile/auth")?{ok:false,status:404}:{ok:true,status:200,json:async()=>({user:{role:"admin"}})};
await assert.rejects(()=>client.login("admin","test-only"));
assert.equal(storage.has("mbg_session"),false);
await client.setServerUrl("https://other.example.test");
calls.length=0;
context.fetch=async url=>{calls.push(url);return {ok:false,status:404,json:async()=>({error:"missing"})};};
await assert.rejects(()=>client.login("employee","test-only"));
assert.equal(calls.length,1);
assert.ok(calls[0].endsWith("/api/mobile/auth"));
console.log("Mobile server configuration and modern/legacy session checks passed");
