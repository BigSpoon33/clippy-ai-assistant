/**
 * Modal for reviewing and applying intelligent backlink suggestions
 */

import { App, Modal, Setting, Notice, TFile, ButtonComponent } from 'obsidian';
import { BacklinkSuggestion, IntelligentBacklinkSystem } from '../features/knowledge-management/backlinking/intelligent-backlink-system';

export class BacklinkSuggestionsModal extends Modal {
    private backlinkSystem: IntelligentBacklinkSystem;
    private suggestions: BacklinkSuggestion[] = [];
    private selectedSuggestions = new Set<number>();

    constructor(app: App, backlinkSystem: IntelligentBacklinkSystem) {
        super(app);
        this.backlinkSystem = backlinkSystem;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Modal header
        contentEl.createEl('h2', { text: '🔗 Intelligent Backlink Suggestions' });
        
        const description = contentEl.createEl('p');
        description.innerHTML = `
            High-confidence link suggestions based on semantic similarity, 
            shared concepts, and explicit mentions. Only meaningful connections are shown.
        `;

        // Loading state
        const loadingEl = contentEl.createEl('div', { 
            text: '🔍 Analyzing vault for intelligent link opportunities...', 
            cls: 'backlink-loading' 
        });

        try {
            // Generate suggestions focusing on orphaned notes first
            this.suggestions = await this.backlinkSystem.generateBacklinkSuggestions(undefined, {
                focusOn: 'orphans',
                minConfidence: 0.7,
                maxSuggestionsPerFile: 3
            });

            loadingEl.remove();
            this.renderSuggestions();
        } catch (error) {
            loadingEl.setText(`❌ Error generating suggestions: ${error.message}`);
            console.error('Backlink suggestion error:', error);
        }
    }

    private renderSuggestions() {
        const { contentEl } = this;

        if (this.suggestions.length === 0) {
            contentEl.createEl('div', { 
                text: '✨ No high-confidence backlink opportunities found. Your vault linking looks good!',
                cls: 'backlink-empty-state'
            });
            return;
        }

        // Summary stats
        const statsEl = contentEl.createEl('div', { cls: 'backlink-stats' });
        statsEl.innerHTML = `
            <strong>${this.suggestions.length} intelligent suggestions found</strong><br>
            <span style="color: var(--text-muted); font-size: 0.9em;">
                Focus: Files with few connections • Min confidence: 70%
            </span>
        `;

        // Select all controls
        const controlsEl = contentEl.createEl('div', { cls: 'backlink-controls' });
        
        new ButtonComponent(controlsEl)
            .setButtonText('Select All')
            .onClick(() => {
                this.suggestions.forEach((_, index) => this.selectedSuggestions.add(index));
                this.updateCheckboxes();
            });

        new ButtonComponent(controlsEl)
            .setButtonText('Select None')
            .onClick(() => {
                this.selectedSuggestions.clear();
                this.updateCheckboxes();
            });

        new ButtonComponent(controlsEl)
            .setButtonText('Select High Confidence')
            .onClick(() => {
                this.selectedSuggestions.clear();
                this.suggestions.forEach((suggestion, index) => {
                    if (suggestion.confidence >= 0.8) {
                        this.selectedSuggestions.add(index);
                    }
                });
                this.updateCheckboxes();
            });

        // Suggestions list
        const listEl = contentEl.createEl('div', { cls: 'backlink-suggestions-list' });
        
        this.suggestions.forEach((suggestion, index) => {
            this.renderSuggestionItem(listEl, suggestion, index);
        });

        // Action buttons
        const actionsEl = contentEl.createEl('div', { cls: 'backlink-actions' });
        
        new ButtonComponent(actionsEl)
            .setButtonText(`Apply Selected (${this.selectedSuggestions.size})`)
            .setCta()
            .onClick(async () => {
                await this.applySelectedSuggestions();
            });

        new ButtonComponent(actionsEl)
            .setButtonText('Cancel')
            .onClick(() => this.close());
    }

    private renderSuggestionItem(container: HTMLElement, suggestion: BacklinkSuggestion, index: number) {
        const itemEl = container.createEl('div', { cls: 'backlink-suggestion-item' });
        
        // Checkbox
        const checkboxEl = itemEl.createEl('input', { type: 'checkbox' });
        checkboxEl.checked = this.selectedSuggestions.has(index);
        checkboxEl.addEventListener('change', () => {
            if (checkboxEl.checked) {
                this.selectedSuggestions.add(index);
            } else {
                this.selectedSuggestions.delete(index);
            }
        });

        // Content
        const contentEl = itemEl.createEl('div', { cls: 'backlink-suggestion-content' });
        
        // Header with confidence
        const headerEl = contentEl.createEl('div', { cls: 'backlink-suggestion-header' });
        headerEl.innerHTML = `
            <strong>${suggestion.sourceFile.basename}</strong> 
            <span class="backlink-arrow">→</span>
            <strong>${suggestion.targetFile.basename}</strong>
            <span class="backlink-confidence ${this.getConfidenceClass(suggestion.confidence)}">
                ${Math.round(suggestion.confidence * 100)}%
            </span>
        `;

        // Reason and context
        const detailsEl = contentEl.createEl('div', { cls: 'backlink-suggestion-details' });
        detailsEl.innerHTML = `
            <div class="backlink-reason">
                <span class="backlink-type-badge ${suggestion.linkType}">${suggestion.linkType.replace('-', ' ')}</span>
                ${suggestion.reason}
            </div>
            ${suggestion.context ? `<div class="backlink-context">"${suggestion.context}"</div>` : ''}
        `;

        // Preview link
        const previewEl = contentEl.createEl('div', { cls: 'backlink-preview' });
        previewEl.innerHTML = `<code>Will add: ${suggestion.suggestedText}</code>`;
    }

    private getConfidenceClass(confidence: number): string {
        if (confidence >= 0.9) return 'confidence-excellent';
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.7) return 'confidence-good';
        return 'confidence-medium';
    }

    private updateCheckboxes() {
        const checkboxes = this.contentEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox: HTMLInputElement, index) => {
            checkbox.checked = this.selectedSuggestions.has(index);
        });

        // Update apply button text
        const applyButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
        if (applyButton) {
            applyButton.textContent = `Apply Selected (${this.selectedSuggestions.size})`;
        }
    }

    private async applySelectedSuggestions() {
        const selectedSuggestions = Array.from(this.selectedSuggestions)
            .map(index => this.suggestions[index]);

        if (selectedSuggestions.length === 0) {
            new Notice('No suggestions selected');
            return;
        }

        try {
            const appliedCount = await this.backlinkSystem.applyBacklinkSuggestions(selectedSuggestions);
            new Notice(`✅ Applied ${appliedCount} backlinks successfully`);
            console.log(`🔗 BACKLINK: Applied ${appliedCount}/${selectedSuggestions.length} suggestions`);
            this.close();
        } catch (error) {
            new Notice(`❌ Error applying backlinks: ${error.message}`);
            console.error('Error applying backlinks:', error);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}