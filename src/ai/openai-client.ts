/**
 * CLIPPY AI Assistant - OpenAI Client
 * Cloud AI provider using OpenAI's GPT models
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './base-provider';
import { ContentAnalysis } from '../types';

interface OpenAIConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export class OpenAIClient extends BaseAIProvider {
  name = 'OpenAI';
  protected config: OpenAIConfig;
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    super(config);
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Required for Obsidian plugin environment
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test connection with a minimal request
      const response = await this.client.models.list();
      
      // Check if our specified model is available
      const models = response.data;
      const modelExists = models.some(model => 
        model.id === this.config.model || model.id.includes(this.config.model.split('-')[0])
      );

      return modelExists;
    } catch (error) {
      console.warn('CLIPPY OpenAI: Connection test failed:', error);
      return false;
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      await this.checkRateLimit(60); // OpenAI rate limits
      
      const sanitizedPrompt = this.sanitizeContent(prompt);
      const sanitizedContext = context ? this.sanitizeContent(context) : '';

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are CLIPPY, an AI assistant for Obsidian note management. 
You help users enhance their notes, suggest improvements, and organize information.
Be concise, helpful, and preserve the user's original intent.
Follow Obsidian markdown conventions and respect existing wikilinks and frontmatter.

${sanitizedContext ? `Context: ${sanitizedContext}` : ''}`,
        },
        {
          role: 'user',
          content: sanitizedPrompt,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 8000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated');
      }

      const content = response.choices[0].message?.content;
      if (!content) {
        throw new Error('Empty response content');
      }

      return content.trim();
    } catch (error) {
      this.handleAPIError(error, 'generateResponse');
    }
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    try {
      await this.checkRateLimit(40); // More conservative for analysis
      
      const sanitizedContent = this.sanitizeContent(content);
      
      const analysisPrompt = `Analyze this Obsidian note content and provide structured feedback.

CONTENT:
${sanitizedContent}

Please analyze the content and respond with a JSON object containing:
{
  "suggestedTags": ["tag1", "tag2"],
  "topics": ["topic1", "topic2"], 
  "summary": "Brief summary of the content",
  "relatedNotes": ["potential related note titles"],
  "formattingIssues": ["formatting improvement suggestions"]
}

Guidelines:
- Suggest 3-5 relevant tags based on content themes
- Identify 2-4 main topics covered
- Create a 1-2 sentence summary
- Recommend potential note connections or references
- Highlight specific markdown formatting improvements
- Consider Obsidian-specific features like wikilinks [[Note Name]]`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a content analysis assistant specializing in Obsidian notes. 
Always respond with valid JSON. Focus on actionable insights for note organization and improvement.`,
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.3, // Lower temperature for consistent analysis
        max_tokens: 800,
        response_format: { type: "json_object" }, // Ensure JSON response
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty analysis response');
      }

      try {
        const analysis = JSON.parse(responseText);
        
        // Validate and provide defaults for missing fields
        return {
          suggestedTags: Array.isArray(analysis.suggestedTags) ? analysis.suggestedTags.slice(0, 5) : [],
          topics: Array.isArray(analysis.topics) ? analysis.topics.slice(0, 4) : [],
          summary: typeof analysis.summary === 'string' ? analysis.summary : 'Analysis unavailable',
          relatedNotes: Array.isArray(analysis.relatedNotes) ? analysis.relatedNotes.slice(0, 5) : [],
          formattingIssues: Array.isArray(analysis.formattingIssues) ? analysis.formattingIssues.slice(0, 5) : [],
        };
      } catch (parseError) {
        // Fallback parsing
        return this.extractAnalysisFromText(responseText);
      }
    } catch (error) {
      this.handleAPIError(error, 'analyzeContent');
    }
  }

  private extractAnalysisFromText(text: string): ContentAnalysis {
    // Fallback parsing for when JSON parsing fails
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[1]);
        return {
          suggestedTags: Array.isArray(analysis.suggestedTags) ? analysis.suggestedTags : [],
          topics: Array.isArray(analysis.topics) ? analysis.topics : [],
          summary: typeof analysis.summary === 'string' ? analysis.summary : '',
          relatedNotes: Array.isArray(analysis.relatedNotes) ? analysis.relatedNotes : [],
          formattingIssues: Array.isArray(analysis.formattingIssues) ? analysis.formattingIssues : [],
        };
      }
    } catch (e) {
      // Continue to manual extraction
    }

    // Manual extraction as last resort
    return {
      suggestedTags: this.extractListFromText(text, /tags?[:\-]?\s*([^\n]+)/i),
      topics: this.extractListFromText(text, /topics?[:\-]?\s*([^\n]+)/i),
      summary: this.extractSummaryFromText(text),
      relatedNotes: this.extractListFromText(text, /related[:\-]?\s*([^\n]+)/i),
      formattingIssues: this.extractListFromText(text, /format[:\-]?\s*([^\n]+)/i),
    };
  }

  private extractListFromText(text: string, regex: RegExp): string[] {
    const match = text.match(regex);
    if (!match || !match[1]) return [];
    
    return match[1]
      .split(/[,;]/)
      .map(item => item.trim().replace(/^[-*]\s*/, ''))
      .filter(item => item.length > 0)
      .slice(0, 5);
  }

  private extractSummaryFromText(text: string): string {
    const summaryMatch = text.match(/summary[:\-]?\s*([^\.]+\.)/i);
    return summaryMatch ? summaryMatch[1].trim() : text.slice(0, 200) + '...';
  }

  /**
   * Get token count estimate for content
   */
  getTokenEstimate(content: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(content.length / 4);
  }

  /**
   * Check if content is within model token limits
   */
  isWithinTokenLimit(content: string, maxTokens: number = 4000): boolean {
    return this.getTokenEstimate(content) <= maxTokens;
  }

  /**
   * Truncate content to fit within token limits
   */
  truncateToTokenLimit(content: string, maxTokens: number = 4000): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) return content;
    
    // Try to truncate at a sentence boundary
    const truncated = content.slice(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    return lastSentence > maxChars * 0.8 ? 
      truncated.slice(0, lastSentence + 1) : 
      truncated + '...';
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): {
    generateResponse: boolean;
    analyzeContent: boolean;
    streaming: boolean;
    maxTokens?: number;
  } {
    return {
      generateResponse: true,
      analyzeContent: true,
      streaming: false, // OpenAI streaming not implemented yet
      maxTokens: 4000
    };
  }

  /**
   * Validate the OpenAI configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('OpenAI API key is required');
    } else if (!this.config.apiKey.startsWith('sk-')) {
      errors.push('Invalid OpenAI API key format');
    }

    if (!this.config.model) {
      errors.push('OpenAI model name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}