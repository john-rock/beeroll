'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScreenRecording } from '../hooks/useScreenRecording';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { downloadBlob, generateFilename, formatFileSize } from '../utils/fileDownload';
import { QualityPreset, AudioOptions } from '../types/recording';
import { QUALITY_PRESETS, getSavedQualityPreset, saveQualityPreset } from '../utils/qualitySettings';
import { AudioControls } from './AudioControls';
import { Header } from './Header';
import { Play, ChevronDown, Save, Settings, Zap, Shield, Infinity, Users, Camera, Code } from 'lucide-react';

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
      className="min-h-screen bg-gradient-to-br from-retro-cream to-retro-warm-white dark:from-retro-cream dark:to-retro-warm-white text-retro-brown dark:text-retro-brown transition-all duration-300"
      role="main"
      aria-label="Screen Recording Application"
    >
      {/* Header */}
      <Header />

      {hasRecordedVideo ? (
        // Show preview after recording
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <RecordingPreview
              videoBlob={recordedVideo!}
              duration={recordedDuration}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onRerecord={handleRerecord}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <section className="container mx-auto px-4 py-8 lg:py-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
              {/* Left Side - Privacy Messaging & Trust Building */}
              <div className="space-y-8">
                {/* Privacy Badge */}
                <div className="inline-flex items-center space-x-2 bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-full px-4 py-2 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-retro-brown dark:text-retro-brown">100% Private</span>
                </div>

                {/* Main Headline */}
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-6xl font-bold text-retro-brown dark:text-retro-brown leading-tight">
                  Private screen recording
                  </h1>
                  <p className="text-xl lg:text-2xl text-retro-muted dark:text-retro-muted leading-relaxed">
                    Record directly in your browser. Your recordings never leave your device.
                  </p>
                </div>

                {/* Trust Signals */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-retro-orange rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-retro-brown dark:text-retro-brown">No uploads, no servers</h3>
                      <p className="text-retro-muted dark:text-retro-muted text-sm">Everything happens locally in your browser</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-retro-orange rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-retro-brown dark:text-retro-brown">Free & unlimited</h3>
                      <p className="text-retro-muted dark:text-retro-muted text-sm">No time limits, no watermarks, no accounts</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-retro-orange rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-retro-brown dark:text-retro-brown">Built for teams</h3>
                      <p className="text-retro-muted dark:text-retro-muted text-sm">Perfect for code reviews, bug reports, and async communication</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Recording Controls */}
              <div className="space-y-8">
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

                {/* Main Recording Button */}
                <div className="space-y-4">
                  {isInactive && (
                    <div className="space-y-2">
                      <button
                        onClick={handleStartRecording}
                        className="group w-full bg-retro-orange hover:bg-retro-orange-hover text-white font-bold py-6 px-8 rounded-lg transition-all duration-300 transform hover:shadow-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xl"
                        disabled={isProcessing}
                        data-plausible="start-recording"
                        aria-label="Start screen recording"
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <Play className="w-6 h-6" aria-hidden="true" />
                          <span>Start Recording</span>
                        </div>
                      </button>
                      <p className="text-center text-sm text-retro-muted dark:text-retro-muted">
                        or press <kbd className="px-1.5 py-0.5 bg-retro-warm-white dark:bg-retro-warm-white rounded text-retro-brown dark:text-retro-brown font-mono text-xs border border-retro-accent dark:border-retro-accent">R</kbd>
                      </p>
                    </div>
                  )}

                  {isRecording && (
                    <button
                      onClick={handleStopRecording}
                      disabled={isProcessing}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-6 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform disabled:transform-none text-xl"
                      aria-label="Stop recording and save"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                          <span>
                            {compressionProgress ? compressionProgress.stage : 'Processing...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" aria-hidden="true" />
                          <span>Stop & Save</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* All Settings in Hero */}
                {isInactive && (
                  <div className="space-y-6">
                    {/* Quick Settings */}
                    <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg shadow-lg border border-retro-accent dark:border-retro-accent p-6 space-y-6">
                      <h3 className="text-lg font-semibold text-retro-brown dark:text-retro-brown flex items-center space-x-2">
                        <Settings className="w-5 h-5" aria-hidden="true" />
                        <span>Recording Settings</span>
                      </h3>

                      {/* Quality Selector */}
                      <div className="space-y-3">
                        <label htmlFor="quality-selector" className="block text-sm font-medium text-retro-brown dark:text-retro-brown">
                          Recording Quality
                        </label>
                        <select
                          id="quality-selector"
                          value={selectedQuality}
                          onChange={(e) => handleQualityChange(e.target.value as QualityPreset)}
                          className="w-full bg-retro-cream dark:bg-retro-cream border border-retro-accent dark:border-retro-accent rounded-lg px-4 py-3 text-retro-brown dark:text-retro-brown focus:outline-none focus:ring-2 focus:ring-retro-orange focus:border-transparent transition-all duration-300 hover:border-retro-orange"
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

                    {/* Advanced Settings */}
                    <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg shadow-lg border border-retro-accent dark:border-retro-accent">
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
                            <h4 className="text-md font-medium text-retro-brown dark:text-retro-brown">
                              Compression
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
                                <label htmlFor="enable-compression" className="text-sm font-medium text-retro-brown dark:text-retro-brown cursor-pointer">
                                  Enable advanced compression
                                </label>
                                <p id="compression-description" className="text-xs text-retro-muted dark:text-retro-muted mt-1">
                                  Uses FFmpeg.wasm for real video compression. Reduces file size with VP9 encoding. Processing may take longer but happens locally.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {isRecording && (
                  <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-retro-brown dark:text-retro-brown font-medium">
                        Recording locally - your privacy is protected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Compression Progress */}
          {compressionProgress && (
            <section className="container mx-auto px-4 pb-8">
              <div className="max-w-2xl mx-auto">
                <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-lg p-6 shadow-lg">
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
                        Optimizing your recording locally - still completely private
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Compression Result */}
          {compressionResult && (
            <section className="container mx-auto px-4 pb-8">
              <div className="max-w-2xl mx-auto">
                <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-accent dark:border-retro-accent rounded-lg p-6 shadow-lg">
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
              </div>
            </section>
          )}

          {/* Error Display */}
          {error && (
            <section className="container mx-auto px-4 pb-8">
              <div className="max-w-2xl mx-auto">
                <ErrorDisplay 
                  error={error}
                  onRetry={error?.recoverable ? handleStartRecording : undefined}
                  onDismiss={clearError}
                />
              </div>
            </section>
          )}

          {/* Compatibility Warnings */}
          {compatibilityIssues.length > 0 && (
            <section className="container mx-auto px-4 pb-8">
              <div className="max-w-2xl mx-auto">
                <div className="bg-retro-warm-white dark:bg-retro-warm-white border border-retro-orange dark:border-retro-orange rounded-lg p-6 shadow-lg">
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
              </div>
            </section>
          )}

          {/* Features Section */}
          <section className="container mx-auto px-4 py-16 border-t border-retro-accent dark:border-retro-accent">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-retro-brown dark:text-retro-brown mb-4">
                  Why choose beeroll?
                </h2>
                <p className="text-xl text-retro-muted dark:text-retro-muted max-w-2xl mx-auto">
                  The privacy-first screen recorder that doesn't compromise on features
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Privacy First */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    100% Private
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    Your recordings never leave your device. No cloud uploads, no data collection, no tracking.
                  </p>
                </div>

                {/* No Limits */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Infinity className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    No Limits
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    Record for as long as you need. No time restrictions, no watermarks, no premium features.
                  </p>
                </div>

                {/* Built for Teams */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    Built for Teams
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    Perfect for code reviews, bug reports, and async communication. Works in every tool your team already uses.
                  </p>
                </div>

                {/* High Quality */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    Crystal Clear
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    Multiple quality presets with smart compression. Get the perfect balance of quality and file size.
                  </p>
                </div>

                {/* Easy to Use */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    Lightning Fast
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    One click to start recording. Keyboard shortcuts for power users. Instant downloads when done.
                  </p>
                </div>

                {/* Open Source */}
                <div className="bg-retro-warm-white dark:bg-retro-warm-white rounded-lg p-8 shadow-lg border border-retro-accent dark:border-retro-accent hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-retro-orange rounded-lg flex items-center justify-center mb-6">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-retro-brown dark:text-retro-brown mb-3">
                    Transparent
                  </h3>
                  <p className="text-retro-muted dark:text-retro-muted leading-relaxed">
                    Open source and transparent. Inspect the code, contribute features, or host it yourself.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </>
      )}
    </div>
  );
}
