/**
 * Conversation Browser Modal - ChatGPT-style conversation history browser
 */

import { Modal, App, Setting } from 'obsidian';
import { ConversationManager, ConversationMetadata } from '../voice/conversation/conversation-manager';

export class ConversationBrowserModal extends Modal {
  private conversationManager: ConversationManager;
  private onSelectConversation: (conversationId: string) => void;
  private onNewConversation: () => void;

  constructor(
    app: App, 
    conversationManager: ConversationManager,
    onSelectConversation: (conversationId: string) => void,
    onNewConversation: () => void
  ) {
    super(app);
    this.conversationManager = conversationManager;
    this.onSelectConversation = onSelectConversation;
    this.onNewConversation = onNewConversation;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('conversation-browser-modal');

    // Add custom styles
    this.addCustomStyles();

    // Header
    const header = contentEl.createEl('div', { cls: 'conversation-browser-header' });
    header.createEl('h2', { text: '💬 Chat History', cls: 'conversation-browser-title' });
    
    // New conversation button
    const newButton = header.createEl('button', { 
      text: '🆕 New Chat',
      cls: 'mod-cta conversation-new-btn'
    });
    newButton.addEventListener('click', () => {
      this.close();
      this.onNewConversation();
    });

    // Search bar
    const searchContainer = contentEl.createEl('div', { cls: 'conversation-search-container' });
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: '🔍 Search conversations...',
      cls: 'conversation-search-input'
    });

    // Conversations list
    const conversationsContainer = contentEl.createEl('div', { cls: 'conversations-container' });
    
    // Load and display conversations
    this.displayConversations(conversationsContainer, '');
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.displayConversations(conversationsContainer, query);
    });
  }

  private displayConversations(container: HTMLElement, searchQuery: string): void {
    container.empty();
    
    const conversations = this.conversationManager.getAllConversations();
    const currentConversation = this.conversationManager.getCurrentConversation();
    
    if (conversations.length === 0) {
      const emptyState = container.createEl('div', { cls: 'conversations-empty' });
      emptyState.innerHTML = `
        <div class="empty-icon">💬</div>
        <div class="empty-title">No conversations yet</div>
        <div class="empty-subtitle">Start a new conversation to see it here</div>
      `;
      return;
    }
    
    // Filter conversations based on search query
    const filteredConversations = conversations.filter(conv => 
      searchQuery === '' || 
      conv.title.toLowerCase().includes(searchQuery) ||
      conv.summary.toLowerCase().includes(searchQuery)
    );
    
    if (filteredConversations.length === 0) {
      const noResults = container.createEl('div', { cls: 'conversations-empty' });
      noResults.innerHTML = `
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No matching conversations</div>
        <div class="empty-subtitle">Try a different search term</div>
      `;
      return;
    }
    
    // Group conversations by date
    const groupedConversations = this.groupConversationsByDate(filteredConversations);
    
    for (const [dateGroup, convs] of Object.entries(groupedConversations)) {
      // Date group header
      const groupHeader = container.createEl('div', { cls: 'conversation-group-header' });
      groupHeader.textContent = dateGroup;
      
      // Conversations in this group
      for (const conversation of convs) {
        const convEl = container.createEl('div', { cls: 'conversation-item' });
        
        // Add current conversation indicator
        if (currentConversation?.id === conversation.id) {
          convEl.addClass('conversation-current');
        }
        
        // Conversation content
        const convContent = convEl.createEl('div', { cls: 'conversation-content' });
        
        // Title and summary
        const titleEl = convContent.createEl('div', { cls: 'conversation-title' });
        titleEl.textContent = conversation.title;
        
        const summaryEl = convContent.createEl('div', { cls: 'conversation-summary' });
        summaryEl.textContent = conversation.summary;
        
        // Metadata
        const metaEl = convContent.createEl('div', { cls: 'conversation-meta' });
        const timeStr = conversation.lastMessage.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        metaEl.innerHTML = `
          <span class="conversation-time">📅 ${timeStr}</span>
          <span class="conversation-count">💬 ${conversation.messageCount} messages</span>
        `;
        
        // Actions
        const actionsEl = convEl.createEl('div', { cls: 'conversation-actions' });
        
        // Resume button
        const resumeBtn = actionsEl.createEl('button', { 
          text: '📖 Resume',
          cls: 'conversation-action-btn'
        });
        resumeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
          this.onSelectConversation(conversation.id);
        });
        
        // Delete button
        const deleteBtn = actionsEl.createEl('button', { 
          text: '🗑️',
          cls: 'conversation-action-btn conversation-delete-btn',
          title: 'Delete conversation'
        });
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.deleteConversation(conversation, convEl);
        });
        
        // Click to resume conversation
        convEl.addEventListener('click', () => {
          this.close();
          this.onSelectConversation(conversation.id);
        });
      }
    }
  }
  
  private groupConversationsByDate(conversations: ConversationMetadata[]): Record<string, ConversationMetadata[]> {
    const groups: Record<string, ConversationMetadata[]> = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    for (const conv of conversations) {
      const convDate = conv.lastMessage;
      let groupKey: string;
      
      if (this.isSameDay(convDate, today)) {
        groupKey = 'Today';
      } else if (this.isSameDay(convDate, yesterday)) {
        groupKey = 'Yesterday';
      } else if (convDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        groupKey = 'This Week';
      } else if (convDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
        groupKey = 'This Month';
      } else {
        groupKey = convDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(conv);
    }
    
    return groups;
  }
  
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }
  
  private async deleteConversation(conversation: ConversationMetadata, element: HTMLElement): Promise<void> {
    // Confirm deletion
    const confirmed = confirm(`Delete conversation "${conversation.title}"?\n\nThis will permanently delete the conversation file and cannot be undone.`);
    
    if (confirmed) {
      try {
        await this.conversationManager.deleteConversation(conversation.id);
        element.remove();
        
        // Show success message
        const notice = this.contentEl.createEl('div', { 
          cls: 'conversation-notice conversation-notice-success' 
        });
        notice.textContent = 'Conversation deleted successfully';
        setTimeout(() => notice.remove(), 3000);
        
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        
        // Show error message
        const notice = this.contentEl.createEl('div', { 
          cls: 'conversation-notice conversation-notice-error' 
        });
        notice.textContent = 'Failed to delete conversation';
        setTimeout(() => notice.remove(), 3000);
      }
    }
  }
  
  private addCustomStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .conversation-browser-modal .modal {
        max-width: 600px;
        max-height: 80vh;
      }
      
      .conversation-browser-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .conversation-browser-title {
        margin: 0;
        color: var(--text-normal);
      }
      
      .conversation-new-btn {
        padding: 6px 12px;
        font-size: 13px;
      }
      
      .conversation-search-container {
        margin-bottom: 16px;
      }
      
      .conversation-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
      }
      
      .conversations-container {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .conversation-group-header {
        font-weight: 600;
        color: var(--text-muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 16px 0 8px 0;
        padding: 0 4px;
      }
      
      .conversation-item {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--background-primary);
      }
      
      .conversation-item:hover {
        background: var(--background-modifier-hover);
        border-color: var(--background-modifier-border-hover);
        transform: translateY(-1px);
      }
      
      .conversation-current {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-success);
      }
      
      .conversation-current::before {
        content: "📍 ";
        color: var(--interactive-accent);
      }
      
      .conversation-content {
        flex: 1;
        min-width: 0;
      }
      
      .conversation-title {
        font-weight: 500;
        color: var(--text-normal);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .conversation-summary {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .conversation-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: var(--text-faint);
      }
      
      .conversation-actions {
        display: flex;
        gap: 6px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .conversation-item:hover .conversation-actions {
        opacity: 1;
      }
      
      .conversation-action-btn {
        padding: 4px 8px;
        font-size: 11px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
        color: var(--text-normal);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .conversation-action-btn:hover {
        background: var(--background-modifier-hover);
      }
      
      .conversation-delete-btn:hover {
        background: var(--background-modifier-error);
        border-color: var(--text-error);
        color: var(--text-error);
      }
      
      .conversations-empty {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
      }
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .empty-title {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--text-normal);
      }
      
      .empty-subtitle {
        font-size: 13px;
      }
      
      .conversation-notice {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 13px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
      }
      
      .conversation-notice-success {
        background: var(--background-modifier-success);
        border: 1px solid var(--text-success);
        color: var(--text-success);
      }
      
      .conversation-notice-error {
        background: var(--background-modifier-error);
        border: 1px solid var(--text-error);
        color: var(--text-error);
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    
    if (!document.head.querySelector('style[data-conversation-browser]')) {
      style.setAttribute('data-conversation-browser', 'true');
      document.head.appendChild(style);
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}