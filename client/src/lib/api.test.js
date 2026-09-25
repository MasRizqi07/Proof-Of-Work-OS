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

  it('surfaces useful server errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Title is required' }),
      }),
    );
    await expect(api.createTask({ title: '' })).rejects.toThrow(
      'Title is required',
    );
  });
});
