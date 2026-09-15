const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

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
  await initDb();
  console.log("✓ Database reset cleanly.");
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
