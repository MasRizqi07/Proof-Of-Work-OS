import { supabase } from './supabase';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message, { requestId, status, details, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.requestId = requestId;
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

async function readResponseBody(response) {
  if (response.status === 204) return null;
  if (!response.text && response.json) return response.json();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

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
  const body = await readResponseBody(response);
  if (!response.ok) {
    const error = body?.error || body || {};
    throw new ApiError(error.message || `Request failed (${response.status})`, {
      requestId: body?.requestId,
      status: response.status,
      details: error.details,
      code: error.code,
    });
  }
  return body;
}

export const api = {
  getUser: () => request('/user'),
  getTasks: () => request('/tasks'),
  createTask: (task) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, taskPatch) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskPatch),
    }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getProjects: () => request('/projects'),
  createProject: (project) =>
    request('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (id, projectPatch) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(projectPatch),
    }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};
