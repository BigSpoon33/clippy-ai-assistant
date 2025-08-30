/**
 * CLIPPY AI Assistant - Unified Tag Modal
 * 
 * Consolidated modal for AI-powered tag suggestions and selection.
 * Replaces both TaggingModal and TagSuggestionModal with unified interface.
 */

import { Modal, App, ButtonComponent, Notice } from 'obsidian';
import { TagSuggestion } from '../processors/auto-tagger';
import { TagGenerationResult } from '../services/tag-manager';

export interface TagModalOptions {
    title?: string;
    description?: string;
    maxPreviewLength?: number;
    autoGenerate?: boolean;
    showPreview?: boolean;
    showFilters?: boolean;
}

export class TagModal extends Modal {
    private content: string;
    private tagGenerationResult: TagGenerationResult | null = null;
    private selectedTags: Set<string> = new Set();
    private onAccept: (selectedTags: string[]) => void;
    private generateTags: (content: string) => Promise<TagGenerationResult>;
    private options: TagModalOptions;

    // UI Elements
    private suggestionsListEl: HTMLElement;
    private selectedTagsEl: HTMLElement;
    private filterButtonsEl: HTMLElement;
    private currentFilter: string | null = null;
    private filteredSuggestions: TagSuggestion[] = [];

    constructor(
        app: App,
        content: string,
        onAccept: (selectedTags: string[]) => void,
        generateTags: (content: string) => Promise<TagGenerationResult>,
        options: TagModalOptions = {}
    ) {
        super(app);
        this.content = content;
        this.onAccept = onAccept;
        this.generateTags = generateTags;
        this.options = {
            title: '🏷️ CLIPPY Smart Tagging',
            description: 'AI-powered tag suggestions based on content analysis and vault patterns.',
            maxPreviewLength: 300,
            autoGenerate: true,
            showPreview: true,
            showFilters: true,
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clippy-tag-modal');
        
        // Header
        contentEl.createEl('h2', { text: this.options.title });
        
        if (this.options.description) {
            contentEl.createEl('p', { 
                text: this.options.description,
                cls: 'clippy-modal-description'
            });
        }

        // Content preview (optional)
        if (this.options.showPreview) {
            this.createContentPreview();
        }

        // Filter buttons (optional)
        if (this.options.showFilters) {
            this.createFilterSection();
        }

        // Suggestions section
        this.createSuggestionsSection();

        // Selected tags preview
        this.createSelectedTagsSection();

        // Action buttons
        this.createActionButtons();

        // Auto-generate on open
        if (this.options.autoGenerate) {
            setTimeout(() => {
                this.generateTagSuggestions();
            }, 100);
        }
    }

    private createContentPreview(): void {
        const { contentEl } = this;
        
        const previewSection = contentEl.createDiv('clippy-content-preview-section');
        previewSection.createEl('h3', { text: 'Content Preview:' });
        
        const previewDiv = previewSection.createDiv('clippy-content-preview');
        const truncatedContent = this.content.length > this.options.maxPreviewLength! 
            ? this.content.substring(0, this.options.maxPreviewLength!) + '...'
            : this.content;
        
        previewDiv.createEl('pre', { text: truncatedContent });
    }

    private createFilterSection(): void {
        const { contentEl } = this;
        
        const filterSection = contentEl.createDiv('clippy-filter-section');
        filterSection.createEl('h3', { text: 'Filter by Source:' });
        
        this.filterButtonsEl = filterSection.createDiv('clippy-filter-buttons');
        // Filter buttons will be created after suggestions are loaded
    }

    private createSuggestionsSection(): void {
        const { contentEl } = this;
        
        const suggestionsSection = contentEl.createDiv('clippy-suggestions-section');
        suggestionsSection.createEl('h3', { text: 'AI Suggested Tags:' });
        
        this.suggestionsListEl = suggestionsSection.createDiv('clippy-suggestions-list');
        this.showLoadingState();
    }

    private createSelectedTagsSection(): void {
        const { contentEl } = this;
        
        const selectedSection = contentEl.createDiv('clippy-selected-section');
        selectedSection.createEl('h3', { text: 'Selected Tags:' });
        
        this.selectedTagsEl = selectedSection.createDiv('clippy-selected-tags');
        this.updateSelectedTagsPreview();
    }

    private createActionButtons(): void {
        const { contentEl } = this;
        
        const buttonContainer = contentEl.createDiv('clippy-action-buttons');

        // Generate/Regenerate button
        const generateBtn = new ButtonComponent(buttonContainer)
            .setButtonText('🧠 Generate Tag Suggestions')
            .setCta()
            .onClick(() => this.generateTagSuggestions());

        // Select high confidence button
        const selectHighBtn = new ButtonComponent(buttonContainer)
            .setButtonText('✨ Select High Confidence')
            .setTooltip('Select all suggestions with confidence > 70%')
            .setDisabled(true)
            .onClick(() => this.selectHighConfidenceTags());

        // Clear selection button
        const clearBtn = new ButtonComponent(buttonContainer)
            .setButtonText('🗑️ Clear Selection')
            .setDisabled(true)
            .onClick(() => this.clearSelection());

        // Add tags button
        const addBtn = new ButtonComponent(buttonContainer)
            .setButtonText('✅ Add Selected Tags')
            .setDisabled(true)
            .onClick(() => this.addSelectedTags());

        // Cancel button
        new ButtonComponent(buttonContainer)
            .setButtonText('❌ Cancel')
            .onClick(() => this.close());

        // Store button references for later use
        this.generateBtn = generateBtn;
        this.selectHighBtn = selectHighBtn;
        this.clearBtn = clearBtn;
        this.addBtn = addBtn;
    }

    // Button references
    private generateBtn: ButtonComponent;
    private selectHighBtn: ButtonComponent;
    private clearBtn: ButtonComponent;
    private addBtn: ButtonComponent;

    private showLoadingState(): void {
        this.suggestionsListEl.empty();
        const loadingDiv = this.suggestionsListEl.createDiv('clippy-loading');
        loadingDiv.innerHTML = '🤔 Analyzing content for intelligent tag suggestions...';
    }

    private async generateTagSuggestions(): Promise<void> {
        this.generateBtn.setDisabled(true);
        this.generateBtn.setButtonText('🤔 Analyzing...');
        this.showLoadingState();

        try {
            this.tagGenerationResult = await this.generateTags(this.content);
            this.filteredSuggestions = this.tagGenerationResult.suggestions;
            
            this.createFilterButtons();
            this.renderSuggestions(this.filteredSuggestions);
            this.enableActionButtons();
            
            this.generateBtn.setButtonText('🔄 Regenerate');
        } catch (error) {
            this.showErrorState(error);
            this.generateBtn.setButtonText('🧠 Try Again');
        } finally {
            this.generateBtn.setDisabled(false);
        }
    }

    private createFilterButtons(): void {
        if (!this.tagGenerationResult || !this.options.showFilters) return;

        this.filterButtonsEl.empty();

        const sources = [...new Set(this.tagGenerationResult.suggestions.map(s => s.source))];

        // All button
        const allBtn = this.filterButtonsEl.createEl('button', {
            text: 'All',
            cls: 'clippy-filter-btn active'
        });
        
        allBtn.addEventListener('click', () => {
            this.applyFilter(null);
            this.updateFilterButtons(allBtn);
        });

        // Source-specific buttons
        sources.forEach(source => {
            const btn = this.filterButtonsEl.createEl('button', {
                text: this.getSourceDisplayName(source),
                cls: 'clippy-filter-btn'
            });
            
            btn.addEventListener('click', () => {
                this.applyFilter(source);
                this.updateFilterButtons(btn);
            });
        });
    }

    private renderSuggestions(suggestions: TagSuggestion[]): void {
        this.suggestionsListEl.empty();
        
        if (suggestions.length === 0) {
            this.suggestionsListEl.createEl('p', { 
                text: this.currentFilter ? 'No suggestions for this filter.' : 'No tag suggestions found.',
                cls: 'clippy-no-suggestions'
            });
            return;
        }

        suggestions.forEach(suggestion => {
            const item = this.suggestionsListEl.createDiv('clippy-suggestion-item');
            
            // Checkbox
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                cls: 'clippy-suggestion-checkbox'
            });
            
            checkbox.checked = this.selectedTags.has(suggestion.tag);
            checkbox.addEventListener('change', () => {
                this.toggleTagSelection(suggestion.tag, checkbox.checked);
            });

            // Tag info container
            const infoContainer = item.createDiv('clippy-suggestion-info');
            
            // Tag header (name + confidence)
            const tagHeader = infoContainer.createDiv('clippy-tag-header');
            
            const tagName = tagHeader.createEl('span', {
                text: `#${suggestion.tag}`,
                cls: 'clippy-tag-name'
            });
            
            // Confidence badge
            const confidence = Math.round(suggestion.confidence * 100);
            const confidenceEl = tagHeader.createEl('span', {
                text: `${confidence}%`,
                cls: `clippy-confidence clippy-confidence-${this.getConfidenceClass(confidence)}`
            });

            // Tag details (source, reason, category)
            const details = infoContainer.createDiv('clippy-tag-details');
            
            details.createEl('span', {
                text: `Source: ${this.getSourceDisplayName(suggestion.source)}`,
                cls: 'clippy-source'
            });
            
            if (suggestion.reason) {
                details.createEl('span', {
                    text: suggestion.reason,
                    cls: 'clippy-reason'
                });
            }

            if (suggestion.category) {
                details.createEl('span', {
                    text: `Category: ${suggestion.category}`,
                    cls: 'clippy-category'
                });
            }
        });
    }

    private showErrorState(error: any): void {
        this.suggestionsListEl.empty();
        this.suggestionsListEl.createEl('p', { 
            text: `Error generating suggestions: ${error.message}`, 
            cls: 'clippy-error' 
        });
    }

    private updateSelectedTagsPreview(): void {
        this.selectedTagsEl.empty();
        
        if (this.selectedTags.size === 0) {
            this.selectedTagsEl.createEl('span', {
                text: 'No tags selected',
                cls: 'clippy-no-selection'
            });
            return;
        }

        Array.from(this.selectedTags).forEach(tag => {
            const tagEl = this.selectedTagsEl.createEl('span', {
                text: `#${tag}`,
                cls: 'clippy-selected-tag'
            });
            
            // Remove button
            const removeBtn = tagEl.createEl('button', {
                text: '×',
                cls: 'clippy-remove-tag'
            });
            
            removeBtn.addEventListener('click', () => {
                this.toggleTagSelection(tag, false);
                this.updateCheckboxStates();
            });
        });
    }

    private toggleTagSelection(tag: string, selected: boolean): void {
        if (selected) {
            this.selectedTags.add(tag);
        } else {
            this.selectedTags.delete(tag);
        }
        
        this.updateSelectedTagsPreview();
        this.updateActionButtonStates();
    }

    private updateCheckboxStates(): void {
        const checkboxes = this.suggestionsListEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, index) => {
            const suggestion = this.filteredSuggestions[index];
            if (suggestion) {
                (cb as HTMLInputElement).checked = this.selectedTags.has(suggestion.tag);
            }
        });
    }

    private selectHighConfidenceTags(): void {
        this.filteredSuggestions
            .filter(s => s.confidence > 0.7)
            .forEach(s => this.selectedTags.add(s.tag));
        
        this.updateSelectedTagsPreview();
        this.updateCheckboxStates();
        this.updateActionButtonStates();
    }

    private clearSelection(): void {
        this.selectedTags.clear();
        this.updateSelectedTagsPreview();
        this.updateCheckboxStates();
        this.updateActionButtonStates();
    }

    private addSelectedTags(): void {
        if (this.selectedTags.size === 0) {
            new Notice('No tags selected!');
            return;
        }

        this.onAccept(Array.from(this.selectedTags));
        this.close();
    }

    private applyFilter(source: string | null): void {
        this.currentFilter = source;
        
        if (source === null) {
            this.filteredSuggestions = this.tagGenerationResult?.suggestions || [];
        } else {
            this.filteredSuggestions = (this.tagGenerationResult?.suggestions || [])
                .filter(s => s.source === source);
        }
        
        this.renderSuggestions(this.filteredSuggestions);
        this.updateCheckboxStates();
    }

    private updateFilterButtons(activeBtn: HTMLElement): void {
        this.filterButtonsEl.querySelectorAll('.clippy-filter-btn').forEach(btn => {
            btn.removeClass('active');
        });
        activeBtn.addClass('active');
    }

    private enableActionButtons(): void {
        this.selectHighBtn.setDisabled(false);
        this.updateActionButtonStates();
    }

    private updateActionButtonStates(): void {
        const hasSelection = this.selectedTags.size > 0;
        this.clearBtn.setDisabled(!hasSelection);
        this.addBtn.setDisabled(!hasSelection);
    }

    private getSourceDisplayName(source: string): string {
        const displayNames: Record<string, string> = {
            'ai': '🤖 AI Analysis',
            'pattern': '📊 Vault Patterns',
            'keyword': '🔍 Keyword Match',
            'similar': '🔗 Similar Content'
        };
        
        return displayNames[source] || source;
    }

    private getConfidenceClass(confidence: number): string {
        if (confidence >= 80) return 'high';
        if (confidence >= 60) return 'medium';
        return 'low';
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

/**
 * Quick tag picker for command palette usage
 */
export class TagPickerModal extends Modal {
    private availableTags: string[];
    private onSelect: (tag: string) => void;
    private filterInput: HTMLInputElement;

    constructor(app: App, availableTags: string[], onSelect: (tag: string) => void) {
        super(app);
        this.availableTags = availableTags;
        this.onSelect = onSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clippy-tag-picker-modal');

        // Header
        contentEl.createEl('h2', { text: 'Quick Tag Selection' });

        // Filter input
        this.filterInput = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Type to filter tags...',
            cls: 'clippy-tag-filter'
        });

        // Tags list
        const tagsList = contentEl.createDiv('clippy-tags-list');

        // Render initial tags
        this.renderTagsList(tagsList, this.availableTags);

        // Filter functionality
        this.filterInput.addEventListener('input', () => {
            const filter = this.filterInput.value.toLowerCase();
            const filtered = this.availableTags.filter(tag => 
                tag.toLowerCase().includes(filter)
            );
            this.renderTagsList(tagsList, filtered);
        });

        // Focus filter input
        this.filterInput.focus();

        // Keyboard navigation
        this.setupKeyboardNavigation(tagsList);
    }

    private renderTagsList(container: HTMLElement, tags: string[]): void {
        container.empty();

        if (tags.length === 0) {
            container.createEl('p', { text: 'No tags found', cls: 'clippy-no-tags' });
            return;
        }

        tags.slice(0, 20).forEach((tag, index) => {
            const tagEl = container.createEl('div', {
                text: `#${tag}`,
                cls: 'clippy-tag-item'
            });

            tagEl.tabIndex = 0;
            
            const selectTag = () => {
                this.onSelect(tag);
                this.close();
            };

            tagEl.addEventListener('click', selectTag);
            tagEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    selectTag();
                }
            });
        });
    }

    private setupKeyboardNavigation(tagsList: HTMLElement): void {
        this.filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const firstTag = tagsList.querySelector('.clippy-tag-item') as HTMLElement;
                firstTag?.focus();
            }
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}