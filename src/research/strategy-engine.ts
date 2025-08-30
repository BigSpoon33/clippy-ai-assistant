/**
 * Research Strategy Engine - Intelligent Research Planning and Prioritization
 * 
 * Provides strategic intelligence for autonomous research expeditions:
 * - Analyzes vault knowledge density and patterns
 * - Identifies high-value research opportunities
 * - Prioritizes research tasks based on impact and feasibility
 * - Suggests optimal research paths and topic sequences
 * - Learns from research outcomes to improve strategy
 */

import { App, TFile } from 'obsidian';
import { IntelligentSearchService } from '../features/knowledge-management/semantic/intelligent-search-service';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';
import { OrphanDetector } from '../features/knowledge-management/discovery/orphan-detector';
import { VaultPatterns } from '../types';

export interface KnowledgeGap {
  topic: string;
  severity: 'critical' | 'major' | 'minor';
  confidence: number;
  context: string[];
  relatedConcepts: string[];
  estimatedResearchEffort: 'low' | 'medium' | 'high';
  potentialImpact: number; // 0-1 score
  sources: string[];
}

export interface ResearchOpportunity {
  id: string;
  topic: string;
  type: 'gap-fill' | 'connection-bridge' | 'deep-dive' | 'cross-pollination' | 'validation';
  priority: number; // 0-1 score
  reasoning: string;
  prerequisites: string[];
  expectedOutcomes: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  timeEstimate: number; // minutes
  knowledgeAreas: string[];
}

export interface VaultKnowledgeMap {
  totalNotes: number;
  knowledgeDensity: { [area: string]: number };
  connectionStrength: { [area: string]: number };
  orphanedTopics: string[];
  strongClusters: Array<{ topic: string; noteCount: number; avgConnections: number }>;
  weakAreas: Array<{ topic: string; gapSeverity: number; suggestedResearch: string[] }>;
  bridgeOpportunities: Array<{ from: string; to: string; confidence: number }>;
}

export interface ResearchStrategy {
  expeditionGoal: string;
  primaryPath: ResearchOpportunity[];
  alternativePaths: ResearchOpportunity[][];
  riskFactors: string[];
  successMetrics: string[];
  adaptationTriggers: Array<{ condition: string; action: string }>;
}

export class ResearchStrategyEngine {
  private app: App;
  private searchService: IntelligentSearchService;
  private embeddingManager: EmbeddingManager;
  private similarityEngine: SimilarityEngine;
  private orphanDetector: OrphanDetector;
  private vaultPatterns: VaultPatterns;
  
  // Learning and adaptation
  private researchOutcomes: Map<string, any> = new Map();
  private topicSuccessRates: Map<string, number> = new Map();
  private strategyPerformance: Map<string, any> = new Map();

  constructor(
    app: App,
    searchService: IntelligentSearchService,
    embeddingManager: EmbeddingManager,
    similarityEngine: SimilarityEngine,
    orphanDetector: OrphanDetector,
    vaultPatterns?: VaultPatterns
  ) {
    this.app = app;
    this.searchService = searchService;
    this.embeddingManager = embeddingManager;
    this.similarityEngine = similarityEngine;
    this.orphanDetector = orphanDetector;
    this.vaultPatterns = vaultPatterns || {
      tagPatterns: [],
      dateFormats: [],
      cssClasses: [],
      frontmatterSchemas: [],
      wikilinkPatterns: []
    };
  }

  /**
   * Generate comprehensive research strategy for a topic
   */
  async generateResearchStrategy(
    topic: string,
    context: {
      maxDepth?: number;
      timeLimit?: number;
      focusAreas?: string[];
      excludeAreas?: string[];
    } = {}
  ): Promise<ResearchStrategy> {
    console.log(`🎯 Generating research strategy for: ${topic}`);

    // 1. Map current vault knowledge state
    const knowledgeMap = await this.analyzeVaultKnowledge(topic);
    
    // 2. Identify research opportunities
    const opportunities = await this.identifyResearchOpportunities(topic, knowledgeMap, context);
    
    // 3. Prioritize and sequence research tasks
    const prioritizedOpportunities = await this.prioritizeOpportunities(opportunities, knowledgeMap);
    
    // 4. Create strategic research paths
    const strategy = await this.createResearchStrategy(topic, prioritizedOpportunities, knowledgeMap, context);
    
    console.log(`📋 Strategy created: ${strategy.primaryPath.length} primary tasks, ${strategy.alternativePaths.length} alternative paths`);
    
    return strategy;
  }

