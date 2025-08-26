import { QualityPreset } from '../types/recording';

/**
 * Configuration for video quality presets
 */
export interface QualityConfig {
  /** Video bitrate in bits per second */
  videoBitsPerSecond: number;
  /** Audio bitrate in bits per second */
  audioBitsPerSecond: number;
  /** Target frame rate in frames per second */
  frameRate: number;
  /** Target video width in pixels */
  width: number;
  /** Target video height in pixels */
  height: number;
  /** Human-readable description of the quality preset */
  description: string;
}

/**
 * Quality presets for video recording with optimized settings for different use cases.
 * 
 * Each preset balances quality, file size, and performance based on common recording needs.
 * 
 * @example
 * ```typescript
 * const config = getQualityConfig('balanced');
 * console.log(`Using ${config.description} with ${config.videoBitsPerSecond} bps video`);
 * ```
 */
export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  high: {
    videoBitsPerSecond: 8000000, // 8 Mbps - 1080p @ 60fps
    audioBitsPerSecond: 192000,  // 192 kbps
    frameRate: 60,
    width: 1920,
    height: 1080,
    description: 'High Quality - 1080p @ 60fps, ~8 Mbps'
  },
  balanced: {
    videoBitsPerSecond: 4000000, // 4 Mbps - 720p @ 30fps  
    audioBitsPerSecond: 128000,  // 128 kbps
    frameRate: 30,
    width: 1280,
    height: 720,
    description: 'Balanced - 720p @ 30fps, ~4 Mbps'
  },
  compressed: {
    videoBitsPerSecond: 2000000, // 2 Mbps - 480p @ 24fps
    audioBitsPerSecond: 96000,   // 96 kbps
    frameRate: 24,
    width: 854,
    height: 480,
    description: 'Compressed - 480p @ 24fps, ~2 Mbps'
  }
};

// Local storage key for quality preset
const QUALITY_PRESET_STORAGE_KEY = 'beeroll-quality-preset';

// Default quality preset
const DEFAULT_QUALITY_PRESET: QualityPreset = 'balanced';

/**
 * Get the quality configuration for a given preset
 * 
 * @param preset - The quality preset to get configuration for
 * @returns Quality configuration object
 * @throws Error if the preset is invalid
 * 
 * @example
 * ```typescript
 * const config = getQualityConfig('high');
 * console.log(`High quality uses ${config.videoBitsPerSecond} bps video`);
 * ```
 */
export function getQualityConfig(preset: QualityPreset): QualityConfig {
  if (!isValidQualityPreset(preset)) {
    throw new Error(`Invalid quality preset: ${preset}. Valid presets are: ${Object.keys(QUALITY_PRESETS).join(', ')}`);
  }
  return QUALITY_PRESETS[preset];
}

/**
 * Save the user's quality preset selection to local storage
 * 
 * @param preset - The quality preset to save
 * @returns True if saved successfully, false otherwise
 * 
 * @example
 * ```typescript
 * const saved = saveQualityPreset('high');
 * if (saved) {
 *   console.log('Quality preset saved successfully');
 * }
 * ```
 */
export function saveQualityPreset(preset: QualityPreset): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!isValidQualityPreset(preset)) {
        console.warn(`Attempted to save invalid quality preset: ${preset}`);
        return false;
      }
      
      localStorage.setItem(QUALITY_PRESET_STORAGE_KEY, preset);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to save quality preset to local storage:', error);
    return false;
  }
}

/**
 * Retrieve the user's saved quality preset from local storage
 * 
 * Returns the default preset if none is saved or if local storage is unavailable.
 * 
 * @returns The saved quality preset or default if none found
 * 
 * @example
 * ```typescript
 * const savedPreset = getSavedQualityPreset();
 * console.log(`Using saved preset: ${savedPreset}`);
 * ```
 */
export function getSavedQualityPreset(): QualityPreset {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(QUALITY_PRESET_STORAGE_KEY);
      if (saved && isValidQualityPreset(saved)) {
        return saved as QualityPreset;
      }
    }
  } catch (error) {
    console.warn('Failed to retrieve quality preset from local storage:', error);
  }
  return DEFAULT_QUALITY_PRESET;
}

/**
 * Clear the saved quality preset from local storage
 * 
 * @returns True if cleared successfully, false otherwise
 * 
 * @example
 * ```typescript
 * const cleared = clearSavedQualityPreset();
 * if (cleared) {
 *   console.log('Saved quality preset cleared');
 * }
 * ```
 */
export function clearSavedQualityPreset(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(QUALITY_PRESET_STORAGE_KEY);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to clear quality preset from local storage:', error);
    return false;
  }
}

/**
 * Check if a string is a valid quality preset
 * 
 * @param value - The string to validate
 * @returns True if the value is a valid quality preset
 * 
 * @example
 * ```typescript
 * if (isValidQualityPreset('high')) {
 *   console.log('Valid quality preset');
 * }
 * ```
 */
export function isValidQualityPreset(value: string): value is QualityPreset {
  return Object.keys(QUALITY_PRESETS).includes(value);
}

/**
 * Get the quality configuration for the user's saved preset
 * 
 * @returns Quality configuration for the saved preset
 * 
 * @example
 * ```typescript
 * const config = getSavedQualityConfig();
 * console.log(`Using saved preset: ${config.description}`);
 * ```
 */
export function getSavedQualityConfig(): QualityConfig {
  const preset = getSavedQualityPreset();
  return getQualityConfig(preset);
}

/**
 * Get all available quality presets
 * 
 * @returns Array of all quality preset names
 * 
 * @example
 * ```typescript
 * const presets = getAllQualityPresets();
 * console.log('Available presets:', presets);
 * ```
 */
export function getAllQualityPresets(): QualityPreset[] {
  return Object.keys(QUALITY_PRESETS) as QualityPreset[];
}

/**
 * Get quality preset recommendations based on device capabilities
 * 
 * @returns Recommended quality preset for the current device
 * 
 * @example
 * ```typescript
 * const recommended = getRecommendedQualityPreset();
 * console.log(`Recommended preset: ${recommended}`);
 * ```
 */
export function getRecommendedQualityPreset(): QualityPreset {
  // Check device capabilities and recommend appropriate preset
  if (typeof window !== 'undefined') {
    const { devicePixelRatio, screen } = window;
    
    // High DPI displays can handle higher quality
    if (devicePixelRatio && devicePixelRatio > 2) {
      return 'high';
    }
    
    // Large screens benefit from higher quality
    if (screen && screen.width > 1920) {
      return 'high';
    }
    
    // Mobile devices should use compressed
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return 'compressed';
    }
  }
  
  // Default to balanced for most devices
  return 'balanced';
}
