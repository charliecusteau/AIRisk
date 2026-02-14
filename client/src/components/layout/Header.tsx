import React from 'react';

interface Props {
  title: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: Props) {
  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </header>
  );
}
