// Light and dark mode. The small inline script in Base.astro sets data-theme before the page paints.
// This module runs the toggle button and tells listeners (like the globe) when the theme changes.

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** The visitor's saved choice, or null when they have not picked one. Storage can be blocked, so never throw. */
function saved(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.dispatchEvent(new CustomEvent('themechange'));
}

export function onThemeChange(fn: (theme: Theme) => void) {
  document.addEventListener('themechange', () => fn(currentTheme()));
}

export function setupThemeToggle(button: HTMLButtonElement) {
  const paint = () => {
    const dark = currentTheme() === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  };
  button.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch { /* the choice just won't be remembered */ }
    apply(next);
  });
  // Until the visitor picks a theme, follow the device setting as it changes.
  media.addEventListener('change', (e) => { if (!saved()) apply(e.matches ? 'dark' : 'light'); });
  onThemeChange(paint);
  paint();
}
