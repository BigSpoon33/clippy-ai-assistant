/**
 * TTS Engine Interface
 * Defines common interface for all Text-to-Speech engines
 */

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  description?: string;
}

export interface TTSConfig {
  voice: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  apiKey?: string;
  modelPath?: string;
  quality?: 'low' | 'medium' | 'high';
  model?: string;
  baseUrl?: string;
  responseSplitting?: 'none' | 'sentences' | 'paragraphs';
}

export interface TTSResult {
  success: boolean;
  audioFile?: string;
  audioData?: ArrayBuffer;
  error?: string;
  duration?: number;
}

export abstract class TTSEngine {
  protected config: TTSConfig;
  
  constructor(config: TTSConfig) {
    this.config = config;
  }

  /**
   * Get engine name
   */
  abstract getName(): string;

  /**
   * Get engine type (local/cloud)
   */
  abstract getType(): 'local' | 'cloud';

  /**
   * Check if engine is available/configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get available voices for this engine
   */
  abstract getVoices(): Promise<TTSVoice[]>;

  /**
   * Synthesize text to speech
   */
  abstract synthesize(text: string, outputFile?: string): Promise<TTSResult>;

  /**
   * Test the engine with a simple phrase
   */
  async test(): Promise<boolean> {
    try {
      const result = await this.synthesize('Voice test successful');
      return result.success;
    } catch (error) {
      console.error(`TTS Engine ${this.getName()} test failed:`, error);
      return false;
    }
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };
  }
}