import * as SecureStore from "expo-secure-store";

type Tokens = { access_token:string; refresh_token:string };
const base = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
let tokens: Tokens | null = null;
let refreshing: Promise<void> | null = null;
let generation = 0;
let onExpired = () => {};

export function setExpiryHandler(handler: () => void) { onExpired = handler; }
function checkBase() {
  if (!/^https:\/\/[^/]+/.test(base)) throw new Error("Alamat API HTTPS belum dikonfigurasi.");
}
async function request(path:string, init:RequestInit = {}) {
  checkBase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch(base+path, {...init, signal:controller.signal, credentials:"omit",
      headers:{"Content-Type":"application/json",...(tokens ? {Authorization:`Bearer ${tokens.access_token}`} : {}), ...init.headers}});
  } finally { clearTimeout(timeout); }
}
async function save(value:Tokens | null) {
  if (value) await SecureStore.setItemAsync("mbg_session", JSON.stringify(value));
  else await SecureStore.deleteItemAsync("mbg_session");
  tokens=value;
  generation++;
}
async function renew() {
  if (!tokens) throw new Error("Silakan login.");
  const previous=tokens.refresh_token;
  const response = await request("/api/mobile/auth",{method:"POST",body:JSON.stringify({action:"refresh",refresh_token:tokens.refresh_token})});
  if (!response.ok) {
    if (response.status===401) { await save(null); onExpired(); }
    throw new Error(response.status===401 ? "Sesi berakhir. Login ulang." : "Sesi belum dapat diperbarui. Coba lagi.");
  }
  const next=await response.json() as Tokens;
  if(tokens?.refresh_token!==previous)throw new Error("Sesi berubah. Coba lagi.");
  await save(next);
}
export async function restore() {
  const stored = await SecureStore.getItemAsync("mbg_session");
  if (!stored) return false;
  try { tokens=JSON.parse(stored) as Tokens; } catch { await save(null); return false; }
  return true;
}
export async function login(username:string,password:string) {
  const response = await request("/api/mobile/auth", {method:"POST",body:JSON.stringify({action:"login",username,password})});
  const data = await response.json() as Tokens & {error?:string};
  if (!response.ok) throw new Error(data.error || "Login gagal.");
  await save(data);
}
export async function logout() {
  if(refreshing)await refreshing;
  if (tokens) {
    const response = await request("/api/mobile/auth",{method:"POST",body:JSON.stringify({action:"logout",refresh_token:tokens.refresh_token})});
    if (!response.ok && response.status!==401) throw new Error("Logout server gagal. Coba lagi.");
  }
  await save(null);
}
export async function api<T>(path:string, method="GET", body?:unknown):Promise<T> {
  let currentGeneration=generation;
  const init = {method, ...(body!==undefined ? {body:JSON.stringify(body)} : {})};
  let response = await request(path, init);
  if(currentGeneration!==generation)throw new Error("Sesi berubah. Muat ulang data.");
  if (response.status===401 && tokens) {
    if (!refreshing) refreshing=renew().finally(() => { refreshing=null; });
    await refreshing;
    currentGeneration=generation;
    response=await request(path,init);
  }
  const data = await response.json() as T & {error?:string};
  if(currentGeneration!==generation)throw new Error("Sesi berubah. Muat ulang data.");
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
