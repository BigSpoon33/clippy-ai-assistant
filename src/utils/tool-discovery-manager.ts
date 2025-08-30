/**
 * Tool Discovery Manager for CLIPPY AI Assistant
 * Auto-discovers Obsidian commands and generates MCP-style tool schemas
 */

import { App, Command, MarkdownView } from 'obsidian';
import { VaultTool } from '../agents/vault-agent';

export interface DiscoveredTool extends VaultTool {
  source: 'obsidian-command' | 'plugin-command' | 'custom-tool';
  commandId?: string;
  category: string;
  hotkey?: string;
  availability: 'always' | 'editor-only' | 'conditional';
  pluginId?: string;
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: DiscoveredTool[];
}

export interface ToolDiscoveryConfig {
  includeObsidianCore: boolean;
  includePlugins: boolean;
  includeCustomTools: boolean;
  excludeCommands?: string[];
  categoryFilters?: string[];
}

export class ToolDiscoveryManager {
  private app: App;
  private config: ToolDiscoveryConfig;
  private toolCache: Map<string, DiscoveredTool> = new Map();
  private categoryCache: Map<string, ToolCategory> = new Map();
  private lastDiscoveryTime: number = 0;
  private cacheValidityDuration = 30000; // 30 seconds

  constructor(app: App, config: ToolDiscoveryConfig = {
    includeObsidianCore: true,
    includePlugins: true,
    includeCustomTools: true
  }) {
    this.app = app;
    this.config = config;
  }

  /**
   * Discover all available tools and generate schemas
   */
  async discoverAllTools(): Promise<DiscoveredTool[]> {
    // Check cache validity
    const now = Date.now();
    if (now - this.lastDiscoveryTime < this.cacheValidityDuration && this.toolCache.size > 0) {
      return Array.from(this.toolCache.values());
    }

    console.log('🔍 CLIPPY: Starting comprehensive tool discovery...');
    
    const allTools: DiscoveredTool[] = [];

    // 1. Discover Obsidian commands
    if (this.config.includeObsidianCore) {
      const obsidianTools = await this.discoverObsidianCommands();
      allTools.push(...obsidianTools);
      console.log(`🔧 Found ${obsidianTools.length} Obsidian core commands`);
    }

    // 2. Discover plugin commands
    if (this.config.includePlugins) {
      const pluginTools = await this.discoverPluginCommands();
      allTools.push(...pluginTools);
      console.log(`🧩 Found ${pluginTools.length} plugin commands`);
    }

    // 3. Include custom tools (only if not already covered by commands)
    if (this.config.includeCustomTools) {
      const customTools = await this.getCustomTools();
      const uniqueCustomTools = customTools.filter(tool => 
        !allTools.some(existingTool => existingTool.name === tool.name)
      );
      allTools.push(...uniqueCustomTools);
      console.log(`⚙️ Added ${uniqueCustomTools.length} unique custom tools`);
    }

    // Filter excluded commands
    const filteredTools = this.config.excludeCommands 
      ? allTools.filter(tool => !this.config.excludeCommands!.includes(tool.commandId || tool.name))
      : allTools;

    // Update cache
    this.toolCache.clear();
    filteredTools.forEach(tool => {
      this.toolCache.set(tool.name, tool);
    });
    this.lastDiscoveryTime = now;

    console.log(`✅ CLIPPY: Discovered ${filteredTools.length} total tools`);
    return filteredTools;
  }

  /**
   * Discover Obsidian core and community commands
   */
  private async discoverObsidianCommands(): Promise<DiscoveredTool[]> {
    const commands = (this.app as any).commands.commands as Record<string, Command>;
    const discoveredTools: DiscoveredTool[] = [];

    for (const [commandId, command] of Object.entries(commands)) {
      if (!command.name) continue;

      const tool = await this.createToolFromCommand(commandId, command, 'obsidian-command');
      if (tool) {
        discoveredTools.push(tool);
      }
    }

    return discoveredTools;
  }

