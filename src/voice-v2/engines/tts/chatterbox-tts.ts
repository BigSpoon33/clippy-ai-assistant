/**
 * Chatterbox TTS Engine
 * OpenAI-compatible local TTS API (http://localhost:4123/v1)
 */

import { TTSEngine, TTSVoice, TTSConfig, TTSResult } from './tts-interface';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class ChatterboxTTSEngine extends TTSEngine {
  private baseUrl: string;
  private tempDir: string;

  constructor(config: TTSConfig, tempDir?: string) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:4123/v1';
    this.tempDir = tempDir || path.join(os.tmpdir(), 'clippy-voice');
  }

  getName(): string {
    return 'Chatterbox TTS';
  }

  getType(): 'local' | 'cloud' {
    return 'local';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || 'none'}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('[Chatterbox TTS] Service not available:', error);
      return false;
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || 'none'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Map Chatterbox models to voice format
        return data.data?.map((model: any) => ({
          id: model.id,
          name: model.id,
          language: 'en',
          gender: 'neutral' as const,
          description: `Chatterbox voice: ${model.id}`
        })) || [];
      }
    } catch (error) {
      console.error('[Chatterbox TTS] Failed to get voices:', error);
    }

    // Return default voices if API call fails
    return [
      {
        id: 'tts-1',
        name: 'Standard Voice',
        language: 'en',
        gender: 'neutral' as const,
        description: 'Chatterbox standard voice'
      },
      {
        id: 'tts-1-hd',
        name: 'HD Voice',
        language: 'en', 
        gender: 'neutral' as const,
        description: 'Chatterbox high-definition voice'
      }
    ];
  }

  async synthesize(text: string, outputFile?: string): Promise<TTSResult> {
    try {
      const model = this.config.model || 'tts-1';
      const voice = this.config.voice || 'alloy';
      
      console.log(`[Chatterbox TTS] Synthesizing with model: ${model}, voice: ${voice}`);

      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || 'none'}`
        },
        body: JSON.stringify({
          model: model,
          input: text,
          voice: voice,
          response_format: 'wav',
          speed: this.config.speed || 1.0
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Chatterbox API error: ${response.status} ${errorText}`
        };
      }

      // Save audio to file
      const audioBuffer = await response.arrayBuffer();
      const tempOutput = outputFile || path.join(this.tempDir, `chatterbox_speech_${Date.now()}.wav`);
      
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

    } catch (error) {
      console.error('[Chatterbox TTS] Synthesis failed:', error);
      return {
        success: false,
        error: `Synthesis error: ${error.message}`
      };
    }
  }

  async test(): Promise<boolean> {
    try {
      const result = await this.synthesize('Hello, this is a test of Chatterbox TTS.');
      return result.success;
    } catch (error) {
      console.error('[Chatterbox TTS] Test failed:', error);
      return false;
    }
  }
}