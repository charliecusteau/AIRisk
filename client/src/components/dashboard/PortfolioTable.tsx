import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Eye, Trash2, Plus, Settings2 } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { ScoreDisplay } from '../common/ScoreDisplay';
import type { PortfolioEntry } from '../../types';

interface Props {
  entries: PortfolioEntry[];
  sort: string;
  order: string;
  onSort: (field: string) => void;
  onRemove: (id: number) => void;
  onAddCompanies: () => void;
  onEditWeights: () => void;
}

export function PortfolioTable({ entries, sort, order, onSort, onRemove, onAddCompanies, onEditWeights }: Props) {
  const navigate = useNavigate();

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-secondary btn-sm" onClick={onEditWeights}>
          <Settings2 size={14} /> Edit Weights
        </button>
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
              <SortHeader field="weight">Weight</SortHeader>
              <SortHeader field="score">Score</SortHeader>
              <th>Rating</th>
              <th>Demand</th>
              <th>Moat</th>
              <th>Tech</th>
              <th>AI Comp.</th>
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
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.weight.toFixed(1)}%</td>
                <td><ScoreDisplay score={e.composite_score} size="sm" /></td>
                <td><RiskBadge rating={e.composite_rating || null} size="sm" /></td>
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
