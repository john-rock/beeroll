/**
 * Types of errors that can occur during screen recording
 */
export enum RecordingErrorType {
  /** Permission to access screen/microphone was denied */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Browser or device doesn't support required features */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /** No recording devices (display/audio) found */
  NO_DEVICES = 'NO_DEVICES',
  /** Recording operation failed for technical reasons */
  RECORDING_FAILED = 'RECORDING_FAILED',
  /** Recording was interrupted or stopped unexpectedly */
  STREAM_ENDED = 'STREAM_ENDED',
  /** Video compression failed */
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  /** File download failed */
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  /** Unknown or unexpected error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Structured error information for recording operations
 */
export interface RecordingError {
  /** Type of error that occurred */
  type: RecordingErrorType;
  /** Human-readable error message */
  message: string;
  /** Original error object if available */
  originalError?: Error;
  /** Helpful suggestion for resolving the error */
  suggestion?: string;
  /** Whether the error can be recovered from */
  recoverable: boolean;
  /** Timestamp when the error occurred */
  timestamp?: Date;
  /** Additional context information */
  context?: Record<string, unknown>;
}

/**
 * Comprehensive error handling system for screen recording applications.
 * 
 * Features:
 * - Error classification and categorization
 * - User-friendly error messages
 * - Recovery suggestions
 * - Browser compatibility checking
 * - Detailed error context
 * 
 * @example
 * ```typescript
 * try {
 *   await startRecording();
 * } catch (error) {
 *   const recordingError = RecordingErrorHandler.handleError(error);
 *   console.error('Recording failed:', recordingError.message);
 *   if (recordingError.recoverable) {
 *     console.log('Suggestion:', recordingError.suggestion);
 *   }
 * }
 * ```
 */
export class RecordingErrorHandler {
  /**
   * Handle and classify any error that occurs during recording
   * 
   * @param error - The error to handle
   * @returns Structured RecordingError object
   * 
   * @example
   * ```typescript
   * const error = RecordingErrorHandler.handleError(unknownError);
   * displayError(error);
   * ```
   */
  static handleError(error: unknown): RecordingError {
    const timestamp = new Date();
    
    if (error instanceof DOMException) {
      return this.handleDOMException(error, timestamp);
    }
    
    if (error instanceof Error) {
      return this.handleGenericError(error, timestamp);
    }
    
    return {
      type: RecordingErrorType.UNKNOWN,
      message: 'An unknown error occurred during recording',
      recoverable: false,
      suggestion: 'Please try refreshing the page and starting again. If the problem persists, check your browser console for more details.',
      timestamp,
      context: { originalError: String(error) }
    };
  }

  /**
   * Handle DOM-specific exceptions (permissions, media access, etc.)
   * 
   * @param error - DOMException to handle
   * @param timestamp - When the error occurred
   * @returns Structured RecordingError object
   */
  private static handleDOMException(error: DOMException, timestamp: Date): RecordingError {
    const baseError: Omit<RecordingError, 'type' | 'message' | 'suggestion'> = {
      originalError: error,
      recoverable: false,
      timestamp,
      context: { 
        name: error.name, 
        code: error.code,
        stack: error.stack 
      }
    };

    switch (error.name) {
      case 'NotAllowedError':
        return {
          ...baseError,
          type: RecordingErrorType.PERMISSION_DENIED,
          message: 'Screen recording permission was denied by the user or browser',
          recoverable: true,
          suggestion: 'Please allow screen sharing when prompted by your browser. You may need to refresh the page and try again.'
        };
      
      case 'NotSupportedError':
        return {
          ...baseError,
          type: RecordingErrorType.NOT_SUPPORTED,
          message: 'Screen recording is not supported in this browser or device',
          recoverable: false,
          suggestion: 'Please use a modern browser like Chrome 80+, Firefox 75+, or Safari 14+. Mobile browsers may have limited support.'
        };
      
      case 'NotFoundError':
        return {
          ...baseError,
          type: RecordingErrorType.NO_DEVICES,
          message: 'No recording devices (display or audio) were found',
          recoverable: true,
          suggestion: 'Please check that your display and audio devices are connected and working. Try refreshing the page or restarting your browser.'
        };
      
      case 'AbortError':
        return {
          ...baseError,
          type: RecordingErrorType.STREAM_ENDED,
          message: 'Recording was interrupted or stopped unexpectedly',
          recoverable: true,
          suggestion: 'The recording was stopped by the system or user. You can start a new recording. Check that your system resources are sufficient.'
        };
      
      case 'NotReadableError':
        return {
          ...baseError,
          type: RecordingErrorType.RECORDING_FAILED,
          message: 'Failed to read from recording device',
          recoverable: true,
          suggestion: 'The recording device may be in use by another application. Please close other recording software and try again.'
        };
      
      case 'OverconstrainedError':
        return {
          ...baseError,
          type: RecordingErrorType.RECORDING_FAILED,
          message: 'Recording constraints cannot be satisfied',
          recoverable: true,
          suggestion: 'The requested recording quality may be too high for your device. Try using a lower quality setting.'
        };
      
      default:
        return {
          ...baseError,
          type: RecordingErrorType.RECORDING_FAILED,
          message: `Recording failed due to browser error: ${error.message}`,
          recoverable: true,
          suggestion: 'Please try starting the recording again. If the problem persists, try refreshing the page or using a different browser.'
        };
    }
  }

