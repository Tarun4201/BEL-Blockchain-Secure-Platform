import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function Navbar({ personas, activePersona, onSwitchPersona, chainStatus }) {
  const isOnline = chainStatus?.isNodeConnected;
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">BEL</div>
        <div>
          <div className="navbar-title">BEL Blockchain Security Platform</div>
          <div className="navbar-subtitle">Bharat Electronics Limited — Defence Grade</div>
        </div>
      </div>
      <div className="navbar-right">
        <div className="chain-status">
          <div className={`chain-dot ${isOnline ? '' : 'offline'}`} />
          <span>{isOnline ? `Block #${chainStatus.currentBlockNumber}` : 'Node Offline'}</span>
          <span style={{ color: 'var(--text-muted)' }}>· Hardhat Local</span>
        </div>
        <div className="persona-switcher">
          {personas.map(p => (
            <button
              key={p.id}
              className={`persona-btn ${activePersona?.id === p.id ? 'active' : ''}`}
              onClick={() => onSwitchPersona(p.id.toUpperCase())}
              title={`${p.name} (${p.role})`}
            >
              {p.name === 'R. Sharma' ? '👤 R. Sharma' :
               p.name === 'A. Verma' ? '🔧 A. Verma' : '🛡 Admin'}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
