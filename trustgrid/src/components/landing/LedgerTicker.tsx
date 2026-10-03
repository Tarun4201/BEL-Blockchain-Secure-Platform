"use client";

import { motion } from "framer-motion";
import { Shield, Lock, ExternalLink } from "lucide-react";
import { truncateHash } from "@/lib/utils";

interface LiveTx {
  hash: string;
  action: string;
  actor: string;
  timeAgo: string;
  status: "confirmed";
}

// Demo ticker data (real structure, fictional data)
const TICKER_ITEMS: LiveTx[] = [
  { hash: "0x3fA2b891c4D7e5F09a1B2C3D4E5F6789012abcd", action: "DID Registered", actor: "Aarav J.", timeAgo: "2s ago", status: "confirmed" },
  { hash: "0x9c1B2a3D4e5F6789AbCdEf0123456789abcdef01", action: "Access Granted", actor: "Kavya R.", timeAgo: "14s ago", status: "confirmed" },
  { hash: "0x7F8e9A0b1C2d3E4f5A6B7C8D9E0F1a2B3c4D5e6F", action: "Document Anchored", actor: "Preethi N.", timeAgo: "31s ago", status: "confirmed" },
  { hash: "0x1a2B3c4D5e6F7890AbCdEf0123456789abcde001", action: "NFT Minted", actor: "Rohan S.", timeAgo: "48s ago", status: "confirmed" },
  { hash: "0x5C6D7E8F9A0B1c2D3e4F5a6B7C8D9e0F1a2B3C4", action: "Access Revoked", actor: "Deepa I.", timeAgo: "1m ago", status: "confirmed" },
  { hash: "0x2D3e4F5a6B7C8D9e0F1a2B3C4d5E6f7A8B9c0D1", action: "Credential Issued", actor: "Lakshmi K.", timeAgo: "2m ago", status: "confirmed" },
  { hash: "0x6B7C8D9e0F1a2B3C4d5E6f7A8B9c0D1E2f3A4B5", action: "DID Registered", actor: "Vijay S.", timeAgo: "3m ago", status: "confirmed" },
  { hash: "0x4E5f6A7B8C9D0e1F2a3B4C5D6E7f8A9B0c1D2E3", action: "Hash Verified ✓", actor: "Mohan D.", timeAgo: "4m ago", status: "confirmed" },
];

// Doubled for seamless loop
const TICKER_DOUBLE = [...TICKER_ITEMS, ...TICKER_ITEMS];

export function LedgerTicker() {
  return (
    <div className="w-full overflow-hidden bg-navy-800 border-t border-b border-white/5 py-3">
      {/* Label */}
      <div className="flex items-center gap-2 px-4 mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Live Ledger — Polygon Amoy Testnet
        </span>
      </div>
      {/* Ticker */}
      <div
        className="ledger-ticker"
        role="marquee"
        aria-label="Live blockchain transactions"
        aria-live="off"
      >
        {TICKER_DOUBLE.map((tx, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <span className="text-xs text-white/90 font-medium">{tx.action}</span>
            <span className="text-xs text-white/50">by {tx.actor}</span>
            <span
              className="hash-chip text-xs shrink-0"
              title={`Full hash: ${tx.hash}`}
            >
              {truncateHash(tx.hash)}
            </span>
            <Lock className="w-3 h-3 text-green-400 shrink-0" />
            <span className="text-white/20 ml-4">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A single ticker item with an explorer link */
export function TickerItem({ tx }: { tx: LiveTx }) {
  const explorerBase =
    process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ?? "https://amoy.polygonscan.com";
  return (
    <a
      href={`${explorerBase}/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 group shrink-0"
      aria-label={`${tx.action} by ${tx.actor} — view on explorer`}
    >
      <span className="text-xs text-white/80 group-hover:text-white transition-colors">
        {tx.action}
      </span>
      <span className="hash-chip">{truncateHash(tx.hash)}</span>
      <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
    </a>
  );
}
