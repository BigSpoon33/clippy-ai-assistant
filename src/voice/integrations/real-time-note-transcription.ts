/**
 * Real-Time Note Transcription Service
 * Provides live voice-to-text capabilities for note writing
 */

import { App, Editor, MarkdownView, Notice } from 'obsidian';
import ClippyPlugin from '../../main';
import { STTManager } from '../managers/stt-manager';
import { TranscriptionResult } from '../types/voice-types';

export interface TranscriptionConfig {
  // Insertion behavior
  insertMode: 'cursor' | 'append' | 'replace_selection';
  insertDelay: number; // ms between inserting interim results
  finalizeDelay: number; // ms to wait before finalizing text
  
  // Text processing
  autoCapitalize: boolean;
  autoPunctuation: boolean;
  autoFormatting: boolean;
  preserveFormatting: boolean;
  
  // Voice commands during transcription
  enableVoiceCommands: boolean;
  commandPrefix: string; // e.g., "clippy" for "clippy new paragraph"
  
  // UI feedback
  showLivePreview: boolean;
  showConfidence: boolean;
  highlightUnconfident: boolean;
  
  // Performance
  maxBufferSize: number; // characters
  cleanupInterval: number; // ms
}

export interface TranscriptionState {
  isActive: boolean;
  isListening: boolean;
  currentText: string;
  finalizedText: string;
  confidence: number;
  wordCount: number;
  startTime: Date | null;
  lastActivityTime: Date | null;
}

export interface VoiceCommand {
  pattern: string;
  action: (editor: Editor, params?: string[]) => void;
  description: string;
}

export class RealTimeNoteTranscription {
  private app: App;
  private plugin: ClippyPlugin;
  private sttManager: STTManager | null = null;
  
  private config: TranscriptionConfig;
  private state: TranscriptionState;
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  
  // Editor state
  private activeEditor: Editor | null = null;
  private insertionPoint: { line: number; ch: number } | null = null;
  private textBuffer: string = '';
  private interimBuffer: string = '';
  
  // UI elements
  private statusElement: HTMLElement | null = null;
  private previewElement: HTMLElement | null = null;
  
  // Timers
  private finalizeTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private insertTimer: NodeJS.Timeout | null = null;

  constructor(app: App, plugin: ClippyPlugin) {
    this.app = app;
    this.plugin = plugin;
    
    this.config = {
      insertMode: 'cursor',
      insertDelay: 200,
      finalizeDelay: 1500,
      autoCapitalize: true,
      autoPunctuation: true,
      autoFormatting: true,
      preserveFormatting: false,
      enableVoiceCommands: true,
      commandPrefix: 'clippy',
      showLivePreview: true,
      showConfidence: false,
      highlightUnconfident: true,
      maxBufferSize: 5000,
      cleanupInterval: 30000
    };
    
    this.state = {
      isActive: false,
      isListening: false,
      currentText: '',
      finalizedText: '',
      confidence: 0,
      wordCount: 0,
      startTime: null,
      lastActivityTime: null
    };
    
    this.initialize();
  }

  /**
   * Initialize the transcription service
   */
  private async initialize(): Promise<void> {
    console.log('[RealTimeTranscription] Initializing real-time transcription service...');
    
    // Get STT manager from plugin
    if (this.plugin.voiceSystemV2) {
      this.sttManager = (this.plugin.voiceSystemV2 as any).sttManager;
    }
    
    if (!this.sttManager) {
      console.warn('[RealTimeTranscription] STT Manager not available');
      return;
    }
    
    // Set up voice commands
    this.initializeVoiceCommands();
    
    // Set up periodic cleanup
    this.startCleanupTimer();
    
    console.log('[RealTimeTranscription] Service initialized successfully');
  }

