import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || ''
  : import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

let unauthorizedHandler = null;

export function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
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

async function request(path, { signal, isRetry = false, ...options } = {}) {
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
    signal,
  });

  if (response.status === 401) {
    if (!isRetry && supabase) {
      let refreshedSession = null;
      try {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (!refreshError && refreshData?.session) {
          refreshedSession = refreshData.session;
        }
      } catch {
        refreshedSession = null;
      }

      if (refreshedSession) {
        return request(path, { signal, isRetry: true, ...options });
      }
    }

    if (unauthorizedHandler) {
      try {
        await unauthorizedHandler();
      } catch {
        // ignore sign out errors
      }
    }

    const body = await readResponseBody(response);
    throw new ApiError('Your session expired. Please sign in again.', {
      requestId: body?.requestId,
      status: 401,
      code: 'AUTH_EXPIRED',
    });
  }

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
  getUser: ({ signal } = {}) => request('/user', { signal }),
  updateProfile: (patch) =>
    request('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  getActivities: ({ signal, page } = {}) =>
    request(`/activities${page ? `?page=${page}` : ''}`, { signal }),
  getTasks: ({ signal, status, projectId, hasProof } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (projectId) params.set('projectId', projectId);
    if (hasProof !== undefined && hasProof !== null && hasProof !== '') {
      params.set('hasProof', String(hasProof));
    }
    const qs = params.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`, { signal });
  },
  createTask: (task) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, taskPatch) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskPatch),
    }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getEvidence: (taskId, { signal } = {}) =>
    request(`/tasks/${taskId}/evidence`, { signal }),
  addEvidence: (taskId, evidence) =>
    request(`/tasks/${taskId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(evidence),
    }),
  deleteEvidence: (taskId, evidenceId) =>
    request(`/tasks/${taskId}/evidence/${evidenceId}`, { method: 'DELETE' }),
  getMetricsSummary: ({ signal } = {}) =>
    request('/metrics/summary', { signal }),
  getProjects: ({ signal } = {}) => request('/projects', { signal }),
  createProject: (project) =>
    request('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (id, projectPatch) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(projectPatch),
    }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};
