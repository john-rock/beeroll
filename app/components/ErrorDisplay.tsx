'use client';

import { RecordingError, RecordingErrorType } from '../utils/errorHandling';
import { Key, Maximize, Image, AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  /** The error to display, or null if no error */
  error: RecordingError | null;
  /** Callback function when retry is requested */
  onRetry?: () => void;
  /** Callback function when error is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for displaying recording errors with appropriate styling and actions.
 * 
 * Features:
 * - Contextual error icons based on error type
 * - Color-coded error styling
 * - Retry functionality for recoverable errors
 * - Dismissible error messages
 * - Accessible error information
 * - Helpful suggestions for resolution
 * 
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={recordingError}
 *   onRetry={handleRetry}
 *   onDismiss={clearError}
 * />
 * ```
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '' 
}: ErrorDisplayProps) {
  if (!error) return null;

  /**
   * Get the appropriate icon for the error type
   */
  const getErrorIcon = (type: RecordingErrorType) => {
    switch (type) {
      case RecordingErrorType.PERMISSION_DENIED:
        return <Key className="w-6 h-6" aria-hidden="true" />;
      case RecordingErrorType.NOT_SUPPORTED:
        return <Maximize className="w-6 h-6" aria-hidden="true" />;
      case RecordingErrorType.NO_DEVICES:
        return <Image className="w-6 h-6" aria-hidden="true" />;
      default:
        return <AlertCircle className="w-6 h-6" aria-hidden="true" />;
    }
  };

  /**
   * Get the appropriate color scheme for the error type
   */
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

  /**
   * Get the human-readable error title
   */
  const getErrorTitle = (type: RecordingErrorType) => {
    switch (type) {
      case RecordingErrorType.PERMISSION_DENIED:
        return 'Permission Required';
      case RecordingErrorType.NOT_SUPPORTED:
        return 'Browser Not Supported';
      case RecordingErrorType.NO_DEVICES:
        return 'No Devices Found';
      case RecordingErrorType.RECORDING_FAILED:
        return 'Recording Failed';
      case RecordingErrorType.STREAM_ENDED:
        return 'Recording Interrupted';
      case RecordingErrorType.COMPRESSION_FAILED:
        return 'Compression Failed';
      case RecordingErrorType.DOWNLOAD_FAILED:
        return 'Download Failed';
      case RecordingErrorType.UNKNOWN:
        return 'Unknown Error';
      default:
        return 'Error Occurred';
    }
  };

  const color = getErrorColor(error.type);
  const bgClass = `bg-${color}-50 dark:bg-${color}-900/20`;
  const borderClass = `border-${color}-200 dark:border-${color}-700`;
  const textClass = `text-${color}-700 dark:text-${color}-300`;
  const iconClass = `text-${color}-600 dark:text-${color}-400`;

  return (
    <div 
      className={`${bgClass} ${borderClass} border rounded-lg p-4 transition-colors duration-300 ${className}`}
      role="alert"
      aria-live="assertive"
      aria-label={`Error: ${getErrorTitle(error.type)}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${iconClass}`}>
          {getErrorIcon(error.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${textClass}`}>
            {getErrorTitle(error.type)}
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
              className={`text-xs font-medium ${textClass} hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 rounded px-2 py-1`}
              aria-label="Retry the failed operation"
            >
              Retry
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${iconClass} hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 rounded p-1`}
              aria-label="Dismiss error message"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
