'use client';

/**
 * Logo component for the beeroll application.
 * 
 * Features:
 * - Responsive sizing
 * - Dark mode support
 * - Accessible link to home
 * 
 * @example
 * ```tsx
 * <Logo />
 * ```
 */
export function Logo() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-retro-brown dark:text-retro-brown">
        beeroll
      </h1>
    </div>
  );
}
