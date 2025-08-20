import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { ClippyErrorBoundaries } from '../error-boundaries';
import { ConversationManager } from './conversation-manager';
import type { 
    ClippySettings, 
    VoiceCommand, 
    ConversationContext,
    ConversationTurn,
    VaultContext 
} from '../types';

/**
 * Voice command categories for organization and processing
 */
export enum VoiceCommandCategory {
    NAVIGATION = 'navigation',
    FILE_OPERATIONS = 'file_operations',
    SEARCH = 'search',
    CONTENT_CREATION = 'content_creation',
    FORMATTING = 'formatting',
    AI_INTERACTION = 'ai_interaction',
    PLUGIN_CONTROL = 'plugin_control',
    SYSTEM = 'system'
}

/**
 * Voice command confidence levels
 */
export enum CommandConfidence {
    HIGH = 'high',        // Clear match with specific intent
    MEDIUM = 'medium',    // Probable match but may need confirmation
    LOW = 'low',         // Uncertain match, suggest alternatives
    AMBIGUOUS = 'ambiguous' // Multiple possible interpretations
}

/**
 * Parsed voice command with intent and parameters
 */
export interface ParsedVoiceCommand {
    originalText: string;
    intent: string;
    category: VoiceCommandCategory;
    confidence: CommandConfidence;
    parameters: Record<string, any>;
    alternatives?: string[];
    needsConfirmation: boolean;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
    success: boolean;
    message: string;
    data?: any;
    followUpActions?: string[];
    errors?: string[];
}

/**
 * Voice command pattern for matching and parsing
 */
interface VoiceCommandPattern {
    pattern: RegExp | string;
    intent: string;
    category: VoiceCommandCategory;
    handler: string;
    parameters?: string[];
    examples: string[];
    confidence: CommandConfidence;
}

/**
 * Voice Command Processor for parsing and executing voice commands
 */
export class VoiceCommandProcessor {
    private app: App;
    private settings: ClippySettings;
    private conversationManager: ConversationManager;
    private commandPatterns: VoiceCommandPattern[] = [];

    constructor(app: App, settings: ClippySettings, conversationManager: ConversationManager) {
        this.app = app;
        this.settings = settings;
        this.conversationManager = conversationManager;
        this.initializeCommandPatterns();
    }

    /**
     * Process voice command text and execute corresponding actions
     */
    async processVoiceCommand(
        text: string, 
        context: ConversationContext
    ): Promise<CommandExecutionResult> {
        try {
            console.log(`Processing voice command: "${text}"`);

            // Parse the command
            const parsedCommand = await this.parseCommand(text, context);
            
            if (!parsedCommand) {
                return {
                    success: false,
                    message: "I didn't understand that command. Could you please rephrase?",
                    followUpActions: ['Try saying "help" to see available commands']
                };
            }

            // Add turn to conversation
            const turn: ConversationTurn = {
                id: this.generateTurnId(),
                sessionId: context.sessionId,
                timestamp: Date.now(),
                userInput: text,
                intent: parsedCommand.intent,
                confidence: parsedCommand.confidence
            };

            await this.conversationManager.addTurn(turn);

            // Check if confirmation is needed
            if (parsedCommand.needsConfirmation) {
                return await this.requestConfirmation(parsedCommand, context);
            }

            // Execute the command
            const result = await this.executeCommand(parsedCommand, context);
            
            // Update conversation turn with result
            turn.assistantResponse = result.message;
            turn.success = result.success;

            return result;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceCommandProcessor.processVoiceCommand');
            return {
                success: false,
                message: `Sorry, I encountered an error: ${error.message}`,
                errors: [error.message]
            };
        }
    }

    /**
     * Parse voice command text into structured command
     */
    async parseCommand(text: string, context: ConversationContext): Promise<ParsedVoiceCommand | null> {
        const normalizedText = text.toLowerCase().trim();
        
        // Try exact pattern matches first
        for (const pattern of this.commandPatterns) {
            const match = this.matchPattern(normalizedText, pattern);
            if (match) {
                return {
                    originalText: text,
                    intent: pattern.intent,
                    category: pattern.category,
                    confidence: pattern.confidence,
                    parameters: match.parameters,
                    needsConfirmation: this.needsConfirmation(pattern, match.parameters)
                };
            }
        }

        // Try fuzzy matching for partial matches
        const fuzzyMatch = this.fuzzyMatchCommand(normalizedText);
        if (fuzzyMatch) {
            return fuzzyMatch;
        }

        // Try contextual interpretation
        return this.contextualParse(text, context);
    }

