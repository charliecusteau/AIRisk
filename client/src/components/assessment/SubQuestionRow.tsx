import React, { useState } from 'react';
import { Edit3, X } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import type { DomainScore, RiskRating } from '../../types';

interface Props {
  score: DomainScore;
  onUpdate: (userRating: RiskRating | null, userReasoning: string | null) => void;
}

export function SubQuestionRow({ score, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [overrideRating, setOverrideRating] = useState<RiskRating | null>(score.user_rating);
  const [overrideReasoning, setOverrideReasoning] = useState(score.user_reasoning || '');

  const handleSave = () => {
    onUpdate(overrideRating, overrideReasoning || null);
    setEditing(false);
  };

  const handleClear = () => {
    setOverrideRating(null);
    setOverrideReasoning('');
    onUpdate(null, null);
    setEditing(false);
  };

  return (
    <div className="question-row">
      <div className="question-header">
        <span className="question-text">{score.question_text}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className="confidence-badge">
            {score.ai_confidence} conf
          </span>
          <RiskBadge rating={score.effective_rating} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(!editing)}
            title="Override rating"
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>

      <p className="question-reasoning">
        {score.user_reasoning || score.ai_reasoning}
      </p>

      {score.user_rating && !editing && (
        <div style={{ fontSize: 11, color: 'var(--accent-blue)', marginTop: 4 }}>
          User override applied (AI rated: {score.ai_rating})
        </div>
      )}

      {editing && (
        <div className="override-controls">
          <div className="rating-toggle">
            {(['low', 'medium', 'high'] as RiskRating[]).map(r => (
              <button
                key={r}
                type="button"
                className={overrideRating === r ? `selected ${r}` : ''}
                onClick={() => setOverrideRating(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            className="form-input"
            style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}
            placeholder="Override reasoning (optional)"
            value={overrideReasoning}
            onChange={e => setOverrideReasoning(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          {score.user_rating && (
            <button className="btn btn-ghost btn-sm" onClick={handleClear} title="Clear override">
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
