/**
 * CLIPPY AI Assistant - Particle System
 * Creates dynamic particle effects for different plugin states and activities
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'dot' | 'star' | 'plus' | 'circle' | 'triangle';
}

export interface ParticleSystemConfig {
  maxParticles: number;
  emissionRate: number;
  particleLife: number;
  gravity: number;
  wind: number;
  colorScheme: string[];
  particleTypes: string[];
  blendMode: string;
  enabled: boolean;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private lastEmission: number = 0;
  private isActive: boolean = false;
  
  private config: ParticleSystemConfig = {
    maxParticles: 50,
    emissionRate: 5, // particles per second
    particleLife: 3000, // milliseconds
    gravity: 0.1,
    wind: 0,
    colorScheme: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
    particleTypes: ['dot', 'star', 'circle'],
    blendMode: 'screen',
    enabled: true
  };

  constructor(container: HTMLElement, config: Partial<ParticleSystemConfig> = {}) {
    this.config = { ...this.config, ...config };
    this.createCanvas(container);
    this.setupCanvas();
  }

  private createCanvas(container: HTMLElement): void {
    // Create particle container
    const particleContainer = container.createEl('div', { cls: 'clippy-particle-container' });
    
    // Create canvas
    this.canvas = particleContainer.createEl('canvas', { cls: 'clippy-particle-canvas' });
    this.ctx = this.canvas.getContext('2d')!;
    
    // Style the canvas
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      mix-blend-mode: ${this.config.blendMode};
    `;
    
    this.resizeCanvas();
    
    // Handle resize
    window.addEventListener('resize', () => this.resizeCanvas());
    
    console.log('✨ Particle system canvas created');
  }

  private setupCanvas(): void {
    this.ctx.globalCompositeOperation = this.config.blendMode as GlobalCompositeOperation;
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.setupCanvas();
  }

  /**
   * Start particle system with specific effect
   */
  public start(effectType: string = 'default'): void {
    if (!this.config.enabled) return;
    
    this.isActive = true;
    this.applyEffectConfig(effectType);
    
    if (!this.animationId) {
      this.animate();
    }
    
    console.log(`✨ Particle system started with effect: ${effectType}`);
  }

  /**
   * Stop particle system
   */
  public stop(): void {
    this.isActive = false;
    
    // Let existing particles fade out naturally
    if (this.particles.length === 0 && this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.clearCanvas();
    }
    
    console.log('✨ Particle system stopped');
  }

  /**
   * Apply configuration for specific effects
   */
  private applyEffectConfig(effectType: string): void {
    switch (effectType) {
      case 'thinking':
        this.config.maxParticles = 20;
        this.config.emissionRate = 3;
        this.config.colorScheme = ['#8b5cf6', '#a855f7', '#c084fc'];
        this.config.particleTypes = ['dot', 'circle'];
        this.config.gravity = 0.05;
        this.config.wind = 0.02;
        break;
        
      case 'processing':
        this.config.maxParticles = 40;
        this.config.emissionRate = 8;
        this.config.colorScheme = ['#06b6d4', '#0891b2', '#0e7490'];
        this.config.particleTypes = ['star', 'plus'];
        this.config.gravity = 0.1;
        this.config.wind = -0.01;
        break;
        
      case 'research':
        this.config.maxParticles = 30;
        this.config.emissionRate = 5;
        this.config.colorScheme = ['#10b981', '#059669', '#047857'];
        this.config.particleTypes = ['circle', 'triangle'];
        this.config.gravity = 0.08;
        this.config.wind = 0;
        break;
        
      case 'celebration':
        this.config.maxParticles = 100;
        this.config.emissionRate = 15;
        this.config.colorScheme = ['#f59e0b', '#d97706', '#b45309', '#92400e'];
        this.config.particleTypes = ['star', 'plus', 'triangle'];
        this.config.gravity = 0.15;
        this.config.wind = 0.05;
        this.config.particleLife = 2000;
        break;
        
      case 'voice':
        this.config.maxParticles = 25;
        this.config.emissionRate = 6;
        this.config.colorScheme = ['#ef4444', '#dc2626', '#b91c1c'];
        this.config.particleTypes = ['circle', 'dot'];
        this.config.gravity = 0.03;
        this.config.wind = 0.1;
        break;
        
      case 'error':
        this.config.maxParticles = 15;
        this.config.emissionRate = 2;
        this.config.colorScheme = ['#ef4444', '#dc2626'];
        this.config.particleTypes = ['triangle'];
        this.config.gravity = 0.2;
        this.config.wind = 0;
        break;
        
      default:
        // Keep default config
        break;
    }
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    const now = Date.now();
    
    // Emit new particles if active
    if (this.isActive && this.particles.length < this.config.maxParticles) {
      const timeSinceLastEmission = now - this.lastEmission;
      const emissionInterval = 1000 / this.config.emissionRate;
      
      if (timeSinceLastEmission >= emissionInterval) {
        this.emitParticle();
        this.lastEmission = now;
      }
    }
    
    // Update particles
    this.updateParticles();
    
    // Draw particles
    this.drawParticles();
    
    // Continue animation if we have particles or are still active
    if (this.particles.length > 0 || this.isActive) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }

  /**
   * Emit a new particle
   */
  private emitParticle(): void {
    const particle: Particle = {
      x: Math.random() * this.canvas.width,
      y: this.canvas.height + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 1,
      life: this.config.particleLife,
      maxLife: this.config.particleLife,
      size: Math.random() * 4 + 2,
      color: this.config.colorScheme[Math.floor(Math.random() * this.config.colorScheme.length)],
      opacity: 1,
      type: this.config.particleTypes[Math.floor(Math.random() * this.config.particleTypes.length)] as Particle['type']
    };
    
    this.particles.push(particle);
  }

  /**
   * Update particle positions and properties
   */
  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx + this.config.wind;
      particle.y += particle.vy;
      
      // Apply gravity
      particle.vy += this.config.gravity;
      
      // Update life and opacity
      particle.life -= 16; // ~60fps
      particle.opacity = particle.life / particle.maxLife;
      
      // Add some size variation over time
      particle.size *= 0.999;
      
      // Remove dead particles or particles that went off screen
      if (particle.life <= 0 || 
          particle.y > this.canvas.height + 50 || 
          particle.x < -50 || 
          particle.x > this.canvas.width + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Draw all particles
   */
  private drawParticles(): void {
    this.clearCanvas();
    
    this.particles.forEach(particle => {
      this.drawParticle(particle);
    });
  }

  /**
   * Draw individual particle based on its type
   */
  private drawParticle(particle: Particle): void {
    this.ctx.save();
    
    this.ctx.globalAlpha = particle.opacity;
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = 1;
    
    const x = particle.x;
    const y = particle.y;
    const size = particle.size;
    
    switch (particle.type) {
      case 'dot':
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
        
      case 'star':
        this.drawStar(x, y, size);
        break;
        
      case 'plus':
        this.drawPlus(x, y, size);
        break;
        
      case 'triangle':
        this.drawTriangle(x, y, size);
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Draw star shape
   */
  private drawStar(x: number, y: number, size: number): void {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.5;
    
    this.ctx.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(pointX, pointY);
      } else {
        this.ctx.lineTo(pointX, pointY);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw plus shape
   */
  private drawPlus(x: number, y: number, size: number): void {
    const thickness = size * 0.3;
    
    this.ctx.beginPath();
    // Horizontal bar
    this.ctx.rect(x - size, y - thickness, size * 2, thickness * 2);
    // Vertical bar
    this.ctx.rect(x - thickness, y - size, thickness * 2, size * 2);
    this.ctx.fill();
  }

  /**
   * Draw triangle shape
   */
  private drawTriangle(x: number, y: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x - size, y + size);
    this.ctx.lineTo(x + size, y + size);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Clear canvas
   */
  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Burst effect - emit many particles at once
   */
  public burst(x: number = this.canvas.width / 2, y: number = this.canvas.height / 2, count: number = 20): void {
    if (!this.config.enabled) return;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = Math.random() * 4 + 2;
      
      const particle: Particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: this.config.particleLife,
        maxLife: this.config.particleLife,
        size: Math.random() * 6 + 3,
        color: this.config.colorScheme[Math.floor(Math.random() * this.config.colorScheme.length)],
        opacity: 1,
        type: this.config.particleTypes[Math.floor(Math.random() * this.config.particleTypes.length)] as Particle['type']
      };
      
      this.particles.push(particle);
    }
    
    // Start animation if not already running
    if (!this.animationId) {
      this.animate();
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.blendMode) {
      this.setupCanvas();
    }
  }

  /**
   * Get current particle count
   */
  public getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.particles = [];
    this.clearCanvas();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stop();
    this.clear();
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    window.removeEventListener('resize', () => this.resizeCanvas());
    
    console.log('✨ Particle system destroyed');
  }
}