/**
 * CLIPPY TCG Writer - Note-to-Card Analysis Pipeline
 * Transforms Obsidian notes into collectible TCG cards with intelligent rarity calculation
 * Following PRP specifications for comprehensive note analysis and card generation
 */

import { App, TFile, CachedMetadata } from 'obsidian';
import { TCGCard, TCGSettings, NoteAnalysis, CardRarity, isValidCardRarity } from '../types';
import { SecureTCGRandom } from './rng-system';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== ANALYSIS CONFIGURATION =====

interface AnalysisWeights {
  complexity: number;      // Word count, structure depth
  connectivity: number;    // Backlinks + forward links
  uniqueness: number;      // Unique concepts, vocabulary
  recency: number;         // Creation date, modification frequency
  engagement: number;      // User interaction patterns
}

interface RarityThresholds {
  Common: { min: number; max: number };
  Uncommon: { min: number; max: number };
  Rare: { min: number; max: number };
  Epic: { min: number; max: number };
  Legendary: { min: number; max: number };
}

// ===== CORE ANALYZER CLASS =====

/**
 * Analyzes individual notes and transforms them into TCG cards
 * Uses multiple scoring algorithms to determine card rarity and properties
 */
export class NoteAnalyzer {
  private app: App;
  private settings: TCGSettings;
  private rng: SecureTCGRandom;
  
  // Analysis configuration
  private readonly analysisWeights: AnalysisWeights = {
    complexity: 0.25,    // 25% - Content depth and structure
    connectivity: 0.30,  // 30% - Links and relationships
    uniqueness: 0.20,    // 20% - Novel concepts and vocabulary
    recency: 0.15,       // 15% - Recent activity and freshness
    engagement: 0.10     // 10% - User interaction patterns
  };

  private readonly rarityThresholds: RarityThresholds = {
    Common:    { min: 0.0, max: 0.4 },   // 40% of cards
    Uncommon:  { min: 0.4, max: 0.65 },  // 25% of cards
    Rare:      { min: 0.65, max: 0.85 }, // 20% of cards
    Epic:      { min: 0.85, max: 0.95 }, // 10% of cards
    Legendary: { min: 0.95, max: 1.0 }   // 5% of cards
  };

  constructor(app: App, settings: TCGSettings) {
    this.app = app;
    this.settings = settings;
    this.rng = SecureTCGRandom.getInstance(settings.rngSeed);
    
    console.log('🔍 Note analyzer initialized');
  }

