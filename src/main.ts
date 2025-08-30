// /**
//  * CLIPPY AI Assistant - Refactored Main Plugin Class
//  * Simplified plugin class focused on lifecycle and coordination
//  */

import { Plugin, Notice, MarkdownView, Editor, WorkspaceLeaf } from 'obsidian';
import { ClippySettings, DEFAULT_SETTINGS, VaultPatterns } from './types';
import { ClippySettingsTab, SettingsManager } from './settings';
import { CommandHandlers } from './ui/command-handlers';
import { VaultAnalyzer } from './utils/vault-analyzer';
import { ProviderFactory } from './ai/provider-factory';
import { ClippyErrorBoundaries } from './utils/error-boundaries';

// Import extracted components
import { EnhancementModal, TaggingModal } from './ui/modals';
import { ClippyInsightsView, VIEW_TYPE_CLIPPY_INSIGHTS } from './ui/views';
import { ResearchAgentSidebarView, VIEW_TYPE_RESEARCH_AGENT } from './ui/research-agent-sidebar-view';
import { ContentEnhancer } from './features/content-processing/services/content-enhancer';
import { TagGenerator } from './features/content-processing/services/tag-generator';
import { TagEditor } from './features/content-processing/services/tag-editor';

// Phase 2 imports
import { LinkSuggestionEngine } from './features/knowledge-management/link-suggestions/suggestion-engine';
import { KnowledgeGraphManager } from './features/knowledge-management/knowledge-graph/graph-manager';
import { OrphanDetector } from './features/knowledge-management/discovery/orphan-detector';
import { SuggestionPanel } from './ui/suggestion-panel';
import { OrphanManagementModal } from './ui/orphan-management-modal';
import { EmbeddingManager } from './features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from './features/knowledge-management/semantic/similarity-engine';



// MoE System imports  
import { SimpleMoEOrchestrator } from './agents/simple-moe';

// Research System imports
import { ProjectTracker } from './research/project-tracker';
import { RAGSystem } from './features/knowledge-management/rag/rag-architecture';
import { QualityRater } from './research/quality-rater';

export default class ClippyPlugin extends Plugin {
  settings: ClippySettings;
  settingsManager: SettingsManager;
  commandHandlers: CommandHandlers;
  vaultAnalyzer: VaultAnalyzer;

  // Shared research system components
  projectTracker: ProjectTracker;

  // Shared knowledge management components
  embeddingManager: EmbeddingManager;
  similarityEngine: SimilarityEngine;
  ragSystem: RAGSystem;
  semanticSearchService: any;

  // Shared vault analysis patterns
  vaultPatterns: VaultPatterns | null = null;

  // Service instances
  private contentEnhancer: ContentEnhancer;
  private tagGenerator: TagGenerator;
  private tagEditor: TagEditor;

  // Phase 2 components
  private linkSuggestionEngine: LinkSuggestionEngine;
  private knowledgeGraphManager: KnowledgeGraphManager;
  private orphanDetector: OrphanDetector;
  // embeddingManager and similarityEngine are now public shared instances above
  
  
  
  // MoE System
  private moeOrchestrator: SimpleMoEOrchestrator | null = null;

