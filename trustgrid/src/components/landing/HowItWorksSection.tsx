"use client";

import { motion } from "framer-motion";
import {
  Fingerprint,
  Key,
  Package,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    icon: Fingerprint,
    label: "Identity",
    heading: "Cryptographic identity for everyone",
    body: "Every user gets a Decentralised Identity (DID) — a blockchain-anchored credential instead of a username and password. Your DID is registered on-chain and can be verified by anyone, anywhere.",
    why: "No central database to breach.",
    color: "from-blue-600/20 to-blue-600/5",
    iconColor: "text-blue-600",
  },
  {
    icon: Key,
    label: "Access",
    heading: "Smart contracts decide access",
    body: "Every access request goes through a smart contract. Approvals, rejections, and expirations are recorded on the blockchain — not in a database an admin can quietly edit. Two-person approval for classified resources.",
    why: "No admin can silently grant themselves access.",
    color: "from-saffron-500/20 to-saffron-500/5",
    iconColor: "text-saffron-500",
  },
  {
    icon: Package,
    label: "Assets",
    heading: "Assets as tamper-proof tokens",
    body: "Equipment, schematics, and digital records are represented as NFTs. Ownership transfers, custody history, and classifications are permanently recorded — creating an unbreakable provenance trail.",
    why: "Every transfer leaves cryptographic proof.",
    color: "from-green-600/20 to-green-600/5",
    iconColor: "text-green-600",
  },
  {
    icon: CheckCircle2,
    label: "Proof",
    heading: "Verify everything yourself",
    body: "Every action links to a real blockchain transaction. Click any hash to see it on Polygonscan. Hash a document yourself and compare it to the on-chain anchor — in your browser, no tools needed.",
    why: "Trust is mathematical, not administrative.",
    color: "from-navy-800/15 to-navy-800/5",
    iconColor: "text-navy-800",
  },
];

const stagger = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  },
};

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-4 bg-transparent relative"
      aria-labelledby="how-heading"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-800/8 text-navy-800 text-xs font-semibold mb-4 border border-navy-800/10">
            How it works in 60 seconds
          </span>
          <h2
            id="how-heading"
            className="text-2xl font-bold text-navy-800 mb-3"
          >
            Identity → Access → Assets → Proof
          </h2>
          <p className="text-ink-600 max-w-xl mx-auto text-sm leading-relaxed">
            Four building blocks that together replace fragmented, centralised
            systems with a single tamper-evident platform.
          </p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                variants={stagger.item}
                className={`relative rounded-lg bg-gradient-to-b ${step.color} p-6 border border-[#D6E2EA]`}
              >
                {/* Step number */}
                <div className="absolute top-4 right-4 text-xs font-mono text-ink-400">
                  0{i + 1}
                </div>

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-md bg-white flex items-center justify-center mb-4 shadow-soft ${step.iconColor}`}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label */}
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-1.5">
                  {step.label}
                </p>

                {/* Heading */}
                <h3 className="text-base font-bold text-navy-800 mb-2 leading-snug">
                  {step.heading}
                </h3>

                {/* Body */}
                <p className="text-sm text-ink-600 leading-relaxed mb-4">
                  {step.body}
                </p>

                {/* Why blockchain */}
                <div className="mt-auto pt-3 border-t border-[#D6E2EA]">
                  <p className="text-xs text-ink-600 flex items-start gap-1.5">
                    <span className="font-semibold text-navy-800 shrink-0">
                      Why blockchain?
                    </span>
                    {step.why}
                  </p>
                </div>

                {/* Arrow connector (not last) */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white rounded-full border border-[#D6E2EA] items-center justify-center"
                    aria-hidden="true"
                  >
                    <ArrowRight className="w-3 h-3 text-ink-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
