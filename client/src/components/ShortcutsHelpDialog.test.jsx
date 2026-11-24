import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutsHelpDialog from './ShortcutsHelpDialog';

describe('ShortcutsHelpDialog (K-03)', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ShortcutsHelpDialog isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('renders shortcuts table when isOpen is true', () => {
    render(<ShortcutsHelpDialog isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).toBeDefined();
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByText('Open command palette')).toBeDefined();
    expect(screen.getByText('Focus new task form title input')).toBeDefined();
    expect(screen.getByText('Focus task search input')).toBeDefined();
    expect(screen.getByText('Toggle light / dark color theme')).toBeDefined();
    expect(screen.getByText('Got it')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelpDialog isOpen={true} onClose={onClose} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Close shortcuts help dialog' }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
