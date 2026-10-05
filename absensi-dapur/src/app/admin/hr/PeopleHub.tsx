"use client";

/** HR — pusat People & Culture dengan sub-tab modul. */
import { useState } from "react";
import { SurveiPanel } from "./PeoplePanel";
import { DashboardPanel, PeerPanel, IncidentPanel, ActionPanel, OneOnOnePanel } from "./PeopleModules";

type Tab = "dash" | "survei" | "peer" | "lapor" | "action" | "oneonone";
const TABS: [Tab, string][] = [
  ["dash", "Dasbor"],
  ["survei", "Suara & Pulse"],
  ["peer", "Feedback Rekan/Pimpinan"],
  ["lapor", "Lapor Masalah"],
  ["action", "Action Plan"],
  ["oneonone", "1-on-1"],
];

export default function PeopleHub() {
  const [tab, setTab] = useState<Tab>("dash");
  return (
    <div className="space-y-4">
      <div className="scroll-x flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition " + (tab === k ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "dash" && <DashboardPanel />}
      {tab === "survei" && <SurveiPanel />}
      {tab === "peer" && <PeerPanel />}
      {tab === "lapor" && <IncidentPanel />}
      {tab === "action" && <ActionPanel />}
      {tab === "oneonone" && <OneOnOnePanel />}
    </div>
  );
}
