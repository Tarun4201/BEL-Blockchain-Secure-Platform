import { useState } from 'react';

const PROFILES = {
  ADMIN: {
    id: 'ADMIN',
    label: 'Security Administrator',
    icon: '◆',
    description: 'Identity, asset custody and audit administration',
    employeeId: 'BEL-EMP-78421',
    workspace: 'Administrative workspace',
  },
  SHARMA: {
    id: 'SHARMA',
    label: 'Engineering Officer',
    icon: '◈',
    description: 'Identity and protected-resource workspace',
    employeeId: 'BEL-EMP-78421',
    workspace: 'Engineering workspace',
  },
  VERMA: {
    id: 'VERMA',
    label: 'Technical Officer',
    icon: '◉',
    description: 'Assigned asset and custody workspace',
    employeeId: 'BEL-EMP-78421',
    workspace: 'Technical workspace',
  },
};

export function LoginPortal({ chainStatus, onSignIn }) {
  const [selectedId, setSelectedId] = useState('ADMIN');
  const [employeeId, setEmployeeId] = useState(PROFILES.ADMIN.employeeId);
  const [passcode, setPasscode] = useState('123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selected = PROFILES[selectedId];
  const online = chainStatus?.isNodeConnected;

  const selectProfile = (id) => {
    setSelectedId(id);
    setEmployeeId(PROFILES[id].employeeId);
    setPasscode('123');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!employeeId.trim() || !passcode.trim()) {
      setError('Enter your BEL employee ID and secure passcode to continue.');
      return;
    }
    if (employeeId.trim() !== selected.employeeId || passcode !== '123') {
      setError('For this prototype, use BEL-EMP-78421 and passcode 123.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onSignIn(selectedId);
    } catch {
      setError('The secure workspace is unavailable. Check the local service and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-mark" aria-hidden="true">BEL</div>
        <p className="login-eyebrow">Bharat Electronics Limited</p>
        <h1>Secure Operations Portal</h1>
        <p className="login-intro">
          A unified prototype for verified personnel identity, controlled access and accountable defence-asset custody.
        </p>

        <div className="login-assurance-list" aria-label="Platform capabilities">
          <div><span>01</span><p><strong>Verified identity</strong><br />DID-linked personnel profiles</p></div>
          <div><span>02</span><p><strong>Controlled access</strong><br />Explicit approval workflow</p></div>
          <div><span>03</span><p><strong>Auditable custody</strong><br />Blockchain-recorded events</p></div>
        </div>

        <div className="login-environment">
          <span className={`login-status-dot ${online ? '' : 'offline'}`} />
          {online ? `Secure local network · Block #${chainStatus.currentBlockNumber}` : 'Local network unavailable'}
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <p className="login-eyebrow">Protected workspace</p>
          <h2>Sign in to continue</h2>
          <p className="login-helper">Choose your operational profile, then use the supplied demo credentials.</p>

          <div className="profile-picker" role="list" aria-label="Choose access profile">
            {Object.values(PROFILES).map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`profile-choice ${selectedId === profile.id ? 'selected' : ''}`}
                onClick={() => selectProfile(profile.id)}
              >
                <span className="profile-choice-icon">{profile.icon}</span>
                <span><strong>{profile.label}</strong><small>{profile.description}</small></span>
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-profile-note">
              <span>{selected.icon}</span>
              <div><strong>{selected.workspace}</strong><small>Selected access profile</small></div>
            </div>
            <label htmlFor="employee-id">BEL employee ID</label>
            <input
              id="employee-id"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="e.g. BEL-ADMIN-001"
              autoComplete="username"
            />
            <label htmlFor="secure-passcode">Secure passcode</label>
            <input
              id="secure-passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter your passcode"
              autoComplete="current-password"
            />
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="login-submit" type="submit" disabled={isSubmitting || !online}>
              {isSubmitting ? 'Verifying secure session…' : 'Sign in to secure workspace'}
            </button>
          </form>

          <p className="login-demo-note">Prototype access: employee ID <strong>BEL-EMP-78421</strong> · passcode <strong>123</strong>.</p>
        </div>
        <footer className="login-footer">BEL Secure Operations Platform <span>·</span> Internal demonstration environment</footer>
      </section>
    </main>
  );
}
