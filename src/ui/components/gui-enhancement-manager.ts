/**
 * CLIPPY AI Assistant - GUI Enhancement Manager
 * Orchestrates all visual enhancements, mascot, particles, themes, and visualizers
 */

import { App, Component } from 'obsidian';
import { ClippyMascot, MascotConfig } from './mascot/clippy-mascot';
import { ActivityTracker } from './mascot/activity-tracker';
import { ParticleSystem } from './particles/particle-system';
import { GeometricPatternGenerator } from './visualizers/geometric-pattern-generator';
import { EnhancedAudioVisualizer } from './visualizers/enhanced-audio-visualizer';
import { AdaptiveThemeManager } from './themes/adaptive-theme-manager';

export interface GUIEnhancementConfig {
  enableMascot: boolean;
  enableParticles: boolean;
  enableGeometricPatterns: boolean;
  enableAudioVisualizers: boolean;
  enableAdaptiveThemes: boolean;
  enableActivityTracking: boolean;
  performanceMode: 'low' | 'medium' | 'high';
  debugMode: boolean;
}

export class GUIEnhancementManager extends Component {
  private app: App;
  private config: GUIEnhancementConfig;
  
  // Core components
  private mascot: ClippyMascot | null = null;
  private activityTracker: ActivityTracker | null = null;
  private particleSystem: ParticleSystem | null = null;
  private patternGenerator: GeometricPatternGenerator | null = null;
  private audioVisualizer: EnhancedAudioVisualizer | null = null;
  private themeManager: AdaptiveThemeManager | null = null;
  
  // Container elements
  private mascotContainer: HTMLElement | null = null;
  private particleContainer: HTMLElement | null = null;
  private patternContainer: HTMLElement | null = null;
  
  // Integration state
  private isInitialized: boolean = false;
  private performanceMonitor: PerformanceMonitor;

  constructor(app: App, config: Partial<GUIEnhancementConfig> = {}) {
    super();
    this.app = app;
    
    this.config = {
      enableMascot: true,
      enableParticles: true,
      enableGeometricPatterns: true,
      enableAudioVisualizers: true,
      enableAdaptiveThemes: true,
      enableActivityTracking: true,
      performanceMode: 'high',
      debugMode: false,
      ...config
    };

    this.performanceMonitor = new PerformanceMonitor(this.config.performanceMode);
    
    console.log('🎨 GUI Enhancement Manager initialized');
  }

  /**
   * Initialize all GUI enhancements
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize in order of dependency
      await this.initializeThemeManager();
      await this.initializeContainers();
      await this.initializeActivityTracker();
      await this.initializeMascot();
      await this.initializeParticleSystem();
      await this.initializeGeometricPatterns();
      await this.integrateComponents();
      
      this.isInitialized = true;
      this.log('🎉 All GUI enhancements initialized successfully!');
      
    } catch (error) {
      console.error('Failed to initialize GUI enhancements:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize theme manager
   */
  private async initializeThemeManager(): Promise<void> {
    if (!this.config.enableAdaptiveThemes) return;
    
    this.themeManager = new AdaptiveThemeManager();
    this.addChild(this.themeManager);
    
    // React to theme changes
    this.themeManager.onThemeChange((theme) => {
      this.updateComponentThemes(theme);
    });
    
    this.log('🎨 Theme manager initialized');
  }

  /**
   * Initialize containers for components
   */
  private async initializeContainers(): Promise<void> {
    // Create mascot container
    if (this.config.enableMascot) {
      this.mascotContainer = document.body.createEl('div', { 
        cls: 'clippy-mascot-container' 
      });
      this.mascotContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;
    }
    
    // Create particle container
    if (this.config.enableParticles) {
      this.particleContainer = document.body.createEl('div', { 
        cls: 'clippy-particle-main-container' 
      });
      this.particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      `;
    }
    
    // Create pattern container for graph enhancements
    if (this.config.enableGeometricPatterns) {
      this.patternContainer = document.body.createEl('div', { 
        cls: 'clippy-pattern-main-container' 
      });
      this.patternContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
      `;
    }
    
    this.log('📦 GUI containers created');
  }

