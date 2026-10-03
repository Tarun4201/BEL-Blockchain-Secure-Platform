// ============================================================
// Zero-trust policy engine (PRD: "role alone never grants access")
// Every decision returns a human-readable trace of each check.
// ============================================================
import type { Classification, Persona } from "@/lib/types";
import { CLASSIFICATION_LEVEL } from "@/lib/demo-data";

export type RoleGroup =
  | "admin" | "executive" | "vigilance" | "unit_head" | "dept_head"
  | "officer" | "trainee" | "vendor" | "customer";

export function roleGroup(p: Persona): RoleGroup {
  if (p.id === "ciso-rohan" || p.accountType === "erp_admin") return "admin";
  if (p.accountType === "vendor") return "vendor";
  if (p.accountType === "customer") return "customer";
  if (p.id === "cvo-deepa" || p.id === "audit-prakash") return "vigilance";
  if (p.tier <= 1) return "executive";
  if (p.tier === 2) return "unit_head";
  if (p.tier === 3) return "dept_head";
  if (p.tier === 4) return "officer";
  return "trainee";
}

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  admin: "ERP Administrator", executive: "Executive", vigilance: "Vigilance & Audit",
  unit_head: "Unit Head", dept_head: "Department Head", officer: "Officer",
  trainee: "Trainee", vendor: "External Vendor", customer: "External Customer",
};

/** Security clearance (0–3) by tier. External parties never exceed Restricted. */
export function clearanceOf(p: Persona): number {
  if (p.accountType === "vendor" || p.accountType === "customer") return 1;
  if (p.tier <= 2) return 3;
  if (p.tier === 3) return 2;
  if (p.tier === 4) return p.department === "R&D" || p.department === "Internal Audit" ? 2 : 1;
  return 0;
}

export const CLEARANCE_LABEL = ["Open", "Restricted", "Confidential", "Secret (Demo)"];

export function canApprove(p: Persona): boolean {
  const g = roleGroup(p);
  return g === "admin" || g === "executive" || g === "unit_head" || g === "dept_head";
}
export function canAudit(p: Persona): boolean {
  const g = roleGroup(p);
  return g === "admin" || g === "vigilance" || g === "executive";
}
export function canMintAssets(p: Persona): boolean {
  const g = roleGroup(p);
  return g === "admin" || g === "dept_head" || g === "unit_head";
}

/** Classifications at or above this need two distinct approvers. */
export const TWO_PERSON_THRESHOLD = 3;

export interface PolicyCheck {
  label: string;
  pass: boolean;
  detail: string;
}
export interface PolicyDecision {
  allowed: boolean;
  checks: PolicyCheck[];
  /** What the user can do next if denied */
  remedy: "create_did" | "request_access" | "none";
}

export interface PolicyInput {
  persona: Persona;
  hasActiveDid: boolean;
  isMember: boolean;
  isOwner: boolean;
  classification: Classification;
  requiredLevel: number; // 1–5
  grantLevel: number; // active approved grant level, 0 if none
  grantExpired: boolean;
}

export function evaluateAccess(i: PolicyInput): PolicyDecision {
  const cls = CLASSIFICATION_LEVEL[i.classification];
  const clearance = clearanceOf(i.persona);
  const checks: PolicyCheck[] = [];

  checks.push({
    label: "Verified identity (DID)",
    pass: i.hasActiveDid,
    detail: i.hasActiveDid ? "Active DID found in IdentityRegistry" : "No active DID — identity not anchored on-chain",
  });

  checks.push({
    label: "Clearance ≥ classification",
    pass: clearance >= cls,
    detail: `Clearance ${CLEARANCE_LABEL[clearance]} vs resource ${CLEARANCE_LABEL[cls]}`,
  });

  const membershipOk = i.isOwner || i.isMember || cls === 0;
  checks.push({
    label: "Need-to-know (project membership)",
    pass: membershipOk,
    detail: i.isOwner ? "You own this resource" : i.isMember ? "Member of the project" : cls === 0 ? "Open resource — membership not required" : "Not a member of this project",
  });

  // Members implicitly get L2 on Restricted-and-below; Confidential+ always needs an explicit grant.
  const implicitLevel = i.isOwner ? 5 : i.isMember && cls <= 1 ? 2 : cls === 0 ? 1 : 0;
  const effectiveGrant = i.grantExpired ? 0 : i.grantLevel;
  const level = Math.max(implicitLevel, effectiveGrant);
  checks.push({
    label: `Smart-contract grant ≥ L${i.requiredLevel}`,
    pass: level >= i.requiredLevel,
    detail: i.grantExpired
      ? "Grant has expired on-chain"
      : effectiveGrant
        ? `Active on-chain grant at L${effectiveGrant}`
        : implicitLevel
          ? `Implicit L${implicitLevel} from ${i.isOwner ? "ownership" : "membership"}`
          : "No grant in AccessControl contract",
  });

  const allowed = checks.every((c) => c.pass);
  const remedy = allowed ? "none" : !i.hasActiveDid ? "create_did" : clearance < cls ? "none" : "request_access";
  return { allowed, checks, remedy };
}
