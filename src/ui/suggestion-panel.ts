import { Component, MarkdownView, TFile, WorkspaceLeaf, App, Notice, Modal } from 'obsidian';
import { LinkSuggestionEngine } from '../features/knowledge-management/link-suggestions/suggestion-engine';
import { KnowledgeGraphManager } from '../features/knowledge-management/knowledge-graph/graph-manager';
import { OrphanDetector } from '../features/knowledge-management/discovery/orphan-detector';
import { OrphanManagementModal } from './orphan-management-modal';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';
import { BridgeManager } from './bridge-manager';

interface SuggestionItem {
    type: 'link' | 'orphan' | 'bridge' | 'cluster';
    title: string;
    description: string;
    action: () => void;
    confidence: number;
    icon: string;
    orphanData?: OrphanDetailData; // For orphan suggestions
}

interface OrphanDetailData {
    file: TFile;
    connections: any[];
    tagSuggestions: any[];
}

export class SuggestionPanel extends Component {
    private containerEl: HTMLElement;
    private suggestionEngine: LinkSuggestionEngine;
    private graphManager: KnowledgeGraphManager;
    private orphanDetector: OrphanDetector;
    private currentFile: TFile | null = null;
    private refreshDebounceTimer: number | null = null;
    private app: App;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private bridgeManager: BridgeManager;
    private cachedOrphanSuggestions: SuggestionItem[] = [];
    private lastOrphanRefresh: number = 0;
    private cachedBridgeSuggestions: SuggestionItem[] = [];
    private lastBridgeRefresh: number = 0;

    constructor(
        containerEl: HTMLElement,
        suggestionEngine: LinkSuggestionEngine,
        graphManager: KnowledgeGraphManager,
        orphanDetector: OrphanDetector,
        app: App,
        embeddingManager: EmbeddingManager,
        similarityEngine: SimilarityEngine
    ) {
        super();
        this.containerEl = containerEl;
        this.suggestionEngine = suggestionEngine;
        this.graphManager = graphManager;
        this.orphanDetector = orphanDetector;
        this.app = app;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
        this.bridgeManager = new BridgeManager(app, orphanDetector, embeddingManager, similarityEngine);
    }

    onload() {
        this.render();
        this.registerEventListeners();
        this.detectCurrentFile();
    }

    /**
     * Render the suggestion panel UI.
     */
    private render(): void {
        this.containerEl.empty();
        this.containerEl.addClass('clippy-suggestion-panel');

        // Header
        const header = this.containerEl.createEl('div', { cls: 'clippy-panel-header' });
        header.createEl('h3', { text: '✨ CLIPPY Insights', cls: 'clippy-panel-title' });
        
        const refreshBtn = header.createEl('button', { 
            cls: 'clippy-refresh-btn',
            attr: { 'aria-label': 'Refresh suggestions' }
        });
        refreshBtn.innerHTML = '🔄';
        refreshBtn.addEventListener('click', () => this.forceRefreshAll());

        // Suggestions container
        const suggestionsContainer = this.containerEl.createEl('div', { cls: 'clippy-suggestions-container' });
        
        // Loading state
        this.showLoadingState(suggestionsContainer);
        
        // Load initial suggestions
        console.log('CLIPPY: Suggestion panel rendered, loading initial suggestions...');
        this.refreshSuggestions();
    }

