// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./IIdentityRegistry.sol";

/**
 * @title AssetRegistry
 * @notice ERC-721 compliant digital/defense asset registry for Bharat Electronics Limited (BEL).
 * Manages tokenized defense hardware & documentation, custody provenance, and document integrity hashes.
 */
contract AssetRegistry is ERC721URIStorage {
    address public admin;
    address public immutable securityApprover;
    IIdentityRegistry public immutable identityRegistry;
    uint256 private _nextTokenId = 1;

    enum AssetStatus {
        ACTIVE,
        RETIRED
    }

    struct OwnershipRecord {
        uint256 assetId;
        string fromDid;
        string toDid;
        address transferredBy;
        uint256 timestamp;
    }

    struct AssetInfo {
        uint256 assetId;
        string metadataURI;
        string currentOwnerDid;
        address currentOwnerWallet;
        string documentHash; // SHA-256 hash of specs/manual
        AssetStatus status;
        address mintedBy;
        uint256 mintedAt;
    }

    struct PendingTransfer {
        string newOwnerDid;
        address proposedBy;
        uint256 proposedAt;
        bool active;
    }

    struct ServiceRecord {
        string serviceReference;
        address recordedBy;
        uint256 timestamp;
    }

    // Mapping from assetId to AssetInfo
    mapping(uint256 => AssetInfo) private _assetInfos;
    // Mapping from assetId to full chronological history
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistories;
    mapping(uint256 => PendingTransfer) private _pendingTransfers;
    mapping(uint256 => ServiceRecord[]) private _serviceHistories;
    // Array of all asset IDs
    uint256[] private _allAssetIds;

    event AssetMinted(
        uint256 indexed assetId,
        string metadataURI,
        string ownerDid,
        string documentHash,
        address indexed mintedBy,
        uint256 timestamp
    );

    event AssetTransferred(
        uint256 indexed assetId,
        string fromDid,
        string toDid,
        address indexed transferredBy,
        uint256 timestamp
    );

    event AssetRetired(
        uint256 indexed assetId,
        address indexed retiredBy,
        uint256 timestamp
    );
    event HighAssuranceTransferProposed(uint256 indexed assetId, string toDid, address indexed proposedBy, uint256 timestamp);
    event HighAssuranceTransferApproved(uint256 indexed assetId, string fromDid, string toDid, address indexed approvedBy, uint256 timestamp);
    event AssetServiceRecorded(uint256 indexed assetId, string serviceReference, address indexed recordedBy, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "AssetRegistry: caller is not admin");
        _;
    }

    constructor(address identityRegistryAddress, address securityApproverAddress) ERC721("BEL Defense Asset", "BELD") {
        require(identityRegistryAddress != address(0), "AssetRegistry: zero identity registry");
        require(securityApproverAddress != address(0), "AssetRegistry: zero security approver");
        admin = msg.sender;
        securityApprover = securityApproverAddress;
        identityRegistry = IIdentityRegistry(identityRegistryAddress);
    }

    /**
     * @notice Mint a new tokenized defense asset (NFT) with metadata URI, initial owner DID, and document SHA-256 hash.
     */
    function mintAsset(
        string calldata metadataURI,
        string calldata initialOwnerDid,
        string calldata documentHash
    ) external onlyAdmin returns (uint256) {
        require(bytes(initialOwnerDid).length > 0, "AssetRegistry: empty initial owner DID");
        require(identityRegistry.isRegistered(initialOwnerDid), "AssetRegistry: owner DID is not registered");
        (, address initialOwnerWallet, , , ) = identityRegistry.getIdentity(initialOwnerDid);

        uint256 assetId = _nextTokenId++;
        _safeMint(initialOwnerWallet, assetId);
        _setTokenURI(assetId, metadataURI);

        _assetInfos[assetId] = AssetInfo({
            assetId: assetId,
            metadataURI: metadataURI,
            currentOwnerDid: initialOwnerDid,
            currentOwnerWallet: initialOwnerWallet,
            documentHash: documentHash,
            status: AssetStatus.ACTIVE,
            mintedBy: msg.sender,
            mintedAt: block.timestamp
        });

        _allAssetIds.push(assetId);

        // Record initial custody creation in ownership history
        _ownershipHistories[assetId].push(OwnershipRecord({
            assetId: assetId,
            fromDid: "ORIGIN_MINTER",
            toDid: initialOwnerDid,
            transferredBy: msg.sender,
            timestamp: block.timestamp
        }));

        emit AssetMinted(assetId, metadataURI, initialOwnerDid, documentHash, msg.sender, block.timestamp);

        return assetId;
    }

    /**
     * @notice Transfer asset ownership/custody from current owner DID to new owner DID.
     */
    function transferAsset(uint256 assetId, string calldata newOwnerDid) external onlyAdmin {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        require(_assetInfos[assetId].status == AssetStatus.ACTIVE, "AssetRegistry: asset is retired");
        require(bytes(newOwnerDid).length > 0, "AssetRegistry: empty new owner DID");
        require(identityRegistry.isRegistered(newOwnerDid), "AssetRegistry: owner DID is not registered");

        _completeTransfer(assetId, newOwnerDid, msg.sender);
    }

    function proposeHighAssuranceTransfer(uint256 assetId, string calldata newOwnerDid) external onlyAdmin {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        require(_assetInfos[assetId].status == AssetStatus.ACTIVE, "AssetRegistry: asset is retired");
        require(identityRegistry.isRegistered(newOwnerDid), "AssetRegistry: owner DID is not registered");
        _pendingTransfers[assetId] = PendingTransfer(newOwnerDid, msg.sender, block.timestamp, true);
        emit HighAssuranceTransferProposed(assetId, newOwnerDid, msg.sender, block.timestamp);
    }

    function approveHighAssuranceTransfer(uint256 assetId) external {
        require(msg.sender == securityApprover, "AssetRegistry: caller is not security approver");
        PendingTransfer memory pending = _pendingTransfers[assetId];
        require(pending.active, "AssetRegistry: no pending transfer");
        string memory fromDid = _assetInfos[assetId].currentOwnerDid;
        delete _pendingTransfers[assetId];
        _completeTransfer(assetId, pending.newOwnerDid, msg.sender);
        emit HighAssuranceTransferApproved(assetId, fromDid, pending.newOwnerDid, msg.sender, block.timestamp);
    }

    function recordService(uint256 assetId, string calldata serviceReference) external onlyAdmin {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        require(bytes(serviceReference).length > 0, "AssetRegistry: empty service reference");
        _serviceHistories[assetId].push(ServiceRecord(serviceReference, msg.sender, block.timestamp));
        emit AssetServiceRecorded(assetId, serviceReference, msg.sender, block.timestamp);
    }

    function _completeTransfer(uint256 assetId, string memory newOwnerDid, address actor) internal {
        string memory fromDid = _assetInfos[assetId].currentOwnerDid;
        (, address newOwnerWallet, , , ) = identityRegistry.getIdentity(newOwnerDid);
        _transfer(ownerOf(assetId), newOwnerWallet, assetId);
        _assetInfos[assetId].currentOwnerDid = newOwnerDid;
        _assetInfos[assetId].currentOwnerWallet = newOwnerWallet;
        _ownershipHistories[assetId].push(OwnershipRecord(assetId, fromDid, newOwnerDid, actor, block.timestamp));
        emit AssetTransferred(assetId, fromDid, newOwnerDid, actor, block.timestamp);
    }

    /**
     * @notice Retire a defense asset.
     */
    function retireAsset(uint256 assetId) external onlyAdmin {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        require(_assetInfos[assetId].status == AssetStatus.ACTIVE, "AssetRegistry: already retired");

        _assetInfos[assetId].status = AssetStatus.RETIRED;

        emit AssetRetired(assetId, msg.sender, block.timestamp);
    }

    /**
     * @notice Get asset details by ID.
     */
    function getAsset(uint256 assetId)
        external
        view
        returns (
            uint256 id,
            string memory metadataURI,
            string memory currentOwnerDid,
            string memory documentHash,
            AssetStatus status,
            address mintedBy,
            uint256 mintedAt
        )
    {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        AssetInfo storage a = _assetInfos[assetId];
        return (
            a.assetId,
            a.metadataURI,
            a.currentOwnerDid,
            a.documentHash,
            a.status,
            a.mintedBy,
            a.mintedAt
        );
    }

    /**
     * @notice Get complete, chronologically ordered ownership history of an asset.
     */
    function getOwnershipHistory(uint256 assetId)
        external
        view
        returns (OwnershipRecord[] memory)
    {
        require(_assetInfos[assetId].mintedAt > 0, "AssetRegistry: asset does not exist");
        return _ownershipHistories[assetId];
    }

    function getPendingTransfer(uint256 assetId) external view returns (PendingTransfer memory) { return _pendingTransfers[assetId]; }
    function getServiceHistory(uint256 assetId) external view returns (ServiceRecord[] memory) { return _serviceHistories[assetId]; }

    /**
     * @notice Get total asset count.
     */
    function getAssetCount() external view returns (uint256) {
        return _allAssetIds.length;
    }

    /**
     * @notice Get all assets.
     */
    function getAllAssets() external view returns (AssetInfo[] memory) {
        AssetInfo[] memory list = new AssetInfo[](_allAssetIds.length);
        for (uint256 i = 0; i < _allAssetIds.length; i++) {
            list[i] = _assetInfos[_allAssetIds[i]];
        }
        return list;
    }
}
