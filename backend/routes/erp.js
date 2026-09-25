const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { all, get, run } = require("../db");
const { getContract, provider, personas, getLatestNonce } = require("../blockchain");
const { verifyDocumentIntegrity } = require("../utils/hasher");
const { rebuildIndexFromChain } = require("../indexer");

const router = express.Router();
const sessions = new Map();
const SESSION_TTL_SECONDS = 30 * 60;

const MODULES_BY_ROLE = {
  ERP_ADMIN: ["dashboard", "identity-assertion", "procurement", "finance", "inventory", "production", "quality", "engineering", "logistics", "access-control", "asset-passport", "security-signals", "demo-simulator", "organization", "users", "audit", "reports", "blockchain", "profile"],
  PROCUREMENT_OFFICER: ["dashboard", "procurement", "vendors", "access-control", "notifications", "profile"],
  FINANCE_OFFICER: ["dashboard", "finance", "access-control", "reports", "profile"],
  PRODUCTION_MANAGER: ["dashboard", "production", "inventory", "quality", "profile"],
  QUALITY_OFFICER: ["dashboard", "quality", "profile"],
  ENGINEERING_OFFICER: ["dashboard", "identity-assertion", "engineering", "projects", "asset-passport", "profile"],
  LOGISTICS_OFFICER: ["dashboard", "identity-assertion", "logistics", "inventory", "asset-passport", "profile"],
  ASSET_CUSTODY_APPROVER: ["dashboard", "identity-assertion", "asset-passport", "security-signals", "audit", "profile"],
  HR_OFFICER: ["dashboard", "hr", "profile"],
  COMPLIANCE_OFFICER: ["dashboard", "compliance", "audit", "profile"],
  INTERNAL_AUDITOR: ["dashboard", "audit", "reports", "profile"],
  VENDOR: ["dashboard", "vendor-records", "profile"],
  CUSTOMER: ["dashboard", "customer-records", "profile"],
};

const MODULE_LABELS = {
  dashboard: "Dashboard", procurement: "Procurement", vendors: "Vendor Management", finance: "Finance", inventory: "Inventory / Materials",
  production: "Production", quality: "Quality", engineering: "R&D / Engineering", projects: "Project Management", hr: "Human Resources",
  logistics: "Logistics", compliance: "Compliance", audit: "Audit", reports: "Reports", "access-control": "Access Control",
  organization: "Organization Masters", users: "Users & Permissions", notifications: "Notifications", blockchain: "Blockchain Registry", "asset-passport": "Asset Passport", "identity-assertion": "Identity Assertion", "security-signals": "Security Signals", "demo-simulator": "Judge Demo Mode", profile: "My Profile",
  "vendor-records": "My Orders", "customer-records": "My Deliveries",
};

const hashPassword = (password) => crypto.createHash("sha256").update(password || "").digest("hex");
const now = () => Math.floor(Date.now() / 1000);

function publicUser(row) {
  return {
    employeeId: row.employee_id,
    fullName: row.full_name,
    officialEmail: row.official_email,
    accountType: row.account_type,
    unitId: row.unit_id,
    unit: row.unit_name,
    departmentId: row.primary_department_id,
    department: row.department_name,
    sbuId: row.primary_sbu_id,
    sbu: row.sbu_name,
    role: row.role_name,
    roleKey: row.role_key,
    accessLevel: row.access_level,
    mfaEnabled: Boolean(row.mfa_enabled),
  };
}

async function findUser(identifier) {
  return get(`SELECT u.*, unit.name AS unit_name, d.name AS department_name, s.name AS sbu_name
    FROM erp_users u
    JOIN erp_units unit ON unit.id = u.unit_id
    JOIN erp_departments d ON d.id = u.primary_department_id
    JOIN erp_sbus s ON s.id = u.primary_sbu_id
    WHERE u.employee_id = ? OR lower(u.official_email) = lower(?)`, [identifier, identifier]);
}