    /**
     * Execute a parsed voice command
     */
    async executeCommand(
        command: ParsedVoiceCommand, 
        context: ConversationContext
    ): Promise<CommandExecutionResult> {
        try {
            console.log(`Executing command: ${command.intent}`);

            switch (command.category) {
                case VoiceCommandCategory.NAVIGATION:
                    return await this.executeNavigationCommand(command);

                case VoiceCommandCategory.FILE_OPERATIONS:
                    return await this.executeFileOperationCommand(command);

                case VoiceCommandCategory.SEARCH:
                    return await this.executeSearchCommand(command);

                case VoiceCommandCategory.CONTENT_CREATION:
                    return await this.executeContentCreationCommand(command);

                case VoiceCommandCategory.FORMATTING:
                    return await this.executeFormattingCommand(command);

                case VoiceCommandCategory.AI_INTERACTION:
                    return await this.executeAIInteractionCommand(command, context);

                case VoiceCommandCategory.PLUGIN_CONTROL:
                    return await this.executePluginControlCommand(command);

                case VoiceCommandCategory.SYSTEM:
                    return await this.executeSystemCommand(command);

                default:
                    return {
                        success: false,
                        message: `Unknown command category: ${command.category}`
                    };
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceCommandProcessor.executeCommand');
            return {
                success: false,
                message: `Failed to execute command: ${error.message}`,
                errors: [error.message]
            };
        }
    }

    /**
     * Get available voice commands
     */
    getAvailableCommands(): VoiceCommandPattern[] {
        return this.commandPatterns.map(pattern => ({ ...pattern }));
    }

    /**
     * Update settings
     */
    updateSettings(newSettings: ClippySettings): void {
        this.settings = newSettings;
    }

    /**
     * Initialize command patterns for voice recognition
     */
    private initializeCommandPatterns(): void {
        this.commandPatterns = [
            // Navigation commands
            {
                pattern: /^(open|go to|navigate to|show me) (.+)$/,
                intent: 'open_file',
                category: VoiceCommandCategory.NAVIGATION,
                handler: 'openFile',
                parameters: ['filename'],
                examples: ['open daily notes', 'go to meeting notes', 'show me project file'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(back|go back|previous)$/,
                intent: 'navigate_back',
                category: VoiceCommandCategory.NAVIGATION,
                handler: 'navigateBack',
                examples: ['back', 'go back', 'previous'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(forward|go forward|next)$/,
                intent: 'navigate_forward',
                category: VoiceCommandCategory.NAVIGATION,
                handler: 'navigateForward',
                examples: ['forward', 'go forward', 'next'],
                confidence: CommandConfidence.HIGH
            },

            // File operations
            {
                pattern: /^(create|new|make) (file|note) (.+)$/,
                intent: 'create_file',
                category: VoiceCommandCategory.FILE_OPERATIONS,
                handler: 'createFile',
                parameters: ['filename'],
                examples: ['create file meeting notes', 'new note daily thoughts', 'make file project ideas'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(delete|remove) (file|note) (.+)$/,
                intent: 'delete_file',
                category: VoiceCommandCategory.FILE_OPERATIONS,
                handler: 'deleteFile',
                parameters: ['filename'],
                examples: ['delete file old notes', 'remove note draft'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(rename|change name of) (.+) to (.+)$/,
                intent: 'rename_file',
                category: VoiceCommandCategory.FILE_OPERATIONS,
                handler: 'renameFile',
                parameters: ['oldname', 'newname'],
                examples: ['rename meeting notes to weekly meeting', 'change name of draft to final version'],
                confidence: CommandConfidence.HIGH
            },

            // Search commands
            {
                pattern: /^(search|find|look for) (.+)$/,
                intent: 'search_vault',
                category: VoiceCommandCategory.SEARCH,
                handler: 'searchVault',
                parameters: ['query'],
                examples: ['search project ideas', 'find meeting notes', 'look for todos'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(find files|show files) (with|containing|tagged) (.+)$/,
                intent: 'search_by_tag',
                category: VoiceCommandCategory.SEARCH,
                handler: 'searchByTag',
                parameters: ['tag'],
                examples: ['find files with todo tag', 'show files tagged important'],
                confidence: CommandConfidence.HIGH
            },

            // Content creation
            {
                pattern: /^(write|type|add|insert) (.+)$/,
                intent: 'insert_text',
                category: VoiceCommandCategory.CONTENT_CREATION,
                handler: 'insertText',
                parameters: ['text'],
                examples: ['write hello world', 'add meeting agenda', 'insert project summary'],
                confidence: CommandConfidence.MEDIUM
            },
            {
                pattern: /^(create|make|add) (heading|title) (.+)$/,
                intent: 'create_heading',
                category: VoiceCommandCategory.CONTENT_CREATION,
                handler: 'createHeading',
                parameters: ['text'],
                examples: ['create heading project overview', 'add title meeting notes'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(create|make|add) (bullet|list) (.+)$/,
                intent: 'create_list',
                category: VoiceCommandCategory.CONTENT_CREATION,
                handler: 'createList',
                parameters: ['items'],
                examples: ['create bullet list todos', 'make list project tasks'],
                confidence: CommandConfidence.HIGH
            },

            // Formatting commands
            {
                pattern: /^(make|format) (bold|italic|highlight) (.+)$/,
                intent: 'format_text',
                category: VoiceCommandCategory.FORMATTING,
                handler: 'formatText',
                parameters: ['format', 'text'],
                examples: ['make bold important note', 'format italic emphasis'],
                confidence: CommandConfidence.HIGH
            },

            // AI interaction
            {
                pattern: /^(ask|question|query) (.+)$/,
                intent: 'ai_query',
                category: VoiceCommandCategory.AI_INTERACTION,
                handler: 'aiQuery',
                parameters: ['question'],
                examples: ['ask what is machine learning', 'question about project status'],
                confidence: CommandConfidence.MEDIUM
            },
            {
                pattern: /^(summarize|summary of) (.+)$/,
                intent: 'summarize_content',
                category: VoiceCommandCategory.AI_INTERACTION,
                handler: 'summarizeContent',
                parameters: ['content'],
                examples: ['summarize current file', 'summary of meeting notes'],
                confidence: CommandConfidence.HIGH
            },

            // Plugin control
            {
                pattern: /^(stop|pause|disable) voice$/,
                intent: 'disable_voice',
                category: VoiceCommandCategory.PLUGIN_CONTROL,
                handler: 'disableVoice',
                examples: ['stop voice', 'pause voice', 'disable voice'],
                confidence: CommandConfidence.HIGH
            },
            {
                pattern: /^(help|what can you do|commands)$/,
                intent: 'show_help',
                category: VoiceCommandCategory.PLUGIN_CONTROL,
                handler: 'showHelp',
                examples: ['help', 'what can you do', 'commands'],
                confidence: CommandConfidence.HIGH
            },

            // System commands
            {
                pattern: /^(save|save file|save all)$/,
                intent: 'save_files',
                category: VoiceCommandCategory.SYSTEM,
                handler: 'saveFiles',
                examples: ['save', 'save file', 'save all'],
                confidence: CommandConfidence.HIGH
            }
        ];
    }

    /**
     * Match text against a command pattern
     */
    private matchPattern(text: string, pattern: VoiceCommandPattern): { parameters: Record<string, any> } | null {
        if (typeof pattern.pattern === 'string') {
            return text === pattern.pattern ? { parameters: {} } : null;
        }

        const match = text.match(pattern.pattern);
        if (!match) return null;

        const parameters: Record<string, any> = {};
        if (pattern.parameters) {
            pattern.parameters.forEach((param, index) => {
                parameters[param] = match[index + 1] || '';
            });
        }

        return { parameters };
    }

    /**
     * Fuzzy match for partial command recognition
     */
    private fuzzyMatchCommand(text: string): ParsedVoiceCommand | null {
        let bestMatch: { pattern: VoiceCommandPattern; score: number } | null = null;

        for (const pattern of this.commandPatterns) {
            const score = this.calculateSimilarity(text, pattern);
            if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { pattern, score };
            }
        }

        if (bestMatch) {
            return {
                originalText: text,
                intent: bestMatch.pattern.intent,
                category: bestMatch.pattern.category,
                confidence: CommandConfidence.MEDIUM,
                parameters: {},
                needsConfirmation: true,
                alternatives: bestMatch.pattern.examples
            };
        }

        return null;
    }

    /**
     * Calculate text similarity for fuzzy matching
     */
    private calculateSimilarity(text: string, pattern: VoiceCommandPattern): number {
        // Simple word overlap scoring
        const textWords = new Set(text.split(' '));
        const patternWords = new Set(pattern.examples.flatMap(ex => ex.split(' ')));
        
        const intersection = new Set([...textWords].filter(word => patternWords.has(word)));
        const union = new Set([...textWords, ...patternWords]);
        
        return intersection.size / union.size;
    }

    /**
     * Parse command using conversation context
     */
    private contextualParse(text: string, context: ConversationContext): ParsedVoiceCommand | null {
        // This could use conversation history and current context to interpret ambiguous commands
        // For now, return a generic AI query
        if (text.length > 10) {
            return {
                originalText: text,
                intent: 'ai_query',
                category: VoiceCommandCategory.AI_INTERACTION,
                confidence: CommandConfidence.LOW,
                parameters: { question: text },
                needsConfirmation: false
            };
        }

        return null;
    }

    /**
     * Check if command needs confirmation
     */
    private needsConfirmation(pattern: VoiceCommandPattern, parameters: Record<string, any>): boolean {
        // Destructive operations need confirmation
        const destructiveIntents = ['delete_file', 'rename_file'];
        return destructiveIntents.includes(pattern.intent);
    }

    /**
     * Request user confirmation for a command
     */
    private async requestConfirmation(
        command: ParsedVoiceCommand, 
        context: ConversationContext
    ): Promise<CommandExecutionResult> {
        const confirmationMessage = this.getConfirmationMessage(command);
        
        return {
            success: false,
            message: confirmationMessage,
            followUpActions: ['Say "yes" to confirm or "no" to cancel']
        };
    }

    /**
     * Get confirmation message for a command
     */
    private getConfirmationMessage(command: ParsedVoiceCommand): string {
        switch (command.intent) {
            case 'delete_file':
                return `Are you sure you want to delete the file "${command.parameters.filename}"?`;
            case 'rename_file':
                return `Are you sure you want to rename "${command.parameters.oldname}" to "${command.parameters.newname}"?`;
            default:
                return `Are you sure you want to execute: ${command.originalText}?`;
        }
    }

    // Command execution methods
    private async executeNavigationCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'open_file':
                return await this.openFile(command.parameters.filename);
            case 'navigate_back':
                this.app.workspace.activeLeaf?.history.back();
                return { success: true, message: 'Navigated back' };
            case 'navigate_forward':
                this.app.workspace.activeLeaf?.history.forward();
                return { success: true, message: 'Navigated forward' };
            default:
                return { success: false, message: 'Unknown navigation command' };
        }
    }

    private async executeFileOperationCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'create_file':
                return await this.createFile(command.parameters.filename);
            case 'delete_file':
                return await this.deleteFile(command.parameters.filename);
            case 'rename_file':
                return await this.renameFile(command.parameters.oldname, command.parameters.newname);
            default:
                return { success: false, message: 'Unknown file operation command' };
        }
    }

    private async executeSearchCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'search_vault':
                return await this.searchVault(command.parameters.query);
            case 'search_by_tag':
                return await this.searchByTag(command.parameters.tag);
            default:
                return { success: false, message: 'Unknown search command' };
        }
    }

