/**
 * Similarity Engine - Calculates and manages content relationships
 * Core intelligence for finding semantically related notes
 */

import { ContentEmbedding, EmbeddingManager } from './embedding-manager';

export interface SimilarityResult {
  noteA: string;
  noteB: string;
  similarity: number;
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
}

export interface NoteContent {
  path: string;
  title: string;
  content: string;
  embedding?: ContentEmbedding;
  metadata?: Record<string, any>;
}

export interface SimilarityOptions {
  minSimilarity?: number;
  maxResults?: number;
  relationshipTypes?: RelationshipType[];
  useCache?: boolean;
}

export enum RelationshipType {
  SEMANTIC = 'semantic',      // Conceptually related
  TOPICAL = 'topical',        // Same subject matter
  METHODICAL = 'methodical',  // Same approach/method
  TEMPORAL = 'temporal',      // Time-based relationship
  CAUSAL = 'causal',          // Cause and effect
  HIERARCHICAL = 'hierarchical', // Parent-child
  COMPARATIVE = 'comparative'  // Compare/contrast
}

export class SimilarityEngine {
  private embeddingManager: EmbeddingManager;
  private similarityCache: Map<string, SimilarityResult[]> = new Map();
  private noteEmbeddings: Map<string, ContentEmbedding> = new Map();
  
  constructor(embeddingManager: EmbeddingManager) {
    this.embeddingManager = embeddingManager;
  }

  /**
   * Calculate similarity between two text contents or embeddings.
   */
  async calculateSimilarity(textA: string | ContentEmbedding, textB: string | ContentEmbedding): Promise<number> {
    if (typeof textA === 'string' && typeof textB === 'string') {
      const embeddingA = await this.embeddingManager.generateEmbedding(textA);
      const embeddingB = await this.embeddingManager.generateEmbedding(textB);
      return this.embeddingManager.calculateSimilarity(embeddingA, embeddingB);
    } else if (typeof textA === 'object' && typeof textB === 'object') {
      return this.embeddingManager.calculateSimilarity(textA, textB);
    } else {
      throw new Error('Both parameters must be of the same type (string or ContentEmbedding)');
    }
  }

  /**
   * Classify the relationship type between two texts.
   */
  classifyRelationshipType(textA: string, textB: string): RelationshipType {
    // Simple heuristic-based classification
    const textALower = textA.toLowerCase();
    const textBLower = textB.toLowerCase();
    
    // Check for temporal indicators
    const temporalMarkers = ['before', 'after', 'during', 'when', 'then', 'next', 'previous', 'date', 'time'];
    if (temporalMarkers.some(marker => textALower.includes(marker) || textBLower.includes(marker))) {
      return RelationshipType.TEMPORAL;
    }
    
    // Check for causal indicators
    const causalMarkers = ['because', 'therefore', 'as a result', 'due to', 'caused by', 'leads to', 'results in'];
    if (causalMarkers.some(marker => textALower.includes(marker) || textBLower.includes(marker))) {
      return RelationshipType.CAUSAL;
    }
    
    // Check for hierarchical indicators
    const hierarchicalMarkers = ['part of', 'contains', 'includes', 'subset', 'child', 'parent', 'belongs to'];
    if (hierarchicalMarkers.some(marker => textALower.includes(marker) || textBLower.includes(marker))) {
      return RelationshipType.HIERARCHICAL;
    }
    
    // Check for comparative indicators
    const comparativeMarkers = ['versus', 'compared to', 'unlike', 'similar to', 'different from', 'contrast'];
    if (comparativeMarkers.some(marker => textALower.includes(marker) || textBLower.includes(marker))) {
      return RelationshipType.COMPARATIVE;
    }
    
    // Default to semantic relationship
    return RelationshipType.SEMANTIC;
  }

