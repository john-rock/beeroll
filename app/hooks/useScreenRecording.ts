'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingOptions, RecordingState, RecordingStatus } from '../types/recording';
import { getQualityConfig } from '../utils/qualitySettings';
import { getMixedAudioStream } from '../utils/audioDevices';
import { RecordingErrorHandler, RecordingError } from '../utils/errorHandling';

/**
 * Configuration for the screen recording hook
 */
interface UseScreenRecordingConfig {
  /** Whether to enable automatic cleanup on unmount */
  autoCleanup?: boolean;
  /** Custom error handler for recording errors */
  onError?: (error: RecordingError) => void;
  /** Callback when recording state changes */
  onStateChange?: (state: RecordingState) => void;
  /** Callback when recording duration updates */
  onDurationUpdate?: (duration: number) => void;
}

/**
 * Comprehensive hook for managing screen recording functionality.
 * 
 * Features:
 * - Screen capture with quality presets
 * - Audio mixing (system + microphone)
 * - Pause/resume functionality
 * - Automatic cleanup and error handling
 * - Timer management and status tracking
 * - Mute controls and audio level management
 * 
 * @param config - Optional configuration for the hook
 * @returns Object containing recording state and control functions
 * 
 * @example
 * ```tsx
 * const {
 *   recordingState,
 *   duration,
 *   error,
 *   startRecording,
 *   stopRecording,
 *   pauseRecording,
 *   resumeRecording
 * } = useScreenRecording({
 *   onError: (error) => console.error('Recording error:', error),
 *   onStateChange: (state) => console.log('State changed to:', state)
 * });
 * 
 * // Start recording
 * await startRecording({
 *   audio: { system: true, microphone: true },
 *   video: true,
 *   quality: 'balanced'
 * });
 * ```
 */
