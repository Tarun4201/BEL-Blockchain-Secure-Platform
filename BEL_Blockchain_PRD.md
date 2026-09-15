# Product Requirements Document
## Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management
### Prototype / MVP — Bharat Electronics Limited (BEL)

**Document Version:** 1.0
**Status:** Draft for Development
**Audience:** Hackathon/project development team, judges, stakeholders

---

## 1. Executive Summary

This PRD defines a working prototype that demonstrates how blockchain technology can replace fragmented, centralized identity and asset-management systems with a unified, verifiable, tamper-resistant framework. The prototype combines four building blocks — Decentralized Identity (DID), blockchain-based Role & Access Control, NFT-based Digital Asset ownership, and an immutable Audit Trail — into a single demo-ready application.

The system is explicitly scoped as an **MVP demonstration**, not a production deployment. It uses a local/testnet Ethereum-compatible blockchain (Hardhat), Solidity smart contracts, a React/Next.js frontend, and a lightweight backend that indexes on-chain events for fast UI reads. Sensitive BEL data (personal information, technical documents, credentials) is never written to the chain — only hashes, references, and non-sensitive metadata are on-chain, with actual content stored off-chain.

The end-to-end demo flow is: **Admin creates an identity → Admin mints an asset → Admin grants a role/permission → User requests access → Smart contract verifies permission → Access is granted or denied → Asset ownership is transferred → All actions appear in a tamper-evident audit trail**, with every state-changing action backed by a visible blockchain transaction hash.

---

## 2. Problem Statement

Bharat Electronics Limited (and similar organizations) currently manage identity, access control, and asset ownership using centralized systems. This creates several structural risks:

- **Single points of failure** — a compromised central server can expose or corrupt all identity and access data.
- **Cyber attack surface** — centralized databases are high-value targets for credential theft and tampering.
- **Weak auditability** — administrators can alter access logs or ownership records without an independent, tamper-evident trail.
- **Fragmented asset tracking** — physical/digital asset ownership and custody history are scattered across disconnected systems, making provenance and authenticity hard to verify.
- **Opaque access decisions** — it's difficult to prove *after the fact* that an access grant/denial followed policy.

BEL requires a **blockchain-based framework** that provides decentralized identity, on-chain-verifiable access control via smart contracts, NFT-based representation of digital/physical asset ownership, and a tamper-resistant audit history — while keeping sensitive defense-related information off-chain.

---

## 3. Problem Analysis

| Root Cause | Consequence | How Blockchain Helps |
|---|---|---|
| Centralized identity store | Single point of compromise, identity theft | DIDs anchor identity to a cryptographic key pair; no central identity database to breach |
| Centralized ACL tables, editable by admins | Silent tampering, no proof of historical permissions | Access grants/revocations are on-chain transactions — immutable once confirmed |
| Manual/paper or siloed asset registries | Disputed ownership, no provenance trail | NFTs encode current owner + full transfer history on-chain |
| Logs stored in mutable application databases | Logs can be edited or deleted by a privileged insider | Audit events emitted as blockchain events are permanent and independently verifiable |
| No cryptographic verification of "who did what" | Repudiation — actions can be denied | Every state change is signed by a wallet/key and tied to a transaction hash |

**Key insight:** The core value blockchain adds here is *tamper-evidence and independent verifiability*, not decentralization for its own sake. The prototype should make this provable-history property visually obvious (transaction hashes, block numbers, "verify on chain" actions) rather than trying to decentralize BEL's actual infrastructure.

---

## 4. Proposed Solution

A single-organization (permissioned-style, but built on public-chain-compatible tooling) blockchain application with four integrated modules:

1. **Decentralized Identity (DID) Module** — every user gets a blockchain-anchored identity (a wallet address plus an on-chain identity record) instead of a row in a central `users` table.
2. **Role & Access Control Module** — a smart contract holds role assignments and resource permissions; access decisions are computed on-chain via a `hasAccess()` check, with requests/grants/revocations recorded as transactions.
3. **Digital Asset (NFT) Module** — organizational assets (equipment, documents, records) are represented as ERC-721-style tokens whose metadata points to off-chain details; ownership transfer happens via the token contract.
4. **Audit Trail Module** — the frontend/backend aggregates all emitted contract events into a unified, filterable, chronological ledger view, each entry linked to its transaction hash and block explorer-style detail.

These modules are demonstrated through one cohesive dashboard rather than four disconnected screens, so evaluators can see the full lifecycle of an identity, an access decision, and an asset in one narrative.

---

## 5. Goals

- Demonstrate a working, end-to-end flow: identity creation → role assignment → access request/verification → asset minting → ownership transfer → audit trail, all backed by real blockchain transactions on a local/test network.
- Clearly show the on-chain vs. off-chain data split and why sensitive BEL data never touches the chain.
- Provide a professional, defense-sector-appropriate UI (not a crypto/NFT marketplace look).
- Keep the smart contract surface small, auditable, and realistic to implement within a hackathon timeframe.
- Make every meaningful state change independently verifiable (transaction hash, event log, block number).

## 6. Non-Goals

