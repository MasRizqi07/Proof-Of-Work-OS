import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TaskFilter from './TaskFilter';

describe('TaskFilter Search & Debounce (S-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search input with label and shortcut hint', () => {
    render(
      <TaskFilter
        statusFilter=""
        onStatusChange={vi.fn()}
        projectFilter=""
        onProjectChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Search tasks/i)).toBeDefined();
  });

  it('debounces input changes by 250ms before calling onSearchChange', () => {
    const onSearchChange = vi.fn();
    render(
      <TaskFilter
        statusFilter=""
        onStatusChange={vi.fn()}
        projectFilter=""
        onProjectChange={vi.fn()}
        onSearchChange={onSearchChange}
      />,
    );

    const input = screen.getByPlaceholderText(
      'Search by title or description...',
    );
    fireEvent.change(input, { target: { value: 'architect' } });

    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSearchChange).toHaveBeenCalledWith('architect');
  });

  it('clears search when clear button is clicked', () => {
    const onSearchChange = vi.fn();
    render(
      <TaskFilter
        statusFilter=""
        onStatusChange={vi.fn()}
        projectFilter=""
        onProjectChange={vi.fn()}
        searchValue="existing"
        onSearchChange={onSearchChange}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});