  /**
   * Initialize activity tracker
   */
  private async initializeActivityTracker(): Promise<void> {
    if (!this.config.enableActivityTracking) return;
    
    this.activityTracker = new ActivityTracker(this.app);
    this.addChild(this.activityTracker);
    
    // Set up activity event listeners
    this.activityTracker.onActivity('typing', (data) => {
      if (this.mascot) {
        this.mascot.reactToActivity('typing', data.intensity);
      }
      if (this.themeManager) {
        this.themeManager.updateActivityLevel(data.intensity);
      }
    });
    
    this.activityTracker.onActivity('research_start', () => {
      if (this.themeManager) {
        this.themeManager.switchToContext('research');
      }
      if (this.particleSystem) {
        this.particleSystem.start('research');
      }
    });
    
    this.activityTracker.onActivity('research_complete', () => {
      if (this.themeManager) {
        this.themeManager.switchToContext('celebration');
      }
      if (this.particleSystem) {
        this.particleSystem.start('celebration');
      }
    });
    
    this.log('📊 Activity tracker initialized');
  }

  /**
   * Initialize mascot system
   */
  private async initializeMascot(): Promise<void> {
    if (!this.config.enableMascot || !this.mascotContainer) return;
    
    const mascotConfig: Partial<MascotConfig> = {
      position: 'corner',
      size: this.config.performanceMode === 'low' ? 'small' : 'medium',
      personality: 'enthusiastic',
      reactToActivity: true,
      opacity: this.config.performanceMode === 'low' ? 0.6 : 0.8
    };
    
    this.mascot = new ClippyMascot(this.mascotContainer, mascotConfig);
    this.addChild(this.mascot);
    
    // Connect to activity tracker
    if (this.activityTracker) {
      this.activityTracker.setMascot(this.mascot);
    }
    
    this.log('🤖 Mascot system initialized');
  }

  /**
   * Initialize particle system
   */
  private async initializeParticleSystem(): Promise<void> {
    if (!this.config.enableParticles || !this.particleContainer) return;
    
    const particleConfig = {
      maxParticles: this.performanceMonitor.getParticleLimit(),
      enabled: true,
      blendMode: 'screen'
    };
    
    this.particleSystem = new ParticleSystem(this.particleContainer, particleConfig);
    this.addChild(this.particleSystem);
    
    this.log('✨ Particle system initialized');
  }

  /**
   * Initialize geometric pattern generator
   */
  private async initializeGeometricPatterns(): Promise<void> {
    if (!this.config.enableGeometricPatterns || !this.patternContainer) return;
    
    const patternConfig = {
      animated: this.config.performanceMode !== 'low',
      opacity: 0.2,
      iterations: this.config.performanceMode === 'high' ? 6 : 3
    };
    
    this.patternGenerator = new GeometricPatternGenerator(this.patternContainer, patternConfig);
    this.addChild(this.patternGenerator);
    
    // Generate default pattern
    this.patternGenerator.generateFlowerOfLife(80);
    
    this.log('🔮 Geometric patterns initialized');
  }

  /**
   * Integrate all components for coordinated behavior
   */
  private async integrateComponents(): Promise<void> {
    // Connect audio visualizer to mascot and particles when created
    this.setupAudioIntegration();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up theme integration
    this.setupThemeIntegration();
    
    this.log('🔗 Component integration complete');
  }

  /**
   * Set up audio integration
   */
  private setupAudioIntegration(): void {
    // This will be called when audio elements are created
    document.addEventListener('audio-visualizer-created', (event: any) => {
      const visualizer = event.detail.visualizer as EnhancedAudioVisualizer;
      
      if (this.mascot) {
        visualizer.setMascot(this.mascot);
      }
      
      if (this.particleSystem) {
        visualizer.setParticleSystem(this.particleSystem);
      }
    });
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    this.performanceMonitor.onPerformanceChange((newMode) => {
      this.adjustPerformanceSettings(newMode);
    });
    
    // Monitor every 30 seconds
    setInterval(() => {
      this.performanceMonitor.measure();
    }, 30000);
  }

