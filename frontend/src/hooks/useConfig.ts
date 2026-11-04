import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 10 * 60_000, select: (r) => r.data });
}

export function useStates() {
  return useQuery({ queryKey: ['states'], queryFn: api.states, staleTime: 60 * 60_000 });
}
