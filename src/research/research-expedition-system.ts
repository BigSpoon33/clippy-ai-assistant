/**
 * Research Expedition System - Autonomous AI Research Engine
 * 
 * Orchestrates comprehensive research rabbit holes that automatically:
 * - Analyze vault patterns to understand existing knowledge
 * - Identify gaps and bridge opportunities  
 * - Execute web research to fill knowledge gaps
 * - Create intelligent backlinks and connections
 * - Continue research in promising directions
 * - Build comprehensive knowledge webs
 */

import { App, TFile, Notice, Vault } from 'obsidian';
import { VaultAgent } from '../agents/vault-agent';
import { ComprehensiveResearchSystem } from './comprehensive-research-system';
import { BridgeManager } from '../ui/bridge-manager';
import { IntelligentBacklinkSystem } from '../features/knowledge-management/backlinking/intelligent-backlink-system';
import { IntelligentSearchService } from '../features/knowledge-management/semantic/intelligent-search-service';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';
import { OrphanDetector } from '../features/knowledge-management/discovery/orphan-detector';
import { AutoTagger } from '../features/content-processing/processors/auto-tagger';
import { VaultPatterns } from '../types';
import { unifiedProjectSystem, UnifiedResearchProject } from './unified-project-system';

export interface ResearchExpeditionConfig {
  maxDepth: number;           // How deep to research (default: 3 levels)
  maxBranchesPerLevel: number; // How many tangents per level (default: 5)
  minConfidence: number;      // Minimum confidence for pursuing research (default: 0.7)
  focusAreas: string[];      // Specific areas to prioritize
  excludePatterns: string[]; // Topics/patterns to avoid
  timeLimit: number;         // Max research time in minutes (default: 30)
  qualityThreshold: number;  // Minimum quality score for content creation
}

export interface ResearchProject {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  expeditions: string[]; // expedition IDs
  status: 'active' | 'completed' | 'archived';
  tags?: string[];
  folderPath?: string; // Optional folder organization
}

export interface ResearchState {
  expeditionId: string;
  projectId?: string;        // Associated project ID
  projectName?: string;      // Project name for quick reference
  startTopic: string;
  currentLevel: number;
  exploredTopics: Set<string>;
  researchQueue: ResearchTask[];
  completedTasks: ResearchTask[];
  createdNotes: TFile[];
  discoveredConnections: Connection[];
  startTime: number;
  status: 'planning' | 'researching' | 'synthesizing' | 'complete' | 'paused' | 'error';
}

export interface ResearchTask {
  id: string;
  topic: string;
  level: number;
  parent: string | null;
  priority: number;
  context: string;
  researchType: 'gap-fill' | 'expansion' | 'bridge' | 'validation';
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  status: 'queued' | 'researching' | 'complete' | 'failed' | 'skipped';
  createdAt: number;
}

export interface Connection {
  sourceNote: string;
  targetNote: string;
  connectionType: 'semantic' | 'topical' | 'causal' | 'comparative';
  confidence: number;
  reasoning: string;
}

export interface ExpeditionResult {
  expeditionId: string;
  topic: string;
  notesCreated: number;
  connectionsFormed: number;
  levelsExplored: number;
  timeElapsed: number;
  qualityScore: number;
  knowledgeGapsFilled: number;
  bridgeOpportunitiesRealized: number;
  summary: string;
  nextSuggestedTopics: string[];
}

export class ResearchExpeditionSystem {
  private app: App;
  private plugin: any;
  private vaultAgent: VaultAgent;
  private comprehensiveResearch: ComprehensiveResearchSystem;
  private bridgeManager: BridgeManager;
  private backlinkSystem: IntelligentBacklinkSystem;
  private searchService: IntelligentSearchService;
  private embeddingManager: EmbeddingManager;
  private similarityEngine: SimilarityEngine;
  private orphanDetector: OrphanDetector;
  private autoTagger: AutoTagger;
  
  private activeExpeditions: Map<string, ResearchState> = new Map();
  private activeProjects: Map<string, ResearchProject> = new Map();
  private defaultConfig: ResearchExpeditionConfig;
  private researchAgent: any; // Will be set by the research agent when it initializes

  constructor(app: App, plugin?: any) {
    this.app = app;
    this.plugin = plugin;
    
    // Initialize core systems
    this.vaultAgent = plugin?.vaultAgent || new VaultAgent(app, plugin?.settings);
    this.comprehensiveResearch = new ComprehensiveResearchSystem(app, plugin);
    
    // Initialize semantic systems
    this.embeddingManager = plugin?.embeddingManager || new EmbeddingManager(
      plugin?.settings?.rag?.embeddings?.ollamaUrl,
      plugin?.settings
    );
    this.similarityEngine = plugin?.similarityEngine || new SimilarityEngine(this.embeddingManager);
    this.searchService = new IntelligentSearchService(
      app, 
      this.embeddingManager, 
      this.similarityEngine, 
      plugin?.settings
    );
    
    // Initialize discovery systems
    this.orphanDetector = new OrphanDetector(app.vault, app.metadataCache, this.embeddingManager, this.similarityEngine, plugin?.settings);
    this.bridgeManager = new BridgeManager(app, this.orphanDetector, this.embeddingManager, this.similarityEngine);
    this.backlinkSystem = new IntelligentBacklinkSystem(
      app, 
      this.searchService, 
      this.embeddingManager, 
      this.similarityEngine,
      plugin?.settings
    );

    // Initialize auto-tagger
    const vaultPatterns = plugin?.vaultPatterns || {
      tagPatterns: [],
      dateFormats: [],
      cssClasses: [],
      frontmatterSchemas: [],
      wikilinkPatterns: []
    };
    this.autoTagger = new AutoTagger(plugin?.aiProvider, vaultPatterns);

    // Default configuration
    this.defaultConfig = {
      maxDepth: 3,
      maxBranchesPerLevel: 5,
      minConfidence: 0.7,
      focusAreas: [],
      excludePatterns: [],
      timeLimit: 30,
      qualityThreshold: 0.6
    };
  }

