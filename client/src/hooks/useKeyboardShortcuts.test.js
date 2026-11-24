import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts (K-01, K-02)', () => {
  it('triggers onOpenPalette on Ctrl+K or Cmd+K', () => {
    const onOpenPalette = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        onOpenPalette,
      }),
    );

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
    );
    expect(onOpenPalette).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'K', metaKey: true }),
    );
    expect(onOpenPalette).toHaveBeenCalledTimes(2);
  });

  it('triggers single-letter shortcuts when focused on body', () => {
    const onFocusNewTask = vi.fn();
    const onFocusSearch = vi.fn();
    const onToggleTheme = vi.fn();
    const onOpenHelp = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onFocusNewTask,
        onFocusSearch,
        onToggleTheme,
        onOpenHelp,
      }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    expect(onFocusNewTask).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(onFocusSearch).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('suppresses single-letter shortcuts when focused inside an input or textarea', () => {
    const onFocusNewTask = vi.fn();
    const onToggleTheme = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onFocusNewTask,
        onToggleTheme,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));

    expect(onFocusNewTask).not.toHaveBeenCalled();
    expect(onToggleTheme).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('suppresses single-letter shortcuts when an open dialog exists in DOM', () => {
    const onFocusNewTask = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onFocusNewTask,
      }),
    );

    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    expect(onFocusNewTask).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });
});
