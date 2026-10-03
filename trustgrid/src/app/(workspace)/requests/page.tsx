"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  KeyRound, Plus, Clock, CheckCircle2, XCircle, AlertTriangle,
  FileText, ShieldCheck, ChevronRight, X, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, RequestStatusBadge, Button, inputCls, EmptyState
} from "@/components/app/ui";
import { actions, useTG, approversFor } from "@/lib/store";
import { ACCESS_LEVEL_CONFIG, timeAgo } from "@/lib/utils";
import { PERSONA_MAP } from "@/lib/personas";

export default function RequestsPage() {
  const { persona, openXRay } = useApp();
  const searchParams = useSearchParams();
  const defaultDocId = searchParams.get("docId") || "";

  const docs = useTG((s) => s.docs);
  const requests = useTG((s) => s.requests);
  const state = useTG((s) => s);

  const [modalOpen, setModalOpen] = useState(!!defaultDocId);
  const [selectedDocId, setSelectedDocId] = useState(defaultDocId || (docs[0]?.id ?? ""));
  const [level, setLevel] = useState<number>(2);
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);

  const myRequests = useMemo(() => {
    return requests.filter((r) => r.requester === persona.id);
  }, [requests, persona.id]);

  const activeCount = myRequests.filter((r) => r.status === "approved" && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())).length;
  const pendingCount = myRequests.filter((r) => r.status === "pending" || r.status === "first_approved").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      toast.error("Please select a document");
      return;
    }
    if (justification.trim().length < 15) {
      toast.error("Justification must be at least 15 characters");
      return;
    }

    setLoading(true);
    try {
      const txId = actions.requestAccess(persona.id, selectedDocId, level, justification);
      toast.success("Access request broadcast to smart contract!");
      setModalOpen(false);
      setJustification("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (reqId: string) => {
    if (confirm("Are you sure you want to cancel this access request?")) {
      try {
        actions.cancel(persona.id, reqId);
        toast.info("Request cancelled");
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel request");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Zero-Trust Clearance Protocol"
        title="My Document Access Grants & Requests"
        subtitle="Manage cryptographic access grants. High-clearance resources trigger automated dual-party sign-off on Polygon Amoy."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Request Access
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Active Grants"
          value={activeCount}
          hint="Currently Decryptable"
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="In Approver Pipeline"
          value={pendingCount}
          hint="Awaiting Sign-off"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          tone="amber"
        />
        <Stat
          label="Total History"
          value={myRequests.length}
          hint="Permanent Log Entries"
          icon={<KeyRound className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader
          title={`All Submitted Requests (${myRequests.length})`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New Request
            </Button>
          }
        />
        <div className="p-4">
          {myRequests.length === 0 ? (
            <EmptyState
              title="No clearance requests in your log"
              body="You have not submitted any access requests for restricted documents."
              action={
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  Request Document Access
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {myRequests.map((r) => {
                const doc = docs.find((d) => d.id === r.docId);
                const eligibleApprovers = approversFor(state, r);
                const firstAppUser = r.firstApprover ? PERSONA_MAP.get(r.firstApprover) : null;
                const secondAppUser = r.secondApprover ? PERSONA_MAP.get(r.secondApprover) : null;

                return (
                  <div key={r.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href="/documents"
                          className="text-sm font-bold text-navy-800 hover:text-blue-600"
                        >
                          {doc?.title ?? r.docId}
                        </Link>
                        {doc && <ClassificationBadge value={doc.classification} />}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-blue-700 border border-blue-600/20">
                          {ACCESS_LEVEL_CONFIG[r.level as keyof typeof ACCESS_LEVEL_CONFIG]?.short ?? `L${r.level}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RequestStatusBadge status={r.status} expiresAt={r.expiresAt} />
                        {r.txIds[0] && <TxChip txId={r.txIds[0]} />}
                      </div>
                    </div>

                    <p className="text-xs text-ink-600 bg-page p-2.5 rounded border border-line">
                      <strong className="text-ink-900">Justification:</strong> {r.justification}
                    </p>

                    {/* Progress / Approver Pipeline Details */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400 pt-1">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>Submitted: {timeAgo(r.createdAt)}</span>
                        {r.firstApprover && (
                          <span className="text-ink-600">
                            1st Approver: <strong>{firstAppUser?.name}</strong>
                          </span>
                        )}
                        {r.secondApprover && (
                          <span className="text-ink-600">
                            2nd Approver: <strong>{secondAppUser?.name}</strong>
                          </span>
                        )}
                        {r.status === "pending" && eligibleApprovers.length > 0 && (
                          <span className="text-amber-600">
                            Eligible Approvers: {eligibleApprovers.map((id) => PERSONA_MAP.get(id)?.name).filter(Boolean).slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Cancel action if pending */}
                      {(r.status === "pending" || r.status === "first_approved") && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-blue-600/20 text-blue-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">Request Document Clearance Grant</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Select Document</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className={inputCls}
                >
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.classification.toUpperCase()}] {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Requested Access Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value={1}>L1 — View Metadata</option>
                  <option value={2}>L2 — View / Read Specification (Default)</option>
                  <option value={3}>L3 — Download Encrypted Package</option>
                  <option value={4}>L4 — Edit / Anchor Revisions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Operational Justification (Min 15 chars)</label>
                <textarea
                  required
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="State the mission requirement, project phase milestone, or audit scope..."
                  className={inputCls}
                />
              </div>

              <div className="p-3 rounded bg-sky-50 border border-blue-600/20 text-xs text-blue-700">
                <p className="font-semibold">Zero-Trust Notice:</p>
                <p className="mt-0.5 text-blue-600">
                  Classified Secret requests automatically enforce the Two-Person Multi-Signature Rule on the <code>AccessControl.sol</code> contract.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={loading}>
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
