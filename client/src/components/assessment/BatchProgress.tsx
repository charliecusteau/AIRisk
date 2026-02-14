import React from 'react';
import { Bot, CheckCircle, Circle, Loader } from 'lucide-react';
import type { BatchCompanyResult } from '../../types';

interface CompanyStatus {
  name: string;
  state: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: BatchCompanyResult;
  progressMsg?: string;
}

interface Props {
  companies: CompanyStatus[];
  currentIndex: number;
  total: number;
}

function ratingBadgeClass(rating?: string): string {
  if (!rating) return '';
  if (rating.includes('High')) return 'high';
  if (rating.includes('Low')) return 'low';
  return 'medium';
}

export function BatchProgress({ companies, currentIndex, total }: Props) {
  const completed = companies.filter(c => c.state === 'completed' || c.state === 'error').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = companies[currentIndex];

  return (
    <div className="progress-container" style={{ alignItems: 'stretch', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Bot size={40} style={{ color: 'var(--accent-blue)', opacity: 0.8, marginBottom: 8 }} />
        <h3 style={{ color: 'var(--text-heading)', fontSize: 18, margin: 0 }}>
          Analyzing {completed} of {total}: {current?.name || '...'}
        </h3>
        {current?.progressMsg && (
          <p className="progress-message" style={{ marginTop: 4 }}>{current.progressMsg}</p>
        )}
      </div>

      <div className="progress-bar-track" style={{ marginBottom: 20 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {companies.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: c.state === 'analyzing' ? 'var(--accent-blue-bg, rgba(59,130,246,0.06))' : 'transparent',
              fontSize: 14,
            }}
          >
            {c.state === 'completed' && <CheckCircle size={16} style={{ color: 'var(--risk-low, #22c55e)', flexShrink: 0 }} />}
            {c.state === 'analyzing' && <Loader size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />}
            {c.state === 'error' && <span style={{ color: 'var(--risk-high)', fontSize: 16, flexShrink: 0 }}>&#10007;</span>}
            {c.state === 'pending' && <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}

            <span style={{
              flex: 1,
              color: c.state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
              fontWeight: c.state === 'analyzing' ? 500 : 400,
            }}>
              {c.name}
            </span>

            {c.state === 'completed' && c.result?.composite_rating && (
              <span className={`risk-badge ${ratingBadgeClass(c.result.composite_rating)}`} style={{ fontSize: 11 }}>
                {c.result.composite_rating}
              </span>
            )}
            {c.state === 'error' && (
              <span style={{ fontSize: 12, color: 'var(--risk-high)' }}>Failed</span>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
        Using Claude Sonnet 4.5 for analysis
      </p>
    </div>
  );
}

export type { CompanyStatus };
