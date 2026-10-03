"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FolderKanban, ArrowLeft, ShieldCheck, FileText, Package,
  Users, CheckCircle2, Circle, Clock, KeyRound, Plus
} from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat,
  ClassificationBadge, TxChip, Button, Badge
} from "@/components/app/ui";
import { useTG, decideDocAccess } from "@/lib/store";
import { PERSONA_MAP } from "@/lib/personas";
import { clearanceOf, CLEARANCE_LABEL } from "@/lib/policy";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { persona } = useApp();

  const projects = useTG((s) => s.projects);
  const docs = useTG((s) => s.docs);
  const assets = useTG((s) => s.assets);
  const state = useTG((s) => s);

  const proj = projects.find((p) => p.id === id);
  if (!proj) {
    notFound();
  }

  const projDocs = docs.filter((d) => d.projectId === proj.id);
  const projAssets = assets.filter((a) => a.projectId === proj.id);
  const isAssigned = proj.members.includes(persona.id) || proj.lead === persona.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          className="text-xs font-semibold text-ink-400 hover:text-navy-800 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>
      </div>

      <PageHeader
        eyebrow={`Programme Code: ${proj.code} · ${proj.department}`}
        title={proj.name}
        subtitle={proj.summary}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-50 text-blue-700 border border-blue-600/20">
              Phase: {proj.phase}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white text-navy-800 border border-line">
              Progress: {proj.progress}%
            </span>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Progress Tracked"
          value={`${proj.progress}%`}
          hint={`Stage: ${proj.phase}`}
          icon={<FolderKanban className="w-5 h-5 text-blue-600" />}
        />
        <Stat
          label="Secured Documents"
          value={projDocs.length}
          hint="Anchored to Polygon Amoy"
          icon={<FileText className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="Tracked Hardware Assets"
          value={projAssets.length}
          hint="Tokenized Subsystems"
          icon={<Package className="w-5 h-5 text-saffron-500" />}
          tone="amber"
        />
        <Stat
          label="Assigned Clearance Personnel"
          value={proj.members.length}
          hint="Vetted DIDs"
          icon={<Users className="w-5 h-5 text-navy-800" />}
          tone="navy"
        />
      </div>

      {/* Main Grid: Documents & Hardware */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Documents Section */}
          <Card>
            <CardHeader
              title={`Project Technical Specifications & Documents (${projDocs.length})`}
              action={
                <Link href="/documents">
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5" /> Upload Document
                  </Button>
                </Link>
              }
            />
            <div className="p-4">
              {projDocs.length === 0 ? (
                <p className="text-xs text-ink-400 py-4 text-center">No documents anchored for this project yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {projDocs.map((doc) => {
                    const decision = decideDocAccess(state, persona.id, doc.id, 2);
                    const latestVersion = doc.versions[0];
                    return (
                      <div key={doc.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href="/documents"
                              className="text-sm font-bold text-navy-800 hover:text-blue-600 truncate"
                            >
                              {doc.title}
                            </Link>
                            <ClassificationBadge value={doc.classification} />
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400 flex-wrap">
                            {latestVersion && (
                              <span>Hash: <code className="font-mono">{latestVersion.sha256.slice(0, 10)}...</code></span>
                            )}
                            <span>Version: v{latestVersion?.version ?? 1}</span>
                            {latestVersion?.txId && <TxChip txId={latestVersion.txId} />}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {decision.allowed ? (
                            <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-green-600" /> Access Granted
                            </span>
                          ) : (
                            <Link href={`/requests?docId=${doc.id}`}>
                              <Button variant="secondary" size="sm">
                                <KeyRound className="w-3 h-3" /> Request Access
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: Assigned Personnel & Assets */}
        <div className="space-y-6">
          {/* Personnel */}
          <Card>
            <CardHeader title={`Security-Vetted Personnel (${proj.members.length})`} />
            <div className="p-4 space-y-3">
              {proj.members.map((pid: string) => {
                const p = PERSONA_MAP.get(pid);
                if (!p) return null;
                const isMe = p.id === persona.id;
                const cl = clearanceOf(p);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-md border ${
                      isMe ? "bg-sky-50/60 border-blue-600/30" : "bg-page border-line"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded text-xs font-bold text-white flex items-center justify-center shrink-0 ${p.color}`}>
                        {p.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-navy-800 truncate">
                          {p.name} {isMe && "(You)"}
                        </p>
                        <p className="text-[10px] text-ink-400 truncate">{p.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-line text-ink-600">
                      {CLEARANCE_LABEL[cl]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Linked Hardware Assets */}
          <Card>
            <CardHeader
              title={`Tracked Subsystems & Assets (${projAssets.length})`}
              action={
                <Link href="/assets" className="text-xs font-semibold text-blue-600 hover:underline">
                  View all
                </Link>
              }
            />
            <div className="p-4 space-y-3">
              {projAssets.length === 0 ? (
                <p className="text-xs text-ink-400 text-center py-2">No hardware items linked.</p>
              ) : (
                projAssets.map((asset) => (
                  <div key={asset.id} className="p-2.5 rounded-md border border-line bg-page text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-navy-800">{asset.name}</p>
                      <Badge className="bg-sky-50 text-blue-700 border-blue-600/20">{asset.status}</Badge>
                    </div>
                    <p className="text-ink-600 mt-1 font-mono text-[11px]">Token #{asset.tokenId} · {asset.category}</p>
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-line/40 text-[10px] text-ink-400">
                      <span>Owner: {PERSONA_MAP.get(asset.owner)?.name ?? asset.owner}</span>
                      {asset.history[0]?.txId && <TxChip txId={asset.history[0].txId} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
