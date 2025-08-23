/**
 * CLIPPY AI Assistant - Connection Tester Component
 * Reusable component for testing AI provider connections
 */

import { Setting, Notice } from 'obsidian';
import { ProviderFactory } from '../../ai/provider-factory';
import { ClippySettings } from '../../types';
import ClippyPlugin from '../../main';

export class ConnectionTester {
  private plugin: ClippyPlugin;

  constructor(plugin: ClippyPlugin) {
    this.plugin = plugin;
  }

  createConnectionTestSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Connection Tests' });
    
    containerEl.createEl('p', {
      text: 'Test your AI provider connections to ensure they\'re working correctly.',
      cls: 'setting-item-description'
    });

    // Test all providers
    new Setting(containerEl)
      .setName('Test All Providers')
      .setDesc('Test connections to all enabled AI providers')
      .addButton(button => {
        button
          .setButtonText('Test All')
          .setCta()
          .onClick(async () => {
            await this.testAllProviders();
          });
      });

    // Test individual providers
    this.createProviderTestButton(containerEl, 'ollama', 'Test Ollama');
    this.createProviderTestButton(containerEl, 'openai', 'Test OpenAI');
    this.createProviderTestButton(containerEl, 'anthropic', 'Test Anthropic');
  }

  private createProviderTestButton(
    containerEl: HTMLElement, 
    providerId: 'ollama' | 'openai' | 'anthropic',
    buttonText: string
  ): void {
    new Setting(containerEl)
      .setName(`${buttonText} Connection`)
      .setDesc(`Test connection to ${providerId} provider`)
      .addButton(button => {
        button
          .setButtonText(buttonText)
          .onClick(async () => {
            await this.testProvider(providerId);
          });
      });
  }

  private async testAllProviders(): Promise<void> {
    const notice = new Notice('Testing all AI providers...', 0);
    
    try {
      const providers = ['ollama', 'openai', 'anthropic'] as const;
      const results: { [key: string]: boolean } = {};

      for (const providerId of providers) {
        if (this.plugin.settings.providers[providerId].enabled) {
          results[providerId] = await this.testProvider(providerId, false);
        }
      }

      notice.hide();

      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;

      if (successCount === totalCount) {
        new Notice(`✅ All ${totalCount} enabled providers are working!`);
      } else {
        new Notice(`⚠️ ${successCount}/${totalCount} providers working. Check individual results above.`);
      }

    } catch (error) {
      notice.hide();
      new Notice(`❌ Error testing providers: ${error.message}`);
    }
  }

  private async testProvider(
    providerId: 'ollama' | 'openai' | 'anthropic',
    showNotice = true
  ): Promise<boolean> {
    if (!this.plugin.settings.providers[providerId].enabled) {
      if (showNotice) {
        new Notice(`⚠️ ${providerId} is not enabled`);
      }
      return false;
    }

    const notice = showNotice ? new Notice(`Testing ${providerId}...`, 0) : null;

    try {
      // Create a temporary settings object for testing
      const testSettings: ClippySettings = {
        ...this.plugin.settings,
        aiProvider: providerId
      };

      const provider = await ProviderFactory.createProvider(testSettings);
      const isAvailable = await provider.isAvailable();

      if (isAvailable) {
        // Try a simple test query
        const response = await provider.generateResponse(
          'Hello! Please respond with exactly "Connection test successful"',
          ''
        );

        const success = response.toLowerCase().includes('successful') || 
                       response.toLowerCase().includes('connection') ||
                       response.trim().length > 0;

        if (notice) notice.hide();

        if (success) {
          if (showNotice) {
            new Notice(`✅ ${providerId} connection successful!`);
          }
          return true;
        } else {
          if (showNotice) {
            new Notice(`⚠️ ${providerId} responded but may have issues`);
          }
          return false;
        }
      } else {
        if (notice) notice.hide();
        if (showNotice) {
          new Notice(`❌ ${providerId} is not available`);
        }
        return false;
      }

    } catch (error) {
      if (notice) notice.hide();
      if (showNotice) {
        new Notice(`❌ ${providerId} connection failed: ${error.message}`);
      }
      console.error(`CLIPPY: ${providerId} connection test failed:`, error);
      return false;
    }
  }
}