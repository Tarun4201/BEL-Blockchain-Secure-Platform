import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { HashBadge } from './VerifyModal';

const ROLES = ['ADMIN', 'ENGINEER', 'TECHNICIAN', 'MANAGER'];

function roleBadge(role) {
  const cls = role?.toLowerCase();
  return <span className={`badge badge-${cls}`}>{role}</span>;
}

export function IdentityTab({ activePersona, txAction }) {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', department: '', designation: '', email: '', role: 'ENGINEER', walletAddress: '' });
  const [roleForm, setRoleForm] = useState({ did: '', newRole: 'ENGINEER' });
  const isAdmin = activePersona?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try { setIdentities(await api.getIdentities()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    await txAction('Register Identity', () => api.registerIdentity(form));
    setForm({ fullName: '', department: '', designation: '', email: '', role: 'ENGINEER', walletAddress: '' });
    load();
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    await txAction('Assign Role', () => api.assignRole(roleForm.did, roleForm.newRole));
    load();
  };

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <div className="page-title">Identity Registry</div>
          <div className="page-subtitle">Blockchain-anchored decentralized identities (DIDs) for BEL personnel</div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {identities.length} registered identity{identities.length !== 1 ? 'ies' : ''}
        </div>
      </div>

      <div className="grid-2 mb-3">
        {/* Register Form — admin only */}
        {isAdmin && (
          <div className="card">
            <div className="flex-between mb-2">
              <div className="card-title" style={{ marginBottom: 0 }}>Register New Employee</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.65rem', padding: '3px 8px' }}
                  onClick={() => setForm({
                    fullName: 'R. Sharma',
                    department: 'Radar & Phased Array Systems',
                    designation: 'Senior Systems Engineer',
                    email: 'r.sharma@bel.co.in',
                    role: 'ENGINEER',
                    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
                  })}
                >
                  Fill: R. Sharma
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.65rem', padding: '3px 8px' }}
                  onClick={() => setForm({
                    fullName: 'A. Verma',
                    department: 'Electronics Fabrication & Maintenance',
                    designation: 'Lead Hardware Specialist',
                    email: 'a.verma@bel.co.in',
                    role: 'TECHNICIAN',
                    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
                  })}
                >
                  Fill: A. Verma
                </button>
              </div>
            </div>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} placeholder="e.g. R. Sharma" required />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} placeholder="e.g. Radar Systems" required />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={form.designation} onChange={e => setForm(f => ({...f, designation: e.target.value}))} placeholder="Senior Engineer" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Wallet Address (DID Anchor)</label>
                <input className="form-input mono" value={form.walletAddress} onChange={e => setForm(f => ({...f, walletAddress: e.target.value}))} placeholder="0x..." required />
              </div>
              <button className="btn btn-primary w-full" type="submit">⛓ Register on Blockchain</button>
            </form>
          </div>
        )}

        {/* Assign Role Form — admin only */}
        {isAdmin && (
          <div className="card">
            <div className="card-title">Assign / Change Role</div>
            <form onSubmit={handleAssignRole}>
              <div className="form-group">
                <label className="form-label">Select Registered Person or Enter Target DID</label>
                {identities.length > 0 && (
                  <select
                    className="form-select mb-1"
                    onChange={e => { if (e.target.value) setRoleForm(f => ({ ...f, did: e.target.value })); }}
                  >
                    <option value="">-- Choose from registered personnel --</option>
                    {identities.map(i => (
                      <option key={i.did} value={i.did}>
                        {i.full_name} ({i.role}) — {i.did.slice(0, 18)}...
                      </option>
                    ))}
                  </select>
                )}
                <input className="form-input mono" value={roleForm.did} onChange={e => setRoleForm(f => ({...f, did: e.target.value}))} placeholder="did:bel:0x..." required />
              </div>
              <div className="form-group">
                <label className="form-label">New Role</label>
                <select className="form-select" value={roleForm.newRole} onChange={e => setRoleForm(f => ({...f, newRole: e.target.value}))}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn btn-primary w-full" type="submit">⛓ Assign Role On-Chain</button>
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div className="card-title mb-1">PRD Design Note</div>
              <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                Role (<code style={{color:'var(--accent-cyan)'}}>ENGINEER</code>, <code style={{color:'var(--accent-cyan)'}}>TECHNICIAN</code> etc.) is descriptive metadata only.
                It does <strong style={{color:'var(--accent-amber)'}}>not</strong> grant implicit access to any resource.
                All access decisions are based strictly on explicit on-chain grants via <code style={{color:'var(--accent-cyan)'}}>hasAccess(did, resourceId)</code>.
              </div>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title">My Identity</div>
            {(() => {
              const me = identities.find(i => i.did === activePersona?.did);
              if (!me) return <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-title">Identity not found on-chain</div></div>;
              return (
                <div>
                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    {[
                      ['Full Name', me.full_name],
                      ['Department', me.department],
                      ['Designation', me.designation],
                      ['Role', roleBadge(me.role)],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div className="form-label">Decentralized Identifier (DID)</div>
                    <div className="mono" style={{ color: 'var(--accent-cyan)', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 6 }}>{me.did}</div>
                  </div>
                  <div className="mt-2">
                    <div className="form-label">Blockchain Anchor Address</div>
                    <div className="mono" style={{ padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 6 }}>{me.wallet_address}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Identity Table */}
      <div className="card">
        <div className="card-title">BEL Personnel Directory (On-Chain Registry)</div>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : identities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🪪</div>
            <div className="empty-title">No identities registered yet</div>
            <div className="empty-desc">Admin can register the first BEL personnel identity above.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DID (Blockchain Anchor)</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {identities.map(id => (
                  <tr key={id.did}>
                    <td style={{ fontWeight: 600 }}>{id.full_name}</td>
                    <td><span className="mono" style={{ fontSize: '0.72rem' }}>{id.did.slice(0, 22)}…</span></td>
                    <td className="text-muted">{id.department}</td>
                    <td>{roleBadge(id.role)}</td>
                    <td className="text-xs text-muted">{new Date(id.created_at).toLocaleDateString()}</td>
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
