const fs = require("fs");
const crypto = require("crypto");

/**
 * Compute cryptographic SHA-256 hash of a file
 * @param {string} filePath - Absolute or relative path to file
 * @returns {string} - Hex-encoded SHA-256 hash prefixed with 0x
 */
function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return "0x" + hash;
}

/**
 * Compute cryptographic SHA-256 hash of arbitrary text or buffer
 * @param {string|Buffer} content
 * @returns {string} - Hex-encoded SHA-256 hash prefixed with 0x
 */
function computeContentHash(content) {
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return "0x" + hash;
}

/**
 * Verify document integrity against on-chain hash
 * @param {string} filePath 
 * @param {string} onChainHash 
 * @returns {{ matches: boolean, computedHash: string, onChainHash: string }}
 */
function verifyDocumentIntegrity(filePath, onChainHash) {
  const computedHash = computeFileHash(filePath);
  const normalizedOnChain = onChainHash.toLowerCase();
  const normalizedComputed = computedHash.toLowerCase();

  return {
    matches: normalizedOnChain === normalizedComputed,
    computedHash: normalizedComputed,
    onChainHash: normalizedOnChain,
  };
}

module.exports = {
  computeFileHash,
  computeContentHash,
  verifyDocumentIntegrity,
};