  async onload() {
    console.log('CLIPPY AI Assistant: Loading plugin...');

    try {
      await this.initializePlugin();
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
    
    
    
    // Clean up MoE system
    if (this.moeOrchestrator) {
      // MoE system cleanup if needed
      this.moeOrchestrator = null;
    }
    
    // Clear any caches
    ProviderFactory.clearCache();
    this.vaultAnalyzer?.clearCache();
    
    console.log('CLIPPY AI Assistant: Plugin unloaded');
  }

//   /**
//    * Initialize the plugin with error boundaries
//    */
  private async initializePlugin(): Promise<void> {
    await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        // Initialize settings manager
        this.settingsManager = new SettingsManager(this);
        
        // Load settings with error boundary
        this.settings = await ClippyErrorBoundaries.fileSystemOperation(
          () => this.settingsManager.loadSettings(),
          'load plugin settings',
          undefined,
          {
            fallback: async () => {
              console.warn('CLIPPY: Failed to load settings, using defaults');
              return { ...DEFAULT_SETTINGS };
            },
            showUserNotice: true
          }
        );
        
        // Validate settings
        const validation = ClippyErrorBoundaries.validationOperation(
          () => this.settingsManager.validateSettings(this.settings),
          'validate plugin settings',
          this.settings,
          {
            fallback: () => ({ valid: false, errors: ['Settings validation failed'] }),
            showUserNotice: false
          }
        );
        
        if (!validation.valid) {
          console.warn('CLIPPY: Settings validation issues:', validation.errors);
          new Notice(`CLIPPY: ${validation.errors[0]}`, 5000);
        }

        // Initialize services
        this.initializeServices();

        // Initialize shared research system components
        this.projectTracker = new ProjectTracker(this.app);

        // Initialize shared knowledge management components using centralized RAG settings
        this.embeddingManager = new EmbeddingManager(this.settings.rag.embeddings.ollamaUrl, this.settings);
        this.similarityEngine = new SimilarityEngine(this.embeddingManager);
        
        // Initialize shared RAG system
        const qualityRater = new QualityRater();
        this.ragSystem = new RAGSystem(this.embeddingManager, this.similarityEngine, qualityRater, this.settings);

        // Initialize semantic search service
        const { SemanticSearchService } = await import('./features/search/semantic-search-integration');
        this.semanticSearchService = new SemanticSearchService(
            this.app,
            this.embeddingManager,
            this.similarityEngine,
            this.settings
        );

        // Initialize vault analyzer
        this.vaultAnalyzer = new VaultAnalyzer(this.app);

        // Initialize shared vault patterns (analyze vault once at startup)
        await this.initializeVaultPatterns();

        // Initialize Phase 2 components
        await this.initializePhase2Components();

        
        // Initialize MoE system if enabled
        if (this.settings.features.moeSystemEnabled) {
          await this.initializeMoESystem();
        }

        // Initialize command handlers
        this.commandHandlers = new CommandHandlers(this);
        this.commandHandlers.registerCommands();

        // Add settings tab
        this.addSettingTab(new ClippySettingsTab(this.app, this));

        // Add ribbon icon
        this.addRibbonIcon('sparkles', 'CLIPPY AI Assistant', async () => {
          const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (activeView) {
            this.showEnhancementModal(activeView.editor);
          } else {
            new Notice('Open a note to use CLIPPY');
          }
        });

        // Register views
        this.registerView(
          VIEW_TYPE_CLIPPY_INSIGHTS,
          (leaf) => new ClippyInsightsView(leaf, this.settings)
        );
        
        
        this.registerView(
          VIEW_TYPE_RESEARCH_AGENT,
          (leaf) => new ResearchAgentSidebarView(leaf, this)
        );

        // Schedule vault analysis in background
        this.scheduleVaultAnalysis();

        // Register events
        this.registerEvents();
      },
      'plugin initialization',
      undefined,
      {
        showUserNotice: true
      }
    );
  }

//   /**
//    * Initialize service instances
//    */
  private initializeServices(): void {
    this.contentEnhancer = new ContentEnhancer(this.settings);
    this.tagGenerator = new TagGenerator(this.settings);
    this.tagEditor = new TagEditor();
  }