async function workspacesFor(user) {
  const timestamp = now();
  await run("UPDATE erp_access_requests SET status = 'EXPIRED', updated_at = ? WHERE status = 'APPROVED' AND end_date < ?", [timestamp, timestamp]);
  const extra = await all(`SELECT r.*, u.name AS unit_name, d.name AS department_name, s.name AS sbu_name
    FROM erp_access_requests r
    JOIN erp_units u ON u.id = r.target_unit_id
    JOIN erp_departments d ON d.id = r.target_department_id
    JOIN erp_sbus s ON s.id = r.target_sbu_id
    WHERE r.employee_id = ? AND r.status = 'APPROVED' AND r.start_date <= ? AND r.end_date >= ?`, [user.employee_id, timestamp, timestamp]);
  return [
    { unitId: user.unit_id, unit: user.unit_name, departmentId: user.primary_department_id, department: user.department_name, sbuId: user.primary_sbu_id, sbu: user.sbu_name, access: "PRIMARY ACCESS", modules: MODULES_BY_ROLE[user.role_key] || ["dashboard", "profile"] },
    ...extra.map((grant) => ({ unitId: grant.target_unit_id, unit: grant.unit_name, departmentId: grant.target_department_id, department: grant.department_name, sbuId: grant.target_sbu_id, sbu: grant.sbu_name, access: "TEMPORARY ACCESS", modules: ["dashboard", grant.requested_module, "profile"], permission: grant.requested_permission, expiresAt: grant.end_date })),
  ];
}

async function logEvent({ employeeId, action, unitId, departmentId, sbuId, targetId, result, reason, visibility = "AUTHORIZED_DEPARTMENTS" }) {
  const timestamp = now();
  const auditId = `AUD-${new Date(timestamp * 1000).getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await run(`INSERT INTO erp_audit_logs
    (audit_id, employee_id, action, unit_id, department_id, sbu_id, target_id, result, reason, visibility, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [auditId, employeeId || null, action, unitId || null, departmentId || null, sbuId || null, targetId || null, result, reason || null, visibility, timestamp]);
  if (result === "DENIED" && employeeId) {
    const cutoff = timestamp - 15 * 60;
    const recent = await get("SELECT COUNT(*) AS count FROM erp_audit_logs WHERE employee_id = ? AND result = 'DENIED' AND created_at >= ?", [employeeId, cutoff]);
    if (Number(recent?.count || 0) >= 3) {
      const existing = await get("SELECT * FROM erp_security_alerts WHERE employee_id = ? AND alert_type = 'REPEATED_DENIED_ACTIONS' AND status = 'OPEN'", [employeeId]);
      if (existing) await run("UPDATE erp_security_alerts SET evidence_count = ?, updated_at = ? WHERE id = ?", [Number(recent.count), timestamp, existing.id]);
      else await run("INSERT INTO erp_security_alerts (alert_id, employee_id, alert_type, severity, evidence_count, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [`SIG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, employeeId, "REPEATED_DENIED_ACTIONS", "MEDIUM", Number(recent.count), "Repeated denied actions detected within a fifteen-minute period.", timestamp, timestamp]);
    }
  }
}

function createSession(user) {
  const token = crypto.randomUUID();
  sessions.set(token, { employeeId: user.employee_id, expiresAt: now() + SESSION_TTL_SECONDS });
  return token;
}

async function requireSession(req, res, next) {
  const token = req.get("x-erp-session");
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: "Your ERP session has expired. Sign in again." });
  }
  const user = await findUser(session.employeeId);
  if (!user || user.employment_status !== "ACTIVE") return res.status(403).json({ error: "This ERP account is unavailable." });
  req.erpUser = user;
  req.erpSession = token;
  next();
}

function activeWorkspace(workspaces, requestedDepartment) {
  return workspaces.find((workspace) => workspace.departmentId === requestedDepartment) || workspaces[0];
}

router.get("/bootstrap", async (_req, res) => {
  const [units, departments, sbus, users] = await Promise.all([
    all("SELECT id, name FROM erp_units WHERE status = 'ACTIVE' ORDER BY name"),
    all("SELECT id, name, category_note AS categoryNote FROM erp_departments WHERE status = 'ACTIVE' ORDER BY name"),
    all("SELECT id, unit_id AS unitId, name FROM erp_sbus WHERE status = 'ACTIVE' ORDER BY name"),
    all("SELECT employee_id AS employeeId, full_name AS fullName, account_type AS accountType, unit_id AS unitId, primary_department_id AS departmentId, primary_sbu_id AS sbuId, role_name AS role FROM erp_users WHERE employment_status = 'ACTIVE' ORDER BY account_type, employee_id"),
  ]);
  res.json({ demo: "FICTIONAL DATA ONLY", units, departments, sbus, demoUsers: users, passwordHint: "123" });
});