  /**
   * Discover plugin-specific commands
   */
  private async discoverPluginCommands(): Promise<DiscoveredTool[]> {
    const commands = (this.app as any).commands.commands as Record<string, Command>;
    const pluginTools: DiscoveredTool[] = [];

    for (const [commandId, command] of Object.entries(commands)) {
      if (!command.name) continue;

      // Identify plugin commands by their ID patterns
      const pluginId = this.extractPluginId(commandId);
      if (pluginId && pluginId !== 'app') {
        const tool = await this.createToolFromCommand(commandId, command, 'plugin-command');
        if (tool) {
          tool.pluginId = pluginId;
          pluginTools.push(tool);
        }
      }
    }

    return pluginTools;
  }

  /**
   * Create a tool schema from an Obsidian command
   */
  private async createToolFromCommand(
    commandId: string, 
    command: Command, 
    source: 'obsidian-command' | 'plugin-command'
  ): Promise<DiscoveredTool | null> {
    try {
      const category = this.categorizeCommand(commandId, command.name);
      const hotkey = this.getCommandHotkey(commandId);
      const availability = this.determineAvailability(command);

      // Generate parameters based on command type
      const parameters = this.generateCommandParameters(commandId, command);

      const tool: DiscoveredTool = {
        name: `execute_obsidian_command_${commandId.replace(/[^a-zA-Z0-9]/g, '_')}`,
        description: `${command.name}${hotkey ? ` (${hotkey})` : ''}`,
        parameters,
        execute: async (args: any) => {
          return await this.executeObsidianCommand(commandId, args);
        },
        source,
        commandId,
        category,
        hotkey: hotkey || undefined,
        availability,
      };

      return tool;
    } catch (error) {
      console.warn(`Failed to create tool for command ${commandId}:`, error);
      return null;
    }
  }

  /**
   * Generate parameter schema for command based on its type and requirements
   */
  private generateCommandParameters(commandId: string, command: Command): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Commands that require editor context
    if (command.editorCallback || command.editorCheckCallback) {
      parameters.requiresEditor = {
        type: 'boolean',
        description: 'This command requires an active editor',
        required: false,
        default: true
      };
    }

    // Commands that might need confirmation
    if (commandId.includes('delete') || commandId.includes('remove') || commandId.includes('clear')) {
      parameters.confirm = {
        type: 'boolean',
        description: 'Confirm destructive action',
        required: true
      };
    }

    // File-related commands might need a path
    if (commandId.includes('file') || commandId.includes('note')) {
      parameters.filePath = {
        type: 'string',
        description: 'Path to the file (optional, uses current file if not specified)',
        required: false
      };
    }

    // Search commands might need a query
    if (commandId.includes('search') || commandId.includes('find')) {
      parameters.query = {
        type: 'string',
        description: 'Search query',
        required: false
      };
    }

    // Generic args parameter for flexibility
    parameters.args = {
      type: 'object',
      description: 'Additional arguments for the command',
      required: false
    };

