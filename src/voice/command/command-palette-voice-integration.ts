/**
 * Command Palette Voice Integration System
 * Enables voice control of Obsidian's command palette and all registered commands
 */

import { App, Command, PluginManifest, MarkdownView } from 'obsidian';
import { VoiceCommandInterpreter, CommandMatch } from './voice-command-interpreter';

export interface PaletteCommand {
  id: string;
  name: string;
  plugin?: PluginManifest;
  category?: string;
  hotkey?: string;
  voicePatterns?: string[];
}

export interface VoicePaletteMatch {
  command: PaletteCommand;
  confidence: number;
  source: 'clippy' | 'obsidian' | 'plugin';
  intent: string;
}

export interface VoicePaletteConfig {
  // Voice recognition settings
  fuzzyMatchThreshold: number;
  minConfidenceThreshold: number;
  maxSuggestions: number;
  
  // Command filtering
  enablePluginCommands: boolean;
  enableCoreCommands: boolean;
  excludePatterns: string[];
  
  // Voice interaction
  confirmationRequired: boolean;
  suggestionsEnabled: boolean;
  contextualFiltering: boolean;
}

export type VoicePaletteEventType = 
  | 'command_executed'
  | 'command_suggested' 
  | 'command_not_found'
  | 'disambiguation_needed';

export interface VoicePaletteEvent {
  type: VoicePaletteEventType;
  timestamp: Date;
  voiceInput: string;
  matches?: VoicePaletteMatch[];
  executedCommand?: PaletteCommand;
  details?: string;
}

export type VoicePaletteListener = (event: VoicePaletteEvent) => void;

export class CommandPaletteVoiceIntegration {
  private app: App;
  private config: VoicePaletteConfig;
  private voiceCommandInterpreter: VoiceCommandInterpreter;
  private listeners: VoicePaletteListener[] = [];
  
  private paletteCommands: PaletteCommand[] = [];
  private commandIndex: Map<string, PaletteCommand> = new Map();
  
  constructor(app: App, voiceCommandInterpreter: VoiceCommandInterpreter, config?: Partial<VoicePaletteConfig>) {
    this.app = app;
    this.voiceCommandInterpreter = voiceCommandInterpreter;
    
    this.config = {
      fuzzyMatchThreshold: 0.4,
      minConfidenceThreshold: 0.5,
      maxSuggestions: 5,
      enablePluginCommands: true,
      enableCoreCommands: true,
      excludePatterns: ['debug', 'developer', 'dev-tools'],
      confirmationRequired: false,
      suggestionsEnabled: true,
      contextualFiltering: true,
      ...config
    };
    
    this.initializeCommandPalette();
  }

  /**
   * Initialize command palette integration
   */
  private async initializeCommandPalette(): Promise<void> {
    console.log('[CommandPaletteVoice] Initializing command palette integration...');
    
    // Get all registered commands from Obsidian
    await this.loadObsidianCommands();
    
    // Index commands for faster lookup
    this.buildCommandIndex();
    
    console.log('[CommandPaletteVoice] Loaded', this.paletteCommands.length, 'commands');
  }

  /**
   * Load all available Obsidian commands
   */
  private async loadObsidianCommands(): Promise<void> {
    const commands: PaletteCommand[] = [];
    
    // Get commands from app
    const appCommands = (this.app as any).commands?.commands;
    if (appCommands) {
      for (const [commandId, command] of Object.entries(appCommands)) {
        const cmd = command as any;
        
        // Skip excluded commands
        if (this.shouldExcludeCommand(commandId, cmd.name)) {
          continue;
        }
        
        // Determine command source and category
        const source = this.getCommandSource(commandId);
        const category = this.getCommandCategory(commandId, cmd.name);
        
        // Generate voice patterns for the command
        const voicePatterns = this.generateVoicePatterns(cmd.name);
        
        commands.push({
          id: commandId,
          name: cmd.name || commandId,
          plugin: cmd.plugin,
          category,
          hotkey: this.getCommandHotkey(commandId),
          voicePatterns
        });
      }
    }
    
    this.paletteCommands = commands;
  }

