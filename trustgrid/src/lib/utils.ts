import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate an Ethereum address or tx hash for display: 0x3fA2…9c1B */
export function truncateHash(hash: string, front = 6, back = 4): string {
  if (!hash) return "";
  if (hash.length <= front + back + 2) return hash;
  return `${hash.slice(0, front)}…${hash.slice(-back)}`;
}

/** Format a date as a relative label (e.g., "2 min ago") */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Build the Polygonscan Amoy URL for a tx hash */
export function explorerTxUrl(txHash: string): string {
  const base =
    process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ??
    "https://amoy.polygonscan.com";
  return `${base}/tx/${txHash}`;
}

/** Build the Polygonscan Amoy URL for an address */
export function explorerAddressUrl(address: string): string {
  const base =
    process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ??
    "https://amoy.polygonscan.com";
  return `${base}/address/${address}`;
}

/** Classification label and colour */
export const CLASSIFICATION_CONFIG = {
  open: { label: "Open", color: "text-green-600 bg-green-50 border-green-200" },
  restricted: {
    label: "Restricted",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  confidential: {
    label: "Confidential",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  secret_demo: {
    label: "Secret (Demo)",
    color: "text-red-600 bg-red-50 border-red-200",
  },
} as const;

/** Chain status label and colour */
export const CHAIN_STATUS_CONFIG = {
  none: { label: "Off-chain", color: "text-ink-400" },
  queued: { label: "Queued", color: "text-amber-600" },
  submitted: { label: "Submitted", color: "text-blue-600" },
  confirmed: { label: "Confirmed", color: "text-green-600" },
  failed: { label: "Failed", color: "text-red-600" },
} as const;

/** Access level labels */
export const ACCESS_LEVEL_CONFIG = {
  1: { label: "L1 — See metadata", short: "L1" },
  2: { label: "L2 — View", short: "L2" },
  3: { label: "L3 — Download", short: "L3" },
  4: { label: "L4 — Edit/Upload", short: "L4" },
  5: { label: "L5 — Approve/Delegate", short: "L5" },
} as const;
