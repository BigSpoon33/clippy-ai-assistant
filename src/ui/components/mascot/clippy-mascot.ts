/**
 * CLIPPY AI Assistant - Animated Mascot System
 * A dynamic character that reacts to plugin activity with expressions and animations
 */

import { Component } from 'obsidian';

export interface MascotExpression {
  name: string;
  emoji: string;
  animation: string;
  duration: number;
  description: string;
}

export interface MascotConfig {
  enabled: boolean;
  position: 'topbar' | 'sidebar' | 'floating' | 'corner';
  size: 'small' | 'medium' | 'large';
  personality: 'enthusiastic' | 'calm' | 'professional' | 'quirky';
  reactToActivity: boolean;
  showTooltips: boolean;
  opacity: number;
}

export class ClippyMascot extends Component {
  private mascotEl: HTMLElement;
  private currentExpression: MascotExpression;
  private animationQueue: MascotExpression[] = [];
  private isAnimating: boolean = false;
  private activityTimeout: number | null = null;
  private config: MascotConfig;

  // Predefined expressions based on personality
  private expressions: Record<string, MascotExpression[]> = {
    enthusiastic: [
      { name: 'idle', emoji: '🤖', animation: 'clippy-mascot-idle', duration: 0, description: 'Just hanging out' },
      { name: 'excited', emoji: '🚀', animation: 'clippy-mascot-excited', duration: 1000, description: 'Something cool is happening!' },
      { name: 'thinking', emoji: '🤔', animation: 'clippy-pulse-glow', duration: 2000, description: 'Processing your request' },
      { name: 'happy', emoji: '😊', animation: 'clippy-bounce-in', duration: 800, description: 'Task completed successfully' },
      { name: 'working', emoji: '⚡', animation: 'clippy-typing-indicator', duration: 0, description: 'Hard at work' },
      { name: 'listening', emoji: '👂', animation: 'clippy-pulse-glow', duration: 0, description: 'Listening to your voice' },
      { name: 'speaking', emoji: '💬', animation: 'clippy-bounce-in', duration: 0, description: 'Speaking response' },
      { name: 'researching', emoji: '🔍', animation: 'clippy-research-progress', duration: 0, description: 'Researching topics' },
      { name: 'celebrating', emoji: '🎉', animation: 'clippy-mascot-excited', duration: 1500, description: 'Research complete!' }
    ],
    calm: [
      { name: 'idle', emoji: '🧘', animation: 'clippy-mascot-idle', duration: 0, description: 'Meditating peacefully' },
      { name: 'thinking', emoji: '💭', animation: 'clippy-pulse-glow', duration: 3000, description: 'Deep in thought' },
      { name: 'working', emoji: '📝', animation: 'clippy-fade-in', duration: 0, description: 'Working steadily' },
      { name: 'happy', emoji: '☺️', animation: 'clippy-fade-in', duration: 1000, description: 'Quietly satisfied' }
    ],
    professional: [
      { name: 'idle', emoji: '💼', animation: 'clippy-mascot-idle', duration: 0, description: 'Ready for business' },
      { name: 'working', emoji: '⚙️', animation: 'rotate', duration: 0, description: 'Processing efficiently' },
      { name: 'completed', emoji: '✅', animation: 'clippy-bounce-in', duration: 600, description: 'Task accomplished' },
      { name: 'analyzing', emoji: '📊', animation: 'clippy-pulse-glow', duration: 0, description: 'Analyzing data' }
    ],
    quirky: [
      { name: 'idle', emoji: '🎭', animation: 'clippy-mascot-idle', duration: 0, description: 'Being mysterious' },
      { name: 'excited', emoji: '🎪', animation: 'clippy-mascot-excited', duration: 1200, description: 'Time for the show!' },
      { name: 'thinking', emoji: '🎨', animation: 'clippy-pulse-glow', duration: 2500, description: 'Creating something beautiful' },
      { name: 'dancing', emoji: '💃', animation: 'clippy-bounce-in', duration: 2000, description: 'Dancing with data!' }
    ]
  };

  constructor(container: HTMLElement, config: Partial<MascotConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      position: 'corner',
      size: 'medium',
      personality: 'enthusiastic',
      reactToActivity: true,
      showTooltips: true,
      opacity: 0.8,
      ...config
    };

