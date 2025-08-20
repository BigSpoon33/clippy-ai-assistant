/**
 * CLIPPY AI Assistant - Base AI Provider
 * Abstract base class for all AI providers
 */

import { AIProvider, ContentAnalysis } from '../types';
import { ContentSanitizer } from '../utils/secure-storage';

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  protected config: any;
  private lastRequestTime: number = 0;

  constructor(config: any = {}) {
    this.config = config;
  }

  /**
   * Check if the provider is available and configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Generate a response using the AI provider
   */
  abstract generateResponse(prompt: string, context?: string): Promise<string>;

  /**
   * Generate a streaming response using the AI provider
   * Returns an async generator that yields partial responses
   */
  generateStreamingResponse?(prompt: string, context?: string): AsyncGenerator<string, void, unknown>;

  /**
   * Analyze content and return structured analysis
   */
  abstract analyzeContent(content: string): Promise<ContentAnalysis>;

  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return { success: false, error: 'Provider not available' };
      }

      // Try a simple test request
      await this.generateResponse('Test connection', 'This is a simple connectivity test.');
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): any {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(newConfig: any): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Validate configuration
   */
  abstract validateConfig(): { valid: boolean; errors: string[] };

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
      streaming: this.generateStreamingResponse !== undefined,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Base implementation - override if needed
  }

  /**
   * Rate limiting helper
   */
  protected async checkRateLimit(maxRequestsPerMinute: number): Promise<void> {
    const now = Date.now();
    const minInterval = 60000 / maxRequestsPerMinute; // milliseconds between requests
    
    if (now - this.lastRequestTime < minInterval) {
      const waitTime = minInterval - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Enhanced content sanitization helper
   */
  protected sanitizeContent(content: string): string {
    // Remove potential API keys first
    let sanitized = ContentSanitizer.sanitizeContent(content);
    
    // Remove potential security risks
    sanitized = sanitized
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim()
      .slice(0, 100000); // Limit length to prevent excessive usage
    
    return sanitized;
  }

  /**
   * Error handling helper with sanitization
   */
  protected handleAPIError(error: any, context: string): never {
    const errorMessage = ContentSanitizer.sanitizeError(error);
    console.error(`CLIPPY ${this.name}: ${context} failed:`, errorMessage);
    throw new Error(`${this.name} API error: ${errorMessage}`);
  }

  /**
   * Default implementation for simple content analysis
   */
  protected async defaultAnalyzeContent(content: string): Promise<ContentAnalysis> {
    // Basic analysis if providers don't implement their own
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      suggestedTags: [],
      topics: [],
      summary: `Content contains ${words.length} words and ${sentences.length} sentences.`,
      relatedNotes: [],
      formattingIssues: []
    };
  }
}