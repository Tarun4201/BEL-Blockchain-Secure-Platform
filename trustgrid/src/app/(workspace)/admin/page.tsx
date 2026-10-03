"use client";

import { useState } from "react";
import {
  Settings2, ShieldAlert, ShieldCheck, UserX, UserCheck,
  RefreshCw, Cpu, AlertTriangle, Key, Search, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app/AppContext";
import {
  PageHeader, Card, CardHeader, Stat, Badge,
  TxChip, Button, inputCls
} from "@/components/app/ui";
import { actions, useTG, DidStatus } from "@/lib/store";
import { PERSONAS, PERSONA_MAP } from "@/lib/personas";
import { truncateHash, timeAgo } from "@/lib/utils";

export default function AdminConsolePage() {
  const { persona } = useApp();
  const state = useTG((s) => s);
  const dids = useTG((s) => s.dids);
  const txs = useTG((s) => s.txs);
  const block = useTG((s) => s.block);

  const [search, setSearch] = useState("");
  const [lockdown, setLockdown] = useState(false);
  const [statusModalPersona, setStatusModalPersona] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<DidStatus>("suspended");
  const [reason, setReason] = useState("");

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalPersona) return;
    if (reason.trim().length < 5) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      actions.setDidStatus(persona.id, statusModalPersona, newStatus, reason);
      toast.success(`DID status updated to ${newStatus} on Polygon Amoy IdentityRegistry!`);
      setStatusModalPersona(null);
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update DID status");
    }
  };

  const handleReset = () => {
    if (confirm("Reset demo store to initial seed state?")) {
      actions.reset();
      toast.success("State reset to initial seed");
    }
  };

  const filteredPersonas = PERSONAS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CISO & Security Governance"
        title="TrustGrid Administration & Smart Contract Console"
        subtitle="Manage DID lifecycle, enforce security revocation, inspect Polygon Amoy block heights, and manage cryptographic state."
        actions={
          <Button variant="danger" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset Ledger to Pristine
          </Button>
        }
      />

      {/* Emergency Lockdown Banner */}
      <Card className="p-4 border-amber-300 bg-amber-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Emergency Zero-Trust Security Lockdown
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Instantly pause non-emergency document decryptions across all BEL strategic business units.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={lockdown ? "danger" : "secondary"}
          onClick={() => {
            const next = !lockdown;
            setLockdown(next);
            if (next) {
              toast.error("EMERGENCY LOCKDOWN ACTIVATED: All access grants paused on-chain.");
            } else {
              toast.success("Lockdown released. Normal zero-trust operation resumed.");
            }
          }}
        >
          {lockdown ? "Deactivate Lockdown" : "Initiate Unit Lockdown"}
        </Button>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Amoy Block Height"
          value={`#${block.toLocaleString("en-IN")}`}
          hint="ChainId: 80002"
          icon={<Cpu className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
        <Stat
          label="Total Registered DIDs"
          value={Object.keys(dids).length}
          hint="IdentityRegistry.sol"
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          tone="green"
        />
        <Stat
          label="Confirmed Relayer Txs"
          value={txs.filter((t) => t.status === "confirmed").length}
          hint="State Machine Receipts"
          icon={<Key className="w-5 h-5 text-navy-800" />}
          tone="navy"
        />
      </div>

      {/* Identity & DID Management Table */}
      <Card>
        <CardHeader
          title="Personnel Decentralized Identity (DID) Lifecycle Governance"
          action={
            <div className="w-64">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search personnel..."
                className={inputCls}
              />
            </div>
          }
        />
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase tracking-wider text-ink-400 border-b border-line bg-page/50">
              <tr>
                <th className="py-2.5 px-3">Personnel</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">DID String</th>
                <th className="py-2.5 px-3">On-Chain Status</th>
                <th className="py-2.5 px-3 text-right">Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredPersonas.slice(0, 12).map((p) => {
                const did = dids[p.id];
                const status = did?.status ?? "unregistered";

                return (
                  <tr key={p.id} className="hover:bg-page/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center ${p.color}`}>
                          {p.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-navy-800">{p.name}</p>
                          <p className="text-[10px] text-ink-400">{p.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-ink-600 font-medium">{p.department}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-blue-600">
                      {did?.did ? truncateHash(did.did, 12, 6) : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        className={
                          status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : status === "suspended"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : status === "revoked"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-page text-ink-400 border-line"
                        }
                      >
                        {status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {did ? (
                        <button
                          onClick={() => {
                            setStatusModalPersona(p.id);
                            setNewStatus(status === "active" ? "suspended" : "active");
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Modify State
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            actions.createDid(p.id);
                            toast.success(`DID registered for ${p.name}`);
                          }}
                          className="text-xs font-semibold text-green-600 hover:underline"
                        >
                          Register DID
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modify DID Modal */}
      {statusModalPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-line shadow-card max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-navy-800">
              Update Identity Status for {PERSONA_MAP.get(statusModalPersona)?.name}
            </h3>
            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-600 mb-1">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as DidStatus)}
                  className={inputCls}
                >
                  <option value="active">Active (Full Credentials)</option>
                  <option value="suspended">Suspended (Temporary Revocation)</option>
                  <option value="revoked">Revoked (Permanent Separation)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-600 mb-1">Administrative Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Clearance audit review or security debriefing pending..."
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="secondary" size="sm" onClick={() => setStatusModalPersona(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Commit to IdentityRegistry.sol
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
