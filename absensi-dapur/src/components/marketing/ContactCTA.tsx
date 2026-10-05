"use client";

import { contactUrl, WHATSAPP_NUMBER, SITE_NAME } from "@/lib/marketing";
import { useEffect } from "react";

function campaignContext() {
  return ["utm_source", "utm_medium", "utm_campaign"].map(key => {
    const value = new URLSearchParams(window.location.search).get(key)?.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80);
    return value ? `${key}=${value}` : "";
  }).filter(Boolean).join(", ");
}

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

export default function ContactCTA({ topic = "operasional dapur", placement, children = "Minta demo via WhatsApp", className = "btn-gold" }: {
  topic?: string; placement: string; children?: React.ReactNode; className?: string;
}) {
  useEffect(() => {
    const campaign = campaignContext();
    if (campaign) {
      try { window.sessionStorage.setItem("mbg:campaign", campaign); } catch { /* Browser storage may be unavailable. */ }
    }
  }, []);
  return <a href={contactUrl(topic)} target="_blank" rel="noopener noreferrer" className={className}
    data-cta="request-demo" data-placement={placement}
    onClick={(event) => {
      let campaign = campaignContext();
      if (!campaign) {
        try { campaign = window.sessionStorage.getItem("mbg:campaign") || ""; } catch { /* Attribution is optional. */ }
      }
      const context = `Halaman: ${window.location.pathname}${campaign ? ` | ${campaign}` : ""}`;
      event.currentTarget.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Halo, saya ingin melihat demo ${SITE_NAME} untuk ${topic}. Peran saya di SPPG: ...\n${context}`)}`;
      const detail = { placement, page_path: window.location.pathname };
      // No tracker is loaded here. Analytics receives this only if configured separately.
      window.dispatchEvent(new CustomEvent("mbg:request-demo", { detail }));
      window.gtag?.("event", "request_demo", detail);
    }}>{children}</a>;
}
