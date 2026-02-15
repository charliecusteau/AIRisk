import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Trash2, UserPlus } from 'lucide-react';
import { listUsers, createUser, deleteUser } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: listUsers,
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createUser(name, username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setName('');
      setUsername('');
      setPassword('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Failed to create user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = (user: User) => {
    if (confirm(`Delete user "${user.name}" (${user.username})?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <div className="page-content">
      <div className="header">
        <h1 className="header-title">
          <Shield size={20} style={{ marginRight: 8 }} />
          User Management
        </h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <UserPlus size={16} />
          Create User
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginTop: 20, marginBottom: 20 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>New User</h3>
          {formError && <div className="login-error" style={{ marginBottom: 12 }}>{formError}</div>}
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? <span className="spinner" /> : 'Create'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: showForm ? 0 : 20 }}>
        {isLoading ? (
          <div className="loading-container"><span className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`risk-badge ${u.role === 'admin' ? 'medium' : 'low'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {u.last_login_at ? new Date(u.last_login_at + 'Z').toLocaleString() : 'Never'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(u.created_at + 'Z').toLocaleDateString()}
                    </td>
                    <td>
                      {u.id !== currentUser?.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(u)}
                          disabled={deleteMutation.isPending}
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
