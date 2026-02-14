import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { NewAssessmentPage } from './components/assessment/NewAssessmentPage';
import { AssessmentDetailPage } from './components/assessment/AssessmentDetailPage';
import { ComparisonPage } from './components/comparison/ComparisonPage';
import { HistoryPage } from './components/history/HistoryPage';
import { BatchAnalysisPage } from './components/assessment/BatchAnalysisPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/new" element={<NewAssessmentPage />} />
              <Route path="/assessment/:id" element={<AssessmentDetailPage />} />
              <Route path="/compare" element={<ComparisonPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/batch" element={<BatchAnalysisPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
