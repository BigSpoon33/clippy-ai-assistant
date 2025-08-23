/**
 * CLIPPY AI Assistant - AI Enhancement Modal
 * Interactive modal for AI-powered content enhancement and chat
 */

import { App, Modal, Setting, ButtonComponent, Notice, MarkdownRenderer } from 'obsidian';
import { ClippySettings, EnhancementSuggestion } from '../types';
import { ProviderFactory } from '../ai/provider-factory';
import { ComprehensiveAnalysis } from '../features/content-processing/processors/content-analyzer';

export class AIEnhancementModal extends Modal {
  private originalContent: string;
  private analysis: ComprehensiveAnalysis | null;
  private settings: ClippySettings;
  private onAccept: (content: string) => void;
  private chatMode: boolean;
  
  private previewEl: HTMLElement;
  private chatEl: HTMLElement;
  private currentContent: string;
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(
    app: App,
    content: string,
    analysis: ComprehensiveAnalysis | null,
    settings: ClippySettings,
    onAccept: (content: string) => void,
    chatMode = false
  ) {
    super(app);
    this.originalContent = content;
    this.currentContent = content;
    this.analysis = analysis;
    this.settings = settings;
    this.onAccept = onAccept;
    this.chatMode = chatMode;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    // Header
    contentEl.createEl('h2', { 
      text: this.chatMode ? 'Chat with CLIPPY' : 'Note Enhancement Assistant' 
    });

    if (this.chatMode) {
      this.createChatInterface();
    } else {
      this.createEnhancementInterface();
    }
  }

  private createEnhancementInterface(): void {
    const { contentEl } = this;

    if (!this.analysis) {
      contentEl.createEl('p', { text: 'Analyzing content...' });
      return;
    }

    // Tabs for different views
    const tabContainer = contentEl.createDiv('clippy-tabs');
    const tabButtons = tabContainer.createDiv('clippy-tab-buttons');
    const tabContent = tabContainer.createDiv('clippy-tab-content');

    // Tab buttons
    const overviewBtn = tabButtons.createEl('button', { text: 'Overview', cls: 'clippy-tab-btn active' });
    const suggestionsBtn = tabButtons.createEl('button', { text: 'Suggestions', cls: 'clippy-tab-btn' });
    const previewBtn = tabButtons.createEl('button', { text: 'Preview', cls: 'clippy-tab-btn' });
    const chatBtn = tabButtons.createEl('button', { text: 'Chat', cls: 'clippy-tab-btn' });

    // Tab content areas
    const overviewTab = tabContent.createDiv('clippy-tab-pane active');
    const suggestionsTab = tabContent.createDiv('clippy-tab-pane');
    const previewTab = tabContent.createDiv('clippy-tab-pane');
    const chatTab = tabContent.createDiv('clippy-tab-pane');

    // Tab switching
    const tabs = [
      { btn: overviewBtn, pane: overviewTab },
      { btn: suggestionsBtn, pane: suggestionsTab },
      { btn: previewBtn, pane: previewTab },
      { btn: chatBtn, pane: chatTab },
    ];

    tabs.forEach(({ btn, pane }) => {
      btn.addEventListener('click', () => {
        tabs.forEach(({ btn: b, pane: p }) => {
          b.removeClass('active');
          p.removeClass('active');
        });
        btn.addClass('active');
        pane.addClass('active');
      });
    });

    // Overview tab
    this.createOverviewTab(overviewTab);

    // Suggestions tab
    this.createSuggestionsTab(suggestionsTab);

    // Preview tab
    this.createPreviewTab(previewTab);

    // Chat tab
    this.createChatTab(chatTab);

    // Action buttons
    this.createActionButtons();
  }

