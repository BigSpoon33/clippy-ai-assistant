/**
 * Enhanced Multi-Style Audio Visualizer
 * Extends the existing audio visualizer system with multiple visualization styles
 * Based on the audio-visualizer-demo.html patterns
 */

import { BaseAudioVisualizer, VisualizerConfig } from './audio-visualizer';
import { AudioVisualizerData, TTSVisualizerConfig } from '../types/voice-types';

export interface EnhancedVisualizerConfig extends VisualizerConfig {
  visualizerStyle: 'spectrum' | 'waveform' | 'circular' | 'radial' | 'waterfall' | 'particle';
  colorScheme: 'neon' | 'fire' | 'ocean' | 'rainbow' | 'matrix';
}

export interface ParticleSystem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class EnhancedMultiVisualizer extends BaseAudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enhancedConfig: EnhancedVisualizerConfig;
  private lastFrameTime: number = 0;
  private particles: ParticleSystem[] = [];
  private waterfallHistory: Uint8Array[] = [];
  
  // Color schemes from the demo
  private colorSchemes = {
    neon: {
      bg: 'rgba(0, 0, 0, 0.1)',
      primary: '#00ff88',
      secondary: '#ff0088',
      accent: '#0088ff'
    },
    fire: {
      bg: 'rgba(20, 0, 0, 0.1)',
      primary: '#ff4500',
      secondary: '#ff6347',
      accent: '#ffd700'
    },
    ocean: {
      bg: 'rgba(0, 10, 20, 0.1)',
      primary: '#00bfff',
      secondary: '#1e90ff',
      accent: '#87ceeb'
    },
    rainbow: {
      bg: 'rgba(0, 0, 0, 0.1)',
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff'
    },
    matrix: {
      bg: 'rgba(0, 0, 0, 0.1)',
      primary: '#00ff00',
      secondary: '#008000',
      accent: '#90ee90'
    }
  };

  constructor(container: HTMLElement, config: Partial<EnhancedVisualizerConfig> = {}) {
    super(container, config);
    
    this.enhancedConfig = {
      ...BaseAudioVisualizer.DEFAULT_CONFIG,
      visualizerStyle: 'spectrum',
      colorScheme: 'neon',
      ...config
    } as EnhancedVisualizerConfig;
  }

  protected initialize(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';

    // Optimize canvas context for performance
    this.ctx = this.canvas.getContext('2d', { 
      alpha: false,      // Disable alpha for performance
      desynchronized: true // Allow async rendering
    })!;

    // Set high DPI support
    this.setupHighDPI();

    this.container.appendChild(this.canvas);
    this.logger.debug('[Enhanced Multi Visualizer] Initialized with style:', this.enhancedConfig.visualizerStyle);
  }

  public updateVisualization(data: AudioVisualizerData): void {
    if (!this.isActive) return;

    const now = performance.now();
    const frameInterval = 1000 / this.config.targetFPS;

    // Frame rate limiting
    if (now - this.lastFrameTime < frameInterval) {
      this.animationId = requestAnimationFrame(() => this.updateVisualization(data));
      return;
    }

    this.performanceMonitor?.frameStart();

    // Clear canvas with color scheme background
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    this.ctx.fillStyle = colors.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render based on selected style
    switch (this.enhancedConfig.visualizerStyle) {
      case 'spectrum':
        this.drawSpectrum(data.frequencyData);
        break;
      case 'waveform':
        this.drawWaveform(data.frequencyData);
        break;
      case 'circular':
        this.drawCircular(data.frequencyData);
        break;
      case 'radial':
        this.drawRadial(data.frequencyData);
        break;
      case 'waterfall':
        this.drawWaterfall(data.frequencyData);
        break;
      case 'particle':
        this.drawParticleSystem(data.frequencyData, data.volumeLevel);
        break;
    }

    // Draw VAD indicator (common to all styles)
    this.drawVADIndicator(data.vadState, data.vadConfidence || 0);

    this.performanceMonitor?.frameEnd();
    this.lastFrameTime = now;

    if (this.isActive) {
      this.animationId = requestAnimationFrame(() => this.updateVisualization(data));
    }
  }

  private drawSpectrum(frequencyData: Uint8Array): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    const barWidth = this.canvas.width / frequencyData.length;
    const barSpacing = 1;
    const actualBarWidth = barWidth - barSpacing;

    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * this.canvas.height * 0.8;
      const x = i * barWidth;
      const y = this.canvas.height - barHeight;

      // Create gradient based on frequency
      const gradient = this.ctx.createLinearGradient(x, y + barHeight, x, y);
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(1, colors.secondary);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(actualBarWidth), Math.floor(barHeight));
    }
  }

  private drawWaveform(frequencyData: Uint8Array): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    const centerY = this.canvas.height / 2;
    const amplitude = centerY * 0.8;

    this.ctx.strokeStyle = colors.primary;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    for (let i = 0; i < frequencyData.length; i++) {
      const x = (i / frequencyData.length) * this.canvas.width;
      const y = centerY + ((frequencyData[i] - 128) / 128) * amplitude;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Add glow effect
    this.ctx.shadowColor = colors.primary;
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private drawCircular(frequencyData: Uint8Array): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.3;
    const maxRadius = Math.min(centerX, centerY) * 0.8;

    for (let i = 0; i < frequencyData.length; i++) {
      const angle = (i / frequencyData.length) * Math.PI * 2;
      const intensity = frequencyData[i] / 255;
      const radius = baseRadius + (intensity * (maxRadius - baseRadius));

      const x1 = centerX + Math.cos(angle) * baseRadius;
      const y1 = centerY + Math.sin(angle) * baseRadius;
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;

      // Create gradient from center to edge
      const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, colors.secondary);
      gradient.addColorStop(1, colors.primary);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  private drawRadial(frequencyData: Uint8Array): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.9;

    // Draw concentric circles based on frequency data
    const circles = 8;
    for (let circle = 0; circle < circles; circle++) {
      const radiusStep = maxRadius / circles;
      const radius = radiusStep * (circle + 1);
      const dataIndex = Math.floor((circle / circles) * frequencyData.length);
      const intensity = frequencyData[dataIndex] / 255;

      if (this.enhancedConfig.colorScheme === 'rainbow') {
        const color = this.hslToRgb((circle / circles) * 360, 100, 50);
        this.ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      } else {
        this.ctx.strokeStyle = colors.primary;
      }
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = intensity;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawWaterfall(frequencyData: Uint8Array): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    
    // Add current frequency data to history
    this.waterfallHistory.push(new Uint8Array(frequencyData));
    
    // Limit history to canvas height
    const maxHistory = this.canvas.height / 2;
    if (this.waterfallHistory.length > maxHistory) {
      this.waterfallHistory.shift();
    }

    const barWidth = this.canvas.width / frequencyData.length;
    
    // Draw waterfall from bottom to top
    for (let historyIndex = 0; historyIndex < this.waterfallHistory.length; historyIndex++) {
      const y = this.canvas.height - (historyIndex * 2);
      const opacity = 1 - (historyIndex / this.waterfallHistory.length);
      
      for (let i = 0; i < this.waterfallHistory[historyIndex].length; i++) {
        const intensity = this.waterfallHistory[historyIndex][i] / 255;
        const x = i * barWidth;
        
        if (this.enhancedConfig.colorScheme === 'rainbow') {
          const color = this.hslToRgb(intensity * 300, 100, 50);
          this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
        } else {
          const color = this.getColorByIntensity(colors, intensity);
          this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
        }
        
        this.ctx.fillRect(x, y, barWidth - 1, 2);
      }
    }
  }

  private drawParticleSystem(frequencyData: Uint8Array, volumeLevel: number): void {
    const colors = this.colorSchemes[this.enhancedConfig.colorScheme];
    
    // Add new particles based on audio data
    const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    
    if (avgFrequency > 50 && volumeLevel > 0.1) {
      const particleCount = Math.floor(volumeLevel * 5);
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: this.canvas.height,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 12 - 2,
          life: 100,
          maxLife: 100,
          size: Math.random() * 6 + 2,
          color: colors.primary
        });
      }
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2; // Gravity
      particle.life--;
      
      // Remove dead particles
      if (particle.life <= 0 || particle.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Draw particle with fade
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      
      if (this.enhancedConfig.colorScheme === 'rainbow') {
        const color = this.hslToRgb((1 - alpha) * 360, 100, 50);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      } else {
        this.ctx.fillStyle = particle.color;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawVADIndicator(vadState: 'silent' | 'speech' | 'noise', confidence: number): void {
    const indicatorSize = 16;
    const x = this.canvas.width - indicatorSize - 8;
    const y = 8;

    // Background circle
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x + indicatorSize / 2, y + indicatorSize / 2, indicatorSize / 2, 0, 2 * Math.PI);
    this.ctx.fill();

    // VAD state indicator
    let color = '#666666';
    if (vadState === 'speech') color = '#10b981';
    else if (vadState === 'noise') color = '#f59e0b';

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x + indicatorSize / 2, y + indicatorSize / 2, (indicatorSize / 2) * confidence, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private getColorByIntensity(colors: any, intensity: number): { r: number, g: number, b: number } {
    const hex = intensity > 0.5 ? colors.primary : colors.secondary;
    return this.hexToRgb(hex);
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    
    return { r, g, b };
  }

  protected handleResize(): void {
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.setupHighDPI();
    
    // Clear particle and waterfall history on resize
    this.particles = [];
    this.waterfallHistory = [];
  }

  private setupHighDPI(): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set actual canvas size
    this.canvas.width = this.config.width * devicePixelRatio;
    this.canvas.height = this.config.height * devicePixelRatio;
    
    // Scale canvas back down using CSS
    this.canvas.style.width = this.config.width + 'px';
    this.canvas.style.height = this.config.height + 'px';
    
    // Scale drawing context
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  public updateStyle(visualizerStyle: 'spectrum' | 'waveform' | 'circular' | 'radial' | 'waterfall' | 'particle'): void {
    this.enhancedConfig.visualizerStyle = visualizerStyle;
    
    // Clear style-specific state
    this.particles = [];
    this.waterfallHistory = [];
    
    this.logger.debug('[Enhanced Multi Visualizer] Style updated to:', visualizerStyle);
  }

  public updateColorScheme(colorScheme: 'neon' | 'fire' | 'ocean' | 'rainbow' | 'matrix'): void {
    this.enhancedConfig.colorScheme = colorScheme;
    this.logger.debug('[Enhanced Multi Visualizer] Color scheme updated to:', colorScheme);
  }
}

/**
 * Factory function to create enhanced multi-style visualizer
 */
export function createEnhancedMultiVisualizer(
  container: HTMLElement,
  config: Partial<EnhancedVisualizerConfig> = {}
): EnhancedMultiVisualizer {
  return new EnhancedMultiVisualizer(container, config);
}