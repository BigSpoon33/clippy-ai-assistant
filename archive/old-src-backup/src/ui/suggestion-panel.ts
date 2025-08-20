import { Component, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import { LinkSuggestionEngine } from '../link-suggestions/suggestion-engine';
import { KnowledgeGraphManager } from '../knowledge-graph/graph-manager';
import { OrphanDetector } from '../discovery/orphan-detector';

interface SuggestionItem {
    type: 'link' | 'orphan' | 'bridge' | 'cluster';
    title: string;
    description: string;
    action: () => void;
    confidence: number;
    icon: string;
}

export class SuggestionPanel extends Component {
    private containerEl: HTMLElement;
    private suggestionEngine: LinkSuggestionEngine;
    private graphManager: KnowledgeGraphManager;
    private orphanDetector: OrphanDetector;
    private currentFile: TFile | null = null;
    private refreshDebounceTimer: number | null = null;

    constructor(
        containerEl: HTMLElement,
        suggestionEngine: LinkSuggestionEngine,
        graphManager: KnowledgeGraphManager,
        orphanDetector: OrphanDetector
    ) {
        super();
        this.containerEl = containerEl;
        this.suggestionEngine = suggestionEngine;
        this.graphManager = graphManager;
        this.orphanDetector = orphanDetector;
    }

    onload() {
        this.render();
        this.registerEventListeners();
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
        refreshBtn.addEventListener('click', () => this.refreshSuggestions());

        // Suggestions container
        const suggestionsContainer = this.containerEl.createEl('div', { cls: 'clippy-suggestions-container' });
        
        // Loading state
        this.showLoadingState(suggestionsContainer);
        
        // Load initial suggestions
        this.refreshSuggestions();
    }

    /**
     * Register event listeners for real-time updates.
     */
    private registerEventListeners(): void {
        // Listen for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
                if (leaf?.view instanceof MarkdownView) {
                    this.currentFile = leaf.view.file;
                    this.debouncedRefresh();
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
     * Refresh suggestions based on current context.
     */
    private async refreshSuggestions(): Promise<void> {
        const container = this.containerEl.querySelector('.clippy-suggestions-container') as HTMLElement;
        if (!container) return;

        this.showLoadingState(container);

        try {
            const suggestions = await this.generateSuggestions();
            this.renderSuggestions(container, suggestions);
        } catch (error) {
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

        // 2. Orphan detection suggestions
        const orphanSuggestions = await this.generateOrphanSuggestions();
        suggestions.push(...orphanSuggestions.slice(0, 3)); // Top 3

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
        const suggestions = await this.suggestionEngine.getSuggestionsForContext(
            content, 
            this.currentFile.path, 
            'typing'
        );

        return suggestions.slice(0, 3).map(suggestion => ({
            type: 'link' as const,
            title: `Link to ${suggestion.targetNote}`,
            description: `${suggestion.confidence.toFixed(1)}% match - ${suggestion.reasoning}`,
            confidence: suggestion.confidence,
            icon: '🔗',
            action: () => this.insertLink(suggestion.targetNote, suggestion.suggestedText)
        }));
    }

    /**
     * Generate orphan detection suggestions.
     */
    private async generateOrphanSuggestions(): Promise<SuggestionItem[]> {
        const orphans = await this.orphanDetector.findOrphanedNotes(false);
        const connectionOpportunities = await this.orphanDetector.suggestConnectionsForOrphans(orphans);

        return connectionOpportunities.slice(0, 3).map(opportunity => {
            const orphanFile = this.app.vault.getAbstractFileByPath(opportunity.note) as TFile;
            const topConnection = opportunity.potentialConnections[0];
            
            return {
                type: 'orphan' as const,
                title: `Connect ${orphanFile?.basename || 'orphaned note'}`,
                description: `${opportunity.potentialConnections.length} potential connections found`,
                confidence: topConnection?.similarity * 100 || 0,
                icon: '🏝️',
                action: () => this.showOrphanConnections(opportunity)
            };
        });
    }

    /**
     * Generate bridge suggestions.
     */
    private async generateBridgeSuggestions(): Promise<SuggestionItem[]> {
        const bridges = await this.orphanDetector.findBridgeOpportunities();

        return bridges.slice(0, 2).map(bridge => ({
            type: 'bridge' as const,
            title: `Bridge connection opportunity`,
            description: `Connect ${this.getFileName(bridge.sourceNote)} ↔ ${this.getFileName(bridge.targetNote)}`,
            confidence: bridge.pathStrength * 100,
            icon: '🌉',
            action: () => this.showBridgeOpportunity(bridge)
        }));
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
        item.addEventListener('click', suggestion.action);

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
    private async insertLink(targetNote: string, suggestedText: string): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        editor.replaceRange(suggestedText, cursor);
    }

    private showOrphanConnections(opportunity: any): void {
        // Open modal or side panel showing connection details
        console.log('Show orphan connections:', opportunity);
    }

    private showBridgeOpportunity(bridge: any): void {
        // Open modal showing bridge suggestion details
        console.log('Show bridge opportunity:', bridge);
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
        const titles = {
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
}