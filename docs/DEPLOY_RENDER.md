# Deploy BEL TrustGrid on Render

This deployment runs the React application and Express API as one web service.
It uses a persistent disk for SQLite and a public testnet RPC for the smart
contracts. It does **not** expose document hashes in the user interface.

## Before creating the Render service

1. Create four dedicated testnet wallets: one deployer, then Admin, R. Sharma,
   and A. Verma personas. Never reuse a personal or mainnet wallet.
2. Fund the deployer and the three persona wallets with small amounts of Sepolia
   test ETH. Each persona needs ETH because actions are blockchain transactions.
3. Obtain a Sepolia RPC endpoint and set these values locally without committing
   them: `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`,
   `SECURITY_APPROVER_ADDRESS`, `ADMIN_PRIVATE_KEY`, `SHARMA_PRIVATE_KEY`, and
   `VERMA_PRIVATE_KEY`. For the existing prototype flow,
   `SECURITY_APPROVER_ADDRESS` must be the public address derived from
   `SHARMA_PRIVATE_KEY`; that wallet signs the independent second approval.
4. Deploy the contracts:

   ```sh
   npx hardhat run scripts/deploy.js --network sepolia
   ```

   The command replaces `backend/config/contracts.json` with public Sepolia
   contract addresses and ABIs. Commit that file before deploying the web
   service. Contract addresses are public; private keys are not.

5. After the first Render deploy, open its **Shell** and seed the public demo
   once using the same persona wallets. This writes the supplied seed data to
   the attached persistent disk and records the initial transactions on Sepolia.
   It must be run deliberately; do not make it part of the Render start command
   because it resets SQLite data:

   ```sh
   npx hardhat run scripts/seed.js --network sepolia
   ```

## Create the Render service

1. In Render, select **New +** → **Blueprint** and connect the GitHub branch
   containing `render.yaml`.
2. Choose a paid web-service plan that supports the attached persistent disk.
3. Add the following **secret environment variables** in the Render dashboard:
   `RPC_URL`, `ADMIN_PRIVATE_KEY`, `SHARMA_PRIVATE_KEY`, and
   `VERMA_PRIVATE_KEY`.
4. Deploy. Render supplies `PORT`; do not set it yourself.
5. Open the generated `https://…onrender.com` URL. Verify
   `https://…onrender.com/api/health` returns `status: "OK"`, then sign in with
   the existing seeded demo accounts.

## Safety checks included in the app

- Production startup refuses the local Hardhat contract configuration.
- Production startup checks that the configured RPC chain ID matches the
  deployed contract configuration.
- The SQLite file is stored at `/var/data/bel_platform.db`, the Render disk
  mount, rather than in the temporary container filesystem.
