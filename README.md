# BEL TrustGrid — Blockchain-Based Secure Identity, Access Control & Digital Asset Platform

> A **demonstration platform for secure enterprise governance** at Bharat Electronics Limited (BEL). TrustGrid combines decentralized identity (DID), explicit role- and project-scoped access, digital-asset custody, protected audit evidence, and an optional MetaMask wallet proof in one responsive web portal.

---

## 🌐 Live Production Deployment

| Component | Service | Status / Link |
| :--- | :--- | :--- |
| **Live Demo Application** | **Vercel** | **[https://bel-blockchain-secure-platform-kkef.vercel.app/](https://bel-blockchain-secure-platform-kkef.vercel.app/)** |
| **Backend REST API** | **Render** | **[https://bel-blockchain-secure-platform.onrender.com](https://bel-blockchain-secure-platform.onrender.com)** |
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
2. [What's Included in the Current Demo](#whats-included-in-the-current-demo)
3. [End-to-End System Architecture](#end-to-end-system-architecture)
4. [Core Capabilities & Functional Modules](#core-capabilities--functional-modules)
5. [Technology Stack](#technology-stack)
6. [Demo Roles, Projects & Access Model](#demo-roles-projects--access-model)
7. [Smart Contracts Architecture](#smart-contracts-architecture)
8. [Cryptographic Document & Integrity Flow](#cryptographic-document--integrity-flow)
9. [Local Development & Testing](#local-development--testing)
10. [Production Cloud Deployment](#production-cloud-deployment)
11. [Security & Environment Hygiene](#security--environment-hygiene)
12. [Known Limitations & Future Roadmap (SIH Context)](#known-limitations--future-roadmap-sih-context)

---

## Executive Summary & Problem Statement

In mission-critical defence manufacturing and electronics fabrication environments like **Bharat Electronics Limited (BEL)**, traditional perimeter security and centralized databases represent single points of failure:
- **Insider Threat Risk:** Central database administrators can modify access logs, tamper with audit trails, or alter equipment maintenance records undetected.
- **Role Creep & Overprivileged Access:** Relying solely on broad organizational roles (e.g., `ENGINEER`) often grants sweeping access to classified technical schematics without explicit, auditable authorization.
- **Custody Disputes:** High-value defence hardware modules (such as radar transmitter units and electronic warfare payloads) lack immutable chain-of-title tracking across production units, testing bays, and external armed forces depots.

### The BEL TrustGrid Solution
This platform introduces a **Zero-Trust, Blockchain-Anchored Architecture**:
- **Decentralized Identifiers (DIDs):** Every employee, security officer, and technician is issued a unique on-chain cryptographic identifier (`did:bel:0x...`).
- **Explicit Access Control (Role ≠ Access):** Having a role is strictly organizational metadata. Access to protected technical specifications requires an explicit, smart-contract-anchored access grant from an authorized Admin.
- **ERC-721 Digital Asset Registry:** High-assurance defense hardware units are tokenized as NFTs with immutable on-chain custody and maintenance history.
- **Cryptographic Document Anchoring:** Confidential technical specifications remain stored off-chain, while their cryptographic SHA-256 hashes are anchored in smart contracts for instant tamper-evident integrity checks.
- **Reconstructible Immutable Audit Trail:** The entire audit database can be erased and completely reconstructed from Genesis block solely by replaying on-chain event logs.

## What's Included in the Current Demo

The current portal is built as a polished, role-aware enterprise demonstration rather than a single administrator dashboard.

- **Four login paths:** Employee, Vendor, Customer, and ERP Admin. The sign-in sequence visibly progresses through protected credential, DID/identity, blockchain-evidence, and workspace checks before opening the selected portal.
- **Role- and project-specific workspaces:** Demo users from Procurement, Finance, Production, Quality, Engineering/R&D, Logistics, Asset Custody, HR, Compliance, Audit, Vendor, and Customer roles see their assigned department modules, projects, records, and task context. Administrators can see the cross-organisation portfolio and approval queues.
- **Shared TrustGrid workspace:** Every portal includes the common governance screens: Overview, Identity, Users & Roles, Digital Assets, Asset Passport, Access Requests, Permissions, Temporary Access, Verification, Audit Trail, Blockchain Activity, Security Insights, Architecture, Profile, and Settings.
- **Access requests with separation of duties:** Non-admin users request a narrowly scoped, justified, time-bound permission. Administrators alone can approve, reject, revoke, and monitor requests. Approved temporary access expires automatically.
- **Digital-asset lifecycle:** Mock assets include categories, sensitivity levels, owners, token status, lifecycle milestones, custody events, verification results, and a detailed Asset Passport view.
- **Security evidence:** Audit events, recent transactions, security signals, verification panels, and an architecture flow make the governance process visible without exposing private keys or full wallet addresses.
- **Optional MetaMask proof:** A signed challenge proves control of a selected wallet. The portal never asks MetaMask to submit a transaction or disclose a private key; wallet proof does not change a user's role or create permissions.
- **Guided onboarding:** A compact in-product guide focuses on the higher-complexity TrustGrid workflows, such as access approval, asset custody, and blockchain evidence.

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

### 1. Identity & Role Management (`🪪 Identity`)
- DID creation and verification views for personnel identities, including employee ID, department, role, status, wallet label, and change history.
- Role-aware user and role management with distinct Admin, Manager, Auditor, and User views in the shared workspace.
- Provenance tracking for identity events, including the registering authority and recorded evidence.

### 2. Explicit Access Control (`🔐 Access Control`)
- **Strict Role ≠ Access Enforcement:** A user role describes organisational responsibility; it does not independently unlock confidential records or another department's workspace.
- **Full Lifecycle:** `Request Access` ➔ `Administrator Review` ➔ `Approved / Denied` ➔ `Time-bound Use` ➔ `Expiry or Revocation`.
- Requests capture target department, SBU, module, permission, mission purpose, priority, access mode, and requested duration. Emergency requests are explicitly limited and auditable.
- Sensitivity labels and time-bound access policies provide least-privilege defaults for restricted workflows.

### 3. Digital Asset Registry & Custody (`⚙️ Digital Assets`)
- Digital asset registration with category, owner, department, sensitivity, status, token ID, and Passport action.
- Asset Passports show a readable lifecycle: registration, minting, assignment, permission changes, transfer, service, verification, and retirement events.
- High-assurance custody changes support approval checkpoints, and all demo asset data is fictional.

### 4. Cryptographic Document Tamper Verification (`🔎 Verification`)
- Technical specifications are hashed using SHA-256 upon creation.
- The hash is anchored permanently on Polygon Amoy.
- Real-time client-side and server-side verification: flags any byte-level modification of off-chain files as a tamper violation.

### 5. Audit, Blockchain Activity & Security Insights (`📋 Audit Trail`)
- Searchable chronological audit timeline for identity, asset, access, permission, and security events.
- Blockchain Activity shows a simple actor → TrustGrid application → contract → ledger flow alongside recent transaction evidence.
- Security Insights identifies suspicious and high-risk activity, supports acknowledgement filtering, and separates security signal review from ordinary user access.

### 6. BEL Enterprise Role Portals (`🏢 ERP Portal`)
- Departmental workspaces and fictional project data for Procurement, Finance, Production, Quality, Engineering/R&D, Logistics, Asset Custody, HR, Compliance, Audit, Vendor, and Customer operations.
- Admin portfolio visibility across projects, users, access requests, assets, and security status.
- Role-specific navigation ensures users see only their authorised modules, while the common TrustGrid governance modules remain consistently available.

### 7. Wallet Assurance (`◇ MetaMask`)
- Optional browser-wallet connection from **Settings → Wallet**.
- MetaMask signs a server-provided challenge through `personal_sign`; this is a proof of wallet control, not a blockchain transaction.
- The verified wallet label remains available while the user moves between portal screens in the same signed-in session.

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

## Demo Roles, Projects & Access Model

The sign-in page offers separate **Employee**, **Vendor**, **Customer**, and **ERP Admin** paths. Each demo profile has an assigned BEL unit, department, SBU, organisational role, project relationship, and least-privilege module set. All sample identities, assets, projects, and records are fictional and intended for demonstration only.

| Portal audience | Examples of role-specific context | Allowed experience |
| :--- | :--- | :--- |
| **ERP Admin** | Organisation-wide project portfolio, identity governance, security signals, access decisions, asset custody | Reviews all portfolios and requests; approves, rejects, or revokes access; administers governance views. |
| **Procurement / Finance** | Supplier, purchasing, finance, and approval records | Works with assigned commercial workflows; requests further access where required. |
| **Production / Quality / Engineering-R&D / Logistics** | Manufacturing, quality, technical project, inventory, lifecycle, and movement records | Views only the assigned operational project context and authorised task modules. |
| **Asset Custody / Compliance / Internal Audit** | Custody evidence, audit records, controls, and security signals | Reviews evidence and authorised assurance workflows; does not gain unrelated operational access. |
| **Vendor / Customer** | External order or delivery records | Sees only the external records associated with that account. |

### Access decision rules

1. A signed-in non-admin user can use only their primary workspace and any currently approved temporary workspace.
2. To use a protected module outside that scope, the user submits an access request with a business justification and duration.
3. An ERP Admin is responsible for the decision. The application does not allow employees, vendors, or customers to self-grant a permission.
4. Approved access is limited to the stated workspace and permission, recorded in the audit evidence, and automatically expires at its end date.
5. Admin visibility is broader than employee visibility: the admin dashboard shows the project portfolio, requests, assets, identities, and security posture across the demo organisation.

### Suggested 5-minute presentation flow

1. **Sign in as an employee:** Choose a department-specific demo profile and observe the secure login verification animation.
2. **Open the role workspace:** Show that the projects, task context, and navigation reflect that employee's department and role.
3. **Request controlled access:** Submit a justified, time-bound request for a protected department/module.
4. **Sign in as ERP Admin:** Open the Access Requests view, inspect the context, and approve or deny the request.
5. **Return to the user portal:** Demonstrate the approved temporary workspace and its stated expiry.
6. **Open Asset Passport and Audit Trail:** Show lifecycle data, custody history, and event evidence for a fictional asset.
7. **Open Blockchain Activity and Architecture:** Explain the simple TrustGrid flow from authorised user to application, contracts, and ledger.
8. **Optional — Wallet proof:** In Settings, connect MetaMask and sign the displayed challenge; confirm that it adds wallet assurance without changing the user's role or permissions.

---

## Smart Contracts Architecture

All contracts are located in [`contracts/`](contracts/) and compiled using Hardhat:

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
npm --prefix backend install
npm --prefix frontend install
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

The production Render service is configured from the repository root using [`render.yaml`](render.yaml). It builds both the frontend and the backend, then serves the compiled React application and `/api` routes through Express.

- **Live service:** [https://bel-blockchain-secure-platform.onrender.com](https://bel-blockchain-secure-platform.onrender.com)
- **Build command:** `npm ci && npm --prefix backend ci && npm --prefix frontend ci && npm run build --prefix frontend`
- **Start command:** `node backend/server.js`
- **Health check:** `/api/health`
- **Persistent data path:** `/var/data/bel_platform.db`
- **Required protected configuration:** `NODE_ENV=production`, `RPC_URL`, `ADMIN_PRIVATE_KEY`, `SHARMA_PRIVATE_KEY`, and `VERMA_PRIVATE_KEY`. Configure these in Render only; never commit them.

### Frontend on Vercel

The Vercel project is deployed from the `frontend` directory using [`frontend/vercel.json`](frontend/vercel.json).

- **Live application:** [https://bel-blockchain-secure-platform-kkef.vercel.app/](https://bel-blockchain-secure-platform-kkef.vercel.app/)
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Required environment variable:** `VITE_API_URL=https://bel-blockchain-secure-platform.onrender.com`

Set `VITE_API_URL` for both **Preview** and **Production**, then redeploy the Vercel frontend. Vite embeds this value during the build, so changing it without a new deployment does not update the browser bundle.

---

## Security & Environment Hygiene

- **Public Testnet Notice:** Polygon Amoy is a testnet for demonstration and evaluation. No real funds or mainnet assets are used.
- **Zero-Secret Commits:** All secrets (`.env`, `backend/.env`, private keys, and database tokens) are excluded via [`.gitignore`](.gitignore).
- **Client-Safe Bundles:** The frontend bundle contains no private keys or server secrets. The MetaMask flow uses a user-approved signature only; it does not request a transaction, a seed phrase, or a private key.
- **Demonstration Data:** All people, records, projects, assets, tasks, and security events shown in the portal are fictional and must not be treated as BEL production data.

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
