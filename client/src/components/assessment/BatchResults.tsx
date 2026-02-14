import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, ArrowLeft, RotateCcw } from 'lucide-react';
import type { BatchCompanyResult } from '../../types';

interface Props {
  results: BatchCompanyResult[];
  onRunAnother: () => void;
}

function ratingBadgeClass(rating?: string): string {
  if (!rating) return '';
  if (rating.includes('High')) return 'high';
  if (rating.includes('Low')) return 'low';
  return 'medium';
}

export function BatchResults({ results, onRunAnother }: Props) {
  const succeeded = results.filter(r => r.status === 'completed').length;
  const failed = results.filter(r => r.status === 'error').length;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 20, padding: '12px 16px',
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--risk-low, #22c55e)' }}>
          <CheckCircle size={16} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{succeeded} completed</span>
        </div>
        {failed > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--risk-high)' }}>
            <XCircle size={16} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{failed} failed</span>
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Company</th>
            <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Score</th>
            <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Rating</th>
            <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '10px 12px' }}>
                {r.status === 'completed'
                  ? <CheckCircle size={16} style={{ color: 'var(--risk-low, #22c55e)' }} />
                  : <XCircle size={16} style={{ color: 'var(--risk-high)' }} />
                }
              </td>
              <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-heading)' }}>
                {r.company_name}
                {r.status === 'error' && (
                  <div style={{ fontSize: 12, color: 'var(--risk-high)', fontWeight: 400, marginTop: 2 }}>
                    {r.error}
                  </div>
                )}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>
                {r.composite_score != null ? r.composite_score.toFixed(1) : '—'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                {r.composite_rating ? (
                  <span className={`risk-badge ${ratingBadgeClass(r.composite_rating)}`} style={{ fontSize: 11 }}>
                    {r.composite_rating}
                  </span>
                ) : '—'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                {r.assessment_id ? (
                  <Link
                    to={`/assessment/${r.assessment_id}`}
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    <Eye size={14} /> View
                  </Link>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Link to="/" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <button className="btn btn-primary" onClick={onRunAnother}>
          <RotateCcw size={16} /> Run Another Batch
        </button>
      </div>
    </div>
  );
}
