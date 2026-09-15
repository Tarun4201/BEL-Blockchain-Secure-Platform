# Bharat Electronics Limited (BEL) — Blockchain-Based Secure Identity, Access Control & Digital Asset Management Platform

> **Defence-Grade Prototype** for Decentralized Identity (DID), Role-Independent Attribute-Based Access Control (ABAC), ERC-721 Digital Asset Custody Tracking, and Cryptographic Tamper-Evident Document Verification.

---

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [Key Architecture & Core Principles](#key-architecture--core-principles)
3. [Prerequisites](#prerequisites)
4. [Quick Start (One-Command Setup & Run)](#quick-start-one-command-setup--run)
5. [Step-by-Step Multi-Terminal Workflow](#step-by-step-multi-terminal-workflow)
6. [Demo Personas](#demo-personas)
7. [Full Demo Walkthrough Guide (Presentation Ready)](#full-demo-walkthrough-guide-presentation-ready)
8. [Smart Contracts Overview](#smart-contracts-overview)
9. [Cryptographic Document & Integrity Flow](#cryptographic-document--integrity-flow)
10. [Rebuilding Audit Index from Blockchain Events](#rebuilding-audit-index-from-blockchain-events)
11. [Resetting the Demo Environment](#resetting-the-demo-environment)
12. [Troubleshooting & FAQs](#troubleshooting--faqs)
13. [Prototype Security Notice & Limitations](#prototype-security-notice--limitations)

---

## Executive Overview

In defence applications, traditional centralized databases represent single points of failure, vulnerable to insider threats, unauthorized data manipulation, and lack of verifiable auditability. 

This platform implements a **blockchain-anchored zero-trust architecture** for Bharat Electronics Limited (BEL), featuring:
- **Decentralized Identifiers (DIDs):** Every BEL personnel member is assigned a unique on-chain cryptographic identity (`did:bel:0x...`).
- **Explicit Access Control (Role ≠ Access):** Having a role (e.g. `ENGINEER`) is organizational metadata only. Access to protected resources requires an explicit, immutable on-chain grant issued by an authorized Admin.
- **ERC-721 Digital Asset Registry:** Defense hardware assets (e.g., Radar Unit RU-204) are tokenized NFTs with verifiable custody chain-of-title.
- **SHA-256 Off-Chain Document Anchoring:** Classified specifications and schematics remain off-chain, while their cryptographic SHA-256 hashes are anchored directly in smart contracts for instant tamper-evident verification.
- **Reconstructible Immutable Audit Trail:** Every identity registration, role assignment, access request, grant/revocation, and asset transfer produces on-chain events that can reconstruct the audit database from Genesis Block (#0) at any time.

---

## Key Architecture & Core Principles

```
  +-------------------------------------------------------------------------+
  |                        React Frontend (Vite)                            |
  |             (Port 5173 — Dark Navy/Steel Defense UI Theme)              |
  +-----------------------------------+-------------------------------------+
                                      | HTTP REST / JSON
                                      v
  +-------------------------------------------------------------------------+
  |                        Express Backend Service                          |
  |           (Port 5001 — Blockchain Indexer, Cryptographic Hasher)        |
  +------------------+------------------------------------+-----------------+
                     |                                    |
          Ethers.js v6 JSON-RPC                 Local SQLite Index Cache
                     |                         (Reconstructed from on-chain logs)
                     v                                    |
  +-------------------------------------------------------+                 |
  |              Local Hardhat Blockchain Node            |                 |
  |                     (Port 8545)                       |<----------------+
  |                                                       |
  |   • IdentityRegistry.sol                              |
  |   • AccessControlManager.sol                          |
  |   • AssetRegistry.sol (OpenZeppelin ERC-721)          |
  +-------------------------------------------------------+
```

---

## Prerequisites

Ensure your development machine has:
- **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` recommended)
- **npm**: `v9.0.0` or higher
- **Git**

No external database servers or cloud accounts are required; the entire stack runs locally and hermetically.

---

## Quick Start (One-Command Setup & Run)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd sih
npm install
```

### 2. Automated Setup
Run the setup script which initializes `.env`, creates storage directories, installs sub-dependencies, compiles contracts, and prepares configuration:
```bash
npm run setup
```

### 3. Launch the Stack
You can launch all services (Local Hardhat Node + Backend + Frontend) concurrently:
```bash
npm run dev
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## Step-by-Step Multi-Terminal Workflow

For presentations or troubleshooting, running services in separate terminals provides maximum log visibility:

### Terminal 1: Local Blockchain Node
```bash
npm run chain
```
*Starts local Hardhat Ethereum node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.*

### Terminal 2: Deploy Contracts & Seed Demo Data
```bash
npm run reset-demo
```
*Deploys the 3 smart contracts, computes SHA-256 hashes of test specifications, anchors them on-chain, seeds the Admin identity, creates protected resources, mints the RU-204 asset, and builds the initial audit index.*

### Terminal 3: Start Backend API
```bash
npm run backend
```
*Starts Express API at `http://localhost:5001` with real-time on-chain event indexer.*

### Terminal 4: Start Frontend UI
```bash
npm run frontend
```
*Starts Vite dev server at `http://localhost:5173`.*

---

## Demo Personas

The platform includes 3 pre-configured demo personas accessible via the top-right persona switcher:

| Persona | Name | Role | Department | Purpose in Demo |
|---|---|---|---|---|
| **🛡 ADMIN** | Admin (Security Officer) | `ADMIN` | Cyber Security & Directorate | Full administrative rights: registers identities, defines resources, grants/revokes access, mints assets, triggers audit rebuilds. |
| **👤 SHARMA** | R. Sharma | `ENGINEER` | Radar & Phased Array Systems | Target engineer. Demonstrates that having the `ENGINEER` role does NOT grant automatic access without explicit Admin approval. |
| **🔧 VERMA** | A. Verma | `TECHNICIAN` | Electronics Fabrication & Maintenance | Target technician for role switching and asset custody transfer. |

---

## Full Demo Walkthrough Guide (Presentation Ready)

Follow this 5-minute scenario to showcase all capabilities required by the PRD:

### Step 1: Inspect Seeded Admin Identity
1. Ensure the active persona is set to **🛡 Admin** (top-right).
2. Navigate to the **🪪 Identities** tab.
3. Observe the Admin identity recorded on-chain with DID `did:bel:0xf39fd6...`.

### Step 2: Register R. Sharma & Assign Engineer Role
1. In the **Register New Employee** form, click the **Fill: R. Sharma** quick button.
2. Click **⛓ Register on Blockchain**.
3. Watch the transaction toast transition from **Pending** to **Confirmed On-Chain**.
4. R. Sharma now appears in the on-chain directory with role `ENGINEER`.

### Step 3: Demonstrate Role ≠ Access (Access Gate Test)
1. Switch the active persona to **👤 R. Sharma** using the top-right switcher.
2. Navigate to the **🔐 Access Control** tab.
3. Locate **Radar Test Bay 3 — High-Frequency Phased Array** (`RADAR-BAY-03`).
4. Notice the status shows **NONE**. 
5. Even though R. Sharma is an `ENGINEER`, clicking **View Spec** is blocked because no explicit grant has been made on the smart contract.

### Step 4: Request Access on Blockchain
1. As **👤 R. Sharma**, click **⛓ Request Access** on `RADAR-BAY-03`.
2. Confirm the transaction. Status updates to **REQUESTED**.

### Step 5: Admin Grants Access
1. Switch active persona back to **🛡 Admin**.
2. Under **Access Control**, see the **🔔 Pending Access Requests** queue.
3. Click **✓ Grant** on R. Sharma's request.
4. An on-chain `grantAccess(did, "RADAR-BAY-03")` transaction executes.

### Step 6: Verify Access & Cryptographic Document Integrity
1. Switch back to **👤 R. Sharma**.
2. Status is now **GRANTED**.
3. Click **🔓 View Spec**.
4. The protected technical specification is decrypted/retrieved, and the SHA-256 hash is verified against the on-chain anchor:
   - Status: `✓ CRYPTOGRAPHICALLY VERIFIED - NO TAMPERING DETECTED`
5. Click **🔎 Verify Integrity** to independently recalculate the SHA-256 hash and verify with the contract.

### Step 7: Revoke Access
1. Switch to **🛡 Admin**.
2. Click **Revoke** for R. Sharma on `RADAR-BAY-03`.
3. Switch back to **👤 R. Sharma** — access is immediately blocked on-chain.

### Step 8: Tokenized Digital Asset Custody Transfer
1. Switch to **🛡 Admin** and navigate to the **⚙️ Digital Assets** tab.
2. Select **Radar Unit RU-204 (Asset #1)**.
3. In the transfer box, enter A. Verma's DID (`did:bel:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc`).
4. Click **⛓ Transfer On-Chain**.
5. Observe the **Custody Chain-of-Title (On-Chain History)** timeline update in real-time, showing the transfer event anchored on-chain.

### Step 9: Verify Immutable Audit Trail & Clickable Tx Hashes
1. Navigate to the **📋 Audit Trail** tab.
2. View all indexed events: `IdentityRegistered`, `RoleAssigned`, `AccessRequested`, `AccessGranted`, `AccessRevoked`, `AssetTransferred`.
3. Click any **⛓ Tx Hash** badge to open the **Verify On-Chain Transaction** modal, showing raw JSON-RPC block numbers, gas used, and cryptographic event logs.

### Step 10: Rebuild Audit Index from Blockchain Events
1. As **🛡 Admin** on the Audit tab, click **⛓ Rebuild Index From Chain**.
2. The SQLite index is completely erased and reconstructed solely by reading event logs from Block #0 to the latest block.
3. A success banner displays the number of reconstructed events and block span.

---

## Smart Contracts Overview

All smart contracts are located in `contracts/` and written in Solidity `^0.8.24` targeting EVM `cancun`:

1. **`IdentityRegistry.sol`**
   - Maps personnel DIDs (`did:bel:0x...`) to wallet addresses and organizational roles.
   - Enforces uniqueness and emits `IdentityRegistered` and `RoleAssigned` events.

2. **`AccessControlManager.sol`**
   - Resource registry holding sensitivity classifications and SHA-256 document hash anchors.
   - Per-resource explicit permissions table: `hasAccess(did, resourceId)`.
   - Access request workflow: `requestAccess()`, `grantAccess()`, `revokeAccess()`.
   - Emits `ResourceCreated`, `AccessRequested`, `AccessGranted`, `AccessRevoked`.

3. **`AssetRegistry.sol` (OpenZeppelin ERC-721)**
   - Inherits OpenZeppelin `ERC721URIStorage` and `Ownable`.
   - Mints unique tokenized defense hardware units with off-chain schematic hash anchors.
   - Tracks linear custody history (`getAssetHistory(tokenId)`).
   - Emits `AssetMinted`, `AssetTransferred`, `AssetRetired`.

---

## Cryptographic Document & Integrity Flow

1. **Off-Chain Storage:** Confidential files are stored in `backend/storage/documents/`.
2. **Hash Computation:** When an Admin creates a resource or mints an asset, `backend/utils/hasher.js` computes the SHA-256 digest (`crypto.createHash('sha256')`).
3. **On-Chain Anchor:** The SHA-256 hash is passed to `createResource()` or `mintAsset()` and stored in contract state.
4. **Integrity Check:** When a user accesses content, the backend re-computes the file's SHA-256 hash and compares it bit-for-bit against the on-chain anchor. If any file has been modified off-chain, the platform flags a tamper violation.

---

## Rebuilding Audit Index from Blockchain Events

The SQLite database (`backend/bel_platform.db`) serves as an accelerated read-cache. The single source of truth is always the blockchain:

- Endpoint: `POST /api/audit/rebuild`
- Function: `backend/indexer.js -> rebuildIndexFromChain()`
- Logic:
  1. Clears `audit_index` table.
  2. Queries all historic logs from `IdentityRegistry`, `AccessControlManager`, and `AssetRegistry` from block 0.
  3. Parses event args, fetches block timestamps, and repopulates the SQLite index.

---

## Resetting the Demo Environment

To return the prototype to a clean initial demo state:

```bash
npm run reset-demo
```

This single command:
1. Redeploys fresh contracts to the local node.
2. Clears and resets SQLite database tables.
3. Anchors mock document SHA-256 hashes.
4. Re-seeds Admin and initial resources/assets.
5. Rebuilds the event audit index from block 0.

---

## Troubleshooting & FAQs

### 1. `Cannot connect to Hardhat node (ECONNREFUSED 127.0.0.1:8545)`
- Make sure you started `npm run chain` in a separate terminal before running `npm run setup` or `npm run backend`.

### 2. `Contracts configuration not found (contracts.json)`
- Run `npm run reset-demo` to deploy the contracts and generate `backend/config/contracts.json` and `frontend/src/contracts.json`.

### 3. `Port 5001 or 5173 already in use`
- Ensure no older instances of node are running in the background. On Windows PowerShell:
  ```powershell
  Get-Process node | Stop-Process -Force
  ```

### 4. Running Unit Tests
To run the Hardhat contract test suite:
```bash
npm test
```

---

## Prototype Security Notice & Limitations

- **Local Prototype Keys:** The private keys included in `.env.example` are standard, deterministic Hardhat local development accounts. They are intended strictly for local offline demonstrations and testing.
- **Off-Chain Files:** In this prototype, mock documents are stored in local filesystem storage (`backend/storage/documents/`). In an enterprise deployment, this would interface with a classified IPFS cluster or secure on-prem object store.
- **Gas & Network:** The system is configured for Hardhat Local (Chain ID `31337`).

---

## Team & Presentation Checklist

- [x] Node.js 18+ verified
- [x] Hardhat node running on `127.0.0.1:8545`
- [x] `npm run reset-demo` executed cleanly
- [x] Backend running on `http://localhost:5001` (`/api/status` returns operational)
- [x] Frontend running on `http://localhost:5173`
- [x] All 3 personas verified
- [x] Document SHA-256 integrity verified
- [x] Rebuild index from blockchain verified
