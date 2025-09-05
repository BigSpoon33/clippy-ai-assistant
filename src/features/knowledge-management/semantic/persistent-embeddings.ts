/**
 * Persistent Embedding Storage - Local file-based embedding persistence
 * Stores embeddings in JSON format without requiring external database
 */

import { App, TFile } from 'obsidian';
import { ContentEmbedding } from './types';

export interface EmbeddingCacheEntry {
  embedding: ContentEmbedding;
  fileSize: number;
  lastModified: number;
  version: string;
}

export interface EmbeddingCacheIndex {
  version: string;
  createdAt: number;
  lastUpdated: number;
  totalEmbeddings: number;
  modelCounts: Record<string, number>;
  entries: Record<string, EmbeddingCacheEntry>; // contentHash -> entry
}

export class PersistentEmbeddingStorage {
  private app: App;
  private pluginDataPath: string;
  private cacheIndex: EmbeddingCacheIndex | null = null;
  private isLoaded = false;
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_FILE = 'semantic-embeddings.json';
  private readonly MAX_CACHE_SIZE = 10000; // Max embeddings to store

  constructor(app: App, pluginDataPath: string) {
    this.app = app;
    this.pluginDataPath = pluginDataPath;
  }

  /**
   * Initialize and load existing cache
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await this.loadCache();
      console.log(`🔍 PERSIST: Loaded ${this.getTotalEmbeddings()} cached embeddings`);
    } catch (error) {
      console.log('🔍 PERSIST: No existing cache found, creating new one');
      this.createEmptyCache();
    }

    this.isLoaded = true;
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    const cacheFilePath = `${this.pluginDataPath}/${this.CACHE_FILE}`;
    
    try {
      const cacheData = await this.app.vault.adapter.read(cacheFilePath);
      this.cacheIndex = JSON.parse(cacheData) as EmbeddingCacheIndex;
      
      // Version compatibility check
      if (this.cacheIndex.version !== this.CACHE_VERSION) {
        console.log('🔍 PERSIST: Cache version mismatch, recreating cache');
        this.createEmptyCache();
      }
    } catch (error) {
      throw new Error('Cache file not found or corrupted');
    }
  }

  /**
   * Save cache to disk
   */
  private async saveCache(): Promise<void> {
    if (!this.cacheIndex) return;

    const cacheFilePath = `${this.pluginDataPath}/${this.CACHE_FILE}`;
    this.cacheIndex.lastUpdated = Date.now();
    
    try {
      // Ensure the directory exists before writing
      await this.ensureDirectoryExists();
      
      const cacheData = JSON.stringify(this.cacheIndex, null, 2);
      await this.app.vault.adapter.write(cacheFilePath, cacheData);
      console.log(`🔍 PERSIST: Saved cache with ${this.getTotalEmbeddings()} embeddings to ${cacheFilePath}`);
    } catch (error) {
      console.error('🔍 PERSIST: Failed to save cache:', error);
      console.error('🔍 PERSIST: Cache file path:', cacheFilePath);
    }
  }

  /**
   * Create empty cache structure
   */
  private createEmptyCache(): void {
    this.cacheIndex = {
      version: this.CACHE_VERSION,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      totalEmbeddings: 0,
      modelCounts: {},
      entries: {}
    };
  }

  /**
   * Get embedding from persistent cache
   */
  async getEmbedding(contentHash: string, file?: TFile): Promise<ContentEmbedding | null> {
    if (!this.cacheIndex) return null;

    const entry = this.cacheIndex.entries[contentHash];
    if (!entry) return null;

    // Validate cache entry if file is provided
    if (file) {
      const isValid = await this.isValidCacheEntry(entry, file);
      if (!isValid) {
        this.removeEmbedding(contentHash);
        return null;
      }
    }

    console.log(`🔍 PERSIST: Cache hit for ${contentHash.substring(0, 8)}...`);
    return entry.embedding;
  }

