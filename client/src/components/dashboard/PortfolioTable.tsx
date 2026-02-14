import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Eye, Trash2, Save, Plus } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { ScoreDisplay } from '../common/ScoreDisplay';
import type { PortfolioEntry } from '../../types';

interface Props {
  entries: PortfolioEntry[];
  sort: string;
  order: string;
  onSort: (field: string) => void;
  onRemove: (id: number) => void;
  onSaveWeights: (weights: { id: number; weight: number }[]) => void;
  onAddCompanies: () => void;
  isSavingWeights: boolean;
}

export function PortfolioTable({ entries, sort, order, onSort, onRemove, onSaveWeights, onAddCompanies, isSavingWeights }: Props) {
  const navigate = useNavigate();
  const [editedWeights, setEditedWeights] = useState<Record<number, string>>({});
  const [hasEdits, setHasEdits] = useState(false);

  useEffect(() => {
    const initial: Record<number, string> = {};
    entries.forEach(e => { initial[e.id] = String(e.weight); });
    setEditedWeights(initial);
    setHasEdits(false);
  }, [entries]);

  const handleWeightChange = (id: number, value: string) => {
    setEditedWeights(prev => ({ ...prev, [id]: value }));
    setHasEdits(true);
  };

  const totalWeight = Object.values(editedWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const weightValid = Math.abs(totalWeight - 100) < 0.1;

  const handleSave = () => {
    const weights = Object.entries(editedWeights).map(([id, w]) => ({
      id: Number(id),
      weight: parseFloat(w) || 0,
    }));
    onSaveWeights(weights);
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th onClick={() => onSort(field)} style={{ cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sort === field && <ArrowUpDown size={12} style={{ opacity: 0.6 }} />}
      </span>
    </th>
  );

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No companies in portfolio yet.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onAddCompanies}>
            <Plus size={14} /> Add Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: weightValid ? 'var(--text-secondary)' : 'var(--risk-high)' }}>
            Total: {totalWeight.toFixed(1)}%{!weightValid && ' (must = 100%)'}
          </span>
          {hasEdits && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!weightValid || isSavingWeights}>
              <Save size={12} /> Save Weights
            </button>
          )}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onAddCompanies}>
          <Plus size={14} /> Add Companies
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <SortHeader field="name">Company</SortHeader>
              <th>Sector</th>
              <th>Weight %</th>
              <SortHeader field="score">Score</SortHeader>
              <th>Rating</th>
              <th>D1</th>
              <th>D2</th>
              <th>D3</th>
              <th>D4</th>
              <SortHeader field="date">Date</SortHeader>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td
                  style={{ fontWeight: 600, color: 'var(--text-heading)', cursor: 'pointer' }}
                  onClick={() => navigate(`/assessment/${e.assessment_id}`)}
                >
                  {e.company_name}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{e.company_sector || '-'}</td>
                <td>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 70, padding: '4px 6px', fontSize: 12, textAlign: 'right' }}
                    value={editedWeights[e.id] ?? ''}
                    onChange={ev => handleWeightChange(e.id, ev.target.value)}
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </td>
                <td><ScoreDisplay score={e.composite_score} size="sm" /></td>
                <td><RiskBadge rating={e.composite_rating?.split(' ')[0].toLowerCase() || null} size="sm" /></td>
                <td><RiskBadge rating={e.domain1_rating} size="sm" /></td>
                <td><RiskBadge rating={e.domain2_rating} size="sm" /></td>
                <td><RiskBadge rating={e.domain3_rating} size="sm" /></td>
                <td><RiskBadge rating={e.domain4_rating} size="sm" /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(e.updated_at).toLocaleDateString()}
                </td>
                <td>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/assessment/${e.assessment_id}`)}>
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemove(e.id)} style={{ color: 'var(--risk-high)' }}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
