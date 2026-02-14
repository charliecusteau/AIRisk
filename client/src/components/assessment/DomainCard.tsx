import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import type { RiskRating } from '../../types';

interface Props {
  domainNumber: number;
  domainName: string;
  domainRating: RiskRating | null;
  domainSummary?: string;
}

export function DomainCard({ domainNumber, domainName, domainRating, domainSummary }: Props) {
  return (
    <div className="domain-card">
      <div className="domain-card-header">
        <div className="domain-card-title">
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>
            Domain {domainNumber}:
          </span>
          {domainName}
        </div>
        <RiskBadge rating={domainRating} />
      </div>

      {domainSummary && (
        <div className="domain-card-body">
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {domainSummary}
          </p>
        </div>
      )}
    </div>
  );
}
