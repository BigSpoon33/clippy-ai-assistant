/**
 * CLIPPY AI Assistant - Vault Agent
 * AI agent with comprehensive vault management capabilities
 */

import { App, TFile, Vault, MetadataCache, normalizePath, TFolder, MarkdownView } from 'obsidian';
import { ClippySettings } from '../types';
import { ProviderFactory } from '../ai/provider-factory';

export interface VaultTool {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
  execute: (args: any) => Promise<any>;
}

export interface AgentContext {
  currentNote?: TFile;
  workingDirectory?: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId: string;
}

/**
 * Vault Agent - AI assistant with comprehensive vault management tools
 */
export class VaultAgent {
  private app: App;
  private settings: ClippySettings;
  private tools: Map<string, VaultTool> = new Map();
  private vault: Vault;
  private metadataCache: MetadataCache;

  constructor(app: App, settings: ClippySettings) {
    this.app = app;
    this.settings = settings;
    this.vault = app.vault;
    this.metadataCache = app.metadataCache;
    this.initializeTools();
  }

  /**
   * Initialize all available vault tools
   */
  private initializeTools(): void {
    const tools: VaultTool[] = [
      // File Operations
      {
        name: 'create_note',
        description: 'Create a new note with specified content',
        parameters: {
          filename: { type: 'string', description: 'Name of the note to create (with or without .md extension)', required: true },
          content: { type: 'string', description: 'Content for the new note', required: false },
          folder: { type: 'string', description: 'Folder path where to create the note (optional)', required: false }
        },
        execute: this.createNote.bind(this)
      },
      {
        name: 'read_note',
        description: 'Read the content of an existing note',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note to read', required: true }
        },
        execute: this.readNote.bind(this)
      },
      {
        name: 'update_note',
        description: 'Update the content of an existing note',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note to update', required: true },
          content: { type: 'string', description: 'New content for the note', required: true },
          append: { type: 'boolean', description: 'Whether to append to existing content (default: false)', required: false }
        },
        execute: this.updateNote.bind(this)
      },
      {
        name: 'delete_note',
        description: 'Delete a note from the vault',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note to delete', required: true },
          confirm: { type: 'boolean', description: 'Confirmation that deletion is intended', required: true }
        },
        execute: this.deleteNote.bind(this)
      },
      {
        name: 'rename_note',
        description: 'Rename or move a note',
        parameters: {
          oldPath: { type: 'string', description: 'Current path of the note', required: true },
          newPath: { type: 'string', description: 'New path/name for the note', required: true }
        },
        execute: this.renameNote.bind(this)
      },

      // Search and Discovery
      {
        name: 'search_notes',
        description: 'Search for notes containing specific text',
        parameters: {
          query: { type: 'string', description: 'Search query text', required: true },
          limit: { type: 'number', description: 'Maximum number of results (default: 10)', required: false }
        },
        execute: this.searchNotes.bind(this)
      },
      {
        name: 'list_notes',
        description: 'List all notes in the vault or a specific folder',
        parameters: {
          folder: { type: 'string', description: 'Folder path to list (optional, lists all if not specified)', required: false },
          recursive: { type: 'boolean', description: 'Include subfolders (default: true)', required: false }
        },
        execute: this.listNotes.bind(this)
      },
      {
        name: 'find_note_by_tag',
        description: 'Find notes that contain specific tags',
        parameters: {
          tag: { type: 'string', description: 'Tag to search for (without #)', required: true },
          limit: { type: 'number', description: 'Maximum number of results (default: 10)', required: false }
        },
        execute: this.findNotesByTag.bind(this)
      },

      // Folder Operations
      {
        name: 'create_folder',
        description: 'Create a new folder in the vault',
        parameters: {
          path: { type: 'string', description: 'Path of the folder to create', required: true }
        },
        execute: this.createFolder.bind(this)
      },
      {
        name: 'list_folders',
        description: 'List all folders in the vault',
        parameters: {},
        execute: this.listFolders.bind(this)
      },

      // Template Operations
      {
        name: 'create_from_template',
        description: 'Create a new note from an existing template',
        parameters: {
          templateName: { type: 'string', description: 'Name of the template note', required: true },
          newNoteName: { type: 'string', description: 'Name for the new note', required: true },
          variables: { type: 'object', description: 'Variables to substitute in template (optional)', required: false }
        },
        execute: this.createFromTemplate.bind(this)
      },

      // Metadata Operations
      {
        name: 'get_note_metadata',
        description: 'Get metadata information about a note (frontmatter, links, tags, etc.)',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note', required: true }
        },
        execute: this.getNoteMetadata.bind(this)
      },
      {
        name: 'add_frontmatter',
        description: 'Add or update frontmatter properties in a note',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note', required: true },
          properties: { type: 'object', description: 'Object containing frontmatter properties to add/update', required: true }
        },
        execute: this.addFrontmatter.bind(this)
      },

      // Link Operations
      {
        name: 'find_backlinks',
        description: 'Find all notes that link to a specific note',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the target note', required: true }
        },
        execute: this.findBacklinks.bind(this)
      },
      {
        name: 'find_outgoing_links',
        description: 'Find all links from a specific note to other notes',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the source note', required: true }
        },
        execute: this.findOutgoingLinks.bind(this)
      },

      // Analytics
      {
        name: 'get_vault_stats',
        description: 'Get statistics about the vault (note count, word count, etc.)',
        parameters: {},
        execute: this.getVaultStats.bind(this)
      },
      {
        name: 'analyze_note',
        description: 'Perform AI analysis on a note for insights, summary, and suggestions',
        parameters: {
          filename: { type: 'string', description: 'Name or path of the note to analyze', required: true }
        },
        execute: this.analyzeNote.bind(this)
      },
      {
        name: 'execute_command',
        description: 'Execute any Obsidian command from the command palette by name or ID',
        parameters: {
          command: { type: 'string', description: 'Command name or ID to execute (e.g., "Toggle dark mode", "app:reload", "workspace:split-vertical")', required: true },
          searchType: { type: 'string', description: 'How to search for command: "name" (by display name) or "id" (by command ID)', required: false }
        },
        execute: this.executeCommand.bind(this)
      },
      {
        name: 'list_commands',
        description: 'List available Obsidian commands from the command palette',
        parameters: {
          filter: { type: 'string', description: 'Optional filter to search for specific commands by name', required: false },
          limit: { type: 'number', description: 'Maximum number of commands to return (default: 20)', required: false }
        },
        execute: this.listCommands.bind(this)
      },
      {
        name: 'find_command',
        description: 'Intelligently find and recommend the best command for a user request when unsure which command to use',
        parameters: {
          intent: { type: 'string', description: 'Description of what the user wants to do (e.g., "change theme", "split window", "toggle sidebar")', required: true },
          limit: { type: 'number', description: 'Maximum number of recommendations (default: 5)', required: false }
        },
        execute: this.findCommand.bind(this)
      }
    ];

    // Register all tools
    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    console.log(`VaultAgent: Initialized ${tools.length} vault management tools`);
  }

  /**
   * Get all available tools for the AI agent
   */
  getAvailableTools(): VaultTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with provided arguments
   */
  async executeTool(toolName: string, args: any, _context: AgentContext): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    try {
      console.log(`VaultAgent: Executing tool '${toolName}' with args:`, args);
      const result = await tool.execute(args);
      console.log(`VaultAgent: Tool '${toolName}' completed successfully`);
      return result;
    } catch (error) {
      console.error(`VaultAgent: Tool '${toolName}' failed:`, error);
      throw error;
    }
  }

  /**
   * Process user message with AI and execute any requested vault operations
   */
  async processMessage(message: string, context: AgentContext): Promise<string> {
    try {
      const aiProvider = await ProviderFactory.createProvider(this.settings);
      
      // Create system prompt with available tools
      const toolsDescription = this.getAvailableTools()
        .map(tool => {
          const params = Object.entries(tool.parameters)
            .map(([name, param]) => `${name}: ${param.type} - ${param.description}${param.required ? ' (required)' : ''}`)
            .join(', ');
          return `${tool.name}(${params}) - ${tool.description}`;
        })
        .join('\n');

      const systemPrompt = `You are CLIPPY, an AI assistant for Obsidian vault management. You have access to powerful tools for managing notes, folders, and content.

AVAILABLE TOOLS:
${toolsDescription}

INSTRUCTIONS:
- When a user asks you to perform vault operations, use the appropriate tools
- Always confirm destructive operations (delete, rename) before executing
- Provide helpful responses explaining what you did
- If you need to use a tool, describe what you're going to do, then execute it
- You can chain multiple tool operations to complete complex tasks
- Format tool calls as: TOOL_CALL: tool_name({"param": "value"})

COMMAND PALETTE INTELLIGENCE:
- When users ask to perform actions but you're unsure which Obsidian command to use, ALWAYS use find_command first
- Use find_command({"intent": "description of what user wants"}) to get intelligent recommendations
- The find_command tool will automatically execute commands with >=90% confidence match
- If a command is auto-executed, find_command will return a simple action phrase like "Cycling between light mode styles"
- If no high-confidence match is found, it will show ranked recommendations for you to choose from
- Only use execute_command manually if find_command shows recommendations instead of auto-executing

AUTO-EXECUTION BEHAVIOR:
- For requests like "toggle light mode" → find_command will auto-execute the best match (>=90%) and return "Toggling light mode"
- For ambiguous requests → find_command will show ranked options for manual selection
- When find_command auto-executes, simply acknowledge the action: "Done! [action phrase from find_command]"

EXAMPLES:
- User: "toggle dark mode" → TOOL_CALL: find_command({"intent": "toggle dark mode"}) → Response: "Done! Toggling dark mode"
- User: "split the window vertically" → TOOL_CALL: find_command({"intent": "split window vertically"}) → Response: "Done! Splitting window vertically"  
- User: "open command palette" → TOOL_CALL: find_command({"intent": "command palette"}) → Response: "Done! Opening command palette"

CURRENT CONTEXT:
- Vault contains ${this.vault.getMarkdownFiles().length} notes
- Current working directory: ${context.workingDirectory || 'root'}
${context.currentNote ? `- Currently viewing: ${context.currentNote.name}` : ''}

User message: ${message}`;

      // Get AI response
      const response = await aiProvider.generateResponse(message, systemPrompt);
      
      // Parse and execute any tool calls from the response
      const toolCallRegex = /TOOL_CALL:\s*(\w+)\s*\(\s*({.*?})\s*\)/g;
      let match;
      let processedResponse = response;
      
      while ((match = toolCallRegex.exec(response)) !== null) {
        const [fullMatch, toolName, argsString] = match;
        
        try {
          const args = JSON.parse(argsString);
          const result = await this.executeTool(toolName, args, context);
          
          // Replace tool call with result in response
          const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          processedResponse = processedResponse.replace(fullMatch, `\n✅ Executed ${toolName}: ${resultText}\n`);
          
        } catch (error) {
          processedResponse = processedResponse.replace(fullMatch, `\n❌ Error executing ${toolName}: ${error.message}\n`);
        }
      }

      return processedResponse;

    } catch (error) {
      console.error('VaultAgent: Error processing message:', error);
      return `Sorry, I encountered an error processing your request: ${error.message}`;
    }
  }

  // Tool Implementation Methods

  private async createNote(args: { filename: string; content?: string; folder?: string }): Promise<string> {
    try {
      let { filename, content = '', folder } = args;
      
      // Ensure .md extension
      if (!filename.endsWith('.md')) {
        filename += '.md';
      }

      // Construct full path
      let fullPath = filename;
      if (folder) {
        fullPath = normalizePath(`${folder}/${filename}`);
        
        // Create folder if it doesn't exist
        if (!await this.vault.adapter.exists(folder)) {
          await this.vault.createFolder(folder);
        }
      }

      // Create the file
      const file = await this.vault.create(fullPath, content);
      
      return `Successfully created note: ${file.path}`;
    } catch (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }
  }

  private async readNote(args: { filename: string }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const content = await this.vault.read(file);
      return `Content of ${file.name}:\n\n${content}`;
    } catch (error) {
      throw new Error(`Failed to read note: ${error.message}`);
    }
  }

  private async updateNote(args: { filename: string; content: string; append?: boolean }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      let newContent = args.content;
      if (args.append) {
        const existingContent = await this.vault.read(file);
        newContent = existingContent + '\n\n' + args.content;
      }

      await this.vault.modify(file, newContent);
      return `Successfully updated note: ${file.name}`;
    } catch (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }

  private async deleteNote(args: { filename: string; confirm: boolean }): Promise<string> {
    if (!args.confirm) {
      throw new Error('Deletion not confirmed. Set confirm: true to proceed with deletion.');
    }

    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      await this.vault.delete(file);
      return `Successfully deleted note: ${file.name}`;
    } catch (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  private async renameNote(args: { oldPath: string; newPath: string }): Promise<string> {
    try {
      const file = this.findFile(args.oldPath);
      if (!file) {
        throw new Error(`Note not found: ${args.oldPath}`);
      }

      let newPath = args.newPath;
      if (!newPath.endsWith('.md')) {
        newPath += '.md';
      }

      await this.vault.rename(file, newPath);
      return `Successfully renamed ${args.oldPath} to ${newPath}`;
    } catch (error) {
      throw new Error(`Failed to rename note: ${error.message}`);
    }
  }

  private async searchNotes(args: { query: string; limit?: number }): Promise<string> {
    try {
      const limit = args.limit || 10;
      const files = this.vault.getMarkdownFiles();
      const results: Array<{ file: TFile; matches: number }> = [];

      for (const file of files) {
        const content = await this.vault.read(file);
        const matches = (content.toLowerCase().match(new RegExp(args.query.toLowerCase(), 'g')) || []).length;
        
        if (matches > 0) {
          results.push({ file, matches });
        }
      }

      // Sort by number of matches
      results.sort((a, b) => b.matches - a.matches);
      
      const topResults = results.slice(0, limit);
      
      if (topResults.length === 0) {
        return `No notes found containing: ${args.query}`;
      }

      const resultText = topResults
        .map(({ file, matches }) => `- ${file.path} (${matches} matches)`)
        .join('\n');

      return `Found ${topResults.length} notes containing "${args.query}":\n${resultText}`;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  private async listNotes(args: { folder?: string; recursive?: boolean }): Promise<string> {
    try {
      const recursive = args.recursive !== false; // default true
      let files = this.vault.getMarkdownFiles();

      if (args.folder) {
        const folderPath = normalizePath(args.folder);
        files = files.filter(file => {
          return recursive 
            ? file.path.startsWith(folderPath + '/')
            : file.parent?.path === folderPath;
        });
      }

      if (files.length === 0) {
        return args.folder 
          ? `No notes found in folder: ${args.folder}`
          : 'No notes found in vault';
      }

      const notesList = files
        .map(file => `- ${file.path}`)
        .join('\n');

      return `Found ${files.length} notes:\n${notesList}`;
    } catch (error) {
      throw new Error(`Failed to list notes: ${error.message}`);
    }
  }

  private async findNotesByTag(args: { tag: string; limit?: number }): Promise<string> {
    try {
      const limit = args.limit || 10;
      const files = this.vault.getMarkdownFiles();
      const results: TFile[] = [];

      for (const file of files) {
        const cache = this.metadataCache.getFileCache(file);
        if (cache?.tags?.some(tagRef => tagRef.tag === `#${args.tag}`) ||
            cache?.frontmatter?.tags?.includes(args.tag)) {
          results.push(file);
        }
      }

      const limitedResults = results.slice(0, limit);
      
      if (limitedResults.length === 0) {
        return `No notes found with tag: #${args.tag}`;
      }

      const resultText = limitedResults
        .map(file => `- ${file.path}`)
        .join('\n');

      return `Found ${limitedResults.length} notes with tag #${args.tag}:\n${resultText}`;
    } catch (error) {
      throw new Error(`Failed to search by tag: ${error.message}`);
    }
  }

  private async createFolder(args: { path: string }): Promise<string> {
    try {
      const folderPath = normalizePath(args.path);
      
      if (await this.vault.adapter.exists(folderPath)) {
        return `Folder already exists: ${folderPath}`;
      }

      await this.vault.createFolder(folderPath);
      return `Successfully created folder: ${folderPath}`;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  private async listFolders(): Promise<string> {
    try {
      const folders = this.vault.getAllLoadedFiles()
        .filter(file => file instanceof TFolder)
        .map(folder => folder.path)
        .sort();

      if (folders.length === 0) {
        return 'No folders found in vault';
      }

      const foldersList = folders
        .map(path => `- ${path}`)
        .join('\n');

      return `Found ${folders.length} folders:\n${foldersList}`;
    } catch (error) {
      throw new Error(`Failed to list folders: ${error.message}`);
    }
  }

  private async createFromTemplate(args: { templateName: string; newNoteName: string; variables?: object }): Promise<string> {
    try {
      const templateFile = this.findFile(args.templateName);
      if (!templateFile) {
        throw new Error(`Template not found: ${args.templateName}`);
      }

      let templateContent = await this.vault.read(templateFile);
      
      // Basic variable substitution
      if (args.variables) {
        for (const [key, value] of Object.entries(args.variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          templateContent = templateContent.replace(regex, String(value));
        }
      }

      // Add default variables
      const today = new Date().toISOString().split('T')[0];
      templateContent = templateContent.replace(/{{today}}/g, today);
      templateContent = templateContent.replace(/{{date}}/g, today);

      // Create the new note
      return await this.createNote({
        filename: args.newNoteName,
        content: templateContent
      });
    } catch (error) {
      throw new Error(`Failed to create from template: ${error.message}`);
    }
  }

  private async getNoteMetadata(args: { filename: string }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const cache = this.metadataCache.getFileCache(file);
      const stats = await this.vault.adapter.stat(file.path);
      
      const metadata = {
        name: file.name,
        path: file.path,
        size: stats?.size || 0,
        created: stats?.ctime ? new Date(stats.ctime).toISOString() : 'unknown',
        modified: stats?.mtime ? new Date(stats.mtime).toISOString() : 'unknown',
        frontmatter: cache?.frontmatter || {},
        tags: cache?.tags?.map(tag => tag.tag) || [],
        links: cache?.links?.map(link => link.link) || [],
        headings: cache?.headings?.map(heading => heading.heading) || []
      };

      return `Metadata for ${file.name}:\n${JSON.stringify(metadata, null, 2)}`;
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  private async addFrontmatter(args: { filename: string; properties: object }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const content = await this.vault.read(file);
      const frontmatterRegex = /^---\n(.*?)\n---\n/s;
      const match = content.match(frontmatterRegex);

      let newContent: string;
      if (match) {
        // Update existing frontmatter
        const existingFrontmatter = match[1];
        const propertiesToAdd = Object.entries(args.properties)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        
        const newFrontmatter = existingFrontmatter + '\n' + propertiesToAdd;
        newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---\n`);
      } else {
        // Add new frontmatter
        const propertiesToAdd = Object.entries(args.properties)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        
        newContent = `---\n${propertiesToAdd}\n---\n\n${content}`;
      }

      await this.vault.modify(file, newContent);
      return `Successfully added frontmatter to ${file.name}`;
    } catch (error) {
      throw new Error(`Failed to add frontmatter: ${error.message}`);
    }
  }

  private async findBacklinks(args: { filename: string }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const backlinks = Object.entries(this.metadataCache.resolvedLinks)
        .filter(([, links]) => file.path in links)
        .map(([sourcePath]) => sourcePath);

      if (backlinks.length === 0) {
        return `No backlinks found for ${file.name}`;
      }

      const backlinksText = backlinks
        .map(path => `- ${path}`)
        .join('\n');

      return `Found ${backlinks.length} backlinks to ${file.name}:\n${backlinksText}`;
    } catch (error) {
      throw new Error(`Failed to find backlinks: ${error.message}`);
    }
  }

  private async findOutgoingLinks(args: { filename: string }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const cache = this.metadataCache.getFileCache(file);
      const links = cache?.links?.map(link => link.link) || [];

      if (links.length === 0) {
        return `No outgoing links found in ${file.name}`;
      }

      const linksText = links
        .map(link => `- ${link}`)
        .join('\n');

      return `Found ${links.length} outgoing links from ${file.name}:\n${linksText}`;
    } catch (error) {
      throw new Error(`Failed to find outgoing links: ${error.message}`);
    }
  }

  private async getVaultStats(): Promise<string> {
    try {
      const files = this.vault.getMarkdownFiles();
      const folders = this.vault.getAllLoadedFiles().filter(file => file instanceof TFolder);
      
      let totalWords = 0;
      let totalChars = 0;
      
      for (const file of files.slice(0, 100)) { // Limit to avoid performance issues
        try {
          const content = await this.vault.read(file);
          totalWords += content.split(/\s+/).length;
          totalChars += content.length;
        } catch (e) {
          // Skip files that can't be read
        }
      }

      const stats = {
        totalNotes: files.length,
        totalFolders: folders.length,
        totalWords: totalWords,
        totalCharacters: totalChars,
        averageWordsPerNote: Math.round(totalWords / Math.max(files.length, 1))
      };

      return `Vault Statistics:\n${JSON.stringify(stats, null, 2)}`;
    } catch (error) {
      throw new Error(`Failed to get vault stats: ${error.message}`);
    }
  }

  private async analyzeNote(args: { filename: string }): Promise<string> {
    try {
      const file = this.findFile(args.filename);
      if (!file) {
        throw new Error(`Note not found: ${args.filename}`);
      }

      const content = await this.vault.read(file);
      
      // Get AI analysis
      const aiProvider = await ProviderFactory.createProvider(this.settings);
      const analysisPrompt = `Please analyze this note and provide insights about its content, structure, and potential improvements:

Title: ${file.name}
Content:
${content}

Please provide:
1. A brief summary
2. Main topics covered
3. Content quality assessment
4. Suggestions for improvement
5. Related topics that could be explored`;

      const analysis = await aiProvider.generateResponse(analysisPrompt, 'You are analyzing a note for insights and improvements.');
      
      return `AI Analysis of ${file.name}:\n\n${analysis}`;
    } catch (error) {
      throw new Error(`Failed to analyze note: ${error.message}`);
    }
  }

  /**
   * Execute any Obsidian command from the command palette
   */
  private async executeCommand(args: { command: string; searchType?: string }): Promise<string> {
    try {
      const { command, searchType = 'name' } = args;
      
      // Get all available commands
      const commands = (this.app as any).commands.commands;
      
      let targetCommand = null;
      
      if (searchType === 'id') {
        // Search by exact command ID
        targetCommand = commands[command];
      } else {
        // Search by display name (case-insensitive, partial match)
        const commandEntries = Object.entries(commands);
        const match = commandEntries.find(([id, cmd]: [string, any]) => {
          return cmd.name && cmd.name.toLowerCase().includes(command.toLowerCase());
        });
        
        if (match) {
          targetCommand = match[1];
        }
      }
      
      if (!targetCommand) {
        // Try to find similar commands for suggestions
        const commandEntries = Object.entries(commands);
        const suggestions = commandEntries
          .filter(([, cmd]: [string, any]) => cmd.name)
          .map(([, cmd]: [string, any]) => cmd.name)
          .filter(name => name.toLowerCase().includes(command.toLowerCase().split(' ')[0]))
          .slice(0, 5);
        
        if (suggestions.length > 0) {
          return `Command "${command}" not found. Did you mean one of these?\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        } else {
          return `Command "${command}" not found. Use searchType: "id" to search by command ID, or try a different command name.`;
        }
      }
      
      // Check if command can be executed
      if (targetCommand.checkCallback) {
        const canExecute = targetCommand.checkCallback();
        if (!canExecute) {
          return `Command "${targetCommand.name}" is not available in the current context.`;
        }
      }
      
      // Execute the command
      if (targetCommand.callback) {
        await targetCommand.callback();
        return `✅ Successfully executed command: "${targetCommand.name}"`;
      } else if (targetCommand.editorCallback) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
          await targetCommand.editorCallback(activeView.editor, activeView);
          return `✅ Successfully executed command: "${targetCommand.name}"`;
        } else {
          return `Command "${targetCommand.name}" requires an active editor, but none is available.`;
        }
      } else {
        return `Command "${targetCommand.name}" found but cannot be executed (no callback defined).`;
      }
      
    } catch (error) {
      return `❌ Failed to execute command: ${error.message}`;
    }
  }

  /**
   * List available Obsidian commands from the command palette
   */
  private async listCommands(args: { filter?: string; limit?: number }): Promise<string> {
    try {
      const { filter, limit = 20 } = args;
      
      // Get all available commands
      const commands = (this.app as any).commands.commands;
      const commandEntries = Object.entries(commands);
      
      // Filter commands if filter is provided
      let filteredCommands = commandEntries;
      if (filter) {
        filteredCommands = commandEntries.filter(([id, cmd]: [string, any]) => {
          return (cmd.name && cmd.name.toLowerCase().includes(filter.toLowerCase())) ||
                 id.toLowerCase().includes(filter.toLowerCase());
        });
      }
      
      // Sort by name and limit results
      const sortedCommands = filteredCommands
        .filter(([, cmd]: [string, any]) => cmd.name) // Only include commands with names
        .sort(([, cmdA]: [string, any], [, cmdB]: [string, any]) => 
          cmdA.name.localeCompare(cmdB.name)
        )
        .slice(0, limit);
      
      if (sortedCommands.length === 0) {
        return filter 
          ? `No commands found matching "${filter}"`
          : 'No commands available';
      }
      
      const commandList = sortedCommands
        .map(([id, cmd]: [string, any]) => {
          const hotkey = this.getCommandHotkey(id);
          const availability = this.checkCommandAvailability(cmd);
          const category = this.categorizeCommand(id, cmd.name);
          
          return `• **${cmd.name}**
    - ID: \`${id}\`
    - Category: ${category}
    - Status: ${availability}${hotkey ? `\n    - Hotkey: \`${hotkey}\`` : ''}`;
        })
        .join('\n\n');
      
      const resultHeader = filter 
        ? `Found ${sortedCommands.length} commands matching "${filter}"${sortedCommands.length === limit ? ` (showing first ${limit})` : ''}:`
        : `Available commands (showing ${sortedCommands.length} of ${commandEntries.length}):`;
      
      return `${resultHeader}\n\n${commandList}\n\n💡 Use the \`execute_command\` tool to run any of these commands.`;
      
    } catch (error) {
      return `❌ Failed to list commands: ${error.message}`;
    }
  }

  /**
   * Intelligently find and recommend commands based on user intent
   */
  private async findCommand(args: { intent: string; limit?: number }): Promise<string> {
    try {
      const { intent, limit = 5 } = args;
      
      // Get all available commands
      const commands = (this.app as any).commands.commands;
      const commandEntries = Object.entries(commands)
        .filter(([id, cmd]: [string, any]) => cmd.name);
      
      // Score commands based on relevance to intent
      const scoredCommands = commandEntries.map(([id, cmd]: [string, any]) => {
        const score = this.calculateCommandRelevance(intent, id, cmd.name);
        return { id, cmd, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
      if (scoredCommands.length === 0) {
        return `No commands found that match the intent: "${intent}". Try using different keywords or check available commands with \`list_commands\`.`;
      }
      
      const topCommand = scoredCommands[0];
      const topScore = topCommand.score;
      
      // If top command has >=90% match, execute it automatically
      if (topScore >= 0.9) {
        try {
          // Execute the command
          await this.executeCommand({ command: topCommand.cmd.name });
          
          // Return simple confirmation message that the AI can use
          return this.generateActionPhrase(topCommand.cmd.name);
        } catch (error) {
          // If execution fails, fall back to showing recommendations
          console.error('Auto-execution failed:', error);
        }
      }
      
      // Show recommendations if no high-confidence match or execution failed
      const recommendations = scoredCommands
        .map(({ id, cmd, score }, index) => {
          const hotkey = this.getCommandHotkey(id);
          const availability = this.checkCommandAvailability(cmd);
          const category = this.categorizeCommand(id, cmd.name);
          
          return `${index + 1}. **${cmd.name}** (${Math.round(score * 100)}% match)
    - ID: \`${id}\`
    - Category: ${category}
    - Status: ${availability}${hotkey ? `\n    - Hotkey: \`${hotkey}\`` : ''}
    - Execute with: \`execute_command("${cmd.name}")\``;
        })
        .join('\n\n');
      
      return `🎯 **Command Recommendations for "${intent}":**\n\n${recommendations}\n\n💡 The top recommendation is usually the best match. Use \`execute_command\` with the exact command name.`;
      
    } catch (error) {
      return `❌ Failed to find commands: ${error.message}`;
    }
  }

  /**
   * Calculate relevance score between user intent and command
   */
  private calculateCommandRelevance(intent: string, commandId: string, commandName: string): number {
    const intentLower = intent.toLowerCase().trim();
    const nameLower = commandName.toLowerCase();
    const idLower = commandId.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match gets highest score
    if (nameLower === intentLower) {
      return 1.0;
    }
    
    // Very close substring match
    if (nameLower.includes(intentLower) || intentLower.includes(nameLower)) {
      score += 0.9;
    }
    
    // Extract meaningful words from intent (filter out common words)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'with', 'by'];
    const intentWords = intentLower.split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    if (intentWords.length === 0) {
      return 0;
    }
    
    // Define specific keyword mappings with weights
    const keywordMappings: { [key: string]: { keywords: string[], weight: number } } = {
      // Appearance/Theme commands
      'dark': { keywords: ['dark', 'night'], weight: 0.8 },
      'light': { keywords: ['light', 'day', 'bright'], weight: 0.8 },
      'theme': { keywords: ['theme', 'appearance', 'color'], weight: 0.7 },
      'mode': { keywords: ['mode'], weight: 0.6 },
      
      // Layout/Workspace commands  
      'split': { keywords: ['split', 'divide'], weight: 0.8 },
      'vertical': { keywords: ['vertical', 'vertically'], weight: 0.7 },
      'horizontal': { keywords: ['horizontal', 'horizontally'], weight: 0.7 },
      'window': { keywords: ['window', 'pane'], weight: 0.6 },
      
      // Navigation/UI commands
      'sidebar': { keywords: ['sidebar', 'panel'], weight: 0.8 },
      'left': { keywords: ['left'], weight: 0.6 },
      'right': { keywords: ['right'], weight: 0.6 },
      'toggle': { keywords: ['toggle', 'switch', 'show', 'hide'], weight: 0.7 },
      'open': { keywords: ['open', 'show', 'reveal', 'display'], weight: 0.6 },
      'close': { keywords: ['close', 'hide', 'dismiss'], weight: 0.6 },
      
      // File operations
      'create': { keywords: ['create', 'new', 'add', 'make'], weight: 0.7 },
      'delete': { keywords: ['delete', 'remove', 'trash'], weight: 0.8 },
      'file': { keywords: ['file', 'note', 'document'], weight: 0.6 },
      'folder': { keywords: ['folder', 'directory'], weight: 0.7 },
      
      // Search/Navigation
      'search': { keywords: ['search', 'find', 'quick'], weight: 0.7 },
      'switcher': { keywords: ['switcher', 'picker'], weight: 0.7 },
      
      // Settings/Config
      'settings': { keywords: ['settings', 'preferences', 'options', 'config'], weight: 0.8 },
      'command': { keywords: ['command', 'palette'], weight: 0.7 }
    };
    
    let totalWordScore = 0;
    let matchedWords = 0;
    
    // Score each word in the intent
    for (const word of intentWords) {
      let wordScore = 0;
      let bestMatch = false;
      
      // Direct word match in command name
      if (nameLower.includes(word)) {
        wordScore += 0.8;
        bestMatch = true;
      }
      
      // Direct word match in command ID
      if (idLower.includes(word)) {
        wordScore += 0.6;
        bestMatch = true;
      }
      
      // Keyword mapping matches
      for (const [category, {keywords, weight}] of Object.entries(keywordMappings)) {
        if (keywords.includes(word)) {
          // Check if any of the mapped keywords appear in the command
          for (const keyword of keywords) {
            if (nameLower.includes(keyword)) {
              wordScore += weight * 0.7; // Reduce weight for mapped matches
              bestMatch = true;
            }
            if (idLower.includes(keyword)) {
              wordScore += weight * 0.5;
              bestMatch = true;
            }
          }
        }
      }
      
      // Partial word matches (for longer words)
      if (!bestMatch && word.length > 4) {
        const wordParts = [word.substring(0, 4), word.substring(word.length - 4)];
        for (const part of wordParts) {
          if (nameLower.includes(part)) {
            wordScore += 0.2;
          }
        }
      }
      
      if (wordScore > 0) {
        matchedWords++;
        totalWordScore += Math.min(wordScore, 1.0); // Cap individual word scores
      }
    }
    
    // Calculate final score based on word coverage and quality
    if (matchedWords === 0) {
      return 0;
    }
    
    // Average word score, weighted by coverage
    const avgWordScore = totalWordScore / intentWords.length;
    const coverage = matchedWords / intentWords.length;
    
    score += avgWordScore * coverage;
    
    // Bonus for high coverage
    if (coverage >= 0.8) {
      score += 0.2;
    } else if (coverage >= 0.6) {
      score += 0.1;
    }
    
    // Penalty for very long command names that only partially match
    if (nameLower.length > intentLower.length * 2 && coverage < 0.5) {
      score *= 0.7;
    }
    
    // Ensure realistic score distribution
    if (score > 0.95) {
      score = 0.95; // Reserve 100% for perfect matches only
    }
    
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Categorize commands for better organization
   */
  private categorizeCommand(id: string, name: string): string {
    const idLower = id.toLowerCase();
    const nameLower = name.toLowerCase();
    
    if (idLower.includes('theme') || nameLower.includes('theme') || 
        nameLower.includes('dark') || nameLower.includes('light')) {
      return 'Appearance';
    }
    
    if (idLower.includes('workspace') || nameLower.includes('workspace') ||
        nameLower.includes('split') || nameLower.includes('layout')) {
      return 'Workspace';
    }
    
    if (idLower.includes('sidebar') || nameLower.includes('sidebar') ||
        idLower.includes('panel') || nameLower.includes('panel')) {
      return 'Panels & Sidebars';
    }
    
    if (idLower.includes('file') || nameLower.includes('file') ||
        idLower.includes('note') || nameLower.includes('note')) {
      return 'File Operations';
    }
    
    if (idLower.includes('search') || nameLower.includes('search') ||
        idLower.includes('switcher') || nameLower.includes('find')) {
      return 'Search & Navigation';
    }
    
    if (idLower.includes('plugin') || nameLower.includes('plugin')) {
      return 'Plugins';
    }
    
    if (idLower.includes('setting') || nameLower.includes('setting') ||
        idLower.includes('preference') || nameLower.includes('option')) {
      return 'Settings';
    }
    
    if (idLower.includes('command') || nameLower.includes('command')) {
      return 'Commands';
    }
    
    if (idLower.includes('editor') || nameLower.includes('editor') ||
        idLower.includes('edit') || nameLower.includes('cursor')) {
      return 'Editor';
    }
    
    return 'Other';
  }

  /**
   * Check if command is currently available
   */
  private checkCommandAvailability(cmd: any): string {
    if (cmd.checkCallback) {
      try {
        const available = cmd.checkCallback();
        return available ? 'Available' : 'Unavailable';
      } catch (e) {
        return 'Unknown';
      }
    }
    return 'Available';
  }

  /**
   * Generate a simple action phrase for command execution
   */
  private generateActionPhrase(commandName: string): string {
    const name = commandName.toLowerCase();
    
    // Common action patterns
    if (name.includes('cycle') && name.includes('light')) return 'Cycling between light mode styles';
    if (name.includes('toggle') && name.includes('light')) return 'Toggling light mode';
    if (name.includes('toggle') && name.includes('dark')) return 'Toggling dark mode';
    if (name.includes('toggle') && name.includes('theme')) return 'Toggling theme';
    if (name.includes('split') && name.includes('horizontal')) return 'Splitting window horizontally';
    if (name.includes('split') && name.includes('vertical')) return 'Splitting window vertically';
    if (name.includes('open') && name.includes('command')) return 'Opening command palette';
    if (name.includes('open') && name.includes('settings')) return 'Opening settings';
    if (name.includes('toggle') && name.includes('sidebar')) return 'Toggling sidebar';
    if (name.includes('search')) return 'Opening search';
    
    // Generic fallback
    return `Executing: ${commandName}`;
  }

  /**
   * Get hotkey for command if available
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
   * Helper method to find a file by name or path
   */
  private findFile(filename: string): TFile | null {
    // Try exact path first
    const exactFile = this.vault.getAbstractFileByPath(filename);
    if (exactFile instanceof TFile) {
      return exactFile;
    }

    // Try with .md extension
    const withExtension = filename.endsWith('.md') ? filename : filename + '.md';
    const extFile = this.vault.getAbstractFileByPath(withExtension);
    if (extFile instanceof TFile) {
      return extFile;
    }

    // Search by basename
    const files = this.vault.getMarkdownFiles();
    return files.find(file => 
      file.basename === filename || 
      file.basename === filename.replace('.md', '') ||
      file.name === filename
    ) || null;
  }
}