- **Not** building a production-grade, horizontally scalable, multi-organization identity network.
- **Not** implementing a fully standards-compliant W3C DID method/resolver or Verifiable Credentials exchange — a DID-*like* identifier is sufficient for the prototype.
- **Not** deploying to a public mainnet or handling real cryptographic custody/key-recovery UX (wallet abstraction is simulated for demo users).
- **Not** implementing enterprise IAM features (SSO, SCIM provisioning, federated login, MFA hardware tokens).
- **Not** building a real marketplace, secondary sales, royalties, or token pricing for the NFTs — they represent custody/ownership only.
- **Not** encrypting/storing actual classified or sensitive BEL documents — off-chain storage in the prototype uses mock/sample documents only.
- **Not** implementing on-chain governance, DAOs, or multi-sig admin approval (single-admin model is sufficient for MVP).

---

## 7. Target Users

- **BEL system administrators / security officers** — responsible for onboarding personnel, assigning roles, minting and transferring assets, and reviewing audit history.
- **BEL personnel (Engineers, Technicians, Managers)** — need to view their own identity, request access to restricted resources/assets, and see what they currently have access to.
- **Evaluators / stakeholders (for the prototype context)** — need to see a clear, believable demonstration of the concept without needing blockchain expertise to follow along.

---

## 8. User Roles & Permissions

| Capability | Admin | User (Engineer/Technician/Manager) |
|---|:---:|:---:|
| Register a new identity | ✅ | ❌ |
| View own identity/DID | ✅ | ✅ |
| View any identity | ✅ | ❌ (own only) |
| Assign/change roles | ✅ | ❌ |
| Define resources (labs, systems, documents) | ✅ | ❌ |
| Request access to a resource | ✅ (can also request, for demo) | ✅ |
| Grant/deny access requests | ✅ | ❌ |
| Revoke previously granted access | ✅ | ❌ |
| Create/mint an asset (NFT) | ✅ | ❌ |
| Transfer asset ownership | ✅ (current owner in general model; Admin for MVP simplicity) | ❌ in MVP |
| View asset details & ownership history | ✅ | ✅ (assets they own or have access to) |
| View full audit log | ✅ (all events) | ✅ (own-related events only) |

**Roles are modeled as an enum/string on-chain** (`ADMIN`, `ENGINEER`, `TECHNICIAN`, `MANAGER`), separate from **resource-level permissions**, which are a many-to-many mapping of `(DID, resourceID) → granted/revoked`. Role is descriptive context (shown in UI, usable for future default-permission rules); the actual access decision in the MVP is driven by the explicit permission mapping, not implicit role logic — this keeps `hasAccess()` simple and auditable. *(See Section 22 — Ambiguity/Assumption A1.)*

---

## 9. Key Use Cases

