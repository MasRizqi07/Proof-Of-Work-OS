import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTasks(enabled, { status, projectId, hasProof } = {}) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', { status, projectId, hasProof }],
    queryFn: ({ signal }) =>
      api.getTasks({ signal, status, projectId, hasProof }),
    retry: 1,
    enabled,
  });

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, ...patch }) => api.updateTask(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    },
  });

  return { tasksQuery, createTask, updateTask, deleteTask };
}
