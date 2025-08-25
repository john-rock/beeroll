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

export function getQualityConfig(preset: QualityPreset): QualityConfig {
  return QUALITY_PRESETS[preset];
}
