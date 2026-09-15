const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Status
  getStatus: () => req('GET', '/status'),

  // Auth / Personas
  getPersonas: () => req('GET', '/auth/personas'),
  getCurrent: () => req('GET', '/auth/current'),
  switchPersona: (personaId) => req('POST', '/auth/switch', { personaId }),

  // Identities
  getIdentities: () => req('GET', '/identities'),
  getIdentity: (did) => req('GET', `/identities/${encodeURIComponent(did)}`),
  registerIdentity: (data) => req('POST', '/identities', data),
  assignRole: (did, newRole) => req('PUT', `/identities/${encodeURIComponent(did)}/role`, { newRole }),

  // Resources
  getResources: () => req('GET', '/resources'),
  getResource: (id) => req('GET', `/resources/${id}`),
  createResource: (data) => req('POST', '/resources', data),
  getResourceContent: (id, did) => req('GET', `/resources/${id}/content?did=${encodeURIComponent(did)}`),
  verifyResourceIntegrity: (id) => req('GET', `/resources/${id}/verify-integrity`),

  // Access Control
  getAccessRecords: () => req('GET', '/access/records'),
  getAccessRequests: () => req('GET', '/access/requests'),
  requestAccess: (did, resourceId) => req('POST', '/access/requests', { did, resourceId }),
  grantAccess: (did, resourceId) => req('POST', '/access/grant', { did, resourceId }),
  revokeAccess: (did, resourceId) => req('POST', '/access/revoke', { did, resourceId }),
  checkAccess: (did, resourceId) => req('GET', `/access/check/${encodeURIComponent(did)}/${resourceId}`),

  // Assets
  getAssets: () => req('GET', '/assets'),
  getAsset: (id) => req('GET', `/assets/${id}`),
  mintAsset: (data) => req('POST', '/assets', data),
  transferAsset: (id, newOwnerDid) => req('POST', `/assets/${id}/transfer`, { newOwnerDid }),
  verifyAssetIntegrity: (id) => req('GET', `/assets/${id}/verify-integrity`),

  // Audit
  getAuditEvents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/audit${q ? '?' + q : ''}`);
  },
  getTx: (txHash) => req('GET', `/audit/tx/${txHash}`),
  rebuildIndex: () => req('POST', '/audit/rebuild'),
};
