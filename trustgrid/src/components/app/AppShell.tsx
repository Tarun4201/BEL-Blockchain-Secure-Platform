"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Shield, Bell, LogOut, ChevronDown, Menu, X, Search, GraduationCap, Activity, Users,
} from "lucide-react";
import type { Persona } from "@/lib/types";
import { navFor } from "@/lib/nav";
import { PERSONAS } from "@/lib/personas";
import { ROLE_GROUP_LABEL, roleGroup } from "@/lib/policy";
import { approversFor, useTG } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { AppProvider, useApp } from "./AppContext";
import { Avatar } from "./ui";
import { XRayDrawer } from "./XRayDrawer";
import { EvaluatorPanel } from "./EvaluatorPanel";

export function AppShell({ persona, chainLive, children }: { persona: Persona; chainLive: boolean; children: React.ReactNode }) {
  // The ledger store lives in localStorage — render only on the client to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AppProvider persona={persona} chainLive={chainLive}>
      {mounted ? <ShellInner>{children}</ShellInner> : <ShellSkeleton />}
      <Toaster position="bottom-right" richColors closeButton />
    </AppProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block w-64 bg-navy-950" />
      <div className="flex-1 p-8 space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { persona } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-screen flex bg-transparent">
      <a href="#main" className="skip-link">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-navy-950 text-white sticky top-0 h-screen">
        <Sidebar persona={persona} />
      </aside>
      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 bg-navy-950/50 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed left-0 top-0 bottom-0 w-64 bg-navy-950 text-white z-50 flex flex-col lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.22 }}>
              <button className="absolute right-3 top-3 p-1 rounded hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="w-4 h-4" /></button>
              <Sidebar persona={persona} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {children}
          </motion.div>
        </main>
        <footer className="px-8 py-4 text-[11px] text-ink-400 border-t border-line">
          SIH 2026 prototype · fictional demonstration data · not an official BEL product
        </footer>
      </div>
      <XRayDrawer />
      <EvaluatorPanel />
    </div>
  );
}

function Sidebar({ persona }: { persona: Persona }) {
  const pathname = usePathname();
  const sections = useMemo(() => navFor(persona), [persona]);
  const s = useTG((x) => x);
  const counts = useMemo(() => ({
    approvals: s.requests.filter((r) => (r.status === "pending" || r.status === "first_approved") && r.firstApprover !== persona.id && approversFor(s, r).includes(persona.id)).length,
    requests: s.requests.filter((r) => r.requester === persona.id && (r.status === "pending" || r.status === "first_approved")).length,
  }), [s, persona.id]);

  return (
    <>
      <div className="tricolour-bar" aria-hidden="true" />
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-14 border-b border-white/5">
        <div className="w-8 h-8 rounded-md bg-blue-600/20 flex items-center justify-center"><Shield className="w-4 h-4 text-blue-400" /></div>
        <div>
          <p className="text-sm font-bold leading-none">BEL TrustGrid</p>
          <p className="text-[10px] text-white/40 mt-0.5">Secure Platform 2.0</p>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" aria-label="Workspace navigation">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">{sec.title}</p>
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;
                const count = item.badgeKey ? counts[item.badgeKey] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                        active ? "bg-white/10 text-white font-semibold" : "text-white/65 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {active && <motion.span layoutId="nav-active" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded bg-saffron-500" />}
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && <span className="text-[10px] font-bold bg-saffron-500 text-white rounded-full px-1.5 min-w-[18px] text-center">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 p-2 rounded-md bg-white/5">
          <Avatar id={persona.id} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{persona.name}</p>
            <p className="text-[11px] text-white/50 truncate">{ROLE_GROUP_LABEL[roleGroup(persona)]}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { persona, mode, setMode, chainLive, setEvaluatorOpen } = useApp();
  const pendingTx = useTG((s) => s.txs.filter((t) => t.status === "queued" || t.status === "submitted").length);
  const block = useTG((s) => s.block);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line h-14 flex items-center gap-3 px-4 md:px-6">
      <button className="lg:hidden p-1.5 rounded hover:bg-sky-50" onClick={onMenu} aria-label="Open menu"><Menu className="w-5 h-5 text-navy-800" /></button>

      {/* Chain status pill */}
      <div className={cn("hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium",
        chainLive ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700")}
        title={chainLive ? "Connected to Polygon Amoy" : "Running on the local demo ledger"}>
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", chainLive ? "bg-green-500" : "bg-amber-500")} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", chainLive ? "bg-green-600" : "bg-amber-500")} />
        </span>
        {chainLive ? "Polygon Amoy" : "Demo ledger"}
        <span className="font-mono text-[11px] opacity-70">#{block.toLocaleString("en-IN")}</span>
        {pendingTx > 0 && <span className="flex items-center gap-1 text-blue-600"><Activity className="w-3 h-3" />{pendingTx}</span>}
      </div>

      <div className="flex-1" />

      {/* Simple / Technical */}
      <div className="flex rounded-md border border-line p-0.5 bg-page" role="group" aria-label="Explanation mode">
        {(["simple", "technical"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
            className={cn("px-2.5 py-1 text-xs font-semibold rounded capitalize transition-all", mode === m ? "bg-white text-navy-800 shadow-soft" : "text-ink-400 hover:text-ink-600")}>
            {m}
          </button>
        ))}
      </div>

      <button onClick={() => setEvaluatorOpen(true)}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-saffron-500/10 text-saffron-500 text-xs font-semibold hover:bg-saffron-500/20 transition-colors">
        <GraduationCap className="w-4 h-4" /> Evaluator Mode
      </button>

      <Notifications userId={persona.id} />
      <PersonaSwitcher />
    </header>
  );
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open, close]);
  return ref;
}

