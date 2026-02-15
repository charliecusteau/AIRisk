import axios from 'axios';
import type { Assessment, DashboardStats, RiskDistribution, DomainBreakdown, SectorBreakdown, AssessmentHistory, PortfolioEntry, NewsAlert, NewsStatus, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// 401 interceptor — redirect to login on auth failure
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      window.location.reload();
    }
    return Promise.reject(err);
  },
);

// Auth
export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function createUser(name: string, username: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/users', { name, username, password });
  return data;
}

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get('/auth/users');
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/auth/users/${id}`);
}

// Assessments
export async function listAssessments(params?: {
  status?: string;
  sector?: string;
  sort?: string;
  order?: string;
  search?: string;
}): Promise<Assessment[]> {
  const { data } = await api.get('/assessments', { params });
  return data;
}

export async function getAssessment(id: number): Promise<Assessment> {
  const { data } = await api.get(`/assessments/${id}`);
  return data;
}

export async function createAssessment(body: {
  company_name: string;
  sector?: string;
  description?: string;
}): Promise<{ company_id: number; assessment_id: number }> {
  const { data } = await api.post('/assessments', body);
  return data;
}

export async function updateScore(
  assessmentId: number,
  scoreId: number,
  body: { user_rating: string | null; user_reasoning: string | null },
): Promise<any> {
  const { data } = await api.patch(`/assessments/${assessmentId}/scores/${scoreId}`, body);
  return data;
}

export async function updateNotes(assessmentId: number, notes: string | null): Promise<void> {
  await api.patch(`/assessments/${assessmentId}/notes`, { notes });
}

export async function deleteAssessment(id: number): Promise<void> {
  await api.delete(`/assessments/${id}`);
}

// Analysis (SSE)
export function startAnalysis(
  assessmentId: number,
  onProgress: (msg: string) => void,
  onComplete: (data: any) => void,
  onError: (msg: string) => void,
): () => void {
  const controller = new AbortController();

  fetch('/api/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessment_id: assessmentId }),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let event = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          event = line.slice(7);
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (event === 'progress') onProgress(data.message);
            else if (event === 'complete') onComplete(data);
            else if (event === 'error') onError(data.message);
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return () => controller.abort();
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/dashboard/stats');
  return data;
}

export async function getRiskDistribution(): Promise<RiskDistribution[]> {
  const { data } = await api.get('/dashboard/risk-distribution');
  return data;
}

export async function getDomainBreakdown(): Promise<DomainBreakdown[]> {
  const { data } = await api.get('/dashboard/domain-breakdown');
  return data;
}

export async function getSectorBreakdown(): Promise<SectorBreakdown[]> {
  const { data } = await api.get('/dashboard/sector-breakdown');
  return data;
}

// Portfolio
export async function getPortfolio(): Promise<PortfolioEntry[]> {
  const { data } = await api.get('/portfolio');
  return data;
}

export async function addToPortfolio(assessmentIds: number[]): Promise<PortfolioEntry[]> {
  const { data } = await api.post('/portfolio', { assessment_ids: assessmentIds });
  return data;
}

export function batchAddToPortfolio(
  params: { assessment_ids?: number[]; new_companies?: string[]; sector?: string },
  callbacks: {
    onExistingAdded?: (data: { count: number }) => void;
    onBatchStart?: (data: { total: number }) => void;
    onCompanyStart?: (data: { index: number; company_name: string }) => void;
    onProgress?: (data: { index: number; company_name: string; message: string }) => void;
    onCompanyComplete?: (data: { index: number; company_name: string; assessment_id: number }) => void;
    onCompanyError?: (data: { index: number; company_name: string; error: string }) => void;
    onComplete?: () => void;
    onError?: (msg: string) => void;
  },
): () => void {
  const controller = new AbortController();

  fetch('/api/portfolio/batch-add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError?.('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let event = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          event = line.slice(7);
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (event) {
              case 'existing_added': callbacks.onExistingAdded?.(data); break;
              case 'batch_start': callbacks.onBatchStart?.(data); break;
              case 'company_start': callbacks.onCompanyStart?.(data); break;
              case 'progress': callbacks.onProgress?.(data); break;
              case 'company_complete': callbacks.onCompanyComplete?.(data); break;
              case 'company_error': callbacks.onCompanyError?.(data); break;
              case 'complete': callbacks.onComplete?.(); break;
              case 'error': callbacks.onError?.(data.message); break;
            }
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') callbacks.onError?.(err.message);
  });

  return () => controller.abort();
}

export async function removeFromPortfolio(id: number): Promise<void> {
  await api.delete(`/portfolio/${id}`);
}

export async function updatePortfolioWeights(weights: { id: number; weight: number }[]): Promise<void> {
  await api.put('/portfolio/weights', { weights });
}

// History
export async function getAssessmentHistory(assessmentId: number): Promise<AssessmentHistory[]> {
  const { data } = await api.get(`/assessments/${assessmentId}`);
  return data.history || [];
}

// Export
export function getExportUrl(assessmentId: number): string {
  return `/api/export/${assessmentId}/pdf`;
}

// News
export async function getNewsAlerts(minRelevance?: number): Promise<NewsAlert[]> {
  const params = minRelevance ? { min_relevance: minRelevance } : undefined;
  const { data } = await api.get('/news', { params });
  return data;
}

export async function getNewsStatus(): Promise<NewsStatus> {
  const { data } = await api.get('/news/status');
  return data;
}

export function scanNews(
  onProgress: (msg: string) => void,
  onComplete: (data: { alert_count: number }) => void,
  onError: (msg: string) => void,
): () => void {
  const controller = new AbortController();

  fetch('/api/news/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let event = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          event = line.slice(7);
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (event === 'progress') onProgress(data.message);
            else if (event === 'complete') onComplete(data);
            else if (event === 'error') onError(data.message);
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return () => controller.abort();
}
