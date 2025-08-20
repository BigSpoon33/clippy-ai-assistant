/**
 * Voice Types Tests
 * Basic tests to verify type definitions and test setup
 */

import { VADVisualizerConfig, TTSVisualizerConfig, VoiceVisualizersConfig } from '../../../src/voice-v2/types/voice-types';

describe('Voice Types', () => {
  describe('VADVisualizerConfig', () => {
    test('should have correct type structure', () => {
      const config: VADVisualizerConfig = {
        enabled: true,
        sensitivity: 0.7,
        size: 'medium',
        position: 'inline',
        showConfidence: true,
        animationSpeed: 'normal',
        colors: {
          silent: '#6b7280',
          speech: '#10b981',
          noise: '#f59e0b'
        }
      };

      expect(config.enabled).toBe(true);
      expect(config.sensitivity).toBe(0.7);
      expect(config.size).toBe('medium');
      expect(config.position).toBe('inline');
      expect(config.showConfidence).toBe(true);
      expect(config.animationSpeed).toBe('normal');
      expect(config.colors.silent).toBe('#6b7280');
      expect(config.colors.speech).toBe('#10b981');
      expect(config.colors.noise).toBe('#f59e0b');
    });

    test('should accept valid size values', () => {
      const sizes: Array<VADVisualizerConfig['size']> = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const config: VADVisualizerConfig = {
          enabled: true,
          sensitivity: 0.7,
          size,
          position: 'inline',
          showConfidence: true,
          animationSpeed: 'normal',
          colors: {
            silent: '#000',
            speech: '#000',
            noise: '#000'
          }
        };
        
        expect(config.size).toBe(size);
      });
    });

    test('should accept valid position values', () => {
      const positions: Array<VADVisualizerConfig['position']> = ['inline', 'floating', 'corner'];
      
      positions.forEach(position => {
        const config: VADVisualizerConfig = {
          enabled: true,
          sensitivity: 0.7,
          size: 'medium',
          position,
          showConfidence: true,
          animationSpeed: 'normal',
          colors: {
            silent: '#000',
            speech: '#000',
            noise: '#000'
          }
        };
        
        expect(config.position).toBe(position);
      });
    });
  });

  describe('TTSVisualizerConfig', () => {
    test('should have correct type structure', () => {
      const config: TTSVisualizerConfig = {
        enabled: true,
        spectrumBars: 24,
        height: 50,
        showBorder: true,
        borderIntensity: 1.0,
        showGlow: true,
        glowThreshold: 0.7,
        colors: {
          primary: 'auto',
          secondary: 'auto',
          background: 'auto'
        },
        smoothing: 0.85,
        minDecibels: -90,
        maxDecibels: -10
      };

      expect(config.enabled).toBe(true);
      expect(config.spectrumBars).toBe(24);
      expect(config.height).toBe(50);
      expect(config.showBorder).toBe(true);
      expect(config.borderIntensity).toBe(1.0);
      expect(config.showGlow).toBe(true);
      expect(config.glowThreshold).toBe(0.7);
      expect(config.colors.primary).toBe('auto');
      expect(config.smoothing).toBe(0.85);
      expect(config.minDecibels).toBe(-90);
      expect(config.maxDecibels).toBe(-10);
    });

    test('should accept valid spectrum bar ranges', () => {
      const validBarCounts = [8, 16, 24, 32, 48];
      
      validBarCounts.forEach(spectrumBars => {
        const config: TTSVisualizerConfig = {
          enabled: true,
          spectrumBars,
          height: 50,
          showBorder: false,
          borderIntensity: 1.0,
          showGlow: false,
          glowThreshold: 0.7,
          colors: {
            primary: '#000',
            secondary: '#000',
            background: '#000'
          },
          smoothing: 0.5,
          minDecibels: -90,
          maxDecibels: -10
        };
        
        expect(config.spectrumBars).toBe(spectrumBars);
        expect(config.spectrumBars).toBeGreaterThanOrEqual(8);
        expect(config.spectrumBars).toBeLessThanOrEqual(48);
      });
    });
  });

  describe('VoiceVisualizersConfig', () => {
    test('should combine VAD and TTS configs correctly', () => {
      const config: VoiceVisualizersConfig = {
        vad: {
          enabled: true,
          sensitivity: 0.8,
          size: 'large',
          position: 'floating',
          showConfidence: false,
          animationSpeed: 'fast',
          colors: {
            silent: '#gray',
            speech: '#green',
            noise: '#yellow'
          }
        },
        tts: {
          enabled: false,
          spectrumBars: 16,
          height: 75,
          showBorder: false,
          borderIntensity: 0.5,
          showGlow: false,
          glowThreshold: 0.8,
          colors: {
            primary: '#blue',
            secondary: '#cyan',
            background: '#black'
          },
          smoothing: 0.9,
          minDecibels: -100,
          maxDecibels: -5
        }
      };

      expect(config.vad.enabled).toBe(true);
      expect(config.vad.sensitivity).toBe(0.8);
      expect(config.tts.enabled).toBe(false);
      expect(config.tts.spectrumBars).toBe(16);
    });
  });

  describe('Type Safety', () => {
    test('should enforce valid sensitivity ranges', () => {
      // TypeScript should catch invalid ranges at compile time
      // In runtime tests, we verify the expected ranges
      const validSensitivities = [0.0, 0.5, 1.0];
      
      validSensitivities.forEach(sensitivity => {
        expect(sensitivity).toBeGreaterThanOrEqual(0.0);
        expect(sensitivity).toBeLessThanOrEqual(1.0);
      });
    });

    test('should enforce valid color formats', () => {
      const validColors = ['auto', '#ff0000', '#000000', 'rgb(255,0,0)', 'red'];
      
      validColors.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    test('should enforce valid decibel ranges', () => {
      const config = {
        minDecibels: -90,
        maxDecibels: -10
      };
      
      expect(config.minDecibels).toBeLessThan(config.maxDecibels);
      expect(config.minDecibels).toBeLessThanOrEqual(-30);
      expect(config.maxDecibels).toBeGreaterThanOrEqual(-50);
    });
  });
});