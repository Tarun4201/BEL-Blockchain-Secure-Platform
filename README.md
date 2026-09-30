# Bharat Electronics Limited (BEL) — Blockchain-Based Secure Identity, Access Control & Digital Asset Platform

> **Defence-Grade Production & MVP Platform** for Decentralized Identity (DID), Explicit Attribute-Based Access Control (ABAC), ERC-721 Digital Asset Custody Tracking, Off-Chain Document Cryptographic Anchoring, and Automated Blockchain Event Audit Indexing.

---

## 🌐 Live Production Deployment

| Component | Service | Status / Link |
| :--- | :--- | :--- |
| **Live Demo Application** | **Vercel** | **[https://bel-blockchain-secure-platform-livid.vercel.app/](https://bel-blockchain-secure-platform-livid.vercel.app/)** |
| **Backend REST API** | **Render** | `https://bel-blockchain-secure-platform.onrender.com` |
| **Cloud Database** | **Turso (libSQL)** | AWS Asia-Pacific (Mumbai) Serverless Instance |
| **Blockchain Network** | **Polygon Amoy** | Public EVM Testnet (Chain ID: `80002`) |

> **24/7 Cloud Availability:** The deployed platform operates 100% autonomously in the cloud across Vercel, Render, Turso, and Polygon Amoy without requiring any local developer PC or workstation to remain online.

---

## 📜 Deployed Smart Contracts (Polygon Amoy Testnet)

All smart contracts are verified and deployed on the **Polygon Amoy Testnet** (Chain ID: `80002`):

| Contract | Address | Polygonscan Block Explorer |
| :--- | :--- | :--- |
| **`IdentityRegistry`** | `0xC928127C89339269645217cC7aAB8c604Fa717f3` | [View on Amoy Polygonscan](https://amoy.polygonscan.com/address/0xC928127C89339269645217cC7aAB8c604Fa717f3) |
| **`AccessControlManager`** | `0x2FFD26016cb9F1638f86d03Fb118B90288B8bf64` | [View on Amoy Polygonscan](https://amoy.polygonscan.com/address/0x2FFD26016cb9F1638f86d03Fb118B90288B8bf64) |
| **`AssetRegistry` (ERC-721)** | `0xb2A2D16CbE6B56c278341d40ee70f1F723Bfe62f` | [View on Amoy Polygonscan](https://amoy.polygonscan.com/address/0xb2A2D16CbE6B56c278341d40ee70f1F723Bfe62f) |

---

## Table of Contents
1. [Executive Summary & Problem Statement](#executive-summary--problem-statement)
2. [End-to-End System Architecture](#end-to-end-system-architecture)
3. [Core Capabilities & Functional Modules](#core-capabilities--functional-modules)
4. [Technology Stack](#technology-stack)
5. [Demo Personas & Presentation Flow](#demo-personas--presentation-flow)
6. [Smart Contracts Architecture](#smart-contracts-architecture)
7. [Cryptographic Document & Integrity Flow](#cryptographic-document--integrity-flow)
8. [Local Development & Testing](#local-development--testing)
9. [Production Cloud Deployment](#production-cloud-deployment)
10. [Security & Environment Hygiene](#security--environment-hygiene)
11. [Known Limitations & Future Roadmap (SIH Context)](#known-limitations--future-roadmap-sih-context)

---

## Executive Summary & Problem Statement

In mission-critical defence manufacturing and electronics fabrication environments like **Bharat Electronics Limited (BEL)**, traditional perimeter security and centralized databases represent single points of failure:
- **Insider Threat Risk:** Central database administrators can modify access logs, tamper with audit trails, or alter equipment maintenance records undetected.
- **Role Creep & Overprivileged Access:** Relying solely on broad organizational roles (e.g., `ENGINEER`) often grants sweeping access to classified technical schematics without explicit, auditable authorization.
- **Custody Disputes:** High-value defence hardware modules (such as radar transmitter units and electronic warfare payloads) lack immutable chain-of-title tracking across production units, testing bays, and external armed forces depots.

### The BEL Blockchain Solution
This platform introduces a **Zero-Trust, Blockchain-Anchored Architecture**:
- **Decentralized Identifiers (DIDs):** Every employee, security officer, and technician is issued a unique on-chain cryptographic identifier (`did:bel:0x...`).
- **Explicit Access Control (Role ≠ Access):** Having a role is strictly organizational metadata. Access to protected technical specifications requires an explicit, smart-contract-anchored access grant from an authorized Admin.
- **ERC-721 Digital Asset Registry:** High-assurance defense hardware units are tokenized as NFTs with immutable on-chain custody and maintenance history.
- **Cryptographic Document Anchoring:** Confidential technical specifications remain stored off-chain, while their cryptographic SHA-256 hashes are anchored in smart contracts for instant tamper-evident integrity checks.
- **Reconstructible Immutable Audit Trail:** The entire audit database can be erased and completely reconstructed from Genesis block solely by replaying on-chain event logs.

---

## End-to-End System Architecture

```
                                  [ User Browser ]
                                         │
                                         ▼ HTTPS
                            ┌────────────────────────┐
                            │    Vercel Frontend     │
                            │   (React 19 + Vite)    │
                            └────────────┬───────────┘
                                         │ REST API (JSON / TLS)
                                         ▼
                            ┌────────────────────────┐
                            │   Render Backend API   │
                            │ (Node.js Express 24/7) │
                            └─────┬────────────┬─────┘
                                  │            │
                  libSQL Protocol │            │ Ethers.js v6 JSON-RPC
                                  ▼            ▼
             ┌─────────────────────────┐  ┌─────────────────────────────┐
             │    Turso Cloud DB       │  │   Polygon Amoy Testnet      │
             │ (libSQL Serverless DB)  │  │      (Chain ID: 80002)      │
             └─────────────────────────┘  └──────────────┬──────────────┘
                                                         │
                                           ┌─────────────┴─────────────┐
                                           │ • IdentityRegistry.sol    │
                                           │ • AccessControlManager.sol│
                                           │ • AssetRegistry.sol (NFT) │
                                           └───────────────────────────┘
```

### Architecture Breakdown:
1. **User / Browser:** Accesses the high-performance responsive frontend deployed on Vercel's global edge network.
2. **Vercel Frontend:** Interacts with the backend via secure HTTPS requests; displays interactive dashboards, real-time transaction toasts, cryptographic integrity verifiers, and multi-persona switchers.
3. **Render Backend:** Runs a continuous Node.js Express service providing REST endpoints, cryptographic SHA-256 hash validation, real-time blockchain event indexers, and persona wallet signing.
4. **Turso Cloud Database:** Persistent, serverless libSQL database (SQLite-compatible) hosted on AWS Mumbai, caching synced blockchain state, ERP organizational units, and user profiles.
5. **Polygon Amoy Blockchain:** Public Ethereum-compatible Layer-2 testnet executing Solidity smart contracts and persisting all identity registrations, access grants, asset transfers, and audit logs.

---

## Core Capabilities & Functional Modules

### 1. Identity & Role Management (`🪪 Identities`)
- On-chain registration of personnel DIDs (`did:bel:<wallet_address>`).
- Role assignment (`ADMIN`, `ENGINEER`, `TECHNICIAN`, `MANAGER`).
- Provenance tracking (who registered each identity and at what block timestamp).

### 2. Explicit Access Control (`🔐 Access Control`)
- **Strict Role ≠ Access Enforcement:** Engineers cannot view classified technical documents without an explicit on-chain grant.
- **Full Lifecycle:** `Request Access` ➔ `Admin Review Queue` ➔ `On-Chain Grant` ➔ `View Technical Spec` ➔ `Instant Revocation`.
- Sensitivity level classification (`RESTRICTED`, `SECRET`, `TOP_SECRET`).

### 3. Digital Asset Registry & Custody (`⚙️ Digital Assets`)
- ERC-721 tokenized defense assets (e.g., `Radar Unit RU-204`, `EW Jammer Bay 2`).
- Linear chain-of-custody tracking with transfer logs and security approver requirements.
- Service lifecycle events (calibration, maintenance, operational deployment, retirement).

### 4. Cryptographic Document Tamper Verification (`🔎 Document Integrity`)
- Technical specifications are hashed using SHA-256 upon creation.
- The hash is anchored permanently on Polygon Amoy.
- Real-time client-side and server-side verification: flags any byte-level modification of off-chain files as a tamper violation.

### 5. Reconstructible Immutable Audit Trail (`📋 Audit Trail`)
- Chronological timeline of all on-chain events (`IdentityRegistered`, `AccessGranted`, `AssetTransferred`, etc.).
- Direct clickable transaction links to Polygonscan block explorer.
- **One-Click Index Reconstruction:** Ability to wipe local cache and rebuild the complete audit trail directly from smart contract event logs from Block #0.

### 6. BEL Enterprise ERP Integration (`🏢 ERP Portal`)
- Real-time departmental hierarchies (Radars, EW Systems, Missile Systems, Avionics).
- Cross-departmental clearance workflows and security alert streams.

---

## Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, Vite, Tailwind-free Vanilla CSS (Dark Navy & Steel Theme), Lucide Icons |
| **Frontend Hosting** | Vercel Edge CDN |
| **Backend API** | Node.js, Express 4, Ethers.js v6, CORS, Dotenv |
| **Backend Hosting** | Render Web Services (Node.js runtime) |
| **Cloud Database** | Turso (libSQL Serverless SQLite engine) |
| **Blockchain** | Polygon Amoy Testnet (Chain ID `80002`, EVM Cancun) |
| **Smart Contracts** | Solidity `^0.8.24`, OpenZeppelin Contracts v5 (ERC-721, Ownable) |
| **Development & Testing** | Hardhat, Mocha, Chai, Hardhat Ethers |

---

## Demo Personas & Presentation Flow

The platform includes 3 pre-configured demo personas switchable in the top navigation bar:

| Persona | Name | Role | Department | Role in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **🛡️ ADMIN** | Admin (Security Officer) | `ADMIN` | Cyber Security & Directorate | Approves access requests, registers identities, mints assets, triggers audit rebuilds. |
| **👤 SHARMA** | R. Sharma | `ENGINEER` | Radar & Phased Array Systems | Proves **Role ≠ Access**: engineer is blocked until Admin approves request on-chain. |
| **🔧 VERMA** | A. Verma | `TECHNICIAN` | Electronics Fabrication & Maintenance | Custody recipient for hardware asset transfers. |

### 5-Minute Presentation Flow:
1. **Login as Admin:** Inspect the on-chain identity registry and deployed smart contract parameters.
2. **Register Employee:** Register `R. Sharma` with role `ENGINEER`. Observe the on-chain confirmation toast.
3. **Switch to Sharma (Gate Test):** Navigate to **Access Control** > select `RADAR-BAY-03`. Notice access is **BLOCKED** despite having the `ENGINEER` role.
4. **Request Access:** Click **Request Access** as Sharma (creates on-chain request event).
5. **Switch to Admin & Grant:** Admin opens pending requests queue and clicks **Grant Access** (executes on-chain grant).
6. **Verify Access & Tamper-Check:** Switch back to Sharma > click **View Spec** > view decrypted technical specification with `✓ CRYPTOGRAPHICALLY VERIFIED - NO TAMPERING DETECTED`.
7. **Transfer Asset Custody:** Switch to Admin > transfer `Radar Unit RU-204` to `A. Verma` > inspect the on-chain chain-of-title timeline.
8. **Inspect Audit Trail:** Open **Audit Trail** > click a transaction hash to view on-chain block receipt on Polygonscan > click **Rebuild Index from Chain** to demonstrate 100% blockchain data reconstructibility.

---

## Smart Contracts Architecture

All contracts are located in [`contracts/`](file:///e:/sih/contracts) and compiled using Hardhat:

1. **`IdentityRegistry.sol`**
   - Stores mapping from DID strings to user addresses, roles, registration timestamps, and authorized registering authority.
   - Prevents duplicate DID or wallet registrations.
   - Emits `IdentityRegistered` and `RoleAssigned`.

2. **`AccessControlManager.sol`**
   - Stores resource metadata, sensitivity level, and document SHA-256 cryptographic hash.
   - Maintains explicit per-resource access tables: `hasAccess(did, resourceId)`.
   - Manages state machine: `NONE` ➔ `REQUESTED` ➔ `GRANTED` ➔ `REVOKED`.
   - Emits `ResourceCreated`, `AccessRequested`, `AccessGranted`, `AccessRevoked`.

3. **`AssetRegistry.sol` (ERC-721)**
   - Extends OpenZeppelin `ERC721URIStorage` and `Ownable`.
   - Mints defense asset NFTs with off-chain schematic hash anchors.
   - Implements linear custody chain-of-title (`getAssetHistory(tokenId)`).
   - Supports dual-signature high-assurance security transfers and service history logs.

---

## Cryptographic Document & Integrity Flow

```
+---------------------+       SHA-256        +-----------------------+
|  Confidential Spec  | -------------------> | 64-character Hex Hash |
|  (Off-Chain File)   |                      +-----------┬-----------+
+---------------------+                                  │
                                                         ▼
                                             +-----------------------+
                                             | Polygon Amoy Contract |
                                             |  (Immutable Anchor)   |
                                             +-----------┬-----------+
                                                         │
   User Access Verification:                             │
   Calculated File Hash <================================+ Comparison (Bit-for-Bit)
   [ MATCH: Verified Authentic | MISMATCH: Tamper Alert ]
```

1. **Off-Chain Storage:** Technical specifications remain in secure storage (`backend/storage/documents/`).
2. **Hash Computation:** SHA-256 digest is generated using Node.js crypto utilities.
3. **On-Chain Anchor:** Hash is passed during `createResource()` and locked into smart contract storage.
4. **Verification:** When accessed, the system recomputes the SHA-256 hash and verifies against the contract.

---

## Local Development & Testing

### Prerequisites
- Node.js `v18.0.0+`
- npm `v9.0.0+`
- Git

### 1. Installation
```bash
git clone https://github.com/harshab054/BEL-Blockchain-Secure-Platform.git
cd BEL-Blockchain-Secure-Platform
npm install
npm run setup
```

### 2. Run All Automated Unit Tests
```bash
npm test
```
*Executes all 11 Hardhat smart contract test suites covering identity, ABAC lifecycle, and ERC-721 custody.*

### 3. Run Locally (Full Stack with Local Blockchain)
```bash
npm run dev
```
- Local Hardhat Node: `http://127.0.0.1:8545`
- Backend API: `http://localhost:5001`
- Frontend UI: `http://localhost:5173`

---

## Production Cloud Deployment

### Backend on Render
- **Repository:** `harshab054/BEL-Blockchain-Secure-Platform`
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables Required:**
  - `NODE_ENV=production`
  - `PORT=5001`
  - `RPC_URL=https://polygon-amoy-bor-rpc.publicnode.com`
  - `CHAIN_ID=80002`
  - `BLOCKCHAIN_NETWORK_NAME=Polygon Amoy Testnet (ChainID: 80002)`
  - `TURSO_DATABASE_URL=libsql://your-database.turso.io`
  - `TURSO_AUTH_TOKEN=your-turso-token`
  - `ADMIN_ADDRESS=0x...`
  - `ADMIN_PRIVATE_KEY=0x...`
  - `CORS_ORIGIN=*`

### Frontend on Vercel
- **Repository:** `harshab054/BEL-Blockchain-Secure-Platform`
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables Required:**
  - `VITE_API_URL=https://your-render-backend-url.onrender.com`

---

## Security & Environment Hygiene

- **Public Testnet Notice:** Polygon Amoy is a testnet for demonstration and evaluation. No real funds or mainnet assets are used.
- **Zero-Secret Commits:** All secrets (`.env`, `backend/.env`, private keys, Turso tokens) are excluded via [`.gitignore`](file:///e:/sih/.gitignore).
- **Client-Safe Bundles:** The frontend bundle contains zero private keys or server tokens; all blockchain transactions in the demo environment are signed securely via backend persona wallets.

---

## Known Limitations & Future Roadmap (SIH Context)

1. **Storage Scaling:** Production enterprise deployment would replace local document storage with an air-gapped IPFS / InterPlanetary File System cluster or private MinIO S3 object store.
2. **Hardware Security Modules (HSM):** Integration of FIPS 140-2 Level 3 HSM / Smart Card hardware tokens for personnel key management.
3. **Zero-Knowledge Proofs (ZKP):** Implementing zk-SNARKs for privacy-preserving attribute verification without exposing employee department or clearance level on-chain.
4. **Multi-Signature Approvals:** Expanding high-assurance asset transfers to require $M$-of-$N$ multi-sig approval from both Base Commander and Directorate Security Officers.

---

## License & Attribution

Developed for **Smart India Hackathon (SIH)** — **Bharat Electronics Limited (BEL)** Problem Statement.
All rights reserved © Bharat Electronics Limited / SIH Project Team.
