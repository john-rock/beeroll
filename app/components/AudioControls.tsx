'use client';

import { useState, useEffect, useCallback } from 'react';
import { AudioOptions } from '../types/recording';
import { getAudioInputDevices, testMicrophoneAccess, AudioDevice } from '../utils/audioDevices';
import { Volume2, Mic, AlertTriangle } from 'lucide-react';

interface AudioControlsProps {
  /** Current audio configuration options */
  audioOptions: AudioOptions;
  /** Callback function when audio options change */
  onAudioOptionsChange: (options: AudioOptions) => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
}

/**
 * Audio controls component for managing recording audio sources.
 * 
 * Features:
 * - System audio toggle
 * - Microphone selection with device detection
 * - Real-time device availability checking
 * - Accessible form controls
 * - Error handling for device access
 * 
 * @example
 * ```tsx
 * <AudioControls
 *   audioOptions={audioOptions}
 *   onAudioOptionsChange={setAudioOptions}
 *   disabled={false}
 * />
 * ```
 */
export function AudioControls({ 
  audioOptions, 
  onAudioOptionsChange, 
  disabled = false 
}: AudioControlsProps) {
  // Combined microphone state to prevent UI flickering
  const [microphoneState, setMicrophoneState] = useState<'idle' | 'checking' | 'available' | 'error'>('idle');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAudioDevices = useCallback(async () => {
    setError(null);
    try {
      const devices = await getAudioInputDevices();
      setAudioDevices(devices);
      setMicrophoneState('available');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audio devices';
      setError(errorMessage);
      console.error('Failed to load audio devices:', error);
      setMicrophoneState('error');
    }
  }, []);

  const checkMicrophoneAccess = useCallback(async () => {
    setMicrophoneState('checking');
    setError(null);
    try {
      const available = await testMicrophoneAccess();
      
      if (available) {
        await loadAudioDevices();
      } else {
        setMicrophoneState('error');
        setAudioDevices([]);
      }
    } catch (error) {
      console.error('Failed to check microphone access:', error);
      setMicrophoneState('error');
      setAudioDevices([]); // Clear devices if access fails
    }
  }, [loadAudioDevices]);

  useEffect(() => {
    // Only check microphone access if the user has enabled the microphone option
    // This prevents requesting permissions before the user wants them
    if (audioOptions.microphone && microphoneState === 'idle') {
      checkMicrophoneAccess();
    }
  }, [checkMicrophoneAccess, audioOptions.microphone, microphoneState]);

  const handleSystemAudioChange = useCallback((enabled: boolean) => {
    onAudioOptionsChange({
      ...audioOptions,
      system: enabled
    });
  }, [audioOptions, onAudioOptionsChange]);

  const handleMicrophoneChange = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Only check microphone access when user enables the microphone
      await checkMicrophoneAccess();
    } else {
      // Reset state when microphone is disabled
      setMicrophoneState('idle');
      setAudioDevices([]);
      setError(null);
    }
    
    onAudioOptionsChange({
      ...audioOptions,
      microphone: enabled,
      deviceId: enabled && audioDevices.length > 0 ? audioDevices[0].deviceId : audioOptions.deviceId
    });
  }, [audioOptions, onAudioOptionsChange, audioDevices, checkMicrophoneAccess]);

  const handleDeviceChange = useCallback((deviceId: string) => {
    onAudioOptionsChange({
      ...audioOptions,
      deviceId
    });
  }, [audioOptions, onAudioOptionsChange]);

  const handleRetryLoadDevices = useCallback(() => {
    setMicrophoneState('idle');
    checkMicrophoneAccess();
  }, [checkMicrophoneAccess]);

  return (
    <div className="space-y-4" role="group" aria-labelledby="audio-sources-heading">
      <div className="space-y-3">
        <h3 
          id="audio-sources-heading"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300"
        >
          Audio Sources
        </h3>
        
        {/* System Audio */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="system-audio"
            checked={audioOptions.system}
            onChange={(e) => handleSystemAudioChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-describedby="system-audio-description"
          />
          <label 
            htmlFor="system-audio" 
            className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2 transition-colors duration-300 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>System Audio</span>
          </label>
        </div>
        <p id="system-audio-description" className="text-xs sr-only text-gray-500 dark:text-gray-400 ml-7">
          Record audio from your computer's speakers and applications
        </p>

        {/* Microphone */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="microphone-audio"
            checked={audioOptions.microphone}
            onChange={(e) => handleMicrophoneChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-describedby="microphone-audio-description"
          />
          <label 
            htmlFor="microphone-audio" 
            className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2 transition-colors duration-300 cursor-pointer"
          >
            <Mic className="w-4 h-4" aria-hidden="true" />
            <span>Microphone</span>
          </label>
        </div>
        <p id="microphone-audio-description" className="text-xs sr-only text-gray-500 dark:text-gray-400 ml-7">
          Record audio from your microphone input
        </p>

        {/* Microphone Device Selection */}
        {audioOptions.microphone && (
          <div className="ml-7 space-y-2">
            {microphoneState === 'checking' ? (
              // Show loading state
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                <span className="text-sm text-indigo-600 dark:text-indigo-400">
                  Checking microphone access...
                </span>
              </div>
            ) : microphoneState === 'available' && audioDevices.length > 0 ? (
              // Show device selection
              <>
                <label 
                  htmlFor="microphone-device" 
                  className="block text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300"
                >
                  Microphone Device
                </label>
                <select
                  id="microphone-device"
                  value={audioOptions.deviceId || ''}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  disabled={disabled}
                  className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors duration-300"
                  aria-describedby="microphone-device-description"
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
                <p id="microphone-device-description" className="text-xs text-gray-500 dark:text-gray-400">
                  Select which microphone to use for recording
                </p>
              </>
            ) : microphoneState === 'error' ? (
              // Show error state
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    Microphone access denied or unavailable. Please check your microphone permissions.
                  </span>
                </div>
              </div>
            ) : (
              // Show initial state (permission needed)
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Microphone permission needed. Please allow access when prompted.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </span>
              </div>
              <button
                onClick={handleRetryLoadDevices}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                aria-label="Retry loading audio devices"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* No audio warning */}
        {!audioOptions.system && !audioOptions.microphone && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                No audio sources selected. Recording will be silent.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
