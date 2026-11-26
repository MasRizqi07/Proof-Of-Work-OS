import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeeklyHeatmap from './WeeklyHeatmap';

function build26WeekDays(overrides = {}) {
  const days = [];
  const startMs = Date.UTC(2026, 5, 1); // 2026-06-01 (Monday)
  for (let i = 0; i < 26 * 7; i++) {
    const date = new Date(startMs + i * 86400000).toISOString().slice(0, 10);
    const patch = overrides[date] || {};
    days.push({
      date,
      withProof: patch.withProof ?? 0,
      withoutProof: patch.withoutProof ?? 0,
    });
  }
  return {
    timezone: 'Asia/Jakarta',
    from: days[0].date,
    to: days[days.length - 1].date,
    days,
  };
}

describe('WeeklyHeatmap (H-01)', () => {
  it('renders 26x7 cells with correct intensity levels, noproof dot, today marker, and figcaption summary', () => {
    const heatmap = build26WeekDays({
      '2026-11-10': { withProof: 1, withoutProof: 0 }, // level 1
      '2026-11-11': { withProof: 2, withoutProof: 0 }, // level 2
      '2026-11-12': { withProof: 3, withoutProof: 1 }, // level 3
      '2026-11-13': { withProof: 5, withoutProof: 0 }, // level 4
      '2026-11-14': { withProof: 0, withoutProof: 2 }, // level 0 + dot
    });

    const { container } = render(
      <WeeklyHeatmap heatmap={heatmap} todayOverride="2026-11-26" />,
    );

    const cells = container.querySelectorAll('.heatmap-cell');
    expect(cells.length).toBe(182);

    expect(
      container
        .querySelector('[data-date="2026-11-10"]')
        .classList.contains('level-1'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-date="2026-11-11"]')
        .classList.contains('level-2'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-date="2026-11-12"]')
        .classList.contains('level-3'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-date="2026-11-13"]')
        .classList.contains('level-4'),
    ).toBe(true);

    const noProofOnly = container.querySelector('[data-date="2026-11-14"]');
    expect(noProofOnly.classList.contains('level-0')).toBe(true);
    expect(noProofOnly.querySelector('.heatmap-noproof-dot')).not.toBeNull();

    const todayCell = container.querySelector('[data-date="2026-11-26"]');
    expect(todayCell.classList.contains('is-today')).toBe(true);

    expect(
      screen.getByText('26 weeks: 11 completed with proof, 3 without'),
    ).toBeDefined();

    // Accessible data table inside <details> lists non-empty days
    expect(screen.getByText('Show data table')).toBeDefined();
    const rows = container.querySelectorAll('.proof-data-table tbody tr');
    expect(rows.length).toBe(5);
  });

  it('supports roving tabindex, arrow-key navigation, and updates tooltip on focus and hover', () => {
    const heatmap = build26WeekDays({
      '2026-11-25': { withProof: 2, withoutProof: 1 },
      '2026-11-26': { withProof: 1, withoutProof: 0 },
    });

    const { container } = render(
      <WeeklyHeatmap heatmap={heatmap} todayOverride="2026-11-26" />,
    );

    const todayCell = container.querySelector('[data-date="2026-11-26"]');
    const yesterdayCell = container.querySelector('[data-date="2026-11-25"]');
    expect(todayCell.getAttribute('tabindex')).toBe('0');
    expect(yesterdayCell.getAttribute('tabindex')).toBe('-1');

    todayCell.focus();
    fireEvent.keyDown(todayCell, { key: 'ArrowUp' });

    expect(document.activeElement).toBe(yesterdayCell);
    expect(yesterdayCell.getAttribute('tabindex')).toBe('0');
    expect(todayCell.getAttribute('tabindex')).toBe('-1');

    const tooltip = container.querySelector('.heatmap-tooltip');
    expect(tooltip.textContent).toBe('25 Nov 2026: 2 with proof, 1 without');
  });
});
