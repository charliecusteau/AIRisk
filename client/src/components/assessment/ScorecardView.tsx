import React, { useState } from 'react';
import { Download, Save, Trash2 } from 'lucide-react';
import { DomainCard } from './DomainCard';
import { NarrativePanel } from './NarrativePanel';
import { ScoreDisplay } from '../common/ScoreDisplay';
import { RiskBadge } from '../common/RiskBadge';
import type { Assessment } from '../../types';
import { useUpdateNotes, useDeleteAssessment } from '../../hooks/useAssessments';
import { getExportUrl } from '../../api/client';

const DOMAIN_NAMES: Record<number, string> = {
  1: 'Customer Demand',
  2: 'Moats',
  3: 'Tech Stack',
  4: 'AI Competition',
};

interface Props {
  assessment: Assessment;
  onDeleted?: () => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function ScorecardView({ assessment, onDeleted, onToast }: Props) {
  const [notes, setNotes] = useState(assessment.notes || '');
  const updateNotes = useUpdateNotes(assessment.id);
  const deleteAssessment = useDeleteAssessment();

  const handleSaveNotes = () => {
    updateNotes.mutate(notes || null, {
      onSuccess: () => onToast?.('Notes saved', 'success'),
      onError: () => onToast?.('Failed to save notes', 'error'),
    });
  };

  const handleDelete = () => {
    if (!confirm('Delete this assessment? This cannot be undone.')) return;
    deleteAssessment.mutate(assessment.id, {
      onSuccess: () => {
        onToast?.('Assessment deleted', 'info');
        onDeleted?.();
      },
    });
  };

  return (
    <div>
      {/* Header summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ScoreDisplay score={assessment.composite_score} size="lg" />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>
                {assessment.company_name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {assessment.company_sector && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{assessment.company_sector}</span>
                )}
                <RiskBadge rating={assessment.composite_rating?.split(' ')[0].toLowerCase() || null} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {assessment.composite_rating}
                </span>
                {assessment.user_modified === 1 && (
                  <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>Modified</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={getExportUrl(assessment.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Download size={14} /> PDF
            </a>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <NarrativePanel narrative={assessment.narrative} />

      {/* Domain cards */}
      {(() => {
        const summaries = assessment.domain_summaries ? JSON.parse(assessment.domain_summaries) : {};
        return [1, 2, 3, 4].map(domainNum => (
          <DomainCard
            key={domainNum}
            domainNumber={domainNum}
            domainName={DOMAIN_NAMES[domainNum]}
            domainRating={(assessment as any)[`domain${domainNum}_rating`]}
            domainSummary={summaries[domainNum] || ''}
          />
        ));
      })()}

      {/* Notes */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 10 }}>
          Analyst Notes
        </h3>
        <textarea
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add your notes and observations..."
          rows={4}
        />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveNotes}>
            <Save size={14} /> Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