  private createOverviewTab(container: HTMLElement): void {
    if (!this.analysis) return;

    const { contentAnalysis, qualityScore, recommendations } = this.analysis;

    // Quality score
    const scoreContainer = container.createDiv('clippy-quality-score');
    scoreContainer.createEl('h3', { text: 'Quality Score' });
    const scoreBar = scoreContainer.createDiv('clippy-score-bar');
    const scoreFill = scoreBar.createDiv('clippy-score-fill');
    scoreFill.style.width = `${qualityScore}%`;
    scoreFill.style.backgroundColor = qualityScore > 70 ? '#4caf50' : qualityScore > 40 ? '#ff9800' : '#f44336';
    scoreContainer.createEl('span', { text: `${qualityScore}/100` });

    // Summary
    if (contentAnalysis.summary) {
      const summaryContainer = container.createDiv('clippy-summary');
      summaryContainer.createEl('h3', { text: 'Summary' });
      summaryContainer.createEl('p', { text: contentAnalysis.summary });
    }

    // Topics
    if (contentAnalysis.topics.length > 0) {
      const topicsContainer = container.createDiv('clippy-topics');
      topicsContainer.createEl('h3', { text: 'Main Topics' });
      const topicsList = topicsContainer.createEl('ul');
      contentAnalysis.topics.forEach(topic => {
        topicsList.createEl('li', { text: topic });
      });
    }

    // Recommendations
    if (recommendations.length > 0) {
      const recContainer = container.createDiv('clippy-recommendations');
      recContainer.createEl('h3', { text: 'Recommendations' });
      const recList = recContainer.createEl('ul');
      recommendations.forEach(rec => {
        recList.createEl('li', { text: rec });
      });
    }
  }

  private createSuggestionsTab(container: HTMLElement): void {
    if (!this.analysis) return;

    const { tagSuggestions, formattingResult } = this.analysis;

    // Tag suggestions
    if (tagSuggestions.length > 0) {
      const tagContainer = container.createDiv('clippy-tag-suggestions');
      tagContainer.createEl('h3', { text: 'Suggested Tags' });
      
      tagSuggestions.forEach(suggestion => {
        const tagItem = tagContainer.createDiv('clippy-tag-item');
        const tagSpan = tagItem.createEl('span', { 
          text: `#${suggestion.tag}`,
          cls: 'clippy-tag'
        });
        
        const confidenceSpan = tagItem.createEl('span', { 
          text: `${Math.round(suggestion.confidence * 100)}%`,
          cls: 'clippy-confidence'
        });
        
        const reasonSpan = tagItem.createEl('span', { 
          text: suggestion.reason,
          cls: 'clippy-reason'
        });

        const addBtn = tagItem.createEl('button', { text: 'Add', cls: 'clippy-add-tag-btn' });
        addBtn.addEventListener('click', () => {
          this.addTagToContent(suggestion.tag);
          addBtn.textContent = 'Added';
          addBtn.disabled = true;
        });
      });
    }

    // Formatting suggestions
    if (formattingResult.suggestions.length > 0) {
      const formatContainer = container.createDiv('clippy-format-suggestions');
      formatContainer.createEl('h3', { text: 'Formatting Improvements' });

      formattingResult.suggestions.forEach(suggestion => {
        const suggestionItem = formatContainer.createDiv('clippy-suggestion-item');
        suggestionItem.createEl('h4', { text: suggestion.description });
        suggestionItem.createEl('p', { text: `Priority: ${suggestion.priority}` });
        
        const beforeEl = suggestionItem.createDiv('clippy-before');
        beforeEl.createEl('strong', { text: 'Before:' });
        beforeEl.createEl('code', { text: suggestion.before });
        
        const afterEl = suggestionItem.createDiv('clippy-after');
        afterEl.createEl('strong', { text: 'After:' });
        afterEl.createEl('code', { text: suggestion.after });

        const applyBtn = suggestionItem.createEl('button', { text: 'Apply', cls: 'clippy-apply-btn' });
        applyBtn.addEventListener('click', () => {
          this.applySuggestion(suggestion);
          applyBtn.textContent = 'Applied';
          applyBtn.disabled = true;
        });
      });
    }
  }

  private createPreviewTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Enhanced Content Preview' });
    
