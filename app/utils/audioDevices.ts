/**
 * Represents an audio device (microphone or speaker)
 */
export interface AudioDevice {
  /** Unique identifier for the device */
  deviceId: string;
  /** Human-readable name for the device */
  label: string;
  /** Type of audio device */
  kind: 'audioinput' | 'audiooutput';
}

/**
 * Audio device management utilities for screen recording applications.
 * 
 * Features:
 * - Microphone device detection and enumeration
 * - Audio stream mixing for screen + microphone recording
 * - Browser compatibility checking
 * - Permission handling and error recovery
 * 
 * @example
 * ```typescript
 * // Get available microphones
 * const devices = await getAudioInputDevices();
 * console.log('Available microphones:', devices);
 * 
 * // Test microphone access
 * const hasAccess = await testMicrophoneAccess();
 * if (hasAccess) {
 *   console.log('Microphone access granted');
 * }
 * ```
 */

/**
 * Get available audio input devices (microphones)
 * 
 * ⚠️  IMPORTANT: This function will request microphone permission immediately.
 * Only call this when the user has explicitly chosen to use microphone audio.
 * 
 * This function will request microphone permission and enumerate all available
 * audio input devices. If permission is denied, an empty array is returned.
 * 
 * @returns Promise resolving to array of available audio input devices
 * @throws Error if device enumeration fails
 * 
 * @example
 * ```typescript
 * try {
 *   const devices = await getAudioInputDevices();
 *   if (devices.length === 0) {
 *     console.log('No microphones available or permission denied');
 *   } else {
 *     console.log(`Found ${devices.length} microphone(s)`);
 *   }
 * } catch (error) {
 *     console.error('Failed to get audio devices:', error);
 *   }
 * ```
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    // Request permission first
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop all tracks to release the stream
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
        kind: 'audioinput' as const
      }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Failed to get audio input devices:', errorMessage);
    
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

/**
 * Test if microphone access is available
 * 
 * ⚠️  IMPORTANT: This function will request microphone permission immediately.
 * Only call this when the user has explicitly chosen to use microphone audio.
 * 
 * This function attempts to get microphone access to determine if the user
 * has granted permission and if the device supports audio input.
 * 
 * @returns Promise resolving to true if microphone access is available
 * 
 * @example
 * ```typescript
 * const hasAccess = await testMicrophoneAccess();
 * if (hasAccess) {
 *   console.log('Microphone access available');
 * } else {
 *   console.log('Microphone access not available');
 * }
 * ```
 */
export async function testMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop all tracks to release the stream
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Microphone access not available:', errorMessage);
    return false;
  }
}

/**
 * Combine screen audio with microphone audio for mixed recording
 * 
 * ⚠️  IMPORTANT: This function will request microphone permission if not already granted.
 * Only call this when the user has explicitly chosen to use microphone audio.
 * 
 * This function creates a mixed audio stream by combining system audio
 * from screen sharing with microphone input. The result is a single
 * MediaStream that can be used for recording.
 * 
 * @param screenStream - MediaStream from screen sharing (should include audio)
 * @param microphoneDeviceId - Optional specific microphone device ID
 * @returns Promise resolving to combined MediaStream with video and mixed audio
 * @throws Error if audio mixing fails
 * 
 * @example
 * ```typescript
 * try {
 *   const screenStream = await navigator.mediaDevices.getDisplayMedia({
 *     video: true,
 *     audio: true
 *   });
 *   
 *   const mixedStream = await getMixedAudioStream(screenStream, 'mic-device-id');
 *   console.log('Mixed audio stream created successfully');
 * } catch (error) {
 *   console.error('Failed to create mixed audio stream:', error);
 * }
 * ```
 */
export async function getMixedAudioStream(
  screenStream: MediaStream,
  microphoneDeviceId?: string
): Promise<MediaStream> {
  try {
    // Validate input stream
    if (!screenStream || !screenStream.active) {
      throw new Error('Invalid or inactive screen stream provided');
    }

    // Get microphone stream
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: microphoneDeviceId 
        ? { deviceId: { exact: microphoneDeviceId } }
        : true
    });

    // Create audio context for mixing
    const audioContext = new AudioContext();
    
    // Create sources
    const screenSource = audioContext.createMediaStreamSource(screenStream);
    const micSource = audioContext.createMediaStreamSource(micStream);
    
    // Create destination
    const destination = audioContext.createMediaStreamDestination();
    
    // Connect sources to destination
    screenSource.connect(destination);
    micSource.connect(destination);
    
    // Get video track from screen stream
    const videoTrack = screenStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track found in screen stream');
    }
    
    const mixedAudioTrack = destination.stream.getAudioTracks()[0];
    if (!mixedAudioTrack) {
      throw new Error('No audio track found in mixed stream');
    }
    
    // Create combined stream
    const combinedStream = new MediaStream([videoTrack, mixedAudioTrack]);
    
    return combinedStream;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Failed to mix audio streams, falling back to screen audio:', errorMessage);
    
    // Fallback: return original screen stream if mixing fails
    return screenStream;
  }
}

/**
 * Check if system audio capture is supported
 * 
 * This function checks if the browser supports capturing system audio
 * along with screen sharing. Note that system audio capture is limited
 * and browser-dependent.
 * 
 * @returns True if system audio capture is supported
 * 
 * @example
 * ```typescript
 * if (isSystemAudioSupported()) {
 *   console.log('System audio capture supported');
 * } else {
 *   console.log('System audio capture not supported');
 * }
 * ```
 */
export function isSystemAudioSupported(): boolean {
  // System audio capture is limited and browser-dependent
  // Most browsers don't allow system audio capture without screen sharing
  return 'getDisplayMedia' in navigator.mediaDevices;
}

/**
 * Get the default audio input device
 * 
 * @returns Promise resolving to the default audio input device or null
 * 
 * @example
 * ```typescript
 * const defaultDevice = await getDefaultAudioInputDevice();
 * if (defaultDevice) {
 *   console.log('Default microphone:', defaultDevice.label);
 * }
 * ```
 */
export async function getDefaultAudioInputDevice(): Promise<AudioDevice | null> {
  try {
    const devices = await getAudioInputDevices();
    return devices.length > 0 ? devices[0] : null;
  } catch (error) {
    console.warn('Failed to get default audio input device:', error);
    return null;
  }
}

/**
 * Check if a specific audio device is still available
 * 
 * @param deviceId - The device ID to check
 * @returns Promise resolving to true if the device is still available
 * 
 * @example
 * ```typescript
 * const isAvailable = await isAudioDeviceAvailable('device-id-123');
 * if (!isAvailable) {
 *   console.log('Device no longer available');
 * }
 * ```
 */
export async function isAudioDeviceAvailable(deviceId: string): Promise<boolean> {
  try {
    const devices = await getAudioInputDevices();
    return devices.some(device => device.deviceId === deviceId);
  } catch (error) {
    console.warn('Failed to check device availability:', error);
    return false;
  }
}
