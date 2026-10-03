"use client";
// ============================================================
// TrustGrid demo-mode store
// - Simulates the relayer pipeline (queued → submitted → confirmed)
// - Keeps a SHA-256 hash-chained audit log (tamper-evident)
// - Persists to localStorage; swap for Supabase + relayer in live mode
// ============================================================
import { useSyncExternalStore } from "react";
import { keccak256, sha256, stringToHex, toHex } from "viem";
import type { ChainStatus, Classification, RequestStatus } from "@/lib/types";
import {
  CLASSIFICATION_LEVEL, NO_DID_AT_START, SEED_ASSETS, SEED_DOCUMENTS, SEED_PROJECTS,
  addressFor, didFor, type SeedProject,
} from "@/lib/demo-data";
import { PERSONAS, PERSONA_MAP } from "@/lib/personas";
import { TWO_PERSON_THRESHOLD, canApprove, clearanceOf, evaluateAccess, type PolicyDecision } from "@/lib/policy";

// ── Types ────────────────────────────────────────────────────
export type DidStatus = "pending" | "active" | "suspended" | "revoked";
export interface DidRecord { did: string; address: string; status: DidStatus; txId: string | null; createdAt: string }

export interface Tx {
  id: string;
  action: string;
  contract: "IdentityRegistry" | "AccessControl" | "DocumentAnchor" | "AssetNFT" | "AuditAnchor";
  method: string;
  args: Record<string, string | number>;
  txHash: string | null;
  block: number | null;
  gasUsed: number | null;
  status: ChainStatus;
  story: string;
  actor: string;
  createdAt: string;
  confirmedAt: string | null;
}

export interface DocVersion { version: number; sha256: string; size: number; uploadedBy: string; txId: string | null; createdAt: string; fileName: string }
export interface Doc {
  id: string; projectId: string; owner: string; title: string; classification: Classification;
  versions: DocVersion[];
  /** Bytes currently in off-chain storage (only for seeded/sample docs) */
  stored: string | null;
  createdAt: string;
}

export interface AccessReq {
  id: string; requester: string; docId: string; level: number; justification: string;
  status: RequestStatus; firstApprover: string | null; secondApprover: string | null;
  reason: string | null; createdAt: string; decidedAt: string | null; expiresAt: string | null;
  slaDueAt: string; txIds: string[];
}

export interface AssetEvent { action: string; from: string | null; to: string | null; txId: string | null; at: string }
export interface AssetRec {
  id: string; name: string; category: string; classification: Classification; tokenId: number;
  owner: string; projectId: string | null; status: "active" | "assigned" | "transferred" | "retired";
  history: AssetEvent[];
}

export interface AuditEntry {
  seq: number; actor: string; action: string; target: string; detail: string;
  txId: string | null; prevHash: string; hash: string; createdAt: string;
}

export interface Notice { id: string; userId: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }

export interface TGState {
  version: number;
  block: number;
  projects: SeedProject[];
  dids: Record<string, DidRecord>;
  docs: Doc[];
  requests: AccessReq[];
  assets: AssetRec[];
  txs: Tx[];
  audit: AuditEntry[];
  notices: Notice[];
  /** Last time audit hashes were anchored on-chain */
  lastAnchor: { seq: number; root: string; txId: string } | null;
}

const STORAGE_KEY = "trustgrid-demo-v1";
const STATE_VERSION = 1;
const GENESIS = "0x" + "0".repeat(64);

// ── Helpers ──────────────────────────────────────────────────
export const hashText = (s: string) => sha256(stringToHex(s));
export const hashBytes = (b: Uint8Array) => sha256(b);
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const HOUR = 3_600_000;

function auditHash(prev: string, e: Omit<AuditEntry, "hash" | "prevHash">) {
  return hashText(prev + JSON.stringify([e.seq, e.actor, e.action, e.target, e.detail, e.txId, e.createdAt]));
}

