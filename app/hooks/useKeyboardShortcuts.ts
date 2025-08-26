'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Configuration for a single keyboard shortcut
 */
interface KeyboardShortcutConfig {
  /** The key to listen for (e.g., 'r', 'Enter', 'Escape') */
  key: string;
  /** Whether Ctrl key must be pressed */
  ctrlKey?: boolean;
  /** Whether Shift key must be pressed */
  shiftKey?: boolean;
  /** Whether Alt key must be pressed */
  altKey?: boolean;
  /** Whether Meta key (Cmd on Mac, Win on Windows) must be pressed */
  metaKey?: boolean;
  /** Function to call when shortcut is triggered */
  callback: () => void;
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Whether to prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Description of the shortcut for accessibility */
  description?: string;
  /** Priority for shortcut handling (higher numbers = higher priority) */
  priority?: number;
}

/**
 * Configuration for the keyboard shortcuts hook
 */
interface UseKeyboardShortcutsConfig {
  /** Whether to enable shortcuts globally (default: true) */
  enabled?: boolean;
  /** Whether to log shortcut triggers for debugging (default: false) */
  debug?: boolean;
  /** Custom event target (default: document on client side) */
  target?: EventTarget | null;
  /** Whether to ignore shortcuts when typing in form fields (default: true) */
  ignoreFormFields?: boolean;
}

