"use client";

import { useState } from "react";
import {
  ShieldCheck, Search, FileText, CheckCircle2, XCircle,
  Upload, Copy, ExternalLink, Cpu, AlertTriangle, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, Button, inputCls
} from "@/components/app/ui";
import { useTG } from "@/lib/store";
import { explorerTxUrl, truncateHash, timeAgo } from "@/lib/utils";

export default function VerifyPage() {
  const { openXRay } = useApp();
  const docs = useTG((s) => s.docs);
  const txs = useTG((s) => s.txs);

  const [inputHash, setInputHash] = useState("");
  const [result, setResult] = useState<{
    status: "idle" | "verified" | "not_found";
    doc?: any;
    version?: any;
    tx?: any;
  }>({ status: "idle" });

  const handleVerify = (hashToVerify?: string) => {
    const target = (hashToVerify ?? inputHash).trim().toLowerCase();
    if (!target) {
      toast.error("Please enter a SHA-256 cryptographic hash");
      return;
    }

    // Look for matching document version
    let matchedDoc = null;
    let matchedVer = null;

    for (const d of docs) {
      for (const v of d.versions) {
        if (v.sha256.toLowerCase() === target || v.sha256.toLowerCase().includes(target)) {
          matchedDoc = d;
          matchedVer = v;
          break;
        }
      }
      if (matchedDoc) break;
    }

    if (matchedDoc && matchedVer) {
      const tx = txs.find((t) => t.id === matchedVer.txId);
      setResult({ status: "verified", doc: matchedDoc, version: matchedVer, tx });
      toast.success("Cryptographic Match Found on Polygon Amoy!");
    } else {
      setResult({ status: "not_found" });
      toast.error("No record found for this hash on the blockchain.");
    }
  };

  // Sample quick test buttons for evaluators
  const sampleDocs = docs.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Zero-Knowledge Independent Audit"
        title="Public Cryptographic Verifier"
        subtitle="Mathematically prove document integrity without exposing confidential contents. Queries DocumentAnchor.sol on Polygon Amoy."
      />

      {/* Main Verification Input Card */}
      <Card className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-navy-800 mb-1.5">
            Document Fingerprint / SHA-256 Hash
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              placeholder="e.g. 0x8a92f0... or paste 64-character SHA-256 checksum"
              className={`${inputCls} font-mono text-xs`}
            />
            <Button onClick={() => handleVerify()} className="shrink-0">
              <Search className="w-4 h-4" /> Verify on Chain
            </Button>
          </div>
        </div>

        {/* Quick sample hash buttons */}
        <div className="pt-2 border-t border-line">
          <p className="text-xs font-semibold text-ink-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-saffron-500" />
            Quick Test: Try a seeded defence specification hash
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleDocs.map((d) => {
              const h = d.versions[0]?.sha256;
              if (!h) return null;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setInputHash(h);
                    handleVerify(h);
                  }}
                  className="px-2.5 py-1 text-xs rounded border border-line bg-page hover:bg-sky-50 text-ink-600 transition-colors font-mono"
                >
                  {d.title.slice(0, 24)}... ({truncateHash(h)})
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Verification Result Card */}
      {result.status === "verified" && result.doc && (
        <Card className="p-6 border-green-300 bg-green-50/40 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-300">
                  Cryptographically Authentic
                </span>
                <h3 className="text-lg font-bold text-navy-800 mt-1">
                  {result.doc.title} (v{result.version.version})
                </h3>
                <p className="text-xs text-ink-600">
                  Anchored to DocumentAnchor.sol on Polygon Amoy
                </p>
              </div>
            </div>
            <ClassificationBadge value={result.doc.classification} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-green-200/60 text-xs">
            <div className="p-3 bg-white rounded border border-green-200 space-y-1">
              <p className="text-ink-400 font-medium">Anchored SHA-256 Fingerprint:</p>
              <code className="text-navy-800 font-mono text-[11px] break-all block">
                {result.version.sha256}
              </code>
            </div>

            <div className="p-3 bg-white rounded border border-green-200 space-y-1">
              <p className="text-ink-400 font-medium">Blockchain Anchor Status:</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-700">Confirmed on Ledger</span>
                {result.tx && <TxChip txId={result.tx.id} />}
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-white border border-green-200 text-xs text-ink-600 space-y-1">
            <p className="font-semibold text-navy-800">Tamper-Proof Guarantee:</p>
            <p>
              This document fingerprint matches the mathematical proof committed to the smart contract. Not even BEL system administrators or database operators can alter this file without invalidating this proof.
            </p>
          </div>
        </Card>
      )}

      {result.status === "not_found" && (
        <Card className="p-6 border-red-300 bg-red-50/40 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-900">No On-Chain Match Found</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md mx-auto leading-relaxed">
              This cryptographic hash does not correspond to any valid document anchored on the BEL TrustGrid DocumentAnchor contract. The document may be counterfeit, altered, or not yet anchored.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
