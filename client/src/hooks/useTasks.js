import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTasks(enabled, { status, projectId, hasProof, q } = {}) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', { status, projectId, hasProof, q }],
    queryFn: ({ signal }) =>
      api.getTasks({ signal, status, projectId, hasProof, q }),
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
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasksQueries = queryClient.getQueriesData({
        queryKey: ['tasks'],
      });

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        };
      });

      return { previousTasksQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasksQueries) {
        context.previousTasksQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
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
