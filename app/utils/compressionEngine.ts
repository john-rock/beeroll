import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
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
  private ffmpeg: FFmpeg | null = null;
  private isCompressing = false;
  private progressCallback?: (progress: CompressionProgress) => void;
  private isInitialized = false;

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
      // Initialize FFmpeg if not already done
      if (!this.isInitialized) {
        await this.initializeFFmpeg();
      }

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
      this.isCompressing = false;
    }
  }

  getProgress(): number {
    // This would be updated by FFmpeg progress events
    return 0;
  }

  // Public status methods
  isRunning(): boolean {
    return this.isCompressing;
  }

  isReady(): boolean {
    return this.isInitialized && this.ffmpeg !== null;
  }

  getStatus(): {
    isRunning: boolean;
    isReady: boolean;
    isInitialized: boolean;
    hasFFmpeg: boolean;
  } {
    return {
      isRunning: this.isCompressing,
      isReady: this.isInitialized && this.ffmpeg !== null,
      isInitialized: this.isInitialized,
      hasFFmpeg: this.ffmpeg !== null
    };
  }

  cancel(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
    }
    this.isCompressing = false;
    this.isInitialized = false;
  }

  private async initializeFFmpeg(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.progressCallback?.({
        progress: 0,
        stage: 'Initializing FFmpeg...'
      });

      // Check browser compatibility
      if (!this.checkBrowserCompatibility()) {
        throw new Error('Browser does not support required features for FFmpeg.wasm');
      }

      console.log('Creating FFmpeg instance...');
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg core - using a more stable version
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
      console.log('Loading FFmpeg core from:', baseURL);
      
      try {
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        
        console.log('FFmpeg URLs created, loading core...');
        await this.ffmpeg.load({
          coreURL,
          wasmURL,
        });
      } catch (loadError) {
        console.error('Failed to load FFmpeg core:', loadError);
        throw new Error(`Failed to load FFmpeg core: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
      }

      this.isInitialized = true;
      console.log('FFmpeg initialized successfully');
      
      // Test FFmpeg functionality
      try {
        console.log('Testing FFmpeg functionality...');
        await this.ffmpeg.exec(['-version']);
        console.log('FFmpeg version test passed');
      } catch (testError) {
        console.warn('FFmpeg version test failed, but continuing:', testError);
      }
      
      this.progressCallback?.({
        progress: 10,
        stage: 'FFmpeg ready'
      });
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      if (error instanceof Error) {
        throw new Error(`FFmpeg initialization failed: ${error.message}`);
      } else {
        throw new Error(`FFmpeg initialization failed: ${String(error)}`);
      }
    }
  }

  private async performCompression(videoBlob: Blob, settings: CompressionSettings): Promise<Blob> {
    if (!this.ffmpeg || !this.isInitialized) {
      throw new Error('FFmpeg not initialized');
    }

    try {
      // Write input file
      this.progressCallback?.({
        progress: 15,
        stage: 'Preparing video for compression...'
      });

      // Determine input format and codecs from blob type
      const inputFormat = videoBlob.type.includes('webm') ? 'webm' : 'mp4';
      const inputFileName = `input.${inputFormat}`;
      const outputFileName = `output.${inputFormat}`;
      
      // Check if input has VP9/Opus codecs (which are already well-compressed)
      const hasVP9 = videoBlob.type.includes('vp9');
      const hasOpus = videoBlob.type.includes('opus');
      
      console.log('Input video format:', inputFormat, 'Size:', videoBlob.size, 'Type:', videoBlob.type);
      console.log('Codecs detected - VP9:', hasVP9, 'Opus:', hasOpus);
      
      try {
        const videoData = await fetchFile(videoBlob);
        console.log('Video data fetched, size:', videoData.byteLength);
        await this.ffmpeg.writeFile(inputFileName, videoData);
        console.log('Input file written successfully');
      } catch (writeError) {
        console.error('Failed to write input file:', writeError);
        throw new Error(`Failed to write input file: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
      }

      // Determine compression strategy based on input codecs
      let compressionArgs: string[];
      let compressionStrategy: string;
      
      if (hasVP9 && hasOpus) {
        // Input is already VP9/Opus - use copy mode for fast processing
        compressionStrategy = 'copy-mode';
        compressionArgs = [
          '-c:v', 'copy',              // Copy video stream without re-encoding
          '-c:a', 'copy',              // Copy audio stream without re-encoding
          '-movflags', '+faststart'     // Optimize for web playback
        ];
        console.log('Using copy mode for VP9/Opus input (fast processing)');
      } else {
        // Input needs transcoding - use quality-based compression
        compressionStrategy = 'transcode-mode';
        compressionArgs = this.getCompressionArgs(settings);
        console.log('Using transcode mode for compression');
      }

      this.progressCallback?.({
        progress: 25,
        stage: compressionStrategy === 'copy-mode' ? 'Optimizing video structure...' : 'Starting video compression...'
      });

      // Execute FFmpeg command with timeout and progress monitoring
      const ffmpegArgs = ['-i', inputFileName, ...compressionArgs, '-y', outputFileName];
      console.log('Executing FFmpeg command:', ffmpegArgs);
      
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('FFmpeg execution timed out after 30 seconds')), 30000);
        });
        
        // Add progress monitoring
        const progressInterval = setInterval(() => {
          this.progressCallback?.({
            progress: Math.min(90, 25 + Math.random() * 65), // Simulate progress
            stage: compressionStrategy === 'copy-mode' ? 'Optimizing video structure...' : 'Processing video...'
          });
        }, 1000);
        
        const execPromise = this.ffmpeg.exec(ffmpegArgs);
        
        await Promise.race([execPromise, timeoutPromise]);
        clearInterval(progressInterval);
        console.log('FFmpeg command executed successfully');
      } catch (execError) {
        console.error('FFmpeg execution failed:', execError);
        
        if (compressionStrategy === 'copy-mode') {
          // If copy mode fails, try basic transcoding
          console.log('Copy mode failed, trying basic transcoding...');
          try {
            const basicArgs = [
              '-i', inputFileName,
              '-c:v', 'libvpx',
              '-b:v', '1M',
              '-c:a', 'libvorbis',
              '-b:a', '96k',
              '-y', outputFileName
            ];
            
            console.log('Trying basic transcoding:', basicArgs);
            await this.ffmpeg.exec(basicArgs);
            console.log('Basic transcoding successful');
          } catch (basicError) {
            console.error('Basic transcoding also failed:', basicError);
            throw new Error(`All compression methods failed: ${execError instanceof Error ? execError.message : String(execError)}`);
          }
        } else {
          // If all FFmpeg methods fail, return original video with warning
          console.warn('All FFmpeg compression methods failed, returning original video');
          this.progressCallback?.({
            progress: 100,
            stage: 'Compression failed, using original video'
          });
          
          // Return original video as-is
          return videoBlob;
        }
      }

      // If we get here, FFmpeg succeeded, so read the output file
      this.progressCallback?.({
        progress: 90,
        stage: 'Finalizing compressed video...'
      });

      // Read output file
      const data = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      this.progressCallback?.({
        progress: 100,
        stage: 'Compression complete!'
      });

      // Convert to Blob - handle different return types from readFile
      let blobData: Uint8Array;
      if (data instanceof Uint8Array) {
        // Ensure we have a standard Uint8Array
        blobData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      } else if (typeof data === 'string') {
        // If data is a string, convert to Uint8Array
        const encoder = new TextEncoder();
        blobData = encoder.encode(data);
      } else {
        // Fallback: try to convert to Uint8Array
        blobData = new Uint8Array(data as ArrayBuffer);
      }
      
      // Cast to BlobPart to bypass the strict typing issue with SharedArrayBuffer
      return new Blob([blobData as BlobPart], { type: 'video/webm' });
    } catch (error) {
      console.error('Compression failed:', error);
      if (error instanceof Error) {
        throw new Error(`Video compression failed: ${error.message}`);
      } else {
        throw new Error(`Video compression failed: ${String(error)}`);
      }
    }
  }

  private getCompressionArgs(settings: CompressionSettings): string[] {
    const { quality } = settings;
    
    // Define compression presets based on quality
    // Using more basic, widely-supported codecs for better compatibility
    const presets = {
      'high': [
        '-c:v', 'libvpx',          // VP8 codec (more widely supported than VP9)
        '-crf', '10',              // Constant Rate Factor (lower = higher quality)
        '-b:v', '2M',              // Target bitrate
        '-c:a', 'libvorbis',       // Vorbis audio codec (more compatible)
        '-b:a', '128k',            // Audio bitrate
        '-deadline', 'good'        // Encoding deadline
      ],
      'balanced': [
        '-c:v', 'libvpx',
        '-crf', '20',              // Slightly lower quality for better compression
        '-b:v', '1M',              // Lower target bitrate
        '-c:a', 'libvorbis',
        '-b:a', '96k',             // Lower audio bitrate
        '-deadline', 'good'
      ],
      'compressed': [
        '-c:v', 'libvpx',
        '-crf', '30',              // Lower quality for maximum compression
        '-b:v', '500k',            // Much lower target bitrate
        '-c:a', 'libvorbis',
        '-b:a', '64k',             // Minimal audio bitrate
        '-deadline', 'realtime'    // Faster encoding
      ]
    };

    return presets[quality] || presets.balanced;
  }

  private checkBrowserCompatibility(): boolean {
    // Check for SharedArrayBuffer support (required for FFmpeg.wasm)
    if (typeof SharedArrayBuffer === 'undefined') {
      console.error('SharedArrayBuffer not supported');
      return false;
    }

    // Check for WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      console.error('WebAssembly not supported');
      return false;
    }

    // Check for fetch API
    if (typeof fetch === 'undefined') {
      console.error('Fetch API not supported');
      return false;
    }

    return true;
  }

  private cleanup(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
    }
    this.isCompressing = false;
    this.isInitialized = false;
    this.progressCallback = undefined;
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
