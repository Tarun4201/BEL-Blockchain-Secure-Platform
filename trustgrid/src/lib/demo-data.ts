// ============================================================
// BEL TrustGrid 2.0 — Fictional seed data (demo mode)
// All names, projects and documents are fictional.
// ============================================================
import { keccak256, stringToHex } from "viem";
import type { Classification } from "@/lib/types";

export const CLASSIFICATION_LEVEL: Record<Classification, number> = {
  open: 0,
  restricted: 1,
  confidential: 2,
  secret_demo: 3,
};

/** Deterministic pseudo address for a persona (demo only). */
export function addressFor(id: string): `0x${string}` {
  return `0x${keccak256(stringToHex(`trustgrid:${id}`)).slice(26)}` as `0x${string}`;
}
export function didFor(id: string): string {
  return `did:bel:amoy:${addressFor(id)}`;
}

export interface SeedProject {
  id: string;
  code: string;
  name: string;
  summary: string;
  phase: string;
  progress: number;
  status: "active" | "on_hold" | "completed";
  lead: string;
  department: string;
  members: string[];
}

export const SEED_PROJECTS: SeedProject[] = [
  { id: "p-sentinel", code: "PRJ-SNT", name: "Sentinel Coastal Radar", summary: "Long-range coastal surveillance radar refresh.", phase: "Integration", progress: 68, status: "active", lead: "dh-rd-anita", department: "R&D", members: ["rd-preethi", "rd-kiran", "trainee-ananya", "qc-mohan", "proc-aarav", "vendor-novatech", "dir-rd-neha", "uh-bangalore"] },
  { id: "p-garuda", code: "PRJ-GRD", name: "Garuda EW Suite", summary: "Electronic warfare suite for airborne platforms.", phase: "Design", progress: 34, status: "active", lead: "rd-kiran", department: "R&D", members: ["rd-preethi", "dh-rd-anita", "vendor-shieldtech", "dir-rd-neha"] },
  { id: "p-varuna", code: "PRJ-VRN", name: "Varuna Sonar Array", summary: "Hull-mounted sonar array for naval customer.", phase: "Production", progress: 81, status: "active", lead: "dh-production-meena", department: "Production", members: ["prod-sunita", "trainee-rohit", "qc-mohan", "log-vijay", "customer-navy", "vendor-precisionworks", "dh-quality-sanjay"] },
  { id: "p-kavach", code: "PRJ-KVC", name: "Kavach Secure Comms", summary: "Encrypted tactical radio network.", phase: "Testing", progress: 57, status: "active", lead: "dh-rd-anita", department: "R&D", members: ["rd-preethi", "qc-mohan", "customer-defence", "dh-security-amit"] },
  { id: "p-trinetra", code: "PRJ-TRN", name: "Trinetra Night Vision", summary: "Thermal + image-intensified sights.", phase: "Procurement", progress: 22, status: "active", lead: "dh-procurement-kavya", department: "Procurement", members: ["proc-aarav", "proc-divya", "vendor-novatech", "fin-rahul"] },
  { id: "p-netra", code: "PRJ-NTR", name: "Netra Tactical Data Link", summary: "Secure datalink between ground stations.", phase: "Design", progress: 41, status: "active", lead: "rd-kiran", department: "R&D", members: ["rd-preethi", "trainee-ananya"] },
  { id: "p-shakti", code: "PRJ-SKT", name: "Shakti Power Modules", summary: "Ruggedised power supplies for field units.", phase: "Production", progress: 90, status: "active", lead: "prod-sunita", department: "Production", members: ["trainee-rohit", "qc-mohan", "vendor-precisionworks", "log-vijay"] },
  { id: "p-indra", code: "PRJ-IND", name: "Indra Air Surveillance", summary: "3D air surveillance radar for customer.", phase: "Delivery", progress: 96, status: "active", lead: "uh-bangalore", department: "Operations", members: ["log-vijay", "customer-defence", "qc-mohan", "dh-quality-sanjay"] },
  { id: "p-agni", code: "PRJ-AGN", name: "Agni Thermal Imager", summary: "Uncooled thermal imaging core.", phase: "On hold", progress: 15, status: "on_hold", lead: "rd-preethi", department: "R&D", members: ["rd-kiran"] },
  { id: "p-sudarshan", code: "PRJ-SDR", name: "Sudarshan Drone Shield", summary: "Counter-UAS detect & jam system.", phase: "Prototype", progress: 48, status: "active", lead: "dir-rd-neha", department: "R&D", members: ["rd-kiran", "rd-preethi", "vendor-shieldtech"] },
  { id: "p-vajra", code: "PRJ-VJR", name: "Vajra Battlefield Mgmt", summary: "Command & control software suite.", phase: "Completed", progress: 100, status: "completed", lead: "dh-rd-anita", department: "R&D", members: ["rd-preethi", "customer-defence"] },
  { id: "p-meghdoot", code: "PRJ-MGD", name: "Meghdoot SATCOM Terminal", summary: "Portable satellite terminal.", phase: "Procurement", progress: 30, status: "active", lead: "proc-divya", department: "Procurement", members: ["proc-aarav", "fin-rahul", "vendor-novatech"] },
  { id: "p-erp", code: "PRJ-ERP", name: "TrustGrid ERP Rollout", summary: "Unit-wide rollout of this platform.", phase: "Rollout", progress: 62, status: "active", lead: "ciso-rohan", department: "IT & Security", members: ["hr-lakshmi", "audit-prakash", "dh-compliance-ritu"] },
];

