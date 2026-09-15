import { useState, useEffect } from 'react';
import { api } from './api/client';
import { Navbar } from './components/Navbar';
import { IdentityTab } from './components/IdentityTab';
import { AccessControlTab } from './components/AccessControlTab';
import { AssetsTab } from './components/AssetsTab';
import { AuditTab } from './components/AuditTab';
import { TransactionToast, useToast } from './components/TransactionToast';

const TABS = [
  { id: 'identities', label: '🪪 Identities' },
  { id: 'access', label: '🔐 Access Control' },
  { id: 'assets', label: '⚙️ Digital Assets' },
  { id: 'audit', label: '📋 Audit Trail' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('identities');
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [chainStatus, setChainStatus] = useState(null);
  const { toasts, removeToast, txAction } = useToast();

  const loadPersonas = async () => {
    try {
      const { personas: ps, activePersonaId } = await api.getPersonas();
      setPersonas(ps);
      setActivePersona(ps.find(p => p.id.toUpperCase() === activePersonaId.toUpperCase()) || ps[0]);
    } catch {}
  };

  const loadStatus = async () => {
    try { setChainStatus(await api.getStatus()); } catch {}
  };

  useEffect(() => {
    loadPersonas();
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchPersona = async (personaId) => {
    try {
      await api.switchPersona(personaId);
      await loadPersonas();
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar
        personas={personas}
        activePersona={activePersona}
        onSwitchPersona={handleSwitchPersona}
        chainStatus={chainStatus}
      />

      {/* Active persona banner */}
      {activePersona && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '6px 1.5rem',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span>
            Active session:&nbsp;
            <strong style={{ color: 'var(--text-primary)' }}>{activePersona.name}</strong>
            &nbsp;·&nbsp;
            <span className={`badge badge-${activePersona.role?.toLowerCase()}`} style={{ padding: '1px 8px', fontSize: '0.62rem' }}>{activePersona.role}</span>
            &nbsp;·&nbsp;
            {activePersona.department}
          </span>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            DID: {activePersona.did}
          </span>
        </div>
      )}

      <div className="tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
        {activeTab === 'identities' && <IdentityTab activePersona={activePersona} txAction={txAction} />}
        {activeTab === 'access' && <AccessControlTab activePersona={activePersona} txAction={txAction} />}
        {activeTab === 'assets' && <AssetsTab activePersona={activePersona} txAction={txAction} />}
        {activeTab === 'audit' && <AuditTab activePersona={activePersona} />}
      </div>

      <TransactionToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
