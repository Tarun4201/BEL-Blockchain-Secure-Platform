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
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(null, true); // Permissive default to support Vercel preview URLs
          }
        }
      : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-erp-session", "x-requested-with"],
  })
);
app.options("*", cors());
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
    let blockNumber = 0, isNodeConnected = false, networkName = "Offline / Unconnected";
    try {
      const [block, net] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
      ]);
      blockNumber = block;
      isNodeConnected = true;
      networkName = process.env.BLOCKCHAIN_NETWORK_NAME || `${net.name === "unknown" ? "EVM Network" : net.name} (ChainID: ${net.chainId})`;
    } catch {}
    let contracts = {};
    try { contracts = loadContractsConfig().contracts; } catch {}
    const [audit, ids, res_, assets] = await Promise.all([
      get("SELECT COUNT(*) as count FROM audit_index"),
      get("SELECT COUNT(*) as count FROM users"),
      get("SELECT COUNT(*) as count FROM resources_meta"),
      get("SELECT COUNT(*) as count FROM assets_meta"),
    ]);
    const deployment = (() => {
      try { return loadContractsConfig(); } catch { return null; }
    })();
    res.json({
      status: "operational",
      isNodeConnected,
      currentBlockNumber: blockNumber,
      network: deployment?.network ? `${deployment.network} (Chain ID: ${deployment.chainId})` : networkName,
      counts: {
        identities: ids?.count || 0,
        resources: res_?.count || 0,
        assets: assets?.count || 0,
        auditEvents: audit?.count || 0,
      },
      contracts: Object.keys(contracts).map((n) => ({ name: n, address: contracts[n].address })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// In production, Express serves the already-built React application. Vite still
// serves the frontend locally, so hot reload and the existing dev workflow stay
// unchanged.
if (process.env.NODE_ENV === "production") {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}


async function startServer() {
  try {
    console.log("==========================================");
    console.log("Bharat Electronics Limited (BEL)");
    console.log("Blockchain Security Platform Backend");
    console.log("==========================================");

    // 1. Initialize SQLite database tables
    await initDb();

    if (process.env.NODE_ENV === "production") {
      if (!require("fs").existsSync(FRONTEND_DIST)) {
        throw new Error("Frontend build is missing. Run `npm run build --prefix frontend` before starting production.");
      }
      await require("./blockchain").validateProductionConfiguration();
    }

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
