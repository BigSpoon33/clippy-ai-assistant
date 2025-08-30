/**
 * CLIPPY TCG Writer - AI Commentary System with Training Foundation
 * Provides context-aware writing commentary and collects training data
 * Following PRP specifications for AI integration and model training preparation
 */

import { App, TFile } from 'obsidian';
import { 
  TCGSettings, 
  WritingContext, 
  CommentaryTrainingData, 
  VaultPersonality,
  AnonymizedVaultMetrics,
  TrainingDataExport
} from '../types';
import { ClippySettings } from '../../../types';
import { PlayerManager } from '../core/player-manager';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';
import { ProviderFactory } from '../../../ai/provider-factory';

// ===== COMMENTARY INTERFACES =====

export interface CommentaryRequest {
  type: 'achievement' | 'level_up' | 'pack_opening' | 'high_performance' | 'encouragement' | 'insight';
  context: ObsidianAwareContext;
  urgency: 'low' | 'medium' | 'high';
  personalityHint?: string;
  maxLength?: number;
  id?: string; // For queue tracking
  timestamp?: Date; // For queue ordering
}

export interface CommentaryResponse {
  id: string;
  text: string;
  type: string;
  confidence: number;
  generationTime: number;
  contextUsed: string[];
  personalityElements: string[];
  suggestedActions?: string[];
  timestamp: Date;
}

export interface CommentaryFeedback {
  commentaryId: string;
  userReaction: 'positive' | 'negative' | 'neutral' | 'dismissed';
  timeToReaction: number;
  userComment?: string;
  effectivenessScore: number; // 0-1
  contextRelevance: number; // 0-1
  timestamp: Date;
}

export interface CommentaryAnalytics {
  totalCommentaries: number;
  averageConfidence: number;
  averageGenerationTime: number;
  typeDistribution: Record<string, number>;
  feedbackStats: {
    positive: number;
    negative: number;
    neutral: number;
    dismissed: number;
    averageEffectiveness: number;
  };
  contextPatterns: Record<string, number>;
  improvementSuggestions: string[];
}

/**
 * Player Journal interface for tracking user's recent writing
 */
export interface PlayerJournal {
  keystrokes: string[];
  totalCharacters: number;
  lastUpdate: number;
  currentContext: string;
}

/**
 * Obsidian-aware context for AI commentary
 */
export interface ObsidianAwareContext {
  // Writing metrics
  kpm?: number;
  qualityScore?: number;
  streak?: number;
  sessionTime?: number;
  
  // World state (passed from buildWorldContext)
  location?: string;
  weather?: string;
  threatLevel?: string;
  timeOfDay?: string;
  activeEvents?: any[];
  
  // Vault context
  vaultSize?: number;
  recentFiles?: string[];
  tags?: string[];
  
  // Theme and customization
  theme?: string;
  personalityHints?: string[];
  
  // Additional context
  triggerType?: string;
  rawContext?: string;
}

// ===== VAULT ANALYSIS UTILITIES =====

/**
 * Analyzes vault structure and user behavior patterns
 */
export class VaultAnalyzer {
  private app: App;
  private settings: TCGSettings;
  