  /**
   * Analyze vault knowledge state and patterns
   */
  private async analyzeVaultKnowledge(topic: string): Promise<VaultKnowledgeMap> {
    const allFiles = this.app.vault.getMarkdownFiles();
    
    // 1. Find topic-related notes
    const topicResults = await this.searchService.search(topic, {
      maxResults: 50,
      minRelevance: 0.4
    });
    
    // 2. Analyze knowledge density by area
    const knowledgeDensity = await this.calculateKnowledgeDensity(topicResults);
    
    // 3. Analyze connection strength
    const connectionStrength = await this.analyzeConnectionStrength(topicResults);
    
    // 4. Find orphaned topics and weak areas
    const orphanedTopics = await this.findOrphanedTopics(topic);
    const weakAreas = await this.identifyWeakKnowledgeAreas(topic, knowledgeDensity);
    
    // 5. Find strong knowledge clusters
    const strongClusters = await this.identifyStrongClusters(topicResults);
    
    // 6. Identify bridge opportunities
    const bridgeOpportunities = await this.findBridgeOpportunities(topic);

    return {
      totalNotes: allFiles.length,
      knowledgeDensity,
      connectionStrength,
      orphanedTopics,
      strongClusters,
      weakAreas,
      bridgeOpportunities
    };
  }

  /**
   * Identify and categorize research opportunities
   */
  private async identifyResearchOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap,
    context: any
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    // 1. Gap-filling opportunities
    const gapOpportunities = await this.identifyGapFillingOpportunities(topic, knowledgeMap);
    opportunities.push(...gapOpportunities);

    // 2. Bridge-building opportunities
    const bridgeOpportunities = await this.identifyBridgeBuildingOpportunities(topic, knowledgeMap);
    opportunities.push(...bridgeOpportunities);

    // 3. Deep-dive opportunities (expand strong areas)
    const deepDiveOpportunities = await this.identifyDeepDiveOpportunities(topic, knowledgeMap);
    opportunities.push(...deepDiveOpportunities);

    // 4. Cross-pollination opportunities (connect different domains)
    const crossPollinationOpportunities = await this.identifyCrossPollinationOpportunities(topic, knowledgeMap);
    opportunities.push(...crossPollinationOpportunities);

    // 5. Validation opportunities (verify existing knowledge)
    const validationOpportunities = await this.identifyValidationOpportunities(topic, knowledgeMap);
    opportunities.push(...validationOpportunities);

    console.log(`🔍 Identified ${opportunities.length} research opportunities across 5 categories`);
    
