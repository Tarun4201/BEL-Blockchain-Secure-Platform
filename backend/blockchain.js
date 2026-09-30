const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function configuredValue(name, localFallback) {
  const value = process.env[name];
  if (!value && IS_PRODUCTION) {
    throw new Error(`${name} must be configured when NODE_ENV=production`);
  }
  return value || localFallback;
}

// Load deployed contracts configuration with optional environment variable overrides
const contractsConfigPath = path.join(__dirname, "config", "contracts.json");

function getSavedNetworkConfig() {
  if (fs.existsSync(contractsConfigPath)) {
    try {
      return JSON.parse(fs.readFileSync(contractsConfigPath, "utf8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

const savedConfig = getSavedNetworkConfig();
const DEFAULT_AMOY_RPC = "https://polygon-amoy-bor-rpc.publicnode.com";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.AMOY_RPC_URL ||
  process.env.POLYGON_AMOY_RPC_URL ||
  process.env.POLYGON_RPC_URL ||
  (process.env.NODE_ENV === "production" ||
  process.env.CHAIN_ID === "80002" ||
  savedConfig.chainId === 80002 ||
  savedConfig.network === "amoy"
    ? DEFAULT_AMOY_RPC
    : "http://127.0.0.1:8545");

const POLLING_INTERVAL = parseInt(process.env.RPC_POLLING_INTERVAL || "3000", 10);
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
  polling: true,
  pollingInterval: POLLING_INTERVAL,
});
console.log("✓ Connected to Blockchain RPC Provider:", RPC_URL);

provider.on("error", (err) => {
  console.warn("[RPC Provider Notice]:", err.message || err);
});

function loadContractsConfig() {
  let config = { contracts: {} };
  if (fs.existsSync(contractsConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(contractsConfigPath, "utf8"));
    } catch (e) {
      console.warn("Could not parse contracts.json:", e.message);
    }
  }

  if (IS_PRODUCTION && Number(config.chainId) === 31337) {
    throw new Error(
      "Production cannot use the local Hardhat deployment configuration. Deploy the contracts to the selected public test network first."
    );
  }

  // Allow environment variables to override contract addresses
  if (process.env.IDENTITY_REGISTRY_ADDRESS && config.contracts.IdentityRegistry) {
    config.contracts.IdentityRegistry.address = process.env.IDENTITY_REGISTRY_ADDRESS;
  }
  if (process.env.ACCESS_CONTROL_ADDRESS && config.contracts.AccessControlManager) {
    config.contracts.AccessControlManager.address = process.env.ACCESS_CONTROL_ADDRESS;
  }
  if (process.env.ASSET_REGISTRY_ADDRESS && config.contracts.AssetRegistry) {
    config.contracts.AssetRegistry.address = process.env.ASSET_REGISTRY_ADDRESS;
  }

  return config;
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

function createPersona({ id, name, role, department, designation, prefix, fallback }) {
  const signer = new ethers.Wallet(
    configuredValue(`${prefix}_PRIVATE_KEY`, fallback.key),
    provider
  );
  return {
    id,
    name: process.env[`${prefix}_NAME`] || name,
    role: process.env[`${prefix}_ROLE`] || role,
    department: process.env[`${prefix}_DEPARTMENT`] || department,
    designation: process.env[`${prefix}_DESIGNATION`] || designation,
    // Derive the address from the signing key by default so the DID and signer
    // cannot silently point at different wallets on a hosted network.
    address: process.env[`${prefix}_ADDRESS`] || signer.address,
    signer,
  };
}

const personas = {
  ADMIN: {
    ...createPersona({
      id: "admin",
      name: "Admin (Security Officer)",
      role: "ADMIN",
      department: "Cyber Security & Directorate",
      designation: "Chief Security Administrator",
      prefix: "ADMIN",
      fallback: DEFAULT_KEYS.ADMIN,
    }),
  },
  SHARMA: {
    ...createPersona({
      id: "sharma",
      name: "R. Sharma",
      role: "ENGINEER",
      department: "Radar & Phased Array Systems",
      designation: "Senior Systems Engineer",
      prefix: "SHARMA",
      fallback: DEFAULT_KEYS.SHARMA,
    }),
  },
  VERMA: {
    ...createPersona({
      id: "verma",
      name: "A. Verma",
      role: "TECHNICIAN",
      department: "Electronics Fabrication & Maintenance",
      designation: "Lead Hardware Specialist",
      prefix: "VERMA",
      fallback: DEFAULT_KEYS.VERMA,
    }),
  },
};

async function validateProductionConfiguration() {
  if (!IS_PRODUCTION) return;

  const config = loadContractsConfig();
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Number(config.chainId)) {
    throw new Error(
      `RPC chain ID ${network.chainId} does not match deployed contract chain ID ${config.chainId}`
    );
  }
}

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

  // Never sign for an unknown DID. Falling back to the admin wallet would let an
  // unrecognised identifier create a request under administrator credentials.
  throw new Error("No local signer is configured for this DID");
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
  validateProductionConfiguration,
};
