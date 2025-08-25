import { CompressionSettings } from '../types/recording';

export interface CompressionProgress {
  progress: number; // 0-100
  stage: string;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
}

export class CompressionEngine {
  private worker: Worker | null = null;
  private isCompressing = false;
  private progressCallback?: (progress: CompressionProgress) => void;

  async compress(
    videoBlob: Blob, 
    settings: CompressionSettings,
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<CompressionResult> {
    if (this.isCompressing) {
      throw new Error('Compression already in progress');
    }

    this.isCompressing = true;
    this.progressCallback = onProgress;
    const startTime = Date.now();
    const originalSize = videoBlob.size;

    try {
      // Initialize worker
      await this.initializeWorker();

      // Start compression
      const compressedBlob = await this.performCompression(videoBlob, settings);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const compressedSize = compressedBlob.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      return {
        blob: compressedBlob,
        originalSize,
        compressedSize,
        compressionRatio,
        processingTime
      };
    } finally {
      this.cleanup();
    }
  }

  getProgress(): number {
    // This would be updated by the worker
    return 0;
  }

  cancel(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isCompressing = false;
  }

  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from inline code since we can't easily serve a separate worker file
        const workerCode = this.getWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        this.worker = new Worker(workerUrl);
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (error) => {
          reject(new Error(`Worker error: ${error.message}`));
        };
        
        URL.revokeObjectURL(workerUrl);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private performCompression(videoBlob: Blob, settings: CompressionSettings): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'progress':
            if (this.progressCallback) {
              this.progressCallback({
                progress: data.progress,
                stage: this.getStageFromProgress(data.progress)
              });
            }
            break;

          case 'complete':
            this.worker?.removeEventListener('message', handleMessage);
            resolve(data.blob);
            break;

          case 'error':
            this.worker?.removeEventListener('message', handleMessage);
            reject(new Error(data));
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({
        type: 'compress',
        videoBlob,
        settings
      });
    });
  }

  private handleWorkerMessage() {
    // This is handled in performCompression
  }

  private getStageFromProgress(progress: number): string {
    if (progress < 25) return 'Analyzing video';
    if (progress < 50) return 'Optimizing frames';
    if (progress < 75) return 'Compressing audio';
    if (progress < 100) return 'Finalizing';
    return 'Complete';
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isCompressing = false;
    this.progressCallback = undefined;
  }

  private getWorkerCode(): string {
    return `
      // Inline Web Worker code for compression
      self.onmessage = async (event) => {
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

      async function compressVideo(videoBlob, settings) {
        try {
          // Send progress updates
          postMessage({ type: 'progress', data: { progress: 0 } });
          
          // Simulate analysis phase
          await new Promise(resolve => setTimeout(resolve, 200));
          postMessage({ type: 'progress', data: { progress: 25 } });
          
          // Simulate optimization
          await new Promise(resolve => setTimeout(resolve, 300));
          postMessage({ type: 'progress', data: { progress: 50 } });
          
          // Simulate compression
          await new Promise(resolve => setTimeout(resolve, 400));
          postMessage({ type: 'progress', data: { progress: 75 } });
          
          // Finalize
          await new Promise(resolve => setTimeout(resolve, 200));
          postMessage({ type: 'progress', data: { progress: 100 } });
          
          // For now, return original blob (in real implementation, this would be compressed)
          postMessage({ type: 'complete', data: { blob: videoBlob } });
        } catch (error) {
          postMessage({
            type: 'error',
            data: error instanceof Error ? error.message : 'Unknown compression error'
          });
        }
      }
    `;
  }
}

// Singleton instance
let compressionEngine: CompressionEngine | null = null;

export function getCompressionEngine(): CompressionEngine {
  if (!compressionEngine) {
    compressionEngine = new CompressionEngine();
  }
  return compressionEngine;
}
