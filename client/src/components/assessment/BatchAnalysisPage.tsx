import React, { useState, useCallback, useRef } from 'react';
import { Header } from '../layout/Header';
import { BatchEntryForm } from './BatchEntryForm';
import { BatchProgress, CompanyStatus } from './BatchProgress';
import { BatchResults } from './BatchResults';
import { startBatchAnalysis } from '../../api/client';
import type { BatchCompanyResult } from '../../types';

type PageState = 'form' | 'analyzing' | 'results';

export function BatchAnalysisPage() {
  const [state, setState] = useState<PageState>('form');
  const [companies, setCompanies] = useState<CompanyStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<BatchCompanyResult[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleSubmit = useCallback((companyNames: string[], sector?: string) => {
    setSubmitting(true);
    setError('');

    const initialStatuses: CompanyStatus[] = companyNames.map(name => ({
      name,
      state: 'pending',
    }));
    setCompanies(initialStatuses);
    setTotal(companyNames.length);
    setCurrentIndex(0);
    setResults([]);
    setState('analyzing');
    setSubmitting(false);

    const cancel = startBatchAnalysis(companyNames, sector, {
      onBatchStart: (data) => {
        setTotal(data.total);
      },
      onCompanyStart: (data) => {
        setCurrentIndex(data.index);
        setCompanies(prev => prev.map((c, i) =>
          i === data.index ? { ...c, state: 'analyzing', progressMsg: 'Starting...' } : c,
        ));
      },
      onProgress: (data) => {
        setCompanies(prev => prev.map((c, i) =>
          i === data.index ? { ...c, progressMsg: data.message } : c,
        ));
      },
      onCompanyComplete: (data) => {
        const result: BatchCompanyResult = {
          company_name: data.company_name,
          status: 'completed',
          assessment_id: data.assessment_id,
          composite_score: data.composite_score,
          composite_rating: data.composite_rating,
        };
        setCompanies(prev => prev.map((c, i) =>
          i === data.index ? { ...c, state: 'completed', result } : c,
        ));
        setResults(prev => [...prev, result]);
      },
      onCompanyError: (data) => {
        const result: BatchCompanyResult = {
          company_name: data.company_name,
          status: 'error',
          error: data.error,
        };
        setCompanies(prev => prev.map((c, i) =>
          i === data.index ? { ...c, state: 'error', result } : c,
        ));
        setResults(prev => [...prev, result]);
      },
      onBatchComplete: (data) => {
        setResults(data.results);
        setState('results');
      },
      onError: (msg) => {
        setError(msg);
        setState('form');
      },
    });

    cancelRef.current = cancel;
  }, []);

  const handleRunAnother = useCallback(() => {
    setCompanies([]);
    setResults([]);
    setError('');
    setState('form');
  }, []);

  return (
    <>
      <Header title="Batch Analysis" />
      <div className="page-content">
        {state === 'form' && (
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
              Batch AI Disruption Risk Assessment
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              Enter multiple company names to analyze them sequentially. Each company will receive
              a full 5-domain, 13-question AI risk assessment.
            </p>

            {error && (
              <div style={{
                padding: '10px 14px',
                marginBottom: 16,
                background: 'var(--risk-high-bg)',
                border: '1px solid var(--risk-high)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--risk-high)',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <BatchEntryForm onSubmit={handleSubmit} isLoading={submitting} />
          </div>
        )}

        {state === 'analyzing' && (
          <BatchProgress
            companies={companies}
            currentIndex={currentIndex}
            total={total}
          />
        )}

        {state === 'results' && (
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              Batch Analysis Results
            </h3>
            <BatchResults results={results} onRunAnother={handleRunAnother} />
          </div>
        )}
      </div>
    </>
  );
}
