import React, { useState } from 'react';
import { Header } from '../layout/Header';
import { RiskBadge } from '../common/RiskBadge';
import { ScoreDisplay } from '../common/ScoreDisplay';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAssessments, useAssessment } from '../../hooks/useAssessments';
import type { Assessment, DomainScore } from '../../types';

const DOMAIN_NAMES: Record<number, string> = {
  1: 'Customer Demand',
  2: 'Moats',
  3: 'Tech Stack',
  4: 'AI Competition',
};

export function ComparisonPage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: allAssessments, isLoading } = useAssessments({ status: 'completed' });

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  return (
    <>
      <Header title="Compare Assessments" />
      <div className="page-content">
        {/* Selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 10 }}>
            Select companies to compare (up to 5)
          </h3>
          {isLoading ? (
            <LoadingSpinner message="Loading assessments..." />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(allAssessments || []).map(a => (
                <button
                  key={a.id}
                  className={`btn ${selectedIds.includes(a.id) ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => toggleSelection(a.id)}
                >
                  {a.company_name}
                </button>
              ))}
              {(!allAssessments || allAssessments.length === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No completed assessments available</p>
              )}
            </div>
          )}
        </div>

        {/* Comparison matrix */}
        {selectedIds.length >= 2 && (
          <ComparisonMatrix selectedIds={selectedIds} />
        )}

        {selectedIds.length < 2 && selectedIds.length > 0 && (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
              Select at least 2 companies to compare
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function ComparisonMatrix({ selectedIds }: { selectedIds: number[] }) {
  const queries = selectedIds.map(id => useAssessment(id));
  const isLoading = queries.some(q => q.isLoading);
  const assessments = queries.map(q => q.data).filter(Boolean) as Assessment[];

  if (isLoading) return <LoadingSpinner message="Loading comparison data..." />;

  const cols = assessments.length + 1;

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: 160 }}>Metric</th>
            {assessments.map(a => (
              <th key={a.id} style={{ textAlign: 'center', textTransform: 'none', fontWeight: 600, fontSize: 13 }}>
                {a.company_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600 }}>Sector</td>
            {assessments.map(a => (
              <td key={a.id} style={{ textAlign: 'center', fontSize: 12 }}>{a.company_sector || '-'}</td>
            ))}
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Composite Score</td>
            {assessments.map(a => (
              <td key={a.id} style={{ textAlign: 'center' }}>
                <ScoreDisplay score={a.composite_score} size="sm" />
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Rating</td>
            {assessments.map(a => (
              <td key={a.id} style={{ textAlign: 'center', fontSize: 12 }}>{a.composite_rating}</td>
            ))}
          </tr>
          {[1, 2, 3, 4].map(d => (
            <tr key={d}>
              <td style={{ fontWeight: 600 }}>D{d}: {DOMAIN_NAMES[d]}</td>
              {assessments.map(a => (
                <td key={a.id} style={{ textAlign: 'center' }}>
                  <RiskBadge rating={(a as any)[`domain${d}_rating`]} size="sm" />
                </td>
              ))}
            </tr>
          ))}
          {/* Sub-question details for each domain */}
          {[1, 2, 3, 4].map(d => {
            const firstAssessment = assessments.find(a => a.domain_scores?.some(s => s.domain_number === d));
            const questions = firstAssessment?.domain_scores?.filter(s => s.domain_number === d) || [];

            return questions.map(q => (
              <tr key={`${d}-${q.question_key}`}>
                <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {q.question_key.replace(/_/g, ' ')}
                </td>
                {assessments.map(a => {
                  const score = a.domain_scores?.find(s => s.question_key === q.question_key);
                  return (
                    <td key={a.id} style={{ textAlign: 'center' }}>
                      {score ? <RiskBadge rating={score.effective_rating} size="sm" /> : '-'}
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
