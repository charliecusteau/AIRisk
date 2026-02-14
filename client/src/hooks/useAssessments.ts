import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';

export function useAssessments(params?: {
  status?: string;
  sector?: string;
  sort?: string;
  order?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['assessments', params],
    queryFn: () => api.listAssessments(params),
  });
}

export function useAssessment(id: number | null) {
  return useQuery({
    queryKey: ['assessment', id],
    queryFn: () => api.getAssessment(id!),
    enabled: id !== null,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

export function useUpdateScore(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scoreId, ...body }: { scoreId: number; user_rating: string | null; user_reasoning: string | null }) =>
      api.updateScore(assessmentId, scoreId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

export function useUpdateNotes(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notes: string | null) => api.updateNotes(assessmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
