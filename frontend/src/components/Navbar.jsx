export function Navbar({ activePersona, chainStatus, onSignOut, currentPage }) {
  const isOnline = chainStatus?.isNodeConnected;
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">BEL</div>
        <div>
          <div className="navbar-title">BEL Secure Operations</div>
          <div className="navbar-subtitle">Bharat Electronics Limited <span>/</span> {currentPage}</div>
        </div>
      </div>
      <div className="navbar-right">
        <div className="chain-status">
          <div className={`chain-dot ${isOnline ? '' : 'offline'}`} />
          <span>{isOnline ? `Block #${chainStatus.currentBlockNumber}` : 'Node Offline'}</span>
          <span style={{ color: 'var(--text-muted)' }}>· Hardhat Local</span>
        </div>
        <div className="signed-in-user">
          <span>{activePersona?.name || 'Secure session'}</span>
          <button className="sign-out-btn" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </nav>
  );
}