  /**
   * Build command index for faster lookup
   */
  private buildCommandIndex(): void {
    this.commandIndex.clear();
    
    for (const command of this.paletteCommands) {
      this.commandIndex.set(command.id, command);
      
      // Also index by name variations
      const nameVariations = [
        command.name.toLowerCase(),
        command.name.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
        command.name.toLowerCase().replace(/\s+/g, '-')
      ];
      
      for (const variation of nameVariations) {
        if (!this.commandIndex.has(variation)) {
          this.commandIndex.set(variation, command);
        }
      }
    }
  }

  /**
   * Process voice input for command palette
   */
  async processVoiceCommand(voiceInput: string): Promise<{
    success: boolean;
    message: string;
    matches?: VoicePaletteMatch[];
    executed?: PaletteCommand;
  }> {
    try {
      console.log('[CommandPaletteVoice] Processing command:', voiceInput);
      
      // First check CLIPPY-specific commands
      const clippyMatches = this.voiceCommandInterpreter.interpretCommand(voiceInput);
      
      if (clippyMatches.length > 0 && clippyMatches[0].confidence > 0.7) {
        this.emitEvent('command_executed', voiceInput, undefined, {
          details: `Executed CLIPPY command: ${clippyMatches[0].command.name}`
        });
        
        return {
          success: true,
          message: `✅ Executed CLIPPY command: ${clippyMatches[0].command.name}`,
          matches: [],
          executed: {
            id: clippyMatches[0].command.id,
            name: clippyMatches[0].command.name,
            category: 'CLIPPY'
          }
        };
      }
      
      // Find command palette matches
      const matches = this.findCommandMatches(voiceInput);
      
      if (matches.length === 0) {
        this.emitEvent('command_not_found', voiceInput);
        return {
          success: false,
          message: `No commands found for: "${voiceInput}". Try being more specific.`,
          matches: []
        };
      }
      
      const bestMatch = matches[0];
      
      // Execute if confidence is high enough
      if (bestMatch.confidence >= this.config.minConfidenceThreshold) {
        const executed = await this.executeCommand(bestMatch.command);
        
        if (executed) {
          this.emitEvent('command_executed', voiceInput, [bestMatch], {
            details: `Executed: ${bestMatch.command.name}`
          });
          
          return {
            success: true,
            message: `✅ Executed: ${bestMatch.command.name}`,
            matches,
            executed: bestMatch.command
          };
        } else {
          return {
            success: false,
            message: `❌ Failed to execute: ${bestMatch.command.name}`,
            matches
          };
        }
      } else {
        // Suggest matches if confidence is moderate
        this.emitEvent('command_suggested', voiceInput, matches);
        
        const suggestions = matches
          .slice(0, this.config.maxSuggestions)
          .map(m => `${m.command.name} (${Math.round(m.confidence * 100)}%)`)
          .join(', ');
        
        return {
          success: false,
          message: `Did you mean: ${suggestions}?`,
          matches
        };
      }
      
    } catch (error) {
      console.error('[CommandPaletteVoice] Command processing error:', error);
      return {
        success: false,
        message: `❌ Command processing failed: ${error.message}`,
        matches: []
      };
    }
  }


