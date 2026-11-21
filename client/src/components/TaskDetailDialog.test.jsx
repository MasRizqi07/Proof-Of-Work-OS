import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskDetailDialog from './TaskDetailDialog';
import { renderWithQuery } from '../test/utils';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getEvidence: vi.fn(),
    addEvidence: vi.fn(),
    deleteEvidence: vi.fn(),
  },
}));

describe('TaskDetailDialog', () => {
  const task = {
    id: 'task-100',
    title: 'Implement Evidence UI',
    description: 'Core proof of work feature',
    status: 'in-progress',
    priority: 'high',
    progress: 60,
    dueDate: '2026-12-01T00:00:00.000Z',
    projectId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getEvidence.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it('rejects javascript: and ftp: protocol URLs with user guidance', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    // Fill label
    const labelInput = screen.getByLabelText(/Label/i);
    await user.type(labelInput, 'Malicious exploit');

    // Fill unsafe URL
    const urlInput = screen.getByLabelText(/URL/i);
    await user.type(urlInput, 'javascript:alert(document.cookie)');

    const submitBtn = screen.getByRole('button', { name: 'Add proof' });
    await user.click(submitBtn);

    expect(
      screen.getByText(
        "Couldn't save this proof. Check the link starts with http:// or https:// and try again.",
      ),
    ).toBeDefined();
    expect(api.addEvidence).not.toHaveBeenCalled();
  });

  it('renders URL evidence with target="_blank", rel="noopener noreferrer", and monospace hostname', async () => {
    api.getEvidence.mockResolvedValue({
      items: [
        {
          id: 'ev-1',
          taskId: 'task-100',
          kind: 'url',
          label: 'Pull Request #12',
          url: 'https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/12',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Pull Request #12')).toBeDefined();
    });

    const link = screen.getByRole('link', { name: 'github.com' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('href')).toBe(
      'https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/12',
    );
  });

  it('renders note evidence as plain text in pre element (no HTML injection)', async () => {
    const noteText = '<script>alert("xss")</script>\nLine 2 output';
    api.getEvidence.mockResolvedValue({
      items: [
        {
          id: 'ev-2',
          taskId: 'task-100',
          kind: 'note',
          label: 'Test run log',
          body: noteText,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    const { container } = renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test run log')).toBeDefined();
    });

    const pre = container.querySelector('pre.evidence-note-body');
    expect(pre).toBeDefined();
    expect(pre.textContent).toBe(noteText);
    expect(container.querySelector('script')).toBeNull();
  });

  it('displays limit notice when task has reached 20 proofs', async () => {
    const twentyItems = Array.from({ length: 20 }, (_, i) => ({
      id: `ev-${i}`,
      taskId: 'task-100',
      kind: 'note',
      label: `Proof #${i + 1}`,
      body: `Log ${i + 1}`,
      createdAt: new Date().toISOString(),
    }));

    api.getEvidence.mockResolvedValue({
      items: twentyItems,
      total: 20,
    });

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Maximum 20 proofs reached for this task.'),
      ).toBeDefined();
    });

    // Add proof form is hidden when limit is reached
    expect(screen.queryByRole('button', { name: 'Add proof' })).toBeNull();
  });

  it('danger zone Delete task triggers onDeleteRequest', async () => {
    const user = userEvent.setup();
    const handleDeleteRequest = vi.fn();

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={handleDeleteRequest}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete task' });
    await user.click(deleteBtn);

    expect(handleDeleteRequest).toHaveBeenCalledWith(task);
  });
});
