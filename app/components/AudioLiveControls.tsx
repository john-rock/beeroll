'use client';

import { useState, useEffect } from 'react';

interface AudioLiveControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange?: (level: number) => void;
  isRecording: boolean;
  className?: string;
}

export function AudioLiveControls({ 
  isMuted, 
  onToggleMute, 
  onVolumeChange,
  isRecording,
  className = '' 
}: AudioLiveControlsProps) {
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  if (!isRecording) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg p-2 ${className}`}>
      {/* Mute Toggle */}
      <button
        onClick={onToggleMute}
        className={`p-2 rounded-lg transition-colors duration-200 ${
          isMuted 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        title={isMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {isMuted ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-2.82a1 1 0 011.0 0zM18 10a8 8 0 11-16 0 8 8 0 0116 0zM7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 101.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-2.82a1 1 0 011.0 0zm5.234 2.924A5.978 5.978 0 0118 11a5.978 5.978 0 01-3.383 5.001 1 1 0 11-.79-1.836A3.982 3.982 0 0016 11a3.982 3.982 0 00-2.173-3.165 1 1 0 01.79-1.835z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Volume Control */}
      {onVolumeChange && (
        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors duration-200"
            title="Adjust volume"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3.5a.5.5 0 00-1 0V4a.5.5 0 001 0v-.5zM12 5a.5.5 0 00-.5-.5h-3a.5.5 0 000 1h3A.5.5 0 0012 5zM14 7a.5.5 0 00-.5-.5h-7a.5.5 0 000 1h7A.5.5 0 0014 7zM16 9a.5.5 0 00-.5-.5h-11a.5.5 0 000 1h11A.5.5 0 0016 9zM14 11a.5.5 0 00-.5-.5h-7a.5.5 0 000 1h7a.5.5 0 00.5-.5zM12 13a.5.5 0 00-.5-.5h-3a.5.5 0 000 1h3a.5.5 0 00.5-.5zM10 14.5a.5.5 0 00-1 0V15a.5.5 0 001 0v-.5z" />
            </svg>
          </button>

          {showVolumeSlider && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/80 backdrop-blur-sm rounded-lg p-3">
              <div className="flex flex-col items-center space-y-2">
                <span className="text-white text-xs">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-vertical"
                  style={{ writingMode: 'bt-lr', width: '20px', height: '80px' }}
                />
                <span className="text-white text-xs">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Level Indicator */}
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded transition-colors duration-100 ${
                !isMuted && i < 3 // Simulated audio level
                  ? 'bg-green-400' 
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <span className="text-white text-xs">
          {isMuted ? 'MUTED' : 'LIVE'}
        </span>
      </div>
    </div>
  );
}
