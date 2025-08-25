'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply theme to document
  const applyTheme = (theme: Theme, skipDOMUpdate = false) => {
    const root = document.documentElement;
    
    if (!skipDOMUpdate) {
      root.classList.remove('light', 'dark');
    }

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
      if (!skipDOMUpdate) {
        if (systemPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      }
    } else {
      setIsDarkMode(theme === 'dark');
      if (!skipDOMUpdate) {
        root.classList.add(theme);
      }
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme = savedTheme || 'system';
    setTheme(initialTheme);
    
    // Don't apply theme on initial load since the blocking script already did it
    // Just sync the state with what's already applied
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Only apply theme if it's different from what the blocking script applied
    if (initialTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if ((systemPrefersDark && !isDark) || (!systemPrefersDark && isDark)) {
        applyTheme(initialTheme);
      }
    } else if ((initialTheme === 'dark' && !isDark) || (initialTheme === 'light' && isDark)) {
      applyTheme(initialTheme);
    }
    
    setIsInitialized(true);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    handleSetTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        setTheme: handleSetTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
