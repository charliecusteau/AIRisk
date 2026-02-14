import React from 'react';

interface Props {
  size?: 'sm' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'sm', message }: Props) {
  if (message) {
    return (
      <div className="loading-container">
        <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
        <p>{message}</p>
      </div>
    );
  }

  return <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />;
}
