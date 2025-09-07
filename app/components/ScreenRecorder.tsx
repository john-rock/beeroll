'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScreenRecording } from '../hooks/useScreenRecording';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { downloadBlob, generateFilename, formatFileSize } from '../utils/fileDownload';
import { QualityPreset, AudioOptions } from '../types/recording';
import { QUALITY_PRESETS, getSavedQualityPreset, saveQualityPreset } from '../utils/qualitySettings';
import { AudioControls } from './AudioControls';
import { Play, ChevronDown, Save, Settings, Zap } from 'lucide-react';

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
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-retro-cream to-retro-warm-white dark:from-retro-cream dark:to-retro-warm-white text-retro-brown dark:text-retro-brown p-4 sm:p-8 transition-all duration-300"
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
            <h1 className="text-6xl font-bold text-retro-brown dark:text-retro-brown transition-all duration-300">
              beeroll
            </h1>
            <p className="text-lg text-retro-muted dark:text-retro-muted mx-auto leading-relaxed transition-colors duration-300">
            Record screens privately in your browser
            </p>
          </header>

          {/* Recording Status */}
          {isRecording && (
            <div className="bg-gradient-to-r from-retro-warm-white to-retro-cream dark:from-retro-warm-white dark:to-retro-cream border-2 border-retro-accent dark:border-retro-accent rounded-lg p-6 shadow-lg">
              <RecordingStatus 
                isRecording={isRecording}
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
                className="group w-full bg-retro-orange hover:bg-retro-orange-hover text-white font-bold py-6 px-8 rounded-lg transition-all duration-300 transform hover:shadow-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
              <div className="flex items-center justify-center space-x-2 text-retro-muted dark:text-retro-muted text-xs transition-colors duration-300">
                <span>Or press</span>
                <kbd className="px-2 py-1 bg-retro-warm-white dark:bg-retro-warm-white rounded text-retro-brown dark:text-retro-brown font-mono text-xs border border-retro-accent dark:border-retro-accent">
                  R
                </kbd>
                <span>to start</span>
              </div>
            )}

            {isRecording && (
              <div className="space-y-4">
                {/* Main Recording Controls */}
                <button
                  onClick={handleStopRecording}
                  disabled={isProcessing}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform disabled:transform-none"
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
            )}
          </section>

          {/* Compression Progress */}
          {compressionProgress && (
            <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-retro-orange border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    <span className="text-retro-brown dark:text-retro-brown font-semibold">
                      {compressionProgress.stage}
                    </span>
                  </div>
                  <span className="text-retro-orange dark:text-retro-orange text-lg font-bold">
                    {Math.round(compressionProgress.progress)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-retro-muted/30 dark:bg-retro-muted/30 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-retro-orange to-retro-orange-hover h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                      style={{ width: `${compressionProgress.progress}%` }}
                      role="progressbar"
                      aria-valuenow={compressionProgress.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Compression progress"
                    />
                  </div>
                  <p className="text-retro-muted dark:text-retro-muted text-sm text-center">
                    Optimizing your recording for the best quality and file size...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compression Result */}
          {compressionResult && (
            <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-retro-orange rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-retro-brown dark:text-retro-brown font-semibold text-lg">Compression Complete!</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-retro-cream dark:bg-retro-cream rounded-lg p-3 border border-retro-accent dark:border-retro-accent">
                    <div className="text-xs text-retro-muted dark:text-retro-muted font-medium mb-1">Original Size</div>
                    <div className="text-lg font-bold text-retro-brown dark:text-retro-brown">{formatFileSize(compressionResult.originalSize)}</div>
                  </div>
                  <div className="bg-retro-cream dark:bg-retro-cream rounded-lg p-3 border border-retro-accent dark:border-retro-accent">
                    <div className="text-xs text-retro-muted dark:text-retro-muted font-medium mb-1">Compressed Size</div>
                    <div className="text-lg font-bold text-retro-brown dark:text-retro-brown">{formatFileSize(compressionResult.compressedSize)}</div>
                  </div>
                  <div className="bg-retro-cream dark:bg-retro-cream rounded-lg p-3 border border-retro-accent dark:border-retro-accent">
                    <div className="text-xs text-retro-muted dark:text-retro-muted font-medium mb-1">Space Saved</div>
                    <div className="text-lg font-bold text-retro-brown dark:text-retro-brown">{compressionResult.compressionRatio.toFixed(1)}%</div>
                  </div>
                  <div className="bg-retro-cream dark:bg-retro-cream rounded-lg p-3 border border-retro-accent dark:border-retro-accent">
                    <div className="text-xs text-retro-muted dark:text-retro-muted font-medium mb-1">Processing Time</div>
                    <div className="text-lg font-bold text-retro-brown dark:text-retro-brown">{(compressionResult.processingTime / 1000).toFixed(1)}s</div>
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
            <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-orange dark:border-retro-orange rounded-lg p-6 shadow-lg transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-retro-orange rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    Browser Compatibility Notice
                  </h3>
                  <ul className="space-y-2">
                    {compatibilityIssues.map((issue, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 bg-retro-orange rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-sm text-retro-muted dark:text-retro-muted leading-relaxed">{issue}</span>
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
              <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg shadow-lg border border-retro-accent dark:border-retro-accent p-6 space-y-6 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-retro-brown dark:text-retro-brown flex items-center space-x-2">
                    <Settings className="w-5 h-5" aria-hidden="true" />
                    <span>Quick Settings</span>
                  </h3>
                </div>

                {/* Quality Selector */}
                <div className="space-y-3">
                  <label htmlFor="quality-selector" className="block text-sm font-medium text-retro-brown dark:text-retro-brown transition-colors duration-300">
                    Recording Quality
                  </label>
                  <select
                    id="quality-selector"
                    value={selectedQuality}
                    onChange={(e) => handleQualityChange(e.target.value as QualityPreset)}
                    className="w-full bg-retro-cream dark:bg-retro-cream border border-retro-accent dark:border-retro-accent rounded-lg px-4 py-3 text-retro-brown dark:text-retro-brown focus:outline-none focus:ring-2 focus:ring-retro-orange focus:border-transparent transition-all duration-300 hover:border-retro-orange"
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
              <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg shadow-lg border border-retro-accent dark:border-retro-accent transition-all duration-300 hover:shadow-xl">
                <button
                  onClick={toggleAdvancedSettings}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-retro-cream dark:hover:bg-retro-cream rounded-lg transition-colors duration-200"
                  aria-expanded={showAdvancedSettings}
                  aria-controls="advanced-settings-content"
                >
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5" aria-hidden="true" />
                    <span className="text-lg font-semibold text-retro-brown dark:text-retro-brown">Advanced Settings</span>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-retro-muted dark:text-retro-muted transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                
                {showAdvancedSettings && (
                  <div id="advanced-settings-content" className="px-6 pb-6 space-y-4 border-t border-retro-accent dark:border-retro-accent pt-6">
                    {/* Compression Settings */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-retro-brown dark:text-retro-brown flex items-center space-x-2">
                        <span>Compression</span>
                      </h4>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="enable-compression"
                          checked={useCompression}
                          onChange={(e) => toggleCompression(e.target.checked)}
                          className="w-4 h-4 text-retro-orange bg-retro-cream dark:bg-retro-cream border-retro-accent dark:border-retro-accent rounded mt-1.5 focus:ring-retro-orange"
                          aria-describedby="compression-description"
                        />
                        <div className="flex-1">
                          <label htmlFor="enable-compression" className="text-sm font-medium text-retro-brown dark:text-retro-brown transition-colors duration-300 cursor-pointer">
                            Enable advanced compression
                          </label>
                          <p id="compression-description" className="text-xs text-retro-muted dark:text-retro-muted mt-1">
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
