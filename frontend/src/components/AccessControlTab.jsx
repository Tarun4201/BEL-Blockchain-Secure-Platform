import { useState, useEffect } from 'react';
import { api } from '../api/client';

function sensitivityBadge(label) {
  const cls = label?.toLowerCase();
  return <span className={`badge badge-${cls}`}>{label}</span>;
}

function AccessStatusBadge({ status }) {
  const cls = status?.toLowerCase();
  return <span className={`badge badge-${cls}`}>{status || 'NONE'}</span>;
}

export function AccessControlTab({ activePersona, txAction }) {
  const [resources, setResources] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [gatedContent, setGatedContent] = useState({});
  const [integrityResults, setIntegrityResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ resourceId: '', title: '', description: '', sensitivityLabel: 'RESTRICTED', documentFilename: 'radar_bay_03_tech_spec.txt' });
  const isAdmin = activePersona?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const [res, recs, pend] = await Promise.all([
        api.getResources(),
        api.getAccessRecords(),
        api.getAccessRequests(),
      ]);
      setResources(res);
      setAccessRecords(recs);
      setPendingRequests(pend);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [activePersona]);

  const myRecord = (resourceId) => accessRecords.find(r => r.did === activePersona?.did && r.resourceId === resourceId);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    await txAction('Create Resource', () => api.createResource(form));
    setForm({ resourceId: '', title: '', description: '', sensitivityLabel: 'RESTRICTED', documentFilename: 'radar_bay_03_tech_spec.txt' });
    load();
  };

  const handleRequest = async (resourceId) => {
    await txAction('Request Access', () => api.requestAccess(activePersona.did, resourceId));
    load();
  };

  const handleGrant = async (did, resourceId) => {
    await txAction('Grant Access', () => api.grantAccess(did, resourceId));
    load();
  };

  const handleRevoke = async (did, resourceId) => {
    await txAction('Revoke Access', () => api.revokeAccess(did, resourceId));
    setGatedContent(g => { const n = {...g}; delete n[resourceId]; return n; });
    load();
  };

  const handleViewContent = async (resourceId) => {
    try {
      const data = await api.getResourceContent(resourceId, activePersona.did);
      setGatedContent(g => ({ ...g, [resourceId]: data }));
    } catch (err) {
      setGatedContent(g => ({ ...g, [resourceId]: { accessGranted: false, error: err.message } }));
    }
  };

  const handleVerifyIntegrity = async (resourceId) => {
    try {
      const r = await api.verifyResourceIntegrity(resourceId);
      setIntegrityResults(prev => ({ ...prev, [resourceId]: r }));
    } catch {}
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Access Control</div>
        <div className="page-subtitle">On-chain role-independent explicit permission management via AccessControlManager smart contract</div>
      </div>

      {/* Key principle callout */}
      <div style={{ background: 'rgba(255,179,0,0.07)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: 'var(--accent-amber)' }}>
        ⚠️ <strong>BEL Access Policy:</strong> Organizational role (e.g. ENGINEER) does <strong>not</strong> grant implicit access to any resource. All access decisions are determined strictly by the on-chain <code>hasAccess(did, resourceId)</code> call — only explicit admin grants count.
      </div>

      {/* Pending Requests Queue — Admin */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="card mb-3">
          <div className="flex-between mb-2">
            <div className="card-title" style={{ color: 'var(--accent-amber)', marginBottom: 0 }}>
              🔔 Pending Access Requests ({pendingRequests.length})
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Requesting DID</th><th>Resource</th><th>Requested At</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingRequests.map((req, i) => (
                  <tr key={i}>
                    <td><span className="mono">{req.did.slice(0, 22)}…</span></td>
                    <td><span className="badge badge-restricted">{req.resourceId}</span></td>
                    <td className="text-xs text-muted">{new Date(req.requestedAt * 1000).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-success btn-sm" onClick={() => handleGrant(req.did, req.resourceId)}>✓ Grant</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(req.did, req.resourceId)}>✗ Deny</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid-2 mb-3">
        {/* Create Resource — admin */}
        {isAdmin && (
          <div className="card">
            <div className="card-title">Define Protected Resource</div>
            <form onSubmit={handleCreateResource}>
              <div className="form-group">
                <label className="form-label">Resource ID</label>
                <input className="form-input mono" value={form.resourceId} onChange={e => setForm(f => ({...f, resourceId: e.target.value}))} placeholder="RADAR-BAY-03" required />
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Radar Test Bay 3 — Restricted" required />
              </div>
              <div className="form-group">
                <label className="form-label">Sensitivity Label</label>
                <select className="form-select" value={form.sensitivityLabel} onChange={e => setForm(f => ({...f, sensitivityLabel: e.target.value}))}>
                  {['RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Protected Document</label>
                <select className="form-select" value={form.documentFilename} onChange={e => setForm(f => ({...f, documentFilename: e.target.value}))}>
                  <option value="radar_bay_03_tech_spec.txt">Radar Bay 03 Tech Spec</option>
                  <option value="ew_lab_signal_protocol.txt">EW Lab Signal Protocol</option>
                  <option value="avionics_telemetry_manual.txt">Avionics Telemetry Manual</option>
                </select>
              </div>
              <button className="btn btn-primary w-full" type="submit">⛓ Create & Anchor On-Chain</button>
            </form>
          </div>
        )}

        {/* Access Summary for current user */}
        <div className="card">
          <div className="card-title">My Permissions ({activePersona?.name})</div>
          {resources.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔐</div><div className="empty-title">No resources defined yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {resources.map(res => {
                const rec = myRecord(res.resource_id);
                return (
                  <div key={res.resource_id} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{res.title}</div>
                      <div className="text-xs text-muted">{res.resource_id}</div>
                    </div>
                    <AccessStatusBadge status={rec?.status || 'NONE'} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resources with live access checking */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {resources.map(res => {
          const rec = myRecord(res.resource_id);
          const content = gatedContent[res.resource_id];
          const integrity = integrityResults[res.resource_id];

          return (
            <div key={res.resource_id} className="card">
              <div className="flex-between mb-2">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{res.title}</div>
                  <div className="flex gap-1 mt-1">
                    {sensitivityBadge(res.sensitivity_label)}
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{res.resource_id}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleVerifyIntegrity(res.resource_id)}>🔎 Verify Integrity</button>
                  {!isAdmin && rec?.status !== 'GRANTED' && rec?.status !== 'REQUESTED' && (
                    <button className="btn btn-amber btn-sm" onClick={() => handleRequest(res.resource_id)}>⛓ Request Access</button>
                  )}
                  {!isAdmin && rec?.status === 'GRANTED' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleViewContent(res.resource_id)}>🔓 View Spec</button>
                  )}
                  {isAdmin && (
                    <button className="btn btn-success btn-sm" onClick={() => handleViewContent(res.resource_id)}>🔓 View Content</button>
                  )}
                </div>
              </div>

              {/* Integrity anchors are held by the protected backend. */}
              <div className="flex gap-1 mb-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="text-xs text-muted">Document integrity anchor:</span>
                <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>Protected in backend</span>
              </div>

              {/* Integrity result */}
              {integrity && (
                <div className={`integrity-box ${integrity.integrityVerified ? 'pass' : 'fail'} mb-2`}>
                  <span>{integrity.integrityVerified ? '✓' : '✗'}</span>
                  <span>{integrity.tamperEvidentVerdict}</span>
                </div>
              )}

              {/* Current user's access status */}
              {!isAdmin && (
                <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="text-xs text-muted">Your access status (live on-chain check):</span>
                  <AccessStatusBadge status={rec?.status || 'NONE'} />
                  {rec?.status === 'REQUESTED' && <span className="text-xs text-muted">Awaiting admin approval…</span>}
                </div>
              )}

              {/* Admin — per-resource grant management */}
              {isAdmin && (
                <div className="mt-2">
                  <div className="form-label mb-1">Manage Access for User DID</div>
                  <div className="flex gap-1">
                    <input className="form-input mono" id={`grantDid-${res.resource_id}`} placeholder="did:bel:0x..." style={{ flex: 1 }} />
                    <button className="btn btn-success btn-sm" onClick={() => { const d = document.getElementById(`grantDid-${res.resource_id}`).value; handleGrant(d, res.resource_id); }}>Grant</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { const d = document.getElementById(`grantDid-${res.resource_id}`).value; handleRevoke(d, res.resource_id); }}>Revoke</button>
                  </div>
                </div>
              )}

              {/* Gated Content */}
              {content && (
                <div className="mt-2">
                  {content.accessGranted ? (
                    <div>
                      <div className={`integrity-box ${content.integrityCheck?.verified ? 'pass' : 'fail'} mb-2`}>
                        <span>{content.integrityCheck?.verified ? '✓' : '✗'}</span>
                        <span>{content.integrityCheck?.status}</span>
                      </div>
                      <div className="code-block">{content.documentContent}</div>
                    </div>
                  ) : (
                    <div className="access-gate denied">
                      <div className="access-gate-icon">🔒</div>
                      <div className="access-gate-title">Access Denied</div>
                      <div className="access-gate-desc">{content.error || content.details}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
