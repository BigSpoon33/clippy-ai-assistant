/**
 * Autonomous Research Agent - Extends VaultAgent for Research Expeditions
 * 
 * Specialized agent that orchestrates autonomous research expeditions:
 * - Leverages all 350+ MCP-discovered Obsidian command tools
 * - Coordinates between research systems and strategy engine
 * - Makes intelligent decisions about research direction
 * - Manages research state and expedition progress
 * - Handles error recovery and adaptive research strategies
 */

import { App, TFile, Notice } from 'obsidian';
import { VaultAgent } from './vault-agent';
import { ResearchExpeditionSystem, ResearchState, ResearchTask, ExpeditionResult } from '../research/research-expedition-system';
import { ResearchStrategyEngine, ResearchStrategy, ResearchOpportunity } from '../research/strategy-engine';
import { ComprehensiveResearchSystem } from '../research/comprehensive-research-system';
import { IntelligentSearchService } from '../features/knowledge-management/semantic/intelligent-search-service';
import { IntelligentBacklinkSystem } from '../features/knowledge-management/backlinking/intelligent-backlink-system';
import { BridgeManager } from '../ui/bridge-manager';
import ClippyPlugin from '../main';

export interface ResearchAgentContext {
  expeditionId?: string;
  currentTask?: ResearchTask;
  strategy?: ResearchStrategy;
  adaptiveMode: boolean;
  qualityThreshold: number;
  timeRemaining: number;
}

export interface ResearchDecision {
  action: 'continue' | 'pivot' | 'deep-dive' | 'bridge' | 'synthesize' | 'complete';
  reasoning: string;
  nextTask?: ResearchOpportunity;
  adaptations?: string[];
  confidence: number;
}

export interface AutonomousResearchConfig {
  allowDeepDives: boolean;
  maxPivots: number;
  qualityOverSpeed: boolean;
  explorationBias: number; // 0 = conservative, 1 = highly exploratory
  synthesisFrequency: 'low' | 'medium' | 'high';
  adaptationSensitivity: number;
}

export class ResearchExpeditionAgent extends VaultAgent {
  private expeditionSystem: ResearchExpeditionSystem;
  private strategyEngine: ResearchStrategyEngine;
  private comprehensiveResearch: ComprehensiveResearchSystem;
  private intelligentSearch: IntelligentSearchService;
  private backlinkSystem: IntelligentBacklinkSystem;
  private bridgeManager: BridgeManager;
  
  // Agent state
  private currentExpedition: string | null = null;
  private researchContext: ResearchAgentContext | null = null;
  private decisionHistory: ResearchDecision[] = [];
  private autonomousConfig: AutonomousResearchConfig;

  constructor(app: App, settings: any, plugin?: any) {
    super(app, settings);
    
    // Initialize research systems with bidirectional connection
    this.expeditionSystem = new ResearchExpeditionSystem(app, plugin);
    this.expeditionSystem.setResearchAgent(this); // Enable advanced discovery integration
    
    // Initialize intelligent search service with plugin dependencies
    const searchService = plugin?.intelligentSearchService || new IntelligentSearchService(
      app,
      plugin?.embeddingManager,
      plugin?.similarityEngine,
      plugin?.settings || settings
    );
    
    this.strategyEngine = plugin?.strategyEngine || new ResearchStrategyEngine(
      app,
      searchService,
      plugin?.embeddingManager,
      plugin?.similarityEngine,
      plugin?.orphanDetector,
      plugin?.vaultPatterns
    );
    this.comprehensiveResearch = new ComprehensiveResearchSystem(app, plugin);
    this.intelligentSearch = plugin?.intelligentSearchService;
    this.backlinkSystem = plugin?.backlinkSystem;
    this.bridgeManager = plugin?.bridgeManager;

    // Default autonomous configuration
    this.autonomousConfig = {
      allowDeepDives: true,
      maxPivots: 3,
      qualityOverSpeed: true,
      explorationBias: 0.7,
      synthesisFrequency: 'medium',
      adaptationSensitivity: 0.6
    };

    // Add research-specific tools to the agent
    this.addResearchTools();
  }

