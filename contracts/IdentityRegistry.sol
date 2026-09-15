// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IdentityRegistry
 * @notice Anchors Decentralized Identities (DIDs) on-chain for Bharat Electronics Limited (BEL).
 * Stores cryptographic wallet mappings, descriptive roles, and onboarding provenance.
 */
contract IdentityRegistry {
    address public admin;

    struct Identity {
        string did;
        address userAddress;
        string role; // ADMIN, ENGINEER, TECHNICIAN, MANAGER
        uint256 registeredAt;
        address registeredBy;
        bool exists;
    }

    // Mapping from DID to Identity
    mapping(string => Identity) private _identities;
    // Mapping from wallet address to DID
    mapping(address => string) private _addressToDid;
    // Array of all registered DIDs for enumeration
    string[] private _allDids;

    event IdentityRegistered(
        string indexed did,
        address indexed userAddress,
        address indexed registeredBy,
        string role,
        uint256 timestamp
    );

    event RoleAssigned(
        string indexed did,
        string role,
        address indexed assignedBy,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "IdentityRegistry: caller is not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Register a new identity with a DID, wallet address, and role.
     */
    function registerIdentity(
        address userAddress,
        string calldata didURI,
        string calldata role
    ) external onlyAdmin {
        require(userAddress != address(0), "IdentityRegistry: zero address");
        require(bytes(didURI).length > 0, "IdentityRegistry: empty DID");
        require(!_identities[didURI].exists, "IdentityRegistry: DID already registered");
        require(bytes(_addressToDid[userAddress]).length == 0, "IdentityRegistry: address already registered");

        _identities[didURI] = Identity({
            did: didURI,
            userAddress: userAddress,
            role: role,
            registeredAt: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        _addressToDid[userAddress] = didURI;
        _allDids.push(didURI);

        emit IdentityRegistered(didURI, userAddress, msg.sender, role, block.timestamp);
    }

    /**
     * @notice Assign/change role for an existing identity.
     */
    function assignRole(string calldata didURI, string calldata newRole) external onlyAdmin {
        require(_identities[didURI].exists, "IdentityRegistry: identity does not exist");
        require(bytes(newRole).length > 0, "IdentityRegistry: empty role");

        _identities[didURI].role = newRole;

        emit RoleAssigned(didURI, newRole, msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a DID is registered.
     */
    function isRegistered(string calldata didURI) external view returns (bool) {
        return _identities[didURI].exists;
    }

    /**
     * @notice Get identity details by DID.
     */
    function getIdentity(string calldata didURI)
        external
        view
        returns (
            string memory did,
            address userAddress,
            string memory role,
            uint256 registeredAt,
            address registeredBy
        )
    {
        require(_identities[didURI].exists, "IdentityRegistry: identity not found");
        Identity storage idObj = _identities[didURI];
        return (idObj.did, idObj.userAddress, idObj.role, idObj.registeredAt, idObj.registeredBy);
    }

    /**
     * @notice Get identity details by wallet address.
     */
    function getIdentityByAddress(address userAddress)
        external
        view
        returns (
            string memory did,
            address addr,
            string memory role,
            uint256 registeredAt,
            address registeredBy
        )
    {
        string memory didURI = _addressToDid[userAddress];
        require(bytes(didURI).length > 0, "IdentityRegistry: address not registered");
        Identity storage idObj = _identities[didURI];
        return (idObj.did, idObj.userAddress, idObj.role, idObj.registeredAt, idObj.registeredBy);
    }

    /**
     * @notice Get total count of registered identities.
     */
    function getIdentityCount() external view returns (uint256) {
        return _allDids.length;
    }

    /**
     * @notice Get all registered identities.
     */
    function getAllIdentities() external view returns (Identity[] memory) {
        Identity[] memory list = new Identity[](_allDids.length);
        for (uint256 i = 0; i < _allDids.length; i++) {
            list[i] = _identities[_allDids[i]];
        }
        return list;
    }
}
