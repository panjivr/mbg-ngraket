import * as SecureStore from "expo-secure-store";

type Tokens = { access_token:string; refresh_token:string } | {cookie:string};
let base = (process.env.EXPO_PUBLIC_API_URL || "https://djati.web.id").replace(/\/$/, "");
let tokens: Tokens | null = null;
let refreshing: Promise<void> | null = null;
let generation = 0;
let onExpired = () => {};

export function setExpiryHandler(handler: () => void) { onExpired = handler; }
export function serverUrl() { return base; }
export function legacyServer() { return !!tokens && "cookie" in tokens; }
export async function setServerUrl(value:string) {
  let url:URL;
  try {url=new URL(value.trim());}catch {throw new Error("Alamat server tidak valid. Gunakan HTTPS.");}
  if(url.protocol!=="https:" || url.username || url.password || url.pathname!=="/" || url.search || url.hash)
    throw new Error("Gunakan alamat HTTPS server tanpa /api, password, atau parameter.");
  if(tokens)throw new Error("Keluar sebelum mengganti server.");
  await SecureStore.setItemAsync("mbg_server",url.origin);
  base=url.origin;
  generation++;
}
function checkBase() {
  if (!/^https:\/\/[^/]+/.test(base)) throw new Error("Alamat API HTTPS belum dikonfigurasi.");
}
async function request(path:string, init:RequestInit = {}) {
  checkBase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch(base+path, {...init, signal:controller.signal, credentials:"omit",redirect:"error",
      headers:{"Content-Type":"application/json",...(tokens ? ("cookie" in tokens?{Cookie:tokens.cookie}:{Authorization:`Bearer ${tokens.access_token}`}) : {}), ...init.headers}});
  } finally { clearTimeout(timeout); }
}
async function save(value:Tokens | null) {
  if (value) await SecureStore.setItemAsync("mbg_session", JSON.stringify(value));
  else await SecureStore.deleteItemAsync("mbg_session");
  tokens=value;
  generation++;
}
async function renew() {
  if (!tokens || "cookie" in tokens) throw new Error("Silakan login.");
  const previous=tokens.refresh_token;
  const response = await request("/api/mobile/auth",{method:"POST",body:JSON.stringify({action:"refresh",refresh_token:tokens.refresh_token})});
  if (!response.ok) {
    if (response.status===401) { await save(null); onExpired(); }
    throw new Error(response.status===401 ? "Sesi berakhir. Login ulang." : "Sesi belum dapat diperbarui. Coba lagi.");
  }
  const next=await response.json() as Tokens;
  if(!tokens || "cookie" in tokens || tokens.refresh_token!==previous)throw new Error("Sesi berubah. Coba lagi.");
  await save(next);
}
export async function restore() {
  const server=await SecureStore.getItemAsync("mbg_server");
  if(server)base=server;
  const stored = await SecureStore.getItemAsync("mbg_session");
  if (!stored) return false;
  try { tokens=JSON.parse(stored) as Tokens; } catch { await save(null); return false; }
  return true;
}
export async function login(username:string,password:string) {
  let response = await request("/api/mobile/auth", {method:"POST",body:JSON.stringify({action:"login",username,password})});
  // Existing production has web auth only; compatibility is limited to the verified owner origin.
  if(response.status===404 && base==="https://djati.web.id") {
    response=await request("/api/auth/login",{method:"POST",body:JSON.stringify({username,password})});
    const data=await response.json() as {error?:string;user?:{role:string}};
    if(!response.ok)throw new Error(data.error || "Login gagal.");
    if(data.user?.role!=="staff")throw new Error("Gunakan akun karyawan, bukan akun admin.");
    const cookie=response.headers.get("set-cookie")?.match(/(?:^|[,;]\s*)absensi_session=([^;,\s]+)/)?.[1];
    if(!cookie)throw new Error("Server belum memberikan sesi Android. Hubungi admin untuk API mobile.");
    await save({cookie:"absensi_session="+cookie});return;
  }
  const data = await response.json() as Tokens & {error?:string};
  if (!response.ok) throw new Error(data.error || "Login gagal.");
  await save(data);
}
export async function logout() {
  if(refreshing)await refreshing;
  if (tokens) {
    const response = "cookie" in tokens ? await request("/api/auth/logout",{method:"POST"})
      : await request("/api/mobile/auth",{method:"POST",body:JSON.stringify({action:"logout",refresh_token:tokens.refresh_token})});
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
    if("cookie" in tokens){await save(null);onExpired();throw new Error("Sesi berakhir. Login ulang.");}
    if (!refreshing) refreshing=renew().finally(() => { refreshing=null; });
    await refreshing;
    currentGeneration=generation;
    response=await request(path,init);
  }
  if(response.status===404)throw new Error("Fitur ini belum tersedia di server. API dari PR #102 perlu diaktifkan admin.");
  const data = await response.json() as T & {error?:string};
  if(currentGeneration!==generation)throw new Error("Sesi berubah. Muat ulang data.");
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
