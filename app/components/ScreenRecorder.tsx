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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white p-4 sm:p-8 transition-all duration-300">
      {hasRecordedVideo ? (
        // Show preview after recording
        <div className="max-w-3xl w-full">
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
        <div className="max-w-lg w-full space-y-8 relative">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent border-2 border-gray-300 dark:border-gray-600 inline-block px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105">
              recora
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed transition-colors duration-300">
              Screen recordings made simple: Record. Download. Done.
            </p>
          </div>

        {/* Recording Status */}
        {(isRecording || isPaused) && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-6 shadow-lg">
            <RecordingStatus 
              isRecording={isRecording}
              isPaused={isPaused}
              duration={duration}
              className="scale-110"
            />
          </div>
        )}

        {/* Main Controls */}
        <div className="flex flex-col space-y-4">
          {isInactive && (
            <button
              onClick={handleStartRecording}
              className="group w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-6 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={isProcessing}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="text-xl">Start Recording</span>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
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
                  className="col-span-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none"
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-700 dark:text-blue-300 font-semibold">
                    {compressionProgress.stage}
                  </span>
                </div>
                <span className="text-blue-600 dark:text-blue-400 text-lg font-bold">
                  {Math.round(compressionProgress.progress)}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${compressionProgress.progress}%` }}
                  />
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-sm text-center">
                  Optimizing your recording for the best quality and file size...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Compression Result */}
        {compressionResult && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6 shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 shadow-lg transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="space-y-6">
            {/* Quick Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Quick Settings</span>
                </h3>
              </div>

              {/* Quality Selector */}
              <div className="space-y-3">
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
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-blue-400"
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
            </div>

            {/* Advanced Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</span>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showAdvancedSettings && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  {/* Compression Settings */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                      </svg>
                      <span>Compression</span>
                    </h4>
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="enable-compression"
                        checked={useCompression}
                        onChange={(e) => setUseCompression(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor="enable-compression" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300 cursor-pointer">
                          Enable advanced compression
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Reduces file size with optimized encoding. Processing may take longer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
