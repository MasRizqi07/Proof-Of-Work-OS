import { useState } from 'react';
import Icon from './Icon';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  const toggle = () => {
    const nextDark = !isDark;
    const nextTheme = nextDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setIsDark(nextDark);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      className="button button-ghost theme-toggle"
      onClick={toggle}
      aria-label="Dark theme"
      aria-pressed={isDark}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={16} />
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
