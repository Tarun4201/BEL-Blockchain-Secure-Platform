"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield, ArrowRight, Play, ExternalLink, Fingerprint, Key, Package, Lock
} from "lucide-react";

// Tactical Radar Grid & Sovereign Ambient Background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Tactical Radar Coordinate Grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(13, 135, 184, 0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(13, 135, 184, 0.18) 1px, transparent 1px),
            radial-gradient(circle at 1px 1px, #0D87B8 1.5px, transparent 0)
          `,
          backgroundSize: "40px 40px, 40px 40px, 40px 40px",
        }}
      />

      {/* Concentric Tactical Radar Range Rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-blue-500/15 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[840px] h-[840px] rounded-full border border-blue-500/10 border-dashed pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1180px] h-[1180px] rounded-full border border-blue-500/8 pointer-events-none" />

      {/* Sovereign Dual Ambient Glows */}
      <div className="absolute top-10 left-1/6 w-[450px] h-[450px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute top-20 right-1/6 w-[420px] h-[420px] rounded-full bg-saffron-500/15 blur-[130px]" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/10 blur-[100px]" />

      {/* Vignette fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-transparent to-navy-950" />
    </div>
  );
}

// Animated chain visualization
function ChainVisualization() {
  const nodes = [
    { label: "Identity", icon: Fingerprint, color: "#0D87B8" },
    { label: "Access", icon: Key, color: "#E8891D" },
    { label: "Asset", icon: Package, color: "#168557" },
    { label: "Proof", icon: Lock, color: "#082F49" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mt-8" aria-hidden="true">
      {nodes.map((node, i) => {
        const Icon = node.icon;
        return (
          <div key={node.label} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: `${node.color}22`,
                  border: `1.5px solid ${node.color}40`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: node.color }} />
              </div>
              <span className="text-xs text-white/50 font-medium">{node.label}</span>
            </motion.div>
            {i < nodes.length - 1 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
                className="flex items-center -mt-5"
              >
                <div className="h-px w-8 bg-gradient-to-r from-white/20 to-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600/70" />
                <div className="h-px w-8 bg-gradient-to-r from-white/40 to-white/20" />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Stats bar
const STATS = [
  { value: "36+", label: "Demo personas" },
  { value: "13", label: "Active projects" },
  { value: "5", label: "Smart contracts" },
  { value: "100%", label: "Verifiable on-chain" },
];

function StatsBar() {
  return (
    <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
          className="text-center"
        >
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      className="relative min-h-[80vh] bg-navy-950 flex flex-col items-center justify-center px-4 py-20 text-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <GridBackground />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-600/25 text-blue-400 text-xs font-semibold mb-6"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
          </span>
          SIH 2026 · Problem Statement SIH26125 · Bharat Electronics Limited
        </motion.div>

        {/* Heading */}
        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-5"
        >
          Every action in BEL TrustGrid
          <br />
          <span className="text-blue-400">leaves proof you can verify yourself.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-base text-white/65 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          A blockchain-based secure platform combining{" "}
          <span className="text-white/90 font-medium">Decentralised Identity (DID)</span>,{" "}
          <span className="text-white/90 font-medium">smart-contract access control</span>, and{" "}
          <span className="text-white/90 font-medium">NFT-based digital asset management</span>.
          Built for defence-grade security. Verifiable by anyone.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="#try-demo"
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-600/90 text-white font-semibold rounded-lg transition-all hover:gap-3"
          >
            Try the Demo
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/architecture"
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            See how it works
          </Link>
          <Link
            href="/verify"
            className="flex items-center gap-2 px-4 py-3 text-white/60 hover:text-white text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Verify Portal
          </Link>
        </motion.div>

        {/* Chain visualization */}
        <ChainVisualization />

        {/* Stats */}
        <StatsBar />
      </div>
    </section>
  );
}
