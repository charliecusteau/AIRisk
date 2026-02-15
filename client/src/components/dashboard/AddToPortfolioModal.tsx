import React, { useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Modal } from '../common/Modal';
import { batchAddToPortfolio } from '../../api/client';

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

interface CompanyProgress {
  name: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  message: string;
}

export function AddToPortfolioModal({ onComplete, onClose }: Props) {
  const [newCompanies, setNewCompanies] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<CompanyProgress[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef<(() => void) | null>(null);

  const parseNewCompanies = () =>
    newCompanies.split('\n').map(s => s.trim()).filter(Boolean);

  const newList = parseNewCompanies();
  const totalToAdd = newList.length;

  const handleAdd = () => {
    if (totalToAdd === 0) return;

    setIsRunning(true);
    setDoneCount(0);

    // Initialize progress list for new companies
    const initialProgress: CompanyProgress[] = newList.map(name => ({
      name, status: 'pending', message: 'Waiting...',
    }));
    setProgress(initialProgress);
    setTotalCount(newList.length);

    const abort = batchAddToPortfolio(
      {
        assessment_ids: [],
        new_companies: newList,
      },
      {
        onExistingAdded: ({ count }) => {
          setDoneCount(prev => prev + count);
        },
        onBatchStart: ({ total }) => {
          setTotalCount(total);
        },
        onCompanyStart: ({ index, company_name }) => {
          setProgress(prev => prev.map((p, i) =>
            i === index ? { ...p, status: 'analyzing', message: 'Starting analysis...' } : p
          ));
        },
        onProgress: ({ index, message }) => {
          setProgress(prev => prev.map((p, i) =>
            i === index ? { ...p, message } : p
          ));
        },
        onCompanyComplete: ({ index }) => {
          setProgress(prev => prev.map((p, i) =>
            i === index ? { ...p, status: 'done', message: 'Added to portfolio' } : p
          ));
          setDoneCount(prev => prev + 1);
        },
        onCompanyError: ({ index, error }) => {
          setProgress(prev => prev.map((p, i) =>
            i === index ? { ...p, status: 'error', message: error } : p
          ));
          setDoneCount(prev => prev + 1);
        },
        onComplete: () => {
          setIsRunning(false);
          onComplete();
        },
        onError: (msg) => {
          setIsRunning(false);
          setProgress(prev => [...prev, { name: 'Error', status: 'error', message: msg }]);
        },
      },
    );

    abortRef.current = abort;
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current();
    onClose();
  };

  // Progress view while analyzing
  if (isRunning || (progress.length > 0 && progress.some(p => p.status === 'done' || p.status === 'error'))) {
    const allDone = !isRunning;
    return (
      <Modal title="Adding Companies to Portfolio" onClose={handleClose}>
        <div style={{ padding: '0 20px 20px' }}>
          {progress.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Analyzing new companies: {progress.filter(p => p.status === 'done').length} / {totalCount} complete
              </div>
              <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                {progress.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {p.status === 'done' && <CheckCircle size={16} style={{ color: 'var(--risk-low)', flexShrink: 0 }} />}
                    {p.status === 'error' && <XCircle size={16} style={{ color: 'var(--risk-high)', flexShrink: 0 }} />}
                    {p.status === 'analyzing' && <Loader size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />}
                    {p.status === 'pending' && <div style={{ width: 16, height: 16, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: p.status === 'error' ? 'var(--risk-high)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleClose} disabled={isRunning}>
              {allDone ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Selection view
  return (
    <Modal title="Add Companies to Portfolio" onClose={onClose}>
      <div style={{ padding: '0 20px 20px' }}>
        {/* New companies textarea */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>
            New Companies (one per line, max 75)
          </label>
          <textarea
            className="form-input"
            style={{ width: '100%', height: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
            placeholder={'Datadog\nCrowdStrike\nServiceNow\n...'}
            value={newCompanies}
            onChange={e => setNewCompanies(e.target.value)}
          />
          {newList.length > 0 && (
            <div style={{ fontSize: 11, color: newList.length > 75 ? 'var(--risk-high)' : 'var(--text-muted)', marginTop: 4 }}>
              {newList.length} company name{newList.length !== 1 ? 's' : ''} entered
              {newList.length > 75 && ' (only first 75 will be processed)'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={totalToAdd === 0}
            onClick={handleAdd}
          >
            Add {totalToAdd} Compan{totalToAdd !== 1 ? 'ies' : 'y'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
