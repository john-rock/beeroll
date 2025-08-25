'use client';

import { useState, useEffect } from 'react';
import { useScreenRecording } from '../hooks/useScreenRecording';
import { downloadBlob, formatDuration, generateFilename, formatFileSize } from '../utils/fileDownload';
import { QualityPreset, AudioOptions } from '../types/recording';
import { QUALITY_PRESETS, getSavedQualityPreset, saveQualityPreset } from '../utils/qualitySettings';
import { AudioControls } from './AudioControls';
import { AudioLiveControls } from './AudioLiveControls';
import { RecordingStatus } from './RecordingStatus';
import { ErrorDisplay } from './ErrorDisplay';
import { RecordingPreview } from './RecordingPreview';
import { getCompressionEngine, CompressionProgress, CompressionResult } from '../utils/compressionEngine';
import { RecordingErrorHandler, CompatibilityChecker } from '../utils/errorHandling';

export function ScreenRecorder() {
  const {
    recordingState,
    duration,
    error,
    stream,
    isMuted,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearError,
    toggleMute,
    setAudioLevel,
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

  const handleStartRecording = async () => {
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
  };

  const handleStopRecording = async () => {
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
          // Show compression error but continue with original recording
          const compError = RecordingErrorHandler.handleError(compressionError);
          console.error('Compression error details:', compError);
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
  };

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isInactive = recordingState === 'inactive';
  const hasRecordedVideo = recordedVideo !== null;

  // Preview action handlers
  const handleDownload = () => {
    if (recordedVideo) {
      const filename = generateFilename(recordedVideo.type);
      downloadBlob(recordedVideo, filename);
    }
  };

  const handleDelete = () => {
    setRecordedVideo(null);
    setRecordedDuration(0);
    setCompressionResult(null);
  };

  const handleRerecord = () => {
    handleDelete(); // Clear the existing recording
    handleStartRecording(); // Start a new recording
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8 transition-colors duration-300">
      {hasRecordedVideo ? (
        // Show preview after recording
        <div className="max-w-2xl w-full">
          <RecordingPreview
            videoBlob={recordedVideo}
            duration={recordedDuration}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRerecord={handleRerecord}
          />
        </div>
      ) : (
        // Show recording interface
        <div className="max-w-md w-full space-y-8 relative">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-5xl text-gray-900 dark:text-white mb-2 border-2 border-gray-900 dark:border-white inline-block px-4 pb-2 rounded-lg transition-colors duration-300">recora</h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Screen recordings made simple: Record. Download. Done.</p>
          </div>

        {/* Recording Status */}
        <RecordingStatus 
          isRecording={isRecording}
          isPaused={isPaused}
          duration={duration}
          className="mb-6"
        />

        {/* Main Controls */}
        <div className="flex flex-col space-y-4">
          {isInactive && (
            <button
              onClick={handleStartRecording}
              className="group w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={isProcessing}
            >
              <div className="relative">
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zM6 15h8v-2H6v2z" clipRule="evenodd" />
                </svg>
                <div className="absolute inset-0 w-6 h-6 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
              <span className="text-lg">Start Recording</span>
              <div className="w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}

          {(isRecording || isPaused) && (
            <div className="space-y-4">
              {/* Live Audio Controls */}
              <AudioLiveControls
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onVolumeChange={setAudioLevel}
                isRecording={isRecording}
                className="mx-auto w-fit"
              />

              {/* Main Recording Controls */}
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
                      <span>
                        {compressionProgress ? compressionProgress.stage : 'Processing...'}
                      </span>
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
            </div>
          )}
        </div>

        {/* Compression Progress */}
        {compressionProgress && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  {compressionProgress.stage}
                </span>
                <span className="text-blue-600 dark:text-blue-400 text-sm">
                  {Math.round(compressionProgress.progress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${compressionProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Compression Result */}
        {compressionResult && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 transition-colors duration-300">
            <div className="space-y-2">
              <h4 className="text-green-700 dark:text-green-300 font-medium text-sm">Compression Complete</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-green-600 dark:text-green-400">
                <div>
                  <span className="font-medium">Original:</span> {formatFileSize(compressionResult.originalSize)}
                </div>
                <div>
                  <span className="font-medium">Compressed:</span> {formatFileSize(compressionResult.compressedSize)}
                </div>
                <div>
                  <span className="font-medium">Saved:</span> {compressionResult.compressionRatio.toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">Time:</span> {(compressionResult.processingTime / 1000).toFixed(1)}s
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
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-colors duration-300">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                  Browser Compatibility Notice
                </h3>
                <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                  {compatibilityIssues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Recording Settings */}
        {isInactive && (
          <div className="space-y-6">
            {/* Quality Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                Recording Quality
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => {
                  const newQuality = e.target.value as QualityPreset;
                  setSelectedQuality(newQuality);
                  saveQualityPreset(newQuality);
                }}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
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
              onAudioOptionsChange={setAudioOptions}
              disabled={false}
            />

            {/* Compression Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Compression</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enable-compression"
                  checked={useCompression}
                  onChange={(e) => setUseCompression(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="enable-compression" className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                  <span>Enable advanced compression</span>
                </label>
              </div>
              {useCompression && (
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                  Reduces file size with optimized encoding. Processing may take longer.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {isInactive && (
          <div className="text-center space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">
              Click "Start Recording" to capture your screen
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs transition-colors duration-300">
              Your browser will ask which screen or window to record
            </p>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
