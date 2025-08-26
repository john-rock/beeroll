'use client';

import { formatDuration } from '../utils/fileDownload';

interface RecordingStatusProps {
  /** Whether the recording is currently active */
  isRecording: boolean;
  /** Whether the recording is currently paused */
  isPaused: boolean;
  /** Current duration of the recording in seconds */
  duration: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for displaying the current recording status and duration.
 * 
 * Features:
 * - Visual recording indicator with animations
 * - Duration timer display
 * - Pause/recording state differentiation
 * - Accessible status information
 * - Progress bar visualization
 * 
 * @example
 * ```tsx
 * <RecordingStatus
 *   isRecording={true}
 *   isPaused={false}
 *   duration={65}
 *   className="scale-110"
 * />
 * ```
 */
export function RecordingStatus({ 
  isRecording, 
  isPaused, 
  duration, 
  className = '' 
}: RecordingStatusProps) {
  if (!isRecording && !isPaused) {
    return null;
  }

  const statusText = isRecording ? 'Recording' : 'Paused';
  const statusColor = isRecording ? 'red' : 'yellow';

  return (
    <div 
      className={`text-center space-y-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${statusText} - ${formatDuration(duration)}`}
    >
      {/* Status Indicator */}
      <div className="flex items-center justify-center space-x-3">
        {isRecording && (
          <div className="flex items-center space-x-2 animate-pulse" role="status" aria-label="Recording indicator">
            <div className="relative">
              <div className="w-4 h-4 bg-red-500 rounded-full" aria-hidden="true"></div>
              <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" aria-hidden="true"></div>
            </div>
            <span className="text-red-400 font-semibold text-lg">REC</span>
          </div>
        )}
        
        {isPaused && (
          <div className="flex items-center space-x-2" role="status" aria-label="Paused indicator">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" aria-hidden="true"></div>
            <span className="text-yellow-400 font-semibold text-lg">PAUSED</span>
          </div>
        )}
      </div>

      {/* Duration Timer */}
      <div className="relative">
        <div 
          className="text-4xl font-mono font-bold text-gray-900 dark:text-white transition-colors duration-300"
          aria-label={`Recording duration: ${formatDuration(duration)}`}
        >
          {formatDuration(duration)}
        </div>
        
        {/* Subtle pulse animation for recording */}
        {isRecording && (
          <div 
            className="absolute inset-0 text-4xl font-mono font-bold text-red-400 opacity-20 animate-pulse"
            aria-hidden="true"
          >
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Recording Progress Bar */}
      {(isRecording || isPaused) && (
        <div className="w-full max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>00:00</span>
            <span>{statusText}</span>
            <span>∞</span>
          </div>
          <div 
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"
            role="progressbar"
            aria-valuenow={isRecording ? 100 : 75}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${statusText} progress`}
          >
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isRecording ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              style={{ 
                width: isRecording ? '100%' : '75%',
                animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}
