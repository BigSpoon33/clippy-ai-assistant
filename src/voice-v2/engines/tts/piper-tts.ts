/**
 * Piper TTS Engine
 * Local neural text-to-speech using Piper
 */

import { TTSEngine, TTSVoice, TTSConfig, TTSResult } from './tts-interface';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class PiperTTSEngine extends TTSEngine {
  private bridgePath: string;
  private pythonPath: string;
  private voiceAssistantPath: string;

  constructor(config: TTSConfig, bridgePath: string, pythonPath: string, voiceAssistantPath: string) {
    super(config);
    this.bridgePath = bridgePath;
    this.pythonPath = pythonPath;
    this.voiceAssistantPath = voiceAssistantPath;
  }

  getName(): string {
    return 'Piper TTS';
  }

  getType(): 'local' | 'cloud' {
    return 'local';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const scriptPath = path.join(this.bridgePath, 'piper_tts.py');
      return fs.existsSync(scriptPath);
    } catch (error) {
      return false;
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    // Common Piper voices - in production you'd query the actual available voices
    return [
      {
        id: 'en_US-amy-medium',
        name: 'Amy (US English)',
        language: 'en-US',
        gender: 'female',
        description: 'Clear American English voice'
      },
      {
        id: 'en_US-ryan-medium',
        name: 'Ryan (US English)',
        language: 'en-US', 
        gender: 'male',
        description: 'Natural American English voice'
      },
      {
        id: 'en_GB-alan-medium',
        name: 'Alan (UK English)',
        language: 'en-GB',
        gender: 'male',
        description: 'British English voice'
      },
      {
        id: 'en_GB-alba-medium',
        name: 'Alba (UK English)',
        language: 'en-GB',
        gender: 'female',
        description: 'British English voice'
      }
    ];
  }

  async synthesize(text: string, outputFile?: string): Promise<TTSResult> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.bridgePath, 'piper_tts.py');
      const tempOutput = outputFile || path.join(this.voiceAssistantPath, `speech_${Date.now()}.wav`);
      
      const args = [
        scriptPath,
        '--text', text,
        '--output', tempOutput,
        '--voice', this.config.voice || 'en_US-lessac-medium',
        '--speed', (this.config.speed || 1.0).toString(),
        '--output-json'
      ];

      console.log(`[Piper TTS] Executing: ${this.pythonPath} ${args.join(' ')}`);

      const childProcess = spawn(this.pythonPath, args, {
        cwd: this.voiceAssistantPath,
        env: {
          ...process.env,
          PYTHONPATH: this.voiceAssistantPath
        }
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data: any) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code: any) => {
        if (code !== 0) {
          resolve({
            success: false,
            error: `Piper TTS process failed (code ${code}): ${errorOutput}`
          });
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          resolve({
            success: result.success || false,
            audioFile: result.success ? tempOutput : undefined,
            error: result.error
          });
        } catch (e) {
          // If no JSON output, assume success if file exists
          if (fs.existsSync(tempOutput)) {
            resolve({
              success: true,
              audioFile: tempOutput
            });
          } else {
            resolve({
              success: false,
              error: `Piper TTS failed: ${errorOutput || 'Unknown error'}`
            });
          }
        }
      });

      childProcess.on('error', (error: any) => {
        resolve({
          success: false,
          error: `Process error: ${error.message}`
        });
      });
    });
  }
}