  /**
   * Execute a command from the palette
   */
  private async executeCommand(command: PaletteCommand): Promise<boolean> {
    try {
      // Get the command from Obsidian's command system
      const obsidianCommands = (this.app as any).commands?.commands;
      const obsidianCommand = obsidianCommands?.get?.(command.id) || obsidianCommands?.[command.id];
      
      if (!obsidianCommand) {
        console.warn('[CommandPaletteVoice] Command not found in Obsidian:', command.id);
        return false;
      }
      
      // Execute the command
      if (typeof obsidianCommand.callback === 'function') {
        await obsidianCommand.callback();
        return true;
      } else if (typeof obsidianCommand.editorCallback === 'function') {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          await obsidianCommand.editorCallback(activeView.editor, activeView);
          return true;
        } else {
          console.warn('[CommandPaletteVoice] Editor required but not available for:', command.id);
          return false;
        }
      } else if (typeof obsidianCommand.checkCallback === 'function') {
        const canExecute = obsidianCommand.checkCallback(false);
        return canExecute;
      }
      
      return false;
      
    } catch (error) {
      console.error('[CommandPaletteVoice] Command execution error:', error);
      return false;
    }
  }

  /**
   * Calculate confidence for command match
   */
  private calculateCommandConfidence(normalizedInput: string, command: PaletteCommand): number {
    let maxConfidence = 0;
    
    // Check against command name
    const nameConfidence = this.calculateTextSimilarity(normalizedInput, command.name.toLowerCase());
    maxConfidence = Math.max(maxConfidence, nameConfidence);
    
    // Check against generated voice patterns
    if (command.voicePatterns) {
      for (const pattern of command.voicePatterns) {
        const patternConfidence = this.calculateTextSimilarity(normalizedInput, pattern);
        maxConfidence = Math.max(maxConfidence, patternConfidence);
      }
    }
    
    // Bonus for category match
    if (command.category) {
      const categoryWords = command.category.toLowerCase().split(/\s+/);
      const inputWords = normalizedInput.split(/\s+/);
      
      for (const categoryWord of categoryWords) {
        if (inputWords.includes(categoryWord)) {
          maxConfidence += 0.1;
        }
      }
    }
    
    return Math.min(1.0, maxConfidence);
  }

  /**
   * Calculate text similarity using word-based approach
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    
    let matchedWords = 0;
    const totalWords = Math.max(words1.length, words2.length);
    
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matchedWords++;
          break;
        }
      }
    }
    
    return matchedWords / totalWords;
  }

  /**
   * Generate voice patterns for command names
   */
  private generateVoicePatterns(commandName: string): string[] {
    const patterns: string[] = [];
    const normalized = commandName.toLowerCase();
    
    // Direct pattern
    patterns.push(normalized);
    
    // Remove plugin prefixes
    const withoutPrefix = normalized.replace(/^[a-z-]+:\s*/, '');
    if (withoutPrefix !== normalized) {
      patterns.push(withoutPrefix);
    }
    
    // Convert actions to voice-friendly patterns
    const actionPatterns = {
      'toggle': ['toggle', 'turn on', 'turn off', 'switch'],
      'open': ['open', 'show', 'display'],
      'create': ['create', 'make', 'new'],
      'delete': ['delete', 'remove', 'clear'],
      'search': ['search', 'find', 'look for'],
      'format': ['format', 'clean up', 'fix'],
      'export': ['export', 'save as', 'convert to']
    };
    
    for (const [action, alternatives] of Object.entries(actionPatterns)) {
      if (normalized.includes(action)) {
        for (const alt of alternatives) {
          const pattern = normalized.replace(action, alt);
          if (pattern !== normalized) {
            patterns.push(pattern);
          }
        }
      }
    }
    
    // Add common voice variations
    patterns.push(`run ${normalized}`);
    patterns.push(`execute ${normalized}`);
    patterns.push(`start ${normalized}`);
    
    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Normalize voice input for command matching
   */
  private normalizeVoiceInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      // Remove voice command artifacts
      .replace(/^(ok|hey|please|can you|could you|i want to|i need to)\s+/i, '')
      .replace(/[.,!?;:]/g, '')
      // Common voice recognition fixes
      .replace(/\bopened\b/g, 'open')
      .replace(/\bcreated\b/g, 'create')
      .replace(/\bstarted\b/g, 'start')
      .trim();
  }

  /**
   * Should exclude command from voice control
   */
  private shouldExcludeCommand(commandId: string, commandName: string): boolean {
    const lowerId = commandId.toLowerCase();
    const lowerName = commandName?.toLowerCase() || '';
    
    // Exclude debug/developer commands
    for (const pattern of this.config.excludePatterns) {
      if (lowerId.includes(pattern) || lowerName.includes(pattern)) {
        return true;
      }
    }
    
    // Exclude commands that don't make sense for voice
    const excludePatterns = [
      'hotkey', 'shortcut', 'key-binding',
      'debug', 'console', 'dev-tools',
      'toggle-dev', 'inspector',
      'vim-mode', 'modal', 'dialog'
    ];
    
    return excludePatterns.some(pattern => 
      lowerId.includes(pattern) || lowerName.includes(pattern)
    );
  }

  /**
   * Get command source (core Obsidian, plugin, or CLIPPY)
   */
  private getCommandSource(commandId: string): string {
    if (commandId.startsWith('clippy-')) {
      return 'clippy';
    } else if (commandId.includes(':') || commandId.includes('-')) {
      return 'plugin';
    } else {
      return 'obsidian';
    }
  }

  /**
   * Get command category for grouping
   */
  private getCommandCategory(commandId: string, commandName: string): string {
    const lowerId = commandId.toLowerCase();
    const lowerName = commandName?.toLowerCase() || '';
    
    // CLIPPY categories
    if (lowerId.startsWith('clippy-')) {
      if (lowerId.includes('research')) return 'Research';
      if (lowerId.includes('voice') || lowerId.includes('speak') || lowerId.includes('listen')) return 'Voice';
      if (lowerId.includes('tag')) return 'Tagging';
      if (lowerId.includes('vault') || lowerId.includes('agent')) return 'Vault Agent';
      if (lowerId.includes('chat') || lowerId.includes('ai')) return 'AI Chat';
      return 'CLIPPY';
    }
    
    // Core Obsidian categories
    if (lowerName.includes('file') || lowerName.includes('note')) return 'File Management';
    if (lowerName.includes('search') || lowerName.includes('find')) return 'Search';
    if (lowerName.includes('view') || lowerName.includes('pane')) return 'Interface';
    if (lowerName.includes('format') || lowerName.includes('edit')) return 'Editing';
    if (lowerName.includes('export') || lowerName.includes('import')) return 'Import/Export';
    
    return 'General';
  }

  /**
   * Get command hotkey if available
   */
  private getCommandHotkey(commandId: string): string | undefined {
    try {
      const hotkeys = (this.app as any).hotkeyManager?.getHotkeys?.(commandId);
      if (hotkeys && hotkeys.length > 0) {
        return hotkeys[0].key;
      }
    } catch (error) {
      // Ignore errors in hotkey lookup
    }
    return undefined;
  }

  /**
   * Get available commands for current context
   */
  getAvailableCommands(): PaletteCommand[] {
    if (!this.config.contextualFiltering) {
      return this.paletteCommands;
    }
    
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const hasActiveEditor = !!activeView?.editor;
    const hasActiveFile = !!activeView?.file;
    
    return this.paletteCommands.filter(command => {
      // Check if command requires editor context
      const requiresEditor = command.id.includes('editor') || 
                           command.name.toLowerCase().includes('editor') ||
                           command.name.toLowerCase().includes('current note');
      
      return !requiresEditor || hasActiveEditor;
    });
  }

  /**
   * Get command suggestions for voice input
   */
  getCommandSuggestions(voiceInput: string): VoicePaletteMatch[] {
    const matches = this.findCommandMatches(voiceInput);
    return matches.slice(0, this.config.maxSuggestions);
  }

  /**
   * Find command matches (internal method)
   */
  private findCommandMatches(voiceInput: string): VoicePaletteMatch[] {
    const normalizedInput = this.normalizeVoiceInput(voiceInput);
    const matches: VoicePaletteMatch[] = [];
    
    const availableCommands = this.getAvailableCommands();
    
    for (const command of availableCommands) {
      const confidence = this.calculateCommandConfidence(normalizedInput, command);
      
      if (confidence >= this.config.fuzzyMatchThreshold) {
        matches.push({
          command,
          confidence,
          source: this.getCommandSource(command.id) as any,
          intent: normalizedInput
        });
      }
    }
    
    // Sort by confidence and source priority (CLIPPY first)
    matches.sort((a, b) => {
      if (a.source === 'clippy' && b.source !== 'clippy') return -1;
      if (b.source === 'clippy' && a.source !== 'clippy') return 1;
      return b.confidence - a.confidence;
    });
    
    return matches;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: VoicePaletteListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: VoicePaletteListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VoicePaletteConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[CommandPaletteVoice] Configuration updated');
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): PaletteCommand | undefined {
    return this.commandIndex.get(commandId);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): PaletteCommand[] {
    return this.paletteCommands.filter(cmd => cmd.category === category);
  }

  /**
   * Refresh command list (reload from Obsidian)
   */
  async refreshCommands(): Promise<void> {
    console.log('[CommandPaletteVoice] Refreshing command list...');
    await this.loadObsidianCommands();
    this.buildCommandIndex();
    console.log('[CommandPaletteVoice] Refreshed with', this.paletteCommands.length, 'commands');
  }

  private emitEvent(
    type: VoicePaletteEventType, 
    voiceInput: string, 
    matches?: VoicePaletteMatch[], 
    extra?: Partial<VoicePaletteEvent>
  ): void {
    const event: VoicePaletteEvent = {
      type,
      timestamp: new Date(),
      voiceInput,
      matches,
      ...extra
    };
    
    console.log('[CommandPaletteVoice] Event:', event);
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CommandPaletteVoice] Error in event listener:', error);
      }
    });
  }
}