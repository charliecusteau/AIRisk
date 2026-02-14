import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: api.getPortfolio,
  });
}

export function useAddToPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addToPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRemoveFromPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.removeFromPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePortfolioWeights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePortfolioWeights,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
