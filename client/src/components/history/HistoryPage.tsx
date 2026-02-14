import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../layout/Header';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { RiskBadge } from '../common/RiskBadge';
import { ScoreDisplay } from '../common/ScoreDisplay';
import { useAssessments, useAssessment } from '../../hooks/useAssessments';
import { Clock, Eye } from 'lucide-react';
import type { AssessmentHistory } from '../../types';

export function HistoryPage() {
  const navigate = useNavigate();
  const { data: assessments, isLoading } = useAssessments({ sort: 'date', order: 'desc' });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <Header title="Assessment History" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Assessment list */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 12 }}>
              All Assessments
            </h3>
            {isLoading ? (
              <LoadingSpinner message="Loading..." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(assessments || []).map(a => (
                  <div
                    key={a.id}
                    className="card"
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      border: selectedId === a.id ? '1px solid var(--accent-blue)' : undefined,
                    }}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{a.company_name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
                          {a.company_sector}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ScoreDisplay score={a.composite_score} size="sm" />
                        <RiskBadge rating={a.status === 'completed' ? (a.composite_rating?.split(' ')[0].toLowerCase() || null) : a.status} size="sm" />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/assessment/${a.id}`); }}
                          title="View assessment"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      Created: {new Date(a.created_at).toLocaleString()} | Updated: {new Date(a.updated_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {(!assessments || assessments.length === 0) && (
                  <div className="empty-state">
                    <p>No assessments yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit trail */}
          {selectedId && <AuditTrail assessmentId={selectedId} />}
        </div>
      </div>
    </>
  );
}

function AuditTrail({ assessmentId }: { assessmentId: number }) {
  const { data: assessment, isLoading } = useAssessment(assessmentId);

  if (isLoading) return <LoadingSpinner message="Loading history..." />;
  if (!assessment) return null;

  // We'll fetch history from a dedicated endpoint. For now show assessment metadata as timeline.
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
        Audit Trail: {assessment.company_name}
      </h3>
      <div className="timeline">
        <div className="timeline-item">
          <div className="timeline-date">{new Date(assessment.created_at).toLocaleString()}</div>
          <div className="timeline-action">Assessment created</div>
        </div>
        {assessment.status === 'completed' && (
          <div className="timeline-item">
            <div className="timeline-date">{new Date(assessment.updated_at).toLocaleString()}</div>
            <div className="timeline-action">AI analysis completed</div>
            <div className="timeline-detail">
              Score: {assessment.composite_score}/10 ({assessment.composite_rating})
              {assessment.ai_model && ` | Model: ${assessment.ai_model}`}
            </div>
          </div>
        )}
        {assessment.user_modified === 1 && (
          <div className="timeline-item">
            <div className="timeline-date">{new Date(assessment.updated_at).toLocaleString()}</div>
            <div className="timeline-action">User overrides applied</div>
            <div className="timeline-detail">One or more domain scores were manually adjusted</div>
          </div>
        )}
        {assessment.notes && (
          <div className="timeline-item">
            <div className="timeline-date">{new Date(assessment.updated_at).toLocaleString()}</div>
            <div className="timeline-action">Notes added</div>
            <div className="timeline-detail" style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {assessment.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
