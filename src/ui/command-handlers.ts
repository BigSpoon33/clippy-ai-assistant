/**
 * CLIPPY AI Assistant - Command Handlers
 * Command palette integration and user interaction handlers
 */

import { Editor, MarkdownView, Notice, TFile, Modal } from 'obsidian';
import ClippyPlugin from '../main';
import { COMMANDS } from '../types';
import { ProviderFactory } from '../ai/provider-factory';
import { ContentAnalyzer } from '../features/content-processing/processors/content-analyzer';
import { AIEnhancementModal } from './ai-chat-modal';
import { TagSuggestionModal } from './tag-suggestion-modal';
import { OrphanDetector } from '../features/knowledge-management/discovery/orphan-detector';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';
import { BridgeManager } from './bridge-manager';
import { AutomatedNoteGenerator } from '../research/automated-note-generator';
import { NoteStatusMonitor } from '../research/note-status-monitor';
import { ComprehensiveResearchSystem } from '../research/comprehensive-research-system';
import { ClippyErrorBoundaries } from '../utils/error-boundaries';
import { VaultAgentChatModal } from './vault-agent-chat';
import { VoiceEnabledVaultChatModal } from './voice-vault-chat';
import { VIEW_TYPE_VAULT_AGENT } from './vault-agent-sidebar-view';
import { VIEW_TYPE_RESEARCH_AGENT } from './research-agent-sidebar-view';
import { SemanticSearchModal } from '../features/search/semantic-search-integration';
import { IntelligentBacklinkSystem } from '../features/knowledge-management/backlinking/intelligent-backlink-system';
import { BacklinkSuggestionsModal } from './backlink-suggestions-modal';

export class CommandHandlers {
  private plugin: ClippyPlugin;

  constructor(plugin: ClippyPlugin) {
    this.plugin = plugin;
  }

