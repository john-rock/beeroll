import { QualityPreset } from '../types/recording';

export interface QualityConfig {
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  frameRate: number;
  width: number;
  height: number;
  description: string;
}

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
const QUALITY_PRESET_STORAGE_KEY = 'recora-quality-preset';

// Default quality preset
const DEFAULT_QUALITY_PRESET: QualityPreset = 'balanced';

/**
 * Get the quality configuration for a given preset
 */
export function getQualityConfig(preset: QualityPreset): QualityConfig {
  return QUALITY_PRESETS[preset];
}

/**
 * Save the user's quality preset selection to local storage
 */
export function saveQualityPreset(preset: QualityPreset): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(QUALITY_PRESET_STORAGE_KEY, preset);
    }
  } catch (error) {
    console.warn('Failed to save quality preset to local storage:', error);
  }
}

/**
 * Retrieve the user's saved quality preset from local storage
 * Returns the default preset if none is saved or if local storage is unavailable
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
 */
export function clearSavedQualityPreset(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(QUALITY_PRESET_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to clear quality preset from local storage:', error);
  }
}

/**
 * Check if a string is a valid quality preset
 */
function isValidQualityPreset(value: string): value is QualityPreset {
  return ['high', 'balanced', 'compressed'].includes(value);
}

/**
 * Get the quality configuration for the user's saved preset
 */
export function getSavedQualityConfig(): QualityConfig {
  const preset = getSavedQualityPreset();
  return getQualityConfig(preset);
}
