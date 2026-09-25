import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => vi.restoreAllMocks());

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
});
