/**
 * Voice Command Interpreter - Natural language to command mapping
 * Interprets voice commands and maps them to existing command handlers
 */

export interface VoiceCommand {
  id: string;
  name: string;
  patterns: string[];
  handler: string; // Method name on CommandHandlers
  confidence: number;
  requiresEditor?: boolean;
  requiresFile?: boolean;
  parameters?: Record<string, any>;
}

export interface CommandMatch {
  command: VoiceCommand;
  confidence: number;
  parameters?: Record<string, any>;
  intent: string;
}

export class VoiceCommandInterpreter {
  private commands: VoiceCommand[] = [];
  
  constructor() {
    this.initializeVoiceCommands();
  }

  /**
   * Initialize voice command patterns
   */
  private initializeVoiceCommands(): void {
    this.commands = [
      // Note enhancement commands
      {
        id: 'enhance-note',
        name: 'Enhance Current Note',
        patterns: [
          'enhance this note',
          'improve this note',
          'make this note better',
          'polish this note',
          'enhance current note',
          'improve current note',
          'format and enhance',
          'enhance the content'
        ],
        handler: 'handleEnhanceNote',
        confidence: 0.9,
        requiresEditor: true
      },

      // Tagging commands
      {
        id: 'quick-tag',
        name: 'Quick Tag Suggestions',
        patterns: [
          'tag this note',
          'suggest tags',
          'add tags',
          'tag suggestions',
          'what tags should I use',
          'tag this',
          'auto tag',
          'smart tags'
        ],
        handler: 'handleQuickTag',
        confidence: 0.9,
        requiresEditor: true
      },

      // Summarization commands
      {
        id: 'summarize',
        name: 'Summarize Note',
        patterns: [
          'summarize this note',
          'create a summary',
          'give me a summary',
          'what is this note about',
          'summarize',
          'make a summary',
          'create summary'
        ],
        handler: 'handleSummarize',
        confidence: 0.9,
        requiresEditor: true
      },

      // Chat commands
      {
        id: 'chat-with-ai',
        name: 'Chat with AI',
        patterns: [
          'chat about this note',
          'discuss this note',
          'talk about this',
          'chat with ai',
          'open chat',
          'start a conversation',
          'discuss this content'
        ],
        handler: 'handleChatWithAI',
        confidence: 0.8,
        requiresEditor: true
      },

      // Vault analysis commands
      {
        id: 'analyze-vault',
        name: 'Analyze Vault',
        patterns: [
          'analyze my vault',
          'check vault patterns',
          'vault analysis',
          'analyze vault patterns',
          'check my vault',
          'vault health check',
          'analyze patterns'
        ],
        handler: 'handleAnalyzeVault',
        confidence: 0.9
      },

      // Format commands
      {
        id: 'format-note',
        name: 'Format Note',
        patterns: [
          'format this note',
          'fix formatting',
          'clean up formatting',
          'format the text',
          'improve formatting',
          'fix the layout',
          'format content'
        ],
        handler: 'handleFormatNote',
        confidence: 0.9,
        requiresEditor: true
      },

      // Content suggestions
      {
        id: 'content-suggestions',
        name: 'Content Suggestions',
        patterns: [
          'suggest content',
          'content ideas',
          'what should I add',
          'content suggestions',
          'improve content',
          'add more content',
          'expand this note'
        ],
        handler: 'handleContentSuggestions',
        confidence: 0.8,
        requiresEditor: true
      },

      // Quick insights
      {
        id: 'quick-insights',
        name: 'Quick Insights',
        patterns: [
          'get insights',
          'analyze this note',
          'quick insights',
          'note insights',
          'what insights do you have',
          'analyze content',
          'insights about this note'
        ],
        handler: 'handleQuickInsights',
        confidence: 0.8,
        requiresEditor: true
      },

      // Bridge discovery
      {
        id: 'discover-bridges',
        name: 'Discover Bridges',
        patterns: [
          'find bridge opportunities',
          'discover connections',
          'find missing links',
          'bridge opportunities',
          'connect notes',
          'find gaps',
          'discover bridges'
        ],
        handler: 'handleDiscoverBridges',
        confidence: 0.9
      },

      // Research commands
      {
        id: 'research-notes',
        name: 'Generate Research Notes',
        patterns: [
          'generate research notes',
          'research topics',
          'create research',
          'start research',
          'research generation',
          'make research notes',
          'automated research'
        ],
        handler: 'handleGenerateResearchNotes',
        confidence: 0.9
      },

      // Comprehensive research
      {
        id: 'comprehensive-research',
        name: 'Comprehensive Research',
        patterns: [
          'comprehensive research',
          'deep research',
          'thorough research',
          'complete research',
          'full research system',
          'advanced research',
          'detailed research'
        ],
        handler: 'handleComprehensiveResearch',
        confidence: 0.9
      },

      // Voice system commands
      {
        id: 'toggle-voice',
        name: 'Toggle Voice',
        patterns: [
          'toggle voice',
          'turn on voice',
          'turn off voice',
          'enable voice',
          'disable voice',
          'voice mode',
          'switch voice'
        ],
        handler: 'handleToggleVoice',
        confidence: 0.9
      },

      {
        id: 'test-speak',
        name: 'Test Voice Speaking',
        patterns: [
          'test speaking',
          'test voice',
          'test tts',
          'test text to speech',
          'speak test',
          'voice test',
          'test audio output'
        ],
        handler: 'handleTestSpeak',
        confidence: 0.9
      },

      // Vault agent commands
      {
        id: 'vault-agent-chat',
        name: 'Vault Agent Chat',
        patterns: [
          'open vault agent',
          'vault agent chat',
          'chat with vault agent',
          'start vault chat',
          'open ai chat',
          'vault agent',
          'agent chat'
        ],
        handler: 'handleVaultAgentChat',
        confidence: 0.9
      },

      {
        id: 'vault-agent-sidebar',
        name: 'Vault Agent Sidebar',
        patterns: [
          'open vault sidebar',
          'show vault agent',
          'vault agent sidebar',
          'open agent sidebar',
          'show agent panel',
          'vault sidebar',
          'agent panel'
        ],
        handler: 'handleVaultAgentSidebar',
        confidence: 0.9
      },

      // Research agent commands
      {
        id: 'research-agent-sidebar',
        name: 'Research Agent Sidebar',
        patterns: [
          'open research agent',
          'show research sidebar',
          'research agent sidebar',
          'research panel',
          'open research panel',
          'research sidebar',
          'research agent'
        ],
        handler: 'handleResearchAgentSidebar',
        confidence: 0.9
      },

      // Search commands
      {
        id: 'semantic-search',
        name: 'Semantic Search',
        patterns: [
          'semantic search',
          'search by meaning',
          'intelligent search',
          'smart search',
          'find similar content',
          'search semantically',
          'meaning search'
        ],
        handler: 'handleSemanticSearch',
        confidence: 0.9
      },

      // Backlink commands
      {
        id: 'intelligent-backlinks',
        name: 'Intelligent Backlinks',
        patterns: [
          'smart backlinks',
          'intelligent backlinks',
          'suggest connections',
          'find backlinks',
          'smart links',
          'connection suggestions',
          'link suggestions'
        ],
        handler: 'handleIntelligentBacklinks',
        confidence: 0.9
      }
    ];

    console.log('[VoiceCommandInterpreter] Initialized with', this.commands.length, 'voice commands');
  }

