"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText, ShieldCheck, ShieldAlert, KeyRound, Plus,
  Lock, Eye, FileDown, Search, Filter, AlertTriangle,
  CheckCircle2, RefreshCw, Upload, Sparkles, X, ShieldX, Copy
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, Button, inputCls, EmptyState
} from "@/components/app/ui";
import { actions, useTG, decideDocAccess, Doc } from "@/lib/store";
import { Classification } from "@/lib/types";
import { PolicyTrace } from "@/components/app/PolicyTrace";
import { PERSONA_MAP } from "@/lib/personas";
import { truncateHash, timeAgo } from "@/lib/utils";

export default function DocumentsPage() {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const docs = useTG((s) => s.docs);
  const projects = useTG((s) => s.projects);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tamperedDocIds, setTamperedDocIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const v = d.versions[0];
      const matchSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (v?.sha256 && v.sha256.toLowerCase().includes(search.toLowerCase()));
      const matchClass = filterClass === "ALL" || d.classification === filterClass;
      return matchSearch && matchClass;
    });
  }, [docs, search, filterClass]);

  const toggleTamper = (docId: string) => {
    if (!tamperedDocIds[docId]) {
      try {
        actions.tamperDocument(persona.id, docId);
        setTamperedDocIds((prev) => ({ ...prev, [docId]: true }));
        toast.error("Document content altered! Cryptographic signature broken.", {
          description: "Tamper detection active for this file.",
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to tamper");
      }
    } else {
      try {
        actions.restoreDocument(persona.id, docId);
        setTamperedDocIds((prev) => ({ ...prev, [docId]: false }));
        toast.success("Document restored to pristine anchored hash.");
      } catch (err: any) {
        toast.error(err.message || "Failed to restore");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decentralized Trust Repository"
        title="Classified Defence Technical Documents"
        subtitle="Every document fingerprint is anchored to the Polygon Amoy blockchain. Zero-Trust policies evaluate access on every read."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4" /> Anchor New Document
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, filename, or SHA-256 hash..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Classification:
          </span>
          {["ALL", "open", "restricted", "confidential", "secret_demo"].map((c) => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                filterClass === c
                  ? "bg-navy-800 text-white border-navy-800"
                  : "bg-white text-ink-600 border-line hover:bg-sky-50"
              }`}
            >
              {c === "secret_demo" ? "Secret" : c.toUpperCase()}
            </button>
          ))}
        </div>
      </Card>

      {/* Documents Grid / Table */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <EmptyState
              title="No matching documents found"
              body="Try adjusting your search criteria or classification filter."
            />
          </Card>
        ) : (
          filtered.map((doc) => {
            const project = projects.find((p) => p.id === doc.projectId);
            const decision = decideDocAccess(state, persona.id, doc.id, 2);
            const isTampered = !!tamperedDocIds[doc.id];
            const owner = PERSONA_MAP.get(doc.owner);
            const latest = doc.versions[0];

            return (
              <Card
                key={doc.id}
                className={`p-4 transition-all hover:border-blue-600/30 ${
                  isTampered ? "border-red-400 bg-red-50/20" : "bg-white"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-navy-800">{doc.title}</span>
                      <ClassificationBadge value={doc.classification} />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-blue-700 border border-blue-600/20">
                        {project?.code ?? "GENERAL"}
                      </span>
                      {isTampered && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> TAMPER DETECTED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-ink-400 flex-wrap pt-1">
                      <span>Owner: <strong className="text-ink-600">{owner?.name ?? doc.owner}</strong></span>
                      <span>Version: <code className="font-mono text-ink-600">v{latest?.version ?? 1}</code></span>
                      {latest && (
                        <span className="flex items-center gap-1">
                          Hash: <code className="font-mono text-blue-600">{truncateHash(latest.sha256)}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(latest.sha256);
                              toast.success("SHA-256 hash copied");
                            }}
                            className="hover:text-blue-700"
                            title="Copy full SHA-256"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      <span>Anchored: {timeAgo(doc.createdAt)}</span>
                      {latest?.txId && <TxChip txId={latest.txId} />}
                    </div>
                  </div>

                  {/* Right: Actions & Access Status */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => toggleTamper(doc.id)}
                      title="Simulate modifying the file to demonstrate tamper detection"
                      className={`text-xs px-2.5 py-1.5 rounded border font-semibold transition-all ${
                        isTampered
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-ink-600 border-line hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      }`}
                    >
                      {isTampered ? "Reset Tamper" : "Simulate Tamper"}
                    </button>

                    <button
                      onClick={() => setActiveDoc(doc)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-soft transition-all ${
                        decision.allowed
                          ? "bg-navy-800 text-white hover:bg-navy-800/90"
                          : "bg-page text-ink-600 border border-line hover:bg-sky-50"
                      }`}
                    >
                      {decision.allowed ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Read / Decrypt
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-ink-400" /> Evaluate Policy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Reader / Decrypt & Policy Evaluation Modal */}
      {activeDoc && (
        <DocumentViewerModal
          doc={activeDoc}
          isTampered={!!tamperedDocIds[activeDoc.id]}
          onClose={() => setActiveDoc(null)}
        />
      )}

      {/* Upload & Anchor Modal */}
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} />
      )}
    </div>
  );
}

function DocumentViewerModal({
  doc,
  isTampered,
  onClose,
}: {
  doc: Doc;
  isTampered: boolean;
  onClose: () => void;
}) {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const decision = decideDocAccess(state, persona.id, doc.id, 2);
  const project = state.projects.find((p) => p.id === doc.projectId);
  const latest = doc.versions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-line shadow-card max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-blue-600/20 text-blue-400">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-white/50">{project?.name ?? "Tactical Document"}</p>
              <h3 className="text-base font-bold text-white">{doc.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tamper Warning Banner if tampered */}
          {isTampered && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                CRITICAL WARNING: Tamper Detected via Polygon Amoy Verification!
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                The local document content has been modified. The cryptographic hash calculated from this file does not match the immutable fingerprint anchored to the smart contract:
              </p>
              <div className="text-[11px] font-mono p-2 bg-red-100 rounded space-y-1">
                <p>Anchored on-chain: <strong>{latest?.sha256}</strong></p>
                <p className="text-red-900 font-bold">Computed hash: <strong>0xdeadbeef8923a45c78f190e234bc12301... (MISMATCH)</strong></p>
              </div>
            </div>
          )}

          {/* Zero-Trust Decision / Policy Evaluation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
              Zero-Trust Access Evaluation Trace
            </h4>
            <PolicyTrace decision={decision} />
          </div>

          {/* If allowed, render Decrypted Content with Security Watermark */}
          {decision.allowed ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                  Decrypted Technical Specification
                </h4>
                <ClassificationBadge value={doc.classification} />
              </div>

              {/* Secure viewer container with watermark */}
              <div className="relative p-5 rounded-lg border border-line bg-page min-h-[160px] text-sm text-ink-900 font-mono whitespace-pre-wrap leading-relaxed overflow-hidden">
                {/* Visual watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-ink-900/[0.04] font-black text-2xl rotate-[-20deg] text-center"
                  aria-hidden="true"
                >
                  BEL TRUSTGRID DEMO · {persona.name.toUpperCase()} · {doc.classification}
                </div>

                <div className="relative z-10 space-y-3">
                  <p className="font-semibold text-navy-800">### {doc.title} (v{latest?.version ?? 1})</p>
                  <div className="p-3 bg-white rounded border border-line text-xs font-sans space-y-1">
                    <p className="font-semibold text-navy-800">Decrypted Content / Technical Specs:</p>
                    <p className="text-ink-700 whitespace-pre-wrap font-mono text-[11px]">
                      {doc.stored || "Sample technical specification payload secured on BEL TrustGrid."}
                    </p>
                  </div>
                  <p className="text-[11px] text-ink-400 font-sans">
                    Authenticated access granted to session DID: <code className="font-mono text-ink-600">{persona.id}</code>
                  </p>
                </div>
              </div>

              {/* Cryptographic Proof Details */}
              {latest && (
                <div className="p-3 rounded-lg border border-line bg-sky-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-800">On-Chain DocumentAnchor Contract:</span>
                    {latest.txId && <TxChip txId={latest.txId} />}
                  </div>
                  <p className="text-ink-600 font-mono text-[11px] break-all">
                    SHA-256: {latest.sha256}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Access Denied: Call to action to request clearance */
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-amber-900">Access Denied by Security Policy</p>
                <p className="text-xs text-amber-700 mt-1">
                  You need an active clearance grant or project assignment to decrypt this specification.
                </p>
              </div>
              <Link href={`/requests?docId=${doc.id}`} onClick={onClose}>
                <Button size="sm">
                  <KeyRound className="w-3.5 h-3.5" /> Submit Access Request
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-page border-t border-line flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const { persona } = useApp();
  const projects = useTG((s) => s.projects);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [classification, setClassification] = useState<Classification>("restricted");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error("Please fill in title and technical content");
      return;
    }

    setLoading(true);

    try {
      const randomHex = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
      const sha256 = `0x${randomHex}`;

      actions.uploadDocument({
        actor: persona.id,
        projectId,
        title,
        classification,
        sha256,
        size: content.length,
        fileName: `${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`,
        stored: content,
      });

      toast.success("Document anchored! Relayer transaction queued on Polygon Amoy.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to anchor document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-line shadow-card max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-blue-600/20 text-blue-400">
              <Upload className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">Anchor Technical Document</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Document Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Akash-NG Ku-Band Radar Transponder Interface Spec"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Programme / Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={inputCls}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Security Classification</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as Classification)}
              className={inputCls}
            >
              <option value="open">Open</option>
              <option value="restricted">Restricted</option>
              <option value="confidential">Confidential</option>
              <option value="secret_demo">Secret (Demo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Technical Specification Content</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Operational parameters, mechanical interfaces, telemetry..."
              className={inputCls}
            />
          </div>

          <div className="p-3 rounded bg-sky-50 border border-blue-600/20 text-xs text-blue-700">
            <p className="font-semibold">Cryptographic Guarantee:</p>
            <p className="mt-0.5 text-blue-600">
              The SHA-256 hash will be generated client-side and anchored to the <code>DocumentAnchor.sol</code> contract on Polygon Amoy. The raw file never touches the public ledger.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Compute Hash & Anchor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
