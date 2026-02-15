import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RiskDistribution, SectorBreakdown } from '../../types';

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

function RiskTooltipContent({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: '#1a2234',
      border: '1px solid #2a3a54',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: '#e2e8f0',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: RISK_COLORS[data.rating] || '#e2e8f0' }}>
        {data.rating} ({data.count})
      </div>
      {data.companies?.length > 0 && (
        <div style={{ color: '#e2e8f0' }}>
          {data.companies.map((name: string) => (
            <div key={name} style={{ padding: '1px 0' }}>{name}</div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            label={({ x, y, rating, count, textAnchor }) => (
              <text x={x} y={y} textAnchor={textAnchor} fill="#e2e8f0" fontSize={11}>
                {`${rating}: ${count}`}
              </text>
            )}
            labelLine={{ stroke: '#64748b' }}
          >
            {data.map((entry) => (
              <Cell key={entry.rating} fill={RISK_COLORS[entry.rating] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip content={<RiskTooltipContent />} />
        </PieChart>
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
