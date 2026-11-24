import { useState } from 'react';
import Icon from './Icon';

export default function ThemeToggle({ onToggle }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  const toggle = () => {
    const currentTheme =
      typeof document !== 'undefined'
        ? document.documentElement.getAttribute('data-theme')
        : isDark
          ? 'dark'
          : 'light';
    const currentlyDark = currentTheme === 'dark';
    const nextDark = !currentlyDark;
    const nextTheme = nextDark ? 'dark' : 'light';

    const updateThemeState = () => {
      document.documentElement.setAttribute('data-theme', nextTheme);
      setIsDark(nextDark);
      try {
        localStorage.setItem('theme', nextTheme);
      } catch {
        // ignore
      }
      onToggle && onToggle(nextTheme);
    };

    if (
      typeof document !== 'undefined' &&
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(updateThemeState);
      // Synchronously set attribute for immediate DOM read consistency
      document.documentElement.setAttribute('data-theme', nextTheme);
      setIsDark(nextDark);
      try {
        localStorage.setItem('theme', nextTheme);
      } catch {
        // ignore
      }
    } else {
      updateThemeState();
    }
  };

  return (
    <button
      type="button"
      className="button button-ghost theme-toggle"
      onClick={toggle}
      aria-pressed={isDark}
      aria-keyshortcuts="t"
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={16} />
      <span>{isDark ? 'Light' : 'Dark'}</span>
      <kbd aria-hidden="true">t</kbd>
    </button>
  );
}
