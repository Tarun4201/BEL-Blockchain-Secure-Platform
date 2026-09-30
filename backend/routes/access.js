const express = require("express");
const router = express.Router();
const { getContract, resolveSigner, personas, provider, getLatestNonce } = require("../blockchain");
const { all, get } = require("../db");

const ACCESS_POLICY = Object.freeze({
  RESTRICTED: { maxHours: 168, defaultHours: 24, label: "Standard controlled access" },
  CONFIDENTIAL: { maxHours: 72, defaultHours: 12, label: "Short-duration controlled access" },
  SECRET: { maxHours: 24, defaultHours: 8, label: "High-sensitivity time-bound access" },
  TOP_SECRET: { maxHours: 4, defaultHours: 1, label: "Mission-critical minimum-duration access" },
});

function policyFor(sensitivityLabel) {
  return ACCESS_POLICY[String(sensitivityLabel || "RESTRICTED").toUpperCase()] || ACCESS_POLICY.RESTRICTED;
}

function trustReceipt({ action, did, resourceId, sensitivityLabel, blockNumber, validUntil = 0, decision }) {
  return {
    receiptId: `BEL-TR-${String(blockNumber || "LOCAL")}-${Date.now().toString(36).toUpperCase()}`,
    action,
    decision,
    subject: "Verified identity",
    protectedResource: resourceId,
    sensitivityLabel,
    expiresAt: validUntil || null,
    blockNumber: blockNumber || null,
    evidence: blockNumber ? "Smart-contract transaction confirmed" : "Smart-contract policy check confirmed",
    explanation: validUntil
      ? "Access is active only until the stated deadline. The contract denies it automatically after expiry."
      : "The current policy decision was evaluated directly by the smart contract.",
    didSuffix: String(did).slice(-10).toUpperCase(),
  };
}

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
      validUntil: Number(r.validUntil || 0),
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
      requestedBy: r.updatedBy,
      requestedAt: Number(r.updatedAt),
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

    // Resolve the local demonstration signer; unknown DIDs are never allowed to
    // fall back to the admin signer. The contract also verifies this wallet owns
    // the DID before it records the request.
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
      receipt: trustReceipt({ action: "Access requested", decision: "PENDING", did, resourceId, blockNumber: receipt.blockNumber }),
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
    const { did, resourceId, durationHours } = req.body;

    if (!did || !resourceId) {
      return res.status(400).json({ error: "Missing required fields: did, resourceId" });
    }

    const resource = await get("SELECT sensitivity_label FROM resources_meta WHERE resource_id = ?", [resourceId]);
    if (!resource) return res.status(404).json({ error: "Protected resource not found" });
    const policy = policyFor(resource.sensitivity_label);
    const requestedHours = durationHours === undefined ? policy.defaultHours : Number(durationHours);
    if (!Number.isInteger(requestedHours) || requestedHours < 1 || requestedHours > policy.maxHours) {
      return res.status(400).json({
        error: `${resource.sensitivity_label} resources allow access from 1 to ${policy.maxHours} hours under the current policy.`,
      });
    }

    const signer = personas.ADMIN.signer;
    const contract = getContract("AccessControlManager", signer);

    console.log(`Submitting on-chain access grant: ${did} -> ${resourceId}...`);
    const nonce = await getLatestNonce(signer.address);
    const validUntil = Math.floor(Date.now() / 1000) + requestedHours * 60 * 60;
    const tx = await contract.grantAccessUntil(did, resourceId, validUntil, { nonce });
    const receipt = await tx.wait();

    res.json({
      status: "confirmed",
      message: `Access grant confirmed on-chain. Permission is active for ${requestedHours} hour${requestedHours === 1 ? "" : "s"}.`,
      did,
      resourceId,
      blockNumber: receipt.blockNumber,
      validUntil,
      policy: { sensitivityLabel: resource.sensitivity_label, ...policy },
      receipt: trustReceipt({ action: "Time-bound access granted", decision: "ALLOW", did, resourceId, sensitivityLabel: resource.sensitivity_label, blockNumber: receipt.blockNumber, validUntil }),
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
      receipt: trustReceipt({ action: "Access revoked", decision: "DENY", did, resourceId, blockNumber: receipt.blockNumber }),
    });
  } catch (err) {
    console.error("Access revocation error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * POST /api/access/role-permissions
 * Admin defines the on-chain RBAC policy for a protected resource.
 */
router.post("/role-permissions", async (req, res) => {
  try {
    const { resourceId, role, allowed } = req.body;
    if (!resourceId || !role || typeof allowed !== "boolean") {
      return res.status(400).json({ error: "resourceId, role, and boolean allowed are required" });
    }
    const signer = personas.ADMIN.signer;
    const contract = getContract("AccessControlManager", signer);
    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.setRolePermission(resourceId, role, allowed, { nonce });
    const receipt = await tx.wait();
    res.json({ status: "confirmed", resourceId, role, allowed, blockNumber: receipt.blockNumber });
  } catch (err) {
    res.status(400).json({ error: err.reason || err.message });
  }
});

router.get("/role-permissions/:resourceId/:role", async (req, res) => {
  try {
    const contract = getContract("AccessControlManager");
    const allowed = await contract.hasRolePermission(req.params.resourceId, req.params.role);
    res.json({ resourceId: req.params.resourceId, role: req.params.role, allowed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/access/check/:did/:resourceId
 * Real-time on-chain verification of canonical access check hasAccess()
 */
router.get("/check/:did/:resourceId", async (req, res) => {
  try {
    const { did, resourceId } = req.params;
    const [contract, resource] = await Promise.all([
      getContract("AccessControlManager"),
      get("SELECT sensitivity_label FROM resources_meta WHERE resource_id = ?", [resourceId]),
    ]);
    if (!resource) return res.status(404).json({ error: "Protected resource not found" });

    const [hasAccess, record] = await Promise.all([
      contract.hasAccess(did, resourceId),
      contract.getAccessRecord(did, resourceId),
    ]);
    const validUntil = Number(record.validUntil || 0);
    const evaluatedAt = Math.floor(Date.now() / 1000);
    const expired = Number(record.status) === 2 && validUntil > 0 && evaluatedAt > validUntil;
    const decision = hasAccess ? "ALLOW" : "DENY";
    const reason = hasAccess
      ? validUntil ? "Explicit time-bound grant is currently valid." : "Explicit grant is currently valid."
      : expired ? "The explicit grant expired; the smart contract automatically denied access."
      : "No effective explicit grant is available for this identity and resource.";

    res.json({
      did,
      resourceId,
      hasAccess,
      decision,
      reason,
      sensitivityLabel: resource.sensitivity_label,
      validUntil: validUntil || null,
      evaluatedAt,
      verificationMethod: "SmartContract:hasAccess(did,resourceId)",
      receipt: trustReceipt({ action: "Access policy evaluated", decision, did, resourceId, sensitivityLabel: resource.sensitivity_label, validUntil }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