    return opportunities;
  }

  /**
   * Prioritize research opportunities using multi-criteria analysis
   */
  private async prioritizeOpportunities(
    opportunities: ResearchOpportunity[],
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    
    for (const opportunity of opportunities) {
      opportunity.priority = await this.calculateOpportunityPriority(opportunity, knowledgeMap);
    }

    // Sort by priority (highest first)
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority score for a research opportunity
   */
  private async calculateOpportunityPriority(
    opportunity: ResearchOpportunity,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<number> {
    let score = 0;

    // 1. Impact potential (40% of score)
    const impactScore = await this.assessImpactPotential(opportunity, knowledgeMap);
    score += impactScore * 0.4;

    // 2. Feasibility (30% of score)
    const feasibilityScore = this.assessFeasibility(opportunity);
    score += feasibilityScore * 0.3;

    // 3. Knowledge gap severity (20% of score)
    const gapSeverityScore = this.assessGapSeverity(opportunity, knowledgeMap);
    score += gapSeverityScore * 0.2;

    // 4. Historical success rate (10% of score)
    const successRateScore = this.getHistoricalSuccessRate(opportunity.topic);
    score += successRateScore * 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Create structured research strategy with primary and alternative paths
   */
  private async createResearchStrategy(
    topic: string,
    opportunities: ResearchOpportunity[],
    knowledgeMap: VaultKnowledgeMap,
    context: any
  ): Promise<ResearchStrategy> {
    
    // 1. Create primary research path (highest priority opportunities)
    const primaryPath = this.createOptimalPath(opportunities.slice(0, 8), context);
    
    // 2. Create alternative paths for different research approaches
    const alternativePaths = await this.createAlternativePaths(opportunities, context);
    
    // 3. Identify risk factors
    const riskFactors = this.identifyRiskFactors(primaryPath, knowledgeMap);
    
    // 4. Define success metrics
    const successMetrics = this.defineSuccessMetrics(topic, primaryPath);
    
    // 5. Create adaptation triggers
    const adaptationTriggers = this.createAdaptationTriggers(primaryPath);

    return {
      expeditionGoal: `Comprehensive autonomous research expedition on ${topic}`,
      primaryPath,
      alternativePaths,
      riskFactors,
      successMetrics,
      adaptationTriggers
    };
  }

  /**
   * Identify gap-filling research opportunities
   */
  private async identifyGapFillingOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    // Analyze weak areas for gap-filling opportunities
    for (const weakArea of knowledgeMap.weakAreas) {
      for (const suggestedResearch of weakArea.suggestedResearch) {
        opportunities.push({
          id: this.generateOpportunityId(),
          topic: suggestedResearch,
          type: 'gap-fill',
          priority: 0, // Will be calculated later
          reasoning: `Critical knowledge gap in ${weakArea.topic} - missing comprehensive coverage of ${suggestedResearch}`,
          prerequisites: [],
          expectedOutcomes: [`Comprehensive notes on ${suggestedResearch}`, `Integration with existing ${weakArea.topic} knowledge`],
          complexity: this.estimateComplexity(suggestedResearch),
          timeEstimate: this.estimateResearchTime(suggestedResearch),
          knowledgeAreas: [weakArea.topic, suggestedResearch]
        });
      }
    }

    return opportunities;
  }

  /**
   * Identify bridge-building opportunities
   */
  private async identifyBridgeBuildingOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    for (const bridge of knowledgeMap.bridgeOpportunities) {
      if (bridge.confidence > 0.6) {
        opportunities.push({
          id: this.generateOpportunityId(),
          topic: `${bridge.from} and ${bridge.to} connections`,
          type: 'connection-bridge',
          priority: 0,
          reasoning: `High-value bridge opportunity between ${bridge.from} and ${bridge.to} (confidence: ${bridge.confidence})`,
          prerequisites: [`Basic understanding of ${bridge.from}`, `Basic understanding of ${bridge.to}`],
          expectedOutcomes: [`Bridge note connecting ${bridge.from} and ${bridge.to}`, `Enhanced knowledge integration`],
          complexity: 'moderate',
          timeEstimate: 15,
          knowledgeAreas: [bridge.from, bridge.to]
        });
      }
    }

    return opportunities;
  }

  /**
   * Identify deep-dive opportunities in strong knowledge areas
   */
  private async identifyDeepDiveOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    // Focus on strongest clusters for deep-dive opportunities
    const topClusters = knowledgeMap.strongClusters
      .filter(cluster => cluster.noteCount >= 3)
      .slice(0, 3);

    for (const cluster of topClusters) {
      opportunities.push({
        id: this.generateOpportunityId(),
        topic: `Advanced ${cluster.topic}`,
        type: 'deep-dive',
        priority: 0,
        reasoning: `Strong knowledge base in ${cluster.topic} (${cluster.noteCount} notes) - ready for advanced exploration`,
        prerequisites: [`Existing notes on ${cluster.topic}`],
        expectedOutcomes: [`Advanced insights on ${cluster.topic}`, `Specialized sub-topics and techniques`],
        complexity: 'complex',
        timeEstimate: 25,
        knowledgeAreas: [cluster.topic]
      });
    }

    return opportunities;
  }

  /**
   * Identify cross-pollination opportunities
   */
  private async identifyCrossPollinationOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    // Find combinations of strong clusters that might benefit from cross-pollination
    const strongAreas = knowledgeMap.strongClusters.slice(0, 4);
    
    for (let i = 0; i < strongAreas.length; i++) {
      for (let j = i + 1; j < strongAreas.length; j++) {
        const area1 = strongAreas[i];
        const area2 = strongAreas[j];
        
        opportunities.push({
          id: this.generateOpportunityId(),
          topic: `${area1.topic} applications in ${area2.topic}`,
          type: 'cross-pollination',
          priority: 0,
          reasoning: `Cross-domain opportunity: applying ${area1.topic} knowledge to ${area2.topic} context`,
          prerequisites: [`Understanding of ${area1.topic}`, `Understanding of ${area2.topic}`],
          expectedOutcomes: [`Novel insights from ${area1.topic}-${area2.topic} intersection`, `Enhanced interdisciplinary understanding`],
          complexity: 'complex',
          timeEstimate: 20,
          knowledgeAreas: [area1.topic, area2.topic]
        });
      }
    }

    return opportunities.slice(0, 3); // Limit to top 3 cross-pollination opportunities
  }

  /**
   * Identify validation opportunities for existing knowledge
   */
  private async identifyValidationOpportunities(
    topic: string,
    knowledgeMap: VaultKnowledgeMap
  ): Promise<ResearchOpportunity[]> {
    const opportunities: ResearchOpportunity[] = [];

    // Find older notes that might need validation/updates
    const allFiles = this.app.vault.getMarkdownFiles();
    const oldNotes = allFiles.filter(file => {
      const ageMonths = (Date.now() - file.stat.mtime) / (1000 * 60 * 60 * 24 * 30);
      return ageMonths > 6; // Notes older than 6 months
    }).slice(0, 3);

    for (const note of oldNotes) {
      opportunities.push({
        id: this.generateOpportunityId(),
        topic: `Validation: ${note.basename}`,
        type: 'validation',
        priority: 0,
        reasoning: `Older note may need validation and updates based on recent developments`,
        prerequisites: [],
        expectedOutcomes: [`Updated and validated information`, `Current best practices and developments`],
        complexity: 'simple',
        timeEstimate: 10,
        knowledgeAreas: [note.basename]
      });
    }

    return opportunities;
  }

  // Helper methods for analysis

  private async calculateKnowledgeDensity(searchResults: any[]): Promise<{ [area: string]: number }> {
    const density: { [area: string]: number } = {};
    
    // Group results by topic area and calculate density
    for (const result of searchResults) {
      const topicArea = this.extractTopicArea(result.file.basename);
      density[topicArea] = (density[topicArea] || 0) + result.similarity;
    }

    // Normalize density scores
    const maxDensity = Math.max(...Object.values(density));
    if (maxDensity > 0) {
      for (const area in density) {
        density[area] /= maxDensity;
      }
    }

    return density;
  }

  private async analyzeConnectionStrength(searchResults: any[]): Promise<{ [area: string]: number }> {
    const connectionStrength: { [area: string]: number } = {};
    
    for (const result of searchResults) {
      const file = result.file;
      const content = await this.app.vault.read(file);
      
      // Count wikilinks as connection indicators
      const wikilinkCount = (content.match(/\[\[.*?\]\]/g) || []).length;
      const topicArea = this.extractTopicArea(file.basename);
      
      connectionStrength[topicArea] = (connectionStrength[topicArea] || 0) + wikilinkCount;
    }

    return connectionStrength;
  }

  private async findOrphanedTopics(topic: string): Promise<string[]> {
    const orphans = await this.orphanDetector.findOrphanedNotes();
    return orphans
      .filter(orphan => this.isTopicRelated(orphan.file.basename, topic))
      .map(orphan => orphan.file.basename);
  }

  private async identifyWeakKnowledgeAreas(
    topic: string,
    knowledgeDensity: { [area: string]: number }
  ): Promise<Array<{ topic: string; gapSeverity: number; suggestedResearch: string[] }>> {
    const weakAreas = [];
    
    for (const [area, density] of Object.entries(knowledgeDensity)) {
      if (density < 0.3) { // Areas with low knowledge density
        weakAreas.push({
          topic: area,
          gapSeverity: 1 - density,
          suggestedResearch: this.generateResearchSuggestions(area, topic)
        });
      }
    }

    return weakAreas.sort((a, b) => b.gapSeverity - a.gapSeverity);
  }

  private async identifyStrongClusters(searchResults: any[]): Promise<Array<{ topic: string; noteCount: number; avgConnections: number }>> {
    const clusters = new Map<string, { notes: any[]; totalConnections: number }>();
    
    for (const result of searchResults) {
      const topicArea = this.extractTopicArea(result.file.basename);
      if (!clusters.has(topicArea)) {
        clusters.set(topicArea, { notes: [], totalConnections: 0 });
      }
      
      const cluster = clusters.get(topicArea)!;
      cluster.notes.push(result);
      
      // Count connections (this is simplified - would need actual link analysis)
      const content = await this.app.vault.read(result.file);
      const wikilinkCount = (content.match(/\[\[.*?\]\]/g) || []).length;
      cluster.totalConnections += wikilinkCount;
    }

    return Array.from(clusters.entries())
      .map(([topic, cluster]) => ({
        topic,
        noteCount: cluster.notes.length,
        avgConnections: cluster.totalConnections / cluster.notes.length
      }))
      .filter(cluster => cluster.noteCount >= 2)
      .sort((a, b) => b.noteCount - a.noteCount);
  }

  private async findBridgeOpportunities(topic: string): Promise<Array<{ from: string; to: string; confidence: number }>> {
    // This would integrate with the existing bridge opportunity detection
    // For now, return a simplified version
    return [
      { from: topic, to: "related concept", confidence: 0.7 }
    ];
  }

  private extractTopicArea(filename: string): string {
    // Simple topic extraction - could be enhanced with NLP
    return filename.split(/[\s-_]+/).slice(0, 2).join(' ').toLowerCase();
  }

  private isTopicRelated(filename: string, topic: string): boolean {
    const fileWords = filename.toLowerCase().split(/[\s-_]+/);
    const topicWords = topic.toLowerCase().split(/\s+/);
    
    return topicWords.some(word => fileWords.some(fileWord => fileWord.includes(word)));
  }

  private generateResearchSuggestions(area: string, mainTopic: string): string[] {
    // Generate contextual research suggestions
    const suggestions = [
      `${area} fundamentals`,
      `${area} best practices`,
      `${area} in ${mainTopic} context`,
      `Advanced ${area} techniques`,
      `${area} case studies`
    ];
    
    return suggestions.slice(0, 3);
  }

  private estimateComplexity(topic: string): 'simple' | 'moderate' | 'complex' {
    // Simple heuristic for complexity estimation
    if (topic.includes('advanced') || topic.includes('complex')) return 'complex';
    if (topic.includes('fundamentals') || topic.includes('basic')) return 'simple';
    return 'moderate';
  }

  private estimateResearchTime(topic: string): number {
    // Simple time estimation in minutes
    const complexity = this.estimateComplexity(topic);
    switch (complexity) {
      case 'simple': return 10;
      case 'moderate': return 20;
      case 'complex': return 35;
    }
  }

  private async assessImpactPotential(opportunity: ResearchOpportunity, knowledgeMap: VaultKnowledgeMap): Promise<number> {
    // Higher impact for gap-filling in weak areas and bridge opportunities
    if (opportunity.type === 'gap-fill') return 0.8;
    if (opportunity.type === 'connection-bridge') return 0.7;
    if (opportunity.type === 'cross-pollination') return 0.6;
    if (opportunity.type === 'deep-dive') return 0.5;
    return 0.4; // validation
  }

  private assessFeasibility(opportunity: ResearchOpportunity): number {
    // Higher feasibility for simpler tasks with fewer prerequisites
    let score = 0.8;
    
    if (opportunity.complexity === 'complex') score -= 0.3;
    if (opportunity.complexity === 'moderate') score -= 0.1;
    
    score -= opportunity.prerequisites.length * 0.1;
    
    return Math.max(0.1, score);
  }

  private assessGapSeverity(opportunity: ResearchOpportunity, knowledgeMap: VaultKnowledgeMap): number {
    // Higher score for addressing severe gaps
    if (opportunity.type === 'gap-fill') {
      const relatedArea = opportunity.knowledgeAreas[0];
      const weakArea = knowledgeMap.weakAreas.find(area => area.topic.includes(relatedArea));
      return weakArea?.gapSeverity || 0.5;
    }
    
    return 0.3;
  }

  private getHistoricalSuccessRate(topic: string): number {
    return this.topicSuccessRates.get(topic) || 0.5;
  }

  private createOptimalPath(opportunities: ResearchOpportunity[], context: any): ResearchOpportunity[] {
    // Sort by priority and create logical sequence
    return opportunities
      .sort((a, b) => b.priority - a.priority)
      .slice(0, context.maxDepth || 8);
  }

  private async createAlternativePaths(opportunities: ResearchOpportunity[], context: any): Promise<ResearchOpportunity[][]> {
    // Create alternative research paths focusing on different strategies
    const paths = [];
    
    // Path 1: Gap-filling focused
    const gapFocused = opportunities.filter(o => o.type === 'gap-fill').slice(0, 5);
    if (gapFocused.length > 0) paths.push(gapFocused);
    
    // Path 2: Bridge-building focused
    const bridgeFocused = opportunities.filter(o => o.type === 'connection-bridge').slice(0, 4);
    if (bridgeFocused.length > 0) paths.push(bridgeFocused);
    
    // Path 3: Deep-dive focused
    const deepDiveFocused = opportunities.filter(o => o.type === 'deep-dive').slice(0, 3);
    if (deepDiveFocused.length > 0) paths.push(deepDiveFocused);
    
    return paths;
  }

  private identifyRiskFactors(path: ResearchOpportunity[], knowledgeMap: VaultKnowledgeMap): string[] {
    const risks = [];
    
    if (path.some(o => o.complexity === 'complex')) {
      risks.push('High complexity tasks may require significant time investment');
    }
    
    if (path.filter(o => o.type === 'gap-fill').length > path.length * 0.7) {
      risks.push('Heavy focus on gap-filling may miss connection opportunities');
    }
    
    if (path.some(o => o.prerequisites.length > 2)) {
      risks.push('Some tasks have significant prerequisites that may block progress');
    }
    
    return risks;
  }

  private defineSuccessMetrics(topic: string, path: ResearchOpportunity[]): string[] {
    return [
      `Create comprehensive notes for ${path.length} research topics`,
      `Establish meaningful connections between new and existing knowledge`,
      `Fill identified knowledge gaps in ${topic} domain`,
      `Maintain quality threshold above 0.7 for all generated content`,
      `Create at least 3 bridge notes connecting different knowledge areas`
    ];
  }

  private createAdaptationTriggers(path: ResearchOpportunity[]): Array<{ condition: string; action: string }> {
    return [
      {
        condition: 'Research task fails due to insufficient sources',
        action: 'Switch to validation opportunity or bridge-building task'
      },
      {
        condition: 'Time limit approaching with many tasks remaining',
        action: 'Focus on highest priority gap-filling opportunities only'
      },
      {
        condition: 'Quality scores consistently below threshold',
        action: 'Switch to simpler validation tasks to maintain quality'
      },
      {
        condition: 'Discovered unexpected high-value connections',
        action: 'Add bridge-building tasks to capitalize on connections'
      }
    ];
  }

  private generateOpportunityId(): string {
    return `opp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Learn from completed research expedition outcomes
   */
  recordResearchOutcome(
    expeditionId: string,
    opportunities: ResearchOpportunity[],
    actualResults: any
  ): void {
    this.researchOutcomes.set(expeditionId, {
      opportunities,
      results: actualResults,
      timestamp: Date.now()
    });

    // Update success rates for topics
    for (const opportunity of opportunities) {
      const currentRate = this.topicSuccessRates.get(opportunity.topic) || 0.5;
      const successScore = actualResults.qualityScore || 0.5;
      const newRate = (currentRate * 0.7) + (successScore * 0.3); // Weighted average
      this.topicSuccessRates.set(opportunity.topic, newRate);
    }
  }

  /**
   * Get strategy recommendations based on learning
   */
  getStrategyRecommendations(topic: string): string[] {
    const recommendations = [];
    
    const topicSuccessRate = this.topicSuccessRates.get(topic);
    if (topicSuccessRate && topicSuccessRate < 0.4) {
      recommendations.push(`Consider simpler research approaches for ${topic} - historical success rate is low`);
    }
    
    if (this.researchOutcomes.size > 5) {
      const recentOutcomes = Array.from(this.researchOutcomes.values())
        .slice(-5);
      const avgGapFillSuccess = recentOutcomes
        .filter(outcome => outcome.opportunities.some((o: any) => o.type === 'gap-fill'))
        .reduce((sum, outcome) => sum + outcome.results.qualityScore, 0) / recentOutcomes.length;
      
      if (avgGapFillSuccess > 0.7) {
        recommendations.push('Gap-filling strategies have been highly successful - consider prioritizing them');
      }
    }
    
    return recommendations;
  }
}