//   /**
//    * Initialize Phase 2 components
//    */
  private async initializePhase2Components(): Promise<void> {
    await ClippyErrorBoundaries.aiProviderOperation(
      async () => {
        this.knowledgeGraphManager = new KnowledgeGraphManager(this.app.vault, this.app.metadataCache, this.embeddingManager, this.similarityEngine);
        this.orphanDetector = new OrphanDetector(this.app.vault, this.app.metadataCache, this.embeddingManager, this.similarityEngine);
        // Use shared embedding and similarity systems (already initialized)
        
        const suggestionSettings = {
          realTimeEnabled: this.settings.features.intelligentLinksEnabled,
          minConfidence: this.settings.vaultPatterns.suggestionConfidenceThreshold,
          maxSuggestions: 5,
          triggers: ['typing', 'paragraph', 'query'] as any,
          showInline: true,
          showSidebar: true,
          autoLinkThreshold: 0.9
        };
        
        this.linkSuggestionEngine = new LinkSuggestionEngine(
          this.embeddingManager, 
          this.similarityEngine, 
          suggestionSettings, 
          this.app.vault, 
          this.app.metadataCache
        );
      },
      'initialize Phase 2 components',
      {
        fallback: async () => {
          console.log('CLIPPY: Phase 2 components initialization failed, using fallback');
        },
        showUserNotice: false
      }
    );
  }



  /**
   * Initialize the MoE system
   * 
   * Sets up simple mixture of experts for intelligent assistance
   */
  private async initializeMoESystem(): Promise<void> {
    try {
      console.log('CLIPPY: Initializing Simple MoE System...');
      
      // Initialize simple MoE orchestrator
      this.moeOrchestrator = new SimpleMoEOrchestrator(this);
      await this.moeOrchestrator.initialize();
      
      console.log('CLIPPY: Simple MoE System initialized successfully');
      
    } catch (error) {
      console.error('CLIPPY: Simple MoE System initialization failed:', error);
      new Notice('Simple MoE System initialization failed - check console for details', 5000);
    }
  }






//   /**
//    * Show enhancement modal using extracted component
//    */
  showEnhancementModal(editor: Editor): void {
    const content = editor.getValue();
    if (!content.trim()) {
      new Notice('Note is empty');
      return;
    }

    const modal = new EnhancementModal(
      this.app,
      content,
      (enhancedContent: string) => {
        editor.setValue(enhancedContent);
        new Notice('Note enhanced successfully!');
      },
      this.contentEnhancer
    );
    modal.open();
  }

//   /**
//    * Show tagging modal using extracted component
//    */
  showTaggingModal(editor: Editor): void {
    const content = editor.getValue();
    if (!content.trim()) {
      new Notice('Note is empty');
      return;
    }

    const modal = new TaggingModal(
      this.app,
      content,
      (tags: string[]) => {
        this.tagEditor.addTagsToNote(editor, tags);
        new Notice(`Added ${tags.length} tags to note`);
      },
      this.tagGenerator
    );
    modal.open();
  }

//   /**
//    * Schedule vault analysis in the background
//    */
  private async scheduleVaultAnalysis(): Promise<void> {
    setTimeout(async () => {
      await ClippyErrorBoundaries.aiProviderOperation(
        () => this.vaultAnalyzer.analyzeVaultPatterns(),
        'background vault analysis',
        {
          fallback: async () => {
            console.log('CLIPPY: Vault analysis failed, using empty patterns');
            return {
              tagPatterns: [],
              dateFormats: [],
              cssClasses: [],
              frontmatterSchemas: [],
              wikilinkPatterns: []
            };
          },
          showUserNotice: false
        }
      );
    }, 5000);
  }

//   /**
//    * Register event listeners
//    */
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
  }

  private vaultAnalysisTimeout: NodeJS.Timeout | null = null;

//   /**
//    * Debounced vault analysis to avoid excessive re-analysis
//    */
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
    }, 30000);
  }

