/**
 * VAD Engine Tests
 * Tests for Voice Activity Detection accuracy and performance
 */

import { VADEngine, VADResult, VADAlgorithm, VADConfig } from '../../../src/voice/utils/vad-engine';

describe('VADEngine', () => {
  let vadEngine: VADEngine;
  let mockConfig: VADConfig;

  beforeEach(() => {
    mockConfig = {
      algorithm: VADAlgorithm.ENERGY_BASED,
      energyThreshold: 0.01,
      zeroCrossingThreshold: 0.3,
      spectralCentroidThreshold: 2000,
      minSpeechFrames: 3,
      minSilenceFrames: 5,
      smoothingFactor: 0.8
    };

    vadEngine = new VADEngine(mockConfig);
  });

  afterEach(() => {
    vadEngine.dispose();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const defaultEngine = new VADEngine();
      expect(defaultEngine).toBeDefined();
      defaultEngine.dispose();
    });

    test('should initialize with custom config', () => {
      expect(vadEngine).toBeDefined();
      expect(vadEngine.getConfig()).toEqual(mockConfig);
    });

    test('should validate config parameters', () => {
      const invalidConfig = { 
        ...mockConfig, 
        energyThreshold: -1 // Invalid threshold
      };
      
      expect(() => new VADEngine(invalidConfig)).toThrow();
    });
  });

  describe('Energy-Based VAD Algorithm', () => {
    beforeEach(() => {
      vadEngine.updateConfig({ algorithm: VADAlgorithm.ENERGY_BASED });
    });

    test('should detect silence with low energy audio', () => {
      // Create mock audio data with low energy (silence)
      const silentAudio = createMockAudioData(1024, 0.001); // Very low amplitude
      const result = vadEngine.processAudioFrame(
        silentAudio.frequencyData,
        silentAudio.timeData,
        silentAudio.volumeLevel
      );

      expect(result.vadState).toBe('silent');
      expect(result.confidence).toBeGreaterThan(0.7); // High confidence in silence
    });

    test('should detect speech with high energy audio', () => {
      // Create mock audio data with speech-like characteristics
      const speechAudio = createMockSpeechAudioData(1024);
      const result = vadEngine.processAudioFrame(
        speechAudio.frequencyData,
        speechAudio.timeData,
        speechAudio.volumeLevel
      );

      expect(result.vadState).toBe('speech');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should detect noise with random high energy', () => {
      // Create mock audio data with noise characteristics
      const noiseAudio = createMockNoiseAudioData(1024);
      const result = vadEngine.processAudioFrame(
        noiseAudio.frequencyData,
        noiseAudio.timeData,
        noiseAudio.volumeLevel
      );

      expect(['noise', 'speech']).toContain(result.vadState);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Spectral VAD Algorithm', () => {
    beforeEach(() => {
      vadEngine.updateConfig({ algorithm: VADAlgorithm.SPECTRAL });
    });

    test('should analyze spectral characteristics for speech detection', () => {
      const speechAudio = createMockSpeechAudioData(1024);
      const result = vadEngine.processAudioFrame(
        speechAudio.frequencyData,
        speechAudio.timeData,
        speechAudio.volumeLevel
      );

      expect(result).toHaveProperty('spectralCentroid');
      expect(result).toHaveProperty('spectralRolloff');
      expect(typeof result.spectralCentroid).toBe('number');
      expect(typeof result.spectralRolloff).toBe('number');
    });

    test('should distinguish speech from noise using spectral features', () => {
      const speechAudio = createMockSpeechAudioData(1024);
      const noiseAudio = createMockNoiseAudioData(1024);

      const speechResult = vadEngine.processAudioFrame(
        speechAudio.frequencyData,
        speechAudio.timeData,
        speechAudio.volumeLevel
      );

      const noiseResult = vadEngine.processAudioFrame(
        noiseAudio.frequencyData,
        noiseAudio.timeData,
        noiseAudio.volumeLevel
      );

      // Speech should have different spectral characteristics than noise
      expect(speechResult.spectralCentroid).not.toEqual(noiseResult.spectralCentroid);
    });
  });

  describe('Temporal Smoothing', () => {
    test('should smooth decisions over time', () => {
      const silentAudio = createMockAudioData(1024, 0.001);
      const speechAudio = createMockSpeechAudioData(1024);

      // Process several silent frames
      for (let i = 0; i < 10; i++) {
        vadEngine.processAudioFrame(
          silentAudio.frequencyData,
          silentAudio.timeData,
          silentAudio.volumeLevel
        );
      }

      // Process one speech frame
      const result = vadEngine.processAudioFrame(
        speechAudio.frequencyData,
        speechAudio.timeData,
        speechAudio.volumeLevel
      );

      // Should not immediately switch to speech due to smoothing
      // (depends on minSpeechFrames setting)
      expect(result.confidence).toBeLessThan(1.0);
    });

    test('should require minimum frames for state changes', () => {
      vadEngine.updateConfig({ minSpeechFrames: 5 });
      
      const speechAudio = createMockSpeechAudioData(1024);
      let result: VADResult;

      // Process frames one by one
      for (let i = 0; i < 3; i++) {
        result = vadEngine.processAudioFrame(
          speechAudio.frequencyData,
          speechAudio.timeData,
          speechAudio.volumeLevel
        );
      }

      // Should not be confident about speech yet
      expect(result!.confidence).toBeLessThan(0.9);

      // Process remaining frames
      for (let i = 0; i < 3; i++) {
        result = vadEngine.processAudioFrame(
          speechAudio.frequencyData,
          speechAudio.timeData,
          speechAudio.volumeLevel
        );
      }

      // Now should be more confident
      expect(result!.vadState).toBe('speech');
    });
  });

  describe('Performance Metrics', () => {
    test('should provide processing time statistics', () => {
      const speechAudio = createMockSpeechAudioData(1024);
      
      const startTime = performance.now();
      const result = vadEngine.processAudioFrame(
        speechAudio.frequencyData,
        speechAudio.timeData,
        speechAudio.volumeLevel
      );
      const endTime = performance.now();

      expect(result).toHaveProperty('processingTime');
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(endTime - startTime + 1); // Some tolerance
    });

    test('should handle high frequency processing', () => {
      const speechAudio = createMockSpeechAudioData(1024);
      const iterations = 100;
      const processingTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = vadEngine.processAudioFrame(
          speechAudio.frequencyData,
          speechAudio.timeData,
          speechAudio.volumeLevel
        );
        processingTimes.push(result.processingTime);
      }

      const avgProcessingTime = processingTimes.reduce((a, b) => a + b) / iterations;
      
      // Should process quickly (under 5ms on average for real-time performance)
      expect(avgProcessingTime).toBeLessThan(5);
    });

    test('should maintain accuracy under continuous processing', () => {
      const iterations = 50;
      let speechCorrect = 0;
      let silenceCorrect = 0;

      // Test speech detection
      for (let i = 0; i < iterations; i++) {
        const speechAudio = createMockSpeechAudioData(1024);
        const result = vadEngine.processAudioFrame(
          speechAudio.frequencyData,
          speechAudio.timeData,
          speechAudio.volumeLevel
        );
        
        if (result.vadState === 'speech') {
          speechCorrect++;
        }
      }

      // Reset engine state
      vadEngine.reset();

      // Test silence detection
      for (let i = 0; i < iterations; i++) {
        const silentAudio = createMockAudioData(1024, 0.001);
        const result = vadEngine.processAudioFrame(
          silentAudio.frequencyData,
          silentAudio.timeData,
          silentAudio.volumeLevel
        );
        
        if (result.vadState === 'silent') {
          silenceCorrect++;
        }
      }

      // Should achieve reasonable accuracy (>70% for mock data)
      const speechAccuracy = speechCorrect / iterations;
      const silenceAccuracy = silenceCorrect / iterations;
      
      expect(speechAccuracy).toBeGreaterThan(0.7);
      expect(silenceAccuracy).toBeGreaterThan(0.8); // Silence should be easier to detect
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration dynamically', () => {
      const newConfig = { energyThreshold: 0.05 };
      vadEngine.updateConfig(newConfig);
      
      const updatedConfig = vadEngine.getConfig();
      expect(updatedConfig.energyThreshold).toBe(0.05);
    });

    test('should validate configuration updates', () => {
      const invalidUpdate = { energyThreshold: -1 };
      
      expect(() => vadEngine.updateConfig(invalidUpdate)).toThrow();
    });

    test('should reset engine state when requested', () => {
      // Process some frames to build up state
      const speechAudio = createMockSpeechAudioData(1024);
      for (let i = 0; i < 10; i++) {
        vadEngine.processAudioFrame(
          speechAudio.frequencyData,
          speechAudio.timeData,
          speechAudio.volumeLevel
        );
      }

      vadEngine.reset();

      // Next result should not be influenced by previous frames
      const silentAudio = createMockAudioData(1024, 0.001);
      const result = vadEngine.processAudioFrame(
        silentAudio.frequencyData,
        silentAudio.timeData,
        silentAudio.volumeLevel
      );

      expect(result.vadState).toBe('silent');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty audio data', () => {
      const emptyFreqData = new Uint8Array(1024);
      const emptyTimeData = new Uint8Array(1024);
      
      const result = vadEngine.processAudioFrame(emptyFreqData, emptyTimeData, 0);
      
      expect(result.vadState).toBe('silent');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle very small buffer sizes', () => {
      const smallFreqData = new Uint8Array(64);
      const smallTimeData = new Uint8Array(64);
      
      // Fill with some data
      for (let i = 0; i < 64; i++) {
        smallFreqData[i] = Math.random() * 255;
        smallTimeData[i] = Math.random() * 255;
      }
      
      expect(() => {
        vadEngine.processAudioFrame(smallFreqData, smallTimeData, 0.5);
      }).not.toThrow();
    });

    test('should handle very large buffer sizes', () => {
      const largeFreqData = new Uint8Array(8192);
      const largeTimeData = new Uint8Array(8192);
      
      // Fill with speech-like data
      for (let i = 0; i < 8192; i++) {
        largeFreqData[i] = Math.random() * 100 + 50;
        largeTimeData[i] = Math.sin(i * 0.1) * 127 + 128;
      }
      
      const result = vadEngine.processAudioFrame(largeFreqData, largeTimeData, 0.7);
      
      expect(result).toBeDefined();
      expect(result.vadState).toMatch(/^(silent|speech|noise)$/);
    });

    test('should handle NaN and infinity values gracefully', () => {
      const corruptedFreqData = new Uint8Array(1024);
      const corruptedTimeData = new Uint8Array(1024);
      
      // Introduce some problematic values
      corruptedFreqData[0] = NaN as any;
      corruptedTimeData[0] = Infinity as any;
      
      expect(() => {
        vadEngine.processAudioFrame(corruptedFreqData, corruptedTimeData, NaN);
      }).not.toThrow();
    });
  });
});