function Notifications({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const all = useTG((s) => s.notices);
  const mine = useMemo(() => all.filter((n) => n.userId === userId).slice(0, 8), [all, userId]);
  const unread = mine.filter((n) => !n.read).length;
  const ref = useClickOutside(open, () => setOpen(false));
  const { markNoticesRead } = require("@/lib/store").actions as typeof import("@/lib/store").actions;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen((v) => !v); if (!open && unread) setTimeout(() => markNoticesRead(userId), 1500); }}
        className="relative p-2 rounded-md hover:bg-sky-50" aria-label={`Notifications (${unread} unread)`}>
        <Bell className="w-4.5 h-4.5 text-navy-800" />
        {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-saffron-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-line shadow-card overflow-hidden z-50">
            <p className="px-4 py-2.5 text-sm font-semibold text-navy-800 border-b border-line">Notifications</p>
            {mine.length === 0 ? <p className="p-4 text-sm text-ink-400">You&apos;re all caught up.</p> : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-line">
                {mine.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link ?? "#"} onClick={() => setOpen(false)} className={cn("block px-4 py-3 hover:bg-sky-50", !n.read && "bg-sky-50/60")}>
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      <p className="text-xs text-ink-600">{n.body}</p>
                      <p className="text-[10px] text-ink-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export async function switchPersona(id: string, router: ReturnType<typeof useRouter>, to?: string) {
  const res = await fetch("/api/auth/persona-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaId: id }) });
  if (!res.ok) { toast.error("Could not switch persona"); return; }
  if (to) router.push(to);
  router.refresh();
}

function PersonaSwitcher() {
  const { persona } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useClickOutside(open, () => setOpen(false));
  const list = PERSONAS.filter((p) => (p.name + p.role).toLowerCase().includes(q.toLowerCase()));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-sky-50" aria-haspopup="menu" aria-expanded={open}>
        <Avatar id={persona.id} />
        <span className="hidden md:block text-left">
          <span className="block text-sm font-semibold text-ink-900 leading-tight">{persona.name}</span>
          <span className="block text-[11px] text-ink-400 leading-tight max-w-[160px] truncate">{persona.role}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-ink-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-line shadow-card z-50 overflow-hidden" role="menu">
            <div className="p-3 border-b border-line">
              <p className="text-xs font-semibold text-ink-400 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Switch persona (demo)</p>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or role…" aria-label="Search personas"
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/30" />
              </div>
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {list.map((p) => (
                <li key={p.id}>
                  <button role="menuitem" disabled={p.id === persona.id}
                    onClick={async () => { setOpen(false); await switchPersona(p.id, router); toast.success(`Now signed in as ${p.name}`); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-50 disabled:opacity-50">
                    <Avatar id={p.id} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink-900 truncate">{p.name}</span>
                      <span className="block text-[11px] text-ink-400 truncate">{p.role}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 border-t border-line hover:bg-red-50">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
