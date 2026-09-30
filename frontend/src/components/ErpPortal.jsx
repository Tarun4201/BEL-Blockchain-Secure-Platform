import { useCallback, useEffect, useState } from 'react';
import { erpApi } from '../api/client';
import { AssetPassport } from './AssetPassport';
import { BlockchainRegistry } from './BlockchainRegistry';
import { CommonWorkspace } from './CommonWorkspace';
import { ErpGuide } from './ErpGuide';
import { IdentityAssertion, JudgeDemo, SecuritySignals } from './TrustTools';
import './LoginVerification.css';

const accountLabels = { EMPLOYEE: 'Employee Login', VENDOR: 'Vendor Login', CUSTOMER: 'Customer Login', ERP_ADMIN: 'ERP Admin Login' };
const OPERATIONS_FOLDER_MODULES = ['procurement', 'finance', 'inventory', 'production', 'quality', 'engineering', 'logistics'];
const formatDate = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
const humanize = (value) => value?.replaceAll('_', ' ') || '—';
const MODULE_ICONS = { dashboard: 'dashboard', identity: 'identity', 'identity-assertion': 'identity', procurement: 'cart', vendors: 'factory', finance: 'wallet', inventory: 'box', production: 'factory', quality: 'checklist', engineering: 'wrench', projects: 'network', logistics: 'truck', hr: 'users', compliance: 'shield-alert', 'access-control': 'key', 'access-requests': 'key', permissions: 'lock', 'temporary-access': 'clock', verification: 'identity', 'digital-assets': 'box', 'asset-passport': 'book', 'asset-passport-common': 'book', 'security-signals': 'shield-alert', 'security-insights': 'shield-alert', 'demo-simulator': 'play', organization: 'building', users: 'users', audit: 'audit', 'audit-common': 'audit', reports: 'chart', notifications: 'bell', blockchain: 'blocks', 'blockchain-activity': 'blocks', architecture: 'network', 'architecture-common': 'network', profile: 'user', settings: 'settings', 'vendor-records': 'cart', 'customer-records': 'truck' };
const COMMON_WORKSPACE_MODULES = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'identity', label: 'Identity' },
  { id: 'users', label: 'Users & Roles' },
  { id: 'digital-assets', label: 'Digital Assets' },
  { id: 'asset-passport-common', label: 'Asset Passport' },
  { id: 'access-requests', label: 'Access Requests' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'temporary-access', label: 'Temporary Access' },
  { id: 'verification', label: 'Verification' },
  { id: 'audit-common', label: 'Audit Trail' },
  { id: 'blockchain-activity', label: 'Blockchain Activity' },
  { id: 'security-insights', label: 'Security Insights' },
  { id: 'architecture-common', label: 'Architecture' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
];