  /**
   * Register all CLIPPY commands with Obsidian
   */
  registerCommands(): void {
    console.log('CLIPPY: Registering commands...');
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

    // Discover bridge opportunities
    this.plugin.addCommand({
      id: COMMANDS.DISCOVER_BRIDGES,
      name: 'Discover bridge opportunities',
      icon: 'link',
      callback: this.handleDiscoverBridges.bind(this),
    });

    // Generate research notes from checklist
    this.plugin.addCommand({
      id: 'clippy-generate-research-notes',
      name: 'Generate research notes from checklist',
      icon: 'search',
      callback: this.handleGenerateResearchNotes.bind(this),
    });

    // Mark research note as completed
    this.plugin.addCommand({
      id: 'clippy-mark-note-completed',
      name: 'Mark research note as completed',
      icon: 'check-circle',
      editorCallback: this.handleMarkNoteCompleted.bind(this),
    });


    // Comprehensive research system
    this.plugin.addCommand({
      id: 'clippy-comprehensive-research',
      name: 'Comprehensive research with vault analysis and web search',
      icon: 'microscope',
      callback: this.handleComprehensiveResearch.bind(this),
    });

    // Semantic search
    this.plugin.addCommand({
      id: COMMANDS.SEMANTIC_SEARCH,
      name: '🧠 Semantic Search - Find notes by meaning',
      icon: 'brain',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }], // Ctrl/Cmd + Shift + F
      callback: this.handleSemanticSearch.bind(this),
    });

    this.plugin.addCommand({
      id: COMMANDS.INTELLIGENT_BACKLINKS,
      name: '🔗 Intelligent Backlinks - Smart link suggestions',
      icon: 'link',
      callback: this.handleIntelligentBacklinks.bind(this),
    });

    
    // Voice Assistant commands (Local Whisper + Piper TTS)
    this.plugin.addCommand({
      id: 'clippy-toggle-voice',
      name: 'Toggle Voice Assistant',
      icon: 'microphone',
      callback: this.handleToggleVoice.bind(this),
    });
    
    this.plugin.addCommand({
      id: 'clippy-test-speak',
      name: 'Test Voice - Speak',
      icon: 'volume-2',
      callback: this.handleTestSpeak.bind(this),
    });
    
    this.plugin.addCommand({
      id: 'clippy-test-listen',
      name: 'Test Voice - Listen',
      icon: 'ear',
      callback: this.handleTestListen.bind(this),
    });

    // Vault Agent Chat
    this.plugin.addCommand({
      id: 'clippy-vault-agent-chat',
      name: 'Open Vault Agent Chat',
      icon: 'robot',
      callback: this.handleVaultAgentChat.bind(this),
    });

    // Vault Agent Sidebar
    this.plugin.addCommand({
      id: 'clippy-vault-agent-sidebar',
      name: 'Open Vault Agent Sidebar',
      icon: 'sidebar-left',
      callback: this.handleVaultAgentSidebar.bind(this),
    });

    // Research Agent Sidebar - Primary Research Interface
    this.plugin.addCommand({
      id: 'clippy-research-agent-sidebar',
      name: 'Show Research Agent Sidebar',
      icon: 'microscope',
      callback: this.handleResearchAgentSidebar.bind(this),
    });
    
    // Add MoE system commands if enabled
    if (this.plugin.settings.features.moeSystemEnabled) {
      this.addMoECommands();
    }

    console.log('CLIPPY: All commands registered successfully');
  }

  /**
   * Handle semantic search command
   */
  async handleSemanticSearch() {
    try {
      if (!this.plugin.semanticSearchService) {
        new Notice('❌ Semantic search not available - embedding system not initialized');
        return;
      }

      console.log('🧠 Opening semantic search modal...');
      this.plugin.semanticSearchService.openSemanticSearch();
    } catch (error) {
      console.error('CLIPPY: Error opening semantic search:', error);
      new Notice(`❌ Failed to open semantic search: ${error.message}`);
    }
  }

  /**
   * Handle intelligent backlinks command
   */
  async handleIntelligentBacklinks(): Promise<void> {
    try {
      console.log('🔗 Opening intelligent backlinks modal...');
      
      // Import the system and modal classes
      const { IntelligentBacklinkSystem } = await import('../features/knowledge-management/backlinking/intelligent-backlink-system');
      const { BacklinkSuggestionsModal } = await import('./backlink-suggestions-modal');
      const { IntelligentSearchService } = await import('../features/knowledge-management/semantic/intelligent-search-service');
      const { SimilarityEngine } = await import('../features/knowledge-management/semantic/similarity-engine');
      
      // Initialize required services
      const similarityEngine = new SimilarityEngine(this.plugin.embeddingManager);
      
      const intelligentSearchService = new IntelligentSearchService(
        this.plugin.app,
        this.plugin.embeddingManager,
        similarityEngine,
        this.plugin.settings
      );
      
      // Initialize the backlink system
      const backlinkSystem = new IntelligentBacklinkSystem(
        this.plugin.app,
        intelligentSearchService,
        this.plugin.embeddingManager,
        similarityEngine,
        this.plugin.settings
      );
      
      // Open the suggestions modal
      const modal = new BacklinkSuggestionsModal(this.plugin.app, backlinkSystem);
      modal.open();
      
    } catch (error) {
      console.error('CLIPPY: Error opening intelligent backlinks:', error);
      new Notice(`❌ Failed to open intelligent backlinks: ${error.message}`);
    }
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

      // Get AI provider and content analyzer with error boundaries
      const aiProvider = await ClippyErrorBoundaries.aiProviderOperation(
        () => ProviderFactory.createProvider(this.plugin.settings),
        'create AI provider for note enhancement',
        { showUserNotice: true }
      );
      
      // Use shared vault patterns, fallback to analysis if not available
      const vaultPatterns = this.plugin.vaultPatterns || await ClippyErrorBoundaries.aiProviderOperation(
        () => this.plugin.vaultAnalyzer.analyzeVaultPatterns(),
        'analyze vault patterns',
        {
          fallback: async () => ({
            tagPatterns: [],
            dateFormats: [],
            cssClasses: [],
            frontmatterSchemas: [],
            wikilinkPatterns: []
          }),
          showUserNotice: false
        }
      );
      
      const analyzer = new ContentAnalyzer(aiProvider, vaultPatterns);

      // Perform comprehensive analysis with error boundary
      const analysis = await ClippyErrorBoundaries.aiProviderOperation(
        () => analyzer.analyzeNote(content, this.extractExistingTags(content)),
        'analyze note content',
        {
          fallback: async () => ({
            contentAnalysis: {
              suggestedTags: [],
              topics: [],
              summary: 'Analysis unavailable - AI provider error',
              relatedNotes: [],
              formattingIssues: ['AI provider error - check your settings']
            },
            tagSuggestions: [],
            formattingResult: {
              originalContent: content,
              enhancedContent: content,
              suggestions: [{ 
                type: 'format' as const,
                priority: 'high' as const,
                description: 'Content analysis failed - please check your AI provider settings',
                before: '',
                after: ''
              }],
              preservedElements: []
            },
            relatedNotes: [],
            qualityScore: 0,
            recommendations: ['Please check your AI provider settings']
          }),
          showUserNotice: true
        }
      );

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

      // Get AI provider and generate suggestions with error boundaries
      const aiProvider = await ClippyErrorBoundaries.aiProviderOperation(
        () => ProviderFactory.createProvider(this.plugin.settings),
        'create AI provider for tagging',
        { showUserNotice: true }
      );
      
      // Use shared vault patterns, fallback to analysis if not available
      const vaultPatterns = this.plugin.vaultPatterns || await ClippyErrorBoundaries.aiProviderOperation(
        () => this.plugin.vaultAnalyzer.analyzeVaultPatterns(),
        'analyze vault patterns for tagging',
        {
          fallback: async () => ({
            tagPatterns: [],
            dateFormats: [],
            cssClasses: [],
            frontmatterSchemas: [],
            wikilinkPatterns: []
          }),
          showUserNotice: false
        }
      );
      
      const autoTagger = new (await import('../features/content-processing/processors/auto-tagger')).AutoTagger(aiProvider, vaultPatterns);

      const existingTags = this.extractExistingTags(content);
      const suggestions = await ClippyErrorBoundaries.aiProviderOperation(
        () => autoTagger.suggestTags(content, existingTags),
        'generate tag suggestions',
        {
          fallback: async () => [],
          showUserNotice: true
        }
      );

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

      const aiProvider = await ClippyErrorBoundaries.aiProviderOperation(
        () => ProviderFactory.createProvider(this.plugin.settings),
        'create AI provider for summarization',
        { showUserNotice: true }
      );
      
      const summary = await ClippyErrorBoundaries.aiProviderOperation(
        () => aiProvider.generateResponse(
          `Please provide a concise summary of this note content:\n\n${content}`,
          'Create a brief summary that captures the main points and key information.'
        ),
        'generate note summary',
        {
          fallback: async () => 'Summary unavailable - AI provider error. Please check your settings.',
          showUserNotice: true
        }
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

      // Force fresh analysis with error boundary
      const patterns = await ClippyErrorBoundaries.aiProviderOperation(
        () => this.plugin.vaultAnalyzer.analyzeVaultPatterns(true),
        'analyze vault patterns',
        {
          fallback: async () => ({
            tagPatterns: [],
            dateFormats: [],
            cssClasses: [],
            frontmatterSchemas: [],
            wikilinkPatterns: []
          }),
          showUserNotice: true
        }
      );

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
      const vaultPatterns = this.plugin.vaultPatterns || await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
      const formatter = new (await import('../features/content-processing/processors/markdown-formatter')).MarkdownFormatter(aiProvider, vaultPatterns);

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
      const vaultPatterns = this.plugin.vaultPatterns || await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
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
      const vaultPatterns = this.plugin.vaultPatterns || await this.plugin.vaultAnalyzer.analyzeVaultPatterns();
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
        newFrontmatter = frontmatter.replace(/tags:\s*\[(.*?)\]/g, tagYaml)
                                    .replace(/tags:\s*\n((?:\s*-\s*.+\n)*)/g, tagYaml);
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

  /**
   * Handle bridge discovery command
   */
  async handleDiscoverBridges(): Promise<void> {
    try {
      const notice = new Notice('🔍 Discovering bridge opportunities...', 0);

      // Initialize components using shared instances
      const orphanDetector = new OrphanDetector(this.plugin.app.vault, this.plugin.app.metadataCache, this.plugin.embeddingManager, this.plugin.similarityEngine);
      const bridgeManager = new BridgeManager(this.plugin.app, orphanDetector, this.plugin.embeddingManager, this.plugin.similarityEngine);

      // Get bridge opportunities
      const bridges = await bridgeManager.getBridgeOpportunities();

      notice.hide();

      if (bridges.length === 0) {
        new Notice('🎉 No significant bridge opportunities found! Your vault is well connected.');
        return;
      }

      // Show bridge opportunities modal
      const modal = new BridgeOpportunitiesModal(this.plugin.app, bridges, bridgeManager);
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Error discovering bridges:', error);
      new Notice(`❌ Failed to discover bridges: ${error.message}`);
    }
  }

  /**
   * Handle automated research note generation.
   */
  async handleGenerateResearchNotes(): Promise<void> {
    try {
      // Show checklist input modal with updated settings
      const modal = new ResearchChecklistModal(this.plugin.app, this.plugin.settings, async (checklist, options) => {
        const generator = new AutomatedNoteGenerator(this.plugin.app, this.plugin.projectTracker);
        
        // Configure search engine based on settings
        const searchConfig = this.plugin.settings.research.searchEngine;
        await generator.generateNotesFromChecklist(checklist, {
          ...options,
          searxngUrl: searchConfig.searxngUrl,
          tavilyApiKey: searchConfig.tavilyApiKey,
          searchEngine: searchConfig.provider
        });

        // Start monitoring notes for completion
        const statusMonitor = new NoteStatusMonitor(this.plugin.app, generator.getProjectTracker());
        statusMonitor.startMonitoring();
      });
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Error generating research notes:', error);
      new Notice(`❌ Failed to generate research notes: ${error.message}`);
    }
  }

  /**
   * Handle marking research note as completed.
   */
  async handleMarkNoteCompleted(editor: Editor, view: MarkdownView): Promise<void> {
    try {
      const file = view.file;
      if (!file) {
        new Notice('❌ No active file');
        return;
      }

      const generator = new AutomatedNoteGenerator(this.plugin.app, this.plugin.projectTracker);
      const statusMonitor = new NoteStatusMonitor(this.plugin.app, this.plugin.projectTracker);
      
      const success = await statusMonitor.markNoteCompleted(file.path);
      if (success) {
        console.log(`✅ Marked note as completed: ${file.path}`);
      }

    } catch (error) {
      console.error('CLIPPY: Error marking note as completed:', error);
      new Notice(`❌ Failed to mark note as completed: ${error.message}`);
    }
  }


  /**
   * Handle comprehensive research system.
   */
  async handleComprehensiveResearch(): Promise<void> {
    try {
      // Show comprehensive research checklist modal
      const modal = new ComprehensiveResearchModal(this.plugin.app, this.plugin.settings, async (checklist, options) => {
        const researchSystem = new ComprehensiveResearchSystem(this.plugin.app, this.plugin);
        
        // Configure with settings
        const searchConfig = this.plugin.settings.research.searchEngine;
        const researchOptions = {
          ...options,
          searxngUrl: searchConfig.searxngUrl,
          tavilyApiKey: searchConfig.tavilyApiKey,
          searchEngine: searchConfig.provider,
          outputFolder: options.outputFolder || this.plugin.settings.research.defaults.outputFolder
        };

        // Show progress modal
        const progressModal = new ProgressModal(this.plugin.app, `Comprehensive Research: ${checklist.length} items`);
        progressModal.open();

        try {
          await researchSystem.processResearchChecklist(checklist, researchOptions, (progress) => {
            progressModal.updateProgress(progress);
          });
          
          progressModal.close();
          new Notice(`🎉 Comprehensive research completed successfully!`);
        } catch (error) {
          progressModal.close();
          throw error;
        }
      });
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Error starting comprehensive research:', error);
      new Notice(`❌ Failed to start comprehensive research: ${error.message}`);
    }
  }

  /**
   * Handle toggle voice command
   */
  async handleToggleVoice(): Promise<void> {
    try {
      if (!this.plugin.voiceSystemV2) {
        new Notice('❌ Voice System not initialized. Check console for errors.');
        return;
      }

      await this.plugin.voiceSystemV2.toggleVoice();
    } catch (error) {
      console.error('CLIPPY Voice: Error toggling voice:', error);
      new Notice(`❌ Voice toggle error: ${error.message}`);
    }
  }

  /**
   * Handle test speak command
   */
  async handleTestSpeak(): Promise<void> {
    try {
      if (!this.plugin.voiceSystemV2) {
        new Notice('❌ Voice System not initialized');
        return;
      }

      new Notice('🔊 Testing Voice - Text-to-Speech...');
      const success = await this.plugin.voiceSystemV2.speak('Hello! This is CLIPPY Voice System. The local voice system is working properly.');
      
      if (success) {
        new Notice('✅ Voice TTS test completed');
      } else {
        new Notice('❌ Voice TTS test failed');
      }
    } catch (error) {
      console.error('CLIPPY Voice: Error testing TTS:', error);
      new Notice(`❌ Voice TTS test failed: ${error.message}`);
    }
  }

  /**
   * Handle test listen command
   */
  async handleTestListen(): Promise<void> {
    try {
      if (!this.plugin.voiceSystemV2) {
        new Notice('❌ Voice System not initialized');
        return;
      }

      new Notice('🎤 Testing Voice - Speech-to-Text (5 seconds)...');
      const result = await this.plugin.voiceSystemV2.listen(5);
      
      if (result) {
        new Notice(`✅ Voice STT result: "${result}"`);
      } else {
        new Notice('❌ Voice STT test - no speech detected');
      }
    } catch (error) {
      console.error('CLIPPY Voice: Error testing STT:', error);
      new Notice(`❌ Voice STT test failed: ${error.message}`);
    }
  }

  /**
   * Handle vault agent chat command
   */
  async handleVaultAgentChat(): Promise<void> {
    try {
      // Get current file context if available
      const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      
      const context = { 
        currentNote: activeView?.file || undefined,
        workingDirectory: activeView?.file?.parent?.path || 'root',
        conversationHistory: [],
        sessionId: Date.now().toString()
      };

      // Open voice-enabled vault agent chat modal
      const modal = new VoiceEnabledVaultChatModal(
        this.plugin.app,
        this.plugin.settings,
        context
      );
      modal.open();

    } catch (error) {
      console.error('CLIPPY: Error opening vault agent chat:', error);
      new Notice(`Failed to open vault agent: ${error.message}`);
    }
  }

  /**
   * Handle vault agent sidebar command
   */
  async handleVaultAgentSidebar(): Promise<void> {
    try {
      // Check if sidebar view is already open
      const existingLeaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_AGENT).first();
      
      if (existingLeaf) {
        // Reveal existing sidebar
        this.plugin.app.workspace.revealLeaf(existingLeaf);
        return;
      }

      // Open new sidebar view
      const leaf = this.plugin.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_VAULT_AGENT,
          active: true
        });
        
        // Reveal the sidebar
        this.plugin.app.workspace.revealLeaf(leaf);
        new Notice('🤖 Vault Agent sidebar opened');
      }

    } catch (error) {
      console.error('CLIPPY: Error opening vault agent sidebar:', error);
      new Notice(`Failed to open vault agent sidebar: ${error.message}`);
    }
  }

  /**
   * Handle research agent sidebar command
   */
  async handleResearchAgentSidebar(): Promise<void> {
    try {
      // Check if sidebar view is already open
      const existingLeaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_AGENT).first();
      
      if (existingLeaf) {
        // Reveal existing sidebar
        this.plugin.app.workspace.revealLeaf(existingLeaf);
        return;
      }

      // Open new sidebar view
      const leaf = this.plugin.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_RESEARCH_AGENT,
          active: true
        });
        
        // Reveal the sidebar
        this.plugin.app.workspace.revealLeaf(leaf);
        new Notice('🔬 Research Agent sidebar opened');
      }

    } catch (error) {
      console.error('CLIPPY: Error opening research agent sidebar:', error);
      new Notice(`Failed to open research agent sidebar: ${error.message}`);
    }
  }

}

