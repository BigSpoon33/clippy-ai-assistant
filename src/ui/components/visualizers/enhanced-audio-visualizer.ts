/**
 * CLIPPY AI Assistant - Enhanced Audio Visualizer
 * Integrates with chat components for real-time voice activity and audio feedback
 */

import { ClippyMascot } from '../mascot/clippy-mascot';
import { ParticleSystem } from '../particles/particle-system';

export interface AudioVisualizerConfig {
  canvas: HTMLCanvasElement;
  type: 'waveform' | 'frequency' | 'circular' | 'particle' | 'compact' | 'radial' | 'waterfall' | 'rainbow';
  colorScheme: 'neon' | 'fire' | 'ocean' | 'matrix' | 'adaptive' | 'rainbow';
  sensitivity: number;
  smoothing: number;
  showVAD: boolean; // Voice Activity Detection
  particleIntegration: boolean;
  mascotIntegration: boolean;
  responsiveSize: boolean;
}

export interface VoiceActivityData {
  isActive: boolean;
  confidence: number;
  volume: number;
  frequency: number;
}

export class EnhancedAudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  
  private config: AudioVisualizerConfig;
  private isActive: boolean = false;
  private colorSchemes: Record<string, any>;
  private mascot: ClippyMascot | null = null;
  private particleSystem: ParticleSystem | null = null;
  
  // Voice Activity Detection
  private vadThreshold: number = 50;
  private vadHistory: number[] = [];
  private currentVAD: VoiceActivityData = {
    isActive: false,
    confidence: 0,
    volume: 0,
    frequency: 0
  };

  // Compact visualization mode (for chat bubbles)
  private compactMode: boolean = false;
  private compactSize: { width: number; height: number } = { width: 60, height: 20 };
  
  // Advanced visualization data
  private waterfallHistory: Uint8Array[] = [];
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
  }> = [];

  constructor(config: Partial<AudioVisualizerConfig>) {
    this.config = {
      canvas: document.createElement('canvas'),
      type: 'waveform',
      colorScheme: 'adaptive',
      sensitivity: 1.0,
      smoothing: 0.8,
      showVAD: true,
      particleIntegration: true,
      mascotIntegration: true,
      responsiveSize: true,
      ...config
    };

    this.canvas = this.config.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.compactMode = this.config.type === 'compact';
    
    this.setupColorSchemes();
    this.setupCanvas();
    
    console.log(`🎵 Enhanced audio visualizer initialized (${this.config.type})`);
  }

  private setupColorSchemes(): void {
    this.colorSchemes = {
      neon: {
        primary: '#00ff88',
        secondary: '#ff0088',
        accent: '#0088ff',
        background: 'rgba(0, 0, 0, 0.1)'
      },
      fire: {
        primary: '#ff4500',
        secondary: '#ff6347',
        accent: '#ffd700',
        background: 'rgba(20, 0, 0, 0.1)'
      },
      ocean: {
        primary: '#00bfff',
        secondary: '#1e90ff',
        accent: '#87ceeb',
        background: 'rgba(0, 10, 20, 0.1)'
      },
      matrix: {
        primary: '#00ff00',
        secondary: '#008000',
        accent: '#90ee90',
        background: 'rgba(0, 0, 0, 0.1)'
      },
      rainbow: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        background: 'rgba(0, 0, 0, 0.1)'
      },
      adaptive: {
        primary: 'var(--interactive-accent)',
        secondary: 'var(--interactive-accent-hover)',
        accent: 'var(--text-accent)',
        background: 'var(--background-secondary)'
      }
    };
  }

  private setupCanvas(): void {
    if (this.compactMode) {
      this.canvas.width = this.compactSize.width;
      this.canvas.height = this.compactSize.height;
    } else {
      this.resizeCanvas();
    }

    this.canvas.style.cssText = `
      ${this.compactMode ? 'display: inline-block;' : 'width: 100%; height: 100%;'}
      border-radius: ${this.compactMode ? '4px' : '8px'};
      background: ${this.colorSchemes[this.config.colorScheme].background};
      ${this.compactMode ? 'margin: 0 8px; vertical-align: middle;' : ''}
    `;

    if (!this.compactMode && this.config.responsiveSize) {
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  private resizeCanvas(): void {
    if (this.compactMode) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Connect to audio stream (microphone or audio element)
   */
  public async connectToStream(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = this.compactMode ? 256 : 2048;
      this.analyser.smoothingTimeConstant = this.config.smoothing;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);
      
      source.connect(this.analyser);
      
      this.isActive = true;
      this.startVisualization();
      
      console.log('🎵 Audio visualizer connected to stream');
      
    } catch (error) {
      console.error('Failed to connect to audio stream:', error);
    }
  }

  /**
   * Connect to audio element
   */
  public connectToAudioElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const source = this.audioContext.createMediaElementSource(audioElement);
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = this.compactMode ? 256 : 2048;
    this.analyser.smoothingTimeConstant = this.config.smoothing;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.frequencyData = new Uint8Array(bufferLength);
    
    source.connect(this.analyser);
    source.connect(this.audioContext.destination);
    
    this.isActive = true;
    this.startVisualization();
    
    console.log('🎵 Audio visualizer connected to audio element');
  }

  /**
   * Start visualization loop
   */
  private startVisualization(): void {
    if (this.animationId) return;
    
    const animate = () => {
      if (!this.isActive) return;
      
      this.updateAudioData();
      this.detectVoiceActivity();
      
      // Draw visualization based on type
      switch (this.config.type) {
        case 'waveform':
          this.drawWaveform();
          break;
        case 'frequency':
          this.drawFrequencyBars();
          break;
        case 'circular':
          this.drawCircularVisualization();
          break;
        case 'particle':
          this.drawParticleVisualization();
          break;
        case 'compact':
          this.drawCompactVisualization();
          break;
        case 'radial':
          this.drawRadialWaveform();
          break;
        case 'waterfall':
          this.drawWaterfall();
          break;
        case 'rainbow':
          this.drawRainbowVisualization();
          break;
      }
      
      // Update connected systems
      this.updateMascot();
      this.updateParticles();
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Update audio data arrays
   */
  private updateAudioData(): void {
    if (!this.analyser || !this.dataArray || !this.frequencyData) return;
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.frequencyData);
  }

  /**
   * Detect voice activity
   */
  private detectVoiceActivity(): void {
    if (!this.frequencyData || !this.config.showVAD) return;
    
    // Calculate average volume
    const avgVolume = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
    
    // Voice frequency range (approximately 85Hz to 255Hz for human speech)
    const voiceStart = Math.floor((85 / (this.audioContext!.sampleRate / 2)) * this.frequencyData.length);
    const voiceEnd = Math.floor((3400 / (this.audioContext!.sampleRate / 2)) * this.frequencyData.length);
    
    let voiceFreqEnergy = 0;
    for (let i = voiceStart; i < voiceEnd; i++) {
      voiceFreqEnergy += this.frequencyData[i];
    }
    voiceFreqEnergy /= (voiceEnd - voiceStart);
    
    // Update VAD history
    this.vadHistory.push(voiceFreqEnergy);
    if (this.vadHistory.length > 10) {
      this.vadHistory.shift();
    }
    
    // Calculate confidence based on consistency
    const avgVoiceEnergy = this.vadHistory.reduce((a, b) => a + b, 0) / this.vadHistory.length;
    const confidence = Math.min(avgVoiceEnergy / 100, 1);
    
    this.currentVAD = {
      isActive: avgVoiceEnergy > this.vadThreshold,
      confidence: confidence,
      volume: avgVolume / 255,
      frequency: voiceFreqEnergy
    };
  }

  /**
   * Draw compact visualization for chat bubbles
   */
  private drawCompactVisualization(): void {
    if (!this.dataArray) return;
    
    const { width, height } = this.compactSize;
    const colors = this.colorSchemes[this.config.colorScheme];
    
    // Clear canvas
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw simple frequency bars
    const barCount = 8;
    const barWidth = width / barCount - 1;
    
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * this.frequencyData!.length);
      const barHeight = (this.frequencyData![dataIndex] / 255) * height * 0.8;
      
      // Color based on VAD
      const color = this.currentVAD.isActive ? colors.primary : colors.secondary;
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        i * (barWidth + 1),
        height - barHeight,
        barWidth,
        barHeight
      );
    }
    
    // VAD indicator
    if (this.currentVAD.isActive) {
      this.ctx.fillStyle = colors.accent;
      this.ctx.fillRect(0, 0, width, 2);
    }
  }

  /**
   * Draw waveform visualization
   */
  private drawWaveform(): void {
    if (!this.dataArray || this.compactMode) return;
    
    const colors = this.colorSchemes[this.config.colorScheme];
    const { width, height } = this.canvas;
    
    // Clear with fade effect
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = colors.primary;
    this.ctx.beginPath();
    
    const sliceWidth = width / this.dataArray.length;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128 * this.config.sensitivity;
      const y = (v * height / 4) + height / 2;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    this.ctx.stroke();
    
    // VAD indicator
    if (this.currentVAD.isActive && this.config.showVAD) {
      this.ctx.fillStyle = colors.accent;
      this.ctx.fillRect(0, height - 5, width * this.currentVAD.confidence, 5);
    }
  }

  /**
   * Draw frequency bars
   */
  private drawFrequencyBars(): void {
    if (!this.frequencyData || this.compactMode) return;
    
    const colors = this.colorSchemes[this.config.colorScheme];
    const { width, height } = this.canvas;
    
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / this.frequencyData.length * 4;
    let x = 0;
    
    for (let i = 0; i < this.frequencyData.length / 4; i++) {
      const barHeight = (this.frequencyData[i] / 255) * height * this.config.sensitivity;
      
      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(1, colors.secondary);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      
      x += barWidth;
    }
  }

  /**
   * Draw circular visualization
   */
  private drawCircularVisualization(): void {
    if (!this.frequencyData || this.compactMode) return;
    
    const colors = this.colorSchemes[this.config.colorScheme];
    const { width, height } = this.canvas;
    
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 50;
    
    this.ctx.strokeStyle = colors.primary;
    this.ctx.lineWidth = 2;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const angle = (i / this.frequencyData.length) * Math.PI * 2;
      const barHeight = (this.frequencyData[i] / 255) * radius * 0.5 * this.config.sensitivity;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    // Center VAD indicator
    if (this.currentVAD.isActive && this.config.showVAD) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 10 + this.currentVAD.confidence * 20, 0, Math.PI * 2);
      this.ctx.fillStyle = colors.accent;
      this.ctx.fill();
    }
  }

  /**
   * Draw particle-based visualization
   */
  private drawParticleVisualization(): void {
    if (!this.frequencyData || this.compactMode) return;
    
    const colors = this.colorSchemes[this.config.colorScheme];
    const { width, height } = this.canvas;
    
    // Semi-transparent background for trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, width, height);
    
    // Add new particles based on audio data
    const avgFrequency = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
    
    if (avgFrequency > 50) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: height,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 8 - 2,
          life: 100,
          maxLife: 100,
          size: Math.random() * 4 + 2,
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
      particle.vy += 0.1; // Gravity
      particle.life--;
      
      // Remove dead particles
      if (particle.life <= 0 || particle.y > height) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Draw particle
      const alpha = particle.life / particle.maxLife;
      this.ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draw radial waveform visualization
   */
  private drawRadialWaveform(): void {
    if (!this.dataArray || this.compactMode) return;
    
    const colors = this.colorSchemes[this.config.colorScheme];
    const { width, height } = this.canvas;
    
    // Clear canvas
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(centerX, centerY) - 40;
    
    this.ctx.strokeStyle = colors.primary;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const angle = (i / this.dataArray.length) * Math.PI * 2;
      const amplitude = (this.dataArray[i] - 128) / 128 * this.config.sensitivity;
      const radius = baseRadius + amplitude * 30;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.stroke();
    
    // VAD indicator at center
    if (this.currentVAD.isActive && this.config.showVAD) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 5 + this.currentVAD.confidence * 15, 0, Math.PI * 2);
      this.ctx.fillStyle = colors.accent;
      this.ctx.fill();
    }
  }

  /**
   * Draw waterfall spectrum visualization
   */
  private drawWaterfall(): void {
    if (!this.frequencyData || this.compactMode) return;
    
    const { width, height } = this.canvas;
    
    // Add current frequency data to history
    this.waterfallHistory.push(new Uint8Array(this.frequencyData));
    
    // Keep only recent history
    if (this.waterfallHistory.length > height) {
      this.waterfallHistory.shift();
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw waterfall
    const imageData = this.ctx.createImageData(width, height);
    
    for (let y = 0; y < this.waterfallHistory.length; y++) {
      const row = this.waterfallHistory[y];
      for (let x = 0; x < Math.min(row.length, width); x++) {
        const value = row[x];
        const pixelIndex = (y * width + x) * 4;
        
        // Convert to RGB based on color scheme
        const colors = this.getWaterfallColor(value);
        imageData.data[pixelIndex] = colors.r;     // Red
        imageData.data[pixelIndex + 1] = colors.g; // Green
        imageData.data[pixelIndex + 2] = colors.b; // Blue
        imageData.data[pixelIndex + 3] = 255;      // Alpha
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Draw rainbow spectrum visualization
   */
  private drawRainbowVisualization(): void {
    if (!this.frequencyData || this.compactMode) return;
    
    const { width, height } = this.canvas;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / this.frequencyData.length * 4;
    let x = 0;
    
    for (let i = 0; i < this.frequencyData.length / 4; i++) {
      const barHeight = (this.frequencyData[i] / 255) * height * this.config.sensitivity;
      
      // Calculate hue based on frequency position
      const hue = (i / (this.frequencyData.length / 4)) * 360;
      const rgb = this.hslToRgb(hue, 100, 50);
      
      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      
      x += barWidth;
    }
  }

  /**
   * Get waterfall color based on intensity and color scheme
   */
  private getWaterfallColor(value: number): { r: number; g: number; b: number } {
    const intensity = value / 255;
    
    switch (this.config.colorScheme) {
      case 'fire':
        return {
          r: Math.floor(intensity * 255),
          g: Math.floor(intensity * intensity * 255),
          b: 0
        };
      case 'ocean':
        return {
          r: 0,
          g: Math.floor(intensity * 200),
          b: Math.floor(intensity * 255)
        };
      case 'rainbow':
        const hue = intensity * 360;
        return this.hslToRgb(hue, 100, 50);
      default:
        return {
          r: Math.floor(intensity * 100),
          g: Math.floor(intensity * 255),
          b: Math.floor(intensity * 100)
        };
    }
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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
    
    return {
      r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
    };
  }

  /**
   * Update connected mascot based on audio data
   */
  private updateMascot(): void {
    if (!this.mascot || !this.config.mascotIntegration) return;
    
    const avgVolume = this.currentVAD.volume;
    
    if (this.currentVAD.isActive && avgVolume > 0.3) {
      this.mascot.reactToActivity('voice_listening', this.currentVAD.confidence);
    } else if (avgVolume > 0.1) {
      this.mascot.reactToActivity('working', avgVolume);
    }
  }

  /**
   * Update connected particle system
   */
  private updateParticles(): void {
    if (!this.particleSystem || !this.config.particleIntegration) return;
    
    if (this.currentVAD.isActive) {
      // Don't start new particles during visualization
      // The particle system will handle its own emission
    }
  }

  /**
   * Set mascot integration
   */
  public setMascot(mascot: ClippyMascot): void {
    this.mascot = mascot;
  }

  /**
   * Set particle system integration
   */
  public setParticleSystem(particleSystem: ParticleSystem): void {
    this.particleSystem = particleSystem;
  }

  /**
   * Get current voice activity data
   */
  public getVoiceActivity(): VoiceActivityData {
    return { ...this.currentVAD };
  }

  /**
   * Create compact visualizer for chat bubble
   */
  public static createCompactVisualizer(container: HTMLElement): EnhancedAudioVisualizer {
    const canvas = container.createEl('canvas', { cls: 'clippy-compact-visualizer' });
    
    return new EnhancedAudioVisualizer({
      canvas: canvas,
      type: 'compact',
      colorScheme: 'adaptive',
      showVAD: true,
      particleIntegration: false,
      mascotIntegration: false,
      responsiveSize: false
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AudioVisualizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.colorScheme) {
      this.setupCanvas();
    }
    
    if (newConfig.sensitivity || newConfig.smoothing) {
      if (this.analyser) {
        this.analyser.smoothingTimeConstant = this.config.smoothing;
      }
    }
  }

  /**
   * Stop visualization
   */
  public stop(): void {
    this.isActive = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.frequencyData = null;
    
    console.log('🎵 Audio visualizer stopped');
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stop();
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    window.removeEventListener('resize', () => this.resizeCanvas());
    
    console.log('🎵 Audio visualizer destroyed');
  }
}