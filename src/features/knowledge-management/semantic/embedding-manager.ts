/**
 * Embedding Manager - Core semantic understanding engine
 * Handles text-to-vector conversion using local and cloud-based models
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
}

export class EmbeddingManager {
  private cache: Map<string, ContentEmbedding> = new Map();
  private availableModels: Map<string, EmbeddingModel> = new Map();
  private defaultModel: string = 'ollama-nomic';
  private ollamaUrl: string = 'http://localhost:11434';
  private settings: any;
  
  constructor(ollamaUrl?: string, settings?: any) {
    if (ollamaUrl) {
      this.ollamaUrl = ollamaUrl;
    }
    this.settings = settings;
    // Update URL from centralized RAG settings if available
    if (settings?.rag?.embeddings?.ollamaUrl) {
      this.ollamaUrl = settings.rag.embeddings.ollamaUrl;
    }
    this.initializeModels();
  }

  /**
   * Initialize available embedding models
   */
  private initializeModels(): void {
    // Ollama embedding models
    this.availableModels.set('ollama-nomic', {
      name: 'nomic-embed-text',
      dimensions: 768,
      isLocal: true,
      maxTokens: 2048
    });

    this.availableModels.set('ollama-mxbai', {
      name: 'mxbai-embed-large',
      dimensions: 1024,
      isLocal: true,
      maxTokens: 512
    });

    // Cloud models (opt-in)
    this.availableModels.set('openai-ada', {
      name: 'text-embedding-ada-002',
      dimensions: 1536,
      isLocal: false,
      maxTokens: 8191
    });

    this.availableModels.set('openai-3-small', {
      name: 'text-embedding-3-small',
      dimensions: 1536,
      isLocal: false,
      maxTokens: 8191
    });
  }

  /**
   * Generate embedding for text content
   */
  async generateEmbedding(
    content: string, 
    options: EmbeddingOptions = {}
  ): Promise<ContentEmbedding> {
    // Use settings for model selection if available
    const settingsModel = this.settings?.research?.embeddings?.model;
    const modelName = options.model || settingsModel || this.defaultModel;
    const model = this.availableModels.get(modelName);
    
    if (!model) {
      throw new Error(`Embedding model '${modelName}' not available`);
    }

    // Generate content hash for caching
    const contentHash = this.generateContentHash(content);
    
    // Check cache first (respect settings)
    const useCache = options.useCache !== false && 
                    (this.settings?.rag?.embeddings?.enableCache !== false);
    if (useCache) {
      const cached = this.cache.get(contentHash);
      if (cached && cached.model === modelName) {
        console.log(`🔍 CACHE: Hit for content hash ${contentHash.substring(0, 8)}...`);
        return cached;
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
      this.cache.set(contentHash, embedding);
      console.log(`🔍 CACHE: Stored embedding for ${contentHash.substring(0, 8)}... (cache size: ${this.cache.size})`);
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
      console.warn(`Ollama embedding failed for model ${modelName}, falling back to simple embedding:`, error);
      // Fallback to simple embedding if Ollama fails
      const model = Array.from(this.availableModels.values()).find(m => m.name === modelName);
      return this.simpleWordEmbedding(content, model?.dimensions || 768);
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

    // Truncate to max tokens (rough approximation: 1 token ≈ 4 characters)
    const maxChars = maxTokens * 4;
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars).trim();
      // Try to end at sentence boundary
      const lastSentence = processed.lastIndexOf('.');
      if (lastSentence > maxChars * 0.8) {
        processed = processed.substring(0, lastSentence + 1);
      }
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
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; models: string[] } {
    const models = Array.from(new Set(
      Array.from(this.cache.values()).map(e => e.model)
    ));
    
    return {
      size: this.cache.size,
      models
    };
  }
}