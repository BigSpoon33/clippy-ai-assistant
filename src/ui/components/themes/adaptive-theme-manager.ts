/**
 * CLIPPY AI Assistant - Adaptive Theme Manager
 * Manages dynamic color schemes that respond to context, activity, and time
 */

export interface ColorScheme {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundSecondary: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
    glow?: string;
    particle?: string;
  };
  animations: {
    duration: string;
    easing: string;
    glowIntensity: number;
  };
  contexts: string[]; // When this theme should be active
}

export interface ThemeState {
  currentScheme: string;
  adaptiveMode: boolean;
  contextualChanges: boolean;
  activityResponsive: boolean;
  timeOfDayAdaptation: boolean;
  userPreferences: {
    preferredScheme: string;
    allowAnimations: boolean;
    glowEffects: boolean;
    particleEffects: boolean;
  };
}

export class AdaptiveThemeManager {
  private currentTheme: ColorScheme;
  private themes: Map<string, ColorScheme> = new Map();
  private state: ThemeState;
  private cssRoot: HTMLElement;
  private observers: ((theme: ColorScheme) => void)[] = [];
  private contextTimer: number | null = null;
  private activityLevel: number = 0;

  constructor() {
    this.cssRoot = document.documentElement;
    
    this.state = {
      currentScheme: 'adaptive-default',
      adaptiveMode: true,
      contextualChanges: true,
      activityResponsive: true,
      timeOfDayAdaptation: true,
      userPreferences: {
        preferredScheme: 'adaptive-default',
        allowAnimations: true,
        glowEffects: true,
        particleEffects: true
      }
    };

    this.initializeThemes();
    this.currentTheme = this.themes.get(this.state.currentScheme)!;
    this.applyTheme();
    this.startAdaptiveLoop();
    
    console.log('🎨 Adaptive theme manager initialized');
  }

  private initializeThemes(): void {
    // Default adaptive theme - matches Obsidian's current theme
    this.themes.set('adaptive-default', {
      name: 'Adaptive Default',
      description: 'Adapts to Obsidian\'s current theme',
      colors: {
        primary: 'var(--interactive-accent)',
        secondary: 'var(--interactive-accent-hover)',
        accent: 'var(--text-accent)',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: 'var(--color-green)',
        warning: 'var(--color-orange)',
        error: 'var(--color-red)',
        glow: 'var(--interactive-accent)',
        particle: 'var(--interactive-accent)'
      },
      animations: {
        duration: '0.3s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        glowIntensity: 0.6
      },
      contexts: ['default', 'idle', 'general']
    });

    // Research-focused theme - green and analytical
    this.themes.set('research-mode', {
      name: 'Research Mode',
      description: 'Optimized for research and deep thinking',
      colors: {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#10b981',
        particle: '#34d399'
      },
      animations: {
        duration: '0.4s',
        easing: 'ease-in-out',
        glowIntensity: 0.8
      },
      contexts: ['research', 'analysis', 'thinking', 'processing']
    });

    // Communication theme - blue and friendly
    this.themes.set('communication-mode', {
      name: 'Communication Mode',
      description: 'Warm and engaging for conversations',
      colors: {
        primary: '#06b6d4',
        secondary: '#0891b2',
        accent: '#67e8f9',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#06b6d4',
        particle: '#67e8f9'
      },
      animations: {
        duration: '0.25s',
        easing: 'ease-out',
        glowIntensity: 0.7
      },
      contexts: ['chat', 'voice', 'communication', 'active']
    });

    // High activity theme - energetic and responsive
    this.themes.set('high-activity', {
      name: 'High Activity',
      description: 'Vibrant theme for intense work sessions',
      colors: {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        accent: '#a78bfa',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#8b5cf6',
        particle: '#a78bfa'
      },
      animations: {
        duration: '0.2s',
        easing: 'ease-out',
        glowIntensity: 1.0
      },
      contexts: ['high-activity', 'typing', 'excited', 'productive']
    });

    // Night theme - easy on the eyes
    this.themes.set('night-mode', {
      name: 'Night Mode',
      description: 'Gentle colors for late night work',
      colors: {
        primary: '#fbbf24',
        secondary: '#f59e0b',
        accent: '#fcd34d',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#fbbf24',
        particle: '#fcd34d'
      },
      animations: {
        duration: '0.5s',
        easing: 'ease-in-out',
        glowIntensity: 0.4
      },
      contexts: ['night', 'evening', 'low-light', 'calm']
    });

    // Celebration theme - festive and joyful
    this.themes.set('celebration', {
      name: 'Celebration',
      description: 'Festive colors for achievements',
      colors: {
        primary: '#ec4899',
        secondary: '#db2777',
        accent: '#f9a8d4',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#ec4899',
        particle: '#f9a8d4'
      },
      animations: {
        duration: '0.15s',
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        glowIntensity: 1.2
      },
      contexts: ['celebration', 'success', 'achievement', 'party']
    });

    // Error/problem theme - focused and clear
    this.themes.set('problem-solving', {
      name: 'Problem Solving',
      description: 'Clear contrast for debugging and problem-solving',
      colors: {
        primary: '#ef4444',
        secondary: '#dc2626',
        accent: '#fca5a5',
        background: 'var(--background-primary)',
        backgroundSecondary: 'var(--background-secondary)',
        text: 'var(--text-normal)',
        textMuted: 'var(--text-muted)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        glow: '#ef4444',
        particle: '#fca5a5'
      },
      animations: {
        duration: '0.2s',
        easing: 'ease-out',
        glowIntensity: 0.9
      },
      contexts: ['error', 'problem', 'debugging', 'alert']
    });
  }

