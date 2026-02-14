import { useQuery } from '@tanstack/react-query';
import * as api from '../api/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.getDashboardStats,
  });
}

export function useRiskDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'risk-distribution'],
    queryFn: api.getRiskDistribution,
  });
}

export function useDomainBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'domain-breakdown'],
    queryFn: api.getDomainBreakdown,
  });
}

export function useSectorBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'sector-breakdown'],
    queryFn: api.getSectorBreakdown,
  });
}
