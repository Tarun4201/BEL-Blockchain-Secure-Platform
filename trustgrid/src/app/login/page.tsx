"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lock, CheckCircle2, ChevronRight, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { FEATURED_PERSONAS, PERSONAS } from "@/lib/personas";
import type { Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── 4-step sign-in animation ──────────────────────────────────────────────────
const SIGN_IN_STEPS = [
  { label: "Credential handshake", desc: "Verifying password with Supabase Auth" },
  { label: "DID lookup", desc: "Checking on-chain identity registry" },
  { label: "Ledger evidence", desc: "Loading your chain activity" },
  { label: "Workspace ready", desc: "Preparing your role-specific workspace" },
];

interface SignInAnimationProps {
  currentStep: number;
  done: boolean;
}

function SignInAnimation({ currentStep, done }: SignInAnimationProps) {
  return (
    <div className="space-y-3 py-4">
      {SIGN_IN_STEPS.map((step, i) => {
        const isActive = i === currentStep && !done;
        const isDone = i < currentStep || done;
        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                isDone && "bg-green-600",
                isActive && "bg-blue-600 animate-pulse",
                !isActive && !isDone && "bg-[#D6E2EA]"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : isActive ? (
                <div className="w-2 h-2 rounded-full bg-white" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-ink-400" />
              )}
            </div>
            <div>
              <p
                className={cn(
                  "text-sm font-medium transition-colors",
                  isDone ? "text-green-600" : isActive ? "text-navy-800" : "text-ink-400"
                )}
              >
                {step.label}
              </p>
              {(isActive || isDone) && (
                <p className="text-xs text-ink-400">{step.desc}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedId = searchParams.get("persona");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [signInStep, setSignInStep] = useState(0);
  const [signInDone, setSignInDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"persona" | "email">("persona");

  // Pre-select persona from URL param
  useEffect(() => {
    if (preSelectedId) {
      const found = PERSONAS.find((p) => p.id === preSelectedId);
      if (found) setSelectedPersona(found);
    }
  }, [preSelectedId]);

  async function handlePersonaLogin(persona: Persona) {
    setSelectedPersona(persona);
    setError(null);
    setLoading(true);
    setSignInStep(0);

    try {
      // Animate through steps
      for (let i = 0; i < SIGN_IN_STEPS.length; i++) {
        setSignInStep(i);
        await new Promise((res) => setTimeout(res, 300));
      }
      setSignInDone(true);
      await new Promise((res) => setTimeout(res, 400));

      // Call persona login API
      const res = await fetch("/api/auth/persona-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoading(false);
      setSignInStep(0);
      setSignInDone(false);
      setSelectedPersona(null);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSignInStep(0);

    try {
      for (let i = 0; i < SIGN_IN_STEPS.length; i++) {
        setSignInStep(i);
        await new Promise((res) => setTimeout(res, 350));
      }
      setSignInDone(true);
      await new Promise((res) => setTimeout(res, 400));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Invalid credentials");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
      setSignInStep(0);
      setSignInDone(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #0D87B8 1px, transparent 0)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">BEL TrustGrid</h1>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Blockchain-based secure platform for identity, access control,
              and digital asset management.
            </p>

            {/* Trust bullets */}
            <div className="space-y-3 text-left">
              {[
                "Every action leaves cryptographic proof",
                "Role alone never grants access",
                "All blockchain activity publicly verifiable",
                "Privacy-by-design — no PII on-chain",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white/70">{item}</span>
                </div>
              ))}
            </div>

            {/* Explorer link */}
            <div className="mt-8 p-3 rounded-lg bg-white/5 border border-white/8 text-left">
              <p className="text-xs text-white/40 mb-1">Deployed on</p>
              <p className="text-xs font-mono text-blue-400">Polygon Amoy Testnet</p>
              <p className="text-xs text-white/40 mt-0.5">
                Chain ID: 80002 · All txs publicly verifiable
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white">BEL TrustGrid</span>
          </div>

          <div className="bg-white rounded-lg shadow-card p-6">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-navy-800">Sign in to your workspace</h2>
              <p className="text-sm text-ink-600 mt-1">
                Demo password:{" "}
                <code className="font-mono text-xs bg-sky-50 px-1.5 py-0.5 rounded border border-[#D6E2EA]">
                  Demo@TrustGrid2026!
                </code>
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-md border border-[#D6E2EA] p-0.5 mb-5 bg-sky-50">
              {(["persona", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 py-1.5 text-sm font-medium rounded transition-all",
                    mode === m
                      ? "bg-white text-navy-800 shadow-soft"
                      : "text-ink-400 hover:text-ink-600"
                  )}
                >
                  {m === "persona" ? "Quick Demo Login" : "Email & Password"}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 mb-4"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign-in animation overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-4"
                >
                  <p className="text-sm font-semibold text-navy-800 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    {selectedPersona
                      ? `Signing in as ${selectedPersona.name}…`
                      : "Authenticating…"}
                  </p>
                  <SignInAnimation currentStep={signInStep} done={signInDone} />
                </motion.div>
              )}
            </AnimatePresence>

            {!loading && mode === "persona" && (
              <div className="space-y-2">
                <p className="text-xs text-ink-400 mb-3">Select a persona to explore:</p>
                {FEATURED_PERSONAS.slice(0, 6).map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => handlePersonaLogin(persona)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-md border border-[#D6E2EA]",
                      "hover:border-blue-600/40 hover:bg-sky-50 transition-all group text-left"
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 w-8 h-8 rounded flex items-center justify-center",
                        "text-white text-xs font-bold",
                        persona.color
                      )}
                    >
                      {persona.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{persona.name}</p>
                      <p className="text-xs text-ink-400 truncate">{persona.role}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-blue-600 transition-colors shrink-0" />
                  </button>
                ))}

                <Link
                  href="#try-demo"
                  className="block text-center text-xs text-blue-600 hover:underline mt-2 pt-2 border-t border-[#D6E2EA]"
                >
                  See all 36 demo personas →
                </Link>
              </div>
            )}

            {!loading && mode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-ink-600 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@bel.example.com"
                    className="w-full px-3 py-2 border border-[#D6E2EA] rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-ink-600 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-[#D6E2EA] rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-800 hover:bg-navy-800/90 text-white font-semibold rounded-md transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Sign in
                </button>
              </form>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-white/30 mt-4">
            SIH 2026 prototype · fictional data · not an official BEL product
          </p>
        </motion.div>
      </div>
    </div>
  );
}