/**
 * Hook for managing multiple keyboard shortcuts with advanced configuration.
 * 
 * Features:
 * - Multiple shortcut support with priority handling
 * - Form field detection and shortcut suppression
 * - Configurable modifier key combinations
 * - Debug logging and accessibility support
 * - Custom event target support
 * - Performance optimized with useCallback
 * 
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param config - Optional configuration for the hook
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'r',
 *     description: 'Start recording',
 *     callback: () => startRecording(),
 *     enabled: !isRecording
 *   },
 *   {
 *     key: 'Escape',
 *     description: 'Stop recording',
 *     callback: () => stopRecording(),
 *     enabled: isRecording
 *   }
 * ], {
 *   debug: true,
 *   ignoreFormFields: true
 * });
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcutConfig[],
  config: UseKeyboardShortcutsConfig = {}
) {
  const {
    enabled = true,
    debug = false,
    target,
    ignoreFormFields = true
  } = config;

  // Default to document only on client side
  const defaultTarget = typeof document !== 'undefined' ? document : null;
  const eventTarget = target || defaultTarget;

  // Ref to store shortcuts for stable reference
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  // Check if we should return early (but don't return yet)
  const shouldReturnEarly = typeof window === 'undefined';

  // All hooks must be called before any early returns
  const shouldIgnoreShortcuts = useCallback((target: EventTarget | null): boolean => {
    if (!ignoreFormFields || !target) return false;
    
    const element = target as HTMLElement;
    if (!element) return false;
    
    // Check for form input elements
    const formTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (formTags.includes(element.tagName)) {
      return true;
    }
    
    // Check for contenteditable elements
    if (element.isContentEditable) {
      return true;
    }
    
    // Check for code editors and other special input areas
    const specialClasses = ['CodeMirror', 'monaco-editor', 'ace_editor'];
    if (specialClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }
    
    return false;
  }, [ignoreFormFields]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in form fields
    if (shouldIgnoreShortcuts(event.target)) {
      return;
    }

    const currentShortcuts = shortcutsRef.current;
    const triggeredShortcuts: Array<KeyboardShortcutConfig & { priority: number }> = [];

    // Find all matching shortcuts
    currentShortcuts.forEach(shortcut => {
      if (!shortcut.enabled) return;

      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === !!event.ctrlKey;
      const shiftMatches = !!shortcut.shiftKey === !!event.shiftKey;
      const altMatches = !!shortcut.altKey === !!event.altKey;
      const metaMatches = !!shortcut.metaKey === !!event.metaKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        triggeredShortcuts.push({
          ...shortcut,
          priority: shortcut.priority || 0
        });
      }
    });

    // Sort by priority (higher numbers = higher priority)
    triggeredShortcuts.sort((a, b) => b.priority - a.priority);

    // Execute the highest priority shortcut
    if (triggeredShortcuts.length > 0) {
      const shortcut = triggeredShortcuts[0];
      
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }

      if (debug) {
        console.log(`Keyboard shortcut triggered: ${shortcut.key}`, {
          shortcut: shortcut.description || shortcut.key,
          priority: shortcut.priority,
          modifiers: {
            ctrl: shortcut.ctrlKey,
            shift: shortcut.shiftKey,
            alt: shortcut.altKey,
            meta: shortcut.metaKey
          }
        });
      }

      try {
        shortcut.callback();
      } catch (error) {
        console.error('Error executing keyboard shortcut callback:', error);
      }
    }
  }, [enabled, debug, shouldIgnoreShortcuts]);

  const getShortcutDescription = useCallback((shortcut: KeyboardShortcutConfig): string => {
    const modifiers: string[] = [];
    
    if (shortcut.ctrlKey) modifiers.push('Ctrl');
    if (shortcut.shiftKey) modifiers.push('Shift');
    if (shortcut.altKey) modifiers.push('Alt');
    if (shortcut.metaKey) modifiers.push('⌘');
    
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    
    if (modifiers.length > 0) {
      return `${modifiers.join(' + ')} + ${key}`;
    }
    
    return key;
  }, []);

  const getActiveShortcuts = useCallback(() => {
    return shortcutsRef.current
      .filter(shortcut => shortcut.enabled)
      .map(shortcut => ({
        key: shortcut.key,
        description: shortcut.description || getShortcutDescription(shortcut),
        priority: shortcut.priority || 0
      }))
      .sort((a, b) => b.priority - a.priority);
  }, [getShortcutDescription]);

  // Set up event listener
  useEffect(() => {
    if (!enabled || !eventTarget) return;

    eventTarget.addEventListener('keydown', handleKeyDown as EventListener);
    
    return () => {
      eventTarget.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [eventTarget, handleKeyDown, enabled]);

  // Early return if not on client side
  if (shouldReturnEarly) {
    return {
      getActiveShortcuts: () => [],
      getShortcutDescription: () => ''
    };
  }



  return {
    getActiveShortcuts,
    getShortcutDescription
  };
}

/**
 * Convenience hook for single keyboard shortcut.
 * 
 * This is a simplified version of useKeyboardShortcuts for when you only
 * need to handle a single shortcut.
 * 
 * @param key - The key to listen for
 * @param callback - Function to call when shortcut is triggered
 * @param options - Optional configuration options
 * 
 * @example
 * ```tsx
 * useKeyboardShortcut('r', () => startRecording(), {
 *   enabled: !isRecording,
 *   description: 'Start recording',
 *   priority: 1
 * });
 * ```
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    enabled?: boolean;
    preventDefault?: boolean;
    description?: string;
    priority?: number;
  } = {}
) {
  const shortcuts = [{
    key,
    callback,
    enabled: options.enabled !== false,
    preventDefault: options.preventDefault !== false,
    description: options.description,
    priority: options.priority,
    ...options
  }];

  return useKeyboardShortcuts(shortcuts);
}

/**
 * Hook for managing global keyboard shortcuts that work anywhere in the app.
 * 
 * @param shortcuts - Array of global shortcut configurations
 * @param config - Optional configuration for the hook
 * 
 * @example
 * ```tsx
 * useGlobalKeyboardShortcuts([
 *   {
 *     key: 'F1',
 *     description: 'Show help',
 *     callback: () => showHelp(),
 *     priority: 10
 *   }
 * ]);
 * ```
 */
export function useGlobalKeyboardShortcuts(
  shortcuts: KeyboardShortcutConfig[],
  config: UseKeyboardShortcutsConfig = {}
) {
  return useKeyboardShortcuts(shortcuts, {
    ...config,
    target: typeof window !== 'undefined' ? window : null, // Use window for global shortcuts
    ignoreFormFields: false // Don't ignore form fields for global shortcuts
  });
}