  /**
   * Apply current theme to CSS custom properties
   */
  private applyTheme(): void {
    const theme = this.currentTheme;
    
    // Set CSS custom properties for theme colors
    this.cssRoot.style.setProperty('--clippy-primary', theme.colors.primary);
    this.cssRoot.style.setProperty('--clippy-secondary', theme.colors.secondary);
    this.cssRoot.style.setProperty('--clippy-accent', theme.colors.accent);
    this.cssRoot.style.setProperty('--clippy-background', theme.colors.background);
    this.cssRoot.style.setProperty('--clippy-background-secondary', theme.colors.backgroundSecondary);
    this.cssRoot.style.setProperty('--clippy-text', theme.colors.text);
    this.cssRoot.style.setProperty('--clippy-text-muted', theme.colors.textMuted);
    this.cssRoot.style.setProperty('--clippy-success', theme.colors.success);
    this.cssRoot.style.setProperty('--clippy-warning', theme.colors.warning);
    this.cssRoot.style.setProperty('--clippy-error', theme.colors.error);
    
    if (theme.colors.glow) {
      this.cssRoot.style.setProperty('--clippy-glow', theme.colors.glow);
    }
    if (theme.colors.particle) {
      this.cssRoot.style.setProperty('--clippy-particle', theme.colors.particle);
    }
    
    // Set animation properties
    this.cssRoot.style.setProperty('--clippy-animation-duration', theme.animations.duration);
    this.cssRoot.style.setProperty('--clippy-animation-easing', theme.animations.easing);
    this.cssRoot.style.setProperty('--clippy-glow-intensity', theme.animations.glowIntensity.toString());

    // Add theme class to body for specific styling
    document.body.classList.remove(...Array.from(document.body.classList).filter(c => c.startsWith('clippy-theme-')));
    document.body.classList.add(`clippy-theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}`);

    // Notify observers
    this.observers.forEach(callback => callback(theme));

    console.log(`🎨 Applied theme: ${theme.name}`);
  }

  /**
   * Switch to a specific theme
   */
  public switchToTheme(themeName: string): void {
    const theme = this.themes.get(themeName);
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return;
    }

    this.currentTheme = theme;
    this.state.currentScheme = themeName;
    this.applyTheme();
    
