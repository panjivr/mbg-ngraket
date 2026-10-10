// Real HTTP + PostgreSQL checks; refuses remote or production databases.
import assert from "node:assert/strict";
import {randomBytes,randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import {setTimeout as pause} from "node:timers/promises";
import bcrypt from "bcryptjs";
import pg from "pg";

const database=process.env.MOBILE_TEST_DATABASE_URL || "postgres://postgres@127.0.0.1:55437/mbg_mobile_test";
const url=new URL(database);
assert(["127.0.0.1","localhost"].includes(url.hostname) && url.pathname==="/mbg_mobile_test",
  "Only loopback mbg_mobile_test database is allowed");
const pool=new pg.Pool({connectionString:database,connectionTimeoutMillis:3000});
const password=randomBytes(24).toString("hex");
const base="http://127.0.0.1:3119";
let server,checks=0;
function check(actual,expected) {assert.deepEqual(actual,expected);checks++;}
async function request(path,body,token,cookie,method=body===undefined?"GET":"POST") {
  const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",
    ...(token?{Authorization:"Bearer "+token}:{}),...(cookie?{Cookie:cookie}:{})},
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
  const data=await res.json();
  return {status:res.status,data,cookie:res.headers.get("set-cookie")?.split(";")[0]};
}
try {
  await pool.query("SELECT 1");
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3119"],
    {stdio:"ignore",windowsHide:true,env:{...process.env,DATABASE_URL:database,POSTGRES_URL:"",POSTGRES_PRISMA_URL:"",
      AUTH_SECRET:randomBytes(32).toString("hex"),SEED_ADMIN_PASSWORD:password,NEXT_TELEMETRY_DISABLED:"1"}});
  for(let n=0;n<60;n++){try{if((await fetch(base+"/login")).ok)break;}catch{} await pause(1000);}
  // First authenticated API call performs the runtime migration only on the isolated test DB.
  const admin=await request("/api/auth/login",{username:"admin",password});
  check(admin.status,200);
  const suffix=randomUUID().slice(0,8);
  const hash=await bcrypt.hash(password,10);
  const kitchens=(await pool.query("INSERT INTO sppg(nama,geofence_aktif,selfie_wajib) VALUES($1,TRUE,TRUE),($2,TRUE,TRUE) RETURNING id",["test-a-"+suffix,"test-b-"+suffix])).rows;
  const a=kitchens[0].id,b=kitchens[1].id;
  const employee=(await pool.query(`INSERT INTO users(nama,username,password_hash,role,sppg_id)
    VALUES('Mobile Test',$1,$2,'staff',$3) RETURNING id`,["mobile-"+suffix,hash,a])).rows[0].id;
  const hr=(await pool.query(`INSERT INTO users(nama,username,password_hash,role,sppg_id,is_hr)
    VALUES('HR Test',$1,$2,'staff',$3,TRUE) RETURNING id`,["hr-"+suffix,hash,a])).rows[0].id;
  check((await request("/api/mobile/auth",{action:"login",username:"missing-"+suffix,password})).status,401);
  check((await request("/api/mobile/auth",{action:"login",username:"admin",password})).status,401);
  const auth=(await request("/api/mobile/auth",{action:"login",username:"mobile-"+suffix,password})).data;
  check(typeof auth.access_token,"string");
  check((await request("/api/attendance/today",undefined,"invalid")).status,401);
  check((await request("/api/hr/corrections",undefined,auth.access_token)).status,403);
  check((await request("/api/me/corrections",null,auth.access_token)).status,400);
  check((await request("/api/me/profile",{bio:"Test profile"},auth.access_token,undefined,"PUT")).status,200);
  check((await request("/api/me/profile",undefined,auth.access_token)).data.profil.bio,"Test profile");
  check((await request("/api/me/profile",{foto_profil:"data:image/svg+xml;base64,PHN2Zz4="},auth.access_token,undefined,"PUT")).status,400);
  const today=await request("/api/attendance/today",undefined,auth.access_token);
  check(today.status,200);check(today.data.settings.nama_dapur,"test-a-"+suffix);
  // Create previous-date open shift, then verify checkout closes exactly that row.
  const open=(await pool.query(`INSERT INTO attendance(user_id,tanggal,shift_tanggal,shift_masuk,shift_pulang,check_in)
    VALUES($1,current_date-1,current_date-1,'22:00','08:00',now()-interval '5 hours') RETURNING id`,[employee])).rows[0].id;
  const payload={action:"check_out",request_id:randomUUID(),lat:-7.8657,lng:111.4625,accuracy:10,mocked:false,
    captured_at:new Date().toISOString(),selfie:"data:image/jpeg;base64,/9j/AA=="};
  check((await request("/api/attendance/check",{...payload,mocked:true},auth.access_token)).status,400);
  check((await request("/api/attendance/check",{...payload,captured_at:"2000-01-01T00:00:00Z"},auth.access_token)).status,400);
  check((await request("/api/attendance/check",{...payload,lat:99},auth.access_token)).status,400);
  check((await request("/api/attendance/check",{...payload,lat:0,lng:0},auth.access_token)).status,403);
  check((await request("/api/attendance/check",{...payload,selfie:"data:image/jpeg;base64,YWJjZA=="},auth.access_token)).status,400);
  const out=await request("/api/attendance/check",payload,auth.access_token);
  check(out.status,200);check(out.data.action,"check_out");check(out.data.attendance.id,open);
  const repeated=await request("/api/attendance/check",{...payload,captured_at:"2000-01-01T00:00:00Z"},auth.access_token);
  check(repeated.status,200);check(repeated.data.attendance.id,open);
  check(Number((await pool.query("SELECT count(*) FROM attendance WHERE user_id=$1",[employee])).rows[0].count),1);
  check((await request("/api/attendance/check",{...payload,request_id:randomUUID()},auth.access_token)).status,409);
  const leave={jenis:"cuti",tanggal_mulai:"2026-10-11",tanggal_selesai:"2026-10-12",alasan:"Keperluan keluarga"};
  check((await request("/api/izin",{...leave,tanggal_mulai:"2026-02-30"},auth.access_token)).status,400);
  check((await request("/api/izin",leave,auth.access_token)).status,200);
  const foreign=(await pool.query("INSERT INTO pengumuman(sppg_id,judul,isi) VALUES($1,'Other kitchen','Private') RETURNING id",[b])).rows[0].id;
  check((await request("/api/pengumuman",undefined,auth.access_token)).data.pengumuman.some(x=>x.id===foreign),false);
  await request("/api/pengumuman",{id:foreign},auth.access_token);
  check(Number((await pool.query("SELECT count(*) FROM pengumuman_baca WHERE user_id=$1 AND pengumuman_id=$2",[employee,foreign])).rows[0].count),0);
  const correction={attendance_id:open,check_in:new Date(Date.now()-6*3600000).toISOString(),check_out:new Date(Date.now()-3600000).toISOString(),alasan:"Jam masuk perlu dikoreksi"};
  const c=await request("/api/me/corrections",correction,auth.access_token);
  check(c.status,201);
  check((await request("/api/me/corrections",correction,auth.access_token)).status,409);
  const hrAuth=(await request("/api/mobile/auth",{action:"login",username:"hr-"+suffix,password})).data;
  await pool.query(`INSERT INTO users(nama,username,password_hash,role,sppg_id,is_hr)
    VALUES('Foreign HR',$1,$2,'staff',$3,TRUE)`,["foreign-hr-"+suffix,hash,b]);
  const foreignHr=(await request("/api/mobile/auth",{action:"login",username:"foreign-hr-"+suffix,password})).data;
  check((await request("/api/hr/corrections",undefined,foreignHr.access_token)).data.corrections.some(x=>x.id===c.data.id),false);
  check((await request("/api/hr/corrections",{id:c.data.id,status:"disetujui"},foreignHr.access_token,undefined,"PATCH")).status,404);
  const approved=await request("/api/hr/corrections",{id:c.data.id,status:"disetujui"},hrAuth.access_token,undefined,"PATCH");
  check(approved.status,200);
  await pool.query("UPDATE users SET is_hr=FALSE WHERE id=$1",[hr]);
  check((await request("/api/hr/corrections",undefined,hrAuth.access_token)).status,403);
  check((await request("/api/me/notifications",undefined,auth.access_token)).data.notifications.some(x=>x.key==="koreksi:"+c.data.id+":disetujui"),true);
  check((await request("/api/me/notifications",{key:"koreksi:"+c.data.id+":disetujui"},auth.access_token)).status,200);
  check((await request("/api/me/notifications",undefined,auth.access_token)).data.notifications.find(x=>x.key==="koreksi:"+c.data.id+":disetujui").read,true);
  check((await request("/api/slip",undefined,auth.access_token)).data.visible,false);
  check((await request("/api/slip",{},auth.access_token)).status,403);
  check((await request("/api/me/notifications",{key:"pengumuman:"+foreign},auth.access_token)).status,404);
  await pool.query("INSERT INTO jadwal_kerja(user_id,tanggal,jam_masuk,jam_pulang,libur) VALUES($1,$2,'22:00','08:00',TRUE)",[employee,today.data.tanggal]);
  check((await request("/api/attendance/today",undefined,auth.access_token)).data.schedule.libur,true);
  check((await request("/api/jadwal",undefined,auth.access_token)).status,200);
  check((await request("/api/attendance/check",{...payload,action:"check_in",request_id:randomUUID()},auth.access_token)).status,403);
  const expiredEvent=(await pool.query(`INSERT INTO event_absensi(sppg_id,nama,tanggal,jam_masuk,jam_pulang,lat,lng,radius_m,aktif)
    VALUES($1,'Overnight test',$2::date-2,'22:00','08:00',0,0,100,FALSE) RETURNING id`,[a,today.data.tanggal])).rows[0].id;
  await pool.query(`INSERT INTO attendance(user_id,tanggal,shift_tanggal,shift_masuk,shift_pulang,event_id,check_in)
    VALUES($1,$2::date-2,$2::date-2,'22:00','08:00',$3,now()-interval '5 hours')`,[employee,today.data.tanggal,expiredEvent]);
  check((await request("/api/attendance/today",undefined,auth.access_token)).data.event.id,expiredEvent);
  check((await request("/api/attendance/check",{...payload,request_id:randomUUID(),lat:0,lng:0,titik:"event"},auth.access_token)).status,200);
  const refreshed=await request("/api/mobile/auth",{action:"refresh",refresh_token:auth.refresh_token});
  check(refreshed.status,200);
  check((await request("/api/mobile/auth",{action:"refresh",refresh_token:auth.refresh_token})).status,401);
  const rotation=await Promise.all([request("/api/mobile/auth",{action:"refresh",refresh_token:refreshed.data.refresh_token}),
    request("/api/mobile/auth",{action:"refresh",refresh_token:refreshed.data.refresh_token})]);
  check(rotation.map(x=>x.status).sort(),[200,401]);
  refreshed.data=rotation.find(x=>x.status===200).data;
  check((await request("/api/attendance/today",undefined,auth.access_token)).status,401);
  await pool.query("UPDATE users SET aktif=FALSE WHERE id=$1",[employee]);
  check((await request("/api/attendance/today",undefined,refreshed.data.access_token)).status,401);
  await pool.query("UPDATE users SET aktif=TRUE WHERE id=$1",[employee]);
  check((await request("/api/mobile/auth",{action:"logout",refresh_token:refreshed.data.refresh_token})).status,200);
  check((await request("/api/attendance/today",undefined,refreshed.data.access_token)).status,401);
  for(let n=0;n<10;n++)await request("/api/mobile/auth",{action:"login",username:"throttle-"+suffix,password});
  check((await request("/api/mobile/auth",{action:"login",username:"throttle-"+suffix,password})).status,429);
  check((await request("/api/auth/login",{username:"throttle-"+suffix,password})).status,429);
  const resetSession=(await request("/api/mobile/auth",{action:"login",username:"mobile-"+suffix,password})).data;
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2",[await bcrypt.hash(randomBytes(24).toString("hex"),10),employee]);
  check((await request("/api/attendance/today",undefined,resetSession.access_token)).status,401);
  await pool.query("UPDATE mobile_sessions SET refresh_until=now()-interval '1 second' WHERE user_id=$1",[hr]);
  check((await request("/api/mobile/auth",{action:"refresh",refresh_token:hrAuth.refresh_token})).status,401);
  // Web sessions must immediately lose admin privileges after DB role changes.
  await pool.query("UPDATE users SET role='staff' WHERE username='admin'");
  check((await request("/api/admin/employees",undefined,undefined,admin.cookie)).status,403);
  console.log(checks+" mobile HTTP/PostgreSQL integration assertions passed");
} finally {
  if(server) {
    if(process.platform==="win32") {
      const killer=spawn("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",windowsHide:true});
      await new Promise(resolve=>killer.once("close",resolve));
    } else server.kill();
  }
  await pool.end();
}
