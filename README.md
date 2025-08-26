# 🎥 Beeroll - Local-First Screen Recording

A modern, privacy-focused screen recording application built with Next.js and TypeScript. Record your screen locally without any cloud uploads or data collection.

## ✨ Features

- **🔒 Privacy First**: All processing happens locally on your device
- **🎬 High Quality**: Multiple quality presets with FFmpeg compression
- **🎵 Audio Support**: Record system audio and microphone simultaneously
- **⌨️ Keyboard Shortcuts**: Quick start recording with the 'R' key
- **🌙 Dark Mode**: Beautiful dark/light theme support
- **📱 Responsive**: Works on desktop and tablet devices
- **♿ Accessible**: Built with accessibility best practices

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- Modern browser with MediaRecorder API support
- FFmpeg.wasm for video compression

### Installation

```bash
# Clone the repository
git clone https://github.com/john-rock/beeroll.git
cd beeroll

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## 🏗️ Architecture

### Core Components

The application is built with a modular component architecture:

#### `ScreenRecorder` - Main Application Component
The primary component that orchestrates the entire recording workflow.

**Features:**
- Recording state management
- Quality preset selection
- Audio configuration
- Compression settings
- Error handling and recovery

**Usage:**
```tsx
import { ScreenRecorder } from './components/ScreenRecorder';

export default function App() {
  return <ScreenRecorder />;
}
```

#### `AudioControls` - Audio Configuration
Manages audio source selection and device detection.

**Features:**
- System audio toggle
- Microphone device selection
- Real-time device availability checking
- Error handling for device access

**Usage:**
```tsx
import { AudioControls } from './components/AudioControls';

<AudioControls
  audioOptions={audioOptions}
  onAudioOptionsChange={setAudioOptions}
  disabled={false}
/>
```

#### `RecordingPreview` - Video Playback
Displays recorded video with playback controls and actions.

**Features:**
- Video preview with custom controls
- File information display
- Download, re-record, and delete actions
- Error handling for video loading

**Usage:**
```tsx
import { RecordingPreview } from './components/RecordingPreview';

<RecordingPreview
  videoBlob={videoBlob}
  duration={120}
  onDownload={handleDownload}
  onDelete={handleDelete}
  onRerecord={handleRerecord}
/>
```

#### `RecordingStatus` - Live Status Display
Shows current recording status and duration.

**Features:**
- Visual recording indicator with animations
- Duration timer display
- Pause/recording state differentiation
- Progress bar visualization

**Usage:**
```tsx
import { RecordingStatus } from './components/RecordingStatus';

<RecordingStatus
  isRecording={true}
  isPaused={false}
  duration={65}
/>
```

#### `ErrorDisplay` - Error Handling
Displays errors with appropriate styling and recovery actions.

**Features:**
- Contextual error icons based on error type
- Color-coded error styling
- Retry functionality for recoverable errors
- Dismissible error messages

**Usage:**
```tsx
import { ErrorDisplay } from './components/ErrorDisplay';

<ErrorDisplay
  error={recordingError}
  onRetry={handleRetry}
  onDismiss={clearError}
/>
```

#### `ThemeToggle` - Theme Switching
Provides theme switching functionality.

**Features:**
- Visual theme indicator
- Keyboard navigation support
- Accessible button labeling
- Smooth transitions and animations

**Usage:**
```tsx
import { ThemeToggle } from './components/ThemeToggle';

<ThemeToggle />
```

### Hooks

The application includes custom React hooks for managing complex functionality:

#### **`useScreenRecording`** - Screen Recording Management
Comprehensive hook for managing screen recording functionality.

**Features:**
- Screen capture with quality presets
- Audio mixing (system + microphone)
- Pause/resume functionality
- Automatic cleanup and error handling
- Timer management and status tracking
- Mute controls and audio level management

**Usage:**
```tsx
import { useScreenRecording } from './hooks/useScreenRecording';

const {
  recordingState,
  duration,
  error,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording
} = useScreenRecording({
  onError: (error) => console.error('Recording error:', error),
  onStateChange: (state) => console.log('State changed to:', state)
});

// Start recording
await startRecording({
  audio: { system: true, microphone: true },
  video: true,
  quality: 'balanced'
});
```

#### **`useKeyboardShortcuts`** - Keyboard Shortcut Management
Advanced hook for managing keyboard shortcuts with priority handling.

**Features:**
- Multiple shortcut support with priority handling
- Form field detection and shortcut suppression
- Configurable modifier key combinations
- Debug logging and accessibility support
- Custom event target support
- Performance optimized with useCallback
- **SSR Compatible** - Safe for server-side rendering

**Usage:**
```tsx
import { useKeyboardShortcuts, useKeyboardShortcut } from './hooks/useKeyboardShortcuts';

// Single shortcut
useKeyboardShortcut('r', () => startRecording(), {
  enabled: !isRecording,
  description: 'Start recording',
  priority: 1
});

