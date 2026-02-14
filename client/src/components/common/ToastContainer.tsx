import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Info size={16} />}
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button className="btn-ghost" onClick={() => onRemove(toast.id)} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
