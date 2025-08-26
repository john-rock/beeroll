/**
 * File download and formatting utilities for screen recording applications.
 * 
 * Features:
 * - Secure blob downloads
 * - Duration formatting
 * - File size formatting
 * - Automatic filename generation
 * - Error handling and validation
 * 
 * @example
 * ```typescript
 * // Download a recording
 * downloadBlob(videoBlob, 'recording.webm');
 * 
 * // Format duration and file size
 * const duration = formatDuration(65000); // "01:05"
 * const size = formatFileSize(1024 * 1024); // "1 MB"
 * 
 * // Generate filename
 * const filename = generateFilename('video/webm'); // "screen-recording_2024-01-15_10-30-45.webm"
 * ```
 */

/**
 * Download a blob as a file in the browser
 * 
 * This function creates a temporary download link, triggers the download,
 * and cleans up resources automatically. It's safe to use multiple times.
 * 
 * @param blob - The blob to download
 * @param filename - The filename for the downloaded file
 * @returns True if download was initiated successfully
 * @throws Error if download fails
 * 
 * @example
 * ```typescript
 * try {
 *   const success = downloadBlob(videoBlob, 'my-recording.webm');
 *   if (success) {
 *     console.log('Download started successfully');
 *   }
 * } catch (error) {
 *   console.error('Download failed:', error);
 * }
 * ```
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    // Validate inputs
    if (!blob || blob.size === 0) {
      throw new Error('Invalid blob provided. Blob must exist and have content.');
    }
    
    if (!filename || filename.trim() === '') {
      throw new Error('Invalid filename provided. Filename must not be empty.');
    }

    // Create object URL
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none'; // Hide the link
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to download blob:', errorMessage);
    throw new Error(`Download failed: ${errorMessage}`);
  }
}

/**
 * Format duration in milliseconds to MM:SS format
 * 
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string (e.g., "01:05" for 65 seconds)
 * 
 * @example
 * ```typescript
 * const duration = formatDuration(65000); // "01:05"
 * const shortDuration = formatDuration(5000); // "00:05"
 * const longDuration = formatDuration(3661000); // "61:01"
 * ```
 */
export function formatDuration(milliseconds: number): string {
  // Validate input
  if (milliseconds < 0 || !Number.isFinite(milliseconds)) {
    console.warn('Invalid duration provided, using 0:', milliseconds);
    milliseconds = 0;
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human-readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 * 
 * @example
 * ```typescript
 * const size1 = formatFileSize(1024); // "1 KB"
 * const size2 = formatFileSize(1024 * 1024); // "1 MB"
 * const size3 = formatFileSize(1536 * 1024); // "1.5 MB"
 * const size4 = formatFileSize(0); // "0 Bytes"
 * ```
 */
export function formatFileSize(bytes: number): string {
  // Validate input
  if (bytes < 0 || !Number.isFinite(bytes)) {
    console.warn('Invalid file size provided, using 0:', bytes);
    bytes = 0;
  }
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure we don't go out of bounds
  if (i >= sizes.length) {
    return `${(bytes / Math.pow(k, sizes.length - 1)).toFixed(2)} ${sizes[sizes.length - 1]}`;
  }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a filename for screen recordings with timestamp
 * 
 * @param mimeType - MIME type of the recording (defaults to 'video/mp4')
 * @returns Generated filename with timestamp and appropriate extension
 * 
 * @example
 * ```typescript
 * const filename1 = generateFilename('video/webm'); // "screen-recording_2024-01-15_10-30-45.webm"
 * const filename2 = generateFilename('video/mp4'); // "screen-recording_2024-01-15_10-30-45.mp4"
 * const filename3 = generateFilename(); // "screen-recording_2024-01-15_10-30-45.mp4"
 * ```
 */
export function generateFilename(mimeType: string = 'video/mp4'): string {
  try {
    // Generate timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5); // Remove milliseconds and Z
    
    // Determine extension from MIME type
    let extension = 'mp4'; // Default extension
    
    if (mimeType.includes('webm')) {
      extension = 'webm';
    } else if (mimeType.includes('mp4')) {
      extension = 'mp4';
    } else if (mimeType.includes('avi')) {
      extension = 'avi';
    } else if (mimeType.includes('mov')) {
      extension = 'mov';
    } else if (mimeType.includes('mkv')) {
      extension = 'mkv';
    }
    
    return `screen-recording_${timestamp}.${extension}`;
  } catch (error) {
    console.warn('Failed to generate filename, using fallback:', error);
    // Fallback filename if timestamp generation fails
    return `screen-recording_${Date.now()}.mp4`;
  }
}

/**
 * Generate a filename with custom prefix and timestamp
 * 
 * @param prefix - Custom prefix for the filename
 * @param mimeType - MIME type of the recording
 * @returns Generated filename with custom prefix
 * 
 * @example
 * ```typescript
 * const filename = generateCustomFilename('meeting', 'video/webm');
 * // Result: "meeting_2024-01-15_10-30-45.webm"
 * ```
 */
export function generateCustomFilename(prefix: string, mimeType: string = 'video/mp4'): string {
  try {
    // Validate prefix
    if (!prefix || prefix.trim() === '') {
      throw new Error('Prefix must not be empty');
    }
    
    // Clean prefix (remove invalid characters)
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    
    // Generate timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5);
    
    // Determine extension
    let extension = 'mp4';
    if (mimeType.includes('webm')) {
      extension = 'webm';
    } else if (mimeType.includes('mp4')) {
      extension = 'mp4';
    }
    
    return `${cleanPrefix}_${timestamp}.${extension}`;
  } catch (error) {
    console.warn('Failed to generate custom filename, using fallback:', error);
    return generateFilename(mimeType);
  }
}

/**
 * Validate if a filename is safe for download
 * 
 * @param filename - The filename to validate
 * @returns True if the filename is safe, false otherwise
 * 
 * @example
 * ```typescript
 * if (isValidFilename('my-recording.webm')) {
 *   console.log('Filename is safe');
 * } else {
 *   console.log('Filename contains invalid characters');
 * }
 * ```
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || filename.trim() === '') {
    return false;
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    return false;
  }
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(filename)) {
    return false;
  }
  
  // Check length (reasonable limit)
  if (filename.length > 255) {
    return false;
  }
  
  return true;
}
