import React, { useState } from 'react';
import { Header } from '../layout/Header';
import { StatsCards } from './StatsCards';
import { RiskDonutChart, DomainBreakdownChart, SectorBreakdownChart } from './Charts';
import { PortfolioTable } from './PortfolioTable';
import { AddToPortfolioModal } from './AddToPortfolioModal';
import { FilterBar } from './FilterBar';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useDashboardStats, useRiskDistribution, useDomainBreakdown, useSectorBreakdown } from '../../hooks/useDashboard';
import { usePortfolio, useRemoveFromPortfolio, useUpdatePortfolioWeights } from '../../hooks/usePortfolio';
import { useAssessments } from '../../hooks/useAssessments';
import { useQueryClient } from '@tanstack/react-query';

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);

  const stats = useDashboardStats();
  const riskDist = useRiskDistribution();
  const domainBreakdown = useDomainBreakdown();
  const sectorBreakdown = useSectorBreakdown();
  const queryClient = useQueryClient();
  const portfolio = usePortfolio();
  const allAssessments = useAssessments({});
  const removeFromPortfolio = useRemoveFromPortfolio();
  const updateWeights = useUpdatePortfolioWeights();

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  const portfolioAssessmentIds = new Set((portfolio.data || []).map(e => e.assessment_id));

  // Filter portfolio entries client-side by search/sector
  let filteredEntries = portfolio.data || [];
  if (search) {
    const q = search.toLowerCase();
    filteredEntries = filteredEntries.filter(e => e.company_name.toLowerCase().includes(q));
  }
  if (sector && sector !== 'all') {
    filteredEntries = filteredEntries.filter(e => e.company_sector === sector);
  }

  // Sort client-side
  filteredEntries = [...filteredEntries].sort((a, b) => {
    let cmp = 0;
    if (sort === 'name') cmp = a.company_name.localeCompare(b.company_name);
    else if (sort === 'score') cmp = (a.composite_score || 0) - (b.composite_score || 0);
    else cmp = a.updated_at.localeCompare(b.updated_at);
    return order === 'asc' ? cmp : -cmp;
  });

  return (
    <>
      <Header title="Portfolio Dashboard" />
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
                Portfolio Holdings
              </h3>
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                sector={sector}
                onSectorChange={setSector}
              />
            </div>

            {portfolio.isLoading ? (
              <LoadingSpinner message="Loading portfolio..." />
            ) : (
              <PortfolioTable
                entries={filteredEntries}
                sort={sort}
                order={order}
                onSort={handleSort}
                onRemove={(id) => removeFromPortfolio.mutate(id)}
                onSaveWeights={(weights) => updateWeights.mutate(weights)}
                onAddCompanies={() => setShowAddModal(true)}
                isSavingWeights={updateWeights.isPending}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Failed to load dashboard data</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddToPortfolioModal
          assessments={allAssessments.data || []}
          portfolioAssessmentIds={portfolioAssessmentIds}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['assessments'] });
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
