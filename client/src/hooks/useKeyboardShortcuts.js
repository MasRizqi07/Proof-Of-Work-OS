import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onOpenPalette,
  onFocusNewTask,
  onFocusSearch,
  onToggleTheme,
  onOpenHelp,
  isEnabled = true,
}) {
  useEffect(() => {
    if (!isEnabled) return undefined;

    const handleKeyDown = (e) => {
      // 1. Palette shortcut: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenPalette && onOpenPalette();
        return;
      }

      // Check if an input, textarea, select, or contenteditable element has focus
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName;
      const isEditable =
        activeEl?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';

      if (isEditable) return;

      // Check if any modal dialog is currently open
      const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));
      if (hasOpenDialog) return;

      // Single-letter shortcuts
      if (e.key === 'n') {
        e.preventDefault();
        onFocusNewTask && onFocusNewTask();
      } else if (e.key === '/') {
        e.preventDefault();
        onFocusSearch && onFocusSearch();
      } else if (e.key === 't') {
        e.preventDefault();
        onToggleTheme && onToggleTheme();
      } else if (e.key === '?') {
        e.preventDefault();
        onOpenHelp && onOpenHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isEnabled,
    onOpenPalette,
    onFocusNewTask,
    onFocusSearch,
    onToggleTheme,
    onOpenHelp,
  ]);
}
