// ============================================================
// BEL TrustGrid 2.0 — Shared TypeScript types
// ============================================================

export type AccountType = "employee" | "vendor" | "customer" | "erp_admin";
export type Classification = "open" | "restricted" | "confidential" | "secret_demo";
export type ChainStatus = "none" | "queued" | "submitted" | "confirmed" | "failed";
export type RequestStatus =
  | "pending"
  | "first_approved"
  | "approved"
  | "rejected"
  | "expired"
  | "revoked"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  account_type: AccountType;
  role_code: string;
  tier: number; // 0–5, external = 9
  reports_to: string | null;
  unit_id: string | null;
  department_id: string | null;
  sbu_id: string | null;
  clearance: number; // 0–3
  status: "active" | "suspended" | "revoked";
  created_at: string;
}

export interface DID {
  user_id: string;
  did: string;
  address: string;
  linked_wallet: string | null;
  chain_tx_id: string | null;
  registered_block: number | null;
  status: "pending" | "active" | "suspended" | "revoked";
}

export interface Project {
  id: string;
  code: string;
  name: string;
  phase: string;
  progress: number;
  status: "active" | "on_hold" | "completed";
  lead_id: string;
  unit_id: string | null;
  department_id: string | null;
  is_archived: boolean;
  closed_at: string | null;
}

export interface Document {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  classification: Classification;
  classification_level: number;
  visible_to: string[];
  storage_path: string;
  current_version: number;
  deleted_at: string | null;
  created_at: string;
}

export interface DocumentVersion {
  document_id: string;
  version: number;
  sha256: string;
  size_bytes: number;
  uploaded_by: string;
  chain_tx_id: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: string;
  requester_id: string;
  resource_type: string;
  resource_id: string;
  level: number;
  justification: string;
  status: RequestStatus;
  first_approver: string | null;
  second_approver: string | null;
  decided_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  sla_due_at: string;
  chain_tx_id: string | null;
  created_at: string;
}

export interface ChainTx {
  id: string;
  action: string;
  contract: string;
  tx_hash: string | null;
  block_number: number | null;
  gas_used: number | null;
  status: ChainStatus;
  error: string | null;
  story_simple: string;
  story_technical: Record<string, unknown> | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  classification: Classification;
  token_id: number | null;
  owner_did: string | null;
  status: "active" | "assigned" | "transferred" | "retired";
  asset_hash: string | null;
  project_id: string | null;
}

export interface AuditLog {
  seq: number;
  actor_id: string;
  actor_role: string;
  action: string;
  table_name: string;
  row_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string;
  session_id: string;
  prev_hash: string;
  hash: string;
  batch_id: number | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// ---- Demo persona definition ----
export interface Persona {
  id: string;
  name: string;
  role: string;
  tier: number;
  accountType: AccountType;
  department: string;
  avatar: string; // initials
  color: string; // tailwind bg class
  description: string;
}

// ---- X-Ray Drawer ----
export interface XRayPayload {
  txId: string;
  chainTx: ChainTx;
  documentId?: string;
  documentTitle?: string;
}
