/**
 * Vault Audit Workflow - Advanced vault organization using semantic search + intelligence
 * Implements the workflow described in Vault Audit Workflow.md
 */

import { App, TFile } from 'obsidian';
import { VaultContextExtractor, VaultContext } from '../utils/vault-context';
import { EmbeddingManager } from './semantic/embedding-manager';
import { SimilarityEngine } from './semantic/similarity-engine';
import { SimilarityResult, RelationshipType } from './semantic/types';

export interface TagPruningResult {
  originalTagCount: number;
  prunedTagCount: number;
  topTags: Array<{ tag: string; count: number }>;
  prunedTags: string[];
  recommendedActions: string[];
}

export interface SemanticRelationship {
  sourceNote: string;
  targetNote: string;
  similarity: number;
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
}

export interface MoCEnhancement {
  mocPath: string;
  childNotes: string[];
  inheritedTags: string[];
  semanticSuggestions: SemanticRelationship[];
  generatedContent: string;
}

export interface VaultAuditReport {
  summary: {
    totalNotes: number;
    processedNotes: number;
    semanticRelationships: number;
    enhancedMoCs: number;
    timeElapsed: string;
  };
  tagPruning: TagPruningResult;
  semanticAnalysis: {
    relationshipsByType: Record<RelationshipType, number>;
    strongestConnections: SemanticRelationship[];
    orphanNotes: string[];
    hubNotes: Array<{ note: string; connections: number }>;
  };
  mocEnhancements: MoCEnhancement[];
  recommendations: string[];
}

export class VaultAuditWorkflow {
  private app: App;
  private vaultExtractor: VaultContextExtractor;
  private embeddingManager: EmbeddingManager;
  private similarityEngine: SimilarityEngine;
  
  constructor(
    app: App, 
    embeddingManager: EmbeddingManager, 
    similarityEngine: SimilarityEngine
  ) {
    this.app = app;
    this.vaultExtractor = new VaultContextExtractor(app);
    this.embeddingManager = embeddingManager;
    this.similarityEngine = similarityEngine;
  }