  /**
   * Store embedding in persistent cache
   */
  async storeEmbedding(
    contentHash: string, 
    embedding: ContentEmbedding, 
    file?: TFile
  ): Promise<void> {
    if (!this.cacheIndex) return;

    // Check cache size limit
    if (this.getTotalEmbeddings() >= this.MAX_CACHE_SIZE) {
      await this.pruneCache();
    }

    const entry: EmbeddingCacheEntry = {
      embedding,
      fileSize: file?.stat.size || 0,
      lastModified: file?.stat.mtime || Date.now(),
      version: this.CACHE_VERSION
    };

    // Update index
    const wasNew = !this.cacheIndex.entries[contentHash];
    this.cacheIndex.entries[contentHash] = entry;

    if (wasNew) {
      this.cacheIndex.totalEmbeddings++;
      const model = embedding.model;
      this.cacheIndex.modelCounts[model] = (this.cacheIndex.modelCounts[model] || 0) + 1;
    }

    console.log(`🔍 PERSIST: Stored embedding for ${contentHash.substring(0, 8)}...`);
    
    // Save periodically (every 10 new embeddings)
    if (this.getTotalEmbeddings() % 10 === 0) {
      await this.saveCache();
    }
  }

  /**
   * Remove embedding from cache
   */
  removeEmbedding(contentHash: string): void {
    if (!this.cacheIndex) return;

    const entry = this.cacheIndex.entries[contentHash];
    if (entry) {
      delete this.cacheIndex.entries[contentHash];
      this.cacheIndex.totalEmbeddings--;
      
      const model = entry.embedding.model;
      if (this.cacheIndex.modelCounts[model] > 0) {
        this.cacheIndex.modelCounts[model]--;
      }
    }
  }

  /**
   * Validate if cache entry is still valid for given file
   */
  private async isValidCacheEntry(entry: EmbeddingCacheEntry, file: TFile): Promise<boolean> {
    // Check if file was modified after embedding was created
    if (file.stat.mtime > entry.lastModified) {
      return false;
    }

    // Check if file size changed
    if (file.stat.size !== entry.fileSize) {
      return false;
    }

    return true;
  }

  /**
   * Prune old/unused embeddings to keep cache size manageable
   */
  private async pruneCache(): Promise<void> {
    if (!this.cacheIndex) return;

    console.log('🔍 PERSIST: Pruning cache...');
    
    // Convert entries to array with timestamps for sorting
    const entries = Object.entries(this.cacheIndex.entries)
      .map(([hash, entry]) => ({ hash, entry, age: entry.embedding.timestamp }))
      .sort((a, b) => a.age - b.age); // Oldest first

    // Remove oldest 20% of entries
    const removeCount = Math.floor(entries.length * 0.2);
    const toRemove = entries.slice(0, removeCount);

    toRemove.forEach(({ hash }) => {
      this.removeEmbedding(hash);
    });

    console.log(`🔍 PERSIST: Pruned ${removeCount} old embeddings`);
    await this.saveCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEmbeddings: number;
    modelCounts: Record<string, number>;
    cacheSize: string;
    oldestEmbedding: Date | null;
    newestEmbedding: Date | null;
  } {
    if (!this.cacheIndex) {
      return {
        totalEmbeddings: 0,
        modelCounts: {},
        cacheSize: '0 KB',
        oldestEmbedding: null,
        newestEmbedding: null
      };
    }

    // Find oldest and newest embeddings
    const entries = Object.values(this.cacheIndex.entries);
    let oldest = Number.MAX_SAFE_INTEGER;
    let newest = 0;

    entries.forEach(entry => {
      const timestamp = entry.embedding.timestamp;
      if (timestamp < oldest) oldest = timestamp;
      if (timestamp > newest) newest = timestamp;
    });

    // Estimate cache size (rough calculation)
    const avgEmbeddingSize = 768 * 4 + 200; // 768 dim * 4 bytes + metadata
    const estimatedSize = this.getTotalEmbeddings() * avgEmbeddingSize;
    const sizeKB = Math.round(estimatedSize / 1024);

    return {
      totalEmbeddings: this.getTotalEmbeddings(),
      modelCounts: { ...this.cacheIndex.modelCounts },
      cacheSize: `${sizeKB} KB`,
      oldestEmbedding: oldest === Number.MAX_SAFE_INTEGER ? null : new Date(oldest),
      newestEmbedding: newest === 0 ? null : new Date(newest)
    };
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    this.createEmptyCache();
    await this.saveCache();
    console.log('🔍 PERSIST: Cache cleared');
  }

