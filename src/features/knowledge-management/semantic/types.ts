/**
 * Semantic Search Types - Shared interfaces and types
 * Centralized location to prevent circular imports
 */

export interface ContentEmbedding {
  vector: number[];
  model: string;
  timestamp: number;
  contentHash: string; // For cache invalidation
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  isLocal: boolean;
  maxTokens: number;
}

export interface EmbeddingOptions {
  model?: string;
  useCache?: boolean;
  priority?: 'speed' | 'accuracy';
  file?: any; // TFile type from Obsidian
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

export interface SimilarityResult {
  noteA: string;
  noteB: string;
  similarity: number;
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
  // New fields for chunk citation and transparency
  sourceChunk?: string;        // The chunk from source that was analyzed
  targetChunk?: string;        // The chunk from target that was analyzed
  matchingConcepts?: string[]; // Key concepts that contributed to the match
  chunkStartPos?: number;      // Position in original document where chunk starts
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