const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BEL Blockchain Platform Contracts", function () {
  let identityRegistry;
  let accessControl;
  let assetRegistry;
  let admin, user1, user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();

    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    accessControl = await AccessControlManager.deploy(await identityRegistry.getAddress());

    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetRegistry.deploy(await identityRegistry.getAddress());
  });

  describe("IdentityRegistry", function () {
    it("should register a new identity and emit IdentityRegistered", async function () {
      const did = "did:bel:0x111";
      const tx = await identityRegistry.registerIdentity(user1.address, did, "ENGINEER");
      await tx.wait();

      expect(await identityRegistry.isRegistered(did)).to.be.true;
      const id = await identityRegistry.getIdentity(did);
      expect(id.userAddress).to.equal(user1.address);
      expect(id.role).to.equal("ENGINEER");
    });

    it("should prevent duplicate registration of same address or DID", async function () {
      const did = "did:bel:0x111";
      await identityRegistry.registerIdentity(user1.address, did, "ENGINEER");

      await expect(
        identityRegistry.registerIdentity(user1.address, "did:bel:0x222", "TECHNICIAN")
      ).to.be.revertedWith("IdentityRegistry: address already registered");

      await expect(
        identityRegistry.registerIdentity(user2.address, did, "TECHNICIAN")
      ).to.be.revertedWith("IdentityRegistry: DID already registered");
    });

    it("should allow admin to assign a new role", async function () {
      const did = "did:bel:0x111";
      await identityRegistry.registerIdentity(user1.address, did, "ENGINEER");
      await identityRegistry.assignRole(did, "MANAGER");

      const id = await identityRegistry.getIdentity(did);
      expect(id.role).to.equal("MANAGER");
    });
  });

  describe("AccessControlManager", function () {
    const resId = "RADAR-BAY-03";
    const sensitivity = "RESTRICTED";
    const docHash = "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const did = "did:bel:0x111";

    beforeEach(async function () {
      await identityRegistry.registerIdentity(user1.address, did, "ENGINEER");
      await accessControl.createResource(resId, sensitivity, docHash);
    });

    it("should create resource with document SHA-256 hash", async function () {
      const res = await accessControl.getResource(resId);
      expect(res[0]).to.equal(resId);
      expect(res[1]).to.equal(sensitivity);
      expect(res[2]).to.equal(docHash);
    });

    it("should handle request -> grant -> hasAccess -> revoke lifecycle", async function () {
      // Initially no access
      expect(await accessControl.hasAccess(did, resId)).to.be.false;

      // User requests access
      await accessControl.connect(user1).requestAccess(did, resId);
      let record = await accessControl.getAccessRecord(did, resId);
      expect(record.status).to.equal(1n); // REQUESTED
      expect(await accessControl.hasAccess(did, resId)).to.be.false;

      // Admin grants access
      await accessControl.grantAccess(did, resId);
      expect(await accessControl.hasAccess(did, resId)).to.be.true;

      // Admin revokes access
      await accessControl.revokeAccess(did, resId);
      expect(await accessControl.hasAccess(did, resId)).to.be.false;
    });

    it("should enforce administrator-defined RBAC policies for registered identities", async function () {
      expect(await accessControl.hasAccess(did, resId)).to.be.false;
      await accessControl.setRolePermission(resId, "ENGINEER", true);
      expect(await accessControl.hasAccess(did, resId)).to.be.true;

      // A role change updates effective permission without an off-chain cache.
      await identityRegistry.assignRole(did, "TECHNICIAN");
      expect(await accessControl.hasAccess(did, resId)).to.be.false;
    });
  });

  describe("AssetRegistry (ERC-721)", function () {
    const metadataURI = "ipfs://QmBELSampleAssetMetadata123";
    const initialOwnerDid = "did:bel:admin";
    const newOwnerDid = "did:bel:0x111";
    const docHash = "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a";

    it("should mint asset, emit AssetMinted, and store document hash", async function () {
      await identityRegistry.registerIdentity(admin.address, initialOwnerDid, "ADMIN");
      const tx = await assetRegistry.mintAsset(metadataURI, initialOwnerDid, docHash);
      await tx.wait();

      const asset = await assetRegistry.getAsset(1);
      expect(asset[0]).to.equal(1n);
      expect(asset[1]).to.equal(metadataURI);
      expect(asset[2]).to.equal(initialOwnerDid);
      expect(asset[3]).to.equal(docHash);
      expect(asset[4]).to.equal(0n); // ACTIVE
      expect(await assetRegistry.ownerOf(1)).to.equal(admin.address);
    });

    it("should transfer asset and record chronological ownership history", async function () {
      await identityRegistry.registerIdentity(admin.address, initialOwnerDid, "ADMIN");
      await identityRegistry.registerIdentity(user1.address, newOwnerDid, "ENGINEER");
      await assetRegistry.mintAsset(metadataURI, initialOwnerDid, docHash);
      await assetRegistry.transferAsset(1, newOwnerDid);

      const asset = await assetRegistry.getAsset(1);
      expect(asset.currentOwnerDid).to.equal(newOwnerDid);

      const history = await assetRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(2);
      expect(history[0].toDid).to.equal(initialOwnerDid);
      expect(history[1].fromDid).to.equal(initialOwnerDid);
      expect(history[1].toDid).to.equal(newOwnerDid);
      expect(await assetRegistry.ownerOf(1)).to.equal(user1.address);
    });

    it("should allow retiring an asset", async function () {
      await identityRegistry.registerIdentity(admin.address, initialOwnerDid, "ADMIN");
      await assetRegistry.mintAsset(metadataURI, initialOwnerDid, docHash);
      await assetRegistry.retireAsset(1);

      const asset = await assetRegistry.getAsset(1);
      expect(asset.status).to.equal(1n); // RETIRED
    });
  });
});
