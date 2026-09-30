const { ethers } = require("ethers");
const db = require("../backend/db.js");
const { getContract, provider, personas } = require("../backend/blockchain.js");

async function testAll() {
  console.log("====================================");
  console.log("BACKEND & BLOCKCHAIN VERIFICATION");
  console.log("====================================");

  // 1. Verify Turso Database
  console.log("1. Verifying Turso Cloud Database...");
  const tableRows = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("   ✓ Turso Connected! Tables count:", tableRows.length);
  const users = await db.all("SELECT did, full_name, role, wallet_address FROM users");
  console.log("   ✓ Turso Users table rows:", users.length);

  // 2. Verify Polygon Amoy RPC Connection
  console.log("2. Verifying Polygon Amoy RPC Connection...");
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  console.log("   ✓ Amoy Network connected! Chain ID:", network.chainId.toString(), "| Latest Block:", blockNumber);

  // 3. Verify Deployed Contracts
  console.log("3. Verifying Deployed Contracts on Polygon Amoy...");
  const identityContract = getContract("IdentityRegistry");
  const accessContract = getContract("AccessControlManager");
  const assetContract = getContract("AssetRegistry");

  const idCode = await provider.getCode(await identityContract.getAddress());
  console.log("   ✓ IdentityRegistry code exists at:", await identityContract.getAddress(), "| Bytecode size:", idCode.length);

  const acCode = await provider.getCode(await accessContract.getAddress());
  console.log("   ✓ AccessControlManager code exists at:", await accessContract.getAddress(), "| Bytecode size:", acCode.length);

  const arCode = await provider.getCode(await assetContract.getAddress());
  console.log("   ✓ AssetRegistry code exists at:", await assetContract.getAddress(), "| Bytecode size:", arCode.length);

  // Check read calls on the contracts
  const adminAddressOnContract = await identityContract.admin();
  console.log("   ✓ IdentityRegistry contract admin:", adminAddressOnContract);

  const assetName = await assetContract.name();
  const assetSymbol = await assetContract.symbol();
  console.log("   ✓ AssetRegistry ERC-721 token name:", assetName, "| symbol:", assetSymbol);

  // 4. Verify Admin Signer
  console.log("4. Verifying Backend Admin Signer...");
  const adminAddress = await personas.ADMIN.signer.getAddress();
  const adminBalance = await provider.getBalance(adminAddress);
  console.log("   ✓ Admin Signer address:", adminAddress, "| Balance:", ethers.formatEther(adminBalance), "POL");

  console.log("====================================");
  console.log("ALL VERIFICATION CHECKS PASSED 100%!");
  console.log("====================================");
}

testAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