router.post("/login", async (req, res) => {
  const { identifier, password, accountType = "EMPLOYEE", unitId, departmentId, sbuId } = req.body || {};
  const user = await findUser(identifier || "");
  const denied = async (action, reason) => {
    await logEvent({ employeeId: user?.employee_id, action, unitId, departmentId, sbuId, result: "DENIED", reason, visibility: "AUDIT_ONLY" });
    return res.status(403).json({ error: "Access denied. Your registered organizational assignment does not authorize this workspace." });
  };
  if (!user || user.account_type !== accountType || user.password_hash !== hashPassword(password)) return denied("LOGIN_FAILED", "Invalid credential or account type");
  if (user.employment_status !== "ACTIVE") return denied("LOGIN_FAILED", "Inactive account");
  if (user.unit_id !== unitId) return denied("LOGIN_FAILED", "Unit mismatch");
  const workspaces = await workspacesFor(user);
  const selected = workspaces.find((workspace) => workspace.unitId === unitId && workspace.departmentId === departmentId && workspace.sbuId === sbuId);
  if (!selected) return denied("UNAUTHORIZED_DEPARTMENT_LOGIN", "Department or SBU workspace not authorized");
  const token = createSession(user);
  await run("UPDATE erp_users SET last_login = ? WHERE employee_id = ?", [now(), user.employee_id]);
  await logEvent({ employeeId: user.employee_id, action: "LOGIN_SUCCESS", unitId, departmentId, sbuId, targetId: user.employee_id, result: "SUCCESS", reason: "Validated ERP workspace" });
  res.json({ sessionToken: token, user: publicUser(user), workspaces, activeWorkspace: selected, modules: selected.modules.map((id) => ({ id, label: MODULE_LABELS[id] || id })) });
});

router.post("/logout", requireSession, async (req, res) => {
  sessions.delete(req.erpSession);
  await logEvent({ employeeId: req.erpUser.employee_id, action: "LOGOUT", unitId: req.erpUser.unit_id, departmentId: req.erpUser.primary_department_id, sbuId: req.erpUser.primary_sbu_id, result: "SUCCESS" });
  res.status(204).end();
});

router.get("/me", requireSession, async (req, res) => {
  const workspaces = await workspacesFor(req.erpUser);
  res.json({ user: publicUser(req.erpUser), workspaces });
});

router.get("/dashboard", requireSession, async (req, res) => {
  const workspaces = await workspacesFor(req.erpUser);
  const workspace = activeWorkspace(workspaces, req.query.departmentId);
  const [records, recent, requests] = await Promise.all([
    all("SELECT module, COUNT(*) AS count FROM erp_records WHERE department_id = ? AND unit_id = ? AND sbu_id = ? GROUP BY module", [workspace.departmentId, workspace.unitId, workspace.sbuId]),
    all("SELECT audit_id AS auditId, action, target_id AS targetId, result, created_at AS createdAt FROM erp_audit_logs WHERE employee_id = ? ORDER BY created_at DESC LIMIT 8", [req.erpUser.employee_id]),
    all("SELECT status, COUNT(*) AS count FROM erp_access_requests WHERE employee_id = ? GROUP BY status", [req.erpUser.employee_id]),
  ]);
  const requestCounts = Object.fromEntries(requests.map((item) => [item.status, Number(item.count)]));
  res.json({
    workspace,
    modules: workspace.modules.map((id) => ({ id, label: MODULE_LABELS[id] || id })),
    counts: records,
    recentActivity: recent,
    trustJourney: {
      identity: "Verified organisational identity",
      policy: req.erpUser.role_name,
      access: requestCounts.APPROVED ? `${requestCounts.APPROVED} time-bound access grant${requestCounts.APPROVED === 1 ? "" : "s"} active` : "No additional access grant active",
      audit: "Every important portal decision is recorded",
    },
  });
});

/**
 * Admin-only, user-safe projection of the three canonical smart-contract
 * registries. Hash values stay on the backend; this page is for demonstrating
 * verified identities, ERC-721 custody, protected resources, and audit state.
 */
