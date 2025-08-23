/**
 * CLIPPY AI Assistant - Auto Tagger
 * Intelligently suggests tags based on content analysis and vault patterns
 */

import { AIProvider, VaultPatterns, TagPattern } from '../../../types';

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
  source: 'ai' | 'pattern' | 'keyword' | 'similar';
  category?: string;
}

export class AutoTagger {
  private aiProvider: AIProvider;
  private vaultPatterns: VaultPatterns;

  constructor(aiProvider: AIProvider, vaultPatterns: VaultPatterns) {
    this.aiProvider = aiProvider;
    this.vaultPatterns = vaultPatterns;
  }

  /**
   * Generate tag suggestions for content
   */
  async suggestTags(content: string, existingTags: string[] = []): Promise<TagSuggestion[]> {
    try {
      const suggestions: TagSuggestion[] = [];

      // Get AI-powered suggestions
      const aiSuggestions = await this.getAISuggestions(content);
      suggestions.push(...aiSuggestions);

      // Get pattern-based suggestions from clippy vault analysis
      const patternSuggestions = await this.getPatternBasedSuggestions(content);
      suggestions.push(...patternSuggestions);

      // Get keyword-based suggestions normal search
      const keywordSuggestions = await this.getKeywordBasedSuggestions(content);
      suggestions.push(...keywordSuggestions);

      // Get similar content suggestions semantic search
      const similarSuggestions = await this.getSimilarContentSuggestions(content);
      suggestions.push(...similarSuggestions);

      // Deduplicate, filter, and rank suggestions
      const filtered = this.filterAndRankSuggestions(suggestions, existingTags);

      return filtered.slice(0, 8); // Return top 8 suggestions
    } catch (error) {
      console.error('CLIPPY AutoTagger: Failed to generate suggestions:', error);
      return [];
    }
  }

  /**
   * Get AI-powered tag suggestions
   */
  private async getAISuggestions(content: string): Promise<TagSuggestion[]> {
    try {
      const analysis = await this.aiProvider.analyzeContent(content);
      
      return analysis.suggestedTags.map(tag => ({
        tag: this.normalizeTag(tag),
        confidence: 0.8,
        reason: 'AI content analysis',
        source: 'ai' as const,
        category: this.categorizeTag(tag),
      }));
    } catch (error) {
      console.warn('CLIPPY AutoTagger: AI suggestions failed:', error);
      return [];
    }
  }