  /**
   * Set up theme integration
   */
  private setupThemeIntegration(): void {
    if (!this.themeManager) return;
    
    // React to Obsidian theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Obsidian theme changed, update our adaptive theme
          if (this.themeManager) {
            this.themeManager.switchToContext('default');
          }
        }
      });
    });
    
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /**
   * Update all components with new theme
   */
  private updateComponentThemes(theme: any): void {
    // Update particle colors
    if (this.particleSystem) {
      this.particleSystem.updateConfig({
        colorScheme: [theme.colors.primary, theme.colors.secondary, theme.colors.accent]
      });
    }
    
    // Update pattern colors
    if (this.patternGenerator) {
      this.patternGenerator.updateConfig({
        strokeColor: theme.colors.primary,
        fillColor: theme.colors.accent
      });
    }
    
    this.log(`🎨 Components updated with theme: ${theme.name}`);
  }

  /**
   * Adjust settings based on performance
   */
  private adjustPerformanceSettings(mode: 'low' | 'medium' | 'high'): void {
    this.log(`⚡ Adjusting performance to ${mode} mode`);
    
    // Adjust mascot
    if (this.mascot) {
      this.mascot.updateConfig({
        size: mode === 'low' ? 'small' : 'medium',
        opacity: mode === 'low' ? 0.6 : 0.8
      });
    }
    
    // Adjust particles
    if (this.particleSystem) {
      this.particleSystem.updateConfig({
        maxParticles: this.performanceMonitor.getParticleLimit(),
        emissionRate: mode === 'low' ? 2 : mode === 'medium' ? 5 : 8
      });
    }
    
    // Adjust patterns
    if (this.patternGenerator) {
      this.patternGenerator.updateConfig({
        animated: mode !== 'low',
        iterations: mode === 'high' ? 6 : mode === 'medium' ? 4 : 3
      });
    }
  }

  /**
   * Create audio visualizer for specific element
   */
  public createAudioVisualizer(container: HTMLElement, config: any = {}): EnhancedAudioVisualizer {
    if (!this.config.enableAudioVisualizers) {
      throw new Error('Audio visualizers are disabled');
    }
    
    const canvas = container.createEl('canvas', { cls: 'clippy-audio-visualizer' });
    
    const visualizer = new EnhancedAudioVisualizer({
      canvas: canvas,
      colorScheme: 'adaptive',
      ...config
    });
    
    // Connect to mascot and particles
    if (this.mascot) {
      visualizer.setMascot(this.mascot);
    }
    
    if (this.particleSystem) {
      visualizer.setParticleSystem(this.particleSystem);
    }
    
    // Dispatch event for other integrations
    document.dispatchEvent(new CustomEvent('audio-visualizer-created', {
      detail: { visualizer, container }
    }));
    
    this.log('🎵 Audio visualizer created');
    return visualizer;
  }

  /**
   * Trigger celebration effect
   */
  public celebrateSuccess(message: string = 'Success!'): void {
    this.log(`🎉 Celebrating: ${message}`);
    
    // Switch to celebration theme
    if (this.themeManager) {
      this.themeManager.switchToContext('celebration');
    }
    
    // Show excited mascot
    if (this.mascot) {
      this.mascot.reactToActivity('celebrating', 1);
    }
    
    // Burst particles
    if (this.particleSystem) {
      this.particleSystem.start('celebration');
      this.particleSystem.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
    }
    
    // Generate celebration pattern
    if (this.patternGenerator) {
      this.patternGenerator.generateMandala(120);
    }
  }

  /**
   * Show research mode
   */
  public enterResearchMode(): void {
    this.log('🔍 Entering research mode');
    
    if (this.themeManager) {
      this.themeManager.switchToContext('research');
    }
    
    if (this.mascot) {
      this.mascot.reactToActivity('researching', 1);
    }
    
    if (this.particleSystem) {
      this.particleSystem.start('research');
    }
    
    if (this.patternGenerator) {
      this.patternGenerator.generateGoldenSpiral(150);
    }
  }

  /**
   * Show communication mode
   */
  public enterCommunicationMode(): void {
    this.log('💬 Entering communication mode');
    
    if (this.themeManager) {
      this.themeManager.switchToContext('communication');
    }
    
    if (this.mascot) {
      this.mascot.reactToActivity('listening', 1);
    }
    
    if (this.particleSystem) {
      this.particleSystem.start('voice');
    }
  }

  /**
   * Handle voice activity
   */
  public handleVoiceActivity(type: 'listening' | 'speaking' | 'processing'): void {
    if (this.activityTracker) {
      this.activityTracker.trackVoiceActivity(type);
    }
    
    if (this.themeManager) {
      this.themeManager.switchToContext('voice');
    }
    
    if (this.particleSystem) {
      this.particleSystem.start('voice');
    }
  }

  /**
   * Handle errors
   */
  public handleError(error: string): void {
    this.log(`❌ Handling error: ${error}`);
    
    if (this.themeManager) {
      this.themeManager.switchToContext('error');
    }
    
    if (this.mascot) {
      this.mascot.reactToActivity('thinking', 0.5); // Confused expression
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<GUIEnhancementConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Handle enabling/disabling components
    if (oldConfig.enableMascot !== this.config.enableMascot) {
      if (this.config.enableMascot) {
        this.initializeMascot();
      } else {
        this.mascot?.destroy();
        this.mascot = null;
      }
    }
    
    // Similar logic for other components...
    
    this.log('⚙️ Configuration updated', newConfig);
  }

  /**
   * Get current status
   */
  public getStatus(): object {
    return {
      initialized: this.isInitialized,
      config: this.config,
      components: {
        mascot: !!this.mascot,
        activityTracker: !!this.activityTracker,
        particleSystem: !!this.particleSystem,
        patternGenerator: !!this.patternGenerator,
        themeManager: !!this.themeManager
      },
      performance: this.performanceMonitor.getCurrentMetrics()
    };
  }

  /**
   * Handle initialization errors
   */
  private handleInitializationError(error: any): void {
    console.error('GUI Enhancement initialization error:', error);
    
    // Fallback to minimal mode
    this.config = {
      ...this.config,
      performanceMode: 'low',
      enableParticles: false,
      enableGeometricPatterns: false
    };
    
    // Retry with minimal configuration
    setTimeout(() => {
      this.initialize();
    }, 2000);
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      if (data) {
        console.log(`[GUI Enhancement] ${message}`, data);
      } else {
        console.log(`[GUI Enhancement] ${message}`);
      }
    }
  }

  /**
   * Cleanup all components
   */
  public destroy(): void {
    this.log('🧹 Destroying GUI Enhancement Manager');
    
    // Destroy all components
    this.mascot?.destroy();
    this.particleSystem?.destroy();
    this.patternGenerator?.destroy();
    this.audioVisualizer?.destroy();
    this.themeManager?.destroy();
    this.activityTracker?.destroy();
    
    // Remove containers
    this.mascotContainer?.remove();
    this.particleContainer?.remove();
    this.patternContainer?.remove();
    
    // Clear references
    this.mascot = null;
    this.particleSystem = null;
    this.patternGenerator = null;
    this.audioVisualizer = null;
    this.themeManager = null;
    this.activityTracker = null;
    
    this.isInitialized = false;
  }
}

