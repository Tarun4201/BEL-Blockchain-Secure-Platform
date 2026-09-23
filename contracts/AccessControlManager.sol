// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IIdentityRegistry.sol";

/**
 * @title AccessControlManager
 * @notice Manages protected resources, access requests, grants, revocations, and canonical access verification.
 * Follows strict explicit per-resource permissions as specified in BEL PRD Section 8 & Appendix A1.
 */
contract AccessControlManager {
    address public admin;
    IIdentityRegistry public immutable identityRegistry;

    enum AccessStatus {
        NONE,
        REQUESTED,
        GRANTED,
        REVOKED
    }

    struct Resource {
        string resourceId;
        string sensitivityLabel; // e.g., RESTRICTED, SECRET, TOP_SECRET
        string documentHash;     // Cryptographic SHA-256 hash of technical specification
        address createdBy;
        uint256 createdAt;
        bool exists;
    }

    struct AccessRecord {
        string did;
        string resourceId;
        AccessStatus status;
        address updatedBy;
        uint256 updatedAt;
    }

    // Mapping from resourceId to Resource
    mapping(string => Resource) private _resources;
    string[] private _allResourceIds;

    // Mapping from keccak256(abi.encodePacked(did, resourceId)) to AccessRecord
    mapping(bytes32 => AccessRecord) private _accessRecords;
    bytes32[] private _allAccessKeys;
    // Role policy supplements explicit grants. An administrator can allow a
    // registered role to access a resource; identity role changes take effect
    // immediately because hasAccess resolves the DID's live registry role.
    mapping(string => mapping(string => bool)) private _rolePermissions;

    event ResourceCreated(
        string indexed resourceId,
        string sensitivityLabel,
        string documentHash,
        address indexed createdBy,
        uint256 timestamp
    );

    event AccessRequested(
        string indexed did,
        string indexed resourceId,
        address indexed requestedBy,
        uint256 timestamp
    );

    event AccessGranted(
        string indexed did,
        string indexed resourceId,
        address indexed grantedBy,
        uint256 timestamp
    );

    event AccessRevoked(
        string indexed did,
        string indexed resourceId,
        address indexed revokedBy,
        uint256 timestamp
    );

    event RolePermissionUpdated(
        string indexed resourceId,
        string role,
        bool allowed,
        address indexed updatedBy,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "AccessControlManager: caller is not admin");
        _;
    }

    constructor(address identityRegistryAddress) {
        require(identityRegistryAddress != address(0), "AccessControlManager: zero identity registry");
        admin = msg.sender;
        identityRegistry = IIdentityRegistry(identityRegistryAddress);
    }

    function _getKey(string memory did, string memory resourceId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(did, resourceId));
    }

    /**
     * @notice Define a protected resource with a sensitivity label and document SHA-256 hash.
     */
    function createResource(
        string calldata resourceId,
        string calldata sensitivityLabel,
        string calldata documentHash
    ) external onlyAdmin {
        require(bytes(resourceId).length > 0, "AccessControlManager: empty resourceId");
        require(!_resources[resourceId].exists, "AccessControlManager: resource already exists");

        _resources[resourceId] = Resource({
            resourceId: resourceId,
            sensitivityLabel: sensitivityLabel,
            documentHash: documentHash,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        _allResourceIds.push(resourceId);

        emit ResourceCreated(resourceId, sensitivityLabel, documentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Submit an access request for a protected resource.
     */
    function requestAccess(string calldata did, string calldata resourceId) external {
        require(bytes(did).length > 0, "AccessControlManager: empty DID");
        require(_resources[resourceId].exists, "AccessControlManager: resource does not exist");
        require(identityRegistry.isRegistered(did), "AccessControlManager: DID is not registered");
        (, address didWallet, , , ) = identityRegistry.getIdentity(did);
        require(msg.sender == didWallet, "AccessControlManager: caller does not control DID");

        bytes32 key = _getKey(did, resourceId);
        AccessRecord storage record = _accessRecords[key];

        require(record.status != AccessStatus.GRANTED, "AccessControlManager: access already granted");
        require(record.status != AccessStatus.REQUESTED, "AccessControlManager: access request already pending");

        if (record.status == AccessStatus.NONE) {
            _allAccessKeys.push(key);
        }

        record.did = did;
        record.resourceId = resourceId;
        record.status = AccessStatus.REQUESTED;
        record.updatedBy = msg.sender;
        record.updatedAt = block.timestamp;

        emit AccessRequested(did, resourceId, msg.sender, block.timestamp);
    }

    /**
     * @notice Admin grants access to a requested or registered DID for a resource.
     */
    function grantAccess(string calldata did, string calldata resourceId) external onlyAdmin {
        require(bytes(did).length > 0, "AccessControlManager: empty DID");
        require(_resources[resourceId].exists, "AccessControlManager: resource does not exist");
        require(identityRegistry.isRegistered(did), "AccessControlManager: DID is not registered");

        bytes32 key = _getKey(did, resourceId);
        AccessRecord storage record = _accessRecords[key];

        if (record.status == AccessStatus.NONE) {
            _allAccessKeys.push(key);
        }

        record.did = did;
        record.resourceId = resourceId;
        record.status = AccessStatus.GRANTED;
        record.updatedBy = msg.sender;
        record.updatedAt = block.timestamp;

        emit AccessGranted(did, resourceId, msg.sender, block.timestamp);
    }

    /**
     * @notice Admin revokes previously granted access for a resource.
     */
    function revokeAccess(string calldata did, string calldata resourceId) external onlyAdmin {
        require(_resources[resourceId].exists, "AccessControlManager: resource does not exist");

        bytes32 key = _getKey(did, resourceId);
        AccessRecord storage record = _accessRecords[key];

        require(record.status == AccessStatus.GRANTED, "AccessControlManager: no active access to revoke");

        record.status = AccessStatus.REVOKED;
        record.updatedBy = msg.sender;
        record.updatedAt = block.timestamp;

        emit AccessRevoked(did, resourceId, msg.sender, block.timestamp);
    }

    /**
     * @notice Set the policy for all registered identities with a given role.
     * Explicit grants remain available for temporary or exceptional access.
     */
    function setRolePermission(
        string calldata resourceId,
        string calldata role,
        bool allowed
    ) external onlyAdmin {
        require(_resources[resourceId].exists, "AccessControlManager: resource does not exist");
        require(bytes(role).length > 0, "AccessControlManager: empty role");
        _rolePermissions[resourceId][role] = allowed;
        emit RolePermissionUpdated(resourceId, role, allowed, msg.sender, block.timestamp);
    }

    function hasRolePermission(string calldata resourceId, string calldata role) external view returns (bool) {
        return _rolePermissions[resourceId][role];
    }

    /**
     * @notice Canonical access check function.
     * Evaluates strictly whether access is explicitly granted.
     */
    function hasAccess(string calldata did, string calldata resourceId) external view returns (bool) {
        bytes32 key = _getKey(did, resourceId);
        if (_accessRecords[key].status == AccessStatus.GRANTED) return true;
        if (!_resources[resourceId].exists || !identityRegistry.isRegistered(did)) return false;
        (, , string memory role, , ) = identityRegistry.getIdentity(did);
        return _rolePermissions[resourceId][role];
    }

    /**
     * @notice Get resource details by ID.
     */
    function getResource(string calldata resourceId)
        external
        view
        returns (
            string memory resId,
            string memory sensitivityLabel,
            string memory documentHash,
            address createdBy,
            uint256 createdAt
        )
    {
        require(_resources[resourceId].exists, "AccessControlManager: resource not found");
        Resource storage res = _resources[resourceId];
        return (res.resourceId, res.sensitivityLabel, res.documentHash, res.createdBy, res.createdAt);
    }

    /**
     * @notice Get explicit access record for a DID and resource.
     */
    function getAccessRecord(string calldata did, string calldata resourceId)
        external
        view
        returns (
            AccessStatus status,
            address updatedBy,
            uint256 updatedAt
        )
    {
        bytes32 key = _getKey(did, resourceId);
        AccessRecord storage rec = _accessRecords[key];
        return (rec.status, rec.updatedBy, rec.updatedAt);
    }

    /**
     * @notice Get total resource count.
     */
    function getResourceCount() external view returns (uint256) {
        return _allResourceIds.length;
    }

    /**
     * @notice Get all resources.
     */
    function getAllResources() external view returns (Resource[] memory) {
        Resource[] memory list = new Resource[](_allResourceIds.length);
        for (uint256 i = 0; i < _allResourceIds.length; i++) {
            list[i] = _resources[_allResourceIds[i]];
        }
        return list;
    }

    /**
     * @notice Get all access records for auditing.
     */
    function getAllAccessRecords() external view returns (AccessRecord[] memory) {
        AccessRecord[] memory list = new AccessRecord[](_allAccessKeys.length);
        for (uint256 i = 0; i < _allAccessKeys.length; i++) {
            list[i] = _accessRecords[_allAccessKeys[i]];
        }
        return list;
    }

    /**
     * @notice Return only requests waiting for an administrator decision.
     * This powers the approval queue without trusting an off-chain filter.
     */
    function getPendingRequests() external view returns (AccessRecord[] memory) {
        uint256 count;
        for (uint256 i = 0; i < _allAccessKeys.length; i++) {
            if (_accessRecords[_allAccessKeys[i]].status == AccessStatus.REQUESTED) count++;
        }
        AccessRecord[] memory pending = new AccessRecord[](count);
        uint256 index;
        for (uint256 i = 0; i < _allAccessKeys.length; i++) {
            AccessRecord memory record = _accessRecords[_allAccessKeys[i]];
            if (record.status == AccessStatus.REQUESTED) pending[index++] = record;
        }
        return pending;
    }
}
