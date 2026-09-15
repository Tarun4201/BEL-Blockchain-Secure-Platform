const { execSync } = require("child_process");
const path = require("path");

async function resetDemo() {
  console.log("==================================================");
  console.log("BHARAT ELECTRONICS LIMITED — DEMO ENVIRONMENT RESET");
  console.log("==================================================");

  try {
    // 1. Run deployment to localhost network
    console.log("\n[Step 1/2] Deploying fresh smart contracts...");
    execSync("npx hardhat run scripts/deploy.js --network localhost", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });

    // 2. Run seed script to localhost network
    console.log("\n[Step 2/2] Seeding initial BEL identities, resources, and assets...");
    execSync("npx hardhat run scripts/seed.js --network localhost", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });

    console.log("\n==================================================");
    console.log("✓ DEMO ENVIRONMENT RESET COMPLETE!");
    console.log("✓ Fresh contracts deployed");
    console.log("✓ Off-chain document SHA-256 hashes anchored");
    console.log("✓ SQLite audit index reconstructed from block 0");
    console.log("==================================================");
  } catch (error) {
    console.error("\nReset Demo Failed:", error.message);
    process.exit(1);
  }
}

resetDemo();
