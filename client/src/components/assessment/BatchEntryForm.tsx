import React, { useState, useMemo } from 'react';
import { Layers, ArrowRight } from 'lucide-react';

const SECTORS = [
  'Cybersecurity', 'Data Management', 'Hardware / Infrastructure',
  'Office of the CFO / ERP', 'Tech Services', 'Classifieds / Marketplaces', 'Vertical Software',
  'Application Software', 'Human Capital Management', 'DevOps / Infrastructure Software',
  'CRM / Customer Engagement', 'EdTech', 'AdTech', 'Data Analytics',
  'Other',
];

const MAX_COMPANIES = 20;

interface Props {
  onSubmit: (companies: string[], sector?: string) => void;
  isLoading: boolean;
}

export function BatchEntryForm({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState('');
  const [sector, setSector] = useState('');

  const companies = useMemo(() =>
    text.split('\n').map(l => l.trim()).filter(Boolean),
    [text],
  );

  const count = companies.length;
  const tooMany = count > MAX_COMPANIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0 || tooMany) return;
    onSubmit(companies, sector || undefined);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <div className="form-group">
        <label className="form-label">Company Names *</label>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>
          Enter one company name per line (max {MAX_COMPANIES})
        </p>
        <textarea
          className="form-textarea"
          placeholder={"Salesforce\nServiceNow\nPalantir\nDatadog\nCrowdStrike"}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          autoFocus
          style={{ fontFamily: 'inherit' }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 4,
          fontSize: 12, color: tooMany ? 'var(--risk-high)' : 'var(--text-muted)',
        }}>
          <span>{count} {count === 1 ? 'company' : 'companies'}</span>
          {tooMany && <span>Maximum {MAX_COMPANIES} companies allowed</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Sector for all companies (optional)</label>
        <select className="form-select" value={sector} onChange={e => setSector(e.target.value)}>
          <option value="">AI will identify sector for each</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <button
        className="btn btn-primary btn-lg"
        type="submit"
        disabled={count === 0 || tooMany || isLoading}
      >
        {isLoading ? 'Starting...' : (
          <>
            <Layers size={16} />
            Analyze {count} {count === 1 ? 'Company' : 'Companies'}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
