/**
 * CLIPPY AI Assistant - Provider Factory
 * Dynamic AI provider selection and instantiation with fallback handling
 */

import { ClippySettings, AIProvider, APIResponse } from '../types';
import { OllamaClient } from './ollama-client';
import { OpenAIClient } from './openai-client';
import { AnthropicClient } from './anthropic-client';
import { Notice } from 'obsidian';

export class ProviderFactory {
  private static instances: Map<string, AIProvider> = new Map();

  /**
   * Create AI provider based on settings with fallback handling
   * Implements factory pattern with graceful degradation
   */
  static async createProvider(settings: ClippySettings): Promise<AIProvider> {
    // Try primary provider first
    const primaryProvider = await this.tryCreateProvider(settings.aiProvider, settings);
    if (primaryProvider) {
      return primaryProvider;
    }

    // Fallback to next available provider
    const fallbackOrder: (keyof ClippySettings['providers'])[] = ['ollama', 'openai', 'anthropic'];
    
    for (const providerType of fallbackOrder) {
      if (providerType !== settings.aiProvider && settings.providers[providerType].enabled) {
        const fallbackProvider = await this.tryCreateProvider(providerType, settings);
        if (fallbackProvider) {
          new Notice(`CLIPPY: Falling back to ${providerType} provider`);
          return fallbackProvider;
        }
      }
    }

    throw new Error('No AI providers available. Please check your configuration.');
  }

  /**
   * Attempt to create a specific provider type
   */
  private static async tryCreateProvider(
    providerType: keyof ClippySettings['providers'],
    settings: ClippySettings
  ): Promise<AIProvider | null> {
    try {
      const cacheKey = `${providerType}-${JSON.stringify(settings.providers[providerType])}`;
      
      // Return cached instance if available
      if (this.instances.has(cacheKey)) {
        const cached = this.instances.get(cacheKey)!;
        if (await cached.isAvailable()) {
          return cached;
        } else {
          this.instances.delete(cacheKey);
        }
      }

      // Create new provider instance
      let provider: AIProvider;
      
      switch (providerType) {
        case 'ollama':
          provider = new OllamaClient(settings.providers.ollama);
          break;
        case 'openai':
          provider = new OpenAIClient(settings.providers.openai);
          break;
        case 'anthropic':
          provider = new AnthropicClient(settings.providers.anthropic);
          break;
        default:
          throw new Error(`Unknown provider type: ${providerType}`);
      }

      // Test availability before returning
      if (await provider.isAvailable()) {
        this.instances.set(cacheKey, provider);
        return provider;
      }

      return null;
    } catch (error) {
      console.warn(`CLIPPY: Failed to create ${providerType} provider:`, error);
      return null;
    }
  }

  /**
   * Get list of available providers
   */
  static async getAvailableProviders(settings: ClippySettings): Promise<string[]> {
    const available: string[] = [];
    
    for (const [providerType, config] of Object.entries(settings.providers)) {
      if (config.enabled) {
        const provider = await this.tryCreateProvider(
          providerType as keyof ClippySettings['providers'],
          settings
        );
        if (provider) {
          available.push(providerType);
        }
      }
    }
    
    return available;
  }

  /**
   * Test connection to a specific provider
   */
  static async testProvider(
    providerType: keyof ClippySettings['providers'],
    settings: ClippySettings
  ): Promise<APIResponse<boolean>> {
    try {
      const provider = await this.tryCreateProvider(providerType, settings);
      
      if (!provider) {
        return {
          success: false,
          error: `Failed to initialize ${providerType} provider`,
        };
      }

      const isAvailable = await provider.isAvailable();
      
      if (isAvailable) {
        // Test with a simple prompt
        const testResponse = await provider.generateResponse(
          'Hello! Please respond with "OK" to confirm the connection.',
          'This is a connection test.'
        );
        
        return {
          success: true,
          data: true,
          metadata: {
            provider: providerType,
            model: settings.providers[providerType].model,
          },
        };
      } else {
        return {
          success: false,
          error: `${providerType} provider is not available`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
      };
    }
  }

  /**
   * Clear provider cache (useful for settings changes)
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get cached provider if available
   */
  static getCachedProvider(settings: ClippySettings): AIProvider | null {
    const cacheKey = `${settings.aiProvider}-${JSON.stringify(settings.providers[settings.aiProvider])}`;
    return this.instances.get(cacheKey) || null;
  }
}

/**
 * Base class for AI provider implementations
 * Provides common functionality and error handling
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  protected rateLimitTracker: Map<string, number> = new Map();
  protected requestCount = 0;
  protected lastRequestTime = 0;

  abstract isAvailable(): Promise<boolean>;
  abstract generateResponse(prompt: string, context?: string): Promise<string>;
  abstract analyzeContent(content: string): Promise<import('../types').ContentAnalysis>;

  /**
   * Rate limiting helper
   */
  protected async checkRateLimit(requestsPerMinute: number = 60): Promise<void> {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > oneMinute) {
      this.requestCount = 0;
    }
    
    this.requestCount++;
    this.lastRequestTime = now;
    
    if (this.requestCount > requestsPerMinute) {
      const waitTime = oneMinute - (now - this.lastRequestTime);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  /**
   * Standard error handling for API calls
   */
  protected handleAPIError(error: any, operation: string): never {
    console.error(`CLIPPY ${this.name} ${operation} error:`, error);
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      throw new Error('Invalid API key. Please check your credentials.');
    } else if (error.status >= 500) {
      throw new Error('AI service temporarily unavailable. Please try again.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to AI service. Please check if it\'s running.');
    } else {
      throw new Error(`AI service error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Clean and validate content before sending to AI
   */
  protected sanitizeContent(content: string): string {
    // Remove or mask sensitive patterns
    let sanitized = content
      // Remove potential API keys or tokens
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[REDACTED]')
      // Remove email patterns
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      // Truncate if too long (most models have token limits)
      .slice(0, 10000);
    
    return sanitized.trim();
  }
}