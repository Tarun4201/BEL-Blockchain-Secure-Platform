"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, ExternalLink, Copy, Cpu, FileCode2, Boxes, Info } from "lucide-react";
import { toast } from "sonner";
import { useTG } from "@/lib/store";
import { PERSONA_MAP } from "@/lib/personas";
import { cn, explorerTxUrl, timeAgo } from "@/lib/utils";
import { useApp } from "./AppContext";
import { ChainStatusIcon } from "./ui";

const PIPELINE = [
  { key: "queued", label: "Queued", simple: "Your action was received", tech: "Row written to chain_txs outbox" },
  { key: "submitted", label: "Submitted", simple: "Sent to the blockchain network", tech: "Relayer signed & broadcast via eth_sendRawTransaction" },
  { key: "confirmed", label: "Confirmed", simple: "Permanently recorded", tech: "Included in a block; receipt status = 1" },
] as const;

const CONTRACT_EXPLAIN: Record<string, string> = {
  IdentityRegistry: "Keeps the list of verified identities (DIDs). Nobody can fake or quietly delete one.",
  AccessControl: "Records who asked for access, who approved it, and when it expires.",
  DocumentAnchor: "Stores a document's fingerprint (SHA-256) so any later change is detectable.",
  AssetNFT: "Represents each asset as a unique token so its ownership history can't be rewritten.",
  AuditAnchor: "Seals batches of audit-log hashes so the log itself can't be edited later.",
};

export function XRayDrawer() {
  const { xrayTxId, closeXRay, mode, setMode, chainLive } = useApp();
  const tx = useTG((s) => (xrayTxId ? s.txs.find((t) => t.id === xrayTxId) : undefined));
  const stageIndex = tx ? (tx.status === "confirmed" ? 2 : tx.status === "submitted" ? 1 : 0) : 0;

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copied to clipboard");
  };

  return (
    <AnimatePresence>
      {tx && (
        <>
          <motion.div
            key="xray-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950/40 z-[60]"
            onClick={closeXRay}
          />
          <motion.aside
            key="xray-panel"
            role="dialog" aria-modal="true" aria-labelledby="xray-title"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[61] shadow-card flex flex-col"
          >
            {/* Header */}
            <div className="bg-navy-950 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Blockchain X-Ray
                </p>
                <button onClick={closeXRay} className="p-1 rounded hover:bg-white/10" aria-label="Close X-Ray">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 id="xray-title" className="text-lg font-bold text-white mt-1">{tx.action}</h2>
              <p className="text-sm text-white/70 mt-0.5">{tx.story}</p>
              <div className="flex rounded-md bg-white/10 p-0.5 mt-3 w-fit">
                {(["simple", "technical"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn("px-3 py-1 text-xs font-semibold rounded capitalize", mode === m ? "bg-white text-navy-800" : "text-white/70")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Pipeline */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Journey</h3>
                <ol className="space-y-0">
                  {PIPELINE.map((p, i) => {
                    const done = i < stageIndex || (i === stageIndex && tx.status === "confirmed");
                    const active = i === stageIndex && tx.status !== "confirmed";
                    return (
                      <li key={p.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                            done ? "bg-green-600 border-green-600" : active ? "border-blue-600 bg-sky-50" : "border-line bg-white")}>
                            {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : active ? <ChainStatusIcon status="submitted" /> : null}
                          </div>
                          {i < PIPELINE.length - 1 && <div className={cn("w-0.5 h-8", done ? "bg-green-600" : "bg-line")} />}
                        </div>
                        <div className="pb-3">
                          <p className={cn("text-sm font-semibold", done ? "text-green-600" : active ? "text-blue-600" : "text-ink-400")}>{p.label}</p>
                          <p className="text-xs text-ink-600">{mode === "simple" ? p.simple : p.tech}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Who / when */}
              <section className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-md bg-page border border-line">
                  <p className="text-[11px] text-ink-400">Triggered by</p>
                  <p className="font-medium text-ink-900 truncate">{PERSONA_MAP.get(tx.actor)?.name ?? tx.actor}</p>
                </div>
                <div className="p-3 rounded-md bg-page border border-line">
                  <p className="text-[11px] text-ink-400">When</p>
                  <p className="font-medium text-ink-900">{timeAgo(tx.createdAt)}</p>
                </div>
              </section>

              {/* Contract */}
              <section className="p-3 rounded-md bg-sky-50 border border-blue-600/20">
                <p className="text-xs font-semibold text-navy-800 flex items-center gap-1.5"><FileCode2 className="w-3.5 h-3.5 text-blue-600" /> {tx.contract}</p>
                <p className="text-xs text-ink-600 mt-1">{CONTRACT_EXPLAIN[tx.contract]}</p>
              </section>

              {mode === "technical" ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Transaction details</h3>
                  <dl className="rounded-md border border-line divide-y divide-line text-xs">
                    {[
                      ["Method", `${tx.method}()`],
                      ["Tx hash", tx.txHash ?? "pending…"],
                      ["Block", tx.block?.toLocaleString("en-IN") ?? "—"],
                      ["Gas used", tx.gasUsed?.toLocaleString("en-IN") ?? "—"],
                      ["Network", "Polygon Amoy (chainId 80002)"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start gap-3 px-3 py-2">
                        <dt className="w-20 shrink-0 text-ink-400">{k}</dt>
                        <dd className="font-mono text-ink-900 break-all flex-1">{v}</dd>
                        {k === "Tx hash" && tx.txHash && (
                          <button onClick={() => copy(tx.txHash!)} aria-label="Copy tx hash" className="text-ink-400 hover:text-blue-600"><Copy className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    ))}
                  </dl>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 pt-2">Decoded arguments</h3>
                  <pre className="text-[11px] font-mono bg-navy-950 text-blue-400 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify(tx.args, null, 2)}
                  </pre>
                </section>
              ) : (
                <section className="p-3 rounded-md border border-line">
                  <p className="text-xs font-semibold text-navy-800 flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5 text-blue-600" /> Why this matters</p>
                  <p className="text-xs text-ink-600 mt-1">
                    Once confirmed, this record is copied across every node on the network. Not even a TrustGrid administrator can edit or delete it afterwards.
                  </p>
                </section>
              )}

              {/* Explorer */}
              {chainLive && tx.txHash ? (
                <a href={explorerTxUrl(tx.txHash)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-navy-800 text-white text-sm font-semibold hover:bg-navy-800/90">
                  View on Polygonscan <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="flex gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <Info className="w-4 h-4 shrink-0" />
                  <p><strong>Demo ledger.</strong> This transaction is simulated locally. Once a relayer key and contract addresses are configured, every chip links to a real Polygonscan transaction.</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
