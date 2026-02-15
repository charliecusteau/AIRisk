import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface Props {
  onSubmit: (name: string, sector?: string, description?: string) => void;
  isLoading: boolean;
}

export function CompanyEntryForm({ onSubmit, isLoading }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), undefined, description || undefined);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <div className="form-group">
        <label className="form-label">Company Name *</label>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="e.g. Salesforce, ServiceNow, Palantir..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Additional Context (optional)</label>
        <textarea
          className="form-textarea"
          placeholder="Any specific context about the company or its products..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <button className="btn btn-primary btn-lg" type="submit" disabled={!name.trim() || isLoading}>
        {isLoading ? 'Creating...' : 'Run AI Assessment'}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