  /**
   * Interpret voice input and find matching commands
   */
  interpretCommand(voiceInput: string): CommandMatch[] {
    const normalizedInput = this.normalizeInput(voiceInput);
    const matches: CommandMatch[] = [];

    for (const command of this.commands) {
      const confidence = this.calculateConfidence(normalizedInput, command);
      
      if (confidence > 0.4) { // Threshold for considering a match
        matches.push({
          command,
          confidence,
          intent: normalizedInput
        });
      }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 3 matches
    return matches.slice(0, 3);
  }

  /**
   * Get the best command match
   */
  getBestMatch(voiceInput: string): CommandMatch | null {
    const matches = this.interpretCommand(voiceInput);
    
    if (matches.length > 0 && matches[0].confidence > 0.6) {
      return matches[0];
    }
    
    return null;
  }

  /**
   * Check if command is executable in current context
   */
  isCommandExecutable(command: VoiceCommand, hasActiveEditor: boolean, hasActiveFile: boolean): boolean {
    if (command.requiresEditor && !hasActiveEditor) {
      return false;
    }
    
    if (command.requiresFile && !hasActiveFile) {
      return false;
    }
    
    return true;
  }

  /**
   * Get command execution context requirements
   */
  getCommandRequirements(command: VoiceCommand): string[] {
    const requirements: string[] = [];
    
    if (command.requiresEditor) {
      requirements.push('Active editor with markdown file');
    }
    
    if (command.requiresFile) {
      requirements.push('Active file in workspace');
    }
    
    return requirements;
  }

  /**
   * Normalize voice input for better matching
   */
  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      // Remove common voice recognition artifacts
      .replace(/[.,!?;:]/g, '')
      // Handle common voice recognition errors
      .replace(/\bopened\b/g, 'open')
      .replace(/\bopening\b/g, 'open')
      .replace(/\bstarted\b/g, 'start')
      .replace(/\bstarting\b/g, 'start')
      .replace(/\bcreated\b/g, 'create')
      .replace(/\bcreating\b/g, 'create')
      // Handle plurals
      .replace(/\bnotes?\b/g, 'note')
      .replace(/\btags?\b/g, 'tag')
      // Common voice shortcuts
      .replace(/\bai\b/g, 'ai')
      .replace(/\bok\b/g, '')
      .replace(/\bplease\b/g, '')
      .replace(/\bcan you\b/g, '')
      .replace(/\bcould you\b/g, '')
      .replace(/\bi want to\b/g, '')
      .replace(/\bi need to\b/g, '')
      .replace(/\bi would like to\b/g, '')
      .trim();
  }