function Icon({ name, className = '' }) {
  const shapes = {
    search: <><circle cx="11" cy="11" r="5.5" /><path d="m16 16 4 4" /></>, bell: <><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M9.75 22h4.5" /></>, user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>, logout: <><path d="M10 4H5v16h5" /><path d="m14 8 4 4-4 4M18 12H9" /></>, settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3v-.1A1.7 1.7 0 0 0 10.7 18.6a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.06 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-3h.1A1.7 1.7 0 0 0 7.06 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>, identity: <><path d="M12 3 19 6.5v5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5v-5L12 3Z" /><path d="m9 12 2 2 4-4" /></>, cart: <><path d="M3 4h2l2.1 10h10.7l2-7H7" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>, wallet: <><path d="M4 7a3 3 0 0 1 3-3h11a2 2 0 0 1 2 2v2H7a3 3 0 0 0 0 6h13v4a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V7Z" /><path d="M17 11h3" /></>, box: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></>, factory: <><path d="M3 21V10l6 3V8l6 3V5h3l3 3v13H3Z" /><path d="M8 21v-4h3v4M7 6h.01M11 5h.01" /></>, checklist: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM8 12l1.5 1.5L12 10M8 17l1.5 1.5L12 15M14 12h2M14 17h2" /></>, wrench: <><path d="M14 6a4 4 0 0 0-5 5L4 16l4 4 5-5a4 4 0 0 0 5-5l-3 3-3-3 2-4Z" /></>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>, key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l2 2M14 9l2 2" /></>, book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22V5.5Z" /><path d="m15 12 1.4 1.4L19 10.8" /></>, 'shield-alert': <><path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M12 8v4M12 16h.01" /></>, play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>, building: <><path d="M4 21V5l8-3 8 3v16M8 21v-4h2v4m4 0v-4h2v4M8 8h2m4 0h2m-8 4h2m4 0h2" /></>, users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5a3 3 0 0 1 0 6M17 14a4.5 4.5 0 0 1 3.5 4.4" /></>, audit: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 12h6M10 16h6M10 8h2" /></>, chart: <><path d="M4 20V4M4 20h17" /><path d="m7 16 4-5 3 2 5-7" /></>, blocks: <><path d="m12 3 5 3v6l-5 3-5-3V6l5-3ZM7 12l5 3v6l-5-3v-6ZM17 12l-5 3v6l5-3v-6Z" /></>, network: <><circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="m7 11 10-5M7 13l10 5" /></>, folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>, clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>, lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>, activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  };
  return <svg className={`erp-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name] || shapes.dashboard}</svg>;
}

const LOGIN_VERIFICATION_STEPS = [
  ['lock', 'Secure credential handshake', 'Protected sign-in request accepted'],
  ['identity', 'Identity registry confirmed', 'Minimum required identity claims verified'],
  ['blocks', 'Blockchain evidence confirmed', 'Role policy proof recorded successfully'],
  ['dashboard', 'Workspace ready', 'Authorised portal is opening'],
];

function LoginVerification({ selectedUser, stage }) {
  const activeStep = Math.min(stage, LOGIN_VERIFICATION_STEPS.length - 1);
  return <div className="login-verification-overlay" role="status" aria-live="polite" aria-label="Verifying secure login">
    <section className="login-verification-card">
      <div className="verification-network" aria-hidden="true">
        <span className="verification-node node-user"><Icon name="user" /></span><i /><span className="verification-node node-registry"><Icon name="identity" /></span><i /><span className="verification-node node-ledger"><Icon name="blocks" /></span>
      </div>
      <p className="erp-kicker">TrustGrid verification</p>
      <h2>Preparing your secure workspace</h2>
      <p className="verification-profile"><b>{selectedUser?.fullName || 'Authorised profile'}</b><span>{selectedUser?.role || 'Role policy'} · Protected credentials</span></p>
      <ol className="login-verification-steps">{LOGIN_VERIFICATION_STEPS.map(([icon, title, detail], index) => <li key={title} className={index < activeStep ? 'complete' : index === activeStep ? 'active' : ''}><span><Icon name={index < activeStep ? 'identity' : icon} /></span><div><strong>{title}</strong><small>{index <= activeStep ? detail : 'Waiting for the prior secure check'}</small></div><em>{index < activeStep ? 'Verified' : index === activeStep ? 'Checking' : 'Queued'}</em></li>)}</ol>
      <div className="verification-progress" aria-hidden="true"><i style={{ width: `${((activeStep + 1) / LOGIN_VERIFICATION_STEPS.length) * 100}%` }} /></div>
      <p className="verification-privacy-note">No wallet address, DID, or transaction hash is exposed in this portal.</p>
    </section>
  </div>;
}

function Login({ bootstrap, onLogin }) {
  const [accountType, setAccountType] = useState('EMPLOYEE');
  const [form, setForm] = useState({ identifier: 'BEL-EMP-1001', password: '123', unitId: 'BENGALURU', departmentId: 'PROCUREMENT', sbuId: 'BENGALURU_SOFTWARE' });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('BEL-EMP-1001');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationStage, setVerificationStage] = useState(-1);
  const sbus = bootstrap.sbus.filter((sbu) => sbu.unitId === form.unitId);
  const demoUsers = bootstrap.demoUsers.filter((user) => accountType === 'ERP_ADMIN' ? user.employeeId === 'BEL-EMP-1010' : user.accountType === accountType);
  const selectDemo = (user) => { setSelectedEmployeeId(user.employeeId); setForm({ identifier: user.employeeId, password: '123', unitId: user.unitId, departmentId: user.departmentId, sbuId: user.sbuId }); setError(''); };
  const changeAccountType = (nextAccountType) => { setAccountType(nextAccountType); const nextUser = bootstrap.demoUsers.find((user) => nextAccountType === 'ERP_ADMIN' ? user.employeeId === 'BEL-EMP-1010' : user.accountType === nextAccountType); if (nextUser) selectDemo(nextUser); };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const pause = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
    try {
      setVerificationStage(0);
      await pause(1250);
      setVerificationStage(1);
      await pause(1450);
      setVerificationStage(2);
      await pause(1450);
      setVerificationStage(3);
      await pause(1100);
      await onLogin({ ...form, accountType: accountType === 'ERP_ADMIN' ? 'EMPLOYEE' : accountType });
    } catch (err) {
      setError(err.message);
      setVerificationStage(-1);
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="erp-login login-landing">
    <section className="erp-login-brand login-story" aria-label="BEL TrustGrid introduction">
      <div className="login-brand-lockup">
        <img className="login-brand-logo" src="/bel-trustgrid-logo.png" alt="BEL TrustGrid — Blockchain Secure Platform" />
      </div>
      <div className="login-story-copy">
        <p className="erp-kicker">Secure enterprise platform</p>
        <h1>Unified identity,<br /><em>access &amp; asset</em><br />trust layer</h1>
        <p>One controlled workspace for verified identities, purpose-based access, and traceable digital asset custody across BEL operations.</p>
      </div>
      <div className="login-capability-grid" aria-label="TrustGrid capabilities">
        <article><span aria-hidden="true">◇</span><strong>Verified identity</strong><small>DID registry</small></article>
        <article><span aria-hidden="true">⌁</span><strong>Time-bound access</strong><small>Policy enforced</small></article>
        <article><span aria-hidden="true">◈</span><strong>Traceable custody</strong><small>On-chain evidence</small></article>
      </div>
      <p className="login-demo-notice">DEMO ENVIRONMENT · FICTIONAL DATA ONLY</p>
    </section>
    <section className="erp-login-panel login-access-panel">
      <div className="erp-login-inner login-enter">
        <div className="login-panel-heading"><p className="erp-kicker">Secure enterprise access</p><h2>Choose your authorised profile</h2><p className="login-intent">Select a demo role, review the assigned workspace, then validate the credentials below.</p></div>
        <div className="erp-account-tabs login-role-tabs" role="tablist" aria-label="Account type">{Object.entries(accountLabels).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={accountType === id} className={accountType === id ? 'active' : ''} onClick={() => changeAccountType(id)}>{label.replace(' Login', '')}</button>)}</div>
        <div className="erp-demo-picker login-profile-picker"><div className="login-picker-title"><strong>Available demo profiles</strong><small>Click a profile to auto-fill its authorised assignment.</small></div><div className="login-profile-list">{demoUsers.map((user) => <button key={user.employeeId} type="button" className={selectedEmployeeId === user.employeeId ? 'selected' : ''} onClick={() => selectDemo(user)}><span className="login-profile-initial">{user.fullName.charAt(0)}</span><span><b>{user.fullName}</b><small>{user.role} · {user.department}</small></span><em>{user.roleKey === 'ERP_ADMIN' ? 'Admin' : user.accountType === 'VENDOR' ? 'Vendor' : user.accountType === 'CUSTOMER' ? 'Customer' : 'Employee'}</em><i aria-hidden="true">›</i></button>)}</div></div>
        <form onSubmit={submit} className="erp-login-form login-credential-form"><div className="login-form-heading"><strong>Credentials and workspace</strong><small>Demo password: <b>123</b></small></div><div className="login-form-grid"><label>Employee ID / Official Email<input value={form.identifier} onChange={(e) => { setSelectedEmployeeId(''); setForm({ ...form, identifier: e.target.value }); }} required /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><label>BEL Unit / Location<select value={form.unitId} onChange={(e) => { const unitId = e.target.value; setForm({ ...form, unitId, sbuId: bootstrap.sbus.find((s) => s.unitId === unitId)?.id || '' }); }}><option value="">Select a unit</option>{bootstrap.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>Department / Function<select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select a department</option>{bootstrap.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="login-form-wide">SBU / Business Area<select value={form.sbuId} onChange={(e) => setForm({ ...form, sbuId: e.target.value })}><option value="">Select an SBU</option>{sbus.map((sbu) => <option key={sbu.id} value={sbu.id}>{sbu.name}</option>)}</select></label></div>{error && <p className="erp-error">{error}</p>}<button className="erp-primary login-submit" disabled={submitting}>{submitting ? 'Validating access…' : 'Validate and sign in'} <span aria-hidden="true">→</span></button></form>
        <p className="erp-login-note">Profile and workspace selections are checked against the backend assignment before access is granted.</p>
      </div>
    </section>
    {verificationStage >= 0 && <LoginVerification selectedUser={demoUsers.find((user) => user.employeeId === selectedEmployeeId)} stage={verificationStage} />}
  </main>;
}

function ProfileHeader({ user, modules, openSignals, onLogout, onNavigate }) {
  const [query, setQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const results = modules.filter((module) => module.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5);
  const openResult = (module) => { onNavigate(module.id); setQuery(''); };
  const search = (event) => { event.preventDefault(); if (results[0]) openResult(results[0]); };
  const openProfile = () => { setProfileMenuOpen(false); onNavigate('profile'); };
  const openSettings = () => { setProfileMenuOpen(false); onNavigate('settings'); };
  return <header className="erp-topbar"><form className="erp-global-search" onSubmit={search}><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search authorised tools…" aria-label="Search authorised tools" />{query && <div className="erp-search-results">{results.length ? results.map((module) => <button type="button" key={module.id} onClick={() => openResult(module)}><Icon name={MODULE_ICONS[module.id]} />{module.label}</button>) : <small>No authorised tool found</small>}</div>}</form><div className="erp-topbar-brand"><img className="erp-topbar-logo" src="/bel-trustgrid-logo.png" alt="BEL TrustGrid" /></div><div className="erp-topbar-actions"><span className="erp-role-pill">{user.roleKey === 'ERP_ADMIN' ? 'Admin' : user.role}</span><button className="erp-alert-button" type="button" onClick={() => onNavigate('security-signals')} aria-label="Open security signals"><Icon name="bell" />{openSignals ? <b>{openSignals}</b> : null}</button><div className="erp-profile-menu-wrap"><button className="erp-profile-trigger" type="button" onClick={() => setProfileMenuOpen(!profileMenuOpen)} aria-expanded={profileMenuOpen} aria-haspopup="menu"><span className="erp-profile-avatar">{user.fullName.charAt(0)}</span><span className="erp-profile-trigger-copy"><b>{user.fullName.split(' ')[0]}</b></span><i aria-hidden="true">⌄</i></button>{profileMenuOpen && <div className="erp-profile-popover" role="menu" aria-label="Profile menu"><div className="erp-profile-popover-heading"><strong>{user.fullName}</strong><small>{user.employeeId}</small></div><button type="button" role="menuitem" onClick={openProfile}><Icon name="user" />Profile</button><button type="button" role="menuitem" onClick={openSettings}><Icon name="settings" />Settings</button><button className="signout" type="button" role="menuitem" onClick={onLogout}><Icon name="logout" />Sign out</button></div>}</div></div></header>;
}

function TrustJourney({ trustJourney, onNavigate }) {
  return <section className="trust-journey"><article className="complete"><span>01</span><div><small>Identity</small><strong>{trustJourney.identity}</strong></div></article><article className="complete"><span>02</span><div><small>Policy</small><strong>{trustJourney.policy}</strong></div></article><article className="active"><span>03</span><div><small>Access</small><strong>{trustJourney.access}</strong></div></article><article className="complete"><span>04</span><div><small>Evidence</small><strong>{trustJourney.audit}</strong></div></article><button className="trust-journey-action" onClick={() => onNavigate('access-control')}>Manage access <b>→</b></button></section>;
}

function ControlRoom({ admin, onNavigate }) {
  const activity = [32, 48, 39, 66, 54, 78, 61, 44, 72, 88, 57, 82];
  return <section className="erp-panel control-room" aria-label="TrustGrid control room">
    <div className="erp-panel-title"><div><p className="erp-kicker">Live operational picture</p><h2>TrustGrid control room</h2></div><span className="control-room-live"><i /> Live</span></div>
    <div className="control-room-grid"><div className="control-room-chart"><div className="control-room-chart-label"><span>Authorised activity</span><small>12-hour protected-event trend</small></div><div className="control-room-bars" aria-label="Twelve-hour activity chart">{activity.map((height, index) => <i key={index} style={{ height: `${height}%`, '--delay': `${index * 65}ms` }} />)}</div><div className="control-room-axis"><span>08:00</span><span>12:00</span><span>16:00</span><span>Now</span></div></div><div className="control-room-actions"><button type="button" onClick={() => onNavigate('identity-assertion')}><Icon name="identity" /><span><b>Verification centre</b><small>Run a protected identity or policy check</small></span><em>→</em></button><button type="button" onClick={() => onNavigate('access-control')}><Icon name="key" /><span><b>Approval queue</b><small>{admin.pendingRequests} request{admin.pendingRequests === 1 ? '' : 's'} awaiting action</small></span><em>→</em></button><button type="button" onClick={() => onNavigate('blockchain')}><Icon name="blocks" /><span><b>Ledger status</b><small>Evidence is {admin.available ? 'synchronised' : 'awaiting a local node'}</small></span><em>→</em></button></div></div>
    <div className="admin-project-portfolio"><div className="erp-panel-title"><div><p className="erp-kicker">Complete administrator view</p><h2>Project portfolio</h2></div><span>{admin.projectPortfolio?.length || 0} projects</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Project</th><th>Department / lead</th><th>Phase</th><th>Status</th><th>Progress</th></tr></thead><tbody>{(admin.projectPortfolio || []).map((project) => <tr key={project.projectCode}><td><strong>{project.name}</strong><small className="table-subtle">{project.projectCode}</small></td><td>{project.department}<small className="table-subtle">Lead: {project.leadName} · {project.assignedCount} assigned</small></td><td>{project.phase}</td><td><span className={`erp-status ${project.status.toLowerCase().replace(/\s+/g, '-')}`}>{project.status}</span></td><td>{project.progress}%</td></tr>)}</tbody></table></div></div>
  </section>;
}

function Overview({ dashboard, user, onNavigate }) {
  const roleMessage = user.roleKey === 'ERP_ADMIN' ? 'Approve policy decisions and protect the trust registry.' : user.roleKey === 'INTERNAL_AUDITOR' ? 'Review read-only security evidence across authorised activities.' : 'Use only the workspace and records that your role has been authorised to access.';
  const admin = user.roleKey === 'ERP_ADMIN' ? dashboard.adminSnapshot : null;
  const commandCards = admin ? [
    ['Verified identities', admin.verifiedIdentities, 'Identity Registry', 'blockchain'],
    ['Active permissions', admin.activePermissions, 'Policy decision evidence', 'blockchain'],
    ['Registered assets', admin.registeredAssets, 'Asset custody passports', 'asset-passport'],
    ['Pending requests', admin.pendingRequests, 'Requires a decision', 'access-control'],
    ['Time-bound grants', admin.timeBoundPermissions, `${admin.expiringSoon} expiring within 24 hours`, 'blockchain'],
    ['Security signals', admin.openSignals, admin.openSignals ? 'Review required' : 'No open signals', 'security-signals'],
  ] : [];
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">{admin ? 'Administrator command centre' : 'Your secure workspace'}</p><h1>{admin ? 'System Overview' : `Good day, ${user.fullName.split(' ')[0]}`}</h1><p>{roleMessage}</p></div><span className={`trust-pill ${admin?.available === false ? '' : 'verified'}`}>● {admin?.available === false ? 'Chain offline' : 'Identity verified'}</span></div>{admin ? <><section className="admin-command-grid" data-tour="dashboard-overview">{commandCards.map(([label, value, detail, module], index) => <button className="admin-command-card stat-reveal" style={{ '--delay': `${index * 55}ms` }} key={label} onClick={() => onNavigate(module)}><span>{label}</span><strong>{value}</strong><small>{detail} <b>→</b></small></button>)}</section><section className="admin-overview-layout"><article className="erp-panel admin-activity"><div className="erp-panel-title"><div><p className="erp-kicker">Live evidence feed</p><h2>Recent important events</h2></div><button className="erp-link-button" onClick={() => onNavigate('audit')}>Open audit trail →</button></div>{dashboard.recentActivity.length ? <div className="erp-activity">{dashboard.recentActivity.map((item) => <div key={item.auditId}><b>{humanize(item.action)}</b><span>{item.targetId || 'Secure workspace'} · {formatDate(item.createdAt)}</span><em>{item.result}</em></div>)}</div> : <p className="erp-empty">No evidence is available yet.</p>}</article><article className="erp-panel admin-security"><div className="erp-panel-title"><div><p className="erp-kicker">Live security posture</p><h2>Platform status</h2></div></div><div className="admin-status-list"><div><span>Identity Registry</span><strong className={admin.available ? 'good' : 'attention'}>{admin.available ? 'Operational' : 'Offline'}</strong></div><div><span>Access Policy Contract</span><strong className={admin.available ? 'good' : 'attention'}>{admin.available ? 'Operational' : 'Offline'}</strong></div><div><span>Asset Custody Registry</span><strong className={admin.available ? 'good' : 'attention'}>{admin.available ? 'Operational' : 'Offline'}</strong></div><div><span>Blockchain ledger</span><strong className={admin.available ? 'good' : 'attention'}>{admin.available ? `Synced · Block ${admin.blockNumber}` : 'Needs local node'}</strong></div><div><span>Security review queue</span><strong className={admin.openSignals ? 'attention' : 'good'}>{admin.openSignals ? `${admin.openSignals} open signal${admin.openSignals === 1 ? '' : 's'}` : 'Clear'}</strong></div></div><button className="erp-link-button" onClick={() => onNavigate('security-signals')}>Review security signals →</button></article></section><ControlRoom admin={admin} onNavigate={onNavigate} /><TrustJourney trustJourney={dashboard.trustJourney} onNavigate={onNavigate} /></> : <><TrustJourney trustJourney={dashboard.trustJourney} onNavigate={onNavigate} /><section className="erp-stat-grid" data-tour="dashboard-overview">{dashboard.counts.length ? dashboard.counts.map((item, index) => <article className="stat-reveal" style={{ '--delay': `${index * 70}ms` }} key={item.module}><small>{humanize(item.module)}</small><strong>{item.count}</strong><span>Authorised records</span></article>) : <article><small>Workspace status</small><strong>Ready</strong><span>No operational records assigned yet</span></article>}</section><section className="erp-panel"><div className="erp-panel-title"><h2>My recent evidence</h2><span>Personal audit scope</span></div>{dashboard.recentActivity.length ? <div className="erp-activity">{dashboard.recentActivity.map((item) => <div key={item.auditId}><b>{humanize(item.action)}</b><span>{item.targetId || 'Secure workspace'} · {formatDate(item.createdAt)}</span><em>{item.result}</em></div>)}</div> : <p className="erp-empty">No personal activity has been recorded in this demo session.</p>}</section></>}</div>;
}

function ProjectPortfolio({ context, admin }) {
  const projects = admin ? context?.portfolio || [] : context?.assignments || [];
  if (!projects.length) return null;
  return <section className="erp-panel project-portfolio"><div className="erp-panel-title"><div><p className="erp-kicker">{admin ? 'Complete administrator view' : 'Role-specific assignment'}</p><h2>{admin ? 'Project portfolio' : 'My assigned project work'}</h2></div><span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Project</th><th>{admin ? 'Department / lead' : 'My relationship'}</th><th>{admin ? 'Phase' : 'Current task'}</th><th>Status</th><th>{admin ? 'Progress' : 'Access grant'}</th></tr></thead><tbody>{projects.map((item) => <tr key={item.projectId}><td><strong>{admin ? item.name : item.projectName}</strong><small className="table-subtle">{item.projectCode}</small></td><td>{admin ? <>{item.department}<small className="table-subtle">Lead: {item.leadName} · {item.assignedCount} assigned</small></> : <>{item.relationship}<small className="table-subtle">{item.workstream}</small></>}</td><td>{admin ? item.phase : item.taskTitle}<small className="table-subtle">{admin ? item.summary : item.taskStatus}</small></td><td><span className={`erp-status ${(admin ? item.status : item.projectStatus).toLowerCase().replace(/\s+/g, '-')}`}>{admin ? item.status : item.projectStatus}</span></td><td>{admin ? `${item.progress}%` : <><strong>{item.accessLevel}</strong><small className="table-subtle">{item.grantStatus}</small></>}</td></tr>)}</tbody></table></div></section>;
}

function Records({ title, records, loading }) {
  const demoRecords = [{ recordId: 'DEMO-REC-001', title: `${title} review demonstrator`, status: 'DEMO READY', amount: 125000, createdAt: 1782864960 }, { recordId: 'DEMO-REC-002', title: 'Protected workflow sample', status: 'AWAITING APPROVAL', amount: 48000, createdAt: 1782778560 }];
  const visibleRecords = records.length ? records : demoRecords;
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Authorised module</p><h1>{title}</h1><p>Only records within the selected authorised unit, department, and SBU are displayed.</p></div></div>{!loading && !records.length && <p className="trust-notice"><strong>Demo records:</strong> no live records are assigned to this workspace. These fictional entries are view-only and contain no sensitive information.</p>}<section className="erp-panel" data-tour="module-records">{loading ? <p className="erp-empty">Loading authorised records…</p> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Record</th><th>Description</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.recordId}><td>{record.recordId}</td><td>{record.title}</td><td><span className="erp-status">{record.status}</span></td><td>{record.amount ? `₹${Number(record.amount).toLocaleString('en-IN')}` : '—'}</td><td>{formatDate(record.createdAt)}</td></tr>)}</tbody></table></div>}</section></div>;
}

function AccessControl({ user, bootstrap, token, onChanged }) {
  const [requests, setRequests] = useState([]); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [form, setForm] = useState({ targetUnitId: 'BENGALURU', targetDepartmentId: 'FINANCE', targetSbuId: 'BENGALURU_SOFTWARE', requestedModule: 'finance', requestedPermission: 'VIEW', missionPurpose: 'Review purchase invoice reconciliation for the current assignment.', priority: 'NORMAL', accessMode: 'STANDARD', durationDays: 1 });
  const isAdmin = user.roleKey === 'ERP_ADMIN';
  const load = () => erpApi.accessRequests(token).then((data) => setRequests(data.requests)).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [token]);
  const request = async (event) => { event.preventDefault(); setError(''); setMessage(''); try { const result = await erpApi.createAccessRequest(token, form); setMessage(`Request ${result.requestId} is pending review. It will automatically expire on ${formatDate(result.expiresAt)} if approved.`); await load(); onChanged(); } catch (err) { setError(err.message); } };
  const decide = async (requestId, decision) => { const approvalNote = window.prompt(`${decision === 'approve' ? 'Approval' : decision === 'revoke' ? 'Revocation' : 'Rejection'} note for ${requestId}`, 'Reviewed for operational need and least-privilege access.') || ''; setError(''); setMessage(''); try { await erpApi.decideAccessRequest(token, requestId, decision, approvalNote); setMessage(`${requestId} has been ${decision === 'approve' ? 'approved' : decision === 'revoke' ? 'revoked' : 'rejected'} and the decision is preserved in the audit trail.`); await load(); onChanged(); } catch (err) { setError(err.message); } };
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Purpose-based, time-bound access</p><h1>{isAdmin ? 'Access Decision Centre' : 'Request controlled access'}</h1><p>Every request states why access is needed, how urgent it is, and exactly when it should end.</p></div><span className="trust-pill">Least privilege by design</span></div>{!isAdmin && <section className="erp-panel access-form-card"><div><h2>New access request</h2><p>Standard requests can last up to 90 days. Emergency access is limited to one day and is clearly marked in the audit trail.</p></div><form className="erp-request-form" onSubmit={request}><label>Target department<select value={form.targetDepartmentId} onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}>{bootstrap.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Target SBU<select value={form.targetSbuId} onChange={(e) => setForm({ ...form, targetSbuId: e.target.value })}>{bootstrap.sbus.filter((item) => item.unitId === form.targetUnitId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Module<input value={form.requestedModule} onChange={(e) => setForm({ ...form, requestedModule: e.target.value })} /></label><label>Permission<select value={form.requestedPermission} onChange={(e) => setForm({ ...form, requestedPermission: e.target.value })}>{['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'REJECT', 'EXPORT', 'AUDIT'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option></select></label><label>Access mode<select value={form.accessMode} onChange={(e) => setForm({ ...form, accessMode: e.target.value, durationDays: e.target.value === 'EMERGENCY' ? 1 : form.durationDays })}><option value="STANDARD">Standard</option><option value="EMERGENCY">Emergency (maximum 1 day)</option></select></label><label className="wide">Work purpose / mission reason<textarea value={form.missionPurpose} onChange={(e) => setForm({ ...form, missionPurpose: e.target.value })} required /></label><label>Duration (days)<input type="number" min="1" max={form.accessMode === 'EMERGENCY' ? 1 : 90} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></label><div className="access-expiry-note">{form.accessMode === 'EMERGENCY' ? 'Emergency requests expire within 24 hours.' : 'Approved access ends automatically after the requested duration.'}</div><button className="erp-primary">Submit for approval</button></form></section>}{message && <p className="trust-notice success">✓ {message}</p>}{error && <p className="erp-error">{error}</p>}<section className="erp-panel"><div className="erp-panel-title"><h2>{isAdmin ? 'Approval queue and access history' : 'My access requests'}</h2><span>{requests.length} record{requests.length === 1 ? '' : 's'}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Request</th>{isAdmin && <th>Employee</th>}<th>Purpose</th><th>Access</th><th>Expires</th><th>Status</th>{isAdmin && <th>Decision</th>}</tr></thead><tbody>{requests.map((item) => <tr key={item.request_id}><td><strong>{item.request_id}</strong><small className="table-subtle">{item.target_department}</small></td>{isAdmin && <td>{item.employee_name}<small className="table-subtle">{item.primary_department}</small></td>}<td className="purpose-cell">{item.business_reason}<small className="table-subtle">{item.access_mode} · {item.priority}</small></td><td>{item.requested_permission} · {item.requested_module}</td><td>{formatDate(item.end_date)}</td><td><span className={`erp-status ${item.status.toLowerCase()}`}>{item.status}</span></td>{isAdmin && <td className="erp-actions">{item.status === 'PENDING' && <><button onClick={() => decide(item.request_id, 'approve')}>Approve</button><button onClick={() => decide(item.request_id, 'reject')}>Reject</button></>}{item.status === 'APPROVED' && <button onClick={() => decide(item.request_id, 'revoke')}>Revoke</button>}</td>}</tr>)}</tbody></table></div></section></div>;
}

function Audit({ token }) {
  const [data, setData] = useState({ logs: [], scope: '' });
  useEffect(() => { erpApi.audit(token).then(setData).catch(() => {}); }, [token]);
  const demoLogs = [{ auditId: 'DEMO-AUDIT-01', action: 'ACCESS_REQUEST_CREATED', result: 'DEMO', targetId: 'Procurement review workspace', reason: 'Fictional prototype workflow', createdAt: 1782864960, visibility: 'PERSONAL' }, { auditId: 'DEMO-AUDIT-02', action: 'ASSET_PASSPORT_VIEWED', result: 'DEMO', targetId: 'Protected asset demonstrator', reason: 'View-only mock record', createdAt: 1782778560, visibility: 'PERSONAL' }];
  const visibleLogs = data.logs.length ? data.logs : demoLogs;
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Protected integrity trail</p><h1>Audit evidence timeline</h1><p>{data.scope || 'Fictional demonstration audit scope'}. This view explains the decision; cryptographic identifiers remain protected in backend services.</p></div><span className="trust-pill verified">● Evidence preserved</span></div>{!data.logs.length && <p className="trust-notice"><strong>Demo audit timeline:</strong> the live scope has no events yet, so fictional, non-sensitive example events are shown.</p>}<section className="audit-story"><article><strong>Who</strong><span>Authorised identity</span></article><article><strong>What</strong><span>Policy, access, or custody decision</span></article><article><strong>When</strong><span>Recorded time and result</span></article><article><strong>Proof</strong><span>Backend-protected blockchain evidence</span></article></section><section className="erp-panel" data-tour="audit-trail"><div className="audit-timeline">{visibleLogs.map((item, index) => <article key={item.auditId}><span className={index === 0 ? 'recent' : ''} /><div><div className="audit-event-heading"><strong>{humanize(item.action)}</strong><em>{item.result}</em></div><p>{item.targetId || 'Secure workspace'}{item.reason ? ` · ${item.reason}` : ''}</p><small>{formatDate(item.createdAt)} · {humanize(item.visibility)}</small></div></article>)}</div></section></div>;
}

function MasterData({ bootstrap, type }) { const items = type === 'users' ? bootstrap.demoUsers : type === 'organization' ? [...bootstrap.units, ...bootstrap.departments, ...bootstrap.sbus] : []; return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Administrator only</p><h1>{type === 'users' ? 'Users & Permissions' : 'Organisation Masters'}</h1><p>Fictional demonstration master data. Employee organisational assignments are backend-managed.</p></div></div><section className="erp-panel"><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>{type === 'users' ? 'Employee ID' : 'Master ID'}</th><th>Name</th><th>Role / Type</th><th>Assignment</th></tr></thead><tbody>{items.map((item) => <tr key={item.employeeId || item.id}><td>{item.employeeId || item.id}</td><td>{item.fullName || item.name}</td><td>{item.role || item.categoryNote || 'BEL Unit / SBU'}</td><td>{item.departmentId ? `${item.unitId} · ${item.departmentId} · ${item.sbuId}` : item.unitId || 'Configured master'}</td></tr>)}</tbody></table></div></section></div>; }

function Architecture() {
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Presentation-ready system map</p><h1>System Architecture</h1><p>This diagram describes the components actually used in the local BEL TrustGrid demonstration.</p></div><span className="trust-pill verified">● Local stack running</span></div><section className="architecture-flow"><article><span>01</span><div><small>Authorised users</small><strong>Role-based BEL ERP workspaces</strong><p>Personnel log in to the workspace assigned to their organisation role.</p></div></article><i>↓</i><article className="accent"><span>02</span><div><small>Web application</small><strong>React + Vite portal</strong><p>Shows only the screens and data allowed for the signed-in role.</p></div></article><i>↓</i><article><span>03</span><div><small>Backend and evidence index</small><strong>Express API + SQLite</strong><p>Applies session controls, stores operational metadata, and indexes non-sensitive events.</p></div></article><i>↓</i><section className="architecture-contracts"><p>Blockchain contract layer</p><div><article><strong>IdentityRegistry</strong><span>Verified decentralised identities and roles</span></article><article><strong>AccessControlManager</strong><span>RBAC, explicit grants, revocation, and expiry</span></article><article><strong>AssetRegistry</strong><span>ERC-721 asset custody and ownership history</span></article></div></section><i>↓</i><article className="ledger"><span>04</span><div><small>Local blockchain</small><strong>Hardhat + Solidity smart contracts</strong><p>Writes tamper-resistant identity, policy, and custody events for this prototype.</p></div></article></section><section className="architecture-notes"><article><strong>On-chain</strong><span>Identity registration, roles, access decisions, expiry, revocation, and asset ownership events.</span></article><article><strong>Off-chain</strong><span>ERP data, document files, and metadata. SHA-256 fingerprints are checked without exposing documents in the UI.</span></article><article><strong>Not claimed</strong><span>This local demonstration does not claim a public-network deployment, real employee wallet login, or external ERP integration.</span></article></section></div>;
}

function ProfilePage({ user, dashboard, modules }) {
  const recentActivity = dashboard.recentActivity.slice(0, 4);
  return <div className="erp-page page-enter profile-page"><div className="erp-page-heading"><div><p className="erp-kicker">Verified organisational profile</p><h1>My Profile</h1><p>Your authorised workspace, access posture, and recent portal activity.</p></div></div><section className="profile-hero" data-tour="profile-details"><div className="profile-identity"><span className="profile-avatar-large">{user.fullName.charAt(0)}</span><div><div className="profile-name-line"><h2>{user.fullName}</h2><span>● Verified</span></div><p>{user.employeeId} <b>·</b> {user.department} <b>·</b> {user.role}</p></div></div><span className="profile-role-badge">{user.roleKey === 'ERP_ADMIN' ? 'Admin' : user.role}</span><div className="profile-safe-facts"><article><small>Identity status</small><strong>Verified in Trust Registry</strong></article><article><small>Access assurance</small><strong>{user.mfaEnabled ? 'MFA enabled' : 'MFA ready for enrolment'}</strong></article></div></section><section className="profile-summary-grid"><article className="profile-summary-card"><div className="profile-card-heading"><span aria-hidden="true">◇</span><h2>Authorised tools <small>({modules.length})</small></h2></div><div className="profile-list">{modules.slice(0, 4).map((module) => <div key={module.id}><strong>{module.label}</strong><small>Available in your workspace</small></div>)}{modules.length > 4 && <p>+ {modules.length - 4} more authorised tools</p>}</div></article><article className="profile-summary-card"><div className="profile-card-heading"><span aria-hidden="true">⌁</span><h2>Current workspace</h2></div><div className="profile-list profile-workspace"><div><small>Unit</small><strong>{user.unit}</strong></div><div><small>Department</small><strong>{user.department}</strong></div><div><small>SBU</small><strong>{user.sbu}</strong></div></div></article><article className="profile-summary-card"><div className="profile-card-heading"><span aria-hidden="true">⌁</span><h2>Recent activity</h2></div><div className="profile-list profile-activity-list">{recentActivity.length ? recentActivity.map((item) => <div key={item.auditId}><strong>{humanize(item.action)}</strong><small><i aria-hidden="true">●</i> {formatDate(item.createdAt)}</small></div>) : <p>No personal activity recorded yet.</p>}</div></article></section></div>;
}

function WalletVerificationPanel({ user, onWalletVerified }) {
  const [wallet, setWallet] = useState(user.walletLabel || 'Not connected');
  const [message, setMessage] = useState('Connect MetaMask to prove control of a wallet. This does not change your role or grant access.');
  const [connecting, setConnecting] = useState(false);
  const connect = async () => {
    if (!window.ethereum?.request) { setMessage('MetaMask is not available in this browser. Install or unlock the MetaMask extension, then try again.'); return; }
    const token = window.sessionStorage.getItem('bel-trustgrid-session');
    if (!token) { setMessage('Your secure portal session has expired. Sign in again before connecting a wallet.'); return; }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts?.[0];
      if (!address) throw new Error('No MetaMask account was selected.');
      const challenge = await erpApi.walletChallenge(token);
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [challenge.message, address] });
      const verified = await erpApi.verifyWallet(token, signature);
      setWallet(verified.walletLabel);
      setMessage(verified.message);
      onWalletVerified?.(verified);
    } catch (error) { setMessage(error?.message || 'Wallet verification was cancelled or could not be completed.'); }
    finally { setConnecting(false); }
  };
  return <section className="wallet-verification-panel"><div><span className="wallet-mark" aria-hidden="true">◇</span><div><strong>MetaMask wallet proof</strong><p>{wallet === 'Not connected' ? 'No wallet connected' : `Verified wallet: ${wallet}`}</p></div></div><button type="button" className="erp-primary" disabled={connecting} onClick={connect}>{connecting ? 'Waiting for signature…' : wallet === 'Not connected' ? 'Connect MetaMask' : 'Verify another wallet'}</button><p className="wallet-verification-note" role="status">{message}</p></section>;
}

function PortalSettings({ user, onWalletVerified }) {
  const defaultSettings = {
    security: { dualApproval: true, expiryAlerts: true, verificationLog: true, externalHours: false, signalReview: true },
    wallet: { connectionHealth: true },
    session: { timeout: '15', autoLock: true, reauthenticate: true, concurrent: false },
    notifications: { securityAlerts: true, accessApprovals: true, expiryWarnings: true, chainConfirmations: false, identityUpdates: true, custodyChanges: true },
    policies: { duration: '1 hour', justification: true, autoRevoke: true, delegation: false, leastPrivilege: true },
  };
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState(defaultSettings);
  const [savedMessage, setSavedMessage] = useState('');
  const storageKey = `bel-trustgrid-settings-${user.employeeId}`;
  const tabs = [['account', 'user', 'Account'], ['security', 'identity', 'Security'], ['wallet', 'wallet', 'Wallet'], ['session', 'clock', 'Session'], ['notifications', 'bell', 'Notifications'], ['policies', 'lock', 'Permission policies']];

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (stored) setSettings((current) => ({ ...current, ...stored, security: { ...current.security, ...stored.security }, wallet: { ...current.wallet, ...stored.wallet }, session: { ...current.session, ...stored.session }, notifications: { ...current.notifications, ...stored.notifications }, policies: { ...current.policies, ...stored.policies } }));
    } catch {}
  }, [storageKey]);

  const toggle = (section, key) => setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: !current[section][key] } }));
  const save = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSavedMessage('Preferences saved for this browser. Protected access rules remain enforced by the backend and smart contracts.');
  };
  const Toggle = ({ section, itemKey, label }) => <label className="settings-toggle"><span>{label}</span><input type="checkbox" checked={settings[section][itemKey]} onChange={() => toggle(section, itemKey)} /><i aria-hidden="true" /></label>;
  let panel;
  if (activeTab === 'account') panel = <><h2>Account settings</h2><p className="settings-panel-intro">Official identity and role assignments are protected records managed by the authorised workflow.</p><div className="settings-account-grid"><label>Full name<input value={user.fullName} readOnly /></label><label>Employee ID<input value={user.employeeId} readOnly /></label><label>Department<input value={user.department} readOnly /></label><label>Role<input value={user.roleKey === 'ERP_ADMIN' ? 'Administrator' : user.role} readOnly /></label></div></>;
  if (activeTab === 'security') panel = <><h2>Security settings</h2><div className="settings-toggle-list"><Toggle section="security" itemKey="dualApproval" label="Require dual approval for critical asset actions" /><Toggle section="security" itemKey="expiryAlerts" label="Enable access expiry alerts" /><Toggle section="security" itemKey="verificationLog" label="Record identity verification events" /><Toggle section="security" itemKey="externalHours" label="Restrict external access outside business hours" /><Toggle section="security" itemKey="signalReview" label="Show high-priority signals in the review queue" /></div></>;
  if (activeTab === 'wallet') panel = <><h2>Credential connection</h2><WalletVerificationPanel user={user} onWalletVerified={onWalletVerified} /><div className="settings-protected-card"><span aria-hidden="true">◈</span><div><strong>Role-bound wallet assurance</strong><p>A MetaMask signature proves control of the connected wallet. The role, project scope, and access rules remain enforced by the backend.</p></div><em>Optional</em></div><p className="settings-safe-note">The portal displays only a shortened wallet label. It never asks MetaMask to sign a transaction or expose a private key.</p><div className="settings-toggle-list"><Toggle section="wallet" itemKey="connectionHealth" label="Show credential connection health in this workspace" /></div></>;
  if (activeTab === 'session') panel = <><h2>Session settings</h2><label className="settings-select-label">Session timeout<select value={settings.session.timeout} onChange={(event) => setSettings((current) => ({ ...current, session: { ...current.session, timeout: event.target.value } }))}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></select></label><div className="settings-toggle-list"><Toggle section="session" itemKey="autoLock" label="Auto-lock on inactivity" /><Toggle section="session" itemKey="reauthenticate" label="Require re-authentication for critical actions" /><Toggle section="session" itemKey="concurrent" label="Allow concurrent sessions" /></div></>;
  if (activeTab === 'notifications') panel = <><h2>Notification preferences</h2><div className="settings-toggle-list"><Toggle section="notifications" itemKey="securityAlerts" label="Security alerts" /><Toggle section="notifications" itemKey="accessApprovals" label="Access request approvals" /><Toggle section="notifications" itemKey="expiryWarnings" label="Permission expiry warnings" /><Toggle section="notifications" itemKey="chainConfirmations" label="Blockchain transaction confirmations" /><Toggle section="notifications" itemKey="identityUpdates" label="Identity verification updates" /><Toggle section="notifications" itemKey="custodyChanges" label="Asset custody changes" /></div></>;
  if (activeTab === 'policies') panel = <><h2>Permission policies</h2><label className="settings-select-label">Default temporary access duration<select value={settings.policies.duration} onChange={(event) => setSettings((current) => ({ ...current, policies: { ...current.policies, duration: event.target.value } }))}><option>1 hour</option><option>4 hours</option><option>1 day</option></select></label><div className="settings-toggle-list"><Toggle section="policies" itemKey="justification" label="Require justification for permission requests" /><Toggle section="policies" itemKey="autoRevoke" label="Auto-revoke permissions on role change" /><Toggle section="policies" itemKey="delegation" label="Allow permission delegation" /><Toggle section="policies" itemKey="leastPrivilege" label="Enforce least-privilege recommendations" /></div></>;

  return <div className="erp-page page-enter settings-page"><div className="erp-page-heading"><div><p className="erp-kicker">Secure portal preferences</p><h1>Settings</h1><p>Account preferences and secure workspace controls for your current portal.</p></div></div><div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">{tabs.map(([id, icon, label]) => <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => { setActiveTab(id); setSavedMessage(''); }}><Icon name={icon} />{label}</button>)}</nav><section className="settings-panel">{panel}</section></div><div className="settings-save-row"><p role="status">{savedMessage}</p><button type="button" className="erp-primary" onClick={save}>Save changes</button></div></div>;
}

function SidebarNavigation({ modules, activeModule, onNavigate }) {
  const [operationsOpen, setOperationsOpen] = useState(false);
  const operationalModules = modules.filter((module) => OPERATIONS_FOLDER_MODULES.includes(module.id));
  const firstOperationalIndex = modules.findIndex((module) => module.id === operationalModules[0]?.id);

  useEffect(() => {
    if (OPERATIONS_FOLDER_MODULES.includes(activeModule)) setOperationsOpen(true);
  }, [activeModule]);

  return <nav>{modules.map((module, index) => {
    if (OPERATIONS_FOLDER_MODULES.includes(module.id) && index !== firstOperationalIndex) return null;
    if (index === firstOperationalIndex && operationalModules.length) {
      return <div className="erp-nav-folder" key="operations-folder">
        <button className={`erp-nav-folder-toggle ${operationalModules.some((item) => item.id === activeModule) ? 'active' : ''}`} type="button" aria-expanded={operationsOpen} aria-controls="operations-submenu" onClick={() => setOperationsOpen((open) => !open)}>
          <Icon name="folder" /><b>Operations modules</b><em>{operationsOpen ? '−' : '+'}</em>
        </button>
        {operationsOpen && <div className="erp-sidebar-subnav" id="operations-submenu">{operationalModules.map((item) => {
          return <button key={item.id} data-tour={`sidebar-${item.id}`} className={activeModule === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}><Icon name={MODULE_ICONS[item.id]} />{item.label}</button>;
        })}</div>}
      </div>;
    }
    return <button key={module.id} data-tour={`sidebar-${module.id}`} className={activeModule === module.id ? 'active' : ''} onClick={() => onNavigate(module.id)}><Icon name={MODULE_ICONS[module.id]} />{module.label}</button>;
  })}</nav>;
}

export function ErpPortal() {
  const [bootstrap, setBootstrap] = useState(null); const [session, setSession] = useState(null); const [dashboard, setDashboard] = useState(null); const [activeModule, setActiveModule] = useState('dashboard'); const [records, setRecords] = useState([]); const [loadingRecords, setLoadingRecords] = useState(false); const [error, setError] = useState('');
  const loadBootstrap = useCallback(async () => {
    setError('');
    try {
      setBootstrap(await erpApi.bootstrap());
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => { loadBootstrap(); }, [loadBootstrap]);
  const loadDashboard = async (token, departmentId) => { const data = await erpApi.dashboard(token, departmentId); setDashboard(data); return data; };
  const signIn = async (credentials) => { const result = await erpApi.login(credentials); const next = { token: result.sessionToken, user: { ...result.user, workspaces: result.workspaces }, workspace: result.activeWorkspace, modules: result.modules }; window.sessionStorage.setItem('bel-trustgrid-session', result.sessionToken); setSession(next); setActiveModule('dashboard'); await loadDashboard(result.sessionToken, result.activeWorkspace.departmentId); };
  const updateWallet = useCallback((verified) => { setSession((current) => current ? { ...current, user: { ...current.user, walletConnected: Boolean(verified.walletConnected), walletLabel: verified.walletLabel } } : current); }, []);
  const loadRecords = useCallback(async (module) => { setActiveModule(module); if (['dashboard', 'identity', 'users', 'digital-assets', 'asset-passport-common', 'access-requests', 'permissions', 'temporary-access', 'verification', 'audit-common', 'blockchain-activity', 'security-insights', 'architecture-common', 'access-control', 'asset-passport', 'identity-assertion', 'security-signals', 'demo-simulator', 'audit', 'organization', 'blockchain', 'architecture', 'profile', 'settings'].includes(module)) return; setLoadingRecords(true); try { const data = await erpApi.records(session.token, module, session.workspace.departmentId); setRecords(data.records); } catch (err) { setError(err.message); setRecords([]); } finally { setLoadingRecords(false); } }, [session]);
  const logout = async () => { try { await erpApi.logout(session.token); } catch {} window.sessionStorage.removeItem('bel-trustgrid-session'); setSession(null); setDashboard(null); setActiveModule('dashboard'); };
  if (error && !bootstrap) return <main className="erp-loading"><div><p>Unable to start BEL TrustGrid: {error}</p><button className="erp-primary" type="button" onClick={loadBootstrap}>Retry connection</button></div></main>;
  if (!bootstrap) return <main className="erp-loading">Loading protected demonstration data…</main>;
  if (!session || !dashboard) return <Login bootstrap={bootstrap} onLogin={signIn} />;
  const user = session.user;
  const portalModules = COMMON_WORKSPACE_MODULES;
  const activeLabel = portalModules.find((item) => item.id === activeModule)?.label || 'Dashboard';
  const sharedModules = ['identity', 'users', 'digital-assets', 'asset-passport-common', 'permissions', 'temporary-access', 'verification', 'audit-common', 'blockchain-activity', 'security-insights', 'architecture-common'];
  return <div className="erp-shell"><ProfileHeader user={user} modules={portalModules} openSignals={dashboard.adminSnapshot?.openSignals || 0} onLogout={logout} onNavigate={loadRecords} /><aside className="erp-sidebar"><div className="erp-sidebar-brand">BEL <small>TRUSTGRID · DEMO</small></div><SidebarNavigation modules={portalModules} activeModule={activeModule} onNavigate={loadRecords} /><div className="erp-scope"><strong>{session.workspace.access}</strong><span>{session.workspace.unit}</span><span>{session.workspace.department}</span><span>{session.workspace.sbu}</span></div></aside><main className="erp-content">{error && <p className="erp-error">{error}</p>}{activeModule === 'dashboard' && <Overview dashboard={dashboard} user={user} onNavigate={loadRecords} />}{sharedModules.includes(activeModule) && <CommonWorkspace module={activeModule} user={user} projectContext={dashboard.projectContext} onNavigate={loadRecords} />}{['access-requests', 'access-control'].includes(activeModule) && <AccessControl user={user} bootstrap={bootstrap} token={session.token} onChanged={() => loadDashboard(session.token, session.workspace.departmentId)} />}{activeModule === 'asset-passport' && <AssetPassport token={session.token} user={user} />}{activeModule === 'identity-assertion' && <IdentityAssertion token={session.token} />}{activeModule === 'security-signals' && <SecuritySignals token={session.token} user={user} />}{activeModule === 'demo-simulator' && <JudgeDemo onNavigate={loadRecords} />}{activeModule === 'audit' && <Audit token={session.token} />}{activeModule === 'organization' && <MasterData bootstrap={bootstrap} type="organization" />}{activeModule === 'blockchain' && <BlockchainRegistry token={session.token} />}{activeModule === 'architecture' && <Architecture />}{activeModule === 'profile' && <ProfilePage user={user} dashboard={dashboard} modules={portalModules} />}{activeModule === 'settings' && <PortalSettings user={user} onWalletVerified={updateWallet} />}{!['dashboard', ...sharedModules, 'access-requests', 'access-control', 'asset-passport', 'identity-assertion', 'security-signals', 'demo-simulator', 'audit', 'organization', 'blockchain', 'architecture', 'profile', 'settings'].includes(activeModule) && <Records title={activeLabel} records={records} loading={loadingRecords} />}</main><ErpGuide sessionToken={session.token} user={user} modules={portalModules} activeModule={activeModule} onNavigate={loadRecords} /></div>;
}
