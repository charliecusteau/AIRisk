import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

export function useNewsAlerts(minRelevance?: number) {
  return useQuery({
    queryKey: ['news-alerts', minRelevance],
    queryFn: () => api.getNewsAlerts(minRelevance),
  });
}

export function useNewsStatus() {
  return useQuery({
    queryKey: ['news-status'],
    queryFn: api.getNewsStatus,
    staleTime: 60_000,
  });
}

export function useInvalidateNews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['news-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['news-status'] });
  };
}
