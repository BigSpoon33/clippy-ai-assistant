/**
 * CLIPPY AI Assistant - Tag Generator Service
 * Handles AI-powered tag generation with error boundaries
 */

import { ClippySettings } from '../../../types';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
}

export class TagGenerator {
  private settings: ClippySettings;

  constructor(settings: ClippySettings) {
    this.settings = settings;
  }

  /**
   * Generate tag suggestions using configured AI provider
   */
  async generateTagSuggestions(content: string): Promise<TagSuggestion[]> {
    return ClippyErrorBoundaries.aiProviderOperation(
      async () => {
        if (this.settings.aiProvider === 'ollama') {
          return await this.generateTagsWithOllama(content);
        } else {
          throw new Error(`Provider ${this.settings.aiProvider} not yet implemented for tagging`);
        }
      },
      'generate tag suggestions',
      {
        fallback: async () => this.getFallbackTags(),
        showUserNotice: true
      }
    );
  }

  /**
   * Generate tags using Ollama
   */
  private async generateTagsWithOllama(content: string): Promise<TagSuggestion[]> {
    const contentPreview = content.substring(0, 1000);
    const prompt = `You are a tag suggestion system. Analyze the content and return ONLY a JSON array of tag suggestions.

Content to analyze:
"""
${contentPreview}${content.length > 1000 ? '...' : ''}
"""

Rules:
- Suggest 3-6 relevant tags
- Use lowercase with hyphens (e.g. "machine-learning")
- Include confidence 0.1-1.0 and brief reason

Response format (ONLY return this JSON, nothing else):
[{"tag": "example-tag", "confidence": 0.8, "reason": "Main topic discussed"}]`;

    return ClippyErrorBoundaries.networkOperation(
      async () => {
        const response = await fetch(`${this.settings.providers.ollama.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.settings.providers.ollama.model,
            prompt: prompt,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.response) {
          throw new Error('No response from Ollama');
        }

        return this.parseTagResponse(data.response);
      },
      'Ollama tag generation',
      this.settings.providers.ollama.baseUrl,
      {
        fallback: async () => this.extractTagsFromText(content),
        showUserNotice: false // Don't show notice for individual tag failures
      }
    );
  }

  /**
   * Parse tag response from AI
   */
  private parseTagResponse(response: string): TagSuggestion[] {
    try {
      let cleanedResponse = response.trim();
      
      // Try to extract JSON array from response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tagSuggestions = JSON.parse(jsonMatch[0]);
        
        // Validate the response format
        if (Array.isArray(tagSuggestions)) {
          // Validate and process each tag suggestion
          const validatedTags = tagSuggestions
            .filter(item => 
              item.tag && 
              typeof item.tag === 'string' &&
              typeof item.confidence === 'number' &&
              typeof item.reason === 'string'
            )
            .map(item => ({
              tag: this.normalizeTag(item.tag),
              confidence: Math.min(Math.max(item.confidence, 0), 1),
              reason: item.reason
            }))
            .filter(item => item.tag.length > 0);

          if (validatedTags.length > 0) {
            return validatedTags.slice(0, 8);
          }
        }
      }
      
      throw new Error('No valid JSON array found in response');
    } catch (parseError) {
      // Fallback: extract tags from response text
      return this.extractTagsFromText(response);
    }
  }

  /**
   * Extract tags from text when JSON parsing fails
   */
  private extractTagsFromText(text: string): TagSuggestion[] {
    // Fallback method to extract tags if JSON parsing fails
    const tagPattern = /#([a-zA-Z0-9-]+)/g;
    const matches = text.match(tagPattern);
    
    if (!matches) {
      return this.getFallbackTags();
    }

    return matches
      .slice(0, 5) // Limit to 5 tags
      .map(match => ({
        tag: match.substring(1).toLowerCase(),
        confidence: 0.6,
        reason: 'Extracted from AI response'
      }));
  }

  /**
   * Get fallback tags when AI fails
   */
  private getFallbackTags(): TagSuggestion[] {
    return [
      { 
        tag: 'general-note', 
        confidence: 0.5, 
        reason: 'Default tag when AI parsing failed' 
      }
    ];
  }

  /**
   * Normalize tag format
   */
  private normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Update settings for the generator
   */
  updateSettings(settings: ClippySettings): void {
    this.settings = settings;
  }
}