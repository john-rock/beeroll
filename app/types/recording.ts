export interface RecordingOptions {
  audio: boolean;
  video: boolean;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startTime: number | null;
}

export interface CompressionSettings {
  quality: 'high' | 'balanced' | 'compressed';
  format: 'mp4' | 'webm';
}

export type RecordingState = 'inactive' | 'recording' | 'paused' | 'stopped';

export interface RecordingManager {
  startRecording(options: RecordingOptions): Promise<void>;
  stopRecording(): Promise<Blob>;
  pauseRecording(): void;
  resumeRecording(): void;
  getStatus(): RecordingStatus;
}
