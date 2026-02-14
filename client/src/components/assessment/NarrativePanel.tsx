import React from 'react';
import { FileText } from 'lucide-react';

interface Props {
  narrative: string | null;
}

export function NarrativePanel({ narrative }: Props) {
  if (!narrative) return null;

  return (
    <div className="narrative-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>
          AI Narrative Analysis
        </h3>
      </div>
      <div className="narrative-text">{narrative}</div>
    </div>
  );
}