// ── Seed builder ─────────────────────────────────────────────
function buildSeed(): TGState {
  const s: TGState = {
    version: STATE_VERSION, block: 18_402_118, projects: SEED_PROJECTS,
    dids: {}, docs: [], requests: [], assets: [], txs: [], audit: [], notices: [], lastAnchor: null,
  };
  let t = -6 * 24 * HOUR;
  const step = () => (t += 17 * 60_000);

  const seedTx = (tx: Omit<Tx, "id" | "txHash" | "block" | "gasUsed" | "status" | "createdAt" | "confirmedAt">) => {
    const at = iso(step());
    s.block += 3 + Math.floor(Math.random() * 40);
    const full: Tx = {
      ...tx, id: uid("tx"), txHash: keccak256(stringToHex(uid("h") + at)), block: s.block,
      gasUsed: 48_000 + Math.floor(Math.random() * 90_000), status: "confirmed", createdAt: at, confirmedAt: at,
    };
    s.txs.unshift(full);
    return full;
  };
  const seedAudit = (actor: string, action: string, target: string, detail: string, txId: string | null, at?: string) => {
    const prev = s.audit[0]?.hash ?? GENESIS;
    const base = { seq: (s.audit[0]?.seq ?? 0) + 1, actor, action, target, detail, txId, createdAt: at ?? iso(t) };
    s.audit.unshift({ ...base, prevHash: prev, hash: auditHash(prev, base) });
  };

  // DIDs
  for (const p of PERSONAS) {
    if (NO_DID_AT_START.includes(p.id)) continue;
    const tx = seedTx({ action: "DID registered", contract: "IdentityRegistry", method: "registerDID", args: { did: didFor(p.id), controller: addressFor(p.id) }, story: `${p.name}'s identity was registered on-chain.`, actor: "ciso-rohan" });
    s.dids[p.id] = { did: didFor(p.id), address: addressFor(p.id), status: "active", txId: tx.id, createdAt: tx.createdAt };
    seedAudit("ciso-rohan", "did.register", p.id, `DID issued to ${p.name}`, tx.id, tx.createdAt);
  }
  // Documents
  for (const d of SEED_DOCUMENTS) {
    const h = hashText(d.content);
    const tx = seedTx({ action: "Document anchored", contract: "DocumentAnchor", method: "anchor", args: { docId: d.id, version: 1, sha256: h }, story: `"${d.title}" fingerprint was locked on-chain.`, actor: d.owner });
    s.docs.push({
      id: d.id, projectId: d.projectId, owner: d.owner, title: d.title, classification: d.classification, stored: d.content, createdAt: tx.createdAt,
      versions: [{ version: 1, sha256: h, size: d.content.length, uploadedBy: d.owner, txId: tx.id, createdAt: tx.createdAt, fileName: `${d.id}.txt` }],
    });
    seedAudit(d.owner, "document.upload", d.id, `Uploaded "${d.title}" v1`, tx.id, tx.createdAt);
  }
  // Assets
  for (const a of SEED_ASSETS) {
    const tx = seedTx({ action: "Asset minted", contract: "AssetNFT", method: "mint", args: { tokenId: a.tokenId, to: addressFor(a.owner) }, story: `"${a.name}" was minted as token #${a.tokenId}.`, actor: "dh-security-amit" });
    const history: AssetEvent[] = [{ action: "Minted", from: null, to: a.owner, txId: tx.id, at: tx.createdAt }];
    if (a.status === "retired") {
      const rt = seedTx({ action: "Asset retired", contract: "AssetNFT", method: "retire", args: { tokenId: a.tokenId }, story: `Token #${a.tokenId} was retired.`, actor: "dh-security-amit" });
      history.unshift({ action: "Retired", from: a.owner, to: null, txId: rt.id, at: rt.createdAt });
    }
    s.assets.push({ ...a, history });
    seedAudit("dh-security-amit", "asset.mint", a.id, `Minted token #${a.tokenId}`, tx.id, tx.createdAt);
  }
  // Access requests
  const req = (r: Partial<AccessReq> & Pick<AccessReq, "requester" | "docId" | "level" | "justification" | "status">, ageH: number): AccessReq => ({
    id: uid("req"), firstApprover: null, secondApprover: null, reason: null, decidedAt: null, expiresAt: null, txIds: [],
    createdAt: iso(-ageH * HOUR), slaDueAt: iso(-ageH * HOUR + 48 * HOUR), ...r,
  });
  s.requests.push(
    req({ requester: "proc-aarav", docId: "doc-snt-test", level: 3, justification: "Need to download the field test report to attach to the NovaTech PO closure.", status: "pending" }, 5),
    req({ requester: "proc-divya", docId: "doc-snt-po", level: 2, justification: "Cross-checking pricing against Meghdoot PO for vendor consistency.", status: "pending" }, 30),
    req({ requester: "uh-bangalore", docId: "doc-grd-threat", level: 2, justification: "Unit-level readiness review ahead of customer visit.", status: "first_approved", firstApprover: "dir-rd-neha" }, 20),
    req({ requester: "vendor-novatech", docId: "doc-snt-schematic", level: 2, justification: "Require antenna schematic to quote replacement parts.", status: "rejected", firstApprover: "dh-rd-anita", reason: "Vendor clearance is limited to Restricted. Request a redacted interface drawing instead.", decidedAt: iso(-40 * HOUR) }, 50),
    req({ requester: "rd-preethi", docId: "doc-kvc-test", level: 2, justification: "Review interop test plan.", status: "approved", firstApprover: "dh-rd-anita", decidedAt: iso(-60 * HOUR), expiresAt: iso(-12 * HOUR) }, 62),
    req({ requester: "trainee-ananya", docId: "doc-snt-brief", level: 3, justification: "Onboarding reading material.", status: "approved", firstApprover: "dh-rd-anita", decidedAt: iso(-3 * HOUR), expiresAt: iso(21 * HOUR) }, 4),
  );
  for (const r of s.requests) {
    const tx = seedTx({ action: "Access requested", contract: "AccessControl", method: "requestAccess", args: { requester: addressFor(r.requester), resource: r.docId, level: r.level }, story: `${PERSONA_MAP.get(r.requester)?.name} asked for L${r.level} access.`, actor: r.requester });
    r.txIds.push(tx.id);
    seedAudit(r.requester, "access.request", r.id, `Requested L${r.level} on ${r.docId}`, tx.id, tx.createdAt);
  }
  s.notices.push(
    { id: uid("n"), userId: "dh-procurement-kavya", title: "2 access requests waiting", body: "Aarav and Divya are waiting for your decision.", link: "/approvals", read: false, createdAt: iso(-HOUR) },
    { id: uid("n"), userId: "ciso-rohan", title: "Second approval needed", body: "Garuda Threat Library (Secret) needs a second approver.", link: "/approvals", read: false, createdAt: iso(-2 * HOUR) },
    { id: uid("n"), userId: "vendor-novatech", title: "Request rejected", body: "Your request for the Sentinel antenna schematic was rejected.", link: "/requests", read: false, createdAt: iso(-40 * HOUR) },
  );
  return s;
}

