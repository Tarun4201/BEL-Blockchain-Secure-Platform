const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initDb } = require("./db");
const { startIndexer } = require("./indexer");

const { router: authRouter } = require("./routes/auth");
const identitiesRouter = require("./routes/identities");
const resourcesRouter = require("./routes/resources");
const accessRouter = require("./routes/access");
const assetsRouter = require("./routes/assets");
const auditRouter = require("./routes/audit");
const erpRouter = require("./routes/erp");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Request logging for audit transparency
app.use((req, res, next) => {
  if (req.method !== "OPTIONS") {
    console.log(`[BEL API] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/identities", identitiesRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/access", accessRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/erp", erpRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "BEL Blockchain Backend", timestamp: new Date().toISOString() });
});

// Convenience alias for status
app.get("/api/status", async (req, res) => {
  try {
    const { provider, loadContractsConfig } = require("./blockchain");
    const { get } = require("./db");
    let blockNumber = 0, isNodeConnected = false;
    try { blockNumber = await provider.getBlockNumber(); isNodeConnected = true; } catch {}
    let contracts = {};
    try { contracts = loadContractsConfig().contracts; } catch {}
    const [audit, ids, res_, assets] = await Promise.all([
      get("SELECT COUNT(*) as count FROM audit_index"),
      get("SELECT COUNT(*) as count FROM users"),
      get("SELECT COUNT(*) as count FROM resources_meta"),
      get("SELECT COUNT(*) as count FROM assets_meta"),
    ]);
    res.json({
      status: "operational", isNodeConnected, currentBlockNumber: blockNumber,
      network: "Hardhat Local (ChainID: 31337)",
      counts: { identities: ids?.count || 0, resources: res_?.count || 0, assets: assets?.count || 0, auditEvents: audit?.count || 0 },
      contracts: Object.keys(contracts).map((n) => ({ name: n, address: contracts[n].address })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


async function startServer() {
  try {
    console.log("==========================================");
    console.log("Bharat Electronics Limited (BEL)");
    console.log("Blockchain Security Platform Backend");
    console.log("==========================================");

    // 1. Initialize SQLite database tables
    await initDb();

    // 2. Start Express server
    app.listen(PORT, () => {
      console.log(`✓ BEL Backend server listening on port ${PORT}`);
      console.log(`✓ Local API URL: http://localhost:${PORT}`);

      // 3. Initialize background event listener
      startIndexer();
    });
  } catch (err) {
    console.error("Failed to start BEL backend server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