/**
 * Modal for inputting research checklist and options.
 */
class ResearchChecklistModal extends Modal {
  private onSubmit: (checklist: any[], options: any) => Promise<void>;
  private settings: any;

  constructor(app: any, settings: any, onSubmit: (checklist: any[], options: any) => Promise<void>) {
    super(app);
    this.settings = settings;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clippy-research-modal');

    // Header
    const header = contentEl.createEl('div', { cls: 'modal-header' });
    header.createEl('h2', { text: '🔬 Generate Research Notes', cls: 'modal-title' });
    header.createEl('p', { 
      text: 'Enter a list of items to research (one per line)',
      cls: 'modal-subtitle'
    });

    // Checklist input
    const form = contentEl.createEl('form');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    // Example
    const exampleEl = form.createEl('div', { cls: 'example-section' });
    exampleEl.style.cssText = 'background: var(--background-secondary); padding: 12px; border-radius: 6px; margin-bottom: 16px;';
    exampleEl.createEl('strong', { text: 'Example:' });
    const exampleText = exampleEl.createEl('pre');
    exampleText.style.cssText = 'margin: 8px 0 0 0; font-family: monospace; font-size: 12px;';
    exampleText.textContent = `Turmeric
Ginger
Echinacea
Ginkgo Biloba
Ashwagandha`;

    // Input textarea
    const textareaEl = form.createEl('textarea', { 
      placeholder: 'Enter items to research (one per line)...',
      cls: 'research-checklist-input'
    });
    textareaEl.style.cssText = `
      min-height: 200px;
      width: 100%;
      padding: 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-family: var(--font-monospace);
      resize: vertical;
    `;

    // Options section
    const optionsEl = form.createEl('div', { cls: 'options-section' });
    optionsEl.createEl('h3', { text: 'Options' });

    // Search options
    const searchOptionsEl = optionsEl.createEl('div', { cls: 'option-group' });
    
    const webSearchCheck = searchOptionsEl.createEl('label');
    webSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    const webSearchInput = webSearchCheck.createEl('input', { type: 'checkbox' });
    webSearchInput.checked = true;
    webSearchCheck.createEl('span', { text: 'Enable web search (SearXNG/Tavily)' });

    const personalSearchCheck = searchOptionsEl.createEl('label');
    personalSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    const personalSearchInput = personalSearchCheck.createEl('input', { type: 'checkbox' });
    personalSearchInput.checked = true;
    personalSearchCheck.createEl('span', { text: 'Search personal documents (PDFs, notes)' });

    // Template selection
    const templateEl = optionsEl.createEl('div', { cls: 'option-group' });
    templateEl.createEl('label', { text: 'Note Template:' });
    const templateSelect = templateEl.createEl('select');
    templateSelect.style.cssText = 'width: 100%; padding: 6px; margin-top: 4px;';
    
    const templates = [
      { value: 'research-standard', text: 'Research Standard (Comprehensive)' }
    ];
    
    templates.forEach(template => {
      const option = templateSelect.createEl('option', { 
        value: template.value, 
        text: template.text 
      });
      if (template.value === (this.settings.research?.defaults?.template || 'research-standard')) {
        option.selected = true;
      }
    });

    // Output folder
    const folderEl = optionsEl.createEl('div', { cls: 'option-group' });
    folderEl.createEl('label', { text: 'Output Folder:' });
    const folderInput = folderEl.createEl('input', { 
      type: 'text', 
      value: this.settings.research?.defaults?.outputFolder || 'Generated Research Notes',
      placeholder: 'Generated Research Notes'
    });
    folderInput.style.cssText = 'width: 100%; padding: 6px; margin-top: 4px;';

    // Buttons
    const buttonContainer = form.createEl('div', { cls: 'button-container' });
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;';

    const cancelBtn = buttonContainer.createEl('button', { 
      text: 'Cancel',
      type: 'button'
    });
    cancelBtn.addEventListener('click', () => this.close());

    const generateBtn = buttonContainer.createEl('button', { 
      text: '🔬 Generate Research Notes',
      type: 'submit',
      cls: 'mod-cta'
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const checklistText = textareaEl.value.trim();
      if (!checklistText) {
        new Notice('Please enter items to research');
        return;
      }

      // Parse checklist
      const items = checklistText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(item => ({
          name: item,
          searchTerms: [item],
          category: 'Research',
          priority: 'medium' as const
        }));

      if (items.length === 0) {
        new Notice('No valid items found');
        return;
      }

      // Prepare options with defaults from settings
      const defaults = this.settings.research?.defaults || {};
      const options = {
        enableWebSearch: webSearchInput.checked,
        enablePersonalSearch: personalSearchInput.checked,
        noteTemplate: templateSelect.value,
        outputFolder: folderInput.value || defaults.outputFolder || 'Generated Research Notes',
        maxWebResults: defaults.maxResults || 10,
        maxSources: 15,
        minQualityScore: defaults.qualityThreshold || 0.6,
        minRelevanceScore: 0.5,
        delayBetweenRequests: 2000 // 2 second delay
      };

      this.close();
      
      // Start generation
      new Notice(`🔬 Starting research for ${items.length} items...`);
      await this.onSubmit(items, options);
    });
  }
}

