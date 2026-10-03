"use client";

import { useMemo, useState } from "react";
import {
  ScrollText, ShieldCheck, ShieldAlert, Search, Filter,
  Download, Cpu, CheckCircle2, Lock, ArrowUpRight, Copy, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  TxChip, Button, inputCls
} from "@/components/app/ui";
import { actions, useTG, verifyAuditChain } from "@/lib/store";
import { PERSONA_MAP } from "@/lib/personas";
import { truncateHash, timeAgo } from "@/lib/utils";

export default function AuditPage() {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const audit = useTG((s) => s.audit);
  const lastAnchor = useTG((s) => s.lastAnchor);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [anchoring, setAnchoring] = useState(false);

  // Run hash-chain integrity verification
  const integrity = useMemo(() => verifyAuditChain(state), [state]);

  const filtered = useMemo(() => {
    return audit.filter((entry) => {
      const matchSearch =
        entry.action.toLowerCase().includes(search.toLowerCase()) ||
        entry.target.toLowerCase().includes(search.toLowerCase()) ||
        entry.detail.toLowerCase().includes(search.toLowerCase()) ||
        entry.hash.toLowerCase().includes(search.toLowerCase());
      const matchAction =
        actionFilter === "ALL" || entry.action.startsWith(actionFilter);
      return matchSearch && matchAction;
    });
  }, [audit, search, actionFilter]);

  const handleAnchorAudit = () => {
    setAnchoring(true);
    try {
      const txId = actions.anchorAudit(persona.id);
      toast.success("Audit batch Merkle root anchored to Polygon Amoy AuditAnchor.sol!");
    } catch (err: any) {
      toast.error(err.message || "Failed to anchor audit trail");
    } finally {
      setAnchoring(false);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(audit, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trustgrid-audit-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Audit log exported to JSON");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Immutable Cryptographic Ledger"
        title="Zero-Trust System Audit Trail"
        subtitle="Every authentication, permission evaluation, and asset transition forms a continuous SHA-256 hash chain anchored to smart contracts."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportJSON}>
              <Download className="w-3.5 h-3.5" /> Export Log
            </Button>
            <Button size="sm" loading={anchoring} onClick={handleAnchorAudit}>
              <Cpu className="w-3.5 h-3.5" /> Anchor Batch to Amoy
            </Button>
          </div>
        }
      />

      {/* Integrity Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          integrity.ok
            ? "bg-green-50/80 border-green-200 text-green-900"
            : "bg-red-50 border-red-300 text-red-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {integrity.ok ? (
            <div className="w-10 h-10 rounded-full bg-green-600/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold">
              {integrity.ok
                ? "Cryptographic Hash Chain Intact (SHA-256 Verified)"
                : `CHAIN INTEGRITY FAILURE: Alteration Detected at Seq #${integrity.brokenAt}`}
            </h2>
            <p className="text-xs opacity-80 mt-0.5">
              {integrity.ok
                ? "Every event contains the hash of the preceding event. No entry has been modified, deleted, or backdated."
                : "One or more entries in the audit trail have been modified outside the cryptographic protocol."}
            </p>
          </div>
        </div>

        {lastAnchor && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="opacity-75">Last on-chain anchor: Seq #{lastAnchor.seq}</span>
            <TxChip txId={lastAnchor.txId} />
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Total Logged Events"
          value={audit.length}
          hint="Sequential Block Entries"
          icon={<ScrollText className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
        <Stat
          label="Tamper Detection Status"
          value={integrity.ok ? "Valid" : "Compromised"}
          hint="Real-Time Verification"
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone={integrity.ok ? "green" : "red"}
        />
        <Stat
          label="On-Chain Anchors"
          value={audit.filter((a) => a.txId).length}
          hint="Polygon Amoy Receipts"
          icon={<Cpu className="w-5 h-5 text-navy-800" />}
          tone="navy"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, target, or cryptographic hash..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {["ALL", "access", "document", "asset", "did", "demo"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActionFilter(cat)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                actionFilter === cat
                  ? "bg-navy-800 text-white border-navy-800"
                  : "bg-white text-ink-600 border-line hover:bg-sky-50"
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </Card>

      {/* Audit Entries Feed */}
      <Card>
        <CardHeader title={`Sequential Ledger Trail (${filtered.length} Entries)`} />
        <div className="p-4 divide-y divide-line">
          {filtered.map((entry) => {
            const actorUser = PERSONA_MAP.get(entry.actor);
            return (
              <div key={entry.seq} className="py-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-navy-800 px-2 py-0.5 rounded bg-page border border-line">
                      #{entry.seq}
                    </span>
                    <Badge className="bg-sky-50 text-blue-700 border-blue-600/20 font-mono">
                      {entry.action}
                    </Badge>
                    <span className="text-xs text-ink-600">
                      by <strong className="text-ink-900">{actorUser?.name ?? entry.actor}</strong> ({actorUser?.role ?? "System"})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-400">
                    <span>{timeAgo(entry.createdAt)}</span>
                    {entry.txId && <TxChip txId={entry.txId} />}
                  </div>
                </div>

                <p className="text-xs text-ink-700 bg-page/60 p-2.5 rounded border border-line/60">
                  <strong className="text-navy-800">Target:</strong> {entry.target} · {entry.detail}
                </p>

                {/* Hash chain proof snippet */}
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-400 pt-0.5">
                  <span className="truncate max-w-[45%]">
                    Prev: <span className="text-ink-600">{truncateHash(entry.prevHash)}</span>
                  </span>
                  <span className="truncate max-w-[45%] text-right">
                    Hash: <span className="text-blue-600 font-semibold">{truncateHash(entry.hash)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