  /**
   * Calculate confidence score for command match
   */
  private calculateConfidence(normalizedInput: string, command: VoiceCommand): number {
    let maxConfidence = 0;
    
    for (const pattern of command.patterns) {
      const confidence = this.calculatePatternConfidence(normalizedInput, pattern);
      maxConfidence = Math.max(maxConfidence, confidence);
    }
    
    return maxConfidence * command.confidence;
  }

  /**
   * Calculate confidence for a specific pattern
   */
  private calculatePatternConfidence(input: string, pattern: string): number {
    const inputWords = input.split(/\s+/);
    const patternWords = pattern.toLowerCase().split(/\s+/);
    
    // Exact match
    if (input === pattern.toLowerCase()) {
      return 1.0;
    }
    
    // Substring match
    if (input.includes(pattern.toLowerCase())) {
      return 0.95;
    }
    
    // Word-based matching
    let matchedWords = 0;
    let totalWords = patternWords.length;
    
    for (const patternWord of patternWords) {
      if (inputWords.some(inputWord => 
        inputWord === patternWord || 
        inputWord.includes(patternWord) ||
        patternWord.includes(inputWord)
      )) {
        matchedWords++;
      }
    }
    
    const wordMatchRatio = matchedWords / totalWords;
    
    // Bonus for sequential words
    let sequentialBonus = 0;
    for (let i = 0; i < patternWords.length - 1; i++) {
      const word1 = patternWords[i];
      const word2 = patternWords[i + 1];
      
      const input1Index = inputWords.findIndex(w => w === word1 || w.includes(word1) || word1.includes(w));
      const input2Index = inputWords.findIndex(w => w === word2 || w.includes(word2) || word2.includes(w));
      
      if (input1Index >= 0 && input2Index >= 0 && input2Index === input1Index + 1) {
        sequentialBonus += 0.1;
      }
    }
    
    return Math.min(1.0, wordMatchRatio + sequentialBonus);
  }

  /**
   * Extract parameters from voice input for parameterized commands
   */
  extractParameters(input: string, command: VoiceCommand): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract common parameters
    const words = input.split(/\s+/);
    
    // Extract topic/subject for research commands
    if (command.id.includes('research')) {
      const topicKeywords = ['about', 'on', 'for', 'regarding', 'concerning'];
      for (const keyword of topicKeywords) {
        const index = words.indexOf(keyword);
        if (index >= 0 && index < words.length - 1) {
          parameters.topic = words.slice(index + 1).join(' ');
          break;
        }
      }
    }
    
    // Extract file references
    const filePattern = /(?:file|note|document)\s+["']?([^"']+)["']?/i;
    const fileMatch = input.match(filePattern);
    if (fileMatch) {
      parameters.fileName = fileMatch[1];
    }
    
    // Extract numbers
    const numberPattern = /(\d+)/g;
    const numberMatches = input.match(numberPattern);
    if (numberMatches) {
      parameters.numbers = numberMatches.map(num => parseInt(num));
    }
    
    return parameters;
  }

  /**
   * Get all available voice commands
   */
  getAvailableCommands(): VoiceCommand[] {
    return [...this.commands];
  }

  /**
   * Get commands filtered by current context
   */
  getContextualCommands(hasActiveEditor: boolean, hasActiveFile: boolean): VoiceCommand[] {
    return this.commands.filter(command => 
      this.isCommandExecutable(command, hasActiveEditor, hasActiveFile)
    );
  }

  /**
   * Add custom voice command
   */
  addCustomCommand(command: VoiceCommand): void {
    this.commands.push(command);
    console.log('[VoiceCommandInterpreter] Added custom command:', command.id);
  }

  /**
   * Remove voice command
   */
  removeCommand(commandId: string): boolean {
    const index = this.commands.findIndex(cmd => cmd.id === commandId);
    if (index >= 0) {
      this.commands.splice(index, 1);
      console.log('[VoiceCommandInterpreter] Removed command:', commandId);
      return true;
    }
    return false;
  }

  /**
   * Generate help text for voice commands
   */
  generateVoiceCommandHelp(): string {
    const categories = {
      'Note Enhancement': ['enhance-note', 'format-note', 'content-suggestions'],
      'Tagging & Analysis': ['quick-tag', 'quick-insights', 'analyze-vault'],
      'Content Processing': ['summarize', 'chat-with-ai'],
      'Research': ['research-notes', 'comprehensive-research', 'discover-bridges'],
      'Search & Discovery': ['semantic-search', 'intelligent-backlinks'],
      'Voice System': ['toggle-voice', 'test-speak'],
      'Interface': ['vault-agent-sidebar', 'vault-agent-chat', 'research-agent-sidebar']
    };

    let help = '# Voice Commands Available\n\n';
    
    for (const [category, commandIds] of Object.entries(categories)) {
      help += `## ${category}\n\n`;
      
      for (const commandId of commandIds) {
        const command = this.commands.find(cmd => cmd.id === commandId);
        if (command) {
          help += `### ${command.name}\n`;
          help += `**Example phrases:** "${command.patterns.slice(0, 3).join('", "')}"\n\n`;
        }
      }
    }
    
    return help;
  }
}