  /**
   * Find notes similar to the given content
   */
  async findSimilarNotes(
    targetContent: string,
    allNotes: NoteContent[],
    options: SimilarityOptions = {}
  ): Promise<SimilarityResult[]> {
    const {
      minSimilarity = 0.3,
      maxResults = 10,
      relationshipTypes = Object.values(RelationshipType),
      useCache = true
    } = options;

    // Generate embedding for target content
    const targetEmbedding = await this.embeddingManager.generateEmbedding(
      targetContent,
      { useCache }
    );

    const similarities: SimilarityResult[] = [];

    // Compare with all notes
    for (const note of allNotes) {
      // Get or generate embedding for this note
      let noteEmbedding = this.noteEmbeddings.get(note.path);
      if (!noteEmbedding) {
        noteEmbedding = await this.embeddingManager.generateEmbedding(
          note.content,
          { useCache }
        );
        this.noteEmbeddings.set(note.path, noteEmbedding);
      }

      // Calculate similarity
      const similarity = this.embeddingManager.calculateSimilarity(
        targetEmbedding,
        noteEmbedding
      );

      if (similarity >= minSimilarity) {
        // Determine relationship type and generate explanation
        const relationship = await this.analyzeRelationship(
          targetContent,
          note,
          similarity
        );

        if (relationshipTypes.includes(relationship.type)) {
          similarities.push({
            noteA: 'target',
            noteB: note.path,
            similarity,
            relationshipType: relationship.type,
            confidence: relationship.confidence,
            reason: relationship.reason
          });
        }
      }
    }

    // Sort by similarity and limit results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Find relationships between all notes (build knowledge graph)
   */
  async buildSimilarityMatrix(
    notes: NoteContent[],
    options: SimilarityOptions = {}
  ): Promise<SimilarityResult[]> {
    const {
      minSimilarity = 0.3,
      useCache = true
    } = options;

    const relationships: SimilarityResult[] = [];

    // Generate embeddings for all notes first
    for (const note of notes) {
      if (!this.noteEmbeddings.has(note.path)) {
        const embedding = await this.embeddingManager.generateEmbedding(
          note.content,
          { useCache }
        );
        this.noteEmbeddings.set(note.path, embedding);
      }
    }

    // Calculate pairwise similarities
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const noteA = notes[i];
        const noteB = notes[j];
        
        const embeddingA = this.noteEmbeddings.get(noteA.path)!;
        const embeddingB = this.noteEmbeddings.get(noteB.path)!;

        const similarity = this.embeddingManager.calculateSimilarity(
          embeddingA,
          embeddingB
        );

        if (similarity >= minSimilarity) {
          const relationship = await this.analyzeRelationship(
            noteA.content,
            noteB,
            similarity
          );

          relationships.push({
            noteA: noteA.path,
            noteB: noteB.path,
            similarity,
            relationshipType: relationship.type,
            confidence: relationship.confidence,
            reason: relationship.reason
          });
        }
      }
    }

