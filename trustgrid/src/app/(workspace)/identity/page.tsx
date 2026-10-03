"use client";

import { useState } from "react";
import {
  Fingerprint, ShieldCheck, Key, Copy, CheckCircle2,
  FileCode2, ShieldAlert, Cpu, Award, RefreshCw, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  TxChip, Button, inputCls
} from "@/components/app/ui";
import { actions, useTG } from "@/lib/store";
import { addressFor, didFor } from "@/lib/demo-data";
import { clearanceOf, CLEARANCE_LABEL, roleGroup, ROLE_GROUP_LABEL } from "@/lib/policy";
import { truncateHash } from "@/lib/utils";

export default function IdentityPage() {
  const { persona, openXRay } = useApp();
  const state = useTG((s) => s);
  const didRecord = useTG((s) => s.dids[persona.id]);
  const hasDid = didRecord?.status === "active";
  const cl = clearanceOf(persona);
  const group = roleGroup(persona);

  const [activeTab, setActiveTab] = useState<"card" | "w3c" | "credentials">("card");

  const myDid = didFor(persona.id);
  const myAddress = addressFor(persona.id);

  const handleCreateDid = () => {
    try {
      const txId = actions.createDid(persona.id);
      toast.success("DID registered on Polygon Amoy IdentityRegistry!");
    } catch (err: any) {
      toast.error(err.message || "Failed to register DID");
    }
  };

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`Copied ${label} to clipboard`);
  };

  // Standard W3C DID Document representation
  const w3cDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    id: myDid,
    controller: myAddress,
    verificationMethod: [
      {
        id: `${myDid}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: myDid,
        publicKeyHex: myAddress.slice(2).padStart(64, "0"),
      },
    ],
    authentication: [`${myDid}#key-1`],
    assertionMethod: [`${myDid}#key-1`],
    service: [
      {
        id: `${myDid}#trustgrid-access`,
        type: "BELTrustGridIdentityService",
        serviceEndpoint: "https://trustgrid.bel.co.in/identity/v2",
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decentralized Identity (W3C DID)"
        title="My Cryptographic Identity & Credentials"
        subtitle="Your tamper-proof digital passport on the Polygon Amoy blockchain. Replaces fragile centralized user tables."
        actions={
          !hasDid && (
            <Button onClick={handleCreateDid}>
              <Fingerprint className="w-4 h-4" /> Register DID on Chain
            </Button>
          )
        }
      />

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="DID Status"
          value={hasDid ? "Active" : didRecord?.status ?? "Not Registered"}
          hint={hasDid ? "Anchored in Smart Contract" : "Requires Initial Anchor"}
          icon={<Fingerprint className="w-5 h-5 text-blue-600" />}
          tone={hasDid ? "green" : "amber"}
        />
        <Stat
          label="Clearance Credential"
          value={CLEARANCE_LABEL[cl]}
          hint={`Role: ${ROLE_GROUP_LABEL[group]}`}
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone="blue"
        />
        <Stat
          label="Controller Address"
          value={truncateHash(myAddress)}
          hint="Ethereum EOA"
          icon={<Key className="w-5 h-5 text-navy-800" />}
          tone="navy"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("card")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "card"
              ? "border-navy-800 text-navy-800"
              : "border-transparent text-ink-400 hover:text-ink-600"
          }`}
        >
          <Fingerprint className="w-4 h-4" /> Identity Card
        </button>
        <button
          onClick={() => setActiveTab("credentials")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "credentials"
              ? "border-navy-800 text-navy-800"
              : "border-transparent text-ink-400 hover:text-ink-600"
          }`}
        >
          <Award className="w-4 h-4" /> Verifiable Credentials
        </button>
        <button
          onClick={() => setActiveTab("w3c")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "w3c"
              ? "border-navy-800 text-navy-800"
              : "border-transparent text-ink-400 hover:text-ink-600"
          }`}
        >
          <FileCode2 className="w-4 h-4" /> W3C DID Document
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "card" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Digital ID Badge */}
          <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/10 pointer-events-none rounded-l-full blur-2xl" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-saffron-400 font-bold">
                  Bharat Electronics Limited · TrustGrid 2.0
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{persona.name}</h2>
                <p className="text-xs text-white/70">{persona.role} · {persona.department}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-600/30 flex items-center justify-center font-bold text-lg text-white border border-blue-400/30">
                {persona.avatar}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-3 relative z-10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Decentralized Identifier (DID)</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-xs font-mono text-saffron-300 break-all">{myDid}</code>
                  <button onClick={() => copy(myDid, "DID")} className="text-white/60 hover:text-white shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Controller EOA Address</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="text-xs font-mono text-white/80">{truncateHash(myAddress)}</code>
                    <button onClick={() => copy(myAddress, "Address")} className="text-white/60 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Security Clearance Tier</p>
                  <p className="text-xs font-bold text-green-400 mt-0.5">{CLEARANCE_LABEL[cl]}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
              <span>Polygon Amoy Network · IdentityRegistry.sol</span>
              {didRecord?.txId && <TxChip txId={didRecord.txId} />}
            </div>
          </Card>

          {/* Quick Security Checks */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" /> Cryptographic Integrity
            </h3>
            <ul className="space-y-3 text-xs text-ink-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>Private keys stored in device secure enclave or hardware wallet.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>Identity revocation requires multi-sig governance approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>Zero passwords to phish or leak via central database attacks.</span>
              </li>
            </ul>

            {!hasDid && (
              <Button className="w-full" onClick={handleCreateDid}>
                Anchor Identity on Chain
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* Verifiable Credentials Tab */}
      {activeTab === "credentials" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "MoD Security Clearance Credential",
              issuer: "did:bel:amoy:0x71C...DefenseVettingAgency",
              type: "SecurityClearanceCredential",
              level: CLEARANCE_LABEL[cl],
              status: "Valid & Verified",
            },
            {
              title: "BEL Defence Engineering Appointment",
              issuer: "did:bel:amoy:0x000...BharatElectronicsAuthority",
              type: "OrganizationalRoleCredential",
              level: `${persona.role} (${persona.department})`,
              status: "Active Status",
            },
            {
              title: "Cryptographic Multi-Factor Hardware Token",
              issuer: "did:bel:amoy:0x93A...CISOEnclave",
              type: "HardwareAuthenticatorCredential",
              level: "FIPS 140-3 Level 3",
              status: "Hardware Anchored",
            },
          ].map((c) => (
            <Card key={c.title} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-saffron-500" />
                  {c.title}
                </span>
                <Badge className="bg-green-50 text-green-700 border-green-200">{c.status}</Badge>
              </div>
              <p className="text-xs text-ink-600"><strong>Level / Value:</strong> {c.level}</p>
              <p className="text-[11px] text-ink-400 font-mono">Issuer: {c.issuer}</p>
            </Card>
          ))}
        </div>
      )}

      {/* W3C Document Tab */}
      {activeTab === "w3c" && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              W3C Decentralized Identifier Specification (JSON-LD)
            </h3>
            <button
              onClick={() => copy(JSON.stringify(w3cDocument, null, 2), "W3C JSON")}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy JSON
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-navy-950 text-blue-400 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
            {JSON.stringify(w3cDocument, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
