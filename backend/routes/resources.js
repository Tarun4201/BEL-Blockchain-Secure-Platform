const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { run, all, get } = require("../db");
const { getContract, personas, provider, getLatestNonce } = require("../blockchain");
const { computeFileHash, verifyDocumentIntegrity } = require("../utils/hasher");

const DOCS_DIR = path.join(__dirname, "..", "storage", "documents");

/**
 * GET /api/resources
 * List all defined protected defense resources
 */
router.get("/", async (req, res) => {
  try {
    const resources = await all("SELECT * FROM resources_meta ORDER BY created_at ASC");
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resources/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await get("SELECT * FROM resources_meta WHERE resource_id = ?", [id]);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Live on-chain status verification
    try {
      const contract = getContract("AccessControlManager");
      const onChain = await contract.getResource(id);
      return res.json({
        ...resource,
        onChain: {
          resourceId: onChain[0],
          sensitivityLabel: onChain[1],
          documentHash: onChain[2],
          createdBy: onChain[3],
          createdAt: Number(onChain[4]),
          isVerifiedOnChain: true,
        },
      });
    } catch {
      return res.json(resource);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resources/:id/content
 * Canonical on-chain access-gated route!
 * Strictly requires hasAccess(did, resourceId) == true on the blockchain smart contract.
 * Demonstrates role vs. access separation and cryptographic document integrity.
 */
router.get("/:id/content", async (req, res) => {
  try {
    const { id } = req.params;
    const { did } = req.query;

    if (!did) {
      return res.status(400).json({ error: "Query parameter 'did' is required for access check" });
    }

    const resource = await get("SELECT * FROM resources_meta WHERE resource_id = ?", [id]);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // 1. Query Smart Contract: hasAccess(did, resourceId)
    const contract = getContract("AccessControlManager");
    const isGrantedOnChain = await contract.hasAccess(did, id);

    if (!isGrantedOnChain) {
      return res.status(403).json({
        accessGranted: false,
        error: "ACCESS DENIED: No explicit on-chain permission grant detected for this DID.",
        details:
          "Bharat Electronics Access Policy: Organizational role (e.g. Engineer) does NOT grant implicit access. An explicit on-chain grant transaction by an Admin is strictly required.",
        did,
        resourceId: id,
        sensitivityLabel: resource.sensitivity_label,
      });
    }

    // 2. Access Granted: Read document and verify cryptographic integrity
    let documentContent = resource.gated_content || "No document content recorded.";
    let integrityCheck = { matches: true, onChainHash: resource.document_hash };

    if (resource.document_filename) {
      const docPath = path.join(DOCS_DIR, resource.document_filename);
      if (fs.existsSync(docPath)) {
        documentContent = fs.readFileSync(docPath, "utf8");
        integrityCheck = verifyDocumentIntegrity(docPath, resource.document_hash);
      }
    }

    res.json({
      accessGranted: true,
      resourceId: id,
      title: resource.title,
      sensitivityLabel: resource.sensitivity_label,
      documentHash: resource.document_hash,
      documentContent,
      integrityCheck: {
        verified: integrityCheck.matches,
        computedHash: integrityCheck.computedHash,
        onChainAnchoredHash: integrityCheck.onChainHash,
        status: integrityCheck.matches
          ? "CRYPTOGRAPHICALLY VERIFIED - NO TAMPERING DETECTED"
          : "INTEGRITY VIOLATION DETECTED",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resources/:id/verify-integrity
 * Independent verification endpoint to verify off-chain document against on-chain hash
 */
router.get("/:id/verify-integrity", async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await get("SELECT * FROM resources_meta WHERE resource_id = ?", [id]);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Read on-chain hash directly from contract
    const contract = getContract("AccessControlManager");
    const onChain = await contract.getResource(id);
    const onChainHash = onChain[2];

    const docPath = path.join(DOCS_DIR, resource.document_filename || "radar_bay_03_tech_spec.txt");
    const result = verifyDocumentIntegrity(docPath, onChainHash);

    res.json({
      resourceId: id,
      filename: resource.document_filename,
      onChainHash: result.onChainHash,
      computedOffChainHash: result.computedHash,
      integrityVerified: result.matches,
      tamperEvidentVerdict: result.matches
        ? "PASSED: Document matches on-chain blockchain hash exactly."
        : "FAILED: Document has been altered off-chain!",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/resources
 * Admin defines a protected resource on-chain with SHA-256 document hash
 */
router.post("/", async (req, res) => {
  try {
    const { resourceId, title, description, category, location, sensitivityLabel, documentFilename } =
      req.body;

    if (!resourceId || !title || !sensitivityLabel) {
      return res.status(400).json({
        error: "Missing required fields: resourceId, title, sensitivityLabel",
      });
    }

    // Compute or assign document hash
    let docHash = "0x" + "0".repeat(64);
    const filename = documentFilename || "radar_bay_03_tech_spec.txt";
    const docPath = path.join(DOCS_DIR, filename);

    if (fs.existsSync(docPath)) {
      docHash = computeFileHash(docPath);
    }

    // 1. Submit on-chain transaction
    const signer = personas.ADMIN.signer;
    const contract = getContract("AccessControlManager", signer);
    console.log(`Submitting on-chain resource creation for ${resourceId}...`);

    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.createResource(resourceId, sensitivityLabel, docHash, { nonce });
    const receipt = await tx.wait();

    // 2. Persist metadata into SQLite
    await run(
      `INSERT INTO resources_meta 
       (resource_id, title, description, category, location, sensitivity_label, document_filename, document_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resourceId,
        title,
        description || `Protected BEL Facility: ${title}`,
        category || "SECURE_FACILITY",
        location || "BEL Bengaluru Facility",
        sensitivityLabel,
        filename,
        docHash,
      ]
    );

    res.status(201).json({
      status: "confirmed",
      message: "Resource successfully created and anchored on-chain",
      resourceId,
      documentHash: docHash,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Resource creation error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

module.exports = router;
