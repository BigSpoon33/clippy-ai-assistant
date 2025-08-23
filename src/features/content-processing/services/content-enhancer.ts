/**
 * CLIPPY AI Assistant - Content Enhancer Service
 * Handles AI-powered content enhancement with error boundaries
 */

import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';
import { processThinkingTags } from '../../../utils/shared-utilities';
import { ClippySettings } from '../../../types';

export class ContentEnhancer {
  private settings: ClippySettings;

  constructor(settings: ClippySettings) {
    this.settings = settings;
  }

  /**
   * Enhance content using configured AI provider
   */
  async enhanceContent(content: string, customInstructions?: string): Promise<string> {
    return ClippyErrorBoundaries.aiProviderOperation(
      async () => {
        if (this.settings.aiProvider === 'ollama') {
          return await this.enhanceWithOllama(content, customInstructions);
        } else {
          throw new Error(`Provider ${this.settings.aiProvider} not yet implemented`);
        }
      },
      'enhance content',
      {
        fallback: async () => content, // Return original content on failure
        showUserNotice: true
      }
    );
  }

  /**
   * Enhance content using Ollama
   */
  private async enhanceWithOllama(content: string, customInstructions?: string): Promise<string> {
    // Prepare the prompt for enhancement
    const customSection = customInstructions ? `

CUSTOM INSTRUCTIONS:
${customInstructions}

Please incorporate these specific instructions while following the general rules above.` : '';

    const prompt = `You are CLIPPY, an AI assistant for Obsidian note-taking. Your task is to enhance and improve the following note content while preserving its essential meaning and structure.

IMPORTANT RULES:
1. Preserve ALL wikilinks in [[double brackets]] exactly as they are
2. Preserve ALL frontmatter (content between --- markers) exactly as it is
3. Preserve ALL tags (words starting with #) exactly as they are
4. Do not change dates, names, or specific factual content
5. Focus on improving clarity, organization, and readability
6. Add structure with appropriate headings if missing
7. Fix grammar and spelling errors
8. Improve sentence flow and readability${customSection}

OUTPUT FORMAT:
- Respond with ONLY the enhanced content
- Do NOT add explanations, prefixes, or markdown code blocks
- Do NOT add thinking tags or meta-commentary
- Start directly with the content (or frontmatter if present)

Original content:
"""
${content}
"""

Enhanced version:`;

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

        return this.cleanAIResponse(data.response.trim());
      },
      'Ollama content enhancement',
      this.settings.providers.ollama.baseUrl,
      {
        fallback: async () => content,
        showUserNotice: true
      }
    );
  }

  /**
   * Clean AI response from common artifacts
   */
  private cleanAIResponse(response: string): string {
    let cleaned = response;
    
    // Remove thinking tags using shared utility
    cleaned = processThinkingTags(cleaned, { showThinkingTags: false });
    
    // Remove markdown code block markers that models often add
    cleaned = cleaned.replace(/^```\s*markdown\s*\n/i, '');
    cleaned = cleaned.replace(/^```\s*\n/i, '');
    cleaned = cleaned.replace(/\n```\s*$/i, '');
    
    // Remove common prefixes that models add
    cleaned = cleaned.replace(/^(here's the enhanced version:|enhanced content:|here is the improved version:)\s*/i, '');
    
    // Clean up any extra whitespace/newlines at start
    cleaned = cleaned.replace(/^\s*\n+/, '');
    
    // If the response starts with quotes or other artifacts, try to extract the actual content
    // Look for frontmatter start and begin from there if present
    const frontmatterMatch = cleaned.match(/(^|\n)(---\s*\n)/);
    if (frontmatterMatch && frontmatterMatch.index && frontmatterMatch.index > 0) {
      // If frontmatter is found but not at the start, extract from frontmatter onwards
      cleaned = cleaned.substring(frontmatterMatch.index + 1);
    }
    
    // Remove any remaining artifacts at the beginning
    cleaned = cleaned.replace(/^[`'"*\s]*/, '');
    
    return cleaned.trim();
  }

  /**
   * Update settings for the enhancer
   */
  updateSettings(settings: ClippySettings): void {
    this.settings = settings;
  }
}