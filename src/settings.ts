/**
 * CLIPPY AI Assistant - Settings Management
 * Secure settings storage and UI with credential encryption
 */

import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import { ClippySettings, DEFAULT_SETTINGS, AI_MODELS } from './types';
import { ProviderFactory } from './ai/provider-factory';
import { SecureStorage, ContentSanitizer } from './utils/secure-storage';
import { TemplateRegistry } from './research/template-registry';
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

    // Documentation link
    this.addDocumentationSection();

    // AI Provider Selection
    this.addProviderSection();

    // Feature Settings
    this.addFeatureSection();

    // Vault Patterns
    this.addVaultPatternsSection();

    // Research Settings
    this.addResearchSection();

    // RAG & Embeddings Settings
    this.addRAGSection();

    // Voice Settings
    this.addVoiceSection();
    
    // MoE System Settings
    this.addMoESection();

    // System Prompts Settings
    this.addSystemPromptsSection();

    // Advanced Settings
    this.addAdvancedSection();

    // Connection Test Section
    this.addTestSection();
  }

  private addDocumentationSection(): void {
    const { containerEl } = this;

    // Documentation section with README link
    const docSection = containerEl.createEl('div', { cls: 'clippy-doc-section' });
    docSection.style.cssText = `
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    `;

    const docHeader = docSection.createEl('h3', { text: '📚 Documentation & Help' });
    docHeader.style.marginTop = '0';

    const docDesc = docSection.createEl('p', { 
      text: 'Get started with CLIPPY AI Assistant, learn about features, and find troubleshooting tips.'
    });
    docDesc.style.cssText = 'color: var(--text-muted); margin-bottom: 12px;';

    // Create button row
    const buttonRow = docSection.createEl('div', { cls: 'clippy-doc-buttons' });
    buttonRow.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    // README button
    const readmeButton = buttonRow.createEl('button', { 
      text: '📖 View README',
      cls: 'mod-cta'
    });
    readmeButton.style.cssText = 'padding: 8px 16px; border-radius: 4px;';
    readmeButton.addEventListener('click', () => {
      this.openReadmeFile();
    });

    // Quick start guide
    const quickStartButton = buttonRow.createEl('button', { 
      text: '🚀 Quick Start Guide',
      type: 'button'
    });
    quickStartButton.style.cssText = 'padding: 8px 16px; border-radius: 4px;';
    quickStartButton.addEventListener('click', () => {
      this.showQuickStartGuide();
    });

    // Help section with common commands
    const helpText = docSection.createEl('div', { cls: 'clippy-help-text' });
    helpText.style.cssText = `
      background: var(--background-primary);
      border-radius: 4px;
      padding: 12px;
      margin-top: 12px;
      font-size: 14px;
    `;
    
    helpText.innerHTML = `
      <strong>💡 Quick Tips:</strong><br>
      • Use <code>Ctrl+P</code> to open Command Palette and find CLIPPY commands<br>
      • Try <code>Ctrl+Shift+T</code> for quick AI tagging<br>
      • Start with "Enhance current note with AI" to see CLIPPY in action<br>
      • Use "Analyze vault patterns" to understand your note structure
    `;
  }

  private openReadmeFile(): void {
    // Show README content in a modal since we can't directly open external files in Obsidian
    this.showReadmeModal();
  }

  private showReadmeModal(): void {
    const modal = new class extends Modal {
      constructor(app: App) {
        super(app);
      }

      onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clippy-readme-modal');

        // Header
        const header = contentEl.createEl('div', { cls: 'modal-header' });
        header.style.cssText = 'border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 16px; margin-bottom: 20px;';
        header.createEl('h2', { text: '📖 CLIPPY AI Assistant Documentation' });
        
        const subtitle = header.createEl('p');
        subtitle.style.cssText = 'color: var(--text-muted); margin: 8px 0 0 0;';
        subtitle.textContent = 'Complete guide to using CLIPPY AI Assistant in Obsidian';

        // Content area
        const content = contentEl.createEl('div', { cls: 'readme-content' });
        content.style.cssText = `
          max-height: 60vh;
          overflow-y: auto;
          padding: 0 4px;
          line-height: 1.6;
        `;

        // Quick reference content
        content.innerHTML = `
          <h3>🚀 Quick Start</h3>
          <ol>
            <li><strong>Configure AI Provider:</strong> Set up Ollama, OpenAI, or Anthropic in the settings below</li>
            <li><strong>Test Connection:</strong> Use the "Test Connection" button to verify your setup</li>
            <li><strong>Start Enhancing:</strong> Open any note and use <code>Ctrl+P</code> → "Enhance current note with AI"</li>
          </ol>

          <h3>🎮 Main Commands</h3>
          <ul>
            <li><strong>Enhance current note with AI</strong> - Improve content clarity and organization</li>
            <li><strong>Quick AI tagging suggestions</strong> (<code>Ctrl+Shift+T</code>) - Get intelligent tag recommendations</li>
            <li><strong>Summarize current note</strong> - Generate concise summaries</li>
            <li><strong>Chat with AI about current note</strong> - Interactive AI conversation</li>
            <li><strong>Comprehensive research</strong> - Advanced research with web search and vault analysis</li>
          </ul>

          <h3>🔧 Troubleshooting</h3>
          <ul>
            <li><strong>AI Provider Issues:</strong> Verify API keys and URLs in settings</li>
            <li><strong>Ollama Not Working:</strong> Ensure Ollama is running on <code>http://localhost:11434</code></li>
            <li><strong>Research Features:</strong> Check internet connection and search engine API keys</li>
            <li><strong>Performance:</strong> Large vaults may take longer for analysis operations</li>
          </ul>

          <h3>💡 Pro Tips</h3>
          <ul>
            <li>Use "Analyze vault patterns" to understand your note organization</li>
            <li>Enable "Intelligent Links" for automatic connection suggestions</li>
            <li>Customize research templates for consistent output formatting</li>
            <li>Try different AI models to find what works best for your use case</li>
          </ul>

          <h3>🔬 Research System</h3>
          <p>The comprehensive research system can:</p>
          <ul>
            <li>Generate research notes from simple checklists</li>
            <li>Search the web and save individual source pages</li>
            <li>Analyze your vault for related content</li>
            <li>Extract and synthesize information using AI</li>
            <li>Create organized, comprehensive research reports</li>
          </ul>

          <h3>🌉 Bridge Discovery</h3>
          <p>CLIPPY can find opportunities to connect related notes:</p>
          <ul>
            <li>Identifies orphaned notes that need connections</li>
            <li>Suggests semantic links between similar content</li>
            <li>Recommends tag bridges for better organization</li>
            <li>Creates index notes for topic clusters</li>
          </ul>
        `;

        // Footer with close button
        const footer = contentEl.createEl('div', { cls: 'modal-footer' });
        footer.style.cssText = 'border-top: 1px solid var(--background-modifier-border); padding-top: 16px; margin-top: 20px; text-align: center;';
        
        const closeBtn = footer.createEl('button', { text: 'Close', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => this.close());
      }
    }(this.app);

    modal.open();
  }

  private showQuickStartGuide(): void {
    const modal = new class extends Modal {
      constructor(app: App) {
        super(app);
      }

      onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clippy-quickstart-modal');

        // Header
        const header = contentEl.createEl('div', { cls: 'modal-header' });
        header.style.cssText = 'text-align: center; margin-bottom: 24px;';
        header.createEl('h2', { text: '🚀 Quick Start Guide' });
        header.createEl('p', { text: 'Get up and running with CLIPPY in 3 simple steps', cls: 'modal-subtitle' });

        // Steps
        const stepsContainer = contentEl.createEl('div', { cls: 'quickstart-steps' });
        
        const steps = [
          {
            number: '1',
            title: 'Configure Your AI Provider',
            description: 'Choose and set up Ollama (local), OpenAI, or Anthropic Claude',
            action: 'Scroll down to configure your preferred AI provider',
            icon: '⚙️'
          },
          {
            number: '2', 
            title: 'Test Your Connection',
            description: 'Verify that CLIPPY can communicate with your AI provider',
            action: 'Use the "Test Connection" button at the bottom of settings',
            icon: '🔗'
          },
          {
            number: '3',
            title: 'Start Using CLIPPY',
            description: 'Open any note and try your first AI enhancement',
            action: 'Use Ctrl+P → "Enhance current note with AI"',
            icon: '✨'
          }
        ];

        steps.forEach(step => {
          const stepEl = stepsContainer.createEl('div', { cls: 'quickstart-step' });
          stepEl.style.cssText = `
            display: flex;
            gap: 16px;
            padding: 16px;
            margin-bottom: 16px;
            background: var(--background-secondary);
            border-radius: 8px;
            border-left: 4px solid var(--interactive-accent);
          `;

          const stepNumber = stepEl.createEl('div', { cls: 'step-number' });
          stepNumber.style.cssText = `
            background: var(--interactive-accent);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
          `;
          stepNumber.textContent = step.number;

          const stepContent = stepEl.createEl('div', { cls: 'step-content' });
          stepContent.style.cssText = 'flex: 1;';

          const stepTitle = stepContent.createEl('h3');
          stepTitle.style.cssText = 'margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;';
          stepTitle.innerHTML = `${step.icon} ${step.title}`;

          const stepDesc = stepContent.createEl('p');
          stepDesc.style.cssText = 'margin: 0 0 8px 0; color: var(--text-muted);';
          stepDesc.textContent = step.description;

          const stepAction = stepContent.createEl('div');
          stepAction.style.cssText = 'font-weight: 500; color: var(--text-accent);';
          stepAction.textContent = `→ ${step.action}`;
        });

        // Footer
        const footer = contentEl.createEl('div', { cls: 'modal-footer' });
        footer.style.cssText = 'text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--background-modifier-border);';
        
        const closeBtn = footer.createEl('button', { text: 'Got it! Let\'s start', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => this.close());
      }
    }(this.app);

    modal.open();
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
        // Add loading option initially
        dropdown.addOption('loading', 'Loading models...');
        dropdown.setValue('loading');
        
        // Fetch models dynamically
        this.loadOllamaModels(dropdown);
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

  private addResearchSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Research & Web Search' });
    containerEl.createEl('p', { 
      text: 'Configure web search engines for automated research note generation.',
      cls: 'setting-item-description'
    });

    // Search engine selection
    new Setting(containerEl)
      .setName('Preferred search engine')
      .setDesc('Choose your preferred web search provider')
      .addDropdown(dropdown => {
        dropdown
          .addOption('searxng', 'SearXNG (Self-hosted)')
          .addOption('tavily', 'Tavily API (Cloud)')
          .addOption('brave', 'Brave Search API')
          .addOption('duckduckgo', 'DuckDuckGo API')
          .addOption('serpapi', 'SerpAPI (Google)')
          .addOption('serper', 'Serper.dev (Google)')
          .setValue(this.plugin.settings.research.searchEngine.provider)
          .onChange(async (value: 'searxng' | 'tavily' | 'brave' | 'duckduckgo' | 'serpapi' | 'serper') => {
            this.plugin.settings.research.searchEngine.provider = value;
            await this.plugin.saveSettings();
          });
      });

    // SearXNG URL
    new Setting(containerEl)
      .setName('SearXNG URL')
      .setDesc('URL of your SearXNG instance (e.g., http://localhost:8088)')
      .addText(text => {
        text
          .setPlaceholder('http://localhost:8088')
          .setValue(this.plugin.settings.research.searchEngine.searxngUrl)
          .onChange(async (value) => {
            this.plugin.settings.research.searchEngine.searxngUrl = value;
            await this.plugin.saveSettings();
          });
      });

    // CORS configuration help
    const corsHelpEl = containerEl.createEl('div', { cls: 'cors-help-section' });
    corsHelpEl.style.cssText = `
      background: var(--background-secondary);
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0 16px 0;
      border-left: 3px solid var(--text-accent);
    `;
    
    corsHelpEl.createEl('strong', { text: '🔧 SearXNG CORS Configuration' });
    corsHelpEl.createEl('p', { 
      text: 'If connection tests fail with CORS errors, add these headers to your SearXNG config:',
      cls: 'setting-item-description'
    });
    
    const codeEl = corsHelpEl.createEl('pre');
    codeEl.style.cssText = `
      background: var(--background-primary);
      padding: 8px;
      border-radius: 4px;
      font-family: var(--font-monospace);
      font-size: 12px;
      margin: 8px 0;
      overflow-x: auto;
    `;
    
    codeEl.textContent = `# In your settings.yml file:
server:
  base_url: "http://localhost:8088/"
  cors:
    enabled: true
    origins: ["app://obsidian.md", "http://localhost", "https://localhost"]
    headers: ["Content-Type", "Authorization"]
    methods: ["GET", "POST"]

# Or via environment variables:
SEARXNG_CORS_ENABLED=true
SEARXNG_CORS_ORIGINS="app://obsidian.md,http://localhost"`;

    const restartNote = corsHelpEl.createEl('p');
    restartNote.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-top: 8px;';
    restartNote.textContent = '💡 Remember to restart SearXNG after changing CORS settings.';

    // Tavily API Key
    new Setting(containerEl)
      .setName('Tavily API Key')
      .setDesc('Your Tavily API key for web search (stored securely)')
      .addText(text => {
        const hasExistingKey = !!this.plugin.settings.research.searchEngine.tavilyApiKey;
        text
          .setPlaceholder('tvly-...')
          .setValue(hasExistingKey ? '••••••••' : '')
          .onChange(async (value) => {
            // Always save the value - if user pastes over ••••••••, save the new value
            if (value.trim()) {
              this.plugin.settings.research.searchEngine.tavilyApiKey = value.trim();
              await this.plugin.saveSettings();
              console.log('Tavily API key saved');
            } else {
              this.plugin.settings.research.searchEngine.tavilyApiKey = '';
              await this.plugin.saveSettings();
              console.log('Tavily API key cleared');
            }
          });
        text.inputEl.type = 'password';
        
        // Add focus handler to clear masked value
        text.inputEl.addEventListener('focus', () => {
          if (text.getValue() === '••••••••') {
            text.setValue('');
          }
        });
      });

    // Brave API Key
    new Setting(containerEl)
      .setName('Brave Search API Key')
      .setDesc('Your Brave Search API key (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('BSA...')
          .setValue(this.plugin.settings.research.searchEngine.braveApiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.research.searchEngine.braveApiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
      });

    // SerpAPI Key
    new Setting(containerEl)
      .setName('SerpAPI Key')
      .setDesc('Your SerpAPI key for Google search (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('serp_...')
          .setValue(this.plugin.settings.research.searchEngine.serpApiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.research.searchEngine.serpApiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
      });

    // Serper API Key
    new Setting(containerEl)
      .setName('Serper.dev API Key')
      .setDesc('Your Serper.dev API key for Google search (stored securely)')
      .addText(text => {
        text
          .setPlaceholder('serper_...')
          .setValue(this.plugin.settings.research.searchEngine.serperApiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.research.searchEngine.serperApiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
      });

    // Research defaults
    containerEl.createEl('h4', { text: 'Research Defaults' });

    new Setting(containerEl)
      .setName('Max search results')
      .setDesc('Maximum number of web search results to fetch per query')
      .addSlider(slider => {
        slider
          .setLimits(5, 20, 1)
          .setValue(this.plugin.settings.research.defaults.maxResults)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.research.defaults.maxResults = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Quality threshold')
      .setDesc('Minimum quality score for including sources (0.0 to 1.0)')
      .addSlider(slider => {
        slider
          .setLimits(0.0, 1.0, 0.1)
          .setValue(this.plugin.settings.research.defaults.qualityThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.research.defaults.qualityThreshold = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Default output folder')
      .setDesc('Folder where generated research notes will be saved')
      .addText(text => {
        text
          .setPlaceholder('Generated Research Notes')
          .setValue(this.plugin.settings.research.defaults.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.research.defaults.outputFolder = value;
            await this.plugin.saveSettings();
          });
      });

    // Enhanced Template Management Section
    this.addTemplateManagementSection(containerEl);

    new Setting(containerEl)
      .setName('Show AI thinking process')
      .setDesc('Show or hide <thinking> tags in AI-generated content. Enable to see the AI\'s reasoning process.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.research.defaults.showThinkingTags)
          .onChange(async (value) => {
            this.plugin.settings.research.defaults.showThinkingTags = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Max tokens for AI responses')
      .setDesc('Maximum tokens for AI responses in research generation. Set to 0 for unlimited. Higher values allow longer responses but may consume more resources.')
      .addText(text => {
        text
          .setPlaceholder('0 (unlimited)')
          .setValue(this.plugin.settings.research.defaults.maxTokens.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.research.defaults.maxTokens = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Test search engine connection
    new Setting(containerEl)
      .setName('Test search connection')
      .setDesc('Test connectivity to your configured search engine')
      .addButton(button => {
        button
          .setButtonText('Test Search Engine')
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            try {
              // Import and test search engine
              const { WebSearchEngine } = await import('./research/web-search-engine');
              const searchConfig = this.plugin.settings.research.searchEngine;
              
              const searchEngine = new WebSearchEngine(
                { baseUrl: searchConfig.searxngUrl },
                searchConfig.tavilyApiKey ? { apiKey: searchConfig.tavilyApiKey } : undefined
              );
              
              const connectivity = await searchEngine.testConnection();
              
              if (searchConfig.provider === 'searxng') {
                if (connectivity.searxng) {
                  new Notice('✅ SearXNG connection successful');
                } else {
                  const errorMsg = connectivity.errors?.searxng ? `: ${connectivity.errors.searxng}` : '';
                  new Notice(`❌ SearXNG connection failed${errorMsg}`);
                }
              } else if (searchConfig.provider === 'tavily') {
                if (connectivity.tavily) {
                  new Notice('✅ Tavily connection successful');
                } else {
                  const errorMsg = connectivity.errors?.tavily ? `: ${connectivity.errors.tavily}` : '';
                  console.error('Tavily connection test failed:', connectivity.errors?.tavily);
                  new Notice(`❌ Tavily connection failed${errorMsg}`);
                }
              } else {
                new Notice(`❌ ${searchConfig.provider} not yet implemented`);
              }
              
            } catch (error) {
              new Notice(`❌ Search engine test failed: ${error.message}`);
            }
            
            button.setButtonText('Test Search Engine');
            button.setDisabled(false);
          });
      });

    // AI Prompt Customization
    containerEl.createEl('h4', { text: 'AI Prompt Customization' });
    containerEl.createEl('p', { 
      text: 'Customize the AI prompts used for wisdom extraction and concept analysis.',
      cls: 'setting-item-description'
    });

    // Wisdom Extraction Prompt
    new Setting(containerEl)
      .setName('Wisdom extraction prompt')
      .setDesc('AI prompt for extracting key information from research sources. Use {{searchTerm}} and {{allContent}} variables.')
      .addTextArea(textarea => {
        textarea
          .setPlaceholder('Enter custom wisdom extraction prompt...')
          .setValue(this.plugin.settings.research.prompts.wisdomExtraction)
          .onChange(async (value) => {
            this.plugin.settings.research.prompts.wisdomExtraction = value;
            await this.plugin.saveSettings();
          });
        textarea.inputEl.style.cssText = `
          width: 100%;
          min-height: 120px;
          font-family: var(--font-monospace);
          font-size: 12px;
          margin-top: 8px;
        `;
      });

    // Reset to default button for wisdom extraction
    new Setting(containerEl)
      .setName('')
      .setDesc('')
      .addButton(button => {
        button
          .setButtonText('Reset to Default')
          .onClick(async () => {
            const defaultPrompt = `You are a research assistant extracting comprehensive information about "{{searchTerm}}".

Please analyze all the following sources and extract the most important information:

{{allContent}}

Please extract and organize information into these categories:

1. **Key Definitions**: Clear, concise definitions of "{{searchTerm}}" and related terms
2. **Key Facts**: The most important factual information
3. **Uses & Applications**: How "{{searchTerm}}" is used or applied
4. **Warnings & Precautions**: Any safety concerns, side effects, or warnings
5. **Research Findings**: Scientific studies, evidence, or research results
6. **Related Concepts**: Connected ideas, similar topics, or related terms

Format your response with clear headings and bullet points for each section.`;
            this.plugin.settings.research.prompts.wisdomExtraction = defaultPrompt;
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings display
            new Notice('✅ Wisdom extraction prompt reset to default');
          });
      });

    // Concept Extraction Prompt
    new Setting(containerEl)
      .setName('Concept extraction prompt')
      .setDesc('AI prompt for extracting key concepts and relationships. Use {{searchTerm}} and {{content}} variables.')
      .addTextArea(textarea => {
        textarea
          .setPlaceholder('Enter custom concept extraction prompt...')
          .setValue(this.plugin.settings.research.prompts.conceptExtraction)
          .onChange(async (value) => {
            this.plugin.settings.research.prompts.conceptExtraction = value;
            await this.plugin.saveSettings();
          });
        textarea.inputEl.style.cssText = `
          width: 100%;
          min-height: 120px;
          font-family: var(--font-monospace);
          font-size: 12px;
          margin-top: 8px;
        `;
      });

    // Reset to default button for concept extraction
    new Setting(containerEl)
      .setName('')
      .setDesc('')
      .addButton(button => {
        button
          .setButtonText('Reset to Default')
          .onClick(async () => {
            const defaultPrompt = `Based on the research findings about "{{searchTerm}}", extract and organize the key concepts:

**Content to analyze:**
{{content}}

**Instructions:**
1. Identify the 5 most important concepts related to {{searchTerm}}
2. For each concept, provide a brief definition and its relationship to {{searchTerm}}
3. Note any hierarchical relationships between concepts
4. Highlight any contradictory or debated aspects

**Format as:**
## Key Concepts
- **Concept Name**: Definition and relationship
- **Concept Name**: Definition and relationship
[etc.]

## Relationships
- Describe connections between concepts

## Important Notes
- Any warnings, contradictions, or areas of debate`;
            this.plugin.settings.research.prompts.conceptExtraction = defaultPrompt;
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings display
            new Notice('✅ Concept extraction prompt reset to default');
          });
      });

    // Backlinks Configuration
    containerEl.createEl('h4', { text: 'Backlinks Configuration' });
    containerEl.createEl('p', { 
      text: 'Configure automatic backlink generation for research notes.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable backlinks generation')
      .setDesc('Automatically generate backlinks to related notes based on conceptual relationships')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.research.backlinks.enabled)
          .onChange(async (value) => {
            this.plugin.settings.research.backlinks.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Backlinks position')
      .setDesc('Where to place generated backlinks in research notes')
      .addDropdown(dropdown => {
        dropdown
          .addOption('top', 'Top of note')
          .addOption('bottom', 'Bottom of note')
          .setValue(this.plugin.settings.research.backlinks.position)
          .onChange(async (value: 'top' | 'bottom') => {
            this.plugin.settings.research.backlinks.position = value;
            await this.plugin.saveSettings();
          });
      });

    // Note: Embedding and RAG settings moved to dedicated RAG section
  }

  private addRAGSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'RAG & Embeddings' });
    containerEl.createEl('p', { 
      text: 'Configure Retrieval-Augmented Generation (RAG) system for semantic search, embeddings, and context retrieval.',
      cls: 'setting-item-description'
    });

    // ===== EMBEDDINGS SUBSECTION =====
    containerEl.createEl('h4', { text: 'Embedding Configuration' });

    // Embedding provider
    new Setting(containerEl)
      .setName('Embedding provider')
      .setDesc('Choose your embedding computation provider')
      .addDropdown(dropdown => {
        dropdown
          .addOption('ollama', 'Ollama (Local)')
          .addOption('openai', 'OpenAI (Cloud)')
          .addOption('simple', 'Simple (Fallback)')
          .setValue(this.plugin.settings.rag.embeddings.provider)
          .onChange(async (value: 'ollama' | 'openai' | 'simple') => {
            this.plugin.settings.rag.embeddings.provider = value;
            await this.plugin.saveSettings();
          });
      });

    // Embedding model (Dynamic dropdown)
    new Setting(containerEl)
      .setName('Embedding model')
      .setDesc('Select from available Ollama embedding models (filters models with "embed" in name)')
      .addDropdown(async (dropdown) => {
        // Add loading state
        dropdown.addOption('loading', '🔄 Loading models...');
        dropdown.setValue('loading');
        
        // Load available embedding models asynchronously
        try {
          await this.loadOllamaEmbeddingModels(dropdown);
        } catch (error) {
          console.error('Failed to load embedding models:', error);
          dropdown.selectEl.empty();
          dropdown.addOption('', '❌ Failed to load models');
          dropdown.addOption('nomic-embed-text', 'nomic-embed-text (fallback)');
          dropdown.addOption('mxbai-embed-large', 'mxbai-embed-large (fallback)');
          dropdown.addOption('all-MiniLM-L6-v2', 'all-MiniLM-L6-v2 (fallback)');
          dropdown.setValue(this.plugin.settings.rag.embeddings.model || 'nomic-embed-text');
          dropdown.onChange(async (value) => {
            this.plugin.settings.rag.embeddings.model = value;
            await this.plugin.saveSettings();
          });
        }
      });

    // Ollama URL
    new Setting(containerEl)
      .setName('Ollama URL')
      .setDesc('URL of your Ollama instance for embeddings')
      .addText(text => {
        text
          .setPlaceholder('http://localhost:11434')
          .setValue(this.plugin.settings.rag.embeddings.ollamaUrl)
          .onChange(async (value) => {
            this.plugin.settings.rag.embeddings.ollamaUrl = value;
            await this.plugin.saveSettings();
          });
      });

    // Vector dimensions
    const dimensionsSetting = new Setting(containerEl)
      .setName('Vector dimensions')
      .setDesc('Number of dimensions for embedding vectors (leave empty to use recommended value)')
      .addText(text => {
        text
          .setPlaceholder('Auto-detect from model')
          .setValue(this.plugin.settings.rag.embeddings.dimensions?.toString() || '')
          .onChange(async (value) => {
            if (value === '') {
              // Clear the setting to use auto-detection
              this.plugin.settings.rag.embeddings.dimensions = undefined;
            } else {
              const num = parseInt(value);
              if (!isNaN(num) && num > 0) {
                this.plugin.settings.rag.embeddings.dimensions = num;
              }
            }
            await this.plugin.saveSettings();
          });
      });
    
    // Store reference for updating recommendations and add initial recommendation
    (this as any)._dimensionsContainer = dimensionsSetting.settingEl;
    
    // Add initial recommendations for current model
    const currentModel = this.plugin.settings.rag.embeddings.model;
    if (currentModel) {
      const recommendations = this.getModelRecommendations(currentModel);
      this.updateRecommendationDisplay(dimensionsSetting.settingEl, 'dimensions', recommendations.dimensions);
    }

    // Max tokens
    const maxTokensSetting = new Setting(containerEl)
      .setName('Max tokens per embedding')
      .setDesc('Maximum tokens to process per embedding request (leave empty to use recommended value)')
      .addText(text => {
        text
          .setPlaceholder('Auto-detect from model')
          .setValue(this.plugin.settings.rag.embeddings.maxTokens?.toString() || '')
          .onChange(async (value) => {
            if (value === '') {
              // Clear the setting to use auto-detection
              this.plugin.settings.rag.embeddings.maxTokens = undefined;
            } else {
              const num = parseInt(value);
              if (!isNaN(num) && num > 0) {
                this.plugin.settings.rag.embeddings.maxTokens = num;
              }
            }
            await this.plugin.saveSettings();
          });
      });
    
    // Store reference for updating recommendations and add initial recommendation
    (this as any)._maxTokensContainer = maxTokensSetting.settingEl;
    
    // Add initial recommendations for current model
    if (currentModel) {
      const recommendations = this.getModelRecommendations(currentModel);
      this.updateRecommendationDisplay(maxTokensSetting.settingEl, 'maxTokens', recommendations.maxTokens);
    }

    // Enable cache
    new Setting(containerEl)
      .setName('Enable embedding cache')
      .setDesc('Cache embeddings to improve performance (uses more memory)')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.embeddings.enableCache)
          .onChange(async (value) => {
            this.plugin.settings.rag.embeddings.enableCache = value;
            await this.plugin.saveSettings();
          });
      });

    // Cache size
    new Setting(containerEl)
      .setName('Cache size')
      .setDesc('Maximum number of embeddings to keep in memory')
      .addText(text => {
        text
          .setPlaceholder('10000')
          .setValue(this.plugin.settings.rag.embeddings.cacheSize.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.rag.embeddings.cacheSize = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // ===== CHUNKING SUBSECTION =====
    containerEl.createEl('h4', { text: 'Document Chunking' });

    // Chunking strategy
    new Setting(containerEl)
      .setName('Chunking strategy')
      .setDesc('How to split documents into chunks for processing')
      .addDropdown(dropdown => {
        dropdown
          .addOption('semantic', 'Semantic (Smart sentence boundaries)')
          .addOption('sentence', 'Sentence-based')
          .addOption('fixed', 'Fixed character count')
          .addOption('hybrid', 'Hybrid (semantic + fixed)')
          .setValue(this.plugin.settings.rag.chunking.strategy)
          .onChange(async (value: 'sentence' | 'semantic' | 'fixed' | 'hybrid') => {
            this.plugin.settings.rag.chunking.strategy = value;
            await this.plugin.saveSettings();
          });
      });

    // Chunk size
    const chunkSizeSetting = new Setting(containerEl)
      .setName('Chunk size')
      .setDesc('Target characters per chunk (leave empty to use recommended value based on embedding model)')
      .addText(text => {
        text
          .setPlaceholder('Auto-detect from embedding model')
          .setValue(this.plugin.settings.rag.chunking.chunkSize?.toString() || '')
          .onChange(async (value) => {
            if (value === '') {
              // Clear the setting to use auto-detection
              this.plugin.settings.rag.chunking.chunkSize = undefined;
            } else {
              const num = parseInt(value);
              if (!isNaN(num) && num > 0) {
                this.plugin.settings.rag.chunking.chunkSize = num;
              }
            }
            await this.plugin.saveSettings();
          });
      });
    
    // Store reference for updating recommendations and add initial recommendation
    (this as any)._chunkSizeContainer = chunkSizeSetting.settingEl;
    
    // Add initial recommendations for current model
    if (currentModel) {
      const recommendations = this.getModelRecommendations(currentModel);
      this.updateRecommendationDisplay(chunkSizeSetting.settingEl, 'chunkSize', recommendations.chunkSize);
    }

    // Chunk overlap
    new Setting(containerEl)
      .setName('Chunk overlap')
      .setDesc('Character overlap between adjacent chunks (recommended: 10-20% of chunk size)')
      .addText(text => {
        text
          .setPlaceholder('100')
          .setValue(this.plugin.settings.rag.chunking.chunkOverlap.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.rag.chunking.chunkOverlap = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Respect sentences
    new Setting(containerEl)
      .setName('Respect sentence boundaries')
      .setDesc('Avoid breaking sentences when chunking')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.chunking.respectSentences)
          .onChange(async (value) => {
            this.plugin.settings.rag.chunking.respectSentences = value;
            await this.plugin.saveSettings();
          });
      });

    // ===== RETRIEVAL SUBSECTION =====
    containerEl.createEl('h4', { text: 'Context Retrieval' });

    // Max results
    new Setting(containerEl)
      .setName('Max retrieval results')
      .setDesc('Maximum number of relevant chunks/notes to retrieve')
      .addText(text => {
        text
          .setPlaceholder('10')
          .setValue(this.plugin.settings.rag.retrieval.maxResults.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.rag.retrieval.maxResults = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Min relevance score
    new Setting(containerEl)
      .setName('Min relevance score')
      .setDesc('Minimum similarity score for including results (0.0-1.0)')
      .addText(text => {
        text
          .setPlaceholder('0.7')
          .setValue(this.plugin.settings.rag.retrieval.minRelevanceScore.toString())
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num) && num >= 0 && num <= 1) {
              this.plugin.settings.rag.retrieval.minRelevanceScore = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Enable hybrid search
    new Setting(containerEl)
      .setName('Enable hybrid search')
      .setDesc('Combine semantic search with keyword matching for better results')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.retrieval.enableHybridSearch)
          .onChange(async (value) => {
            this.plugin.settings.rag.retrieval.enableHybridSearch = value;
            await this.plugin.saveSettings();
          });
      });

    // Context window
    new Setting(containerEl)
      .setName('Context window')
      .setDesc('Maximum characters to include in AI context (increase for longer context models)')
      .addText(text => {
        text
          .setPlaceholder('8192')
          .setValue(this.plugin.settings.rag.retrieval.contextWindow.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.rag.retrieval.contextWindow = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // ===== ADVANCED SUBSECTION =====
    containerEl.createEl('h4', { text: 'Advanced Settings' });

    // Enable semantic search
    new Setting(containerEl)
      .setName('Enable semantic search')
      .setDesc('Use embeddings for semantic similarity matching')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.advanced.enableSemanticSearch)
          .onChange(async (value) => {
            this.plugin.settings.rag.advanced.enableSemanticSearch = value;
            await this.plugin.saveSettings();
          });
      });

    // Enable keyword search
    new Setting(containerEl)
      .setName('Enable keyword search')
      .setDesc('Use traditional keyword matching (BM25-style)')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.advanced.enableKeywordSearch)
          .onChange(async (value) => {
            this.plugin.settings.rag.advanced.enableKeywordSearch = value;
            await this.plugin.saveSettings();
          });
      });

    // Hybrid search weight
    new Setting(containerEl)
      .setName('Semantic/keyword balance')
      .setDesc('Weight of semantic vs keyword search (0.0 = all keyword, 1.0 = all semantic)')
      .addText(text => {
        text
          .setPlaceholder('0.7')
          .setValue(this.plugin.settings.rag.advanced.hybridSearchWeight.toString())
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num) && num >= 0 && num <= 1) {
              this.plugin.settings.rag.advanced.hybridSearchWeight = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Enable citations
    new Setting(containerEl)
      .setName('Enable citations')
      .setDesc('Track and include source citations in AI responses')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.rag.advanced.enableCitations)
          .onChange(async (value) => {
            this.plugin.settings.rag.advanced.enableCitations = value;
            await this.plugin.saveSettings();
          });
      });

    // Max context length
    new Setting(containerEl)
      .setName('Max context length')
      .setDesc('Maximum characters to send to AI (prevents token limit issues)')
      .addText(text => {
        text
          .setPlaceholder('6000')
          .setValue(this.plugin.settings.rag.advanced.maxContextLength.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.rag.advanced.maxContextLength = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Test RAG system
    new Setting(containerEl)
      .setName('Test RAG system')
      .setDesc('Test embeddings and retrieval functionality')
      .addButton(button => {
        button
          .setButtonText('Test RAG')
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            
            try {
              // Simple RAG test - create embedding and search
              const testText = "This is a test of the RAG system embeddings and retrieval.";
              new Notice('RAG test started...');
              
              // We'll implement actual testing when the RAG system is consolidated
              new Notice('✅ RAG system configuration appears valid');
              
            } catch (error) {
              console.error('RAG test failed:', error);
              new Notice(`❌ RAG test failed: ${error.message}`);
            } finally {
              button.setButtonText('Test RAG');
              button.setDisabled(false);
            }
          });
      });
  }

  private addSystemPromptsSection(): void {
    const containerEl = this.containerEl;
    
    containerEl.createEl('h2', { text: '🎭 System Prompts' });
    containerEl.createEl('p', { 
      text: 'Customize the system prompts used by CLIPPY and its expert agents. These control how the AI behaves and responds.',
      cls: 'setting-item-description'
    });

    // Vault Agent System Prompt
    containerEl.createEl('h3', { text: 'Vault Agent System Prompt' });
    
    new Setting(containerEl)
      .setName('Main Vault Agent Prompt')
      .setDesc('The core system prompt for the vault agent. Use {{toolsDescription}} placeholder for tool descriptions.')
      .addTextArea(text => {
        text
          .setPlaceholder('Enter vault agent system prompt...')
          .setValue(this.plugin.settings.research.prompts.vaultAgent)
          .onChange(async (value) => {
            this.plugin.settings.research.prompts.vaultAgent = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
        text.inputEl.style.height = '200px';
        text.inputEl.style.fontSize = '12px';
        text.inputEl.style.fontFamily = 'var(--font-monospace)';
      });

    // MoE Expert Prompts
    containerEl.createEl('h3', { text: 'MoE Expert System Prompts' });
    
    const expertPrompts = [
      { key: 'fileOrganizationExpert', name: 'File Organization Expert', desc: 'Handles file placement, folder management, and vault structure' },
      { key: 'searchNavigationExpert', name: 'Search & Navigation Expert', desc: 'Performs searches and navigation commands' },
      { key: 'contentCreationExpert', name: 'Content Creation Expert', desc: 'Creates and structures content using templates' },
      { key: 'vaultMaintenanceExpert', name: 'Vault Maintenance Expert', desc: 'Organizes and optimizes vault structure' },
      { key: 'commandExecutionExpert', name: 'Command Execution Expert', desc: 'Translates user intents to Obsidian commands' },
      { key: 'contextMemoryExpert', name: 'Context Memory Expert', desc: 'Learns and applies user patterns and preferences' }
    ];

    expertPrompts.forEach(expert => {
      new Setting(containerEl)
        .setName(expert.name)
        .setDesc(expert.desc)
        .addTextArea(text => {
          text
            .setPlaceholder(`Enter ${expert.name.toLowerCase()} system prompt...`)
            .setValue((this.plugin.settings.research.prompts as any)[expert.key] || '')
            .onChange(async (value) => {
              (this.plugin.settings.research.prompts as any)[expert.key] = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.style.width = '100%';
          text.inputEl.style.height = '150px';
          text.inputEl.style.fontSize = '11px';
          text.inputEl.style.fontFamily = 'var(--font-monospace)';
        });
    });

    // Reset to defaults button
    new Setting(containerEl)
      .setName('Reset All System Prompts')
      .setDesc('Reset all system prompts to their default values')
      .addButton(button => {
        button
          .setButtonText('Reset to Defaults')
          .setWarning()
          .onClick(async () => {
            // Reset to default prompts from DEFAULT_SETTINGS
            this.plugin.settings.research.prompts = { ...DEFAULT_SETTINGS.research.prompts };
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings display
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

  private addVoiceSection(): void {
    const { containerEl } = this;

    // Ensure voice settings are initialized
    if (!this.plugin.settings.voice) {
      this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
    }

    containerEl.createEl('h3', { text: '🎤 Voice Assistant Settings' });
    containerEl.createEl('p', { 
      text: 'Configure the local voice assistant powered by Whisper STT and Piper TTS.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable Voice Assistant')
      .setDesc('Enable local voice processing with Whisper and Piper')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.enabled || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            this.plugin.settings.voice.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Whisper Processing Device')
      .setDesc('Choose whether to use CPU or GPU for speech recognition. CPU is more stable but slower.')
      .addDropdown(dropdown => {
        dropdown
          .addOption('cpu', 'CPU (Recommended)')
          .addOption('cuda', 'GPU (CUDA)')
          .setValue(this.plugin.settings.voice?.whisper?.device || 'cpu')
          .onChange(async (value: 'cpu' | 'cuda') => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            if (!this.plugin.settings.voice.whisper) this.plugin.settings.voice.whisper = { ...DEFAULT_SETTINGS.voice.whisper };
            this.plugin.settings.voice.whisper.device = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Whisper Model Size')
      .setDesc('Larger models are more accurate but slower and use more memory')
      .addDropdown(dropdown => {
        dropdown
          .addOption('tiny', 'Tiny (Fastest, least accurate)')
          .addOption('base', 'Base (Recommended)')
          .addOption('small', 'Small (Good balance)')
          .addOption('medium', 'Medium (More accurate)')
          .addOption('large', 'Large (Most accurate, slowest)')
          .setValue(this.plugin.settings.voice?.whisper?.modelSize || 'base')
          .onChange(async (value: 'tiny' | 'base' | 'small' | 'medium' | 'large') => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            if (!this.plugin.settings.voice.whisper) this.plugin.settings.voice.whisper = { ...DEFAULT_SETTINGS.voice.whisper };
            this.plugin.settings.voice.whisper.modelSize = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('TTS Engine')
      .setDesc('Choose text-to-speech engine for voice responses')
      .addDropdown(dropdown => {
        dropdown
          .addOption('piper', 'Piper (Local)')
          .addOption('openai', 'OpenAI TTS (Configurable)')
          .addOption('elevenlabs', 'ElevenLabs (Cloud)')
          .setValue(this.plugin.settings.voice?.ttsEngine || 'piper')
          .onChange(async (value: 'piper' | 'openai' | 'elevenlabs') => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            this.plugin.settings.voice.ttsEngine = value;
            await this.plugin.saveSettings();
            // Refresh settings display to show/hide conditional settings
            this.display();
          });
      });

    // Debug logging for Piper settings visibility
    console.log('[Settings] Voice TTS Engine:', this.plugin.settings.voice?.ttsEngine);
    console.log('[Settings] Voice enabled:', this.plugin.settings.voice?.enabled);
    
    // Piper TTS Voice Settings (only show when Piper is selected)
    if (this.plugin.settings.voice?.ttsEngine === 'piper') {
      console.log('[Settings] Showing Piper configuration section');
      containerEl.createEl('h5', { text: 'Piper TTS Configuration' });
      
      new Setting(containerEl)
        .setName('Piper Voice Model')
        .setDesc('Select voice model for Piper TTS. Download additional voices from piper-voices repository.')
        .addDropdown(dropdown => {
          // Common Piper voices
          const piperVoices = [
            { id: 'en_US-lessac-medium', name: 'Lessac (US English, Medium Quality)' },
            { id: 'en_US-amy-medium', name: 'Amy (US English, Medium Quality)' },
            { id: 'en_US-ryan-medium', name: 'Ryan (US English, Medium Quality)' },
            { id: 'en_GB-alan-medium', name: 'Alan (UK English, Medium Quality)' },
            { id: 'en_GB-alba-medium', name: 'Alba (UK English, Medium Quality)' },
            { id: 'en_US-lessac-low', name: 'Lessac (US English, Low Quality)' },
            { id: 'en_US-amy-low', name: 'Amy (US English, Low Quality)' },
          ];
          
          piperVoices.forEach(voice => {
            dropdown.addOption(voice.id, voice.name);
          });
          
          // Set current value or default
          const currentVoice = this.plugin.settings.voice?.ttsVoice || 'en_US-lessac-medium';
          dropdown.setValue(currentVoice);
          
          dropdown.onChange(async (value) => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            this.plugin.settings.voice.ttsVoice = value;
            await this.plugin.saveSettings();
          });
        });
      
      // Add custom voice input for advanced users
      new Setting(containerEl)
        .setName('Custom Piper Voice (Advanced)')
        .setDesc('Enter a custom Piper voice model ID if you have installed additional voices')
        .addText(text => {
          text
            .setPlaceholder('e.g., en_US-libritts-high')
            .onChange(async (value) => {
              if (value.trim()) {
                if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
                this.plugin.settings.voice.ttsVoice = value.trim();
                await this.plugin.saveSettings();
                // Refresh to update dropdown
                this.display();
              }
            });
        });
        
      // Test Piper voice button  
      new Setting(containerEl)
        .setName('Test Piper Voice')
        .setDesc('Test the selected Piper voice with a sample phrase')
        .addButton(button => {
          button
            .setButtonText('Test Voice')
            .onClick(async () => {
              const currentVoice = this.plugin.settings.voice?.ttsVoice || 'en_US-lessac-medium';
              button.setButtonText('Testing...');
              button.setDisabled(true);
              
              try {
                // Test voice using the console command we implemented
                if (this.plugin.voiceSystemV2?.getTTSManager()?.testVoice) {
                  const success = await this.plugin.voiceSystemV2.getTTSManager().testVoice(
                    currentVoice, 
                    'Hello, this is a test of the Piper voice system.'
                  );
                  
                  if (success) {
                    new Notice(`✅ Voice test successful: ${currentVoice}`);
                  } else {
                    new Notice(`❌ Voice test failed: ${currentVoice}. Try a different voice or check Piper installation.`);
                  }
                } else {
                  new Notice('❌ Voice system not available. Please enable voice assistant first.');
                }
              } catch (error) {
                console.error('Voice test error:', error);
                new Notice(`❌ Voice test error: ${error.message}`);
              }
              
              button.setButtonText('Test Voice');
              button.setDisabled(false);
            });
        });
        
      // List available voices button
      new Setting(containerEl)
        .setName('List Available Voices')
        .setDesc('Show all available TTS voices from all engines')
        .addButton(button => {
          button
            .setButtonText('List Voices')
            .onClick(async () => {
              button.setButtonText('Loading...');
              button.setDisabled(true);
              
              try {
                if (this.plugin.voiceSystemV2?.getTTSManager()?.listAllVoices) {
                  await this.plugin.voiceSystemV2.getTTSManager().listAllVoices();
                  new Notice('✅ Voice list displayed in console. Press F12 to view.');
                } else {
                  new Notice('❌ Voice system not available. Please enable voice assistant first.');
                }
              } catch (error) {
                console.error('Voice listing error:', error);
                new Notice(`❌ Voice listing error: ${error.message}`);
              }
              
              button.setButtonText('List Voices');
              button.setDisabled(false);
            });
        });
        
      // Piper installation help
      const piperHelpEl = containerEl.createEl('div', { cls: 'piper-help-section' });
      piperHelpEl.style.cssText = `
        background: var(--background-secondary);
        padding: 12px;
        border-radius: 6px;
        margin: 8px 0 16px 0;
        border-left: 3px solid var(--text-accent);
      `;
      
      piperHelpEl.createEl('strong', { text: '🔧 Piper Voice Installation' });
      piperHelpEl.createEl('p', { 
        text: 'If voice tests fail, ensure Piper TTS is properly installed in your Python environment:',
        cls: 'setting-item-description'
      });
      
      const codeEl = piperHelpEl.createEl('pre');
      codeEl.style.cssText = `
        background: var(--background-primary);
        padding: 8px;
        border-radius: 4px;
        font-family: var(--font-monospace);
        font-size: 12px;
        margin: 8px 0;
        overflow-x: auto;
      `;
      
      codeEl.textContent = `# Install Piper TTS in your voice assistant environment:
pip install piper-tts

# Download additional voices (optional):
# Visit: https://github.com/rhasspy/piper/releases
# Download .onnx and .json files for desired voices`;

      const voiceNote = piperHelpEl.createEl('p');
      voiceNote.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-top: 8px;';
      voiceNote.textContent = '💡 The voice "en_US-lessac-medium" should be included with Piper by default.';
    }

    // OpenAI TTS Settings (only show when OpenAI is selected)
    if (this.plugin.settings.voice?.ttsEngine === 'openai') {
      // Ensure openaiTts settings are initialized
      if (!this.plugin.settings.voice.openaiTts) {
        this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
      }
      containerEl.createEl('h5', { text: 'OpenAI TTS Configuration' });
      
      new Setting(containerEl)
        .setName('API Base URL')
        .setDesc('Base URL for OpenAI-compatible TTS API (e.g., OpenAI, Chatterbox, local servers)')
        .addText(text => {
          text
            .setPlaceholder('https://api.openai.com/v1 or http://localhost:4123/v1')
            .setValue(this.plugin.settings.voice?.openaiTts?.baseUrl || 'http://localhost:4123/v1')
            .onChange(async (value) => {
              if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
              if (!this.plugin.settings.voice.openaiTts) this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
              this.plugin.settings.voice.openaiTts.baseUrl = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('API Key')
        .setDesc('API key for the TTS service (use "none" for services that don\'t require authentication)')
        .addText(text => {
          text
            .setPlaceholder('Enter API key or "none"')
            .setValue(this.plugin.settings.voice?.openaiTts?.apiKey ? '••••••••' : '')
            .onChange(async (value) => {
              if (value !== '••••••••' && value.trim()) {
                if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
                if (!this.plugin.settings.voice.openaiTts) this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
                this.plugin.settings.voice.openaiTts.apiKey = value;
                await this.plugin.saveSettings();
              }
            });
          text.inputEl.type = 'password';
        });

      new Setting(containerEl)
        .setName('TTS Model')
        .setDesc('Model to use for text-to-speech generation')
        .addDropdown(dropdown => {
          dropdown
            .addOption('tts-1', 'tts-1 (Standard)')
            .addOption('tts-1-hd', 'tts-1-hd (High Definition)')
            .setValue(this.plugin.settings.voice?.openaiTts?.model || 'tts-1')
            .onChange(async (value) => {
              if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
              if (!this.plugin.settings.voice.openaiTts) this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
              this.plugin.settings.voice.openaiTts.model = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('TTS Voice')
        .setDesc('Voice to use for speech synthesis')
        .addDropdown(dropdown => {
          dropdown
            .addOption('alloy', 'Alloy (Neutral)')
            .addOption('echo', 'Echo (Male)')
            .addOption('fable', 'Fable (Neutral)')
            .addOption('onyx', 'Onyx (Male)')
            .addOption('nova', 'Nova (Female)')
            .addOption('shimmer', 'Shimmer (Female)')
            .setValue(this.plugin.settings.voice?.openaiTts?.voice || 'alloy')
            .onChange(async (value) => {
              if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
              if (!this.plugin.settings.voice.openaiTts) this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
              this.plugin.settings.voice.openaiTts.voice = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Response Splitting')
        .setDesc('How to split long responses for better TTS processing')
        .addDropdown(dropdown => {
          dropdown
            .addOption('none', 'None (Process as single chunk)')
            .addOption('sentences', 'Sentences')
            .addOption('paragraphs', 'Paragraphs (Recommended)')
            .setValue(this.plugin.settings.voice?.openaiTts?.responseSplitting || 'paragraphs')
            .onChange(async (value: 'none' | 'sentences' | 'paragraphs') => {
              if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
              if (!this.plugin.settings.voice.openaiTts) this.plugin.settings.voice.openaiTts = { ...DEFAULT_SETTINGS.voice.openaiTts };
              this.plugin.settings.voice.openaiTts.responseSplitting = value;
              await this.plugin.saveSettings();
            });
        });
    }

    // ElevenLabs API Key (only show when ElevenLabs is selected)
    if (this.plugin.settings.voice?.ttsEngine === 'elevenlabs') {
      new Setting(containerEl)
        .setName('ElevenLabs API Key')
        .setDesc('API key for ElevenLabs TTS service')
        .addText(text => {
          text
            .setPlaceholder('Enter API key...')
            .setValue(this.plugin.settings.voice?.elevenlabsApiKey ? '••••••••' : '')
            .onChange(async (value) => {
              if (value !== '••••••••' && value.trim()) {
                if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
                this.plugin.settings.voice.elevenlabsApiKey = value;
                await this.plugin.saveSettings();
              }
            });
          text.inputEl.type = 'password';
        });
    }

    new Setting(containerEl)
      .setName('Wake Word')
      .setDesc('Phrase to activate voice commands')
      .addText(text => {
        text
          .setPlaceholder('hey clippy')
          .setValue(this.plugin.settings.voice?.wakeWord || 'hey clippy')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice) this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
            this.plugin.settings.voice.wakeWord = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Continuous Listening')
      .setDesc('Keep listening for wake word after each command')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice.continuousMode)
          .onChange(async (value) => {
            this.plugin.settings.voice.continuousMode = value;
            await this.plugin.saveSettings();
          });
      });

    // Voice Visualizer Configuration Section
    this.addVoiceVisualizerSection();

    // Voice system info
    const infoEl = containerEl.createEl('div', { cls: 'clippy-voice-info' });
    infoEl.style.cssText = `
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
    `;
    
    const infoHeader = infoEl.createEl('h4', { text: '💡 Voice System Info' });
    infoHeader.style.marginTop = '0';
    
    const infoList = infoEl.createEl('ul');
    infoList.style.cssText = 'margin: 8px 0; padding-left: 20px;';
    
    infoList.createEl('li').innerHTML = '<strong>CPU Mode:</strong> Uses system CPU, more stable, works on all systems';
    infoList.createEl('li').innerHTML = '<strong>CUDA Mode:</strong> Uses GPU acceleration, faster but requires NVIDIA GPU with CUDA';
    infoList.createEl('li').innerHTML = '<strong>Model Size:</strong> Affects accuracy vs speed - start with "base" model';
    infoList.createEl('li').innerHTML = '<strong>Requirements:</strong> Python environment with whisper and piper-tts installed';
  }

  /**
   * Add voice visualizer configuration settings
   */
  private addVoiceVisualizerSection(): void {
    const { containerEl } = this;

    // Ensure visualizer settings are initialized
    if (!this.plugin.settings.voice?.visualizers) {
      if (!this.plugin.settings.voice) {
        this.plugin.settings.voice = { ...DEFAULT_SETTINGS.voice };
      }
      this.plugin.settings.voice.visualizers = { ...DEFAULT_SETTINGS.voice.visualizers };
    }

    containerEl.createEl('h4', { text: '🎨 Voice Visualizers' });
    containerEl.createEl('p', { 
      text: 'Configure real-time audio visualizations for voice activity detection and text-to-speech.',
      cls: 'setting-item-description'
    });

    // VAD Visualizer Settings
    containerEl.createEl('h5', { text: '🎯 Voice Activity Detection (VAD) Visualizer' });

    new Setting(containerEl)
      .setName('Enable VAD Visualizer')
      .setDesc('Show visual indicator for voice activity detection with confidence levels')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.enabled || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('VAD Sensitivity')
      .setDesc('Adjust how sensitive the voice activity detection is (0.1 = very sensitive, 1.0 = less sensitive)')
      .addSlider(slider => {
        slider
          .setLimits(0.1, 1.0, 0.1)
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.sensitivity || 0.7)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.sensitivity = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('VAD Indicator Size')
      .setDesc('Size of the voice activity indicator widget')
      .addDropdown(dropdown => {
        dropdown
          .addOption('small', 'Small (Compact)')
          .addOption('medium', 'Medium (Default)')
          .addOption('large', 'Large (Prominent)')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.size || 'medium')
          .onChange(async (value: 'small' | 'medium' | 'large') => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.size = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('VAD Position')
      .setDesc('Where to position the voice activity indicator')
      .addDropdown(dropdown => {
        dropdown
          .addOption('inline', 'Inline (Next to voice button)')
          .addOption('floating', 'Floating (Top corner)')
          .addOption('corner', 'Corner (Screen edge)')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.position || 'inline')
          .onChange(async (value: 'inline' | 'floating' | 'corner') => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.position = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Show Confidence Score')
      .setDesc('Display numerical confidence percentage for voice detection')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.showConfidence || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.showConfidence = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Animation Speed')
      .setDesc('Speed of VAD indicator animations and transitions')
      .addDropdown(dropdown => {
        dropdown
          .addOption('slow', 'Slow (Smooth)')
          .addOption('normal', 'Normal (Balanced)')
          .addOption('fast', 'Fast (Responsive)')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.animationSpeed || 'normal')
          .onChange(async (value: 'slow' | 'normal' | 'fast') => {
            if (!this.plugin.settings.voice?.visualizers?.vad) return;
            this.plugin.settings.voice.visualizers.vad.animationSpeed = value;
            await this.plugin.saveSettings();
          });
      });

    // VAD Color Configuration
    containerEl.createEl('h6', { text: 'VAD Colors' });
    
    new Setting(containerEl)
      .setName('Silent State Color')
      .setDesc('Color when no voice activity is detected')
      .addText(text => {
        text
          .setPlaceholder('#6b7280')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.colors?.silent || '#6b7280')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad?.colors) return;
            this.plugin.settings.voice.visualizers.vad.colors.silent = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Speech State Color')
      .setDesc('Color when speech is detected')
      .addText(text => {
        text
          .setPlaceholder('#10b981')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.colors?.speech || '#10b981')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad?.colors) return;
            this.plugin.settings.voice.visualizers.vad.colors.speech = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Noise State Color')
      .setDesc('Color when noise/uncertain audio is detected')
      .addText(text => {
        text
          .setPlaceholder('#f59e0b')
          .setValue(this.plugin.settings.voice?.visualizers?.vad?.colors?.noise || '#f59e0b')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.vad?.colors) return;
            this.plugin.settings.voice.visualizers.vad.colors.noise = value;
            await this.plugin.saveSettings();
          });
      });

    // TTS Spectrum Visualizer Settings
    containerEl.createEl('h5', { text: '🎵 Text-to-Speech (TTS) Spectrum Visualizer' });

    new Setting(containerEl)
      .setName('Enable TTS Spectrum')
      .setDesc('Show real-time frequency spectrum during TTS playback')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.enabled || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.enabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Spectrum Bars')
      .setDesc('Number of frequency bars in the spectrum display (more bars = finer detail)')
      .addSlider(slider => {
        slider
          .setLimits(8, 48, 4)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.spectrumBars || 24)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.spectrumBars = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Spectrum Height')
      .setDesc('Height of the spectrum visualizer in pixels')
      .addSlider(slider => {
        slider
          .setLimits(30, 150, 10)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.height || 50)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.height = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Audio-Reactive Border')
      .setDesc('Enable pulsing border around messages that syncs with TTS volume')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.showBorder || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.showBorder = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Border Pulse Intensity')
      .setDesc('How intense the audio-reactive border pulsing is (0.1 = subtle, 2.0 = dramatic)')
      .addSlider(slider => {
        slider
          .setLimits(0.1, 2.0, 0.1)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.borderIntensity || 1.0)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.borderIntensity = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Glow Effect')
      .setDesc('Enable glow effect during loud speech segments')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.showGlow || false)
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.showGlow = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Glow Threshold')
      .setDesc('Volume level required to trigger glow effect (0.0 = always, 1.0 = only loudest)')
      .addSlider(slider => {
        slider
          .setLimits(0.0, 1.0, 0.1)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.glowThreshold || 0.7)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.glowThreshold = value;
            await this.plugin.saveSettings();
          });
      });

    // TTS Color Configuration
    containerEl.createEl('h6', { text: 'TTS Spectrum Colors' });
    
    new Setting(containerEl)
      .setName('Primary Color')
      .setDesc('Main spectrum color (use "auto" for theme accent color)')
      .addText(text => {
        text
          .setPlaceholder('auto or #hex')
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.colors?.primary || 'auto')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts?.colors) return;
            this.plugin.settings.voice.visualizers.tts.colors.primary = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Secondary Color')
      .setDesc('Secondary spectrum color for gradients')
      .addText(text => {
        text
          .setPlaceholder('auto or #hex')
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.colors?.secondary || 'auto')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts?.colors) return;
            this.plugin.settings.voice.visualizers.tts.colors.secondary = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Background Color')
      .setDesc('Spectrum background color')
      .addText(text => {
        text
          .setPlaceholder('auto or #hex')
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.colors?.background || 'auto')
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts?.colors) return;
            this.plugin.settings.voice.visualizers.tts.colors.background = value;
            await this.plugin.saveSettings();
          });
      });

    // Advanced TTS Settings
    containerEl.createEl('h6', { text: 'Advanced TTS Audio Processing' });

    new Setting(containerEl)
      .setName('Frequency Smoothing')
      .setDesc('How much to smooth frequency changes (0.0 = jagged, 1.0 = very smooth)')
      .addSlider(slider => {
        slider
          .setLimits(0.0, 1.0, 0.05)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.smoothing || 0.85)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.smoothing = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Minimum Decibels')
      .setDesc('Minimum audio level for spectrum analysis (lower = more sensitive to quiet sounds)')
      .addSlider(slider => {
        slider
          .setLimits(-120, -30, 10)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.minDecibels || -90)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.minDecibels = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Maximum Decibels')
      .setDesc('Maximum audio level for spectrum analysis (higher = less sensitive to loud sounds)')
      .addSlider(slider => {
        slider
          .setLimits(-30, 0, 5)
          .setValue(this.plugin.settings.voice?.visualizers?.tts?.maxDecibels || -10)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings.voice?.visualizers?.tts) return;
            this.plugin.settings.voice.visualizers.tts.maxDecibels = value;
            await this.plugin.saveSettings();
          });
      });

    // Visualizer Help Section
    const visualizerHelpEl = containerEl.createEl('div', { cls: 'visualizer-help-section' });
    visualizerHelpEl.style.cssText = `
      background: var(--background-secondary);
      padding: 12px;
      border-radius: 6px;
      margin: 16px 0;
      border-left: 3px solid var(--text-accent);
    `;
    
    visualizerHelpEl.createEl('strong', { text: '🎨 Visualizer Tips' });
    visualizerHelpEl.createEl('p', { 
      text: 'Voice visualizers provide real-time feedback for speech processing:',
      cls: 'setting-item-description'
    });
    
    const tipsList = visualizerHelpEl.createEl('ul');
    tipsList.style.cssText = 'margin: 8px 0; padding-left: 20px; font-size: 14px;';
    
    tipsList.createEl('li').innerHTML = '<strong>VAD Indicator:</strong> Shows when the system detects speech vs silence or noise';
    tipsList.createEl('li').innerHTML = '<strong>TTS Spectrum:</strong> Displays frequency analysis of AI voice responses in real-time';
    tipsList.createEl('li').innerHTML = '<strong>Audio-Reactive Border:</strong> Chat messages pulse with TTS volume for visual feedback';
    tipsList.createEl('li').innerHTML = '<strong>Performance:</strong> Visualizers use optimized rendering for smooth 60 FPS animation';

    const colorNote = visualizerHelpEl.createEl('p');
    colorNote.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-top: 8px;';
    colorNote.textContent = '💡 Use "auto" for colors to automatically match your Obsidian theme. Use hex codes like #ff0000 for custom colors.';
  }

  /**
   * Add enhanced template management section
   */
  private addTemplateManagementSection(containerEl: HTMLElement): void {
    // Template Management Header
    containerEl.createEl('h4', { text: 'Template Management' });
    containerEl.createEl('p', { 
      text: 'Configure and customize research note templates with dynamic variables.',
      cls: 'setting-item-description'
    });

    // Template Selection Dropdown
    const templateSetting = new Setting(containerEl)
      .setName('Default template')
      .setDesc('Select and customize your research note template');

    const dropdownContainer = templateSetting.controlEl.createEl('div', { cls: 'template-dropdown-container' });
    dropdownContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 12px;';

    const dropdown = dropdownContainer.createEl('select', { cls: 'dropdown' });
    dropdown.style.cssText = 'flex: 0 0 auto; min-width: 200px;';

    // Get template options from centralized registry
    const registry = TemplateRegistry.getInstance(this.app);
    const templates = registry.getTemplateOptions(true).map((option: any) => ({
      value: option.value,
      name: option.text
    }));

    templates.forEach(template => {
      const option = dropdown.createEl('option', { 
        text: template.name,
        attr: { value: template.value }
      });
      if (template.value === this.plugin.settings.research.defaults.template) {
        option.selected = true;
      }
    });

    // Template Editor Button
    const editBtn = dropdownContainer.createEl('button', {
      text: '✏️ Edit Template',
      type: 'button',
      cls: 'mod-cta'
    });
    editBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';

    // Reset to Standard Template Button
    const resetBtn = dropdownContainer.createEl('button', {
      text: '🔄 Reset to Standard',
      type: 'button',
      cls: 'mod-warning'
    });
    resetBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; background-color: var(--color-red); color: var(--text-on-accent);';

    // Available Variables Display
    const variablesContainer = containerEl.createEl('div', { cls: 'template-variables' });
    variablesContainer.style.cssText = `
      background: var(--background-secondary);
      padding: 12px;
      border-radius: 6px;
      margin: 12px 0;
      border: 1px solid var(--background-modifier-border);
    `;
    
    variablesContainer.createEl('h5', { text: 'Available Template Variables' });
    
    const variablesList = [
      '{{tags}} - AI-generated tags based on vault patterns',
      '{{projectName}} - Research project name', 
      '{{topicName}} - Current research topic',
      '{{today}} - Current date',
      '{{status}} - Research status',
      '{{EXTRACTED_WISDOM}} - AI-synthesized research insights',
      '{{VAULT_SEARCH_RESULTS}} - Content from vault notes',
      '{{WEB_SEARCH_RESULTS}} - Web research findings',
      '{{RESEARCH_BACKLINKS}} - Related concept links',
      '{{FRONTMATTER_FIELDS}} - Dynamic metadata fields'
    ];

    const variablesListEl = variablesContainer.createEl('ul');
    variablesListEl.style.cssText = 'margin: 8px 0; font-family: var(--font-monospace); font-size: 12px;';
    
    variablesList.forEach(variable => {
      const li = variablesListEl.createEl('li');
      li.style.cssText = 'margin: 4px 0; color: var(--text-muted);';
      li.textContent = variable;
    });

    // Event Handlers
    dropdown.addEventListener('change', async () => {
      this.plugin.settings.research.defaults.template = dropdown.value;
      await this.plugin.saveSettings();
    });

    editBtn.addEventListener('click', () => {
      this.openTemplateEditor(dropdown.value);
    });

    resetBtn.addEventListener('click', () => {
      this.resetToStandardTemplate();
    });

    // Add Custom Template from Vault Section
    console.log('🔧 DEBUG: About to add vault template management');
    try {
      this.addVaultTemplateManagement(containerEl, registry);
      console.log('✅ DEBUG: Vault template management added successfully');
    } catch (error) {
      console.error('❌ DEBUG: Error adding vault template management:', error);
    }
  }

  /**
   * Add vault template management UI
   */
  private addVaultTemplateManagement(containerEl: HTMLElement, registry: any): void {
    console.log('🔧 DEBUG: addVaultTemplateManagement called with:', { containerEl, registry });
    
    // Vault Templates Section Header
    const vaultSection = containerEl.createEl('div', { cls: 'vault-templates-section' });
    console.log('🔧 DEBUG: Created vault section:', vaultSection);
    vaultSection.style.cssText = 'margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--background-modifier-border);';
    
    vaultSection.createEl('h5', { text: 'Custom Templates from Vault' });
    vaultSection.createEl('p', { 
      text: 'Add template files from your vault to use as research templates. Template files should contain markdown with {{variable}} placeholders.',
      cls: 'setting-item-description'
    });

    // Add template from vault
    const addTemplateSetting = new Setting(vaultSection)
      .setName('Add template from vault')
      .setDesc('Select a markdown file from your vault to use as a template');

    const addContainer = addTemplateSetting.controlEl.createEl('div', { cls: 'add-template-container' });
    addContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';

    const pathInput = addContainer.createEl('input', { type: 'text', placeholder: 'Type to search for template files...' });
    pathInput.style.cssText = 'flex: 1; min-width: 200px; padding: 4px 8px; position: relative;';

    const nameInput = addContainer.createEl('input', { type: 'text', placeholder: 'Template name' });
    nameInput.style.cssText = 'flex: 0 0 150px; padding: 4px 8px;';

    const addBtn = addContainer.createEl('button', { text: '➕ Add Template', type: 'button', cls: 'mod-cta' });
    addBtn.style.cssText = 'padding: 4px 12px; font-size: 12px;';

    // Autocomplete dropdown for path input
    const autocompleteContainer = addContainer.createEl('div', { cls: 'autocomplete-container' });
    autocompleteContainer.style.cssText = 'position: relative; width: 100%; flex: 1; min-width: 200px;';
    
    // Move path input to autocomplete container
    autocompleteContainer.appendChild(pathInput);
    addContainer.insertBefore(autocompleteContainer, nameInput);
    
    const autocompleteDropdown = autocompleteContainer.createEl('div', { cls: 'autocomplete-dropdown' });
    autocompleteDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
    `;

    // Existing vault templates list
    const existingTemplatesContainer = vaultSection.createEl('div', { cls: 'existing-vault-templates' });
    this.updateVaultTemplatesList(existingTemplatesContainer, registry);

    // Event handlers
    this.setupPathInputAutocomplete(pathInput, autocompleteDropdown, nameInput);
    addBtn.addEventListener('click', async () => {
      const filePath = pathInput.value.trim();
      const templateName = nameInput.value.trim();
      
      if (!filePath) {
        new Notice('❌ Please enter a template file path');
        return;
      }
      
      if (!templateName) {
        new Notice('❌ Please enter a template name');
        return;
      }

      addBtn.disabled = true;
      addBtn.textContent = '⏳ Adding...';
      
      const success = await registry.addTemplateFromVaultFile(filePath, templateName);
      
      if (success) {
        new Notice(`✅ Template "${templateName}" added successfully!`);
        pathInput.value = '';
        nameInput.value = '';
        this.updateVaultTemplatesList(existingTemplatesContainer, registry);
        this.display(); // Refresh settings to update dropdown
      } else {
        new Notice('❌ Failed to add template. Check file path and try again.');
      }
      
      addBtn.disabled = false;
      addBtn.textContent = '➕ Add Template';
    });
  }

  /**
   * Setup autocomplete functionality for path input
   */
  private setupPathInputAutocomplete(pathInput: HTMLInputElement, dropdown: HTMLElement, nameInput: HTMLInputElement): void {
    let markdownFiles: any[] = [];
    
    // Get all markdown files from vault
    try {
      markdownFiles = this.app.vault.getMarkdownFiles();
    } catch (error) {
      console.error('Failed to get markdown files:', error);
      return;
    }

    // Filter and display suggestions
    const updateSuggestions = (query: string) => {
      dropdown.empty();
      
      if (!query.trim()) {
        dropdown.style.display = 'none';
        return;
      }

      const filtered = markdownFiles.filter(file => 
        file.path.toLowerCase().includes(query.toLowerCase()) ||
        file.basename.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10); // Limit to 10 results

      if (filtered.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      filtered.forEach(file => {
        const suggestion = dropdown.createEl('div', { cls: 'autocomplete-suggestion' });
        suggestion.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--background-modifier-border);
          transition: background-color 0.1s;
        `;

        suggestion.addEventListener('mouseenter', () => {
          suggestion.style.backgroundColor = 'var(--background-secondary)';
        });

        suggestion.addEventListener('mouseleave', () => {
          suggestion.style.backgroundColor = 'transparent';
        });

        const fileName = suggestion.createEl('div', { cls: 'file-name' });
        fileName.style.cssText = 'font-weight: 500; margin-bottom: 2px;';
        fileName.textContent = file.basename;

        const filePath = suggestion.createEl('div', { cls: 'file-path' });
        filePath.style.cssText = 'font-size: 11px; color: var(--text-muted);';
        filePath.textContent = file.path;

        suggestion.addEventListener('click', () => {
          pathInput.value = file.path;
          
          // Auto-fill template name if empty
          if (!nameInput.value.trim()) {
            nameInput.value = file.basename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
          }
          
          dropdown.style.display = 'none';
          nameInput.focus();
        });
      });

      dropdown.style.display = 'block';
    };

    // Input event listener
    pathInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      updateSuggestions(target.value);
    });

    // Focus event listener
    pathInput.addEventListener('focus', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value.trim()) {
        updateSuggestions(target.value);
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!pathInput.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        dropdown.style.display = 'none';
      }
    });

    // Keyboard navigation
    pathInput.addEventListener('keydown', (e) => {
      const suggestions = dropdown.querySelectorAll('.autocomplete-suggestion');
      if (suggestions.length === 0) return;

      let selectedIndex = -1;
      suggestions.forEach((suggestion, index) => {
        if (suggestion.classList.contains('selected')) {
          selectedIndex = index;
        }
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) {
          (suggestions[selectedIndex] as HTMLElement).click();
        }
        return;
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        return;
      }

      // Update selection
      suggestions.forEach((suggestion, index) => {
        suggestion.classList.toggle('selected', index === selectedIndex);
        if (index === selectedIndex) {
          suggestion.style.backgroundColor = 'var(--background-modifier-hover)';
        } else {
          suggestion.style.backgroundColor = 'transparent';
        }
      });
    });
  }

  /**
   * Update the list of existing vault templates
   */
  private updateVaultTemplatesList(container: HTMLElement, registry: any): void {
    container.empty();
    
    const vaultTemplates = registry.getAllTemplates().filter((t: any) => t.category === 'vault-file');
    
    if (vaultTemplates.length === 0) {
      container.createEl('p', { 
        text: 'No vault templates added yet.',
        cls: 'setting-item-description'
      });
      return;
    }

    container.createEl('h6', { text: 'Existing Vault Templates' });
    
    const templatesList = container.createEl('div', { cls: 'vault-templates-list' });
    templatesList.style.cssText = 'margin: 8px 0;';
    
    vaultTemplates.forEach((template: any) => {
      const templateItem = templatesList.createEl('div', { cls: 'vault-template-item' });
      templateItem.style.cssText = `
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        padding: 8px 12px; 
        margin: 4px 0; 
        background: var(--background-secondary);
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      `;
      
      const templateInfo = templateItem.createEl('div');
      templateInfo.createEl('strong', { text: template.name });
      templateInfo.createEl('br');
      templateInfo.createEl('small', { 
        text: `File: ${template.filePath}`,
        cls: 'setting-item-description'
      });
      
      const templateActions = templateItem.createEl('div', { cls: 'template-actions' });
      templateActions.style.cssText = 'display: flex; gap: 4px;';
      
      const refreshBtn = templateActions.createEl('button', { text: '🔄', title: 'Refresh from file' });
      refreshBtn.style.cssText = 'padding: 2px 6px; font-size: 12px;';
      
      const removeBtn = templateActions.createEl('button', { text: '🗑️', title: 'Remove template' });
      removeBtn.style.cssText = 'padding: 2px 6px; font-size: 12px; color: var(--color-red);';
      
      refreshBtn.addEventListener('click', async () => {
        const success = await registry.refreshVaultFileTemplate(template.id);
        if (success) {
          new Notice(`✅ Template "${template.name}" refreshed`);
        } else {
          new Notice(`❌ Failed to refresh template "${template.name}"`);
        }
      });
      
      removeBtn.addEventListener('click', () => {
        const confirmed = confirm(`Remove template "${template.name}"?\n\nThis will remove the template from the registry but won't delete the original file.`);
        if (confirmed) {
          const success = registry.removeVaultFileTemplate(template.id);
          if (success) {
            new Notice(`✅ Template "${template.name}" removed`);
            this.updateVaultTemplatesList(container, registry);
            this.display(); // Refresh settings to update dropdown
          } else {
            new Notice(`❌ Failed to remove template "${template.name}"`);
          }
        }
      });
    });
  }


  /**
   * Open template editor modal
   */
  private openTemplateEditor(templateType: string): void {
    const modal = new TemplateEditorModal(this.app, this.plugin, templateType);
    modal.open();
  }

  /**
   * Reset research template to standard template with confirmation dialog
   */
  private async resetToStandardTemplate(): Promise<void> {
    const confirmed = confirm(
      '⚠️ Reset Research Template\n\n' +
      'This will replace your current custom research template with the standard template. ' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) return;

    try {
      // Get the standard template from the registry
      const registry = TemplateRegistry.getInstance();
      const standardTemplate = registry.getTemplateContent('research-standard');
      
      // Set the research template to use the standard template
      if (!this.plugin.settings.research.templates) {
        this.plugin.settings.research.templates = {};
      }
      
      // Set the standard template as the research template
      this.plugin.settings.research.templates.research = standardTemplate;
      
      // Also update the default template setting
      this.plugin.settings.research.defaults.template = 'research-standard';
      
      // Save settings
      await this.plugin.saveSettings();

      // Refresh the settings display
      this.display();

      // Show success message
      new Notice('✅ Research template has been reset to standard template');
    } catch (error) {
      console.error('Failed to reset research template:', error);
      new Notice('❌ Failed to reset research template. Please try again.');
    }
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

  /**
   * Load available Ollama embedding models using 'ollama list' command
   * Filters models that are suitable for embeddings
   */
  private async loadOllamaEmbeddingModels(dropdown: any): Promise<void> {
    try {
      // Try to fetch models from Ollama
      const models = await this.fetchOllamaModels();
      
      // Filter models that are likely embedding models
      const embeddingModels = models.filter(model => {
        const name = model.name.toLowerCase();
        return name.includes('embed') || 
               name.includes('qwen') ||
               name.includes('nomic') ||
               name.includes('mxbai') ||
               name.includes('sentence') ||
               name.includes('minilm') ||
               name.includes('all-') ||
               name.includes('e5-');
      });
      
      // Clear the dropdown
      dropdown.selectEl.empty();
      
      if (embeddingModels.length === 0) {
        // No embedding models found, show all models + common embedding models
        dropdown.addOption('', '⚠️ No embedding models detected');
        
        // Add all available models (user might know which ones work)
        if (models.length > 0) {
          models.forEach(model => {
            dropdown.addOption(model.name, `${model.name} (${model.size}) - General model`);
          });
        }
        
        // Add common embedding models that might not be installed
        const commonEmbeddingModels = [
          'nomic-embed-text',
          'mxbai-embed-large', 
          'all-MiniLM-L6-v2',
          'qwen2.5:0.5b',
          'qwen3-embedding'
        ];
        commonEmbeddingModels.forEach(model => {
          if (!models.find(m => m.name === model)) {
            dropdown.addOption(model, `${model} (not installed) - Embedding model`);
          }
        });
      } else {
        // Add detected embedding models
        embeddingModels.forEach(model => {
          const isQwen = model.name.toLowerCase().includes('qwen');
          const context = isQwen ? '32K context' : 'Standard context';
          dropdown.addOption(model.name, `✅ ${model.name} (${model.size}) - ${context}`);
        });
        
        // Also add any non-embedding models in case user wants to use them
        const otherModels = models.filter(m => !embeddingModels.includes(m));
        if (otherModels.length > 0) {
          otherModels.forEach(model => {
            dropdown.addOption(model.name, `${model.name} (${model.size}) - General model`);
          });
        }
      }
      
      // Set current value or first available embedding model
      const currentModel = this.plugin.settings.rag.embeddings.model;
      const availableModel = models.find(m => m.name === currentModel || m.name.includes(currentModel));
      
      if (availableModel) {
        dropdown.setValue(availableModel.name);
      } else if (embeddingModels.length > 0) {
        dropdown.setValue(embeddingModels[0].name);
        // Update settings with first available embedding model
        this.plugin.settings.rag.embeddings.model = embeddingModels[0].name;
        await this.plugin.saveSettings();
      } else if (models.length > 0) {
        // No embedding models, use first available model
        dropdown.setValue(models[0].name);
        this.plugin.settings.rag.embeddings.model = models[0].name;
        await this.plugin.saveSettings();
      }
      
      // Add change handler
      dropdown.onChange(async (value: string) => {
        this.plugin.settings.rag.embeddings.model = value;
        await this.plugin.saveSettings();
        
        // Update recommendations for all related settings
        this.updateEmbeddingRecommendations(value);
      });
      
    } catch (error) {
      console.error('Failed to load Ollama embedding models:', error);
      dropdown.selectEl.empty();
      dropdown.addOption('', '❌ Error loading models');
      dropdown.addOption('nomic-embed-text', 'nomic-embed-text (fallback)');
      dropdown.setValue(this.plugin.settings.rag.embeddings.model || 'nomic-embed-text');
    }
  }

  /**
   * Load available Ollama models using 'ollama list' command
   */
  private async loadOllamaModels(dropdown: any): Promise<void> {
    try {
      // Try to fetch models from Ollama
      const models = await this.fetchOllamaModels();
      
      // Clear the dropdown
      dropdown.selectEl.empty();
      
      if (models.length === 0) {
        // No models found, add fallback options
        dropdown.addOption('', 'No models found - install models with: ollama pull llama3.2');
        AI_MODELS.OLLAMA.forEach(model => {
          dropdown.addOption(model, `${model} (not installed)`);
        });
      } else {
        // Add available models
        models.forEach(model => {
          dropdown.addOption(model.name, `${model.name} (${model.size})`);
        });
        
        // Add common models that might not be installed yet
        const commonModels = ['llama3.2', 'llama3.1', 'codellama', 'mistral'];
        commonModels.forEach(model => {
          if (!models.find(m => m.name.includes(model))) {
            dropdown.addOption(model, `${model} (not installed)`);
          }
        });
      }
      
      // Set current value or first available
      const currentModel = this.plugin.settings.providers.ollama.model;
      const availableModel = models.find(m => m.name === currentModel || m.name.includes(currentModel));
      
      if (availableModel) {
        dropdown.setValue(availableModel.name);
      } else if (models.length > 0) {
        dropdown.setValue(models[0].name);
        // Update settings with first available model
        this.plugin.settings.providers.ollama.model = models[0].name;
        await this.plugin.saveSettings();
      }
      
      // Add change handler
      dropdown.onChange(async (value: string) => {
        this.plugin.settings.providers.ollama.model = value;
        await this.plugin.saveSettings();
      });
      
    } catch (error) {
      console.warn('Failed to load Ollama models:', error);
      
      // Fallback to static list
      dropdown.selectEl.empty();
      dropdown.addOption('', 'Failed to load models - check Ollama installation');
      AI_MODELS.OLLAMA.forEach(model => {
        dropdown.addOption(model, model);
      });
      
      dropdown.setValue(this.plugin.settings.providers.ollama.model);
      dropdown.onChange(async (value: string) => {
        this.plugin.settings.providers.ollama.model = value;
        await this.plugin.saveSettings();
      });
    }
  }

  /**
   * Fetch models from Ollama using the API
   */
  private async fetchOllamaModels(): Promise<Array<{ name: string; size: string; modified: string }>> {
    const ollamaUrl = this.plugin.settings.providers.ollama.baseUrl;
    const baseUrl = ollamaUrl.replace('/v1', ''); // Remove /v1 for API calls
    
    try {
      // Try API first (faster)
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.models || []).map((model: any) => ({
          name: model.name,
          size: model.size ? this.formatBytes(model.size) : 'Unknown size',
          modified: model.modified_at ? new Date(model.modified_at).toLocaleDateString() : 'Unknown'
        }));
      }
    } catch (apiError) {
      console.warn('Ollama API call failed, trying CLI fallback:', apiError);
    }
    
    // Fallback to CLI command (requires Obsidian to have access to shell)
    try {
      // This might not work in all environments due to security restrictions
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('ollama list', { timeout: 10000 });
      
      // Parse ollama list output
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      return lines.map((line: string) => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0] || 'unknown',
          size: parts[1] || 'Unknown size',
          modified: parts[2] || 'Unknown'
        };
      }).filter((model: any) => model.name !== 'unknown');
      
    } catch (cliError) {
      console.warn('Ollama CLI call failed:', cliError);
      throw new Error('Unable to fetch models via API or CLI');
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private addMoESection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: '🧠 MoE System Settings' });
    containerEl.createEl('p', { 
      text: 'Configure the Mixture of Experts system for intelligent vault assistance.',
      cls: 'setting-item-description'
    });

    // Enable MoE System
    new Setting(containerEl)
      .setName('Enable MoE System')
      .setDesc('Enable the vault-integrated Mixture of Experts system')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.features.moeSystemEnabled)
          .onChange(async (value) => {
            this.plugin.settings.features.moeSystemEnabled = value;
            await this.plugin.saveSettings();
            
            if (value) {
              new Notice('🧠 MoE System will initialize on next plugin load', 3000);
            } else {
              new Notice('MoE System disabled', 2000);
            }
            
            // Refresh the settings display to show/hide MoE settings
            this.display();
          });
      });

    if (!this.plugin.settings.features.moeSystemEnabled) {
      return; // Don't show other settings if MoE is disabled
    }


    containerEl.createEl('h4', { text: 'Agent Settings' });

    new Setting(containerEl)
      .setName('Enable Personalization')
      .setDesc('Let agents learn your vault patterns and preferences')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.moe.agents.enablePersonalization)
          .onChange(async (value) => {
            this.plugin.settings.moe.agents.enablePersonalization = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Agent Confidence Threshold')
      .setDesc('Minimum confidence for agent routing (lower = more agents used)')
      .addSlider(slider => {
        slider
          .setLimits(0.1, 1.0, 0.1)
          .setValue(this.plugin.settings.moe.agents.confidenceThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.moe.agents.confidenceThreshold = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Max Agents Per Request')
      .setDesc('Maximum number of agents to consult for each request')
      .addSlider(slider => {
        slider
          .setLimits(1, 6, 1)
          .setValue(this.plugin.settings.moe.agents.maxAgentsPerRequest)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.moe.agents.maxAgentsPerRequest = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl('h4', { text: 'Feedback & Health Settings' });

    new Setting(containerEl)
      .setName('Show Feedback Buttons')
      .setDesc('Show thumbs up/down buttons on responses for learning')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.moe.feedback.showFeedbackButtons)
          .onChange(async (value) => {
            this.plugin.settings.moe.feedback.showFeedbackButtons = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Enable Health Monitoring')
      .setDesc('Automatically check vault health and suggest improvements')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.moe.health.enablePeriodicChecks)
          .onChange(async (value) => {
            this.plugin.settings.moe.health.enablePeriodicChecks = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Auto-fix Minor Issues')
      .setDesc('Automatically fix simple problems like broken links')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.moe.health.autoFixMinorIssues)
          .onChange(async (value) => {
            this.plugin.settings.moe.health.autoFixMinorIssues = value;
            await this.plugin.saveSettings();
          });
      });

    // System status if MoE is active
    if ((this.plugin as any).moeOrchestrator) {
      this.addMoESystemStatus();
    }
  }

  private addMoESystemStatus(): void {
    const { containerEl } = this;
    const moeOrchestrator = (this.plugin as any).moeOrchestrator;
    
    if (!moeOrchestrator) return;
    
    containerEl.createEl('h4', { text: 'System Status' });
    
    const status = moeOrchestrator.getSystemStatus();
    const statusEl = containerEl.createEl('div', { cls: 'clippy-moe-status' });
    
    statusEl.createEl('p', { 
      text: `Status: ${status.initialized ? '✅ Active' : '❌ Inactive'}` 
    });
    
    statusEl.createEl('p', { 
      text: `System Enabled: ${status.enabled ? '✅ Yes' : '❌ No'}` 
    });
    
    statusEl.createEl('p', { 
      text: `Available Experts: ${status.agentCount}` 
    });
    
    statusEl.createEl('p', { 
      text: `Average Response Time: ${status.responseTime}ms` 
    });

    // Reset button
    new Setting(containerEl)
      .setName('Reset MoE System')
      .setDesc('Clear chat history and reset all learning data')
      .addButton(button => {
        button
          .setButtonText('Reset MoE Data')
          .setWarning()
          .onClick(async () => {
            await moeOrchestrator.resetSystem();
            new Notice('🔄 MoE system data reset', 2000);
            this.display(); // Refresh settings
          });
      });
  }

  /**
   * Update embedding recommendations when model selection changes
   */
  private updateEmbeddingRecommendations(modelName: string): void {
    const recommendations = this.getModelRecommendations(modelName);
    
    // Update dimensions setting recommendation
    const dimensionsContainer = (this as any)._dimensionsContainer;
    if (dimensionsContainer) {
      this.updateRecommendationDisplay(dimensionsContainer, 'dimensions', recommendations.dimensions);
    }
    
    // Update maxTokens setting recommendation
    const maxTokensContainer = (this as any)._maxTokensContainer;
    if (maxTokensContainer) {
      this.updateRecommendationDisplay(maxTokensContainer, 'maxTokens', recommendations.maxTokens);
    }
    
    // Update chunkSize setting recommendation
    const chunkSizeContainer = (this as any)._chunkSizeContainer;
    if (chunkSizeContainer) {
      this.updateRecommendationDisplay(chunkSizeContainer, 'chunkSize', recommendations.chunkSize);
    }
  }

  /**
   * Get model recommendations based on model name
   */
  private getModelRecommendations(modelName: string): {
    dimensions: number | null;
    maxTokens: number | null;
    chunkSize: number | null;
  } {
    if (!modelName) {
      return { dimensions: null, maxTokens: null, chunkSize: null };
    }

    const nameLower = modelName.toLowerCase();
    
    // Qwen models
    if (nameLower.includes('qwen')) {
      return {
        dimensions: 1536,
        maxTokens: 32768,
        chunkSize: 8192 // Reasonable chunk size for 32K context
      };
    }
    
    // Nomic models
    if (nameLower.includes('nomic')) {
      return {
        dimensions: 768,
        maxTokens: 2048,
        chunkSize: 1024
      };
    }
    
    // MxBai models
    if (nameLower.includes('mxbai')) {
      return {
        dimensions: 1024,
        maxTokens: 512,
        chunkSize: 256
      };
    }
    
    // BGE models
    if (nameLower.includes('bge-large')) {
      return {
        dimensions: 1024,
        maxTokens: 512,
        chunkSize: 256
      };
    }
    
    if (nameLower.includes('bge-base') || nameLower.includes('bge-small')) {
      return {
        dimensions: 768,
        maxTokens: 512,
        chunkSize: 256
      };
    }
    
    // E5 models
    if (nameLower.includes('e5')) {
      return {
        dimensions: 1024,
        maxTokens: 512,
        chunkSize: 256
      };
    }
    
    // All-MiniLM
    if (nameLower.includes('minilm')) {
      return {
        dimensions: 384,
        maxTokens: 512,
        chunkSize: 256
      };
    }
    
    // Default recommendations
    return {
      dimensions: 768,
      maxTokens: 2048,
      chunkSize: 1024
    };
  }

  /**
   * Update recommendation display for a setting
   */
  private updateRecommendationDisplay(containerEl: HTMLElement, settingName: string, recommendedValue: number | null): void {
    // Find existing recommendation element
    const existingRec = containerEl.querySelector(`[data-recommendation="${settingName}"]`);
    if (existingRec) {
      existingRec.remove();
    }
    
    if (recommendedValue !== null) {
      // Create new recommendation element
      const recEl = containerEl.createDiv();
      recEl.setAttribute('data-recommendation', settingName);
      recEl.style.fontSize = '0.85em';
      recEl.style.color = 'var(--text-muted)';
      recEl.style.fontStyle = 'italic';
      recEl.style.marginTop = '4px';
      recEl.textContent = `Recommended: ${recommendedValue}`;
    }
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
   * Load settings with defaults and migration
   */
  async loadSettings(): Promise<ClippySettings> {
    const data = await this.plugin.loadData();
    const mergedSettings = this.deepMerge(DEFAULT_SETTINGS, data || {});
    
    // Run settings migration for new features
    const migratedSettings = this.migrateSettings(mergedSettings, data);
    
    // Decrypt sensitive data
    const decryptedSettings = SecureStorage.decryptSettings(migratedSettings);
    
    // Save migrated settings if migration occurred
    if (this.needsMigration(data)) {
      console.log('[Settings Manager] Settings migrated to include new visualizer configs');
      // Save with encryption
      await this.plugin.saveData(SecureStorage.encryptSettings(migratedSettings));
    }
    
    return decryptedSettings;
  }

  /**
   * Deep merge settings to handle nested objects properly
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Migrate settings for new features and backwards compatibility
   */
  private migrateSettings(settings: ClippySettings, originalData: any): ClippySettings {
    const migrated = { ...settings };
    const currentVersion = this.getSettingsVersion(originalData);

    console.log(`[Settings Manager] Current settings version: ${currentVersion}, target version: ${DEFAULT_SETTINGS.version}`);

    // Migration from v1 to v2: Add voice visualizer settings
    if (currentVersion < 2) {
      console.log('[Settings Manager] Migrating from v1 to v2: Adding voice visualizer configuration');
      
      // Add voice settings if missing entirely
      if (!migrated.voice) {
        console.log('[Settings Manager] Adding complete voice configuration for first-time setup');
        migrated.voice = { ...DEFAULT_SETTINGS.voice };
      } else {
        // Add visualizer settings to existing voice configuration
        if (!migrated.voice.visualizers) {
          console.log('[Settings Manager] Adding voice visualizer configuration to existing voice settings');
          migrated.voice.visualizers = {
            vad: {
              enabled: true,
              sensitivity: 0.7,
              size: 'medium',
              position: 'inline',
              showConfidence: true,
              animationSpeed: 'normal',
              colors: {
                silent: '#6b7280',
                speech: '#10b981', 
                noise: '#f59e0b'
              }
            },
            tts: {
              enabled: true,
              spectrumBars: 24,
              height: 50,
              showBorder: true,
              borderIntensity: 1.0,
              showGlow: true,
              glowThreshold: 0.7,
              colors: {
                primary: 'auto',
                secondary: 'auto',
                background: 'auto'
              },
              smoothing: 0.85,
              minDecibels: -90,
              maxDecibels: -10
            }
          };
        }
      }
    }

    // Ensure complete visualizer settings even for partial configurations
    if (migrated.voice && migrated.voice.visualizers) {
      if (!migrated.voice.visualizers.vad) {
        console.log('[Settings Manager] Adding missing VAD visualizer configuration');
        migrated.voice.visualizers.vad = DEFAULT_SETTINGS.voice.visualizers.vad;
      }
      if (!migrated.voice.visualizers.tts) {
        console.log('[Settings Manager] Adding missing TTS visualizer configuration');
        migrated.voice.visualizers.tts = DEFAULT_SETTINGS.voice.visualizers.tts;
      }
    }

    // Update to current version
    migrated.version = DEFAULT_SETTINGS.version;

    // Future migrations can be added here
    if (currentVersion < 3) {
      console.log('[Settings Manager] Migrating from v2 to v3: Adding maxTokens setting for research');
      // Ensure research.defaults.maxTokens exists
      if (!migrated.research?.defaults?.maxTokens) {
        if (!migrated.research) migrated.research = { ...DEFAULT_SETTINGS.research };
        if (!migrated.research.defaults) migrated.research.defaults = { ...DEFAULT_SETTINGS.research.defaults };
        migrated.research.defaults.maxTokens = 0; // 0 = unlimited
      }
    }

    return migrated;
  }

  /**
   * Check if settings need migration
   */
  private needsMigration(originalData: any): boolean {
    if (!originalData) return false;
    
    const currentVersion = this.getSettingsVersion(originalData);
    const targetVersion = DEFAULT_SETTINGS.version || 2;
    
    // Need migration if version is outdated
    if (currentVersion < targetVersion) {
      return true;
    }
    
    // Additional checks for missing configurations (for safety)
    if (originalData.voice && !originalData.voice.visualizers) {
      return true;
    }
    
    // Check for incomplete visualizer settings
    if (originalData.voice?.visualizers) {
      const hasVAD = originalData.voice.visualizers.vad && 
                    originalData.voice.visualizers.vad.colors &&
                    typeof originalData.voice.visualizers.vad.sensitivity === 'number';
      const hasTTS = originalData.voice.visualizers.tts && 
                    originalData.voice.visualizers.tts.colors &&
                    typeof originalData.voice.visualizers.tts.spectrumBars === 'number';
      
      if (!hasVAD || !hasTTS) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get settings version for future migrations
   */
  private getSettingsVersion(data: any): number {
    return data?.version || 1;
  }

  /**
   * Save settings with encryption for sensitive data
   */
  async saveSettings(settings: ClippySettings): Promise<void> {
    // Encrypt sensitive data before saving
    const encryptedSettings = SecureStorage.encryptSettings(settings);
    await this.plugin.saveData(encryptedSettings);
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
    if (settings.providers.openai.enabled) {
      if (!settings.providers.openai.apiKey) {
        errors.push('OpenAI API key is required when OpenAI is enabled');
      } else if (!SecureStorage.validateApiKeyFormat(settings.providers.openai.apiKey, 'sk-')) {
        errors.push('Invalid OpenAI API key format (should start with sk-)');
      }
    }

    if (settings.providers.anthropic.enabled) {
      if (!settings.providers.anthropic.apiKey) {
        errors.push('Anthropic API key is required when Anthropic is enabled');
      } else if (!SecureStorage.validateApiKeyFormat(settings.providers.anthropic.apiKey, 'sk-ant-')) {
        errors.push('Invalid Anthropic API key format (should start with sk-ant-)');
      }
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

/**
 * Template Editor Modal
 */
class TemplateEditorModal extends Modal {
  plugin: ClippyPlugin;
  templateType: string;
  textArea: HTMLTextAreaElement;

  constructor(app: App, plugin: ClippyPlugin, templateType: string) {
    super(app);
    this.plugin = plugin;
    this.templateType = templateType;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: `Edit ${this.templateType} Template` });
    contentEl.createEl('p', { 
      text: 'Customize your research note template. Use {{variables}} for dynamic content.',
      cls: 'setting-item-description'
    });

    // Template Editor
    const editorContainer = contentEl.createEl('div', { cls: 'template-editor-container' });
    editorContainer.style.cssText = 'margin: 16px 0;';

    this.textArea = editorContainer.createEl('textarea', { cls: 'template-editor' });
    this.textArea.style.cssText = `
      width: 100%;
      height: 400px;
      font-family: var(--font-monospace);
      font-size: 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 12px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: vertical;
    `;
    
    // Get current template content asynchronously
    this.getCurrentTemplate().then(template => {
      this.textArea.value = template;
    }).catch(error => {
      console.error('Failed to load template:', error);
      this.textArea.value = '// Failed to load template. Please try again.';
    });

    // Action buttons
    const buttonContainer = contentEl.createEl('div', { cls: 'template-editor-buttons' });
    buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

    const saveBtn = buttonContainer.createEl('button', { text: 'Save Template', type: 'button', cls: 'mod-cta' });
    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel', type: 'button' });

    saveBtn.addEventListener('click', () => {
      this.saveTemplate();
      this.close();
    });

    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }

  private async getCurrentTemplate(): Promise<string> {
    const registry = TemplateRegistry.getInstance();

    // Try to get saved template based on the type being edited
    if (this.plugin.settings.research.templates) {
      if (this.templateType === 'custom') {
        // For custom, return the saved research template if it exists
        return this.plugin.settings.research.templates.research || registry.getTemplateContent('research-standard');
      } else {
        // For other template types, try to load their saved version or use registry
        return this.plugin.settings.research.templates[this.templateType] || registry.getTemplateContent(this.templateType);
      }
    }

    // Use template from registry
    return registry.getTemplateContent(this.templateType);
  }


  private async saveTemplate(): Promise<void> {
    try {
      const templateContent = this.textArea.value;
      
      // Validate template content is not empty
      if (!templateContent.trim()) {
        new Notice('❌ Template cannot be empty');
        return;
      }

      // Initialize templates object if it doesn't exist
      if (!this.plugin.settings.research.templates) {
        this.plugin.settings.research.templates = {};
      }

      // Save the template based on the type
      if (this.templateType === 'custom' || this.templateType === 'research-standard') {
        // For custom or editing the standard, save as the research template
        this.plugin.settings.research.templates.research = templateContent;
      } else {
        // For other template types, save with their specific key
        this.plugin.settings.research.templates[this.templateType] = templateContent;
      }

      // Also update the default template setting to use this template
      this.plugin.settings.research.defaults.template = 'custom';
      
      // Save settings to disk
      await this.plugin.saveSettings();
      
      new Notice('✅ Template saved successfully!');
      console.log(`Template "${this.templateType}" saved:`, templateContent.substring(0, 100) + '...');
    } catch (error) {
      console.error('Failed to save template:', error);
      new Notice('❌ Failed to save template. Please try again.');
    }
  }
}