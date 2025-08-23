/**
 * CLIPPY AI Assistant - Content Analyzer
 * Coordinates content analysis and processing
 */

import { AIProvider, VaultPatterns, ContentAnalysis, ProcessingResult } from '../../../types';
import { MarkdownFormatter } from './markdown-formatter';
import { AutoTagger, TagSuggestion } from './auto-tagger';

export interface ComprehensiveAnalysis {
  contentAnalysis: ContentAnalysis;
  tagSuggestions: TagSuggestion[];
  formattingResult: ProcessingResult;
  relatedNotes: string[];
  qualityScore: number;
  recommendations: string[];
}

export class ContentAnalyzer {
  private aiProvider: AIProvider;
  private vaultPatterns: VaultPatterns;
  private formatter: MarkdownFormatter;
  private autoTagger: AutoTagger;

  constructor(aiProvider: AIProvider, vaultPatterns: VaultPatterns) {
    this.aiProvider = aiProvider;
    this.vaultPatterns = vaultPatterns;
    this.formatter = new MarkdownFormatter(aiProvider, vaultPatterns);
    this.autoTagger = new AutoTagger(aiProvider, vaultPatterns);
  }

  /**
   * Perform comprehensive analysis of note content
   */
  async analyzeNote(content: string, existingTags: string[] = []): Promise<ComprehensiveAnalysis> {
    try {
      // Run all analyses in parallel for better performance
      const [contentAnalysis, formattingResult, tagSuggestions] = await Promise.all([
        this.aiProvider.analyzeContent(content),
        this.formatter.enhanceNote(content),
        this.autoTagger.suggestTags(content, existingTags),
      ]);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(content, formattingResult, existingTags);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        content,
        contentAnalysis,
        formattingResult,
        qualityScore
      );

      // Find related notes (simplified version)
      const relatedNotes = this.findRelatedNotes(contentAnalysis, tagSuggestions);

      return {
        contentAnalysis,
        tagSuggestions,
        formattingResult,
        relatedNotes,
        qualityScore,
        recommendations,
      };
    } catch (error) {
      console.error('CLIPPY ContentAnalyzer: Analysis failed:', error);
      throw new Error(`Failed to analyze content: ${error.message}`);
    }
  }

  /**
   * Calculate quality score for the note (0-100)
   */
  private calculateQualityScore(
    content: string,
    formattingResult: ProcessingResult,
    existingTags: string[]
  ): number {
    let score = 50; // Base score

    // Length factor (optimal range: 100-2000 characters)
    const length = content.length;
    if (length > 100 && length < 2000) {
      score += 10;
    } else if (length >= 2000 && length < 5000) {
      score += 5;
    } else if (length < 100) {
      score -= 20;
    }

    // Structure factors
    const hasHeadings = /^#+\s/.test(content);
    if (hasHeadings) score += 10;

    const hasLists = /^[-*+]\s|^\d+\.\s/m.test(content);
    if (hasLists) score += 5;

    const hasLinks = /\[\[.*?\]\]/.test(content);
    if (hasLinks) score += 10;

    // Formatting quality
    const formattingIssues = formattingResult.suggestions.filter(s => s.priority === 'high').length;
    score -= formattingIssues * 5;

    // Tag coverage
    if (existingTags.length > 0) {
      score += Math.min(15, existingTags.length * 3);
    } else {
      score -= 10;
    }

    // Frontmatter presence
    if (content.startsWith('---')) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    content: string,
    analysis: ContentAnalysis,
    formattingResult: ProcessingResult,
    qualityScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (qualityScore < 50) {
      recommendations.push('Consider expanding this note with more detail');
    }

    // Structure recommendations
    if (!content.includes('#')) {
      recommendations.push('Add headings to organize your content');
    }

    // Formatting recommendations
    const highPriorityIssues = formattingResult.suggestions.filter(s => s.priority === 'high');
    if (highPriorityIssues.length > 0) {
      recommendations.push(`Fix ${highPriorityIssues.length} formatting issues`);
    }

    // Tagging recommendations
    if (analysis.suggestedTags.length > 0) {
      recommendations.push(`Consider adding tags: ${analysis.suggestedTags.slice(0, 3).join(', ')}`);
    }

    // Linking recommendations
    if (analysis.relatedNotes.length > 0) {
      recommendations.push(`Consider linking to: ${analysis.relatedNotes.slice(0, 2).join(', ')}`);
    }

    // Content-specific recommendations
    if (content.length < 100) {
      recommendations.push('Add more content to make this note more useful');
    }

    if (!content.includes('[[') && analysis.relatedNotes.length > 0) {
      recommendations.push('Add wikilinks to connect this note to others');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Find related notes based on analysis
   */
  private findRelatedNotes(analysis: ContentAnalysis, tagSuggestions: TagSuggestion[]): string[] {
    const related = new Set<string>();

    // Add from AI analysis
    analysis.relatedNotes.forEach(note => related.add(note));

    // Add notes that might share similar tags
    const topTags = tagSuggestions
      .filter(t => t.confidence > 0.6)
      .slice(0, 3)
      .map(t => t.tag);

    // This is simplified - in a real implementation, you'd search the vault
    // for notes with similar tags or content
    for (const tag of topTags) {
      // Add hypothetical related notes based on tag patterns
      if (tag.includes('project')) {
        related.add('Project Planning Template');
      }
      if (tag.includes('study')) {
        related.add('Study Methods');
      }
      if (tag.includes('work')) {
        related.add('Work Journal');
      }
    }

    return Array.from(related).slice(0, 5);
  }

  /**
   * Get quick insights about the content
   */
  async getQuickInsights(content: string): Promise<{
    wordCount: number;
    readingTime: number;
    complexity: 'simple' | 'moderate' | 'complex';
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
  }> {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200); // Assume 200 WPM

    // Simple complexity calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    
    let complexity: 'simple' | 'moderate' | 'complex';
    if (avgWordsPerSentence < 15) {
      complexity = 'simple';
    } else if (avgWordsPerSentence < 25) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    // Extract topics (simplified)
    const analysis = await this.aiProvider.analyzeContent(content);
    const topics = analysis.topics.slice(0, 3);

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrating'];
    
    const contentLower = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return {
      wordCount,
      readingTime,
      complexity,
      topics,
      sentiment,
    };
  }

  /**
   * Update patterns based on user feedback
   */
  updatePatterns(feedback: {
    acceptedTags: string[];
    rejectedTags: string[];
    appliedSuggestions: string[];
  }): void {
    // This would update the vault patterns based on user behavior
    // For now, it's a placeholder for future learning capabilities
    console.log('CLIPPY: User feedback received', feedback);
  }

  /**
   * Generate content suggestions
   */
  async generateContentSuggestions(content: string): Promise<string[]> {
    try {
      const prompt = `Based on this note content, suggest 3-5 specific ways to expand or improve it:

CONTENT:
${content.slice(0, 1500)}

Provide actionable suggestions for:
- Additional content that would be valuable
- Questions to explore further
- Related topics to research
- Ways to organize the information better

Format as a simple list.`;

      const response = await this.aiProvider.generateResponse(prompt);
      
      return response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => line.match(/^[-*]\s/))
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .slice(0, 5);
    } catch (error) {
      console.warn('CLIPPY ContentAnalyzer: Failed to generate content suggestions:', error);
      return [];
    }
  }
}