/**
 * Performance monitoring helper class
 */
class PerformanceMonitor {
  private mode: 'low' | 'medium' | 'high';
  private metrics: { fps: number; memory: number; cpu: number } = { fps: 60, memory: 0, cpu: 0 };
  private observers: ((mode: 'low' | 'medium' | 'high') => void)[] = [];

  constructor(initialMode: 'low' | 'medium' | 'high') {
    this.mode = initialMode;
  }

  public measure(): void {
    // Simple performance measurement
    const start = performance.now();
    
    // Simulate work
    for (let i = 0; i < 10000; i++) {
      Math.random();
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Determine if we should adjust performance mode
    if (duration > 50 && this.mode === 'high') {
      this.mode = 'medium';
      this.notifyObservers();
    } else if (duration > 100 && this.mode === 'medium') {
      this.mode = 'low';
      this.notifyObservers();
    } else if (duration < 10 && this.mode === 'low') {
      this.mode = 'medium';
      this.notifyObservers();
    } else if (duration < 5 && this.mode === 'medium') {
      this.mode = 'high';
      this.notifyObservers();
    }
  }

  public getParticleLimit(): number {
    return this.mode === 'low' ? 20 : this.mode === 'medium' ? 50 : 100;
  }

  public getCurrentMetrics(): object {
    return { ...this.metrics, mode: this.mode };
  }

  public onPerformanceChange(callback: (mode: 'low' | 'medium' | 'high') => void): void {
    this.observers.push(callback);
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.mode));
  }
}