'use client';

import { useState, useEffect } from 'react';
import { AudioOptions } from '../types/recording';
import { getAudioInputDevices, testMicrophoneAccess, AudioDevice } from '../utils/audioDevices';
import { Volume2, Mic, AlertTriangle } from 'lucide-react';

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
            <Volume2 className="w-4 h-4" />
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
            <Mic className="w-4 h-4" />
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
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
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
