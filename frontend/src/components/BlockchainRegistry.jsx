import { useEffect, useState } from 'react';
import { erpApi } from '../api/client';

const when = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
const labelDid = (did, index) => `Verified identity ${String(index + 1).padStart(2, '0')} · ${String(did).slice(-8).toUpperCase()}`;

export function BlockchainRegistry({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const load = () => erpApi.blockchainOverview(token).then(setData).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [token]);

  const rebuild = async () => {
    setRebuilding(true); setError(''); setMessage('');
    try {
      const result = await erpApi.rebuildBlockchainIndex(token);
      setMessage(`${result.message} ${result.reconstructedCount} events confirmed through Block ${result.latestBlock}.`);
      await load();
    } catch (err) { setError(err.message); } finally { setRebuilding(false); }
  };

  if (error && !data) return <div className="erp-page"><p className="erp-error">{error}</p></div>;
  if (!data) return <div className="erp-page"><p className="erp-empty">Reading verified registries from the local blockchain…</p></div>;

  return <div className="erp-page page-enter">
    <div className="erp-page-heading"><div><p className="erp-kicker">Administrator view · blockchain evidence</p><h1>Trust Registry</h1><p>A plain-language view of identities, custody, policy decisions, and audit evidence. Technical fingerprints remain protected by backend services.</p></div><div className="registry-actions"><span className="trust-pill verified">● Block {data.blockNumber} confirmed</span><button className="erp-secondary" disabled={rebuilding} onClick={rebuild}>{rebuilding ? 'Rebuilding evidence…' : 'Rebuild audit evidence'}</button></div></div>
    {message && <p className="trust-notice success">✓ {message}</p>}{error && <p className="erp-error">{error}</p>}
    <section className="trust-journey compact"><article className="complete"><span>01</span><div><small>Identity</small><strong>{data.identities.length} verified identities</strong></div></article><article className="complete"><span>02</span><div><small>Policy</small><strong>{data.resources.length} protected resources</strong></div></article><article className="complete"><span>03</span><div><small>Custody</small><strong>{data.assets.length} unique asset records</strong></div></article><article className="complete"><span>04</span><div><small>Evidence</small><strong>{data.accessRecords.length} access decisions</strong></div></article></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Verified identities</h2><span>Wallet information is intentionally hidden</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Identity</th><th>Role</th><th>Registered</th><th>Verification</th></tr></thead><tbody>{data.identities.map((item, index) => <tr key={item.did}><td>{labelDid(item.did, index)}</td><td><span className="erp-status">{item.role}</span></td><td>{when(item.registeredAt)}</td><td>Identity registry confirmed</td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>NFT asset custody</h2><span>Each asset has one traceable ownership record</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Asset token</th><th>Custody identity</th><th>Status</th><th>Proof</th></tr></thead><tbody>{data.assets.map((item, index) => <tr key={item.assetId}><td>Asset #{item.assetId}</td><td>{labelDid(item.currentOwnerDid, index)}</td><td><span className="erp-status">{item.status}</span></td><td>ERC-721 ownership confirmed</td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Policy decision evidence</h2><span>Smart-contract access state</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Protected resource</th><th>Identity</th><th>Decision</th><th>Last recorded</th></tr></thead><tbody>{data.accessRecords.length ? data.accessRecords.map((item, index) => <tr key={`${item.did}-${item.resourceId}`}><td>{item.resourceId}</td><td>{labelDid(item.did, index)}</td><td><span className="erp-status">{item.status}</span></td><td>{when(item.updatedAt)}</td></tr>) : <tr><td colSpan="4">No explicit access decisions have been recorded yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
