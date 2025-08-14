/**
 * Link Suggestion Engine - Real-time intelligent link recommendations
 * Analyzes content and suggests relevant internal links as user types
 */

import { Editor, TFile, Vault, MetadataCache } from 'obsidian';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine, SimilarityResult, RelationshipType, NoteContent } from '../semantic/similarity-engine';

export interface LinkSuggestion {
  targetNote: string;
  displayText: string;
  confidence: number;
  reason: string;
  relationshipType: RelationshipType;
  contextSnippet: string;
  insertPosition?: number;
  suggestionType: SuggestionTrigger;
  actionable: boolean; // Can be auto-inserted vs needs user review
  linkText?: string; // The text to insert as a link
}

export interface SuggestionContext {
  currentContent: string;
  cursorPosition: number;
  currentParagraph: string;
  surroundingText: string;
  existingLinks: string[];
}

export enum SuggestionTrigger {
  TYPING = 'typing',           // Real-time as user types
  PARAGRAPH = 'paragraph',     // End of paragraph
  CONCEPT = 'concept',         // Specific concept mentioned
  QUERY = 'query',            // Manual query
  ORPHAN = 'orphan'           // Note needs connections
}

export interface SuggestionSettings {
  realTimeEnabled: boolean;
  minConfidence: number;
  maxSuggestions: number;
  triggers: SuggestionTrigger[];
  showInline: boolean;
  showSidebar: boolean;
  autoLinkThreshold: number;
}

export class LinkSuggestionEngine {
  private embeddingManager: EmbeddingManager;
  private similarityEngine: SimilarityEngine;
  private vaultNotes: Map<string, NoteContent> = new Map();
  private settings: SuggestionSettings;
  private lastSuggestionTime = 0;
  private suggestionDebounceMs = 300;
  private vault: Vault;
  private metadataCache: MetadataCache;

  constructor(
    embeddingManager: EmbeddingManager,
    similarityEngine: SimilarityEngine,
    settings: SuggestionSettings,
    vault: Vault,
    metadataCache: MetadataCache
  ) {
    this.embeddingManager = embeddingManager;
    this.similarityEngine = similarityEngine;
    this.settings = settings;
    this.vault = vault;
    this.metadataCache = metadataCache;
  }

  /**
   * Initialize the suggestion engine with vault notes
   */
  async initialize(vaultFiles: TFile[]): Promise<void> {
    console.log('CLIPPY: Initializing link suggestion engine...');
    
    // Load all notes into memory for fast access
    for (const file of vaultFiles) {
      if (file.extension === 'md') {
        try {
          const content = await this.vault.read(file);
          const noteContent: NoteContent = {
            path: file.path,
            title: file.basename,
            content: content,
            metadata: this.metadataCache.getFileCache(file) || {}
          };
          
          this.vaultNotes.set(file.path, noteContent);
        } catch (error) {
          console.warn(`CLIPPY: Failed to read file ${file.path}:`, error);
        }
      }
    }

    console.log(`CLIPPY: Initialized with ${this.vaultNotes.size} notes`);
  }

  /**
   * Get link suggestions for current editor context
   */
  async getSuggestionsForContext(
    context: SuggestionContext,
    trigger: SuggestionTrigger = SuggestionTrigger.TYPING
  ): Promise<LinkSuggestion[]> {
    // Debounce rapid typing
    if (trigger === SuggestionTrigger.TYPING) {
      const now = Date.now();
      if (now - this.lastSuggestionTime < this.suggestionDebounceMs) {
        return [];
      }
      this.lastSuggestionTime = now;
    }

    // Check if suggestions are enabled for this trigger
    if (!this.settings.triggers.includes(trigger)) {
      return [];
    }

    // Determine what content to analyze
    const analysisContent = this.getAnalysisContent(context, trigger);
    if (!analysisContent.trim()) {
      return [];
    }

    // Get all vault notes except current one
    const currentNotePath = this.getCurrentNotePath();
    const candidateNotes = Array.from(this.vaultNotes.values())
      .filter(note => note.path !== currentNotePath);

    // Find similar notes
    const similarities = await this.similarityEngine.findSimilarNotes(
      analysisContent,
      candidateNotes,
      {
        minSimilarity: this.settings.minConfidence,
        maxResults: this.settings.maxSuggestions * 2 // Get extra to filter later
      }
    );

    // Convert to link suggestions
    const suggestions = await this.convertToLinkSuggestions(
      similarities,
      context,
      trigger
    );

    // Filter out existing links
    const filteredSuggestions = suggestions.filter(
      suggestion => !context.existingLinks.includes(suggestion.targetNote)
    );

    return filteredSuggestions.slice(0, this.settings.maxSuggestions);
  }

  /**
   * Get suggestions for orphaned notes (notes with few or no links)
   */
  async getOrphanSuggestions(maxOrphans: number = 5): Promise<LinkSuggestion[]> {
    const orphanedNotes = this.findOrphanedNotes(maxOrphans);
    const suggestions: LinkSuggestion[] = [];

    for (const orphanNote of orphanedNotes) {
      const candidateNotes = Array.from(this.vaultNotes.values())
        .filter(note => note.path !== orphanNote.path);

      const similarities = await this.similarityEngine.findSimilarNotes(
        orphanNote.content,
        candidateNotes,
        {
          minSimilarity: this.settings.minConfidence * 0.8, // Lower threshold for orphans
          maxResults: 3
        }
      );

      for (const similarity of similarities) {
        suggestions.push({
          targetNote: similarity.noteB,
          displayText: this.vaultNotes.get(similarity.noteB)?.title || similarity.noteB,
          confidence: similarity.similarity,
          reason: `Orphan note "${orphanNote.title}" should connect: ${similarity.reason}`,
          relationshipType: similarity.relationshipType,
          contextSnippet: this.extractSnippet(similarity.noteB),
          suggestionType: SuggestionTrigger.ORPHAN,
          actionable: similarity.confidence > 0.7
        });
      }
    }

    return suggestions;
  }

