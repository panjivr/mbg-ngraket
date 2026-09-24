import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";
import TurnamenAdmin from "./TurnamenAdmin";

export const dynamic = "force-dynamic";

// Kelola turnamen game — khusus admin pusat (super admin).
export default async function TurnamenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await getUserAccess(session.uid);
  if (!(session.role === "admin" && me?.is_super)) redirect("/admin");

  return <TurnamenAdmin />;
}
