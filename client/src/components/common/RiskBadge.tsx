import React from 'react';
import type { RiskRating } from '../../types';

interface Props {
  rating: RiskRating | string | null;
  size?: 'sm' | 'md';
}

export function RiskBadge({ rating, size = 'md' }: Props) {
  if (!rating) return <span className="risk-badge">N/A</span>;

  const r = rating.toLowerCase();
  let label: string;
  let cls: string;

  if (r === 'high' || r === 'high risk') {
    label = r === 'high' ? 'High' : 'High';
    cls = 'high';
  } else if (r === 'medium-high risk') {
    label = 'Med-High';
    cls = 'medium-high';
  } else if (r === 'medium' || r === 'medium risk') {
    label = 'Medium';
    cls = 'medium';
  } else if (r === 'medium-low risk') {
    label = 'Med-Low';
    cls = 'medium-low';
  } else if (r === 'low' || r === 'low risk') {
    label = r === 'low' ? 'Low' : 'Low';
    cls = 'low';
  } else {
    label = rating;
    cls = '';
  }

  return (
    <span className={`risk-badge ${cls}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 6px' } : undefined}>
      {label}
    </span>
  );
}
