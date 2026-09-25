const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "bel_platform.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", DB_PATH);
  }
});

// Wrap sqlite3 methods in Promises for clean async/await usage
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
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
      last_login INTEGER, created_at INTEGER NOT NULL
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
  await run(`
    CREATE TABLE IF NOT EXISTS erp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT UNIQUE NOT NULL, module TEXT NOT NULL,
      title TEXT NOT NULL, status TEXT NOT NULL, unit_id TEXT NOT NULL, department_id TEXT NOT NULL,
      sbu_id TEXT NOT NULL, owner_employee_id TEXT, related_record_id TEXT, amount REAL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
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
    ["logistics", "LOGISTICS", "BENGALURU_EXPORT", "SHIP", "Shipment", 15],
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
  db,
  run,
  get,
  all,
  initDb,
  resetDb,
  DB_PATH,
};
