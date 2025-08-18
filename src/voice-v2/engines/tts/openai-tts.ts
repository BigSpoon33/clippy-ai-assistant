/**
 * OpenAI TTS Engine
 * Configurable OpenAI-compatible TTS API (including Chatterbox, OpenAI, etc.)
 */

import { TTSEngine, TTSVoice, TTSConfig, TTSResult } from './tts-interface';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class OpenAITTSEngine extends TTSEngine {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private tempDir: string;

  constructor(config: TTSConfig, tempDir?: string) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'tts-1';
    this.tempDir = tempDir || path.join(os.tmpdir(), 'clippy-voice');
  }

  getName(): string {
    return 'OpenAI TTS';
  }

  getType(): 'local' | 'cloud' {
    // Determine if this is local or cloud based on URL
    return this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1') 
      ? 'local' 
      : 'cloud';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('[OpenAI TTS] Service not available:', error);
      return false;
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter for TTS models and map to voice format
        const ttsModels = data.data?.filter((model: any) => 
          model.id.includes('tts') || 
          model.id.toLowerCase().includes('voice') ||
          model.id.toLowerCase().includes('speech')
        ) || [];
        
        if (ttsModels.length > 0) {
          return ttsModels.map((model: any) => ({
            id: model.id,
            name: model.id,
            language: 'en',
            gender: 'neutral' as const,
            description: `OpenAI TTS voice: ${model.id}`
          }));
        }
      }
    } catch (error) {
      console.error('[OpenAI TTS] Failed to get voices:', error);
    }

    // Return standard OpenAI voices if API call fails or no models found
    return [
      {
        id: 'alloy',
        name: 'Alloy',
        language: 'en',
        gender: 'neutral' as const,
        description: 'Balanced and versatile voice'
      },
      {
        id: 'echo',
        name: 'Echo',
        language: 'en',
        gender: 'male' as const,
        description: 'Confident and engaging voice'
      },
      {
        id: 'fable',
        name: 'Fable',
        language: 'en',
        gender: 'neutral' as const,
        description: 'Expressive and storytelling voice'
      },
      {
        id: 'onyx',
        name: 'Onyx',
        language: 'en',
        gender: 'male' as const,
        description: 'Deep and authoritative voice'
      },
      {
        id: 'nova',
        name: 'Nova',
        language: 'en',
        gender: 'female' as const,
        description: 'Bright and energetic voice'
      },
      {
        id: 'shimmer',
        name: 'Shimmer',
        language: 'en',
        gender: 'female' as const,
        description: 'Gentle and soothing voice'
      }
    ];
  }

  async synthesize(text: string, outputFile?: string): Promise<TTSResult> {
    try {
      const voice = this.config.voice || 'alloy';
      const responseSplitting = this.config.responseSplitting || 'none';
      
      console.log(`[OpenAI TTS] Synthesizing with model: ${this.model}, voice: ${voice}, URL: ${this.baseUrl}, splitting: ${responseSplitting}`);

      // Split text if response splitting is enabled
      const textChunks = this.splitText(text, responseSplitting);
      
      if (textChunks.length === 1) {
        // Single chunk - synthesize directly
        return await this.synthesizeChunk(textChunks[0], outputFile);
      } else {
        // Multiple chunks - synthesize and combine
        return await this.synthesizeAndCombineChunks(textChunks, outputFile);
      }

    } catch (error) {
      console.error('[OpenAI TTS] Synthesis failed:', error);
      return {
        success: false,
        error: `Synthesis error: ${error.message}`
      };
    }
  }

  private splitText(text: string, splitting: 'none' | 'sentences' | 'paragraphs'): string[] {
    if (splitting === 'none') {
      return [text];
    }
    
    if (splitting === 'paragraphs') {
      return text.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 0);
    }
    
    if (splitting === 'sentences') {
      // Split on sentence boundaries (. ! ?) but keep the punctuation
      return text.split(/(?<=[.!?])\s+/).filter(chunk => chunk.trim().length > 0);
    }
    
    return [text];
  }

  private async synthesizeChunk(text: string, outputFile?: string): Promise<TTSResult> {
    const voice = this.config.voice || 'alloy';
    
    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: voice,
        response_format: 'wav',
        speed: this.config.speed || 1.0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS API error: ${response.status} ${errorText}`);
    }

    // Save audio to file
    const audioBuffer = await response.arrayBuffer();
    const tempOutput = outputFile || path.join(this.tempDir, `openai_speech_${Date.now()}.wav`);
    
    // Ensure directory exists
    const dir = path.dirname(tempOutput);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(tempOutput, Buffer.from(audioBuffer));

    return {
      success: true,
      audioFile: tempOutput
    };
  }

  private async synthesizeAndCombineChunks(chunks: string[], outputFile?: string): Promise<TTSResult> {
    try {
      console.log(`[OpenAI TTS] Processing ${chunks.length} text chunks`);
      
      const audioFiles: string[] = [];
      
      // Synthesize each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkFile = path.join(this.tempDir, `openai_chunk_${Date.now()}_${i}.wav`);
        
        const result = await this.synthesizeChunk(chunk, chunkFile);
        if (!result.success || !result.audioFile) {
          throw new Error(`Failed to synthesize chunk ${i}: ${result.error}`);
        }
        
        audioFiles.push(result.audioFile);
      }

      // For now, return the first audio file
      // TODO: Implement proper audio concatenation using ffmpeg or similar
      const finalOutput = outputFile || path.join(this.tempDir, `openai_combined_${Date.now()}.wav`);
      
      // Simple concatenation - copy first file as final output
      // In production, you'd want to properly concatenate audio
      if (audioFiles.length > 0) {
        fs.copyFileSync(audioFiles[0], finalOutput);
        
        // Clean up temporary chunk files
        for (const file of audioFiles) {
          try {
            if (file !== finalOutput) {
              fs.unlinkSync(file);
            }
          } catch (e) {
            console.warn('[OpenAI TTS] Failed to clean up chunk file:', file);
          }
        }
      }

      return {
        success: true,
        audioFile: finalOutput
      };

    } catch (error) {
      console.error('[OpenAI TTS] Failed to combine chunks:', error);
      return {
        success: false,
        error: `Chunk processing error: ${error.message}`
      };
    }
  }

  async test(): Promise<boolean> {
    try {
      const result = await this.synthesize('Hello, this is a test of OpenAI TTS.');
      return result.success;
    } catch (error) {
      console.error('[OpenAI TTS] Test failed:', error);
      return false;
    }
  }

  /**
   * Update configuration for OpenAI TTS
   */
  updateConfig(config: Partial<TTSConfig>): void {
    super.updateConfig(config);
    
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
    if (config.model) {
      this.model = config.model;
    }
  }
}