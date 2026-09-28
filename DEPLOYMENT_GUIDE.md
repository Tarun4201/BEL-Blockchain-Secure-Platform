# BEL Blockchain Secure Platform — Production Cloud Deployment Guide

This guide details the complete 24/7 persistent cloud architecture for the **Bharat Electronics Limited (BEL) Blockchain Platform MVP** to remain permanently accessible online even when your local PC is completely powered off and offline.

---

## 1. Architecture Overview

```
                          [ User Browser ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    Vercel Frontend    │
                     │  (React 19 + Vite)    │
                     └───────────┬───────────┘
                                 │ HTTPS REST API
                                 ▼
                     ┌───────────────────────┐
                     │ Render / Railway API  │
                     │ (Node.js Express 24/7)│
                     └─────┬───────────┬─────┘
                           │           │
           libSQL / SQLite │           │ Ethers.js JSON-RPC (TLS)
                           ▼           ▼
        ┌────────────────────┐   ┌───────────────────────────┐
        │  Turso Cloud DB    │   │  Persistent EVM Network   │
        │ (libSQL Serverless)│   │ (Polygon Amoy / Sepolia)  │
        └────────────────────┘   └───────────────────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 │ • IdentityRegistry.sol    │
                                 │ • AccessControlManager.sol│
                                 │ • AssetRegistry.sol (NFT) │
                                 └───────────────────────────┘
```

---

## 2. Service Selection & Rationale (Free / Low-Cost Demo Stack)

| Component | Selected Cloud Service | Tier / Cost | Why Selected |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Free Hobby Tier | Instant global edge CDN, HTTPS, native Vite/React SPA rewrites, zero maintenance. |
| **Backend API** | **Render** or **Railway** | Free / Low-cost Web Service | Runs continuous Node.js processes, handles background indexing, provides permanent `https://...` URL. |
| **Database** | **Turso (libSQL)** | Free Tier (9GB / 1B reads) | 100% SQLite compatible (zero query rewrites), persistent cloud storage, millisecond query times. |
| **Blockchain** | **Polygon Amoy** or **Ethereum Sepolia** | Free Public EVM Testnet | 24/7 global availability, verifiable on public block explorers (Polygonscan / Etherscan), permanent on-chain state. |

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Deploy Database (Turso libSQL)
1. Sign up for free at [https://turso.tech](https://turso.tech) or install Turso CLI (`curl -sSfL https://get.tur.so/install.sh | bash` or `winget install turso`).
2. Create a new database:
   ```bash
   turso db create bel-platform-db
   ```
3. Get the database URL and authentication token:
   ```bash
   turso db show bel-platform-db --url
   # Output: libsql://bel-platform-db-[username].turso.io

   turso db tokens create bel-platform-db
   # Output: eyJhbGciOi... (Auth Token)
   ```

### Step 2: Deploy Smart Contracts to EVM Testnet
1. Fund your deployer wallet (e.g. from Polygon Amoy Faucet or Sepolia Faucet).
2. Set the environment variables in your local `.env`:
   ```env
   RPC_URL=https://rpc-amoy.polygon.technology
   ADMIN_PRIVATE_KEY=0x<your-funded-private-key>
   ```
3. Deploy contracts to Polygon Amoy (or Sepolia):
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```
4. Seed the initial defense assets, personnel DIDs, and resources:
   ```bash
   npx hardhat run scripts/seed.js --network amoy
   ```
   *Note: Contract addresses will be automatically exported to `backend/config/contracts.json` and `frontend/src/contracts.json`.*

### Step 3: Deploy Express Backend to Render
1. Sign in to [https://render.com](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository (`harshab054/BEL-Blockchain-Secure-Platform`).
3. Configure the service:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables in the Render Dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `5001`
   - `CORS_ORIGIN`: `https://your-frontend.vercel.app` (or `*` during initial testing)
   - `TURSO_DATABASE_URL`: `libsql://bel-platform-db-[username].turso.io`
   - `TURSO_AUTH_TOKEN`: `your-turso-token`
   - `RPC_URL`: `https://rpc-amoy.polygon.technology`
   - `BLOCKCHAIN_NETWORK_NAME`: `Polygon Amoy Testnet (ChainID: 80002)`
   - `CHAIN_ID`: `80002`
   - `ADMIN_PRIVATE_KEY`: `0x...`
   - `SHARMA_PRIVATE_KEY`: `0x...`
   - `VERMA_PRIVATE_KEY`: `0x...`
5. Click **Create Web Service**. Once deployed, copy your backend URL (e.g., `https://bel-platform-api.onrender.com`).

### Step 4: Deploy Frontend to Vercel
1. Sign in to [https://vercel.com](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository (`harshab054/BEL-Blockchain-Secure-Platform`).
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://bel-platform-api.onrender.com` (your deployed Render backend URL)
5. Click **Deploy**.

---

## 4. Local Development Workflow

To continue developing locally without affecting production:
```bash
# 1. Start local Hardhat blockchain
npm run chain

# 2. Deploy contracts and seed local database
npm run reset-demo

# 3. Start local backend (Port 5001)
npm run backend

# 4. Start local Vite frontend (Port 5173)
npm run frontend

# OR start everything concurrently:
npm run dev
```
