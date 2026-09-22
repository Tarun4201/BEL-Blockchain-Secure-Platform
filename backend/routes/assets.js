const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { run, all, get } = require("../db");
const { getContract, personas, provider, getLatestNonce } = require("../blockchain");
const { computeFileHash, verifyDocumentIntegrity } = require("../utils/hasher");

const DOCS_DIR = path.join(__dirname, "..", "storage", "documents");

const withoutHashFields = ({ document_hash, documentHash, ...asset }) => asset;

/**
 * GET /api/assets
 * Returns list of defense assets with metadata and current owner
 */
router.get("/", async (req, res) => {
  try {
    const assets = await all("SELECT * FROM assets_meta ORDER BY asset_id ASC");
    res.json(assets.map(withoutHashFields));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/assets/:id
 * Get single asset with linear chain-of-title history from blockchain
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = Number(id);
    const asset = await get("SELECT * FROM assets_meta WHERE asset_id = ?", [assetId]);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Query on-chain history
    try {
      const contract = getContract("AssetRegistry");
      const onChain = await contract.getAsset(assetId);
      const onChainHistory = await contract.getOwnershipHistory(assetId);

      const parsedHistory = onChainHistory.map((h) => ({
        assetId: Number(h.assetId),
        fromDid: h.fromDid,
        toDid: h.toDid,
        transferredBy: h.transferredBy,
        timestamp: Number(h.timestamp),
      }));

      return res.json({
        ...withoutHashFields(asset),
        currentOwnerDid: onChain[2],
        status: Number(onChain[4]) === 0 ? "ACTIVE" : "RETIRED",
        mintedBy: onChain[5],
        mintedAt: Number(onChain[6]),
        onChain: {
          tokenId: Number(onChain[0]),
          metadataURI: onChain[1],
          currentOwnerDid: onChain[2],
          status: Number(onChain[4]) === 0 ? "ACTIVE" : "RETIRED",
          mintedBy: onChain[5],
          mintedAt: Number(onChain[6]),
          isVerifiedOnChain: true,
        },
        history: parsedHistory,
      });
    } catch (chainErr) {
      return res.json({
        ...withoutHashFields(asset),
        history: [],
        chainError: chainErr.message,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/assets
 * Admin mints a new defense asset (ERC-721) with document SHA-256 hash
 */
router.post("/", async (req, res) => {
  try {
    const { title, description, category, initialOwnerDid, documentFilename } = req.body;

    if (!title || !initialOwnerDid) {
      return res.status(400).json({ error: "Missing required fields: title, initialOwnerDid" });
    }

    // Compute document hash if document is specified
    const filename = documentFilename || "radar_unit_ru204_schematic.txt";
    const docPath = path.join(DOCS_DIR, filename);
    let docHash = "0x" + "0".repeat(64);
    if (fs.existsSync(docPath)) {
      docHash = computeFileHash(docPath);
    }

    const metadataURI = `bel://assets/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`;

    // Submit on-chain transaction
    const signer = personas.ADMIN.signer;
    const contract = getContract("AssetRegistry", signer);
    console.log(`Minting defense asset ${title} on-chain for ${initialOwnerDid}...`);

    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.mintAsset(metadataURI, initialOwnerDid, docHash, { nonce });
    const receipt = await tx.wait();

    // Find AssetMinted event log to get assetId
    let mintedAssetId = 1;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === "AssetMinted") {
          mintedAssetId = Number(parsed.args[0]);
          break;
        }
      } catch {}
    }

    // Save off-chain metadata in SQLite
    await run(
      `INSERT INTO assets_meta 
       (asset_id, title, description, category, document_filename, document_hash, status, current_owner_did)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        mintedAssetId,
        title,
        description || `Defense Hardware Asset: ${title}`,
        category || "DEFENSE_HARDWARE",
        filename,
        docHash,
        initialOwnerDid,
      ]
    );

    res.status(201).json({
      status: "confirmed",
      message: `Asset #${mintedAssetId} successfully minted on-chain`,
      assetId: mintedAssetId,
      title,
      currentOwnerDid: initialOwnerDid,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Asset minting error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * POST /api/assets/:id/transfer
 * Admin transfers custody of defense asset to a new owner DID
 */
router.post("/:id/transfer", async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerDid } = req.body;
    const assetId = Number(id);

    if (!newOwnerDid) {
      return res.status(400).json({ error: "Missing required field: newOwnerDid" });
    }

    const signer = personas.ADMIN.signer;
    const contract = getContract("AssetRegistry", signer);
    console.log(`Submitting on-chain asset custody transfer for Asset #${assetId} to ${newOwnerDid}...`);

    const nonce = await getLatestNonce(signer.address);
    const tx = await contract.transferAsset(assetId, newOwnerDid, { nonce });
    const receipt = await tx.wait();

    // Update SQLite cache
    await run("UPDATE assets_meta SET current_owner_did = ? WHERE asset_id = ?", [
      newOwnerDid,
      assetId,
    ]);

    res.json({
      status: "confirmed",
      message: `Custody of Asset #${assetId} successfully transferred to ${newOwnerDid}`,
      assetId,
      newOwnerDid,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("Asset transfer error:", err);
    res.status(400).json({ error: err.reason || err.message });
  }
});

/**
 * GET /api/assets/:id/verify-integrity
 * Verifies off-chain schematic/spec hash against on-chain token hash
 */
router.get("/:id/verify-integrity", async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = Number(id);

    const meta = await get("SELECT * FROM assets_meta WHERE asset_id = ?", [assetId]);
    if (!meta) {
      return res.status(404).json({ error: "Asset metadata not found" });
    }

    const contract = getContract("AssetRegistry");
    const onChainAsset = await contract.getAsset(assetId);
    const onChainHash = onChainAsset[3];

    const docPath = path.join(
      DOCS_DIR,
      meta.document_filename || "radar_unit_ru204_schematic.txt"
    );
    const result = verifyDocumentIntegrity(docPath, onChainHash);

    res.json({
      assetId,
      title: meta.title,
      filename: meta.document_filename,
      integrityVerified: result.matches,
      tamperEvidentVerdict: result.matches
        ? "PASSED: Asset schematic and hardware specifications match blockchain anchor."
        : "FAILED: File integrity check failed! Potential off-chain document tampering.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
