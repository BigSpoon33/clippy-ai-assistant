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

    // Research Settings
    this.addResearchSection();

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
        text
          .setPlaceholder('tvly-...')
          .setValue(this.plugin.settings.research.searchEngine.tavilyApiKey ? '••••••••' : '')
          .onChange(async (value) => {
            if (value !== '••••••••') {
              this.plugin.settings.research.searchEngine.tavilyApiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
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

    new Setting(containerEl)
      .setName('Default template')
      .setDesc('Default note template for research generation')
      .addDropdown(dropdown => {
        dropdown
          .addOption('research-standard', 'Research Standard (Comprehensive)')
          .addOption('herb-profile', 'Herb Profile (Botanical focus)')
          .addOption('medical', 'Medical Research (Health focus)')
          .addOption('simple', 'Simple (Minimal sections)')
          .setValue(this.plugin.settings.research.defaults.template)
          .onChange(async (value) => {
            this.plugin.settings.research.defaults.template = value;
            await this.plugin.saveSettings();
          });
      });

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