// ── Store core ───────────────────────────────────────────────
type Listener = () => void;
let state: TGState | null = null;
const listeners = new Set<Listener>();

function load(): TGState {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TGState;
      if (parsed.version === STATE_VERSION) {
        // Anything mid-flight when the tab closed is settled now.
        parsed.txs = parsed.txs.map((t) => (t.status === "queued" || t.status === "submitted" ? settle(t, parsed) : t));
        return parsed;
      }
    }
  } catch { /* fall through to seed */ }
  return buildSeed();
}

function settle(t: Tx, s: TGState): Tx {
  s.block += 1 + Math.floor(Math.random() * 3);
  return { ...t, status: "confirmed", txHash: t.txHash ?? keccak256(stringToHex(t.id + Date.now())), block: s.block, gasUsed: t.gasUsed ?? 52_000 + Math.floor(Math.random() * 80_000), confirmedAt: iso() };
}

function get(): TGState {
  if (!state) state = load();
  return state;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function set(mut: (draft: TGState) => void) {
  const next = structuredClone(get());
  mut(next);
  state = next;
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), 150);
  }
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTG<T>(selector: (s: TGState) => T): T {
  const s = useSyncExternalStore(subscribe, get, get);
  return selector(s);
}
export const getState = get;

// ── Internal mutation helpers ────────────────────────────────
function pushAudit(s: TGState, actor: string, action: string, target: string, detail: string, txId: string | null) {
  const prev = s.audit[0]?.hash ?? GENESIS;
  const base = { seq: (s.audit[0]?.seq ?? 0) + 1, actor, action, target, detail, txId, createdAt: iso() };
  s.audit.unshift({ ...base, prevHash: prev, hash: auditHash(prev, base) });
}
function notify(s: TGState, userId: string, title: string, body: string, link: string | null) {
  s.notices.unshift({ id: uid("n"), userId, title, body, link, read: false, createdAt: iso() });
}

