const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { polling: true, pollingInterval: 2000 });
provider.on("error", () => {
  // Gracefully ignore transient filter resets during hardhat redeployments
});

// Load deployed contracts configuration
const contractsConfigPath = path.join(__dirname, "config", "contracts.json");

function loadContractsConfig() {
  if (!fs.existsSync(contractsConfigPath)) {
    throw new Error(
      `Contracts configuration not found at ${contractsConfigPath}. Please run the deployment script first.`
    );
  }
  return JSON.parse(fs.readFileSync(contractsConfigPath, "utf8"));
}

// Pre-configured signers from environment variables (defaults to Hardhat local accounts)
const DEFAULT_KEYS = {
  ADMIN: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  SHARMA: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  VERMA: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    key: "0x5de4111afa1a4b93847820b24420e0f8a53185ea5e022512760889c5060f037e",
  },
};

const personas = {
  ADMIN: {
    id: "admin",
    name: process.env.ADMIN_NAME || "Admin (Security Officer)",
    role: process.env.ADMIN_ROLE || "ADMIN",
    department: process.env.ADMIN_DEPARTMENT || "Cyber Security & Directorate",
    designation: process.env.ADMIN_DESIGNATION || "Chief Security Administrator",
    address: process.env.ADMIN_ADDRESS || DEFAULT_KEYS.ADMIN.address,
    signer: new ethers.Wallet(
      process.env.ADMIN_PRIVATE_KEY || DEFAULT_KEYS.ADMIN.key,
      provider
    ),
  },
  SHARMA: {
    id: "sharma",
    name: process.env.SHARMA_NAME || "R. Sharma",
    role: process.env.SHARMA_ROLE || "ENGINEER",
    department: process.env.SHARMA_DEPARTMENT || "Radar & Phased Array Systems",
    designation: process.env.SHARMA_DESIGNATION || "Senior Systems Engineer",
    address: process.env.SHARMA_ADDRESS || DEFAULT_KEYS.SHARMA.address,
    signer: new ethers.Wallet(
      process.env.SHARMA_PRIVATE_KEY || DEFAULT_KEYS.SHARMA.key,
      provider
    ),
  },
  VERMA: {
    id: "verma",
    name: process.env.VERMA_NAME || "A. Verma",
    role: process.env.VERMA_ROLE || "TECHNICIAN",
    department: process.env.VERMA_DEPARTMENT || "Electronics Fabrication & Maintenance",
    designation: process.env.VERMA_DESIGNATION || "Lead Hardware Specialist",
    address: process.env.VERMA_ADDRESS || DEFAULT_KEYS.VERMA.address,
    signer: new ethers.Wallet(
      process.env.VERMA_PRIVATE_KEY || DEFAULT_KEYS.VERMA.key,
      provider
    ),
  },
};

/**
 * Get contract instance connected to a specific signer or default provider
 * @param {string} contractName - IdentityRegistry | AccessControlManager | AssetRegistry
 * @param {ethers.Signer|null} signer
 */
function getContract(contractName, signer = null) {
  const config = loadContractsConfig();
  const contractInfo = config.contracts[contractName];
  if (!contractInfo) {
    throw new Error(`Contract ${contractName} not found in configuration.`);
  }
  const runner = signer || provider;
  return new ethers.Contract(contractInfo.address, contractInfo.abi, runner);
}

/**
 * Resolve persona or signer by identifier or DID
 */
function resolveSigner(personaIdOrDid) {
  if (!personaIdOrDid) return personas.ADMIN.signer;

  const key = personaIdOrDid.toUpperCase();
  if (personas[key]) {
    return personas[key].signer;
  }

  // Check matching address or DID
  for (const p of Object.values(personas)) {
    if (
      p.address &&
      (p.address.toLowerCase() === personaIdOrDid.toLowerCase() ||
        `did:bel:${p.address.toLowerCase()}` === personaIdOrDid.toLowerCase() ||
        p.id.toLowerCase() === personaIdOrDid.toLowerCase())
    ) {
      return p.signer;
    }
  }

  // Fallback to Admin signer if not found
  return personas.ADMIN.signer;
}

/**
 * Resolve latest on-chain nonce directly via JSON-RPC
 */
async function getLatestNonce(address) {
  const hex = await provider.send("eth_getTransactionCount", [address, "latest"]);
  return parseInt(hex, 16);
}

module.exports = {
  provider,
  personas,
  getContract,
  resolveSigner,
  loadContractsConfig,
  getLatestNonce,
};
