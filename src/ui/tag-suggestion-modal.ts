/**
 * CLIPPY AI Assistant - Tag Suggestion Modal
 * Interactive modal for selecting and applying tag suggestions
 */

import { App, Modal, ButtonComponent, Notice } from 'obsidian';
import { TagSuggestion } from '../features/content-processing/processors/auto-tagger';

export class TagSuggestionModal extends Modal {
  private suggestions: TagSuggestion[];
  private onAccept: (selectedTags: string[]) => void;
  private selectedTags: Set<string> = new Set();

  constructor(
    app: App,
    suggestions: TagSuggestion[],
    onAccept: (selectedTags: string[]) => void
  ) {
    super(app);
    this.suggestions = suggestions;
    this.onAccept = onAccept;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clippy-tag-modal');

    // Header
    contentEl.createEl('h2', { text: 'Tag Suggestions' });
    contentEl.createEl('p', { 
      text: 'Select tags to add to your note. CLIPPY analyzed your content and vault patterns to suggest these tags.',
      cls: 'clippy-modal-description'
    });

    // Filter buttons
    this.createFilterButtons();

    // Suggestions list
    this.createSuggestionsList();

    // Selected tags preview
    this.createSelectedTagsPreview();

    // Action buttons
    this.createActionButtons();
  }

  private createFilterButtons(): void {
    const { contentEl } = this;
    
    const filterContainer = contentEl.createDiv('clippy-filter-container');
    filterContainer.createEl('h3', { text: 'Filter by Source:' });

    const filterButtons = filterContainer.createDiv('clippy-filter-buttons');
    
    const sources = [...new Set(this.suggestions.map(s => s.source))];
    
    // All button
    const allBtn = filterButtons.createEl('button', { 
      text: 'All',
      cls: 'clippy-filter-btn active'
    });
    
    allBtn.addEventListener('click', () => {
      this.filterSuggestions(null);
      this.updateFilterButtons(filterButtons, allBtn);
    });

    // Source-specific buttons
    sources.forEach(source => {
      const btn = filterButtons.createEl('button', {
        text: this.getSourceDisplayName(source),
        cls: 'clippy-filter-btn'
      });
      
      btn.addEventListener('click', () => {
        this.filterSuggestions(source);
        this.updateFilterButtons(filterButtons, btn);
      });
    });
  }

  private createSuggestionsList(): void {
    const { contentEl } = this;
    
    const listContainer = contentEl.createDiv('clippy-suggestions-container');
    this.suggestionsListEl = listContainer.createDiv('clippy-suggestions-list');
    
    this.renderSuggestions(this.suggestions);
  }

  private suggestionsListEl: HTMLElement;

  private renderSuggestions(suggestions: TagSuggestion[]): void {
    this.suggestionsListEl.empty();
    
    if (suggestions.length === 0) {
      this.suggestionsListEl.createEl('p', { 
        text: 'No suggestions for this filter.',
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
        if (checkbox.checked) {
          this.selectedTags.add(suggestion.tag);
        } else {
          this.selectedTags.delete(suggestion.tag);
        }
        this.updateSelectedTagsPreview();
      });

      // Tag info
      const infoContainer = item.createDiv('clippy-suggestion-info');
      
      // Tag name with confidence
      const tagHeader = infoContainer.createDiv('clippy-tag-header');
      const tagName = tagHeader.createEl('span', {
        text: `#${suggestion.tag}`,
        cls: 'clippy-tag-name'
      });
      
      // Confidence indicator
      const confidence = Math.round(suggestion.confidence * 100);
      const confidenceEl = tagHeader.createEl('span', {
        text: `${confidence}%`,
        cls: `clippy-confidence clippy-confidence-${this.getConfidenceClass(confidence)}`
      });

      // Source and reason
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

      // Category (if available)
      if (suggestion.category) {
        details.createEl('span', {
          text: `Category: ${suggestion.category}`,
          cls: 'clippy-category'
        });
      }
    });
  }

  private createSelectedTagsPreview(): void {
    const { contentEl } = this;
    
    const previewContainer = contentEl.createDiv('clippy-selected-preview');
    previewContainer.createEl('h3', { text: 'Selected Tags:' });
    
    this.selectedTagsEl = previewContainer.createDiv('clippy-selected-tags');
    this.updateSelectedTagsPreview();
  }

  private selectedTagsEl: HTMLElement;

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
        this.selectedTags.delete(tag);
        this.updateSelectedTagsPreview();
        // Update checkbox in list
        const checkboxes = this.suggestionsListEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, index) => {
          if (this.currentFilteredSuggestions[index]?.tag === tag) {
            (cb as HTMLInputElement).checked = false;
          }
        });
      });
    });
  }

  private createActionButtons(): void {
    const { contentEl } = this;
    
    const buttonContainer = contentEl.createDiv('clippy-action-buttons');

    // Select all high-confidence
    const selectHighBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Select High Confidence')
      .setTooltip('Select all suggestions with confidence > 70%')
      .onClick(() => {
        this.currentFilteredSuggestions
          .filter(s => s.confidence > 0.7)
          .forEach(s => this.selectedTags.add(s.tag));
        this.updateSelectedTagsPreview();
        this.renderSuggestions(this.currentFilteredSuggestions);
      });

    // Clear selection
    const clearBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Clear All')
      .onClick(() => {
        this.selectedTags.clear();
        this.updateSelectedTagsPreview();
        this.renderSuggestions(this.currentFilteredSuggestions);
      });

    // Add tags
    const addBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Add Selected Tags')
      .setCta()
      .onClick(() => {
        if (this.selectedTags.size === 0) {
          new Notice('No tags selected');
          return;
        }
        
        this.onAccept(Array.from(this.selectedTags));
        this.close();
      });

    // Cancel
    const cancelBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => {
        this.close();
      });
  }

  private currentFilteredSuggestions: TagSuggestion[] = [];

  private filterSuggestions(source: string | null): void {
    if (source === null) {
      this.currentFilteredSuggestions = this.suggestions;
    } else {
      this.currentFilteredSuggestions = this.suggestions.filter(s => s.source === source);
    }
    
    this.renderSuggestions(this.currentFilteredSuggestions);
  }

  private updateFilterButtons(container: HTMLElement, activeBtn: HTMLElement): void {
    container.querySelectorAll('.clippy-filter-btn').forEach(btn => {
      btn.removeClass('active');
    });
    activeBtn.addClass('active');
  }

  private getSourceDisplayName(source: string): string {
    const displayNames: Record<string, string> = {
      'ai': 'AI Analysis',
      'pattern': 'Vault Patterns',
      'keyword': 'Keyword Match',
      'similar': 'Similar Content'
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
 * Quick tag selector for command palette
 */
export class QuickTagModal extends Modal {
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
    contentEl.addClass('clippy-quick-tag-modal');

    // Header
    contentEl.createEl('h2', { text: 'Quick Tag Selection' });

    // Filter input
    this.filterInput = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Type to filter tags...',
      cls: 'clippy-tag-filter'
    });

    // Tags list
    const tagsList = contentEl.createDiv('clippy-quick-tags-list');

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
    this.filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const firstTag = tagsList.querySelector('.clippy-quick-tag') as HTMLElement;
        firstTag?.focus();
      }
    });
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
        cls: 'clippy-quick-tag'
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
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = tagEl.nextElementSibling as HTMLElement;
          next?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = tagEl.previousElementSibling as HTMLElement;
          if (prev) {
            prev.focus();
          } else {
            this.filterInput.focus();
          }
        }
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}