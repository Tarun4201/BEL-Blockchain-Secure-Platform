import { useEffect, useState } from 'react';
import { erpApi } from '../api/client';

const when = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
const labelDid = (did, index) => `Verified identity ${String(index + 1).padStart(2, '0')} · ${String(did).slice(-8).toUpperCase()}`;
const accessState = (item, chainTime) => item.status === 'GRANTED' && item.validUntil && item.validUntil < chainTime ? 'EXPIRED' : item.status;
const accessWindow = (item) => item.validUntil ? `Active until ${when(item.validUntil)}` : 'No expiry recorded';

const demoRegistry = {
  blockNumber: 18999101,
  chainTime: 1782868560,
  identities: [
    { did: 'DEMO-IDENTITY-01', role: 'ERP_ADMIN', registeredAt: 1782782160 },
    { did: 'DEMO-IDENTITY-02', role: 'ERP_EMPLOYEE', registeredAt: 1782792960 },
  ],
  resources: [
    { resourceId: 'PROCUREMENT-REVIEW', sensitivityLabel: 'INTERNAL' },
    { resourceId: 'ASSET-CUSTODY', sensitivityLabel: 'RESTRICTED' },
  ],
  assets: [
    { assetId: 901, currentOwnerDid: 'DEMO-CUSTODY-01', status: 'ACTIVE' },
    { assetId: 902, currentOwnerDid: 'DEMO-CUSTODY-02', status: 'ACTIVE' },
  ],
  accessRecords: [
    { did: 'DEMO-IDENTITY-02', resourceId: 'PROCUREMENT-REVIEW', status: 'GRANTED', validUntil: 1782954960, updatedAt: 1782864960 },
  ],
};

