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

  it('R-02: retains focus on Label input when parent component re-renders', async () => {
    const user = userEvent.setup();

    const { rerender } = renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    const labelInput = screen.getByLabelText(/Label/i);
    await user.click(labelInput);
    expect(document.activeElement).toBe(labelInput);

    // Simulate parent re-render (e.g. tasks refetched in parent)
    rerender(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    // Focus must remain on the label input, not stolen by the heading
    expect(document.activeElement).toBe(labelInput);
  });

  it('R-03: sends only diffed fields on save and displays Saved. only after success', async () => {
    const user = userEvent.setup();
    const handleUpdateTask = vi.fn().mockResolvedValue({ id: 'task-100' });

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={handleUpdateTask}
        onDeleteRequest={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText(/^Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title Only');

    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    await user.click(saveBtn);

    expect(handleUpdateTask).toHaveBeenCalledWith({
      id: 'task-100',
      title: 'Updated Title Only',
    });

    await waitFor(() => {
      expect(screen.getByText('Saved.')).toBeDefined();
    });
  });

  it('R-03: reverts form and displays role="alert" message when server rejects update', async () => {
    const user = userEvent.setup();
    const handleUpdateTask = vi
      .fn()
      .mockRejectedValue(new Error('Server validation failed'));

    renderWithQuery(
      <TaskDetailDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onUpdateTask={handleUpdateTask}
        onDeleteRequest={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText(/^Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Rejected Title');

    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    await user.click(saveBtn);

    // Must show inline alert
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Server validation failed');
    });

    // Must NOT show "Saved."
    expect(screen.queryByText('Saved.')).toBeNull();

    // Must revert title input back to original value
    expect(titleInput.value).toBe(task.title);
  });

  it('R-10: renders non-http/https URL evidence as plain text without link', async () => {
    api.getEvidence.mockResolvedValue({
      items: [
        {
          id: 'ev-3',
          taskId: 'task-100',
          kind: 'url',
          label: 'Local File',
          url: 'file:///path/to/local/report.pdf',
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
      expect(screen.getByText('Local File')).toBeDefined();
    });

    // Should NOT render an <a> tag for file://
    const links = container.querySelectorAll('a[href^="file://"]');
    expect(links.length).toBe(0);

    // Should render as plain text inside code
    expect(screen.getByText('file:///path/to/local/report.pdf')).toBeDefined();
  });
});
