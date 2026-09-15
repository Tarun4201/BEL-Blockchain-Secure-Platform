import { useState } from 'react';
import { api } from '../api/client';

export function VerifyModal({ txHash, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTx = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getTx(txHash);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) fetchTx();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⛓ Verify On-Chain Transaction</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="mb-2">
            <div className="card-title">Transaction Hash</div>
            <div className="mono" style={{ wordBreak: 'break-all', color: 'var(--accent-cyan)' }}>
              {txHash}
            </div>
          </div>

          {loading && (
            <div className="flex-center" style={{ padding: '2rem' }}>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <span className="text-muted ml-2" style={{ marginLeft: 8 }}>Querying blockchain node...</span>
            </div>
          )}

          {error && (
            <div className="access-gate denied">
              <div className="access-gate-title text-danger">Query Failed</div>
              <div className="access-gate-desc">{error}</div>
            </div>
          )}

          {data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="integrity-box pass">
                <span>✓</span>
                <span>{data.status}</span>
              </div>

              <div className="grid-2" style={{ gap: '0.75rem' }}>
                {[
                  ['Block Number', data.blockNumber],
                  ['Gas Used', data.gasUsed],
                  ['From', data.from?.slice(0,20) + '...'],
                  ['Logs Count', data.logsCount],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="card-title mb-1">Raw JSON-RPC Response</div>
                <div className="code-block">{JSON.stringify(data, null, 2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HashBadge({ hash, label }) {
  const [showModal, setShowModal] = useState(false);
  if (!hash) return <span className="text-muted text-xs">—</span>;

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
  };

  return (
    <>
      <span className="hash-badge" onClick={() => setShowModal(true)} title="Click to verify on-chain">
        {label || (hash.slice(0, 8) + '…' + hash.slice(-6))}
        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>⛓</span>
      </span>
      {showModal && <VerifyModal txHash={hash} onClose={() => setShowModal(false)} />}
    </>
  );
}
