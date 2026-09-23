const express = require("express");
const crypto = require("crypto");
const { all, get, run } = require("../db");
const { getContract, provider } = require("../blockchain");

const router = express.Router();
const sessions = new Map();
const SESSION_TTL_SECONDS = 30 * 60;

const MODULES_BY_ROLE = {
  ERP_ADMIN: ["dashboard", "procurement", "finance", "inventory", "production", "quality", "engineering", "logistics", "access-control", "organization", "users", "audit", "reports", "blockchain", "profile"],
  PROCUREMENT_OFFICER: ["dashboard", "procurement", "vendors", "access-control", "notifications", "profile"],
  FINANCE_OFFICER: ["dashboard", "finance", "access-control", "reports", "profile"],
  PRODUCTION_MANAGER: ["dashboard", "production", "inventory", "quality", "profile"],
  QUALITY_OFFICER: ["dashboard", "quality", "profile"],
  ENGINEERING_OFFICER: ["dashboard", "engineering", "projects", "profile"],
  LOGISTICS_OFFICER: ["dashboard", "logistics", "inventory", "profile"],
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
  organization: "Organization Masters", users: "Users & Permissions", notifications: "Notifications", blockchain: "Blockchain Registry", profile: "My Profile",
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
  const records = await all("SELECT module, COUNT(*) AS count FROM erp_records WHERE department_id = ? AND unit_id = ? AND sbu_id = ? GROUP BY module", [workspace.departmentId, workspace.unitId, workspace.sbuId]);
  const recent = await all("SELECT audit_id AS auditId, action, target_id AS targetId, result, created_at AS createdAt FROM erp_audit_logs WHERE employee_id = ? ORDER BY created_at DESC LIMIT 8", [req.erpUser.employee_id]);
  res.json({ workspace, modules: workspace.modules.map((id) => ({ id, label: MODULE_LABELS[id] || id })), counts: records, recentActivity: recent });
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
  const { targetUnitId, targetDepartmentId, targetSbuId, requestedModule, requestedPermission, businessReason, durationDays = 30 } = req.body || {};
  if (!targetUnitId || !targetDepartmentId || !targetSbuId || !requestedModule || !requestedPermission || !businessReason) return res.status(400).json({ error: "Complete all access-request fields." });
  const timestamp = now();
  const requestId = `IAR-2026-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  await run(`INSERT INTO erp_access_requests
    (request_id, employee_id, target_unit_id, target_department_id, target_sbu_id, requested_module, requested_permission, business_reason, start_date, end_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [requestId, req.erpUser.employee_id, targetUnitId, targetDepartmentId, targetSbuId, requestedModule, requestedPermission, businessReason, timestamp, timestamp + Math.min(Number(durationDays), 90) * 86400, timestamp, timestamp]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: "INTERDEPARTMENT_ACCESS_REQUESTED", unitId: targetUnitId, departmentId: targetDepartmentId, sbuId: targetSbuId, targetId: requestId, result: "PENDING", reason: businessReason });
  res.status(201).json({ requestId, status: "PENDING" });
});

router.post("/access-requests/:requestId/:decision", requireSession, async (req, res) => {
  if (req.erpUser.role_key !== "ERP_ADMIN") return res.status(403).json({ error: "Administrator permission required." });
  const decision = req.params.decision.toLowerCase();
  const status = decision === "approve" ? "APPROVED" : decision === "revoke" ? "REVOKED" : "REJECTED";
  const request = await get("SELECT * FROM erp_access_requests WHERE request_id = ?", [req.params.requestId]);
  if (!request) return res.status(404).json({ error: "Access request not found." });
  await run("UPDATE erp_access_requests SET status = ?, approved_by = ?, updated_at = ? WHERE request_id = ?", [status, req.erpUser.employee_id, now(), request.request_id]);
  await logEvent({ employeeId: req.erpUser.employee_id, action: `INTERDEPARTMENT_ACCESS_${status}`, unitId: request.target_unit_id, departmentId: request.target_department_id, sbuId: request.target_sbu_id, targetId: request.request_id, result: "SUCCESS", reason: "Administrator decision", visibility: "AUDIT_ONLY" });
  res.json({ requestId: request.request_id, status });
});

const GUIDE_VERSION = "1.0";

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
