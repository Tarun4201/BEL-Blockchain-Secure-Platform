import { useEffect, useMemo, useState } from 'react';
import { erpApi } from '../api/client';

const accountLabels = { EMPLOYEE: 'Employee Login', VENDOR: 'Vendor Login', CUSTOMER: 'Customer Login', ERP_ADMIN: 'ERP Admin Login' };
const formatDate = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
const humanize = (value) => value?.replaceAll('_', ' ') || '—';

function Login({ bootstrap, onLogin }) {
  const [accountType, setAccountType] = useState('EMPLOYEE');
  const [form, setForm] = useState({ identifier: 'BEL-EMP-1001', password: '123', unitId: 'BENGALURU', departmentId: 'PROCUREMENT', sbuId: 'BENGALURU_SOFTWARE' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sbus = bootstrap.sbus.filter((sbu) => sbu.unitId === form.unitId);
  const demoUsers = bootstrap.demoUsers.filter((user) => accountType === 'ERP_ADMIN' ? user.employeeId === 'BEL-EMP-1010' : user.accountType === accountType);

  const selectDemo = (user) => {
    setForm({ identifier: user.employeeId, password: '123', unitId: user.unitId, departmentId: user.departmentId, sbuId: user.sbuId });
    setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try { await onLogin({ ...form, accountType: accountType === 'ERP_ADMIN' ? 'EMPLOYEE' : accountType }); }
    catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return <main className="erp-login">
    <section className="erp-login-brand">
      <p className="erp-kicker">Bharat Electronics Limited</p>
      <h1>BEL Enterprise Resource Planning Portal</h1>
      <p className="erp-login-subtitle">Secure Blockchain-Enabled ERP</p>
      <p>Fictional demonstration environment for unit, department, SBU, and role-based operations.</p>
      <div className="erp-security-points"><span>01 · Organizational validation</span><span>02 · Controlled workspaces</span><span>03 · Integrity audit trail</span></div>
      <small>DEMO / FICTIONAL DATA ONLY</small>
    </section>
    <section className="erp-login-panel">
      <div className="erp-login-inner">
        <p className="erp-kicker">Secure access</p><h2>Sign in to your authorized workspace</h2>
        <div className="erp-account-tabs">
          {Object.entries(accountLabels).map(([id, label]) => <button key={id} type="button" className={accountType === id ? 'active' : ''} onClick={() => setAccountType(id)}>{label}</button>)}
        </div>
        <div className="erp-demo-picker"><strong>Demo users</strong><div>{demoUsers.map((user) => <button key={user.employeeId} type="button" onClick={() => selectDemo(user)}>{user.fullName} <small>{user.role}</small></button>)}</div></div>
        <form onSubmit={submit} className="erp-login-form">
          <label>Employee ID / Official Email<input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>BEL Unit / Location<select value={form.unitId} onChange={(e) => { const unitId = e.target.value; setForm({ ...form, unitId, sbuId: bootstrap.sbus.find((s) => s.unitId === unitId)?.id || '' }); }}><option value="">Select a unit</option>{bootstrap.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label>Department / Function<select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select a department</option>{bootstrap.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label>SBU / Business Area<select value={form.sbuId} onChange={(e) => setForm({ ...form, sbuId: e.target.value })}><option value="">Select an SBU</option>{sbus.map((sbu) => <option key={sbu.id} value={sbu.id}>{sbu.name}</option>)}</select></label>
          {error && <p className="erp-error">{error}</p>}
          <button className="erp-primary" disabled={submitting}>{submitting ? 'Validating access…' : 'Validate and sign in'}</button>
        </form>
        <p className="erp-login-note">Selections are checked against the backend assignment. They never grant access by themselves. Demo password: <strong>123</strong>.</p>
      </div>
    </section>
  </main>;
}

function ProfileHeader({ user, workspace, onWorkspace, onLogout }) {
  return <header className="erp-topbar"><div><strong>BEL ERP</strong><span>Secure Blockchain-Enabled ERP · DEMO / FICTIONAL DATA</span></div><div className="erp-topbar-actions"><label>Authorized workspace<select value={workspace.departmentId} onChange={(e) => onWorkspace(e.target.value)}>{user.workspaces.map((item) => <option key={`${item.departmentId}-${item.sbuId}`} value={item.departmentId}>{item.department} · {item.access}</option>)}</select></label><div className="erp-user-chip"><b>{user.fullName}</b><small>{user.employeeId} · {user.role}</small></div><button onClick={onLogout}>Sign out</button></div></header>;
}

function Overview({ dashboard, user }) {
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Current workspace</p><h1>{dashboard.workspace.department}</h1><p>{dashboard.workspace.unit} · {dashboard.workspace.sbu} · <strong>{dashboard.workspace.access}</strong></p></div><div className="erp-role-badge">{user.accessLevel === 'STANDARD' ? dashboard.workspace.access : user.accessLevel}</div></div><section className="erp-stat-grid">{dashboard.counts.length ? dashboard.counts.map((item) => <article key={item.module}><small>{humanize(item.module)}</small><strong>{item.count}</strong><span>Authorized records</span></article>) : <article><small>Workspace status</small><strong>Ready</strong><span>No operational records assigned yet</span></article>}</section><section className="erp-panel"><div className="erp-panel-title"><h2>My recent activity</h2><span>Personal audit scope</span></div>{dashboard.recentActivity.length ? <div className="erp-activity">{dashboard.recentActivity.map((item) => <div key={item.auditId}><b>{humanize(item.action)}</b><span>{item.targetId || 'ERP workspace'} · {formatDate(item.createdAt)}</span><em>{item.result}</em></div>)}</div> : <p className="erp-empty">No personal activity has been recorded in this demo session.</p>}</section></div>;
}

function Records({ title, records, loading }) {
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Authorized module</p><h1>{title}</h1><p>Only records within the selected authorized unit, department, and SBU are displayed.</p></div></div><section className="erp-panel">{loading ? <p className="erp-empty">Loading authorized records…</p> : records.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Record</th><th>Description</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead><tbody>{records.map((record) => <tr key={record.recordId}><td>{record.recordId}</td><td>{record.title}</td><td><span className="erp-status">{record.status}</span></td><td>{record.amount ? `₹${Number(record.amount).toLocaleString('en-IN')}` : '—'}</td><td>{formatDate(record.createdAt)}</td></tr>)}</tbody></table></div> : <p className="erp-empty">No records are authorized for this workspace.</p>}</section></div>;
}

function AccessControl({ user, bootstrap, token, onChanged }) {
  const [requests, setRequests] = useState([]); const [error, setError] = useState('');
  const [form, setForm] = useState({ targetUnitId: 'BENGALURU', targetDepartmentId: 'FINANCE', targetSbuId: 'BENGALURU_SOFTWARE', requestedModule: 'finance', requestedPermission: 'VIEW', businessReason: 'Purchase invoice reconciliation', durationDays: 30 });
  const isAdmin = user.roleKey === 'ERP_ADMIN';
  const load = () => erpApi.accessRequests(token).then((data) => setRequests(data.requests)).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [token]);
  const request = async (event) => { event.preventDefault(); try { await erpApi.createAccessRequest(token, form); await load(); onChanged(); } catch (err) { setError(err.message); } };
  const decide = async (requestId, decision) => { try { await erpApi.decideAccessRequest(token, requestId, decision); await load(); onChanged(); } catch (err) { setError(err.message); } };
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Controlled interdepartment access</p><h1>{isAdmin ? 'Access Management' : 'Request Interdepartment Access'}</h1><p>Access is limited by unit, department, SBU, module, permission, and expiry date.</p></div></div>{!isAdmin && <section className="erp-panel"><h2>New access request</h2><form className="erp-request-form" onSubmit={request}><label>Target department<select value={form.targetDepartmentId} onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}>{bootstrap.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Target SBU<select value={form.targetSbuId} onChange={(e) => setForm({ ...form, targetSbuId: e.target.value })}>{bootstrap.sbus.filter((item) => item.unitId === form.targetUnitId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Module<input value={form.requestedModule} onChange={(e) => setForm({ ...form, requestedModule: e.target.value })} /></label><label>Permission<select value={form.requestedPermission} onChange={(e) => setForm({ ...form, requestedPermission: e.target.value })}>{['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'REJECT', 'EXPORT', 'AUDIT'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">Business reason<textarea value={form.businessReason} onChange={(e) => setForm({ ...form, businessReason: e.target.value })} /></label><label>Duration (days)<input type="number" min="1" max="90" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></label><button className="erp-primary">Submit request</button></form></section>}<section className="erp-panel"><div className="erp-panel-title"><h2>{isAdmin ? 'All access requests' : 'My access requests'}</h2><span>{requests.length} records</span></div>{error && <p className="erp-error">{error}</p>}<div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Request</th>{isAdmin && <th>Employee</th>}<th>Primary Dept.</th><th>Target Dept.</th><th>Permission</th><th>Status</th>{isAdmin && <th>Action</th>}</tr></thead><tbody>{requests.map((item) => <tr key={item.request_id}><td>{item.request_id}</td>{isAdmin && <td>{item.employee_name}</td>}<td>{item.primary_department}</td><td>{item.target_department}</td><td>{item.requested_permission} · {item.requested_module}</td><td><span className="erp-status">{item.status}</span></td>{isAdmin && <td className="erp-actions">{item.status === 'PENDING' && <><button onClick={() => decide(item.request_id, 'approve')}>Approve</button><button onClick={() => decide(item.request_id, 'reject')}>Reject</button></>}{item.status === 'APPROVED' && <button onClick={() => decide(item.request_id, 'revoke')}>Revoke</button>}</td>}</tr>)}</tbody></table></div></section></div>;
}

function Audit({ token }) {
  const [data, setData] = useState({ logs: [], scope: '' });
  useEffect(() => { erpApi.audit(token).then(setData).catch(() => {}); }, [token]);
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Protected integrity trail</p><h1>Audit Log</h1><p>{data.scope}. Cryptographic identifiers remain in backend services.</p></div></div><section className="erp-panel"><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Audit ID</th><th>Action</th><th>Target</th><th>Result</th><th>Visibility</th><th>Time</th></tr></thead><tbody>{data.logs.map((item) => <tr key={item.auditId}><td>{item.auditId}</td><td>{humanize(item.action)}</td><td>{item.targetId || '—'}</td><td><span className="erp-status">{item.result}</span></td><td>{humanize(item.visibility)}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div></section></div>;
}

function MasterData({ bootstrap, type }) {
  const items = type === 'users' ? bootstrap.demoUsers : type === 'organization' ? [...bootstrap.units, ...bootstrap.departments, ...bootstrap.sbus] : [];
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Administrator only</p><h1>{type === 'users' ? 'Users & Permissions' : 'Organization Masters'}</h1><p>Fictional demonstration master data. Employee organizational assignments are backend-managed.</p></div></div><section className="erp-panel"><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>{type === 'users' ? 'Employee ID' : 'Master ID'}</th><th>Name</th><th>Role / Type</th><th>Assignment</th></tr></thead><tbody>{items.map((item) => <tr key={item.employeeId || item.id}><td>{item.employeeId || item.id}</td><td>{item.fullName || item.name}</td><td>{item.role || item.categoryNote || 'BEL Unit / SBU'}</td><td>{item.departmentId ? `${item.unitId} · ${item.departmentId} · ${item.sbuId}` : item.unitId || 'Configured master'}</td></tr>)}</tbody></table></div></section></div>;
}

export function ErpPortal() {
  const [bootstrap, setBootstrap] = useState(null); const [session, setSession] = useState(null); const [dashboard, setDashboard] = useState(null); const [activeModule, setActiveModule] = useState('dashboard'); const [records, setRecords] = useState([]); const [loadingRecords, setLoadingRecords] = useState(false); const [error, setError] = useState('');
  useEffect(() => { erpApi.bootstrap().then(setBootstrap).catch((err) => setError(err.message)); }, []);
  const loadDashboard = async (token, departmentId) => { const data = await erpApi.dashboard(token, departmentId); setDashboard(data); return data; };
  const signIn = async (credentials) => { const result = await erpApi.login(credentials); const next = { token: result.sessionToken, user: { ...result.user, workspaces: result.workspaces }, workspace: result.activeWorkspace, modules: result.modules }; setSession(next); setActiveModule('dashboard'); await loadDashboard(result.sessionToken, result.activeWorkspace.departmentId); };
  const changeWorkspace = async (departmentId) => { const data = await loadDashboard(session.token, departmentId); setSession({ ...session, workspace: data.workspace, modules: data.modules }); setActiveModule('dashboard'); };
  const loadRecords = async (module) => { setActiveModule(module); if (['dashboard', 'access-control', 'audit', 'organization', 'users', 'profile'].includes(module)) return; setLoadingRecords(true); try { const data = await erpApi.records(session.token, module, session.workspace.departmentId); setRecords(data.records); } catch (err) { setError(err.message); setRecords([]); } finally { setLoadingRecords(false); } };
  const logout = async () => { try { await erpApi.logout(session.token); } catch {} setSession(null); setDashboard(null); setActiveModule('dashboard'); };
  const activeLabel = useMemo(() => session?.modules.find((item) => item.id === activeModule)?.label || 'Dashboard', [session, activeModule]);
  if (error && !bootstrap) return <main className="erp-loading">Unable to start ERP demo: {error}</main>;
  if (!bootstrap) return <main className="erp-loading">Loading fictional ERP demonstration data…</main>;
  if (!session || !dashboard) return <Login bootstrap={bootstrap} onLogin={signIn} />;
  const user = session.user;
  return <div className="erp-shell"><ProfileHeader user={user} workspace={session.workspace} onWorkspace={changeWorkspace} onLogout={logout} /><aside className="erp-sidebar"><div className="erp-sidebar-brand">BEL ERP <small>DEMO ENVIRONMENT</small></div><nav>{session.modules.map((module, index) => <button key={module.id} className={activeModule === module.id ? 'active' : ''} onClick={() => loadRecords(module.id)}><span>{String(index + 1).padStart(2, '0')}</span>{module.label}</button>)}</nav><div className="erp-scope"><strong>{session.workspace.access}</strong><span>{session.workspace.unit}</span><span>{session.workspace.department}</span><span>{session.workspace.sbu}</span></div></aside><main className="erp-content">{error && <p className="erp-error">{error}</p>}{activeModule === 'dashboard' && <Overview dashboard={dashboard} user={user} />}{activeModule === 'access-control' && <AccessControl user={user} bootstrap={bootstrap} token={session.token} onChanged={() => loadDashboard(session.token, session.workspace.departmentId)} />}{activeModule === 'audit' && <Audit token={session.token} />}{activeModule === 'organization' && <MasterData bootstrap={bootstrap} type="organization" />}{activeModule === 'users' && <MasterData bootstrap={bootstrap} type="users" />}{activeModule === 'profile' && <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Backend-managed profile</p><h1>My Profile</h1><p>Organizational assignments and base permissions cannot be changed from this portal.</p></div></div><section className="erp-panel erp-profile-grid">{Object.entries({ 'Employee ID': user.employeeId, 'Official email': user.officialEmail, Unit: user.unit, Department: user.department, SBU: user.sbu, Role: user.role, 'MFA ready': user.mfaEnabled ? 'Enabled' : 'Ready for enrollment' }).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</section></div>}{!['dashboard', 'access-control', 'audit', 'organization', 'users', 'profile'].includes(activeModule) && <Records title={activeLabel} records={records} loading={loadingRecords} />}</main></div>;
}
