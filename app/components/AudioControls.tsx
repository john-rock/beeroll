'use client';

import { useState, useEffect } from 'react';
import { AudioOptions } from '../types/recording';
import { getAudioInputDevices, testMicrophoneAccess, AudioDevice } from '../utils/audioDevices';

interface AudioControlsProps {
  audioOptions: AudioOptions;
  onAudioOptionsChange: (options: AudioOptions) => void;
  disabled?: boolean;
}

export function AudioControls({ audioOptions, onAudioOptionsChange, disabled = false }: AudioControlsProps) {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  useEffect(() => {
    checkMicrophoneAccess();
  }, []);

  const checkMicrophoneAccess = async () => {
    const available = await testMicrophoneAccess();
    setMicrophoneAvailable(available);
    
    if (available) {
      loadAudioDevices();
    }
  };

  const loadAudioDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const devices = await getAudioInputDevices();
      setAudioDevices(devices);
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleSystemAudioChange = (enabled: boolean) => {
    onAudioOptionsChange({
      ...audioOptions,
      system: enabled
    });
  };

  const handleMicrophoneChange = (enabled: boolean) => {
    onAudioOptionsChange({
      ...audioOptions,
      microphone: enabled,
      deviceId: enabled && audioDevices.length > 0 ? audioDevices[0].deviceId : undefined
    });
  };

  const handleDeviceChange = (deviceId: string) => {
    onAudioOptionsChange({
      ...audioOptions,
      deviceId
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Audio Sources</h3>
        
        {/* System Audio */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="system-audio"
            checked={audioOptions.system}
            onChange={(e) => handleSystemAudioChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="system-audio" className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2 transition-colors duration-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-2.82a1 1 0 011.0 0zm5.234 2.924A5.978 5.978 0 0118 11a5.978 5.978 0 01-3.383 5.001 1 1 0 11-.79-1.836A3.982 3.982 0 0016 11a3.982 3.982 0 00-2.173-3.165 1 1 0 01.79-1.835z" clipRule="evenodd" />
            </svg>
            <span>System Audio</span>
          </label>
        </div>

        {/* Microphone */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="microphone-audio"
            checked={audioOptions.microphone}
            onChange={(e) => handleMicrophoneChange(e.target.checked)}
            disabled={disabled || !microphoneAvailable}
            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
          />
          <label htmlFor="microphone-audio" className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2 transition-colors duration-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>Microphone{!microphoneAvailable ? ' (Not Available)' : ''}</span>
          </label>
        </div>

        {/* Microphone Device Selection */}
        {audioOptions.microphone && microphoneAvailable && audioDevices.length > 0 && (
          <div className="ml-7 space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Microphone Device
            </label>
            <select
              value={audioOptions.deviceId || ''}
              onChange={(e) => handleDeviceChange(e.target.value)}
              disabled={disabled || isLoadingDevices}
              className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-300"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingDevices && (
          <div className="ml-7 text-xs text-gray-500 dark:text-gray-400">
            Loading microphone devices...
          </div>
        )}

        {/* No audio warning */}
        {!audioOptions.system && !audioOptions.microphone && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
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
