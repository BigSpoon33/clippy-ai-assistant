/**
 * CLIPPY AI Assistant - Vault Agent Chat Modal
 * Enhanced chat interface with AI agent and vault management tools
 */

import { App, Modal, Setting, ButtonComponent, Notice, MarkdownRenderer, MarkdownView } from 'obsidian';
import { ClippySettings } from '../types';
import { VaultAgent, AgentContext } from '../agents/vault-agent';
import { ClippyErrorBoundaries } from '../utils/error-boundaries';

export class VaultAgentChatModal extends Modal {
  private settings: ClippySettings;
  protected vaultAgent: VaultAgent;
  protected context: AgentContext;
  
  protected chatHistoryEl: HTMLElement;
  protected inputEl: HTMLTextAreaElement;
  protected sendBtn: HTMLButtonElement;
  protected statusEl: HTMLElement;
  
  protected chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
  protected isProcessing: boolean = false;

  constructor(app: App, settings: ClippySettings, initialContext?: Partial<AgentContext>) {
    super(app);
    this.settings = settings;
    this.vaultAgent = new VaultAgent(app, settings);
    
    // Initialize context
    this.context = {
      conversationHistory: [],
      sessionId: Date.now().toString(),
      workingDirectory: 'root',
      ...initialContext
    };

    // Set up modal styling
    this.modalEl.addClass('vault-agent-chat-modal');
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vault-agent-content');

    console.log('VaultAgent: Opening modal...');

    try {
      this.createHeader();
      this.createToolsButton();
      this.createChatInterface();
      this.createStatusBar();
      
      console.log('VaultAgent: All UI elements created');
      
      // Focus on input
      setTimeout(() => {
        if (this.inputEl) {
          this.inputEl.focus();
          console.log('VaultAgent: Input focused');
        } else {
          console.error('VaultAgent: Input element not found!');
        }
      }, 100);

      // Add welcome message
      this.addWelcomeMessage();
      
    } catch (error) {
      console.error('VaultAgent: Error creating UI:', error);
      
      // Fallback simple UI
      contentEl.innerHTML = `
        <h2>🤖 CLIPPY Vault Agent</h2>
        <div style="margin: 20px 0;">
          <div id="chat-history" style="height: 300px; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; overflow-y: auto; background: var(--background-secondary);"></div>
          <div style="display: flex; gap: 8px;">
            <textarea id="chat-input" placeholder="Ask me to manage your vault..." style="flex: 1; min-height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
            <button id="chat-send" style="padding: 8px 16px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Send</button>
          </div>
        </div>
      `;
      
      // Set up fallback elements
      this.chatHistoryEl = contentEl.querySelector('#chat-history') as HTMLElement;
      this.inputEl = contentEl.querySelector('#chat-input') as HTMLTextAreaElement;
      this.sendBtn = contentEl.querySelector('#chat-send') as HTMLButtonElement;
      
      if (this.inputEl && this.sendBtn) {
        this.inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.sendMessage();
          }
        });
        
        this.sendBtn.addEventListener('click', () => {
          this.sendMessage();
        });
        