  /**
   * Analyze a note and generate its TCG card representation
   * Main entry point for note-to-card conversion
   */
  async analyzeNote(file: TFile): Promise<TCGCard | null> {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        if (!file || file.extension !== 'md') {
          return null;
        }

        // Get note content and metadata
        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        
        if (!content && !metadata) {
          console.warn(`No content or metadata found for ${file.path}`);
          return null;
        }

        // Perform comprehensive analysis
        const analysis = await this.performNoteAnalysis(file, content, metadata);
        
        // Generate card from analysis
        const card = await this.generateCardFromAnalysis(file, content, analysis);
        
        console.log(`📊 Generated ${card.rarity} card: ${card.name}`);
        return card;
      },
      `Note analysis for ${file.path}`
    );
  }

  /**
   * Perform comprehensive note analysis across all dimensions
   */
  private async performNoteAnalysis(
    file: TFile, 
    content: string, 
    metadata: CachedMetadata | null
  ): Promise<NoteAnalysis> {
    const complexity = this.analyzeComplexity(content, metadata);
    const connectivity = this.analyzeConnectivity(file, metadata);
    const uniqueness = await this.analyzeUniqueness(content, file);
    const recency = this.analyzeRecency(file);
    const engagement = this.analyzeEngagement(file);

    return {
      complexity,
      connectivity,
      uniqueness,
      recency,
      engagement
    };
  }

  /**
   * Analyze note complexity based on content structure and depth
   */
  private analyzeComplexity(content: string, metadata: CachedMetadata | null): number {
    let score = 0;

    // Word count analysis (normalized to 0-1)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const wordScore = Math.min(wordCount / 2000, 1.0); // Max score at 2000 words
    score += wordScore * 0.4;

    // Structural complexity (headings, lists, etc.)
    if (metadata) {
      const headingCount = metadata.headings?.length || 0;
      const listCount = metadata.listItems?.length || 0;
      const sectionCount = metadata.sections?.length || 0;
      
      const structureScore = Math.min((headingCount + listCount * 0.5 + sectionCount * 0.3) / 20, 1.0);
      score += structureScore * 0.3;
    }

    // Content depth indicators
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    const mathBlockCount = (content.match(/\$\$/g) || []).length / 2;
    const embeddedContentCount = (content.match(/!\[\[.*?\]\]/g) || []).length;
    
    const depthScore = Math.min((codeBlockCount + mathBlockCount + embeddedContentCount) / 10, 1.0);
    score += depthScore * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Analyze note connectivity through links and relationships
   */
  private analyzeConnectivity(file: TFile, metadata: CachedMetadata | null): number {
    let score = 0;

    // Outbound links (from this note)
    const outboundLinks = metadata?.links?.length || 0;
    const outboundScore = Math.min(outboundLinks / 20, 1.0); // Max score at 20 links
    score += outboundScore * 0.4;

    // Inbound links (to this note)
    const inboundLinks = Object.keys(this.app.metadataCache.resolvedLinks)
      .reduce((count, sourcePath) => {
        const links = this.app.metadataCache.resolvedLinks[sourcePath];
        return count + (links[file.path] ? links[file.path] : 0);
      }, 0);
    
    const inboundScore = Math.min(inboundLinks / 15, 1.0); // Max score at 15 backlinks
    score += inboundScore * 0.4;

    // Tag connectivity
    const tags = metadata?.tags?.length || 0;
    const tagScore = Math.min(tags / 10, 1.0); // Max score at 10 tags
    score += tagScore * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Analyze note uniqueness through vocabulary and concepts
   */
  private async analyzeUniqueness(content: string, file: TFile): Promise<number> {
    let score = 0;

    // Vocabulary uniqueness
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3); // Ignore short words

    const uniqueWords = new Set(words);
    const vocabularyScore = Math.min(uniqueWords.size / words.length, 1.0);
    score += vocabularyScore * 0.4;

    // Content uniqueness (compared to other notes)
    const contentFingerprint = this.generateContentFingerprint(content);
    const similarityScore = await this.calculateContentSimilarity(contentFingerprint, file);
    const uniquenessScore = 1.0 - similarityScore; // Invert similarity to get uniqueness
    score += uniquenessScore * 0.4;

    // Special content indicators
    const hasCodeBlocks = content.includes('```');
    const hasMathFormulas = content.includes('$$') || content.includes('$');
    const hasImages = content.includes('![');
    const hasEmbeds = content.includes('![[');
    
    const specialContentScore = [hasCodeBlocks, hasMathFormulas, hasImages, hasEmbeds]
      .filter(Boolean).length / 4;
    score += specialContentScore * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Analyze note recency and modification patterns
   */
  private analyzeRecency(file: TFile): number {
    const now = Date.now();
    const creationTime = file.stat.ctime;
    const modificationTime = file.stat.mtime;

    // Creation recency (newer notes get higher scores)
    const daysSinceCreation = (now - creationTime) / (1000 * 60 * 60 * 24);
    const creationScore = Math.exp(-daysSinceCreation / 30); // Decay over 30 days

    // Modification recency
    const daysSinceModification = (now - modificationTime) / (1000 * 60 * 60 * 24);
    const modificationScore = Math.exp(-daysSinceModification / 14); // Decay over 14 days

    // Modification frequency (notes modified multiple times score higher)
    const modificationFrequency = creationTime !== modificationTime ? 1 : 0.5;

    return Math.min((creationScore * 0.4 + modificationScore * 0.4 + modificationFrequency * 0.2), 1.0);
  }

  /**
   * Analyze user engagement with the note
   */
  private analyzeEngagement(file: TFile): number {
    // This is a simplified engagement analysis
    // In a real implementation, this would track user interactions
    let score = 0;

    // File size as proxy for content depth
    const sizeScore = Math.min(file.stat.size / 10000, 1.0); // Max score at 10KB
    score += sizeScore * 0.3;

    // Position in vault (notes in root or special folders might be more important)
    const pathDepth = file.path.split('/').length - 1;
    const pathScore = pathDepth === 0 ? 1.0 : Math.max(0.3, 1.0 - pathDepth * 0.2);
    score += pathScore * 0.2;

    // Extension-based engagement (assume .md files are more engaged with)
    const extensionScore = file.extension === 'md' ? 1.0 : 0.5;
    score += extensionScore * 0.3;

    // Recent access (simplified - would need access tracking in real implementation)
    const recentAccessScore = 0.5; // Placeholder
    score += recentAccessScore * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Generate a content fingerprint for similarity comparison
   */
  private generateContentFingerprint(content: string): string[] {
    // Extract meaningful keywords and phrases
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4) // Only longer words
      .slice(0, 50); // Limit for performance

    return [...new Set(words)]; // Unique words only
  }

  /**
   * Calculate content similarity with other notes in vault
   */
  private async calculateContentSimilarity(fingerprint: string[], currentFile: TFile): Promise<number> {
    const allFiles = this.app.vault.getMarkdownFiles();
    const sampleSize = Math.min(allFiles.length, 20); // Limit comparison for performance
    
    let totalSimilarity = 0;
    let comparisons = 0;

    // Compare with a random sample of other files
    const filesToCompare = this.rng.selectMultipleByWeight(
      allFiles.filter(f => f.path !== currentFile.path),
      allFiles.filter(f => f.path !== currentFile.path).map(() => 1), // Equal weights
      sampleSize,
      false
    );

    for (const file of filesToCompare) {
      try {
        const content = await this.app.vault.read(file);
        const otherFingerprint = this.generateContentFingerprint(content);
        
        const similarity = this.calculateJaccardSimilarity(fingerprint, otherFingerprint);
        totalSimilarity += similarity;
        comparisons++;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate Jaccard similarity between two content fingerprints
   */
  private calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1);
    const s2 = new Set(set2);
    
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate TCG card from note analysis
   */
  private async generateCardFromAnalysis(
    file: TFile, 
    content: string, 
    analysis: NoteAnalysis
  ): Promise<TCGCard> {
    // Calculate overall score using weighted analysis
    const overallScore = 
      analysis.complexity * this.analysisWeights.complexity +
      analysis.connectivity * this.analysisWeights.connectivity +
      analysis.uniqueness * this.analysisWeights.uniqueness +
      analysis.recency * this.analysisWeights.recency +
      analysis.engagement * this.analysisWeights.engagement;

    // Determine rarity from overall score
    const rarity = this.calculateRarity(overallScore);
    
    // Determine if card is shiny (rare random bonus)
    const isShiny = this.determineShinyStatus(rarity, overallScore);

    // Calculate power level
    const powerLevel = this.calculatePowerLevel(analysis, rarity, isShiny);

    // Extract note statistics
    const metadata = this.app.metadataCache.getFileCache(file);
    const noteStats = this.extractNoteStats(file, content, metadata);

    // Generate card abilities based on note content
    const abilities = this.generateCardAbilities(analysis, content, metadata);

    // Generate flavor text
    const flavorText = this.generateFlavorText(file, content, analysis);

    return {
      id: this.generateCardId(file),
      name: this.generateCardName(file),
      noteReference: file.path,
      rarity,
      isShiny,
      powerLevel,
      generatedFrom: 'note_analysis',
      acquisitionDate: new Date(),
      acquisitionContext: 'note_analysis_generation',
      noteStats,
      themeData: {}, // Will be populated by theme system
      abilities,
      flavorText,
      timesViewed: 0,
      favorited: false
    };
  }

  /**
   * Calculate card rarity from overall analysis score
   */
  private calculateRarity(score: number): CardRarity {
    for (const [rarity, threshold] of Object.entries(this.rarityThresholds)) {
      if (score >= threshold.min && score < threshold.max) {
        return rarity as CardRarity;
      }
    }
    return 'Common'; // Fallback
  }

  /**
   * Determine if card should be shiny based on rarity and score
   */
  private determineShinyStatus(rarity: CardRarity, score: number): boolean {
    const baseShinyRates: Record<CardRarity, number> = {
      'Common': 0.01,    // 1%
      'Uncommon': 0.03,  // 3%
      'Rare': 0.05,      // 5%
      'Epic': 0.08,      // 8%
      'Legendary': 0.15  // 15%
    };

    const baseRate = baseShinyRates[rarity];
    const scoreBonus = score > 0.9 ? 0.05 : 0; // Extra chance for very high scores
    
    return this.rng.randomBoolean(baseRate + scoreBonus);
  }

  /**
   * Calculate card power level based on analysis and rarity
   */
  private calculatePowerLevel(analysis: NoteAnalysis, rarity: CardRarity, isShiny: boolean): number {
    const rarityMultipliers: Record<CardRarity, number> = {
      'Common': 1.0,
      'Uncommon': 1.3,
      'Rare': 1.7,
      'Epic': 2.2,
      'Legendary': 3.0
    };

    const baseScore = (
      analysis.complexity * 30 +
      analysis.connectivity * 25 +
      analysis.uniqueness * 20 +
      analysis.recency * 15 +
      analysis.engagement * 10
    );

    const rarityBonus = baseScore * rarityMultipliers[rarity];
    const shinyBonus = isShiny ? rarityBonus * 0.2 : 0;

    return Math.floor(rarityBonus + shinyBonus);
  }

  /**
   * Extract note statistics for card metadata
   */
  private extractNoteStats(
    file: TFile, 
    content: string, 
    metadata: CachedMetadata | null
  ): TCGCard['noteStats'] {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const links = metadata?.links || [];
    
    // Calculate backlinks
    const backlinks = Object.keys(this.app.metadataCache.resolvedLinks)
      .reduce((count, sourcePath) => {
        const sourceLinks = this.app.metadataCache.resolvedLinks[sourcePath];
        return count + (sourceLinks[file.path] ? sourceLinks[file.path] : 0);
      }, 0);

    return {
      wordCount: words.length,
      backlinks,
      forwardLinks: links.length,
      tags: metadata?.tags?.map(tag => tag.tag) || [],
      lastModified: new Date(file.stat.mtime),
      creationDate: new Date(file.stat.ctime)
    };
  }

  /**
   * Generate card abilities based on note analysis
   */
  private generateCardAbilities(
    analysis: NoteAnalysis,
    content: string,
    metadata: CachedMetadata | null
  ): string[] {
    const abilities: string[] = [];

    // Complexity-based abilities
    if (analysis.complexity > 0.8) {
      abilities.push('Deep Knowledge: +50% EXP when reviewing connected notes');
    }
    if (analysis.complexity > 0.6) {
      abilities.push('Structured Thinking: Organize related cards efficiently');
    }

    // Connectivity-based abilities
    if (analysis.connectivity > 0.7) {
      abilities.push('Network Effect: Bonus power for each linked card in collection');
    }
    if (analysis.connectivity > 0.5) {
      abilities.push('Knowledge Web: Reveal connections between concepts');
    }

    // Uniqueness-based abilities
    if (analysis.uniqueness > 0.8) {
      abilities.push('Original Insight: Rare concepts provide unique bonuses');
    }
    if (analysis.uniqueness > 0.6) {
      abilities.push('Creative Spark: Inspire new writing directions');
    }

    // Recency-based abilities
    if (analysis.recency > 0.7) {
      abilities.push('Fresh Perspective: Recently updated knowledge stays relevant');
    }

    // Content-specific abilities
    if (content.includes('```')) {
      abilities.push('Code Mastery: Technical knowledge provides implementation power');
    }
    if (content.includes('$$')) {
      abilities.push('Mathematical Mind: Formula-based reasoning unlocks precise solutions');
    }

    // Ensure at least one ability
    if (abilities.length === 0) {
      abilities.push('Knowledge Foundation: Basic understanding builds stronger concepts');
    }

    return abilities;
  }

  /**
   * Generate flavor text for the card
   */
  private generateFlavorText(file: TFile, content: string, analysis: NoteAnalysis): string {
    const templates = [
      `"The wisdom contained in '${file.basename}' continues to illuminate new paths of understanding."`,
      `"Every connection made strengthens the web of knowledge within '${file.basename}'."`,
      `"In the depths of '${file.basename}', insights await those brave enough to explore."`,
      `"The concepts in '${file.basename}' resonate with the frequency of discovery."`,
      `"Knowledge flows like water through the channels carved by '${file.basename}'."`,
    ];

    // Choose template based on analysis scores
    let templateIndex = 0;
    if (analysis.connectivity > 0.7) templateIndex = 1;
    else if (analysis.complexity > 0.8) templateIndex = 2;
    else if (analysis.uniqueness > 0.7) templateIndex = 3;
    else if (analysis.engagement > 0.6) templateIndex = 4;

    return templates[templateIndex];
  }

  /**
   * Generate unique card ID
   */
  private generateCardId(file: TFile): string {
    const timestamp = Date.now().toString(36);
    const pathHash = this.hashString(file.path).toString(36);
    return `card-${pathHash}-${timestamp}`;
  }

  /**
   * Generate card name from file
   */
  private generateCardName(file: TFile): string {
    // Use the file basename, but make it more card-like
    const baseName = file.basename;
    
    // Clean up common note naming patterns
    const cleaned = baseName
      .replace(/^\d{4}-\d{2}-\d{2}[-\s]*/, '') // Remove date prefixes
      .replace(/[-_]/g, ' ') // Convert separators to spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case

    return cleaned.trim() || 'Unknown Knowledge';
  }

  /**
   * Simple string hashing for generating IDs
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update analyzer settings
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    this.rng.reset(newSettings.rngSeed);
    
    console.log('⚙️ Note analyzer settings updated');
  }

  /**
   * Get analysis statistics for debugging
   */
  getAnalysisStats(): {
    totalAnalyzed: number;
    rarityDistribution: Record<CardRarity, number>;
    averageScores: NoteAnalysis;
  } {
    // This would be implemented with actual tracking in a real system
    return {
      totalAnalyzed: 0,
      rarityDistribution: {
        'Common': 0,
        'Uncommon': 0,
        'Rare': 0,
        'Epic': 0,
        'Legendary': 0
      },
      averageScores: {
        complexity: 0,
        connectivity: 0,
        uniqueness: 0,
        recency: 0,
        engagement: 0
      }
    };
  }
}

// ===== BATCH ANALYZER FOR PERFORMANCE =====

/**
 * Batch analyzer for processing multiple notes efficiently
 * Optimized for large vault analysis with progress tracking
 */
export class BatchNoteAnalyzer {
  private analyzer: NoteAnalyzer;
  private app: App;

  constructor(analyzer: NoteAnalyzer, app: App) {
    this.analyzer = analyzer;
    this.app = app;
  }

  /**
   * Analyze multiple notes in batches with progress callback
   */
  async analyzeVault(
    progressCallback?: (processed: number, total: number, currentFile: string) => void
  ): Promise<TCGCard[]> {
    const allFiles = this.app.vault.getMarkdownFiles();
    const cards: TCGCard[] = [];
    
    console.log(`📚 Starting vault analysis: ${allFiles.length} files`);

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      
      try {
        progressCallback?.(i, allFiles.length, file.basename);
        
        const card = await this.analyzer.analyzeNote(file);
        if (card) {
          cards.push(card);
        }
        
        // Yield control periodically to prevent UI blocking
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      } catch (error) {
        console.warn(`Failed to analyze ${file.path}:`, error);
        continue;
      }
    }

    console.log(`✅ Vault analysis complete: ${cards.length} cards generated`);
    return cards;
  }

  /**
   * Analyze specific files with error handling
   */
  async analyzeFiles(files: TFile[]): Promise<TCGCard[]> {
    const results = await Promise.allSettled(
      files.map(file => this.analyzer.analyzeNote(file))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<TCGCard | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick note analysis function
 */
export async function analyzeNote(
  app: App, 
  file: TFile, 
  settings: TCGSettings
): Promise<TCGCard | null> {
  const analyzer = new NoteAnalyzer(app, settings);
  return await analyzer.analyzeNote(file);
}

/**
 * Quick batch analysis function
 */
export async function analyzeVaultNotes(
  app: App, 
  settings: TCGSettings,
  progressCallback?: (processed: number, total: number, currentFile: string) => void
): Promise<TCGCard[]> {
  const analyzer = new NoteAnalyzer(app, settings);
  const batchAnalyzer = new BatchNoteAnalyzer(analyzer, app);
  return await batchAnalyzer.analyzeVault(progressCallback);
}