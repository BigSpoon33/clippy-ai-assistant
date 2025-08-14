/**
 * CLIPPY AI Assistant - Base AI Provider
 * Abstract base class for all AI providers
 */

import { AIProvider, ContentAnalysis } from '../types';

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
      const testResponse = await this.generateResponse('Test connection', 'This is a simple connectivity test.');
      
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
      streaming: false,
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
   * Content sanitization helper
   */
  protected sanitizeContent(content: string): string {
    // Remove potential security risks
    return content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim()
      .slice(0, 100000); // Limit length to prevent excessive usage
  }

  /**
   * Error handling helper
   */
  protected handleAPIError(error: any, context: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`CLIPPY ${this.name}: ${context} failed:`, error);
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