router.get("/blockchain/overview", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  try {
    const [identityContract, accessContract, assetContract, blockNumber] = await Promise.all([
      getContract("IdentityRegistry"), getContract("AccessControlManager"), getContract("AssetRegistry"), provider.getBlockNumber(),
    ]);
    const [identities, resources, assets, records] = await Promise.all([
      identityContract.getAllIdentities(), accessContract.getAllResources(), assetContract.getAllAssets(), accessContract.getAllAccessRecords(),
    ]);
    res.json({
      blockNumber,
      identities: identities.map((item) => ({ did: item.did, wallet: item.userAddress, role: item.role, registeredAt: Number(item.registeredAt) })),
      resources: resources.map((item) => ({ resourceId: item.resourceId, sensitivityLabel: item.sensitivityLabel, createdAt: Number(item.createdAt) })),
      assets: assets.map((item) => ({ assetId: Number(item.assetId), metadataURI: item.metadataURI, currentOwnerDid: item.currentOwnerDid, tokenOwnerWallet: item.currentOwnerWallet, status: Number(item.status) === 0 ? "ACTIVE" : "RETIRED", mintedAt: Number(item.mintedAt) })),
      accessRecords: records.map((item) => ({ did: item.did, resourceId: item.resourceId, status: ["NONE", "REQUESTED", "GRANTED", "REVOKED"][Number(item.status)] || "UNKNOWN", updatedAt: Number(item.updatedAt) })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const canUseAssetPassport = (roleKey) => ["ERP_ADMIN", "ENGINEERING_OFFICER", "LOGISTICS_OFFICER"].includes(roleKey);
const displayDid = (did) => did ? `Verified custody ID · ${String(did).slice(-10).toUpperCase()}` : "Not assigned";

async function passportFor(asset) {
  const assetContract = getContract("AssetRegistry");
  const onChain = await assetContract.getAsset(Number(asset.asset_id));
  const [history, services, pending] = await Promise.all([assetContract.getOwnershipHistory(Number(asset.asset_id)), assetContract.getServiceHistory(Number(asset.asset_id)), assetContract.getPendingTransfer(Number(asset.asset_id))]);
  return {
    assetId: Number(asset.asset_id),
    title: asset.title,
    description: asset.description,
    category: asset.category,
    status: Number(onChain[4]) === 0 ? "ACTIVE" : "RETIRED",
    custodian: displayDid(onChain[2]),
    custodianDid: onChain[2],
    mintedAt: Number(onChain[6]),
    verification: "Blockchain ownership record verified",
    pendingTransfer: pending.active ? { custodian: displayDid(pending.newOwnerDid), proposedAt: Number(pending.proposedAt) } : null,
    history: history.map((item) => ({
      from: item.fromDid === "ORIGIN_MINTER" ? "BEL asset registry" : displayDid(item.fromDid),
      to: displayDid(item.toDid),
      timestamp: Number(item.timestamp),
      action: item.fromDid === "ORIGIN_MINTER" ? "Asset passport issued" : "Custody transferred",
    })),
    services: services.map((item) => ({ reference: item.serviceReference, timestamp: Number(item.timestamp) })),
  };
}

router.get("/asset-passports", requireSession, async (req, res) => {
  if (!canUseAssetPassport(req.erpUser.role_key)) return res.status(403).json({ error: "Asset passport access is not assigned to this role." });
  try {
    const assets = await all("SELECT * FROM assets_meta ORDER BY asset_id ASC");
    const passports = await Promise.all(assets.map(passportFor));
    res.json({ passports });
  } catch (err) { res.status(503).json({ error: `Asset verification service unavailable: ${err.message}` }); }
});

router.get("/asset-passports/:assetId", requireSession, async (req, res) => {
  if (!canUseAssetPassport(req.erpUser.role_key)) return res.status(403).json({ error: "Asset passport access is not assigned to this role." });
  try {
    const asset = await get("SELECT * FROM assets_meta WHERE asset_id = ?", [Number(req.params.assetId)]);
    if (!asset) return res.status(404).json({ error: "Asset passport not found." });
    res.json({ passport: await passportFor(asset) });
  } catch (err) { res.status(503).json({ error: `Asset verification service unavailable: ${err.message}` }); }
});

router.post("/asset-passports/:assetId/verify", requireSession, async (req, res) => {
  if (!canUseAssetPassport(req.erpUser.role_key)) return res.status(403).json({ error: "Asset passport access is not assigned to this role." });
  try {
    const assetId = Number(req.params.assetId);
    const asset = await get("SELECT * FROM assets_meta WHERE asset_id = ?", [assetId]);
    if (!asset) return res.status(404).json({ error: "Asset passport not found." });
    const onChain = await getContract("AssetRegistry").getAsset(assetId);
    const filename = path.basename(asset.document_filename || "");
    const verification = verifyDocumentIntegrity(path.join(__dirname, "..", "storage", "documents", filename), onChain[3]);
    await logEvent({ employeeId: req.erpUser.employee_id, action: "ASSET_PASSPORT_VERIFIED", targetId: `ASSET-${assetId}`, result: verification.matches ? "SUCCESS" : "FAILED", reason: "Document fingerprint compared by protected backend", visibility: "AUDIT_ONLY" });
    res.json({ assetId, title: asset.title, verified: verification.matches, message: verification.matches ? "Asset document matches its protected blockchain fingerprint." : "Asset document could not be verified. Escalate this asset for review." });
  } catch (err) { res.status(503).json({ error: `Asset verification could not be completed: ${err.message}` }); }
});

router.post("/asset-passports/:assetId/transfer", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Only an administrator can approve an asset custody transfer." });
  const assetId = Number(req.params.assetId);
  const newOwnerDid = String(req.body?.newOwnerDid || "").trim();
  const assuranceLevel = req.body?.assuranceLevel === "HIGH" ? "HIGH" : "STANDARD";
  if (!newOwnerDid) return res.status(400).json({ error: "Select a verified digital custodian." });
  try {
    const asset = await get("SELECT * FROM assets_meta WHERE asset_id = ?", [assetId]);
    if (!asset) return res.status(404).json({ error: "Asset passport not found." });
    const identityContract = getContract("IdentityRegistry");
    if (!await identityContract.isRegistered(newOwnerDid)) return res.status(400).json({ error: "The selected custodian does not have a verified digital identity." });
    const signer = personas.ADMIN.signer;
    const contract = getContract("AssetRegistry", signer);
    const tx = assuranceLevel === "HIGH"
      ? await contract.proposeHighAssuranceTransfer(assetId, newOwnerDid, { nonce: await getLatestNonce(signer.address) })
      : await contract.transferAsset(assetId, newOwnerDid, { nonce: await getLatestNonce(signer.address) });
    const receipt = await tx.wait();
    if (assuranceLevel === "HIGH") {
      await logEvent({ employeeId: req.erpUser.employee_id, action: "HIGH_ASSURANCE_CUSTODY_PROPOSED", targetId: `ASSET-${assetId}`, result: "PENDING", reason: `Awaiting independent security approval for ${displayDid(newOwnerDid)}`, visibility: "AUDIT_ONLY" });
      return res.json({ assetId, status: "PENDING_SECOND_APPROVAL", custodian: displayDid(newOwnerDid), blockNumber: receipt.blockNumber, message: "High-assurance custody handover is awaiting an independent security approval." });
    }
    await run("UPDATE assets_meta SET current_owner_did = ? WHERE asset_id = ?", [newOwnerDid, assetId]);
    await logEvent({ employeeId: req.erpUser.employee_id, action: "ASSET_CUSTODY_TRANSFERRED", targetId: `ASSET-${assetId}`, result: "SUCCESS", reason: `Custody approved for ${displayDid(newOwnerDid)}`, visibility: "AUDIT_ONLY" });
    res.json({ assetId, status: "CONFIRMED", custodian: displayDid(newOwnerDid), blockNumber: receipt.blockNumber, message: "Custody transfer is confirmed and recorded on the blockchain." });
  } catch (err) { res.status(400).json({ error: err.reason || err.message }); }
});

router.post("/asset-passports/:assetId/approve-high-assurance", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ASSET_CUSTODY_APPROVER") return res.status(403).json({ error: "Independent security-approver permission required." });
  try {
    const assetId = Number(req.params.assetId); const signer = personas.SHARMA.signer;
    const contract = getContract("AssetRegistry", signer);
    const tx = await contract.approveHighAssuranceTransfer(assetId, { nonce: await getLatestNonce(signer.address) }); const receipt = await tx.wait();
    const asset = await contract.getAsset(assetId); await run("UPDATE assets_meta SET current_owner_did = ? WHERE asset_id = ?", [asset[2], assetId]);
    await logEvent({ employeeId: req.erpUser.employee_id, action: "HIGH_ASSURANCE_CUSTODY_APPROVED", targetId: `ASSET-${assetId}`, result: "SUCCESS", reason: "Independent security approval recorded on-chain", visibility: "AUDIT_ONLY" });
    res.json({ assetId, blockNumber: receipt.blockNumber, message: "Independent approval completed the custody handover." });
  } catch (err) { res.status(400).json({ error: err.reason || err.message }); }
});

router.post("/asset-passports/:assetId/service", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const reference = String(req.body?.serviceReference || "").trim(); if (!reference) return res.status(400).json({ error: "Enter a service completion reference." });
  try { const signer = personas.ADMIN.signer; const tx = await getContract("AssetRegistry", signer).recordService(Number(req.params.assetId), reference, { nonce: await getLatestNonce(signer.address) }); const receipt = await tx.wait(); await logEvent({ employeeId: req.erpUser.employee_id, action: "ASSET_SERVICE_RECORDED", targetId: `ASSET-${req.params.assetId}`, result: "SUCCESS", reason: reference, visibility: "AUDIT_ONLY" }); res.json({ blockNumber: receipt.blockNumber, message: "Asset service event recorded on-chain." }); } catch (err) { res.status(400).json({ error: err.reason || err.message }); }
});

router.post("/asset-passports/:assetId/retire", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  try { const signer = personas.ADMIN.signer; const tx = await getContract("AssetRegistry", signer).retireAsset(Number(req.params.assetId), { nonce: await getLatestNonce(signer.address) }); const receipt = await tx.wait(); await run("UPDATE assets_meta SET status = 'RETIRED' WHERE asset_id = ?", [Number(req.params.assetId)]); await logEvent({ employeeId: req.erpUser.employee_id, action: "ASSET_RETIRED", targetId: `ASSET-${req.params.assetId}`, result: "SUCCESS", reason: "Asset lifecycle closure", visibility: "AUDIT_ONLY" }); res.json({ blockNumber: receipt.blockNumber, message: "Asset retired and preserved in its ownership history." }); } catch (err) { res.status(400).json({ error: err.reason || err.message }); }
});

router.get("/asset-passport-custodians", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  try {
    const identities = await getContract("IdentityRegistry").getAllIdentities();
    res.json({ custodians: identities.map((identity) => ({ did: identity.did, label: `${displayDid(identity.did)} · ${identity.role}` })) });
  } catch (err) { res.status(503).json({ error: err.message }); }
});

