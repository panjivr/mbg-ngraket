import * as Notifications from "expo-notifications";
import {Schedule} from "./types";
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
export async function setReminders(schedule:Schedule[]) {
  await Notifications.setNotificationChannelAsync("jadwal",{name:"Pengingat jadwal",importance:Notifications.AndroidImportance.DEFAULT});
  if (!(await Notifications.requestPermissionsAsync()).granted) throw new Error("Izinkan notifikasi di pengaturan Android.");
  await clearReminders();
  let count=0;
  for (const day of schedule) {
    if (day.libur || !day.reminder_at) continue;
    const date=new Date(Date.parse(day.reminder_at)-15*60000);
    if (date.getTime()<=Date.now()) continue;
    await Notifications.scheduleNotificationAsync({identifier:"mbg-shift-"+day.tanggal,
      content:{title:"Jadwal kerja segera dimulai",body:`Masuk ${day.jam_masuk}. Siapkan selfie dan aktifkan GPS.`},
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:"jadwal"}});
    count++;
  }
  return count;
}
export async function clearReminders() {
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  for (const request of requests) if (request.identifier.startsWith("mbg-shift-")) await Notifications.cancelScheduledNotificationAsync(request.identifier);
}