    /**
     * Detect the currently active file on initialization.
     */
    private detectCurrentFile(): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file) {
            console.log('CLIPPY: Initial file detected:', activeView.file.path);
            this.currentFile = activeView.file;
            this.refreshSuggestions();
        } else {
            console.log('CLIPPY: No active markdown file detected');
        }
    }

    /**
     * Register event listeners for real-time updates.
     */
    private registerEventListeners(): void {
        // Listen for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
                if (leaf?.view instanceof MarkdownView && leaf.view.file) {
                    console.log('CLIPPY: File changed to:', leaf.view.file.path);
                    this.currentFile = leaf.view.file;
                    this.debouncedRefresh();
                } else {
                    console.log('CLIPPY: No markdown file in active leaf');
                }
            })
        );

        // Listen for file content changes
        this.registerEvent(
            this.app.vault.on('modify', (file: TFile) => {
                if (file === this.currentFile) {
                    this.debouncedRefresh();
                }
            })
        );

        // Listen for file creation/deletion
        this.registerEvent(this.app.vault.on('create', () => this.debouncedRefresh()));
        this.registerEvent(this.app.vault.on('delete', () => this.debouncedRefresh()));
    }

    /**
     * Debounced refresh to prevent excessive updates.
     */
    private debouncedRefresh(): void {
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }
        
        this.refreshDebounceTimer = window.setTimeout(() => {
            this.refreshSuggestions();
        }, 1000); // 1 second debounce
    }

    /**
     * Force refresh all suggestions including orphans.
     */
    private async forceRefreshAll(): Promise<void> {
        console.log('CLIPPY: Force refreshing all suggestions including orphans');
        this.lastOrphanRefresh = 0; // Reset orphan cache
        this.cachedOrphanSuggestions = [];
        await this.refreshSuggestions();
    }

    /**
     * Refresh suggestions based on current context.
     */
    private async refreshSuggestions(): Promise<void> {
        const container = this.containerEl.querySelector('.clippy-suggestions-container') as HTMLElement;
        if (!container) return;

        console.log('CLIPPY: Refreshing suggestions for file:', this.currentFile?.path || 'none');
        this.showLoadingState(container);

        try {
            const suggestions = await this.generateSuggestions();
            console.log('CLIPPY: Generated', suggestions.length, 'suggestions');
            this.renderSuggestions(container, suggestions);
        } catch (error) {
            console.error('CLIPPY: Error generating suggestions:', error);
            this.showErrorState(container, error);
        }
    }

    /**
     * Generate contextual suggestions.
     */
    private async generateSuggestions(): Promise<SuggestionItem[]> {
        const suggestions: SuggestionItem[] = [];

        // 1. Context-specific link suggestions
        if (this.currentFile) {
            const linkSuggestions = await this.generateLinkSuggestions();
            suggestions.push(...linkSuggestions);
        }

        // 2. Orphan detection suggestions (cached, only refresh on manual refresh)
        const orphanSuggestions = await this.getOrphanSuggestions();
        suggestions.push(...orphanSuggestions); // Already limited to top 3

        // 3. Bridge opportunities
        const bridgeSuggestions = await this.generateBridgeSuggestions();
        suggestions.push(...bridgeSuggestions.slice(0, 2)); // Top 2

        // 4. Cluster insights
        const clusterSuggestions = await this.generateClusterSuggestions();
        suggestions.push(...clusterSuggestions.slice(0, 2)); // Top 2

        // Sort by confidence and return top suggestions
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 8); // Max 8 suggestions
    }

    /**
     * Generate link suggestions for current file.
     */
    private async generateLinkSuggestions(): Promise<SuggestionItem[]> {
        if (!this.currentFile) return [];

        const content = await this.app.vault.cachedRead(this.currentFile);
        const suggestionContext = {
            currentContent: content,
            cursorPosition: 0,
            currentParagraph: content.split('\n')[0] || '',
            surroundingText: content.substring(0, 200),
            existingLinks: []
        };
        const suggestions = await this.suggestionEngine.getSuggestionsForContext(
            suggestionContext,
            'typing' as any
        );

        return suggestions.slice(0, 3).map(suggestion => ({
            type: 'link' as const,
            title: `Link to ${suggestion.targetNote}`,
            description: `${suggestion.confidence.toFixed(1)}% match - ${suggestion.reason}`,
            confidence: suggestion.confidence,
            icon: '🔗',
            action: () => this.insertLink(suggestion.targetNote, suggestion.linkText || `[[${suggestion.targetNote}]]`)
        }));
    }

    /**
     * Get orphan suggestions (cached, only refresh manually).
     */
    private async getOrphanSuggestions(): Promise<SuggestionItem[]> {
        const cacheTimeout = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        
        if (this.cachedOrphanSuggestions.length > 0 && (now - this.lastOrphanRefresh) < cacheTimeout) {
            console.log('CLIPPY: Using cached orphan suggestions');
            return this.cachedOrphanSuggestions;
        }
        
        console.log('CLIPPY: Generating fresh orphan suggestions');
        this.cachedOrphanSuggestions = await this.generateOrphanSuggestions();
        this.lastOrphanRefresh = now;
        return this.cachedOrphanSuggestions;
    }

    /**
     * Generate orphan detection suggestions.
     */
    private async generateOrphanSuggestions(): Promise<SuggestionItem[]> {
        const orphans = await this.orphanDetector.findOrphanedNotes(false);
        const connectionOpportunities = await this.orphanDetector.suggestConnectionsForOrphans(orphans);

        // Get top 3 highest isolated notes
        const topOrphans = connectionOpportunities
            .sort((a, b) => {
                const aFile = this.app.vault.getAbstractFileByPath(a.note) as TFile;
                const bFile = this.app.vault.getAbstractFileByPath(b.note) as TFile;
                const aOrphan = orphans.find(o => o.file.path === aFile?.path);
                const bOrphan = orphans.find(o => o.file.path === bFile?.path);
                return (bOrphan?.isolationScore || 0) - (aOrphan?.isolationScore || 0);
            })
            .slice(0, 3);

        return topOrphans.map(opportunity => {
            const orphanFile = this.app.vault.getAbstractFileByPath(opportunity.note) as TFile;
            const orphanData = orphans.find(o => o.file.path === orphanFile?.path);
            const topConnection = opportunity.potentialConnections[0];
            
            return {
                type: 'orphan' as const,
                title: `${orphanFile?.basename || 'orphaned note'}`,
                description: `Isolation: ${Math.round((orphanData?.isolationScore || 0) * 100)}% • ${opportunity.potentialConnections.length} connections`,
                confidence: (orphanData?.isolationScore || 0) * 100,
                icon: '🏝️',
                orphanData: {
                    file: orphanFile,
                    connections: opportunity.potentialConnections,
                    tagSuggestions: [] // Will be populated when detail view is opened
                },
                action: () => this.autoProcessOrphan(orphanFile, opportunity.potentialConnections)
            };
        });
    }

    /**
     * Generate bridge suggestions.
     */
    private async generateBridgeSuggestions(): Promise<SuggestionItem[]> {
        const cacheTimeout = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();
        
        if (this.cachedBridgeSuggestions.length > 0 && (now - this.lastBridgeRefresh) < cacheTimeout) {
            return this.cachedBridgeSuggestions;
        }
        
        try {
            const bridges = await this.bridgeManager.getBridgeOpportunities();
            
            this.cachedBridgeSuggestions = bridges.slice(0, 3).map(bridge => ({
                type: 'bridge' as const,
                title: this.formatBridgeTitle(bridge),
                description: bridge.description,
                confidence: bridge.confidence * 100,
                icon: this.getBridgeIcon(bridge.type),
                action: () => this.showBridgeOpportunity(bridge)
            }));
            
            this.lastBridgeRefresh = now;
            return this.cachedBridgeSuggestions;
        } catch (error) {
            console.error('CLIPPY: Error generating bridge suggestions:', error);
            return [];
        }
    }

    /**
     * Generate cluster-based suggestions.
     */
    private async generateClusterSuggestions(): Promise<SuggestionItem[]> {
        const graphData = this.graphManager.getEnhancedGraphData();
        const suggestions: SuggestionItem[] = [];

        // Suggest creating index notes for large clusters
        const largeClusters = graphData.clusters.filter(cluster => cluster.nodes.length > 5);
        
        for (const cluster of largeClusters.slice(0, 2)) {
            suggestions.push({
                type: 'cluster' as const,
                title: `Create index for ${cluster.name}`,
                description: `${cluster.nodes.length} related notes could benefit from an overview`,
                confidence: cluster.coherence * 100,
                icon: '📑',
                action: () => this.createClusterIndex(cluster)
            });
        }

        return suggestions;
    }

    /**
     * Render suggestions in the container.
     */
    private renderSuggestions(container: HTMLElement, suggestions: SuggestionItem[]): void {
        container.empty();

        if (suggestions.length === 0) {
            const emptyState = container.createEl('div', { cls: 'clippy-empty-state' });
            emptyState.createEl('p', { text: '🤖 No suggestions right now' });
            emptyState.createEl('p', { 
                text: 'Keep writing and I\'ll find connections!',
                cls: 'clippy-empty-subtitle'
            });
            return;
        }

        // Group suggestions by type
        const groupedSuggestions = this.groupSuggestionsByType(suggestions);

        for (const [type, items] of Object.entries(groupedSuggestions)) {
            if (items.length === 0) continue;

            // Section header
            const section = container.createEl('div', { cls: 'clippy-suggestion-section' });
            const header = section.createEl('h4', { cls: 'clippy-section-header' });
            header.textContent = this.getSectionTitle(type);

            // Suggestion items
            for (const item of items) {
                this.renderSuggestionItem(section, item);
            }
        }
    }

    /**
     * Render individual suggestion item.
     */
    private renderSuggestionItem(container: HTMLElement, suggestion: SuggestionItem): void {
        const item = container.createEl('div', { cls: 'clippy-suggestion-item' });

        // Icon and content
        const icon = item.createEl('span', { cls: 'clippy-suggestion-icon' });
        icon.textContent = suggestion.icon;

        const content = item.createEl('div', { cls: 'clippy-suggestion-content' });
        content.createEl('div', { text: suggestion.title, cls: 'clippy-suggestion-title' });
        content.createEl('div', { text: suggestion.description, cls: 'clippy-suggestion-desc' });

        // Confidence indicator
        const confidence = item.createEl('div', { cls: 'clippy-confidence' });
        const confidenceBar = confidence.createEl('div', { cls: 'clippy-confidence-bar' });
        const confidenceFill = confidenceBar.createEl('div', { cls: 'clippy-confidence-fill' });
        confidenceFill.style.width = `${suggestion.confidence}%`;
        
        // Add confidence level class
        const level = suggestion.confidence > 80 ? 'high' : suggestion.confidence > 60 ? 'medium' : 'low';
        confidenceFill.addClass(`clippy-confidence-${level}`);

        // Action buttons
        const actions = item.createEl('div', { cls: 'clippy-suggestion-actions' });
        
        // View details button
        const detailsBtn = actions.createEl('button', { 
            text: '👁️',
            cls: 'clippy-action-btn clippy-details-btn',
            attr: { 'aria-label': 'View details' }
        });
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showSuggestionDetails(suggestion);
        });

        // Apply action button
        const applyBtn = actions.createEl('button', { 
            text: '✓',
            cls: 'clippy-action-btn clippy-apply-btn',
            attr: { 'aria-label': 'Apply suggestion' }
        });
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CLIPPY: Applying suggestion:', suggestion.title, suggestion.type);
            try {
                suggestion.action();
                console.log('CLIPPY: Suggestion applied successfully');
            } catch (error) {
                console.error('CLIPPY: Error applying suggestion:', error);
            }
        });
    }

    /**
     * Show detailed information about a suggestion.
     */
    private showSuggestionDetails(suggestion: SuggestionItem): void {
        if (suggestion.type === 'orphan' && suggestion.orphanData) {
            this.showOrphanDetailModal(suggestion.orphanData);
        } else {
            this.showGenericDetailModal(suggestion);
        }
    }

    /**
     * Show orphan detail modal with actions.
     */
    private async showOrphanDetailModal(orphanData: OrphanDetailData): Promise<void> {
        // Generate tag suggestions if not already done
        if (orphanData.tagSuggestions.length === 0) {
            const orphanNote = {
                file: orphanData.file,
                title: orphanData.file.basename,
                content: await this.app.vault.read(orphanData.file),
                tags: [],
                incomingLinks: 0,
                outgoingLinks: 0,
                lastModified: orphanData.file.stat.mtime,
                wordCount: 0,
                isolationScore: 0
            };
            
            const existingTags = this.getExistingTags();
            orphanData.tagSuggestions = await this.generateTagSuggestions(orphanNote, existingTags);
        }

        const modal = document.createElement('div');
        modal.className = 'clippy-orphan-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            border: 2px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;

        // Header
        const header = modal.createEl('h3', { text: `🏝️ ${orphanData.file.basename}` });
        header.style.cssText = 'margin-top: 0; color: var(--text-normal); text-align: center;';

        // Connections section
        if (orphanData.connections.length > 0) {
            const connectionsHeader = modal.createEl('h4', { text: '🔗 Suggested Connections' });
            connectionsHeader.style.cssText = 'color: var(--text-normal); margin-top: 20px;';
            
            const connectionsList = modal.createEl('div');
            orphanData.connections.slice(0, 5).forEach(conn => {
                const connItem = connectionsList.createEl('div');
                connItem.style.cssText = 'padding: 8px; margin: 4px 0; background: var(--background-secondary); border-radius: 4px;';
                connItem.innerHTML = `
                    <strong>${this.getFileName(conn.target)}</strong><br>
                    <small style="color: var(--text-muted);">${Math.round(conn.similarity * 100)}% similarity</small>
                `;
            });
        }

        // Tags section
        if (orphanData.tagSuggestions.length > 0) {
            const tagsHeader = modal.createEl('h4', { text: '🏷️ Suggested Tags' });
            tagsHeader.style.cssText = 'color: var(--text-normal); margin-top: 20px;';
            
            const tagsList = modal.createEl('div');
            orphanData.tagSuggestions.slice(0, 5).forEach(tag => {
                const tagItem = tagsList.createEl('span');
                tagItem.style.cssText = 'display: inline-block; padding: 4px 8px; margin: 2px; background: var(--interactive-accent); color: white; border-radius: 12px; font-size: 12px;';
                tagItem.textContent = `#${tag.tag}`;
            });
        }

        // Action buttons
        const actions = modal.createEl('div');
        actions.style.cssText = 'display: flex; gap: 8px; justify-content: center; margin-top: 24px; flex-wrap: wrap;';

        const connectBtn = actions.createEl('button', { text: '🔗 Connect Best' });
        connectBtn.style.cssText = 'background: var(--color-blue); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        connectBtn.addEventListener('click', () => {
            this.connectBestForOrphan(orphanData);
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        const tagBtn = actions.createEl('button', { text: '🏷️ Tag Best' });
        tagBtn.style.cssText = 'background: var(--color-green); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        tagBtn.addEventListener('click', () => {
            this.tagBestForOrphan(orphanData);
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        const autoBtn = actions.createEl('button', { text: '🚀 Auto Process' });
        autoBtn.style.cssText = 'background: var(--interactive-accent); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        autoBtn.addEventListener('click', () => {
            this.autoProcessOrphan(orphanData.file, orphanData.connections);
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        const closeBtn = actions.createEl('button', { text: 'Close' });
        closeBtn.style.cssText = 'background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;
        overlay.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    /**
     * Show generic detail modal for non-orphan suggestions.
     */
    private showGenericDetailModal(suggestion: SuggestionItem): void {
        const modal = document.createElement('div');
        modal.className = 'clippy-suggestion-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            border: 2px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            width: 90%;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;

        // Modal content
        const header = modal.createEl('h3', { text: suggestion.title });
        header.style.cssText = 'margin-top: 0; color: var(--text-normal);';
        
        const description = modal.createEl('p', { text: suggestion.description });
        description.style.cssText = 'color: var(--text-muted); margin-bottom: 16px;';

        const confidenceInfo = modal.createEl('div');
        confidenceInfo.innerHTML = `
            <strong>Confidence:</strong> ${suggestion.confidence.toFixed(1)}%<br>
            <strong>Type:</strong> ${suggestion.type}<br>
            <strong>Icon:</strong> ${suggestion.icon}
        `;
        confidenceInfo.style.cssText = 'color: var(--text-normal); margin-bottom: 20px; line-height: 1.5;';

        // Action buttons
        const actions = modal.createEl('div');
        actions.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

        const applyBtn = actions.createEl('button', { text: 'Apply Suggestion' });
        applyBtn.style.cssText = 'background: var(--interactive-accent); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        applyBtn.addEventListener('click', () => {
            suggestion.action();
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        const closeBtn = actions.createEl('button', { text: 'Close' });
        closeBtn.style.cssText = 'background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); padding: 8px 16px; border-radius: 4px; cursor: pointer;';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;
        overlay.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    /**
     * Show loading state.
     */
    private showLoadingState(container: HTMLElement): void {
        container.empty();
        const loading = container.createEl('div', { cls: 'clippy-loading' });
        loading.createEl('div', { text: '🤖 Analyzing...', cls: 'clippy-loading-text' });
        
        const spinner = loading.createEl('div', { cls: 'clippy-spinner' });
        spinner.innerHTML = '⟳';
    }

    /**
     * Show error state.
     */
    private showErrorState(container: HTMLElement, error: any): void {
        container.empty();
        const errorEl = container.createEl('div', { cls: 'clippy-error' });
        errorEl.createEl('div', { text: '⚠️ Something went wrong', cls: 'clippy-error-title' });
        errorEl.createEl('div', { 
            text: 'Try refreshing or check console for details',
            cls: 'clippy-error-desc'
        });
        
        console.error('CLIPPY Suggestion Panel Error:', error);
    }

    // Action handlers
    private async insertLink(_targetNote: string, suggestedText: string): Promise<void> {
        console.log('CLIPPY: Attempting to insert link:', suggestedText);
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.error('CLIPPY: No active markdown view found');
            return;
        }

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        console.log('CLIPPY: Inserting at cursor position:', cursor);
        editor.replaceRange(suggestedText, cursor);
        console.log('CLIPPY: Link inserted successfully');
    }

    private openOrphanModal(): void {
        console.log('CLIPPY: Opening orphan management modal');
        const modal = new OrphanManagementModal(
            this.app,
            this.orphanDetector,
            this.embeddingManager,
            this.similarityEngine
        );
        modal.open();
    }

    private async showBridgeOpportunity(bridge: any): Promise<void> {
        console.log('CLIPPY: Showing bridge opportunity:', bridge);
        
        const confirmed = await this.showBridgeConfirmationDialog(bridge);
        if (confirmed) {
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
                    return;
            }
            
            if (success) {
                // Refresh suggestions after implementing bridge
                this.lastBridgeRefresh = 0;
                this.cachedBridgeSuggestions = [];
                await this.refreshSuggestions();
            }
        }
    }

    private async showBridgeConfirmationDialog(bridge: any): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new (class extends Modal {
                constructor(app: App) {
                    super(app);
                }
                
                onOpen() {
                    const { contentEl } = this;
                    contentEl.empty();
                    contentEl.createEl('h2', { text: `Implement ${bridge.title}?` });
                    contentEl.createEl('p', { text: bridge.description });
                    
                    const buttonContainer = contentEl.createEl('div', { 
                        cls: 'modal-button-container' 
                    });
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.gap = '10px';
                    buttonContainer.style.justifyContent = 'flex-end';
                    buttonContainer.style.marginTop = '20px';
                    
                    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
                    cancelBtn.addEventListener('click', () => {
                        this.close();
                        resolve(false);
                    });
                    
                    const confirmBtn = buttonContainer.createEl('button', { 
                        text: `Implement ${bridge.type.charAt(0).toUpperCase() + bridge.type.slice(1)} Bridge`,
                        cls: 'mod-cta'
                    });
                    confirmBtn.addEventListener('click', () => {
                        this.close();
                        resolve(true);
                    });
                }
            })(this.app);
            
            modal.open();
        });
    }

    private formatBridgeTitle(bridge: any): string {
        switch (bridge.type) {
            case 'auto':
                return `🤖 ${bridge.title}`;
            case 'tag':
                return `🏷️ ${bridge.title}`;
            case 'research':
                return `🔬 ${bridge.title}`;
            case 'index':
                return `📋 ${bridge.title}`;
            default:
                return bridge.title;
        }
    }

    private getBridgeIcon(type: string): string {
        const icons: Record<string, string> = {
            auto: '🤖',
            tag: '🏷️',
            research: '🔬',
            index: '📋'
        };
        return icons[type] || '🌉';
    }

    private async createClusterIndex(cluster: any): Promise<void> {
        // Create new index note for cluster
        const indexContent = this.generateClusterIndexContent(cluster);
        const fileName = `${cluster.name} - Index.md`;
        
        try {
            await this.app.vault.create(fileName, indexContent);
            this.app.workspace.openLinkText(fileName, '', false);
        } catch (error) {
            console.error('Failed to create cluster index:', error);
        }
    }

    // Helper methods
    private groupSuggestionsByType(suggestions: SuggestionItem[]): Record<string, SuggestionItem[]> {
        return suggestions.reduce((groups, suggestion) => {
            const type = suggestion.type;
            if (!groups[type]) groups[type] = [];
            groups[type].push(suggestion);
            return groups;
        }, {} as Record<string, SuggestionItem[]>);
    }

    private getSectionTitle(type: string): string {
        const titles: Record<string, string> = {
            link: '🔗 Smart Links',
            orphan: '🏝️ Isolated Notes',
            bridge: '🌉 Bridge Opportunities',
            cluster: '📑 Organization'
        };
        return titles[type] || type;
    }

    private getFileName(path: string): string {
        return path.split('/').pop()?.replace('.md', '') || path;
    }

    private generateClusterIndexContent(cluster: any): string {
        const nodeNames = cluster.nodes.map((nodePath: string) => {
            const fileName = this.getFileName(nodePath);
            return `- [[${fileName}]]`;
        }).join('\n');

        return `# ${cluster.name} - Index

This index was automatically generated by CLIPPY to help organize related notes.

## Related Notes
${nodeNames}

## Overview
This cluster contains ${cluster.nodes.length} related notes with ${(cluster.coherence * 100).toFixed(1)}% semantic coherence.

---
*Generated by CLIPPY AI Assistant*`;
    }

    // Orphan processing methods
    private async autoProcessOrphan(file: TFile, connections: any[]): Promise<void> {
        console.log('CLIPPY: Auto-processing orphan:', file.basename);
        let actions = 0;

        // Add all connections above 70%
        const bestConnections = connections.filter(conn => conn.similarity > 0.7);
        for (const connection of bestConnections) {
            await this.addLinkToNote(file, connection.suggestedLinkText);
            actions++;
        }

        // Add tags (simplified version for insights panel)
        const content = await this.app.vault.read(file);
        const existingTags = this.getExistingTags();
        const tagSuggestions = await this.generateTagSuggestions({
            file, title: file.basename, content, tags: [], incomingLinks: 0, outgoingLinks: 0,
            lastModified: file.stat.mtime, wordCount: 0, isolationScore: 0
        }, existingTags);

        const bestTags = tagSuggestions.filter(tag => tag.confidence > 0.7);
        for (const tag of bestTags) {
            await this.addTagToNote(file, tag.tag);
            actions++;
        }

        new Notice(`🚀 Auto-processed ${file.basename} (${actions} actions)`);
        this.forceRefreshAll(); // Refresh after processing
    }

    private async connectBestForOrphan(orphanData: OrphanDetailData): Promise<void> {
        const bestConnections = orphanData.connections.filter(conn => conn.similarity > 0.7);
        for (const connection of bestConnections) {
            await this.addLinkToNote(orphanData.file, connection.suggestedLinkText);
        }
        new Notice(`🔗 Added ${bestConnections.length} connection(s) to ${orphanData.file.basename}`);
        this.forceRefreshAll();
    }

    private async tagBestForOrphan(orphanData: OrphanDetailData): Promise<void> {
        const bestTags = orphanData.tagSuggestions.filter((tag: any) => tag.confidence > 0.7);
        for (const tag of bestTags) {
            await this.addTagToNote(orphanData.file, tag.tag);
        }
        new Notice(`🏷️ Added ${bestTags.length} tag(s) to ${orphanData.file.basename}`);
        this.forceRefreshAll();
    }

    private async addLinkToNote(file: TFile, linkText: string): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            let newContent = content.trim();
            if (newContent.length > 0) {
                newContent += '\n\n' + linkText;
            } else {
                newContent = linkText;
            }
            await this.app.vault.modify(file, newContent);
        } catch (error) {
            console.error('Error adding link:', error);
        }
    }

    private async addTagToNote(file: TFile, tag: string): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
            
            if (frontmatterMatch) {
                const frontmatterContent = frontmatterMatch[1];
                const remainingContent = content.substring(frontmatterMatch[0].length);
                const lines = frontmatterContent.split('\n');
                let tagsLineIndex = lines.findIndex(line => line.trim().startsWith('tags:'));
                
                if (tagsLineIndex >= 0) {
                    lines.splice(tagsLineIndex + 1, 0, `  - ${tag}`);
                } else {
                    lines.push(`tags:`);
                    lines.push(`  - ${tag}`);
                }
                
                const newFrontmatter = `---\n${lines.join('\n')}\n---\n`;
                const newContent = newFrontmatter + remainingContent;
                await this.app.vault.modify(file, newContent);
            } else {
                const frontmatter = `---\ntags:\n  - ${tag}\n---\n\n`;
                const newContent = frontmatter + content;
                await this.app.vault.modify(file, newContent);
            }
        } catch (error) {
            console.error('Error adding tag:', error);
        }
    }

    private getExistingTags(): string[] {
        const tags = new Set<string>();
        const files = this.app.vault.getMarkdownFiles();
        
        for (const file of files) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (metadata?.tags) {
                metadata.tags.forEach(tag => tags.add(tag.tag.replace('#', '')));
            }
            if (metadata?.frontmatter?.tags) {
                const frontmatterTags = metadata.frontmatter.tags;
                if (Array.isArray(frontmatterTags)) {
                    frontmatterTags.forEach(tag => tags.add(tag));
                }
            }
        }
        return Array.from(tags);
    }

    private async generateTagSuggestions(orphan: any, existingTags: string[]): Promise<any[]> {
        const suggestions: any[] = [];
        const words = orphan.content.toLowerCase()
            .split(/\W+/)
            .filter((word: string) => word.length > 3)
            .filter((word: string) => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'this', 'that', 'with', 'have', 'from', 'they', 'she', 'been', 'than', 'will', 'would', 'there', 'each', 'which', 'their', 'said'].includes(word));
        
        const wordFreq = new Map<string, number>();
        words.forEach((word: string) => wordFreq.set(word, (wordFreq.get(word) || 0) + 1));
        
        const topWords = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        
        // Check against existing tags
        for (const word of topWords) {
            for (const existingTag of existingTags) {
                const similarity = this.calculateStringSimilarity(word, existingTag);
                if (similarity > 0.7) {
                    suggestions.push({
                        tag: existingTag,
                        confidence: similarity,
                        reason: `Similar to keyword "${word}" (existing tag)`,
                        isExisting: true
                    });
                }
            }
        }
        
        // Add new tag suggestions
        for (const word of topWords.slice(0, 3)) {
            if (!suggestions.some(s => s.tag === word)) {
                suggestions.push({
                    tag: word,
                    confidence: Math.min(wordFreq.get(word)! / 5, 0.8),
                    reason: 'Common keyword in content',
                    isExisting: false
                });
            }
        }
        
        return suggestions.sort((a, b) => {
            if (a.isExisting !== b.isExisting) return a.isExisting ? -1 : 1;
            return b.confidence - a.confidence;
        }).slice(0, 5);
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}