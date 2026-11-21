import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Projects from './Projects';

describe('Projects component', () => {
  it('renders project list with "done of total done" task counts per P-01', () => {
    const projects = [
      {
        id: 'proj-1',
        name: 'Alpha Project',
        status: 'active',
        taskCounts: { total: 8, done: 3 },
      },
      {
        id: 'proj-2',
        name: 'Beta Project',
        status: 'completed',
        taskCounts: { total: 5, done: 5 },
      },
    ];

    render(
      <Projects
        projects={projects}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        isPending={false}
        isDeleting={false}
        isLoading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Alpha Project')).toBeDefined();
    expect(screen.getByText('3 of 8 done')).toBeDefined();

    expect(screen.getByText('Beta Project')).toBeDefined();
    expect(screen.getByText('5 of 5 done')).toBeDefined();
  });
});
