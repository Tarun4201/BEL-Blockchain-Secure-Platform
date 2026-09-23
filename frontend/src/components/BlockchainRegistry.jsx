import { useEffect, useState } from 'react';
import { erpApi } from '../api/client';

const when = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
const short = (value) => value?.length > 32 ? `${value.slice(0, 18)}…${value.slice(-8)}` : value || '—';

export function BlockchainRegistry({ token }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { erpApi.blockchainOverview(token).then(setData).catch((err) => setError(err.message)); }, [token]);
  if (error) return <div className="erp-page"><p className="erp-error">{error}</p></div>;
  if (!data) return <div className="erp-page"><p className="erp-empty">Reading verified registries from the local blockchain…</p></div>;
  return <div className="erp-page"><div className="erp-page-heading"><div><p className="erp-kicker">Administrator only · on-chain state</p><h1>Blockchain Registry</h1><p>Verified DID identities, ERC-721 asset custody, protected resources, and explicit access decisions.</p></div><div className="erp-role-badge">BLOCK {data.blockNumber}</div></div>
    <section className="erp-stat-grid"><article><small>Registered DIDs</small><strong>{data.identities.length}</strong><span>IdentityRegistry</span></article><article><small>ERC-721 assets</small><strong>{data.assets.length}</strong><span>AssetRegistry</span></article><article><small>Protected resources</small><strong>{data.resources.length}</strong><span>AccessControlManager</span></article><article><small>Access decisions</small><strong>{data.accessRecords.length}</strong><span>On-chain policy records</span></article></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Decentralized identities</h2><span>Cryptographically bound wallets</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>DID</th><th>Wallet</th><th>Role</th><th>Registered</th></tr></thead><tbody>{data.identities.map((item) => <tr key={item.did}><td>{short(item.did)}</td><td>{short(item.wallet)}</td><td><span className="erp-status">{item.role}</span></td><td>{when(item.registeredAt)}</td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>NFT asset custody</h2><span>ERC-721 owner and linked DID</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Token</th><th>Metadata</th><th>Owner DID</th><th>Token wallet</th><th>Status</th></tr></thead><tbody>{data.assets.map((item) => <tr key={item.assetId}><td>#{item.assetId}</td><td>{short(item.metadataURI)}</td><td>{short(item.currentOwnerDid)}</td><td>{short(item.tokenOwnerWallet)}</td><td><span className="erp-status">{item.status}</span></td></tr>)}</tbody></table></div></section>
    <section className="erp-panel"><div className="erp-panel-title"><h2>Access-control policy</h2><span>Smart-contract protected resources</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Resource</th><th>Sensitivity</th><th>Created</th></tr></thead><tbody>{data.resources.map((item) => <tr key={item.resourceId}><td>{item.resourceId}</td><td><span className="erp-status">{item.sensitivityLabel}</span></td><td>{when(item.createdAt)}</td></tr>)}</tbody></table></div></section>
  </div>;
}
