import { notFound } from "next/navigation";
import { getTemplateSupplier } from "@/lib/supplier";
import SupplierDoc from "../SupplierDoc";

export const dynamic = "force-dynamic";

export default function NotaPoPage() {
  const t = getTemplateSupplier("nota-po");
  if (!t) notFound();
  return <SupplierDoc mode={t.mode} heading={t.heading} />;
}