/** Queue a transaction and walk it through the relayer pipeline. */
function submitTx(s: TGState, tx: Pick<Tx, "action" | "contract" | "method" | "args" | "story" | "actor">): string {
  const id = uid("tx");
  s.txs.unshift({ ...tx, id, txHash: null, block: null, gasUsed: null, status: "queued", createdAt: iso(), confirmedAt: null });
  setTimeout(() => set((d) => {
    const t = d.txs.find((x) => x.id === id);
    if (t && t.status === "queued") { t.status = "submitted"; t.txHash = keccak256(stringToHex(id + Date.now())); }
  }), 700);
  setTimeout(() => set((d) => {
    const i = d.txs.findIndex((x) => x.id === id);
    if (i >= 0 && d.txs[i].status !== "confirmed") d.txs[i] = settle(d.txs[i], d);
  }), 2600);
  return id;
}

// ── Selectors ────────────────────────────────────────────────
export function activeGrantLevel(s: TGState, personaId: string, docId: string): { level: number; expired: boolean } {
  let level = 0; let expired = false;
  for (const r of s.requests) {
    if (r.requester !== personaId || r.docId !== docId || r.status !== "approved") continue;
    if (r.expiresAt && new Date(r.expiresAt).getTime() < Date.now()) { expired = true; continue; }
    level = Math.max(level, r.level);
  }
  return { level, expired: expired && level === 0 };
}

export function decideDocAccess(s: TGState, personaId: string, docId: string, requiredLevel: number): PolicyDecision {
  const persona = PERSONA_MAP.get(personaId)!;
  const doc = s.docs.find((d) => d.id === docId)!;
  const project = s.projects.find((p) => p.id === doc.projectId);
  const grant = activeGrantLevel(s, personaId, docId);
  return evaluateAccess({
    persona, hasActiveDid: s.dids[personaId]?.status === "active",
    isMember: !!project && (project.members.includes(personaId) || project.lead === personaId),
    isOwner: doc.owner === personaId, classification: doc.classification, requiredLevel,
    grantLevel: grant.level, grantExpired: grant.expired,
  });
}

export function isProjectMember(s: TGState, personaId: string, projectId: string) {
  const p = s.projects.find((x) => x.id === projectId);
  return !!p && (p.lead === personaId || p.members.includes(personaId));
}

/** Who may decide this request (excluding the requester and anyone lacking clearance). */
export function approversFor(s: TGState, r: AccessReq): string[] {
  const doc = s.docs.find((d) => d.id === r.docId);
  if (!doc) return [];
  const project = s.projects.find((p) => p.id === doc.projectId);
  const requester = PERSONA_MAP.get(r.requester);
  const cls = CLASSIFICATION_LEVEL[doc.classification];
  const candidates = new Set<string>([doc.owner, project?.lead ?? "", "uh-bangalore", "ciso-rohan"]);
  if (requester) {
    for (const p of PERSONAS) if (p.tier === 3 && p.department === requester.department) candidates.add(p.id);
  }
  if (cls >= TWO_PERSON_THRESHOLD) PERSONAS.filter((p) => p.tier === 1 && p.department === "R&D").forEach((p) => candidates.add(p.id));
  return [...candidates].filter((id) => {
    const p = PERSONA_MAP.get(id);
    return p && id !== r.requester && canApprove(p) && clearanceOf(p) >= cls;
  });
}