/**
 * Modal for comprehensive research checklist input.
 */
class ComprehensiveResearchModal extends Modal {
  private onSubmit: (checklist: any[], options: any) => Promise<void>;
  private settings: any;

  constructor(app: any, settings: any, onSubmit: (checklist: any[], options: any) => Promise<void>) {
    super(app);
    this.settings = settings;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clippy-comprehensive-research-modal');

    // Header
    const header = contentEl.createEl('div', { cls: 'modal-header' });
    header.createEl('h2', { text: '🔬 Comprehensive Research System', cls: 'modal-title' });
    header.createEl('p', { 
      text: 'Enter items to research. Each item will get a complete analysis with vault notes and web search.',
      cls: 'modal-subtitle'
    });

    // Process explanation
    const processEl = contentEl.createEl('div', { cls: 'process-explanation' });
    processEl.style.cssText = 'background: var(--background-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;';
    processEl.createEl('h3', { text: '🔄 Research Process:' });
    const processList = processEl.createEl('ol');
    processList.style.cssText = 'margin: 8px 0 0 20px; font-size: 14px;';
    
    const steps = [
      'Create blank research notes with comprehensive template',
      'Find all vault notes containing exact words from checklist',
      'Perform web search and save each result as a unique note',
      'Extract wisdom from all sources using AI analysis',
      'Update research notes with organized findings',
      'Enhance notes using AI for final polish'
    ];
    
    steps.forEach(step => {
      const li = processList.createEl('li');
      li.textContent = step;
      li.style.marginBottom = '4px';
    });

    // Form
    const form = contentEl.createEl('form');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    // Checklist input
    const textareaEl = form.createEl('textarea', { 
      placeholder: 'Enter research topics (one per line)...\n\nExample:\nTurmeric\nGinger\nAshwagandha\nCurcumin benefits\nNatural anti-inflammatory herbs',
      cls: 'comprehensive-research-input'
    });
    textareaEl.style.cssText = `
      min-height: 200px;
      width: 100%;
      padding: 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-family: var(--font-monospace);
      resize: vertical;
    `;

    // Options section
    const optionsEl = form.createEl('div', { cls: 'options-section' });
    optionsEl.createEl('h3', { text: 'Research Options' });

    // Output folder
    const folderEl = optionsEl.createEl('div', { cls: 'option-group' });
    folderEl.createEl('label', { text: 'Research Output Folder:' });
    const folderInput = folderEl.createEl('input', { 
      type: 'text', 
      value: this.settings.research?.defaults?.outputFolder || 'Comprehensive Research',
      placeholder: 'Comprehensive Research'
    });
    folderInput.style.cssText = 'width: 100%; padding: 6px; margin-top: 4px;';

    // Search options
    const searchOptionsEl = optionsEl.createEl('div', { cls: 'option-group' });
    
    const webSearchCheck = searchOptionsEl.createEl('label');
    webSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    const webSearchInput = webSearchCheck.createEl('input', { type: 'checkbox' });
    webSearchInput.checked = true;
    webSearchCheck.createEl('span', { text: 'Enable web search' });

    const saveIndividualPagesCheck = searchOptionsEl.createEl('label');
    saveIndividualPagesCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-left: 20px;';
    const saveIndividualPagesInput = saveIndividualPagesCheck.createEl('input', { type: 'checkbox' });
    saveIndividualPagesInput.checked = true;
    saveIndividualPagesCheck.createEl('span', { text: 'Save individual web pages' });

    const vaultSearchCheck = searchOptionsEl.createEl('label');
    vaultSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    const vaultSearchInput = vaultSearchCheck.createEl('input', { type: 'checkbox' });
    vaultSearchInput.checked = true;
    vaultSearchCheck.createEl('span', { text: 'Search vault for notes with exact words' });

    const semanticSearchCheck = searchOptionsEl.createEl('label');
    semanticSearchCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-left: 20px;';
    const semanticSearchInput = semanticSearchCheck.createEl('input', { type: 'checkbox' });
    semanticSearchInput.checked = false;
    semanticSearchCheck.createEl('span', { text: 'Enable semantic search' });

    const aiEnhanceCheck = searchOptionsEl.createEl('label');
    aiEnhanceCheck.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    const aiEnhanceInput = aiEnhanceCheck.createEl('input', { type: 'checkbox' });
    aiEnhanceInput.checked = true;
    aiEnhanceCheck.createEl('span', { text: 'AI-enhance final notes' });

    // Advanced options
    const advancedEl = optionsEl.createEl('details');
    advancedEl.createEl('summary', { text: 'Advanced Options' });
    
    const maxResultsEl = advancedEl.createEl('div', { cls: 'option-group' });
    maxResultsEl.style.marginTop = '12px';
    maxResultsEl.createEl('label', { text: 'Max web search results per item:' });
    const maxResultsInput = maxResultsEl.createEl('input', { 
      type: 'number', 
      value: String(this.settings.research?.defaults?.maxResults || 10)
    });
    maxResultsInput.min = '5';
    maxResultsInput.max = '20';
    maxResultsInput.style.cssText = 'width: 100px; padding: 4px; margin-top: 4px;';

    // Custom template option
    const templateEl = advancedEl.createEl('div', { cls: 'option-group' });
    templateEl.style.marginTop = '16px';
    templateEl.createEl('label', { text: 'Custom Template (optional):' });
    const templateHelp = templateEl.createEl('div', { cls: 'template-help' });
    templateHelp.style.cssText = 'font-size: 12px; color: var(--text-muted); margin: 4px 0;';
    templateHelp.innerHTML = `
      <strong>Available variables:</strong> {{title}}, {{today}}, {{research.status}}, {{vault.references}}, {{web.sources}}, {{overview}}, {{definitions}}, {{facts}}, {{uses}}, {{warnings}}, {{research}}, {{concepts}}, {{sources}}, {{wisdom}}
    `;
    
    const templateInput = templateEl.createEl('textarea', { 
      placeholder: `Leave empty to use default template, or enter custom template with variables:

---
title: {{title}}
created: {{today}}
tags:
  - research
  - "{{title}}"
---

# {{title}}

## Research Status
{{research.status}}

## Overview
{{overview}}

## Vault Notes
{{vault.references}}

## Web Sources  
{{web.sources}}

## Key Information
{{facts}}

## Sources
{{sources}}`,
      cls: 'custom-template-input'
    });
    templateInput.style.cssText = `
      width: 100%;
      min-height: 150px;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-family: var(--font-monospace);
      font-size: 12px;
      resize: vertical;
      margin-top: 4px;
    `;

    // Add file selector for template
    const templateControls = templateEl.createEl('div', { cls: 'template-controls' });
    templateControls.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
    
    const loadTemplateBtn = templateControls.createEl('button', {
      text: '📁 Load Template from Vault',
      type: 'button'
    });
    loadTemplateBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';
    
    const templateFileSpan = templateControls.createEl('span', { cls: 'template-file-name' });
    templateFileSpan.style.cssText = 'font-size: 12px; color: var(--text-muted);';
    
    loadTemplateBtn.addEventListener('click', async () => {
      const markdownFiles = this.app.vault.getMarkdownFiles();
      const templateFiles = markdownFiles.filter(file => 
        file.path.toLowerCase().includes('template') || 
        file.path.toLowerCase().includes('40 - obsidian') ||
        file.extension === 'md'
      );
      
      // Create a simple file selection modal
      const fileModal = new class extends Modal {
        constructor(app: any) {
          super(app);
        }
        
        onOpen() {
          const { contentEl } = this;
          contentEl.empty();
          contentEl.createEl('h3', { text: 'Select Template File' });
          
          const fileList = contentEl.createEl('div', { cls: 'template-file-list' });
          fileList.style.cssText = 'max-height: 300px; overflow-y: auto; margin: 16px 0;';
          
          templateFiles.forEach(file => {
            const fileItem = fileList.createEl('div', { cls: 'template-file-item' });
            fileItem.style.cssText = `
              padding: 8px 12px;
              border: 1px solid var(--background-modifier-border);
              border-radius: 4px;
              margin-bottom: 4px;
              cursor: pointer;
              background: var(--background-secondary);
            `;
            
            fileItem.textContent = file.path;
            fileItem.addEventListener('click', async () => {
              try {
                const content = await this.app.vault.read(file);
                templateInput.value = content;
                templateFileSpan.textContent = `📝 ${file.basename}`;
                new Notice(`✅ Loaded template: ${file.basename}`);
                this.close();
              } catch (error) {
                new Notice(`❌ Failed to load template: ${error.message}`);
              }
            });
          });
          
          if (templateFiles.length === 0) {
            fileList.createEl('p', { 
              text: 'No template files found. Create a .md file with "template" in the name.',
              cls: 'text-muted'
            });
          }
        }
      }(this.app);
      
      fileModal.open();
    });

    // Buttons
    const buttonContainer = form.createEl('div', { cls: 'button-container' });
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;';

    const cancelBtn = buttonContainer.createEl('button', { 
      text: 'Cancel',
      type: 'button'
    });
    cancelBtn.addEventListener('click', () => this.close());

    const startBtn = buttonContainer.createEl('button', { 
      text: '🔬 Start Comprehensive Research',
      type: 'submit',
      cls: 'mod-cta'
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const checklistText = textareaEl.value.trim();
      if (!checklistText) {
        new Notice('Please enter research topics');
        return;
      }

      // Parse checklist
      const items = checklistText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((item, index) => ({
          id: `item-${index}`,
          name: item,
          completed: false
        }));

      if (items.length === 0) {
        new Notice('No valid research topics found');
        return;
      }

      // Prepare options
      const customTemplate = templateInput.value.trim();
      const options = {
        outputFolder: folderInput.value || 'Comprehensive Research',
        enableWebSearch: webSearchInput.checked,
        saveIndividualPages: saveIndividualPagesInput.checked,
        searchVaultExactWords: vaultSearchInput.checked,
        enableSemanticSearch: semanticSearchInput.checked,
        aiEnhanceFinalNote: aiEnhanceInput.checked,
        maxWebSearchResults: parseInt(maxResultsInput.value) || 10,
        customTemplate: customTemplate || null,
        projectName: `Comprehensive Research: ${new Date().toLocaleDateString()}`,
        projectDescription: `Systematic research with vault analysis and web search for ${items.length} topics`
      };

      this.close();
      
      // Start comprehensive research
      new Notice(`🔬 Starting comprehensive research for ${items.length} topics...`);
      await this.onSubmit(items, options);
    });
  }
}

