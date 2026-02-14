import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Assessment } from '../../types';

interface Props {
  assessments: Assessment[];
  portfolioAssessmentIds: Set<number>;
  onAdd: (ids: number[]) => void;
  onClose: () => void;
  isAdding: boolean;
}

export function AddToPortfolioModal({ assessments, portfolioAssessmentIds, onAdd, onClose, isAdding }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const available = assessments.filter(
    a => a.status === 'completed' && !portfolioAssessmentIds.has(a.id)
  );

  const filtered = available.filter(
    a => a.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
  };

  return (
    <Modal title="Add Companies to Portfolio" onClose={onClose}>
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            {available.length === 0 ? 'No completed assessments available to add.' : 'No matches found.'}
          </p>
        ) : (
          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            {filtered.map(a => (
              <label
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selected.has(a.id) ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggle(a.id)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.company_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {a.company_sector || 'No sector'} &middot; Score: {a.composite_score ?? '-'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0 || isAdding}
            onClick={handleAdd}
          >
            {isAdding ? 'Adding...' : `Add ${selected.size} Selected`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