router.post("/blockchain/rebuild-index", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  try {
    const result = await rebuildIndexFromChain();
    await logEvent({ employeeId: req.erpUser.employee_id, action: "AUDIT_INDEX_REBUILT", targetId: "BLOCKCHAIN_AUDIT_INDEX", result: "SUCCESS", reason: "Reconstructed from contract events", visibility: "AUDIT_ONLY" });
    res.json({ ...result, message: "Audit evidence was rebuilt from blockchain events." });
  } catch (err) { res.status(503).json({ error: `Audit reconstruction could not be completed: ${err.message}` }); }
});

router.get("/identity-assertion", requireSession, async (req, res) => {
  const roleDid = {
    ERP_ADMIN: `did:bel:${personas.ADMIN.address.toLowerCase()}`,
    ENGINEERING_OFFICER: `did:bel:${personas.SHARMA.address.toLowerCase()}`,
    ASSET_CUSTODY_APPROVER: `did:bel:${personas.VERMA.address.toLowerCase()}`,
  }[req.erpUser.role_key];
  let blockchainVerified = false;
  try { blockchainVerified = Boolean(roleDid && await getContract("IdentityRegistry").isRegistered(roleDid)); } catch {}
  res.json({
    assertion: {
      verified: true,
      blockchainVerified,
      disclosedClaims: { role: req.erpUser.role_name, unit: req.erpUser.unit_name, accessLevel: req.erpUser.access_level },
      hiddenClaims: ["Full name", "Employee ID", "Email address", "Wallet address", "Document fingerprints"],
      message: "Only the minimum claims required for an authorisation decision are disclosed.",
    },
  });
});

