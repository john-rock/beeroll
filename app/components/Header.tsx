'use client';

import { Logo } from './Logo';

/**
 * Header component for the beeroll application.
 * 
 * Features:
 * - Logo display
 * - GitHub contribute link
 * - Responsive design
 * - Dark mode support
 * 
 * @example
 * ```tsx
 * <Header />
 * ```
 */
export function Header() {
  return (
    <header className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <Logo />
        
        <a
          href="https://github.com/john-rock/beeroll"
          target="_blank"
          rel="noopener noreferrer"
          className="text-retro-brown dark:text-retro-brown hover:text-retro-orange dark:hover:text-retro-orange font-medium transition-colors duration-200 underline decoration-retro-accent hover:decoration-retro-orange"
          aria-label="Contribute to beeroll on GitHub (opens in new tab)"
        >
          Contribute on GitHub
        </a>
      </div>
    </header>
  );
}
