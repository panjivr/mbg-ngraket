import { requireHr } from "@/lib/session";
import CorrectionsPanel from "./CorrectionsPanel";
export const dynamic = "force-dynamic";
export default async function Page() {await requireHr();return <CorrectionsPanel/>;}
