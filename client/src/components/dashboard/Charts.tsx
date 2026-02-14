import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RiskDistribution, DomainBreakdown, SectorBreakdown } from '../../types';

const RISK_COLORS: Record<string, string> = {
  'High Risk': '#ef4444',
  'Medium-High Risk': '#f97316',
  'Medium Risk': '#f59e0b',
  'Medium-Low Risk': '#84cc16',
  'Low Risk': '#22c55e',
};

const tooltipStyle = {
  contentStyle: {
    background: '#1a2234',
    border: '1px solid #2a3a54',
    borderRadius: 8,
    fontSize: 12,
    color: '#e2e8f0',
  },
};

export function RiskDonutChart({ data }: { data: RiskDistribution[] }) {
  if (data.length === 0) return <div className="empty-state"><p>No data yet</p></div>;

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>Risk Distribution</div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="count"
            nameKey="rating"
            label={({ rating, count }) => `${rating}: ${count}`}
            labelLine={{ stroke: '#64748b' }}
          >
            {data.map((entry) => (
              <Cell key={entry.rating} fill={RISK_COLORS[entry.rating] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DomainBreakdownChart({ data }: { data: DomainBreakdown[] }) {
  if (data.length === 0) return <div className="empty-state"><p>No data yet</p></div>;

  const shortNames = data.map(d => ({
    ...d,
    domain: d.domain.length > 20 ? d.domain.substring(0, 18) + '...' : d.domain,
  }));

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>Domain Risk Breakdown</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={shortNames} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis type="category" dataKey="domain" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="high" stackId="a" fill="#ef4444" name="High" radius={[0, 0, 0, 0]} />
          <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
          <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SectorBreakdownChart({ data }: { data: SectorBreakdown[] }) {
  if (data.length === 0) return <div className="empty-state"><p>No data yet</p></div>;

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>Avg Risk Score by Sector</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ left: 10, right: 20, bottom: 40 }}>
          <XAxis
            dataKey="sector"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number) => [value.toFixed(1), 'Avg Score']}
          />
          <Bar dataKey="avg_score" fill="#3b82f6" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.sector}
                fill={entry.avg_score <= 3.5 ? '#22c55e' : entry.avg_score <= 6.5 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
