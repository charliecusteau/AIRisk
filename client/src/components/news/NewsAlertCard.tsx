import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { NewsAlert } from '../../types';

interface NewsAlertCardProps {
  alert: NewsAlert;
}

const COMPETITOR_TYPE_LABELS: Record<string, string> = {
  foundation_lab: 'Foundation Lab',
  ai_native: 'AI Native',
  incumbent: 'Incumbent',
};

export function NewsAlertCard({ alert }: NewsAlertCardProps) {
  const [expanded, setExpanded] = useState(false);

  const competitorLabel = alert.competitor_type
    ? COMPETITOR_TYPE_LABELS[alert.competitor_type] || alert.competitor_type
    : null;

  return (
    <div className="news-card">
      <div className="news-card-header">
        <div className="news-card-title-row">
          <h3 className="news-card-headline">{alert.headline}</h3>
          <div className="news-card-badges">
            {alert.competitor && (
              <span className={`competitor-badge ${alert.competitor_type || ''}`}>
                {alert.competitor}
                {competitorLabel && <span className="competitor-type-label"> ({competitorLabel})</span>}
              </span>
            )}
            <span className="relevance-bar" title={`Relevance: ${alert.relevance_score}/10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={`relevance-dot ${i < alert.relevance_score ? 'filled' : ''}`}
                />
              ))}
            </span>
          </div>
        </div>
        <p className="news-card-summary">{alert.summary}</p>
        <div className="news-card-meta">
          {alert.source_url ? (
            <a href={alert.source_url} target="_blank" rel="noopener noreferrer" className="news-source-link">
              {alert.source || 'Source'} <ExternalLink size={12} />
            </a>
          ) : alert.source ? (
            <span className="news-source">{alert.source}</span>
          ) : null}
          {alert.published_date && (
            <span className="news-date">{alert.published_date}</span>
          )}
        </div>
      </div>

      {alert.impacts.length > 0 && (
        <div className="news-card-impacts-section">
          <button
            className="news-card-impacts-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {alert.impacts.length} portfolio {alert.impacts.length === 1 ? 'company' : 'companies'} impacted
          </button>
          {expanded && (
            <div className="news-card-impacts-list">
              {alert.impacts.map((impact, i) => (
                <div key={i} className="impact-row">
                  <span className="impact-company">{impact.company_name}</span>
                  <span className="impact-explanation">{impact.impact_explanation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
