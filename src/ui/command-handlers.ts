/**
 * CLIPPY AI Assistant - Command Handlers
 * Command palette integration and user interaction handlers
 */

import { Editor, MarkdownView, Notice, TFile } from 'obsidian';
import ClippyPlugin from '../main';
import { COMMANDS } from '../types';
import { ProviderFactory } from '../ai/provider-factory';
import { ContentAnalyzer } from '../processors/content-analyzer';
import { AIEnhancementModal } from './ai-chat-modal';
import { TagSuggestionModal } from './tag-suggestion-modal';

export class CommandHandlers {
  private plugin: ClippyPlugin;

  constructor(plugin: ClippyPlugin) {
    this.plugin = plugin;
  }

  /**
   * Register all CLIPPY commands with Obsidian
   */
  registerCommands(): void {
    // Enhance current note
    this.plugin.addCommand({
      id: COMMANDS.ENHANCE_NOTE,
      name: 'Enhance current note with AI',
      icon: 'sparkles',
      editorCallback: this.handleEnhanceNote.bind(this),
    });

    // Quick tag suggestions
    this.plugin.addCommand({
      id: COMMANDS.QUICK_TAG,
      name: 'Quick AI tagging suggestions',
      icon: 'tags',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 't' }],
      editorCallback: this.handleQuickTag.bind(this),
    });

    // Summarize note
    this.plugin.addCommand({
      id: COMMANDS.SUMMARIZE,
      name: 'Summarize current note',
      icon: 'file-text',
      editorCallback: this.handleSummarize.bind(this),
    });

    // Chat with AI
    this.plugin.addCommand({
      id: COMMANDS.CHAT_WITH_AI,
      name: 'Chat with AI about current note',
      icon: 'message-circle',
      editorCallback: this.handleChatWithAI.bind(this),
    });

    // Analyze vault patterns
    this.plugin.addCommand({
      id: COMMANDS.ANALYZE_VAULT,
      name: 'Analyze vault patterns',
      icon: 'search',
      callback: this.handleAnalyzeVault.bind(this),
    });

    // Format note
    this.plugin.addCommand({
      id: 'clippy-format-note',
      name: 'Format current note',
      icon: 'align-left',
      editorCallback: this.handleFormatNote.bind(this),
    });

    // Generate content suggestions
    this.plugin.addCommand({
      id: 'clippy-content-suggestions',
      name: 'Get content suggestions',
      icon: 'lightbulb',
      editorCallback: this.handleContentSuggestions.bind(this),
    });

    // Quick insights
    this.plugin.addCommand({
      id: 'clippy-quick-insights',
      name: 'Get quick insights about note',
      icon: 'bar-chart',
      editorCallback: this.handleQuickInsights.bind(this),
    });
  }

  /**
   * Handle note enhancement command
   */
  async handleEnhanceNote(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      if (!this.plugin.settings.features.noteFormatting) {
        new Notice('Note formatting is disabled in settings');
        return;
      }

      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      const notice = new Notice('Analyzing note...', 0);

      // Get AI provider and content analyzer
      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const vaultPatterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const analyzer = new ContentAnalyzer(aiProvider, vaultPatterns);

      // Perform comprehensive analysis
      const analysis = await analyzer.analyzeNote(content, this.extractExistingTags(content));

      notice.hide();

      // Show enhancement modal
      const modal = new AIEnhancementModal(
        this.plugin.app,
        content,
        analysis,
        this.plugin.settings,
        (enhancedContent: string) => {
          editor.setValue(enhancedContent);
          new Notice('Note enhanced successfully!');
        }
      );
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Note enhancement failed:', error);
      new Notice(`Enhancement failed: ${error.message}`);
    }
  }

  /**
   * Handle quick tagging command
   */
  private async handleQuickTag(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      if (!this.plugin.settings.features.autoTagging) {
        new Notice('Auto-tagging is disabled in settings');
        return;
      }

      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      const notice = new Notice('Generating tag suggestions...', 0);

      // Get AI provider and generate suggestions
      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const vaultPatterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const autoTagger = new (await import('../processors/auto-tagger')).AutoTagger(aiProvider, vaultPatterns);

      const existingTags = this.extractExistingTags(content);
      const suggestions = await autoTagger.suggestTags(content, existingTags);

      notice.hide();

      if (suggestions.length === 0) {
        new Notice('No tag suggestions found');
        return;
      }

      // Show tag suggestion modal
      const modal = new TagSuggestionModal(
        this.plugin.app,
        suggestions,
        (selectedTags: string[]) => {
          this.addTagsToNote(editor, selectedTags);
          new Notice(`Added ${selectedTags.length} tags`);
        }
      );
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Tag suggestion failed:', error);
      new Notice(`Tag suggestion failed: ${error.message}`);
    }
  }

  /**
   * Handle summarize command
   */
  private async handleSummarize(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      if (content.length < 100) {
        new Notice('Note too short to summarize');
        return;
      }

      const notice = new Notice('Generating summary...', 0);

      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const summary = await aiProvider.generateResponse(
        `Please provide a concise summary of this note content:\n\n${content}`,
        'Create a brief summary that captures the main points and key information.'
      );

      notice.hide();

      // Insert summary at the top of the note
      const frontmatterEnd = content.indexOf('---', 3);
      const insertPosition = frontmatterEnd > 0 ? frontmatterEnd + 4 : 0;
      
      const summarySection = `## Summary\n\n${summary}\n\n`;
      const newContent = content.slice(0, insertPosition) + summarySection + content.slice(insertPosition);
      
      editor.setValue(newContent);
      new Notice('Summary added to note');

    } catch (error) {
      console.error('CLIPPY: Summarization failed:', error);
      new Notice(`Summarization failed: ${error.message}`);
    }
  }

  /**
   * Handle chat with AI command
   */
  private async handleChatWithAI(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      const content = editor.getValue();
      const selectedText = editor.getSelection();

      // Show AI chat modal
      const modal = new AIEnhancementModal(
        this.plugin.app,
        selectedText || content,
        null, // No pre-analysis for chat mode
        this.plugin.settings,
        (result: string) => {
          if (selectedText) {
            editor.replaceSelection(result);
          } else {
            // Insert at cursor position
            editor.replaceRange(result, editor.getCursor());
          }
        },
        true // Chat mode
      );
      modal.open();

    } catch (error) {
      console.error('CLIPPY: AI chat failed:', error);
      new Notice(`AI chat failed: ${error.message}`);
    }
  }

  /**
   * Handle vault analysis command
   */
  private async handleAnalyzeVault(): Promise<void> {
    try {
      const notice = new Notice('Analyzing vault patterns...', 0);

      // Force fresh analysis
      const patterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns(true);

      notice.hide();

      // Show analysis results
      const results = [
        `📁 Found ${patterns.tagPatterns.length} unique tag patterns`,
        `📅 Detected ${patterns.dateFormats.length} date formats`,
        `🎨 Found ${patterns.cssClasses.length} CSS classes`,
        `📝 Analyzed ${patterns.frontmatterSchemas.length} frontmatter fields`,
        `🔗 Found ${patterns.wikilinkPatterns.length} link patterns`,
      ];

      new Notice(`Vault Analysis Complete:\n${results.join('\n')}`, 8000);

      // Log detailed results to console
      console.log('CLIPPY Vault Analysis:', patterns);

    } catch (error) {
      console.error('CLIPPY: Vault analysis failed:', error);
      new Notice(`Vault analysis failed: ${error.message}`);
    }
  }

  /**
   * Handle format note command
   */
  private async handleFormatNote(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      const notice = new Notice('Formatting note...', 0);

      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const vaultPatterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const formatter = new (await import('../processors/markdown-formatter')).MarkdownFormatter(aiProvider, vaultPatterns);

      const result = await formatter.enhanceNote(content);

      notice.hide();

      if (result.enhancedContent === content) {
        new Notice('No formatting changes needed');
        return;
      }

      // Show before/after comparison
      const modal = new AIEnhancementModal(
        this.plugin.app,
        content,
        { formattingResult: result } as any,
        this.plugin.settings,
        (enhancedContent: string) => {
          editor.setValue(enhancedContent);
          new Notice('Note formatted successfully!');
        }
      );
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Note formatting failed:', error);
      new Notice(`Formatting failed: ${error.message}`);
    }
  }

  /**
   * Handle content suggestions command
   */
  private async handleContentSuggestions(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      if (!this.plugin.settings.features.contentSuggestions) {
        new Notice('Content suggestions are disabled in settings');
        return;
      }

      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      const notice = new Notice('Generating content suggestions...', 0);

      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const vaultPatterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const analyzer = new ContentAnalyzer(aiProvider, vaultPatterns);

      const suggestions = await analyzer.generateContentSuggestions(content);

      notice.hide();

      if (suggestions.length === 0) {
        new Notice('No content suggestions available');
        return;
      }

      // Display suggestions
      const suggestionText = suggestions
        .map((suggestion, index) => `${index + 1}. ${suggestion}`)
        .join('\n');

      new Notice(`Content Suggestions:\n${suggestionText}`, 10000);

    } catch (error) {
      console.error('CLIPPY: Content suggestions failed:', error);
      new Notice(`Content suggestions failed: ${error.message}`);
    }
  }

  /**
   * Handle quick insights command
   */
  private async handleQuickInsights(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      const content = editor.getValue();
      if (!content.trim()) {
        new Notice('Note is empty');
        return;
      }

      const notice = new Notice('Generating insights...', 0);

      const aiProvider = await ProviderFactory.createProvider(this.plugin.settings);
      const vaultPatterns = await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const analyzer = new ContentAnalyzer(aiProvider, vaultPatterns);

      const insights = await analyzer.getQuickInsights(content);

      notice.hide();

      // Display insights
      const insightText = [
        `📊 ${insights.wordCount} words, ${insights.readingTime} min read`,
        `🎯 Complexity: ${insights.complexity}`,
        `💭 Sentiment: ${insights.sentiment}`,
        `📝 Topics: ${insights.topics.join(', ') || 'None detected'}`,
      ].join('\n');

      new Notice(`Quick Insights:\n${insightText}`, 8000);

    } catch (error) {
      console.error('CLIPPY: Quick insights failed:', error);
      new Notice(`Quick insights failed: ${error.message}`);
    }
  }

  /**
   * Extract existing tags from content
   */
  private extractExistingTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const yamlContent = frontmatterMatch[1];
      const tagMatch = yamlContent.match(/tags?:\s*\[(.*?)\]/s) || yamlContent.match(/tags?:\s*\n((?:\s*-\s*.+\n)*)/);
      if (tagMatch) {
        const tagString = tagMatch[1];
        const extractedTags = tagString.match(/[\w-]+/g) || [];
        extractedTags.forEach(tag => tags.add(tag));
      }
    }

    // Extract inline tags
    const inlineTagMatches = content.match(/#[\w-]+/g) || [] as string[];
    inlineTagMatches.forEach(tag => tags.add(tag.slice(1)));

    return Array.from(tags);
  }

  /**
   * Add tags to note frontmatter
   */
  private addTagsToNote(editor: Editor, tags: string[]): void {
    const content = editor.getValue();
    const existingTags = this.extractExistingTags(content);
    const newTags = tags.filter(tag => !existingTags.includes(tag));

    if (newTags.length === 0) return;

    // Check if frontmatter exists
    const frontmatterMatch = content.match(/^(---\n[\s\S]*?\n---)/);
    
    if (frontmatterMatch) {
      // Add to existing frontmatter
      const frontmatter = frontmatterMatch[1];
      const allTags = [...existingTags, ...newTags];
      const tagYaml = `tags:\n${allTags.map(tag => `  - ${tag}`).join('\n')}`;
      
      let newFrontmatter;
      if (frontmatter.includes('tags:')) {
        // Replace existing tags
        newFrontmatter = frontmatter.replace(/tags:\s*\[(.*?)\]/s, tagYaml)
                                    .replace(/tags:\s*\n((?:\s*-\s*.+\n)*)/s, tagYaml);
      } else {
        // Add tags to frontmatter
        newFrontmatter = frontmatter.replace('---', `tags:\n${allTags.map(tag => `  - ${tag}`).join('\n')}\n---`);
      }

      const newContent = content.replace(frontmatterMatch[1], newFrontmatter);
      editor.setValue(newContent);
    } else {
      // Create new frontmatter
      const tagYaml = `---\ntags:\n${[...existingTags, ...newTags].map(tag => `  - ${tag}`).join('\n')}\n---\n\n`;
      editor.setValue(tagYaml + content);
    }
  }
}