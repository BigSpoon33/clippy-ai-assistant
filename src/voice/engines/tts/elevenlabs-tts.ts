/**
 * ElevenLabs TTS Engine
 * Cloud-based text-to-speech using ElevenLabs API
 */

import { TTSEngine, TTSVoice, TTSConfig, TTSResult } from './tts-interface';
import * as fs from 'fs';
import * as path from 'path';

export class ElevenLabsTTSEngine extends TTSEngine {
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private tempDir: string;

  constructor(config: TTSConfig, tempDir: string) {
    super(config);
    this.tempDir = tempDir;
  }

  getName(): string {
    return 'ElevenLabs';
  }

  getType(): 'local' | 'cloud' {
    return 'cloud';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.config.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'en',
        gender: voice.labels?.gender || 'neutral',
        description: voice.description || `${voice.name} voice`
      }));
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      return [
        // Default voices if API call fails
        {
          id: 'rachel',
          name: 'Rachel',
          language: 'en-US',
          gender: 'female',
          description: 'Calm, warm voice'
        },
        {
          id: 'drew',
          name: 'Drew',
          language: 'en-US',
          gender: 'male',
          description: 'Well-rounded voice'
        }
      ];
    }
  }

  async synthesize(text: string, outputFile?: string): Promise<TTSResult> {
    if (!this.config.apiKey) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured'
      };
    }

    try {
      const voiceId = this.config.voice || 'rachel';
      const tempOutput = outputFile || path.join(this.tempDir, `elevenlabs_${Date.now()}.mp3`);

      console.log(`[ElevenLabs TTS] Synthesizing with voice: ${voiceId}`);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      // Write to file
      const buffer = Buffer.from(audioBuffer);
      await fs.promises.writeFile(tempOutput, buffer);

      return {
        success: true,
        audioFile: tempOutput,
        audioData: audioBuffer
      };

    } catch (error) {
      console.error('ElevenLabs TTS synthesis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}