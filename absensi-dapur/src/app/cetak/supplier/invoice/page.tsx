import { notFound } from "next/navigation";
import { getTemplateSupplier } from "@/lib/supplier";
import SupplierDoc from "../SupplierDoc";

export const dynamic = "force-dynamic";

export default function InvoicePage() {
  const t = getTemplateSupplier("invoice");
  if (!t) notFound();
  return <SupplierDoc mode={t.mode} heading={t.heading} />;
}