1. **UC-1: Register a new identity.** Admin onboards a new BEL employee, who receives a blockchain-anchored DID.
2. **UC-2: Assign a role.** Admin assigns a role (e.g., Engineer) to an identity.
3. **UC-3: Define a protected resource.** Admin creates a resource record (e.g., "Radar System Bay 3").
4. **UC-4: Request access.** A user requests access to a restricted resource.
5. **UC-5: Grant/deny access.** Admin reviews the request and approves or rejects it; the smart contract records the decision.
6. **UC-6: Verify access.** The system checks on-chain whether a user currently has access to a resource before showing them resource details.
7. **UC-7: Revoke access.** Admin revokes previously granted access.
8. **UC-8: Mint a digital asset.** Admin registers a new asset (e.g., Radar Equipment Unit #12) as an NFT with an initial owner.
9. **UC-9: Transfer asset ownership.** Ownership of an asset is transferred from one identity to another (e.g., equipment reassigned between departments).
10. **UC-10: View ownership history.** Any user can see the full chain-of-custody for an asset.
11. **UC-11: View audit trail.** Admin/User views a chronological, filterable list of all recorded actions with blockchain proof.
12. **UC-12: Verify an identity or record on-chain.** UI provides a "Verify on chain" action showing the raw transaction/event data.

---

## 10. User Stories

- As an **Admin**, I want to register a new employee's identity so that they have a verifiable, tamper-proof digital identity within BEL's system.
- As an **Admin**, I want to assign roles to employees so that the system reflects their organizational function.
- As an **Admin**, I want to define protected resources so that I can control who can access sensitive labs, systems, or documents.
- As a **User**, I want to request access to a restricted resource so that I can perform my job when authorized.
- As an **Admin**, I want to approve or reject access requests so that only authorized personnel reach sensitive resources.
- As an **Admin**, I want to revoke access immediately when it's no longer needed so that stale permissions don't become a security risk.
- As a **User**, I want to see which resources I currently have access to so that I understand my own permissions.
- As an **Admin**, I want to register organizational assets as NFTs so that ownership and custody are cryptographically verifiable.
- As an **Admin**, I want to transfer an asset's ownership so that equipment reassignment is reflected accurately and permanently.
- As a **User/Admin**, I want to view an asset's full ownership history so that I can verify its provenance.
- As an **Admin**, I want to view a complete audit trail of identity, access, and asset events so that I can investigate incidents or demonstrate compliance.
- As a **User**, I want to see proof (transaction hash) that my access request was genuinely recorded and not silently altered.

---

## 11. Functional Requirements

### FR-1 Identity Management
- FR-1.1 System shall allow an Admin to register a new identity given a name, department, and designation.
- FR-1.2 System shall generate/assign a blockchain-based identity (wallet address + on-chain `IdentityRegistered` record) for each new user.
- FR-1.3 System shall display an identity's DID, role, registration timestamp, and registering admin.
- FR-1.4 System shall allow verification of an identity's on-chain registration via transaction hash lookup.
- FR-1.5 System shall prevent duplicate registration of the same wallet address.

### FR-2 Role & Access Control
- FR-2.1 Admin shall be able to assign one role from a fixed set (`ADMIN`, `ENGINEER`, `TECHNICIAN`, `MANAGER`) to any registered identity.
- FR-2.2 Admin shall be able to create a resource with a name, category, and sensitivity label.
- FR-2.3 A user shall be able to submit an access request for a specific resource.
- FR-2.4 Admin shall be able to view pending access requests.
- FR-2.5 Admin shall be able to approve or reject a pending access request.
- FR-2.6 System shall verify access via an on-chain `hasAccess(DID, resourceID)` check before displaying any gated resource content.
- FR-2.7 Admin shall be able to revoke a previously granted access at any time.
- FR-2.8 All access-control state changes (request, grant, revoke) shall emit a blockchain event.

### FR-3 Digital Asset Management
- FR-3.1 Admin shall be able to mint a new asset with name, category, description, and initial owner.
- FR-3.2 Each asset shall be represented as a unique token (asset ID) on-chain.
- FR-3.3 System shall display asset ID, name, category, current owner, and status (Active/Retired) for each asset.
- FR-3.4 Admin (or current owner, per Section 22 assumption) shall be able to transfer asset ownership to another registered identity.
- FR-3.5 System shall display the complete, chronologically ordered ownership history of any asset.
- FR-3.6 System shall allow verification of current ownership directly against on-chain data.

### FR-4 Audit Trail
- FR-4.1 System shall record the following event types immutably: Identity Registered, Role Assigned, Access Requested, Access Granted, Access Revoked, Asset Minted, Asset Transferred.
- FR-4.2 Audit log entries shall include: event type, actor DID, target (resource/asset/identity), timestamp, block number, and transaction hash.
- FR-4.3 Admin shall be able to view, search, and filter the full audit log (by event type, actor, date range).
- FR-4.4 Users shall be able to view audit entries relevant to their own identity/assets.
- FR-4.5 Each audit entry shall link to a transaction detail view showing raw event data.

### FR-5 Platform / Cross-Cutting
- FR-5.1 System shall clearly label every action that is a real blockchain transaction vs. a UI-only/off-chain action.
- FR-5.2 System shall show pending/confirming/confirmed transaction states for all write operations.
- FR-5.3 System shall handle and surface blockchain transaction failures (e.g., reverted transaction) with a clear error message.
- FR-5.4 System shall support at least two demo user sessions concurrently (one Admin, one/more standard Users) for live demo purposes.

---

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | UI actions should reflect local-chain transaction confirmation within ~1–3 seconds (Hardhat's near-instant block time supports this). |
| Usability | No blockchain/crypto jargon required from end users; wallet interactions abstracted behind normal app login for demo users. |
| Reliability | Prototype should run reliably for a live demo session (local chain + seeded data), not require internet access to a public testnet. |
| Security | Sensitive data never stored on-chain in plaintext; only hashes/metadata references on-chain. Role-gated UI and API routes. |
| Auditability | Every state-changing action must be traceable to a specific transaction hash and block. |
| Maintainability | Smart contracts kept minimal, modular, and well-commented; clear separation of on-chain/off-chain logic. |
| Portability | Should run locally via Hardhat node + local frontend/backend with a documented one-command setup for judges/evaluators. |
| Accessibility | Dashboard should follow basic accessibility practices (readable contrast, keyboard navigation for core flows). |

*(Explicitly out of scope for MVP: horizontal scalability, high-availability infrastructure, formal penetration testing, regulatory/compliance certification.)*

---

## 13. System Architecture

**High-level components:**

1. **Frontend (React/Next.js + Tailwind CSS)** — Admin and User dashboards; talks to backend API for reads and to the blockchain (via ethers.js/viem + a browser-injected or app-managed signer) for writes.
2. **Backend (Node.js + Express, or FastAPI)** — Thin service layer that:
   - Listens to/indexes smart contract events into a local database for fast queries (search, filter, pagination) instead of re-scanning the chain on every read.
   - Stores off-chain application data (user profile details, resource descriptions, asset metadata documents) referenced by on-chain hashes/IDs.
   - Manages demo-user session/auth and maps each logged-in demo user to a blockchain account/signer (abstracting wallet complexity).
3. **Blockchain Layer (Hardhat local network)** — Runs the Solidity smart contracts: `IdentityRegistry`, `AccessControlManager`, `AssetRegistry` (see Section 15).
4. **Off-chain Database (PostgreSQL or lightweight equivalent, e.g., SQLite for prototype speed)** — Stores non-sensitive-but-not-blockchain-appropriate data (see Section 14) and serves as an **event index/cache** of on-chain activity for the audit trail and dashboards.

**Data flow (write path):** UI action → Backend validates request → Transaction submitted to blockchain via signer → Contract executes, emits event → Backend event listener picks up event → Off-chain DB updated (cache) → UI reflects new state + shows tx hash.

**Data flow (read path):** UI requests data → Backend serves from indexed DB (fast) → UI optionally offers "Verify on chain" which re-queries the contract directly for a trust-but-verify moment.

### Decision: Is a backend database necessary?
**Yes.** A backend database (PostgreSQL/SQLite) is recommended as an **off-chain cache/index and metadata store**, not as a source of truth for identity/access/ownership state — the blockchain remains the source of truth for those. The database exists purely so the UI can perform fast search/filter/pagination over historical events and store non-sensitive metadata (resource descriptions, asset descriptions, display names) without re-querying the chain for every page load. This is explained explicitly in the UI so evaluators understand the DB is a *read-optimization layer*, not a parallel authority.

---

## 14. On-Chain vs Off-Chain Architecture

| Data | Location | Rationale |
|---|---|---|
| DID / wallet address | On-chain | Core identity anchor; must be verifiable and tamper-proof |
| Identity registration event (who, when, registered by whom) | On-chain (event) | Needs immutable proof of onboarding |
| Full name, department, contact details | **Off-chain** (DB) | Personal information; must not be publicly exposed on-chain |
| Role assignment (current role) | On-chain | Small, non-sensitive, benefits from tamper-evidence |
| Resource definitions (ID, sensitivity label) | On-chain (ID + label only) | Needed for the access-check logic |
| Resource full description / technical detail | **Off-chain** (DB) | Potentially sensitive technical content |
| Access grant/revoke/request state | On-chain | This *is* the access-control source of truth |
| Asset ownership (current owner + transfer history) | On-chain (NFT/token) | Core provenance guarantee |
| Asset metadata (name, category, status) | On-chain (minimal) + off-chain (rich description, images/docs) | Balance verifiability with payload size/sensitivity |
| Secure technical documents (actual file content) | **Off-chain** (DB/file store) | Never place classified/sensitive documents on any blockchain, public or private |
| Document hash (for integrity verification) | On-chain | Lets anyone verify a document hasn't been altered without exposing it |
| Credentials/secrets/passwords | **Off-chain**, never on-chain | Blockchain is not a secrets store |
| Audit event log (type, actor, target, timestamp, tx hash) | On-chain (as events) + indexed off-chain for fast querying | Event logs are inherently on-chain; DB is just a cache |

**Guiding principle used throughout this PRD:** *If a piece of data is sensitive, large, or mutable-by-design, it stays off-chain. If a piece of data's core value is "this must be provably unaltered and independently checkable," it goes on-chain — at minimum as a hash or reference.* No BEL-sensitive content (personnel PII, technical specs, classified descriptions) is ever written directly, even encrypted, to the demo chain.

---

## 15. Smart Contract Requirements

Three contracts, kept intentionally small and composable. Solidity implementation is not fully written here per scope instructions — only conceptual interfaces (functions + events) are defined, sufficient for a developer to implement directly.

### 15.1 `IdentityRegistry`
**Purpose:** Anchor DIDs on-chain and record role assignment.

Functions:
- `registerIdentity(address userAddress, string didURI) → did`
- `assignRole(string did, Role role)` *(onlyAdmin)*
- `getIdentity(string did) → (address, Role, uint256 registeredAt, address registeredBy)`
- `isRegistered(string did) → bool`

Events:
- `IdentityRegistered(string did, address userAddress, address registeredBy, uint256 timestamp)`
- `RoleAssigned(string did, Role role, address assignedBy, uint256 timestamp)`

### 15.2 `AccessControlManager`
**Purpose:** Manage resources, access requests, grants, and revocations; provide the canonical `hasAccess` check.

Functions:
- `createResource(string resourceId, string sensitivityLabel) → resourceId` *(onlyAdmin)*
- `requestAccess(string did, string resourceId)`
- `grantAccess(string did, string resourceId)` *(onlyAdmin)*
- `revokeAccess(string did, string resourceId)` *(onlyAdmin)*
- `hasAccess(string did, string resourceId) → bool`
- `getAccessRequests(string resourceId) → AccessRequest[]` *(or paginated / status-filtered variant)*

Events:
- `ResourceCreated(string resourceId, string sensitivityLabel, address createdBy, uint256 timestamp)`
- `AccessRequested(string did, string resourceId, uint256 timestamp)`
- `AccessGranted(string did, string resourceId, address grantedBy, uint256 timestamp)`
- `AccessRevoked(string did, string resourceId, address revokedBy, uint256 timestamp)`

### 15.3 `AssetRegistry` (ERC-721-style)
**Purpose:** Represent organizational assets as tokens; manage minting and ownership transfer.

Functions:
- `mintAsset(string assetMetadataURI, string initialOwnerDid) → assetId`
- `transferAsset(uint256 assetId, string newOwnerDid)` *(onlyAdmin or onlyCurrentOwner, per Section 22 decision)*
- `getOwnershipHistory(uint256 assetId) → OwnershipRecord[]`
- `getAsset(uint256 assetId) → (string metadataURI, string currentOwnerDid, AssetStatus status)`
- `retireAsset(uint256 assetId)` *(onlyAdmin, optional/stretch)*

Events:
- `AssetMinted(uint256 assetId, string metadataURI, string ownerDid, address mintedBy, uint256 timestamp)`
- `AssetTransferred(uint256 assetId, string fromDid, string toDid, address transferredBy, uint256 timestamp)`
- `AssetRetired(uint256 assetId, address retiredBy, uint256 timestamp)` *(optional/stretch)*

**Cross-contract note:** `AccessControlManager` and `AssetRegistry` both reference `did` strings validated against `IdentityRegistry.isRegistered()` — this can be enforced via an interface call or handled at the backend/service layer for MVP simplicity (see Section 22, Assumption A4).

---

## 16. Data Model

### On-chain (conceptual structs)
```
Identity        { did, walletAddress, role, registeredAt, registeredBy }
Resource        { resourceId, sensitivityLabel, createdBy, createdAt }
AccessRecord    { did, resourceId, status(Requested/Granted/Revoked), updatedBy, updatedAt }
Asset           { assetId, metadataURI, currentOwnerDid, status(Active/Retired), mintedBy, mintedAt }
OwnershipRecord { assetId, fromDid, toDid, txHash, timestamp }
AuditEvent      { eventType, actorDid, targetId, txHash, blockNumber, timestamp }
```

### Off-chain (application database)
```
users            (id, did FK, full_name, department, designation, email, avatar_url, created_at)
resources_meta   (resource_id FK, title, description, category, location)
assets_meta      (asset_id FK, title, description, image_url, document_hash, category)
documents        (id, asset_id or resource_id FK, filename, storage_path, sha256_hash)
audit_index      (id, event_type, actor_did, target_id, tx_hash, block_number, timestamp)  -- cache of on-chain events
sessions         (id, user_id FK, wallet_address, role, issued_at, expires_at)
```

The `audit_index` table is a **derived cache** rebuilt from on-chain events (via event listener/indexer), not an independent record — if wiped, it can be fully reconstructed by replaying the chain.

---

## 17. API Requirements

RESTful backend API (illustrative; adjust naming per implementation):

| Endpoint | Method | Purpose | On-chain trigger? |
|---|---|---|---|
| `/api/identities` | POST | Register new identity | Yes — calls `registerIdentity` |
| `/api/identities/:did` | GET | Get identity detail | No (indexed read) |
| `/api/identities/:did/role` | PUT | Assign role | Yes — calls `assignRole` |
| `/api/resources` | POST | Create resource | Yes — calls `createResource` |
| `/api/resources` | GET | List resources | No (indexed read) |
| `/api/access/requests` | POST | Submit access request | Yes — calls `requestAccess` |
| `/api/access/requests` | GET | List pending requests | No (indexed read) |
| `/api/access/grant` | POST | Grant access | Yes — calls `grantAccess` |
| `/api/access/revoke` | POST | Revoke access | Yes — calls `revokeAccess` |
| `/api/access/check` | GET | Check `hasAccess` | Optional live on-chain read |
| `/api/assets` | POST | Mint asset | Yes — calls `mintAsset` |
| `/api/assets` | GET | List assets | No (indexed read) |
| `/api/assets/:id` | GET | Asset detail + history | No (indexed read) |
| `/api/assets/:id/transfer` | POST | Transfer ownership | Yes — calls `transferAsset` |
| `/api/audit` | GET | Query audit trail (filters: type, actor, date) | No (indexed read) |
| `/api/audit/:txHash` | GET | Raw transaction/event detail | Live chain read (verification) |
| `/api/auth/login` | POST | Demo login, maps user to signer | No |

All write endpoints return: `{ status: pending|confirmed|failed, txHash, blockNumber? }` so the UI can show live transaction state.

---

## 18. Frontend Requirements

- **Admin Dashboard**: identity registration form, role assignment table, resource creation form, pending access requests queue with approve/reject actions, asset minting form, asset registry table with transfer action, full audit log with filters.
- **User Dashboard**: "My Identity" card (DID, role, registration proof), "Request Access" flow with resource picker, "My Permissions" list, "My Assets" (owned/assigned), "My Activity" (personal audit history).
- **Shared components**: Transaction status toast/banner (pending → confirmed, with hash), "Verify on chain" modal showing raw event/transaction JSON, global audit trail explorer, asset detail page with ownership history timeline.
- **Visual language**: dark/navy or steel-blue professional theme, radar/circuit-inspired accents used sparingly, monospace styling for hashes/DIDs/addresses, status badges (Granted/Denied/Pending/Active/Retired), no crypto-wallet-marketplace visual tropes (no floating coins, no "mint price," no gas-fee speculation UI).

---

## 19. Blockchain Transaction Flow

Example — **Access Request → Grant** flow:

1. User clicks "Request Access" on a resource → frontend calls `POST /api/access/requests`.
2. Backend submits `requestAccess(did, resourceId)` transaction using the user's mapped signer.
3. Contract validates identity is registered, records request, emits `AccessRequested`.
4. Backend event listener catches `AccessRequested`, updates `audit_index`, marks request "Pending" in DB.
5. UI shows "Request submitted — pending admin review" with tx hash link.
6. Admin sees the request in their queue, clicks "Grant."
7. Backend submits `grantAccess(did, resourceId)` using Admin signer.
8. Contract updates access state, emits `AccessGranted`.
9. Listener updates cache; UI updates both Admin and User views (poll or event-driven refresh) to "Access Granted," with tx hash and block number shown.
10. User can now view the previously gated resource; every future load calls `hasAccess()` (cached, with optional live re-verify) before rendering gated content.

Equivalent flow diagrams apply to: identity registration, role assignment, access revocation, asset minting, and asset transfer — each following the same pattern (UI action → backend-submitted tx → contract event → indexed cache update → UI reflects confirmed state with proof).

---

## 20. Security Considerations

- **No sensitive data on-chain**: enforced by design (Section 14) — code review checklist item before demo.
- **Role-gated backend routes**: Admin-only endpoints validated server-side, not just hidden in UI.
- **Signer/key management (prototype-scope)**: demo users are mapped to pre-funded Hardhat local accounts managed by the backend; this is explicitly a simulation of wallet custody, not a production key-management design (see Assumption A2).
- **Input validation**: resource IDs, DIDs, and asset metadata validated before being submitted on-chain to avoid wasted/failed transactions.
- **Replay/duplicate protection**: prevent duplicate identity registration for the same address; prevent duplicate active access grants.
- **Front-end trust boundary**: UI must re-verify critical state (e.g., `hasAccess`) via backend/chain rather than trusting client-side cached state alone before revealing gated content.
- **Document integrity without exposure**: only a SHA-256 hash of any sensitive document is stored on-chain; the document itself lives in the off-chain store, so authenticity can be verified without exposure.
- **Rate limiting / spam**: basic request throttling on write endpoints to prevent demo-breaking transaction floods.

---

## 21. Audit & Traceability

- Every FR-1 through FR-3 state-changing action emits a contract event; the backend indexer persists these into `audit_index` in near-real-time.
- The Audit Trail UI supports filtering by event type, actor DID, resource/asset ID, and date range.
- Each audit entry is clickable to a **Transaction Detail** view showing: event name, all indexed fields, block number, transaction hash, and (optionally) a raw JSON payload — this is the "proof" moment that differentiates this from a normal log viewer.
- Because `audit_index` is a rebuildable cache of on-chain events, the demo can include a **"Rebuild index from chain"** action to visually prove the log isn't a separate, alterable database — reinforcing the tamper-evidence narrative to evaluators.

---

## 22. Error Handling

| Scenario | Handling |
|---|---|
| Duplicate identity registration | Contract reverts; backend surfaces "Identity already registered for this address." |
| Unauthorized action (non-admin calls admin function) | Contract reverts (`onlyAdmin` modifier); UI shows "You don't have permission to perform this action." |
| Access request for non-existent resource | Backend validates resource exists before submitting tx; returns 404 if not. |
| Transfer of asset by non-owner/non-admin | Contract reverts; UI shows "Only the current owner or an admin can transfer this asset." |
| Transaction fails/reverts on-chain | Backend catches revert reason, returns `status: failed` with human-readable message; UI shows failure toast, does not optimistically update state. |
| Network/local chain unavailable | UI shows a clear "Blockchain node unreachable" banner instead of silently failing; disables write actions. |
| Duplicate access grant (already granted) | Contract either no-ops idempotently or reverts with "Access already granted" — implementer's choice, documented in code. |
| Revoking access that was never granted | Contract reverts with "No active access to revoke." |

---

## 23. UI/UX Requirements

- Clean, professional, defense/enterprise dashboard aesthetic — dark navy/steel palette, restrained accent color (e.g., amber or cyan for status highlights), no cartoonish or "web3 hype" styling.
- Persistent top navigation: Identities, Access Control, Assets, Audit Trail (Admin); My Identity, My Access, My Assets, My Activity (User).
- Every write action shows a clear pending/confirming/confirmed lifecycle (spinner → checkmark + tx hash link).
- DIDs, wallet addresses, and hashes shown in monospace font, truncated with a copy-to-clipboard affordance.
- Status badges use consistent color coding: Granted/Active = green, Pending = amber, Denied/Revoked/Retired = red/gray.
- Empty states (no assets yet, no pending requests) are designed, not blank screens.
- Asset detail page includes a visual ownership-history timeline (chronological, most recent at top).
- Responsive layout for demo on both laptop and projector/large screen.

---

## 24. Prototype Demo Flow

A scripted, ~5–7 minute walkthrough for evaluators:

1. **Admin logs in** → registers a new identity ("R. Sharma, Engineer") → shown as a confirmed on-chain transaction.
2. **Admin assigns role** (Engineer) to the new identity.
3. **Admin creates a resource** ("Radar Test Bay — Restricted").
4. **Admin mints an asset** ("Radar Unit RU-204") with initial owner = Admin.
5. **Switch to User session** (R. Sharma) → views "My Identity" (DID, role, verified on-chain).
6. **User requests access** to "Radar Test Bay — Restricted" → sees "Pending" status with tx hash.
7. **Switch back to Admin** → sees the pending request in queue → **grants access**.
8. **Switch to User** → resource is now accessible; `hasAccess()` check shown succeeding live.
9. **Admin transfers asset RU-204** to R. Sharma's identity.
10. **User views "My Assets"** → sees RU-204 with full ownership history (Admin → R. Sharma).
11. **Either role opens the Audit Trail** → filters by "Asset Transferred" → clicks the entry → shows raw transaction/event detail.
12. **(Optional finale) Admin revokes** R. Sharma's access → User immediately loses access to the resource, demonstrating real-time enforcement.

---

## 25. Acceptance Criteria

- [ ] A new identity can be registered and is verifiable via a real transaction hash on the local chain.
- [ ] Role assignment updates on-chain state and is reflected in the identity's profile.
- [ ] A user can submit an access request that appears in the Admin's pending queue.
- [ ] Admin can grant access; `hasAccess()` returns `true` immediately after and gated content becomes visible to the user.
- [ ] Admin can revoke access; `hasAccess()` returns `false` immediately after and gated content becomes hidden.
- [ ] An asset can be minted with a visible asset ID, name, and current owner.
- [ ] Asset ownership can be transferred, and the new owner is reflected system-wide.
- [ ] Full, chronologically correct ownership history is viewable for any asset.
- [ ] Every one of the above actions produces a corresponding entry in the Audit Trail with a transaction hash and block number.
- [ ] No personally identifiable or sensitive BEL information is present in any on-chain transaction or event payload (spot-checked against Section 14 table).
- [ ] The full demo flow (Section 24) can be run start-to-finish without manual database edits or contract redeployment.

---

## 26. MVP Scope

**Included:**
- Identity registration + role assignment (single role per identity)
- Resource creation, access request/grant/revoke, `hasAccess` gating
- Asset minting, single-step ownership transfer, ownership history
- Unified audit trail with filtering and transaction-detail drill-down
- Admin and User dashboards with session-based demo login (mapped to local chain accounts)
- Local Hardhat blockchain with three core contracts

**Explicitly simulated/mocked for MVP (see Section 27's flags below for rationale):**
- Wallet/key custody (backend-managed signer per demo user, not a real self-custody wallet flow)
- Document storage (sample/mock files only; SHA-256 hashing demonstrated, no real classified content)
- Multi-factor login (simple username/password or role-picker demo login)

---

## 27. Future Scope

- Multi-signature / multi-admin approval workflows for high-sensitivity actions.
- Real W3C-compliant DID method + Verifiable Credentials issuance/verification.
- Self-custody wallet integration (MetaMask or hardware wallet) for real key ownership by end users.
- Fine-grained, attribute-based access control (time-bound access, location-bound access).
- Integration with real BEL HR/identity source systems for automated onboarding.
- Encrypted off-chain document vault with access-key rotation.
- Deployment to a permissioned/consortium blockchain (e.g., Hyperledger Fabric, or a private Ethereum-compatible network) for real inter-departmental or inter-organizational use.
- Formal security audit of smart contracts and threat modeling.
- Mobile app for field access requests and approvals.
- Analytics dashboard (access patterns, anomaly detection on audit trail).

---

## 28. Risks & Limitations

| Risk | Impact | Mitigation for Prototype |
|---|---|---|
| Local blockchain isn't truly decentralized | Judges may question "is this really blockchain value?" | PRD/demo narrative explicitly frames the value as tamper-evidence & auditability, not decentralization of infrastructure |
| Gas/transaction cost realism ignored | Not representative of public-chain economics | Acceptable for MVP — local chain has no real gas cost; documented as a known simplification |
| Backend indexer is a potential trust bottleneck for reads | Could be seen as reintroducing centralization | "Verify on chain" / "Rebuild index" actions demonstrate the DB is just a cache, not authoritative |
| Simulated wallet custody | Not representative of real self-custody security model | Explicitly called out as a prototype simplification (Assumption A2) with real-wallet integration flagged as future scope |
| Smart contract bugs (no formal audit in hackathon timeframe) | Could cause demo failures | Keep contracts minimal, write basic unit tests (Section 31), rehearse demo flow end-to-end before presentation |
| Off-chain DB and on-chain state could drift if indexer fails mid-demo | Confusing/incorrect UI state | "Rebuild index from chain" recovery action; keep demo network isolated and restart-tested beforehand |

---

## 29. Recommended Technology Stack

| Layer | Recommendation | Rationale |
|---|---|---|
| Frontend | React (Next.js) + Tailwind CSS | Fast to build, component-friendly for dashboard-heavy UI, good ecosystem for wallet/web3 libs |
| Backend | Node.js + Express | Same language as frontend/web3 tooling (JS/TS throughout), simplest integration with ethers.js and contract ABIs |
| Blockchain dev environment | Hardhat | Best-in-class local dev network, fast iteration, built-in testing, easy scripting for seed data |
| Smart contracts | Solidity (^0.8.x) | Industry standard, best tooling/documentation support for a time-boxed build |
| Web3 client library | ethers.js (v6) | Mature, well-documented, simpler learning curve than viem for a hackathon team |
| Off-chain database | SQLite (fastest to set up) or PostgreSQL (if the team wants closer-to-production realism) | Either is fine; SQLite recommended purely for setup speed in a time-boxed build |
| Event indexing | Custom lightweight listener service (Node.js + ethers.js event subscriptions) writing into the DB | Avoids heavier infra (e.g., The Graph) that's unnecessary for a single local-chain prototype |
| Auth (demo) | Simple session-based login mapping user → Hardhat account | Avoids building real wallet UX while still using real signed transactions |
| Hosting (demo) | Local machine / single cloud VM, all services run together via a script (e.g., `docker-compose` or a `start-all` script) | Judges need one-command reliability, not production hosting |

*FastAPI/Python backend or MongoDB are acceptable substitutes if the team's existing skill set favors them — the architecture in this PRD is stack-agnostic at the API/contract-boundary level.*

---

## 30. Development Phases

**Phase 0 — Setup (Day 1 morning)**
- Repo scaffolding, Hardhat project init, frontend/backend skeletons, local chain running.

**Phase 1 — Core Contracts (Day 1)**
- Implement `IdentityRegistry`, `AccessControlManager`, `AssetRegistry` with unit tests for happy-path + key failure cases.

**Phase 2 — Backend Integration (Day 1–2)**
- Contract deployment scripts, backend signer management, API endpoints (Section 17), event listener/indexer.

**Phase 3 — Frontend Core Flows (Day 2)**
- Admin dashboard: identity registration, role assignment, resource creation, access request queue, asset minting/transfer.
- User dashboard: identity view, access request, my permissions, my assets.

**Phase 4 — Audit Trail & Polish (Day 2–3)**
- Unified audit log UI with filters and transaction-detail drill-down; visual design pass (Section 23).

**Phase 5 — Seed Data, Demo Rehearsal, Hardening (Day 3)**
- Seed script for a believable BEL scenario (sample identities, resources, assets), full run-through of Section 24 demo flow, fix rough edges, prepare fallback (e.g., recorded backup demo) in case of live failure.

---

## 31. Testing Strategy

- **Smart contract unit tests** (Hardhat + Chai): cover each function's happy path, each `onlyAdmin`/`onlyOwner` restriction, and key revert conditions (duplicate registration, unauthorized transfer, revoking non-existent access).
- **Integration tests**: backend API → contract call → event emission → indexed DB record, for each of the core flows (register identity, grant access, mint asset, transfer asset).
- **Manual end-to-end test**: run the full Section 24 demo script at least twice before presentation, once on a freshly reset chain.
- **Negative/error-path testing**: verify UI correctly surfaces failures for each Section 22 scenario (not just happy paths).
- **Data-integrity spot check**: manually confirm no PII/sensitive fields appear in any on-chain transaction payload or emitted event (aligns with Acceptance Criteria).

---

## 32. Final Demo Scenario

**Narrative framing for judges:** *"BEL currently manages identity, access, and asset custody across disconnected, centrally-editable systems. This prototype shows a single BEL engineer's journey — from onboarding, through requesting access to a restricted facility, to being assigned custody of sensitive equipment — where every step is independently, cryptographically verifiable and cannot be silently altered after the fact."*

Concretely, this is the Section 24 flow, presented as a story about one employee (e.g., "R. Sharma") rather than a feature checklist — onboarded → granted access → assigned an asset → audited — so the blockchain proof points (transaction hashes, `hasAccess` checks, ownership history, tamper-evident audit log) land as *outcomes of a realistic scenario*, not abstract demos.

---

## Appendix A: Ambiguities, Assumptions & Engineering Decisions

The original problem statement leaves several points open to interpretation. Below are the decisions made for this PRD, with rationale, so the development team isn't blocked mid-build.

- **A1 — Role vs. explicit permission for access decisions.** *Ambiguous:* should a role (e.g., "Engineer") implicitly grant access to a category of resources, or is every access grant explicit? *Decision:* MVP uses **explicit per-resource grants only**; role is contextual metadata, not an implicit access rule. This keeps `hasAccess()` simple, auditable, and avoids building a policy-rule engine in a hackathon timeframe. Rule-based/attribute-based access is flagged as Future Scope.
- **A2 — Wallet/key custody model.** *Ambiguous:* real self-custody wallets vs. simplified accounts. *Decision:* demo users are mapped to backend-managed Hardhat accounts (real signed transactions, simulated custody UX). This is the single biggest simplification in the prototype and is called out explicitly to evaluators rather than hidden.
- **A3 — Who can transfer an asset.** *Ambiguous:* current owner, or only Admin. *Decision:* MVP defaults to **Admin-initiated transfers** (matches a defense-organization custody model where reassignment is typically authorized centrally), with the contract designed to support owner-initiated transfer as a near-term extension.
- **A4 — Cross-contract identity validation.** *Ambiguous:* should `AccessControlManager`/`AssetRegistry` call into `IdentityRegistry` on-chain to validate a DID exists, or is this checked at the backend layer? *Decision:* for MVP, validated at the **backend/service layer** before submitting a transaction, to reduce contract complexity and gas overhead; on-chain cross-contract validation is a reasonable hardening step for a v2.
- **A5 — DID standard compliance.** *Ambiguous:* the problem statement says "DID or DID-like." *Decision:* prototype uses a **DID-like identifier** (structured string tied to a wallet address and an on-chain record), not a full W3C DID method with resolver — sufficient to demonstrate the concept; full compliance is Future Scope.
- **A6 — NFT standard compliance.** *Decision:* assets follow an **ERC-721-like pattern** (unique ID, owner, metadata URI, transfer function) without necessarily importing a full OpenZeppelin ERC-721 implementation, to keep the contract auditable and focused; using OpenZeppelin's ERC-721 is an acceptable and encouraged implementation shortcut if it speeds development, since it doesn't change any of the product requirements above.
- **A7 — Sensitive document handling.** *Decision:* real sensitive/classified content is **never used in the prototype**; only mock/sample documents are stored off-chain, with SHA-256 hashes on-chain, to safely demonstrate the integrity-verification pattern without any actual data-sensitivity risk.
- **A8 — Multi-admin / approval workflows.** *Decision:* **single-admin model** for MVP; multi-signature/approval chains for high-sensitivity actions are Future Scope, since they add coordination complexity disproportionate to what's needed to prove the concept.
- **A9 — What must actually touch the blockchain vs. what can be simulated.** *Decision:* all of Identity Registration, Role Assignment, Access Request/Grant/Revoke, Asset Mint/Transfer, and Audit Events are **real on-chain transactions** on the local Hardhat network (this is the core credibility of the demo). Only the *login/session* layer (mapping a demo user to a signer) and *document storage* are simulated/off-chain-only, as neither is claimed by the problem statement to require on-chain proof.

