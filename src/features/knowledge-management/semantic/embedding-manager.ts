/**
 * Embedding Manager - Core semantic understanding engine
 * Handles text-to-vector conversion using local and cloud-based models
 * Now with persistent storage support
 */

import { App, TFile } from 'obsidian';
import { PersistentEmbeddingStorage } from './persistent-embeddings';
import { ContentEmbedding, EmbeddingModel, EmbeddingOptions } from './types';

export class EmbeddingManager {
  private cache: Map<string, ContentEmbedding> = new Map();
  private availableModels: Map<string, EmbeddingModel> = new Map();
  private defaultModel: string = 'ollama-nomic';
  private ollamaUrl: string = 'http://localhost:11434';
  private settings: any;
  public persistentStorage: PersistentEmbeddingStorage | null = null;
  private app: App | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  
  constructor(ollamaUrl?: string, settings?: any, app?: App, pluginDataPath?: string) {
    if (ollamaUrl) {
      this.ollamaUrl = ollamaUrl;
    }
    this.settings = settings;
    this.app = app || null;
    
    // Initialize persistent storage if app and path provided
    if (app && pluginDataPath) {
      this.persistentStorage = new PersistentEmbeddingStorage(app, pluginDataPath);
    }
    
    // Update URL from centralized RAG settings if available
    if (settings?.rag?.embeddings?.ollamaUrl) {
      this.ollamaUrl = settings.rag.embeddings.ollamaUrl;
    }
    // Don't await here, let initialize() handle it
  }

  /**
   * Initialize persistent storage and models
   */
  async initialize(): Promise<void> {
    if (this.persistentStorage) {
      await this.persistentStorage.initialize();
      console.log('🔍 EMBED: Persistent storage initialized');
    }
    
    // Initialize models with dynamic detection
    await this.initializeModels();
    console.log('🔍 EMBED: Models initialized');
    
    // Start auto-save timer (save every 5 minutes if there are changes)
    this.startAutoSave();
  }

  /**
   * Initialize available embedding models with dynamic Ollama model detection
   */
  private async initializeModels(): Promise<void> {
    // Add default/fallback models
    this.availableModels.set('nomic-embed-text', {
      name: 'nomic-embed-text',
      dimensions: 768,
      isLocal: true,
      maxTokens: 2048
    });

    this.availableModels.set('mxbai-embed-large', {
      name: 'mxbai-embed-large',
      dimensions: 1024,
      isLocal: true,
      maxTokens: 512
    });

    // Cloud models (opt-in)
    this.availableModels.set('text-embedding-ada-002', {
      name: 'text-embedding-ada-002',
      dimensions: 1536,
      isLocal: false,
      maxTokens: 8191
    });

    this.availableModels.set('text-embedding-3-small', {
      name: 'text-embedding-3-small',
      dimensions: 1536,
      isLocal: false,
      maxTokens: 8191
    });

    // Dynamically detect Ollama embedding models
    await this.detectOllamaEmbeddingModels();
  }

