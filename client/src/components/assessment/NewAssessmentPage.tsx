import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../layout/Header';
import { CompanyEntryForm } from './CompanyEntryForm';
import { AnalysisProgress } from './AnalysisProgress';
import { useCreateAssessment } from '../../hooks/useAssessments';
import { startAnalysis } from '../../api/client';

export function NewAssessmentPage() {
  const navigate = useNavigate();
  const createAssessment = useCreateAssessment();
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback((name: string, sector?: string, description?: string) => {
    setCompanyName(name);
    setError('');

    createAssessment.mutate({ company_name: name, sector, description }, {
      onSuccess: ({ assessment_id }) => {
        setAnalyzing(true);
        setProgressMsg('Starting analysis...');

        startAnalysis(
          assessment_id,
          (msg) => setProgressMsg(msg),
          () => {
            setAnalyzing(false);
            navigate(`/assessment/${assessment_id}`);
          },
          (errMsg) => {
            setAnalyzing(false);
            setError(`Analysis failed: ${errMsg}`);
          },
        );
      },
      onError: (err: any) => {
        setError(err.response?.data?.error || 'Failed to create assessment');
      },
    });
  }, [createAssessment, navigate]);

  return (
    <>
      <Header title="New Assessment" />
      <div className="page-content">
        {analyzing ? (
          <AnalysisProgress message={progressMsg} companyName={companyName} />
        ) : (
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
              Run AI Disruption Risk Assessment
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              Enter a software company name to generate a comprehensive AI disruption risk analysis
              using Claude across 5 risk domains and 13 sub-questions.
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

            <CompanyEntryForm onSubmit={handleSubmit} isLoading={createAssessment.isPending} />
          </div>
        )}
      </div>
    </>
  );
}