export function BlockchainRegistry({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [grant, setGrant] = useState({ did: '', resourceId: '', durationHours: 1 });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const load = () => erpApi.blockchainOverview(token).then((result) => {
    const overview = result?.identities?.length || result?.resources?.length || result?.assets?.length ? result : demoRegistry;
    setUsingDemoData(overview === demoRegistry);
    setData(overview);
    setGrant((current) => ({
      did: current.did || overview.identities[0]?.did || '',
      resourceId: current.resourceId || overview.resources[0]?.resourceId || '',
      durationHours: current.durationHours || 1,
    }));
  }).catch(() => { setUsingDemoData(true); setData(demoRegistry); setGrant((current) => ({ did: current.did || demoRegistry.identities[0].did, resourceId: current.resourceId || demoRegistry.resources[0].resourceId, durationHours: current.durationHours || 1 })); });

  useEffect(() => { load(); }, [token]);

  const rebuild = async () => {
    if (usingDemoData) { setMessage('Demo registry refreshed locally. No blockchain index was rebuilt.'); return; }
    setRebuilding(true); setError(''); setMessage('');
    try {
      const result = await erpApi.rebuildBlockchainIndex(token);
      setMessage(`${result.message} ${result.reconstructedCount} events confirmed through Block ${result.latestBlock}.`);
      await load();
    } catch (err) { setError(err.message); } finally { setRebuilding(false); }
  };

  const issueGrant = async (event) => {
    event.preventDefault(); if (usingDemoData) { setMessage('Demo policy action is unavailable: prototype records cannot create live access grants.'); return; } setSavingPolicy(true); setError(''); setMessage('');
    try {
      const result = await erpApi.grantBlockchainAccess(token, { ...grant, durationHours: Number(grant.durationHours) });
      setMessage(`${result.message} Evidence confirmed at Block ${result.receipt.blockNumber}.`);
      await load();
      setData((current) => current ? { ...current, blockNumber: result.receipt.blockNumber } : current);
    } catch (err) { setError(err.message); } finally { setSavingPolicy(false); }
  };

  const revokeGrant = async () => {
    if (usingDemoData) { setMessage('Demo policy action is unavailable: prototype records cannot revoke live access.'); return; } setSavingPolicy(true); setError(''); setMessage('');
    try {
      const result = await erpApi.revokeBlockchainAccess(token, grant);
      setMessage(`${result.message} Evidence confirmed at Block ${result.receipt.blockNumber}.`);
      await load();
      setData((current) => current ? { ...current, blockNumber: result.receipt.blockNumber } : current);
    } catch (err) { setError(err.message); } finally { setSavingPolicy(false); }
  };

  if (!data) return <div className="erp-page"><p className="erp-empty">Reading verified registries from the local blockchain…</p></div>;

  return <div className="erp-page page-enter">
    <div className="erp-page-heading"><div><p className="erp-kicker">Administrator view · blockchain evidence</p><h1>Trust Registry</h1><p>A plain-language view of identities, custody, policy decisions, and audit evidence. Technical fingerprints remain protected by backend services.</p></div><div className="registry-actions"><span className="trust-pill verified">● Block {data.blockNumber} confirmed</span><button className="erp-secondary" disabled={rebuilding} onClick={rebuild}>{rebuilding ? 'Rebuilding evidence…' : 'Rebuild audit evidence'}</button></div></div>
    {usingDemoData && <p className="trust-notice"><strong>Demo registry:</strong> live blockchain summaries are unavailable, so this screen uses fictional protected references. Rebuilds and policy changes cannot alter any live system.</p>}{message && <p className="trust-notice success">✓ {message}</p>}{error && <p className="erp-error">{error}</p>}
    <section className="trust-journey compact"><article className="complete"><span>01</span><div><small>Identity</small><strong>{data.identities.length} verified identities</strong></div></article><article className="complete"><span>02</span><div><small>Policy</small><strong>{data.resources.length} protected resources</strong></div></article><article className="complete"><span>03</span><div><small>Custody</small><strong>{data.assets.length} unique asset records</strong></div></article><article className="complete"><span>04</span><div><small>Evidence</small><strong>{data.accessRecords.length} access decisions</strong></div></article></section>
    <section className="erp-panel access-form-card"><div><p className="erp-kicker">Contract-enforced least privilege</p><h2>Issue time-bound access</h2><p>Select a verified identity and resource. The backend applies the sensitivity limit, and the contract denies the grant automatically at expiry.</p></div><form className="erp-request-form" onSubmit={issueGrant}><label>Verified identity<select disabled={usingDemoData} value={grant.did} onChange={(event) => setGrant({ ...grant, did: event.target.value })}>{data.identities.map((item, index) => <option key={item.did} value={item.did}>{labelDid(item.did, index)} · {item.role}</option>)}</select></label><label>Protected resource<select disabled={usingDemoData} value={grant.resourceId} onChange={(event) => setGrant({ ...grant, resourceId: event.target.value })}>{data.resources.map((item) => <option key={item.resourceId} value={item.resourceId}>{item.resourceId} · {item.sensitivityLabel}</option>)}</select></label><label>Access duration (hours)<input disabled={usingDemoData} type="number" min="1" value={grant.durationHours} onChange={(event) => setGrant({ ...grant, durationHours: event.target.value })} required /></label><div className="access-expiry-note">Sensitivity policy sets the maximum duration. A revoke is an immediate explicit deny, even when a role policy might otherwise allow access.</div><button className="erp-primary" disabled={usingDemoData || savingPolicy || !grant.did || !grant.resourceId}>{savingPolicy ? 'Recording policy…' : 'Confirm time-bound access'}</button><button type="button" className="erp-secondary" disabled={usingDemoData || savingPolicy || !grant.did || !grant.resourceId} onClick={revokeGrant}>Revoke selected access</button></form></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Verified identities</h2><span>Wallet information is intentionally hidden</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Identity</th><th>Role</th><th>Registered</th><th>Verification</th></tr></thead><tbody>{data.identities.map((item, index) => <tr key={item.did}><td>{labelDid(item.did, index)}</td><td><span className="erp-status">{item.role}</span></td><td>{when(item.registeredAt)}</td><td>Identity registry confirmed</td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>NFT asset custody</h2><span>Each asset has one traceable ownership record</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Asset token</th><th>Custody identity</th><th>Status</th><th>Proof</th></tr></thead><tbody>{data.assets.map((item, index) => <tr key={item.assetId}><td>Asset #{item.assetId}</td><td>{labelDid(item.currentOwnerDid, index)}</td><td><span className="erp-status">{item.status}</span></td><td>ERC-721 ownership confirmed</td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Policy decision evidence</h2><span>Contract-enforced decision and access window</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Protected resource</th><th>Identity</th><th>Decision</th><th>Access window</th><th>Last recorded</th></tr></thead><tbody>{data.accessRecords.length ? data.accessRecords.map((item, index) => <tr key={`${item.did}-${item.resourceId}`}><td>{item.resourceId}</td><td>{labelDid(item.did, index)}</td><td><span className="erp-status">{accessState(item, data.chainTime)}</span></td><td>{accessWindow(item)}</td><td>{when(item.updatedAt)}</td></tr>) : <tr><td colSpan="5">No explicit access decisions have been recorded yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
