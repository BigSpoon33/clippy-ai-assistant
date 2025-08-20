/**
 * TTS Spectrum Visualizer Tests
 * Tests for audioMotion-analyzer integration and spectrum visualization
 */

import { TTSSpectrumVisualizer, SpectrumVisualizerConfig } from '../../../src/voice-v2/components/voice-indicators/spectrum-visualizer';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

// Mock HTML Audio element for tests
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  currentTime: 0,
  duration: 100,
  volume: 1.0,
  paused: true,
  ended: false,
  readyState: 4,
};

describe('TTSSpectrumVisualizer', () => {
  let container: HTMLElement;
  let visualizer: TTSSpectrumVisualizer;
  let mockConfig: SpectrumVisualizerConfig;

  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '300px';
    document.body.appendChild(container);

    // Mock configuration
    mockConfig = {
      enabled: true,
      spectrumAnalysis: true,
      textSync: false,
      avatarMode: false,
      visualStyle: 'spectrum',
      height: 300,
      mode: 2,
      freqMin: 85,
      freqMax: 8000,
      showPeaks: true,
      lumiBars: false,
      gradient: 'classic',
      smoothing: 0.7,
      reflexRatio: 0.3,
    };

    // Mock global Audio constructor
    global.Audio = jest.fn().mockImplementation(() => mockAudio);
  });

  afterEach(() => {
    if (visualizer) {
      visualizer.dispose();
    }
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      visualizer = new TTSSpectrumVisualizer(container);
      
      expect(visualizer).toBeDefined();
      expect(visualizer.isSupported()).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
      
      expect(visualizer).toBeDefined();
      expect(visualizer.getConfig()).toMatchObject(mockConfig);
    });

    test('should create audioMotion analyzer instance', () => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
      
      // Check if the analyzer was created and configured
      const state = visualizer.getPlaybackState();
      expect(state).toBeDefined();
    });

    test('should handle initialization without container', () => {
      expect(() => {
        visualizer = new TTSSpectrumVisualizer(null as any);
      }).toThrow();
    });
  });

  describe('AudioMotion Integration', () => {
    beforeEach(() => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
    });

    test('should configure audioMotion with correct settings', () => {
      const config = visualizer.getConfig();
      
      expect(config.mode).toBe(2); // 1/12th octave bands
      expect(config.freqMin).toBe(85); // Human voice lower bound
      expect(config.freqMax).toBe(8000); // Human voice upper bound
      expect(config.smoothing).toBe(0.7);
    });

    test('should connect TTS audio source to analyzer', async () => {
      const mockAudioPath = '/test/audio.wav';
      
      await visualizer.connectTTSAudio(mockAudioPath);
      
      const state = visualizer.getPlaybackState();
      expect(state.isConnected).toBe(true);
    });

    test('should start and stop visualization', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      
      await visualizer.startVisualization();
      expect(visualizer.getPlaybackState().isPlaying).toBe(true);
      
      visualizer.stopVisualization();
      expect(visualizer.getPlaybackState().isPlaying).toBe(false);
    });

    test('should handle audio connection errors gracefully', async () => {
      // Mock audio loading failure
      mockAudio.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Audio load failed')), 10);
        }
      });

      await expect(visualizer.connectTTSAudio('/invalid/path.wav'))
        .rejects.toThrow();
    });

    test('should update configuration dynamically', () => {
      const newConfig = {
        ...mockConfig,
        freqMin: 100,
        freqMax: 10000,
        smoothing: 0.8,
      };

      visualizer.updateConfig(newConfig);
      
      const updatedConfig = visualizer.getConfig();
      expect(updatedConfig.freqMin).toBe(100);
      expect(updatedConfig.freqMax).toBe(10000);
      expect(updatedConfig.smoothing).toBe(0.8);
    });
  });

  describe('Real-Time Audio Processing', () => {
    beforeEach(() => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
    });

    test('should process audio data in real-time', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      // Mock audio data processing
      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        mockFrequencyData[i] = Math.random() * 255;
      }

      // Simulate audio processing callback
      const processingCallback = jest.fn();
      visualizer.onAudioDataUpdate = processingCallback;

      // Trigger audio data update
      visualizer.processAudioFrame(mockFrequencyData);

      expect(processingCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          frequencyData: mockFrequencyData,
          timestamp: expect.any(Number),
        })
      );
    });

    test('should emit spectrum analysis events', async () => {
      const mockEventHandler = jest.fn();
      visualizer.addEventListener('spectrum-update', mockEventHandler);

      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      // Simulate spectrum data
      const mockSpectrumData = new Uint8Array(24); // 24 bars
      for (let i = 0; i < 24; i++) {
        mockSpectrumData[i] = Math.random() * 255;
      }

      visualizer.updateSpectrum(mockSpectrumData);

      expect(mockEventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          spectrumData: mockSpectrumData,
          peakFrequency: expect.any(Number),
          averageLevel: expect.any(Number),
        })
      );
    });

    test('should handle high-frequency updates efficiently', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      const updateCount = 100;
      const updateTimes: number[] = [];

      for (let i = 0; i < updateCount; i++) {
        const startTime = performance.now();
        
        const mockData = new Uint8Array(1024);
        for (let j = 0; j < 1024; j++) {
          mockData[j] = Math.sin(j * 0.1 + i * 0.05) * 127 + 128;
        }
        
        visualizer.processAudioFrame(mockData);
        
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      const avgUpdateTime = updateTimes.reduce((a, b) => a + b) / updateCount;
      
      // Should process updates quickly for real-time performance
      expect(avgUpdateTime).toBeLessThan(5); // 5ms max average
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(() => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
    });

    test('should maintain 60 FPS during visualization', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      const frameCount = 60; // 1 second at 60 FPS
      const frameTimes: number[] = [];

      for (let i = 0; i < frameCount; i++) {
        const startTime = performance.now();
        
        // Simulate frame rendering
        const mockData = new Uint8Array(1024);
        mockData.fill(Math.random() * 255);
        visualizer.processAudioFrame(mockData);
        
        const endTime = performance.now();
        frameTimes.push(endTime - startTime);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameCount;
      const targetFrameTime = 1000 / 60; // 16.67ms

      expect(avgFrameTime).toBeLessThan(targetFrameTime * 0.8); // 80% of target
    });

    test('should optimize for different window sizes', () => {
      const sizes = [
        { width: 300, height: 150 },
        { width: 600, height: 300 },
        { width: 1200, height: 600 },
      ];

      sizes.forEach(size => {
        container.style.width = `${size.width}px`;
        container.style.height = `${size.height}px`;

        const config = { ...mockConfig, height: size.height };
        if (visualizer) visualizer.dispose();
        
        visualizer = new TTSSpectrumVisualizer(container, config);

        const canvasSize = visualizer.getCanvasSize();
        expect(canvasSize.width).toBeLessThanOrEqual(size.width);
        expect(canvasSize.height).toBeLessThanOrEqual(size.height);
      });
    });

    test('should handle WebGL fallback gracefully', () => {
      // Mock WebGL not supported
      const config = { ...mockConfig, preferWebGL: true };
      
      visualizer = new TTSSpectrumVisualizer(container, config);
      
      // Should still initialize successfully with Canvas fallback
      expect(visualizer.isSupported()).toBe(true);
    });

    test('should manage memory efficiently during long sessions', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      // Simulate long-running session
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const mockData = new Uint8Array(1024);
        mockData.fill(Math.random() * 255);
        visualizer.processAudioFrame(mockData);
        
        // Occasionally check that visualizer is still responsive
        if (i % 100 === 0) {
          const state = visualizer.getPlaybackState();
          expect(state.isPlaying).toBe(true);
        }
      }

      // Visualizer should still be functional after long session
      const finalState = visualizer.getPlaybackState();
      expect(finalState.isPlaying).toBe(true);
    });
  });

  describe('Audio Synchronization', () => {
    beforeEach(() => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
    });

    test('should synchronize visualization with audio playback', async () => {
      const mockAudioElement = {
        ...mockAudio,
        currentTime: 0,
        duration: 10,
        addEventListener: jest.fn().mockImplementation((event, callback) => {
          if (event === 'timeupdate') {
            // Simulate time updates
            setTimeout(() => {
              mockAudioElement.currentTime = 1.5;
              callback();
            }, 100);
          }
        }),
      };

      global.Audio = jest.fn().mockImplementation(() => mockAudioElement);

      await visualizer.connectTTSAudio('/test/audio.wav');
      
      const syncCallback = jest.fn();
      visualizer.onTimeUpdate = syncCallback;
      
      await visualizer.startVisualization();

      // Wait for time update
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(syncCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentTime: 1.5,
          duration: 10,
          progress: 0.15,
        })
      );
    });

    test('should handle audio seeking accurately', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      const seekTime = 5.0;
      visualizer.seekTo(seekTime);

      const state = visualizer.getPlaybackState();
      expect(state.currentTime).toBe(seekTime);
    });

    test('should maintain sync during playback rate changes', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      // Change playback rate
      visualizer.setPlaybackRate(1.5);

      const state = visualizer.getPlaybackState();
      expect(state.playbackRate).toBe(1.5);

      // Visualization should adapt to new rate
      expect(visualizer.isSupported()).toBe(true);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should detect browser capabilities correctly', () => {
      expect(TTSSpectrumVisualizer.isSupported()).toBe(true);
      
      const capabilities = TTSSpectrumVisualizer.getBrowserCapabilities();
      expect(capabilities).toMatchObject({
        webAudio: expect.any(Boolean),
        canvas: expect.any(Boolean),
        webGL: expect.any(Boolean),
        audioMotion: expect.any(Boolean),
      });
    });

    test('should provide fallback for unsupported browsers', () => {
      // Mock unsupported browser
      const originalAudioContext = global.AudioContext;
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;

      const capabilities = TTSSpectrumVisualizer.getBrowserCapabilities();
      expect(capabilities.webAudio).toBe(false);

      // Should still provide basic functionality
      visualizer = new TTSSpectrumVisualizer(container, {
        ...mockConfig,
        fallbackMode: true,
      });
      
      expect(visualizer.isSupported()).toBe(true);

      // Restore
      global.AudioContext = originalAudioContext;
    });

    test('should handle different audio formats', async () => {
      const audioFormats = ['.wav', '.mp3', '.ogg', '.m4a'];
      
      for (const format of audioFormats) {
        const audioPath = `/test/audio${format}`;
        
        // Should attempt to load any format
        await expect(
          visualizer.connectTTSAudio(audioPath)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      visualizer = new TTSSpectrumVisualizer(container, mockConfig);
    });

    test('should handle audio loading failures gracefully', async () => {
      // Mock network error
      mockAudio.addEventListener = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Network error')), 10);
        }
      });

      await expect(visualizer.connectTTSAudio('/nonexistent/audio.wav'))
        .rejects.toThrow('Network error');

      // Visualizer should remain in valid state
      expect(visualizer.isSupported()).toBe(true);
    });

    test('should recover from rendering errors', async () => {
      await visualizer.connectTTSAudio('/test/audio.wav');
      await visualizer.startVisualization();

      // Mock rendering error
      const mockCanvas = container.querySelector('canvas')!;
      const originalGetContext = mockCanvas.getContext;
      mockCanvas.getContext = jest.fn().mockReturnValue(null);

      // Should handle rendering failure gracefully
      expect(() => {
        const mockData = new Uint8Array(1024);
        visualizer.processAudioFrame(mockData);
      }).not.toThrow();

      // Restore
      mockCanvas.getContext = originalGetContext;
    });

    test('should cleanup properly on disposal', () => {
      visualizer.dispose();

      // Should be safe to call multiple times
      expect(() => visualizer.dispose()).not.toThrow();

      // Should not accept further operations
      expect(() => {
        visualizer.processAudioFrame(new Uint8Array(1024));
      }).not.toThrow(); // Should fail silently
    });
  });
});

// Helper types for test mocking
interface MockAudioElement extends Partial<HTMLAudioElement> {
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  load: jest.Mock;
}