    this.createMascotElement(container);
    this.currentExpression = this.expressions[this.config.personality][0]; // Start with idle
    this.displayExpression(this.currentExpression);
  }

  private createMascotElement(container: HTMLElement): void {
    this.mascotEl = container.createEl('div', { 
      cls: `clippy-mascot clippy-mascot-${this.config.size} clippy-mascot-${this.config.position}` 
    });

    // Base styling
    this.mascotEl.style.cssText = `
      position: ${this.config.position === 'floating' ? 'fixed' : 'relative'};
      width: ${this.getSizePixels()}px;
      height: ${this.getSizePixels()}px;
      font-size: ${this.getSizePixels() * 0.8}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      border-radius: 50%;
      background: var(--background-secondary);
      border: 2px solid var(--interactive-accent);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: ${this.config.opacity};
      z-index: 1000;
    `;

    // Position based on config
    this.positionMascot();

    // Add click interactions
    this.mascotEl.addEventListener('click', () => this.onMascotClick());
    this.mascotEl.addEventListener('mouseenter', () => this.onMascotHover());
    this.mascotEl.addEventListener('mouseleave', () => this.onMascotLeave());

    console.log(`🤖 Clippy mascot initialized with ${this.config.personality} personality`);
  }

  private getSizePixels(): number {
    const sizes = { small: 32, medium: 48, large: 64 };
    return sizes[this.config.size];
  }

  private positionMascot(): void {
    if (this.config.position === 'topbar') {
      this.mascotEl.style.position = 'fixed';
      this.mascotEl.style.top = '10px';
      this.mascotEl.style.right = '10px';
    } else if (this.config.position === 'corner') {
      this.mascotEl.style.position = 'fixed';
      this.mascotEl.style.bottom = '20px';
      this.mascotEl.style.right = '20px';
    } else if (this.config.position === 'floating') {
      this.mascotEl.style.position = 'fixed';
      this.mascotEl.style.top = '50%';
      this.mascotEl.style.left = '50%';
      this.mascotEl.style.transform = 'translate(-50%, -50%)';
    }
  }

  /**
   * Display a specific expression with animation
   */
  public displayExpression(expression: MascotExpression): void {
    if (!this.config.enabled) return;

    this.currentExpression = expression;
    this.mascotEl.textContent = expression.emoji;
    
    // Remove existing animation classes
    this.mascotEl.className = this.mascotEl.className.replace(/clippy-\w+-?\w*/g, '');
    this.mascotEl.classList.add(`clippy-mascot`, `clippy-mascot-${this.config.size}`, `clippy-mascot-${this.config.position}`);
    
    // Add new animation
    if (expression.animation) {
      this.mascotEl.classList.add(expression.animation);
    }

    // Update tooltip
    if (this.config.showTooltips) {
      this.mascotEl.title = expression.description;
    }

    // Auto-return to idle after duration
    if (expression.duration > 0) {
      this.isAnimating = true;
      setTimeout(() => {
        this.isAnimating = false;
        if (this.animationQueue.length > 0) {
          this.displayExpression(this.animationQueue.shift()!);
        } else {
          this.returnToIdle();
        }
      }, expression.duration);
    }

    console.log(`🤖 Clippy expressing: ${expression.name} (${expression.emoji})`);
  }

  /**
   * Queue an expression to be shown after current animation
   */
  public queueExpression(expressionName: string): void {
    const expression = this.getExpression(expressionName);
    if (expression) {
      if (this.isAnimating) {
        this.animationQueue.push(expression);
      } else {
        this.displayExpression(expression);
      }
    }
  }

  /**
   * React to different types of user activity
   */
  public reactToActivity(activityType: string, intensity: number = 1): void {
    if (!this.config.reactToActivity) return;

    // Clear existing activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    let expressionName = 'idle';
    
    switch (activityType) {
      case 'typing':
        expressionName = intensity > 0.7 ? 'excited' : 'working';
        break;
      case 'research_start':
        expressionName = 'researching';
        break;
      case 'research_complete':
        expressionName = 'celebrating';
        break;
      case 'voice_listening':
        expressionName = 'listening';
        break;
      case 'voice_speaking':
        expressionName = 'speaking';
        break;
      case 'ai_thinking':
        expressionName = 'thinking';
        break;
      case 'task_complete':
        expressionName = 'happy';
        break;
      case 'note_created':
        expressionName = 'excited';
        break;
      case 'idle':
      default:
        expressionName = 'idle';
    }

    this.queueExpression(expressionName);

    // Return to idle after inactivity
    this.activityTimeout = window.setTimeout(() => {
      this.returnToIdle();
    }, 5000);
  }

  /**
   * Get expression by name for current personality
   */
  private getExpression(name: string): MascotExpression | null {
    const personalityExpressions = this.expressions[this.config.personality];
    return personalityExpressions.find(expr => expr.name === name) || personalityExpressions[0];
  }

  /**
   * Return to idle expression
   */
  private returnToIdle(): void {
    const idleExpression = this.getExpression('idle');
    if (idleExpression && this.currentExpression.name !== 'idle') {
      this.displayExpression(idleExpression);
    }
  }

  /**
   * Handle mascot click interactions
   */
  private onMascotClick(): void {
    // Cycle through expressions or show a random one
    const personalityExpressions = this.expressions[this.config.personality];
    const randomExpression = personalityExpressions[Math.floor(Math.random() * personalityExpressions.length)];
    this.displayExpression(randomExpression);

    // Add click effect
    this.mascotEl.style.transform = `scale(1.1)`;
    setTimeout(() => {
      this.mascotEl.style.transform = '';
    }, 150);
  }

  private onMascotHover(): void {
    this.mascotEl.style.transform = `scale(1.05)`;
    this.mascotEl.style.boxShadow = `0 6px 20px rgba(var(--interactive-accent-rgb), 0.3)`;
  }

  private onMascotLeave(): void {
    this.mascotEl.style.transform = '';
    this.mascotEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  }

  /**
   * Update mascot configuration
   */
  public updateConfig(newConfig: Partial<MascotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Re-position if needed
    if (newConfig.position) {
      this.positionMascot();
    }
    
    // Update size if needed
    if (newConfig.size) {
      this.mascotEl.style.width = `${this.getSizePixels()}px`;
      this.mascotEl.style.height = `${this.getSizePixels()}px`;
      this.mascotEl.style.fontSize = `${this.getSizePixels() * 0.8}px`;
    }

    // Update opacity
    if (newConfig.opacity !== undefined) {
      this.mascotEl.style.opacity = newConfig.opacity.toString();
    }

    // Update enabled state
    if (newConfig.enabled !== undefined) {
      this.mascotEl.style.display = newConfig.enabled ? 'flex' : 'none';
    }
  }

  /**
   * Show/hide mascot
   */
  public setVisible(visible: boolean): void {
    this.mascotEl.style.display = visible ? 'flex' : 'none';
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    
    this.animationQueue = [];
    
    if (this.mascotEl && this.mascotEl.parentNode) {
      this.mascotEl.parentNode.removeChild(this.mascotEl);
    }
  }
}