// Helper functions for creating mock audio data

function createMockAudioData(bufferSize: number, amplitude: number = 0.5): {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volumeLevel: number;
} {
  const frequencyData = new Uint8Array(bufferSize);
  const timeData = new Uint8Array(bufferSize);
  
  for (let i = 0; i < bufferSize; i++) {
    frequencyData[i] = Math.random() * amplitude * 255;
    timeData[i] = Math.random() * amplitude * 255;
  }
  
  return {
    frequencyData,
    timeData,
    volumeLevel: amplitude
  };
}

function createMockSpeechAudioData(bufferSize: number): {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volumeLevel: number;
} {
  const frequencyData = new Uint8Array(bufferSize);
  const timeData = new Uint8Array(bufferSize);
  
  // Simulate human speech frequency characteristics
  for (let i = 0; i < bufferSize; i++) {
    const frequency = (i / bufferSize) * 22050; // Assuming 44.1kHz sample rate
    
    // Human speech is primarily in 85Hz - 8kHz range
    if (frequency >= 85 && frequency <= 8000) {
      // Higher energy in speech frequency bands
      frequencyData[i] = Math.random() * 150 + 50; // 50-200 range
    } else {
      // Lower energy outside speech range
      frequencyData[i] = Math.random() * 30; // 0-30 range
    }
    
    // Time domain with speech-like modulation
    timeData[i] = Math.sin(i * 0.1) * 100 + 128 + Math.random() * 20;
  }
  
  return {
    frequencyData,
    timeData,
    volumeLevel: 0.6 + Math.random() * 0.3 // 0.6-0.9 range
  };
}

function createMockNoiseAudioData(bufferSize: number): {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volumeLevel: number;
} {
  const frequencyData = new Uint8Array(bufferSize);
  const timeData = new Uint8Array(bufferSize);
  
  // Simulate broadband noise
  for (let i = 0; i < bufferSize; i++) {
    // Random energy across all frequencies
    frequencyData[i] = Math.random() * 100 + 20; // 20-120 range
    
    // Random time domain data
    timeData[i] = Math.random() * 255;
  }
  
  return {
    frequencyData,
    timeData,
    volumeLevel: 0.4 + Math.random() * 0.4 // 0.4-0.8 range
  };
}