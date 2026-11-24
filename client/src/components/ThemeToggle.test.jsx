import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('toggles theme, updates data-theme attribute on document, and persists to localStorage', async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const toggleBtn = screen.getByRole('button', { name: /dark/i });
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');

    // Click to switch to dark
    await user.click(toggleBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');

    // Click to switch back to light
    await user.click(toggleBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