  /**
   * Handle generic JavaScript errors
   * 
   * @param error - Error object to handle
   * @param timestamp - When the error occurred
   * @returns Structured RecordingError object
   */
  private static handleGenericError(error: Error, timestamp: Date): RecordingError {
    const baseError: Omit<RecordingError, 'type' | 'message' | 'suggestion'> = {
      originalError: error,
      recoverable: true,
      timestamp,
      context: { 
        name: error.name, 
        stack: error.stack 
      }
    };

    const message = error.message.toLowerCase();
    
    if (message.includes('compression') || message.includes('ffmpeg')) {
      return {
        ...baseError,
        type: RecordingErrorType.COMPRESSION_FAILED,
        message: 'Video compression failed during processing',
        suggestion: 'The recording will be saved without compression. You can try enabling compression later or use a different quality setting.'
      };
    }
    
    if (message.includes('download') || message.includes('blob')) {
      return {
        ...baseError,
        type: RecordingErrorType.DOWNLOAD_FAILED,
        message: 'Failed to download the recording file',
        suggestion: 'Please check your browser download settings and try again. Ensure you have sufficient disk space available.'
      };
    }
    
    if (message.includes('permission') || message.includes('access')) {
      return {
        ...baseError,
        type: RecordingErrorType.PERMISSION_DENIED,
        message: 'Access to recording devices was denied',
        suggestion: 'Please check your browser permissions and allow access to your screen and microphone when prompted.'
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        ...baseError,
        type: RecordingErrorType.RECORDING_FAILED,
        message: 'Network error occurred during recording',
        suggestion: 'Please check your internet connection and try again. Some features may require an active connection.'
      };
    }
    
    return {
      ...baseError,
      type: RecordingErrorType.RECORDING_FAILED,
      message: error.message || 'Recording failed due to an unexpected error',
      suggestion: 'Please try starting the recording again. If the problem persists, check the browser console for more details.'
    };
  }

  /**
   * Create a custom error with specific type and context
   * 
   * @param type - Type of error
   * @param message - Error message
   * @param options - Additional error options
   * @returns Structured RecordingError object
   * 
   * @example
   * ```typescript
   * const error = RecordingErrorHandler.createError(
   *   RecordingErrorType.COMPRESSION_FAILED,
   *   'FFmpeg initialization failed',
   *   { recoverable: true, suggestion: 'Try refreshing the page' }
   * );
   * ```
   */
  static createError(
    type: RecordingErrorType,
    message: string,
    options: Partial<Omit<RecordingError, 'type' | 'message'>> = {}
  ): RecordingError {
    return {
      type,
      message,
      recoverable: false,
      timestamp: new Date(),
      ...options
    };
  }
}

/**
 * Browser compatibility checking utilities for screen recording features
 * 
 * Features:
 * - API support detection
 * - Format compatibility checking
 * - Device capability assessment
 * - User agent analysis
 * 
 * @example
 * ```typescript
 * const compatibility = CompatibilityChecker.checkRecordingSupport();
 * if (!compatibility.supported) {
 *   console.log('Compatibility issues:', compatibility.issues);
 * }
 * ```
 */
export class CompatibilityChecker {
  /**
   * Check if the current browser supports screen recording features
   * 
   * @returns Object containing support status and any issues found
   * 
   * @example
   * ```typescript
   * const { supported, issues } = CompatibilityChecker.checkRecordingSupport();
   * if (supported) {
   *   console.log('Screen recording fully supported');
   * } else {
   *   console.log('Issues found:', issues);
   * }
   * ```
   */
  static checkRecordingSupport(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for getDisplayMedia API
    if (!navigator.mediaDevices?.getDisplayMedia) {
      issues.push('Screen capture not supported - getDisplayMedia API missing');
    }
    
    // Check for MediaRecorder API
    if (!window.MediaRecorder) {
      issues.push('Media recording not supported - MediaRecorder API missing');
    }
    
    // Check for supported video formats
    const supportedFormats = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    const hasFormat = supportedFormats.some(format => 
      MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)
    );
    
    if (!hasFormat) {
      issues.push('No supported video formats available - MediaRecorder.isTypeSupported failed');
    }
    
    // Check for Web Workers
    if (!window.Worker) {
      issues.push('Web Workers not supported - compression may be slower or unavailable');
    }
    
    // Check for SharedArrayBuffer (required for FFmpeg.wasm)
    if (typeof SharedArrayBuffer === 'undefined') {
      issues.push('SharedArrayBuffer not supported - advanced compression unavailable');
    }
    
    // Check for WebAssembly
    if (typeof WebAssembly === 'undefined') {
      issues.push('WebAssembly not supported - compression unavailable');
    }
    
    return {
      supported: issues.length === 0 || issues.every(issue => 
        issue.includes('compression') || issue.includes('Web Workers')
      ),
      issues
    };
  }
  
  /**
   * Get detailed information about the user's browser and device
   * 
   * @returns Object containing browser information
   * 
   * @example
   * ```typescript
   * const info = CompatibilityChecker.getUserAgentInfo();
   * console.log(`Using ${info.browser} ${info.version} on ${info.mobile ? 'mobile' : 'desktop'}`);
   * ```
   */
  static getUserAgentInfo(): { browser: string; version: string; mobile: boolean; os: string } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';
    
    // Browser detection
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    // OS detection
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS')) {
      os = 'iOS';
    }
    
    const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return { browser, version, mobile, os };
  }

  /**
   * Check if the current environment supports advanced features
   * 
   * @returns Object containing feature support status
   * 
   * @example
   * ```typescript
   * const features = CompatibilityChecker.checkAdvancedFeatures();
   * if (features.ffmpeg) {
   *   console.log('FFmpeg compression available');
   * }
   * ```
   */
  static checkAdvancedFeatures(): {
    ffmpeg: boolean;
    webWorkers: boolean;
    sharedArrayBuffer: boolean;
    webAssembly: boolean;
  } {
    return {
      ffmpeg: typeof SharedArrayBuffer !== 'undefined' && typeof WebAssembly !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined'
    };
  }
}
