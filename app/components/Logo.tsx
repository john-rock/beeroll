'use client';

/**
 * Logo component for the beeroll application.
 * 
 * Features:
 * - Responsive sizing
 * - Dark mode support
 * - Accessible link to home
 * - Modern styling with borders and transitions
 * 
 * @example
 * ```tsx
 * <Logo />
 * ```
 */
export function Logo() {
  return (
    <div className="flex items-center">
      <h1 className="text-2xl sm:text-3xl font-bold text-retro-brown dark:text-retro-brown bg-clip-text border-2 border-retro-brown dark:border-retro-brown rounded-2xl inline-block px-4 py-1 transition-all duration-300 hover:scale-105">
        beeroll
      </h1>
    </div>
  );
}