  /**
   * Run complete vault audit workflow
   */
  async runFullAudit(options: {
    pruneThreshold?: number;
    maxTopTags?: number;
    semanticThreshold?: number;
    maxProcessNotes?: number;
    enhanceMoCs?: boolean;
  } = {}): Promise<VaultAuditReport> {
    const startTime = Date.now();
    console.log('🔍 AUDIT: Starting comprehensive vault audit...');

    const {
      pruneThreshold = 3,
      maxTopTags = 20,
      semanticThreshold = 0.3,
      maxProcessNotes = 500,
      enhanceMoCs = true
    } = options;

    // Step 1: Extract full vault context
    console.log('🔍 AUDIT: Step 1 - Extracting vault context...');
    const context = await this.vaultExtractor.extractFullContext();

    // Step 2: Prune and prioritize tags
    console.log('🔍 AUDIT: Step 2 - Analyzing and pruning tags...');
    const tagPruning = this.pruneAndPriorizeTags(context, pruneThreshold, maxTopTags);

    // Step 3: Build semantic relationships
    console.log('🔍 AUDIT: Step 3 - Building semantic relationships...');
    const semanticAnalysis = await this.buildSemanticRelationships(
      context, 
      semanticThreshold, 
      maxProcessNotes
    );

    // Step 4: Enhance MoCs (Maps of Content)
    console.log('🔍 AUDIT: Step 4 - Enhancing Maps of Content...');
    const mocEnhancements = enhanceMoCs 
      ? await this.enhanceMapsOfContent(context, semanticAnalysis.relationships)
      : [];

    // Step 5: Generate recommendations
    console.log('🔍 AUDIT: Step 5 - Generating recommendations...');
    const recommendations = this.generateRecommendations(
      context, 
      tagPruning, 
      semanticAnalysis, 
      mocEnhancements
    );

    const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🔍 AUDIT: Complete! Processed in ${timeElapsed}s`);

    return {
      summary: {
        totalNotes: context.vaultStats.totalNotes,
        processedNotes: Math.min(maxProcessNotes, context.vaultStats.totalNotes),
        semanticRelationships: semanticAnalysis.relationships.length,
        enhancedMoCs: mocEnhancements.length,
        timeElapsed: `${timeElapsed}s`
      },
      tagPruning,
      semanticAnalysis,
      mocEnhancements,
      recommendations
    };
  }

  /**
   * Step 2: Prune and prioritize tags based on usage frequency
   */
  private pruneAndPriorizeTags(
    context: VaultContext, 
    threshold: number, 
    maxTopTags: number
  ): TagPruningResult {
    const { tagCounts, topTags } = context.tagAnalysis;
    
    // Find tags below threshold (candidates for pruning)
    const prunedTags = Object.entries(tagCounts)
      .filter(([tag, count]) => count < threshold)
      .map(([tag]) => tag);

    // Keep only top N tags
    const prioritizedTopTags = topTags.slice(0, maxTopTags);
    
    // Generate recommendations
    const recommendedActions = [];
    if (prunedTags.length > 0) {
      recommendedActions.push(
        `Consider removing ${prunedTags.length} rarely-used tags (used < ${threshold} times)`
      );
    }
    
    if (topTags.length > maxTopTags) {
      recommendedActions.push(
        `Focus on top ${maxTopTags} tags for consistency (${topTags.length - maxTopTags} others could be consolidated)`
      );
    }

    const tagDensity = Object.keys(tagCounts).length / context.vaultStats.totalNotes;
    if (tagDensity > 0.5) {
      recommendedActions.push(
        `High tag density (${tagDensity.toFixed(2)} tags per note) - consider using properties instead of tags for specific attributes`
      );
    }

    return {
      originalTagCount: Object.keys(tagCounts).length,
      prunedTagCount: prunedTags.length,
      topTags: prioritizedTopTags,
      prunedTags: prunedTags.slice(0, 50), // Limit for readability
      recommendedActions
    };
  }

  /**
   * Step 3: Build semantic relationships between notes
   */
  private async buildSemanticRelationships(
    context: VaultContext,
    threshold: number,
    maxNotes: number
  ): Promise<{
    relationships: SemanticRelationship[];
    relationshipsByType: Record<RelationshipType, number>;
    strongestConnections: SemanticRelationship[];
    orphanNotes: string[];
    hubNotes: Array<{ note: string; connections: number }>;
  }> {
    const files = this.app.vault.getMarkdownFiles().slice(0, maxNotes);
    
    // Prepare note contents for analysis
    const noteContents = [];
    for (const file of files.slice(0, 50)) { // Process subset for performance
      try {
        const content = await this.app.vault.read(file);
        noteContents.push({
          path: file.path,
          title: file.basename,
          content,
          metadata: this.app.metadataCache.getFileCache(file)
        });
      } catch (error) {
        console.warn(`Failed to read file: ${file.path}`);
      }
    }

    // Build similarity matrix
    console.log(`🔍 AUDIT: Analyzing relationships between ${noteContents.length} notes...`);
    const similarityResults = await this.similarityEngine.buildSimilarityMatrix(
      noteContents,
      { minSimilarity: threshold }
    );

    // Convert to semantic relationships
    const relationships: SemanticRelationship[] = similarityResults.map(result => ({
      sourceNote: result.noteA,
      targetNote: result.noteB,
      similarity: result.similarity,
      relationshipType: result.relationshipType,
      confidence: result.confidence,
      reason: result.reason
    }));

    // Analyze relationship patterns
    const relationshipsByType = {} as Record<RelationshipType, number>;
    Object.values(RelationshipType).forEach(type => {
      relationshipsByType[type] = relationships.filter(r => r.relationshipType === type).length;
    });

    // Find strongest connections
    const strongestConnections = relationships
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    // Find hub notes (most connected)
    const connectionCounts = {} as Record<string, number>;
    relationships.forEach(rel => {
      connectionCounts[rel.sourceNote] = (connectionCounts[rel.sourceNote] || 0) + 1;
      connectionCounts[rel.targetNote] = (connectionCounts[rel.targetNote] || 0) + 1;
    });

    const hubNotes = Object.entries(connectionCounts)
      .map(([note, connections]) => ({ note, connections }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);

    // Find orphan notes (no semantic connections)
    const connectedNotes = new Set();
    relationships.forEach(rel => {
      connectedNotes.add(rel.sourceNote);
      connectedNotes.add(rel.targetNote);
    });
    
    const orphanNotes = noteContents
      .filter(note => !connectedNotes.has(note.path))
      .map(note => note.path)
      .slice(0, 20);

    return {
      relationships,
      relationshipsByType,
      strongestConnections,
      orphanNotes,
      hubNotes
    };
  }

  /**
   * Step 4: Enhance Maps of Content with semantic suggestions
   */
  private async enhanceMapsOfContent(
    context: VaultContext,
    relationships: SemanticRelationship[]
  ): Promise<MoCEnhancement[]> {
    // Find potential MoCs (notes with many outgoing links or "MoC" in title)
    const files = this.app.vault.getMarkdownFiles();
    const mocCandidates = files.filter(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      const hasMultipleLinks = (cache?.links?.length || 0) > 5;
      const isMoCTitle = file.basename.toLowerCase().includes('moc') || 
                        file.basename.toLowerCase().includes('map of content') ||
                        file.basename.toLowerCase().includes('index');
      return hasMultipleLinks || isMoCTitle;
    }).slice(0, 10); // Process top 10 MoCs

    const enhancements: MoCEnhancement[] = [];

    for (const mocFile of mocCandidates) {
      try {
        const content = await this.app.vault.read(mocFile);
        const cache = this.app.metadataCache.getFileCache(mocFile);
        
        // Get child notes (outgoing links)
        const childNotes = cache?.links?.map(link => link.link) || [];
        
        // Collect tags from child notes
        const inheritedTags = new Set<string>();
        for (const childPath of childNotes.slice(0, 20)) { // Limit for performance
          const childFile = this.app.vault.getAbstractFileByPath(childPath + '.md');
          if (childFile instanceof TFile) {
            const childCache = this.app.metadataCache.getFileCache(childFile);
            if (childCache?.tags) {
              childCache.tags.forEach(tag => inheritedTags.add(tag.tag));
            }
          }
        }

        // Find semantic suggestions for this MoC
        const mocRelationships = relationships.filter(rel => 
          rel.sourceNote === mocFile.path || rel.targetNote === mocFile.path
        );

        // Generate enhancement content
        const generatedContent = this.generateMoCContent(mocFile, childNotes, Array.from(inheritedTags), mocRelationships);

        enhancements.push({
          mocPath: mocFile.path,
          childNotes: childNotes.slice(0, 20),
          inheritedTags: Array.from(inheritedTags),
          semanticSuggestions: mocRelationships,
          generatedContent
        });

      } catch (error) {
        console.warn(`Failed to enhance MoC: ${mocFile.path}`);
      }
    }

    return enhancements;
  }

  /**
   * Generate enhanced MoC content with semantic insights
   */
  private generateMoCContent(
    mocFile: TFile,
    childNotes: string[],
    tags: string[],
    relationships: SemanticRelationship[]
  ): string {
    const semanticGroups = this.groupRelationshipsByType(relationships);
    
    return `# ${mocFile.basename} - Enhanced MoC

## Overview
This Map of Content connects ${childNotes.length} related notes with ${relationships.length} semantic relationships discovered through AI analysis.

## Inherited Topics
${tags.length > 0 ? tags.map(tag => `- ${tag}`).join('\n') : 'No inherited tags found.'}

## Semantic Relationships

${Object.entries(semanticGroups).map(([type, rels]) => `### ${this.formatRelationshipType(type)}
${rels.map(rel => `- [[${this.getNoteName(rel.targetNote)}]] (${(rel.similarity * 100).toFixed(0)}% similarity) - ${rel.reason}`).join('\n')}`).join('\n\n')}

## Connected Notes
${childNotes.map(note => `- [[${note}]]`).join('\n')}

---
*This MoC was enhanced using semantic analysis on ${new Date().toLocaleDateString()}*`;
  }

  /**
   * Group relationships by type
   */
  private groupRelationshipsByType(relationships: SemanticRelationship[]): Record<string, SemanticRelationship[]> {
    const groups: Record<string, SemanticRelationship[]> = {};
    
    relationships.forEach(rel => {
      const type = rel.relationshipType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(rel);
    });

    // Sort each group by similarity
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => b.similarity - a.similarity);
    });

    return groups;
  }

  /**
   * Format relationship type for display
   */
  private formatRelationshipType(type: string): string {
    const typeMap: Record<string, string> = {
      'semantic': 'Conceptually Related',
      'topical': 'Same Subject Matter',
      'methodical': 'Similar Approaches',
      'temporal': 'Time-based Connections',
      'causal': 'Cause & Effect',
      'hierarchical': 'Parent-Child Relationships',
      'comparative': 'Comparative Analysis'
    };
    return typeMap[type] || type;
  }

  /**
   * Get note name from path
   */
  private getNoteName(path: string): string {
    return path.replace(/\.md$/, '').split('/').pop() || path;
  }

  /**
   * Step 5: Generate actionable recommendations
   */
  private generateRecommendations(
    context: VaultContext,
    tagPruning: TagPruningResult,
    semanticAnalysis: any,
    mocEnhancements: MoCEnhancement[]
  ): string[] {
    const recommendations = [];

    // Tag-based recommendations
    if (tagPruning.prunedTagCount > 0) {
      recommendations.push(
        `🏷️ Tag Cleanup: Remove ${tagPruning.prunedTagCount} rarely-used tags to reduce clutter`
      );
    }

    if (tagPruning.topTags.length > 15) {
      recommendations.push(
        `🏷️ Tag Consolidation: Consider consolidating similar tags among your top ${tagPruning.topTags.length} tags`
      );
    }

    // Semantic recommendations
    if (semanticAnalysis.orphanNotes.length > 0) {
      recommendations.push(
        `🔗 Link Orphaned Notes: ${semanticAnalysis.orphanNotes.length} notes have no semantic connections - consider linking them to related content`
      );
    }

    if (semanticAnalysis.hubNotes.length > 0) {
      const topHub = semanticAnalysis.hubNotes[0];
      recommendations.push(
        `⭐ Strengthen Hub: "${this.getNoteName(topHub.note)}" is your most connected note (${topHub.connections} connections) - consider making it a formal MoC`
      );
    }

    // MoC recommendations
    if (mocEnhancements.length > 0) {
      recommendations.push(
        `📋 Update MoCs: ${mocEnhancements.length} Maps of Content can be enhanced with discovered semantic relationships`
      );
    }

    // Vault structure recommendations
    const linkDensity = semanticAnalysis.relationships.length / context.vaultStats.totalNotes;
    if (linkDensity < 0.1) {
      recommendations.push(
        `🔗 Increase Connectivity: Your vault has low link density (${linkDensity.toFixed(2)}) - consider adding more [[wikilinks]] between related notes`
      );
    }

    // Content recommendations
    const avgNoteLength = context.vaultStats.avgNoteLength;
    if (avgNoteLength < 100) {
      recommendations.push(
        `📝 Expand Notes: Average note length is ${avgNoteLength} words - consider developing ideas more fully`
      );
    } else if (avgNoteLength > 1000) {
      recommendations.push(
        `✂️ Split Large Notes: Average note length is ${avgNoteLength} words - consider breaking down large notes into atomic concepts`
      );
    }

    return recommendations;
  }

  /**
   * Generate summary report in markdown format
   */
  formatAuditReport(report: VaultAuditReport): string {
    return `# Vault Audit Report
*Generated on ${new Date().toLocaleDateString()} in ${report.summary.timeElapsed}*

## 📊 Summary
- **Total Notes**: ${report.summary.totalNotes}
- **Processed Notes**: ${report.summary.processedNotes}
- **Semantic Relationships**: ${report.summary.semanticRelationships}
- **Enhanced MoCs**: ${report.summary.enhancedMoCs}

## 🏷️ Tag Analysis
- **Original Tags**: ${report.tagPruning.originalTagCount}
- **Rarely Used**: ${report.tagPruning.prunedTagCount}
- **Top Tags**: ${report.tagPruning.topTags.slice(0, 10).map(t => `${t.tag} (${t.count})`).join(', ')}

## 🔗 Semantic Analysis
${Object.entries(report.semanticAnalysis.relationshipsByType)
  .map(([type, count]) => `- **${this.formatRelationshipType(type)}**: ${count}`)
  .join('\n')}

### Strongest Connections
${report.semanticAnalysis.strongestConnections.slice(0, 5)
  .map(rel => `- ${this.getNoteName(rel.sourceNote)} ↔ ${this.getNoteName(rel.targetNote)} (${(rel.similarity * 100).toFixed(0)}%)`)
  .join('\n')}

### Hub Notes (Most Connected)
${report.semanticAnalysis.hubNotes.slice(0, 5)
  .map(hub => `- ${this.getNoteName(hub.note)} (${hub.connections} connections)`)
  .join('\n')}

## 📋 Maps of Content
${report.mocEnhancements.length > 0 
  ? report.mocEnhancements.map(moc => `- ${this.getNoteName(moc.mocPath)} (${moc.childNotes.length} children, ${moc.semanticSuggestions.length} semantic links)`).join('\n')
  : 'No MoCs detected or enhanced'}

## 💡 Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*This audit used semantic analysis to discover ${report.summary.semanticRelationships} relationships between your notes.*`;
  }
}