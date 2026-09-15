const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");
const { getContract, personas, provider, getLatestNonce } = require("../blockchain");

/**
 * GET /api/identities
 * List all registered identities
 */
router.get("/", async (req, res) => {
  try {
    const users = await all("SELECT * FROM users ORDER BY id ASC");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/identities/:did
 * Get specific identity by DID, querying both SQLite cache and on-chain
 */
router.get("/:did", async (req, res) => {
  try {
    const { did } = req.params;
    const user = await get("SELECT * FROM users WHERE did = ?", [did]);

    if (!user) {
      return res.status(404).json({ error: "Identity not found in registry" });
    }

    // Query on-chain status
    try {
      const contract = getContract("IdentityRegistry");
      const onChain = await contract.getIdentity(did);
      return res.json({
        ...user,
        onChain: {
          did: onChain[0],
          userAddress: onChain[1],
          role: onChain[2],
          registeredAt: Number(onChain[3]),
          registeredBy: onChain[4],
          isVerifiedOnChain: true,
        },
      });
    } catch (chainErr) {
      return res.json({
        ...user,
        onChain: { isVerifiedOnChain: false, error: chainErr.message },
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/identities
 * Admin registers a new employee identity on-chain
 */
router.post("/", async (req, res) => {
  try {
    const { fullName, department, designation, email, role, walletAddress } = req.body;

    if (!fullName || !department || !role || !walletAddress) {
      return res.status(400).json({
        error: "Missing required fields: fullName, department, role, walletAddress",
      });
    }

    const did = `did:bel:${walletAddress.toLowerCase()}`;

    // 1. Submit on-chain transaction using Admin signer
    const signer = personas.ADMIN.signer;
    const contract = getContract("IdentityRegistry", signer);
    console.log(`Submitting on-chain registration for DID ${did}...`);

    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.registerIdentity(walletAddress, did, role, { nonce });
    const receipt = await tx.wait();

    // 2. Persist off-chain profile data into SQLite
    await run(
      `INSERT INTO users (did, full_name, department, designation, email, role, wallet_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        did,
        fullName,
        department,
        designation || "Defense Personnel",
        email || `${fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@bel.co.in`,
        role,
        walletAddress.toLowerCase(),
      ]
    );

    res.status(201).json({
      status: "confirmed",
      message: "Identity successfully registered on-chain and in BEL directory",
      did,
      role,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Identity registration error:", err);
    res.status(400).json({
      error: err.reason || err.message || "Failed to register identity on blockchain",
    });
  }
});

/**
 * PUT /api/identities/:did/role
 * Admin assigns or updates a role on-chain
 */
router.put("/:did/role", async (req, res) => {
  try {
    const { did } = req.params;
    const { newRole } = req.body;

    if (!newRole) {
      return res.status(400).json({ error: "newRole is required" });
    }

    const signer = personas.ADMIN.signer;
    const contract = getContract("IdentityRegistry", signer);
    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.assignRole(did, newRole, { nonce });
    const receipt = await tx.wait();

    // Update SQLite cache
    await run("UPDATE users SET role = ? WHERE did = ?", [newRole, did]);

    res.json({
      status: "confirmed",
      message: `Role successfully updated to ${newRole}`,
      did,
      newRole,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    res.status(400).json({ error: err.reason || err.message });
  }
});

module.exports = router;
