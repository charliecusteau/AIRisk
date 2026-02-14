import React from 'react';
import type { DashboardStats } from '../../types';

interface Props {
  stats: DashboardStats;
}

export function StatsCards({ stats }: Props) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Companies Assessed</div>
        <div className="stat-value">{stats.total_companies}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Assessments</div>
        <div className="stat-value">{stats.total_assessments}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Avg Risk Score</div>
        <div className="stat-value" style={{
          color: stats.avg_composite_score <= 3.5 ? 'var(--risk-low)' :
            stats.avg_composite_score <= 6.5 ? 'var(--risk-medium)' : 'var(--risk-high)'
        }}>
          {stats.avg_composite_score}
        </div>
        <div className="stat-sub">out of 10</div>
      </div>
    </div>
  );
}
