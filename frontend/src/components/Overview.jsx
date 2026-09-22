import { useEffect, useState } from 'react';
import { api } from '../api/client';

const eventLabels = {
  IdentityRegistered: 'Identity verified',
  RoleAssigned: 'Role assignment updated',
  ResourceCreated: 'Protected resource registered',
  AccessRequested: 'Access request submitted',
  AccessGranted: 'Access policy approved',
  AccessRevoked: 'Access permission revoked',
  AssetMinted: 'Digital asset registered',
  AssetTransferred: 'Asset custody transferred',
};

function timestamp(value) {
  if (!value) return 'Just now';
  return new Date(value * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

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
  return 'Platform event';
}

export function Overview({ activePersona }) {
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [platformStatus, audit] = await Promise.all([api.getStatus(), api.getAuditEvents({ limit: 6 })]);
        setStatus(platformStatus);
        setEvents(audit.events || []);
      } catch {}
    };
    load();
  }, []);

  const counts = status?.counts || {};
  const isAdmin = activePersona?.role === 'ADMIN';
  const profileCopy = activePersona?.role === 'TECHNICIAN'
    ? 'Review your assigned assets, protected-resource permissions, and recorded custody activity.'
    : activePersona?.role === 'ENGINEER'
      ? 'Request and review access to protected engineering resources from your personal workspace.'
      : 'Monitor identity assurance, controlled access, and digital-asset custody from one workspace.';
  const metrics = isAdmin
    ? [
        ['Identities', counts.identities ?? '—', 'Registered personnel'],
        ['Protected resources', counts.resources ?? '—', 'Active resource anchors'],
        ['Digital assets', counts.assets ?? '—', 'Tracked custody records'],
        ['Audited events', counts.auditEvents ?? '—', 'Indexed chain events'],
      ]
    : [
        ['Identity profile', 'Verified', 'Your active BEL identity'],
        ['Resource access', 'Controlled', 'Explicit approval is required'],
        ['Asset view', 'Assigned', 'Custody records available to you'],
        ['Activity scope', 'Personal', 'Only your relevant activity'],
      ];
  const visibleEvents = isAdmin ? events : events.filter((event) => (
    event.actor_did?.includes(activePersona?.did?.slice(-20)) ||
    JSON.stringify(event.details)?.includes(activePersona?.did?.slice(-20))
  ));
  const assurance = isAdmin
    ? [
        ['Identity registry', 'Connected'],
        ['Audit index', `${counts.auditEvents ?? 0} events`],
        ['Blockchain network', status?.isNodeConnected ? 'Verified' : 'Offline'],
      ]
    : [
        ['Identity profile', 'Active'],
        ['Audit visibility', 'Personal events only'],
        ['Blockchain network', status?.isNodeConnected ? 'Verified' : 'Offline'],
      ];

  return (
    <div className="workspace-page overview-page">
      <div className="workspace-intro">
        <div>
          <p className="section-kicker">Operations overview</p>
          <h1>Good morning, {activePersona?.name?.replace(' (Security Officer)', '') || 'Operator'}.</h1>
          <p>{profileCopy}</p>
        </div>
        <div className="network-summary">
          <span className={`network-indicator ${status?.isNodeConnected ? 'online' : ''}`} />
          <div><strong>{status?.isNodeConnected ? 'Network verified' : 'Network unavailable'}</strong><small>{status?.isNodeConnected ? `Hardhat local · Block #${status.currentBlockNumber}` : 'Reconnect the local node to continue'}</small></div>
        </div>
      </div>

      <section className="metric-grid" aria-label="Platform metrics">
        {metrics.map(([label, value, description]) => (
          <article className="metric-item" key={label}>
            <p>{label}</p><strong>{value}</strong><small>{description}</small>
          </article>
        ))}
      </section>

      <section className="overview-grid">
        <article className="enterprise-panel activity-panel">
          <div className="panel-heading"><div><p className="section-kicker">Verification ledger</p><h2>Recent activity</h2></div><span className="subtle-label">Latest chain events</span></div>
          {visibleEvents.length ? (
            <div className="activity-list">
              {visibleEvents.map((event) => (
                <div className="activity-row" key={`${event.id}-${event.event_type}`}>
                  <span className="activity-marker" />
                  <div><strong>{eventLabels[event.event_type] || event.event_type}</strong><small>{targetLabel(event)} · {timestamp(event.timestamp)}</small></div>
                  <span className="activity-result">Verified</span>
                </div>
              ))}
            </div>
          ) : <div className="enterprise-empty">No activity relevant to this workspace is available yet.</div>}
        </article>

        <article className="enterprise-panel assurance-panel">
            <div className="panel-heading"><div><p className="section-kicker">Security posture</p><h2>{isAdmin ? 'System assurance' : 'My workspace assurance'}</h2></div></div>
            <div className="assurance-list">
              {assurance.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          <p className="assurance-note">{isAdmin ? 'The workspace presents operational records from the local backend and blockchain event index.' : 'This workspace limits the visible operational context to your assigned scope.'}</p>
        </article>
      </section>
    </div>
  );
}
