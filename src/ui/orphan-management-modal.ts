import { Modal, App, TFile, Setting, ButtonComponent, Notice } from 'obsidian';
import { OrphanDetector } from '../discovery/orphan-detector';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';

interface OrphanNote {
    file: TFile;
    title: string;
    content: string;
    tags: string[];
    incomingLinks: number;
    outgoingLinks: number;
    lastModified: number;
    wordCount: number;
    isolationScore: number;
}

interface ConnectionSuggestion {
    target: string;
    similarity: number;
    sharedConcepts: string[];
    suggestedLinkText: string;
}

interface TagSuggestion {
    tag: string;
    confidence: number;
    reason: string;
    isExisting: boolean; // true if tag already exists in vault
}

interface OrphanWithSuggestions {
    orphan: OrphanNote;
    connections: ConnectionSuggestion[];
    tagSuggestions: TagSuggestion[];
    selected: boolean;
}

export class OrphanManagementModal extends Modal {
    private orphanDetector: OrphanDetector;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private orphansWithSuggestions: OrphanWithSuggestions[] = [];
    private isLoading = false;
    private selectAllState = false;
    private currentSortBy: 'priority' | 'alphabetical' | 'lastModified' = 'priority';

    constructor(
        app: App, 
        orphanDetector: OrphanDetector,
        embeddingManager: EmbeddingManager,
        similarityEngine: SimilarityEngine
    ) {
        super(app);
        this.orphanDetector = orphanDetector;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clippy-orphan-modal');

        // Header
        const header = contentEl.createEl('div', { cls: 'clippy-modal-header' });
        header.createEl('h2', { text: '🏝️ CLIPPY Orphan Management', cls: 'clippy-modal-title' });
        header.createEl('p', { 
            text: 'Discover isolated notes and connect them to your knowledge network',
            cls: 'clippy-modal-subtitle'
        });

        // Loading state
        const loadingEl = contentEl.createEl('div', { cls: 'clippy-loading-container' });
        loadingEl.createEl('div', { text: '🤖 Analyzing orphaned notes...', cls: 'clippy-loading-text' });
        
        // Load orphan data
        await this.loadOrphanData();
        
        // Remove loading and show content
        loadingEl.remove();
        this.renderOrphanList();
    }

    private async loadOrphanData(): Promise<void> {
        this.isLoading = true;
        
        try {
            // Get orphaned notes
            const orphans = await this.orphanDetector.findOrphanedNotes(false);
            
            // Get connection suggestions for each orphan
            const connectionOpportunities = await this.orphanDetector.suggestConnectionsForOrphans(orphans);
            
            // Get existing tags from vault for similarity matching
            const existingTags = this.getExistingTags();
            
            // Process each orphan
            this.orphansWithSuggestions = [];
            
            for (const orphan of orphans) {
                // Find connection suggestions for this orphan
                const connections = connectionOpportunities
                    .find(opp => opp.note === orphan.file.path)?.potentialConnections || [];
                
                // Generate tag suggestions
                const tagSuggestions = await this.generateTagSuggestions(orphan, existingTags);
                
                this.orphansWithSuggestions.push({
                    orphan,
                    connections,
                    tagSuggestions,
                    selected: false
                });
            }
            
            // Apply initial sorting
            this.sortOrphans();
            
        } catch (error) {
            console.error('Error loading orphan data:', error);
            new Notice('❌ Error analyzing orphaned notes');
        }
        
        this.isLoading = false;
    }

    private renderOrphanList(): void {
        const { contentEl } = this;
        
        if (this.orphansWithSuggestions.length === 0) {
            const emptyState = contentEl.createEl('div', { cls: 'clippy-empty-state' });
            emptyState.createEl('h3', { text: '🎉 No orphaned notes found!' });
            emptyState.createEl('p', { text: 'Your vault is well connected. All notes have links or backlinks.' });
            
            // Close button
            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('Close')
                    .onClick(() => this.close()));
            return;
        }

