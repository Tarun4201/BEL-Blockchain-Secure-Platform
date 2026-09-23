const path = require("path");
const hre = require("hardhat");
const { resetDb, run } = require("../backend/db");
const { computeFileHash } = require("../backend/utils/hasher");
const { rebuildIndexFromChain } = require("../backend/indexer");
require("dotenv").config({ path: path.join(__dirname, "..", "backend", ".env") });

const DOCS_DIR = path.join(__dirname, "..", "backend", "storage", "documents");

async function seed() {
  console.log("==========================================");
  console.log("Seeding BEL Blockchain Demo Environment");
  console.log("==========================================");

  // 1. Reset SQLite Database
  console.log("--> Resetting SQLite database tables...");
  await resetDb();

  const [adminSigner, sharmaSigner, vermaSigner] = await hre.ethers.getSigners();
  console.log("Admin Signer Address:", adminSigner.address);

  // Load contract config
  const contractsConfig = require("../backend/config/contracts.json");

  const identityContract = await hre.ethers.getContractAt(
    "IdentityRegistry",
    contractsConfig.contracts.IdentityRegistry.address,
    adminSigner
  );

  const accessContract = await hre.ethers.getContractAt(
    "AccessControlManager",
    contractsConfig.contracts.AccessControlManager.address,
    adminSigner
  );

  const assetContract = await hre.ethers.getContractAt(
    "AssetRegistry",
    contractsConfig.contracts.AssetRegistry.address,
    adminSigner
  );

  // 2. Register Admin Persona on IdentityRegistry
  const adminDid = `did:bel:${adminSigner.address.toLowerCase()}`;
  console.log(`--> Registering Admin Identity (${adminDid})...`);

  try {
    const isReg = await identityContract.isRegistered(adminDid);
    if (!isReg) {
      const tx = await identityContract.registerIdentity(adminSigner.address, adminDid, "ADMIN");
      await tx.wait();
      console.log("✓ Admin registered on-chain.");
    }
  } catch (e) {
    console.log("Admin already registered on-chain or:", e.message);
  }

  // Insert Admin into SQLite users table
  await run(
    `INSERT OR REPLACE INTO users (did, full_name, department, designation, email, role, wallet_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adminDid,
      process.env.ADMIN_NAME || "Admin (Security Officer)",
      process.env.ADMIN_DEPARTMENT || "Cyber Security & Directorate",
      process.env.ADMIN_DESIGNATION || "Chief Security Administrator",
      "admin.security@bel.co.in",
      "ADMIN",
      adminSigner.address.toLowerCase(),
    ]
  );
  console.log("✓ Admin profile recorded in BEL directory.");

  // Register the two operational demo identities. These are real on-chain DID
  // anchors, so access requests and NFT transfers can be signed by the wallet
  // bound to each DID instead of by an administrator fallback wallet.
  const demoPersonnel = [
    ["R. Sharma", "Radar & Phased Array Systems", "Senior Systems Engineer", "r.sharma@bel.co.in", "ENGINEER", sharmaSigner],
    ["A. Verma", "Electronics Fabrication & Maintenance", "Lead Hardware Specialist", "a.verma@bel.co.in", "TECHNICIAN", vermaSigner],
  ];
  for (const [fullName, department, designation, email, role, signer] of demoPersonnel) {
    const did = `did:bel:${signer.address.toLowerCase()}`;
    if (!(await identityContract.isRegistered(did))) {
      await (await identityContract.registerIdentity(signer.address, did, role)).wait();
      console.log(`✓ ${fullName} identity registered on-chain.`);
    }
    await run(
      `INSERT OR REPLACE INTO users (did, full_name, department, designation, email, role, wallet_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [did, fullName, department, designation, email, role, signer.address.toLowerCase()]
    );
  }

  // 3. Compute Hashes and Define Protected Resources
  const resourcesToSeed = [
    {
      id: "RADAR-BAY-03",
      title: "Radar Test Bay 3 — High-Frequency Phased Array",
      description: "Secure prototype test facility for X-band AESA radar systems.",
      category: "SECURE_FACILITY",
      location: "BEL Bengaluru Facility — Complex B",
      sensitivity: "RESTRICTED",
      filename: "radar_bay_03_tech_spec.txt",
    },
    {
      id: "EW-LAB-01",
      title: "Electronic Warfare Lab — Signal Jamming & Analysis",
      description: "Countermeasure synthesis and DRFM deception research lab.",
      category: "CLASSIFIED_RESEARCH",
      location: "BEL Ghaziabad Facility",
      sensitivity: "SECRET",
      filename: "ew_lab_signal_protocol.txt",
    },
    {
      id: "AVIONICS-HUB",
      title: "Avionics Telemetry Hub — Secure Flight Link",
      description: "MIL-STD-1553B flight downlink and telemetry decryption center.",
      category: "TELEMETRY_CENTER",
      location: "BEL Hyderabad Facility",
      sensitivity: "CONFIDENTIAL",
      filename: "avionics_telemetry_manual.txt",
    },
  ];

  console.log("--> Creating protected resources on AccessControlManager...");
  for (const res of resourcesToSeed) {
    const docPath = path.join(DOCS_DIR, res.filename);
    const docHash = computeFileHash(docPath);
    console.log(`Resource [${res.id}]: SHA-256 hash = ${docHash}`);

    try {
      const tx = await accessContract.createResource(res.id, res.sensitivity, docHash);
      await tx.wait();
      console.log(`✓ Resource ${res.id} anchored on blockchain.`);
    } catch (e) {
      console.log(`Resource ${res.id} already exists on-chain or: ${e.message}`);
    }

    await run(
      `INSERT OR REPLACE INTO resources_meta 
       (resource_id, title, description, category, location, sensitivity_label, document_filename, document_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        res.id,
        res.title,
        res.description,
        res.category,
        res.location,
        res.sensitivity,
        res.filename,
        docHash,
      ]
    );
  }

  // 4. Mint Sample Defense Asset (NFT)
  console.log("--> Minting baseline defense asset (Radar Unit RU-204)...");
  const assetSchematicFile = "radar_unit_ru204_schematic.txt";
  const assetSchematicPath = path.join(DOCS_DIR, assetSchematicFile);
  const assetDocHash = computeFileHash(assetSchematicPath);
  const assetTitle = "Radar Unit RU-204 (AESA Validation Prototype)";

  let mintedAssetId = 1;
  try {
    const tx = await assetContract.mintAsset(
      "bel://assets/radar-unit-ru204",
      adminDid,
      assetDocHash
    );
    const receipt = await tx.wait();
    console.log(`✓ Minted defense asset RU-204 (Tx: ${receipt.hash}).`);
  } catch (e) {
    console.log("Asset already minted on-chain or:", e.message);
  }

  await run(
    `INSERT OR REPLACE INTO assets_meta 
     (asset_id, title, description, category, document_filename, document_hash, status, current_owner_did)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    [
      mintedAssetId,
      assetTitle,
      "High-power Active Electronically Scanned Array validation unit.",
      "DEFENSE_HARDWARE",
      assetSchematicFile,
      assetDocHash,
      adminDid,
    ]
  );
  console.log("✓ Asset RU-204 metadata recorded.");

  // 5. Rebuild Audit Index from Chain
  console.log("--> Rebuilding SQLite audit trail directly from on-chain event logs...");
  const rebuildStats = await rebuildIndexFromChain();
  console.log("✓ Audit Index rebuilt:", rebuildStats);

  console.log("==========================================");
  console.log("Seed Completed Successfully!");
  console.log("Ready for demo walkthrough (PRD Section 24).");
  console.log("==========================================");
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = seed;