router.get("/security-alerts", requireSession, async (req, res) => {
  if (!["ERP_ADMIN", "INTERNAL_AUDITOR", "COMPLIANCE_OFFICER", "ASSET_CUSTODY_APPROVER"].includes(req.erpUser.role_key)) return res.status(403).json({ error: "Security-signal access is not assigned to this role." });
  const alerts = await all(`SELECT a.alert_id AS alertId, a.alert_type AS alertType, a.severity, a.status, a.evidence_count AS evidenceCount, a.summary, a.created_at AS createdAt, u.full_name AS employeeName
    FROM erp_security_alerts a LEFT JOIN erp_users u ON u.employee_id = a.employee_id ORDER BY a.updated_at DESC`);
  res.json({ alerts });
});

router.post("/security-alerts/drill", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const timestamp = now();
  const alertId = `DRILL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await run("INSERT INTO erp_security_alerts (alert_id, employee_id, alert_type, severity, evidence_count, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [alertId, req.erpUser.employee_id, "SIMULATED_SECURITY_DRILL", "LOW", 3, "Safe demonstration signal: repeated denied-access pattern. No production transaction was created.", timestamp, timestamp]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: "SECURITY_DRILL_RUN", targetId: alertId, result: "SUCCESS", reason: "Safe judge demonstration", visibility: "AUDIT_ONLY" });
  res.status(201).json({ alertId, message: "Safe security drill added to the demonstration queue." });
});

router.post("/security-alerts/:alertId/review", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const result = await run("UPDATE erp_security_alerts SET status = 'REVIEWED', updated_at = ? WHERE alert_id = ?", [now(), req.params.alertId]);
  if (!result.changes) return res.status(404).json({ error: "Security signal not found." });
  await logEvent({ employeeId: req.erpUser.employee_id, action: "SECURITY_SIGNAL_REVIEWED", targetId: req.params.alertId, result: "SUCCESS", reason: "Administrator reviewed security signal", visibility: "AUDIT_ONLY" });
  res.json({ alertId: req.params.alertId, status: "REVIEWED" });
});

router.get("/records/:module", requireSession, async (req, res) => {
  const workspaces = await workspacesFor(req.erpUser);
  const workspace = activeWorkspace(workspaces, req.query.departmentId);
  const module = req.params.module;
  if (!workspace.modules.includes(module) && req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "This module is not authorized for the selected workspace." });
  let records;
  if (req.erpUser.role_key === "ERP_ADMIN") records = await all("SELECT record_id AS recordId, module, title, status, amount, created_at AS createdAt FROM erp_records ORDER BY updated_at DESC LIMIT 50");
  else records = await all("SELECT record_id AS recordId, module, title, status, amount, created_at AS createdAt FROM erp_records WHERE module = ? AND unit_id = ? AND department_id = ? AND sbu_id = ? ORDER BY updated_at DESC LIMIT 50", [module, workspace.unitId, workspace.departmentId, workspace.sbuId]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: "DATA_VIEWED", unitId: workspace.unitId, departmentId: workspace.departmentId, sbuId: workspace.sbuId, targetId: module, result: "SUCCESS", reason: "Authorized module view", visibility: "DEPARTMENT_ONLY" });
  res.json({ workspace, records });
});

router.get("/access-requests", requireSession, async (req, res) => {
  const isAdmin = req.erpUser.role_key === "ERP_ADMIN";
  const rows = await all(`SELECT r.*, e.full_name AS employee_name, pd.name AS primary_department, td.name AS target_department,
    u.name AS unit_name, s.name AS sbu_name FROM erp_access_requests r
    JOIN erp_users e ON e.employee_id = r.employee_id
    JOIN erp_departments pd ON pd.id = e.primary_department_id
    JOIN erp_departments td ON td.id = r.target_department_id
    JOIN erp_units u ON u.id = r.target_unit_id JOIN erp_sbus s ON s.id = r.target_sbu_id
    ${isAdmin ? "" : "WHERE r.employee_id = ?"} ORDER BY r.updated_at DESC`, isAdmin ? [] : [req.erpUser.employee_id]);
  res.json({ requests: rows });
});

router.post("/access-requests", requireSession, async (req, res) => {
  const { targetUnitId, targetDepartmentId, targetSbuId, requestedModule, requestedPermission, businessReason, missionPurpose, durationDays = 30, priority = "NORMAL", accessMode = "STANDARD" } = req.body || {};
  const purpose = String(missionPurpose || businessReason || "").trim();
  const allowedPriorities = ["NORMAL", "URGENT"];
  const allowedModes = ["STANDARD", "EMERGENCY"];
  if (!targetUnitId || !targetDepartmentId || !targetSbuId || !requestedModule || !requestedPermission || !purpose) return res.status(400).json({ error: "Complete all access-request fields, including the work purpose." });
  if (!allowedPriorities.includes(priority) || !allowedModes.includes(accessMode)) return res.status(400).json({ error: "Choose a valid priority and access mode." });
  const timestamp = now();
  const requestId = `IAR-2026-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const maximumDays = accessMode === "EMERGENCY" ? 1 : 90;
  const safeDurationDays = Math.max(1, Math.min(Number(durationDays) || 1, maximumDays));
  await run(`INSERT INTO erp_access_requests
    (request_id, employee_id, target_unit_id, target_department_id, target_sbu_id, requested_module, requested_permission, business_reason, priority, access_mode, start_date, end_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [requestId, req.erpUser.employee_id, targetUnitId, targetDepartmentId, targetSbuId, requestedModule, requestedPermission, purpose, priority, accessMode, timestamp, timestamp + safeDurationDays * 86400, timestamp, timestamp]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: accessMode === "EMERGENCY" ? "EMERGENCY_ACCESS_REQUESTED" : "PURPOSE_BASED_ACCESS_REQUESTED", unitId: targetUnitId, departmentId: targetDepartmentId, sbuId: targetSbuId, targetId: requestId, result: "PENDING", reason: purpose });
  res.status(201).json({ requestId, status: "PENDING", expiresAt: timestamp + safeDurationDays * 86400 });
});

router.post("/access-requests/:requestId/:decision", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const decision = req.params.decision.toLowerCase();
  const status = decision === "approve" ? "APPROVED" : decision === "revoke" ? "REVOKED" : "REJECTED";
  const approvalNote = String(req.body?.approvalNote || "").trim();
  const request = await get("SELECT * FROM erp_access_requests WHERE request_id = ?", [req.params.requestId]);
  if (!request) return res.status(404).json({ error: "Access request not found." });
  await run("UPDATE erp_access_requests SET status = ?, approved_by = ?, approval_note = ?, updated_at = ? WHERE request_id = ?", [status, req.erpUser.employee_id, approvalNote || "Administrator decision", now(), request.request_id]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: `INTERDEPARTMENT_ACCESS_${status}`, unitId: request.target_unit_id, departmentId: request.target_department_id, sbuId: request.target_sbu_id, targetId: request.request_id, result: "SUCCESS", reason: approvalNote || "Administrator decision", visibility: "AUDIT_ONLY" });
  res.json({ requestId: request.request_id, status });
});

const GUIDE_VERSION = "1.1";

function guideProgressResponse(row) {
  return {
    tourVersion: GUIDE_VERSION,
    status: row?.status || "NOT_STARTED",
    currentStep: row?.current_step || 0,
    lastViewedStep: row?.last_viewed_step || 0,
    startedAt: row?.started_at || null,
    completedAt: row?.completed_at || null,
  };
}

router.get("/guide/progress", requireSession, async (req, res) => {
  const progress = await get("SELECT * FROM erp_guide_progress WHERE employee_id = ? AND tour_version = ?", [req.erpUser.employee_id, GUIDE_VERSION]);
  res.json(guideProgressResponse(progress));
});

router.put("/guide/progress", requireSession, async (req, res) => {
  const requestedStatus = req.body?.status;
  const status = ["IN_PROGRESS", "COMPLETED"].includes(requestedStatus) ? requestedStatus : null;
  const currentStep = Math.max(0, Math.min(100, Number(req.body?.currentStep) || 0));
  const lastViewedStep = Math.max(0, Math.min(100, Number(req.body?.lastViewedStep) || 0));
  if (!status) return res.status(400).json({ error: "Use an allowed onboarding status." });
  const timestamp = now();
  await run(`INSERT INTO erp_guide_progress
    (employee_id, tour_version, status, current_step, last_viewed_step, started_at, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, tour_version) DO UPDATE SET
      status = excluded.status, current_step = excluded.current_step, last_viewed_step = excluded.last_viewed_step,
      started_at = COALESCE(erp_guide_progress.started_at, excluded.started_at),
      completed_at = CASE WHEN excluded.status = 'COMPLETED' THEN excluded.completed_at ELSE erp_guide_progress.completed_at END,
      updated_at = excluded.updated_at`,
  [req.erpUser.employee_id, GUIDE_VERSION, status, currentStep, lastViewedStep, timestamp, status === "COMPLETED" ? timestamp : null, timestamp]);
  const progress = await get("SELECT * FROM erp_guide_progress WHERE employee_id = ? AND tour_version = ?", [req.erpUser.employee_id, GUIDE_VERSION]);
  res.json(guideProgressResponse(progress));
});

router.get("/guide/stats", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const rows = await all("SELECT status, COUNT(*) AS count FROM erp_guide_progress WHERE tour_version = ? GROUP BY status", [GUIDE_VERSION]);
  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  const users = await get("SELECT COUNT(*) AS count FROM erp_users WHERE account_type = 'EMPLOYEE' AND employment_status = 'ACTIVE'");
  res.json({ tourVersion: GUIDE_VERSION, completed: counts.COMPLETED || 0, inProgress: counts.IN_PROGRESS || 0, notStarted: Math.max(0, Number(users?.count || 0) - (counts.COMPLETED || 0) - (counts.IN_PROGRESS || 0)) });
});

router.get("/audit", requireSession, async (req, res) => {
  const isAdminOrAuditor = ["ERP_ADMIN", "INTERNAL_AUDITOR", "COMPLIANCE_OFFICER"].includes(req.erpUser.role_key);
  const rows = await all(`SELECT audit_id AS auditId, employee_id AS employeeId, action, unit_id AS unitId, department_id AS departmentId,
    sbu_id AS sbuId, target_id AS targetId, result, reason, visibility, created_at AS createdAt
    FROM erp_audit_logs ${isAdminOrAuditor ? "" : "WHERE employee_id = ?"} ORDER BY created_at DESC LIMIT 100`, isAdminOrAuditor ? [] : [req.erpUser.employee_id]);
  res.json({ logs: rows, scope: isAdminOrAuditor ? "AUDIT ACCESS" : "PERSONAL ACTIVITY" });
});

module.exports = router;
