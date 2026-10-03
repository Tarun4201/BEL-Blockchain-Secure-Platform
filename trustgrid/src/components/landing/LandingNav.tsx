"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, Search } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, label: "Zero-trust", desc: "Role alone never grants access" },
  { icon: Lock, label: "Tamper-evident", desc: "Every action leaves on-chain proof" },
  { icon: CheckCircle2, label: "Privacy-by-design", desc: "Only hashes go on-chain, never PII" },
  { icon: Search, label: "Explorer-verifiable", desc: "Click any hash to verify yourself" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-navy-950/95 backdrop-blur-sm border-b border-white/5">
      {/* Tricolour hairline */}
      <div className="tricolour-bar" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="BEL TrustGrid — home"
        >
          <div className="w-8 h-8 rounded-md bg-blue-600/20 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <span className="text-white font-bold tracking-tight text-base">
            BEL TrustGrid
          </span>
        </Link>

        {/* Nav links */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Main navigation"
        >
          {[
            { href: "#how-it-works", label: "How it works" },
            { href: "#try-demo", label: "Demo" },
            { href: "/verify", label: "Verify" },
            { href: "/architecture", label: "Architecture" },
            { href: "/hierarchy", label: "Org Chart" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-600/90 text-white text-sm font-semibold rounded-md transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Sign In
        </Link>
      </div>
    </header>
  );
}

export function TrustStrip() {
  return (
    <div className="bg-navy-950 py-5 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-xs text-white/50">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-navy-950 border-t border-white/5 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">BEL TrustGrid</span>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-white/40 text-center max-w-md">
          SIH 2026 prototype — fictional demonstration data — not an official BEL
          product. No real BEL, defence, or personal data is used.
        </p>

        {/* Right links */}
        <div className="flex items-center gap-4">
          <Link
            href="/verify"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Public Verify
          </Link>
          <Link
            href="#"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Accessibility
          </Link>
          <span className="text-xs text-white/30">
            Last updated {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
    </footer>
  );
}
