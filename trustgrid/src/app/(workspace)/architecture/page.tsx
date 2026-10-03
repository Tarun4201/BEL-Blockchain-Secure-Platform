"use client";

import { useState } from "react";
import {
  Network, Cpu, ShieldCheck, Database, Layers,
  ExternalLink, Copy, CheckCircle2, Lock, Key, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  Button
} from "@/components/app/ui";
import { useApp } from "@/components/app/AppContext";
import { explorerAddressUrl, truncateHash } from "@/lib/utils";

export default function ArchitecturePage() {
  const { chainLive } = useApp();

  const contracts = [
    {
      name: "IdentityRegistry.sol",
      purpose: "Maintains W3C Decentralized Identifiers (DIDs), public verification keys, and clearance revocation statuses.",
      address: "0x1234567890123456789012345678901234567891",
      network: "Polygon Amoy (80002)",
    },
    {
      name: "AccessControl.sol",
      purpose: "Enforces continuous zero-trust permission checks and the automated Two-Person Multi-Signature Rule for classified assets.",
      address: "0x1234567890123456789012345678901234567892",
      network: "Polygon Amoy (80002)",
    },
    {
      name: "DocumentAnchor.sol",
      purpose: "Anchors SHA-256 cryptographic fingerprints of technical specifications and blueprints without storing raw classified content on-chain.",
      address: "0x1234567890123456789012345678901234567893",
      network: "Polygon Amoy (80002)",
    },
    {
      name: "AssetNFT.sol",
      purpose: "Tokenizes mission-critical defence hardware and avionics subsystems as ERC-721 tokens with permanent milestone custody logs.",
      address: "0x1234567890123456789012345678901234567894",
      network: "Polygon Amoy (80002)",
    },
    {
      name: "AuditAnchor.sol",
      purpose: "Periodically seals Merkle root digests of off-chain system audit logs, ensuring backward tamper detection.",
      address: "0x1234567890123456789012345678901234567895",
      network: "Polygon Amoy (80002)",
    },
  ];

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Address copied");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Blueprint & Security Model"
        title="BEL TrustGrid Technical Architecture"
        subtitle="How zero-trust access, gasless meta-transaction relayers, and Polygon Amoy smart contracts unify to protect defence records."
      />

      {/* Layer Stack Visual */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">
          Four-Layer Zero-Trust Cryptographic Stack
        </h2>

        {/* Layer 1: Client */}
        <Card className="p-5 border-l-4 border-l-blue-600 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-blue-600 bg-sky-50 px-2 py-0.5 rounded border border-blue-600/20">
              LAYER 1: Zero-Trust Presentation & Client
            </span>
            <Badge className="bg-sky-50 text-blue-700 border-blue-600/20">Next.js 15 · WebCrypto</Badge>
          </div>
          <h3 className="text-base font-bold text-navy-800">
            Client-Side Cryptographic Boundary & Watermarking
          </h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            All SHA-256 hashing is executed client-side inside the user's browser before transmission. Decrypted sensitive documents receive dynamic visual watermarks containing session DID and timestamp. Role alone never bypasses need-to-know checks.
          </p>
        </Card>

        {/* Layer 2: Relayer */}
        <Card className="p-5 border-l-4 border-l-saffron-500 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded border border-saffron-300">
              LAYER 2: Gasless Meta-Transaction Relayer
            </span>
            <Badge className="bg-saffron-50 text-saffron-800 border-saffron-300">EIP-712 · Outbox Pipeline</Badge>
          </div>
          <h3 className="text-base font-bold text-navy-800">
            Enterprise Gasless Transaction Outbox
          </h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Defence personnel do not manage gas tokens or cryptocurrency wallets. The server relayer signs and broadcasts transactions to Polygon Amoy through an asynchronous pipeline (Queued → Submitted → Confirmed), maintaining zero UX friction.
          </p>
        </Card>

        {/* Layer 3: Blockchain */}
        <Card className="p-5 border-l-4 border-l-green-600 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-300">
              LAYER 3: Polygon Amoy Smart Contract Trust Anchors
            </span>
            <Badge className="bg-green-50 text-green-700 border-green-200">Polygon Amoy (ChainId 80002)</Badge>
          </div>
          <h3 className="text-base font-bold text-navy-800">
            Immutable Multi-Contract Trust Anchors
          </h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Decentralized contracts enforce immutable rules: DID identity states, dual-approver multi-sig grants for Secret documents, hardware NFT custody handovers, and batch Merkle audit anchors.
          </p>
        </Card>

        {/* Layer 4: Storage */}
        <Card className="p-5 border-l-4 border-l-navy-800 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-navy-800 bg-page px-2 py-0.5 rounded border border-line">
              LAYER 4: Encrypted Off-Chain Storage
            </span>
            <Badge className="bg-page text-ink-700 border-line">IPFS · Encrypted Postgres</Badge>
          </div>
          <h3 className="text-base font-bold text-navy-800">
            Content-Addressed Storage & Redundancy
          </h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Raw classified files and confidential specifications are never stored directly on the public ledger. Files reside in AES-256 encrypted storage buckets or private IPFS clusters, referenced exclusively by their immutable content hash.
          </p>
        </Card>
      </div>

      {/* Smart Contracts Registry Table */}
      <Card>
        <CardHeader
          title="Smart Contracts Deployed on Polygon Amoy"
          action={
            <span className="text-xs text-ink-400">
              Network: <strong>Polygon Amoy Testnet</strong>
            </span>
          }
        />
        <div className="p-4 divide-y divide-line">
          {contracts.map((c) => (
            <div key={c.name} className="py-3.5 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-sm font-bold text-navy-800 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" /> {c.name}
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-page px-2 py-0.5 rounded border border-line text-ink-600">
                    {truncateHash(c.address, 8, 6)}
                  </code>
                  <button
                    onClick={() => copy(c.address)}
                    className="text-ink-400 hover:text-navy-800"
                    title="Copy address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {chainLive && (
                    <a
                      href={explorerAddressUrl(c.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-xs text-ink-600">{c.purpose}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
