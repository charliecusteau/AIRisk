import React from 'react';

interface Props {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreDisplay({ score, size = 'md' }: Props) {
  if (score === null) return <span>-</span>;

  const riskClass = score <= 3.5 ? 'low' : score <= 6.5 ? 'medium' : 'high';
  const dims = size === 'sm' ? 28 : size === 'lg' ? 56 : 40;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 22 : 16;

  return (
    <span
      className={`score-display ${riskClass}`}
      style={{ width: dims, height: dims, fontSize }}
    >
      {score}
    </span>
  );
}