  constructor(app: App, settings: TCGSettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Analyze vault structure and determine personality profile
   */
  async analyzeVaultPersonality(): Promise<VaultPersonality> {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        const files = this.app.vault.getMarkdownFiles();
        const metadata = this.app.metadataCache;
        
        // Analyze organizational patterns
        const organizationalStyle = this.analyzeOrganizationalStyle(files);
        
        // Analyze writing style
        const writingStyle = await this.analyzeWritingStyle(files);
        
        // Analyze primary topics
        const primaryTopics = await this.analyzePrimaryTopics(files);
        
        // Analyze linking patterns
        const linkingStyle = this.analyzeLinkingStyle(files, metadata);
        
        // Determine workflow type
        const workflowType = this.determineWorkflowType(files);
        
        return {
          writingStyle,
          primaryTopics,
          organizationalStyle,
          linkingStyle,
          workflowType
        };
      },
      'Vault personality analysis'
    ) || {
      writingStyle: 'balanced',
      primaryTopics: ['general'],
      organizationalStyle: 'flat',
      linkingStyle: 'minimal',
      workflowType: 'casual'
    };
  }

  /**
   * Analyze how the user organizes their vault
   */
  private analyzeOrganizationalStyle(files: TFile[]): string {
    const pathDepths = files.map(file => file.path.split('/').length - 1);
    const averageDepth = pathDepths.reduce((sum, depth) => sum + depth, 0) / pathDepths.length;
    const maxDepth = Math.max(...pathDepths);
    
    if (averageDepth < 1) return 'flat';
    if (averageDepth >= 1 && averageDepth < 2.5) return 'moderate';
    if (averageDepth >= 2.5 && maxDepth >= 4) return 'hierarchical';
    return 'structured';
  }

  /**
   * Analyze writing style from content patterns
   */
  private async analyzeWritingStyle(files: TFile[]): Promise<string> {
    const sampleSize = Math.min(files.length, 20); // Analyze subset for performance
    const sampleFiles = files.slice(0, sampleSize);
    
    let totalWords = 0;
    let hasCodeBlocks = 0;
    let hasMathFormulas = 0;
    let hasImages = 0;
    let hasLists = 0;
    let hasHeadings = 0;
    
    for (const file of sampleFiles) {
      try {
        const content = await this.app.vault.read(file);
        const words = content.split(/\s+/).filter(word => word.length > 0);
        totalWords += words.length;
        
        if (content.includes('```')) hasCodeBlocks++;
        if (content.includes('$$') || content.includes('$')) hasMathFormulas++;
        if (content.includes('![')) hasImages++;
        if (content.match(/^[-*+]\s/m)) hasLists++;
        if (content.match(/^#+\s/m)) hasHeadings++;
        
      } catch (error) {
        continue;
      }
    }
    
    const avgWordsPerFile = totalWords / sampleFiles.length;
    const technicalRatio = (hasCodeBlocks + hasMathFormulas) / sampleFiles.length;
    const structuredRatio = (hasLists + hasHeadings) / sampleFiles.length;
    const visualRatio = hasImages / sampleFiles.length;
    
    if (technicalRatio > 0.3) return 'technical';
    if (visualRatio > 0.4) return 'visual';
    if (structuredRatio > 0.6) return 'structured';
    if (avgWordsPerFile > 1000) return 'verbose';
    if (avgWordsPerFile < 200) return 'concise';
    return 'balanced';
  }

  /**
   * Analyze primary topics from tags and content
   */
  private async analyzePrimaryTopics(files: TFile[]): Promise<string[]> {
    const tagCounts: Record<string, number> = {};
    const folderCounts: Record<string, number> = {};
    
    for (const file of files) {
      // Analyze folder structure
      const folder = file.path.split('/')[0];
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      
      // Analyze tags from metadata
      const metadata = this.app.metadataCache.getFileCache(file);
      if (metadata?.tags) {
        for (const tag of metadata.tags) {
          const cleanTag = tag.tag.replace('#', '').toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        }
      }
    }
    
    // Get top topics from tags and folders
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
    
    const topFolders = Object.entries(folderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([folder]) => folder);
    
    return [...new Set([...topTags, ...topFolders])];
  }

  /**
   * Analyze linking behavior patterns
   */
  private analyzeLinkingStyle(files: TFile[], metadata: any): string {
    let totalLinks = 0;
    let totalBacklinks = 0;
    let filesWithLinks = 0;
    
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const links = cache?.links?.length || 0;
      
      if (links > 0) {
        filesWithLinks++;
        totalLinks += links;
      }
      
      // Count backlinks (simplified)
      const backlinks = Object.keys(this.app.metadataCache.resolvedLinks)
        .reduce((count, sourcePath) => {
          const sourceLinks = this.app.metadataCache.resolvedLinks[sourcePath];
          return count + (sourceLinks[file.path] ? sourceLinks[file.path] : 0);
        }, 0);
      
      totalBacklinks += backlinks;
    }
    
    const avgLinksPerFile = totalLinks / files.length;
    const avgBacklinksPerFile = totalBacklinks / files.length;
    const linkingRatio = filesWithLinks / files.length;
    
    if (linkingRatio > 0.7 && avgLinksPerFile > 5) return 'heavy';
    if (linkingRatio > 0.4 && avgLinksPerFile > 2) return 'moderate';
    if (linkingRatio > 0.2) return 'light';
    return 'minimal';
  }

  /**
   * Determine user's workflow type
   */
  private determineWorkflowType(files: TFile[]): string {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let recentFiles = 0;
    let oldFiles = 0;
    let regularlyUpdated = 0;
    
    for (const file of files) {
      const age = now - file.stat.ctime;
      const timeSinceModified = now - file.stat.mtime;
      
      if (age < 7 * dayMs) recentFiles++;
      if (age > 30 * dayMs) oldFiles++;
      if (timeSinceModified < 7 * dayMs && file.stat.ctime !== file.stat.mtime) {
        regularlyUpdated++;
      }
    }
    
    const recentRatio = recentFiles / files.length;
    const updateRatio = regularlyUpdated / files.length;
    
    if (recentRatio > 0.5 && updateRatio > 0.3) return 'active';
    if (updateRatio > 0.2) return 'maintenance';
    if (recentRatio > 0.3) return 'growing';
    return 'casual';
  }

  /**
   * Generate anonymized vault metrics for training
   */
  generateAnonymizedMetrics(personality: VaultPersonality): AnonymizedVaultMetrics {
    const files = this.app.vault.getMarkdownFiles();
    const totalNotes = files.length;
    
    // Calculate average note length
    let totalSize = 0;
    for (const file of files.slice(0, 50)) { // Sample for performance
      totalSize += file.stat.size;
    }
    const avgNoteLength = totalSize / Math.min(files.length, 50);
    
    // Calculate link density
    let totalLinks = 0;
    for (const file of files.slice(0, 50)) {
      const cache = this.app.metadataCache.getFileCache(file);
      totalLinks += cache?.links?.length || 0;
    }
    const linkDensity = totalLinks / Math.min(files.length, 50);
    
    return {
      noteCount: totalNotes,
      avgNoteLength,
      linkDensity,
      structuralComplexity: this.calculateStructuralComplexity(files.slice(0, 20)),
      activityPatterns: [personality.workflowType, personality.organizationalStyle]
    };
  }

  /**
   * Calculate structural complexity score
   */
  private calculateStructuralComplexity(files: TFile[]): number {
    const pathDepths = files.map(file => file.path.split('/').length - 1);
    const avgDepth = pathDepths.reduce((sum, depth) => sum + depth, 0) / pathDepths.length;
    const uniqueFolders = new Set(files.map(file => file.path.split('/').slice(0, -1).join('/'))).size;
    
    return Math.min((avgDepth + Math.log(uniqueFolders + 1)) / 5, 1);
  }
}

// ===== MAIN COMMENTARY SYSTEM =====

/**
 * AI Commentary System with training data collection
 */
export class AICommentarySystem {
  private app: App;
  private settings: TCGSettings;
  private clippySettings: ClippySettings;
  private playerManager: PlayerManager;
  private vaultAnalyzer: VaultAnalyzer;
  
  // Commentary data
  private commentaryHistory: CommentaryResponse[] = [];
  private feedbackHistory: CommentaryFeedback[] = [];
  private trainingData: CommentaryTrainingData[] = [];
  private vaultPersonality: VaultPersonality | null = null;
  