export function useScreenRecording(config: UseScreenRecordingConfig = {}) {
  const { 
    autoCleanup = true, 
    onError, 
    onStateChange, 
    onDurationUpdate 
  } = config;

  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<RecordingError | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs for managing recording resources
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordingRef = useRef<(() => Promise<Blob>) | null>(null);

  /**
   * Update the recording timer
   */
  const updateTimer = useCallback(() => {
    if (startTimeRef.current) {
      const newDuration = Date.now() - startTimeRef.current;
      setDuration(newDuration);
      onDurationUpdate?.(newDuration);
    }
  }, [onDurationUpdate]);

  /**
   * Start screen recording with specified options
   * 
   * @param options - Recording configuration options
   * @throws Error if recording fails to start
   */
  const startRecording = useCallback(async (options: RecordingOptions = { 
    audio: true, 
    video: true, 
    quality: 'balanced' 
  }) => {
    try {
      // Reset state
      setError(null);
      setDuration(0);
      
      // Validate options
      if (!options.video && !options.audio) {
        throw new Error('At least one of video or audio must be enabled');
      }
      
      // Get quality configuration
      const qualityConfig = getQualityConfig(options.quality || 'balanced');
      
      // Determine audio configuration
      const audioOptions = typeof options.audio === 'object' 
        ? options.audio 
        : { system: !!options.audio, microphone: false };
      
      // Request screen capture with quality-based settings
      let stream = await navigator.mediaDevices.getDisplayMedia({
        video: options.video ? {
          frameRate: { ideal: qualityConfig.frameRate, max: qualityConfig.frameRate },
          width: { max: qualityConfig.width },
          height: { max: qualityConfig.height }
        } : false,
        audio: audioOptions.system
      });

      // If microphone is requested, mix it with the screen audio
      if (audioOptions.microphone && typeof options.audio === 'object') {
        try {
          stream = await getMixedAudioStream(stream, audioOptions.deviceId);
        } catch (err) {
          console.warn('Failed to add microphone audio:', err);
          // Continue with just screen audio
        }
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Set up MediaRecorder with proper MIME type
      let mimeType = '';
      const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        throw new Error('No supported video format found. Please use a modern browser.');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualityConfig.videoBitsPerSecond,
        audioBitsPerSecond: qualityConfig.audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Set up MediaRecorder event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        const newState: RecordingState = 'recording';
        setRecordingState(newState);
        startTimeRef.current = Date.now();
        setDuration(0);
        
        // Start timer
        timerRef.current = setInterval(updateTimer, 1000);
        
        onStateChange?.(newState);
      };

      mediaRecorder.onstop = () => {
        const newState: RecordingState = 'stopped';
        setRecordingState(newState);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        onStateChange?.(newState);
      };

      mediaRecorder.onerror = (event) => {
        const recordingError = RecordingErrorHandler.handleError(
          (event as ErrorEvent).error || new Error('Recording failed')
        );
        setError(recordingError);
        setRecordingState('inactive');
        onError?.(recordingError);
        onStateChange?.('inactive');
      };

      // Handle stream ending (user stops sharing)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          if (mediaRecorder.state === 'recording' && stopRecordingRef.current) {
            stopRecordingRef.current();
          }
        });
      }

      mediaRecorder.start(1000); // Collect data every second
      
    } catch (err) {
      const recordingError = RecordingErrorHandler.handleError(err);
      setError(recordingError);
      setRecordingState('inactive');
      onError?.(recordingError);
      onStateChange?.('inactive');
    }
  }, [updateTimer, onError, onStateChange]);

  /**
   * Stop the current recording and return the recorded blob
   * 
   * @returns Promise resolving to the recorded video blob
   * @throws Error if no active recording exists
   */
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording to stop'));
        return;
      }

      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { 
            type: mediaRecorder.mimeType || 'video/webm' 
          });
          
          // Clean up resources
          cleanup();
          
          resolve(blob);
        } catch (err) {
          reject(new Error(`Failed to create recording blob: ${err instanceof Error ? err.message : String(err)}`));
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  // Update the ref whenever stopRecording changes
  stopRecordingRef.current = stopRecording;

  /**
   * Pause the current recording
   */
  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.pause();
        const newState: RecordingState = 'paused';
        setRecordingState(newState);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        onStateChange?.(newState);
      } catch (err) {
        console.warn('Failed to pause recording:', err);
      }
    }
  }, [onStateChange]);

  /**
   * Resume a paused recording
   */
  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      try {
        mediaRecorder.resume();
        const newState: RecordingState = 'recording';
        setRecordingState(newState);
        
        timerRef.current = setInterval(updateTimer, 1000);
        
        onStateChange?.(newState);
      } catch (err) {
        console.warn('Failed to resume recording:', err);
      }
    }
  }, [updateTimer, onStateChange]);

  /**
   * Get the current recording status
   * 
   * @returns Current recording status information
   */
  const getStatus = useCallback((): RecordingStatus => ({
    isRecording: recordingState === 'recording',
    isPaused: recordingState === 'paused',
    duration,
    startTime: startTimeRef.current,
  }), [recordingState, duration]);

  /**
   * Clear any recording errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Toggle mute state of the recording
   */
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      try {
        const audioTracks = streamRef.current.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = isMuted; // Toggle the enabled state
        });
        setIsMuted(!isMuted);
      } catch (err) {
        console.warn('Failed to toggle mute:', err);
      }
    }
  }, [isMuted]);

  /**
   * Set audio level (placeholder for future implementation)
   * 
   * @param level - Audio level from 0 to 1
   */
  const setAudioLevel = useCallback((level: number) => {
    // Note: Direct audio level control is very limited in browsers
    // Volume control would require audio context processing for full implementation
    // This is a placeholder for future audio context-based volume control
    
    if (level < 0 || level > 1) {
      console.warn('Audio level must be between 0 and 1');
      return;
    }
    
    if (streamRef.current) {
      // Audio level control is not directly supported through MediaTrackConstraints
      // In a real implementation, you would use:
      // 1. Web Audio API with GainNode
      // 2. Audio context processing
      // 3. Custom audio pipeline
      console.log('Audio level requested:', level);
    }
  }, []);

  /**
   * Clean up recording resources
   */
  const cleanup = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    setRecordingState('inactive');
    setDuration(0);
    startTimeRef.current = null;
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    
    onStateChange?.('inactive');
  }, [onStateChange]);

  /**
   * Check if recording is currently active
   */
  const isRecording = useCallback(() => {
    return recordingState === 'recording' || recordingState === 'paused';
  }, [recordingState]);

  /**
   * Check if recording can be paused/resumed
   */
  const canPauseResume = useCallback(() => {
    return mediaRecorderRef.current && 
           (mediaRecorderRef.current.state === 'recording' || 
            mediaRecorderRef.current.state === 'paused');
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup && isRecording()) {
        cleanup();
      }
    };
  }, [autoCleanup, isRecording, cleanup]);

  return {
    recordingState,
    duration,
    error,
    stream: streamRef.current,
    isMuted,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getStatus,
    clearError,
    toggleMute,
    setAudioLevel,
    cleanup,
    isRecording,
    canPauseResume,
  };
}
