export function OrganizationsTab() {
  return (
    <div className="workspace-page">
      <div className="workspace-intro compact-intro"><div><p className="section-kicker">Enterprise directory</p><h1>Organizations</h1><p>Organizational context for the BEL secure-operations prototype.</p></div></div>
      <section className="enterprise-panel organization-detail">
        <div className="organization-mark">BEL</div>
        <div><p className="section-kicker">Primary organization</p><h2>Bharat Electronics Limited</h2><p>Defence electronics operations with identity, access, and asset-custody records managed through this demonstration workspace.</p></div>
      </section>
      <section className="enterprise-panel table-panel">
        <div className="panel-heading"><div><h2>Operational locations</h2><p>Locations represented by the currently seeded protected resources.</p></div></div>
        <div className="table-wrap enterprise-table-wrap"><table className="enterprise-table"><thead><tr><th>Location</th><th>Operational context</th><th>Classification</th></tr></thead><tbody>
          <tr><td>Bengaluru</td><td>Radar Test Bay 3</td><td>Restricted</td></tr>
          <tr><td>Ghaziabad</td><td>Electronic Warfare Lab</td><td>Secret</td></tr>
          <tr><td>Hyderabad</td><td>Avionics Telemetry Hub</td><td>Confidential</td></tr>
        </tbody></table></div>
      </section>
    </div>
  );
}
