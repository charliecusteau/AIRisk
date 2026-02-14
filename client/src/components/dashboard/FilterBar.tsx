import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  sector: string;
  onSectorChange: (v: string) => void;
  status?: string;
  onStatusChange?: (v: string) => void;
}

const SECTORS = [
  'Cybersecurity', 'Data Management', 'Hardware / Infrastructure',
  'Office of the CFO / ERP', 'Tech Services', 'Classifieds / Marketplaces', 'Vertical Software',
  'Application Software', 'Human Capital Management', 'DevOps / Infrastructure Software',
  'CRM / Customer Engagement', 'EdTech', 'AdTech', 'Data Analytics',
];

export function FilterBar({ search, onSearchChange, sector, onSectorChange, status, onStatusChange }: Props) {
  return (
    <div className="filter-bar">
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32, width: 220 }}
          placeholder="Search companies..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <select className="form-select" value={sector} onChange={e => onSectorChange(e.target.value)}>
        <option value="all">All Sectors</option>
        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {onStatusChange && (
        <select className="form-select" value={status || 'all'} onChange={e => onStatusChange(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="analyzing">Analyzing</option>
          <option value="pending">Pending</option>
          <option value="error">Error</option>
        </select>
      )}
    </div>
  );
}