  /**
   * Initialize built-in voice commands
   */
  private initializeVoiceCommands(): void {
    const commands: Array<[string, VoiceCommand]> = [
      ['new paragraph', {
        pattern: 'new paragraph|new line',
        action: (editor) => {
          this.insertText('\n\n');
          editor.setCursor(editor.getCursor().line + 2, 0);
        },
        description: 'Insert new paragraph'
      }],
      
      ['new bullet', {
        pattern: 'new bullet|bullet point',
        action: (editor) => {
          const cursor = editor.getCursor();
          const line = editor.getLine(cursor.line);
          const indent = line.match(/^\s*/)?.[0] || '';
          this.insertText(`\n${indent}- `);
        },
        description: 'Insert bullet point'
      }],
      
      ['number list', {
        pattern: 'number list|numbered list',
        action: (editor) => {
          const cursor = editor.getCursor();
          const line = editor.getLine(cursor.line);
          const indent = line.match(/^\s*/)?.[0] || '';
          this.insertText(`\n${indent}1. `);
        },
        description: 'Insert numbered list item'
      }],
      
      ['bold text', {
        pattern: 'bold|make bold',
        action: (editor, params) => {
          const text = params?.[0] || this.getLastWords(3);
          if (text) {
            this.replaceLastText(text, `**${text}**`);
          }
        },
        description: 'Make text bold'
      }],
      
      ['italic text', {
        pattern: 'italic|make italic',
        action: (editor, params) => {
          const text = params?.[0] || this.getLastWords(3);
          if (text) {
            this.replaceLastText(text, `*${text}*`);
          }
        },
        description: 'Make text italic'
      }],
      
      ['delete last', {
        pattern: 'delete last|undo last|remove last',
        action: (editor) => {
          this.undoLastInsertion();
        },
        description: 'Delete last insertion'
      }],
      
      ['stop transcription', {
        pattern: 'stop transcription|stop dictation|finish',
        action: () => {
          this.stopTranscription();
        },
        description: 'Stop transcription'
      }],
      
      ['insert heading', {
        pattern: 'heading (\\d+)|header (\\d+)',
        action: (editor, params) => {
          const level = parseInt(params?.[0] || '1');
          const hashes = '#'.repeat(Math.min(Math.max(level, 1), 6));
          this.insertText(`\n${hashes} `);
        },
        description: 'Insert heading (level 1-6)'
      }]
    ];
    
    for (const [key, command] of commands) {
      this.voiceCommands.set(key, command);
    }
    
    console.log('[RealTimeTranscription] Initialized', this.voiceCommands.size, 'voice commands');
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(): Promise<boolean> {
    if (this.state.isActive || !this.sttManager) {
      return false;
    }
    
    try {
      // Get active editor
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView?.editor) {
        new Notice('⚠️ Please open a note to start transcription');
        return false;
      }
      
      this.activeEditor = activeView.editor;
      this.insertionPoint = this.activeEditor.getCursor();
      
      // Start STT
      const success = await this.sttManager.startContinuousListening(
        (result: TranscriptionResult) => {
          this.handleTranscriptionResult(result);
        }
      );
      
      if (!success) {
        new Notice('❌ Failed to start voice transcription');
        return false;
      }
      
      // Update state
      this.state.isActive = true;
      this.state.isListening = true;
      this.state.startTime = new Date();
      this.state.lastActivityTime = new Date();
      this.textBuffer = '';
      this.interimBuffer = '';
      
      // Create status UI
      this.createStatusUI();
      
      new Notice('🎤 Real-time transcription started - start speaking');
      console.log('[RealTimeTranscription] Started successfully');
      
      return true;
      
    } catch (error) {
      console.error('[RealTimeTranscription] Failed to start:', error);
      new Notice(`❌ Transcription failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop real-time transcription
   */
  async stopTranscription(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }
    
    try {
      // Stop STT
      if (this.sttManager) {
        await this.sttManager.stopContinuousListening();
      }
      
      // Finalize any pending text
      await this.finalizePendingText();
      
      // Update state
      this.state.isActive = false;
      this.state.isListening = false;
      
      // Clean up timers
      this.clearTimers();
      
      // Remove status UI
      this.removeStatusUI();
      
      // Show completion stats
      const duration = this.state.startTime ? 
        Math.round((Date.now() - this.state.startTime.getTime()) / 1000) : 0;
      
      new Notice(`✅ Transcription completed (${this.state.wordCount} words, ${duration}s)`);
      console.log('[RealTimeTranscription] Stopped successfully');
      
      // Reset state
      this.resetState();
      
    } catch (error) {
      console.error('[RealTimeTranscription] Error stopping:', error);
    }
  }

  /**
   * Handle transcription results from STT engine
   */
  private handleTranscriptionResult(result: TranscriptionResult): void {
    if (!this.state.isActive || !this.activeEditor) {
      return;
    }
    
    this.state.lastActivityTime = new Date();
    this.state.confidence = result.confidence || 0;
    
    if (result.text && result.text.trim()) {
      if (result.isFinal) {
        this.handleFinalResult(result.text);
      } else {
        this.handleInterimResult(result.text);
      }
    }
    
    this.updateStatusUI();
  }

  /**
   * Handle final transcription result
   */
  private handleFinalResult(text: string): void {
    console.log('[RealTimeTranscription] Final result:', text);
    
    // Check for voice commands first
    if (this.config.enableVoiceCommands && this.processVoiceCommand(text)) {
      return;
    }
    
    // Process and format text
    const processedText = this.processText(text);
    
    // Add to buffer and schedule insertion
    this.textBuffer += processedText;
    this.interimBuffer = ''; // Clear interim buffer
    
    // Schedule finalization
    this.scheduleFinalInsertion();
    
    // Update word count
    this.state.wordCount += processedText.split(/\s+/).length;
  }

  /**
   * Handle interim transcription result
   */
  private handleInterimResult(text: string): void {
    if (!this.config.showLivePreview) {
      return;
    }
    
    console.log('[RealTimeTranscription] Interim result:', text);
    
    const processedText = this.processText(text);
    this.interimBuffer = processedText;
    
    // Schedule interim insertion
    this.scheduleInterimInsertion();
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    // Check if text starts with command prefix
    if (this.config.commandPrefix && !lowerText.startsWith(this.config.commandPrefix)) {
      return false;
    }
    
    // Remove command prefix
    const commandText = this.config.commandPrefix ? 
      lowerText.replace(this.config.commandPrefix, '').trim() :
      lowerText;
    
    // Find matching command
    for (const [key, command] of this.voiceCommands) {
      const regex = new RegExp(command.pattern, 'i');
      const match = commandText.match(regex);
      
      if (match && this.activeEditor) {
        console.log('[RealTimeTranscription] Executing voice command:', key);
        
        try {
          command.action(this.activeEditor, match.slice(1));
          this.updateStatusUI(`Command: ${key}`);
          return true;
        } catch (error) {
          console.error('[RealTimeTranscription] Command execution error:', error);
        }
      }
    }
    
    return false;
  }

  /**
   * Process text (formatting, punctuation, etc.)
   */
  private processText(text: string): string {
    let processed = text;
    
    // Auto-capitalize
    if (this.config.autoCapitalize) {
      processed = this.applyCapitalization(processed);
    }
    
    // Auto-punctuation
    if (this.config.autoPunctuation) {
      processed = this.applyPunctuation(processed);
    }
    
    // Auto-formatting
    if (this.config.autoFormatting) {
      processed = this.applyFormatting(processed);
    }
    
    return processed;
  }

  /**
   * Apply capitalization rules
   */
  private applyCapitalization(text: string): string {
    // Capitalize first letter of sentences
    return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
  }

  /**
   * Apply punctuation rules
   */
  private applyPunctuation(text: string): string {
    let processed = text;
    
    // Handle common punctuation voice commands
    processed = processed.replace(/\bcomma\b/gi, ',');
    processed = processed.replace(/\bperiod\b/gi, '.');
    processed = processed.replace(/\bquestion mark\b/gi, '?');
    processed = processed.replace(/\bexclamation mark\b/gi, '!');
    processed = processed.replace(/\bcolon\b/gi, ':');
    processed = processed.replace(/\bsemicolon\b/gi, ';');
    
    return processed;
  }

  /**
   * Apply formatting rules
   */
  private applyFormatting(text: string): string {
    let processed = text;
    
    // Remove extra spaces
    processed = processed.replace(/\s+/g, ' ');
    
    // Ensure space after insertions
    if (this.textBuffer && !processed.startsWith(' ')) {
      processed = ' ' + processed;
    }
    
    return processed;
  }

  /**
   * Schedule final text insertion
   */
  private scheduleFinalInsertion(): void {
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
    }
    
    this.finalizeTimer = setTimeout(() => {
      this.insertFinalText();
    }, this.config.finalizeDelay);
  }

  /**
   * Schedule interim text insertion
   */
  private scheduleInterimInsertion(): void {
    if (this.insertTimer) {
      clearTimeout(this.insertTimer);
    }
    
    this.insertTimer = setTimeout(() => {
      this.showInterimPreview();
    }, this.config.insertDelay);
  }

  /**
   * Insert final text into editor
   */
  private insertFinalText(): void {
    if (!this.activeEditor || !this.textBuffer.trim()) {
      return;
    }
    
    try {
      const textToInsert = this.textBuffer.trim();
      
      switch (this.config.insertMode) {
        case 'cursor':
          this.insertAtCursor(textToInsert);
          break;
        case 'append':
          this.appendToNote(textToInsert);
          break;
        case 'replace_selection':
          this.replaceSelection(textToInsert);
          break;
      }
      
      // Update finalized text
      this.state.finalizedText += textToInsert;
      this.state.currentText = '';
      this.textBuffer = '';
      
      console.log('[RealTimeTranscription] Inserted final text:', textToInsert.substring(0, 50) + '...');
      
    } catch (error) {
      console.error('[RealTimeTranscription] Error inserting final text:', error);
    }
  }

  /**
   * Show interim preview
   */
  private showInterimPreview(): void {
    if (!this.config.showLivePreview || !this.interimBuffer) {
      return;
    }
    
    this.state.currentText = this.interimBuffer;
    this.updatePreviewElement();
  }

  /**
   * Insert text at cursor position
   */
  private insertAtCursor(text: string): void {
    if (!this.activeEditor) return;
    
    const cursor = this.activeEditor.getCursor();
    this.activeEditor.replaceRange(text, cursor);
    
    // Update cursor position
    const lines = text.split('\n');
    const newLine = cursor.line + lines.length - 1;
    const newCh = lines.length === 1 ? 
      cursor.ch + text.length : 
      lines[lines.length - 1].length;
    
    this.activeEditor.setCursor(newLine, newCh);
  }

  /**
   * Insert text helper
   */
  private insertText(text: string): void {
    this.textBuffer += text;
    this.insertFinalText();
  }

  /**
   * Append text to end of note
   */
  private appendToNote(text: string): void {
    if (!this.activeEditor) return;
    
    const lastLine = this.activeEditor.lastLine();
    const lastLineLength = this.activeEditor.getLine(lastLine).length;
    
    this.activeEditor.replaceRange(text, { line: lastLine, ch: lastLineLength });
    this.activeEditor.setCursor(lastLine, lastLineLength + text.length);
  }

  /**
   * Replace current selection with text
   */
  private replaceSelection(text: string): void {
    if (!this.activeEditor) return;
    
    this.activeEditor.replaceSelection(text);
  }

  /**
   * Get last N words from buffer
   */
  private getLastWords(count: number): string {
    const words = (this.state.finalizedText + this.textBuffer).split(/\s+/);
    return words.slice(-count).join(' ');
  }

  /**
   * Replace last text occurrence
   */
  private replaceLastText(oldText: string, newText: string): void {
    if (!this.activeEditor) return;
    
    const content = this.activeEditor.getValue();
    const lastIndex = content.lastIndexOf(oldText);
    
    if (lastIndex >= 0) {
      const start = this.activeEditor.offsetToPos(lastIndex);
      const end = this.activeEditor.offsetToPos(lastIndex + oldText.length);
      
      this.activeEditor.replaceRange(newText, start, end);
    }
  }

  /**
   * Undo last insertion
   */
  private undoLastInsertion(): void {
    if (this.activeEditor) {
      this.activeEditor.undo();
    }
  }

  /**
   * Finalize any pending text
   */
  private async finalizePendingText(): Promise<void> {
    if (this.textBuffer.trim()) {
      this.insertFinalText();
    }
  }

  /**
   * Create status UI
   */
  private createStatusUI(): void {
    // Create status element in the status bar
    const statusBar = (this.app as any).statusBar;
    if (statusBar) {
      this.statusElement = statusBar.containerEl.createEl('div', {
        cls: 'status-bar-item plugin-clippy-transcription-status'
      });
      this.updateStatusUI();
    }
    
    // Create preview element if needed
    if (this.config.showLivePreview) {
      this.createPreviewElement();
    }
  }

  /**
   * Create preview element
   */
  private createPreviewElement(): void {
    const contentEl = document.querySelector('.workspace-leaf.mod-active .view-content');
    if (contentEl) {
      this.previewElement = contentEl.createEl('div', {
        cls: 'clippy-transcription-preview'
      });
      this.previewElement.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 8px 12px;
        max-width: 300px;
        font-size: 12px;
        opacity: 0.9;
        z-index: 1000;
        pointer-events: none;
      `;
    }
  }

  /**
   * Update status UI
   */
  private updateStatusUI(message?: string): void {
    if (!this.statusElement) return;
    
    const icon = this.state.isListening ? '🎤' : '⏸️';
    const confidenceText = this.config.showConfidence ? 
      ` (${Math.round(this.state.confidence * 100)}%)` : '';
    
    const text = message || 
      `${icon} Transcribing${confidenceText} - ${this.state.wordCount} words`;
    
    this.statusElement.textContent = text;
    
    // Update confidence color
    if (this.config.highlightUnconfident && this.state.confidence < 0.7) {
      this.statusElement.style.color = 'var(--text-error)';
    } else {
      this.statusElement.style.color = 'var(--text-normal)';
    }
  }

  /**
   * Update preview element
   */
  private updatePreviewElement(): void {
    if (!this.previewElement) return;
    
    const text = this.state.currentText || this.interimBuffer;
    if (text) {
      this.previewElement.textContent = `"${text}"`;
      this.previewElement.style.display = 'block';
    } else {
      this.previewElement.style.display = 'none';
    }
  }

  /**
   * Remove status UI
   */
  private removeStatusUI(): void {
    if (this.statusElement) {
      this.statusElement.remove();
      this.statusElement = null;
    }
    
    if (this.previewElement) {
      this.previewElement.remove();
      this.previewElement = null;
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }
    
    if (this.insertTimer) {
      clearTimeout(this.insertTimer);
      this.insertTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    // Trim buffers if they get too large
    if (this.textBuffer.length > this.config.maxBufferSize) {
      this.textBuffer = this.textBuffer.slice(-this.config.maxBufferSize / 2);
    }
    
    if (this.state.finalizedText.length > this.config.maxBufferSize * 2) {
      this.state.finalizedText = this.state.finalizedText.slice(-this.config.maxBufferSize);
    }
  }

  /**
   * Reset state
   */
  private resetState(): void {
    this.state = {
      isActive: false,
      isListening: false,
      currentText: '',
      finalizedText: '',
      confidence: 0,
      wordCount: 0,
      startTime: null,
      lastActivityTime: null
    };
    
    this.activeEditor = null;
    this.insertionPoint = null;
    this.textBuffer = '';
    this.interimBuffer = '';
  }

  /**
   * Toggle transcription
   */
  async toggleTranscription(): Promise<void> {
    if (this.state.isActive) {
      await this.stopTranscription();
    } else {
      await this.startTranscription();
    }
  }

  /**
   * Get current state
   */
  getState(): TranscriptionState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[RealTimeTranscription] Configuration updated');
  }

  /**
   * Get available voice commands
   */
  getVoiceCommands(): Array<{ key: string; pattern: string; description: string }> {
    return Array.from(this.voiceCommands.entries()).map(([key, cmd]) => ({
      key,
      pattern: cmd.pattern,
      description: cmd.description
    }));
  }

  /**
   * Add custom voice command
   */
  addVoiceCommand(key: string, command: VoiceCommand): void {
    this.voiceCommands.set(key, command);
    console.log('[RealTimeTranscription] Added voice command:', key);
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.sttManager;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.state.isActive) {
        await this.stopTranscription();
      }
      
      this.clearTimers();
      this.removeStatusUI();
      this.resetState();
      
      console.log('[RealTimeTranscription] Cleanup completed');
    } catch (error) {
      console.error('[RealTimeTranscription] Error during cleanup:', error);
    }
  }
}