  /**
   * Add specialized research expedition tools
   * Note: This creates the tool definitions for reference but doesn't add them to VaultAgent
   * since the tools property is private. The actual execution happens through public methods.
   */
  private addResearchTools(): void {
    // Research expedition tools are available through public methods:
    // - startResearchExpedition()
    // - getExpeditionStatus()
    // - discoverResearchOpportunities()
    // - adaptResearchStrategy()
    // - synthesizeResearchFindings()
    // - orchestrateVaultOperations()
    
    console.log('🔧 Research Expedition Agent initialized with specialized research capabilities');
  }

  /**
   * Start an autonomous research expedition
   */
  async startResearchExpedition(
    topic: string,
    config: any = {},
    projectContext?: { projectId?: string; projectName?: string; createNew?: { name: string; description?: string; tags?: string[] } }
  ): Promise<string> {
    console.log(`🤖 ResearchExpeditionAgent: Starting autonomous expedition for "${topic}"`);
    
    try {
      // 1. Generate research strategy
      console.log(`🎯 Generating research strategy...`);
      const strategy = await this.strategyEngine.generateResearchStrategy(topic, config);
      
      // 2. Start expedition with strategy and project context
      const expeditionId = await this.expeditionSystem.startExpedition(topic, config, projectContext);
      
      // 3. Set up autonomous research context
      this.currentExpedition = expeditionId;
      this.researchContext = {
        expeditionId,
        strategy,
        adaptiveMode: true,
        qualityThreshold: config.qualityThreshold || 0.7,
        timeRemaining: (config.timeLimit || 30) * 60000
      };

      // 4. Begin autonomous research loop
      await this.runAutonomousResearchLoop();

      console.log(`✅ Autonomous research expedition completed: ${expeditionId}`);
      return expeditionId;

    } catch (error) {
      console.error(`❌ Research expedition failed:`, error);
      new Notice(`❌ Research expedition failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main autonomous research loop
   */
  private async runAutonomousResearchLoop(): Promise<void> {
    if (!this.researchContext) return;

    console.log(`🔄 Starting autonomous research loop...`);
    
    let iterations = 0;
    const maxIterations = 20; // Safety limit

    while (this.researchContext.timeRemaining > 0 && iterations < maxIterations) {
      try {
        // 1. Assess current situation
        const expeditionState = this.expeditionSystem.getExpeditionStatus(this.currentExpedition!);
        if (!expeditionState || expeditionState.status === 'complete') break;

        // 2. Make autonomous decision about next step
        const decision = await this.makeResearchDecision(this.researchContext);
        this.decisionHistory.push(decision);

        console.log(`🧠 Decision ${iterations + 1}: ${decision.action} - ${decision.reasoning}`);

        // 3. Execute decision
        await this.executeResearchDecision(decision);

        // 4. Update context
        this.updateResearchContext(expeditionState, decision);

        // 5. Apply adaptations if needed
        if (decision.adaptations && decision.adaptations.length > 0) {
          await this.applyAdaptations(decision.adaptations);
        }

        // 6. Brief pause between iterations
        await this.delay(2000);
        iterations++;

      } catch (error) {
        console.error(`Error in research loop iteration ${iterations}:`, error);
        
        // Attempt recovery
        if (await this.attemptRecovery(error)) {
          console.log(`🔧 Recovered from error, continuing...`);
          continue;
        } else {
          console.log(`❌ Unable to recover, ending research loop`);
          break;
        }
      }
    }

    console.log(`🏁 Autonomous research loop completed after ${iterations} iterations`);
  }

  /**
   * Make intelligent autonomous decision about research direction
   */
  private async makeResearchDecision(context: ResearchAgentContext): Promise<ResearchDecision> {
    const state = this.expeditionSystem.getExpeditionStatus(context.expeditionId!);
    if (!state) throw new Error('No expedition state available');

    // Get current research progress
    const progress = this.calculateResearchProgress(state);
    const timeProgress = (Date.now() - state.startTime) / context.timeRemaining;

    console.log(`📊 Research progress: ${Math.round(progress * 100)}%, Time used: ${Math.round(timeProgress * 100)}%`);

    // Decision logic based on current situation
    if (progress < 0.3 && timeProgress < 0.5) {
      // Early stage - continue with planned research
      return this.decisionContinueResearch(state, context);
      
    } else if (progress < 0.6 && timeProgress > 0.7) {
      // Behind schedule - focus on high-impact tasks
      return this.decisionFocusHighImpact(state, context);
      
    } else if (progress > 0.8 || state.researchQueue.length === 0) {
      // Research mostly complete - synthesize
      return this.decisionSynthesize(state, context);
      
    } else {
      // Mid-stage - evaluate whether to continue, pivot, or deep-dive
      return this.decisionEvaluateStrategy(state, context);
    }
  }

  /**
   * Decision: Continue with current research plan
   */
  private decisionContinueResearch(state: ResearchState, context: ResearchAgentContext): ResearchDecision {
    const nextTask = state.researchQueue.find(task => task.status === 'queued');
    
    return {
      action: 'continue',
      reasoning: 'Research is progressing well within time limits - continuing with planned tasks',
      nextTask: nextTask as any,
      confidence: 0.8
    };
  }

  /**
   * Decision: Focus on high-impact tasks due to time constraints
   */
  private decisionFocusHighImpact(state: ResearchState, context: ResearchAgentContext): ResearchDecision {
    // Filter for highest priority tasks
    const highPriorityTasks = state.researchQueue
      .filter(task => task.status === 'queued' && task.priority > 0.7)
      .sort((a, b) => b.priority - a.priority);

    return {
      action: 'pivot',
      reasoning: 'Time constraints require focusing on highest impact research tasks only',
      nextTask: highPriorityTasks[0] as any,
      adaptations: ['Skip low-priority tasks', 'Reduce research depth for time efficiency'],
      confidence: 0.7
    };
  }

  /**
   * Decision: Synthesize research findings
   */
  private decisionSynthesize(state: ResearchState, context: ResearchAgentContext): ResearchDecision {
    return {
      action: 'synthesize',
      reasoning: 'Research tasks completed or nearly complete - time to synthesize findings and create connections',
      adaptations: ['Create index notes', 'Generate intelligent backlinks', 'Build knowledge bridges'],
      confidence: 0.9
    };
  }

  /**
   * Decision: Evaluate whether to continue, pivot, or deep-dive
   */
  private decisionEvaluateStrategy(state: ResearchState, context: ResearchAgentContext): ResearchDecision {
    // Analyze recent research quality
    const recentTasks = state.completedTasks.slice(-3);
    const avgQuality = recentTasks.length > 0 ? 
      recentTasks.reduce((sum, task) => sum + (task as any).qualityScore || 0.5, 0) / recentTasks.length : 0.5;

    if (avgQuality < context.qualityThreshold) {
      // Quality issues - pivot to simpler tasks
      return {
        action: 'pivot',
        reasoning: `Recent research quality (${avgQuality.toFixed(2)}) below threshold - pivoting to simpler validation tasks`,
        adaptations: ['Switch to validation opportunities', 'Focus on fact-checking existing content'],
        confidence: 0.6
      };
    }

    // Check for deep-dive opportunities
    if (this.autonomousConfig.allowDeepDives && this.shouldConsiderDeepDive(state)) {
      return {
        action: 'deep-dive',
        reasoning: 'Strong foundation found - opportunity for deep-dive research in promising area',
        confidence: 0.7
      };
    }

    // Check for bridge opportunities
    const bridgeOpportunities = state.discoveredConnections.filter(conn => conn.confidence > 0.7);
    if (bridgeOpportunities.length > 0) {
      return {
        action: 'bridge',
        reasoning: `Discovered ${bridgeOpportunities.length} high-confidence connection opportunities`,
        confidence: 0.8
      };
    }

    // Default: continue with current plan
    return this.decisionContinueResearch(state, context);
  }

  /**
   * Execute a research decision
   */
  private async executeResearchDecision(decision: ResearchDecision): Promise<void> {
    switch (decision.action) {
      case 'continue':
        if (decision.nextTask) {
          await this.executeResearchTask(decision.nextTask);
        }
        break;

      case 'pivot':
        await this.pivotResearchStrategy(decision);
        break;

      case 'deep-dive':
        await this.executeDeepDive(decision);
        break;

      case 'bridge':
        await this.executeBridgeBuilding();
        break;

      case 'synthesize':
        await this.executeSynthesis();
        break;

      case 'complete':
        await this.completeExpedition();
        break;
    }
  }

  /**
   * Execute a research task using all available tools
   */
  private async executeResearchTask(opportunity: ResearchOpportunity): Promise<void> {
    console.log(`🔬 Executing research task: ${opportunity.topic}`);

    try {
      // 1. Use comprehensive research system
      const researchResult = await this.comprehensiveResearch.processResearchChecklist([{
        name: opportunity.topic,
        id: opportunity.id,
        completed: false
      }]);

      // 2. Use MCP tools for organization
      await this.orchestrateVaultOperations([
        { type: 'organize_files', pattern: opportunity.topic },
        { type: 'apply_tags', tags: opportunity.knowledgeAreas },
        { type: 'update_workspace', focus: opportunity.topic }
      ]);

      console.log(`✅ Completed research task: ${opportunity.topic}`);

    } catch (error) {
      console.error(`❌ Failed research task: ${opportunity.topic}`, error);
      throw error;
    }
  }

  /**
   * Pivot research strategy
   */
  private async pivotResearchStrategy(decision: ResearchDecision): Promise<void> {
    console.log(`🔄 Pivoting research strategy: ${decision.reasoning}`);

    if (!this.researchContext) return;

    // Generate new strategy based on current findings
    const newStrategy = await this.strategyEngine.generateResearchStrategy(
      this.researchContext.strategy?.expeditionGoal || 'research',
      { 
        focusAreas: ['validation', 'gap-fill'], 
        timeLimit: this.researchContext.timeRemaining / 60000 
      }
    );

    this.researchContext.strategy = newStrategy;
    console.log(`🎯 New strategy generated with ${newStrategy.primaryPath.length} priority tasks`);
  }

  /**
   * Execute deep-dive research
   */
  private async executeDeepDive(decision: ResearchDecision): Promise<void> {
    console.log(`🏊‍♂️ Executing deep-dive research...`);
    
    // Find most promising topic for deep dive
    const state = this.expeditionSystem.getExpeditionStatus(this.currentExpedition!);
    if (!state) return;

    const strongAreas = this.identifyStrongResearchAreas(state);
    if (strongAreas.length > 0) {
      const deepDiveTopic = `Advanced ${strongAreas[0]}`;
      await this.executeResearchTask({
        id: 'deep_dive_' + Date.now(),
        topic: deepDiveTopic,
        type: 'deep-dive',
        priority: 0.8,
        reasoning: 'Deep-dive based on strong foundation',
        prerequisites: [],
        expectedOutcomes: [`Advanced insights on ${strongAreas[0]}`],
        complexity: 'complex',
        timeEstimate: 25,
        knowledgeAreas: [strongAreas[0]]
      });
    }
  }

  /**
   * Execute bridge building between knowledge areas
   */
  private async executeBridgeBuilding(): Promise<void> {
    console.log(`🌉 Executing bridge building...`);

    // Get bridge opportunities from bridge manager
    const opportunities = await this.bridgeManager.getBridgeOpportunities();
    const highConfidenceOpportunities = opportunities.filter(opp => opp.confidence > 0.7);

    for (const opportunity of highConfidenceOpportunities.slice(0, 2)) {
      try {
        await this.createBridgeNote(opportunity);
        console.log(`✅ Created bridge: ${opportunity.title}`);
      } catch (error) {
        console.error(`❌ Failed to create bridge: ${opportunity.title}`, error);
      }
    }
  }

  /**
   * Execute synthesis phase
   */
  private async executeSynthesis(): Promise<void> {
    console.log(`🧠 Executing research synthesis...`);

    if (!this.currentExpedition) return;

    try {
      // Use synthesis tool from expedition system
      await this.synthesizeResearchFindings(this.currentExpedition);

      // Use intelligent backlink system to create connections
      const state = this.expeditionSystem.getExpeditionStatus(this.currentExpedition);
      if (state && state.createdNotes.length > 0) {
        await this.createIntelligentConnections(state.createdNotes);
      }

      console.log(`✅ Research synthesis completed`);

    } catch (error) {
      console.error(`❌ Synthesis failed:`, error);
    }
  }

  // Helper methods

  private calculateResearchProgress(state: ResearchState): number {
    const totalTasks = state.completedTasks.length + state.researchQueue.length;
    return totalTasks > 0 ? state.completedTasks.length / totalTasks : 0;
  }

  private shouldConsiderDeepDive(state: ResearchState): boolean {
    // Consider deep dive if we have strong foundation in an area
    const topicCounts = new Map<string, number>();
    
    for (const task of state.completedTasks) {
      const topic = task.topic.split(' ')[0];
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    return Array.from(topicCounts.values()).some(count => count >= 3);
  }

  private identifyStrongResearchAreas(state: ResearchState): string[] {
    const topicCounts = new Map<string, number>();
    
    for (const task of state.completedTasks) {
      const topic = task.topic.split(' ')[0];
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    return Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, _]) => topic);
  }

  private updateResearchContext(state: ResearchState, decision: ResearchDecision): void {
    if (!this.researchContext) return;

    this.researchContext.timeRemaining = Math.max(0, 
      this.researchContext.timeRemaining - (Date.now() - state.startTime)
    );

    if (state.researchQueue.length > 0) {
      this.researchContext.currentTask = state.researchQueue.find(task => task.status === 'queued') || undefined;
    }
  }

  private async applyAdaptations(adaptations: string[]): Promise<void> {
    console.log(`🔧 Applying adaptations: ${adaptations.join(', ')}`);
    
    for (const adaptation of adaptations) {
      // This would contain logic to apply specific adaptations
      // For now, just log the adaptations
      console.log(`  - ${adaptation}`);
    }
  }

  private async attemptRecovery(error: any): Promise<boolean> {
    console.log(`🚨 Attempting recovery from error: ${error.message}`);
    
    // Simple recovery strategies
    if (error.message.includes('timeout')) {
      console.log(`⏱️ Timeout error - reducing task complexity`);
      if (this.researchContext) {
        this.researchContext.qualityThreshold = Math.max(0.5, this.researchContext.qualityThreshold - 0.1);
      }
      return true;
    }

    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      console.log(`🛑 Rate limit - pausing for 30 seconds`);
      await this.delay(30000);
      return true;
    }

    return false; // Unable to recover
  }

  // Public methods for tool integration

  async getExpeditionStatus(expeditionId: string): Promise<ResearchState | null> {
    return this.expeditionSystem.getExpeditionStatus(expeditionId);
  }

  async adaptResearchStrategy(findings: any[], obstacles: any[]): Promise<string> {
    console.log(`🔄 Adapting research strategy based on ${findings.length} findings and ${obstacles.length} obstacles`);
    
    // Use strategy engine to adapt based on findings
    const recommendations = this.strategyEngine.getStrategyRecommendations(this.researchContext?.strategy?.expeditionGoal || '');
    
    return `Strategy adapted with recommendations: ${recommendations.join(', ')}`;
  }

  async synthesizeResearchFindings(expeditionId: string): Promise<string> {
    const state = this.expeditionSystem.getExpeditionStatus(expeditionId);
    if (!state) return 'No expedition found';

    console.log(`🧠 Synthesizing findings for ${state.createdNotes.length} notes`);
    
    // Create summary note
    const summaryContent = this.generateExpeditionSummary(state);
    
    // Use MCP tools to create the summary note
    const context: any = {
      workingDirectory: 'root',
      conversationHistory: [],
      sessionId: 'research-expedition',
      recentlyMentionedFiles: [],
      activeContext: {}
    };
    await this.executeTool('execute_obsidian_command_file_create_new', {
      fileName: `Research Expedition Summary - ${state.startTopic}`,
      content: summaryContent
    }, context);

    return `Synthesis complete: Created summary note and organized ${state.createdNotes.length} research notes`;
  }

  async discoverResearchOpportunities(topic: string, maxOpportunities: number = 10): Promise<ResearchOpportunity[]> {
    const strategy = await this.strategyEngine.generateResearchStrategy(topic);
    return strategy.primaryPath.slice(0, maxOpportunities);
  }

  async orchestrateVaultOperations(operations: any[]): Promise<string> {
    const results: string[] = [];
    
    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'organize_files':
            const organizeContext: any = {
              workingDirectory: 'root',
              conversationHistory: [],
              sessionId: 'research-expedition',
              recentlyMentionedFiles: [],
              activeContext: {}
            };
            await this.executeTool('execute_obsidian_command_file_organize', operation, organizeContext);
            results.push(`Organized files for ${operation.pattern}`);
            break;
            
          case 'apply_tags':
            const tagContext: any = {
              workingDirectory: 'root',
              conversationHistory: [],
              sessionId: 'research-expedition',
              recentlyMentionedFiles: [],
              activeContext: {}
            };
            await this.executeTool('execute_obsidian_command_tag_add', { tags: operation.tags }, tagContext);
            results.push(`Applied tags: ${operation.tags.join(', ')}`);
            break;
            
          case 'update_workspace':
            const workspaceContext: any = {
              workingDirectory: 'root',
              conversationHistory: [],
              sessionId: 'research-expedition',
              recentlyMentionedFiles: [],
              activeContext: {}
            };
            await this.executeTool('execute_obsidian_command_workspace_focus', { area: operation.focus }, workspaceContext);
            results.push(`Updated workspace focus to ${operation.focus}`);
            break;
        }
      } catch (error) {
        results.push(`Failed: ${operation.type} - ${error.message}`);
      }
    }
    
    return `Orchestrated ${results.length} operations: ${results.join('; ')}`;
  }

  // Private helper methods

  private async createBridgeNote(opportunity: any): Promise<void> {
    const bridgeContent = `# ${opportunity.title}

## Description
${opportunity.description}

## Bridge Concepts
${opportunity.bridgeConcepts.map((concept: string) => `- ${concept}`).join('\n')}

## Implementation
${opportunity.implementation?.noteContent || 'Bridge implementation content...'}

## Connected Areas
${opportunity.clusters?.map((cluster: any) => `- [[${cluster.title}]]`).join('\n') || ''}

---
*Generated by Research Expedition Agent*
`;

    const bridgeContext: any = {
      workingDirectory: 'root',
      conversationHistory: [],
      sessionId: 'research-expedition',
      recentlyMentionedFiles: [],
      activeContext: {}
    };
    await this.executeTool('execute_obsidian_command_file_create_new', {
      fileName: opportunity.title,
      content: bridgeContent
    }, bridgeContext);
  }

  private async createIntelligentConnections(notes: TFile[]): Promise<void> {
    if (!this.backlinkSystem) return;

    for (const note of notes) {
      const suggestions = await this.backlinkSystem.generateBacklinkSuggestions(note, {
        focusOn: 'recent',
        minConfidence: 0.7,
        maxSuggestionsPerFile: 3
      });

      await this.backlinkSystem.applyBacklinkSuggestions(suggestions.slice(0, 2));
    }
  }

  private generateExpeditionSummary(state: ResearchState): string {
    return `# Research Expedition: ${state.startTopic}

## Expedition Overview
- **Started**: ${new Date(state.startTime).toLocaleString()}
- **Duration**: ${Math.round((Date.now() - state.startTime) / 60000)} minutes
- **Status**: ${state.status}
- **Levels Explored**: ${state.currentLevel}

## Results
- **Notes Created**: ${state.createdNotes.length}
- **Tasks Completed**: ${state.completedTasks.length}
- **Connections Formed**: ${state.discoveredConnections.length}

## Research Areas Covered
${Array.from(state.exploredTopics).map(topic => `- ${topic}`).join('\n')}

## Key Findings
${state.completedTasks.slice(-5).map(task => `- **${task.topic}**: ${task.researchType} research completed`).join('\n')}

## Connections Created
${state.discoveredConnections.map(conn => `- [[${conn.sourceNote}]] ↔ [[${conn.targetNote}]] (${conn.connectionType}, confidence: ${conn.confidence.toFixed(2)})`).join('\n')}

---
*Generated by Autonomous Research Expedition Agent*
`;
  }

  private async completeExpedition(): Promise<void> {
    if (this.currentExpedition) {
      console.log(`🎯 Completing research expedition: ${this.currentExpedition}`);
      // Any final cleanup or summary generation
      this.currentExpedition = null;
      this.researchContext = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Dashboard support methods
  getActiveExpeditions(): any[] {
    if (!this.currentExpedition) return [];
    
    const state = this.expeditionSystem.getExpeditionStatus(this.currentExpedition);
    if (!state) return [];
    
    return [{
      id: this.currentExpedition,
      topic: state.startTopic,
      status: state.status,
      progress: {
        notesCreated: state.createdNotes.length,
        tasksCompleted: state.completedTasks.length,
        connectionsFound: state.discoveredConnections.length,
        currentLevel: state.currentLevel
      },
      startTime: state.startTime,
      duration: Date.now() - state.startTime
    }];
  }

  getExpeditionHistory(): any[] {
    // For now return empty - could be extended to track completed expeditions
    return [];
  }

  // Getter for accessing the expedition system (for UI components)
  getExpeditionSystem() {
    return this.expeditionSystem;
  }
}