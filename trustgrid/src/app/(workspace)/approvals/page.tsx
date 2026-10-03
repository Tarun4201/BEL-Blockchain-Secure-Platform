"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  Clock, KeyRound, UserCheck, MessageSquare, X, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, RequestStatusBadge, Button, inputCls, EmptyState
} from "@/components/app/ui";
import { actions, useTG, approversFor, AccessReq } from "@/lib/store";
import { PERSONA_MAP } from "@/lib/personas";
import { ACCESS_LEVEL_CONFIG, timeAgo } from "@/lib/utils";
import { CLASSIFICATION_LEVEL } from "@/lib/demo-data";
import { TWO_PERSON_THRESHOLD, canApprove } from "@/lib/policy";

export default function ApprovalsPage() {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const docs = useTG((s) => s.docs);
  const requests = useTG((s) => s.requests);

  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [rejectModalReq, setRejectModalReq] = useState<AccessReq | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalHours, setApprovalHours] = useState(24);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Eligible pending requests for this persona
  const pendingQueue = useMemo(() => {
    return requests.filter((r) => {
      const isPending = r.status === "pending" || r.status === "first_approved";
      if (!isPending) return false;
      if (r.firstApprover === persona.id) return false; // Two-person rule: cannot approve twice
      const eligible = approversFor(state, r);
      return eligible.includes(persona.id);
    });
  }, [requests, persona.id, state]);

  // History of requests decided by this persona
  const historyQueue = useMemo(() => {
    return requests.filter(
      (r) => r.firstApprover === persona.id || r.secondApprover === persona.id
    );
  }, [requests, persona.id]);

  const handleApprove = async (req: AccessReq) => {
    setActionLoading(req.id);
    try {
      const txId = actions.approve(persona.id, req.id, approvalHours);
      toast.success(
        req.status === "pending" && (docs.find((d) => d.id === req.docId)?.classification === "secret_demo")
          ? "First approval signed! Awaiting second officer."
          : "Grant approved & anchored on-chain!"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;
    if (rejectReason.trim().length < 10) {
      toast.error("Please provide a rejection rationale (min 10 characters)");
      return;
    }

    try {
      actions.reject(persona.id, rejectModalReq.id, rejectReason);
      toast.info("Access request rejected and recorded on-chain.");
      setRejectModalReq(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Multi-Party Authorization"
        title="Access Control & Dual-Approval Inbox"
        subtitle="Review, authenticate, and grant cryptographic document access. Two-person rule enforced for Secret specifications."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Pending In Queue"
          value={pendingQueue.length}
          hint="Requiring Your Signature"
          icon={<Inbox className="w-5 h-5 text-amber-600" />}
          tone="amber"
        />
        <Stat
          label="Actions Signed by You"
          value={historyQueue.length}
          hint="All-Time Approvals"
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="Total Global Requests"
          value={requests.length}
          hint="Governed on Amoy"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-sm font-semibold">
        <button
          onClick={() => setTab("pending")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            tab === "pending"
              ? "border-navy-800 text-navy-800"
              : "border-transparent text-ink-400 hover:text-ink-600"
          }`}
        >
          <Inbox className="w-4 h-4" /> Pending Reviews
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 font-bold">
            {pendingQueue.length}
          </span>
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            tab === "history"
              ? "border-navy-800 text-navy-800"
              : "border-transparent text-ink-400 hover:text-ink-600"
          }`}
        >
          <Clock className="w-4 h-4" /> Signed History
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-sky-50 text-blue-700 font-bold">
            {historyQueue.length}
          </span>
        </button>
      </div>

      {/* List */}
      <Card>
        <div className="p-4">
          {tab === "pending" ? (
            pendingQueue.length === 0 ? (
              <EmptyState
                title="Your approval queue is clear"
                body="There are no pending document access requests awaiting your clearance signature."
              />
            ) : (
              <div className="divide-y divide-line">
                {pendingQueue.map((req) => {
                  const doc = docs.find((d) => d.id === req.docId);
                  const requester = PERSONA_MAP.get(req.requester);
                  const isSecret = doc?.classification === "secret_demo";
                  const isFirstApproved = req.status === "first_approved";

                  return (
                    <div key={req.id} className="py-4 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-navy-800">
                              {doc?.title ?? req.docId}
                            </span>
                            {doc && <ClassificationBadge value={doc.classification} />}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-blue-700 border border-blue-600/20">
                              {ACCESS_LEVEL_CONFIG[req.level as keyof typeof ACCESS_LEVEL_CONFIG]?.short ?? `L${req.level}`}
                            </span>
                          </div>
                          <p className="text-xs text-ink-600 mt-1">
                            Requested by <strong className="text-ink-900">{requester?.name}</strong> ({requester?.role}) · Department: {requester?.department}
                          </p>
                        </div>

                        {/* Approver Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setRejectModalReq(req)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            loading={actionLoading === req.id}
                            onClick={() => handleApprove(req)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isFirstApproved ? "Sign Final Grant" : isSecret ? "Sign 1st Approval" : "Grant Access"}
                          </Button>
                        </div>
                      </div>

                      {/* Justification Box */}
                      <div className="p-3 rounded-lg bg-page border border-line text-xs space-y-1">
                        <span className="font-semibold text-ink-600">Requester Justification:</span>
                        <p className="text-ink-900 italic">&ldquo;{req.justification}&rdquo;</p>
                      </div>

                      {/* Two-person rule notice */}
                      {isSecret && (
                        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            {isFirstApproved
                              ? `First approval signed by ${PERSONA_MAP.get(req.firstApprover!)?.name}. You are providing the second multi-sig grant.`
                              : "Secret Document: Two distinct senior approvers are strictly required."}
                          </span>
                          <span className="font-mono text-[10px] text-amber-700">AccessControl.sol (2-of-2)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* History Queue */
            historyQueue.length === 0 ? (
              <EmptyState title="No approval history recorded" body="You haven't approved or rejected any access requests yet." />
            ) : (
              <div className="divide-y divide-line">
                {historyQueue.map((req) => {
                  const doc = docs.find((d) => d.id === req.docId);
                  const requester = PERSONA_MAP.get(req.requester);
                  return (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-navy-800">{doc?.title ?? req.docId}</span>
                          {doc && <ClassificationBadge value={doc.classification} />}
                          <RequestStatusBadge status={req.status} expiresAt={req.expiresAt} />
                        </div>
                        <p className="text-xs text-ink-600 mt-0.5">
                          Requester: {requester?.name} · Signed {timeAgo(req.decidedAt || req.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.txIds[0] && <TxChip txId={req.txIds[0]} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Reject Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Reject Access Request</h3>
              <button onClick={() => setRejectModalReq(null)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
              <p className="text-xs text-ink-600">
                Please provide an official audit reason for denying this access request. The rationale will be anchored on-chain.
              </p>
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Scope outside active subcontract milestone parameters..."
                  className={inputCls}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="secondary" size="sm" onClick={() => setRejectModalReq(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm">
                  Record Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
