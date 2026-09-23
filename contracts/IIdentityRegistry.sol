// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Minimal read-only interface used by access and asset contracts.
 * It keeps DID-to-wallet validation inside smart-contract execution.
 */
interface IIdentityRegistry {
    function isRegistered(string calldata didURI) external view returns (bool);

    function getIdentity(string calldata didURI)
        external
        view
        returns (
            string memory did,
            address userAddress,
            string memory role,
            uint256 registeredAt,
            address registeredBy
        );
}
