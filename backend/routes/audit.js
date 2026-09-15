const express = require("express");
const router = express.Router();
const { all, get } = require("../db");
const { provider, loadContractsConfig, personas } = require("../blockchain");
const { rebuildIndexFromChain } = require("../indexer");

/**
 * GET /api/audit
 * Query the indexed audit trail with comprehensive filtering
 */
router.get("/", async (req, res) => {
  try {
    const { eventType, actorDid, targetId, search, limit = 100, offset = 0 } = req.query;

    let sql = "SELECT * FROM audit_index WHERE 1=1";
    const params = [];

    if (eventType && eventType !== "ALL") {
      sql += " AND event_type = ?";
      params.push(eventType);
    }

    if (actorDid) {
      sql += " AND (actor_did LIKE ? OR details LIKE ?)";
      params.push(`%${actorDid}%`, `%${actorDid}%`);
    }

    if (targetId) {
      sql += " AND (target_id LIKE ? OR details LIKE ?)";
      params.push(`%${targetId}%`, `%${targetId}%`);
    }

    if (search) {
      sql += " AND (event_type LIKE ? OR actor_did LIKE ? OR target_id LIKE ? OR details LIKE ? OR tx_hash LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += " ORDER BY block_number DESC, id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const events = await all(sql, params);

    // Format details JSON
    const formatted = events.map((e) => {
      let parsedDetails = {};
      try {
        parsedDetails = JSON.parse(e.details);
      } catch {
        parsedDetails = { raw: e.details };
      }
      return {
        ...e,
        details: parsedDetails,
      };
    });

    const totalCount = await get("SELECT COUNT(*) as count FROM audit_index");

    res.json({
      total: totalCount ? totalCount.count : formatted.length,
      events: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/tx/:txHash
 * Direct on-chain verification endpoint querying raw blockchain node RPC
 * Used for "Verify on Chain" modal to demonstrate cryptographic proof
 */
router.get("/tx/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);

    if (!tx || !receipt) {
      return res.status(404).json({ error: "Transaction not found on local blockchain" });
    }

    const block = await provider.getBlock(receipt.blockNumber);

    res.json({
      isVerifiedOnChain: true,
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      nonce: tx.nonce,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      timestamp: block ? Number(block.timestamp) : null,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : "0",
      status: receipt.status === 1 ? "SUCCESS (CONFIRMED)" : "REVERTED",
      logsCount: receipt.logs.length,
      rawLogs: receipt.logs.map((l) => ({
        address: l.address,
        topics: l.topics,
        data: l.data,
        index: l.index,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audit/rebuild
 * Signature feature: Genuinely rebuilds the SQLite audit index from blockchain event logs
 */
router.post("/rebuild", async (req, res) => {
  try {
    const result = await rebuildIndexFromChain();
    res.json({
      success: true,
      message: "SQLite audit index completely reconstructed from on-chain event logs!",
      ...result,
    });
  } catch (err) {
    console.error("Rebuild index error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/status
 * Health, blockchain status, block height, and active personas
 */
router.get("/status", async (req, res) => {
  try {
    let blockNumber = 0;
    let isNodeConnected = false;

    try {
      blockNumber = await provider.getBlockNumber();
      isNodeConnected = true;
    } catch {
      isNodeConnected = false;
    }

    let contracts = {};
    try {
      contracts = loadContractsConfig().contracts;
    } catch {}

    const totalAuditEvents = await get("SELECT COUNT(*) as count FROM audit_index");
    const totalIdentities = await get("SELECT COUNT(*) as count FROM users");
    const totalResources = await get("SELECT COUNT(*) as count FROM resources_meta");
    const totalAssets = await get("SELECT COUNT(*) as count FROM assets_meta");

    res.json({
      status: "operational",
      isNodeConnected,
      currentBlockNumber: blockNumber,
      network: "Hardhat Local (ChainID: 31337)",
      counts: {
        identities: totalIdentities ? totalIdentities.count : 0,
        resources: totalResources ? totalResources.count : 0,
        assets: totalAssets ? totalAssets.count : 0,
        auditEvents: totalAuditEvents ? totalAuditEvents.count : 0,
      },
      contracts: Object.keys(contracts).map((name) => ({
        name,
        address: contracts[name].address,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
