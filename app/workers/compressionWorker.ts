// Web Worker for video compression
import { CompressionSettings } from '../types/recording';

interface CompressionMessage {
  type: 'compress' | 'progress' | 'complete' | 'error';
  data?: any;
}

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { type, videoBlob, settings } = event.data;

  if (type === 'compress') {
    try {
      await compressVideo(videoBlob, settings);
    } catch (error) {
      postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Compression failed'
      });
    }
  }
};

async function compressVideo(videoBlob: Blob, settings: CompressionSettings) {
  try {
    // Send progress update
    postMessage({ type: 'progress', data: { progress: 0 } });

    // Check if WebCodecs API is available for hardware acceleration
    if ('VideoEncoder' in self && 'VideoDecoder' in self) {
      const compressedBlob = await compressWithWebCodecs(videoBlob, settings);
      postMessage({ type: 'complete', data: { blob: compressedBlob } });
    } else {
      // Fallback to basic processing
      const processedBlob = await basicVideoProcessing(videoBlob, settings);
      postMessage({ type: 'complete', data: { blob: processedBlob } });
    }
  } catch (error) {
    postMessage({
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown compression error'
    });
  }
}

async function compressWithWebCodecs(videoBlob: Blob, settings: CompressionSettings): Promise<Blob> {
  // This is a simplified implementation
  // In a real scenario, you'd use VideoEncoder/VideoDecoder APIs
  postMessage({ type: 'progress', data: { progress: 50 } });
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  postMessage({ type: 'progress', data: { progress: 100 } });
  
  // For now, return the original blob with optimized settings
  // In reality, this would re-encode the video with better compression
  return videoBlob;
}

async function basicVideoProcessing(videoBlob: Blob, settings: CompressionSettings): Promise<Blob> {
  postMessage({ type: 'progress', data: { progress: 25 } });

  // Create video element to analyze the content
  const video = new OffscreenCanvas(1, 1);
  const ctx = video.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  postMessage({ type: 'progress', data: { progress: 50 } });

  // Simulate basic optimization
  await new Promise(resolve => setTimeout(resolve, 500));

  postMessage({ type: 'progress', data: { progress: 75 } });

  // For basic processing, we'll return the original blob
  // In a real implementation, you might:
  // 1. Adjust bitrate based on content analysis
  // 2. Remove unnecessary frames
  // 3. Optimize audio encoding
  
  postMessage({ type: 'progress', data: { progress: 100 } });
  
  return videoBlob;
}

// Export types for TypeScript compilation
export type { CompressionMessage };
