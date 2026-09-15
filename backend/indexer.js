const { run, all } = require("./db");
const { getContract, provider } = require("./blockchain");

/**
 * Persist an event into SQLite audit_index table
 */
async function recordEvent({
  eventType,
  actorDid,
  targetId,
  details,
  txHash,
  blockNumber,
  timestamp,
}) {
  try {
    await run(
      `INSERT OR IGNORE INTO audit_index 
       (event_type, actor_did, target_id, details, tx_hash, block_number, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        actorDid || "SYSTEM",
        targetId || "N/A",
        typeof details === "string" ? details : JSON.stringify(details),
        txHash,
        blockNumber,
        timestamp || Math.floor(Date.now() / 1000),
      ]
    );
  } catch (err) {
    console.error(`Error recording event ${eventType}:`, err.message);
  }
}

/**
 * Parse a raw ethers EventLog into standard audit structure
 */
async function parseEventLog(contractName, eventName, log) {
  const block = await provider.getBlock(log.blockNumber);
  const timestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
  const txHash = log.transactionHash;
  const blockNumber = log.blockNumber;

  let actorDid = "SYSTEM";
  let targetId = "N/A";
  const details = {};

  const args = log.args;

  switch (eventName) {
    case "IdentityRegistered":
      actorDid = `did:bel:${args[2]}`; // registeredBy
      targetId = args[0]; // did
      details.userAddress = args[1];
      details.role = args[3];
      details.registeredBy = args[2];
      break;

    case "RoleAssigned":
      actorDid = `did:bel:${args[2]}`; // assignedBy
      targetId = args[0]; // did
      details.newRole = args[1];
      details.assignedBy = args[2];
      break;

    case "ResourceCreated":
      actorDid = `did:bel:${args[3]}`; // createdBy
      targetId = args[0]; // resourceId
      details.sensitivityLabel = args[1];
      details.documentHash = args[2];
      details.createdBy = args[3];
      break;

    case "AccessRequested":
      actorDid = args[0]; // did
      targetId = args[1]; // resourceId
      details.requestedBy = args[2];
      break;

    case "AccessGranted":
      actorDid = `did:bel:${args[2]}`; // grantedBy
      targetId = args[1]; // resourceId
      details.beneficiaryDid = args[0];
      details.grantedBy = args[2];
      break;

    case "AccessRevoked":
      actorDid = `did:bel:${args[2]}`; // revokedBy
      targetId = args[1]; // resourceId
      details.targetDid = args[0];
      details.revokedBy = args[2];
      break;

    case "AssetMinted":
      actorDid = `did:bel:${args[4]}`; // mintedBy
      targetId = `ASSET-${args[0].toString()}`;
      details.assetId = Number(args[0]);
      details.metadataURI = args[1];
      details.ownerDid = args[2];
      details.documentHash = args[3];
      details.mintedBy = args[4];
      break;

    case "AssetTransferred":
      actorDid = `did:bel:${args[3]}`; // transferredBy
      targetId = `ASSET-${args[0].toString()}`;
      details.assetId = Number(args[0]);
      details.fromDid = args[1];
      details.toDid = args[2];
      details.transferredBy = args[3];
      break;

    case "AssetRetired":
      actorDid = `did:bel:${args[1]}`; // retiredBy
      targetId = `ASSET-${args[0].toString()}`;
      details.assetId = Number(args[0]);
      details.retiredBy = args[1];
      break;

    default:
      targetId = log.address;
  }

  return {
    eventType: eventName,
    actorDid,
    targetId,
    details,
    txHash,
    blockNumber,
    timestamp,
    logIndex: log.index,
    transactionIndex: log.transactionIndex,
  };
}

/**
 * Genuinely rebuilds the entire SQLite audit index by querying contract event logs
 * from block 0 to the latest block.
 */
async function rebuildIndexFromChain() {
  const startTime = Date.now();
  console.log("--> Starting genuine Rebuild Index From Chain...");

  const latestBlock = await provider.getBlockNumber();

  // Clear current audit index
  await run("DELETE FROM audit_index");

  const identityContract = getContract("IdentityRegistry");
  const accessContract = getContract("AccessControlManager");
  const assetContract = getContract("AssetRegistry");

  const eventConfigs = [
    { contract: identityContract, name: "IdentityRegistry", events: ["IdentityRegistered", "RoleAssigned"] },
    {
      contract: accessContract,
      name: "AccessControlManager",
      events: ["ResourceCreated", "AccessRequested", "AccessGranted", "AccessRevoked"],
    },
    {
      contract: assetContract,
      name: "AssetRegistry",
      events: ["AssetMinted", "AssetTransferred", "AssetRetired"],
    },
  ];

  const allParsedEvents = [];

  for (const config of eventConfigs) {
    for (const eventName of config.events) {
      try {
        const filter = config.contract.filters[eventName]();
        const logs = await config.contract.queryFilter(filter, 0, latestBlock);
        for (const log of logs) {
          const parsed = await parseEventLog(config.name, eventName, log);
          allParsedEvents.push(parsed);
        }
      } catch (err) {
        console.warn(`Could not query logs for ${config.name}.${eventName}:`, err.message);
      }
    }
  }

  // Sort chronologically by block number and transaction index
  allParsedEvents.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    if (a.transactionIndex !== b.transactionIndex) return a.transactionIndex - b.transactionIndex;
    return a.logIndex - b.logIndex;
  });

  // Re-insert into SQLite database
  for (const ev of allParsedEvents) {
    await recordEvent(ev);
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `✓ Rebuilt audit index: ${allParsedEvents.length} events processed up to block #${latestBlock} in ${durationMs}ms.`
  );

  return {
    reconstructedCount: allParsedEvents.length,
    latestBlock,
    durationMs,
  };
}

/**
 * Attach real-time event listeners to blockchain contracts
 */
function startIndexer() {
  try {
    const identityContract = getContract("IdentityRegistry");
    const accessContract = getContract("AccessControlManager");
    const assetContract = getContract("AssetRegistry");

    console.log("--> Initializing real-time blockchain event indexer...");

    // Identity events
    identityContract.on("IdentityRegistered", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("IdentityRegistry", "IdentityRegistered", eventLog);
      await recordEvent(parsed);
    });

    identityContract.on("RoleAssigned", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("IdentityRegistry", "RoleAssigned", eventLog);
      await recordEvent(parsed);
    });

    // Access Control events
    accessContract.on("ResourceCreated", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AccessControlManager", "ResourceCreated", eventLog);
      await recordEvent(parsed);
    });

    accessContract.on("AccessRequested", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AccessControlManager", "AccessRequested", eventLog);
      await recordEvent(parsed);
    });

    accessContract.on("AccessGranted", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AccessControlManager", "AccessGranted", eventLog);
      await recordEvent(parsed);
    });

    accessContract.on("AccessRevoked", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AccessControlManager", "AccessRevoked", eventLog);
      await recordEvent(parsed);
    });

    // Asset events
    assetContract.on("AssetMinted", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AssetRegistry", "AssetMinted", eventLog);
      await recordEvent(parsed);
    });

    assetContract.on("AssetTransferred", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AssetRegistry", "AssetTransferred", eventLog);
      await recordEvent(parsed);
      // Synchronize current_owner_did in assets_meta cache
      if (parsed.details && parsed.details.assetId && parsed.details.toDid) {
        await run("UPDATE assets_meta SET current_owner_did = ? WHERE asset_id = ?", [
          parsed.details.toDid,
          parsed.details.assetId,
        ]);
      }
    });

    assetContract.on("AssetRetired", async (...args) => {
      const eventLog = args[args.length - 1];
      const parsed = await parseEventLog("AssetRegistry", "AssetRetired", eventLog);
      await recordEvent(parsed);
      if (parsed.details && parsed.details.assetId) {
        await run("UPDATE assets_meta SET status = 'RETIRED' WHERE asset_id = ?", [
          parsed.details.assetId,
        ]);
      }
    });

    console.log("✓ Real-time event listeners active for all 3 contracts.");
  } catch (err) {
    console.warn("Could not start real-time event listeners yet:", err.message);
  }
}

module.exports = {
  recordEvent,
  rebuildIndexFromChain,
  startIndexer,
};
