import { useState, useEffect } from 'react';
import { api } from '../api/client';

function statusBadge(status) {
  const s = status?.toUpperCase();
  return <span className={`badge badge-${s === 'ACTIVE' ? 'active' : 'retired'}`}>{s}</span>;
}

export function AssetsTab({ activePersona, txAction }) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [mintForm, setMintForm] = useState({ title: '', description: '', category: 'DEFENSE_HARDWARE', initialOwnerDid: '', documentFilename: 'radar_unit_ru204_schematic.txt' });
  const [transferDid, setTransferDid] = useState('');
  const isAdmin = activePersona?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const [a, ids] = await Promise.all([api.getAssets(), api.getIdentities()]);
      setAssets(a);
      setIdentities(ids);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMint = async (e) => {
    e.preventDefault();
    await txAction('Mint Defense Asset', () => api.mintAsset(mintForm));
    setMintForm({ title: '', description: '', category: 'DEFENSE_HARDWARE', initialOwnerDid: '', documentFilename: 'radar_unit_ru204_schematic.txt' });
    load();
  };

  const handleTransfer = async (assetId) => {
    if (!transferDid) return;
    await txAction('Transfer Asset Custody', () => api.transferAsset(assetId, transferDid));
    setTransferDid('');
    load();
    if (selectedAsset?.asset_id === assetId) {
      const updated = await api.getAsset(assetId);
      setSelectedAsset(updated);
    }
  };

  const handleVerify = async (assetId) => {
    try {
      const r = await api.verifyAssetIntegrity(assetId);
      setIntegrityResult(r);
    } catch {}
  };

  const myAssets = assets.filter(a => a.current_owner_did === activePersona?.did);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Digital Asset Registry</div>
        <div className="page-subtitle">ERC-721 tokenised defense hardware with cryptographic custody tracking</div>
      </div>

      <div className="grid-2 mb-3">
        {isAdmin && (
          <div className="card">
            <div className="card-title">Mint New Defense Asset (NFT)</div>
            <form onSubmit={handleMint}>
              <div className="form-group">
                <label className="form-label">Asset Name</label>
                <input className="form-input" value={mintForm.title} onChange={e => setMintForm(f => ({...f, title: e.target.value}))} placeholder="Radar Unit RU-204" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={mintForm.description} onChange={e => setMintForm(f => ({...f, description: e.target.value}))} placeholder="AESA validation prototype..." />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Owner DID</label>
                <input className="form-input mono" value={mintForm.initialOwnerDid} onChange={e => setMintForm(f => ({...f, initialOwnerDid: e.target.value}))} placeholder="did:bel:0x..." required />
              </div>
              <div className="form-group">
                <label className="form-label">Protected Schematic</label>
                <select className="form-select" value={mintForm.documentFilename} onChange={e => setMintForm(f => ({...f, documentFilename: e.target.value}))}>
                  <option value="radar_unit_ru204_schematic.txt">RU-204 Hardware Schematic</option>
                  <option value="radar_bay_03_tech_spec.txt">Radar Bay 03 Tech Spec</option>
                  <option value="ew_lab_signal_protocol.txt">EW Lab Signal Protocol</option>
                </select>
              </div>
              <button className="btn btn-primary w-full" type="submit">⛓ Mint ERC-721 Token On-Chain</button>
            </form>
          </div>
        )}

        {/* My Assets card */}
        <div className="card">
          <div className="card-title">
            {isAdmin ? 'All Defense Assets' : `My Assets (${activePersona?.name})`}
          </div>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : (isAdmin ? assets : myAssets).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No assets {isAdmin ? 'minted' : 'assigned'} yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(isAdmin ? assets : myAssets).map(a => (
                <div
                  key={a.asset_id}
                  onClick={() => setSelectedAsset(a)}
                  style={{
                    background: selectedAsset?.asset_id === a.asset_id ? 'var(--accent-cyan-dim)' : 'var(--bg-input)',
                    border: `1px solid ${selectedAsset?.asset_id === a.asset_id ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    borderRadius: 8, padding: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.title}</div>
                      <div className="text-xs text-muted">Asset #{a.asset_id}</div>
                    </div>
                    {statusBadge(a.status)}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Owner: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{a.current_owner_did?.slice(0, 24)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Asset Detail + Custody Timeline */}
      {selectedAsset && (
        <div className="card">
          <div className="flex-between mb-3">
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedAsset.title}</div>
              <div className="text-xs text-muted">Token ID: #{selectedAsset.asset_id} · ERC-721</div>
            </div>
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-sm" onClick={() => handleVerify(selectedAsset.asset_id)}>🔎 Verify Schematic</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAsset(null)}>× Close</button>
            </div>
          </div>

          {integrityResult && (
            <div className={`integrity-box ${integrityResult.integrityVerified ? 'pass' : 'fail'} mb-3`}>
              <span>{integrityResult.integrityVerified ? '✓' : '✗'}</span>
              <span>{integrityResult.tamperEvidentVerdict}</span>
            </div>
          )}

          <div className="grid-2 mb-3" style={{ gap: '0.75rem' }}>
            {[
              ['Document integrity anchor', 'Protected in backend'],
              ['Current Owner DID', selectedAsset.current_owner_did || selectedAsset.currentOwnerDid],
              ['Status', selectedAsset.status],
              ['Minted At', selectedAsset.mintedAt ? new Date(selectedAsset.mintedAt * 1000).toLocaleString() : 'N/A'],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '0.75rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{val}</div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="mb-3">
              <div className="form-label">Transfer Custody to DID</div>
              <div className="flex gap-1">
                <input className="form-input mono" value={transferDid} onChange={e => setTransferDid(e.target.value)} placeholder="did:bel:0x..." style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => handleTransfer(selectedAsset.asset_id)}>⛓ Transfer On-Chain</button>
              </div>
            </div>
          )}

          {/* Ownership History Timeline */}
          <div>
            <div className="card-title mb-2">Custody Chain-of-Title (On-Chain History)</div>
            {(selectedAsset.history || []).length === 0 ? (
              <div className="empty-state"><div className="empty-desc">No history available yet</div></div>
            ) : (
              <div className="timeline">
                {[...(selectedAsset.history || [])].reverse().map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-time">{new Date(h.timestamp * 1000).toLocaleString()}</div>
                      <div className="timeline-event">
                        {h.fromDid === 'ORIGIN_MINTER' ? '🏭 Asset Created & Assigned' : '🔄 Custody Transfer'}
                      </div>
                      <div className="timeline-meta">
                        {h.fromDid !== 'ORIGIN_MINTER' && <span className="text-muted">From: <span className="mono">{h.fromDid?.slice(0,22)}…</span> → </span>}
                        <span className="text-cyan">To: <span className="mono">{h.toDid?.slice(0,22)}…</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
