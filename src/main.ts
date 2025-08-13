/**
 * CLIPPY AI Assistant - Main Plugin Class
 * Entry point for the Obsidian plugin with lifecycle management
 */

import { Plugin, Notice, MarkdownView } from 'obsidian';
import { ClippySettings, DEFAULT_SETTINGS } from './types';
import { ClippySettingsTab, SettingsManager } from './settings';
import { CommandHandlers } from './ui/command-handlers';
import { VaultAnalyzer } from './utils/vault-analyzer';
import { ProviderFactory } from './ai/provider-factory';

export default class ClippyPlugin extends Plugin {
  settings: ClippySettings;
  settingsManager: SettingsManager;
  commandHandlers: CommandHandlers;
  vaultAnalyzer: VaultAnalyzer;

  async onload() {
    console.log('CLIPPY AI Assistant: Loading plugin...');

    try {
      // Initialize settings manager
      this.settingsManager = new SettingsManager(this);
      
      // Load settings
      this.settings = await this.settingsManager.loadSettings();
      
      // Validate settings
      const validation = this.settingsManager.validateSettings(this.settings);
      if (!validation.valid) {
        console.warn('CLIPPY: Settings validation issues:', validation.errors);
        // Show warning but continue loading
        new Notice(`CLIPPY: ${validation.errors[0]}`, 5000);
      }

      // Initialize vault analyzer
      this.vaultAnalyzer = new VaultAnalyzer(this.app);

      // Initialize command handlers
      this.commandHandlers = new CommandHandlers(this);
      this.commandHandlers.registerCommands();

      // Add settings tab
      this.addSettingTab(new ClippySettingsTab(this.app, this));

      // Add ribbon icon
      this.addRibbonIcon('sparkles', 'CLIPPY AI Assistant', async () => {
        // Quick access to enhance note command
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          // Execute the enhance note command directly
          this.commandHandlers.handleEnhanceNote(activeView.editor, activeView);
        } else {
          new Notice('Open a note to use CLIPPY');
        }
      });

      // Analyze vault patterns on startup (in background)
      this.scheduleVaultAnalysis();

      // Register events
      this.registerEvents();

      console.log('CLIPPY AI Assistant: Plugin loaded successfully');
      
      // Show welcome notice on first load
      if (this.isFirstLoad()) {
        this.showWelcomeMessage();
      }

    } catch (error) {
      console.error('CLIPPY AI Assistant: Failed to load plugin:', error);
      new Notice(`CLIPPY: Failed to load plugin: ${error.message}`, 0);
    }
  }

  async onunload() {
    console.log('CLIPPY AI Assistant: Unloading plugin...');
    
    // Clear any caches
    ProviderFactory.clearCache();
    this.vaultAnalyzer?.clearCache();
    
    console.log('CLIPPY AI Assistant: Plugin unloaded');
  }

  /**
   * Schedule vault analysis in the background
   */
  private async scheduleVaultAnalysis(): Promise<void> {
    // Wait a bit after plugin load to avoid blocking startup
    setTimeout(async () => {
      try {
        console.log('CLIPPY: Starting background vault analysis...');
        await this.vaultAnalyzer.analyzeVaultPatterns();
        console.log('CLIPPY: Vault analysis completed');
      } catch (error) {
        console.warn('CLIPPY: Background vault analysis failed:', error);
      }
    }, 5000); // 5 second delay
  }

  /**
   * Register event listeners
   */
  private registerEvents(): void {
    // Re-analyze vault when files are created/modified/deleted
    this.registerEvent(
      this.app.vault.on('create', () => {
        this.debouncedVaultAnalysis();
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', () => {
        this.debouncedVaultAnalysis();
      })
    );

    this.registerEvent(
      this.app.vault.on('modify', () => {
        this.debouncedVaultAnalysis();
      })
    );

    // Clear provider cache when settings change
    this.registerEvent(
      this.app.workspace.on('file-open', () => {
        // Could be used for context-aware suggestions in the future
      })
    );
  }

  private vaultAnalysisTimeout: NodeJS.Timeout | null = null;

  /**
   * Debounced vault analysis to avoid excessive re-analysis
   */
  private debouncedVaultAnalysis(): void {
    if (this.vaultAnalysisTimeout) {
      clearTimeout(this.vaultAnalysisTimeout);
    }

    this.vaultAnalysisTimeout = setTimeout(async () => {
      try {
        await this.vaultAnalyzer.analyzeVaultPatterns(true);
      } catch (error) {
        console.warn('CLIPPY: Debounced vault analysis failed:', error);
      }
    }, 30000); // 30 second delay
  }

  /**
   * Save settings with validation
   */
  async saveSettings(): Promise<void> {
    try {
      // Validate before saving
      const validation = this.settingsManager.validateSettings(this.settings);
      if (!validation.valid) {
        console.warn('CLIPPY: Settings validation failed:', validation.errors);
        // Show error but still save (user might be in the middle of configuration)
        new Notice(`CLIPPY: ${validation.errors[0]}`, 3000);
      }

      await this.settingsManager.saveSettings(this.settings);
      
      // Clear provider cache when settings change
      ProviderFactory.clearCache();
      
      console.log('CLIPPY: Settings saved successfully');
    } catch (error) {
      console.error('CLIPPY: Failed to save settings:', error);
      new Notice(`CLIPPY: Failed to save settings: ${error.message}`);
    }
  }

  /**
   * Load settings with fallback to defaults
   */
  async loadSettings(): Promise<ClippySettings> {
    try {
      return await this.settingsManager.loadSettings();
    } catch (error) {
      console.error('CLIPPY: Failed to load settings, using defaults:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Check if this is the first time the plugin is loaded
   */
  private isFirstLoad(): boolean {
    return !this.settings.vaultPatterns.templateFolder || 
           this.settings.vaultPatterns.templateFolder === DEFAULT_SETTINGS.vaultPatterns.templateFolder;
  }

  /**
   * Show welcome message to new users
   */
  private showWelcomeMessage(): void {
    const message = `🤖 Welcome to CLIPPY AI Assistant!

To get started:
1. Configure your AI provider in Settings
2. Try the "Enhance current note" command
3. Use Ctrl+Shift+T for quick tagging

Check the command palette for all CLIPPY features!`;

    new Notice(message, 10000);
  }

  /**
   * Get AI provider instance
   */
  async getAIProvider() {
    try {
      return await ProviderFactory.createProvider(this.settings);
    } catch (error) {
      console.error('CLIPPY: Failed to get AI provider:', error);
      throw new Error(`No AI provider available: ${error.message}`);
    }
  }

  /**
   * Get available AI providers
   */
  async getAvailableProviders(): Promise<string[]> {
    try {
      return await ProviderFactory.getAvailableProviders(this.settings);
    } catch (error) {
      console.error('CLIPPY: Failed to get available providers:', error);
      return [];
    }
  }

  /**
   * Force refresh of vault patterns
   */
  async refreshVaultPatterns(): Promise<void> {
    try {
      await this.vaultAnalyzer.analyzeVaultPatterns(true);
      new Notice('CLIPPY: Vault patterns refreshed');
    } catch (error) {
      console.error('CLIPPY: Failed to refresh vault patterns:', error);
      new Notice(`CLIPPY: Failed to refresh patterns: ${error.message}`);
    }
  }

  /**
   * Get plugin status for debugging
   */
  getStatus(): {
    loaded: boolean;
    settingsValid: boolean;
    vaultAnalyzed: boolean;
    availableProviders: Promise<string[]>;
  } {
    const validation = this.settingsManager.validateSettings(this.settings);
    
    return {
      loaded: true,
      settingsValid: validation.valid,
      vaultAnalyzed: this.vaultAnalyzer ? true : false,
      availableProviders: this.getAvailableProviders(),
    };
  }

  /**
   * Emergency reset for debugging
   */
  async emergencyReset(): Promise<void> {
    try {
      console.log('CLIPPY: Performing emergency reset...');
      
      // Reset settings to defaults
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
      
      // Clear all caches
      ProviderFactory.clearCache();
      this.vaultAnalyzer?.clearCache();
      
      // Re-analyze vault
      await this.scheduleVaultAnalysis();
      
      new Notice('CLIPPY: Emergency reset completed');
      console.log('CLIPPY: Emergency reset completed successfully');
    } catch (error) {
      console.error('CLIPPY: Emergency reset failed:', error);
      new Notice(`CLIPPY: Reset failed: ${error.message}`);
    }
  }
}

// Export for use in other files
export { ClippyPlugin };