import React, { useState } from 'react';
import { Header } from '../layout/Header';
import { StatsCards } from './StatsCards';
import { RiskDonutChart, DomainBreakdownChart, SectorBreakdownChart } from './Charts';
import { CompanyTable } from './CompanyTable';
import { FilterBar } from './FilterBar';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useDashboardStats, useRiskDistribution, useDomainBreakdown, useSectorBreakdown } from '../../hooks/useDashboard';
import { useAssessments } from '../../hooks/useAssessments';

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');

  const stats = useDashboardStats();
  const riskDist = useRiskDistribution();
  const domainBreakdown = useDomainBreakdown();
  const sectorBreakdown = useSectorBreakdown();
  const assessments = useAssessments({ search: search || undefined, sector, status, sort, order });

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        {stats.isLoading ? (
          <LoadingSpinner size="lg" message="Loading dashboard..." />
        ) : stats.data ? (
          <>
            <StatsCards stats={stats.data} />

            <div className="charts-grid">
              {riskDist.data && <RiskDonutChart data={riskDist.data} />}
              {domainBreakdown.data && <DomainBreakdownChart data={domainBreakdown.data} />}
              {sectorBreakdown.data && <SectorBreakdownChart data={sectorBreakdown.data} />}
            </div>

            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 14 }}>
                All Assessments
              </h3>
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                sector={sector}
                onSectorChange={setSector}
                status={status}
                onStatusChange={setStatus}
              />
            </div>

            {assessments.isLoading ? (
              <LoadingSpinner message="Loading assessments..." />
            ) : (
              <CompanyTable
                assessments={assessments.data || []}
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Failed to load dashboard data</p>
          </div>
        )}
      </div>
    </>
  );
}
