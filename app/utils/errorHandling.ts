export enum RecordingErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NO_DEVICES = 'NO_DEVICES',
  RECORDING_FAILED = 'RECORDING_FAILED',
  STREAM_ENDED = 'STREAM_ENDED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  UNKNOWN = 'UNKNOWN'
}

export interface RecordingError {
  type: RecordingErrorType;
  message: string;
  originalError?: Error;
  suggestion?: string;
  recoverable: boolean;
}

export class RecordingErrorHandler {
  static handleError(error: unknown): RecordingError {
    if (error instanceof DOMException) {
      return this.handleDOMException(error);
    }
    
    if (error instanceof Error) {
      return this.handleGenericError(error);
    }
    
    return {
      type: RecordingErrorType.UNKNOWN,
      message: 'An unknown error occurred',
      recoverable: false,
      suggestion: 'Please try refreshing the page and starting again.'
    };
  }

  private static handleDOMException(error: DOMException): RecordingError {
    switch (error.name) {
      case 'NotAllowedError':
        return {
          type: RecordingErrorType.PERMISSION_DENIED,
          message: 'Screen recording permission was denied',
          originalError: error,
          recoverable: true,
          suggestion: 'Please allow screen sharing when prompted by your browser.'
        };
      
      case 'NotSupportedError':
        return {
          type: RecordingErrorType.NOT_SUPPORTED,
          message: 'Screen recording is not supported in this browser',
          originalError: error,
          recoverable: false,
          suggestion: 'Please use a modern browser like Chrome, Firefox, or Safari.'
        };
      
      case 'NotFoundError':
        return {
          type: RecordingErrorType.NO_DEVICES,
          message: 'No recording devices found',
          originalError: error,
          recoverable: true,
          suggestion: 'Please check that your display and audio devices are connected.'
        };
      
      case 'AbortError':
        return {
          type: RecordingErrorType.STREAM_ENDED,
          message: 'Recording was interrupted',
          originalError: error,
          recoverable: true,
          suggestion: 'The recording was stopped by the system or user. You can start a new recording.'
        };
      
      default:
        return {
          type: RecordingErrorType.RECORDING_FAILED,
          message: `Recording failed: ${error.message}`,
          originalError: error,
          recoverable: true,
          suggestion: 'Please try starting the recording again.'
        };
    }
  }

  private static handleGenericError(error: Error): RecordingError {
    if (error.message.includes('compression')) {
      return {
        type: RecordingErrorType.COMPRESSION_FAILED,
        message: 'Video compression failed',
        originalError: error,
        recoverable: true,
        suggestion: 'The recording will be saved without compression. You can try enabling compression later.'
      };
    }
    
    if (error.message.includes('download')) {
      return {
        type: RecordingErrorType.DOWNLOAD_FAILED,
        message: 'Failed to download recording',
        originalError: error,
        recoverable: true,
        suggestion: 'Please check your browser download settings and try again.'
      };
    }
    
    return {
      type: RecordingErrorType.RECORDING_FAILED,
      message: error.message || 'Recording failed',
      originalError: error,
      recoverable: true,
      suggestion: 'Please try starting the recording again.'
    };
  }
}

// Browser compatibility checks
export class CompatibilityChecker {
  static checkRecordingSupport(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for getDisplayMedia API
    if (!navigator.mediaDevices?.getDisplayMedia) {
      issues.push('Screen capture not supported');
    }
    
    // Check for MediaRecorder API
    if (!window.MediaRecorder) {
      issues.push('Media recording not supported');
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
      issues.push('No supported video formats available');
    }
    
    // Check for Web Workers
    if (!window.Worker) {
      issues.push('Web Workers not supported (compression may be slower)');
    }
    
    return {
      supported: issues.length === 0 || issues.every(issue => issue.includes('compression')),
      issues
    };
  }
  
  static getUserAgentInfo(): { browser: string; version: string; mobile: boolean } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
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
    }
    
    const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return { browser, version, mobile };
  }
}
