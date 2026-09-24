import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";
import GameClient from "@/components/game/GameClient";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await getUserAccess(session.uid);
  const isSuper = session.role === "admin" && !!me?.is_super;

  return <GameClient nama={session.nama} isSuper={isSuper} />;
}
