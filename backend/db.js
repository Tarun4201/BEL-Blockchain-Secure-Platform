const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const TURSO_URL = process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith("libsql:") || process.env.DATABASE_URL.startsWith("https:")) ? process.env.DATABASE_URL : null);
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || null;

let libsqlClient = null;
let sqliteDb = null;

// Local development keeps the database beside the backend. Hosted deployments
// may instead point this at a mounted disk with BEL_DB_PATH or a managed libSQL database.
const DB_PATH = process.env.BEL_DB_PATH || process.env.SQLITE_PATH || process.env.DATABASE_PATH || path.join(__dirname, "bel_platform.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

if (TURSO_URL) {
  try {
    const { createClient } = require("@libsql/client");
    libsqlClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
    console.log("✓ Connected to persistent cloud database (Turso / libSQL):", TURSO_URL.replace(/:[^:@]+@/, ":***@"));
  } catch (err) {
    console.warn("Could not initialize libSQL client, falling back to SQLite:", err.message);
  }
}

if (!libsqlClient) {
  const sqlite3 = require("sqlite3").verbose();
  sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error("Error opening SQLite database:", err.message);
    } else {
      console.log("Connected to SQLite database at:", DB_PATH);
    }
  });
}

// Wrap database operations in clean async/await functions
function run(sql, params = []) {
  if (libsqlClient) {
    return libsqlClient.execute({ sql, args: params }).then((res) => ({
      lastID: Number(res.lastInsertRowid || 0),
      changes: res.rowsAffected || 0,
    }));
  }
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  if (libsqlClient) {
    return libsqlClient.execute({ sql, args: params }).then((res) => {
      if (!res.rows || res.rows.length === 0) return null;
      return res.rows[0];
    });
  }
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  if (libsqlClient) {
    return libsqlClient.execute({ sql, args: params }).then((res) => res.rows || []);
  }
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Initialize all database tables if they do not exist
 */
async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      did TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL,
      wallet_address TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS resources_meta (
      resource_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      location TEXT,
      sensitivity_label TEXT NOT NULL,
      document_filename TEXT,
      document_hash TEXT NOT NULL,
      gated_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS assets_meta (
      asset_id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      image_url TEXT,
      document_filename TEXT,
      document_hash TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      current_owner_did TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      actor_did TEXT,
      target_id TEXT,
      details TEXT,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tx_hash, event_type, target_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS erp_units (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_departments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category_note TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_sbus (
      id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE'
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL,
      official_email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, account_type TEXT NOT NULL DEFAULT 'EMPLOYEE',
      unit_id TEXT NOT NULL, primary_department_id TEXT NOT NULL, primary_sbu_id TEXT NOT NULL,
      role_key TEXT NOT NULL, role_name TEXT NOT NULL, employment_status TEXT NOT NULL DEFAULT 'ACTIVE',
      access_level TEXT NOT NULL DEFAULT 'STANDARD', mfa_enabled INTEGER NOT NULL DEFAULT 0,
      wallet_address TEXT, wallet_verified_at INTEGER, last_login INTEGER, created_at INTEGER NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT UNIQUE NOT NULL, employee_id TEXT NOT NULL,
      target_unit_id TEXT NOT NULL, target_department_id TEXT NOT NULL, target_sbu_id TEXT NOT NULL,
      requested_module TEXT NOT NULL, requested_permission TEXT NOT NULL, business_reason TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL', access_mode TEXT NOT NULL DEFAULT 'STANDARD', approval_note TEXT,
      start_date INTEGER NOT NULL, end_date INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
      approved_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )
  `);

  // Existing demo databases predate purpose-based access. Keep their data and
  // add the fields safely instead of requiring a destructive reset.
  for (const [column, definition] of [
    ["priority", "TEXT NOT NULL DEFAULT 'NORMAL'"],
    ["access_mode", "TEXT NOT NULL DEFAULT 'STANDARD'"],
    ["approval_note", "TEXT"],
  ]) {
    try { await run(`ALTER TABLE erp_access_requests ADD COLUMN ${column} ${definition}`); }
    catch (err) { if (!String(err.message).includes("duplicate column name")) throw err; }
  }
  for (const [column, definition] of [["wallet_address", "TEXT"], ["wallet_verified_at", "INTEGER"]]) {
    try { await run(`ALTER TABLE erp_users ADD COLUMN ${column} ${definition}`); }
    catch (err) { if (!String(err.message).includes("duplicate column name")) throw err; }
  }
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_users_wallet_address ON erp_users(wallet_address) WHERE wallet_address IS NOT NULL");
  await run(`
    CREATE TABLE IF NOT EXISTS erp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT UNIQUE NOT NULL, module TEXT NOT NULL,
      title TEXT NOT NULL, status TEXT NOT NULL, unit_id TEXT NOT NULL, department_id TEXT NOT NULL,
      sbu_id TEXT NOT NULL, owner_employee_id TEXT, related_record_id TEXT, amount REAL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_projects (
      project_id TEXT PRIMARY KEY, project_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      status TEXT NOT NULL, phase TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0,
      unit_id TEXT NOT NULL, department_id TEXT NOT NULL, sbu_id TEXT NOT NULL,
      lead_employee_id TEXT NOT NULL, summary TEXT NOT NULL, updated_at INTEGER NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_project_assignments (
      assignment_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, employee_id TEXT NOT NULL,
      relationship TEXT NOT NULL, workstream TEXT NOT NULL, task_title TEXT NOT NULL,
      task_status TEXT NOT NULL, access_level TEXT NOT NULL, grant_status TEXT NOT NULL,
      valid_until INTEGER, updated_at INTEGER NOT NULL,
      UNIQUE(project_id, employee_id, task_title)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, audit_id TEXT UNIQUE NOT NULL, employee_id TEXT,
      action TEXT NOT NULL, unit_id TEXT, department_id TEXT, sbu_id TEXT, target_id TEXT,
      result TEXT NOT NULL, reason TEXT, visibility TEXT NOT NULL DEFAULT 'AUTHORIZED_DEPARTMENTS',
      created_at INTEGER NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_guide_progress (
      employee_id TEXT NOT NULL,
      tour_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      current_step INTEGER NOT NULL DEFAULT 0,
      last_viewed_step INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (employee_id, tour_version)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS erp_security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, alert_id TEXT UNIQUE NOT NULL, employee_id TEXT,
      alert_type TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN',
      evidence_count INTEGER NOT NULL DEFAULT 1, summary TEXT NOT NULL, created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await seedErpDemo();

  console.log("✓ Database tables initialized.");
}

/**
 * Drops all tables and recreates them cleanly for reset-demo
 */
async function resetDb() {
  await run("DROP TABLE IF EXISTS users");
  await run("DROP TABLE IF EXISTS resources_meta");
  await run("DROP TABLE IF EXISTS assets_meta");
  await run("DROP TABLE IF EXISTS audit_index");
  await run("DROP TABLE IF EXISTS erp_units");
  await run("DROP TABLE IF EXISTS erp_departments");
  await run("DROP TABLE IF EXISTS erp_sbus");
  await run("DROP TABLE IF EXISTS erp_users");
  await run("DROP TABLE IF EXISTS erp_access_requests");
  await run("DROP TABLE IF EXISTS erp_records");
  await run("DROP TABLE IF EXISTS erp_project_assignments");
  await run("DROP TABLE IF EXISTS erp_projects");
  await run("DROP TABLE IF EXISTS erp_audit_logs");
  await run("DROP TABLE IF EXISTS erp_guide_progress");
  await run("DROP TABLE IF EXISTS erp_security_alerts");
  await initDb();
  console.log("✓ Database reset cleanly.");
}

const demoPasswordHash = crypto.createHash("sha256").update("123").digest("hex");

async function seedErpDemo() {
  const now = Math.floor(Date.now() / 1000);
  const units = ["Bengaluru", "Chennai", "Ghaziabad", "Hyderabad", "Kotdwara", "Machilipatnam", "Navi Mumbai", "Panchkula", "Pune"];
  const departments = [
    ["FINANCE", "Finance & Accounts"], ["HR", "Human Resources / Personnel"], ["PROCUREMENT", "Procurement / Materials Management"],
    ["PRODUCTION", "Production / Manufacturing"], ["QUALITY", "Quality"], ["ENGINEERING", "Research & Development / Engineering"],
    ["PROJECTS", "Project Management"], ["SALES", "Marketing / Sales"], ["IT", "Information Technology"],
    ["LOGISTICS", "Logistics / Supply Chain"], ["CONTRACTS", "Contracts / Commercial"], ["LEGAL", "Legal / Corporate Affairs"],
    ["VIGILANCE", "Vigilance"], ["INTERNAL_AUDIT", "Internal Audit"], ["SECURITY", "Administration / Security"],
    ["SUPPORT", "Customer / Product Support"], ["EXPORT", "Export / International Business"],
  ];
  const sbus = [
    ["BENGALURU_SOFTWARE", "Bengaluru", "Software"], ["BENGALURU_EXPORT", "Bengaluru", "Export Manufacturing"],
    ["BENGALURU_SEEKER", "Bengaluru", "Seeker (RF&IR)"], ["BENGALURU_NAVAL", "Bengaluru", "Naval Systems – Sonar & Communications Systems"],
    ["BENGALURU_EW", "Bengaluru", "Electronic Warfare & Avionics"], ["CORPORATE", "Bengaluru", "Corporate"],
  ];
  for (const name of units) await run("INSERT OR IGNORE INTO erp_units (id, name) VALUES (?, ?)", [name.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name]);
  for (const [id, name] of departments) await run("INSERT OR IGNORE INTO erp_departments (id, name, category_note) VALUES (?, ?, ?)", [id, name, "ERP functional category — fictional demo master"]);
  for (const [id, unit, name] of sbus) await run("INSERT OR IGNORE INTO erp_sbus (id, unit_id, name) VALUES (?, ?, ?)", [id, unit.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name]);

  const users = [
    ["BEL-EMP-1001", "Aarav Mehta", "aarav.mehta@demo.bel", "EMPLOYEE", "BENGALURU", "PROCUREMENT", "BENGALURU_SOFTWARE", "PROCUREMENT_OFFICER", "Procurement Officer"],
    ["BEL-EMP-1002", "Priya Menon", "priya.menon@demo.bel", "EMPLOYEE", "BENGALURU", "FINANCE", "BENGALURU_SOFTWARE", "FINANCE_OFFICER", "Finance Officer"],
    ["BEL-EMP-1003", "Karthik Iyer", "karthik.iyer@demo.bel", "EMPLOYEE", "BENGALURU", "PRODUCTION", "BENGALURU_NAVAL", "PRODUCTION_MANAGER", "Production Manager"],
    ["BEL-EMP-1004", "Ananya Sharma", "ananya.sharma@demo.bel", "EMPLOYEE", "BENGALURU", "QUALITY", "BENGALURU_NAVAL", "QUALITY_OFFICER", "Quality Officer"],
    ["BEL-EMP-1005", "Rahul Nair", "rahul.nair@demo.bel", "EMPLOYEE", "BENGALURU", "ENGINEERING", "BENGALURU_SOFTWARE", "ENGINEERING_OFFICER", "R&D Engineer"],
    ["BEL-EMP-1006", "Vikram Rao", "vikram.rao@demo.bel", "EMPLOYEE", "BENGALURU", "LOGISTICS", "BENGALURU_EXPORT", "LOGISTICS_OFFICER", "Logistics Officer"],
    ["BEL-EMP-1007", "Sneha Kapoor", "sneha.kapoor@demo.bel", "EMPLOYEE", "BENGALURU", "HR", "CORPORATE", "HR_OFFICER", "HR Officer"],
    ["BEL-EMP-1008", "Arjun Menon", "arjun.menon@demo.bel", "EMPLOYEE", "BENGALURU", "VIGILANCE", "CORPORATE", "COMPLIANCE_OFFICER", "Compliance / Vigilance Officer"],
    ["BEL-EMP-1009", "Neha Iyer", "neha.iyer@demo.bel", "EMPLOYEE", "BENGALURU", "INTERNAL_AUDIT", "CORPORATE", "INTERNAL_AUDITOR", "Internal Auditor"],
    ["BEL-EMP-1010", "Rohan Sharma", "rohan.sharma@demo.bel", "EMPLOYEE", "BENGALURU", "IT", "CORPORATE", "ERP_ADMIN", "ERP Administrator"],
    ["BEL-EMP-1011", "Kavya Rao", "kavya.rao@demo.bel", "EMPLOYEE", "BENGALURU", "SECURITY", "CORPORATE", "ASSET_CUSTODY_APPROVER", "Asset Custody Security Approver"],
    ["BEL-EMP-1012", "Meera Krishnan", "meera.krishnan@demo.bel", "EMPLOYEE", "BENGALURU", "PROCUREMENT", "BENGALURU_SOFTWARE", "PROCUREMENT_OFFICER", "Procurement Officer"],
    ["BEL-EMP-1013", "Aditya Kulkarni", "aditya.kulkarni@demo.bel", "EMPLOYEE", "BENGALURU", "FINANCE", "BENGALURU_SOFTWARE", "FINANCE_OFFICER", "Finance Officer"],
    ["BEL-EMP-1014", "Sonal Deshmukh", "sonal.deshmukh@demo.bel", "EMPLOYEE", "BENGALURU", "PRODUCTION", "BENGALURU_NAVAL", "PRODUCTION_MANAGER", "Production Manager"],
    ["BEL-EMP-1015", "Ishaan Bhat", "ishaan.bhat@demo.bel", "EMPLOYEE", "BENGALURU", "QUALITY", "BENGALURU_NAVAL", "QUALITY_OFFICER", "Quality Officer"],
    ["BEL-EMP-1016", "Divya Joseph", "divya.joseph@demo.bel", "EMPLOYEE", "BENGALURU", "ENGINEERING", "BENGALURU_SOFTWARE", "ENGINEERING_OFFICER", "R&D Engineer"],
    ["BEL-EMP-1017", "Nitin Gupta", "nitin.gupta@demo.bel", "EMPLOYEE", "BENGALURU", "LOGISTICS", "BENGALURU_EXPORT", "LOGISTICS_OFFICER", "Logistics Officer"],
    ["BEL-EMP-1018", "Farah Khan", "farah.khan@demo.bel", "EMPLOYEE", "BENGALURU", "HR", "CORPORATE", "HR_OFFICER", "HR Officer"],
    ["BEL-EMP-1019", "Arvind Patel", "arvind.patel@demo.bel", "EMPLOYEE", "BENGALURU", "VIGILANCE", "CORPORATE", "COMPLIANCE_OFFICER", "Compliance / Vigilance Officer"],
    ["BEL-EMP-1020", "Tanvi Bose", "tanvi.bose@demo.bel", "EMPLOYEE", "BENGALURU", "INTERNAL_AUDIT", "CORPORATE", "INTERNAL_AUDITOR", "Internal Auditor"],
    ["BEL-EMP-1021", "Suresh Iyer", "suresh.iyer@demo.bel", "EMPLOYEE", "BENGALURU", "SECURITY", "CORPORATE", "ASSET_CUSTODY_APPROVER", "Asset Custody Security Approver"],
    ["VEN-0001", "NovaTech Components Pvt. Ltd.", "portal@novatech.demo", "VENDOR", "BENGALURU", "PROCUREMENT", "BENGALURU_SOFTWARE", "VENDOR", "Approved Vendor"],
    ["CUS-0001", "Defence Systems Demo Client", "client@defence-demo.example", "CUSTOMER", "BENGALURU", "SALES", "CORPORATE", "CUSTOMER", "Customer / Government Client"],
  ];
  for (const user of users) {
    await run(`INSERT OR IGNORE INTO erp_users
      (employee_id, full_name, official_email, password_hash, account_type, unit_id, primary_department_id, primary_sbu_id, role_key, role_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...user.slice(0, 3), demoPasswordHash, ...user.slice(3), now]);
  }

  const recordSets = [
    ["procurement", "PROCUREMENT", "BENGALURU_SOFTWARE", "PR", "Purchase Request", 20], ["procurement", "PROCUREMENT", "BENGALURU_SOFTWARE", "RFQ", "Request for Quotation", 15],
    ["procurement", "PROCUREMENT", "BENGALURU_SOFTWARE", "PO", "Purchase Order", 15], ["finance", "FINANCE", "BENGALURU_SOFTWARE", "INV", "Supplier Invoice", 20],
    ["inventory", "PROCUREMENT", "BENGALURU_SOFTWARE", "INVTX", "Inventory Transaction", 30], ["quality", "QUALITY", "BENGALURU_NAVAL", "QI", "Quality Inspection", 15],
    ["production", "PRODUCTION", "BENGALURU_NAVAL", "PROD", "Production Order", 10], ["engineering", "ENGINEERING", "BENGALURU_SOFTWARE", "PROJ", "Project", 10],
    ["logistics", "LOGISTICS", "BENGALURU_EXPORT", "SHIP", "Shipment", 24], ["projects", "ENGINEERING", "BENGALURU_SOFTWARE", "PM", "Engineering Project", 18],
    ["hr", "HR", "CORPORATE", "HRR", "Personnel Record", 16], ["compliance", "VIGILANCE", "CORPORATE", "CMP", "Compliance Review", 18],
    ["vendors", "PROCUREMENT", "BENGALURU_SOFTWARE", "VENR", "Vendor Qualification", 18], ["reports", "FINANCE", "BENGALURU_SOFTWARE", "RPT", "Management Report", 16],
    ["vendor-records", "PROCUREMENT", "BENGALURU_SOFTWARE", "VPO", "Vendor Order", 14], ["customer-records", "SALES", "CORPORATE", "CDL", "Customer Delivery", 14],
  ];
  for (const [module, department, sbu, prefix, title, count] of recordSets) {
    for (let i = 1; i <= count; i += 1) {
      const recordId = `${prefix}-2026-${String(i).padStart(4, "0")}`;
      await run(`INSERT OR IGNORE INTO erp_records
        (record_id, module, title, status, unit_id, department_id, sbu_id, owner_employee_id, amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordId, module, `${title} ${String(i).padStart(3, "0")} — DEMO`, i % 5 === 0 ? "UNDER REVIEW" : "APPROVED", "BENGALURU", department, sbu, "BEL-EMP-1001", 25000 + i * 1375, now - i * 86400, now - i * 3600]);
    }
  }
  // Project work is intentionally separated by function. These fictional records
  // let each demonstration account see its own deliverables, while the ERP
  // administrator receives a complete cross-project portfolio.
  const projects = [
    ["PRJ-SW-01", "SW-26-01", "Secure Data Link Prototype", "ON TRACK", "Design validation", 68, "ENGINEERING", "BENGALURU_SOFTWARE", "BEL-EMP-1005", "R&D prototype validation for a protected tactical data-link demonstrator."],
    ["PRJ-SW-02", "SW-26-02", "Mission Software Sustainment", "ON TRACK", "Integration", 54, "ENGINEERING", "BENGALURU_SOFTWARE", "BEL-EMP-1016", "Software sustainment and release-readiness workstream."],
    ["PRJ-PR-03", "PR-26-03", "Avionics Supplier Readiness", "AT RISK", "Sourcing", 41, "PROCUREMENT", "BENGALURU_SOFTWARE", "BEL-EMP-1001", "Qualification and commercial readiness for approved avionics suppliers."],
    ["PRJ-FI-04", "FI-26-04", "Export Cost Assurance", "ON TRACK", "Cost review", 72, "FINANCE", "BENGALURU_SOFTWARE", "BEL-EMP-1002", "Cost-control review for an export manufacturing delivery milestone."],
    ["PRJ-NV-05", "NV-26-05", "Naval Sonar Integration", "ON TRACK", "Build integration", 63, "PRODUCTION", "BENGALURU_NAVAL", "BEL-EMP-1003", "Manufacturing and assembly readiness for naval sonar integration."],
    ["PRJ-QA-06", "QA-26-06", "Naval Acceptance Traceability", "ON TRACK", "Acceptance test", 58, "QUALITY", "BENGALURU_NAVAL", "BEL-EMP-1004", "Quality evidence and acceptance traceability for the naval programme."],
    ["PRJ-LG-07", "LG-26-07", "Export Dispatch Readiness", "AWAITING APPROVAL", "Dispatch planning", 46, "LOGISTICS", "BENGALURU_EXPORT", "BEL-EMP-1006", "Controlled export dispatch, packing and logistics coordination."],
    ["PRJ-HR-08", "HR-26-08", "Engineering Skills Certification", "ON TRACK", "Certification review", 77, "HR", "CORPORATE", "BEL-EMP-1007", "Role certification and workforce readiness for the engineering organisation."],
    ["PRJ-CP-09", "CP-26-09", "Export Compliance Review", "UNDER REVIEW", "Regulatory review", 49, "VIGILANCE", "CORPORATE", "BEL-EMP-1008", "Compliance evidence review for controlled export activity."],
    ["PRJ-AU-10", "AU-26-10", "Quarterly Controls Assurance", "ON TRACK", "Evidence sampling", 61, "INTERNAL_AUDIT", "CORPORATE", "BEL-EMP-1009", "Independent audit of approvals, grants and protected evidence."],
    ["PRJ-CS-11", "CS-26-11", "Controlled Asset Custody", "ON TRACK", "Custody review", 52, "SECURITY", "CORPORATE", "BEL-EMP-1011", "Two-person controlled-asset custody review and attestation."],
    ["PRJ-VD-12", "VD-26-12", "Supplier Delivery Readiness", "ON TRACK", "Delivery evidence", 66, "PROCUREMENT", "BENGALURU_SOFTWARE", "VEN-0001", "Vendor delivery milestones and secure evidence submission."],
    ["PRJ-CU-13", "CU-26-13", "Customer Acceptance Readiness", "PLANNED", "Acceptance planning", 28, "SALES", "CORPORATE", "CUS-0001", "Customer delivery acceptance planning and approved status visibility."],
  ];
  for (const [projectId, projectCode, name, status, phase, progress, departmentId, sbuId, leadEmployeeId, summary] of projects) {
    await run(`INSERT OR IGNORE INTO erp_projects
      (project_id, project_code, name, status, phase, progress, unit_id, department_id, sbu_id, lead_employee_id, summary, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [projectId, projectCode, name, status, phase, progress, "BENGALURU", departmentId, sbuId, leadEmployeeId, summary, now - progress * 180]);
  }
  const projectAssignments = [
    ["ASN-001", "PRJ-SW-01", "BEL-EMP-1005", "PROJECT LEAD", "Prototype engineering", "Complete interface validation evidence", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-002", "PRJ-SW-01", "BEL-EMP-1016", "TECHNICAL CONTRIBUTOR", "Integration test", "Review secure-data-link integration findings", "READY FOR REVIEW", "VIEW", "GRANTED"],
    ["ASN-003", "PRJ-SW-02", "BEL-EMP-1016", "PROJECT LEAD", "Release readiness", "Prepare mission-software release checklist", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-004", "PRJ-PR-03", "BEL-EMP-1001", "PROJECT LEAD", "Supplier sourcing", "Approve avionics supplier evaluation pack", "AWAITING APPROVAL", "EDIT", "PRIMARY"],
    ["ASN-005", "PRJ-PR-03", "BEL-EMP-1012", "BUYER", "Supplier qualification", "Collect supplier quality observations", "IN PROGRESS", "VIEW", "PRIMARY"],
    ["ASN-006", "PRJ-FI-04", "BEL-EMP-1002", "COST CONTROLLER", "Cost review", "Reconcile export cost exception ledger", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-007", "PRJ-FI-04", "BEL-EMP-1013", "FINANCE ANALYST", "Invoice verification", "Verify milestone invoice supporting evidence", "READY FOR REVIEW", "VIEW", "PRIMARY"],
    ["ASN-008", "PRJ-NV-05", "BEL-EMP-1003", "PRODUCTION LEAD", "Build integration", "Release sonar assembly build package", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-009", "PRJ-NV-05", "BEL-EMP-1014", "PRODUCTION PLANNER", "Material staging", "Confirm production material staging", "ON TRACK", "VIEW", "PRIMARY"],
    ["ASN-010", "PRJ-QA-06", "BEL-EMP-1004", "QUALITY LEAD", "Acceptance test", "Approve acceptance traceability sample", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-011", "PRJ-QA-06", "BEL-EMP-1015", "QUALITY ENGINEER", "Test evidence", "Review nonconformance closure evidence", "READY FOR REVIEW", "VIEW", "PRIMARY"],
    ["ASN-012", "PRJ-LG-07", "BEL-EMP-1006", "LOGISTICS LEAD", "Dispatch planning", "Approve controlled dispatch plan", "AWAITING APPROVAL", "EDIT", "PRIMARY"],
    ["ASN-013", "PRJ-LG-07", "BEL-EMP-1017", "LOGISTICS COORDINATOR", "Freight documentation", "Resolve freight invoice exception", "BLOCKED", "VIEW", "PENDING"],
    ["ASN-014", "PRJ-HR-08", "BEL-EMP-1007", "HR LEAD", "Certification review", "Publish engineering certification readiness summary", "IN PROGRESS", "EDIT", "PRIMARY"],
    ["ASN-015", "PRJ-HR-08", "BEL-EMP-1018", "HR ANALYST", "Training evidence", "Validate competency record completeness", "READY FOR REVIEW", "VIEW", "PRIMARY"],
    ["ASN-016", "PRJ-CP-09", "BEL-EMP-1008", "COMPLIANCE LEAD", "Regulatory review", "Review controlled-export compliance checklist", "UNDER REVIEW", "EDIT", "PRIMARY"],
    ["ASN-017", "PRJ-CP-09", "BEL-EMP-1019", "COMPLIANCE ANALYST", "Evidence review", "Compile regulatory evidence exceptions", "IN PROGRESS", "VIEW", "PRIMARY"],
    ["ASN-018", "PRJ-AU-10", "BEL-EMP-1009", "AUDIT LEAD", "Evidence sampling", "Review approval and grant evidence sample", "IN PROGRESS", "AUDIT", "PRIMARY"],
    ["ASN-019", "PRJ-AU-10", "BEL-EMP-1020", "AUDIT ANALYST", "Controls testing", "Test time-bound grant expiry controls", "READY FOR REVIEW", "AUDIT", "GRANTED"],
    ["ASN-020", "PRJ-CS-11", "BEL-EMP-1011", "CUSTODY APPROVER", "Custody review", "Complete second-person custody attestation", "AWAITING APPROVAL", "APPROVE", "PRIMARY"],
    ["ASN-021", "PRJ-CS-11", "BEL-EMP-1021", "CUSTODY REVIEWER", "Asset review", "Validate custody condition evidence", "IN PROGRESS", "VIEW", "PRIMARY"],
    ["ASN-022", "PRJ-VD-12", "VEN-0001", "APPROVED VENDOR", "Delivery evidence", "Upload delivery readiness evidence", "IN PROGRESS", "CREATE", "PRIMARY"],
    ["ASN-023", "PRJ-CU-13", "CUS-0001", "CUSTOMER OBSERVER", "Acceptance planning", "Review approved acceptance milestone status", "PLANNED", "VIEW", "PRIMARY"],
  ];
  for (const [assignmentId, projectId, employeeId, relationship, workstream, taskTitle, taskStatus, accessLevel, grantStatus] of projectAssignments) {
    const expiresAt = grantStatus === "GRANTED" ? now + 14 * 86400 : grantStatus === "PENDING" ? null : now + 90 * 86400;
    await run(`INSERT OR IGNORE INTO erp_project_assignments
      (assignment_id, project_id, employee_id, relationship, workstream, task_title, task_status, access_level, grant_status, valid_until, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [assignmentId, projectId, employeeId, relationship, workstream, taskTitle, taskStatus, accessLevel, grantStatus, expiresAt, now - 3600]);
    await run(`INSERT OR IGNORE INTO erp_audit_logs
      (audit_id, employee_id, action, unit_id, department_id, sbu_id, target_id, result, reason, visibility, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [`AUD-ROLE-${assignmentId}`, employeeId, grantStatus === "PENDING" ? "ACCESS_REQUEST_SUBMITTED" : "PROJECT_TASK_ASSIGNED", "BENGALURU", null, null, projectId, grantStatus === "PENDING" ? "PENDING" : "SUCCESS", `${taskTitle} · ${workstream}`, "PERSONAL", now - Number(assignmentId.slice(-3)) * 900]);
  }
  for (const [projectId, projectCode, name, status, _phase, progress, departmentId, sbuId, leadEmployeeId] of projects) {
    await run(`INSERT OR IGNORE INTO erp_records
      (record_id, module, title, status, unit_id, department_id, sbu_id, owner_employee_id, related_record_id, amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [`${projectCode}-STATUS`, "projects", `${name} — ${status}`, status, "BENGALURU", departmentId, sbuId, leadEmployeeId, projectId, 100000 + progress * 1000, now - progress * 7200, now - progress * 180]);
  }
  const accessRequests = [
    ["IAR-2026-DEMO01", "BEL-EMP-1001", "FINANCE", "BENGALURU_SOFTWARE", "finance", "VIEW", "Invoice reconciliation support", "NORMAL", "STANDARD", "PENDING", null, null, 2],
    ["IAR-2026-DEMO02", "BEL-EMP-1005", "PROCUREMENT", "BENGALURU_SOFTWARE", "procurement", "VIEW", "Approved design procurement review", "URGENT", "STANDARD", "APPROVED", "BEL-EMP-1010", "Approved for the stated review period.", 4],
    ["IAR-2026-DEMO03", "BEL-EMP-1006", "ENGINEERING", "BENGALURU_SOFTWARE", "engineering", "VIEW", "Shipment engineering coordination", "NORMAL", "STANDARD", "APPROVED", "BEL-EMP-1010", "Least-privilege view access approved.", 1],
    ["IAR-2026-DEMO04", "BEL-EMP-1012", "QUALITY", "BENGALURU_NAVAL", "quality", "AUDIT", "Supplier quality observation", "NORMAL", "STANDARD", "REJECTED", "BEL-EMP-1010", "Request requires an assigned quality sponsor.", 7],
    ["IAR-2026-DEMO05", "BEL-EMP-1017", "FINANCE", "BENGALURU_SOFTWARE", "finance", "VIEW", "Freight invoice exception review", "URGENT", "EMERGENCY", "PENDING", null, null, 1],
    ["IAR-2026-DEMO06", "BEL-EMP-1020", "SECURITY", "CORPORATE", "security-signals", "AUDIT", "Quarterly evidence review", "NORMAL", "STANDARD", "APPROVED", "BEL-EMP-1010", "Audit access granted for the quarterly review.", 8],
  ];
  for (const [requestId, employeeId, departmentId, sbuId, module, permission, reason, priority, mode, status, approvedBy, note, days] of accessRequests) {
    await run(`INSERT OR IGNORE INTO erp_access_requests
      (request_id, employee_id, target_unit_id, target_department_id, target_sbu_id, requested_module, requested_permission, business_reason, priority, access_mode, approval_note, start_date, end_date, status, approved_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [requestId, employeeId, "BENGALURU", departmentId, sbuId, module, permission, reason, priority, mode, note, now - 3600, now + days * 86400, status, approvedBy, now - days * 86400, now - 1800]);
  }
  const securitySignals = [
    ["SIG-DEMO-001", "BEL-EMP-1017", "UNUSUAL_ACCESS_PATTERN", "HIGH", 4, "Multiple out-of-pattern access attempts were contained and require review."],
    ["SIG-DEMO-002", "BEL-EMP-1012", "PERMISSION_EXPIRY_WARNING", "MEDIUM", 2, "A temporary access approval will expire within the demonstration window."],
    ["SIG-DEMO-003", "BEL-EMP-1005", "CUSTODY_REVIEW_REQUIRED", "CRITICAL", 1, "A high-assurance asset custody action requires a second authorised reviewer."],
  ];
  for (const [alertId, employeeId, alertType, severity, evidenceCount, summary] of securitySignals) {
    await run("INSERT OR IGNORE INTO erp_security_alerts (alert_id, employee_id, alert_type, severity, evidence_count, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [alertId, employeeId, alertType, severity, evidenceCount, summary, now - evidenceCount * 1800, now - evidenceCount * 900]);
  }
  const existingLogs = await get("SELECT COUNT(*) AS count FROM erp_audit_logs");
  if (!existingLogs?.count) {
    for (let i = 1; i <= 54; i += 1) {
      await run(`INSERT INTO erp_audit_logs (audit_id, employee_id, action, unit_id, department_id, sbu_id, target_id, result, reason, visibility, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUD-2026-${String(i).padStart(4, "0")}`, "BEL-EMP-1001", i % 3 === 0 ? "DATA_VIEWED" : "RECORD_APPROVED", "BENGALURU", "PROCUREMENT", "BENGALURU_SOFTWARE", `PR-2026-${String((i % 20) + 1).padStart(4, "0")}`, "SUCCESS", "Fictional ERP demo audit event", "DEPARTMENT_ONLY", now - i * 7200]);
    }
  }
}

module.exports = {
  db: sqliteDb || libsqlClient,
  run,
  get,
  all,
  initDb,
  resetDb,
  DB_PATH,
};