export interface SeedDocument {
  id: string;
  projectId: string;
  owner: string;
  title: string;
  classification: Classification;
  content: string; // demo file body — hashed on load so verification is real
}

const body = (t: string, c: Classification) =>
  `BEL TrustGrid — FICTIONAL DEMO DOCUMENT\nTitle: ${t}\nClassification: ${c}\n\nThis file contains no real defence data. It exists to demonstrate SHA-256 anchoring.\n`;

const d = (id: string, projectId: string, owner: string, title: string, classification: Classification): SeedDocument => ({
  id, projectId, owner, title, classification, content: body(title, classification),
});

export const SEED_DOCUMENTS: SeedDocument[] = [
  d("doc-snt-schematic", "p-sentinel", "rd-preethi", "Sentinel Antenna Schematic v3", "confidential"),
  d("doc-snt-test", "p-sentinel", "qc-mohan", "Sentinel Field Test Report", "restricted"),
  d("doc-snt-po", "p-sentinel", "proc-aarav", "Sentinel PO-2026-0142 (NovaTech)", "restricted"),
  d("doc-snt-brief", "p-sentinel", "dh-rd-anita", "Sentinel Programme Brief", "open"),
  d("doc-snt-freq", "p-sentinel", "dh-rd-anita", "Sentinel Frequency Plan", "secret_demo"),
  d("doc-grd-arch", "p-garuda", "rd-kiran", "Garuda System Architecture", "confidential"),
  d("doc-grd-threat", "p-garuda", "dir-rd-neha", "Garuda Threat Library", "secret_demo"),
  d("doc-vrn-bom", "p-varuna", "prod-sunita", "Varuna Bill of Materials", "restricted"),
  d("doc-vrn-qa", "p-varuna", "qc-mohan", "Varuna QA Inspection Log", "restricted"),
  d("doc-vrn-delivery", "p-varuna", "log-vijay", "Varuna Delivery Schedule", "open"),
  d("doc-kvc-crypto", "p-kavach", "rd-preethi", "Kavach Key Management Spec", "secret_demo"),
  d("doc-kvc-test", "p-kavach", "qc-mohan", "Kavach Interop Test Plan", "confidential"),
  d("doc-trn-rfq", "p-trinetra", "proc-aarav", "Trinetra RFQ Package", "restricted"),
  d("doc-trn-eval", "p-trinetra", "dh-procurement-kavya", "Trinetra Vendor Evaluation", "confidential"),
  d("doc-skt-spec", "p-shakti", "prod-sunita", "Shakti Module Spec", "open"),
  d("doc-ind-acc", "p-indra", "uh-bangalore", "Indra Acceptance Certificate", "restricted"),
  d("doc-mgd-budget", "p-meghdoot", "fin-rahul", "Meghdoot Budget Sheet", "confidential"),
  d("doc-erp-policy", "p-erp", "ciso-rohan", "TrustGrid Access Policy", "open"),
  d("doc-erp-audit", "p-erp", "audit-prakash", "Q3 Internal Audit Findings", "confidential"),
  d("doc-vjr-closure", "p-vajra", "dh-rd-anita", "Vajra Project Closure Report", "restricted"),
];

export interface SeedAsset {
  id: string;
  name: string;
  category: string;
  classification: Classification;
  tokenId: number;
  owner: string;
  projectId: string | null;
  status: "active" | "assigned" | "transferred" | "retired";
}

export const SEED_ASSETS: SeedAsset[] = [
  { id: "a-1", name: "X-Band Radar Transceiver #SNT-07", category: "Equipment", classification: "confidential", tokenId: 1001, owner: "rd-preethi", projectId: "p-sentinel", status: "assigned" },
  { id: "a-2", name: "Spectrum Analyser R&S-FSW", category: "Test Equipment", classification: "restricted", tokenId: 1002, owner: "qc-mohan", projectId: "p-sentinel", status: "assigned" },
  { id: "a-3", name: "Sonar Transducer Batch VRN-B4", category: "Components", classification: "restricted", tokenId: 1003, owner: "prod-sunita", projectId: "p-varuna", status: "active" },
  { id: "a-4", name: "Kavach Crypto Module KM-2", category: "Crypto Hardware", classification: "secret_demo", tokenId: 1004, owner: "dh-security-amit", projectId: "p-kavach", status: "active" },
  { id: "a-5", name: "Indra Radar Unit #IND-01", category: "Deliverable", classification: "confidential", tokenId: 1005, owner: "customer-defence", projectId: "p-indra", status: "transferred" },
  { id: "a-6", name: "Shakti PSU Lot 12", category: "Components", classification: "open", tokenId: 1006, owner: "log-vijay", projectId: "p-shakti", status: "active" },
  { id: "a-7", name: "EW Signal Library v2 (digital)", category: "Digital Record", classification: "secret_demo", tokenId: 1007, owner: "rd-kiran", projectId: "p-garuda", status: "active" },
  { id: "a-8", name: "Legacy Oscilloscope TDS-3054", category: "Test Equipment", classification: "open", tokenId: 1008, owner: "qc-mohan", projectId: null, status: "retired" },
];

/** Personas that start WITHOUT a DID so the evaluator can demo DID creation. */
export const NO_DID_AT_START = ["trainee-rohit", "vendor-precisionworks"];
