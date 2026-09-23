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
  setRolePermission: (resourceId, role, allowed) => req('POST', '/access/role-permissions', { resourceId, role, allowed }),
  getRolePermission: (resourceId, role) => req('GET', `/access/role-permissions/${encodeURIComponent(resourceId)}/${encodeURIComponent(role)}`),
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
  rebuildIndex: () => req('POST', '/audit/rebuild'),
};

async function erpReq(path, { method = 'GET', body, sessionToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['x-erp-session'] = sessionToken;
  const res = await fetch(`${BASE}/erp${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const erpApi = {
  bootstrap: () => erpReq('/bootstrap'),
  login: (data) => erpReq('/login', { method: 'POST', body: data }),
  logout: (sessionToken) => erpReq('/logout', { method: 'POST', sessionToken }),
  dashboard: (sessionToken, departmentId) => erpReq(`/dashboard?departmentId=${encodeURIComponent(departmentId || '')}`, { sessionToken }),
  records: (sessionToken, module, departmentId) => erpReq(`/records/${encodeURIComponent(module)}?departmentId=${encodeURIComponent(departmentId || '')}`, { sessionToken }),
  accessRequests: (sessionToken) => erpReq('/access-requests', { sessionToken }),
  createAccessRequest: (sessionToken, data) => erpReq('/access-requests', { method: 'POST', body: data, sessionToken }),
  decideAccessRequest: (sessionToken, requestId, decision) => erpReq(`/access-requests/${encodeURIComponent(requestId)}/${decision}`, { method: 'POST', sessionToken }),
  audit: (sessionToken) => erpReq('/audit', { sessionToken }),
  blockchainOverview: (sessionToken) => erpReq('/blockchain/overview', { sessionToken }),
  guideProgress: (sessionToken) => erpReq('/guide/progress', { sessionToken }),
  saveGuideProgress: (sessionToken, data) => erpReq('/guide/progress', { method: 'PUT', body: data, sessionToken }),
  guideStats: (sessionToken) => erpReq('/guide/stats', { sessionToken }),
};
