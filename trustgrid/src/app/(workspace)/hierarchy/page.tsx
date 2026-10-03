"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch, Users, ShieldCheck, ChevronDown, ChevronRight,
  Building2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge, Button
} from "@/components/app/ui";
import { PERSONAS } from "@/lib/personas";
import { clearanceOf, CLEARANCE_LABEL, roleGroup, ROLE_GROUP_LABEL } from "@/lib/policy";
import { switchPersona } from "@/components/app/AppShell";

export default function HierarchyPage() {
  const router = useRouter();
  const { persona } = useApp();
  const [selectedDept, setSelectedDept] = useState("ALL");

  // Group personas by tier
  const tiers = [
    { tier: 0, title: "Tier 0 — Executive Leadership", desc: "Board Level / CMD" },
    { tier: 1, title: "Tier 1 — Functional Directors", desc: "R&D, Production, Finance, Operations" },
    { tier: 2, title: "Tier 2 — Unit Heads & General Managers", desc: "BEL Strategic Business Units (Bangalore, Ghaziabad, etc.)" },
    { tier: 3, title: "Tier 3 — Department Heads & Leads", desc: "Radar, EW, Sonar, Quality Assurance, CISO" },
    { tier: 4, title: "Tier 4 — Senior Engineers & Project Officers", desc: "System architects, technical leads, auditors" },
    { tier: 5, title: "Tier 5 — Engineers & Graduate Trainees", desc: "Operational development & maintenance" },
    { tier: 9, title: "External Stakeholders", desc: "Defence Customers (MoD, Navy, Air Force) & Vetted Subcontractors" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Structure & Clearance Governance"
        title="BEL Organizational Clearance Hierarchy"
        subtitle="Role-based command tree mapped against cryptographic zero-trust clearance tiers (Open to Secret)."
      />

      {/* Command Tree by Tiers */}
      <div className="space-y-6">
        {tiers.map((t) => {
          const members = PERSONAS.filter((p) => {
            if (t.tier === 9) return p.tier > 5;
            return p.tier === t.tier;
          });

          if (members.length === 0) return null;

          return (
            <div key={t.tier} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-line">
                <div>
                  <h2 className="text-sm font-bold text-navy-800">{t.title}</h2>
                  <p className="text-xs text-ink-400">{t.desc}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-page text-ink-600 border border-line">
                  {members.length} Stakeholders
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((p) => {
                  const cl = clearanceOf(p);
                  const isCurrent = p.id === persona.id;

                  return (
                    <Card
                      key={p.id}
                      className={`p-3.5 transition-all ${
                        isCurrent
                          ? "border-blue-600 ring-2 ring-blue-600/20 bg-sky-50/40"
                          : "hover:border-blue-600/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded text-xs font-bold text-white flex items-center justify-center shrink-0 ${p.color}`}>
                            {p.avatar}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-navy-800 truncate">
                              {p.name} {isCurrent && "(You)"}
                            </h3>
                            <p className="text-[11px] text-ink-400 truncate">{p.role}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          cl >= 3
                            ? "bg-red-50 text-red-700 border-red-200"
                            : cl === 2
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {CLEARANCE_LABEL[cl]}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-400">
                        <span className="truncate max-w-[140px]">{p.department}</span>
                        {!isCurrent ? (
                          <button
                            onClick={async () => {
                              await switchPersona(p.id, router);
                              toast.success(`Switched role to ${p.name}`);
                            }}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                          >
                            Switch <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-green-700 font-semibold">Active Session</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