  // Player Journal - tracks last 1000 keystrokes for AI context
  private playerJournal: PlayerJournal = {
    keystrokes: [],
    totalCharacters: 0,
    lastUpdate: Date.now(),
    currentContext: ''
  };
  
  // Message queuing system
  private messageQueue: CommentaryRequest[] = [];
  private isProcessingQueue = false;
  private queueTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Performance tracking
  private analytics: CommentaryAnalytics = {
    totalCommentaries: 0,
    averageConfidence: 0,
    averageGenerationTime: 0,
    typeDistribution: {},
    feedbackStats: {
      positive: 0,
      negative: 0,
      neutral: 0,
      dismissed: 0,
      averageEffectiveness: 0
    },
    contextPatterns: {},
    improvementSuggestions: []
  };

  constructor(app: App, settings: TCGSettings, clippySettings: ClippySettings, playerManager: PlayerManager) {
    this.app = app;
    this.settings = settings;
    this.clippySettings = clippySettings;
    this.playerManager = playerManager;
    this.vaultAnalyzer = new VaultAnalyzer(app, settings);
    
    this.initializeCommentarySystem();
  }

  /**
   * Initialize the commentary system
   */
  private async initializeCommentarySystem(): Promise<void> {
    try {
      // Analyze vault personality
      this.vaultPersonality = await this.vaultAnalyzer.analyzeVaultPersonality();
      
      // Load any existing training data
      this.loadTrainingData();
      
      // Set up keystroke monitoring for player journal
      this.initializePlayerJournalTracking();
      
      console.log('🤖 AI Commentary System initialized with player journal tracking');
      console.log(`📊 Vault Personality: ${JSON.stringify(this.vaultPersonality)}`);
      
    } catch (error) {
      console.warn('Failed to initialize AI commentary system:', error);
    }
  }

  /**
   * Initialize player journal keystroke tracking
   */
  private initializePlayerJournalTracking(): void {
    // Listen for editor changes to capture user's writing
    this.app.workspace.on('editor-change', (editor, view) => {
      if (view && view.file) {
        const content = editor.getValue();
        this.updatePlayerJournal(content, view.file.path);
      }
    });

    console.log('📝 Player journal keystroke tracking initialized');
  }

  /**
   * Update player journal with new content (last 1000 keystrokes)
   */
  private updatePlayerJournal(content: string, filePath: string): void {
    const now = Date.now();
    
    // Update journal with recent content (last 1000 characters)
    const recentContent = content.slice(-1000);
    
    this.playerJournal = {
      keystrokes: [recentContent], // Store as single string for simplicity
      totalCharacters: recentContent.length,
      lastUpdate: now,
      currentContext: `Writing in: ${filePath.split('/').pop() || filePath}`
    };
    
    // Clean old journal entries (optional: could maintain a rolling window)
    if (this.playerJournal.keystrokes.length > 1) {
      this.playerJournal.keystrokes = this.playerJournal.keystrokes.slice(-1);
    }
  }

  /**
   * Get player journal content for AI context
   */
  private getPlayerJournalContext(): string {
    if (this.playerJournal.keystrokes.length === 0) {
      return "No recent writing activity detected.";
    }

    const recentContent = this.playerJournal.keystrokes[0] || '';
    const contextInfo = `${this.playerJournal.currentContext} (${this.playerJournal.totalCharacters} characters)`;
    
    return `Recent Writing Context: ${contextInfo}\n\nLast 1000 keystrokes:\n"${recentContent}"`;
  }

  /**
   * Generate contextual commentary based on writing situation (with queuing)
   */
  async generateCommentary(request: CommentaryRequest): Promise<CommentaryResponse> {
    // Add ID and timestamp if not present
    if (!request.id) {
      request.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!request.timestamp) {
      request.timestamp = new Date();
    }

    console.log(`📥 Queuing commentary request: ${request.type} (${request.urgency}) - ID: ${request.id}`);
    
    // Add request to queue with priority ordering
    this.addRequestToQueue(request);
    return await this.processMessageQueue();
  }

