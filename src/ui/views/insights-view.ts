/**
 * CLIPPY AI Assistant - Insights View
 * Phase 2 integration view for AI insights and suggestions
 */

import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { ClippySettings } from '../../types';
import { LinkSuggestionEngine } from '../../features/knowledge-management/link-suggestions/suggestion-engine';
import { KnowledgeGraphManager } from '../../features/knowledge-management/knowledge-graph/graph-manager';
import { OrphanDetector } from '../../features/knowledge-management/discovery/orphan-detector';
import { SuggestionPanel } from '../suggestion-panel';
import { EmbeddingManager } from '../../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../../features/knowledge-management/semantic/similarity-engine';

export const VIEW_TYPE_CLIPPY_INSIGHTS = 'clippy-insights';

export class ClippyInsightsView extends ItemView {
  private suggestionPanel: SuggestionPanel;
  private settings: ClippySettings;

  constructor(leaf: WorkspaceLeaf, settings: ClippySettings) {
    super(leaf);
    this.settings = settings;
  }

  getViewType(): string {
    return VIEW_TYPE_CLIPPY_INSIGHTS;
  }

  getDisplayText(): string {
    return 'CLIPPY Insights';
  }

  getIcon(): string {
    return 'sparkles';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    
    // Initialize Phase 2 components using shared instances
    const plugin = (this.app as any).plugins.plugins['clippy-ai-assistant'];
    const embeddingManager = plugin?.embeddingManager || new EmbeddingManager(this.settings.providers.ollama.baseUrl);
    const similarityEngine = plugin?.similarityEngine || new SimilarityEngine(embeddingManager);
    
    const graphManager = new KnowledgeGraphManager(this.app.vault, this.app.metadataCache, embeddingManager, similarityEngine);
    const orphanDetector = new OrphanDetector(this.app.vault, this.app.metadataCache, embeddingManager, similarityEngine);
    
    const suggestionSettings = {
      realTimeEnabled: true,
      minConfidence: 0.7,
      maxSuggestions: 5,
      triggers: ['typing', 'paragraph', 'query'] as any,
      showInline: true,
      showSidebar: true,
      autoLinkThreshold: 0.9
    };
    
    const suggestionEngine = new LinkSuggestionEngine(
      embeddingManager, 
      similarityEngine, 
      suggestionSettings, 
      this.app.vault, 
      this.app.metadataCache
    );
    
    this.suggestionPanel = new SuggestionPanel(
      container as HTMLElement,
      suggestionEngine,
      graphManager,
      orphanDetector,
      this.app,
      embeddingManager,
      similarityEngine
    );
    
    this.suggestionPanel.load();
  }

  async onClose() {
    if (this.suggestionPanel) {
      this.suggestionPanel.unload();
    }
  }
}