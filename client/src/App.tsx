import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { NewAssessmentPage } from './components/assessment/NewAssessmentPage';
import { AssessmentDetailPage } from './components/assessment/AssessmentDetailPage';
import { NewsRadarPage } from './components/news/NewsRadarPage';
import { AdminPage } from './components/admin/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-container">
          <span className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new" element={<NewAssessmentPage />} />
          <Route path="/assessment/:id" element={<AssessmentDetailPage />} />
          <Route path="/news" element={<NewsRadarPage />} />
          {isAdmin && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
