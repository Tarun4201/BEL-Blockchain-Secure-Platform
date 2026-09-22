import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    if (toast.type === 'confirmed' || toast.type === 'error') {
      setTimeout(() => removeToast(id), 7000);
    }
    return id;
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const updateToast = (id, updates) =>
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

  const txAction = async (label, actionFn) => {
    const id = addToast({ type: 'pending', title: label, body: 'Submitting to blockchain...' });
    try {
      const result = await actionFn();
      updateToast(id, {
        type: 'confirmed',
        title: `✓ ${label}`,
        body: 'Confirmed on-chain. Cryptographic identifiers are retained by the protected backend.',
      });
      setTimeout(() => removeToast(id), 7000);
      return result;
    } catch (err) {
      updateToast(id, { type: 'error', title: `✗ ${label}`, body: err.message });
      setTimeout(() => removeToast(id), 10000);
      throw err;
    }
  };

  return { toasts, addToast, removeToast, txAction };
}

export function TransactionToast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
          <div className="toast-title">
            {t.type === 'pending' && <span className="spinner" />}
            {t.title}
          </div>
          <div className="toast-body">{t.body}</div>
        </div>
      ))}
    </div>
  );
}