    private async executeContentCreationCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'insert_text':
                return await this.insertText(command.parameters.text);
            case 'create_heading':
                return await this.createHeading(command.parameters.text);
            case 'create_list':
                return await this.createList(command.parameters.items);
            default:
                return { success: false, message: 'Unknown content creation command' };
        }
    }

    private async executeFormattingCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        return await this.formatText(command.parameters.format, command.parameters.text);
    }

    private async executeAIInteractionCommand(
        command: ParsedVoiceCommand, 
        context: ConversationContext
    ): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'ai_query':
                return { 
                    success: true, 
                    message: `I'll help you with: ${command.parameters.question}`,
                    data: { query: command.parameters.question, context }
                };
            case 'summarize_content':
                return await this.summarizeContent(command.parameters.content);
            default:
                return { success: false, message: 'Unknown AI interaction command' };
        }
    }

    private async executePluginControlCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'disable_voice':
                return { 
                    success: true, 
                    message: 'Voice assistant disabled',
                    followUpActions: ['voice_disable']
                };
            case 'show_help':
                return await this.showHelp();
            default:
                return { success: false, message: 'Unknown plugin control command' };
        }
    }

    private async executeSystemCommand(command: ParsedVoiceCommand): Promise<CommandExecutionResult> {
        switch (command.intent) {
            case 'save_files':
                return await this.saveFiles();
            default:
                return { success: false, message: 'Unknown system command' };
        }
    }

    // Helper methods for command execution
    private async openFile(filename: string): Promise<CommandExecutionResult> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filename);
            if (file instanceof TFile) {
                await this.app.workspace.openLinkText(filename, '', true);
                return { success: true, message: `Opened file: ${filename}` };
            } else {
                // Try fuzzy search for file
                const files = this.app.vault.getMarkdownFiles();
                const matchedFile = files.find(f => 
                    f.name.toLowerCase().includes(filename.toLowerCase()) ||
                    f.basename.toLowerCase().includes(filename.toLowerCase())
                );
                
                if (matchedFile) {
                    await this.app.workspace.openLinkText(matchedFile.path, '', true);
                    return { success: true, message: `Opened file: ${matchedFile.name}` };
                }
                
                return { success: false, message: `File not found: ${filename}` };
            }
        } catch (error: any) {
            return { success: false, message: `Failed to open file: ${error.message}` };
        }
    }

    private async createFile(filename: string): Promise<CommandExecutionResult> {
        try {
            const normalizedPath = filename.endsWith('.md') ? filename : `${filename}.md`;
            const file = await this.app.vault.create(normalizedPath, '');
            await this.app.workspace.openLinkText(normalizedPath, '', true);
            return { success: true, message: `Created and opened file: ${normalizedPath}` };
        } catch (error: any) {
            return { success: false, message: `Failed to create file: ${error.message}` };
        }
    }

    private async deleteFile(filename: string): Promise<CommandExecutionResult> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filename);
            if (file instanceof TFile) {
                await this.app.vault.delete(file);
                return { success: true, message: `Deleted file: ${filename}` };
            }
            return { success: false, message: `File not found: ${filename}` };
        } catch (error: any) {
            return { success: false, message: `Failed to delete file: ${error.message}` };
        }
    }

    private async renameFile(oldName: string, newName: string): Promise<CommandExecutionResult> {
        try {
            const file = this.app.vault.getAbstractFileByPath(oldName);
            if (file instanceof TFile) {
                const newPath = newName.endsWith('.md') ? newName : `${newName}.md`;
                await this.app.vault.rename(file, newPath);
                return { success: true, message: `Renamed file from ${oldName} to ${newPath}` };
            }
            return { success: false, message: `File not found: ${oldName}` };
        } catch (error: any) {
            return { success: false, message: `Failed to rename file: ${error.message}` };
        }
    }

    private async searchVault(query: string): Promise<CommandExecutionResult> {
        try {
            // This would integrate with Obsidian's search
            const files = this.app.vault.getMarkdownFiles();
            const matchedFiles = files.filter(file => 
                file.name.toLowerCase().includes(query.toLowerCase()) ||
                file.basename.toLowerCase().includes(query.toLowerCase())
            );

            if (matchedFiles.length > 0) {
                const fileNames = matchedFiles.slice(0, 5).map(f => f.name).join(', ');
                return { 
                    success: true, 
                    message: `Found ${matchedFiles.length} files matching "${query}": ${fileNames}`,
                    data: { files: matchedFiles }
                };
            }

            return { success: false, message: `No files found matching "${query}"` };
        } catch (error: any) {
            return { success: false, message: `Search failed: ${error.message}` };
        }
    }

    private async searchByTag(tag: string): Promise<CommandExecutionResult> {
        // This would require integration with Obsidian's tag system
        return { 
            success: true, 
            message: `Searching for files with tag: ${tag}` 
        };
    }

    private async insertText(text: string): Promise<CommandExecutionResult> {
        try {
            const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
            if (activeView) {
                const editor = activeView.editor;
                editor.replaceSelection(text);
                return { success: true, message: `Inserted text: ${text}` };
            }
            return { success: false, message: 'No active editor found' };
        } catch (error: any) {
            return { success: false, message: `Failed to insert text: ${error.message}` };
        }
    }

    private async createHeading(text: string): Promise<CommandExecutionResult> {
        return await this.insertText(`# ${text}\n\n`);
    }

    private async createList(items: string): Promise<CommandExecutionResult> {
        const listItems = items.split(',').map(item => `- ${item.trim()}`).join('\n');
        return await this.insertText(listItems + '\n');
    }

    private async formatText(format: string, text: string): Promise<CommandExecutionResult> {
        let formattedText = text;
        switch (format.toLowerCase()) {
            case 'bold':
                formattedText = `**${text}**`;
                break;
            case 'italic':
                formattedText = `*${text}*`;
                break;
            case 'highlight':
                formattedText = `==${text}==`;
                break;
        }
        return await this.insertText(formattedText);
    }

    private async summarizeContent(content: string): Promise<CommandExecutionResult> {
        return { 
            success: true, 
            message: `I'll summarize the content about: ${content}`,
            data: { content }
        };
    }

    private async showHelp(): Promise<CommandExecutionResult> {
        const commands = this.commandPatterns.slice(0, 10).map(p => 
            `• ${p.examples[0]} (${p.category})`
        ).join('\n');

        return {
            success: true,
            message: `Here are some voice commands you can use:\n\n${commands}\n\nSay "more commands" to see additional options.`
        };
    }

    private async saveFiles(): Promise<CommandExecutionResult> {
        // Obsidian auto-saves, but this could trigger manual save if needed
        return { success: true, message: 'All files saved' };
    }

    /**
     * Generate unique turn ID
     */
    private generateTurnId(): string {
        return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}