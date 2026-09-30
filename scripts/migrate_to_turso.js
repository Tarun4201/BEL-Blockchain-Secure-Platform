const path = require("path");
const sqlite3 = require(path.join(__dirname, "..", "backend", "node_modules", "sqlite3")).verbose();
const { createClient } = require(path.join(__dirname, "..", "backend", "node_modules", "@libsql", "client"));
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", "backend", ".env") });

const LOCAL_DB_PATH = path.join(__dirname, "..", "backend", "bel_platform.db");
const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

async function migrate() {
  console.log("==================================================");
  console.log("BEL Platform — SQLite to Turso Cloud DB Migration");
  console.log("==================================================");

  if (!TURSO_URL) {
    console.error("❌ Error: TURSO_DATABASE_URL is not set in .env.");
    console.log("Please add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env first.");
    process.exit(1);
  }

  console.log(`Connecting to Turso Cloud DB: ${TURSO_URL.replace(/:[^:@]+@/, ":***@")}`);
  const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

  const localDb = new sqlite3.Database(LOCAL_DB_PATH);
  const localAll = (sql) => new Promise((resolve, reject) => {
    localDb.all(sql, [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  // 1. Initialize schema on Turso
  console.log("--> Creating tables on Turso cloud database...");
  const { initDb } = require("../backend/db");
  // Temporarily force db.js to use Turso for initDb
  await initDb();
  console.log("✓ Turso schema initialized successfully.");

  // 2. Migrate tables
  const tables = [
    "users",
    "resources_meta",
    "assets_meta",
    "audit_index",
    "erp_units",
    "erp_departments",
    "erp_sbus",
    "erp_users",
    "erp_access_requests",
    "erp_records",
    "erp_audit_logs",
    "erp_guide_progress",
    "erp_security_alerts",
  ];

  console.log("\n--> Transferring data from local SQLite to Turso Cloud DB...");

  for (const table of tables) {
    try {
      const rows = await localAll(`SELECT * FROM ${table}`);
      if (rows && rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

        for (const row of rows) {
          const values = columns.map((col) => row[col]);
          await turso.execute({ sql: insertSql, args: values });
        }
        console.log(`✓ Table [${table}]: Migrated ${rows.length} rows.`);
      } else {
        console.log(`ℹ Table [${table}]: 0 rows in local database.`);
      }
    } catch (err) {
      console.warn(`Warning on table [${table}]:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("✓ TURSO DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
  localDb.close();
  turso.close();
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = migrate;
