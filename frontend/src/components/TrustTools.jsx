import { useEffect, useState } from 'react';
import { erpApi } from '../api/client';

const demoAssertion = {
  assertion: {
    blockchainVerified: true,
    message: 'This fictional demonstration assertion confirms only the minimum claims needed for a sample access decision.',
    disclosedClaims: { 'Employment status': 'Active demonstrator', 'Authorisation scope': 'Procurement review', 'Verification state': 'Confirmed for demo' },
    hiddenClaims: ['Wallet address', 'Full DID document', 'Personal contact details', 'Private credentials'],
  },
};

const demoAlerts = [
  { alertId: 'DEMO-SIGNAL-01', alertType: 'REPEATED_DENIED_ACCESS', summary: 'Demo signal: repeated denied requests were grouped for administrator review without exposing the protected resource.', evidenceCount: 5, createdAt: 1782864960, severity: 'HIGH', status: 'OPEN' },
  { alertId: 'DEMO-SIGNAL-02', alertType: 'UNUSUAL_ACCESS_PATTERN', summary: 'Demo signal: an unusual access pattern is awaiting a security review. This is fictional prototype data.', evidenceCount: 2, createdAt: 1782857760, severity: 'MEDIUM', status: 'OPEN' },
];

export function IdentityAssertion({ token }) {
  const [data, setData] = useState(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  useEffect(() => { let active = true; erpApi.identityAssertion(token).then((result) => { if (active) { setData(result); setUsingDemoData(false); } }).catch(() => { if (active) { setData(demoAssertion); setUsingDemoData(true); } }); return () => { active = false; }; }, [token]);
  if (!data) return <div className="erp-page"><p className="erp-empty">Preparing the minimum identity assertion…</p></div>;
  const claim = data.assertion;
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Privacy-preserving identity</p><h1>Identity Assertion</h1><p>Share only the claims required to make an access decision—not the person’s full identity record.</p></div><span className="trust-pill verified">● Minimum disclosure</span></div>{usingDemoData && <p className="trust-notice"><strong>Demo assertion:</strong> live identity evidence is unavailable, so fictional minimum-disclosure claims are shown. No identity record was queried or changed.</p>}<section className="assertion-card"><div><p className="erp-kicker">Authorisation-ready proof</p><h2>{claim.blockchainVerified ? 'Blockchain identity verified' : 'Organisation identity verified'}</h2><p>{claim.message}</p><div className="assertion-claims">{Object.entries(claim.disclosedClaims).map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}</div></div><aside><strong>Protected from this view</strong>{claim.hiddenClaims.map((item) => <span key={item}>✓ {item}</span>)}</aside></section></div>;
}

export function SecuritySignals({ token, user }) {
  const [alerts, setAlerts] = useState([]); const [message, setMessage] = useState(''); const [usingDemoData, setUsingDemoData] = useState(false);
  const load = () => erpApi.securityAlerts(token).then((result) => { const rows = result.alerts || []; setAlerts(rows.length ? rows : demoAlerts); setUsingDemoData(!rows.length); }).catch(() => { setAlerts(demoAlerts); setUsingDemoData(true); });
  useEffect(() => { load(); }, [token]);
  const drill = async () => { const result = await erpApi.runSecurityDrill(token); setMessage(result.message); load(); };
  const review = async (alertId) => { if (usingDemoData) { setAlerts((items) => items.map((item) => item.alertId === alertId ? { ...item, status: 'REVIEWED' } : item)); setMessage('Demo signal marked reviewed locally. No security event was changed.'); return; } await erpApi.reviewSecurityAlert(token, alertId); load(); };
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Anomaly awareness</p><h1>Security Signals</h1><p>Repeated denied actions are grouped into reviewable signals; this does not expose sensitive activity contents.</p></div>{user.roleKey === 'ERP_ADMIN' && !usingDemoData && <button className="erp-secondary" onClick={drill}>Run safe threat drill</button>}</div>{usingDemoData && <p className="trust-notice"><strong>Demo security signals:</strong> these fictional alerts keep the prototype informative while the live feed is unavailable. Review changes stay in this browser only.</p>}{message && <p className="trust-notice success">✓ {message}</p>}<section className="erp-panel"><div className="signal-list">{alerts.length ? alerts.map((alert) => <article key={alert.alertId}><span className={`signal-severity ${alert.severity.toLowerCase()}`} /> <div><strong>{alert.alertType.replaceAll('_', ' ')}</strong><p>{alert.summary}</p><small>{alert.evidenceCount} related signals · {new Date(alert.createdAt * 1000).toLocaleString()}</small></div><em>{alert.status}</em>{user.roleKey === 'ERP_ADMIN' && alert.status === 'OPEN' && <button onClick={() => review(alert.alertId)}>Mark reviewed</button>}</article>) : <p className="erp-empty">No security signals require review.</p>}</div></section></div>;
}

export function JudgeDemo({ onNavigate }) {
  const [step, setStep] = useState(0);
  const steps = [['Identity', 'Show a minimum-disclosure identity assertion.', 'identity-assertion'], ['Access', 'Show the purpose, priority, and expiry of an access request.', 'access-control'], ['Asset', 'Verify the Radar Unit asset passport and custody history.', 'asset-passport'], ['Evidence', 'Open the audit timeline or Trust Registry.', 'audit']];
  const current = steps[step];
  return <div className="erp-page page-enter"><div className="erp-page-heading"><div><p className="erp-kicker">Safe presentation mode</p><h1>Judge Demo Mode</h1><p>A guided story that opens existing features. It does not create an approval, transfer, or blockchain transaction.</p></div><span className="trust-pill">Simulation only</span></div><section className="demo-simulator"><div className="demo-steps">{steps.map(([title], index) => <button className={index === step ? 'active' : index < step ? 'done' : ''} key={title} onClick={() => setStep(index)}><span>{String(index + 1).padStart(2, '0')}</span>{title}</button>)}</div><div className="demo-stage"><p className="erp-kicker">Step {step + 1} of {steps.length}</p><h2>{current[0]}</h2><p>{current[1]}</p><div><button className="erp-primary" onClick={() => onNavigate(current[2])}>Open {current[0]} view</button><button className="erp-secondary" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Next demo step</button></div></div></section></div>;
}
