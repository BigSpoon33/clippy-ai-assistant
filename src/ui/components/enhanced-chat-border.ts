/**
 * Enhanced Chat Border Component
 * Audio-reactive chat border with gradient, pulse, and wave rotation effects
 */

export interface ChatBorderConfig {
  enabled: boolean;
  gradientIntensity: number; // 0-1
  pulseSpeed: number; // 0-2
  waveSpeed: number; // 0-2
  borderWidth: number; // pixels
  glowRadius: number; // pixels
  audioReactive: boolean;
  colorScheme: 'neon' | 'fire' | 'ocean' | 'rainbow' | 'matrix';
}

export interface AudioData {
  volumeLevel: number; // 0-1
  frequencyData: Uint8Array;
  isActive: boolean;
}

export class EnhancedChatBorder {
  private container: HTMLElement;
  private config: ChatBorderConfig;
  private animationId: number | null = null;
  private isActive: boolean = false;
  private currentTime: number = 0;
  private audioData: AudioData = {
    volumeLevel: 0,
    frequencyData: new Uint8Array(32),
    isActive: false
  };

  private colorSchemes = {
    neon: {
      primary: '#00ff88',
      secondary: '#ff0088',
      accent: '#0088ff',
      gradient: 'linear-gradient(45deg, #00ff88, #ff0088, #0088ff)'
    },
    fire: {
      primary: '#ff4500',
      secondary: '#ff6347',
      accent: '#ffd700',
      gradient: 'linear-gradient(45deg, #ff4500, #ff6347, #ffd700)'
    },
    ocean: {
      primary: '#00bfff',
      secondary: '#1e90ff',
      accent: '#87ceeb',
      gradient: 'linear-gradient(45deg, #00bfff, #1e90ff, #87ceeb)'
    },
    rainbow: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      gradient: 'linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #0000ff, #8800ff)'
    },
    matrix: {
      primary: '#00ff00',
      secondary: '#008000',
      accent: '#90ee90',
      gradient: 'linear-gradient(45deg, #00ff00, #008000, #90ee90)'
    }
  };

  constructor(container: HTMLElement, config: Partial<ChatBorderConfig> = {}) {
    this.container = container;
    this.config = {
      enabled: true,
      gradientIntensity: 0.8,
      pulseSpeed: 1.0,
      waveSpeed: 0.5,
      borderWidth: 2,
      glowRadius: 8,
      audioReactive: true,
      colorScheme: 'neon',
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Add CSS class for styling
    this.container.addClass('enhanced-chat-border');
    
    // Create the border elements
    this.createBorderElements();
    
    // Apply initial styles
    this.updateStyles();
    
    console.log('[Enhanced Chat Border] Initialized');
  }

  private createBorderElements(): void {
    // Remove any existing border elements
    this.container.querySelectorAll('.chat-border-element').forEach(el => el.remove());

    // Create animated border elements
    for (let i = 0; i < 4; i++) {
      const borderElement = document.createElement('div');
      borderElement.className = `chat-border-element chat-border-${i}`;
      this.container.appendChild(borderElement);
    }

    // Create glow overlay
    const glowOverlay = document.createElement('div');
    glowOverlay.className = 'chat-border-glow';
    this.container.appendChild(glowOverlay);
  }

  private updateStyles(): void {
    const colors = this.colorSchemes[this.config.colorScheme];
    const borderWidth = this.config.borderWidth;
    const glowRadius = this.config.glowRadius;
    
    // Apply base container styles
    this.container.style.position = 'relative';
    
    // Create CSS for border elements
    const style = document.createElement('style');
    style.id = 'enhanced-chat-border-styles';
    
    // Remove existing styles
    document.getElementById('enhanced-chat-border-styles')?.remove();
    
    style.textContent = `
      .enhanced-chat-border {
        position: relative;
        overflow: visible;
      }
      
      .chat-border-element {
        position: absolute;
        pointer-events: none;
        z-index: -1;
      }
      
      .chat-border-0 {
        top: -${borderWidth}px;
        left: -${borderWidth}px;
        right: -${borderWidth}px;
        height: ${borderWidth}px;
        background: ${colors.gradient};
        border-radius: ${borderWidth}px ${borderWidth}px 0 0;
      }
      
      .chat-border-1 {
        top: -${borderWidth}px;
        right: -${borderWidth}px;
        bottom: -${borderWidth}px;
        width: ${borderWidth}px;
        background: ${colors.gradient};
        border-radius: 0 ${borderWidth}px ${borderWidth}px 0;
      }
      
      .chat-border-2 {
        bottom: -${borderWidth}px;
        left: -${borderWidth}px;
        right: -${borderWidth}px;
        height: ${borderWidth}px;
        background: ${colors.gradient};
        border-radius: 0 0 ${borderWidth}px ${borderWidth}px;
      }
      
      .chat-border-3 {
        top: -${borderWidth}px;
        left: -${borderWidth}px;
        bottom: -${borderWidth}px;
        width: ${borderWidth}px;
        background: ${colors.gradient};
        border-radius: ${borderWidth}px 0 0 ${borderWidth}px;
      }
      
      .chat-border-glow {
        position: absolute;
        top: -${glowRadius}px;
        left: -${glowRadius}px;
        right: -${glowRadius}px;
        bottom: -${glowRadius}px;
        background: transparent;
        border-radius: ${glowRadius}px;
        box-shadow: 0 0 ${glowRadius}px ${colors.primary};
        opacity: 0;
        pointer-events: none;
        z-index: -2;
        transition: opacity 0.3s ease;
      }
      
      /* Animation classes */
      .chat-border-pulse {
        animation: borderPulse 2s ease-in-out infinite;
      }
      
      .chat-border-wave {
        animation: borderWave 3s linear infinite;
      }
      
      .chat-border-active .chat-border-glow {
        opacity: ${this.config.gradientIntensity};
      }
      
      @keyframes borderPulse {
        0%, 100% { 
          opacity: 0.6;
          transform: scale(1);
        }
        50% { 
          opacity: 1;
          transform: scale(1.02);
        }
      }
      
      @keyframes borderWave {
        0% { 
          background-position: 0% 50%;
        }
        100% { 
          background-position: 200% 50%;
        }
      }
      
      /* Audio reactive styles */
      .chat-border-audio-reactive {
        animation: audioReactivePulse 0.1s ease-in-out;
      }
      
      @keyframes audioReactivePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
    
    document.head.appendChild(style);
  }

  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.container.addClass('chat-border-active');
    
    // Add animation classes
    const borderElements = this.container.querySelectorAll('.chat-border-element');
    borderElements.forEach((el, index) => {
      if (this.config.pulseSpeed > 0) {
        el.addClass('chat-border-pulse');
        (el as HTMLElement).style.animationDelay = `${index * 0.1}s`;
        (el as HTMLElement).style.animationDuration = `${2 / this.config.pulseSpeed}s`;
      }
      
      if (this.config.waveSpeed > 0) {
        el.addClass('chat-border-wave');
        (el as HTMLElement).style.animationDuration = `${3 / this.config.waveSpeed}s`;
      }
    });
    
    if (this.config.audioReactive) {
      this.startAudioAnimation();
    }
    
    console.log('[Enhanced Chat Border] Started');
  }

  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.container.removeClass('chat-border-active');
    
    // Remove animation classes
    const borderElements = this.container.querySelectorAll('.chat-border-element');
    borderElements.forEach(el => {
      el.removeClass('chat-border-pulse', 'chat-border-wave', 'chat-border-audio-reactive');
    });
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('[Enhanced Chat Border] Stopped');
  }

  public updateAudioData(audioData: AudioData): void {
    this.audioData = audioData;
  }

  private startAudioAnimation(): void {
    if (!this.isActive) return;
    
    const animate = (timestamp: number) => {
      if (!this.isActive) return;
      
      this.currentTime = timestamp;
      
      // Update audio-reactive effects
      if (this.audioData.isActive && this.audioData.volumeLevel > 0.1) {
        const intensity = this.audioData.volumeLevel;
        const borderElements = this.container.querySelectorAll('.chat-border-element');
        
        // Apply audio-reactive scaling
        borderElements.forEach((el, index) => {
          const element = el as HTMLElement;
          const frequencyIntensity = this.audioData.frequencyData[index * 4] / 255;
          const scale = 1 + (intensity * frequencyIntensity * 0.2);
          
          element.style.transform = `scale(${scale})`;
          element.style.opacity = `${0.6 + intensity * 0.4}`;
        });
        
        // Update glow intensity
        const glowElement = this.container.querySelector('.chat-border-glow') as HTMLElement;
        if (glowElement) {
          glowElement.style.opacity = `${this.config.gradientIntensity * intensity}`;
        }
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  public updateConfig(newConfig: Partial<ChatBorderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateStyles();
    
    if (this.isActive) {
      this.stop();
      this.start();
    }
    
    console.log('[Enhanced Chat Border] Configuration updated');
  }

  public getConfig(): ChatBorderConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.stop();
    
    // Remove border elements
    this.container.querySelectorAll('.chat-border-element').forEach(el => el.remove());
    this.container.querySelector('.chat-border-glow')?.remove();
    
    // Remove styles
    document.getElementById('enhanced-chat-border-styles')?.remove();
    
    // Remove CSS class
    this.container.removeClass('enhanced-chat-border', 'chat-border-active');
    
    console.log('[Enhanced Chat Border] Disposed');
  }
}

/**
 * Factory function to create enhanced chat border
 */
export function createEnhancedChatBorder(
  container: HTMLElement,
  config: Partial<ChatBorderConfig> = {}
): EnhancedChatBorder {
  return new EnhancedChatBorder(container, config);
}