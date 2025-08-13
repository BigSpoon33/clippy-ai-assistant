/**
 * CLIPPY AI Assistant - Main Plugin Entry Point
 * This file exports the main plugin class for Obsidian
 */

import { Plugin, Notice, MarkdownView, Setting, PluginSettingTab, App, Editor, Modal, ButtonComponent } from 'obsidian';

// Settings interface
interface ClippySettings {
  aiProvider: string;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string;
  anthropicKey: string;
  featuresEnabled: boolean;
}

const DEFAULT_SETTINGS: ClippySettings = {
  aiProvider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  openaiKey: '',
  anthropicKey: '',
  featuresEnabled: true
};

// Settings tab
class ClippySettingsTab extends PluginSettingTab {
  plugin: ClippyPlugin;

  constructor(app: App, plugin: ClippyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'CLIPPY AI Assistant Settings' });

    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Choose your AI provider')
      .addDropdown(dropdown => dropdown
        .addOption('ollama', 'Ollama (Local)')
        .addOption('openai', 'OpenAI')
        .addOption('anthropic', 'Anthropic')
        .setValue(this.plugin.settings.aiProvider)
        .onChange(async (value) => {
          this.plugin.settings.aiProvider = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Ollama URL')
      .setDesc('URL for local Ollama server')
      .addText(text => text
        .setPlaceholder('http://localhost:11434')
        .setValue(this.plugin.settings.ollamaUrl)
        .onChange(async (value) => {
          this.plugin.settings.ollamaUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Ollama Model')
      .setDesc('Model to use for Ollama (e.g., llama3.2, codellama)')
      .addText(text => text
        .setPlaceholder('llama3.2')
        .setValue(this.plugin.settings.ollamaModel)
        .onChange(async (value) => {
          this.plugin.settings.ollamaModel = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Features Enabled')
      .setDesc('Enable AI-powered features')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.featuresEnabled)
        .onChange(async (value) => {
          this.plugin.settings.featuresEnabled = value;
          await this.plugin.saveSettings();
        }));
  }
}

// Enhancement Modal
class EnhancementModal extends Modal {
  private originalContent: string;
  private enhancedContent: string = '';
  private onAccept: (content: string) => void;
  private plugin: ClippyPlugin;

  constructor(app: App, originalContent: string, onAccept: (content: string) => void, plugin: ClippyPlugin) {
    super(app);
    this.originalContent = originalContent;
    this.onAccept = onAccept;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: '🤖 CLIPPY Note Enhancement' });
    
    // Show original content
    contentEl.createEl('h3', { text: 'Original Content:' });
    const originalDiv = contentEl.createDiv('clippy-original');
    originalDiv.createEl('pre', { text: this.originalContent.substring(0, 200) + '...' });
    
    // Custom instructions area
    contentEl.createEl('h3', { text: 'Custom Instructions (Optional):' });
    const instructionsContainer = contentEl.createDiv('clippy-instructions');
    const instructionsTextarea = instructionsContainer.createEl('textarea', {
      placeholder: 'Add specific instructions for the AI (e.g., "Add more detail to the methodology section", "Make it more formal", "Focus on clarity for beginners")...',
      attr: {
        rows: '3',
        style: 'width: 100%; resize: vertical; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);'
      }
    });
    
    // Enhanced content area
    contentEl.createEl('h3', { text: 'Enhanced Content:' });
    const enhancedDiv = contentEl.createDiv('clippy-enhanced');
    const enhancedPre = enhancedDiv.createEl('pre', { text: 'Add custom instructions above and click "Enhance" to generate improved content...' });
    
    // Button container
    const buttonContainer = contentEl.createDiv('clippy-buttons');
    
    // Enhance button
    const enhanceBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✨ Enhance with AI')
      .setCta()
      .onClick(async () => {
        enhanceBtn.setDisabled(true);
        enhanceBtn.setButtonText('🤔 Thinking...');
        
        try {
          const customInstructions = instructionsTextarea.value.trim();
          this.enhancedContent = await this.plugin.enhanceContent(this.originalContent, customInstructions);
          enhancedPre.textContent = this.enhancedContent;
          
          // Show accept/reject buttons
          acceptBtn.setDisabled(false);
          enhanceBtn.setButtonText('✨ Enhance Again');
        } catch (error) {
          enhancedPre.textContent = `Error: ${error.message}`;
          enhanceBtn.setButtonText('✨ Try Again');
        }
        
        enhanceBtn.setDisabled(false);
      });
    
    // Accept button
    const acceptBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✅ Accept')
      .setDisabled(true)
      .onClick(() => {
        this.onAccept(this.enhancedContent);
        this.close();
      });
    
    // Cancel button  
    new ButtonComponent(buttonContainer)
      .setButtonText('❌ Cancel')
      .onClick(() => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Tagging Modal
class TaggingModal extends Modal {
  private content: string;
  private suggestedTags: Array<{tag: string, confidence: number, reason: string}> = [];
  private selectedTags: Set<string> = new Set();
  private onAccept: (tags: string[]) => void;
  private plugin: ClippyPlugin;

  constructor(app: App, content: string, onAccept: (tags: string[]) => void, plugin: ClippyPlugin) {
    super(app);
    this.content = content;
    this.onAccept = onAccept;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: '🏷️ CLIPPY Quick Tagging' });
    
    // Content preview
    contentEl.createEl('h3', { text: 'Content Preview:' });
    const previewDiv = contentEl.createDiv('clippy-content-preview');
    previewDiv.createEl('pre', { text: this.content.substring(0, 300) + '...' });
    
    // Suggested tags area
    contentEl.createEl('h3', { text: 'AI Suggested Tags:' });
    const tagsContainer = contentEl.createDiv('clippy-suggested-tags');
    const loadingDiv = tagsContainer.createDiv('clippy-loading');
    loadingDiv.textContent = '🤔 Analyzing content for tag suggestions...';
    
    // Selected tags preview
    contentEl.createEl('h3', { text: 'Selected Tags:' });
    const selectedContainer = contentEl.createDiv('clippy-selected-tags-preview');
    this.updateSelectedPreview(selectedContainer);
    
    // Button container
    const buttonContainer = contentEl.createDiv('clippy-buttons');
    
    // Generate tags button
    const generateBtn = new ButtonComponent(buttonContainer)
      .setButtonText('🧠 Generate Tag Suggestions')
      .setCta()
      .onClick(async () => {
        generateBtn.setDisabled(true);
        generateBtn.setButtonText('🤔 Analyzing...');
        
        try {
          this.suggestedTags = await this.plugin.generateTagSuggestions(this.content);
          this.renderTagSuggestions(tagsContainer, selectedContainer);
          addBtn.setDisabled(false);
          generateBtn.setButtonText('🔄 Regenerate');
        } catch (error) {
          tagsContainer.empty();
          tagsContainer.createEl('p', { text: `Error: ${error.message}`, cls: 'clippy-error' });
          generateBtn.setButtonText('🧠 Try Again');
        }
        
        generateBtn.setDisabled(false);
      });
    
    // Add selected tags button
    const addBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✅ Add Selected Tags')
      .setDisabled(true)
      .onClick(() => {
        const tagsArray = Array.from(this.selectedTags);
        if (tagsArray.length > 0) {
          this.onAccept(tagsArray);
          this.close();
        } else {
          new Notice('No tags selected!');
        }
      });
    
    // Cancel button
    new ButtonComponent(buttonContainer)
      .setButtonText('❌ Cancel')
      .onClick(() => {
        this.close();
      });

    // Auto-generate on open
    setTimeout(() => {
      generateBtn.buttonEl.click();
    }, 100);
  }

  renderTagSuggestions(container: HTMLElement, selectedContainer: HTMLElement) {
    container.empty();
    
    if (this.suggestedTags.length === 0) {
      container.createEl('p', { text: 'No tag suggestions found.', cls: 'clippy-no-suggestions' });
      return;
    }

    this.suggestedTags.forEach(suggestion => {
      const tagItem = container.createDiv('clippy-tag-suggestion');
      
      // Set the container to flex layout to put checkbox and content on same line
      tagItem.style.display = 'flex';
      tagItem.style.alignItems = 'flex-start';
      tagItem.style.gap = '10px';
      tagItem.style.padding = '8px';
      tagItem.style.marginBottom = '8px';
      tagItem.style.border = '1px solid var(--background-modifier-border)';
      tagItem.style.borderRadius = '4px';
      tagItem.style.backgroundColor = 'var(--background-secondary)';
      
      // Checkbox
      const checkbox = tagItem.createEl('input', { type: 'checkbox' });
      checkbox.checked = this.selectedTags.has(suggestion.tag);
      checkbox.style.marginTop = '2px'; // Align with first line of text
      checkbox.style.flexShrink = '0';
      
      // Tag info container (inline with checkbox)
      const tagInfo = tagItem.createDiv('clippy-tag-info');
      tagInfo.style.flex = '1';
      
      // Tag name and confidence on same line
      const tagHeader = tagInfo.createDiv('clippy-tag-header');
      tagHeader.style.display = 'flex';
      tagHeader.style.alignItems = 'center';
      tagHeader.style.gap = '8px';
      tagHeader.style.marginBottom = '4px';
      
      const tagName = tagHeader.createEl('span', { text: `#${suggestion.tag}`, cls: 'clippy-tag-name' });
      tagName.style.fontWeight = 'bold';
      tagName.style.color = 'var(--text-accent)';
      
      const confidence = Math.round(suggestion.confidence * 100);
      const confidenceSpan = tagHeader.createEl('span', { 
        text: `${confidence}%`,
        cls: `clippy-confidence ${this.getConfidenceClass(confidence)}`
      });
      confidenceSpan.style.fontSize = '0.85em';
      confidenceSpan.style.padding = '2px 6px';
      confidenceSpan.style.borderRadius = '3px';
      confidenceSpan.style.fontWeight = 'bold';
      
      // Set confidence color based on value
      if (confidence >= 80) {
        confidenceSpan.style.backgroundColor = '#10b981';
        confidenceSpan.style.color = 'white';
      } else if (confidence >= 60) {
        confidenceSpan.style.backgroundColor = '#f59e0b';
        confidenceSpan.style.color = 'white';
      } else {
        confidenceSpan.style.backgroundColor = '#ef4444';
        confidenceSpan.style.color = 'white';
      }
      
      // Reason on separate line
      const reason = tagInfo.createEl('div', { text: suggestion.reason, cls: 'clippy-tag-reason' });
      reason.style.fontSize = '0.85em';
      reason.style.color = 'var(--text-muted)';
      reason.style.fontStyle = 'italic';
      reason.style.lineHeight = '1.3';
      
      // Checkbox handler
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedTags.add(suggestion.tag);
        } else {
          this.selectedTags.delete(suggestion.tag);
        }
        this.updateSelectedPreview(selectedContainer);
      });
    });
  }

  updateSelectedPreview(container: HTMLElement) {
    container.empty();
    
    if (this.selectedTags.size === 0) {
      container.createEl('span', { text: 'No tags selected', cls: 'clippy-no-selection' });
      return;
    }

    Array.from(this.selectedTags).forEach(tag => {
      const tagSpan = container.createEl('span', { text: `#${tag}`, cls: 'clippy-selected-tag' });
      
      // Remove button
      const removeBtn = tagSpan.createEl('button', { text: '×', cls: 'clippy-remove-tag' });
      removeBtn.addEventListener('click', () => {
        this.selectedTags.delete(tag);
        this.updateSelectedPreview(container);
        // Update checkboxes
        const checkboxes = this.contentEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, index) => {
          if (this.suggestedTags[index]?.tag === tag) {
            (cb as HTMLInputElement).checked = false;
          }
        });
      });
    });
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'clippy-confidence-high';
    if (confidence >= 60) return 'clippy-confidence-medium';
    return 'clippy-confidence-low';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Main plugin class
export default class ClippyPlugin extends Plugin {
  settings: ClippySettings;

  async onload() {
    console.log('CLIPPY AI Assistant: Plugin loaded successfully');
    
    // Load settings
    await this.loadSettings();
    
    // Add settings tab
    this.addSettingTab(new ClippySettingsTab(this.app, this));
    
    // Add test command
    this.addCommand({
      id: 'clippy-test',
      name: 'Test CLIPPY Connection',
      callback: async () => {
        if (this.settings.featuresEnabled) {
          await this.testConnection();
        } else {
          new Notice('🤖 CLIPPY features are disabled. Enable in settings.');
        }
      }
    });

    // Add enhance note command
    this.addCommand({
      id: 'clippy-enhance-note',
      name: 'Enhance current note with AI',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (!this.settings.featuresEnabled) {
          new Notice('🤖 CLIPPY features are disabled. Enable in settings.');
          return;
        }

        const content = editor.getValue();
        if (!content.trim()) {
          new Notice('Note is empty - nothing to enhance!');
          return;
        }

        const modal = new EnhancementModal(
          this.app, 
          content, 
          (enhancedContent: string) => {
            editor.setValue(enhancedContent);
            new Notice('✅ Note enhanced successfully!');
          },
          this
        );
        modal.open();
      }
    });

    // Add quick tagging command
    this.addCommand({
      id: 'clippy-quick-tag',
      name: 'Quick AI tagging suggestions',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (!this.settings.featuresEnabled) {
          new Notice('🤖 CLIPPY features are disabled. Enable in settings.');
          return;
        }

        const content = editor.getValue();
        if (!content.trim()) {
          new Notice('Note is empty - nothing to tag!');
          return;
        }

        const modal = new TaggingModal(
          this.app,
          content,
          (selectedTags: string[]) => {
            this.addTagsToNote(editor, selectedTags);
            new Notice(`✅ Added ${selectedTags.length} tags to note!`);
          },
          this
        );
        modal.open();
      }
    });

    // Add ribbon icon
    this.addRibbonIcon('sparkles', 'CLIPPY AI Assistant', async () => {
      if (this.settings.featuresEnabled) {
        await this.testConnection();
      } else {
        new Notice('🤖 CLIPPY is disabled. Check settings to enable features.');
      }
    });

    new Notice('🤖 CLIPPY AI Assistant loaded successfully!', 3000);
  }

  async testConnection() {
    try {
      if (this.settings.aiProvider === 'ollama') {
        const response = await fetch(`${this.settings.ollamaUrl}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          new Notice(`✅ Ollama connected! Found ${data.models?.length || 0} models`);
        } else {
          new Notice('❌ Ollama connection failed. Check URL in settings.');
        }
      } else {
        new Notice(`🤖 ${this.settings.aiProvider} provider configured (API key needed for testing)`);
      }
    } catch (error) {
      new Notice(`❌ Connection test failed: ${error.message}`);
    }
  }

  async enhanceContent(content: string, customInstructions?: string): Promise<string> {
    try {
      if (this.settings.aiProvider === 'ollama') {
        return await this.enhanceWithOllama(content, customInstructions);
      } else {
        throw new Error(`Provider ${this.settings.aiProvider} not yet implemented`);
      }
    } catch (error) {
      throw new Error(`Enhancement failed: ${error.message}`);
    }
  }

  async enhanceWithOllama(content: string, customInstructions?: string): Promise<string> {
    // Prepare the prompt for enhancement
    const customSection = customInstructions ? `

CUSTOM INSTRUCTIONS:
${customInstructions}

Please incorporate these specific instructions while following the general rules above.` : '';

    const prompt = `You are CLIPPY, an AI assistant for Obsidian note-taking. Your task is to enhance and improve the following note content while preserving its essential meaning and structure.

IMPORTANT RULES:
1. Preserve ALL wikilinks in [[double brackets]] exactly as they are
2. Preserve ALL frontmatter (content between --- markers) exactly as it is
3. Preserve ALL tags (words starting with #) exactly as they are
4. Do not change dates, names, or specific factual content
5. Focus on improving clarity, organization, and readability
6. Add structure with appropriate headings if missing
7. Fix grammar and spelling errors
8. Improve sentence flow and readability${customSection}

OUTPUT FORMAT:
- Respond with ONLY the enhanced content
- Do NOT add explanations, prefixes, or markdown code blocks
- Do NOT add thinking tags or meta-commentary
- Start directly with the content (or frontmatter if present)

Original content:
"""
${content}
"""

Enhanced version:`;

    const response = await fetch(`${this.settings.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.settings.ollamaModel,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('No response from Ollama');
    }

    return this.cleanAIResponse(data.response.trim());
  }

  cleanAIResponse(response: string): string {
    let cleaned = response;
    
    // Remove common AI artifacts that appear before content
    // Remove thinking tags and content
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>\s*/gi, '');
    
    // Remove markdown code block markers that models often add
    cleaned = cleaned.replace(/^```\s*markdown\s*\n/i, '');
    cleaned = cleaned.replace(/^```\s*\n/i, '');
    cleaned = cleaned.replace(/\n```\s*$/i, '');
    
    // Remove common prefixes that models add
    cleaned = cleaned.replace(/^(here's the enhanced version:|enhanced content:|here is the improved version:)\s*/i, '');
    
    // Clean up any extra whitespace/newlines at start
    cleaned = cleaned.replace(/^\s*\n+/, '');
    
    // If the response starts with quotes or other artifacts, try to extract the actual content
    // Look for frontmatter start and begin from there if present
    const frontmatterMatch = cleaned.match(/(^|\n)(---\s*\n)/);
    if (frontmatterMatch && frontmatterMatch.index && frontmatterMatch.index > 0) {
      // If frontmatter is found but not at the start, extract from frontmatter onwards
      cleaned = cleaned.substring(frontmatterMatch.index + 1);
    }
    
    // Remove any remaining artifacts at the beginning
    cleaned = cleaned.replace(/^[`'"*\s]*/, '');
    
    return cleaned.trim();
  }

  async generateTagSuggestions(content: string): Promise<Array<{tag: string, confidence: number, reason: string}>> {
    try {
      if (this.settings.aiProvider === 'ollama') {
        return await this.generateTagsWithOllama(content);
      } else {
        throw new Error(`Provider ${this.settings.aiProvider} not yet implemented for tagging`);
      }
    } catch (error) {
      throw new Error(`Tag generation failed: ${error.message}`);
    }
  }

  async generateTagsWithOllama(content: string): Promise<Array<{tag: string, confidence: number, reason: string}>> {
    const contentPreview = content.substring(0, 1000);
    const prompt = `You are a tag suggestion system. Analyze the content and return ONLY a JSON array of tag suggestions.

Content to analyze:
"""
${contentPreview}${content.length > 1000 ? '...' : ''}
"""

Rules:
- Suggest 3-6 relevant tags
- Use lowercase with hyphens (e.g. "machine-learning")
- Include confidence 0.1-1.0 and brief reason

Response format (ONLY return this JSON, nothing else):
[{"tag": "example-tag", "confidence": 0.8, "reason": "Main topic discussed"}]`;

    const response = await fetch(`${this.settings.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.settings.ollamaModel,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('No response from Ollama');
    }

    // Parse the JSON response
    try {
      let cleanedResponse = data.response.trim();
      
      // Try to extract JSON array from response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tagSuggestions = JSON.parse(jsonMatch[0]);
        
        // Validate the response format
        if (Array.isArray(tagSuggestions)) {
          // Validate and process each tag suggestion
          const validatedTags = tagSuggestions
            .filter(item => 
              item.tag && 
              typeof item.tag === 'string' &&
              typeof item.confidence === 'number' &&
              typeof item.reason === 'string'
            )
            .map(item => ({
              tag: item.tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
              confidence: Math.min(Math.max(item.confidence, 0), 1),
              reason: item.reason
            }))
            .filter(item => item.tag.length > 0);

          if (validatedTags.length > 0) {
            return validatedTags.slice(0, 8);
          }
        }
      }
      
      throw new Error('No valid JSON array found in response');
    } catch (parseError) {
      // Fallback: extract tags from response text
      return this.extractTagsFromText(data.response);
    }
  }

  extractTagsFromText(text: string): Array<{tag: string, confidence: number, reason: string}> {
    // Fallback method to extract tags if JSON parsing fails
    const tagPattern = /#([a-zA-Z0-9-]+)/g;
    const matches = text.match(tagPattern);
    
    if (!matches) {
      return [
        { tag: 'general-note', confidence: 0.5, reason: 'Default tag when AI parsing failed' }
      ];
    }

    return matches
      .slice(0, 5) // Limit to 5 tags
      .map(match => ({
        tag: match.substring(1).toLowerCase(),
        confidence: 0.6,
        reason: 'Extracted from AI response'
      }));
  }

  addTagsToNote(editor: Editor, tags: string[]): void {
    const content = editor.getValue();
    
    // Check if note has frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    
    if (frontmatterMatch) {
      // Note has frontmatter, add tags to it
      const frontmatterContent = frontmatterMatch[1];
      const remainingContent = content.substring(frontmatterMatch[0].length);
      
      // Parse existing frontmatter
      const lines = frontmatterContent.split('\n');
      let tagsStartIndex = -1;
      let tagsEndIndex = -1;
      let existingTags: string[] = [];
      
      // Find existing tags section (could be multiple lines)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('tags:')) {
          tagsStartIndex = i;
          const tagsPart = line.substring(5).trim();
          
          if (tagsPart.startsWith('[') && tagsPart.endsWith(']')) {
            // Array format: tags: [tag1, tag2] - convert to YAML list
            existingTags = tagsPart.slice(1, -1)
              .split(',')
              .map(t => t.trim().replace(/['"]/g, ''))
              .filter(t => t.length > 0);
            tagsEndIndex = i;
          } else if (tagsPart.length > 0) {
            // Single tag on same line: tags: tag1
            existingTags = [tagsPart.replace(/['"]/g, '')];
            tagsEndIndex = i;
          } else {
            // Multi-line YAML list format
            tagsEndIndex = i;
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine.startsWith('- ')) {
                existingTags.push(nextLine.substring(2).trim());
                tagsEndIndex = j;
              } else if (nextLine.length > 0 && !nextLine.startsWith(' ')) {
                // End of tags section
                break;
              }
            }
          }
          break;
        }
      }
      
      // Merge new tags with existing ones
      const allTags = [...new Set([...existingTags, ...tags])];
      
      // Create new tags section in YAML list format
      const newTagsLines = ['tags:'];
      allTags.forEach(tag => {
        newTagsLines.push(`  - ${tag}`);
      });
      
      // Replace the old tags section
      const newLines = [
        ...lines.slice(0, tagsStartIndex),
        ...newTagsLines,
        ...(tagsEndIndex >= 0 ? lines.slice(tagsEndIndex + 1) : [])
      ];
      
      // If no existing tags section, add it
      if (tagsStartIndex === -1) {
        newLines.push(...newTagsLines);
      }
      
      const newFrontmatter = `---\n${newLines.join('\n')}\n---\n`;
      const newContent = newFrontmatter + remainingContent;
      editor.setValue(newContent);
    } else {
      // Note doesn't have frontmatter, add it with YAML list format
      const frontmatter = `---\ntags:\n${tags.map(tag => `  - ${tag}`).join('\n')}\n---\n\n`;
      const newContent = frontmatter + content;
      editor.setValue(newContent);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log('CLIPPY AI Assistant: Plugin unloaded');
  }
}