/**
 * Modal for displaying and implementing bridge opportunities
 */
class BridgeOpportunitiesModal extends Modal {
  private bridges: any[];
  private bridgeManager: BridgeManager;

  constructor(app: any, bridges: any[], bridgeManager: BridgeManager) {
    super(app);
    this.bridges = bridges;
    this.bridgeManager = bridgeManager;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clippy-bridge-modal');

    // Header
    const header = contentEl.createEl('div', { cls: 'modal-header' });
    header.createEl('h2', { text: '🌉 Bridge Opportunities', cls: 'modal-title' });
    header.createEl('p', { 
      text: `Found ${this.bridges.length} opportunities to improve your knowledge network`,
      cls: 'modal-subtitle'
    });

    // Bridge list
    const container = contentEl.createEl('div', { cls: 'bridge-list' });
    
    for (let i = 0; i < Math.min(this.bridges.length, 10); i++) {
      const bridge = this.bridges[i];
      this.renderBridgeItem(container, bridge);
    }

    // Footer
    const footer = contentEl.createEl('div', { cls: 'modal-footer' });
    footer.style.textAlign = 'center';
    footer.style.marginTop = '20px';
    
    const closeBtn = footer.createEl('button', { text: 'Close' });
    closeBtn.addEventListener('click', () => this.close());
  }

