const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { ethers } = require("ethers");

const rootEnvPath = path.join(__dirname, "..", ".env");
const backendEnvPath = path.join(__dirname, "..", "backend", ".env");

function updateEnvFile(filePath, address, privateKey) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Format private key with 0x prefix if missing
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const formattedAddress = ethers.getAddress(address);

  // Update or append ADMIN_ADDRESS
  if (/^ADMIN_ADDRESS=.*/m.test(content)) {
    content = content.replace(/^ADMIN_ADDRESS=.*/m, `ADMIN_ADDRESS="${formattedAddress}"`);
  } else {
    content += `\nADMIN_ADDRESS="${formattedAddress}"`;
  }

  // Update or append ADMIN_PRIVATE_KEY
  if (/^ADMIN_PRIVATE_KEY=.*/m.test(content)) {
    content = content.replace(/^ADMIN_PRIVATE_KEY=.*/m, `ADMIN_PRIVATE_KEY="${formattedKey}"`);
  } else {
    content += `\nADMIN_PRIVATE_KEY="${formattedKey}"`;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

async function verifyAndSave(addressInput, keyInput) {
  try {
    const rawKey = keyInput.trim();
    const formattedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;

    // Verify wallet derivation
    const wallet = new ethers.Wallet(formattedKey);
    const derivedAddress = wallet.address;

    if (addressInput && addressInput.trim()) {
      const cleanAddress = addressInput.trim();
      if (ethers.getAddress(cleanAddress).toLowerCase() !== derivedAddress.toLowerCase()) {
        console.error(`[Error] Provided address (${cleanAddress}) does not match key's derived address (${derivedAddress}).`);
        return false;
      }
    }

    console.log(`✓ Wallet validated successfully! Derived address: ${derivedAddress}`);

    // Update .env and backend/.env
    updateEnvFile(rootEnvPath, derivedAddress, formattedKey);
    updateEnvFile(backendEnvPath, derivedAddress, formattedKey);
    console.log("✓ Safely updated .env and backend/.env without altering other configurations.");

    // Check balance on Polygon Amoy
    const rpcUrl = process.env.RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log("--> Querying Polygon Amoy testnet for account balance...");
    const balance = await provider.getBalance(derivedAddress);
    console.log(`✓ Account ${derivedAddress} balance: ${ethers.formatEther(balance)} POL on Polygon Amoy (Chain ID: 80002)`);

    return true;
  } catch (err) {
    console.error("[Error] Failed to process wallet:", err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const [addr, key] = args;
    const ok = await verifyAndSave(addr, key);
    process.exit(ok ? 0 : 1);
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter MetaMask Public Address (0x...): ", (addr) => {
    rl.question("Enter MetaMask Private Key (0x...): ", async (key) => {
      rl.close();
      const ok = await verifyAndSave(addr, key);
      process.exit(ok ? 0 : 1);
    });
  });
}

if (require.main === module) {
  main();
}

module.exports = { verifyAndSave, updateEnvFile };
