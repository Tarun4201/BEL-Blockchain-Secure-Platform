export function SettingsTab({ chainStatus }) {
  return (
    <div className="workspace-page">
      <div className="workspace-intro compact-intro"><div><p className="section-kicker">Workspace administration</p><h1>Settings</h1><p>Read-only environment details for this local demonstration workspace.</p></div></div>
      <section className="enterprise-panel settings-list">
        <div><span>Network</span><strong>{chainStatus?.network || 'Hardhat Local (Chain ID 31337)'}</strong></div>
        <div><span>Local chain status</span><strong>{chainStatus?.isNodeConnected ? `Connected · Block #${chainStatus.currentBlockNumber}` : 'Offline'}</strong></div>
        <div><span>Authentication model</span><strong>Prototype persona selection</strong></div>
        <div><span>Audit storage</span><strong>SQLite index reconstructed from chain events</strong></div>
      </section>
    </div>
  );
}