  /**
   * Determine what content to analyze based on context and trigger
   */
  private getAnalysisContent(context: SuggestionContext, trigger: SuggestionTrigger): string {
    switch (trigger) {
      case SuggestionTrigger.TYPING:
        // Analyze current paragraph and some surrounding context
        return context.currentParagraph + '\n' + context.surroundingText;
      
      case SuggestionTrigger.PARAGRAPH:
        // Analyze just the completed paragraph
        return context.currentParagraph;
      
      case SuggestionTrigger.CONCEPT:
        // Analyze surrounding context for concept mentions
        return context.surroundingText;
      
      case SuggestionTrigger.QUERY:
        // Analyze entire current content
        return context.currentContent;
      
      default:
        return context.currentParagraph;
    }
  }

  /**
   * Convert similarity results to link suggestions
   */
  private async convertToLinkSuggestions(
    similarities: SimilarityResult[],
    context: SuggestionContext,
    trigger: SuggestionTrigger
  ): Promise<LinkSuggestion[]> {
    const suggestions: LinkSuggestion[] = [];

    for (const similarity of similarities) {
      const targetNote = this.vaultNotes.get(similarity.noteB);
      if (!targetNote) continue;

      // Extract relevant snippet from target note
      const snippet = this.extractRelevantSnippet(
        targetNote.content,
        context.currentParagraph
      );

      suggestions.push({
        targetNote: similarity.noteB,
        displayText: targetNote.title,
        confidence: similarity.similarity,
        reason: similarity.reason,
        relationshipType: similarity.relationshipType,
        contextSnippet: snippet,
        suggestionType: trigger,
        actionable: similarity.confidence > this.settings.autoLinkThreshold
      });
    }

    return suggestions;
  }

  /**
   * Find notes with few outbound links (potential orphans)
   */
  private findOrphanedNotes(maxResults: number): NoteContent[] {
    const notesWithLinkCounts = Array.from(this.vaultNotes.values()).map(note => {
      // Count wikilinks in content
      const linkMatches = note.content.match(/\[\[([^\]]+)\]\]/g) || [];
      return {
        note,
        linkCount: linkMatches.length
      };
    });

    // Sort by link count (ascending) and return notes with fewest links
    return notesWithLinkCounts
      .sort((a, b) => a.linkCount - b.linkCount)
      .slice(0, maxResults)
      .map(item => item.note);
  }

  /**
   * Extract relevant snippet from target note content
   */
  private extractRelevantSnippet(noteContent: string, queryContent: string): string {
    // Simple implementation: find sentences that contain similar concepts
    const sentences = noteContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return noteContent.substring(0, 100) + '...';
    }

    // Find sentence with highest word overlap
    const queryWords = queryContent.toLowerCase().split(/\W+/);
    let bestSentence = sentences[0];
    let bestScore = 0;

    for (const sentence of sentences.slice(0, 10)) { // Limit for performance
      const sentenceWords = sentence.toLowerCase().split(/\W+/);
      const overlap = queryWords.filter(word => 
        word.length > 3 && sentenceWords.includes(word)
      ).length;
      
      if (overlap > bestScore) {
        bestScore = overlap;
        bestSentence = sentence;
      }
    }

    return bestSentence.trim().substring(0, 150) + '...';
  }

  /**
   * Extract snippet from note by path
   */
  private extractSnippet(notePath: string): string {
    const note = this.vaultNotes.get(notePath);
    if (!note) return '';
    
    return note.content.substring(0, 100).replace(/\n/g, ' ') + '...';
  }

  /**
   * Get current note path from active view
   */
  private getCurrentNotePath(): string | null {
    // Note: This would need to be passed in or accessed differently
    // const activeFile = app.workspace.getActiveFile();
    // For now, return empty string
    return '';
  }

  /**
   * Update note content in cache
   */
  async updateNoteContent(notePath: string, content: string): Promise<void> {
    const existingNote = this.vaultNotes.get(notePath);
    if (existingNote) {
      existingNote.content = content;
      // Update embedding in similarity engine
      await this.similarityEngine.updateNoteEmbedding(notePath, content);
    }
  }

  /**
   * Add new note to cache
   */
  async addNote(file: TFile): Promise<void> {
    try {
      const content = await this.vault.read(file);
      const noteContent: NoteContent = {
        path: file.path,
        title: file.basename,
        content: content,
        metadata: this.metadataCache.getFileCache(file) || {}
      };
      
      this.vaultNotes.set(file.path, noteContent);
      await this.similarityEngine.updateNoteEmbedding(file.path, content);
    } catch (error) {
      console.warn(`CLIPPY: Failed to add note ${file.path}:`, error);
    }
  }

  /**
   * Remove note from cache
   */
  removeNote(notePath: string): void {
    this.vaultNotes.delete(notePath);
    // Note: Similarity engine will clean up its cache automatically
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<SuggestionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalNotes: number;
    cacheStats: any;
  } {
    return {
      totalNotes: this.vaultNotes.size,
      cacheStats: this.similarityEngine.getCacheStats()
    };
  }

  /**
   * Clear all caches and reinitialize
   */
  async refresh(): Promise<void> {
    this.vaultNotes.clear();
    this.similarityEngine.clearAllCaches();
    
    // Reinitialize with current vault files
    const vaultFiles = this.vault.getMarkdownFiles();
    await this.initialize(vaultFiles);
  }
}