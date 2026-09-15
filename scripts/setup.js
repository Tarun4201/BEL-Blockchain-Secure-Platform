const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const http = require("http");

async function checkPortOpen(host, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}`, (res) => {
      resolve(true);
    });
    req.on("error", () => {
      resolve(false);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function setup() {
  console.log("==========================================================");
  console.log("Bharat Electronics Limited — Prototype Environment Setup");
  console.log("==========================================================");

  const rootDir = path.join(__dirname, "..");
  const backendDir = path.join(rootDir, "backend");
  const frontendDir = path.join(rootDir, "frontend");

  // 1. Environment Files Initialization
  console.log("\n[Step 1/5] Checking environment configuration...");
  const rootEnv = path.join(rootDir, ".env");
  const rootEnvExample = path.join(rootDir, ".env.example");
  if (!fs.existsSync(rootEnv) && fs.existsSync(rootEnvExample)) {
    fs.copyFileSync(rootEnvExample, rootEnv);
    console.log("✓ Created .env from .env.example in root directory.");
  } else {
    console.log("✓ Root .env is ready.");
  }

  const backendEnv = path.join(backendDir, ".env");
  const backendEnvExample = path.join(backendDir, ".env.example");
  if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
    fs.copyFileSync(backendEnvExample, backendEnv);
    console.log("✓ Created backend/.env from backend/.env.example.");
  } else {
    console.log("✓ Backend .env is ready.");
  }

  // 2. Ensure Storage & Config Directories Exist
  console.log("\n[Step 2/5] Ensuring storage and config directories...");
  const docsDir = path.join(backendDir, "storage", "documents");
  const backendConfigDir = path.join(backendDir, "config");
  const frontendSrcDir = path.join(frontendDir, "src");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(backendConfigDir, { recursive: true });
  fs.mkdirSync(frontendSrcDir, { recursive: true });
  console.log("✓ Storage directories verified.");

  // 3. Sub-package Dependencies
  console.log("\n[Step 3/5] Verifying dependencies...");
  if (!fs.existsSync(path.join(backendDir, "node_modules"))) {
    console.log("--> Installing backend dependencies...");
    execSync("npm install", { cwd: backendDir, stdio: "inherit" });
  } else {
    console.log("✓ Backend dependencies present.");
  }

  if (!fs.existsSync(path.join(frontendDir, "node_modules"))) {
    console.log("--> Installing frontend dependencies...");
    execSync("npm install", { cwd: frontendDir, stdio: "inherit" });
  } else {
    console.log("✓ Frontend dependencies present.");
  }

  // 4. Compile Smart Contracts
  console.log("\n[Step 4/5] Compiling smart contracts...");
  execSync("npx hardhat compile", { cwd: rootDir, stdio: "inherit" });
  console.log("✓ Smart contracts compiled.");

  // 5. Check Blockchain Node & Deploy
  console.log("\n[Step 5/5] Checking local blockchain node (127.0.0.1:8545)...");
  const isChainRunning = await checkPortOpen("127.0.0.1", 8545);

  if (isChainRunning) {
    console.log("✓ Local Hardhat node detected on port 8545.");
    console.log("--> Deploying smart contracts and seeding demo data...");
    execSync("npx hardhat run scripts/deploy.js --network localhost", {
      cwd: rootDir,
      stdio: "inherit",
    });
    execSync("npx hardhat run scripts/seed.js --network localhost", {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log("\n==========================================================");
    console.log("✓ BEL BLOCKCHAIN PLATFORM SETUP COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
    console.log("\nYou can now start the platform services:");
    console.log("  npm run backend    # in Terminal 1 (port 5001)");
    console.log("  npm run frontend   # in Terminal 2 (port 5173)");
    console.log("  OR:");
    console.log("  npm run dev        # starts everything together");
  } else {
    console.log("ℹ Note: Local Hardhat node is not running yet.");
    console.log("\nTo complete setup and run the prototype:");
    console.log("  1. Terminal 1: npm run chain");
    console.log("  2. Terminal 2: npm run reset-demo");
    console.log("  3. Terminal 2: npm run backend");
    console.log("  4. Terminal 3: npm run frontend");
    console.log("  OR start all services automatically with: npm run dev");
  }
}

if (require.main === module) {
  setup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Setup failed:", err.message);
      process.exit(1);
    });
}

module.exports = setup;
