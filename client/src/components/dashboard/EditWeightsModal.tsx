import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { PortfolioEntry } from '../../types';

interface Props {
  entries: PortfolioEntry[];
  onSave: (weights: { id: number; weight: number }[]) => void;
  onClose: () => void;
  saving: boolean;
}

export function EditWeightsModal({ entries, onSave, onClose, saving }: Props) {
  const [dollars, setDollars] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const e of entries) {
      // Seed with a proportional dollar amount based on current weight
      init[e.id] = '';
    }
    return init;
  });

  const totalDollars = useMemo(() => {
    return entries.reduce((sum, e) => {
      const val = parseFloat(dollars[e.id] || '0') || 0;
      return sum + val;
    }, 0);
  }, [dollars, entries]);

  const weights = useMemo(() => {
    const result: Record<number, number> = {};
    for (const e of entries) {
      const val = parseFloat(dollars[e.id] || '0') || 0;
      result[e.id] = totalDollars > 0 ? Math.round((val / totalDollars) * 1000) / 10 : 0;
    }
    return result;
  }, [dollars, entries, totalDollars]);

  const handleDollarChange = (id: number, value: string) => {
    // Allow digits, dots, commas
    const cleaned = value.replace(/[^0-9.,]/g, '');
    setDollars(prev => ({ ...prev, [id]: cleaned }));
  };

  const parseDollar = (val: string): number => {
    return parseFloat(val.replace(/,/g, '')) || 0;
  };

  const handleSave = () => {
    if (totalDollars === 0) return;

    // Calculate precise weights that sum to exactly 100
    const raw = entries.map(e => ({
      id: e.id,
      dollars: parseDollar(dollars[e.id] || '0'),
    }));
    const total = raw.reduce((s, r) => s + r.dollars, 0);

    let allocated = 0;
    const result = raw.map((r, i) => {
      if (i === raw.length - 1) {
        // Last entry gets remainder to ensure sum = 100
        return { id: r.id, weight: Math.round((100 - allocated) * 100) / 100 };
      }
      const w = Math.round((r.dollars / total) * 100 * 100) / 100;
      allocated += w;
      return { id: r.id, weight: w };
    });

    onSave(result);
  };

  const allEmpty = totalDollars === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Portfolio Weights</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Enter dollar amounts invested. Weights will be calculated automatically.
        </p>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th style={{ width: 150 }}>$ Invested</th>
                <th style={{ width: 80, textAlign: 'right' }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.company_name}</td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      value={dollars[e.id] || ''}
                      onChange={ev => handleDollarChange(e.id, ev.target.value)}
                      placeholder="0"
                      style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {weights[e.id]?.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  ${totalDollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {totalDollars > 0 ? '100.0%' : '0.0%'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={allEmpty || saving}>
            {saving ? <span className="spinner" /> : 'Save Weights'}
          </button>
        </div>
      </div>
    </div>
  );
}
