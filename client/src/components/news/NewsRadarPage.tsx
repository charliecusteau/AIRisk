import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Newspaper, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNewsAlerts, useNewsStatus, useInvalidateNews } from '../../hooks/useNews';
import { scanNews } from '../../api/client';
import { NewsAlertCard } from './NewsAlertCard';
import { ScanProgress } from './ScanProgress';
import type { NewsAlert } from '../../types';

const TIME_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export function NewsRadarPage() {
  const [timeRange, setTimeRange] = useState(30);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const autoScanTriggered = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const { data: alerts = [], isLoading: alertsLoading } = useNewsAlerts();
  const { data: status } = useNewsStatus();
  const invalidateNews = useInvalidateNews();

  const startScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setScanMessage('Starting scan...');
    setScanError(null);

    cancelRef.current = scanNews(
      (msg) => setScanMessage(msg),
      (_data) => {
        setScanning(false);
        setScanMessage('');
        invalidateNews();
      },
      (msg) => {
        setScanning(false);
        setScanMessage('');
        setScanError(msg);
      },
    );
  }, [scanning, invalidateNews]);

  // Auto-scan on mount if stale
  useEffect(() => {
    if (status && status.is_stale && !autoScanTriggered.current && !scanning) {
      autoScanTriggered.current = true;
      startScan();
    }
  }, [status, scanning, startScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  // Filter alerts by time range
  const filteredAlerts = alerts.filter((alert: NewsAlert) => {
    if (!alert.published_date) return true;
    const pubDate = new Date(alert.published_date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRange);
    return pubDate >= cutoff;
  });

  const lastScanned = status?.last_scanned_at
    ? new Date(status.last_scanned_at + 'Z').toLocaleString()
    : null;

  return (
    <>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="header-title">Risk News Radar</h1>
          {lastScanned && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last scanned: {lastScanned}
            </span>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={startScan}
          disabled={scanning}
        >
          <RefreshCw size={14} className={scanning ? 'spin-icon' : ''} />
          {scanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>
      <div className="page-content">
        {scanning && <ScanProgress message={scanMessage} />}

        {scanError && (
          <div className="scan-error-banner">
            <AlertTriangle size={16} />
            <span>{scanError}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setScanError(null)}>Dismiss</button>
          </div>
        )}

        <div className="news-filter-bar">
          <span className="news-filter-label">Time range:</span>
          {TIME_RANGES.map((range) => (
            <button
              key={range.days}
              className={`btn btn-sm ${timeRange === range.days ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTimeRange(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>

        {alertsLoading && !scanning ? (
          <div className="loading-container">
            <div className="spinner spinner-lg" />
            <span>Loading cached alerts...</span>
          </div>
        ) : filteredAlerts.length === 0 && !scanning ? (
          <div className="empty-state">
            <Newspaper size={48} />
            <h3>No relevant news found</h3>
            <p style={{ marginTop: 8 }}>
              {alerts.length === 0
                ? 'Add companies to your portfolio, then scan for AI competitive news.'
                : `No news in the last ${timeRange} days. Try expanding the time range.`}
            </p>
          </div>
        ) : (
          <div className="news-list">
            {filteredAlerts.map((alert: NewsAlert) => (
              <NewsAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
