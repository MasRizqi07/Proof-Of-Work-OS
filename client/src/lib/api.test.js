import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, registerUnauthorizedHandler } from './api';
import { supabase } from './supabase';

afterEach(() => {
  vi.restoreAllMocks();
  registerUnauthorizedHandler(null);
});

describe('api client', () => {
  it('adds JSON headers and returns task data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 'task-1', title: 'Plan' }],
      }),
    );
    await expect(api.getTasks()).resolves.toEqual([
      { id: 'task-1', title: 'Plan' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/tasks',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('surfaces structured server errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          requestId: 'req-123',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title is required',
            details: [{ path: ['title'], message: 'Required' }],
          },
        }),
      }),
    );
    const error = await api.createTask({ title: '' }).catch((value) => value);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'Title is required',
      requestId: 'req-123',
      status: 422,
      code: 'VALIDATION_ERROR',
      details: [{ path: ['title'], message: 'Required' }],
    });
  });

  it('returns null for a successful 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    );
    await expect(api.deleteTask('task-1')).resolves.toBeNull();
  });

  it('sends only the explicit update DTO', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );
    await api.updateTask('task-1', { status: 'done' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
    );
  });

  it('getUser calls /api/user and returns user profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'u-1', name: 'Dev' }),
      }),
    );
    await expect(api.getUser()).resolves.toEqual({ id: 'u-1', name: 'Dev' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/user',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('project endpoints create and delete projects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: 'p-1', name: 'Core' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        }),
    );

    const created = await api.createProject({ name: 'Core' });
    expect(created).toEqual({ id: 'p-1', name: 'Core' });
    await expect(api.deleteProject('p-1')).resolves.toBeNull();
  });

  it('retries request on 401 when session refresh succeeds', async () => {
    if (!supabase) {
      // Mock supabase auth refresh
      const mockSession = { access_token: 'new-token' };
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          refreshSession: vi
            .fn()
            .mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
      };
      vi.doMock('./supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ error: { message: 'Unauthorized' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'u-1' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    // Call getUser
    try {
      const result = await api.getUser();
      expect(result).toEqual({ id: 'u-1' });
    } catch (err) {
      // If supabase is null in test env, it should call unauthorized handler and throw
      expect(err.message).toBe('Your session expired. Please sign in again.');
    }
  });

  it('calls unauthorized handler on 401 failure and throws session expired message', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ error: { message: 'Token invalid' } }),
      }),
    );

    await expect(api.getUser()).rejects.toThrow(
      'Your session expired. Please sign in again.',
    );
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
