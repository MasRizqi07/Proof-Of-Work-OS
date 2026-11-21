import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskList from './TaskList';
import { renderWithQuery } from '../test/utils';

describe('TaskList proof badges and interactions', () => {
  const baseTasks = [
    {
      id: 'task-1',
      title: 'Completed with Proof',
      status: 'done',
      priority: 'high',
      dueDate: '2026-11-20T00:00:00.000Z',
      proofCount: 2,
      hasProof: true,
      overdue: false,
    },
    {
      id: 'task-2',
      title: 'Completed without Proof',
      status: 'done',
      priority: 'medium',
      dueDate: '2026-11-20T00:00:00.000Z',
      proofCount: 0,
      hasProof: false,
      overdue: false,
    },
    {
      id: 'task-3',
      title: 'Work in progress with proof',
      status: 'in-progress',
      priority: 'low',
      dueDate: '2026-11-10T00:00:00.000Z',
      proofCount: 1,
      hasProof: true,
      overdue: true,
    },
  ];

  it('renders "With proof · 2" badge for done tasks with evidence', () => {
    const { container } = renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const withProofBadge = container.querySelector('.proof-badge-with');
    expect(withProofBadge).toBeDefined();
    expect(withProofBadge.textContent).toContain('With proof · 2');
  });

  it('renders "No proof yet" badge with dashed border and "Add proof" button for done tasks without evidence', () => {
    const { container } = renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const noProofBadge = container.querySelector('.proof-badge-without');
    expect(noProofBadge).toBeDefined();
    expect(noProofBadge.textContent).toContain('No proof yet');

    expect(screen.getByRole('button', { name: 'Add proof' })).toBeDefined();
  });

  it('renders neutral badge for non-done task with proof (no green / no dashed amber)', () => {
    const { container } = renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const neutralBadge = container.querySelector('.proof-badge-neutral');
    expect(neutralBadge).toBeDefined();
    expect(neutralBadge.textContent).toBe('1 proof');
  });

  it('renders "Overdue" marker when task.overdue is true', () => {
    const { container } = renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const overdueBadge = container.querySelector('.badge-overdue');
    expect(overdueBadge).toBeDefined();
    expect(overdueBadge.textContent).toContain('Overdue');
  });

  it('clicking Details opens TaskDetailDialog', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const detailsBtn = screen.getByRole('button', {
      name: 'Open details for Completed with Proof',
    });
    await user.click(detailsBtn);

    expect(screen.getByRole('heading', { name: 'Task details' })).toBeDefined();
  });

  it('clicking Delete button opens DeleteConfirmDialog', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <TaskList tasks={baseTasks} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );

    const deleteBtn = screen.getByRole('button', {
      name: 'Delete Completed with Proof',
    });
    await user.click(deleteBtn);

    expect(
      screen.getByRole('heading', { name: 'Delete this task?' }),
    ).toBeDefined();
  });
});