  /**
   * Force save current cache state
   */
  async forceSave(): Promise<void> {
    await this.saveCache();
  }

  /**
   * Get total number of cached embeddings
   */
  private getTotalEmbeddings(): number {
    return this.cacheIndex?.totalEmbeddings || 0;
  }

  /**
   * Get embeddings for specific model
   */
  getEmbeddingsByModel(modelName: string): ContentEmbedding[] {
    if (!this.cacheIndex) return [];

    return Object.values(this.cacheIndex.entries)
      .filter(entry => entry.embedding.model === modelName)
      .map(entry => entry.embedding);
  }

  /**
   * Check if cache is loaded and ready
   */
  isReady(): boolean {
    return this.isLoaded && this.cacheIndex !== null;
  }

  /**
   * Validate cache against current vault state
   */
  async validateCache(): Promise<{
    totalEntries: number;
    validEntries: number;
    staleEntries: number;
    missingFiles: string[];
    outdatedEntries: string[];
  }> {
    if (!this.cacheIndex) {
      return { totalEntries: 0, validEntries: 0, staleEntries: 0, missingFiles: [], outdatedEntries: [] };
    }

    const allFiles = this.app.vault.getMarkdownFiles();
    const existingPaths = new Set(allFiles.map(f => f.path));
    
    let validEntries = 0;
    let staleEntries = 0;
    const missingFiles: string[] = [];
    const outdatedEntries: string[] = [];

    for (const [filePath, entry] of Object.entries(this.cacheIndex.entries)) {
      if (!existingPaths.has(filePath)) {
        // File no longer exists
        staleEntries++;
        missingFiles.push(filePath);
      } else {
        // Check if file has been modified since embedding was created
        const file = allFiles.find(f => f.path === filePath);
        if (file && file.stat.mtime > entry.embedding.timestamp) {
          staleEntries++;
          outdatedEntries.push(filePath);
        } else {
          validEntries++;
        }
      }
    }

    return {
      totalEntries: Object.keys(this.cacheIndex.entries).length,
      validEntries,
      staleEntries,
      missingFiles,
      outdatedEntries
    };
  }

  /**
   * Clean stale entries from cache
   */
  async cleanStaleEntries(): Promise<number> {
    if (!this.cacheIndex) return 0;

    const validation = await this.validateCache();
    let cleaned = 0;

    // Remove entries for files that no longer exist
    for (const missingFile of validation.missingFiles) {
      if (this.cacheIndex.entries[missingFile]) {
        delete this.cacheIndex.entries[missingFile];
        cleaned++;
      }
    }

    // Remove outdated entries
    for (const outdatedFile of validation.outdatedEntries) {
      if (this.cacheIndex.entries[outdatedFile]) {
        delete this.cacheIndex.entries[outdatedFile];
        cleaned++;
      }
    }

    // Update totals
    this.recalculateTotals();

    if (cleaned > 0) {
      await this.saveCache();
      console.log(`🔍 PERSIST: Cleaned ${cleaned} stale cache entries`);
    }

    return cleaned;
  }

  /**
   * Recalculate total embeddings and model counts from current entries
   */
  private recalculateTotals(): void {
    if (!this.cacheIndex) return;

    // Recalculate totals from scratch
    this.cacheIndex.totalEmbeddings = Object.keys(this.cacheIndex.entries).length;
    this.cacheIndex.modelCounts = {};

    // Count models
    Object.values(this.cacheIndex.entries).forEach(entry => {
      const model = entry.embedding.model;
      this.cacheIndex!.modelCounts[model] = (this.cacheIndex!.modelCounts[model] || 0) + 1;
    });
  }

  /**
   * Ensure the plugin data directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      // Check if directory exists
      const exists = await this.app.vault.adapter.exists(this.pluginDataPath);
      if (!exists) {
        // Create the directory
        await this.app.vault.adapter.mkdir(this.pluginDataPath);
        console.log(`🔍 PERSIST: Created plugin data directory: ${this.pluginDataPath}`);
      }
    } catch (error) {
      console.error('🔍 PERSIST: Failed to create plugin data directory:', error);
      throw new Error(`Failed to create plugin data directory: ${error.message}`);
    }
  }
}