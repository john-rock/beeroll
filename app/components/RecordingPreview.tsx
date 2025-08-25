'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDuration, formatFileSize } from '../utils/fileDownload';
import { Play, Download, RotateCcw, Trash2 } from 'lucide-react';

interface RecordingPreviewProps {
  videoBlob: Blob;
  duration: number;
  onDownload: () => void;
  onDelete: () => void;
  onRerecord: () => void;
  className?: string;
}

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

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoBlob]);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Recording Complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your screen recording is ready. Preview it below and choose what to do next.
        </p>
      </div>

      {/* Video Preview */}
      <div className="relative mb-6">
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={() => setIsPlaying(false)}
              controls
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Loading preview...</p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Play Button Overlay */}
        {!isPlaying && videoUrl && (
          <button
            onClick={togglePlayback}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200 group"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors duration-200">
              <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
            </div>
          </button>
        )}
      </div>

      {/* Recording Info */}
      <div className="flex justify-between items-center mb-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex space-x-4">
          <span>Duration: {formatDuration(duration)}</span>
          <span>Size: {formatFileSize(videoBlob.size)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onDownload}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform"
        >
          <Download className="w-5 h-5" />
          <span>Download</span>
        </button>

        <button
          onClick={onRerecord}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Re-record</span>
        </button>

        <button
          onClick={onDelete}
          className="bg-red-600 flex-1 space-x-2 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Delete recording"
        >
          <Trash2 className="w-5 h-5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
