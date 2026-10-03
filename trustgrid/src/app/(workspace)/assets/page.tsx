"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package, Search, Filter, Plus, ArrowRightLeft, ShieldCheck,
  QrCode, History, X, CheckCircle2, AlertTriangle, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  ClassificationBadge, TxChip, Button, inputCls, EmptyState
} from "@/components/app/ui";
import { actions, useTG, AssetRec } from "@/lib/store";
import { PERSONAS, PERSONA_MAP } from "@/lib/personas";
import { Classification } from "@/lib/types";
import { canMintAssets } from "@/lib/policy";
import { timeAgo } from "@/lib/utils";

export default function AssetsPage() {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const assets = useTG((s) => s.assets);
  const projects = useTG((s) => s.projects);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [transferModalAsset, setTransferModalAsset] = useState<AssetRec | null>(null);
  const [recipientId, setRecipientId] = useState(PERSONAS[0]?.id ?? "");
  const [transferNote, setTransferNote] = useState("");
  const [mintOpen, setMintOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<AssetRec | null>(null);

  // Mint form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Radar Subsystem");
  const [classification, setClassification] = useState<Classification>("restricted");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [owner, setOwner] = useState(persona.id);

  const categories = ["ALL", "Radar Subsystem", "Electronic Warfare", "Sonar & Acoustic", "Tactical Comms", "Electro-Optics"];

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        String(a.tokenId).includes(search) ||
        a.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "ALL" || a.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [assets, search, filterCategory]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalAsset) return;
    if (!recipientId) {
      toast.error("Please select a recipient");
      return;
    }

    try {
      const txId = actions.transferAsset(persona.id, transferModalAsset.id, recipientId, transferNote);
      toast.success(`Custody of Token #${transferModalAsset.tokenId} transferred on-chain!`);
      setTransferModalAsset(null);
      setTransferNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer asset");
    }
  };

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Asset name required");
      return;
    }

    try {
      const txId = actions.mintAsset(persona.id, {
        name,
        category,
        classification,
        owner,
        projectId: projectId || null,
      });
      toast.success("Asset NFT minted on Polygon Amoy AssetNFT contract!");
      setMintOpen(false);
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to mint asset");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ERC-721 Hardware Provenance"
        title="Tactical Defence Assets & Subsystems"
        subtitle="Hardware subsystems and sensitive equipment tracked as non-fungible tokens. Every handover is an immutable on-chain state transition."
        actions={
          canMintAssets(persona) && (
            <Button onClick={() => setMintOpen(true)}>
              <Plus className="w-4 h-4" /> Mint Asset NFT
            </Button>
          )
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Tracked Tokenized Assets"
          value={assets.length}
          hint="AssetNFT.sol Contract"
          icon={<Package className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
        <Stat
          label="Assigned to Your Unit"
          value={assets.filter((a) => a.owner === persona.id).length}
          hint="Active Custody"
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="Custody Transfers Recorded"
          value={assets.reduce((acc, a) => acc + a.history.length, 0)}
          hint="On-Chain Provenance Log"
          icon={<History className="w-5 h-5 text-saffron-500" />}
          tone="amber"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name, Token ID (e.g. 1001), or category..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                filterCategory === c
                  ? "bg-navy-800 text-white border-navy-800"
                  : "bg-white text-ink-600 border-line hover:bg-sky-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((asset) => {
          const ownerUser = PERSONA_MAP.get(asset.owner);
          const project = projects.find((p) => p.id === asset.projectId);
          const isMine = asset.owner === persona.id;

          return (
            <Card key={asset.id} className="flex flex-col hover:border-blue-600/40 transition-all">
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-sky-50 px-2 py-0.5 rounded border border-blue-600/20">
                    Token #{asset.tokenId}
                  </span>
                  <ClassificationBadge value={asset.classification} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-navy-800">{asset.name}</h3>
                  <p className="text-xs text-ink-400 mt-0.5">{asset.category}</p>
                </div>

                <div className="space-y-1.5 text-xs text-ink-600 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Current Custodian:</span>
                    <strong className="text-navy-800">{ownerUser?.name ?? asset.owner}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Linked Programme:</span>
                    <span className="text-ink-900 font-medium">{project?.code ?? "General Depot"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-400">Status:</span>
                    <Badge className="bg-sky-50 text-blue-700 border-blue-600/20 capitalize">
                      {asset.status}
                    </Badge>
                  </div>
                </div>

                {/* Handover History timeline snippet */}
                <div className="pt-2 border-t border-line/60">
                  <p className="text-[11px] font-semibold text-ink-400 mb-1 flex items-center gap-1">
                    <History className="w-3 h-3 text-ink-400" /> Latest Milestone:
                  </p>
                  <p className="text-xs text-ink-700 bg-page p-2 rounded border border-line/60 flex items-center justify-between">
                    <span>{asset.history[0]?.action ?? "Minted"}</span>
                    {asset.history[0]?.txId && <TxChip txId={asset.history[0].txId} />}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-page/70 border-t border-line flex items-center justify-between">
                <button
                  onClick={() => setQrAsset(asset)}
                  className="text-xs text-ink-600 hover:text-navy-800 font-semibold flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Scan Tag
                </button>

                <Button
                  size="sm"
                  variant={isMine ? "primary" : "secondary"}
                  onClick={() => setTransferModalAsset(asset)}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Handover Custody
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Transfer Custody Modal */}
      {transferModalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Transfer Hardware Custody (NFT Handover)</h3>
              <button onClick={() => setTransferModalAsset(null)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-5 space-y-4">
              <div className="p-3 rounded bg-page border border-line text-xs space-y-1">
                <p><strong>Asset:</strong> {transferModalAsset.name} (Token #{transferModalAsset.tokenId})</p>
                <p><strong>Current Custodian:</strong> {PERSONA_MAP.get(transferModalAsset.owner)?.name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">New Custodian / Unit</label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className={inputCls}
                >
                  {PERSONAS.filter((p) => p.id !== transferModalAsset.owner).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role} · {p.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Milestone Handover Note</label>
                <input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Transferred to Naval Dockyard QC for Sea Acceptance Trials"
                  className={inputCls}
                />
              </div>

              <div className="p-3 rounded bg-sky-50 border border-blue-600/20 text-xs text-blue-700">
                <p className="font-semibold">Blockchain Guarantee:</p>
                <p className="mt-0.5 text-blue-600">
                  Calls <code>safeTransferFrom()</code> on Polygon Amoy. Recipient must hold an active DID and valid clearance.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="secondary" size="sm" onClick={() => setTransferModalAsset(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Sign Handover on Chain
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mint Modal */}
      {mintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-navy-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Mint New Tactical Asset NFT</h3>
              <button onClick={() => setMintOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleMint} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Subsystem / Asset Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Transceiver Module TRM-04-SN89"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Equipment Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="Radar Subsystem">Radar Subsystem</option>
                  <option value="Electronic Warfare">Electronic Warfare</option>
                  <option value="Sonar & Acoustic">Sonar & Acoustic</option>
                  <option value="Tactical Comms">Tactical Comms</option>
                  <option value="Electro-Optics">Electro-Optics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Initial Custodian</label>
                <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
                  {PERSONAS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Associated Programme</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                  <option value="">None / General Inventory</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="secondary" size="sm" onClick={() => setMintOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Mint Token on Amoy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Tag Simulation Modal */}
      {qrAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto text-blue-600">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-800">{qrAsset.name}</h3>
              <p className="text-xs text-ink-400">Token ID #{qrAsset.tokenId} · {qrAsset.category}</p>
            </div>

            {/* Simulated QR matrix visual */}
            <div className="w-48 h-48 mx-auto p-3 bg-white border-2 border-dashed border-line rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-6 gap-1.5 w-full h-full p-2 bg-navy-950 rounded">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${
                      (i * 7 + qrAsset.tokenId) % 3 === 0 ? "bg-saffron-400" : (i % 2 === 0 ? "bg-white" : "bg-transparent")
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-ink-600 font-mono">
              URN: bel:asset:amoy:{qrAsset.tokenId}
            </p>

            <Button size="sm" variant="secondary" className="w-full" onClick={() => setQrAsset(null)}>
              Close Physical Tag View
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
