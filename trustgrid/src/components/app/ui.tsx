"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Loader2, XCircle, Link2, Inbox } from "lucide-react";
import type { ChainStatus, Classification, RequestStatus } from "@/lib/types";
import { CLASSIFICATION_CONFIG, cn, truncateHash } from "@/lib/utils";
import { PERSONA_MAP } from "@/lib/personas";
import { useTG } from "@/lib/store";
import { useApp } from "./AppContext";

// ── Layout ───────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">{eyebrow}</p>}
        <h1 className="text-xl font-bold text-navy-800">{title}</h1>
        {subtitle && <p className="text-sm text-ink-600 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white rounded-lg border border-line shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, icon }: { title: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-line">
      <h2 className="text-sm font-semibold text-navy-800 flex items-center gap-2">{icon}{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone = "blue" }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" | "navy" }) {
  const tones = {
    blue: "bg-blue-600/10 text-blue-600", green: "bg-green-600/10 text-green-600",
    amber: "bg-amber-500/10 text-amber-600", red: "bg-red-600/10 text-red-600", navy: "bg-navy-800/10 text-navy-800",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-400">{label}</p>
          <p className="text-2xl font-bold text-navy-800 mt-1">{value}</p>
          {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
        </div>
        {icon && <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", tones[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center mb-3">
        <Inbox className="w-5 h-5 text-ink-400" />
      </div>
      <p className="text-sm font-semibold text-navy-800">{title}</p>
      {body && <p className="text-sm text-ink-600 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export function Button({ variant = "primary", size = "md", className, loading, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean }) {
  const v = {
    primary: "bg-navy-800 text-white hover:bg-navy-800/90",
    secondary: "bg-white text-navy-800 border border-line hover:bg-sky-50",
    ghost: "text-ink-600 hover:bg-sky-50",
    danger: "bg-red-600 text-white hover:bg-red-600/90",
    success: "bg-green-600 text-white hover:bg-green-600/90",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2",
        v, className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ── Badges ───────────────────────────────────────────────────
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap", className)}>{children}</span>;
}

export function ClassificationBadge({ value }: { value: Classification }) {
  const c = CLASSIFICATION_CONFIG[value];
  return <Badge className={c.color}>{c.label}</Badge>;
}

const REQ_STATUS: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "text-amber-600 bg-amber-50 border-amber-200" },
  first_approved: { label: "1 of 2 approved", cls: "text-blue-600 bg-sky-50 border-blue-600/30" },
  approved: { label: "Approved", cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "Rejected", cls: "text-red-600 bg-red-50 border-red-200" },
  expired: { label: "Expired", cls: "text-ink-600 bg-page border-line" },
  revoked: { label: "Revoked", cls: "text-red-600 bg-red-50 border-red-200" },
  cancelled: { label: "Cancelled", cls: "text-ink-600 bg-page border-line" },
};
export function RequestStatusBadge({ status, expiresAt }: { status: RequestStatus; expiresAt?: string | null }) {
  const effective: RequestStatus = status === "approved" && expiresAt && new Date(expiresAt).getTime() < Date.now() ? "expired" : status;
  const c = REQ_STATUS[effective];
  return <Badge className={c.cls}>{c.label}</Badge>;
}

// ── People ───────────────────────────────────────────────────
export function Avatar({ id, size = "md" }: { id: string; size?: "sm" | "md" | "lg" }) {
  const p = PERSONA_MAP.get(id);
  const s = { sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-12 h-12 text-sm" }[size];
  return (
    <div className={cn("rounded-md flex items-center justify-center font-bold text-white shrink-0", p?.color ?? "bg-ink-400", s)} aria-hidden="true">
      {p?.avatar ?? "?"}
    </div>
  );
}

export function PersonaName({ id, withRole }: { id: string; withRole?: boolean }) {
  const p = PERSONA_MAP.get(id);
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Avatar id={id} size="sm" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-900 truncate">{p?.name ?? id}</span>
        {withRole && <span className="block text-xs text-ink-400 truncate">{p?.role}</span>}
      </span>
    </span>
  );
}

// ── Chain proof chip ─────────────────────────────────────────
export function ChainStatusIcon({ status, className }: { status: ChainStatus; className?: string }) {
  if (status === "confirmed") return <CheckCircle2 className={cn("w-3.5 h-3.5 text-green-600", className)} />;
  if (status === "failed") return <XCircle className={cn("w-3.5 h-3.5 text-red-600", className)} />;
  if (status === "queued" || status === "submitted") return <Loader2 className={cn("w-3.5 h-3.5 text-blue-600 animate-spin", className)} />;
  return <Circle className={cn("w-3.5 h-3.5 text-ink-400", className)} />;
}

/** Clickable proof chip — opens the Blockchain X-Ray drawer. */
export function TxChip({ txId, label }: { txId: string | null | undefined; label?: string }) {
  const tx = useTG((s) => (txId ? s.txs.find((t) => t.id === txId) : undefined));
  const { openXRay, mode } = useApp();
  if (!txId || !tx) return <span className="text-xs text-ink-400">Off-chain</span>;
  const text =
    tx.status === "confirmed"
      ? mode === "technical" && tx.txHash ? truncateHash(tx.txHash) : label ?? "Verified on-chain"
      : tx.status === "submitted" ? "Confirming…" : tx.status === "queued" ? "Queued…" : "Failed";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openXRay(txId); }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
        tx.status === "confirmed" ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : "bg-sky-50 border-blue-600/30 text-blue-600"
      )}
      aria-label={`Open blockchain X-Ray for ${tx.action}`}
    >
      <ChainStatusIcon status={tx.status} className="w-3 h-3" />
      <span className={cn(mode === "technical" && tx.status === "confirmed" && "font-mono")}>{text}</span>
      <Link2 className="w-3 h-3 opacity-60" />
    </button>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-blue-600 hover:underline font-medium">{children}</Link>;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-600 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "w-full px-3 py-2 border border-line rounded-md text-sm text-ink-900 bg-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-colors";
