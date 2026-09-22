const express = require("express");
const router = express.Router();
const { getContract, resolveSigner, personas, provider, getLatestNonce } = require("../blockchain");
const { all } = require("../db");

/**
 * GET /api/access/records
 * Returns all permission records and pending requests from on-chain smart contract
 */
router.get("/records", async (req, res) => {
  try {
    const contract = getContract("AccessControlManager");
    const rawRecords = await contract.getAllAccessRecords();

    const statusLabels = ["NONE", "REQUESTED", "GRANTED", "REVOKED"];

    const records = rawRecords.map((r) => ({
      did: r.did,
      resourceId: r.resourceId,
      statusCode: Number(r.status),
      status: statusLabels[Number(r.status)] || "UNKNOWN",
      updatedBy: r.updatedBy,
      updatedAt: Number(r.updatedAt),
    }));

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/access/requests
 * Returns pending access requests for Admin approval queue
 */
router.get("/requests", async (req, res) => {
  try {
    const contract = getContract("AccessControlManager");
    const rawRequests = await contract.getPendingRequests();

    const requests = rawRequests.map((r) => ({
      did: r.did,
      resourceId: r.resourceId,
      requestedBy: r.requestedBy,
      requestedAt: Number(r.requestedAt),
    }));

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/access/requests
 * User persona requests access to a protected resource on-chain
 */
router.post("/requests", async (req, res) => {
  try {
    const { did, resourceId } = req.body;

    if (!did || !resourceId) {
      return res.status(400).json({ error: "Missing required fields: did, resourceId" });
    }

    // Resolve user's signer based on DID
    const userSigner = resolveSigner(did);
    const contract = getContract("AccessControlManager", userSigner);

    console.log(`Submitting on-chain access request: ${did} -> ${resourceId}...`);
    const nonce = await getLatestNonce(userSigner.address);
    const tx = await contract.requestAccess(did, resourceId, { nonce });
    const receipt = await tx.wait();

    res.status(201).json({
      status: "confirmed",
      message: "Access request successfully recorded on the blockchain ledger",
      did,
      resourceId,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Access request error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * POST /api/access/grant
 * Admin approves and grants access on-chain
 */
router.post("/grant", async (req, res) => {
  try {
    const { did, resourceId } = req.body;

    if (!did || !resourceId) {
      return res.status(400).json({ error: "Missing required fields: did, resourceId" });
    }

    const signer = personas.ADMIN.signer;
    const contract = getContract("AccessControlManager", signer);

    console.log(`Submitting on-chain access grant: ${did} -> ${resourceId}...`);
    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.grantAccess(did, resourceId, { nonce });
    const receipt = await tx.wait();

    res.json({
      status: "confirmed",
      message: "Access grant confirmed on-chain. Permission active immediately.",
      did,
      resourceId,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Access grant error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * POST /api/access/revoke
 * Admin revokes previously granted access on-chain
 */
router.post("/revoke", async (req, res) => {
  try {
    const { did, resourceId } = req.body;

    if (!did || !resourceId) {
      return res.status(400).json({ error: "Missing required fields: did, resourceId" });
    }

    const signer = personas.ADMIN.signer;
    const contract = getContract("AccessControlManager", signer);

    console.log(`Submitting on-chain access revocation: ${did} -> ${resourceId}...`);
    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.revokeAccess(did, resourceId, { nonce });
    const receipt = await tx.wait();

    res.json({
      status: "confirmed",
      message: "Access revocation confirmed on-chain. Permission terminated immediately.",
      did,
      resourceId,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Access revocation error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * GET /api/access/check/:did/:resourceId
 * Real-time on-chain verification of canonical access check hasAccess()
 */
router.get("/check/:did/:resourceId", async (req, res) => {
  try {
    const { did, resourceId } = req.params;
    const contract = getContract("AccessControlManager");

    const hasAccess = await contract.hasAccess(did, resourceId);

    res.json({
      did,
      resourceId,
      hasAccess,
      evaluatedAt: Math.floor(Date.now() / 1000),
      verificationMethod: "SmartContract:hasAccess(did,resourceId)",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