  /**
   * Start an autonomous research expedition
   */
  async startExpedition(
    topic: string, 
    config: Partial<ResearchExpeditionConfig> = {},
    projectContext?: { projectId?: string; projectName?: string; createNew?: { name: string; description?: string; tags?: string[] } }
  ): Promise<string> {
    const expeditionId = this.generateExpeditionId();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Handle project context
    let projectId = projectContext?.projectId;
    let projectName = projectContext?.projectName;

    // Create new project if requested
    if (projectContext?.createNew) {
      const newProject = this.createProject(
        projectContext.createNew.name,
        projectContext.createNew.description,
        projectContext.createNew.tags
      );
      projectId = newProject.id;
      projectName = newProject.name;
    }

    console.log(`🚀 Starting Research Expedition: ${topic}${projectName ? ` (Project: ${projectName})` : ''}`);
    new Notice(`🚀 Starting autonomous research expedition on: ${topic}${projectName ? ` in project "${projectName}"` : ''}`);

    // Initialize expedition state
    const state: ResearchState = {
      expeditionId,
      projectId,
      projectName,
      startTopic: topic,
      currentLevel: 0,
      exploredTopics: new Set([topic.toLowerCase()]),
      researchQueue: [],
      completedTasks: [],
      createdNotes: [],
      discoveredConnections: [],
      startTime: Date.now(),
      status: 'planning'
    };

    this.activeExpeditions.set(expeditionId, state);

    // Link expedition to project if specified
    if (projectId) {
      this.addExpeditionToProject(projectId, expeditionId);
    }

    try {
      // Phase 1: Initial Analysis & Planning
      await this.planExpedition(expeditionId, topic, finalConfig);
      
      // Phase 2: Execute Research
      await this.executeExpedition(expeditionId, finalConfig);
      
      // Phase 3: Synthesize Results
      await this.synthesizeExpedition(expeditionId, finalConfig);
      
      state.status = 'complete';
      
      const result = await this.generateExpeditionResult(expeditionId);
      console.log(`✅ Research Expedition Complete:`, result);
      new Notice(`✅ Research expedition complete! Created ${result.notesCreated} notes with ${result.connectionsFormed} connections`);
      
      return expeditionId;
      
    } catch (error) {
      console.error(`❌ Research expedition failed:`, error);
      state.status = 'error';
      new Notice(`❌ Research expedition failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Phase 1: Analyze vault and plan research strategy
   */
  private async planExpedition(
    expeditionId: string,
    topic: string,
    config: ResearchExpeditionConfig
  ): Promise<void> {
    const state = this.activeExpeditions.get(expeditionId)!;
    state.status = 'planning';
    
    console.log(`🎯 Planning research expedition for: ${topic}`);

    // 1. Analyze existing vault knowledge
    const existingKnowledge = await this.analyzeExistingKnowledge(topic);
    
    // 2. Use research agent's intelligent discovery if available
    let researchOpportunities: any[] = [];
    let knowledgeGaps: string[] = [];
    
    if (this.researchAgent) {
      console.log(`🤖 Using research agent's intelligent discovery system`);
      try {
        // Get research opportunities from the agent's advanced discovery system
        researchOpportunities = await this.researchAgent.discoverResearchOpportunities(topic, 10);
        
        // Convert opportunities to knowledge gaps
        knowledgeGaps = researchOpportunities
          .filter(opp => opp.type === 'gap-fill' || opp.type === 'connection-bridge')
          .map(opp => opp.topic);
        
        console.log(`🎯 Agent discovered ${researchOpportunities.length} opportunities, ${knowledgeGaps.length} gaps`);
      } catch (error) {
        console.warn('Failed to use research agent discovery, falling back to local analysis:', error);
      }
    }
    
    // Fallback to local analysis if agent discovery failed or unavailable
    if (knowledgeGaps.length === 0) {
      console.log(`🔄 Using local knowledge gap analysis`);
      knowledgeGaps = await this.identifyKnowledgeGaps(topic, existingKnowledge);
    }
    
    // 3. Find bridge opportunities for additional context
    const bridgeOpportunities = await this.bridgeManager.getBridgeOpportunities();
    const relevantBridges = bridgeOpportunities.filter(bridge => 
      this.isTopicRelevant(topic, bridge.bridgeConcepts)
    );
    
    // 4. Create initial research tasks with enhanced intelligence
    const initialTasks = await this.createInitialResearchTasks(
      topic, 
      knowledgeGaps, 
      relevantBridges, 
      config,
      researchOpportunities
    );
    
    state.researchQueue.push(...initialTasks);
    
    console.log(`📋 Created ${initialTasks.length} initial research tasks`);
    console.log(`🌉 Found ${relevantBridges.length} relevant bridge opportunities`);
  }

  /**
   * Phase 2: Execute autonomous research
   */
  private async executeExpedition(
    expeditionId: string,
    config: ResearchExpeditionConfig
  ): Promise<void> {
    const state = this.activeExpeditions.get(expeditionId);
    if (!state) {
      console.error(`❌ Cannot execute expedition ${expeditionId}: state not found`);
      return;
    }

    // Ensure state has required properties initialized
    if (!state.researchQueue) {
      console.warn(`⚠️ researchQueue not initialized for expedition ${expeditionId}, initializing empty array`);
      state.researchQueue = [];
    }
    if (!state.completedTasks) {
      console.warn(`⚠️ completedTasks not initialized for expedition ${expeditionId}, initializing empty array`);
      state.completedTasks = [];
    }
    if (!state.createdNotes) {
      console.warn(`⚠️ createdNotes not initialized for expedition ${expeditionId}, initializing empty array`);
      state.createdNotes = [];
    }
    if (!state.exploredTopics) {
      console.warn(`⚠️ exploredTopics not initialized for expedition ${expeditionId}, initializing empty Set`);
      state.exploredTopics = new Set();
    }

    state.status = 'researching';
    
    console.log(`🔬 Executing research expedition...`);

    while (state.researchQueue.length > 0 && 
           state.currentLevel <= config.maxDepth &&
           this.getElapsedTime(state) < config.timeLimit * 60000) {
      
      // Get next highest priority task
      const task = this.getNextTask(state, config);
      if (!task) break;
      
      console.log(`🔍 Researching: ${task.topic} (Level ${task.level})`);
      
      try {
        // Execute research for this task
        const result = await this.executeResearchTask(expeditionId, task, config);
        
        if (result.success) {
          task.status = 'complete';
          state.completedTasks.push(task);
          
          // Add any new notes created
          if (result.notesCreated) {
            state.createdNotes.push(...result.notesCreated);
          }
          
          // Generate follow-up research tasks
          const followUpTasks = await this.generateFollowUpTasks(
            expeditionId, 
            task, 
            result, 
            config
          );
          
          // Add high-priority follow-ups to queue
          const priorityTasks = followUpTasks.filter(t => t.priority > 0.7);
          state.researchQueue.push(...priorityTasks);
          
          console.log(`✅ Completed: ${task.topic}, generated ${followUpTasks.length} follow-up tasks`);
        } else {
          task.status = 'failed';
          console.log(`❌ Failed: ${task.topic} - ${result.error}`);
        }
        
      } catch (error) {
        console.error(`Error executing task ${task.topic}:`, error);
        task.status = 'failed';
      }
      
      // Update current level
      state.currentLevel = Math.max(state.currentLevel, task.level);
      
      // Small delay to prevent overwhelming
      await this.delay(1000);
    }
    
    console.log(`📊 Research phase complete: ${state.completedTasks.length} tasks completed`);
  }

  /**
   * Phase 3: Synthesize research results and create connections
   */
  private async synthesizeExpedition(
    expeditionId: string,
    config: ResearchExpeditionConfig
  ): Promise<void> {
    const state = this.activeExpeditions.get(expeditionId);
    if (!state) {
      console.error(`❌ Cannot synthesize expedition ${expeditionId}: state not found`);
      return;
    }

    // Ensure state has required properties initialized
    if (!state.createdNotes) {
      console.warn(`⚠️ createdNotes not initialized for expedition ${expeditionId}, initializing empty array`);
      state.createdNotes = [];
    }
    if (!state.discoveredConnections) {
      console.warn(`⚠️ discoveredConnections not initialized for expedition ${expeditionId}, initializing empty array`);
      state.discoveredConnections = [];
    }
    
    state.status = 'synthesizing';
    
    console.log(`🧠 Synthesizing research results...`);

    // 1. Create intelligent backlinks between all created notes
    const connections = await this.createIntelligentBacklinks(state.createdNotes, config);
    state.discoveredConnections.push(...connections);
    
    // 2. Generate summary/index notes for major topics
    const indexNotes = await this.createIndexNotes(expeditionId, config);
    state.createdNotes.push(...indexNotes);
    
    // 3. Apply consistent tagging across all research notes
    await this.applyConsistentTagging(state.createdNotes);
    
    // 4. Create bridge notes for identified opportunities
    const bridgeNotes = await this.createBridgeNotes(expeditionId, config);
    state.createdNotes.push(...bridgeNotes);
    
    console.log(`🔗 Created ${connections.length} intelligent connections`);
    console.log(`📚 Generated ${indexNotes.length} index notes and ${bridgeNotes.length} bridge notes`);
  }

  /**
   * Enhanced vault knowledge analysis using pattern analysis and semantic search
   */
  private async analyzeExistingKnowledge(topic: string): Promise<any> {
    console.log(`🔍 Analyzing existing vault knowledge for: ${topic}`);
    
    // 1. Enhanced semantic search with broader scope
    const searchResults = await this.searchService.search(topic, {
      maxResults: 30,
      minRelevance: 0.5, // Lower threshold for broader discovery
      includeContent: true
    });
    
    // 2. Use plugin's vault patterns for deeper analysis
    let vaultPatterns: any = null;
    let patternAnalysis: any = {};
    
    if (this.plugin?.vaultPatterns) {
      try {
        console.log(`📊 Using vault pattern analysis for enhanced context discovery`);
        
        // Get comprehensive vault patterns
        vaultPatterns = await this.plugin.vaultPatterns.analyzeVaultPatterns();
        
        // Analyze patterns specific to this topic
        const topicPatterns = await this.plugin.vaultPatterns.analyzeTopicPatterns(topic);
        
        patternAnalysis = {
          topicPatterns,
          globalPatterns: vaultPatterns,
          noteConnections: await this.analyzeTopicConnections(topic, vaultPatterns),
          orphanNotes: await this.findOrphanedContent(topic),
          structuralGaps: await this.identifyStructuralGaps(topic, vaultPatterns)
        };
        
        console.log(`📋 Pattern analysis found ${topicPatterns.relatedNotes?.length || 0} topic-related notes`);
      } catch (error) {
        console.warn('Vault pattern analysis failed, continuing with basic analysis:', error);
      }
    }
    
    // 3. Enhanced semantic similarity analysis
    const similarityAnalysis = await this.performDeepSimilarityAnalysis(topic, searchResults);
    
    // 4. Analyze vault structure with enhanced context
    const context: any = {
      workingDirectory: 'root',
      conversationHistory: [],
      sessionId: 'research-expedition',
      recentlyMentionedFiles: searchResults.map(r => r.file.path),
      activeContext: { topic, searchResults: searchResults.length }
    };
    
    const vaultStructure = await this.vaultAgent.executeTool('analyze_vault_structure', {
      focusArea: topic,
      includePatterns: true,
      deepAnalysis: true
    }, context);
    
    // 5. Cross-reference analysis using strategy engine
    let strategyInsights: any = {};
    if (this.plugin?.researchAgent) {
      try {
        const strategyEngine = new (await import('./strategy-engine')).ResearchStrategyEngine(
          this.app, this.searchService, this.embeddingManager, this.similarityEngine, this.orphanDetector, vaultPatterns
        );
        
        strategyInsights = await strategyEngine.analyzeTopicLandscape(topic);
        console.log(`🧠 Strategy engine analysis completed for topic landscape`);
      } catch (error) {
        console.warn('Strategy engine analysis failed:', error);
      }
    }
    
    // 6. Comprehensive coverage assessment
    const enhancedCoverage = await this.assessEnhancedTopicCoverage(topic, searchResults, patternAnalysis, similarityAnalysis);
    
    return {
      // Core search results
      relatedNotes: searchResults,
      structure: vaultStructure,
      coverage: enhancedCoverage,
      
      // Enhanced analysis
      patternAnalysis,
      similarityAnalysis,
      strategyInsights,
      
      // Discovery metrics
      metrics: {
        notesFound: searchResults.length,
        patternsAnalyzed: vaultPatterns ? Object.keys(vaultPatterns).length : 0,
        connectionsMapped: patternAnalysis.noteConnections?.length || 0,
        orphansFound: patternAnalysis.orphanNotes?.length || 0,
        structuralGapsIdentified: patternAnalysis.structuralGaps?.length || 0
      }
    };
  }

  /**
   * Identify knowledge gaps that need research
   */
  private async identifyKnowledgeGaps(topic: string, existingKnowledge: any): Promise<string[]> {
    console.log(`🔍 Identifying knowledge gaps using intelligent discovery for: ${topic}`);
    
    try {
      // Use the strategy engine to identify research opportunities based on vault analysis
      const strategyEngine = new (await import('./strategy-engine')).ResearchStrategyEngine(
        this.app,
        this.searchService,
        this.embeddingManager,
        this.similarityEngine,
        this.orphanDetector,
        this.plugin?.vaultPatterns
      );

      // Generate research strategy which includes intelligent gap analysis
      const strategy = await strategyEngine.generateResearchStrategy(topic, {
        maxDepth: 3,
        timeLimit: 30,
        focusAreas: [],
        excludeAreas: []
      });

      // Extract research opportunities as knowledge gaps
      const intelligentGaps: string[] = [];
      
      // Primary research opportunities from strategy
      strategy.primaryPath.forEach(opportunity => {
        if (opportunity.type === 'gap-fill' || opportunity.type === 'connection-bridge') {
          intelligentGaps.push(opportunity.topic);
        }
      });

      // Add alternative paths for broader coverage
      strategy.alternativePaths.forEach(path => {
        path.slice(0, 2).forEach(opportunity => { // Limit alternative paths
          if (opportunity.type === 'gap-fill' && !intelligentGaps.includes(opportunity.topic)) {
            intelligentGaps.push(opportunity.topic);
          }
        });
      });

      // If no intelligent gaps found, use bridge opportunities as fallback
      if (intelligentGaps.length === 0) {
        console.log(`🔄 No strategy-based gaps found, checking bridge opportunities...`);
        try {
          const bridgeOpportunities = await this.bridgeManager.getBridgeOpportunities();
          const topicRelevantGaps = bridgeOpportunities
            .filter(bridge => this.isTopicRelevant(topic, bridge.bridgeConcepts))
            .map(bridge => bridge.bridgeConcepts)
            .flat()
            .slice(0, 5);
          
          intelligentGaps.push(...topicRelevantGaps);
        } catch (error) {
          console.warn('Failed to get bridge opportunities:', error);
        }
      }

      // Final fallback: if still no gaps, use semantic analysis of existing knowledge
      if (intelligentGaps.length === 0) {
        console.log(`🔄 No bridge opportunities found, using semantic gap analysis...`);
        const relatedNotes = existingKnowledge.relatedNotes || [];
        
        if (relatedNotes.length === 0) {
          // For completely new topics, suggest foundational research
          intelligentGaps.push(`Foundational knowledge about ${topic}`);
          intelligentGaps.push(`Core concepts and principles of ${topic}`);
          intelligentGaps.push(`Current applications of ${topic}`);
        } else {
          // Use semantic analysis to find specific gaps
          const noteContents = relatedNotes.map((note: any) => note.relevantSnippet || note.title).join(' ');
          const missingAspects = await this.analyzeSemanticGaps(topic, noteContents);
          intelligentGaps.push(...missingAspects);
        }
      }

      console.log(`🎯 Identified ${intelligentGaps.length} intelligent knowledge gaps:`, intelligentGaps);
      return intelligentGaps.slice(0, 8); // Limit to 8 gaps to keep focused

    } catch (error) {
      console.error('Error in intelligent gap identification:', error);
      
      // Emergency fallback to prevent system failure
      return [
        `In-depth analysis of ${topic}`,
        `Current research and developments in ${topic}`,
        `Practical applications of ${topic}`
      ];
    }
  }

  /**
   * Analyze semantic gaps in existing knowledge
   */
  private async analyzeSemanticGaps(topic: string, existingContent: string): Promise<string[]> {
    const gaps: string[] = [];
    
    // Define semantic aspects to check for
    const semanticAspects = [
      { aspect: 'methodology', keywords: ['method', 'approach', 'technique', 'process'] },
      { aspect: 'applications', keywords: ['use', 'application', 'implementation', 'practice'] },
      { aspect: 'challenges', keywords: ['problem', 'issue', 'challenge', 'limitation'] },
      { aspect: 'trends', keywords: ['trend', 'development', 'evolution', 'future'] },
      { aspect: 'comparison', keywords: ['versus', 'compared', 'alternative', 'different'] },
      { aspect: 'benefits', keywords: ['benefit', 'advantage', 'value', 'impact'] }
    ];

    // Check which aspects are missing from existing content
    for (const { aspect, keywords } of semanticAspects) {
      const hasAspect = keywords.some(keyword => 
        existingContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (!hasAspect) {
        gaps.push(`${aspect} of ${topic}`);
      }
    }

    return gaps.length > 0 ? gaps : [`Advanced concepts in ${topic}`];
  }

  /**
   * Create initial research tasks based on gaps and priorities
   */
  private async createInitialResearchTasks(
    topic: string,
    knowledgeGaps: string[],
    bridgeOpportunities: any[],
    config: ResearchExpeditionConfig,
    researchOpportunities: any[] = []
  ): Promise<ResearchTask[]> {
    const tasks: ResearchTask[] = [];
    
    // Create tasks from research opportunities if available (prioritized)
    if (researchOpportunities.length > 0) {
      for (const opportunity of researchOpportunities.slice(0, config.maxBranchesPerLevel)) {
        tasks.push({
          id: this.generateTaskId(),
          topic: opportunity.topic,
          level: 1,
          parent: topic,
          priority: opportunity.priority || 0.8,
          context: opportunity.reasoning || `Research: ${opportunity.topic}`,
          researchType: opportunity.type || 'gap-fill',
          estimatedComplexity: opportunity.complexity || 'moderate',
          status: 'queued',
          createdAt: Date.now()
        });
      }
    } else {
      // Fallback: Create gap-filling tasks from basic analysis
      for (const gap of knowledgeGaps.slice(0, config.maxBranchesPerLevel)) {
        tasks.push({
          id: this.generateTaskId(),
          topic: gap,
          level: 1,
          parent: topic,
          priority: 0.8,
          context: `Fill knowledge gap in ${topic}: ${gap}`,
          researchType: 'gap-fill',
          estimatedComplexity: 'moderate',
          status: 'queued',
          createdAt: Date.now()
        });
      }
    }
    
    // Create bridge tasks
    for (const bridge of bridgeOpportunities.slice(0, 2)) {
      tasks.push({
        id: this.generateTaskId(),
        topic: bridge.title,
        level: 1,
        parent: topic,
        priority: 0.7,
        context: `Create knowledge bridge: ${bridge.description}`,
        researchType: 'bridge',
        estimatedComplexity: 'complex',
        status: 'queued',
        createdAt: Date.now()
      });
    }
    
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute a single research task
   */
  private async executeResearchTask(
    expeditionId: string,
    task: ResearchTask,
    config: ResearchExpeditionConfig
  ): Promise<any> {
    try {
      // Use comprehensive research system to execute the research
      const researchResult = await this.comprehensiveResearch.processResearchChecklist([{
        name: task.topic,
        id: task.id,
        completed: false
      }], {
        maxResults: 5,
        qualityThreshold: config.qualityThreshold,
        context: task.context
      });
      
      return {
        success: true,
        notesCreated: researchResult.createdNotes,
        content: researchResult.summary,
        relatedTopics: researchResult.relatedTopics || []
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate follow-up research tasks based on completed research
   */
  private async generateFollowUpTasks(
    expeditionId: string,
    completedTask: ResearchTask,
    result: any,
    config: ResearchExpeditionConfig
  ): Promise<ResearchTask[]> {
    const state = this.activeExpeditions.get(expeditionId)!;
    const followUpTasks: ResearchTask[] = [];
    
    // Don't generate follow-ups if we're at max depth
    if (completedTask.level >= config.maxDepth) {
      return followUpTasks;
    }
    
    // Generate tasks from related topics found during research
    if (result.relatedTopics && result.relatedTopics.length > 0) {
      for (const relatedTopic of result.relatedTopics.slice(0, 3)) {
        // Skip if we've already explored this topic
        if (state.exploredTopics.has(relatedTopic.toLowerCase())) {
          continue;
        }
        
        followUpTasks.push({
          id: this.generateTaskId(),
          topic: relatedTopic,
          level: completedTask.level + 1,
          parent: completedTask.id,
          priority: 0.6,
          context: `Explore related topic discovered from ${completedTask.topic}`,
          researchType: 'expansion',
          estimatedComplexity: 'moderate',
          status: 'queued',
          createdAt: Date.now()
        });
        
        state.exploredTopics.add(relatedTopic.toLowerCase());
      }
    }
    
    return followUpTasks;
  }

  /**
   * Create intelligent backlinks between research notes
   */
  private async createIntelligentBacklinks(
    notes: TFile[],
    config: ResearchExpeditionConfig
  ): Promise<Connection[]> {
    const connections: Connection[] = [];
    
    // Use the intelligent backlink system to suggest connections
    const backlinkOptions = {
      minConfidence: config.minConfidence,
      maxSuggestionsPerFile: 3,
      semanticThreshold: 0.6,
      respectExistingLinks: true,
      focusOn: 'recent' as const
    };
    
    for (const note of notes) {
      const suggestions = await this.backlinkSystem.suggestBacklinks(note, backlinkOptions);
      
      // Apply high-confidence suggestions automatically
      for (const suggestion of suggestions) {
        if (suggestion.confidence >= config.minConfidence) {
          await this.backlinkSystem.applyBacklinkSuggestion(suggestion);
          
          connections.push({
            sourceNote: suggestion.sourceFile.path,
            targetNote: suggestion.targetFile.path,
            connectionType: suggestion.linkType === 'semantic' ? 'semantic' : 'topical',
            confidence: suggestion.confidence,
            reasoning: suggestion.reason
          });
        }
      }
    }
    
    return connections;
  }

  /**
   * Create index/hub notes for major research topics
   */
  private async createIndexNotes(
    expeditionId: string,
    config: ResearchExpeditionConfig
  ): Promise<TFile[]> {
    const state = this.activeExpeditions.get(expeditionId)!;
    const indexNotes: TFile[] = [];
    
    // Group completed tasks by level and topic area
    const topicGroups = this.groupTasksByTopic(state.completedTasks);
    
    // Create an index note for each major topic group
    for (const [topic, tasks] of Object.entries(topicGroups)) {
      if (tasks.length >= 3) { // Only create index for substantial topics
        const indexNote = await this.createTopicIndexNote(topic, tasks, state.createdNotes);
        if (indexNote) {
          indexNotes.push(indexNote);
        }
      }
    }
    
    // Create main expedition summary note
    const expeditionSummary = await this.createExpeditionSummaryNote(expeditionId);
    if (expeditionSummary) {
      indexNotes.push(expeditionSummary);
    }
    
    return indexNotes;
  }

  /**
   * Apply consistent tagging to all research notes
   */
  private async applyConsistentTagging(notes: TFile[]): Promise<void> {
    for (const note of notes) {
      const content = await this.app.vault.read(note);
      const tagSuggestions = await this.autoTagger.suggestTags(content, note.path);
      
      // Apply high-confidence tags automatically
      const highConfidenceTags = tagSuggestions
        .filter(tag => tag.confidence > 0.8)
        .map(tag => tag.tag);
      
      if (highConfidenceTags.length > 0) {
        await this.autoTagger.applyTags(note, highConfidenceTags);
      }
    }
  }

  /**
   * Create bridge notes for connecting different knowledge areas
   */
  private async createBridgeNotes(
    expeditionId: string,
    config: ResearchExpeditionConfig
  ): Promise<TFile[]> {
    try {
      const bridgeOpportunities = await this.bridgeManager.getBridgeOpportunities();
      const bridgeNotes: TFile[] = [];
      
      if (!bridgeOpportunities || bridgeOpportunities.length === 0) {
        console.log('🌉 No bridge opportunities found');
        return bridgeNotes;
      }
    
    // Create bridge notes for high-confidence opportunities
    for (const opportunity of bridgeOpportunities) {
      if (opportunity.confidence >= config.minConfidence && opportunity.priority === 'high') {
        const bridgeNote = await this.createBridgeNote(opportunity);
        if (bridgeNote) {
          bridgeNotes.push(bridgeNote);
        }
      }
    }
    
    return bridgeNotes;
    } catch (error) {
      console.error('❌ Error creating bridge notes:', error);
      return []; // Return empty array on error
    }
  }

  // Helper methods
  private generateExpeditionId(): string {
    return `expedition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getElapsedTime(state: ResearchState): number {
    return Date.now() - state.startTime;
  }

  private getNextTask(state: ResearchState, config: ResearchExpeditionConfig): ResearchTask | null {
    const queuedTasks = state.researchQueue.filter(task => task.status === 'queued');
    if (queuedTasks.length === 0) return null;
    
    // Sort by priority and return highest priority task
    queuedTasks.sort((a, b) => b.priority - a.priority);
    const task = queuedTasks[0];
    task.status = 'researching';
    
    return task;
  }

  private isTopicRelevant(topic: string, concepts: string[]): boolean {
    const topicWords = topic.toLowerCase().split(/\s+/);
    return concepts.some(concept => 
      topicWords.some(word => concept.toLowerCase().includes(word))
    );
  }

  /**
   * Analyze topic connections using vault patterns
   */
  private async analyzeTopicConnections(topic: string, vaultPatterns: any): Promise<any[]> {
    if (!vaultPatterns) return [];
    
    try {
      const connections = [];
      const topicWords = topic.toLowerCase().split(' ');
      
      // Find notes that connect to this topic through backlinks
      for (const [notePath, notePattern] of Object.entries(vaultPatterns.noteConnections || {})) {
        const pattern = notePattern as any;
        if (pattern.backlinks || pattern.outlinks) {
          const allLinks = [...(pattern.backlinks || []), ...(pattern.outlinks || [])];
          
          for (const link of allLinks) {
            if (topicWords.some(word => link.toLowerCase().includes(word))) {
              connections.push({
                note: notePath,
                connection: link,
                type: 'link-based',
                relevance: this.calculateConnectionRelevance(topic, link)
              });
            }
          }
        }
      }
      
      return connections.slice(0, 20); // Limit to top 20 connections
    } catch (error) {
      console.warn('Error analyzing topic connections:', error);
      return [];
    }
  }

  /**
   * Find orphaned content related to topic
   */
  private async findOrphanedContent(topic: string): Promise<any[]> {
    try {
      if (this.orphanDetector) {
        const orphans = await this.orphanDetector.findOrphans();
        const topicWords = topic.toLowerCase().split(' ');
        
        return orphans.filter(orphan => {
          const content = (orphan.content || orphan.title || '').toLowerCase();
          return topicWords.some(word => content.includes(word));
        }).slice(0, 10);
      }
    } catch (error) {
      console.warn('Error finding orphaned content:', error);
    }
    return [];
  }

  /**
   * Identify structural gaps in topic coverage
   */
  private async identifyStructuralGaps(topic: string, vaultPatterns: any): Promise<any[]> {
    if (!vaultPatterns) return [];
    
    try {
      const gaps = [];
      
      // Analyze folder structure gaps
      if (vaultPatterns.folderStructure) {
        const topicFolders = Object.keys(vaultPatterns.folderStructure).filter(folder =>
          folder.toLowerCase().includes(topic.toLowerCase())
        );
        
        if (topicFolders.length === 0) {
          gaps.push({
            type: 'missing-folder-structure',
            description: `No dedicated folder structure found for ${topic}`,
            severity: 'medium'
          });
        }
      }
      
      // Analyze tagging gaps
      if (vaultPatterns.tagPatterns) {
        const topicTags = Object.keys(vaultPatterns.tagPatterns).filter(tag =>
          tag.toLowerCase().includes(topic.toLowerCase())
        );
        
        if (topicTags.length === 0) {
          gaps.push({
            type: 'missing-tag-organization',
            description: `No tags found for organizing ${topic} content`,
            severity: 'low'
          });
        }
      }
      
      return gaps;
    } catch (error) {
      console.warn('Error identifying structural gaps:', error);
      return [];
    }
  }

  /**
   * Perform deep semantic similarity analysis
   */
  private async performDeepSimilarityAnalysis(topic: string, searchResults: any[]): Promise<any> {
    try {
      const analysis = {
        clusters: [],
        conceptMap: {},
        semanticGaps: [],
        strengthAreas: []
      };
      
      if (this.embeddingManager && searchResults.length > 0) {
        // Generate embedding for the topic
        const topicEmbedding = await this.embeddingManager.getEmbedding(topic);
        
        // Analyze semantic clusters among search results
        const similarities = [];
        for (const result of searchResults) {
          if (result.embedding) {
            const similarity = await this.similarityEngine?.calculateSimilarity(topicEmbedding, result.embedding);
            similarities.push({
              note: result,
              similarity: similarity || 0
            });
          }
        }
        
        // Group by similarity thresholds
        analysis.strengthAreas = similarities.filter(s => s.similarity > 0.8);
        analysis.semanticGaps = similarities.filter(s => s.similarity < 0.5);
        
        // Create concept clusters
        const clusters = new Map();
        for (const sim of similarities) {
          const clusterKey = Math.floor(sim.similarity * 10) / 10;
          if (!clusters.has(clusterKey)) {
            clusters.set(clusterKey, []);
          }
          clusters.get(clusterKey).push(sim);
        }
        
        analysis.clusters = Array.from(clusters.entries()).map(([threshold, notes]) => ({
          threshold,
          count: notes.length,
          notes: notes.slice(0, 5) // Top 5 per cluster
        }));
      }
      
      return analysis;
    } catch (error) {
      console.warn('Error in deep similarity analysis:', error);
      return { clusters: [], conceptMap: {}, semanticGaps: [], strengthAreas: [] };
    }
  }

  /**
   * Enhanced topic coverage assessment
   */
  private async assessEnhancedTopicCoverage(
    topic: string, 
    searchResults: any[], 
    patternAnalysis: any, 
    similarityAnalysis: any
  ): Promise<any> {
    const basicCoverage = this.assessTopicCoverage(topic, searchResults);
    
    // Enhanced metrics
    const enhancedMetrics = {
      confidence: basicCoverage,
      
      // Pattern-based metrics
      patternCoverage: {
        connectionDensity: (patternAnalysis.noteConnections?.length || 0) / Math.max(searchResults.length, 1),
        structuralCompleteness: 1 - ((patternAnalysis.structuralGaps?.length || 0) / 5), // Normalize to 0-1
        orphanRatio: (patternAnalysis.orphanNotes?.length || 0) / Math.max(searchResults.length, 1)
      },
      
      // Semantic metrics
      semanticCoverage: {
        highSimilarityNotes: similarityAnalysis.strengthAreas?.length || 0,
        semanticGapCount: similarityAnalysis.semanticGaps?.length || 0,
        clusterDistribution: similarityAnalysis.clusters?.length || 0,
        averageSimilarity: this.calculateAverageSimilarity(similarityAnalysis)
      },
      
      // Overall intelligence score
      intelligenceScore: this.calculateIntelligenceScore(basicCoverage, patternAnalysis, similarityAnalysis)
    };
    
    return enhancedMetrics;
  }

  /**
   * Calculate connection relevance score
   */
  private calculateConnectionRelevance(topic: string, connection: string): number {
    const topicWords = topic.toLowerCase().split(' ');
    const connectionLower = connection.toLowerCase();
    
    let score = 0;
    for (const word of topicWords) {
      if (connectionLower.includes(word)) {
        score += word.length > 3 ? 2 : 1; // Longer words get higher weight
      }
    }
    
    return Math.min(score / topicWords.length, 1);
  }

  /**
   * Calculate average similarity from analysis
   */
  private calculateAverageSimilarity(similarityAnalysis: any): number {
    const allNotes = [...(similarityAnalysis.strengthAreas || []), ...(similarityAnalysis.semanticGaps || [])];
    if (allNotes.length === 0) return 0;
    
    const totalSimilarity = allNotes.reduce((sum, note) => sum + (note.similarity || 0), 0);
    return totalSimilarity / allNotes.length;
  }

  /**
   * Calculate overall intelligence score for analysis
   */
  private calculateIntelligenceScore(basicCoverage: any, patternAnalysis: any, similarityAnalysis: any): number {
    // Weight different aspects of the analysis
    const basicScore = (basicCoverage || 0) * 0.3;
    const patternScore = Math.min((patternAnalysis.noteConnections?.length || 0) / 10, 1) * 0.3;
    const semanticScore = this.calculateAverageSimilarity(similarityAnalysis) * 0.4;
    
    return Math.min(basicScore + patternScore + semanticScore, 1);
  }

  private assessTopicCoverage(topic: string, searchResults: any[]): number {
    // Simple coverage assessment based on search results
    if (searchResults.length === 0) return 0;
    if (searchResults.length < 3) return 0.3;
    if (searchResults.length < 8) return 0.6;
    return 0.9;
  }

  private groupTasksByTopic(tasks: ResearchTask[]): { [topic: string]: ResearchTask[] } {
    const groups: { [topic: string]: ResearchTask[] } = {};
    
    for (const task of tasks) {
      const baseTopicWords = task.topic.split(/\s+/).slice(0, 2).join(' ');
      if (!groups[baseTopicWords]) {
        groups[baseTopicWords] = [];
      }
      groups[baseTopicWords].push(task);
    }
    
    return groups;
  }

  private async createTopicIndexNote(
    topic: string,
    tasks: ResearchTask[],
    createdNotes: TFile[]
  ): Promise<TFile | null> {
    // Implementation for creating topic index notes
    // This would create a comprehensive index/hub note for a topic area
    return null; // Placeholder
  }

  private async createExpeditionSummaryNote(expeditionId: string): Promise<TFile | null> {
    // Implementation for creating expedition summary notes
    return null; // Placeholder
  }

  private async createBridgeNote(opportunity: any): Promise<TFile | null> {
    // Implementation for creating bridge notes
    return null; // Placeholder
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate comprehensive expedition result
   */
  private async generateExpeditionResult(expeditionId: string): Promise<ExpeditionResult> {
    const state = this.activeExpeditions.get(expeditionId)!;
    const timeElapsed = this.getElapsedTime(state);
    
    return {
      expeditionId,
      topic: state.startTopic,
      notesCreated: state.createdNotes.length,
      connectionsFormed: state.discoveredConnections.length,
      levelsExplored: state.currentLevel,
      timeElapsed: Math.round(timeElapsed / 1000),
      qualityScore: this.calculateQualityScore(state),
      knowledgeGapsFilled: state.completedTasks.filter(t => t.researchType === 'gap-fill').length,
      bridgeOpportunitiesRealized: state.completedTasks.filter(t => t.researchType === 'bridge').length,
      summary: `Autonomous research expedition explored ${state.currentLevel} levels deep, creating comprehensive knowledge web`,
      nextSuggestedTopics: this.generateNextTopicSuggestions(state)
    };
  }

  private calculateQualityScore(state: ResearchState): number {
    // Simple quality scoring based on completion rate and connections
    const completionRate = state.completedTasks.length / (state.completedTasks.length + state.researchQueue.length);
    const connectionDensity = state.discoveredConnections.length / Math.max(state.createdNotes.length, 1);
    
    return Math.min(0.9, (completionRate * 0.6) + (connectionDensity * 0.4));
  }

  private generateNextTopicSuggestions(state: ResearchState): string[] {
    // Generate suggestions for follow-up expeditions
    const uncompletedTasks = state.researchQueue.filter(t => t.status === 'queued');
    return uncompletedTasks
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(task => task.topic);
  }

  /**
   * Get expedition status
   */
  getExpeditionStatus(expeditionId: string): ResearchState | null {
    return this.activeExpeditions.get(expeditionId) || null;
  }

  /**
   * List all active expeditions
   */
  getActiveExpeditions(): string[] {
    return Array.from(this.activeExpeditions.keys());
  }

  /**
   * Pause an expedition
   */
  pauseExpedition(expeditionId: string): boolean {
    const state = this.activeExpeditions.get(expeditionId);
    if (state && state.status === 'researching') {
      state.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * Resume a paused expedition
   */
  async resumeExpedition(expeditionId: string): Promise<boolean> {
    const state = this.activeExpeditions.get(expeditionId);
    if (state && state.status === 'paused') {
      state.status = 'researching';
      // Continue execution with default config
      await this.executeExpedition(expeditionId, this.defaultConfig);
      return true;
    }
    return false;
  }

  /**
   * Set the research agent reference for advanced discovery integration
   */
  setResearchAgent(agent: any): void {
    this.researchAgent = agent;
    console.log('🔗 Research expedition system connected to research agent');
  }

  // ===== PROJECT MANAGEMENT METHODS =====

  /**
   * Create a new research project
   */
  createProject(name: string, description?: string, tags?: string[], folderPath?: string): ResearchProject {
    const project: ResearchProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expeditions: [],
      status: 'active',
      tags,
      folderPath
    };

    this.activeProjects.set(project.id, project);
    console.log(`📁 Created research project: ${name} (${project.id})`);
    return project;
  }

  /**
   * Get a research project by ID
   */
  getProject(projectId: string): ResearchProject | null {
    return this.activeProjects.get(projectId) || null;
  }

  /**
   * Get all active projects
   */
  getAllProjects(): ResearchProject[] {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get projects by status
   */
  getProjectsByStatus(status: ResearchProject['status']): ResearchProject[] {
    return Array.from(this.activeProjects.values()).filter(project => project.status === status);
  }

  /**
   * Update project information
   */
  updateProject(projectId: string, updates: Partial<ResearchProject>): boolean {
    const project = this.activeProjects.get(projectId);
    if (!project) return false;

    Object.assign(project, updates, { updatedAt: Date.now() });
    this.activeProjects.set(projectId, project);
    console.log(`📝 Updated research project: ${project.name}`);
    return true;
  }

  /**
   * Add expedition to project
   */
  addExpeditionToProject(projectId: string, expeditionId: string): boolean {
    const project = this.activeProjects.get(projectId);
    const expedition = this.activeExpeditions.get(expeditionId);
    
    if (!project || !expedition) return false;

    if (!project.expeditions.includes(expeditionId)) {
      project.expeditions.push(expeditionId);
      expedition.projectId = projectId;
      expedition.projectName = project.name;
      project.updatedAt = Date.now();
      
      console.log(`🔗 Added expedition "${expedition.startTopic}" to project "${project.name}"`);
      return true;
    }
    return false;
  }

  /**
   * Get expeditions for a project
   */
  getProjectExpeditions(projectId: string): ResearchState[] {
    const project = this.activeProjects.get(projectId);
    if (!project) return [];

    return project.expeditions
      .map(expeditionId => this.activeExpeditions.get(expeditionId))
      .filter((expedition): expedition is ResearchState => expedition !== undefined);
  }

  /**
   * Archive a project (mark as archived, don't delete)
   */
  archiveProject(projectId: string): boolean {
    const project = this.activeProjects.get(projectId);
    if (!project) return false;

    project.status = 'archived';
    project.updatedAt = Date.now();
    console.log(`🗄️ Archived research project: ${project.name}`);
    return true;
  }

  /**
   * Delete a project and remove expedition associations
   */
  deleteProject(projectId: string): boolean {
    const project = this.activeProjects.get(projectId);
    if (!project) return false;

    // Remove project association from expeditions
    project.expeditions.forEach(expeditionId => {
      const expedition = this.activeExpeditions.get(expeditionId);
      if (expedition) {
        expedition.projectId = undefined;
        expedition.projectName = undefined;
      }
    });

    this.activeProjects.delete(projectId);
    console.log(`🗑️ Deleted research project: ${project.name}`);
    return true;
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): {
    totalExpeditions: number;
    activeExpeditions: number;
    completedExpeditions: number;
    totalNotes: number;
    totalConnections: number;
  } | null {
    const expeditions = this.getProjectExpeditions(projectId);
    if (expeditions.length === 0) return null;

    return {
      totalExpeditions: expeditions.length,
      activeExpeditions: expeditions.filter(e => ['planning', 'researching', 'synthesizing'].includes(e.status)).length,
      completedExpeditions: expeditions.filter(e => e.status === 'complete').length,
      totalNotes: expeditions.reduce((sum, e) => sum + e.createdNotes.length, 0),
      totalConnections: expeditions.reduce((sum, e) => sum + e.discoveredConnections.length, 0)
    };
  }

  // ===== UNIFIED PROJECT SYSTEM INTEGRATION =====

  /**
   * Get all projects through unified system (includes both agent and expedition projects)
   */
  getAllUnifiedProjects(): UnifiedResearchProject[] {
    // Sync local expedition projects to unified system
    this.syncExpeditionProjectsToUnified();
    return unifiedProjectSystem.getAllProjects();
  }

  /**
   * Create project through unified system
   */
  createUnifiedProject(name: string, description: string, type: 'expedition' | 'hybrid' = 'expedition'): UnifiedResearchProject {
    const unifiedProject = unifiedProjectSystem.createUnifiedProject(name, description, type);
    
    // Also create in local expedition system if it's an expedition type
    if (type === 'expedition' || type === 'hybrid') {
      const expeditionProject = unifiedProjectSystem.convertToExpeditionProject(unifiedProject);
      this.activeProjects.set(expeditionProject.id, expeditionProject);
    }
    
    return unifiedProject;
  }

  /**
   * Sync local expedition projects to unified system
   */
  private syncExpeditionProjectsToUnified(): void {
    for (const expeditionProject of this.activeProjects.values()) {
      const existing = unifiedProjectSystem.getProject(expeditionProject.id);
      if (!existing) {
        const conversion = unifiedProjectSystem.convertFromExpeditionProject(expeditionProject);
        if (conversion.success && conversion.project) {
          unifiedProjectSystem.addProject(conversion.project);
        }
      }
    }
  }

  /**
   * Get unified project that can be used by both systems
   */
  getUnifiedProject(projectId: string): UnifiedResearchProject | undefined {
    this.syncExpeditionProjectsToUnified();
    return unifiedProjectSystem.getProject(projectId);
  }

  /**
   * Add expedition to unified project
   */
  addExpeditionToUnifiedProject(projectId: string, expeditionId: string): boolean {
    const unifiedProject = unifiedProjectSystem.getProject(projectId);
    if (!unifiedProject) return false;

    if (!unifiedProject.expeditions.includes(expeditionId)) {
      unifiedProject.expeditions.push(expeditionId);
      unifiedProject.progress.total += 1;
      unifiedProject.progress.inProgress += 1;
      
      // Also update the local expedition project if it exists
      const expeditionProject = this.activeProjects.get(projectId);
      if (expeditionProject) {
        expeditionProject.expeditions.push(expeditionId);
      }
      
      return unifiedProjectSystem.updateProject(projectId, unifiedProject);
    }
    
    return false;
  }
}