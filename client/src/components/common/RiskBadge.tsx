import React from 'react';
import type { RiskRating } from '../../types';

interface Props {
  rating: RiskRating | string | null;
  size?: 'sm' | 'md';
}

export function RiskBadge({ rating, size = 'md' }: Props) {
  if (!rating) return <span className="risk-badge">N/A</span>;

  const label = rating === 'high' ? 'High' : rating === 'medium' ? 'Medium' : rating === 'low' ? 'Low' : rating;
  const cls = rating === 'high' ? 'high' : rating === 'medium' ? 'medium' : rating === 'low' ? 'low' : '';

  return (
    <span className={`risk-badge ${cls}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 6px' } : undefined}>
      {label}
    </span>
  );
}
