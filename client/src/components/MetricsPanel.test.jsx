import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import MetricsPanel from './MetricsPanel';
import { renderWithQuery } from '../test/utils';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getMetricsSummary: vi.fn(),
  },
}));

describe('MetricsPanel', () => {
  it('renders 4 metric cards with formatted proof rate, streak, and counts', async () => {
    api.getMetricsSummary.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      generatedAt: '2026-11-20T10:00:00.000Z',
      totals: {
        completed: 12,
        withProof: 9,
        withoutProof: 3,
        proofRate: 0.75,
        overdueOpen: 2,
      },
      streak: { currentWeeks: 3, longestWeeks: 5 },
      weekly: [
        { weekStart: '2026-09-28', withProof: 1, withoutProof: 0 },
        { weekStart: '2026-10-05', withProof: 2, withoutProof: 1 },
      ],
    });

    renderWithQuery(<MetricsPanel enabled={true} />);

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeDefined();
    });

    expect(screen.getByText('Proof rate')).toBeDefined();
    expect(screen.getByText('3 weeks')).toBeDefined();
    expect(screen.getByText('Current streak')).toBeDefined();
    expect(screen.getByText('Completed with proof')).toBeDefined();
    expect(screen.getByText('Completed without proof')).toBeDefined();
  });

  it('displays "—" for proof rate when proofRate is null (no completed tasks)', async () => {
    api.getMetricsSummary.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      generatedAt: '2026-11-20T10:00:00.000Z',
      totals: {
        completed: 0,
        withProof: 0,
        withoutProof: 0,
        proofRate: null,
        overdueOpen: 0,
      },
      streak: { currentWeeks: 0, longestWeeks: 0 },
      weekly: [],
    });

    renderWithQuery(<MetricsPanel enabled={true} />);

    await waitFor(() => {
      expect(screen.getByText('—')).toBeDefined();
    });

    expect(screen.getByText('0 weeks')).toBeDefined();
  });
});
