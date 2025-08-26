'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScreenRecording } from '../hooks/useScreenRecording';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { downloadBlob, generateFilename, formatFileSize } from '../utils/fileDownload';
import { QualityPreset, AudioOptions } from '../types/recording';
import { QUALITY_PRESETS, getSavedQualityPreset, saveQualityPreset } from '../utils/qualitySettings';
import { AudioControls } from './AudioControls';
import { Play, ChevronDown, Pause, RotateCw, Save, Settings, Zap } from 'lucide-react';

import { RecordingStatus } from './RecordingStatus';
import { ErrorDisplay } from './ErrorDisplay';
import { RecordingPreview } from './RecordingPreview';
import { getCompressionEngine, CompressionProgress, CompressionResult } from '../utils/compressionEngine';
import { CompatibilityChecker } from '../utils/errorHandling';

import { usePlausible } from 'next-plausible';

/**
 * Main screen recording component that handles the complete recording workflow.
 * 
 * Features:
 * - Screen recording with audio options
 * - Quality presets and compression
 * - Keyboard shortcuts
 * - Error handling and recovery
 * - Browser compatibility checking
 * 
 * @example
 * ```tsx
 * <ScreenRecorder />
 * ```
 */
export function ScreenRecorder() {
  const {
    recordingState,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearError,
  } = useScreenRecording();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<QualityPreset>('balanced');
  const [audioOptions, setAudioOptions] = useState<AudioOptions>({
    system: true,
    microphone: false
  });
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [useCompression, setUseCompression] = useState(true);

  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const plausible = usePlausible();

  // Memoized state computations for performance
  const isRecording = useMemo(() => recordingState === 'recording', [recordingState]);
  const isPaused = useMemo(() => recordingState === 'paused', [recordingState]);
  const isInactive = useMemo(() => recordingState === 'inactive', [recordingState]);
  const hasRecordedVideo = useMemo(() => recordedVideo !== null, [recordedVideo]);

  // Keyboard shortcut for starting recording with 'R' key
  useKeyboardShortcut('r', () => {
    if (isInactive && !isProcessing) {
      handleStartRecording();
    }
  }, { enabled: true });

  // Initialize settings and check compatibility
  useEffect(() => {
    const savedQuality = getSavedQualityPreset();
    setSelectedQuality(savedQuality);
    
    // Check browser compatibility
    const { supported, issues } = CompatibilityChecker.checkRecordingSupport();
    setCompatibilityIssues(issues);
    
    if (!supported) {
      console.warn('Recording not fully supported:', issues);
    }
  }, []);

  // Memoized handlers to prevent unnecessary re-renders
  const handleStartRecording = useCallback(async () => {
    plausible('start-recording');
    try {
      // Clear any previous state
      clearError();
      setCompressionResult(null);
      setRecordedVideo(null);
      setRecordedDuration(0);
      
      await startRecording({ 
        audio: audioOptions, 
        video: true, 
        quality: selectedQuality 
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [plausible, clearError, startRecording, audioOptions, selectedQuality]);

  const handleStopRecording = useCallback(async () => {
    try {
      setIsProcessing(true);
      setCompressionProgress(null);
      setCompressionResult(null);
      
      const blob = await stopRecording();
      const currentDuration = duration;
      
      let finalBlob = blob;
      
      // Apply compression if enabled
      if (useCompression) {
        try {
          setCompressionProgress({ progress: 0, stage: 'Initializing FFmpeg...' });
          
          const compressionEngine = getCompressionEngine();
          const result = await compressionEngine.compress(
            blob,
            { quality: selectedQuality, format: blob.type.includes('webm') ? 'webm' : 'mp4' },
            (progress) => setCompressionProgress(progress)
          );
          
          finalBlob = result.blob;
          setCompressionResult(result);
        } catch (compressionError) {
          console.warn('Compression failed, using original recording:', compressionError);
          
          // Better error logging
          if (compressionError instanceof Error) {
            console.error('Compression error:', {
              message: compressionError.message,
              name: compressionError.name,
              stack: compressionError.stack
            });
          } else {
            console.error('Compression error (non-Error object):', compressionError);
          }
          
          // Show user-friendly compression error message
          console.warn('Compression failed, but recording was saved. Original file size will be larger.');
          
          // Continue with original blob
        }
      }
      
      // Store the video for preview instead of immediately downloading
      setRecordedVideo(finalBlob);
      setRecordedDuration(currentDuration);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    } finally {
      setIsProcessing(false);
      setCompressionProgress(null);
    }
  }, [stopRecording, duration, useCompression, selectedQuality]);

  // Preview action handlers
  const handleDownload = useCallback(() => {
    if (recordedVideo) {
      const filename = generateFilename(recordedVideo.type);
      downloadBlob(recordedVideo, filename);
    }
  }, [recordedVideo]);

  const handleDelete = useCallback(() => {
    setRecordedVideo(null);
    setRecordedDuration(0);
    setCompressionResult(null);
  }, []);

  const handleRerecord = useCallback(() => {
    handleDelete(); // Clear the existing recording
    handleStartRecording(); // Start a new recording
  }, [handleDelete, handleStartRecording]);

  const handleQualityChange = useCallback((newQuality: QualityPreset) => {
    setSelectedQuality(newQuality);
    saveQualityPreset(newQuality);
  }, []);

  const handleAudioOptionsChange = useCallback((options: AudioOptions) => {
    setAudioOptions(options);
  }, []);

  const toggleAdvancedSettings = useCallback(() => {
    setShowAdvancedSettings(prev => !prev);
  }, []);

  const toggleCompression = useCallback((enabled: boolean) => {
    setUseCompression(enabled);
  }, []);

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white p-4 sm:p-8 transition-all duration-300"
      role="main"
      aria-label="Screen Recording Application"
    >
      {hasRecordedVideo ? (
        // Show preview after recording
        <div className="max-w-3xl w-full">
          <RecordingPreview
            videoBlob={recordedVideo!}
            duration={recordedDuration}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRerecord={handleRerecord}
          />
        </div>
      ) : (
        // Show recording interface
        <div className="max-w-lg w-full space-y-8 relative">
          {/* Header */}
          <header className="text-center space-y-4">
            <h1 className="text-6xl font-bold text-black dark:text-white bg-clip-text border-4 rounded-3xl dark:border-white inline-block px-6 pb-1 transition-all duration-300">
              beeroll
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed transition-colors duration-300">
              Local first screen recording. No cloud, no upload, no BS.
            </p>
          </header>

          {/* Recording Status */}
          {(isRecording || isPaused) && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-6 shadow-lg">
              <RecordingStatus 
                isRecording={isRecording}
                isPaused={isPaused}
                duration={duration}
                className="scale-110"
              />
            </div>
          )}

          {/* Main Controls */}
          <section className="flex flex-col space-y-4 mb-20" aria-label="Recording Controls">
            {isInactive && (
              <button
                onClick={handleStartRecording}
                className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-8 rounded-lg transition-all duration-300 transform hover:shadow-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isProcessing}
                data-plausible="start-recording"
                aria-label="Start screen recording"
              >
                <div className="flex items-center justify-center space-x-3">
                  <Play className="w-5 h-5" aria-hidden="true" />
                  <span className="text-xl font-normal">Start Recording</span>
                </div>
              </button>
            )}

            {isInactive && (
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-500 text-xs transition-colors duration-300">
                <span>Or press</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono text-xs border border-gray-300 dark:border-gray-600">
                  R
                </kbd>
                <span>to start</span>
              </div>
            )}

            {(isRecording || isPaused) && (
              <div className="space-y-4">
                {/* Main Recording Controls */}
                <div className="grid grid-cols-2 gap-3">
                  {isRecording && (
                    <button
                      onClick={pauseRecording}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                      aria-label="Pause recording"
                    >
                      <Pause className="w-4 h-4" aria-hidden="true" />
                      <span>Pause</span>
                    </button>
                  )}

                  {isPaused && (
                    <button
                      onClick={resumeRecording}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                      aria-label="Resume recording"
                    >
                      <RotateCw className="w-4 h-4" aria-hidden="true" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    onClick={handleStopRecording}
                    disabled={isProcessing}
                    className="col-span-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform disabled:transform-none"
                    aria-label="Stop recording and save"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                        <span>
                          {compressionProgress ? compressionProgress.stage : 'Processing...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save aria-hidden="true" />
                        <span>Stop & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Compression Progress */}
          {compressionProgress && (
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-50 dark:from-indigo-900/20 dark:to-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
                      {compressionProgress.stage}
                    </span>
                  </div>
                  <span className="text-indigo-600 dark:text-indigo-400 text-lg font-bold">
                    {Math.round(compressionProgress.progress)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                      style={{ width: `${compressionProgress.progress}%` }}
                      role="progressbar"
                      aria-valuenow={compressionProgress.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Compression progress"
                    />
                  </div>
                  <p className="text-indigo-600 dark:text-indigo-400 text-sm text-center">
                    Optimizing your recording for the best quality and file size...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compression Result */}
          {compressionResult && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-green-700 dark:text-green-300 font-semibold text-lg">Compression Complete!</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Original Size</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{formatFileSize(compressionResult.originalSize)}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Compressed Size</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{formatFileSize(compressionResult.compressedSize)}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Space Saved</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{compressionResult.compressionRatio.toFixed(1)}%</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Processing Time</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{(compressionResult.processingTime / 1000).toFixed(1)}s</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          <ErrorDisplay 
            error={error}
            onRetry={error?.recoverable ? handleStartRecording : undefined}
            onDismiss={clearError}
          />

          {/* Compatibility Warnings */}
          {compatibilityIssues.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-3">
                    Browser Compatibility Notice
                  </h3>
                  <ul className="space-y-2">
                    {compatibilityIssues.map((issue, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-sm text-yellow-600 dark:text-yellow-400 leading-relaxed">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Recording Settings */}
          {isInactive && (
            <section className="space-y-6" aria-label="Recording Settings">
              {/* Quick Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <Settings className="w-5 h-5" aria-hidden="true" />
                    <span>Quick Settings</span>
                  </h3>
                </div>

                {/* Quality Selector */}
                <div className="space-y-3">
                  <label htmlFor="quality-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Recording Quality
                  </label>
                  <select
                    id="quality-selector"
                    value={selectedQuality}
                    onChange={(e) => handleQualityChange(e.target.value as QualityPreset)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-300 hover:border-indigo-600"
                    aria-describedby="quality-description"
                  >
                    {Object.entries(QUALITY_PRESETS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Controls */}
                <AudioControls
                  audioOptions={audioOptions}
                  onAudioOptionsChange={handleAudioOptionsChange}
                  disabled={false}
                />
              </div>

              {/* Advanced Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
                <button
                  onClick={toggleAdvancedSettings}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  aria-expanded={showAdvancedSettings}
                  aria-controls="advanced-settings-content"
                >
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5" aria-hidden="true" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</span>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                
                {showAdvancedSettings && (
                  <div id="advanced-settings-content" className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                    {/* Compression Settings */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                        <span>Compression</span>
                      </h4>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="enable-compression"
                          checked={useCompression}
                          onChange={(e) => toggleCompression(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded mt-1.5"
                          aria-describedby="compression-description"
                        />
                        <div className="flex-1">
                          <label htmlFor="enable-compression" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300 cursor-pointer">
                            Enable advanced compression
                          </label>
                          <p id="compression-description" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Uses FFmpeg.wasm for real video compression. Reduces file size with VP9 encoding. Processing may take longer.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
