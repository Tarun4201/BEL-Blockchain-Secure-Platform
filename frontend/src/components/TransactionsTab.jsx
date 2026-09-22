import { useEffect, useState } from 'react';
import { api } from '../api/client';

const statusForEvent = (type) => type?.includes('Revoked') ? 'Reversed' : 'Verified';

function targetLabel(event) {
  const target = event?.target_id;
  if (target === '[object Object]') {
    if (event.event_type === 'ResourceCreated') return 'Protected resource';
    if (event.event_type === 'IdentityRegistered' || event.event_type === 'RoleAssigned') return 'Personnel identity';
    return 'Platform event';
  }
  if (typeof target === 'string' || typeof target === 'number') return String(target);
  if (target?.resourceId) return target.resourceId;
  if (target?.assetId !== undefined) return `Asset #${target.assetId}`;
  if (target && typeof target === 'object') {
    const value = Object.values(target).find((item) => typeof item === 'string' || typeof item === 'number');
    if (value !== undefined) return String(value);
  }
  return '—';
}

export function TransactionsTab() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.getAuditEvents({ limit: 100 }).then((result) => setEvents(result.events || [])).catch(() => {});
  }, []);

  return (
    <div className="workspace-page">
      <div className="workspace-intro compact-intro">
        <div><p className="section-kicker">Platform operations</p><h1>Confirmed activity</h1><p>Review confirmed platform operations. Transaction identifiers remain in the protected backend.</p></div>
      </div>
      <section className="enterprise-panel table-panel">
        <div className="panel-heading"><div><h2>Confirmed activity</h2><p>Operational status is shown without exposing cryptographic identifiers.</p></div><span className="subtle-label">{events.length} records</span></div>
        <div className="table-wrap enterprise-table-wrap">
          <table className="enterprise-table">
            <thead><tr><th>Operation</th><th>Target</th><th>Block</th><th>Timestamp</th><th>Status</th></tr></thead>
            <tbody>{events.map((event) => <tr key={`${event.id}-${event.event_type}`}>
              <td>{event.event_type}</td><td>{targetLabel(event)}</td><td>#{event.block_number}</td><td>{new Date(event.timestamp * 1000).toLocaleString()}</td><td><span className={`result-label ${statusForEvent(event.event_type).toLowerCase()}`}>{statusForEvent(event.event_type)}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
