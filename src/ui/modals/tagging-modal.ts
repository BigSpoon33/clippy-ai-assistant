/**
 * CLIPPY AI Assistant - Tagging Modal
 * Modal for AI-powered tag suggestions and selection
 */

import { Modal, App, ButtonComponent, Notice } from 'obsidian';

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
}

export interface TagGenerator {
  generateTagSuggestions(content: string): Promise<TagSuggestion[]>;
}

export class TaggingModal extends Modal {
  private content: string;
  private suggestedTags: TagSuggestion[] = [];
  private selectedTags: Set<string> = new Set();
  private onAccept: (tags: string[]) => void;
  private tagGenerator: TagGenerator;

  constructor(
    app: App, 
    content: string, 
    onAccept: (tags: string[]) => void, 
    tagGenerator: TagGenerator
  ) {
    super(app);
    this.content = content;
    this.onAccept = onAccept;
    this.tagGenerator = tagGenerator;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: '🏷️ CLIPPY Quick Tagging' });
    
    // Content preview
    contentEl.createEl('h3', { text: 'Content Preview:' });
    const previewDiv = contentEl.createDiv('clippy-content-preview');
    previewDiv.createEl('pre', { text: this.content.substring(0, 300) + '...' });
    
    // Suggested tags area
    contentEl.createEl('h3', { text: 'AI Suggested Tags:' });
    const tagsContainer = contentEl.createDiv('clippy-suggested-tags');
    const loadingDiv = tagsContainer.createDiv('clippy-loading');
    loadingDiv.textContent = '🤔 Analyzing content for tag suggestions...';
    
    // Selected tags preview
    contentEl.createEl('h3', { text: 'Selected Tags:' });
    const selectedContainer = contentEl.createDiv('clippy-selected-tags-preview');
    this.updateSelectedPreview(selectedContainer);
    
    // Button container
    const buttonContainer = contentEl.createDiv('clippy-buttons');
    
    // Generate tags button
    const generateBtn = new ButtonComponent(buttonContainer)
      .setButtonText('🧠 Generate Tag Suggestions')
      .setCta()
      .onClick(async () => {
        generateBtn.setDisabled(true);
        generateBtn.setButtonText('🤔 Analyzing...');
        
        try {
          this.suggestedTags = await this.tagGenerator.generateTagSuggestions(this.content);
          this.renderTagSuggestions(tagsContainer, selectedContainer);
          addBtn.setDisabled(false);
          generateBtn.setButtonText('🔄 Regenerate');
        } catch (error) {
          tagsContainer.empty();
          tagsContainer.createEl('p', { text: `Error: ${error.message}`, cls: 'clippy-error' });
          generateBtn.setButtonText('🧠 Try Again');
        }
        
        generateBtn.setDisabled(false);
      });
    
    // Add selected tags button
    const addBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✅ Add Selected Tags')
      .setDisabled(true)
      .onClick(() => {
        const tagsArray = Array.from(this.selectedTags);
        if (tagsArray.length > 0) {
          this.onAccept(tagsArray);
          this.close();
        } else {
          new Notice('No tags selected!');
        }
      });
    
    // Cancel button
    new ButtonComponent(buttonContainer)
      .setButtonText('❌ Cancel')
      .onClick(() => {
        this.close();
      });

    // Auto-generate on open
    setTimeout(() => {
      generateBtn.buttonEl.click();
    }, 100);
  }

  renderTagSuggestions(container: HTMLElement, selectedContainer: HTMLElement) {
    container.empty();
    
    if (this.suggestedTags.length === 0) {
      container.createEl('p', { text: 'No tag suggestions found.', cls: 'clippy-no-suggestions' });
      return;
    }

    this.suggestedTags.forEach(suggestion => {
      const tagItem = container.createDiv('clippy-tag-suggestion');
      
      // Set the container to flex layout to put checkbox and content on same line
      tagItem.style.display = 'flex';
      tagItem.style.alignItems = 'flex-start';
      tagItem.style.gap = '10px';
      tagItem.style.padding = '8px';
      tagItem.style.marginBottom = '8px';
      tagItem.style.border = '1px solid var(--background-modifier-border)';
      tagItem.style.borderRadius = '4px';
      tagItem.style.backgroundColor = 'var(--background-secondary)';
      
      // Checkbox
      const checkbox = tagItem.createEl('input', { type: 'checkbox' });
      checkbox.checked = this.selectedTags.has(suggestion.tag);
      checkbox.style.marginTop = '2px'; // Align with first line of text
      checkbox.style.flexShrink = '0';
      
      // Tag info container (inline with checkbox)
      const tagInfo = tagItem.createDiv('clippy-tag-info');
      tagInfo.style.flex = '1';
      
      // Tag name and confidence on same line
      const tagHeader = tagInfo.createDiv('clippy-tag-header');
      tagHeader.style.display = 'flex';
      tagHeader.style.alignItems = 'center';
      tagHeader.style.gap = '8px';
      tagHeader.style.marginBottom = '4px';
      
      const tagName = tagHeader.createEl('span', { text: `#${suggestion.tag}`, cls: 'clippy-tag-name' });
      tagName.style.fontWeight = 'bold';
      tagName.style.color = 'var(--text-accent)';
      
      const confidence = Math.round(suggestion.confidence * 100);
      const confidenceSpan = tagHeader.createEl('span', { 
        text: `${confidence}%`,
        cls: `clippy-confidence ${this.getConfidenceClass(confidence)}`
      });
      confidenceSpan.style.fontSize = '0.85em';
      confidenceSpan.style.padding = '2px 6px';
      confidenceSpan.style.borderRadius = '3px';
      confidenceSpan.style.fontWeight = 'bold';
      
      // Set confidence color based on value
      if (confidence >= 80) {
        confidenceSpan.style.backgroundColor = '#10b981';
        confidenceSpan.style.color = 'white';
      } else if (confidence >= 60) {
        confidenceSpan.style.backgroundColor = '#f59e0b';
        confidenceSpan.style.color = 'white';
      } else {
        confidenceSpan.style.backgroundColor = '#ef4444';
        confidenceSpan.style.color = 'white';
      }
      
      // Reason on separate line
      const reason = tagInfo.createEl('div', { text: suggestion.reason, cls: 'clippy-tag-reason' });
      reason.style.fontSize = '0.85em';
      reason.style.color = 'var(--text-muted)';
      reason.style.fontStyle = 'italic';
      reason.style.lineHeight = '1.3';
      
      // Checkbox handler
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedTags.add(suggestion.tag);
        } else {
          this.selectedTags.delete(suggestion.tag);
        }
        this.updateSelectedPreview(selectedContainer);
      });
    });
  }

  updateSelectedPreview(container: HTMLElement) {
    container.empty();
    
    if (this.selectedTags.size === 0) {
      container.createEl('span', { text: 'No tags selected', cls: 'clippy-no-selection' });
      return;
    }

    Array.from(this.selectedTags).forEach(tag => {
      const tagSpan = container.createEl('span', { text: `#${tag}`, cls: 'clippy-selected-tag' });
      
      // Remove button
      const removeBtn = tagSpan.createEl('button', { text: '×', cls: 'clippy-remove-tag' });
      removeBtn.addEventListener('click', () => {
        this.selectedTags.delete(tag);
        this.updateSelectedPreview(container);
        // Update checkboxes
        const checkboxes = this.contentEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, index) => {
          if (this.suggestedTags[index]?.tag === tag) {
            (cb as HTMLInputElement).checked = false;
          }
        });
      });
    });
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'clippy-confidence-high';
    if (confidence >= 60) return 'clippy-confidence-medium';
    return 'clippy-confidence-low';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}