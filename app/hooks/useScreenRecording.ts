'use client';

import { useState, useRef, useCallback } from 'react';
import { RecordingOptions, RecordingState, RecordingStatus } from '../types/recording';

export function useScreenRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
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

  const startRecording = useCallback(async (options: RecordingOptions = { audio: true, video: true }) => {
    try {
      setError(null);
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          frameRate: 30,
          cursor: 'always'
        } as MediaTrackConstraints,
        audio: options.audio
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : 'video/webm';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4000000, // 4 Mbps for balanced quality
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
        setError('Recording failed: ' + (event as any).error?.message || 'Unknown error');
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
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
          type: mediaRecorder.mimeType || 'video/mp4' 
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

  return {
    recordingState,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getStatus,
  };
}
