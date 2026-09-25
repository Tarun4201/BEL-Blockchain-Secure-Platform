import { useCallback, useEffect, useMemo, useState } from 'react';
import { erpApi } from '../api/client';

const formatDate = (value) => value ? new Date(value * 1000).toLocaleString() : '—';

function Marker({ assetId }) {
  const cells = useMemo(() => Array.from({ length: 81 }, (_, index) => ((Number(assetId) * 31 + index * 17 + index * index) % 7) < 3), [assetId]);
  return <div className="asset-marker" aria-label={`Verification marker for asset ${assetId}`}>{cells.map((filled, index) => <i key={index} className={filled ? 'filled' : ''} />)}</div>;
}

export function AssetPassport({ token, user }) {
  const [passports, setPassports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [custodians, setCustodians] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCustodian, setNewCustodian] = useState('');
  const [assuranceLevel, setAssuranceLevel] = useState('STANDARD');
  const [serviceReference, setServiceReference] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await erpApi.assetPassports(token);
      setPassports(result.passports || []);
      setSelectedId((current) => current || result.passports?.[0]?.assetId || null);
    } catch (err) { setError(err.message); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (user.roleKey === 'ERP_ADMIN') erpApi.assetPassportCustodians(token).then((result) => setCustodians(result.custodians || [])).catch(() => {});
  }, [token, user.roleKey]);

  const selected = passports.find((item) => item.assetId === selectedId) || passports[0];
  const verify = async () => {
    if (!selected) return;
    setBusy(true); setMessage(''); setError('');
    try { const result = await erpApi.verifyAssetPassport(token, selected.assetId); setMessage(result.message); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const transfer = async () => {
    if (!selected || !newCustodian) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await erpApi.transferAssetPassport(token, selected.assetId, newCustodian, assuranceLevel);
      setMessage(`${result.message} Recorded in Block ${result.blockNumber}.`);
      setNewCustodian(''); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const approveHighAssurance = async () => { setBusy(true); setError(''); try { const result = await erpApi.approveHighAssuranceTransfer(token, selected.assetId); setMessage(`${result.message} Recorded in Block ${result.blockNumber}.`); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const recordService = async () => { if (!serviceReference.trim()) return; setBusy(true); setError(''); try { const result = await erpApi.recordAssetService(token, selected.assetId, serviceReference); setMessage(`${result.message} Recorded in Block ${result.blockNumber}.`); setServiceReference(''); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };

  if (error && !passports.length) return <div className="erp-page"><p className="erp-error">{error}</p></div>;
  if (!selected) return <div className="erp-page"><p className="erp-empty">Loading verified asset passports…</p></div>;

  return <div className="erp-page page-enter">
    <div className="erp-page-heading"><div><p className="erp-kicker">Verified digital asset custody</p><h1>Asset Passport</h1><p>Confirm an asset’s authenticity, current custodian, and complete custody journey—without exposing protected document fingerprints.</p></div><span className="trust-pill verified">● Blockchain verified</span></div>
    <div className="passport-selector" role="tablist" aria-label="Asset passports">{passports.map((asset) => <button key={asset.assetId} role="tab" aria-selected={selected.assetId === asset.assetId} className={selected.assetId === asset.assetId ? 'active' : ''} onClick={() => { setSelectedId(asset.assetId); setMessage(''); setError(''); }}>{asset.title}<small>Asset #{asset.assetId} · {asset.status}</small></button>)}</div>
    <section className="asset-passport-card">
      <div className="passport-identity"><div className="passport-seal">BEL<br /><small>ASSET</small></div><div><p className="erp-kicker">Digital asset passport</p><h2>{selected.title}</h2><p>{selected.description}</p><div className="passport-tags"><span>{selected.category}</span><span>{selected.status}</span><span>ERC-721 custody record</span></div></div></div>
      <div className="passport-facts"><div><small>Current custodian</small><strong>{selected.custodian}</strong></div><div><small>Passport issued</small><strong>{formatDate(selected.mintedAt)}</strong></div><div><small>Integrity state</small><strong>Protected backend verification</strong></div></div>
      <div className="passport-verification"><Marker assetId={selected.assetId} /><div><h3>Field verification marker</h3><p>Use the authenticated portal to verify the asset record before accepting custody. Sensitive document data stays protected in backend services.</p><button className="erp-primary" disabled={busy} onClick={verify}>{busy ? 'Checking record…' : 'Verify asset record'}</button></div></div>
    </section>
    {message && <p className="trust-notice success">✓ {message}</p>}{error && <p className="erp-error">{error}</p>}
    {selected.pendingTransfer && <section className="trust-notice"><strong>High-assurance handover pending:</strong> {selected.pendingTransfer.custodian}. An independent security approver must confirm before custody changes.</section>}
    {user.roleKey === 'ASSET_CUSTODY_APPROVER' && selected.pendingTransfer && <section className="erp-panel passport-transfer"><div><p className="erp-kicker">Independent security approval</p><h2>Second-person custody check</h2><p>Confirm this high-assurance handover only after validating the operational need and receiving custodian.</p></div><button className="erp-primary" disabled={busy} onClick={approveHighAssurance}>{busy ? 'Confirming…' : 'Approve high-assurance handover'}</button></section>}
    {user.roleKey === 'ERP_ADMIN' && <section className="erp-panel passport-transfer"><div><p className="erp-kicker">Administrator action</p><h2>Approve custody handover</h2><p>Use standard custody for routine items, or high assurance for sensitive handovers that require an independent second approval.</p></div><div className="transfer-controls"><select value={newCustodian} onChange={(event) => setNewCustodian(event.target.value)}><option value="">Select verified custodian</option>{custodians.filter((item) => item.did !== selected.custodianDid).map((item) => <option key={item.did} value={item.did}>{item.label}</option>)}</select><select value={assuranceLevel} onChange={(event) => setAssuranceLevel(event.target.value)}><option value="STANDARD">Standard custody</option><option value="HIGH">High assurance · two approvals</option></select><button className="erp-primary" disabled={busy || !newCustodian} onClick={transfer}>{busy ? 'Confirming…' : assuranceLevel === 'HIGH' ? 'Request second approval' : 'Confirm custody handover'}</button></div></section>}
    {user.roleKey === 'ERP_ADMIN' && <section className="erp-panel passport-transfer"><div><p className="erp-kicker">Asset lifecycle</p><h2>Record maintenance evidence</h2><p>Record a non-sensitive service completion reference on-chain. The actual service document remains in protected systems.</p></div><div className="transfer-controls"><input value={serviceReference} placeholder="Service reference, e.g. SRV-2026-0042" onChange={(event) => setServiceReference(event.target.value)} /><button className="erp-secondary" disabled={busy || !serviceReference.trim()} onClick={recordService}>Record service</button></div></section>}
    <section className="erp-panel"><div className="erp-panel-title"><h2>Custody and lifecycle journey</h2><span>{selected.history.length + selected.services.length} verified event{selected.history.length + selected.services.length === 1 ? '' : 's'}</span></div><div className="passport-timeline">{[...selected.history, ...selected.services.map((service) => ({ action: 'Service lifecycle recorded', from: service.reference, to: 'Protected maintenance evidence', timestamp: service.timestamp }))].sort((a, b) => a.timestamp - b.timestamp).map((event, index) => <article key={`${event.timestamp}-${index}`}><span className="timeline-node">{index + 1}</span><div><strong>{event.action}</strong><p>{event.from} <b>→</b> {event.to}</p><small>{formatDate(event.timestamp)} · Smart-contract evidence available to authorised audit services</small></div></article>)}</div></section>
  </div>;
}
