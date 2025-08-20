/**
 * Conversation Manager - Handles persistent chat history like ChatGPT
 * Saves conversations as markdown files and maintains an index
 */

import { App, TFolder, normalizePath } from 'obsidian';
import { AgentContext } from '../agents/vault-agent';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    tool: string;
    args: any;
    result: string;
    success: boolean;
  }>;
  thinking?: string[];
}

export interface ConversationMetadata {
  id: string;
  title: string;
  filePath: string;
  startTime: Date;
  lastMessage: Date;
  messageCount: number;
  summary: string;
  activeContext: {
    lastCreatedFile?: string;
    lastMentionedFile?: string;
    currentWorkingFile?: string;
  };
}

export interface ConversationIndex {
  conversations: ConversationMetadata[];
  currentConversationId?: string;
}

export class ConversationManager {
  private app: App;
  private conversationsFolder = '42 - Clippy/Chat History';
  private indexPath = '42 - Clippy/Chat History/conversations.json';
  private index: ConversationIndex = { conversations: [] };
  private currentConversation: ConversationMetadata | null = null;
  private messages: ConversationMessage[] = [];

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Initialize the conversation system and load existing index
   */
  async initialize(): Promise<void> {
    console.log('[ConversationManager] Initializing conversation system...');
    
    // Ensure conversations folder exists
    await this.ensureConversationsFolder();
    
    // Load existing conversation index
    await this.loadConversationIndex();
    
    console.log('[ConversationManager] Found', this.index.conversations.length, 'existing conversations');
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(initialMessage?: string): Promise<string> {
    console.log('[ConversationManager] Starting new conversation...');
    
    // Save current conversation if exists
    if (this.currentConversation && this.messages.length > 0) {
      await this.saveCurrentConversation();
    }
    
    // Generate unique conversation ID
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // Count ALL existing conversations for today, not just the ones in index
    let conversationNumber = 1;
    let conversationId = `${dateStr}_${String(conversationNumber).padStart(3, '0')}`;
    
    // Keep incrementing until we find a unique ID
    while (this.index.conversations.some(c => c.id === conversationId) || 
           await this.app.vault.adapter.exists(`${this.conversationsFolder}/${conversationId}.md`)) {
      conversationNumber++;
      conversationId = `${dateStr}_${String(conversationNumber).padStart(3, '0')}`;
    }
    
    console.log('[ConversationManager] Generated unique conversation ID:', conversationId);
    
    // Create new conversation metadata
    this.currentConversation = {
      id: conversationId,
      title: initialMessage ? this.generateTitle(initialMessage) : 'New Conversation',
      filePath: `${this.conversationsFolder}/${conversationId}.md`,
      startTime: now,
      lastMessage: now,
      messageCount: 0,
      summary: '',
      activeContext: {}
    };
    
    // Clear messages for new conversation
    this.messages = [];
    
    // Update index
    this.index.currentConversationId = conversationId;
    await this.saveConversationIndex();
    
    console.log('[ConversationManager] Started new conversation:', conversationId);
    return conversationId;
  }

  /**
   * Load an existing conversation
   */
  async loadConversation(conversationId: string): Promise<ConversationMessage[]> {
    console.log('[ConversationManager] Loading conversation:', conversationId);
    
    // Save current conversation first
    if (this.currentConversation && this.messages.length > 0) {
      await this.saveCurrentConversation();
    }
    
    // Find conversation in index
    const conversation = this.index.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    // Load messages from file
    const messages = await this.loadMessagesFromFile(conversation.filePath);
    
    this.currentConversation = conversation;
    this.messages = messages;
    this.index.currentConversationId = conversationId;
    
    await this.saveConversationIndex();
    
    console.log('[ConversationManager] Loaded', messages.length, 'messages from conversation');
    return messages;
  }

  /**
   * Add a message to the current conversation
   */
  addMessage(message: ConversationMessage): void {
    if (!this.currentConversation) {
      throw new Error('No active conversation. Start a new conversation first.');
    }
    
    this.messages.push(message);
    this.currentConversation.lastMessage = message.timestamp;
    this.currentConversation.messageCount = this.messages.length;
    
    // Update title if this is the first user message
    if (this.messages.length === 1 && message.role === 'user') {
      this.currentConversation.title = this.generateTitle(message.content);
    }
    
    // Auto-save every few messages to prevent data loss
    if (this.messages.length % 3 === 0) {
      this.saveCurrentConversation().catch(console.error);
    }
  }

  /**
   * Get current conversation messages
   */
  getCurrentMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get current conversation metadata
   */
  getCurrentConversation(): ConversationMetadata | null {
    return this.currentConversation;
  }

  /**
   * Get all conversations for browsing
   */
  getAllConversations(): ConversationMetadata[] {
    return [...this.index.conversations].sort((a, b) => 
      b.lastMessage.getTime() - a.lastMessage.getTime()
    );
  }

  /**
   * Update active context (for file tracking)
   */
  updateActiveContext(context: Partial<ConversationMetadata['activeContext']>): void {
    if (this.currentConversation) {
      this.currentConversation.activeContext = {
        ...this.currentConversation.activeContext,
        ...context
      };
    }
  }

  /**
   * Save the current conversation to file
   */
  async saveCurrentConversation(): Promise<void> {
    if (!this.currentConversation || this.messages.length === 0) {
      return;
    }
    
    console.log('[ConversationManager] Saving conversation:', this.currentConversation.id);
    
    const markdown = this.generateConversationMarkdown();
    
    try {
      // Create or update the conversation file
      const filePath = normalizePath(this.currentConversation.filePath);
      const file = this.app.vault.getAbstractFileByPath(filePath);
      
      if (file) {
        await this.app.vault.modify(file as any, markdown);
      } else {
        await this.app.vault.create(filePath, markdown);
      }
      
      // Update conversation in index
      const existingIndex = this.index.conversations.findIndex(
        c => c.id === this.currentConversation!.id
      );
      
      if (existingIndex >= 0) {
        this.index.conversations[existingIndex] = this.currentConversation;
      } else {
        this.index.conversations.push(this.currentConversation);
      }
      
      // Generate summary for the conversation
      this.currentConversation.summary = this.generateSummary();
      
      await this.saveConversationIndex();
      
      console.log('[ConversationManager] Conversation saved successfully');
      
    } catch (error) {
      console.error('[ConversationManager] Failed to save conversation:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const conversation = this.index.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    // Delete the file
    const file = this.app.vault.getAbstractFileByPath(conversation.filePath);
    if (file) {
      await this.app.vault.delete(file);
    }
    
    // Remove from index
    this.index.conversations = this.index.conversations.filter(
      c => c.id !== conversationId
    );
    
    // Clear current conversation if it was deleted
    if (this.currentConversation?.id === conversationId) {
      this.currentConversation = null;
      this.messages = [];
      this.index.currentConversationId = undefined;
    }
    
    await this.saveConversationIndex();
  }

  private async ensureConversationsFolder(): Promise<void> {
    const folderPath = normalizePath(this.conversationsFolder);
    
    if (!await this.app.vault.adapter.exists(folderPath)) {
      await this.app.vault.createFolder(folderPath);
      console.log('[ConversationManager] Created conversations folder');
    }
  }

  private async loadConversationIndex(): Promise<void> {
    try {
      const indexFile = this.app.vault.getAbstractFileByPath(this.indexPath);
      if (indexFile) {
        const content = await this.app.vault.read(indexFile as any);
        const parsed = JSON.parse(content);
        
        // Convert date strings back to Date objects
        this.index = {
          conversations: parsed.conversations.map((c: any) => ({
            ...c,
            startTime: new Date(c.startTime),
            lastMessage: new Date(c.lastMessage)
          })),
          currentConversationId: parsed.currentConversationId
        };
      }
    } catch (error) {
      console.log('[ConversationManager] No existing index found, starting fresh');
      this.index = { conversations: [] };
    }
  }

  private async saveConversationIndex(): Promise<void> {
    try {
      const content = JSON.stringify(this.index, null, 2);
      const file = this.app.vault.getAbstractFileByPath(this.indexPath);
      
      if (file) {
        await this.app.vault.modify(file as any, content);
      } else {
        await this.app.vault.create(this.indexPath, content);
      }
    } catch (error) {
      console.error('[ConversationManager] Failed to save index:', error);
    }
  }

  private async loadMessagesFromFile(filePath: string): Promise<ConversationMessage[]> {
    try {
      console.log('[ConversationManager] Loading messages from file:', filePath);
      
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file) {
        console.log('[ConversationManager] File not found:', filePath);
        return [];
      }
      
      const content = await this.app.vault.read(file as any);
      console.log('[ConversationManager] File content loaded, parsing messages...');
      
      // Parse the markdown back to messages
      const messages: ConversationMessage[] = [];
      const lines = content.split('\n');
      let currentMessage: Partial<ConversationMessage> | null = null;
      let currentContent: string[] = [];
      let currentThinking: string[] = [];
      let inThinking = false;
      
      for (const line of lines) {
        // Detect message headers
        if (line.startsWith('## 👤 User (') || line.startsWith('## 🤖 Assistant (')) {
          // Save previous message if exists
          if (currentMessage) {
            currentMessage.content = currentContent.join('\n').trim();
            if (currentThinking.length > 0) {
              currentMessage.thinking = currentThinking;
            }
            messages.push(currentMessage as ConversationMessage);
          }
          
          // Start new message
          const isUser = line.startsWith('## 👤 User');
          const timeMatch = line.match(/\(([^)]+)\)/);
          const timeStr = timeMatch ? timeMatch[1] : '';
          
          currentMessage = {
            role: isUser ? 'user' : 'assistant',
            timestamp: new Date(), // We'll use current time since parsing time is complex
            content: '',
            thinking: undefined
          };
          currentContent = [];
          currentThinking = [];
          inThinking = false;
          
        } else if (line.startsWith('<details><summary>🤔 Thinking</summary>')) {
          inThinking = true;
        } else if (line === '</details>') {
          inThinking = false;
        } else if (inThinking) {
          currentThinking.push(line);
        } else if (line.trim() && !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('---')) {
          currentContent.push(line);
        }
      }
      
      // Save last message
      if (currentMessage) {
        currentMessage.content = currentContent.join('\n').trim();
        if (currentThinking.length > 0) {
          currentMessage.thinking = currentThinking;
        }
        messages.push(currentMessage as ConversationMessage);
      }
      
      console.log('[ConversationManager] Parsed', messages.length, 'messages from file');
      return messages;
      
    } catch (error) {
      console.error('[ConversationManager] Failed to load messages from file:', error);
      return [];
    }
  }

  private generateConversationMarkdown(): string {
    if (!this.currentConversation) return '';
    
    const { title, startTime, messageCount } = this.currentConversation;
    
    let markdown = `# Conversation: ${title}\n`;
    markdown += `**Started**: ${startTime.toLocaleString()}\n`;
    markdown += `**Messages**: ${messageCount}\n\n`;
    markdown += `---\n\n`;
    
    for (const message of this.messages) {
      const timeStr = message.timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (message.role === 'user') {
        markdown += `## 👤 User (${timeStr})\n`;
        markdown += `${message.content}\n\n`;
      } else {
        markdown += `## 🤖 Assistant (${timeStr})\n`;
        
        // Add thinking sections if present
        if (message.thinking && message.thinking.length > 0) {
          for (const thinking of message.thinking) {
            markdown += `<details><summary>🤔 Thinking</summary>\n${thinking}\n</details>\n\n`;
          }
        }
        
        markdown += `${message.content}\n\n`;
        
        // Add tool calls if present
        if (message.toolCalls && message.toolCalls.length > 0) {
          for (const tool of message.toolCalls) {
            const status = tool.success ? '✅' : '❌';
            markdown += `**Tool Used**: \`${tool.tool}(${JSON.stringify(tool.args)})\`\n`;
            markdown += `${status} ${tool.result}\n\n`;
          }
        }
      }
      
      markdown += `---\n\n`;
    }
    
    return markdown;
  }

  private generateTitle(firstMessage: string): string {
    // Extract key words from the first message for a title
    const words = firstMessage.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    if (words.length === 0) {
      return 'New Conversation';
    }
    
    return words.join(' ').split('').map((char, i) => 
      i === 0 || words.join(' ')[i - 1] === ' ' ? char.toUpperCase() : char
    ).join('');
  }

  private generateSummary(): string {
    const userMessages = this.messages.filter(m => m.role === 'user').length;
    const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
    const firstMessage = this.messages[0]?.content.substring(0, 50) + '...';
    
    return `${userMessages} user messages, ${assistantMessages} responses. Started with: "${firstMessage}"`;
  }
}