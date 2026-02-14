import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Layers, GitCompare, History, Radar } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Radar size={20} />
        <span>Chuck</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/new" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={18} />
          New Assessment
        </NavLink>
        <NavLink to="/batch" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Layers size={18} />
          Batch Analysis
        </NavLink>
        <NavLink to="/compare" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <GitCompare size={18} />
          Compare
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <History size={18} />
          History
        </NavLink>
      </nav>
    </aside>
  );
}
