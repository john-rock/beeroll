'use client';

import { RecordingError, RecordingErrorType } from '../utils/errorHandling';
import { Key, Maximize, Image, AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: RecordingError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, onDismiss, className = '' }: ErrorDisplayProps) {
  if (!error) return null;

  const getErrorIcon = (type: RecordingErrorType) => {
    switch (type) {
      case RecordingErrorType.PERMISSION_DENIED:
        return (
          <Key className="w-6 h-6" />
        );
      case RecordingErrorType.NOT_SUPPORTED:
        return (
          <Maximize className="w-6 h-6" />
        );
      case RecordingErrorType.NO_DEVICES:
        return (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image className="w-6 h-6" />
        );
      default:
        return (
          <AlertCircle className="w-6 h-6" />
        );
    }
  };

  const getErrorColor = (type: RecordingErrorType) => {
    switch (type) {
      case RecordingErrorType.PERMISSION_DENIED:
        return 'yellow';
      case RecordingErrorType.NOT_SUPPORTED:
        return 'red';
      case RecordingErrorType.COMPRESSION_FAILED:
        return 'indigo';
      default:
        return 'red';
    }
  };

  const color = getErrorColor(error.type);
  const bgClass = `bg-${color}-50 dark:bg-${color}-900/20`;
  const borderClass = `border-${color}-200 dark:border-${color}-700`;
  const textClass = `text-${color}-700 dark:text-${color}-300`;
  const iconClass = `text-${color}-600 dark:text-${color}-400`;

  return (
    <div className={`${bgClass} ${borderClass} border rounded-lg p-4 transition-colors duration-300 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${iconClass}`}>
          {getErrorIcon(error.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${textClass}`}>
            {error.type === RecordingErrorType.PERMISSION_DENIED && 'Permission Required'}
            {error.type === RecordingErrorType.NOT_SUPPORTED && 'Browser Not Supported'}
            {error.type === RecordingErrorType.NO_DEVICES && 'No Devices Found'}
            {error.type === RecordingErrorType.RECORDING_FAILED && 'Recording Failed'}
            {error.type === RecordingErrorType.STREAM_ENDED && 'Recording Interrupted'}
            {error.type === RecordingErrorType.COMPRESSION_FAILED && 'Compression Failed'}
            {error.type === RecordingErrorType.DOWNLOAD_FAILED && 'Download Failed'}
            {error.type === RecordingErrorType.UNKNOWN && 'Unknown Error'}
          </h3>
          
          <p className={`mt-1 text-sm ${textClass} opacity-90`}>
            {error.message}
          </p>
          
          {error.suggestion && (
            <p className={`mt-2 text-xs ${textClass} opacity-75`}>
              💡 {error.suggestion}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0 flex space-x-2">
          {error.recoverable && onRetry && (
            <button
              onClick={onRetry}
              className={`text-xs font-medium ${textClass} hover:opacity-75 transition-opacity`}
            >
              Retry
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${iconClass} hover:opacity-75 transition-opacity`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
