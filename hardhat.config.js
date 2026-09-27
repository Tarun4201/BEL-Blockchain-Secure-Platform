require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
const sepoliaNetwork = sepoliaRpcUrl && process.env.DEPLOYER_PRIVATE_KEY
  ? {
      sepolia: {
        url: sepoliaRpcUrl,
        accounts: [process.env.DEPLOYER_PRIVATE_KEY],
        chainId: 11155111,
      },
    }
  : {};

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
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337,
    },
    ...sepoliaNetwork,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
