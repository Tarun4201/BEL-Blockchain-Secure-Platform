require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const accounts = [
  process.env.DEPLOYER_PRIVATE_KEY,
  process.env.ADMIN_PRIVATE_KEY,
  process.env.SHARMA_PRIVATE_KEY,
  process.env.VERMA_PRIVATE_KEY,
].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: {
      url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || process.env.RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com",
      chainId: 80002,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || process.env.RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    custom: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
      chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
      accounts: accounts.length > 0 ? accounts : undefined,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
