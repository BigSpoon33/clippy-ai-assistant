/**
 * CLIPPY AI Assistant - Anthropic Claude Client
 * Cloud AI provider using Anthropic's Claude models
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base-provider';
import { ContentAnalysis } from '../types';

interface AnthropicConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export class AnthropicClient extends BaseAIProvider {
  name = 'Anthropic';
  protected config: AnthropicConfig;
  private client: Anthropic;

  constructor(config: AnthropicConfig) {
    super(config);
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test connection with a minimal request
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi'
          }
        ]
      });

      return response.content.length > 0;
    } catch (error) {
      console.warn('CLIPPY Anthropic: Connection test failed:', error);
      return false;
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      await this.checkRateLimit(50); // Anthropic rate limits
      
      const sanitizedPrompt = this.sanitizeContent(prompt);
      const sanitizedContext = context ? this.sanitizeContent(context) : '';

      const systemMessage = `You are CLIPPY, an AI assistant for Obsidian note management. 
You help users enhance their notes, suggest improvements, and organize information.
Be concise, helpful, and preserve the user's original intent.
Follow Obsidian markdown conventions and respect existing wikilinks and frontmatter.

${sanitizedContext ? `Context: ${sanitizedContext}` : ''}`;

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: sanitizedPrompt
          }
        ]
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('No response generated');
      }

      // Extract text content from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      if (!textContent) {
        throw new Error('Empty response content');
      }

      return textContent.trim();
    } catch (error) {
      this.handleAPIError(error, 'generateResponse');
    }
  }

  /**
   * Generate a streaming response from Anthropic Claude
   */
  async* generateStreamingResponse(prompt: string, context?: string): AsyncGenerator<string, void, unknown> {
    try {
      await this.checkRateLimit(50); // Anthropic rate limits
      
      const sanitizedPrompt = this.sanitizeContent(prompt);
      const sanitizedContext = context ? this.sanitizeContent(context) : '';

      const systemMessage = `You are CLIPPY, an AI assistant for Obsidian note management. 
You help users enhance their notes, suggest improvements, and organize information.
Be concise, helpful, and preserve the user's original intent.
Follow Obsidian markdown conventions and respect existing wikilinks and frontmatter.

${sanitizedContext ? `Context: ${sanitizedContext}` : ''}`;

      const stream = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: sanitizedPrompt
          }
        ],
        stream: true
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const textChunk = chunk.delta.text;
          fullResponse += textChunk;
          yield textChunk;
        }
      }

      if (!fullResponse.trim()) {
        throw new Error('Empty streaming response');
      }

    } catch (error) {
      this.handleAPIError(error, 'generateStreamingResponse');
    }
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    try {
      await this.checkRateLimit(30); // More conservative for analysis
      
      const sanitizedContent = this.sanitizeContent(content);
      
      const analysisPrompt = `Analyze this Obsidian note content and provide structured feedback.

<content>
${sanitizedContent}
</content>

Please analyze the content and respond with a JSON object containing:
{
  "suggestedTags": ["tag1", "tag2"],
  "topics": ["topic1", "topic2"], 
  "summary": "Brief summary of the content",
  "relatedNotes": ["potential related note titles"],
  "formattingIssues": ["formatting improvement suggestions"]
}

Analysis guidelines:
- Suggest 3-5 relevant tags based on content themes and topics
- Identify 2-4 main topics or subjects covered
- Create a concise 1-2 sentence summary capturing the essence
- Recommend potential note connections or related topics for linking
- Highlight specific markdown formatting improvements (headings, lists, links, etc.)
- Consider Obsidian-specific features like wikilinks [[Note Name]] and tags #tag
- Focus on actionable improvements that enhance note organization and readability`;

      const systemMessage = `You are a content analysis assistant specializing in Obsidian note organization. 
Provide structured, actionable insights for improving note quality and organization.
Always respond with valid JSON following the specified format exactly.`;

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for consistent analysis
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      if (!textContent) {
        throw new Error('Empty analysis response');
      }

      try {
        // Try to parse as JSON
        const analysis = JSON.parse(textContent);
        
        // Validate and provide defaults for missing fields
        return {
          suggestedTags: Array.isArray(analysis.suggestedTags) ? 
            analysis.suggestedTags.slice(0, 5).filter((tag: any) => typeof tag === 'string') : [],
          topics: Array.isArray(analysis.topics) ? 
            analysis.topics.slice(0, 4).filter((topic: any) => typeof topic === 'string') : [],
          summary: typeof analysis.summary === 'string' ? 
            analysis.summary : 'Analysis unavailable',
          relatedNotes: Array.isArray(analysis.relatedNotes) ? 
            analysis.relatedNotes.slice(0, 5).filter((note: any) => typeof note === 'string') : [],
          formattingIssues: Array.isArray(analysis.formattingIssues) ? 
            analysis.formattingIssues.slice(0, 5).filter((issue: any) => typeof issue === 'string') : [],
        };
      } catch (parseError) {
        // Fallback parsing
        return this.extractAnalysisFromText(textContent);
      }
    } catch (error) {
      this.handleAPIError(error, 'analyzeContent');
    }
  }

  private extractAnalysisFromText(text: string): ContentAnalysis {
    // Enhanced fallback parsing for Claude responses
    try {
      // Try to extract JSON from various markdown formats
      const patterns = [
        /```json\s*([\s\S]*?)\s*```/i,
        /```\s*([\s\S]*?)\s*```/i,
        /\{[\s\S]*\}/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            const analysis = JSON.parse(match[1] || match[0]);
            if (analysis.suggestedTags || analysis.topics || analysis.summary) {
              return {
                suggestedTags: Array.isArray(analysis.suggestedTags) ? analysis.suggestedTags : [],
                topics: Array.isArray(analysis.topics) ? analysis.topics : [],
                summary: typeof analysis.summary === 'string' ? analysis.summary : '',
                relatedNotes: Array.isArray(analysis.relatedNotes) ? analysis.relatedNotes : [],
                formattingIssues: Array.isArray(analysis.formattingIssues) ? analysis.formattingIssues : [],
              };
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      // Continue to manual extraction
    }

    // Manual extraction as last resort
    return {
      suggestedTags: this.extractListFromText(text, [
        /suggested\s*tags?[:\-]?\s*([^\n]+)/i,
        /tags?[:\-]?\s*([^\n]+)/i
      ]),
      topics: this.extractListFromText(text, [
        /topics?[:\-]?\s*([^\n]+)/i,
        /main\s*topics?[:\-]?\s*([^\n]+)/i
      ]),
      summary: this.extractSummaryFromText(text),
      relatedNotes: this.extractListFromText(text, [
        /related\s*notes?[:\-]?\s*([^\n]+)/i,
        /connections?[:\-]?\s*([^\n]+)/i
      ]),
      formattingIssues: this.extractListFromText(text, [
        /formatting\s*issues?[:\-]?\s*([^\n]+)/i,
        /improvements?[:\-]?\s*([^\n]+)/i
      ]),
    };
  }

  private extractListFromText(text: string, regexes: RegExp[]): string[] {
    for (const regex of regexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1]
          .split(/[,;]/)
          .map(item => item.trim().replace(/^[-*•]\s*/, '').replace(/^["'`]|["'`]$/g, ''))
          .filter(item => item.length > 0 && item.length < 50)
          .slice(0, 5);
      }
    }
    return [];
  }

  private extractSummaryFromText(text: string): string {
    const summaryPatterns = [
      /summary[:\-]?\s*([^\.]+\.)/i,
      /brief\s*summary[:\-]?\s*([^\.]+\.)/i,
      /overview[:\-]?\s*([^\.]+\.)/i,
    ];

    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first meaningful sentence
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        return trimmed + '.';
      }
    }

    return text.slice(0, 150).trim() + '...';
  }

  /**
   * Get token count estimate for Claude models
   */
  getTokenEstimate(content: string): number {
    // Claude's tokenizer is roughly 3.5 characters per token
    return Math.ceil(content.length / 3.5);
  }

  /**
   * Check if content is within Claude model token limits
   */
  isWithinTokenLimit(content: string): boolean {
    const tokenCount = this.getTokenEstimate(content);
    
    // Different Claude models have different context windows
    const limits: Record<string, number> = {
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'claude-2.1': 200000,
      'claude-2.0': 100000,
    };

    const limit = limits[this.config.model] || 100000;
    return tokenCount <= limit * 0.8; // Use 80% of limit for safety
  }

  /**
   * Truncate content to fit within token limits
   */
  truncateToTokenLimit(content: string): string {
    if (this.isWithinTokenLimit(content)) return content;
    
    const maxTokens = 80000; // Conservative limit
    const maxChars = Math.floor(maxTokens * 3.5);
    
    if (content.length <= maxChars) return content;
    
    // Try to truncate at a paragraph boundary
    const truncated = content.slice(0, maxChars);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    
    return lastParagraph > maxChars * 0.7 ? 
      truncated.slice(0, lastParagraph) : 
      truncated + '\n\n[Content truncated...]';
  }

  /**
   * Test Claude-specific features
   */
  async testAdvancedFeatures(): Promise<{ xmlParsing: boolean; longContext: boolean }> {
    try {
      // Test XML parsing capability
      const xmlTest = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: '<test>Can you parse this XML?</test> Respond with "yes" if you can see the XML tags.'
          }
        ]
      });

      const xmlSupport = xmlTest.content.some(block => 
        block.type === 'text' && (block as any).text.toLowerCase().includes('yes')
      );

      return {
        xmlParsing: xmlSupport,
        longContext: this.isWithinTokenLimit('x'.repeat(100000))
      };
    } catch (error) {
      return { xmlParsing: false, longContext: false };
    }
  }

  /**
   * Validate the Anthropic configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('Anthropic API key is required');
    } else if (!this.config.apiKey.startsWith('sk-ant-')) {
      errors.push('Invalid Anthropic API key format');
    }

    if (!this.config.model) {
      errors.push('Anthropic model name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}