    this.previewEl = container.createDiv('clippy-preview');
    this.updatePreview();
  }

  private createChatTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Chat with AI about this content' });
    
    this.chatEl = container.createDiv('clippy-chat');
    this.createChatInterface(this.chatEl);
  }

  private createChatInterface(container?: HTMLElement): void {
    const chatContainer = container || this.contentEl;

    // Chat history
    const historyEl = chatContainer.createDiv('clippy-chat-history');
    
    // Chat input
    const inputContainer = chatContainer.createDiv('clippy-chat-input');
    const textArea = inputContainer.createEl('textarea', {
      placeholder: 'Ask me anything about this note...',
      cls: 'clippy-chat-textarea'
    });
    
    const sendButton = inputContainer.createEl('button', { 
      text: 'Send',
      cls: 'clippy-send-btn'
    });

    const sendMessage = async () => {
      const message = textArea.value.trim();
      if (!message) return;

      // Add user message
      this.addChatMessage('user', message);
      textArea.value = '';
      sendButton.disabled = true;
      sendButton.textContent = 'Sending...';

      try {
        // Get AI response
        const aiProvider = await ProviderFactory.createProvider(this.settings);
        const context = this.chatMode ? 
          `User is asking about this content:\n\n${this.originalContent}` :
          'User is asking about content they are enhancing';
        
        const response = await aiProvider.generateResponse(message, context);
        
        // Add AI response
        this.addChatMessage('assistant', response);
      } catch (error) {
        this.addChatMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
      }

      sendButton.disabled = false;
      sendButton.textContent = 'Send';
    };

    sendButton.addEventListener('click', sendMessage);
    textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        sendMessage();
      }
    });

    // Store references
    this.chatEl = historyEl;
  }

  private addChatMessage(role: 'user' | 'assistant', content: string): void {
    this.chatHistory.push({ role, content });
    
    const messageEl = this.chatEl.createDiv(`clippy-chat-message clippy-${role}`);
    const avatar = messageEl.createDiv('clippy-avatar');
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const messageContent = messageEl.createDiv('clippy-message-content');
    
    if (role === 'assistant') {
      // Render markdown for AI responses
      MarkdownRenderer.renderMarkdown(content, messageContent, '', null as any);
    } else {
      messageContent.textContent = content;
    }
    
    // Scroll to bottom
    this.chatEl.scrollTop = this.chatEl.scrollHeight;
  }

  private addTagToContent(tag: string): void {
    // Simple implementation - add to frontmatter or inline
    if (this.currentContent.startsWith('---')) {
      // Add to frontmatter
      const frontmatterEnd = this.currentContent.indexOf('---', 3);
      if (frontmatterEnd > 0) {
        const beforeTags = this.currentContent.slice(0, frontmatterEnd);
        const afterTags = this.currentContent.slice(frontmatterEnd);
        this.currentContent = `${beforeTags}\ntags:\n  - ${tag}${afterTags}`;
      }
    } else {
      // Add as inline tag
      this.currentContent = `#${tag}\n\n${this.currentContent}`;
    }
    
    this.updatePreview();
  }

  private applySuggestion(suggestion: EnhancementSuggestion): void {
    this.currentContent = this.currentContent.replace(suggestion.before, suggestion.after);
    this.updatePreview();
  }

  private updatePreview(): void {
    if (this.previewEl) {
      this.previewEl.empty();
      MarkdownRenderer.renderMarkdown(this.currentContent, this.previewEl, '', null as any);
    }
  }

  private createActionButtons(): void {
    const buttonContainer = this.contentEl.createDiv('clippy-action-buttons');

    // Apply all safe changes
    const applyAllBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Apply Safe Changes')
      .setTooltip('Apply formatting fixes and add suggested tags')
      .onClick(() => {
        if (this.analysis?.formattingResult.enhancedContent) {
          this.currentContent = this.analysis.formattingResult.enhancedContent;
          this.updatePreview();
          new Notice('Applied safe formatting changes');
        }
      });

    // Accept changes
    const acceptBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Accept Changes')
      .setCta()
      .onClick(() => {
        this.onAccept(this.currentContent);
        this.close();
      });

    // Cancel
    const cancelBtn = new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => {
        this.close();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}