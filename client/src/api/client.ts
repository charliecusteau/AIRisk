import axios from 'axios';
import type { Assessment, DashboardStats, RiskDistribution, DomainBreakdown, SectorBreakdown, AssessmentHistory, PortfolioEntry } from '../types';

const api = axios.create({
  baseURL: '/api',
});

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