// Multiple shortcuts
useKeyboardShortcuts([
  {
    key: 'r',
    description: 'Start recording',
    callback: () => startRecording(),
    enabled: !isRecording
  },
  {
    key: 'Escape',
    description: 'Stop recording',
    callback: () => stopRecording(),
    enabled: isRecording
  }
], {
  debug: true,
  ignoreFormFields: true
});
```

### Utilities

The application includes several utility modules for common functionality:

#### **`audioDevices.ts`** - Audio Device Management
Comprehensive audio device detection and management utilities.

**Features:**
- Microphone device enumeration
- Audio stream mixing for screen + microphone recording
- Browser compatibility checking
- Permission handling and error recovery

**Usage:**
```typescript
import { getAudioInputDevices, testMicrophoneAccess } from './utils/audioDevices';

// Get available microphones
const devices = await getAudioInputDevices();

// Test microphone access
const hasAccess = await testMicrophoneAccess();
```

#### **`compressionEngine.ts`** - Video Compression
FFmpeg-based video compression engine for local video processing.

**Features:**
- Hardware-accelerated video compression
- Multiple quality presets
- Progress monitoring and cancellation
- Fallback compression strategies
- Browser compatibility checking

**Usage:**
```typescript
import { getCompressionEngine } from './utils/compressionEngine';

const engine = getCompressionEngine();
const result = await engine.compress(videoBlob, { quality: 'balanced' });
```

#### **`errorHandling.ts`** - Error Management
Comprehensive error handling system for recording operations.

**Features:**
- Error classification and categorization
- User-friendly error messages
- Recovery suggestions
- Browser compatibility checking
- Detailed error context

**Usage:**
```typescript
import { RecordingErrorHandler } from './utils/errorHandling';

try {
  await startRecording();
} catch (error) {
  const recordingError = RecordingErrorHandler.handleError(error);
  console.error('Recording failed:', recordingError.message);
}
```

#### **`fileDownload.ts`** - File Operations
File download and formatting utilities for screen recordings.

**Features:**
- Secure blob downloads
- Duration formatting
- File size formatting
- Automatic filename generation
- Error handling and validation

**Usage:**
```typescript
import { downloadBlob, formatDuration, generateFilename } from './utils/fileDownload';

// Download recording
downloadBlob(videoBlob, 'recording.webm');

// Format duration
const duration = formatDuration(65000); // "01:05"

// Generate filename
const filename = generateFilename('video/webm');
```

#### **`qualitySettings.ts`** - Quality Management
Quality presets and configuration management for video recording.

**Features:**
- Multiple quality presets (high, balanced, compressed)
- Local storage persistence
- Device capability recommendations
- Validation and error handling

**Usage:**
```typescript
import { getQualityConfig, saveQualityPreset } from './utils/qualitySettings';

// Get quality configuration
const config = getQualityConfig('balanced');

// Save user preference
saveQualityPreset('high');
```

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (#4F46E5)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale with dark mode support

### Typography
- **Headings**: Inter font family
- **Body**: System font stack
- **Monospace**: For timers and technical information

### Spacing
- Consistent 4px base unit system
- Responsive spacing using Tailwind CSS utilities

## ♿ Accessibility Features

- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Clear focus indicators
- **Semantic HTML**: Proper heading structure and landmarks
- **Color Contrast**: WCAG AA compliant color combinations
- **Screen Reader**: Optimized for screen reader users

## 🧪 Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when implemented)
npm test
```

## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing component patterns
- Add JSDoc documentation for all components
- Ensure accessibility compliance
- Use semantic HTML elements
- Follow the established naming conventions

### Component Guidelines

When creating or modifying components:

1. **Documentation**: Add comprehensive JSDoc comments
2. **Accessibility**: Include proper ARIA labels and roles
3. **Performance**: Use `useCallback` and `useMemo` appropriately
4. **Error Handling**: Implement proper error boundaries
5. **Testing**: Add unit tests for complex logic
6. **Responsive**: Ensure mobile-friendly design

## 📄 License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ **Free to use** for any purpose (personal, commercial, educational)
- ✅ **Free to modify** and distribute
- ✅ **Free to sell** and monetize
- ✅ **Patent protection** included
- ✅ **Very permissive** - business-friendly

The Apache 2.0 license is one of the most permissive open source licenses, making it perfect for both community collaboration and commercial adoption.

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/john-rock/beeroll/issues)
- **Discussions**: [GitHub Discussions](https://github.com/john-rock/beeroll/discussions)

## 🙏 Acknowledgments

- [FFmpeg.wasm](https://ffmpegwasm.net/) for video compression
- [Lucide React](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Next.js](https://nextjs.org/) for the React framework

## 📊 Project Status

- **Version**: 0.1.0
- **Status**: Active Development
- **Browser Support**: Chrome 80+, Firefox 75+, Safari 14+
- **Node.js**: 20.0.0+

---