  /**
   * Detect and register available Ollama embedding models
   */
  private async detectOllamaEmbeddingModels(): Promise<void> {
    try {
      console.log('🔍 EMBED: Detecting Ollama embedding models...');
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      
      if (!response.ok) {
        console.warn('🔍 EMBED: Could not fetch Ollama models, using defaults');
        return;
      }

      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        for (const model of data.models) {
          const modelName = model.name;
          const nameLower = modelName.toLowerCase();
          
          // Check if this looks like an embedding model
          const isEmbeddingModel = nameLower.includes('embed') || 
                                 nameLower.includes('qwen') ||
                                 nameLower.includes('bge') ||
                                 nameLower.includes('gte') ||
                                 nameLower.includes('e5');
          
          if (isEmbeddingModel) {
            const embeddingModel = this.inferModelSpecs(modelName);
            this.availableModels.set(modelName, embeddingModel);
            console.log('🔍 EMBED: Registered Ollama model:', modelName, embeddingModel);
          }
        }
      }
    } catch (error) {
      console.warn('🔍 EMBED: Failed to detect Ollama models:', error);
    }
  }

  /**
   * Infer model specifications from model name
   */
  private inferModelSpecs(modelName: string): EmbeddingModel {
    const nameLower = modelName.toLowerCase();
    let dimensions = 768; // Default
    let maxTokens = 2048; // Default
    
    // Check if user has overridden dimensions in settings
    const userDimensions = this.settings?.rag?.embeddings?.dimensions;
    const userMaxTokens = this.settings?.rag?.embeddings?.maxTokens;
    
    // Infer dimensions from model name patterns (only if not overridden by user)
    if (!userDimensions) {
      if (nameLower.includes('large') || nameLower.includes('1024')) {
        dimensions = 1024;
      } else if (nameLower.includes('small') || nameLower.includes('384')) {
        dimensions = 384;
      } else if (nameLower.includes('base') || nameLower.includes('768')) {
        dimensions = 768;
      } else if (nameLower.includes('qwen')) {
        dimensions = 1536; // Qwen3 embedding dimension
      } else if (nameLower.includes('bge-large')) {
        dimensions = 1024;
      } else if (nameLower.includes('bge-base')) {
        dimensions = 768;
      }
    } else {
      dimensions = userDimensions;
    }
    
    // Infer token limits from model patterns (only if not overridden by user)
    if (!userMaxTokens) {
      if (nameLower.includes('qwen')) {
        maxTokens = 32768; // Qwen3 supports 32K context
      } else if (nameLower.includes('mxbai-embed-large')) {
        maxTokens = 512;
      } else if (nameLower.includes('nomic-embed')) {
        maxTokens = 2048;
      } else if (nameLower.includes('bge')) {
        maxTokens = 512;
      } else if (nameLower.includes('e5')) {
        maxTokens = 512;
      }
    } else {
      maxTokens = userMaxTokens;
    }
    
    return {
      name: modelName,
      dimensions,
      isLocal: true,
      maxTokens
    };
  }

  /**
   * Generate embedding for text content with persistent storage support
   */
  async generateEmbedding(
    content: string, 
    options: EmbeddingOptions & { file?: TFile } = {}
  ): Promise<ContentEmbedding> {
    // Use settings for model selection - check both RAG settings and research settings
    const ragModel = this.settings?.rag?.embeddings?.model;
    const researchModel = this.settings?.research?.embeddings?.model;
    const modelName = options.model || ragModel || researchModel || this.defaultModel;
    
    console.log('🔍 EMBED: Using model:', modelName, 'from settings:', {
      rag: ragModel,
      research: researchModel,
      default: this.defaultModel
    });
    let model = this.availableModels.get(modelName);
    
    if (!model) {
      console.log(`🔍 EMBED: Model '${modelName}' not in registry, attempting to infer specs and register...`);
      
      // Try to infer model specs and register it
      model = this.inferModelSpecs(modelName);
      this.availableModels.set(modelName, model);
      
      console.log('🔍 EMBED: Registered unknown model:', modelName, model);
    }

    // Generate content hash for caching
    const contentHash = this.generateContentHash(content);
    
    // Check cache first (respect settings)
    const useCache = options.useCache !== false && 
                    (this.settings?.rag?.embeddings?.enableCache !== false);
    
    if (useCache) {
      // Check in-memory cache first
      const memCached = this.cache.get(contentHash);
      if (memCached && memCached.model === modelName) {
        console.log(`🔍 CACHE: Memory hit for content hash ${contentHash.substring(0, 8)}...`);
        return memCached;
      }

      // Check persistent storage
      if (this.persistentStorage && this.persistentStorage.isReady()) {
        const persistentCached = await this.persistentStorage.getEmbedding(contentHash, options.file);
        if (persistentCached && persistentCached.model === modelName) {
          // Load into memory cache for faster access
          this.cache.set(contentHash, persistentCached);
          return persistentCached;
        }
      }
    }

    // Check cache size limit
    const maxCacheSize = this.settings?.rag?.embeddings?.cacheSize || 1000;
    if (this.cache.size >= maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Generate new embedding
    const vector = await this.computeEmbedding(content, model);
    
    const embedding: ContentEmbedding = {
      vector,
      model: modelName,
      timestamp: Date.now(),
      contentHash
    };

    // Cache the result
    if (useCache) {
      // Store in memory cache
      this.cache.set(contentHash, embedding);
      
      // Store in persistent cache
      if (this.persistentStorage && this.persistentStorage.isReady()) {
        await this.persistentStorage.storeEmbedding(contentHash, embedding, options.file);
      }
      
      console.log(`🔍 CACHE: Stored embedding for ${contentHash.substring(0, 8)}... (memory: ${this.cache.size}, persistent: ${this.persistentStorage?.getCacheStats().totalEmbeddings || 0})`);
    }
    return embedding;
  }

  /**
   * Compute embedding using specified model
   */
  private async computeEmbedding(content: string, model: EmbeddingModel): Promise<number[]> {
    // Preprocess content
    const processedContent = this.preprocessContent(content, model.maxTokens);
    
    if (model.isLocal) {
      return this.computeLocalEmbedding(processedContent, model);
    } else {
      return this.computeCloudEmbedding(processedContent, model);
    }
  }

  /**
   * Local embedding computation via Ollama
   */
  private async computeLocalEmbedding(content: string, model: EmbeddingModel): Promise<number[]> {
    if (model.name.startsWith('nomic-embed') || model.name.startsWith('mxbai-embed')) {
      return this.computeOllamaEmbedding(content, model.name);
    } else {
      // Fallback to simple embedding for other local models
      return this.simpleWordEmbedding(content, model.dimensions);
    }
  }

  /**
   * Compute embeddings using Ollama
   */
  private async computeOllamaEmbedding(content: string, modelName: string): Promise<number[]> {
    try {
      // Use the correct Ollama embedding endpoint: /api/embed
      const requestBody = {
        model: modelName,
        input: content  // Use 'input' instead of 'prompt' for the new API
      };
      
      console.log('🔍 OLLAMA DEBUG: Sending request to', `${this.ollamaUrl}/api/embed`);
      console.log('🔍 OLLAMA DEBUG: Request body:', JSON.stringify(requestBody, null, 2));
      console.log('🔍 OLLAMA DEBUG: Content preview:', content.substring(0, 200) + '...');
      
      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🔍 OLLAMA DEBUG: Response data:', JSON.stringify(data, null, 2));
      
      // Ollama returns 'embeddings' (plural) as array of arrays, we need the first one
      if (data.embeddings && Array.isArray(data.embeddings) && data.embeddings.length > 0) {
        return data.embeddings[0]; // Get the first (and usually only) embedding
      }
      
      // Fallback: check for 'embedding' (singular) format
      if (data.embedding && Array.isArray(data.embedding)) {
        return data.embedding;
      }
      
      console.error('🔍 OLLAMA DEBUG: Invalid response format. Expected embeddings array, got:', data);
      throw new Error('Invalid embedding response from Ollama');
    } catch (error) {
      console.error(`🔍 OLLAMA ERROR: Embedding failed for model ${modelName}, falling back to simple embedding:`, error);
      console.error(`🔍 FALLBACK WARNING: Using hash-based embeddings instead of AI embeddings`);
      console.error(`🔍 FALLBACK WARNING: This will cause artificially high similarity scores (90%+)`);
      console.error(`🔍 FALLBACK WARNING: Check Ollama connection and model availability`);
      
      // Fallback to simple embedding if Ollama fails
      const model = Array.from(this.availableModels.values()).find(m => m.name === modelName);
      const fallbackEmbedding = this.simpleWordEmbedding(content, model?.dimensions || 768);
      
      console.warn(`🔍 FALLBACK: Generated ${fallbackEmbedding.length}D hash-based embedding instead of AI embedding`);
      return fallbackEmbedding;
    }
  }

  /**
   * Cloud embedding computation (via existing AI providers)
   */
  private async computeCloudEmbedding(content: string, model: EmbeddingModel): Promise<number[]> {
    // This would integrate with existing OpenAI/Anthropic clients
    // For now, placeholder implementation
    throw new Error('Cloud embeddings not yet implemented - use local models');
  }

  /**
   * Simple word-based embedding (placeholder implementation)
   * TODO: Replace with actual transformer model
   */
  private simpleWordEmbedding(content: string, dimensions: number): number[] {
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const vector = new Array(dimensions).fill(0);
    
    // Simple hash-based approach for demo
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < dimensions; i++) {
        vector[i] += Math.sin(hash + i) * Math.cos(index + i);
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * Preprocess content for embedding
   */
  private preprocessContent(content: string, maxTokens: number): string {
    // Remove Obsidian-specific syntax while preserving meaning
    let processed = content
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert [[wikilinks]] to text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove image syntax, keep alt text
      .replace(/```[\s\S]*?```/g, 'code block') // Replace code blocks with placeholder
      .replace(/^#+\s+/gm, '') // Remove heading markers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();

    // Use settings chunk size if available, otherwise fall back to model max tokens
    const chunkSize = this.settings?.rag?.embeddings?.chunkSize || this.settings?.rag?.chunking?.chunkSize;
    const effectiveMaxTokens = chunkSize || maxTokens;
    
    console.log(`🔍 EMBED: Using chunk size: ${effectiveMaxTokens} tokens (from ${chunkSize ? 'settings' : 'model limit'})`);

    // Truncate to max tokens (rough approximation: 1 token ≈ 4 characters)
    const maxChars = effectiveMaxTokens * 4;
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars).trim();
      // Try to end at sentence boundary
      const lastSentence = processed.lastIndexOf('.');
      if (lastSentence > maxChars * 0.8) {
        processed = processed.substring(0, lastSentence + 1);
      }
      console.log(`🔍 EMBED: Content truncated from ${content.length} to ${processed.length} chars (${Math.round(processed.length/4)} tokens)`);
    }

    return processed;
  }

  /**
   * Generate content hash for caching
   */
  private generateContentHash(content: string): string {
    return this.simpleHash(content).toString(36);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embeddingA: ContentEmbedding, embeddingB: ContentEmbedding): number {
    if (embeddingA.vector.length !== embeddingB.vector.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    const vectorA = embeddingA.vector;
    const vectorB = embeddingB.vector;

    // Dot product
    let dotProduct = 0;
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
    }

    // Magnitudes (should be 1 for normalized vectors, but calculate anyway)
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get available models
   */
  getAvailableModels(): EmbeddingModel[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * Set default model
   */
  setDefaultModel(modelName: string): void {
    if (!this.availableModels.has(modelName)) {
      throw new Error(`Model '${modelName}' not available`);
    }
    this.defaultModel = modelName;
  }

  /**
   * Clear embedding cache (both memory and persistent)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    if (this.persistentStorage && this.persistentStorage.isReady()) {
      await this.persistentStorage.clearCache();
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): { 
    memory: { size: number; models: string[] };
    persistent: {
      totalEmbeddings: number;
      modelCounts: Record<string, number>;
      cacheSize: string;
      oldestEmbedding: Date | null;
      newestEmbedding: Date | null;
    } | null;
  } {
    const memoryModels = Array.from(new Set(
      Array.from(this.cache.values()).map(e => e.model)
    ));
    
    const persistentStats = this.persistentStorage?.isReady() 
      ? this.persistentStorage.getCacheStats()
      : null;
    
    return {
      memory: {
        size: this.cache.size,
        models: memoryModels
      },
      persistent: persistentStats
    };
  }

  /**
   * Force save persistent cache
   */
  async savePersistentCache(): Promise<void> {
    if (this.persistentStorage && this.persistentStorage.isReady()) {
      await this.persistentStorage.forceSave();
    }
  }

  /**
   * Start auto-save timer for persistent cache
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) return; // Already started
    
    // Auto-save every 5 minutes
    this.autoSaveTimer = setInterval(async () => {
      if (this.persistentStorage && this.persistentStorage.isReady()) {
        try {
          await this.persistentStorage.forceSave();
          console.log('🔍 EMBED: Auto-saved persistent cache');
        } catch (error) {
          console.warn('🔍 EMBED: Auto-save failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoSave();
    await this.savePersistentCache();
  }
}