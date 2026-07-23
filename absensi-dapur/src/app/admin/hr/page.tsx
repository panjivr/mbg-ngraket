import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import HrPanel from "./HrPanel";

export const dynamic = "force-dynamic";

export default async function HrPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const me = (await query<{ is_hr: boolean }>(`SELECT is_hr FROM users WHERE id = $1`, [s.uid]))[0];
  if (!me?.is_hr) redirect("/dapur");
  return <HrPanel />;
}