        // Stats header with sorting controls
        const statsEl = contentEl.createEl('div', { cls: 'clippy-stats-header' });
        
        const statsLeft = statsEl.createEl('div', { cls: 'clippy-stats-left' });
        statsLeft.createEl('span', { 
            text: `Found ${this.orphansWithSuggestions.length} orphaned notes`,
            cls: 'clippy-stats-text'
        });
        
        const statsRight = statsEl.createEl('div', { cls: 'clippy-stats-right' });
        statsRight.createEl('label', { text: 'Sort by:', cls: 'clippy-sort-label' });
        
        const sortSelect = statsRight.createEl('select', { cls: 'clippy-sort-select' });
        
        const priorityOption = sortSelect.createEl('option', { value: 'priority', text: 'Priority (Isolation Score)' });
        const alphabeticalOption = sortSelect.createEl('option', { value: 'alphabetical', text: 'Alphabetical' });
        const lastModifiedOption = sortSelect.createEl('option', { value: 'lastModified', text: 'Last Modified' });
        
        // Set current selection
        if (this.currentSortBy === 'priority') priorityOption.selected = true;
        else if (this.currentSortBy === 'alphabetical') alphabeticalOption.selected = true;
        else if (this.currentSortBy === 'lastModified') lastModifiedOption.selected = true;
        
        sortSelect.addEventListener('change', () => {
            this.currentSortBy = sortSelect.value as 'priority' | 'alphabetical' | 'lastModified';
            this.sortOrphans();
            this.updateOrphanList();
        });

        // Bulk actions header
        const actionsHeader = contentEl.createEl('div', { cls: 'clippy-actions-header' });
        
        // Select all checkbox
        const selectAllContainer = actionsHeader.createEl('div', { cls: 'clippy-select-all' });
        const selectAllCheckbox = selectAllContainer.createEl('input', { type: 'checkbox' });
        selectAllContainer.createEl('label', { text: 'Select All' });
        
        selectAllCheckbox.addEventListener('change', () => {
            this.selectAllState = selectAllCheckbox.checked;
            this.orphansWithSuggestions.forEach(item => item.selected = this.selectAllState);
            this.updateOrphanList();
        });

        // Bulk action buttons
        const bulkActions = actionsHeader.createEl('div', { cls: 'clippy-bulk-actions' });
        
        new ButtonComponent(bulkActions)
            .setButtonText('🔗 Connect Selected')
            .setTooltip('Add all connections above 70% confidence for selected notes')
            .onClick(() => this.connectSelectedOrphans());
            
        new ButtonComponent(bulkActions)
            .setButtonText('🏷️ Tag Selected')
            .setTooltip('Add all tags above 70% confidence for selected notes')
            .onClick(() => this.tagSelectedOrphans());
            
        new ButtonComponent(bulkActions)
            .setButtonText('🔄 Auto-Process Selected')
            .setTooltip('Add all high-confidence connections and tags for selected notes')
            .onClick(() => this.autoProcessSelected());

        // Orphan list container
        const listContainer = contentEl.createEl('div', { cls: 'clippy-orphan-list' });
        this.renderOrphanItems(listContainer);

