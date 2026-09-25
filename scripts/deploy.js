const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("==========================================");
  console.log("Deploying BEL Blockchain Platform Contracts");
  console.log("==========================================");

  const [deployer, securityApprover] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Deploy IdentityRegistry
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log("✓ IdentityRegistry deployed to:", identityAddress);

  // 2. Deploy AccessControlManager
  const AccessControlManager = await hre.ethers.getContractFactory("AccessControlManager");
  const accessControl = await AccessControlManager.deploy(identityAddress);
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log("✓ AccessControlManager deployed to:", accessControlAddress);

  // 3. Deploy AssetRegistry (ERC-721)
  const AssetRegistry = await hre.ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy(identityAddress, securityApprover.address);
  await assetRegistry.waitForDeployment();
  const assetRegistryAddress = await assetRegistry.getAddress();
  console.log("✓ AssetRegistry (ERC-721) deployed to:", assetRegistryAddress);

  // Extract ABIs from artifacts
  const identityArtifact = await hre.artifacts.readArtifact("IdentityRegistry");
  const accessControlArtifact = await hre.artifacts.readArtifact("AccessControlManager");
  const assetRegistryArtifact = await hre.artifacts.readArtifact("AssetRegistry");

  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      IdentityRegistry: {
        address: identityAddress,
        abi: identityArtifact.abi,
      },
      AccessControlManager: {
        address: accessControlAddress,
        abi: accessControlArtifact.abi,
      },
      AssetRegistry: {
        address: assetRegistryAddress,
        abi: assetRegistryArtifact.abi,
      },
    },
  };

  // Ensure output directories exist
  const backendConfigDir = path.join(__dirname, "..", "backend", "config");
  const frontendSrcDir = path.join(__dirname, "..", "frontend", "src");

  fs.mkdirSync(backendConfigDir, { recursive: true });
  fs.mkdirSync(frontendSrcDir, { recursive: true });

  fs.writeFileSync(
    path.join(backendConfigDir, "contracts.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("✓ Exported to backend/config/contracts.json");

  fs.writeFileSync(
    path.join(frontendSrcDir, "contracts.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("✓ Exported to frontend/src/contracts.json");

  console.log("==========================================");
  console.log("All contracts deployed successfully!");
  console.log("==========================================");

  return deploymentData;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
