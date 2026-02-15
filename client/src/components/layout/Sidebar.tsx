import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Bot, Radar, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Bot size={20} />
        <span>Chuck</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/new" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={18} />
          New Assessment
        </NavLink>
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          Portfolio Dashboard
        </NavLink>
        <NavLink to="/news" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Radar size={18} />
          Radar
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Shield size={18} />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-email">{user?.username}</div>
        </div>
        <button className="btn btn-ghost btn-sm sidebar-logout" onClick={logout} title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
