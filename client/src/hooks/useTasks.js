import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTasks(enabled, { status, projectId } = {}) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', { status, projectId }],
    queryFn: ({ signal }) => api.getTasks({ signal, status, projectId }),
    retry: 1,
    enabled,
  });

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return { tasksQuery, createTask, updateTask, deleteTask };
}
