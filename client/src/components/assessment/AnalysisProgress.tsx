import React from 'react';
import { Bot } from 'lucide-react';

interface Props {
  message: string;
  companyName: string;
}

export function AnalysisProgress({ message, companyName }: Props) {
  return (
    <div className="progress-container">
      <Bot size={48} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
      <h3 style={{ color: 'var(--text-heading)', fontSize: 18 }}>
        Analyzing {companyName}
      </h3>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: message.includes('Complete') ? '100%' :
              message.includes('Saving') ? '80%' :
              message.includes('Parsing') ? '60%' :
              message.includes('Sending') ? '40%' : '20%',
          }}
        />
      </div>
      <p className="progress-message">{message}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Using Claude Sonnet 4.5 for analysis
      </p>
    </div>
  );
}
