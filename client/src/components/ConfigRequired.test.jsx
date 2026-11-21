import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfigRequired from './ConfigRequired';

describe('ConfigRequired screen', () => {
  it('renders missing variable names and never makes fetch calls', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <ConfigRequired
        missingVars={['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Configuration required' }),
    ).toBeDefined();
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeDefined();
    expect(screen.getByText('VITE_SUPABASE_ANON_KEY')).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
