import { supabase } from './supabase';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => ({}))).message ||
        `Request failed (${response.status})`,
    );
  return response.status === 204 ? null : response.json();
}

export const api = {
  getUser: () => request('/user'),
  getTasks: () => request('/tasks'),
  createTask: (task) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, task) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getProjects: () => request('/projects'),
  createProject: (project) =>
    request('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (id, project) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(project),
    }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};
