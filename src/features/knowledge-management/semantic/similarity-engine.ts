/**
 * Similarity Engine - Calculates and manages content relationships
 * Core intelligence for finding semantically related notes
 */

import { EmbeddingManager } from './embedding-manager';
import { 
  ContentEmbedding, 
  SimilarityResult, 
  NoteContent, 
  SimilarityOptions, 
  RelationshipType 
} from './types';

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
        // Multi-chunk analysis for better accuracy
        const sourceChunks = this.extractMultipleChunks(targetContent, 2, 200);
        const targetChunks = this.extractMultipleChunks(note.content, 2, 200);
        
        // Use the best chunks for analysis
        const sourceChunk = sourceChunks[0] || this.extractMeaningfulChunk(targetContent);
        const targetChunk = targetChunks[0] || this.extractMeaningfulChunk(note.content);

        // Enhanced relationship analysis with multi-chunk context
        const relationship = await this.analyzeRelationshipAdvanced(
          targetContent,
          note,
          similarity,
          sourceChunks,
          targetChunks
        );

        if (relationshipTypes.includes(relationship.type)) {
          similarities.push({
            noteA: 'target',
            noteB: note.path,
            similarity,
            relationshipType: relationship.type,
            confidence: relationship.confidence,
            reason: relationship.reason,
            sourceChunk: relationship.sourceChunk,
            targetChunk: relationship.targetChunk,
            matchingConcepts: relationship.matchingConcepts
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
          // Multi-chunk analysis for comprehensive comparison
          const sourceChunks = this.extractMultipleChunks(noteA.content, 2, 200);
          const targetChunks = this.extractMultipleChunks(noteB.content, 2, 200);

          const relationship = await this.analyzeRelationshipAdvanced(
            noteA.content,
            noteB,
            similarity,
            sourceChunks,
            targetChunks
          );

          relationships.push({
            noteA: noteA.path,
            noteB: noteB.path,
            similarity,
            relationshipType: relationship.type,
            confidence: relationship.confidence,
            reason: relationship.reason,
            sourceChunk: relationship.sourceChunk,
            targetChunk: relationship.targetChunk,
            matchingConcepts: relationship.matchingConcepts
          });
        }
      }
    }

    return relationships.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Analyze the type of relationship between two pieces of content
   * Enhanced with chunk citation and better content analysis
   */
  private async analyzeRelationship(
    contentA: string,
    noteB: NoteContent,
    similarity: number,
    sourceChunk?: string,
    targetChunk?: string
  ): Promise<{
    type: RelationshipType;
    confidence: number;
    reason: string;
    sourceChunk?: string;
    targetChunk?: string;
    matchingConcepts?: string[];
  }> {
    // Extract meaningful keywords and content indicators
    const aWords = this.extractKeyWords(contentA);
    const bWords = this.extractKeyWords(noteB.content);
    
    // Find common concepts
    const commonWords = aWords.filter(word => bWords.includes(word));
    const commonRatio = commonWords.length / Math.max(aWords.length, bWords.length);
    
    // Analyze file names and paths for additional context
    const notePathIndicators = this.analyzePathStructure(noteB.path);
    const contentTypeA = this.analyzeContentType(contentA);
    const contentTypeB = this.analyzeContentType(noteB.content);

    // Determine relationship type based on similarity score and content analysis
    // REORDERED: Check more specific/meaningful relationships first, temporal/causal last
    let type: RelationshipType;
    let reason: string;
    let confidence = similarity;

    // High similarity with shared vocabulary = topical relationship (PRIORITY 1)
    if (similarity > 0.6 && commonRatio > 0.3) {
      type = RelationshipType.TOPICAL;
      reason = `Strong topical similarity (${Math.round(similarity * 100)}%) with shared concepts: ${commonWords.slice(0, 3).join(', ')}`;
      confidence = Math.min(similarity + 0.1, 1.0);
    }
    // Check for methodological similarity - more specific than semantic (PRIORITY 2)
    else if (this.hasMethodologicalSimilarity(contentA, noteB.content)) {
      type = RelationshipType.METHODICAL;
      reason = `Similar methodologies or approaches detected (${Math.round(similarity * 100)}% similarity)`;
      confidence = Math.max(similarity, 0.6);
    }
    // Check for hierarchical relationships - structural meaning (PRIORITY 3)
    else if (notePathIndicators.isTemplate || notePathIndicators.isHierarchical || 
             this.hasHierarchicalMarkers(contentA, noteB.content)) {
      type = RelationshipType.HIERARCHICAL;
      reason = notePathIndicators.isTemplate ? 
        `Template-based relationship (${Math.round(similarity * 100)}% similarity)` : 
        `Hierarchical or categorical structure (${Math.round(similarity * 100)}% similarity)`;
      confidence = Math.max(similarity, 0.4);
    }
    // Check for comparative content - explicit comparisons (PRIORITY 4)
    else if (this.hasComparativeMarkers(contentA, noteB.content)) {
      type = RelationshipType.COMPARATIVE;
      reason = `Comparative analysis or contrasting concepts (${Math.round(similarity * 100)}% similarity)`;
      confidence = Math.max(similarity, 0.6);
    }
    // Medium-high similarity with some shared concepts = semantic relationship (PRIORITY 5)
    else if (similarity > 0.4 && commonRatio > 0.15) {
      type = RelationshipType.SEMANTIC;
      reason = `Conceptually related (${Math.round(similarity * 100)}% similarity) - ${commonWords.length} shared concepts`;
      confidence = similarity;
    }
    // Check for causal relationships - now lower priority (PRIORITY 6)
    else if (this.hasCausalMarkers(contentA, noteB.content)) {
      type = RelationshipType.CAUSAL;
      reason = `Cause-and-effect relationship detected (${Math.round(similarity * 100)}% similarity)`;
      confidence = Math.max(similarity, 0.7);
    }
    // Check for temporal patterns - now lowest priority (PRIORITY 7)
    else if (this.hasTemporalMarkers(contentA, noteB.content)) {
      type = RelationshipType.TEMPORAL;
      reason = `Sequential or time-based relationship (${Math.round(similarity * 100)}% similarity)`;
      confidence = Math.max(similarity, 0.5);
    }
    // Default to semantic relationship for medium similarities
    else if (similarity > 0.25) {
      type = RelationshipType.SEMANTIC;
      reason = `Semantic similarity (${Math.round(similarity * 100)}%) - general conceptual connection`;
      confidence = similarity;
    }
    // Low similarity - might be spurious
    else {
      type = RelationshipType.SEMANTIC;
      reason = `Weak semantic connection (${Math.round(similarity * 100)}%)`;
      confidence = similarity * 0.8; // Lower confidence for weak connections
    }

    return { 
      type, 
      confidence, 
      reason,
      sourceChunk: sourceChunk || contentA.substring(0, 200) + '...',
      targetChunk: targetChunk || noteB.content.substring(0, 200) + '...',
      matchingConcepts: commonWords.slice(0, 5) // Top 5 matching concepts
    };
  }

  /**
   * Advanced relationship analysis using multiple chunks for better accuracy
   */
  private async analyzeRelationshipAdvanced(
    contentA: string,
    noteB: NoteContent,
    similarity: number,
    sourceChunks: string[],
    targetChunks: string[]
  ): Promise<{
    type: RelationshipType;
    confidence: number;
    reason: string;
    sourceChunk?: string;
    targetChunk?: string;
    matchingConcepts?: string[];
  }> {
    // Analyze all chunk combinations to find the strongest relationship
    let bestAnalysis = await this.analyzeRelationship(
      contentA, 
      noteB, 
      similarity, 
      sourceChunks[0], 
      targetChunks[0]
    );
    
    // Compare multiple chunk combinations to find the most meaningful relationship
    for (const sourceChunk of sourceChunks.slice(0, 2)) {
      for (const targetChunk of targetChunks.slice(0, 2)) {
        const analysis = await this.analyzeRelationship(
          sourceChunk,
          { ...noteB, content: targetChunk },
          similarity,
          sourceChunk,
          targetChunk
        );
        
        // Prefer more specific relationship types and higher confidence
        if (this.isStrongerRelationship(analysis, bestAnalysis)) {
          bestAnalysis = analysis;
        }
      }
    }
    
    // Aggregate matching concepts from all chunks
    const allSourceWords = sourceChunks.flatMap(chunk => this.extractKeyWords(chunk));
    const allTargetWords = targetChunks.flatMap(chunk => this.extractKeyWords(chunk));
    const aggregatedConcepts = allSourceWords.filter(word => allTargetWords.includes(word));
    
    // Enhance the analysis with document structure context
    const structureBonus = this.analyzeDocumentStructure(noteB.path, noteB.content);
    
    return {
      ...bestAnalysis,
      confidence: Math.min(bestAnalysis.confidence + structureBonus, 1.0),
      matchingConcepts: [...new Set(aggregatedConcepts)].slice(0, 6) // More concepts from multi-chunk analysis
    };
  }

  /**
   * Determine if one relationship analysis is stronger than another
   */
  private isStrongerRelationship(analysisA: any, analysisB: any): boolean {
    // Priority: More specific relationship types, then higher confidence
    const typeRanking = {
      [RelationshipType.TOPICAL]: 7,
      [RelationshipType.METHODICAL]: 6,  
      [RelationshipType.COMPARATIVE]: 5,
      [RelationshipType.HIERARCHICAL]: 4,
      [RelationshipType.CAUSAL]: 3,
      [RelationshipType.TEMPORAL]: 2,
      [RelationshipType.SEMANTIC]: 1
    };
    
    const rankA = typeRanking[analysisA.type] || 0;
    const rankB = typeRanking[analysisB.type] || 0;
    
    if (rankA !== rankB) {
      return rankA > rankB;
    }
    
    // If same type, prefer higher confidence
    return analysisA.confidence > analysisB.confidence;
  }

  /**
   * Analyze document structure for relationship context
   */
  private analyzeDocumentStructure(path: string, content: string): number {
    let bonus = 0;
    
    // Path-based context
    const pathSegments = path.split('/');
    if (pathSegments.length > 2) bonus += 0.05; // Organized in folders
    
    // Content structure analysis
    const hasHeadings = /^#+\s+/m.test(content);
    const hasList = /^\s*[-*+]\s+/m.test(content) || /^\s*\d+\.\s+/m.test(content);
    const hasLinks = /\[\[|\]\(/.test(content);
    
    if (hasHeadings) bonus += 0.05; // Well-structured content
    if (hasList) bonus += 0.03; // Organized information  
    if (hasLinks) bonus += 0.02; // Connected to other content
    
    return Math.min(bonus, 0.15); // Cap the bonus at 15%
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
   * Extract the most meaningful chunk from content for analysis and citation
   * Uses intelligent content analysis to find the most relevant sections
   */
  private extractMeaningfulChunk(content: string, maxLength: number = 300): string {
    // Remove markdown syntax for better analysis
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert wikilinks to text
      .replace(/^#+\s+/gm, '') // Remove heading markers but keep text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();

    // Split into paragraphs
    const paragraphs = cleanContent.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    if (paragraphs.length === 0) {
      return content.substring(0, maxLength) + '...';
    }

    // Strategy 1: Find paragraphs with the most meaningful content
    let bestParagraph = '';
    let maxScore = 0;

    for (const paragraph of paragraphs.slice(0, 10)) { // Limit to first 10 paragraphs for performance
      const score = this.calculateContentScore(paragraph);
      if (score > maxScore && paragraph.length >= 50) { // Minimum meaningful length
        maxScore = score;
        bestParagraph = paragraph;
      }
    }

    // Strategy 2: If no good paragraph found, get the most info-dense sentences
    if (!bestParagraph || bestParagraph.length < 100) {
      const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const scoredSentences = sentences.map(sentence => ({
        text: sentence.trim(),
        score: this.calculateContentScore(sentence)
      })).sort((a, b) => b.score - a.score);

      // Combine top 2-3 sentences
      bestParagraph = scoredSentences
        .slice(0, 3)
        .map(s => s.text)
        .join('. ') + '.';
    }

    // Truncate to max length while respecting sentence boundaries
    if (bestParagraph.length > maxLength) {
      const truncated = bestParagraph.substring(0, maxLength);
      const lastSentence = truncated.lastIndexOf('.');
      if (lastSentence > maxLength * 0.7) {
        return truncated.substring(0, lastSentence + 1);
      }
      return truncated + '...';
    }

    return bestParagraph || content.substring(0, maxLength) + '...';
  }

  /**
   * Calculate content meaningfulness score based on various factors
   */
  private calculateContentScore(text: string): number {
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);

    // Factor 1: Information density (unique words vs total words)
    score += (uniqueWords.size / words.length) * 100;

    // Factor 2: Presence of meaningful content indicators
    const contentIndicators = [
      'definition', 'means', 'describes', 'explains', 'contains', 'includes',
      'properties', 'effects', 'benefits', 'used for', 'helps', 'improves',
      'research', 'study', 'found', 'showed', 'indicates', 'suggests'
    ];
    
    const indicatorCount = contentIndicators.filter(indicator => 
      text.toLowerCase().includes(indicator)
    ).length;
    score += indicatorCount * 20;

    // Factor 3: Length bonus (but not too long)
    const lengthScore = Math.min(text.length / 10, 50);
    score += lengthScore;

    // Factor 4: Penalty for very short or very repetitive content
    if (text.length < 30) score -= 20;
    if (uniqueWords.size < words.length * 0.5) score -= 10; // Too repetitive

    return score;
  }

  /**
   * Extract multiple meaningful chunks from content for comprehensive analysis
   */
  private extractMultipleChunks(content: string, maxChunks: number = 3, chunkSize: number = 250): string[] {
    // Remove markdown syntax and clean content
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert wikilinks to text
      .trim();

    // Strategy 1: Extract by document structure (headings, paragraphs)
    const structuredChunks = this.extractStructuralChunks(cleanContent, chunkSize);
    
    // Strategy 2: Extract by semantic density
    const semanticChunks = this.extractSemanticChunks(cleanContent, chunkSize);
    
    // Combine and deduplicate chunks
    const allChunks = [...structuredChunks, ...semanticChunks];
    const uniqueChunks = this.deduplicateChunks(allChunks);
    
    // Score and rank chunks
    const scoredChunks = uniqueChunks
      .map(chunk => ({
        text: chunk,
        score: this.calculateContentScore(chunk)
      }))
      .sort((a, b) => b.score - a.score);

    // Return top chunks
    return scoredChunks
      .slice(0, maxChunks)
      .map(chunk => chunk.text);
  }

  /**
   * Extract chunks based on document structure (headings, paragraphs)
   */
  private extractStructuralChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    
    // Split by headings (markdown ## or ###)
    const sections = content.split(/^#+\s+/m).filter(section => section.trim().length > 50);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        chunks.push(section.trim());
      } else {
        // Break large sections into paragraphs
        const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length > 30);
        for (const paragraph of paragraphs) {
          if (paragraph.length <= chunkSize) {
            chunks.push(paragraph.trim());
          }
        }
      }
    }
    
    return chunks.slice(0, 5); // Limit structural chunks
  }

  /**
   * Extract chunks based on semantic density (information-rich sentences)
   */
  private extractSemanticChunks(content: string, chunkSize: number): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const chunks: string[] = [];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= chunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
      } else {
        if (currentChunk) chunks.push(currentChunk + '.');
        currentChunk = sentence.trim();
      }
    }
    
    if (currentChunk) chunks.push(currentChunk + '.');
    
    return chunks;
  }

  /**
   * Remove duplicate or highly similar chunks
   */
  private deduplicateChunks(chunks: string[]): string[] {
    const unique: string[] = [];
    
    for (const chunk of chunks) {
      const isDuplicate = unique.some(existing => {
        const similarity = this.calculateTextSimilarity(chunk, existing);
        return similarity > 0.7; // 70% similar = duplicate
      });
      
      if (!isDuplicate && chunk.length > 50) {
        unique.push(chunk);
      }
    }
    
    return unique;
  }

  /**
   * Calculate simple text similarity (Jaccard index)
   */
  private calculateTextSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
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
   * Check for temporal relationship markers (more restrictive)
   */
  private hasTemporalMarkers(contentA: string, contentB: string): boolean {
    // More specific temporal phrases to reduce false positives
    const temporalPhrases = [
      'before', 'after', 'then', 'next', 'previous', 'follow', 'sequence',
      'first step', 'next step', 'final step', 'in order', 'chronological',
      'timeline', 'schedule', 'phase', 'stage'
    ];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    
    // Require at least 2 temporal markers OR very specific sequential language
    const matches = temporalPhrases.filter(phrase => combined.includes(phrase));
    return matches.length >= 2 || 
           matches.some(match => ['sequence', 'chronological', 'timeline', 'first step', 'next step'].includes(match));
  }

  /**
   * Check for causal relationship markers (more restrictive)
   */
  private hasCausalMarkers(contentA: string, contentB: string): boolean {
    // More specific causal phrases to reduce false positives
    const causalPhrases = [
      'because', 'therefore', 'as a result', 'leads to', 'causes', 'due to',
      'consequently', 'hence', 'thus', 'results in', 'triggered by',
      'responsible for', 'brings about', 'stems from'
    ];
    const combined = (contentA + ' ' + contentB).toLowerCase();
    
    // Require strong causal language OR multiple weaker indicators
    const strongCausal = ['therefore', 'as a result', 'leads to', 'results in', 'responsible for', 'brings about'];
    const matches = causalPhrases.filter(phrase => combined.includes(phrase));
    
    return matches.some(match => strongCausal.includes(match)) || matches.length >= 2;
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
   * Analyze path structure for relationship hints
   */
  private analyzePathStructure(path: string): {
    isTemplate: boolean;
    isHierarchical: boolean;
    category: string | null;
  } {
    const pathLower = path.toLowerCase();
    const pathParts = path.split('/');
    
    return {
      isTemplate: pathLower.includes('template') || pathLower.includes('tmpl') || pathLower.endsWith('.template.md'),
      isHierarchical: pathParts.length > 2 || pathLower.includes('parent') || pathLower.includes('child'),
      category: pathParts.length > 1 ? pathParts[pathParts.length - 2] : null
    };
  }

  /**
   * Analyze content type for relationship context
   */
  private analyzeContentType(content: string): {
    isDefinition: boolean;
    isProcess: boolean;
    isExample: boolean;
    isQuestion: boolean;
    length: 'short' | 'medium' | 'long';
  } {
    const contentLower = content.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    return {
      isDefinition: contentLower.includes('define') || contentLower.includes('definition') || 
                   contentLower.includes('is a') || contentLower.includes('refers to'),
      isProcess: contentLower.includes('step') || contentLower.includes('process') || 
                contentLower.includes('method') || contentLower.includes('procedure'),
      isExample: contentLower.includes('example') || contentLower.includes('for instance') || 
                contentLower.includes('such as'),
      isQuestion: contentLower.includes('?') || contentLower.includes('how') || 
                 contentLower.includes('what') || contentLower.includes('why'),
      length: wordCount < 100 ? 'short' : wordCount < 500 ? 'medium' : 'long'
    };
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