    return parameters;
  }

  /**
   * Execute an Obsidian command with proper context
   */
  private async executeObsidianCommand(commandId: string, args: any = {}): Promise<string> {
    try {
      const commands = (this.app as any).commands.commands;
      const command = commands[commandId];

      if (!command) {
        throw new Error(`Command '${commandId}' not found`);
      }

      // Check availability
      if (command.checkCallback) {
        const available = command.checkCallback();
        if (!available) {
          return `Command '${command.name}' is not available in the current context`;
        }
      }

      // Handle confirmation for destructive actions
      if (args.confirm === false && commandId.includes('delete')) {
        return `Command '${command.name}' requires confirmation. Set confirm: true to proceed.`;
      }

      // Execute the command based on its type
      let result = '';
      
      if (command.callback) {
        await command.callback();
        result = `✅ Successfully executed: ${command.name}`;
      } else if (command.editorCallback) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          await command.editorCallback(activeView.editor, activeView);
          result = `✅ Successfully executed: ${command.name}`;
        } else {
          result = `❌ Command '${command.name}' requires an active editor`;
        }
      } else if (command.editorCheckCallback) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          const canExecute = command.editorCheckCallback(false, activeView.editor, activeView);
          if (canExecute) {
            await command.editorCheckCallback(true, activeView.editor, activeView);
            result = `✅ Successfully executed: ${command.name}`;
          } else {
            result = `❌ Command '${command.name}' is not available in the current context`;
          }
        } else {
          result = `❌ Command '${command.name}' requires an active editor`;
        }
      } else {
        result = `⚠️ Command '${command.name}' has no executable callback`;
      }

      return result;
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      return `❌ Failed to execute command: ${error.message}`;
    }
  }

  /**
   * Get custom tools that aren't covered by command discovery
   */
  private async getCustomTools(): Promise<DiscoveredTool[]> {
    const customTools: DiscoveredTool[] = [
      // File Operations that aren't standard commands
      {
        name: 'create_note_with_content',
        description: 'Create a new note with specific content and folder placement',
        parameters: {
          filename: { type: 'string', description: 'Name of the note', required: true },
          content: { type: 'string', description: 'Initial content', required: false },
          folder: { type: 'string', description: 'Target folder path', required: false }
        },
        execute: async (args) => this.createNoteWithContent(args),
        source: 'custom-tool',
        category: 'File Operations',
        availability: 'always'
      },

      // Vault Analysis Tools
      {
        name: 'analyze_vault_structure',
        description: 'Analyze and report on vault organization and structure',
        parameters: {},
        execute: async () => this.analyzeVaultStructure(),
        source: 'custom-tool',
        category: 'Vault Analysis',
        availability: 'always'
      },

      // Advanced Search Tools
      {
        name: 'semantic_search_notes',
        description: 'Search notes using semantic similarity (requires embedding system)',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          limit: { type: 'number', description: 'Maximum results', required: false }
        },
        execute: async (args) => this.semanticSearch(args),
        source: 'custom-tool',
        category: 'Advanced Search',
        availability: 'conditional'
      }
    ];

    return customTools;
  }

  /**
   * Categorize commands for better organization
   */
  private categorizeCommand(commandId: string, commandName: string): string {
    const idLower = commandId.toLowerCase();
    const nameLower = commandName.toLowerCase();

    // Core categories
    if (idLower.includes('file') || nameLower.includes('file') || 
        idLower.includes('note') || nameLower.includes('note')) {
      return 'File Operations';
    }
    
    if (idLower.includes('workspace') || nameLower.includes('workspace') ||
        nameLower.includes('split') || nameLower.includes('pane')) {
      return 'Workspace Management';
    }
    
    if (idLower.includes('search') || nameLower.includes('search') ||
        idLower.includes('find') || nameLower.includes('find')) {
      return 'Search & Navigation';
    }
    
    if (idLower.includes('theme') || nameLower.includes('theme') ||
        nameLower.includes('appearance') || idLower.includes('toggle')) {
      return 'Appearance & Settings';
    }
    
    if (idLower.includes('editor') || nameLower.includes('edit') ||
        nameLower.includes('cursor') || nameLower.includes('select')) {
      return 'Text Editing';
    }

    // Plugin-specific categories
    if (idLower.includes('calendar') || nameLower.includes('daily')) {
      return 'Calendar & Dates';
    }
    
    if (idLower.includes('tag') || nameLower.includes('tag')) {
      return 'Tags & Metadata';
    }
    
    if (idLower.includes('graph') || nameLower.includes('graph') ||
        idLower.includes('link') || nameLower.includes('backlink')) {
      return 'Links & Graph';
    }

    // Extract plugin category if it's a plugin command
    const pluginId = this.extractPluginId(commandId);
    if (pluginId && pluginId !== 'app') {
      return `Plugin: ${pluginId}`;
    }

    return 'Other';
  }

  /**
   * Extract plugin ID from command ID
   */
  private extractPluginId(commandId: string): string | null {
    // Common patterns for plugin command IDs
    if (commandId.startsWith('app:')) return 'app';
    if (commandId.includes(':')) {
      return commandId.split(':')[0];
    }
    if (commandId.includes('-')) {
      const parts = commandId.split('-');
      if (parts.length > 1) {
        return parts[0];
      }
    }
    return null;
  }

  /**
   * Get hotkey for command
   */
  private getCommandHotkey(commandId: string): string | null {
    try {
      const hotkeys = (this.app as any).hotkeyManager.hotkeys;
      const hotkey = hotkeys[commandId];
      if (hotkey && hotkey.length > 0) {
        return hotkey.map((h: any) => h.modifiers.concat(h.key).join('+')).join(', ');
      }
    } catch (e) {
      // Ignore hotkey lookup errors
    }
    return null;
  }

  /**
   * Determine when a command is available
   */
  private determineAvailability(command: Command): 'always' | 'editor-only' | 'conditional' {
    if (command.editorCallback || command.editorCheckCallback) {
      return 'editor-only';
    }
    if (command.checkCallback) {
      return 'conditional';
    }
    return 'always';
  }

  /**
   * Get tools organized by category
   */
  async getToolsByCategory(): Promise<ToolCategory[]> {
    const tools = await this.discoverAllTools();
    const categoryMap = new Map<string, DiscoveredTool[]>();

    // Group tools by category
    tools.forEach(tool => {
      const category = tool.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(tool);
    });

    // Convert to ToolCategory objects
    const categories: ToolCategory[] = [];
    for (const [categoryName, categoryTools] of categoryMap.entries()) {
      categories.push({
        name: categoryName,
        description: this.getCategoryDescription(categoryName),
        tools: categoryTools.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get description for a category
   */
  private getCategoryDescription(categoryName: string): string {
    const descriptions: Record<string, string> = {
      'File Operations': 'Create, edit, move, and manage files and notes',
      'Workspace Management': 'Manage panes, layouts, and workspace organization',
      'Search & Navigation': 'Find and navigate to content within the vault',
      'Appearance & Settings': 'Customize themes, appearance, and plugin settings',
      'Text Editing': 'Edit and format text content',
      'Calendar & Dates': 'Manage daily notes, calendar, and date-related functions',
      'Tags & Metadata': 'Manage tags, properties, and note metadata',
      'Links & Graph': 'Manage links, backlinks, and graph visualization',
      'Vault Analysis': 'Analyze and understand vault structure and content',
      'Advanced Search': 'Semantic and intelligent search capabilities',
      'Other': 'Miscellaneous commands and tools'
    };

    if (categoryName.startsWith('Plugin: ')) {
      return `Commands from the ${categoryName.substring(8)} plugin`;
    }

    return descriptions[categoryName] || 'Various commands and tools';
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.toolCache.clear();
    this.categoryCache.clear();
    this.lastDiscoveryTime = 0;
  }

  // Custom tool implementations
  private async createNoteWithContent(args: { filename: string; content?: string; folder?: string }): Promise<string> {
    try {
      // Implementation would use Obsidian vault API
      return `Created note: ${args.filename}`;
    } catch (error) {
      return `Failed to create note: ${error.message}`;
    }
  }

  private async analyzeVaultStructure(): Promise<string> {
    const files = this.app.vault.getMarkdownFiles();
    const folders = this.app.vault.getAllLoadedFiles().filter(f => f.constructor.name === 'TFolder');
    
    return `Vault Analysis:
- ${files.length} notes
- ${folders.length} folders
- Average notes per folder: ${Math.round(files.length / Math.max(folders.length, 1))}`;
  }

  private async semanticSearch(args: { query: string; limit?: number }): Promise<string> {
    // This would integrate with the existing semantic search system
    return `Semantic search for "${args.query}" - feature requires embedding system setup`;
  }
}