export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

/**
 * Get available audio input devices (microphones)
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    // Request permission first
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      });

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
        kind: 'audioinput' as const
      }));
  } catch (error) {
    console.warn('Failed to get audio input devices:', error);
    return [];
  }
}

/**
 * Test if microphone access is available
 */
export async function testMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.warn('Microphone access not available:', error);
    return false;
  }
}

/**
 * Combine screen audio with microphone audio
 */
export async function getMixedAudioStream(
  screenStream: MediaStream,
  microphoneDeviceId?: string
): Promise<MediaStream> {
  try {
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
    const mixedAudioTrack = destination.stream.getAudioTracks()[0];
    
    // Create combined stream
    const combinedStream = new MediaStream([videoTrack, mixedAudioTrack]);
    
    return combinedStream;
  } catch (error) {
    console.warn('Failed to mix audio streams, falling back to screen audio:', error);
    return screenStream;
  }
}

/**
 * Check if system audio capture is supported
 */
export function isSystemAudioSupported(): boolean {
  // System audio capture is limited and browser-dependent
  // Most browsers don't allow system audio capture without screen sharing
  return 'getDisplayMedia' in navigator.mediaDevices;
}
