import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useProjects(enabled) {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => api.getProjects({ signal }),
    retry: 1,
    enabled,
  });

  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, name, description, status }) =>
      api.updateProject(
        id,
        Object.fromEntries(
          Object.entries({ name, description, status }).filter(
            ([, value]) => value !== undefined,
          ),
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteProject = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { projectsQuery, createProject, updateProject, deleteProject };
}

