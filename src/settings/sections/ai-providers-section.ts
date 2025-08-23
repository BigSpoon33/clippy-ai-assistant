/**
 * CLIPPY AI Assistant - AI Providers Settings Section
 * Handles AI provider configuration (Ollama, OpenAI, Anthropic)
 */

import { Setting } from 'obsidian';
import { ClippySettings } from '../../types';
import ClippyPlugin from '../../main';

export class AIProvidersSection {
  private plugin: ClippyPlugin;
  private containerEl: HTMLElement;

  constructor(plugin: ClippyPlugin, containerEl: HTMLElement) {
    this.plugin = plugin;
    this.containerEl = containerEl;
  }

  display(): void {
    this.containerEl.createEl('h3', { text: 'AI Provider Configuration' });

    // Primary provider selection
    new Setting(this.containerEl)
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

    // Individual provider settings
    this.addOllamaSettings();
    this.addOpenAISettings();
    this.addAnthropicSettings();
  }

  private addOllamaSettings(): void {
    this.containerEl.createEl('h4', { text: 'Ollama (Local AI)' });
    this.containerEl.createEl('p', { 
      text: 'Run AI models locally for privacy. Requires Ollama to be installed and running.',
      cls: 'setting-item-description'
    });

    new Setting(this.containerEl)
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

    new Setting(this.containerEl)
      .setName('Ollama Base URL')
      .setDesc('The URL where Ollama is running (default: http://localhost:11434)')
      .addText(text => {
        text
          .setPlaceholder('http://localhost:11434')
          .setValue(this.plugin.settings.providers.ollama.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.baseUrl = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(this.containerEl)
      .setName('Ollama Model')
      .setDesc('The model to use for text generation (e.g., llama2, mistral)')
      .addText(text => {
        text
          .setPlaceholder('llama2')
          .setValue(this.plugin.settings.providers.ollama.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.ollama.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addOpenAISettings(): void {
    this.containerEl.createEl('h4', { text: 'OpenAI' });
    this.containerEl.createEl('p', { 
      text: 'Use OpenAI models like GPT-4 for advanced AI capabilities.',
      cls: 'setting-item-description'
    });

    new Setting(this.containerEl)
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

    new Setting(this.containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.providers.openai.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    new Setting(this.containerEl)
      .setName('OpenAI Model')
      .setDesc('The OpenAI model to use')
      .addDropdown(dropdown => {
        dropdown
          .addOption('gpt-4', 'GPT-4')
          .addOption('gpt-4-turbo', 'GPT-4 Turbo')
          .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
          .setValue(this.plugin.settings.providers.openai.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.openai.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private addAnthropicSettings(): void {
    this.containerEl.createEl('h4', { text: 'Anthropic Claude' });
    this.containerEl.createEl('p', { 
      text: 'Use Anthropic Claude models for thoughtful AI assistance.',
      cls: 'setting-item-description'
    });

    new Setting(this.containerEl)
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

    new Setting(this.containerEl)
      .setName('Anthropic API Key')
      .setDesc('Your Anthropic API key (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('sk-ant-...')
          .setValue(this.plugin.settings.providers.anthropic.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    new Setting(this.containerEl)
      .setName('Anthropic Model')
      .setDesc('The Claude model to use')
      .addDropdown(dropdown => {
        dropdown
          .addOption('claude-3-sonnet-20240229', 'Claude 3 Sonnet')
          .addOption('claude-3-opus-20240229', 'Claude 3 Opus')
          .addOption('claude-3-haiku-20240307', 'Claude 3 Haiku')
          .setValue(this.plugin.settings.providers.anthropic.model)
          .onChange(async (value) => {
            this.plugin.settings.providers.anthropic.model = value;
            await this.plugin.saveSettings();
          });
      });
  }
}