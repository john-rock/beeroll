'use client';

import { useState, useRef, useCallback } from 'react';
import { RecordingOptions, RecordingState, RecordingStatus, AudioOptions } from '../types/recording';
import { getQualityConfig } from '../utils/qualitySettings';
import { getMixedAudioStream } from '../utils/audioDevices';
import { RecordingErrorHandler, RecordingError } from '../utils/errorHandling';

export function useScreenRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<RecordingError | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateTimer = useCallback(() => {
    if (startTimeRef.current) {
      setDuration(Date.now() - startTimeRef.current);
    }
  }, []);

  const startRecording = useCallback(async (options: RecordingOptions = { audio: true, video: true, quality: 'balanced' }) => {
    try {
      setError(null);
      
      // Get quality configuration
      const qualityConfig = getQualityConfig(options.quality || 'balanced');
      
      // Determine audio configuration
      const audioOptions = typeof options.audio === 'object' ? options.audio : { system: !!options.audio, microphone: false };
      
      // Request screen capture with quality-based settings
      let stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: qualityConfig.frameRate, max: qualityConfig.frameRate },
          width: { max: qualityConfig.width },
          height: { max: qualityConfig.height }
        },
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
        throw new Error('No supported video format found');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualityConfig.videoBitsPerSecond,
        audioBitsPerSecond: qualityConfig.audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setRecordingState('recording');
        startTimeRef.current = Date.now();
        setDuration(0);
        
        // Start timer
        timerRef.current = setInterval(updateTimer, 1000);
      };

      mediaRecorder.onstop = () => {
        setRecordingState('stopped');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        const recordingError = RecordingErrorHandler.handleError((event as any).error || new Error('Recording failed'));
        setError(recordingError);
        setRecordingState('inactive');
      };

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      });

      mediaRecorder.start(1000); // Collect data every second
      
    } catch (err) {
      const recordingError = RecordingErrorHandler.handleError(err);
      setError(recordingError);
      setRecordingState('inactive');
    }
  }, [updateTimer]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType || 'video/webm' 
        });
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setRecordingState('inactive');
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setRecordingState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(updateTimer, 1000);
    }
  }, [updateTimer]);

  const getStatus = useCallback((): RecordingStatus => ({
    isRecording: recordingState === 'recording',
    isPaused: recordingState === 'paused',
    duration,
    startTime: startTimeRef.current,
  }), [recordingState, duration]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle the enabled state
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const setAudioLevel = useCallback((level: number) => {
    // Note: Direct audio level control is very limited in browsers
    // Volume control would require audio context processing for full implementation
    // This is a placeholder for future audio context-based volume control
    if (streamRef.current) {
      // Audio level control is not directly supported through MediaTrackConstraints
      // In a real implementation, you would use:
      // 1. Web Audio API with GainNode
      // 2. Audio context processing
      // 3. Custom audio pipeline
      console.log('Audio level requested:', level);
    }
  }, []);

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
  };
}