        // Footer actions
        const footer = contentEl.createEl('div', { cls: 'clippy-modal-footer' });
        new ButtonComponent(footer)
            .setButtonText('Close')
            .onClick(() => this.close());
    }

    private renderOrphanItems(container: HTMLElement): void {
        container.empty();
        
        this.orphansWithSuggestions.forEach((item, index) => {
            const orphanEl = container.createEl('div', { cls: 'clippy-orphan-item' });
            
            // Selection checkbox
            const checkboxContainer = orphanEl.createEl('div', { cls: 'clippy-orphan-checkbox' });
            const checkbox = checkboxContainer.createEl('input', { type: 'checkbox' });
            checkbox.checked = item.selected;
            checkbox.addEventListener('change', () => {
                item.selected = checkbox.checked;
                this.updateSelectAllState();
            });

            // Main content
            const contentDiv = orphanEl.createEl('div', { cls: 'clippy-orphan-content' });
            
            // Title and basic info
            const headerDiv = contentDiv.createEl('div', { cls: 'clippy-orphan-header' });
            const titleEl = headerDiv.createEl('h3', { 
                text: item.orphan.title,
                cls: 'clippy-orphan-title'
            });
            titleEl.addEventListener('click', () => {
                this.app.workspace.openLinkText(item.orphan.file.path, '', false);
            });

            const metaDiv = headerDiv.createEl('div', { cls: 'clippy-orphan-meta' });
            metaDiv.createEl('span', { 
                text: `${item.orphan.wordCount} words`,
                cls: 'clippy-meta-item'
            });
            metaDiv.createEl('span', { 
                text: `Modified ${this.formatDate(item.orphan.lastModified)}`,
                cls: 'clippy-meta-item'
            });
            metaDiv.createEl('span', { 
                text: `Isolation: ${Math.round(item.orphan.isolationScore * 100)}%`,
                cls: 'clippy-meta-item clippy-isolation'
            });

            // Expandable sections
            this.createExpandableSection(contentDiv, '🔗 Connection Suggestions', 
                item.connections, (conn) => this.renderConnection(conn, item.orphan));
            
            this.createExpandableSection(contentDiv, '🏷️ Tag Suggestions', 
                item.tagSuggestions, (tag) => this.renderTagSuggestion(tag, item.orphan));

            // Quick actions
            const quickActions = contentDiv.createEl('div', { cls: 'clippy-quick-actions' });
            
            new ButtonComponent(quickActions)
                .setButtonText('🔗 Connect Best')
                .setTooltip('Add all connections above 70% confidence')
                .onClick(() => this.connectBestMatch(item));
                
            new ButtonComponent(quickActions)
                .setButtonText('🏷️ Tag Best')
                .setTooltip('Add all tags above 70% confidence')
                .onClick(() => this.tagBestMatches(item));
                
            new ButtonComponent(quickActions)
                .setButtonText('🚀 Auto-Process')
                .setTooltip('Add all high-confidence connections and tags (70%+)')
                .onClick(() => this.autoProcessSingle(item));
        });
    }

    private createExpandableSection<T>(
        parent: HTMLElement, 
        title: string, 
        items: T[], 
        renderItem: (item: T) => HTMLElement
    ): void {
        if (items.length === 0) return;

        const section = parent.createEl('div', { cls: 'clippy-expandable-section' });
        
        const header = section.createEl('div', { cls: 'clippy-section-header' });
        const toggle = header.createEl('span', { cls: 'clippy-toggle' });
        toggle.textContent = '▶';
        header.createEl('span', { text: `${title} (${items.length})` });
        
        const content = section.createEl('div', { cls: 'clippy-section-content' });
        content.style.display = 'none';
        
        // Toggle functionality
        header.addEventListener('click', () => {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            toggle.textContent = isVisible ? '▶' : '▼';
        });
        
        // Render items
        items.slice(0, 5).forEach(item => { // Limit to top 5
            content.appendChild(renderItem(item));
        });
    }

    private renderConnection(connection: ConnectionSuggestion, orphan: OrphanNote): HTMLElement {
        const connEl = document.createElement('div');
        connEl.className = 'clippy-connection-item';
        
        const infoDiv = connEl.createEl('div', { cls: 'clippy-connection-info' });
        infoDiv.createEl('div', { 
            text: this.getFileName(connection.target),
            cls: 'clippy-connection-target'
        });
        infoDiv.createEl('div', { 
            text: `${Math.round(connection.similarity * 100)}% similarity`,
            cls: 'clippy-connection-similarity'
        });
        
        if (connection.sharedConcepts.length > 0) {
            infoDiv.createEl('div', { 
                text: `Shared: ${connection.sharedConcepts.slice(0, 3).join(', ')}`,
                cls: 'clippy-shared-concepts'
            });
        }
        
        const actionBtn = connEl.createEl('button', { 
            text: '+ Add Link',
            cls: 'clippy-connection-action'
        });
        actionBtn.addEventListener('click', () => {
            this.addLinkToNote(orphan.file, connection.suggestedLinkText);
        });
        
        return connEl;
    }

    private renderTagSuggestion(tagSuggestion: TagSuggestion, orphan: OrphanNote): HTMLElement {
        const tagEl = document.createElement('div');
        tagEl.className = 'clippy-tag-item';
        
        const infoDiv = tagEl.createEl('div', { cls: 'clippy-tag-info' });
        const tagName = infoDiv.createEl('span', { 
            text: `#${tagSuggestion.tag}`,
            cls: 'clippy-tag-name'
        });
        
        if (tagSuggestion.isExisting) {
            tagName.addClass('clippy-existing-tag');
            tagName.title = 'Existing tag in vault';
        }
        
        infoDiv.createEl('span', { 
            text: `${Math.round(tagSuggestion.confidence * 100)}%`,
            cls: 'clippy-tag-confidence'
        });
        infoDiv.createEl('div', { 
            text: tagSuggestion.reason,
            cls: 'clippy-tag-reason'
        });
        
        const actionBtn = tagEl.createEl('button', { 
            text: '+ Add Tag',
            cls: 'clippy-tag-action'
        });
        actionBtn.addEventListener('click', () => {
            this.addTagToNote(orphan.file, tagSuggestion.tag);
        });
        
        return tagEl;
    }

    // Action handlers
    private async connectSelectedOrphans(): Promise<void> {
        const selected = this.orphansWithSuggestions.filter(item => item.selected);
        if (selected.length === 0) {
            new Notice('No orphans selected');
            return;
        }

        let linkCount = 0;
        for (const item of selected) {
            const bestConnections = item.connections
                .filter(conn => conn.similarity > 0.7); // All connections above 70%
            
            for (const connection of bestConnections) {
                await this.addLinkToNote(item.orphan.file, connection.suggestedLinkText);
                linkCount++;
            }
        }
        
        new Notice(`✅ Added ${linkCount} links to orphaned notes`);
        this.refreshData();
    }

    private async tagSelectedOrphans(): Promise<void> {
        const selected = this.orphansWithSuggestions.filter(item => item.selected);
        if (selected.length === 0) {
            new Notice('No orphans selected');
            return;
        }

        let tagCount = 0;
        for (const item of selected) {
            const bestTags = item.tagSuggestions
                .filter(tag => tag.confidence > 0.7); // All tags above 70%
            
            for (const tag of bestTags) {
                await this.addTagToNote(item.orphan.file, tag.tag);
                tagCount++;
            }
        }
        
        new Notice(`✅ Added ${tagCount} tags to orphaned notes`);
        this.refreshData();
    }

    private async autoProcessSelected(): Promise<void> {
        const selected = this.orphansWithSuggestions.filter(item => item.selected);
        if (selected.length === 0) {
            new Notice('No orphans selected');
            return;
        }

        for (const item of selected) {
            await this.autoProcessSingle(item, false); // Silent mode
        }
        
        new Notice(`🚀 Auto-processed ${selected.length} orphaned notes`);
        this.refreshData();
    }

    private async connectBestMatch(item: OrphanWithSuggestions): Promise<void> {
        const bestConnections = item.connections
            .filter(conn => conn.similarity > 0.7); // All connections above 70%
        
        if (bestConnections.length > 0) {
            for (const connection of bestConnections) {
                await this.addLinkToNote(item.orphan.file, connection.suggestedLinkText);
            }
            new Notice(`✅ Added ${bestConnections.length} connection(s) to ${item.orphan.title}`);
            this.refreshData();
        } else {
            new Notice(`No high-confidence connections found for ${item.orphan.title}`);
        }
    }

    private async tagBestMatches(item: OrphanWithSuggestions): Promise<void> {
        const bestTags = item.tagSuggestions
            .filter(tag => tag.confidence > 0.7); // All tags above 70%
        
        if (bestTags.length > 0) {
            for (const tag of bestTags) {
                await this.addTagToNote(item.orphan.file, tag.tag);
            }
            new Notice(`✅ Added ${bestTags.length} tag(s) to ${item.orphan.title}`);
            this.refreshData();
        } else {
            new Notice(`No high-confidence tags found for ${item.orphan.title}`);
        }
    }

    private async autoProcessSingle(item: OrphanWithSuggestions, showNotice = true): Promise<void> {
        let actions = 0;
        
        // Add all connections above 70%
        const bestConnections = item.connections
            .filter(conn => conn.similarity > 0.7);
        
        for (const connection of bestConnections) {
            await this.addLinkToNote(item.orphan.file, connection.suggestedLinkText);
            actions++;
        }
        
        // Add all tags above 70%
        const bestTags = item.tagSuggestions
            .filter(tag => tag.confidence > 0.7);
        
        for (const tag of bestTags) {
            await this.addTagToNote(item.orphan.file, tag.tag);
            actions++;
        }
        
        if (showNotice) {
            new Notice(`🚀 Auto-processed ${item.orphan.title} (${actions} actions)`);
            this.refreshData();
        }
    }

    /**
     * Sort orphans based on current sort criteria.
     */
    private sortOrphans(): void {
        switch (this.currentSortBy) {
            case 'priority':
                // Sort by isolation score (highest first), then word count
                this.orphansWithSuggestions.sort((a, b) => {
                    if (a.orphan.isolationScore !== b.orphan.isolationScore) {
                        return b.orphan.isolationScore - a.orphan.isolationScore;
                    }
                    return b.orphan.wordCount - a.orphan.wordCount;
                });
                break;
                
            case 'alphabetical':
                // Sort alphabetically by title
                this.orphansWithSuggestions.sort((a, b) => {
                    return a.orphan.title.localeCompare(b.orphan.title, undefined, { 
                        numeric: true, 
                        sensitivity: 'base' 
                    });
                });
                break;
                
            case 'lastModified':
                // Sort by last modified date (newest first)
                this.orphansWithSuggestions.sort((a, b) => {
                    return b.orphan.lastModified - a.orphan.lastModified;
                });
                break;
        }
    }

    // Utility methods
    private async addLinkToNote(file: TFile, linkText: string): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            
            // Add link to the end of the file with proper spacing
            let newContent = content.trim();
            if (newContent.length > 0) {
                newContent += '\n\n' + linkText;
            } else {
                newContent = linkText;
            }
            
            await this.app.vault.modify(file, newContent);
        } catch (error) {
            console.error('Error adding link:', error);
            new Notice(`❌ Failed to add link to ${file.basename}`);
        }
    }

    private async addTagToNote(file: TFile, tag: string): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);
            
            // Check if tag already exists
            const existingTags = metadata?.frontmatter?.tags || [];
            const allTags = [...existingTags, ...(metadata?.tags?.map(t => t.tag.replace('#', '')) || [])];
            
            if (allTags.includes(tag)) {
                console.log(`Tag #${tag} already exists in ${file.basename}`);
                return; // Don't add duplicate tags
            }
            
            // Check if note has frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
            
            if (frontmatterMatch) {
                // Add to existing frontmatter
                const frontmatterContent = frontmatterMatch[1];
                const remainingContent = content.substring(frontmatterMatch[0].length);
                
                const lines = frontmatterContent.split('\n');
                let tagsLineIndex = lines.findIndex(line => line.trim().startsWith('tags:'));
                
                if (tagsLineIndex >= 0) {
                    // Check existing tags in frontmatter to avoid duplicates
                    const existingTagLines = [];
                    let i = tagsLineIndex + 1;
                    while (i < lines.length && (lines[i].startsWith('  - ') || lines[i].startsWith('    '))) {
                        existingTagLines.push(lines[i].trim().replace(/^- /, ''));
                        i++;
                    }
                    
                    if (!existingTagLines.includes(tag)) {
                        lines.splice(tagsLineIndex + 1, 0, `  - ${tag}`);
                    } else {
                        return; // Tag already exists
                    }
                } else {
                    // Add new tags section
                    lines.push(`tags:`);
                    lines.push(`  - ${tag}`);
                }
                
                const newFrontmatter = `---\n${lines.join('\n')}\n---\n`;
                const newContent = newFrontmatter + remainingContent;
                await this.app.vault.modify(file, newContent);
            } else {
                // Create new frontmatter at the beginning
                const frontmatter = `---\ntags:\n  - ${tag}\n---\n\n`;
                const newContent = frontmatter + content;
                await this.app.vault.modify(file, newContent);
            }
        } catch (error) {
            console.error('Error adding tag:', error);
            new Notice(`❌ Failed to add tag to ${file.basename}`);
        }
    }

    private async generateTagSuggestions(orphan: OrphanNote, existingTags: string[]): Promise<TagSuggestion[]> {
        const suggestions: TagSuggestion[] = [];
        
        // Analyze content for keyword-based tags
        const words = orphan.content.toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 3)
            .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'this', 'that', 'with', 'have', 'from', 'they', 'she', 'been', 'than', 'will', 'would', 'there', 'each', 'which', 'their', 'said', 'if', 'do', 'into', 'has', 'more', 'go', 'no', 'so', 'can', 'get', 'all', 'would', 'my', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their'].includes(word));
        
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        
        // Get top keywords
        const topWords = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
        
        // Check against existing tags (high similarity preference)
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
        
        // Add new tag suggestions based on content
        for (const word of topWords.slice(0, 5)) {
            if (!suggestions.some(s => s.tag === word)) {
                suggestions.push({
                    tag: word,
                    confidence: Math.min(wordFreq.get(word)! / 10, 0.8),
                    reason: `Common keyword in content`,
                    isExisting: false
                });
            }
        }
        
        // Add contextual tags based on file path
        const pathParts = orphan.file.path.split('/');
        for (const part of pathParts) {
            if (part !== orphan.file.name && part.length > 2) {
                const normalizedPart = part.toLowerCase().replace(/[^a-z0-9]/g, '-');
                if (!suggestions.some(s => s.tag === normalizedPart)) {
                    suggestions.push({
                        tag: normalizedPart,
                        confidence: 0.6,
                        reason: `Based on file location: ${part}`,
                        isExisting: existingTags.includes(normalizedPart)
                    });
                }
            }
        }
        
        return suggestions
            .sort((a, b) => {
                // Prioritize existing tags, then by confidence
                if (a.isExisting !== b.isExisting) {
                    return a.isExisting ? -1 : 1;
                }
                return b.confidence - a.confidence;
            })
            .slice(0, 8); // Top 8 suggestions
    }

    private getExistingTags(): string[] {
        const tags = new Set<string>();
        const files = this.app.vault.getMarkdownFiles();
        
        for (const file of files) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (metadata?.tags) {
                metadata.tags.forEach(tag => {
                    tags.add(tag.tag.replace('#', ''));
                });
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

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
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

    private updateOrphanList(): void {
        const listContainer = this.contentEl.querySelector('.clippy-orphan-list') as HTMLElement;
        if (listContainer) {
            this.renderOrphanItems(listContainer);
        }
    }

    private updateSelectAllState(): void {
        const selectAllCheckbox = this.contentEl.querySelector('.clippy-select-all input') as HTMLInputElement;
        if (selectAllCheckbox) {
            const selectedCount = this.orphansWithSuggestions.filter(item => item.selected).length;
            const totalCount = this.orphansWithSuggestions.length;
            
            selectAllCheckbox.checked = selectedCount === totalCount;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        }
    }

    private async refreshData(): Promise<void> {
        await this.loadOrphanData();
        this.updateOrphanList();
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    private getFileName(path: string): string {
        return path.split('/').pop()?.replace('.md', '') || path;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}