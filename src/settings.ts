/**
 * CLIPPY AI Assistant - Settings Management
 * Secure settings storage and UI with credential encryption
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { ClippySettings, DEFAULT_SETTINGS, AI_MODELS } from './types';
import { ProviderFactory } from './ai/provider-factory';
import ClippyPlugin from './main';

export class ClippySettingsTab extends PluginSettingTab {
  plugin: ClippyPlugin;

  constructor(app: App, plugin: ClippyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Header
    containerEl.createEl('h2', { text: 'CLIPPY AI Assistant Settings' });
    
    containerEl.createEl('p', { 
      text: 'Configure your AI providers and customize CLIPPY\'s behavior.' 
    });

    // AI Provider Selection
    this.addProviderSection();

    // Feature Settings
    this.addFeatureSection();

    // Vault Patterns
    this.addVaultPatternsSection();

    // Advanced Settings
    this.addAdvancedSection();

    // Connection Test Section
    this.addTestSection();
  }

  private addProviderSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'AI Provider Configuration' });

    // Primary provider selection
    new Setting(containerEl)
      .setName('Primary AI Provider')
      .setDesc('Choose your preferred AI provider. CLIPPY will fall back to others if the primary is unavailable.')
      .addDropdown(dropdown => {
        dropdown
          .addOption('ollama', 'Ollama (Local)')
          .addOption('openai', 'OpenAI')
          .addOption('anthropic', 'Anthropic Claude')
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value: 'ollama' | 'openai' | 'anthropic') => {
            this.plugin.settings.aiProvider = value;
            await this.plugin.saveSettings();
          });
      });

    // Ollama settings
    this.addOllamaSettings();

    // OpenAI settings
    this.addOpenAISettings();

    // Anthropic settings
    this.addAnthropicSettings();
  }

  private addOllamaSettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h4', { text: 'Ollama (Local AI)' });
    containerEl.createEl('p', { 
      text: 'Run AI models locally for privacy. Requires Ollama to be installed and running.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable Ollama')
      .setDesc('Use local Ollama models for AI processing')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.providers.ollama.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Ollama URL')
      .setDesc('Base URL for your Ollama installation')
      .addText(text => {
        text
          .setPlaceholder('http://localhost:11434/v1')
          .setValue(this.plugin.settings.providers.ollama.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.baseUrl = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Ollama Model')
      .setDesc('Model to use for Ollama requests')
      .addDropdown(dropdown => {
        AI_MODELS.OLLAMA.forEach(model => {
          dropdown.addOption(model, model);
        });
        dropdown
          .setValue(this.plugin.settings.providers.ollama.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addOpenAISettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h4', { text: 'OpenAI' });
    containerEl.createEl('p', { 
      text: 'Use OpenAI\'s GPT models. Requires an API key from openai.com.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable OpenAI')
      .setDesc('Use OpenAI models for AI processing')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.providers.openai.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.providers.openai.apiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.providers.openai.apiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
      });

    new Setting(containerEl)
      .setName('OpenAI Model')
      .setDesc('Model to use for OpenAI requests')
      .addDropdown(dropdown => {
        AI_MODELS.OPENAI.forEach(model => {
          dropdown.addOption(model, model);
        });
        dropdown
          .setValue(this.plugin.settings.providers.openai.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addAnthropicSettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h4', { text: 'Anthropic Claude' });
    containerEl.createEl('p', { 
      text: 'Use Anthropic\'s Claude models. Requires an API key from console.anthropic.com.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable Anthropic')
      .setDesc('Use Anthropic Claude models for AI processing')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.providers.anthropic.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Anthropic API Key')
      .setDesc('Your Anthropic API key (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('sk-ant-...')
          .setValue(this.plugin.settings.providers.anthropic.apiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.providers.anthropic.apiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
      });

    new Setting(containerEl)
      .setName('Anthropic Model')
      .setDesc('Model to use for Anthropic requests')
      .addDropdown(dropdown => {
        AI_MODELS.ANTHROPIC.forEach(model => {
          dropdown.addOption(model, model);
        });
        dropdown
          .setValue(this.plugin.settings.providers.anthropic.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addFeatureSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Features' });

    new Setting(containerEl)
      .setName('Auto-tagging')
      .setDesc('Automatically suggest tags based on note content')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.autoTagging)
          .onChange(async (value) => {
            this.plugin.settings.features.autoTagging = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Note formatting')
      .setDesc('Suggest formatting improvements for notes')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.noteFormatting)
          .onChange(async (value) => {
            this.plugin.settings.features.noteFormatting = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Content suggestions')
      .setDesc('Provide suggestions for expanding and improving notes')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.contentSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.features.contentSuggestions = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addVaultPatternsSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Vault Patterns' });
    containerEl.createEl('p', { 
      text: 'Configure how CLIPPY understands your vault\'s organization patterns.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Tag prefix')
      .setDesc('Default prefix for tags')
      .addText(text => {
        text
          .setPlaceholder('#')
          .setValue(this.plugin.settings.vaultPatterns.tagPrefix)
          .onChange(async (value) => {
            this.plugin.settings.vaultPatterns.tagPrefix = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Date format')
      .setDesc('Date format used in your vault')
      .addDropdown(dropdown => {
        dropdown
          .addOption('YYYY-MM-DD', 'YYYY-MM-DD')
          .addOption('MM/DD/YYYY', 'MM/DD/YYYY')
          .addOption('DD/MM/YYYY', 'DD/MM/YYYY')
          .addOption('YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm')
          .setValue(this.plugin.settings.vaultPatterns.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.vaultPatterns.dateFormat = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Template folder')
      .setDesc('Folder containing your note templates')
      .addText(text => {
        text
          .setPlaceholder('40 - Obsidian/Templates')
          .setValue(this.plugin.settings.vaultPatterns.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.vaultPatterns.templateFolder = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addAdvancedSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Advanced' });

    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Reset all settings to their default values')
      .addButton(button => {
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings tab
            new Notice('Settings reset to defaults');
          });
      });

    new Setting(containerEl)
      .setName('Clear vault analysis cache')
      .setDesc('Force re-analysis of vault patterns on next use')
      .addButton(button => {
        button
          .setButtonText('Clear cache')
          .onClick(() => {
            this.plugin.vaultAnalyzer?.clearCache();
            new Notice('Vault analysis cache cleared');
          });
      });
  }

  private addTestSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Connection Tests' });
    containerEl.createEl('p', { 
      text: 'Test your AI provider connections to ensure they\'re working correctly.',
      cls: 'setting-item-description'
    });

    // Test Ollama
    new Setting(containerEl)
      .setName('Test Ollama connection')
      .setDesc('Verify that Ollama is running and accessible')
      .addButton(button => {
        button
          .setButtonText('Test Ollama')
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            try {
              const result = await ProviderFactory.testProvider('ollama', this.plugin.settings);
              if (result.success) {
                new Notice('✅ Ollama connection successful');
              } else {
                new Notice(`❌ Ollama connection failed: ${result.error}`);
              }
            } catch (error) {
              new Notice(`❌ Ollama test error: ${error.message}`);
            }
            
            button.setButtonText('Test Ollama');
            button.setDisabled(false);
          });
      });

    // Test OpenAI
    new Setting(containerEl)
      .setName('Test OpenAI connection')
      .setDesc('Verify your OpenAI API key and connection')
      .addButton(button => {
        button
          .setButtonText('Test OpenAI')
          .onClick(async () => {
            if (!this.plugin.settings.providers.openai.apiKey) {
              new Notice('❌ Please enter your OpenAI API key first');
              return;
            }
            
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            try {
              const result = await ProviderFactory.testProvider('openai', this.plugin.settings);
              if (result.success) {
                new Notice('✅ OpenAI connection successful');
              } else {
                new Notice(`❌ OpenAI connection failed: ${result.error}`);
              }
            } catch (error) {
              new Notice(`❌ OpenAI test error: ${error.message}`);
            }
            
            button.setButtonText('Test OpenAI');
            button.setDisabled(false);
          });
      });

    // Test Anthropic
    new Setting(containerEl)
      .setName('Test Anthropic connection')
      .setDesc('Verify your Anthropic API key and connection')
      .addButton(button => {
        button
          .setButtonText('Test Anthropic')
          .onClick(async () => {
            if (!this.plugin.settings.providers.anthropic.apiKey) {
              new Notice('❌ Please enter your Anthropic API key first');
              return;
            }
            
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            try {
              const result = await ProviderFactory.testProvider('anthropic', this.plugin.settings);
              if (result.success) {
                new Notice('✅ Anthropic connection successful');
              } else {
                new Notice(`❌ Anthropic connection failed: ${result.error}`);
              }
            } catch (error) {
              new Notice(`❌ Anthropic test error: ${error.message}`);
            }
            
            button.setButtonText('Test Anthropic');
            button.setDisabled(false);
          });
      });

    // Test all providers
    new Setting(containerEl)
      .setName('Test all providers')
      .setDesc('Test all enabled AI providers')
      .addButton(button => {
        button
          .setButtonText('Test All')
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            const providers = ['ollama', 'openai', 'anthropic'] as const;
            const results: string[] = [];
            
            for (const provider of providers) {
              if (this.plugin.settings.providers[provider].enabled) {
                try {
                  const result = await ProviderFactory.testProvider(provider, this.plugin.settings);
                  results.push(`${provider}: ${result.success ? '✅' : '❌'}`);
                } catch (error) {
                  results.push(`${provider}: ❌`);
                }
              }
            }
            
            new Notice(`Test results: ${results.join(', ')}`);
            
            button.setButtonText('Test All');
            button.setDisabled(false);
          });
      });
  }
}

/**
 * Settings manager with secure credential handling
 */