        this.addWelcomeMessage();
      }
    }
  }

  private createHeader(): void {
    const headerEl = this.contentEl.createDiv('vault-agent-header');
    
    const titleEl = headerEl.createEl('h2', { text: '🤖 CLIPPY Vault Agent' });
    titleEl.addClass('vault-agent-title');
    
    const subtitleEl = headerEl.createEl('p', { 
      text: 'AI assistant with full vault management capabilities'
    });
    subtitleEl.addClass('vault-agent-subtitle');

    // Quick info
    const infoEl = headerEl.createDiv('vault-agent-info');
    const noteCount = this.app.vault.getMarkdownFiles().length;
    infoEl.innerHTML = `
      <span>📁 ${noteCount} notes</span>
      <span>🔧 ${this.vaultAgent.getAvailableTools().length} tools</span>
      ${this.context.currentNote ? `<span>📝 ${this.context.currentNote.name}</span>` : ''}
    `;
  }

  protected createChatInterface(): void {
    const chatContainer = this.contentEl.createDiv('vault-agent-chat-container');
    chatContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 12px;
      margin: 16px 0;
    `;
    
    // Chat history area - takes up most space
    this.chatHistoryEl = chatContainer.createDiv('vault-agent-chat-history');
    this.chatHistoryEl.style.cssText = `
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 16px;
      background: var(--background-secondary);
      min-height: 350px;
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    `;

    // Input area - fixed at bottom
    const inputContainer = chatContainer.createDiv('vault-agent-input-container');
    inputContainer.style.cssText = `
      display: flex !important;
      gap: 8px;
      align-items: stretch;
      padding: 12px;
      background: var(--background-primary);
      border-radius: 8px;
      border: 2px solid var(--interactive-accent);
      position: relative;
      z-index: 10;
      flex-shrink: 0;
      margin-top: auto;
    `;

    this.inputEl = inputContainer.createEl('textarea', {
      placeholder: 'Ask me to manage your vault: create notes, search content, organize files...',
      cls: 'vault-agent-input'
    });
    this.inputEl.style.cssText = `
      flex: 1 !important;
      min-height: 60px !important;
      max-height: 120px;
      padding: 12px !important;
      border: 1px solid var(--background-modifier-border) !important;
      border-radius: 6px;
      background: var(--background-primary) !important;
      color: var(--text-normal) !important;
      resize: none;
      font-family: var(--font-default);
      font-size: 14px !important;
      box-sizing: border-box !important;
      outline: none !important;
      pointer-events: auto !important;
      position: relative;
      z-index: 20;
    `;

    this.sendBtn = inputContainer.createEl('button', {
      text: 'Send',
      cls: 'vault-agent-send-btn mod-cta'
    });
    this.sendBtn.style.cssText = `
      padding: 12px 20px !important;
      background: var(--interactive-accent) !important;
      color: white !important;
      border: none !important;
      border-radius: 6px;
      cursor: pointer !important;
      font-weight: 600;
      font-size: 14px !important;
      min-width: 80px;
      height: 60px;
      flex-shrink: 0;
      pointer-events: auto !important;
      position: relative;
      z-index: 20;
    `;

    // Debug logging
    console.log('VaultAgent: Created input elements:', {
      inputEl: this.inputEl,
      sendBtn: this.sendBtn,
      inputContainer: inputContainer,
      chatContainer: chatContainer
    });

    // Event listeners
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.inputEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.inputEl.focus();
    });

    this.inputEl.addEventListener('focus', () => {
      console.log('VaultAgent: Input focused');
    });

    this.sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sendMessage();
    });

    // Make sure input container doesn't block events
    inputContainer.addEventListener('click', (e) => {
      if (e.target === inputContainer) {
        this.inputEl.focus();
      }
    });
  }

  private createToolsButton(): void {
    const toolsButtonContainer = this.contentEl.createDiv('vault-agent-tools-button-container');
    toolsButtonContainer.style.cssText = `
      display: flex;
      justify-content: center;
      margin: 12px 0;
    `;
    
    const toolsButton = toolsButtonContainer.createEl('button', { 
      text: '🔧 Show Available Tools',
      cls: 'vault-agent-tools-button'
    });
    toolsButton.style.cssText = `
      padding: 8px 16px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-normal);
      transition: background-color 0.2s;
    `;

    toolsButton.addEventListener('mouseover', () => {
      toolsButton.style.backgroundColor = 'var(--background-modifier-hover)';
    });

    toolsButton.addEventListener('mouseout', () => {
      toolsButton.style.backgroundColor = 'var(--background-secondary)';
    });

    toolsButton.addEventListener('click', () => {
      this.showToolsInChat();
    });
  }

  private showToolsInChat(): void {
    const tools = this.vaultAgent.getAvailableTools();
    const categories = {
      '📁 File Operations': ['create_note', 'read_note', 'update_note', 'delete_note', 'rename_note'],
      '🔍 Search & Discovery': ['search_notes', 'list_notes', 'find_note_by_tag'],
      '📂 Folder Management': ['create_folder', 'list_folders'],
      '📄 Templates': ['create_from_template'],
      '🏷️ Metadata': ['get_note_metadata', 'add_frontmatter'],
      '🔗 Links': ['find_backlinks', 'find_outgoing_links'],
      '📊 Analytics': ['get_vault_stats', 'analyze_note']
    };

    let toolsMessage = `# 🔧 Available Vault Management Tools\n\nI have ${tools.length} tools to help you manage your vault:\n\n`;

    Object.entries(categories).forEach(([category, toolNames]) => {
      toolsMessage += `## ${category}\n\n`;
      
      const toolsInCategory = tools.filter(tool => toolNames.includes(tool.name));
      toolsInCategory.forEach(tool => {
        const params = Object.entries(tool.parameters)
          .map(([name, param]) => `${name}${param.required ? '*' : ''}`)
          .join(', ');
        
        toolsMessage += `- **${tool.name}**(${params}) - ${tool.description}\n`;
      });
      toolsMessage += '\n';
    });

    toolsMessage += `---\n*Just ask me in natural language! For example: "Create a new note called 'Project Ideas'" or "List all notes in my Work folder"*`;

    this.addMessage('assistant', toolsMessage);
  }

  private createStatusBar(): void {
    this.statusEl = this.contentEl.createDiv('vault-agent-status');
    this.statusEl.style.cssText = `
      padding: 8px 12px;
      background: var(--background-modifier-border);
      border-radius: 6px;
      margin-top: 16px;
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    `;
    
    this.updateStatus('Ready');
  }

  private addWelcomeMessage(): void {
    const welcomeMessage = `Hello! I'm CLIPPY, your AI vault assistant. I can help you:

📝 **Create and manage notes** - "Create a new note called 'Meeting Notes'"
🔍 **Search your vault** - "Find all notes about machine learning"  
📁 **Organize folders** - "List all folders in my vault"
🏷️ **Work with tags** - "Show me all notes tagged with #project"
🔗 **Analyze connections** - "Find all notes that link to this one"
📊 **Get insights** - "Analyze my daily note from yesterday"

Just ask me what you'd like to do with your vault!`;

    this.addMessage('assistant', welcomeMessage);
  }

  protected async sendMessage(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message || this.isProcessing) return;

    // Add user message to chat
    this.addMessage('user', message);
    this.inputEl.value = '';
    this.setProcessing(true);

    try {
      // Update context with current conversation
      this.context.conversationHistory = this.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Process with vault agent
      const response = await ClippyErrorBoundaries.aiProviderOperation(
        () => this.vaultAgent.processMessage(message, this.context),
        'process vault agent message',
        {
          fallback: async () => 'Sorry, I encountered an error processing your request. Please check your AI provider settings.',
          showUserNotice: false
        }
      );

      // Add assistant response
      this.addMessage('assistant', response);

    } catch (error) {
      console.error('Vault Agent Chat Error:', error);
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
      this.setProcessing(false);
      this.inputEl.focus();
    }
  }

  protected addMessage(role: 'user' | 'assistant', content: string): void {
    const timestamp = Date.now();
    this.chatHistory.push({ role, content, timestamp });

    const messageEl = this.chatHistoryEl.createDiv(`vault-agent-message vault-agent-${role}`);
    messageEl.style.cssText = `
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
      background: ${role === 'user' ? 'var(--interactive-accent)' : 'var(--background-primary)'};
      color: ${role === 'user' ? 'white' : 'var(--text-normal)'};
      border: ${role === 'assistant' ? '1px solid var(--background-modifier-border)' : 'none'};
    `;

    const headerEl = messageEl.createDiv('message-header');
    headerEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      opacity: 0.8;
    `;

    const avatarEl = headerEl.createSpan('message-avatar');
    avatarEl.textContent = role === 'user' ? '👤' : '🤖';

    const authorEl = headerEl.createSpan('message-author');
    authorEl.textContent = role === 'user' ? 'You' : 'CLIPPY Agent';

    const timeEl = headerEl.createSpan('message-time');
    timeEl.textContent = new Date(timestamp).toLocaleTimeString();

    const contentEl = messageEl.createDiv('message-content');
    contentEl.style.cssText = `
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      cursor: text;
      line-height: 1.4;
    `;
    
    if (role === 'assistant') {
      // Render markdown for AI responses
      MarkdownRenderer.render(this.app, content, contentEl, '', null as any);
    } else {
      contentEl.textContent = content;
    }

    // Scroll to bottom
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
  }

  protected setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.sendBtn.disabled = processing;
    this.sendBtn.textContent = processing ? 'Processing...' : 'Send';
    this.inputEl.disabled = processing;
    
    this.updateStatus(processing ? 'Processing your request...' : 'Ready');
  }

  private updateStatus(message: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/**
 * Enhanced AI chat modal that extends the existing AIEnhancementModal
 * with vault agent capabilities
 */
export class EnhancedAIChatModal extends VaultAgentChatModal {
  constructor(app: App, settings: ClippySettings, currentFile?: string) {
    // Create context with current file
    const context: AgentContext = {
      conversationHistory: [],
      sessionId: Date.now().toString(),
      workingDirectory: 'root'
    };

    // If we have a current file, add it to context
    if (currentFile) {
      const file = app.vault.getAbstractFileByPath(currentFile);
      if (file && file.hasOwnProperty('basename')) {
        context.currentNote = file as any;
        context.workingDirectory = file.parent?.path || 'root';
      }
    }

    super(app, settings, context);
  }
}