  private renderBridgeItem(container: HTMLElement, bridge: any): void {
    const item = container.createEl('div', { cls: 'bridge-item' });
    item.style.cssText = `
      margin-bottom: 12px;
      padding: 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-secondary);
    `;

    // Header
    const itemHeader = item.createEl('div', { cls: 'bridge-item-header' });
    itemHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const title = itemHeader.createEl('h3', { text: bridge.title });
    title.style.margin = '0';

    const confidence = itemHeader.createEl('span', { 
      text: `${Math.round(bridge.confidence * 100)}%`,
      cls: `confidence-${bridge.priority}`
    });
    confidence.style.cssText = `
      background: var(--interactive-accent);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    `;

    // Description
    const description = item.createEl('p', { text: bridge.description });
    description.style.cssText = `
      margin: 8px 0;
      color: var(--text-muted);
      font-size: 14px;
    `;

    // Action button
    const actionBtn = item.createEl('button', { 
      text: `Implement ${bridge.type.charAt(0).toUpperCase() + bridge.type.slice(1)} Bridge`,
      cls: 'mod-cta'
    });
    actionBtn.style.marginTop = '8px';
    
    actionBtn.addEventListener('click', async () => {
      const success = await this.implementBridge(bridge);
      if (success) {
        item.style.opacity = '0.6';
        actionBtn.disabled = true;
        actionBtn.textContent = '✅ Implemented';
      }
    });
  }

