import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from './CommandPalette';

describe('CommandPalette (K-01)', () => {
  const dummyTasks = [
    { id: '1', title: 'Task Alpha', status: 'todo' },
    { id: '2', title: 'Task Beta', status: 'done' },
  ];

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={vi.fn()} tasks={dummyTasks} />,
    );
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('renders dialog with combobox and listbox when isOpen is true', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} tasks={dummyTasks} />,
    );

    const input = screen.getByRole('combobox');
    expect(input).toBeDefined();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('palette-listbox');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('Task Alpha')).toBeDefined();
  });

  it('filters actions and tasks client-side without network calls', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} tasks={dummyTasks} />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'theme' } });

    expect(screen.getByText('Toggle theme')).toBeDefined();
    expect(screen.queryByText('Task Alpha')).toBeNull();
  });

  it('displays empty state when no match is found', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} tasks={dummyTasks} />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'nonexistentquery123' } });

    expect(
      screen.getByText('No match. Try a task title or an action.'),
    ).toBeDefined();
  });

  it('navigates with keyboard and executes action on Enter', () => {
    const onToggleTheme = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        tasks={dummyTasks}
        onToggleTheme={onToggleTheme}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'theme' } });

    // Press Enter to execute the active item
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