    // Trigger theme transition effect
    this.triggerThemeTransition();
  }

  /**
   * Switch theme based on context
   */
  public switchToContext(context: string, intensity: number = 1): void {
    if (!this.state.contextualChanges) return;

    // Find the best theme for this context
    let bestTheme: ColorScheme | null = null;
    
    for (const [name, theme] of this.themes) {
      if (theme.contexts.includes(context)) {
        bestTheme = theme;
        break;
      }
    }

    // Special logic for activity levels
    if (context === 'activity' && intensity > 0.8) {
      bestTheme = this.themes.get('high-activity');
    } else if (context === 'research' || context === 'thinking') {
      bestTheme = this.themes.get('research-mode');
    } else if (context === 'chat' || context === 'voice') {
      bestTheme = this.themes.get('communication-mode');
    } else if (context === 'celebration' || context === 'success') {
      bestTheme = this.themes.get('celebration');
    } else if (context === 'error' || context === 'problem') {
      bestTheme = this.themes.get('problem-solving');
    }

    if (bestTheme && bestTheme !== this.currentTheme) {
      this.switchToTheme(bestTheme.name);
      
      // Auto-revert after some time unless in specific contexts
      if (!['celebration', 'error', 'problem'].includes(context)) {
        this.scheduleRevert(10000); // 10 seconds
      }
    }
  }

  /**
   * Update activity level and potentially change theme
   */
  public updateActivityLevel(level: number): void {
    if (!this.state.activityResponsive) return;
    
    this.activityLevel = level;
    
    if (level > 0.8) {
      this.switchToContext('high-activity', level);
    } else if (level > 0.5) {
      this.switchToContext('active', level);
    } else if (level < 0.2) {
      this.switchToContext('calm', level);
    }
  }

  /**
   * Adapt theme based on time of day
   */
  private adaptToTimeOfDay(): void {
    if (!this.state.timeOfDayAdaptation) return;
    
    const hour = new Date().getHours();
    
    if (hour >= 22 || hour <= 6) { // Night time
      if (this.currentTheme.name !== 'Night Mode' && this.state.currentScheme === this.state.userPreferences.preferredScheme) {
        this.switchToTheme('night-mode');
      }
    } else if (this.currentTheme.name === 'Night Mode') {
      // Switch back to preferred theme during day
      this.switchToTheme(this.state.userPreferences.preferredScheme);
    }
  }

  /**
   * Start adaptive theme loop
   */
  private startAdaptiveLoop(): void {
    setInterval(() => {
      if (this.state.adaptiveMode) {
        this.adaptToTimeOfDay();
      }
    }, 60000); // Check every minute
  }

  /**
   * Schedule theme revert to default
   */
  private scheduleRevert(delay: number): void {
    if (this.contextTimer) {
      clearTimeout(this.contextTimer);
    }
    
    this.contextTimer = window.setTimeout(() => {
      if (this.state.adaptiveMode) {
        this.switchToTheme(this.state.userPreferences.preferredScheme);
      }
    }, delay);
  }

  /**
   * Trigger theme transition animation
   */
  private triggerThemeTransition(): void {
    if (!this.state.userPreferences.allowAnimations) return;

    document.body.classList.add('clippy-theme-transition');
    
    setTimeout(() => {
      document.body.classList.remove('clippy-theme-transition');
    }, 500);
  }

  /**
   * Get available themes
   */
  public getAvailableThemes(): ColorScheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): ColorScheme {
    return this.currentTheme;
  }

  /**
   * Add theme change observer
   */
  public onThemeChange(callback: (theme: ColorScheme) => void): void {
    this.observers.push(callback);
  }

  /**
   * Remove theme change observer
   */
  public removeThemeObserver(callback: (theme: ColorScheme) => void): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Create custom theme
   */
  public createCustomTheme(theme: ColorScheme): void {
    this.themes.set(theme.name.toLowerCase().replace(/\s+/g, '-'), theme);
    console.log(`🎨 Custom theme created: ${theme.name}`);
  }

  /**
   * Update theme state configuration
   */
  public updateState(newState: Partial<ThemeState>): void {
    this.state = { ...this.state, ...newState };
    
    if (newState.userPreferences?.preferredScheme && 
        newState.userPreferences.preferredScheme !== this.state.currentScheme) {
      this.switchToTheme(newState.userPreferences.preferredScheme);
    }
    
    console.log('🎨 Theme state updated:', newState);
  }

  /**
   * Get current state
   */
  public getState(): ThemeState {
    return { ...this.state };
  }

  /**
   * Generate theme CSS for external use
   */
  public generateThemeCSS(themeName: string): string {
    const theme = this.themes.get(themeName);
    if (!theme) return '';

    return `
      :root {
        --clippy-primary: ${theme.colors.primary};
        --clippy-secondary: ${theme.colors.secondary};
        --clippy-accent: ${theme.colors.accent};
        --clippy-background: ${theme.colors.background};
        --clippy-background-secondary: ${theme.colors.backgroundSecondary};
        --clippy-text: ${theme.colors.text};
        --clippy-text-muted: ${theme.colors.textMuted};
        --clippy-success: ${theme.colors.success};
        --clippy-warning: ${theme.colors.warning};
        --clippy-error: ${theme.colors.error};
        --clippy-glow: ${theme.colors.glow || theme.colors.primary};
        --clippy-particle: ${theme.colors.particle || theme.colors.accent};
        --clippy-animation-duration: ${theme.animations.duration};
        --clippy-animation-easing: ${theme.animations.easing};
        --clippy-glow-intensity: ${theme.animations.glowIntensity};
      }
      
      .clippy-theme-transition {
        transition: all var(--clippy-animation-duration) var(--clippy-animation-easing);
      }
    `;
  }

  /**
   * Export current configuration
   */
  public exportConfiguration(): object {
    return {
      themes: Object.fromEntries(this.themes),
      state: this.state,
      currentTheme: this.currentTheme.name
    };
  }

  /**
   * Import configuration
   */
  public importConfiguration(config: any): void {
    if (config.themes) {
      this.themes.clear();
      Object.entries(config.themes).forEach(([name, theme]) => {
        this.themes.set(name, theme as ColorScheme);
      });
    }
    
    if (config.state) {
      this.state = { ...this.state, ...config.state };
    }
    
    if (config.currentTheme) {
      this.switchToTheme(config.currentTheme);
    }
    
    console.log('🎨 Theme configuration imported');
  }

  /**
   * Reset to default configuration
   */
  public reset(): void {
    this.initializeThemes();
    this.switchToTheme('adaptive-default');
    
    this.state = {
      currentScheme: 'adaptive-default',
      adaptiveMode: true,
      contextualChanges: true,
      activityResponsive: true,
      timeOfDayAdaptation: true,
      userPreferences: {
        preferredScheme: 'adaptive-default',
        allowAnimations: true,
        glowEffects: true,
        particleEffects: true
      }
    };
    
    console.log('🎨 Theme manager reset to defaults');
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.contextTimer) {
      clearTimeout(this.contextTimer);
    }
    
    this.observers = [];
    
    // Remove theme classes
    document.body.classList.remove(...Array.from(document.body.classList).filter(c => c.startsWith('clippy-theme-')));
    
    console.log('🎨 Adaptive theme manager destroyed');
  }
}