//   /**
//    * Save settings with validation
//    */
  async saveSettings(): Promise<void> {
    await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        // Validate before saving
        const validation = ClippyErrorBoundaries.validationOperation(
          () => this.settingsManager.validateSettings(this.settings),
          'validate settings before save',
          this.settings,
          {
            fallback: () => ({ valid: false, errors: ['Settings validation failed'] }),
            showUserNotice: false
          }
        );
        
        if (!validation.valid) {
          console.warn('CLIPPY: Settings validation failed:', validation.errors);
          new Notice(`CLIPPY: ${validation.errors[0]}`, 3000);
        }

        await this.settingsManager.saveSettings(this.settings);
        
        // Update services with new settings
        this.contentEnhancer.updateSettings(this.settings);
        this.tagGenerator.updateSettings(this.settings);
        
        // Clear provider cache when settings change
        ProviderFactory.clearCache();
        
        console.log('CLIPPY: Settings saved successfully');
      },
      'save plugin settings',
      undefined,
      {
        showUserNotice: true
      }
    );
  }

//   /**
//    * Get AI provider instance
//    */
  async getAIProvider() {
    return await ClippyErrorBoundaries.aiProviderOperation(
      () => ProviderFactory.createProvider(this.settings),
      'get AI provider',
      {
        showUserNotice: true
      }
    );
  }

//   /**
//    * Get available AI providers
//    */
  async getAvailableProviders(): Promise<string[]> {
    try {
      return await ProviderFactory.getAvailableProviders(this.settings);
    } catch (error) {
      console.error('CLIPPY: Failed to get available providers:', error);
      return [];
    }
  }

  /**
   * Initialize shared vault patterns at plugin startup
   */
  private async initializeVaultPatterns(): Promise<void> {
    this.vaultPatterns = await ClippyErrorBoundaries.aiProviderOperation(
      () => this.vaultAnalyzer.analyzeVaultPatterns(),
      'initialize vault patterns',
      {
        fallback: async () => {
          console.warn('CLIPPY: Failed to initialize vault patterns, using empty patterns');
          return {
            tagPatterns: [],
            dateFormats: [],
            cssClasses: [],
            frontmatterSchemas: [],
            wikilinkPatterns: []
          };
        },
        showUserNotice: false
      }
    );
    
    console.log(`CLIPPY: Initialized vault patterns - ${this.vaultPatterns.tagPatterns.length} tag patterns, ${this.vaultPatterns.frontmatterSchemas.length} frontmatter schemas`);
  }

  /**
   * Force refresh of vault patterns
   */
  async refreshVaultPatterns(): Promise<void> {
    this.vaultPatterns = await ClippyErrorBoundaries.aiProviderOperation(
      () => this.vaultAnalyzer.analyzeVaultPatterns(true),
      'refresh vault patterns',
      {
        fallback: async () => {
          console.warn('CLIPPY: Failed to refresh vault patterns, using empty patterns');
          return {
            tagPatterns: [],
            dateFormats: [],
            cssClasses: [],
            frontmatterSchemas: [],
            wikilinkPatterns: []
          };
        },
        showUserNotice: true
      }
    );
    
    console.log(`CLIPPY: Refreshed vault patterns - ${this.vaultPatterns.tagPatterns.length} tag patterns, ${this.vaultPatterns.frontmatterSchemas.length} frontmatter schemas`);
    new Notice('CLIPPY: Vault patterns refreshed');
  }

//   /**
//    * Check if this is the first time the plugin is loaded
//    */
  private isFirstLoad(): boolean {
    return !this.settings.vaultPatterns.templateFolder || 
           this.settings.vaultPatterns.templateFolder === DEFAULT_SETTINGS.vaultPatterns.templateFolder;
  }

//   /**
//    * Show welcome message to new users
//    */
  private showWelcomeMessage(): void {
    const message = `🤖 Welcome to CLIPPY AI Assistant!

To get started:
1. Configure your AI provider in Settings
2. Try the "Enhance current note" command
3. Use Ctrl+Shift+T for quick tagging

Check the command palette for all CLIPPY features!`;

    new Notice(message, 10000);
  }

//   /**
//    * Get plugin status for debugging
//    */
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

//   /**
//    * Emergency reset for debugging
//    */
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