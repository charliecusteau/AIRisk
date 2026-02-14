import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '../layout/Header';
import { ScorecardView } from './ScorecardView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAssessment } from '../../hooks/useAssessments';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../common/ToastContainer';

export function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: assessment, isLoading, error } = useAssessment(id ? parseInt(id) : null);
  const { toasts, addToast, removeToast } = useToast();

  if (isLoading) {
    return (
      <>
        <Header title="Assessment" />
        <div className="page-content">
          <LoadingSpinner size="lg" message="Loading assessment..." />
        </div>
      </>
    );
  }

  if (error || !assessment) {
    return (
      <>
        <Header title="Assessment" />
        <div className="page-content">
          <div className="empty-state">
            <p>Assessment not found</p>
            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={assessment.company_name}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back
          </button>
        }
      />
      <div className="page-content">
        <ScorecardView
          assessment={assessment}
          onDeleted={() => navigate('/')}
          onToast={addToast}
        />
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
