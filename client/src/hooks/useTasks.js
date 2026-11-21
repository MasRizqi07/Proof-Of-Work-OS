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
    mutationFn: ({
      id,
      title,
      description,
      status,
      priority,
      progress,
      dueDate,
      projectId,
    }) =>
      api.updateTask(
        id,
        Object.fromEntries(
          Object.entries({
            title,
            description,
            status,
            priority,
            progress,
            dueDate,
            projectId,
          }).filter(([, value]) => value !== undefined),
        ),
      ),
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
