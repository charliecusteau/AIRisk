import React from 'react';
import { Search } from 'lucide-react';

interface ScanProgressProps {
  message: string;
}

export function ScanProgress({ message }: ScanProgressProps) {
  return (
    <div className="scan-progress-overlay">
      <div className="scan-progress-content">
        <Search size={24} className="scan-icon" />
        <div className="spinner" />
        <p className="progress-message">{message}</p>
      </div>
    </div>
  );
}
