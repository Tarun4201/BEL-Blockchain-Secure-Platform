"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  GraduationCap, X, Play, RotateCcw, ShieldCheck, CheckCircle2,
  FileText, KeyRound, ExternalLink, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import { PERSONAS } from "@/lib/personas";
import { actions, useTG } from "@/lib/store";
import { switchPersona } from "./AppShell";

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  recommendedPersonaId: string;
  actionLabel: string;
  path: string;
  run: () => void | Promise<void>;
}

export function EvaluatorPanel() {
  const { evaluatorOpen, setEvaluatorOpen, persona } = useApp();
  const router = useRouter();
  const txCount = useTG((s) => s.txs.length);
  const docCount = useTG((s) => s.docs.length);
  const reqCount = useTG((s) => s.requests.length);
  const [running, setRunning] = useState<string | null>(null);

  const scenarios: DemoScenario[] = [
    {
      id: "dual-approval",
      title: "1. Dual-Approver Zero-Trust Flow",
      description: "Submit a SECRET clearance document access request and verify the two-person multi-sig rule on-chain.",
      recommendedPersonaId: "vikram-singh",
      actionLabel: "Try Dual-Approval Flow",
      path: "/requests",
      run: async () => {
        toast.info("Switching to Vikram Singh (Project Director) to inspect approvals");
        await switchPersona("vikram-singh", router, "/approvals");
      },
    },
    {
      id: "tamper-proof",
      title: "2. Cryptographic Tamper Detection",
      description: "Verify SHA-256 document fingerprints anchored to the blockchain vs altered document content.",
      recommendedPersonaId: "meera-patel",
      actionLabel: "Inspect Documents",
      path: "/documents",
      run: async () => {
        await switchPersona("meera-patel", router, "/documents");
      },
    },
    {
      id: "public-verify",
      title: "3. Zero-Knowledge Public Verification",
      description: "Public auditor tool to check document or certificate validity without exposing classified data.",
      recommendedPersonaId: "rajesh-kumar",
      actionLabel: "Open Public Verifier",
      path: "/verify",
      run: () => {
        router.push("/verify");
      },
    },
    {
      id: "audit-trail",
      title: "4. Immutable Hash-Chained Audit Trail",
      description: "Inspect live cryptographic state, block heights, and Polygon Amoy transaction receipts.",
      recommendedPersonaId: "rajesh-kumar",
      actionLabel: "View Audit Log",
      path: "/audit",
      run: async () => {
        await switchPersona("rajesh-kumar", router, "/audit");
      },
    },
  ];

  const handleResetLedger = () => {
    if (confirm("Reset local demo ledger to pristine seed state?")) {
      actions.reset();
      toast.success("Ledger reset to initial state");
      router.refresh();
    }
  };

  return (
    <AnimatePresence>
      {evaluatorOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950/40 z-[70]"
            onClick={() => setEvaluatorOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="evaluator-mode-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-[71] shadow-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-navy-950 text-white p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-saffron-500/20 text-saffron-400">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 id="evaluator-mode-title" className="text-base font-bold text-white">Evaluator Mode (SIH 2026)</h2>
                    <p className="text-xs text-white/70">Judge & Evaluator Interactive Walkthrough</p>
                  </div>
                </div>
                <button
                  onClick={() => setEvaluatorOpen(false)}
                  className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
                  aria-label="Close Evaluator Mode"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick stats banner */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
                <div className="p-2 rounded bg-white/5">
                  <p className="text-xs text-white/50">Ledger Txs</p>
                  <p className="text-lg font-bold text-saffron-400">{txCount}</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-xs text-white/50">Secured Docs</p>
                  <p className="text-lg font-bold text-blue-400">{docCount}</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-xs text-white/50">Requests</p>
                  <p className="text-lg font-bold text-green-400">{reqCount}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">Interactive Scenarios</h3>
                  <span className="text-[11px] font-medium text-blue-600 bg-sky-50 px-2 py-0.5 rounded border border-blue-600/20">
                    1-Click Demonstrations
                  </span>
                </div>
                <div className="space-y-3">
                  {scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3.5 rounded-lg border border-line bg-page hover:border-blue-600/40 transition-all"
                    >
                      <h4 className="text-sm font-bold text-navy-800">{sc.title}</h4>
                      <p className="text-xs text-ink-600 mt-1 leading-relaxed">{sc.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-400">
                          Role: <strong className="text-ink-600 font-semibold">{PERSONAS.find(p => p.id === sc.recommendedPersonaId)?.name}</strong>
                        </span>
                        <button
                          onClick={async () => {
                            setRunning(sc.id);
                            await sc.run();
                            setRunning(null);
                            setEvaluatorOpen(false);
                          }}
                          disabled={running === sc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-800 text-white text-xs font-semibold hover:bg-navy-800/90 transition-colors shadow-soft"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          {sc.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Persona quick switch for evaluators */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                  Quick Switch to Key Stakeholder Roles
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "rajesh-kumar", role: "Super Admin / Security Officer" },
                    { id: "vikram-singh", role: "BEL Project Director" },
                    { id: "meera-patel", role: "Senior Systems Engineer" },
                    { id: "anil-verma", role: "External Subcontractor" },
                    { id: "priya-sharma", role: "Air Force Quality Auditor" },
                    { id: "arun-nair", role: "MoD Defense Procurement Officer" },
                  ].map((item) => {
                    const p = PERSONAS.find((x) => x.id === item.id);
                    if (!p) return null;
                    const isCurrent = persona.id === p.id;
                    return (
                      <button
                        key={p.id}
                        disabled={isCurrent}
                        onClick={async () => {
                          await switchPersona(p.id, router);
                          toast.success(`Switched role to ${p.name}`);
                          setEvaluatorOpen(false);
                        }}
                        className={`p-2.5 rounded text-left border transition-all text-xs ${
                          isCurrent
                            ? "bg-blue-600/10 border-blue-600 text-blue-700 font-semibold"
                            : "bg-white border-line hover:bg-sky-50 text-ink-900"
                        }`}
                      >
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-[10px] text-ink-400 truncate">{item.role}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Reset to Pristine Seed */}
              <section className="pt-4 border-t border-line">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div>
                    <p className="text-xs font-bold text-amber-900">Reset Demo Ledger</p>
                    <p className="text-[11px] text-amber-700">Clear test changes and restore default mock chain state.</p>
                  </div>
                  <button
                    onClick={handleResetLedger}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Reset
                  </button>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