  /**
   * Get suggestions based on existing vault tag patterns
   */
  private getPatternBasedSuggestions(content: string): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];
    const words = this.extractKeywords(content);
    
    for (const tagPattern of this.vaultPatterns.tagPatterns) {
      if (tagPattern.frequency < 3) continue; // Skip rare tags

      const tag = tagPattern.pattern.startsWith('#') ? tagPattern.pattern.slice(1) : tagPattern.pattern;
      const tagWords = tag.toLowerCase().split(/[/_-]/);
      
      // Check if content words match tag components
      let matchScore = 0;
      for (const tagWord of tagWords) {
        for (const word of words) {
          if (word.includes(tagWord) || tagWord.includes(word)) {
            matchScore += 1;
          }
        }
      }

      if (matchScore > 0) {
        const confidence = Math.min(0.9, matchScore * 0.2 + (tagPattern.frequency * 0.01));
        suggestions.push({
          tag: this.normalizeTag(tag),
          confidence,
          reason: `Matches vault pattern (used ${tagPattern.frequency} times)`,
          source: 'pattern',
          category: tagPattern.categories[0] || 'general',
        });
      }
    }

    return Promise.resolve(suggestions);
  }

  /**
   * Get suggestions based on keyword matching
   */
  private getKeywordBasedSuggestions(content: string): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];
    const keywords = this.extractKeywords(content);
    
    // Define keyword to tag mappings based on common patterns
    const keywordMappings: { [key: string]: { tag: string; category: string } } = {
      // Academic/Study
      'study': { tag: 'study', category: 'academic' },
      'research': { tag: 'research', category: 'academic' },
      'learning': { tag: 'learning', category: 'academic' },
      'education': { tag: 'education', category: 'academic' },
      'course': { tag: 'course', category: 'academic' },
      'university': { tag: 'university', category: 'academic' },
      'homework': { tag: 'homework', category: 'academic' },

      // Work/Project
      'project': { tag: 'project', category: 'work' },
      'work': { tag: 'work', category: 'work' },
      'meeting': { tag: 'meeting', category: 'work' },
      'deadline': { tag: 'deadline', category: 'work' },
      'task': { tag: 'task', category: 'work' },
      'todo': { tag: 'todo', category: 'work' },

      // Personal
      'health': { tag: 'health', category: 'personal' },
      'fitness': { tag: 'fitness', category: 'personal' },
      'travel': { tag: 'travel', category: 'personal' },
      'family': { tag: 'family', category: 'personal' },
      'friends': { tag: 'friends', category: 'personal' },

      // Technology
      'programming': { tag: 'programming', category: 'tech' },
      'code': { tag: 'code', category: 'tech' },
      'software': { tag: 'software', category: 'tech' },
      'development': { tag: 'dev', category: 'tech' },
      'technology': { tag: 'tech', category: 'tech' },

      // Content Types
      'book': { tag: 'book', category: 'reading' },
      'article': { tag: 'article', category: 'reading' },
      'paper': { tag: 'paper', category: 'reading' },
      'video': { tag: 'video', category: 'media' },
      'podcast': { tag: 'podcast', category: 'media' },
      'movie': { tag: 'movie', category: 'media' },
    };

    for (const keyword of keywords) {
      const mapping = keywordMappings[keyword.toLowerCase()];
      if (mapping) {
        suggestions.push({
          tag: this.normalizeTag(mapping.tag),
          confidence: 0.6,
          reason: `Keyword match: "${keyword}"`,
          source: 'keyword',
          category: mapping.category,
        });
      }
    }

    // Date-based tags
    const dateMatches = content.match(/\b\d{4}\b/g);
    if (dateMatches) {
      for (const year of dateMatches.slice(0, 2)) {
        suggestions.push({
          tag: year,
          confidence: 0.4,
          reason: `Year mentioned: ${year}`,
          source: 'keyword',
          category: 'temporal',
        });
      }
    }

    return Promise.resolve(suggestions);
  }

  /**
   * Get suggestions based on similar content in the vault
   */
  private getSimilarContentSuggestions(content: string): Promise<TagSuggestion[]> {
    // This is a simplified version - in a full implementation,
    // you might use TF-IDF or other similarity measures
    const suggestions: TagSuggestion[] = [];
    const contentKeywords = this.extractKeywords(content);
    
    // Find tags that commonly appear with similar keywords
    const cooccurrenceMap = new Map<string, number>();
    
    for (const tagPattern of this.vaultPatterns.tagPatterns) {
      const tag = tagPattern.pattern.startsWith('#') ? tagPattern.pattern.slice(1) : tagPattern.pattern;
      const tagWords = tag.toLowerCase().split(/[/_-]/);
      
      let similarity = 0;
      for (const tagWord of tagWords) {
        for (const keyword of contentKeywords) {
          if (this.calculateSimilarity(tagWord, keyword) > 0.6) {
            similarity += 1;
          }
        }
      }
      
      if (similarity > 0) {
        cooccurrenceMap.set(tag, similarity * tagPattern.frequency);
      }
    }

    // Convert to suggestions
    for (const [tag, score] of cooccurrenceMap.entries()) {
      if (score > 5) { // Minimum threshold
        suggestions.push({
          tag: this.normalizeTag(tag),
          confidence: Math.min(0.7, score * 0.05),
          reason: 'Similar to existing tagged content',
          source: 'similar',
        });
      }
    }

    return Promise.resolve(suggestions);
  }

  /**
   * Filter, deduplicate, and rank tag suggestions
   */
  private filterAndRankSuggestions(
    suggestions: TagSuggestion[], 
    existingTags: string[]
  ): TagSuggestion[] {
    const existingNormalized = existingTags.map(tag => this.normalizeTag(tag));
    
    // Group by normalized tag
    const grouped = new Map<string, TagSuggestion[]>();
    for (const suggestion of suggestions) {
      const key = suggestion.tag;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(suggestion);
    }

    // Consolidate and rank
    const consolidated: TagSuggestion[] = [];
    for (const [tag, tagSuggestions] of grouped.entries()) {
      // Skip if already exists
      if (existingNormalized.includes(tag)) continue;

      // Combine confidence scores
      const maxConfidence = Math.max(...tagSuggestions.map(s => s.confidence));
      const avgConfidence = tagSuggestions.reduce((sum, s) => sum + s.confidence, 0) / tagSuggestions.length;
      const combinedConfidence = (maxConfidence + avgConfidence) / 2;

      // Use best reason
      const bestSuggestion = tagSuggestions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      consolidated.push({
        ...bestSuggestion,
        confidence: combinedConfidence,
      });
    }

    // Sort by confidence and filter minimum threshold
    return consolidated
      .filter(s => s.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - could be improved with NLP libraries
    const text = content
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .toLowerCase();
    
    const words = text.split(/\s+/)
      .filter(word => word.length > 3) // Skip short words
      .filter(word => !this.isStopWord(word)); // Skip stop words

    // Count frequency
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Return words that appear more than once, sorted by frequency
    return Array.from(frequency.entries())
      .filter(([word, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 20);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'should'
    ]);
    return stopWords.has(word);
  }

  /**
   * Normalize tag format
   */
  private normalizeTag(tag: string): string {
    // Remove leading #, convert to lowercase, replace spaces with hyphens
    return tag
      .replace(/^#+/, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_/-]/g, '') // Remove special characters
      .substring(0, 30); // Limit length
  }

  /**
   * Categorize tag based on content
   */
  private categorizeTag(tag: string): string {
    const categories: { [key: string]: RegExp } = {
      'academic': /^(study|research|learn|course|school|university|education)/i,
      'work': /^(project|work|meeting|task|todo|deadline)/i,
      'personal': /^(health|fitness|travel|family|friend|hobby)/i,
      'tech': /^(code|programming|dev|software|tech|computer)/i,
      'reading': /^(book|article|paper|reading|literature)/i,
      'media': /^(video|movie|podcast|music|film|show)/i,
      'temporal': /^\d{4}$/,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(tag)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase());
    const set2 = new Set(str2.toLowerCase());
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get tag suggestions for specific categories
   */
  getTagsByCategory(category: string): string[] {
    return this.vaultPatterns.tagPatterns
      .filter(pattern => pattern.categories.includes(category))
      .sort((a, b) => b.frequency - a.frequency)
      .map(pattern => this.normalizeTag(pattern.pattern))
      .slice(0, 10);
  }

  /**
   * Get most popular tags in the vault
   */
  getPopularTags(limit = 20): string[] {
    return this.vaultPatterns.tagPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .map(pattern => this.normalizeTag(pattern.pattern))
      .slice(0, limit);
  }
}