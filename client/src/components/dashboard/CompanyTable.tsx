import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Eye } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { ScoreDisplay } from '../common/ScoreDisplay';
import type { Assessment } from '../../types';

interface Props {
  assessments: Assessment[];
  sort: string;
  order: string;
  onSort: (field: string) => void;
}

export function CompanyTable({ assessments, sort, order, onSort }: Props) {
  const navigate = useNavigate();

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th onClick={() => onSort(field)} style={{ cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sort === field && <ArrowUpDown size={12} style={{ opacity: 0.6 }} />}
      </span>
    </th>
  );

  if (assessments.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No assessments yet. Create one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <SortHeader field="name">Company</SortHeader>
              <th>Sector</th>
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
            {assessments.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assessment/${a.id}`)}>
                <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                  {a.company_name}
                  {a.user_modified === 1 && <span style={{ color: 'var(--accent-blue)', fontSize: 10, marginLeft: 6 }}>MOD</span>}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.company_sector || '-'}</td>
                <td><ScoreDisplay score={a.composite_score} size="sm" /></td>
                <td><RiskBadge rating={a.composite_rating?.split(' ')[0].toLowerCase() || null} size="sm" /></td>
                <td><RiskBadge rating={a.domain1_rating} size="sm" /></td>
                <td><RiskBadge rating={a.domain2_rating} size="sm" /></td>
                <td><RiskBadge rating={a.domain3_rating} size="sm" /></td>
                <td><RiskBadge rating={a.domain4_rating} size="sm" /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(a.updated_at).toLocaleDateString()}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/assessment/${a.id}`); }}>
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