    return relationships.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Analyze the type of relationship between two pieces of content
   */
  private async analyzeRelationship(
    contentA: string,
    noteB: NoteContent,
    similarity: number
  ): Promise<{
    type: RelationshipType;
    confidence: number;
    reason: string;
  }> {
    // For now, use heuristic analysis
    // In production, this could use the existing AI providers for deeper analysis
    
    const aWords = this.extractKeyWords(contentA);
    const bWords = this.extractKeyWords(noteB.content);
    
    // Find common concepts
    const commonWords = aWords.filter(word => bWords.includes(word));
    const commonRatio = commonWords.length / Math.max(aWords.length, bWords.length);

    // Determine relationship type based on analysis
    let type: RelationshipType;
    let reason: string;

    if (commonRatio > 0.4) {
      type = RelationshipType.TOPICAL;
      reason = `Share ${commonWords.length} key concepts: ${commonWords.slice(0, 3).join(', ')}`;
    } else if (this.hasMethodologicalSimilarity(contentA, noteB.content)) {
      type = RelationshipType.METHODICAL;
      reason = 'Similar approaches or methodologies';
    } else if (this.hasTemporalMarkers(contentA, noteB.content)) {
      type = RelationshipType.TEMPORAL;
      reason = 'Time-based or sequential relationship';
    } else if (this.hasCausalMarkers(contentA, noteB.content)) {
      type = RelationshipType.CAUSAL;
      reason = 'Potential cause-effect relationship';
    } else if (this.hasHierarchicalMarkers(contentA, noteB.content)) {
      type = RelationshipType.HIERARCHICAL;
      reason = 'Hierarchical or parent-child relationship';
    } else if (this.hasComparativeMarkers(contentA, noteB.content)) {
      type = RelationshipType.COMPARATIVE;
      reason = 'Comparative or contrasting concepts';
    } else {
      type = RelationshipType.SEMANTIC;
      reason = `Semantically related (${Math.round(similarity * 100)}% similarity)`;
    }

    // Confidence based on similarity score and analysis
    const confidence = Math.min(similarity + (commonRatio * 0.2), 1.0);

    return { type, confidence, reason };
  }

  /**
   * Extract key words from content
   */
  private extractKeyWords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 20); // Limit for performance
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'this', 'that', 'these', 'those', 'a', 'an', 'is', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Check for methodological similarity markers
   */
  private hasMethodologicalSimilarity(contentA: string, contentB: string): boolean {
    const methodWords = ['method', 'approach', 'technique', 'process', 'procedure', 'strategy'];
    const aHasMethods = methodWords.some(word => contentA.toLowerCase().includes(word));
    const bHasMethods = methodWords.some(word => contentB.toLowerCase().includes(word));
    return aHasMethods && bHasMethods;
  }

  /**
   * Check for temporal relationship markers
   */
  private hasTemporalMarkers(contentA: string, contentB: string): boolean {
    const temporalWords = ['before', 'after', 'then', 'next', 'previous', 'follow', 'sequence', 'step'];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    return temporalWords.some(word => combined.includes(word));
  }

  /**
   * Check for causal relationship markers
   */
  private hasCausalMarkers(contentA: string, contentB: string): boolean {
    const causalWords = ['because', 'therefore', 'result', 'cause', 'effect', 'consequence', 'due to'];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    return causalWords.some(word => combined.includes(word));
  }

  /**
   * Check for hierarchical relationship markers
   */
  private hasHierarchicalMarkers(contentA: string, contentB: string): boolean {
    const hierarchicalWords = ['parent', 'child', 'sub', 'main', 'overview', 'detail', 'category'];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    return hierarchicalWords.some(word => combined.includes(word));
  }

  /**
   * Check for comparative relationship markers
   */
  private hasComparativeMarkers(contentA: string, contentB: string): boolean {
    const comparativeWords = ['compare', 'contrast', 'similar', 'different', 'versus', 'vs', 'like', 'unlike'];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    return comparativeWords.some(word => combined.includes(word));
  }

  /**
   * Update embedding for a specific note
   */
  async updateNoteEmbedding(notePath: string, content: string): Promise<void> {
    const embedding = await this.embeddingManager.generateEmbedding(content);
    this.noteEmbeddings.set(notePath, embedding);
    
    // Clear related cached similarities
    this.clearCacheForNote(notePath);
  }

  /**
   * Clear similarity cache for a specific note
   */
  private clearCacheForNote(notePath: string): void {
    const keysToRemove = Array.from(this.similarityCache.keys())
      .filter(key => key.includes(notePath));
    
    keysToRemove.forEach(key => this.similarityCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    embeddingCache: number;
    similarityCache: number;
  } {
    return {
      embeddingCache: this.noteEmbeddings.size,
      similarityCache: this.similarityCache.size
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.noteEmbeddings.clear();
    this.similarityCache.clear();
    this.embeddingManager.clearCache();
  }
}