  private async implementBridge(bridge: any): Promise<boolean> {
    try {
      let success = false;
      
      switch (bridge.type) {
        case 'auto':
          success = await this.bridgeManager.implementAutoBridge(bridge);
          break;
        case 'tag':
          success = await this.bridgeManager.implementTagBridge(bridge);
          break;
        case 'research':
          success = await this.bridgeManager.implementResearchBridge(bridge);
          break;
        case 'index':
          success = await this.bridgeManager.implementIndexBridge(bridge);
          break;
        default:
          new Notice('❌ Unknown bridge type');
          return false;
      }
      
      return success;
    } catch (error) {
      console.error('Error implementing bridge:', error);
      new Notice(`❌ Failed to implement bridge: ${error.message}`);
      return false;
    }
  }
}

/**
 * Modal for displaying progress during long operations
 */
class ProgressModal extends Modal {
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private messageText: HTMLElement;
  private taskTitle: string;
  private currentProgress: { current: number; total: number; percentage: number; message: string } | null = null;

  constructor(app: any, taskTitle: string) {
    super(app);
    this.taskTitle = taskTitle;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clippy-progress-modal');

    // Header
    const header = contentEl.createEl('div', { cls: 'modal-header' });
    header.createEl('h2', { text: this.taskTitle, cls: 'modal-title' });

    // Progress container
    const progressContainer = contentEl.createEl('div', { cls: 'progress-container' });
    progressContainer.style.cssText = 'margin: 20px 0; padding: 16px;';

    // Progress bar background
    const progressBg = progressContainer.createEl('div', { cls: 'progress-background' });
    progressBg.style.cssText = `
      width: 100%;
      height: 20px;
      background: var(--background-modifier-border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
    `;

    // Progress bar fill
    this.progressBar = progressBg.createEl('div', { cls: 'progress-fill' });
    this.progressBar.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
      border-radius: 10px;
      transition: width 0.3s ease;
    `;

    // Progress text
    this.progressText = progressContainer.createEl('div', { cls: 'progress-text' });
    this.progressText.style.cssText = `
      text-align: center;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--text-normal);
    `;
    this.progressText.textContent = '0%';

    // Message text
    this.messageText = progressContainer.createEl('div', { cls: 'progress-message' });
    this.messageText.style.cssText = `
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
      min-height: 20px;
    `;
    this.messageText.textContent = 'Initializing...';

    // Make modal non-dismissible during progress
    this.modalEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  updateProgress(progress: { current: number; total: number; percentage: number; message?: string }) {
    this.currentProgress = {
      current: progress.current,
      total: progress.total,
      percentage: progress.percentage,
      message: progress.message || ''
    };

    // Update progress bar
    this.progressBar.style.width = `${Math.min(100, Math.max(0, progress.percentage))}%`;

    // Update progress text
    this.progressText.textContent = `${Math.round(progress.percentage)}% (${progress.current}/${progress.total})`;

    // Update message
    if (progress.message) {
      this.messageText.textContent = progress.message;
    }

    // Add completion styling when done
    if (progress.percentage >= 100) {
      this.progressBar.style.background = 'linear-gradient(90deg, #4caf50, #66bb6a)';
      this.progressText.textContent = '✅ Completed!';
      
      // Auto-close after a brief delay
      setTimeout(() => {
        if (this.currentProgress && this.currentProgress.percentage >= 100) {
          this.close();
        }
      }, 2000);
    }
  }

  onClose() {
    // Clean up any resources
    this.currentProgress = null;
  }
}

// Add CommandHandlers extension for MoE
declare module './command-handlers' {
  interface CommandHandlers {
    addMoECommands(): void;
  }
}

CommandHandlers.prototype.addMoECommands = function(): void {
  console.log('CLIPPY: Adding MoE commands...');
  
  // Main chat command
  this.plugin.addCommand({
    id: 'clippy-moe-chat',
    name: 'Chat with Vault Expert (MoE)',
    icon: 'message-circle',
    callback: async () => {
      const moeOrchestrator = (this.plugin as any).moeOrchestrator;
      if (!moeOrchestrator) {
        new Notice('MoE system not initialized. Enable it in settings first.', 3000);
        return;
      }
      
      const input = prompt('What would you like help with?');
      if (!input) return;
      
      try {
        new Notice('Processing your request...', 2000);
        const response = await moeOrchestrator.processUserInput(input);
        
        if (response.success) {
          new Notice(`🤖 ${response.agent}: ${response.response.substring(0, 100)}...`, 8000);
          console.log('MoE Response:', response);
        } else {
          new Notice(`❌ ${response.error}`, 5000);
        }
      } catch (error) {
        new Notice(`❌ Failed: ${error.message}`, 3000);
      }
    },
  });

  // Analyze current note
  this.plugin.addCommand({
    id: 'clippy-moe-analyze-note',
    name: 'Analyze Current Note (MoE)',
    icon: 'search',
    checkCallback: (checking: boolean) => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (checking) return !!activeFile;
      
      const moeOrchestrator = (this.plugin as any).moeOrchestrator;
      if (!moeOrchestrator) {
        new Notice('MoE system not initialized', 3000);
        return true;
      }
      
      if (!activeFile) return true;
      
      (async () => {
        try {
          new Notice('Analyzing note...', 2000);
          const response = await moeOrchestrator.processUserInput(
            `Analyze the structure and content of "${activeFile.basename}" and suggest improvements`
          );
          
          if (response.success) {
            new Notice(`📊 ${response.agent}: ${response.response.substring(0, 100)}...`, 8000);
            console.log('Analysis:', response);
          } else {
            new Notice(`❌ ${response.error}`, 5000);
          }
        } catch (error) {
          new Notice(`❌ Analysis failed: ${error.message}`, 3000);
        }
      })();
      
      return true;
    },
  });

  // Find similar notes
  this.plugin.addCommand({
    id: 'clippy-moe-find-similar',
    name: 'Find Similar Notes (MoE)',
    icon: 'link',
    checkCallback: (checking: boolean) => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (checking) return !!activeFile;
      
      const moeOrchestrator = (this.plugin as any).moeOrchestrator;
      if (!moeOrchestrator) {
        new Notice('MoE system not initialized', 3000);
        return true;
      }
      
      if (!activeFile) return true;
      
      (async () => {
        try {
          new Notice('Finding similar notes...', 2000);
          const response = await moeOrchestrator.processUserInput(
            `Find notes similar to "${activeFile.basename}" and suggest connections`
          );
          
          if (response.success) {
            new Notice(`🔗 ${response.agent}: ${response.response.substring(0, 100)}...`, 8000);
            console.log('Similar notes:', response);
          } else {
            new Notice(`❌ ${response.error}`, 5000);
          }
        } catch (error) {
          new Notice(`❌ Search failed: ${error.message}`, 3000);
        }
      })();
      
      return true;
    },
  });

  // Vault health check
  this.plugin.addCommand({
    id: 'clippy-moe-vault-health',
    name: 'Check Vault Health (MoE)',
    icon: 'heart',
    callback: async () => {
      const moeOrchestrator = (this.plugin as any).moeOrchestrator;
      if (!moeOrchestrator) {
        new Notice('MoE system not initialized', 3000);
        return;
      }
      
      try {
        new Notice('Checking vault health...', 2000);
        const health = await moeOrchestrator.getVaultHealth();
        
        const score = health.overallScore;
        const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
        const status = score >= 80 ? 'Good' : score >= 60 ? 'Needs Attention' : 'Poor';
        
        new Notice(`🏥 Vault Health: ${emoji} ${score}/100 (${status})`, 5000);
        console.log('Health Report:', health);
        
        if (health.issues.length > 0) {
          console.log('Issues found:', health.issues);
          new Notice(`💡 Issues: ${health.issues.join(', ')}`, 8000);
        }
      } catch (error) {
        new Notice(`❌ Health check failed: ${error.message}`, 3000);
      }
    },
  });

  // Contextual suggestions
  this.plugin.addCommand({
    id: 'clippy-moe-suggestions',
    name: 'Get Contextual Suggestions (MoE)',
    icon: 'lightbulb',
    callback: async () => {
      const moeOrchestrator = (this.plugin as any).moeOrchestrator;
      if (!moeOrchestrator) {
        new Notice('MoE system not initialized', 3000);
        return;
      }
      
      try {
        const suggestions = moeOrchestrator.getContextualSuggestions();
        
        if (suggestions.length === 0) {
          new Notice('No suggestions available right now', 3000);
          return;
        }
        
        new Notice(`💡 Suggestion: ${suggestions[0]}`, 8000);
        console.log('All suggestions:', suggestions);
      } catch (error) {
        new Notice(`❌ Failed to get suggestions: ${error.message}`, 3000);
      }
    },
  });
}