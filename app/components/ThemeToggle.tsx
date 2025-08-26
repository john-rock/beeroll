'use client';

import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Theme toggle component for switching between light and dark modes.
 * 
 * Features:
 * - Visual theme indicator
 * - Keyboard navigation support
 * - Accessible button labeling
 * - Smooth transitions and animations
 * - Fixed positioning for easy access
 * 
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTheme();
    }
  };

  const currentTheme = isDarkMode ? 'dark' : 'light';
  const nextTheme = isDarkMode ? 'light' : 'dark';

  return (
    <button
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="fixed bottom-6 right-6 p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl z-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      title={`Switch to ${nextTheme} mode`}
      aria-label={`Switch to ${nextTheme} mode. Currently using ${currentTheme} mode.`}
      role="button"
      tabIndex={0}
    >
      {isDarkMode ? (
        <Sun className="w-6 h-6" aria-hidden="true" />
      ) : (
        <Moon className="w-6 h-6" aria-hidden="true" />
      )}
    </button>
  );
}
