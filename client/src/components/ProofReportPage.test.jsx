import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import ProofReportPage from './ProofReportPage';
import { renderWithQuery } from '../test/utils';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getReport: vi.fn(),
  },
}));

describe('ProofReportPage (RP-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders weekly grouped report with safe URLs, full note body, disclaimer, and triggers window.print()', async () => {
    api.getReport.mockResolvedValue({
      timezone: 'Asia/Jakarta',
      generatedAt: '2026-11-26T10:00:00.000Z',
      days: 30,
      from: '2026-10-28',
      to: '2026-11-26',
      displayName: 'User A',
      summary: {
        completed: 2,
        withProof: 1,
        withoutProof: 1,
        proofRate: 0.5,
      },
      weeks: [
        {
          weekStart: '2026-11-23',
          tasks: [
            {
              id: 't1',
              title: 'Ship Heatmap Grid',
              description: '26 weeks SQL aggregation',
              priority: 'high',
              completedAt: '2026-11-26T09:00:00.000Z',
              projectName: 'Core OS',
              hasProof: true,
              proofCount: 3,
              evidence: [
                {
                  id: 'e1',
                  kind: 'url',
                  label: 'PR #99',
                  url: 'https://github.com/org/repo/pull/99',
                  body: null,
                },
                {
                  id: 'e2',
                  kind: 'url',
                  label: 'Unsafe link',
                  url: 'javascript:alert(1)',
                  body: null,
                },
                {
                  id: 'e3',
                  kind: 'note',
                  label: 'Audit summary',
                  url: null,
                  body: 'All 32 integration tests passed cleanly.',
                },
              ],
            },
            {
              id: 't2',
              title: 'Unproved Task',
              description: null,
              priority: 'medium',
              completedAt: '2026-11-24T09:00:00.000Z',
              projectName: null,
              hasProof: false,
              proofCount: 0,
              evidence: [],
            },
          ],
        },
      ],
    });

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onBack = vi.fn();

    renderWithQuery(<ProofReportPage enabled={true} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'User A' })).toBeDefined();
    });

    expect(
      screen.getByText(/Proof is attached by the owner\. Merged-PR labels/i),
    ).toBeDefined();
    expect(screen.getByText('Ship Heatmap Grid')).toBeDefined();
    expect(
      screen.getByText('All 32 integration tests passed cleanly.'),
    ).toBeDefined();
    expect(screen.getByText('With proof · 3')).toBeDefined();
    expect(screen.getByText('No proof yet')).toBeDefined();

    // Valid http(s) URL rendered as anchor; unsafe javascript: rendered as plain text
    const safeLink = screen.getByRole('link', { name: 'github.com' });
    expect(safeLink.getAttribute('href')).toBe(
      'https://github.com/org/repo/pull/99',
    );
    expect(screen.queryByRole('link', { name: /javascript/i })).toBeNull();
    expect(screen.getByText('javascript:alert(1)')).toBeDefined();

    // Switching days refetches report and re-enables Print once loaded
    fireEvent.click(screen.getByRole('button', { name: '90 days' }));
    await waitFor(() => {
      expect(api.getReport).toHaveBeenCalledWith(
        expect.objectContaining({ days: 90 }),
      );
      expect(
        screen.getByRole('button', { name: 'Print or save as PDF' }).disabled,
      ).toBe(false);
    });

    // Print button calls window.print()
    fireEvent.click(
      screen.getByRole('button', { name: 'Print or save as PDF' }),
    );
    expect(printSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Back to workspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
