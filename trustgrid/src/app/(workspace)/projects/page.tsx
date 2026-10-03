"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban, Search, Filter, ShieldCheck, ArrowRight,
  Calendar, Building2, Users, FileText, Package
} from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, Button, inputCls
} from "@/components/app/ui";
import { useTG } from "@/lib/store";
import { PERSONA_MAP } from "@/lib/personas";

export default function ProjectsPage() {
  const { persona } = useApp();
  const projects = useTG((s) => s.projects);
  const docs = useTG((s) => s.docs);
  const assets = useTG((s) => s.assets);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");

  const depts = ["ALL", "R&D", "Production", "Procurement", "Operations", "IT & Security"];

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "ALL" || p.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tactical Defence Systems"
        title="Defence Programmes & Projects"
        subtitle="Cryptographically tracked military and avionics development initiatives governed by BEL."
      />

      {/* Filter toolbar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name, code (e.g. PRJ-SNT), or summary..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Department:
          </span>
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                filterDept === d
                  ? "bg-navy-800 text-white border-navy-800"
                  : "bg-white text-ink-600 border-line hover:bg-sky-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((proj) => {
          const projDocs = docs.filter((d) => d.projectId === proj.id);
          const projAssets = assets.filter((a) => a.projectId === proj.id);
          const isAssigned = proj.members.includes(persona.id) || proj.lead === persona.id;
          const leadPersona = PERSONA_MAP.get(proj.lead);

          return (
            <Card
              key={proj.id}
              className="flex flex-col hover:border-blue-600/40 hover:shadow-card transition-all"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-sky-50 px-2 py-0.5 rounded border border-blue-600/20">
                    {proj.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-page text-ink-600 border border-line">
                    {proj.department}
                  </span>
                </div>

                <h2 className="text-base font-bold text-navy-800 mb-2">
                  <Link href={`/projects/${proj.id}`} className="hover:text-blue-600 transition-colors">
                    {proj.name}
                  </Link>
                </h2>

                <p className="text-xs text-ink-600 leading-relaxed line-clamp-3 mb-4">
                  {proj.summary}
                </p>

                <div className="space-y-2 pt-3 border-t border-line text-xs text-ink-600">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Programme Lead:</span>
                    <span className="font-medium text-ink-900">{leadPersona?.name ?? proj.lead}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Progress:</span>
                    <span className="font-semibold text-navy-800">{proj.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Phase:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-blue-700 border border-blue-600/20 capitalize">
                      {proj.phase}
                    </span>
                  </div>
                </div>

                {/* Linked assets and docs counts */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-line/60 text-xs text-ink-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{projDocs.length}</strong> Specs
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-green-600" />
                    <strong>{projAssets.length}</strong> Assets
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-saffron-500" />
                    <strong>{proj.members.length}</strong> Members
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-page/70 border-t border-line flex items-center justify-between">
                {isAssigned ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    <ShieldCheck className="w-3 h-3 text-green-600" /> Project Member
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-400">External Observer</span>
                )}

                <Link
                  href={`/projects/${proj.id}`}
                  className="text-xs font-bold text-navy-800 hover:text-blue-600 inline-flex items-center gap-1"
                >
                  Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
