"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ShieldCheck, ShieldX } from "lucide-react";
import type { PolicyDecision } from "@/lib/policy";
import { cn } from "@/lib/utils";

/** Visual, step-by-step explanation of a zero-trust decision. */
export function PolicyTrace({ decision, compact }: { decision: PolicyDecision; compact?: boolean }) {
  return (
    <div className={cn("rounded-lg border", decision.allowed ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50", compact ? "p-3" : "p-4")}>
      <div className="flex items-center gap-2 mb-3">
        {decision.allowed ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldX className="w-5 h-5 text-red-600" />}
        <p className={cn("text-sm font-bold", decision.allowed ? "text-green-700" : "text-red-700")}>
          {decision.allowed ? "Access allowed — every check passed" : "Access denied — role alone never grants access"}
        </p>
      </div>
      <ol className="space-y-2">
        {decision.checks.map((c, i) => (
          <motion.li
            key={c.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2.5"
          >
            {c.pass ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{c.label}</p>
              {!compact && <p className="text-xs text-ink-600">{c.detail}</p>}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