export function verifyAuditChain(s: TGState): { ok: boolean; brokenAt: number | null } {
  const asc = [...s.audit].reverse();
  let prev = GENESIS;
  for (const e of asc) {
    const { hash, prevHash, ...base } = e;
    if (prevHash !== prev || auditHash(prev, base) !== hash) return { ok: false, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true, brokenAt: null };
}

// ── Actions ──────────────────────────────────────────────────
export class ActionError extends Error {}
const name = (id: string) => PERSONA_MAP.get(id)?.name ?? id;

export const actions = {
  createDid(personaId: string): string {
    let txId = "";
    set((s) => {
      if (s.dids[personaId]?.status === "active") throw new ActionError("DID already active");
      txId = submitTx(s, { action: "DID registered", contract: "IdentityRegistry", method: "registerDID", args: { did: didFor(personaId), controller: addressFor(personaId) }, story: `${name(personaId)}'s identity was registered on-chain.`, actor: personaId });
      s.dids[personaId] = { did: didFor(personaId), address: addressFor(personaId), status: "active", txId, createdAt: iso() };
      pushAudit(s, personaId, "did.register", personaId, "Self-service DID creation", txId);
      notify(s, personaId, "Your DID is live", "Your identity is now anchored on-chain.", "/identity");
    });
    return txId;
  },

  setDidStatus(actor: string, personaId: string, status: DidStatus, reason: string): string {
    let txId = "";
    set((s) => {
      const rec = s.dids[personaId];
      if (!rec) throw new ActionError("No DID to update");
      const method = status === "active" ? "reinstateDID" : status === "suspended" ? "suspendDID" : "revokeDID";
      txId = submitTx(s, { action: `DID ${status}`, contract: "IdentityRegistry", method, args: { did: rec.did, reason }, story: `${name(personaId)}'s identity was ${status === "active" ? "reinstated" : status}.`, actor });
      rec.status = status;
      pushAudit(s, actor, `did.${status}`, personaId, reason, txId);
      notify(s, personaId, `Your DID was ${status === "active" ? "reinstated" : status}`, reason, "/identity");
    });
    return txId;
  },

  requestAccess(personaId: string, docId: string, level: number, justification: string): string {
    let txId = "";
    set((s) => {
      if (s.dids[personaId]?.status !== "active") throw new ActionError("You need an active DID before requesting access");
      if (justification.trim().length < 15) throw new ActionError("Justification must be at least 15 characters");
      if (s.requests.some((r) => r.requester === personaId && r.docId === docId && (r.status === "pending" || r.status === "first_approved")))
        throw new ActionError("You already have an open request for this document");
      const r: AccessReq = {
        id: uid("req"), requester: personaId, docId, level, justification: justification.trim(), status: "pending",
        firstApprover: null, secondApprover: null, reason: null, createdAt: iso(), decidedAt: null, expiresAt: null, slaDueAt: iso(48 * HOUR), txIds: [],
      };
      txId = submitTx(s, { action: "Access requested", contract: "AccessControl", method: "requestAccess", args: { requester: addressFor(personaId), resource: docId, level }, story: `${name(personaId)} asked for L${level} access.`, actor: personaId });
      r.txIds.push(txId);
      s.requests.unshift(r);
      pushAudit(s, personaId, "access.request", r.id, `Requested L${level} on ${docId}`, txId);
      for (const a of approversFor(s, r)) notify(s, a, "New access request", `${name(personaId)} requested L${level} access.`, "/approvals");
    });
    return txId;
  },

  approve(approver: string, reqId: string, hours = 24): string {
    let txId = "";
    set((s) => {
      const r = s.requests.find((x) => x.id === reqId);
      if (!r) throw new ActionError("Request not found");
      if (!approversFor(s, r).includes(approver)) throw new ActionError("You are not an eligible approver for this request");
      if (r.firstApprover === approver) throw new ActionError("Two-person rule: a second, different approver is required");
      const doc = s.docs.find((d) => d.id === r.docId)!;
      const cls = CLASSIFICATION_LEVEL[doc.classification];
      const requester = PERSONA_MAP.get(r.requester)!;
      if (clearanceOf(requester) < cls) throw new ActionError("Requester's clearance is below the document classification — cannot approve");
      const needsTwo = cls >= TWO_PERSON_THRESHOLD;
      if (r.status === "pending" && needsTwo) {
        r.status = "first_approved"; r.firstApprover = approver;
        txId = submitTx(s, { action: "First approval", contract: "AccessControl", method: "approve", args: { requestId: r.id, approver: addressFor(approver), stage: 1 }, story: `${name(approver)} gave the first of two required approvals.`, actor: approver });
        pushAudit(s, approver, "access.first_approve", r.id, "First approval (two-person rule)", txId);
        notify(s, r.requester, "First approval received", "One more approver is needed.", "/requests");
      } else if (r.status === "pending" || r.status === "first_approved") {
        r.status = "approved";
        if (r.firstApprover) r.secondApprover = approver; else r.firstApprover = approver;
        r.decidedAt = iso(); r.expiresAt = iso(hours * HOUR);
        txId = submitTx(s, { action: "Access granted", contract: "AccessControl", method: "grant", args: { requestId: r.id, grantee: addressFor(r.requester), level: r.level, expiresInHours: hours }, story: `${name(r.requester)} received L${r.level} access for ${hours}h.`, actor: approver });
        pushAudit(s, approver, "access.approve", r.id, `Granted L${r.level} for ${hours}h`, txId);
        notify(s, r.requester, "Access approved", `L${r.level} access for ${hours} hours.`, `/documents/${r.docId}`);
      } else throw new ActionError(`Request is already ${r.status}`);
      r.txIds.push(txId);
    });
    return txId;
  },

  reject(approver: string, reqId: string, reason: string): string {
    let txId = "";
    set((s) => {
      const r = s.requests.find((x) => x.id === reqId);
      if (!r) throw new ActionError("Request not found");
      if (!approversFor(s, r).includes(approver)) throw new ActionError("You are not an eligible approver");
      if (reason.trim().length < 10) throw new ActionError("Give a reason (min 10 characters) so the requester knows what to do next");
      r.status = "rejected"; r.reason = reason.trim(); r.decidedAt = iso();
      txId = submitTx(s, { action: "Access rejected", contract: "AccessControl", method: "reject", args: { requestId: r.id, approver: addressFor(approver) }, story: `${name(approver)} rejected the request.`, actor: approver });
      r.txIds.push(txId);
      pushAudit(s, approver, "access.reject", r.id, reason.trim(), txId);
      notify(s, r.requester, "Access rejected", reason.trim(), "/requests");
    });
    return txId;
  },

  revoke(actor: string, reqId: string): string {
    let txId = "";
    set((s) => {
      const r = s.requests.find((x) => x.id === reqId);
      if (!r || r.status !== "approved") throw new ActionError("Only active grants can be revoked");
      r.status = "revoked"; r.decidedAt = iso();
      txId = submitTx(s, { action: "Access revoked", contract: "AccessControl", method: "revoke", args: { requestId: r.id }, story: `${name(r.requester)}'s access was revoked.`, actor });
      r.txIds.push(txId);
      pushAudit(s, actor, "access.revoke", r.id, "Grant revoked", txId);
      notify(s, r.requester, "Access revoked", "Your access grant was revoked.", "/requests");
    });
    return txId;
  },

  cancel(personaId: string, reqId: string) {
    set((s) => {
      const r = s.requests.find((x) => x.id === reqId);
      if (!r || r.requester !== personaId) throw new ActionError("Not your request");
      r.status = "cancelled"; r.decidedAt = iso();
      pushAudit(s, personaId, "access.cancel", r.id, "Cancelled by requester", null);
    });
  },

  uploadDocument(input: { actor: string; projectId: string; title: string; classification: Classification; sha256: string; size: number; fileName: string; existingDocId?: string; stored?: string | null }): { docId: string; txId: string } {
    let txId = ""; let docId = input.existingDocId ?? "";
    set((s) => {
      if (s.dids[input.actor]?.status !== "active") throw new ActionError("You need an active DID to upload");
      if (!isProjectMember(s, input.actor, input.projectId)) throw new ActionError("You must be a project member to upload");
      let doc = input.existingDocId ? s.docs.find((d) => d.id === input.existingDocId) : undefined;
      if (!doc) {
        docId = uid("doc");
        doc = { id: docId, projectId: input.projectId, owner: input.actor, title: input.title, classification: input.classification, versions: [], stored: input.stored ?? null, createdAt: iso() };
        s.docs.unshift(doc);
      } else if (input.stored !== undefined) doc.stored = input.stored;
      const version = (doc.versions[0]?.version ?? 0) + 1;
      txId = submitTx(s, { action: "Document anchored", contract: "DocumentAnchor", method: "anchor", args: { docId: doc.id, version, sha256: input.sha256 }, story: `"${doc.title}" v${version} fingerprint was locked on-chain.`, actor: input.actor });
      doc.versions.unshift({ version, sha256: input.sha256, size: input.size, uploadedBy: input.actor, txId, createdAt: iso(), fileName: input.fileName });
      pushAudit(s, input.actor, "document.upload", doc.id, `Uploaded "${doc.title}" v${version}`, txId);
    });
    return { docId, txId };
  },

  /** Demo: silently modify stored bytes (simulates an insider editing the file in storage). */
  tamperDocument(actor: string, docId: string) {
    set((s) => {
      const d = s.docs.find((x) => x.id === docId);
      if (!d?.stored) throw new ActionError("This document has no stored sample to tamper with");
      d.stored = d.stored.replace("FICTIONAL", "F1CTIONAL") + "\n[edited outside TrustGrid]\n";
      pushAudit(s, actor, "demo.tamper", docId, "Simulated off-chain file modification", null);
    });
  },
  restoreDocument(actor: string, docId: string) {
    set((s) => {
      const d = s.docs.find((x) => x.id === docId);
      const seed = SEED_DOCUMENTS.find((x) => x.id === docId);
      if (!d || !seed) throw new ActionError("Nothing to restore");
      d.stored = seed.content;
      pushAudit(s, actor, "demo.restore", docId, "Restored original file from backup", null);
    });
  },

  logView(actor: string, docId: string, level: number) {
    set((s) => pushAudit(s, actor, level >= 3 ? "document.download" : "document.view", docId, `L${level} access`, null));
  },
  logDenied(actor: string, docId: string, reason: string) {
    set((s) => pushAudit(s, actor, "access.denied", docId, reason, null));
  },

  mintAsset(actor: string, a: { name: string; category: string; classification: Classification; owner: string; projectId: string | null }): string {
    let txId = "";
    set((s) => {
      const tokenId = Math.max(1000, ...s.assets.map((x) => x.tokenId)) + 1;
      txId = submitTx(s, { action: "Asset minted", contract: "AssetNFT", method: "mint", args: { tokenId, to: addressFor(a.owner), assetHash: hashText(a.name + tokenId) }, story: `"${a.name}" was minted as token #${tokenId}.`, actor });
      s.assets.unshift({ ...a, id: uid("a"), tokenId, status: "active", history: [{ action: "Minted", from: null, to: a.owner, txId, at: iso() }] });
      pushAudit(s, actor, "asset.mint", String(tokenId), `Minted "${a.name}"`, txId);
    });
    return txId;
  },

  transferAsset(actor: string, assetId: string, to: string, note: string): string {
    let txId = "";
    set((s) => {
      const a = s.assets.find((x) => x.id === assetId);
      if (!a || a.status === "retired") throw new ActionError("Asset cannot be transferred");
      if (s.dids[to]?.status !== "active") throw new ActionError("Recipient has no active DID");
      if (clearanceOf(PERSONA_MAP.get(to)!) < CLASSIFICATION_LEVEL[a.classification]) throw new ActionError("Recipient clearance is below the asset classification");
      txId = submitTx(s, { action: "Asset transferred", contract: "AssetNFT", method: "safeTransferFrom", args: { tokenId: a.tokenId, from: addressFor(a.owner), to: addressFor(to) }, story: `Token #${a.tokenId} moved from ${name(a.owner)} to ${name(to)}.`, actor });
      a.history.unshift({ action: note || "Transferred", from: a.owner, to, txId, at: iso() });
      a.owner = to; a.status = to.startsWith("customer") ? "transferred" : "assigned";
      pushAudit(s, actor, "asset.transfer", String(a.tokenId), `To ${name(to)}`, txId);
      notify(s, to, "Asset assigned to you", `${a.name} (token #${a.tokenId})`, "/assets");
    });
    return txId;
  },

  retireAsset(actor: string, assetId: string): string {
    let txId = "";
    set((s) => {
      const a = s.assets.find((x) => x.id === assetId);
      if (!a || a.status === "retired") throw new ActionError("Already retired");
      txId = submitTx(s, { action: "Asset retired", contract: "AssetNFT", method: "retire", args: { tokenId: a.tokenId }, story: `Token #${a.tokenId} was retired.`, actor });
      a.history.unshift({ action: "Retired", from: a.owner, to: null, txId, at: iso() });
      a.status = "retired";
      pushAudit(s, actor, "asset.retire", String(a.tokenId), "Retired", txId);
    });
    return txId;
  },

  anchorAudit(actor: string): string {
    let txId = "";
    set((s) => {
      const head = s.audit[0];
      txId = submitTx(s, { action: "Audit batch anchored", contract: "AuditAnchor", method: "anchorBatch", args: { fromSeq: (s.lastAnchor?.seq ?? 0) + 1, toSeq: head.seq, root: head.hash }, story: `Audit entries up to #${head.seq} were sealed on-chain.`, actor });
      s.lastAnchor = { seq: head.seq, root: head.hash, txId };
      pushAudit(s, actor, "audit.anchor", String(head.seq), "Audit head anchored", txId);
    });
    return txId;
  },

  /** Demo: edit an audit row in the "database" without re-hashing. */
  tamperAudit(seq: number) {
    set((s) => {
      const e = s.audit.find((x) => x.seq === seq);
      if (e) e.detail = e.detail + " (edited)";
    });
  },

  markNoticesRead(userId: string) {
    set((s) => s.notices.forEach((n) => { if (n.userId === userId) n.read = true; }));
  },

  reset() {
    state = buildSeed();
    listeners.forEach((l) => l());
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

export { toHex };