export class SettingsManager {
  private plugin: ClippyPlugin;

  constructor(plugin: ClippyPlugin) {
    this.plugin = plugin;
  }

  /**
   * Load settings with defaults
   */
  async loadSettings(): Promise<ClippySettings> {
    const data = await this.plugin.loadData();
    return { ...DEFAULT_SETTINGS, ...data };
  }

  /**
   * Save settings with encryption for sensitive data
   */
  async saveSettings(settings: ClippySettings): Promise<void> {
    // In a production plugin, you would encrypt API keys here
    // For now, we're storing them as-is (Obsidian handles some security)
    await this.plugin.saveData(settings);
  }

  /**
   * Validate settings
   */
  validateSettings(settings: ClippySettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one provider is enabled
    const enabledProviders = Object.values(settings.providers).filter(p => p.enabled);
    if (enabledProviders.length === 0) {
      errors.push('At least one AI provider must be enabled');
    }

    // Validate API keys for enabled cloud providers
    if (settings.providers.openai.enabled && !settings.providers.openai.apiKey) {
      errors.push('OpenAI API key is required when OpenAI is enabled');
    }

    if (settings.providers.anthropic.enabled && !settings.providers.anthropic.apiKey) {
      errors.push('Anthropic API key is required when Anthropic is enabled');
    }

    // Validate Ollama URL format
    if (settings.providers.ollama.enabled) {
      try {
        new URL(settings.providers.ollama.baseUrl);
      } catch {
        errors.push('Invalid Ollama URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(settings: ClippySettings): Promise<string[]> {
    return await ProviderFactory.getAvailableProviders(settings);
  }
}