  /**
   * Add request to queue with priority ordering
   */
  private addRequestToQueue(request: CommentaryRequest): void {
    // Priority order: high > medium > low
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    let insertIndex = this.messageQueue.length;
    
    // Find insertion point based on urgency
    for (let i = 0; i < this.messageQueue.length; i++) {
      const existingPriority = priorityOrder[this.messageQueue[i].urgency];
      const newPriority = priorityOrder[request.urgency];
      
      if (newPriority > existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messageQueue.splice(insertIndex, 0, request);
    console.log(`📊 Queue status: ${this.messageQueue.length} messages, position ${insertIndex}`);
  }

  /**
   * Process message queue sequentially to prevent overlapping responses
   */
  private async processMessageQueue(): Promise<CommentaryResponse> {
    if (this.isProcessingQueue) {
      // If already processing, wait for current processing to complete
      return new Promise((resolve) => {
        const checkQueue = () => {
          if (!this.isProcessingQueue && this.messageQueue.length > 0) {
            this.processNextMessage().then(resolve);
          } else if (!this.isProcessingQueue) {
            // Queue is empty, return a default response
            resolve(this.createDefaultResponse());
          } else {
            setTimeout(checkQueue, 50); // Check again in 50ms
          }
        };
        checkQueue();
      });
    }

    return await this.processNextMessage();
  }

  /**
   * Process the next message in the queue
   */
  private async processNextMessage(): Promise<CommentaryResponse> {
    if (this.messageQueue.length === 0) {
      return this.createDefaultResponse();
    }

    this.isProcessingQueue = true;
    
    try {
      const request = this.messageQueue.shift()!;
      console.log(`⚙️ Processing commentary: ${request.type} (${request.urgency}) - ID: ${request.id}`);
      
      // Clear any timeout for this request
      if (request.id && this.queueTimeouts.has(request.id)) {
        clearTimeout(this.queueTimeouts.get(request.id)!);
        this.queueTimeouts.delete(request.id);
      }
      
      const response = await this.generateCommentaryInternal(request);
      
      console.log(`✅ Commentary generated: ${response.text.substring(0, 50)}...`);
      
      // If there are more messages in queue, continue processing them
      if (this.messageQueue.length > 0) {
        console.log(`📋 ${this.messageQueue.length} messages remaining in queue`);
        // Process next message in the background (don't await)
        setTimeout(() => this.processNextMessage(), 100);
      }
      
      return response;
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Create a default response when no messages are in queue
   */
  private createDefaultResponse(): CommentaryResponse {
    return {
      id: `default-${Date.now()}`,
      text: "Keep up the great work!",
      type: 'encouragement',
      confidence: 0.8,
      generationTime: 0,
      contextUsed: ['default'],
      personalityElements: ['encouraging'],
      timestamp: new Date()
    };
  }

  /**
   * Internal commentary generation implementing the AI workflow:
   * RNG World Context → Game Master AI → Player Character AI → Delivery
   */
  private async generateCommentaryInternal(request: CommentaryRequest): Promise<CommentaryResponse> {
    const startTime = Date.now();
    
    return await ClippyErrorBoundaries.aiProviderOperation(
      async () => {
        // Step 1: Build comprehensive context (includes RNG world state)
        const enhancedContext = await this.buildEnhancedContext(request.context);
        
        // Step 2: Generate commentary using AI-driven workflow
        const commentary = await this.generateAICommentary(request, enhancedContext);
        
        const generationTime = Date.now() - startTime;
        
        const response: CommentaryResponse = {
          id: `commentary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: commentary.text,
          type: request.type,
          confidence: commentary.confidence,
          generationTime,
          contextUsed: commentary.contextUsed,
          personalityElements: commentary.personalityElements,
          suggestedActions: commentary.suggestedActions,
          timestamp: new Date()
        };
        
        // Store for analytics and training
        this.commentaryHistory.push(response);
        this.updateAnalytics(response);
        
        // Create training data entry
        this.createTrainingDataEntry(request, enhancedContext, response);
        
        console.log(`🤖 Generated commentary: ${response.text.substring(0, 50)}...`);
        
        return response;
      },
      'AI commentary generation'
    ) || this.createFallbackCommentary(request);
  }

  /**
   * Build enhanced context for commentary generation
   */
  private async buildEnhancedContext(baseContext: ObsidianAwareContext): Promise<ObsidianAwareContext> {
    const currentFile = this.app.workspace.getActiveFile();
    const playerProfile = this.playerManager.getPlayerProfile();
    const collection = this.playerManager.getCollectionSummary();
    
    // Enhance with vault insights
    const vaultInsights = {
      activeNoteType: this.classifyNoteType(currentFile),
      recentNotePatterns: await this.analyzeRecentNotePatterns(),
      linkingBehavior: this.analyzeLinkingBehavior(),
      tagUsagePatterns: this.analyzeTagUsage(),
      focusedTopic: await this.determineFocusedTopic(),
      sessionFlow: this.analyzeSessionFlow()
    };
    
    // Enhance with writing quality analysis
    const writingQuality = {
      structuralCoherence: this.calculateStructuralCoherence(currentFile),
      conceptualDepth: this.calculateConceptualDepth(currentFile),
      connectionDensity: this.calculateConnectionDensity(currentFile),
      originalityScore: await this.calculateOriginalityScore(currentFile)
    };
    
    return {
      ...baseContext,
      vaultInsights,
      writingQuality
    };
  }

  /**
   * Classify the type of the current note
   */
  private classifyNoteType(file: TFile | null): string {
    if (!file) return 'unknown';
    
    const path = file.path.toLowerCase();
    const name = file.basename.toLowerCase();
    
    // Check for common patterns
    if (name.match(/^\d{4}-\d{2}-\d{2}/)) return 'daily_note';
    if (path.includes('project')) return 'project_note';
    if (path.includes('meeting')) return 'meeting_note';
    if (name.includes('moc') || name.includes('index')) return 'index_note';
    if (path.includes('template')) return 'template';
    if (name.startsWith('untitled')) return 'scratch_note';
    
    return 'general_note';
  }

  /**
   * Generate AI-driven commentary using the enhanced workflow:
   * RNG World Context + Player Journal → Game Master AI → Player Character AI → Delivery
   */
  private async generateAICommentary(
    request: CommentaryRequest,
    context: ObsidianAwareContext
  ): Promise<{
    text: string;
    confidence: number;
    contextUsed: string[];
    personalityElements: string[];
    suggestedActions?: string[];
  }> {
    try {
      // Check if AI commentary is enabled
      if (!this.settings.enableAICommentary) {
        return this.generateRuleBasedCommentary(request, context);
      }

      // Create AI provider
      const aiProvider = await ProviderFactory.createProvider(this.clippySettings);
      
      // Step 1: Extract world state from context (the RNG-generated world context)
      const worldState = this.extractWorldStateFromContext(context);
      
      // Step 2: Get player journal (last 1000 keystrokes)
      const playerJournalContext = this.getPlayerJournalContext();
      
      // Step 3: Game Master AI - Generate environmental description
      const gameMasterPrompt = `${this.settings.gameMasterPrompt}\n\n${this.buildGameMasterInput(worldState, playerJournalContext, request.type)}`;
      const gameMasterResponse = await aiProvider.generateResponse(gameMasterPrompt);
      
      // Step 4: Player Character AI - Generate personal reaction
      const playerCharacterPrompt = `${this.settings.playerCharacterPrompt}\n\n${this.buildPlayerCharacterInput(
        worldState, 
        playerJournalContext, 
        gameMasterResponse, 
        request.type, 
        context
      )}`;
      const playerCharacterResponse = await aiProvider.generateResponse(playerCharacterPrompt);
      
      // Step 5: Combine responses for final commentary
      const combinedText = `${gameMasterResponse}\n\n${playerCharacterResponse}`;
      
      return {
        text: combinedText,
        confidence: 0.9, // High confidence for AI-generated content
        contextUsed: ['world_state', 'player_journal', 'writing_metrics', 'vault_context'],
        personalityElements: ['immersive', 'encouraging', 'writing_focused', 'contextual'],
        suggestedActions: this.extractSuggestedActions(request.type)
      };
      
    } catch (error) {
      console.warn('AI commentary generation failed, falling back to rule-based:', error);
      // Fallback to rule-based commentary
      return this.generateRuleBasedCommentary(request, context);
    }
  }

  /**
   * Extract world state information from context
   */
  private extractWorldStateFromContext(context: ObsidianAwareContext): any {
    // The world state should be passed in the context string
    // This is the RNG-generated world information (location, weather, etc.)
    return {
      location: context.location || 'village',
      weather: context.weather || 'sunny',
      threatLevel: context.threatLevel || 'safe',
      timeOfDay: context.timeOfDay || 'day',
      activeEvents: context.activeEvents || []
    };
  }

  /**
   * Build Game Master input prompt with world state and player journal
   */
  private buildGameMasterInput(worldState: any, playerJournal: string, eventType: string): string {
    return `Current World State:
- Location: ${worldState.location}
- Weather: ${worldState.weather}
- Threat Level: ${worldState.threatLevel}
- Time of Day: ${worldState.timeOfDay}
- Active Events: ${worldState.activeEvents.length > 0 ? worldState.activeEvents.join(', ') : 'None'}

${playerJournal}

Event Type: ${eventType}

Generate an immersive environmental description that relates to the writer's current work and the world state. Consider what they're writing about and how the environment might inspire or complement their creative process.`;
  }

  /**
   * Build Player Character input prompt with all context
   */
  private buildPlayerCharacterInput(
    worldState: any, 
    playerJournal: string, 
    gameMasterDescription: string, 
    eventType: string, 
    context: ObsidianAwareContext
  ): string {
    return `World Context:
- Location: ${worldState.location} (${worldState.weather}, ${worldState.threatLevel})
- Time: ${worldState.timeOfDay}

${playerJournal}

Game Master's Environment Description:
"${gameMasterDescription}"

Your Writing Performance:
- Event: ${eventType}
- Writing Speed: ${context.kmp || context.kpm || 0} keystrokes per minute
- Session Quality: ${((context.qualityScore || 0) * 100).toFixed(0)}%
- Current Streak: ${context.streak || 0} days

As a writer adventuring through this environment, react personally to both the scene and your writing progress. Connect your current work to this moment and offer yourself encouragement.`;
  }

  /**
   * Extract suggested actions based on event type
   */
  private extractSuggestedActions(eventType: string): string[] {
    const actionMap: Record<string, string[]> = {
      'achievement': ['Keep up the momentum', 'Try a new writing technique'],
      'level_up': ['Explore new topics', 'Set higher writing goals'],
      'pack_opening': ['Review your new cards', 'Plan your next writing session'],
      'high_performance': ['Maintain this pace', 'Challenge yourself further'],
      'insight': ['Reflect on this moment', 'Apply this inspiration to your current work']
    };
    
    return actionMap[eventType] || ['Continue writing', 'Stay focused'];
  }

  /**
   * Generate rule-based commentary (fallback system)
   */
  private generateRuleBasedCommentary(
    request: CommentaryRequest, 
    context: ObsidianAwareContext
  ): {
    text: string;
    confidence: number;
    contextUsed: string[];
    personalityElements: string[];
    suggestedActions?: string[];
  } {
    const contextUsed: string[] = [];
    const personalityElements: string[] = [];
    const suggestedActions: string[] = [];
    
    let commentary = '';
    let confidence = 0.7;
    
    // Get personality-aware base templates
    const templates = this.getPersonalityAwareTemplates(request.type);
    
    switch (request.type) {
      case 'achievement':
        commentary = this.generateAchievementCommentary(context, templates);
        contextUsed.push('achievement_data', 'player_progress');
        break;
        
      case 'level_up':
        commentary = this.generateLevelUpCommentary(context, templates);
        contextUsed.push('level_data', 'exp_progression');
        suggestedActions.push('Open a new pack to celebrate!');
        break;
        
      case 'pack_opening':
        commentary = this.generatePackOpeningCommentary(context, templates);
        contextUsed.push('pack_data', 'collection_stats');
        break;
        
      case 'high_performance':
        commentary = this.generatePerformanceCommentary(context, templates);
        contextUsed.push('performance_metrics', 'writing_quality');
        confidence = 0.9;
        break;
        
      case 'encouragement':
        commentary = this.generateEncouragementCommentary(context, templates);
        contextUsed.push('writing_patterns', 'vault_personality');
        suggestedActions.push('Try connecting this note to related concepts');
        break;
        
      case 'insight':
        commentary = this.generateInsightCommentary(context, templates);
        contextUsed.push('vault_analysis', 'writing_quality', 'connection_patterns');
        confidence = 0.8;
        break;
        
      default:
        commentary = templates[0] || 'Great work on your knowledge journey!';
    }
    
    // Add personality elements based on vault analysis
    if (this.vaultPersonality) {
      personalityElements.push(
        `writing_style:${this.vaultPersonality.writingStyle}`,
        `organization:${this.vaultPersonality.organizationalStyle}`,
        `workflow:${this.vaultPersonality.workflowType}`
      );
      
      // Adjust commentary based on personality
      commentary = this.adjustCommentaryForPersonality(commentary, this.vaultPersonality);
    }
    
    return {
      text: commentary,
      confidence,
      contextUsed,
      personalityElements,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined
    };
  }

  /**
   * Get personality-aware templates for different commentary types
   */
  private getPersonalityAwareTemplates(type: string): string[] {
    const baseTemplates: Record<string, string[]> = {
      achievement: [
        "🏆 Outstanding achievement! Your knowledge collection grows stronger with every milestone.",
        "⭐ Incredible progress! You're building an impressive repository of insights.",
        "🎉 Achievement unlocked! Your dedication to learning is truly inspiring.",
      ],
      level_up: [
        "🚀 Level up achieved! Your writing power has increased significantly.",
        "📈 Congratulations! You've reached a new level of knowledge mastery.",
        "⚡ Power surge detected! Your intellectual capabilities have expanded.",
      ],
      pack_opening: [
        "📦 Pack opened! Let's see what knowledge treasures await discovery.",
        "✨ New cards revealed! Your collection gains valuable insights.",
        "🎁 Knowledge delivered! These cards will enhance your understanding.",
      ],
      high_performance: [
        "🔥 Incredible typing speed! Your thoughts are flowing like lightning.",
        "⚡ Peak performance detected! You're in the zone today.",
        "🚀 Amazing pace! Your ideas are racing ahead beautifully.",
      ],
      encouragement: [
        "💪 Keep up the great work! Every word adds to your knowledge empire.",
        "🌟 You're making excellent progress! Your thoughts are taking shape.",
        "📝 Wonderful writing! Your ideas are connecting in meaningful ways.",
      ],
      insight: [
        "🧠 Fascinating insight emerging! You're uncovering deep connections.",
        "💡 Brilliant observation! This could lead to breakthrough understanding.",
        "🔍 Interesting pattern detected! Your analysis is revealing hidden truths.",
      ]
    };
    
    return baseTemplates[type] || baseTemplates.encouragement;
  }

  /**
   * Generate achievement-specific commentary
   */
  private generateAchievementCommentary(context: ObsidianAwareContext, templates: string[]): string {
    const achievements = this.playerManager.getUnlockedAchievements();
    const recentAchievement = achievements[achievements.length - 1];
    
    if (recentAchievement) {
      return `🏆 ${recentAchievement.name} unlocked! ${recentAchievement.description} Your knowledge empire expands with ${achievements.length} achievements total.`;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate level-up specific commentary
   */
  private generateLevelUpCommentary(context: ObsidianAwareContext, templates: string[]): string {
    const level = context.theme; // Using theme field for level for simplicity
    return `🚀 Welcome to Level ${level}! Your writing prowess has evolved. With ${context.kpm} KPM and a ${context.streak}-day streak, you're unstoppable!`;
  }

  /**
   * Generate pack opening commentary
   */
  private generatePackOpeningCommentary(context: ObsidianAwareContext, templates: string[]): string {
    const qualityHint = context.qualityScore > 0.8 ? "premium quality" : "valuable";
    return `📦 Pack opening time! Your ${qualityHint} writing has earned you new knowledge cards. Let's discover what insights await!`;
  }

  /**
   * Generate performance commentary
   */
  private generatePerformanceCommentary(context: ObsidianAwareContext, templates: string[]): string {
    if (context.kpm > 200) {
      return `🔥 Blazing speed! ${context.kpm} KPM is exceptional. Your thoughts are flowing like a river of knowledge!`;
    } else if (context.kpm > 150) {
      return `⚡ Great pace! ${context.kpm} KPM shows you're in a productive flow state. Keep riding this wave!`;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate encouragement commentary
   */
  private generateEncouragementCommentary(context: ObsidianAwareContext, templates: string[]): string {
    const insights = context.vaultInsights;
    
    if (insights.activeNoteType === 'daily_note') {
      return "📅 Daily reflection in progress! Your consistent journaling builds lasting knowledge foundations.";
    } else if (insights.activeNoteType === 'project_note') {
      return "🚧 Project development detected! Your structured approach will yield excellent results.";
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate insight commentary
   */
  private generateInsightCommentary(context: ObsidianAwareContext, templates: string[]): string {
    const quality = context.writingQuality;
    
    if (quality.connectionDensity > 0.8) {
      return "🧠 Excellent connection patterns! You're weaving a rich web of interconnected knowledge.";
    } else if (quality.conceptualDepth > 0.8) {
      return "🔍 Deep conceptual exploration detected! You're diving into the heart of complex ideas.";
    } else if (quality.originalityScore > 0.8) {
      return "💡 Highly original thinking! Your unique perspective adds valuable insights to your collection.";
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Adjust commentary based on vault personality
   */
  private adjustCommentaryForPersonality(commentary: string, personality: VaultPersonality): string {
    // Adjust tone based on writing style
    if (personality.writingStyle === 'technical') {
      commentary = commentary.replace(/!/g, '.').replace(/🎉|✨/g, '⚙️');
    } else if (personality.writingStyle === 'casual') {
      commentary = commentary.replace(/\./g, '!');
    }
    
    // Adjust suggestions based on workflow
    if (personality.workflowType === 'maintenance') {
      commentary += ' Consider updating related notes to maintain consistency.';
    } else if (personality.workflowType === 'active') {
      commentary += ' Your rapid development pace is impressive!';
    }
    
    return commentary;
  }

  /**
   * Create fallback commentary when AI generation fails
   */
  private createFallbackCommentary(request: CommentaryRequest): CommentaryResponse {
    const fallbackTexts: Record<string, string> = {
      achievement: 'Great achievement! Your knowledge journey continues to impress.',
      level_up: 'Level up! Your writing skills have grown stronger.',
      pack_opening: 'Pack opening time! New knowledge awaits discovery.',
      high_performance: 'Excellent performance! Your writing flow is outstanding.',
      encouragement: 'Keep up the great work! Every word builds your knowledge.',
      insight: 'Interesting development! Your insights are valuable.'
    };
    
    return {
      id: `fallback-${Date.now()}`,
      text: fallbackTexts[request.type] || 'Your knowledge journey continues!',
      type: request.type,
      confidence: 0.3,
      generationTime: 0,
      contextUsed: ['fallback'],
      personalityElements: [],
      timestamp: new Date()
    };
  }

  /**
   * Record user feedback on commentary
   */
  recordFeedback(
    commentaryId: string,
    reaction: CommentaryFeedback['userReaction'],
    timeToReaction: number,
    userComment?: string
  ): void {
    const commentary = this.commentaryHistory.find(c => c.id === commentaryId);
    if (!commentary) return;
    
    const feedback: CommentaryFeedback = {
      commentaryId,
      userReaction: reaction,
      timeToReaction,
      userComment,
      effectivenessScore: this.calculateEffectivenessScore(reaction, timeToReaction),
      contextRelevance: this.calculateContextRelevance(commentary, reaction),
      timestamp: new Date()
    };
    
    this.feedbackHistory.push(feedback);
    this.updateFeedbackAnalytics(feedback);
    
    // Update training data with feedback
    this.updateTrainingDataWithFeedback(commentaryId, feedback);
    
    console.log(`📊 Feedback recorded: ${reaction} (${feedback.effectivenessScore.toFixed(2)})`);
  }

  /**
   * Calculate effectiveness score from user reaction and timing
   */
  private calculateEffectivenessScore(reaction: CommentaryFeedback['userReaction'], timeToReaction: number): number {
    let baseScore = 0;
    
    switch (reaction) {
      case 'positive': baseScore = 1.0; break;
      case 'neutral': baseScore = 0.5; break;
      case 'negative': baseScore = 0.1; break;
      case 'dismissed': baseScore = 0.0; break;
    }
    
    // Adjust for reaction time (faster reactions often indicate stronger feelings)
    const timeBonus = Math.max(0, 1 - timeToReaction / 10000); // 10 second max
    return Math.min(baseScore + timeBonus * 0.2, 1.0);
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(commentary: CommentaryResponse, reaction: CommentaryFeedback['userReaction']): number {
    // Higher confidence usually correlates with better relevance
    let relevance = commentary.confidence;
    
    // Adjust based on user reaction
    if (reaction === 'positive') relevance = Math.min(relevance + 0.2, 1.0);
    else if (reaction === 'negative') relevance = Math.max(relevance - 0.3, 0.0);
    
    return relevance;
  }

  /**
   * Create training data entry
   */
  private createTrainingDataEntry(
    request: CommentaryRequest,
    context: ObsidianAwareContext,
    response: CommentaryResponse
  ): void {
    const trainingEntry: CommentaryTrainingData = {
      context,
      generatedCommentary: response.text,
      userReaction: null, // Will be updated when feedback is received
      timestamp: new Date(),
      effectivenessScore: 0, // Will be updated with feedback
      vaultContext: {
        noteTypes: [context.vaultInsights.activeNoteType],
        writingPatterns: context.vaultInsights.recentNotePatterns,
        userPreferences: {
          commentaryFrequency: this.settings.commentaryPrompts,
          workflowType: this.vaultPersonality?.workflowType || 'unknown'
        },
        vaultStructure: this.vaultPersonality?.organizationalStyle || 'unknown'
      }
    };
    
    this.trainingData.push(trainingEntry);
    
    // Limit training data size for memory management
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-800); // Keep most recent 800
    }
  }

  /**
   * Update training data with user feedback
   */
  private updateTrainingDataWithFeedback(commentaryId: string, feedback: CommentaryFeedback): void {
    const trainingEntry = this.trainingData.find(entry => 
      entry.generatedCommentary === this.commentaryHistory.find(c => c.id === commentaryId)?.text
    );
    
    if (trainingEntry) {
      trainingEntry.userReaction = feedback.userReaction;
      trainingEntry.effectivenessScore = feedback.effectivenessScore;
    }
  }

  /**
   * Update analytics with new commentary
   */
  private updateAnalytics(response: CommentaryResponse): void {
    this.analytics.totalCommentaries++;
    this.analytics.averageConfidence = 
      (this.analytics.averageConfidence * (this.analytics.totalCommentaries - 1) + response.confidence) / 
      this.analytics.totalCommentaries;
    this.analytics.averageGenerationTime =
      (this.analytics.averageGenerationTime * (this.analytics.totalCommentaries - 1) + response.generationTime) /
      this.analytics.totalCommentaries;
    
    this.analytics.typeDistribution[response.type] = 
      (this.analytics.typeDistribution[response.type] || 0) + 1;
    
    // Update context patterns
    for (const context of response.contextUsed) {
      this.analytics.contextPatterns[context] = 
        (this.analytics.contextPatterns[context] || 0) + 1;
    }
  }

  /**
   * Update feedback analytics
   */
  private updateFeedbackAnalytics(feedback: CommentaryFeedback): void {
    const stats = this.analytics.feedbackStats;
    
    stats[feedback.userReaction]++;
    
    const totalFeedback = stats.positive + stats.negative + stats.neutral + stats.dismissed;
    stats.averageEffectiveness = 
      (stats.averageEffectiveness * (totalFeedback - 1) + feedback.effectivenessScore) / 
      totalFeedback;
  }

  // ===== CONTEXT ANALYSIS METHODS =====

  private async analyzeRecentNotePatterns(): Promise<string[]> {
    // Simplified implementation
    return ['structured', 'detailed'];
  }

  private analyzeLinkingBehavior(): string {
    return this.vaultPersonality?.linkingStyle || 'moderate';
  }

  private analyzeTagUsage(): string[] {
    return this.vaultPersonality?.primaryTopics || [];
  }

  private async determineFocusedTopic(): Promise<string> {
    return this.vaultPersonality?.primaryTopics[0] || 'general';
  }

  private analyzeSessionFlow(): string {
    return 'productive'; // Simplified
  }

  private calculateStructuralCoherence(file: TFile | null): number {
    return 0.7; // Simplified
  }

  private calculateConceptualDepth(file: TFile | null): number {
    return 0.6; // Simplified
  }

  private calculateConnectionDensity(file: TFile | null): number {
    if (!file) return 0;
    
    const cache = this.app.metadataCache.getFileCache(file);
    const links = cache?.links?.length || 0;
    const content = cache?.sections?.length || 1;
    
    return Math.min(links / Math.max(content, 1), 1);
  }

  private async calculateOriginalityScore(file: TFile | null): Promise<number> {
    return 0.5; // Simplified
  }

  // ===== DATA MANAGEMENT =====

  /**
   * Export training data for model training
   */
  exportTrainingData(): TrainingDataExport {
    const anonymizedMetrics = this.vaultPersonality ? 
      this.vaultAnalyzer.generateAnonymizedMetrics(this.vaultPersonality) :
      {
        noteCount: 0,
        avgNoteLength: 0,
        linkDensity: 0,
        structuralComplexity: 0,
        activityPatterns: []
      };

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      batchSize: this.trainingData.length,
      anonymizedVaultMetrics: anonymizedMetrics,
      trainingEntries: this.trainingData.map(entry => ({
        contextVector: this.contextToVector(entry.context),
        commentary: entry.generatedCommentary,
        userFeedback: entry.userReaction,
        effectiveness: entry.effectivenessScore,
        vaultPatterns: entry.vaultContext
      }))
    };
  }

  /**
   * Convert context to numerical vector for training
   */
  private contextToVector(context: ObsidianAwareContext): Record<string, number> {
    return {
      kpm: context.kpm,
      streak: context.streak,
      qualityScore: context.qualityScore,
      structuralCoherence: context.writingQuality.structuralCoherence,
      conceptualDepth: context.writingQuality.conceptualDepth,
      connectionDensity: context.writingQuality.connectionDensity,
      originalityScore: context.writingQuality.originalityScore,
      // Encode categorical data as numerical
      writingStyleCode: this.encodeWritingStyle(this.vaultPersonality?.writingStyle || 'balanced'),
      workflowTypeCode: this.encodeWorkflowType(this.vaultPersonality?.workflowType || 'casual')
    };
  }

  private encodeWritingStyle(style: string): number {
    const styles = ['concise', 'balanced', 'verbose', 'technical', 'visual', 'structured'];
    return styles.indexOf(style) / (styles.length - 1);
  }

  private encodeWorkflowType(workflow: string): number {
    const workflows = ['casual', 'growing', 'maintenance', 'active'];
    return workflows.indexOf(workflow) / (workflows.length - 1);
  }

  /**
   * Load training data from storage
   */
  private loadTrainingData(): void {
    // This would load from plugin data storage
    // For now, start with empty data
    console.log('📊 Training data loaded (placeholder)');
  }

  /**
   * Get analytics summary
   */
  getAnalytics(): CommentaryAnalytics {
    // Update improvement suggestions based on feedback
    this.analytics.improvementSuggestions = this.generateImprovementSuggestions();
    
    return { ...this.analytics };
  }

  /**
   * Generate improvement suggestions based on analytics
   */
  private generateImprovementSuggestions(): string[] {
    const suggestions: string[] = [];
    const stats = this.analytics.feedbackStats;
    const totalFeedback = stats.positive + stats.negative + stats.neutral + stats.dismissed;
    
    if (totalFeedback > 10) {
      if (stats.negative / totalFeedback > 0.3) {
        suggestions.push('Reduce negative feedback by improving context relevance');
      }
      if (stats.dismissed / totalFeedback > 0.4) {
        suggestions.push('Commentary may be too frequent or repetitive');
      }
      if (this.analytics.averageConfidence < 0.6) {
        suggestions.push('Improve confidence by better context analysis');
      }
    }
    
    return suggestions;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    console.log('⚙️ AI Commentary System settings updated');
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean; queueIds: string[] } {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessingQueue,
      queueIds: this.messageQueue.map(req => req.id || 'no-id')
    };
  }

  /**
   * Clear message queue (emergency function)
   */
  clearQueue(): void {
    console.log(`🧹 Clearing message queue (${this.messageQueue.length} messages)`);
    
    // Clear all timeouts
    this.queueTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.queueTimeouts.clear();
    
    // Clear queue
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    console.log('✅ Message queue cleared');
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.clearQueue();
    this.commentaryHistory = [];
    this.feedbackHistory = [];
    this.trainingData = [];
    
    console.log('🧹 AI Commentary System destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick commentary generation
 */
export async function generateQuickCommentary(
  system: AICommentarySystem,
  type: CommentaryRequest['type'],
  context: ObsidianAwareContext
): Promise<CommentaryResponse> {
  return await system.generateCommentary({
    type,
    context,
    urgency: 'medium'
  });
}

/**
 * Quick feedback recording
 */
export function recordQuickFeedback(
  system: AICommentarySystem,
  commentaryId: string,
  reaction: CommentaryFeedback['userReaction']
): void {
  system.recordFeedback(commentaryId, reaction, 1000); // 1 second default
}