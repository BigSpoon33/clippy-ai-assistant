/**
 * RAG Architecture for Research System
 * Provides semantic search, quality grading, and content extraction
 */

import { EmbeddingManager, ContentEmbedding } from '../semantic/embedding-manager';
import { SimilarityEngine, NoteContent } from '../semantic/similarity-engine';
import { QualityRater } from '../research/quality-rater';

export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    title: string;
    source: string;
    sourceType: 'web' | 'vault' | 'pdf' | 'document';
    url?: string;
    lastUpdated?: Date;
    qualityScore: number;
    relevanceScore: number;
    extractedAt: Date;
  };
  embedding?: ContentEmbedding;
  chunks?: RAGChunk[];
}

export interface RAGChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  embedding?: ContentEmbedding;
  parentDocumentId: string;
}

export interface RAGQuery {
  text: string;
  maxResults?: number;
  minRelevance?: number;
  sourceTypes?: string[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface RAGResult {
  document: RAGDocument;
  chunk?: RAGChunk;
  relevanceScore: number;
  qualityScore: number;
  combinedScore: number;
  reason: string;
}

export interface RAGContext {
  query: string;
  results: RAGResult[];
  totalDocuments: number;
  searchTime: number;
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Core RAG system orchestrating semantic search and quality assessment
 */
export class RAGSystem {
  private embeddingManager: EmbeddingManager;
  private similarityEngine: SimilarityEngine;
  private qualityRater: QualityRater;
  private documents: Map<string, RAGDocument> = new Map();
  private chunks: Map<string, RAGChunk> = new Map();
  
  constructor(
    embeddingManager: EmbeddingManager,
    similarityEngine: SimilarityEngine,
    qualityRater: QualityRater
  ) {
    this.embeddingManager = embeddingManager;
    this.similarityEngine = similarityEngine;
    this.qualityRater = qualityRater;
  }

  /**
   * Add documents to RAG system with automatic chunking and embedding
   */
  async addDocuments(documents: Omit<RAGDocument, 'embedding' | 'chunks'>[]): Promise<void> {
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  /**
   * Add single document with processing
   */
  async addDocument(document: Omit<RAGDocument, 'embedding' | 'chunks'>): Promise<void> {
    // Generate embedding for full document
    const embedding = await this.embeddingManager.generateEmbedding(document.content);
    
    // Create chunks for long documents
    const chunks = this.createSmartChunks(document.content, document.id);
    
    // Generate embeddings for chunks
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => ({
        ...chunk,
        embedding: await this.embeddingManager.generateEmbedding(chunk.content)
      }))
    );

    const fullDocument: RAGDocument = {
      ...document,
      embedding,
      chunks: chunksWithEmbeddings
    };

    // Store document and chunks
    this.documents.set(document.id, fullDocument);
    chunksWithEmbeddings.forEach(chunk => {
      this.chunks.set(chunk.id, chunk);
    });
  }

  /**
   * Semantic search with quality-weighted ranking
   */
  async search(query: RAGQuery): Promise<RAGContext> {
    const startTime = Date.now();
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingManager.generateEmbedding(query.text);
    
    const results: RAGResult[] = [];
    const qualityDistribution = { high: 0, medium: 0, low: 0 };

    // Search through documents and chunks
    for (const document of this.documents.values()) {
      // Skip if source type filter doesn't match
      if (query.sourceTypes && !query.sourceTypes.includes(document.metadata.sourceType)) {
        continue;
      }

      // Skip if outside time range
      if (query.timeRange) {
        const docDate = document.metadata.lastUpdated || document.metadata.extractedAt;
        if (query.timeRange.start && docDate < query.timeRange.start) continue;
        if (query.timeRange.end && docDate > query.timeRange.end) continue;
      }

      // Calculate document-level relevance
      if (document.embedding) {
        const docRelevance = this.embeddingManager.calculateSimilarity(queryEmbedding, document.embedding);
        
        if (docRelevance >= (query.minRelevance || 0.3)) {
          const combinedScore = this.calculateCombinedScore(docRelevance, document.metadata.qualityScore);
          
          results.push({
            document,
            relevanceScore: docRelevance,
            qualityScore: document.metadata.qualityScore,
            combinedScore,
            reason: `Document-level match (${Math.round(docRelevance * 100)}% relevance, ${Math.round(document.metadata.qualityScore * 100)}% quality)`
          });

          this.updateQualityDistribution(qualityDistribution, document.metadata.qualityScore);
        }
      }

      // Search chunks for more granular matches
      if (document.chunks) {
        for (const chunk of document.chunks) {
          if (chunk.embedding) {
            const chunkRelevance = this.embeddingManager.calculateSimilarity(queryEmbedding, chunk.embedding);
            
            if (chunkRelevance >= (query.minRelevance || 0.3)) {
              const combinedScore = this.calculateCombinedScore(chunkRelevance, document.metadata.qualityScore);
              
              results.push({
                document,
                chunk,
                relevanceScore: chunkRelevance,
                qualityScore: document.metadata.qualityScore,
                combinedScore,
                reason: `Chunk match (${Math.round(chunkRelevance * 100)}% relevance, ${Math.round(document.metadata.qualityScore * 100)}% quality)`
              });
            }
          }
        }
      }
    }

    // Sort by combined score and limit results
    results.sort((a, b) => b.combinedScore - a.combinedScore);
    const limitedResults = results.slice(0, query.maxResults || 10);

    const searchTime = Date.now() - startTime;

    return {
      query: query.text,
      results: limitedResults,
      totalDocuments: this.documents.size,
      searchTime,
      qualityDistribution
    };
  }

  /**
   * Get contextual information for AI response generation
   */
  async getContextForPrompt(query: string, maxTokens: number = 4000): Promise<string> {
    const searchResult = await this.search({
      text: query,
      maxResults: 10,
      minRelevance: 0.4
    });

    let context = `# Research Context\n\n`;
    let currentTokens = context.length;

    for (const result of searchResult.results) {
      const sourceInfo = `## ${result.document.metadata.title} (${result.document.metadata.sourceType})\n`;
      const qualityInfo = `Quality: ${Math.round(result.qualityScore * 100)}%, Relevance: ${Math.round(result.relevanceScore * 100)}%\n`;
      const content = result.chunk ? result.chunk.content : result.document.content.slice(0, 500);
      const section = `${sourceInfo}${qualityInfo}${content}\n\n`;

      if (currentTokens + section.length > maxTokens) {
        break;
      }

      context += section;
      currentTokens += section.length;
    }

    return context;
  }

  /**
   * Smart chunking that preserves semantic boundaries
   */
  private createSmartChunks(content: string, documentId: string): RAGChunk[] {
    const chunks: RAGChunk[] = [];
    const maxChunkSize = 1000; // characters
    const overlap = 100; // character overlap between chunks

    // Split by paragraphs first
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          id: `${documentId}_chunk_${chunkIndex}`,
          content: currentChunk.trim(),
          startIndex: currentStart,
          endIndex: currentStart + currentChunk.length,
          parentDocumentId: documentId
        });

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
        currentStart = currentStart + currentChunk.length - overlap;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        startIndex: currentStart,
        endIndex: currentStart + currentChunk.length,
        parentDocumentId: documentId
      });
    }

    // If no chunks created (very short content), create one chunk
    if (chunks.length === 0) {
      chunks.push({
        id: `${documentId}_chunk_0`,
        content: content,
        startIndex: 0,
        endIndex: content.length,
        parentDocumentId: documentId
      });
    }

    return chunks;
  }

  /**
   * Calculate combined relevance and quality score
   */
  private calculateCombinedScore(relevance: number, quality: number): number {
    // Weighted combination: 60% relevance, 40% quality
    return (relevance * 0.6) + (quality * 0.4);
  }

  /**
   * Update quality distribution statistics
   */
  private updateQualityDistribution(
    distribution: { high: number; medium: number; low: number },
    qualityScore: number
  ): void {
    if (qualityScore >= 0.8) {
      distribution.high++;
    } else if (qualityScore >= 0.5) {
      distribution.medium++;
    } else {
      distribution.low++;
    }
  }

  /**
   * Remove document from RAG system
   */
  removeDocument(documentId: string): void {
    const document = this.documents.get(documentId);
    if (document && document.chunks) {
      // Remove all chunks
      document.chunks.forEach(chunk => {
        this.chunks.delete(chunk.id);
      });
    }
    this.documents.delete(documentId);
  }

  /**
   * Update document quality score
   */
  async updateDocumentQuality(documentId: string, newQualityScore: number): Promise<void> {
    const document = this.documents.get(documentId);
    if (document) {
      document.metadata.qualityScore = newQualityScore;
      this.documents.set(documentId, document);
    }
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalDocuments: number;
    totalChunks: number;
    averageQuality: number;
    sourceTypeDistribution: Record<string, number>;
  } {
    const documents = Array.from(this.documents.values());
    const sourceTypes: Record<string, number> = {};

    let totalQuality = 0;
    for (const doc of documents) {
      totalQuality += doc.metadata.qualityScore;
      sourceTypes[doc.metadata.sourceType] = (sourceTypes[doc.metadata.sourceType] || 0) + 1;
    }

    return {
      totalDocuments: documents.length,
      totalChunks: this.chunks.size,
      averageQuality: documents.length > 0 ? totalQuality / documents.length : 0,
      sourceTypeDistribution: sourceTypes
    };
  }

  /**
   * Clear all documents and chunks
   */
  clear(): void {
    this.documents.clear();
    this.chunks.clear();
  }
}