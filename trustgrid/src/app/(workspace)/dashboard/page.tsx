"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ShieldAlert, FileText, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, KeyRound, Cpu, ShieldCheck, Plus, PackageCheck,
  TrendingUp, Users, ExternalLink
} from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, RequestStatusBadge, Button, EmptyState
} from "@/components/app/ui";
import { useTG } from "@/lib/store";
import { roleGroup, ROLE_GROUP_LABEL, clearanceOf, CLEARANCE_LABEL } from "@/lib/policy";
import { PERSONA_MAP } from "@/lib/personas";
import { timeAgo, truncateHash } from "@/lib/utils";

export default function DashboardPage() {
  const { persona, openXRay } = useApp();
  const group = roleGroup(persona);
  const clearanceNum = clearanceOf(persona);

  const docs = useTG((s) => s.docs);
  const requests = useTG((s) => s.requests);
  const txs = useTG((s) => s.txs);
  const assets = useTG((s) => s.assets);
  const projects = useTG((s) => s.projects);

  // Filter requests relevant to persona
  const myRequests = useMemo(
    () => requests.filter((r) => r.requester === persona.id),
    [requests, persona.id]
  );

  const pendingApprovals = useMemo(
    () => requests.filter((r) => (r.status === "pending" || r.status === "first_approved") && r.firstApprover !== persona.id),
    [requests, persona.id]
  );

  const myProjects = useMemo(
    () => projects.filter((p) => p.members.includes(persona.id) || p.lead === persona.id || group === "admin"),
    [projects, persona.id, group]
  );

  const recentTxs = useMemo(() => txs.slice(0, 6), [txs]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`BEL ${persona.department}`}
        title={`Welcome back, ${persona.name}`}
        subtitle={`Zero-Trust Access Level: ${CLEARANCE_LABEL[clearanceNum]} Clearance · Role: ${persona.role}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/requests">
              <Button variant="secondary" size="sm">
                <KeyRound className="w-3.5 h-3.5" /> Request Access
              </Button>
            </Link>
            <Link href="/documents">
              <Button size="sm">
                <Plus className="w-3.5 h-3.5" /> Anchor Document
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Clearance Level"
          value={CLEARANCE_LABEL[clearanceNum]}
          hint={`${ROLE_GROUP_LABEL[group]} Tier`}
          icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
        <Stat
          label="Active Projects"
          value={myProjects.length}
          hint={`${projects.length} Total on Ledger`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="Pending Access Requests"
          value={myRequests.filter((r) => r.status === "pending" || r.status === "first_approved").length}
          hint={`${myRequests.length} All-time`}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          tone="amber"
        />
        <Stat
          label="On-Chain Anchor Tx"
          value={txs.filter((t) => t.status === "confirmed").length}
          hint="Verified Receipts"
          icon={<Cpu className="w-5 h-5 text-navy-800" />}
          tone="navy"
        />
      </div>

      {/* Middle row: Active Access Requests & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Access & Approvals */}
        <div className="lg:col-span-2 space-y-6">
          {/* If persona has approval capability, show Pending Approvals card */}
          {(group === "dept_head" || group === "unit_head" || group === "admin" || group === "executive") && (
            <Card>
              <CardHeader
                title={`Approval Requests Requiring Review (${pendingApprovals.length})`}
                action={
                  <Link href="/approvals" className="text-xs font-semibold text-blue-600 hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="p-4">
                {pendingApprovals.length === 0 ? (
                  <p className="text-xs text-ink-400 py-3 text-center">No pending approval actions in queue.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.slice(0, 3).map((req) => {
                      const doc = docs.find((d) => d.id === req.docId);
                      const reqUser = PERSONA_MAP.get(req.requester);
                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-md bg-page border border-line"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-navy-800 truncate">
                                {doc?.title ?? "Classified Document"}
                              </p>
                              {doc && <ClassificationBadge value={doc.classification} />}
                            </div>
                            <p className="text-xs text-ink-600 mt-0.5">
                              Requested by <strong className="text-ink-900">{reqUser?.name}</strong> ({reqUser?.role})
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <RequestStatusBadge status={req.status} expiresAt={req.expiresAt} />
                            <Link href="/approvals">
                              <Button size="sm">Review</Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Active Projects Overview */}
          <Card>
            <CardHeader
              title="Active Tactical Defence Projects"
              action={
                <Link href="/projects" className="text-xs font-semibold text-blue-600 hover:underline">
                  View all ({projects.length})
                </Link>
              }
            />
            <div className="p-4 space-y-3">
              {myProjects.slice(0, 3).map((proj) => (
                <div
                  key={proj.id}
                  className="p-3.5 rounded-lg border border-line hover:border-blue-600/30 transition-all bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="text-sm font-bold text-navy-800 hover:text-blue-600 transition-colors"
                        >
                          {proj.name}
                        </Link>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-blue-700 border border-blue-600/20">
                          {proj.department}
                        </span>
                      </div>
                      <p className="text-xs text-ink-600 mt-1 line-clamp-1">{proj.summary}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-blue-600 border border-blue-600/20 shrink-0">
                      Phase: {proj.phase}
                    </span>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs text-ink-400">
                    <span>Code: <code className="font-mono text-ink-600">{proj.code}</code></span>
                    <span>Progress: {proj.progress}%</span>
                    <Link
                      href={`/projects/${proj.id}`}
                      className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Inspect <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* User's recent document access requests */}
          <Card>
            <CardHeader
              title="My Clearance Requests"
              action={
                <Link href="/requests" className="text-xs font-semibold text-blue-600 hover:underline">
                  New request
                </Link>
              }
            />
            <div className="p-4">
              {myRequests.length === 0 ? (
                <EmptyState
                  title="No active requests"
                  body="You have not requested access to additional documents outside your active clearance."
                  action={
                    <Link href="/requests">
                      <Button size="sm">Create Request</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-line">
                  {myRequests.slice(0, 4).map((r) => {
                    const doc = docs.find((d) => d.id === r.docId);
                    return (
                      <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-800 truncate">{doc?.title ?? r.docId}</p>
                          <p className="text-xs text-ink-400">Requested {timeAgo(r.createdAt)} · Justification: {r.justification}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <RequestStatusBadge status={r.status} expiresAt={r.expiresAt} />
                          {r.txIds[0] && <TxChip txId={r.txIds[0]} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Ledger Pulse & Quick Actions */}
        <div className="space-y-6">
          {/* Blockchain Pulse Feed */}
          <Card>
            <CardHeader
              title="On-Chain Ledger Stream"
              action={
                <Link href="/audit" className="text-xs font-semibold text-blue-600 hover:underline">
                  Full trail
                </Link>
              }
            />
            <div className="p-4">
              <div className="space-y-3">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => openXRay(tx.id)}
                    className="p-2.5 rounded-md border border-line bg-page hover:bg-sky-50/70 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-navy-800 flex items-center gap-1.5 truncate">
                        <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {tx.action}
                      </span>
                      <span className="text-[10px] text-ink-400 shrink-0">{timeAgo(tx.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-ink-600 line-clamp-1">{tx.story}</p>
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-line/40 text-[10px]">
                      <span className="font-mono text-ink-400">{tx.contract}</span>
                      <TxChip txId={tx.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Quick Zero-Trust Security Card */}
          <Card className="p-4 bg-gradient-to-br from-navy-950 to-navy-800 text-white">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-white/10 text-saffron-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Continuous Zero-Trust Enforcement</p>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Clearance and role alone never bypass document controls. Every decryption checks verified credentials, project assignment, and dual-party cryptographic approvals.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <Link href="/identity" className="text-saffron-400 font-semibold hover:underline">
                View My DID Credentials →
              </Link>
              <Link href="/architecture" className="text-white/60 hover:text-white">
                Learn Security Model
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
