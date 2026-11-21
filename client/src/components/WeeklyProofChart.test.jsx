import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeeklyProofChart from './WeeklyProofChart';

describe('WeeklyProofChart', () => {
  it('displays empty state message when there are no completed tasks', () => {
    render(
      <WeeklyProofChart
        weekly={[
          { weekStart: '2026-09-28', withProof: 0, withoutProof: 0 },
          { weekStart: '2026-10-05', withProof: 0, withoutProof: 0 },
        ]}
      />,
    );

    expect(
      screen.getByText(
        'No completed tasks yet. Finish a task and attach proof to start your streak.',
      ),
    ).toBeDefined();
  });

  it('renders 8-week chart with figcaption summary and accessible data table', () => {
    const weeklyData = [
      { weekStart: '2026-09-28', withProof: 0, withoutProof: 0 },
      { weekStart: '2026-10-05', withProof: 1, withoutProof: 1 },
      { weekStart: '2026-10-12', withProof: 2, withoutProof: 0 },
      { weekStart: '2026-10-19', withProof: 0, withoutProof: 1 },
      { weekStart: '2026-10-26', withProof: 3, withoutProof: 0 },
      { weekStart: '2026-11-02', withProof: 1, withoutProof: 1 },
      { weekStart: '2026-11-09', withProof: 2, withoutProof: 0 },
      { weekStart: '2026-11-16', withProof: 0, withoutProof: 0 },
    ];

    const { container } = render(<WeeklyProofChart weekly={weeklyData} />);

    // Figcaption text summary
    const caption = container.querySelector('figcaption');
    expect(caption).toBeDefined();
    expect(caption.textContent).toBe('8 weeks: 9 with proof, 3 without');

    // SVG with bars
    const bars = container.querySelectorAll('.chart-bar-group');
    expect(bars.length).toBe(8);

    // Legend items exist
    const legend = container.querySelector('.chart-legend');
    expect(legend).toBeDefined();
    expect(legend.textContent).toContain('With proof');
    expect(legend.textContent).toContain('No proof');

    // Accessible details table
    const details = container.querySelector('details.chart-data-details');
    expect(details).toBeDefined();
    expect(screen.getByText('Show data table')).toBeDefined();

    const tableRows = container.querySelectorAll('.proof-data-table tbody tr');
    expect(tableRows.length).toBe(8);
  });
});
