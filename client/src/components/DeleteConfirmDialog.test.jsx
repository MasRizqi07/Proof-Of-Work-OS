import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmDialog from './DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  const task = { id: 'task-1', title: 'Hardened Task' };

  it('renders dialog with task title and warning that evidence will be deleted', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        task={task}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Delete this task?' }),
    ).toBeDefined();
    expect(screen.getByText(/Hardened Task/)).toBeDefined();
    expect(
      screen.getByText(
        /will be permanently deleted\. This action cannot be undone\./i,
      ),
    ).toBeDefined();
  });

  it('Cancel button invokes onClose without invoking onConfirm', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeleteConfirmDialog
        isOpen={true}
        task={task}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('Delete task button invokes onConfirm with task id', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeleteConfirmDialog
        isOpen={true}
        task={task}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete task' });
    await user.click(deleteBtn);

    expect(handleConfirm).toHaveBeenCalledWith('task-1');
  });

  it('Escape/Cancel event triggers onClose', () => {
    const handleClose = vi.fn();

    const { container } = render(
      <DeleteConfirmDialog
        isOpen={true}
        task={task}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = container.querySelector('dialog');
    fireEvent(dialog, new Event('cancel'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
