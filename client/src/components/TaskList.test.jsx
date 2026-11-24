import { describe, it, expect, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
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

  it('renders typographical quote empty search state when no tasks match query', () => {
    renderWithQuery(
      <TaskList
        tasks={[]}
        searchQuery="architect"
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText('No tasks match “architect”')).toBeDefined();
  });

  it('sets aria-busy="true" and style opacity: 0.7 while status update is in flight', async () => {
    const user = userEvent.setup();
    let resolveUpdate;
    const pendingPromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    const onUpdate = vi.fn().mockImplementation(() => pendingPromise);

    const { container } = renderWithQuery(
      <TaskList
        tasks={[baseTasks[0]]}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    const card = container.querySelector('.task-card');
    expect(card.getAttribute('aria-busy')).toBeNull();

    const statusSelect = screen.getByLabelText(
      'Status for Completed with Proof',
    );
    await user.selectOptions(statusSelect, 'in-progress');

    expect(onUpdate).toHaveBeenCalledWith({
      id: 'task-1',
      status: 'in-progress',
    });

    // While in flight
    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(card.style.opacity).toBe('0.7');

    // Resolve update
    await act(async () => {
      resolveUpdate({});
      await pendingPromise;
    });

    expect(card.getAttribute('aria-busy')).toBeNull();
  });

  it('renders inline role="alert" message when onUpdate rejects and rolls back', async () => {
    const user = userEvent.setup();
    const onUpdate = vi
      .fn()
      .mockRejectedValue(new Error('Internal server error'));

    renderWithQuery(
      <TaskList
        tasks={[baseTasks[0]]}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    const statusSelect = screen.getByLabelText(
      'Status for Completed with Proof',
    );
    await user.selectOptions(statusSelect, 'in-progress');

    const alert = await screen.findByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain(
      "Couldn't update this task. Your change was undone.",
    );
  });
});
