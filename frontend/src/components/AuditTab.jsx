import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { HashBadge, VerifyModal } from './VerifyModal';

const EVENT_TYPES = ['ALL', 'IdentityRegistered', 'RoleAssigned', 'ResourceCreated', 'AccessRequested', 'AccessGranted', 'AccessRevoked', 'AssetMinted', 'AssetTransferred', 'AssetRetired'];

function eventIcon(type) {
  const m = { IdentityRegistered:'🪪', RoleAssigned:'🎖', ResourceCreated:'🏗', AccessRequested:'🔔', AccessGranted:'✅', AccessRevoked:'🚫', AssetMinted:'⚙️', AssetTransferred:'🔄', AssetRetired:'📦' };
  return m[type] || '📋';
}

function eventColor(type) {
  if (type?.includes('Grant') || type?.includes('Minted') || type?.includes('Registered')) return 'var(--accent-emerald)';
  if (type?.includes('Request')) return 'var(--accent-amber)';
  if (type?.includes('Revok') || type?.includes('Retired')) return 'var(--accent-red)';
  return 'var(--accent-cyan)';
}

export function AuditTab({ activePersona }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState(null);
  const [filter, setFilter] = useState({ eventType: 'ALL', search: '' });
  const [verifyTx, setVerifyTx] = useState(null);
  const isAdmin = activePersona?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.eventType !== 'ALL') params.eventType = filter.eventType;
      if (filter.search) params.search = filter.search;
      const res = await api.getAuditEvents(params);
      setEvents(res.events || []);
      setTotal(res.total || 0);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const result = await api.rebuildIndex();
      setRebuildResult(result);
      load();
    } catch (err) {
      setRebuildResult({ success: false, message: err.message });
    }
    setRebuilding(false);
  };

  // For non-admins filter by their DID
  const displayEvents = isAdmin ? events : events.filter(e =>
    e.actor_did?.includes(activePersona?.did?.slice(-20)) ||
    JSON.stringify(e.details)?.includes(activePersona?.did?.slice(-20))
  );

  return (
    <div className="page">
      {verifyTx && <VerifyModal txHash={verifyTx} onClose={() => setVerifyTx(null)} />}

      <div className="page-header flex-between">
        <div>
          <div className="page-title">Immutable Audit Trail</div>
          <div className="page-subtitle">Tamper-evident on-chain event log — every entry is cryptographically anchored to a blockchain transaction</div>
        </div>
        {isAdmin && (
          <button
            className={`btn ${rebuilding ? 'btn-ghost' : 'btn-amber'}`}
            onClick={handleRebuild}
            disabled={rebuilding}
          >
            {rebuilding ? <><span className="spinner" /> Rebuilding…</> : '⛓ Rebuild Index From Chain'}
          </button>
        )}
      </div>

      {/* Rebuild result */}
      {rebuildResult && (
        <div className={`integrity-box ${rebuildResult.success ? 'pass' : 'fail'} mb-3`}>
          <span>{rebuildResult.success ? '✓' : '✗'}</span>
          <div>
            <div>{rebuildResult.message}</div>
            {rebuildResult.success && (
              <div className="text-xs" style={{ marginTop: 3, opacity: 0.8 }}>
                {rebuildResult.reconstructedCount} events reconstructed from block 0 → #{rebuildResult.latestBlock} in {rebuildResult.durationMs}ms
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid-3 mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Total Events', value: total, cls: 'cyan' },
          { label: 'Showing', value: displayEvents.length, cls: 'emerald' },
          { label: 'Event Types', value: EVENT_TYPES.length - 1, cls: 'purple' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Event Type</label>
            <select className="form-select" value={filter.eventType} onChange={e => setFilter(f => ({...f, eventType: e.target.value}))}>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label className="form-label">Search (DID, resource, tx hash…)</label>
            <input className="form-input" value={filter.search} onChange={e => setFilter(f => ({...f, search: e.target.value}))} placeholder="Search audit trail…" />
          </div>
        </div>
      </div>

      {/* Event table */}
      <div className="card">
        <div className="card-title">Blockchain Event Log</div>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : displayEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No audit events found</div>
            <div className="empty-desc">Events appear here as blockchain transactions are confirmed.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Actor DID</th>
                  <th>Target</th>
                  <th>Block</th>
                  <th>Timestamp</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{eventIcon(e.event_type)}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: eventColor(e.event_type) }}>
                          {e.event_type}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '0.68rem' }}>
                        {e.actor_did?.slice(0, 18)}…
                      </span>
                    </td>
                    <td className="text-xs text-muted">{e.target_id}</td>
                    <td><span className="mono" style={{ fontSize: '0.72rem' }}>#{e.block_number}</span></td>
                    <td className="text-xs text-muted">{new Date(e.timestamp * 1000).toLocaleString()}</td>
                    <td>
                      <button
                        className="hash-badge"
                        onClick={() => setVerifyTx(e.tx_hash)}
                        title="Click to verify this transaction on-chain"
                      >
                        {e.tx_hash?.slice(0, 8)}…{e.tx_hash?.slice(-6)}
                        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>⛓</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
