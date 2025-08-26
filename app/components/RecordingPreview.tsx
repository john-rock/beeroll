'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { formatDuration, formatFileSize } from '../utils/fileDownload';
import { Play, Download, RotateCcw, Trash2, AlertCircle } from 'lucide-react';

interface RecordingPreviewProps {
  /** The video blob to preview */
  videoBlob: Blob;
  /** Duration of the recording in seconds */
  duration: number;
  /** Callback when download is requested */
  onDownload: () => void;
  /** Callback when delete is requested */
  onDelete: () => void;
  /** Callback when re-recording is requested */
  onRerecord: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for previewing recorded videos with playback controls and actions.
 * 
 * Features:
 * - Video preview with custom controls
 * - File information display
 * - Download, re-record, and delete actions
 * - Accessible video player
 * - Error handling for video loading
 * 
 * @example
 * ```tsx
 * <RecordingPreview
 *   videoBlob={videoBlob}
 *   duration={120}
 *   onDownload={handleDownload}
 *   onDelete={handleDelete}
 *   onRerecord={handleRerecord}
 * />
 * ```
 */
export function RecordingPreview({ 
  videoBlob, 
  duration, 
  onDownload, 
  onDelete, 
  onRerecord,
  className = '' 
}: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoBlob) {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create video preview';
        setError(errorMessage);
        console.error('Failed to create video preview:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [videoBlob]);

  const togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.error('Failed to play video:', err);
          setError('Failed to play video. Please try again.');
        });
      }
    }
  }, [isPlaying]);

  const handleVideoPlay = useCallback(() => setIsPlaying(true), []);
  const handleVideoPause = useCallback(() => setIsPlaying(false), []);
  const handleVideoEnded = useCallback(() => setIsPlaying(false), []);
  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', event);
    setError('Failed to load video. The file may be corrupted.');
  }, []);

  const handleDownload = useCallback(() => {
    onDownload();
  }, [onDownload]);

  const handleDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const handleRerecord = useCallback(() => {
    onRerecord();
  }, [onRerecord]);

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300 ${className}`}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Preview Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {error}
          </p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleDownload}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              aria-label="Download recording despite preview error"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Anyway</span>
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              aria-label="Delete recording"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300 ${className}`}>
      {/* Header */}
      <header className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Recording Complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your screen recording is ready. Preview it below and choose what to do next.
        </p>
      </header>

      {/* Video Preview */}
      <section className="relative mb-6" aria-label="Video Preview">
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" aria-hidden="true"></div>
                <p>Loading preview...</p>
              </div>
            </div>
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              controls
              preload="metadata"
              aria-label="Recording preview video"
              poster=""
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                <p>No video available</p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Play Button Overlay */}
        {!isPlaying && videoUrl && !isLoading && (
          <button
            onClick={togglePlayback}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200 group"
            aria-label="Play video preview"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors duration-200">
              <Play className="w-8 h-8 text-white ml-1" fill="currentColor" aria-hidden="true" />
            </div>
          </button>
        )}
      </section>

      {/* Recording Info */}
      <section className="flex justify-between items-center mb-6 text-sm text-gray-600 dark:text-gray-400" aria-label="Recording Information">
        <div className="flex space-x-4">
          <span>
            <span className="sr-only">Duration:</span>
            {formatDuration(duration)}
          </span>
          <span>
            <span className="sr-only">File size:</span>
            {formatFileSize(videoBlob.size)}
          </span>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="flex space-x-3" aria-label="Recording Actions">
        <button
          onClick={handleDownload}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform"
          aria-label="Download recording"
        >
          <Download className="w-5 h-5" aria-hidden="true" />
          <span>Download</span>
        </button>

        <button
          onClick={handleRerecord}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          aria-label="Start a new recording"
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" />
          <span>Re-record</span>
        </button>

        <button
          onClick={handleDelete}
          className="bg-red-600 flex-1 space-x-2 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Delete recording"
          aria-label="Delete recording permanently"
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
          <span>Delete</span>
        </button>
      </section>
    </div>
  );
}
