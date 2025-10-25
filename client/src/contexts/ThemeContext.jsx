/**
 * 🎨 THEME CONTEXT
 * Dark/Light theme management with OS sync
 * Supports: auto, dark, light modes
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  systemTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to 'auto'
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('streamvault-theme');
    return saved || 'auto';
  });

  const [systemTheme, setSystemTheme] = useState('dark');

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    // Initial check
    updateSystemTheme();

    // Listen for changes
    mediaQuery.addEventListener('change', updateSystemTheme);

    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  // Sync with Electron nativeTheme if available
  useEffect(() => {
    if (window.electronAPI?.theme) {
      // Get initial theme
      window.electronAPI.theme.get().then((electronTheme) => {
        setSystemTheme(electronTheme);
      });

      // Listen for theme changes
      const cleanup = window.electronAPI.theme.onChange((newTheme) => {
        setSystemTheme(newTheme);
      });

      return cleanup;
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const effectiveTheme = theme === 'auto' ? systemTheme : theme;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${effectiveTheme}-theme`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#141414' : '#ffffff');
    }
  }, [theme, systemTheme]);

  const setTheme = useCallback((newTheme) => {
    if (['auto', 'dark', 'light'].includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('streamvault-theme', newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      systemTheme,
      effectiveTheme: theme === 'auto' ? systemTheme : theme,
      setTheme,
      toggleTheme
    }),
    [theme, systemTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
