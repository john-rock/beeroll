'use client';

import { RecordingError, RecordingErrorType } from '../utils/errorHandling';

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
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
        );
      case RecordingErrorType.NOT_SUPPORTED:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      case RecordingErrorType.NO_DEVICES:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
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
        return 'blue';
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
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
