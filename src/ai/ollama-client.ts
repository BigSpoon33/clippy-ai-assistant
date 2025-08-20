/**
 * CLIPPY AI Assistant - Ollama Client
 * Local AI provider using OpenAI-compatible API at http://localhost:11434/v1
 */

import { BaseAIProvider } from './base-provider';
import { ContentAnalysis } from '../types';

interface OllamaConfig {
  baseUrl: string;
  model: string;
  enabled: boolean;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OllamaMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OllamaClient extends BaseAIProvider {
  name = 'Ollama';
  protected config: OllamaConfig;
  private baseUrl: string;

  constructor(config: OllamaConfig) {
    super(config);
    this.config = config;
    // Ensure URL ends with /v1 for OpenAI compatibility
    this.baseUrl = config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test connection to Ollama server
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // Check if our specified model is available
      const models = data.data || [];
      const modelExists = models.some((model: any) => 
        model.id === this.config.model || model.id.includes(this.config.model)
      );

      return modelExists;
    } catch (error) {
      console.warn('CLIPPY Ollama: Connection test failed:', error);
      return false;
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      await this.checkRateLimit(30); // Conservative rate limit for local processing
      
      const sanitizedPrompt = this.sanitizeContent(prompt);
      const sanitizedContext = context ? this.sanitizeContent(context) : '';

      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: `You are CLIPPY, an AI assistant for Obsidian note management. 
You help users enhance their notes, suggest improvements, and organize information.
Be concise, helpful, and preserve the user's original intent.

${sanitizedContext ? `Context: ${sanitizedContext}` : ''}`,
        },
        {
          role: 'user',
          content: sanitizedPrompt,
        },
      ];

      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated');
      }

      return response.choices[0].message.content.trim();
    } catch (error) {
      this.handleAPIError(error, 'generateResponse');
    }
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    try {
      await this.checkRateLimit(20); // More conservative for analysis
      
      const sanitizedContent = this.sanitizeContent(content);
      
      const analysisPrompt = `Analyze this Obsidian note content and provide structured feedback:

CONTENT:
${sanitizedContent}

Please respond with a JSON object containing:
{
  "suggestedTags": ["tag1", "tag2"],
  "topics": ["topic1", "topic2"],
  "summary": "Brief summary of the content",
  "relatedNotes": ["potential related note titles"],
  "formattingIssues": ["formatting improvement suggestions"]
}

Focus on:
- Suggesting relevant tags based on content
- Identifying main topics and themes
- Creating a concise summary
- Recommending potential note connections
- Highlighting formatting improvements`;

      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: 'You are a content analysis assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ];

      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 800,
        stream: false,
      });

      const responseText = response.choices[0].message.content.trim();
      
      try {
        // Try to parse as JSON
        const analysis = JSON.parse(responseText);
        
        // Validate and provide defaults for missing fields
        return {
          suggestedTags: Array.isArray(analysis.suggestedTags) ? analysis.suggestedTags : [],
          topics: Array.isArray(analysis.topics) ? analysis.topics : [],
          summary: typeof analysis.summary === 'string' ? analysis.summary : 'No summary available',
          relatedNotes: Array.isArray(analysis.relatedNotes) ? analysis.relatedNotes : [],
          formattingIssues: Array.isArray(analysis.formattingIssues) ? analysis.formattingIssues : [],
        };
      } catch (parseError) {
        // Fallback: extract information from plain text response
        return this.extractAnalysisFromText(responseText);
      }
    } catch (error) {
      this.handleAPIError(error, 'analyzeContent');
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<OllamaResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Ollama doesn't require API key but accepts it for compatibility
          'Authorization': 'Bearer ollama',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }
      throw error;
    }
  }

  private extractAnalysisFromText(text: string): ContentAnalysis {
    // Fallback parsing for when the model doesn't return valid JSON
    const lines = text.split('\n');
    
    return {
      suggestedTags: this.extractArrayFromText(text, 'tag'),
      topics: this.extractArrayFromText(text, 'topic'),
      summary: this.extractSummaryFromText(text),
      relatedNotes: this.extractArrayFromText(text, 'note'),
      formattingIssues: this.extractArrayFromText(text, 'format'),
    };
  }

  private extractArrayFromText(text: string, keyword: string): string[] {
    const regex = new RegExp(`${keyword}[s]?[:\\-]?\\s*([^\\n]+)`, 'gi');
    const matches = text.match(regex);
    
    if (!matches) return [];
    
    return matches
      .flatMap(match => match.split(/[,;]/).map(item => item.trim()))
      .filter(item => item.length > 0)
      .slice(0, 5); // Limit to 5 items
  }

  private extractSummaryFromText(text: string): string {
    const summaryMatch = text.match(/summary[:\-]?\s*([^\.]+\.)/i);
    return summaryMatch ? summaryMatch[1].trim() : text.slice(0, 200) + '...';
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      const data = await response.json();
      
      return (data.data || []).map((model: any) => model.id);
    } catch (error) {
      console.warn('CLIPPY Ollama: Failed to fetch available models:', error);
      return [];
    }
  }

  /**
   * Check if a specific model is installed
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.some(model => model === modelName || model.includes(modelName));
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
      streaming: false, // Ollama streaming not implemented yet
      maxTokens: 8192 // Typical Ollama context window
    };
  }

  /**
   * Validate the Ollama configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseUrl) {
      errors.push('Ollama base URL is required');
    } else {
      try {
        new URL(this.config.baseUrl);
      } catch {
        errors.push('Invalid Ollama base URL format');
      }
    }

    if (!this.config.model) {
      errors.push('Ollama model name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}