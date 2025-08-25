'use client';

import { useState } from 'react';
import { useScreenRecording } from '../hooks/useScreenRecording';
import { downloadBlob, formatDuration, generateFilename } from '../utils/fileDownload';
import { QualityPreset } from '../types/recording';
import { QUALITY_PRESETS } from '../utils/qualitySettings';

export function ScreenRecorder() {
  const {
    recordingState,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useScreenRecording();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<QualityPreset>('balanced');

  const handleStartRecording = async () => {
    try {
      await startRecording({ audio: true, video: true, quality: selectedQuality });
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      const blob = await stopRecording();
      const filename = generateFilename(blob.type);
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isInactive = recordingState === 'inactive';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Recora</h1>
          <p className="text-gray-400">Instant screen recording</p>
        </div>

        {/* Recording Status */}
        <div className="text-center">
          {isRecording && (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">Recording</span>
            </div>
          )}
          
          {isPaused && (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400 font-medium">Paused</span>
            </div>
          )}

          {(isRecording || isPaused) && (
            <div className="text-2xl font-mono text-white mb-6">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Main Controls */}
        <div className="flex flex-col space-y-4">
          {isInactive && (
            <button
              onClick={handleStartRecording}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              disabled={isProcessing}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zM6 15h8v-2H6v2z" clipRule="evenodd" />
              </svg>
              <span>Start Recording</span>
            </button>
          )}

          {(isRecording || isPaused) && (
            <div className="flex space-x-3">
              {isRecording && (
                <button
                  onClick={pauseRecording}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Pause</span>
                </button>
              )}

              {isPaused && (
                <button
                  onClick={resumeRecording}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={handleStopRecording}
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    <span>Stop & Save</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Quality Selector */}
        {isInactive && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Recording Quality
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value as QualityPreset)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(QUALITY_PRESETS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {key === 'high' && '🎯 '}
                    {key === 'balanced' && '⚖️ '}
                    {key === 'compressed' && '📦 '}
                    {config.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Instructions */}
        {isInactive && (
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              Click "Start Recording" to capture your screen
            </p>
            <p className="text-gray-500 text-xs">
              Your browser will ask which screen or window to record
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
