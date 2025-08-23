/**
 * TTS Manager
 * Manages multiple TTS engines and provides unified interface
 */

import { ClippySettings } from '../types';
import { TTSEngine, TTSConfig, TTSResult } from './engines/tts/tts-interface';
import { PiperTTSEngine } from './engines/tts/piper-tts';
import { ElevenLabsTTSEngine } from './engines/tts/elevenlabs-tts';
import { OpenAITTSEngine } from './engines/tts/openai-tts';
import * as path from 'path';
import * as os from 'os';

export class TTSManager {
  private engines: Map<string, TTSEngine> = new Map();
  private currentEngine: TTSEngine | null = null;
  private settings: ClippySettings;
  private bridgePath: string;
  private pythonPath: string;
  private voiceAssistantPath: string;
  private tempDir: string;

  constructor(
    settings: ClippySettings,
    bridgePath: string, 
    pythonPath: string,
    voiceAssistantPath: string
  ) {
    this.settings = settings;
    this.bridgePath = bridgePath;
    this.pythonPath = pythonPath;
    this.voiceAssistantPath = voiceAssistantPath;
    this.tempDir = path.join(os.tmpdir(), 'clippy-voice');
    
    this.initializeEngines();
  }

  private initializeEngines(): void {
    try {
      console.log('[TTS Manager] Initializing TTS engines...');

      // Initialize Piper TTS
      const piperConfig: TTSConfig = {
        voice: this.settings.voice?.ttsVoice || 'en_US-lessac-medium',
        speed: 1.0,
        volume: 0.8
      };
      this.engines.set('piper', new PiperTTSEngine(
        piperConfig, 
        this.bridgePath, 
        this.pythonPath, 
        this.voiceAssistantPath
      ));

      // Initialize ElevenLabs TTS
      const elevenlabsConfig: TTSConfig = {
        voice: this.settings.voice?.ttsVoice || 'rachel',
        apiKey: this.settings.voice?.elevenlabsApiKey,
        quality: 'high'
      };
      this.engines.set('elevenlabs', new ElevenLabsTTSEngine(elevenlabsConfig, this.tempDir));

      // Initialize OpenAI TTS (configurable URL/API)
      const openaiConfig: TTSConfig = {
        voice: this.settings.voice?.openaiTts?.voice || 'alloy',
        model: this.settings.voice?.openaiTts?.model || 'tts-1',
        baseUrl: this.settings.voice?.openaiTts?.baseUrl || 'http://localhost:4123/v1',
        apiKey: this.settings.voice?.openaiTts?.apiKey || 'none',
        responseSplitting: this.settings.voice?.openaiTts?.responseSplitting || 'paragraphs',
        speed: 1.0,
        volume: 0.8
      };
      this.engines.set('openai', new OpenAITTSEngine(openaiConfig, this.tempDir));

      console.log(`[TTS Manager] Initialized ${this.engines.size} TTS engines`);

      // Set current engine with fallback (async)
      this.initializeDefaultEngine();

    } catch (error) {
      console.error('[TTS Manager] Failed to initialize engines:', error);
    }
  }

  /**
   * Initialize default engine asynchronously
   */
  private async initializeDefaultEngine(): Promise<void> {
    const desiredEngine = this.settings.voice?.ttsEngine || 'piper';
    
    if (await this.setEngine(desiredEngine)) {
      return;
    }
    
    // If desired engine fails, try fallbacks
    const fallbacks = ['piper', 'elevenlabs', 'openai'];
    for (const engine of fallbacks) {
      if (this.engines.has(engine) && await this.setEngine(engine)) {
        console.log(`[TTS Manager] Fallback to ${engine} engine successful`);
        return;
      }
    }
    
    console.error('[TTS Manager] No working TTS engines found');
  }

  /**
   * Set the active TTS engine
   */
  async setEngine(engineName: string): Promise<boolean> {
    const engine = this.engines.get(engineName);
    if (!engine) {
      console.error(`[TTS Manager] Engine not found: ${engineName}`);
      return false;
    }

    try {
      const isAvailable = await engine.isAvailable();
      if (!isAvailable) {
        console.warn(`[TTS Manager] Engine not available: ${engineName}`);
        return false;
      }

      this.currentEngine = engine;
      console.log(`[TTS Manager] Active engine set to: ${engineName}`);
      return true;
    } catch (error) {
      console.error(`[TTS Manager] Failed to set engine ${engineName}:`, error);
      return false;
    }
  }

  /**
   * Synthesize text using current engine with automatic fallback
   */
  async speak(text: string): Promise<boolean> {
    if (!this.currentEngine) {
      console.error('[TTS Manager] No active TTS engine');
      await this.initializeDefaultEngine(); // Try to initialize again
      if (!this.currentEngine) {
        return false;
      }
    }

    const currentEngineName = this.currentEngine.getName();

    try {
      console.log(`[TTS Manager] Speaking with ${currentEngineName}: "${text.substring(0, 50)}..."`);
      
      const result = await this.currentEngine.synthesize(text);
      
      if (result.success) {
        // If we have an audio file, play it
        if (result.audioFile) {
          await this.playAudioFile(result.audioFile);
        }
        return true;
      } else {
        console.warn(`[TTS Manager] ${currentEngineName} synthesis failed: ${result.error}. Trying fallback...`);
        return await this.speakWithFallback(text, currentEngineName);
      }
    } catch (error) {
      console.warn(`[TTS Manager] ${currentEngineName} synthesis error: ${error.message}. Trying fallback...`);
      return await this.speakWithFallback(text, currentEngineName);
    }
  }

  /**
   * Attempt speech synthesis with fallback engines
   */
  private async speakWithFallback(text: string, failedEngine: string): Promise<boolean> {
    const fallbackOrder = ['piper', 'elevenlabs', 'openai'];
    
    for (const engineName of fallbackOrder) {
      // Skip the engine that just failed
      if (engineName === failedEngine.toLowerCase() || !this.engines.has(engineName)) {
        continue;
      }

      const engine = this.engines.get(engineName);
      if (!engine) continue;

      try {
        // Test if engine is available before switching
        if (!(await engine.isAvailable())) {
          console.warn(`[TTS Manager] Fallback engine ${engineName} not available, skipping`);
          continue;
        }

        console.log(`[TTS Manager] Fallback: Switching to ${engineName} engine`);
        this.currentEngine = engine;
        
        const result = await engine.synthesize(text);
        
        if (result.success) {
          console.log(`[TTS Manager] Fallback to ${engineName} successful`);
          if (result.audioFile) {
            await this.playAudioFile(result.audioFile);
          }
          return true;
        } else {
          console.warn(`[TTS Manager] Fallback engine ${engineName} also failed: ${result.error}`);
        }
      } catch (error) {
        console.warn(`[TTS Manager] Fallback engine ${engineName} error: ${error.message}`);
      }
    }

    console.error('[TTS Manager] All TTS engines failed, speech synthesis aborted');
    return false;
  }

  /**
   * Get available voices for current engine
   */
  async getAvailableVoices(): Promise<Array<{id: string, name: string, language: string}>> {
    if (!this.currentEngine) {
      return [];
    }

    try {
      return await this.currentEngine.getVoices();
    } catch (error) {
      console.error('[TTS Manager] Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Get comprehensive list of all voices from all engines
   */
  async getAllAvailableVoices(): Promise<{
    engines: Array<{
      name: string;
      type: 'local' | 'cloud';
      isAvailable: boolean;
      voices: Array<{id: string, name: string, language: string, gender?: string, description?: string}>;
      error?: string;
    }>;
    summary: {
      totalEngines: number;
      availableEngines: number;
      totalVoices: number;
    };
  }> {
    const results = {
      engines: [] as any[],
      summary: {
        totalEngines: 0,
        availableEngines: 0,
        totalVoices: 0
      }
    };

    console.log('[TTS Manager] Querying all engines for available voices...');

    for (const [engineId, engine] of this.engines.entries()) {
      results.summary.totalEngines++;
      
      const engineResult = {
        name: engine.getName(),
        type: engine.getType(),
        isAvailable: false,
        voices: [] as any[],
        error: undefined as string | undefined
      };

      try {
        // Test if engine is available
        engineResult.isAvailable = await engine.isAvailable();
        
        if (engineResult.isAvailable) {
          results.summary.availableEngines++;
          
          // Get voices from this engine
          const voices = await engine.getVoices();
          engineResult.voices = voices;
          results.summary.totalVoices += voices.length;
          
          console.log(`[TTS Manager] ${engine.getName()}: ${voices.length} voices available`);
        } else {
          console.log(`[TTS Manager] ${engine.getName()}: Engine not available`);
        }
      } catch (error) {
        engineResult.error = error.message;
        console.warn(`[TTS Manager] ${engine.getName()}: Error querying voices - ${error.message}`);
      }

      results.engines.push(engineResult);
    }

    console.log(`[TTS Manager] Voice query complete: ${results.summary.availableEngines}/${results.summary.totalEngines} engines, ${results.summary.totalVoices} total voices`);
    return results;
  }

  /**
   * Get voices formatted for console display
   */
  async getVoicesReport(): Promise<string> {
    const voiceData = await this.getAllAvailableVoices();
    
    let report = `🎤 TTS Voice Report\n`;
    report += `═══════════════════════════════════════\n`;
    report += `📊 Summary: ${voiceData.summary.availableEngines}/${voiceData.summary.totalEngines} engines available, ${voiceData.summary.totalVoices} total voices\n\n`;

    for (const engine of voiceData.engines) {
      const statusIcon = engine.isAvailable ? '✅' : '❌';
      const typeIcon = engine.type === 'local' ? '🏠' : '☁️';
      
      report += `${statusIcon} ${typeIcon} ${engine.name} (${engine.type})\n`;
      
      if (engine.error) {
        report += `   ⚠️  Error: ${engine.error}\n`;
      } else if (engine.isAvailable && engine.voices.length > 0) {
        report += `   📢 ${engine.voices.length} voices available:\n`;
        
        for (const voice of engine.voices) {
          const genderIcon = voice.gender === 'female' ? '👩' : voice.gender === 'male' ? '👨' : '🎭';
          report += `      ${genderIcon} ${voice.id} - ${voice.name} (${voice.language})\n`;
          if (voice.description) {
            report += `         💬 ${voice.description}\n`;
          }
        }
      } else if (engine.isAvailable) {
        report += `   ℹ️  No voices configured\n`;
      } else {
        report += `   ❌ Engine not available\n`;
      }
      
      report += `\n`;
    }

    return report;
  }

  /**
   * Get list of available engines
   */
  getAvailableEngines(): Array<{id: string, name: string, type: 'local' | 'cloud'}> {
    return Array.from(this.engines.entries()).map(([id, engine]) => ({
      id,
      name: engine.getName(),
      type: engine.getType()
    }));
  }

  /**
   * Test current engine
   */
  async testCurrentEngine(): Promise<boolean> {
    if (!this.currentEngine) {
      return false;
    }

    try {
      return await this.currentEngine.test();
    } catch (error) {
      console.error('[TTS Manager] Engine test failed:', error);
      return false;
    }
  }

  /**
   * Update engine configuration
   */
  updateSettings(settings: ClippySettings): void {
    this.settings = settings;
    
    // Update current engine config if it exists
    if (this.currentEngine) {
      const config: TTSConfig = {
        voice: settings.voice?.ttsVoice || 'en_US-lessac-medium',
        apiKey: settings.voice?.elevenlabsApiKey,
        model: settings.voice?.openaiTts?.model,
        baseUrl: settings.voice?.openaiTts?.baseUrl,
        responseSplitting: settings.voice?.openaiTts?.responseSplitting,
        speed: 1.0,
        volume: 0.8
      };
      
      // For OpenAI engine, use specific OpenAI settings
      if (this.currentEngine.getName() === 'OpenAI TTS') {
        config.voice = settings.voice?.openaiTts?.voice || 'alloy';
        config.apiKey = settings.voice?.openaiTts?.apiKey || '';
      }
      
      this.currentEngine.updateConfig(config);
    }

    // Switch engine if needed
    const desiredEngine = settings.voice?.ttsEngine || 'piper';
    
    // Check if desired engine exists, fall back to available engines if not
    if (this.engines.has(desiredEngine)) {
      if (!this.currentEngine || this.currentEngine.getName() !== this.getEngineByName(desiredEngine)?.getName()) {
        this.setEngine(desiredEngine).catch(err => 
          console.error(`[TTS Manager] Failed to set engine ${desiredEngine}:`, err)
        );
      }
    } else {
      console.warn(`[TTS Manager] Desired engine '${desiredEngine}' not available, falling back to available engine`);
      this.initializeDefaultEngine().catch(err => 
        console.error('[TTS Manager] Failed to initialize fallback engine:', err)
      );
    }
  }

  /**
   * Get engine by name
   */
  private getEngineByName(name: string): TTSEngine | undefined {
    return this.engines.get(name);
  }

  /**
   * Play audio file with browser-compatible fallback for spectrum visualization
   */
  private async playAudioFile(filePath: string): Promise<void> {
    // Try browser audio first (for spectrum visualizer compatibility)
    if (typeof window !== 'undefined' && this.canUseBrowserAudio()) {
      console.log('[TTS Manager] Attempting browser audio playback for spectrum visualization');
      try {
        await this.playAudioInBrowser(filePath);
        console.log('[TTS Manager] Browser audio playback completed successfully');
        return;
      } catch (error) {
        console.warn('[TTS Manager] Browser audio failed, falling back to system audio:', error.message);
      }
    } else {
      console.log('[TTS Manager] Browser audio not available, using system audio');
    }

    // Fallback to system audio player
    console.log('[TTS Manager] Using system audio playback');
    return this.playAudioFileSystem(filePath);
  }

  /**
   * Play audio in browser (compatible with spectrum visualizer)
   */
  private async playAudioInBrowser(filePath: string): Promise<void> {
    try {
      // Read the audio file and create a blob URL
      const audioBlob = await this.readAudioFileAsBlob(filePath);
      const blobUrl = URL.createObjectURL(audioBlob);
      
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        
        audio.addEventListener('loadeddata', () => {
          console.log('[TTS Manager] Audio loaded successfully, emitting onAudioReady');
          // Emit event for spectrum visualizer with real audio element
          if (this.onAudioReady) {
            this.onAudioReady(audio, filePath);
          }
        });
        
        audio.addEventListener('play', () => {
          console.log('[TTS Manager] Browser audio started playing');
        });
        
        audio.addEventListener('pause', () => {
          console.log('[TTS Manager] Browser audio paused');
        });
        
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(blobUrl); // Clean up blob URL
          resolve();
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(blobUrl); // Clean up blob URL
          reject(new Error(`Browser audio playback failed for: ${filePath}`));
        });
        
        audio.src = blobUrl;
        audio.load();
        audio.play().catch(err => {
          URL.revokeObjectURL(blobUrl);
          reject(err);
        });
      });
    } catch (error) {
      throw new Error(`Failed to create audio blob: ${error.message}`);
    }
  }

  /**
   * Read audio file as blob for browser playback
   */
  private async readAudioFileAsBlob(filePath: string): Promise<Blob> {
    // Use Node.js fs in Electron environment
    const fs = require('fs').promises;
    
    try {
      const data = await fs.readFile(filePath);
      // Create blob from buffer with proper MIME type
      const blob = new Blob([data], { type: 'audio/wav' });
      return blob;
    } catch (error) {
      throw new Error(`Failed to read audio file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Play audio file using system audio
   */
  private async playAudioFileSystem(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use different audio players based on platform
      const { spawn } = require('child_process');
      const os = require('os');
      const platform = os.platform();

      let command = '';
      let args: string[] = [];

      switch (platform) {
        case 'darwin': // macOS
          command = 'afplay';
          args = [filePath];
          break;
        case 'linux':
          // Try different players in order of preference
          command = 'paplay'; // PulseAudio
          args = [filePath];
          break;
        case 'win32': // Windows
          command = 'powershell';
          args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
          break;
        default:
          reject(new Error(`Unsupported platform: ${platform}`));
          return;
      }

      console.log(`[TTS Manager] Playing audio: ${command} ${args.join(' ')}`);

      const player = spawn(command, args);
      
      player.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio player exited with code ${code}`));
        }
      });

      player.on('error', (error: Error) => {
        reject(new Error(`Failed to play audio: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        player.kill();
        reject(new Error('Audio playback timeout'));
      }, 30000);
    });
  }

  /**
   * Check if browser audio is available
   */
  private canUseBrowserAudio(): boolean {
    try {
      const canUse = !!(window.Audio && window.URL && window.URL.createObjectURL);
      console.log('[TTS Manager] Browser audio capability check:', canUse);
      return canUse;
    } catch (error) {
      console.log('[TTS Manager] Browser audio capability check failed:', error);
      return false;
    }
  }

  /**
   * Callback for when audio is ready (for spectrum visualizer)
   */
  private onAudioReady?: (audio: HTMLAudioElement, filePath: string) => void;

  /**
   * Set audio ready callback for spectrum visualizer integration
   */
  public setAudioReadyCallback(callback: (audio: HTMLAudioElement, filePath: string) => void): void {
    this.onAudioReady = callback;
  }

  /**
   * Get current engine info
   */
  getCurrentEngineInfo(): { name: string; type: 'local' | 'cloud' } | null {
    if (!this.currentEngine) {
      return null;
    }

    return {
      name: this.currentEngine.getName(),
      type: this.currentEngine.getType()
    };
  }

  /**
   * Console command to display all available voices
   * Usage: await window.clippy?.tts?.listAllVoices()
   */
  async listAllVoices(): Promise<void> {
    console.log('🔍 Querying all TTS engines for available voices...\n');
    
    try {
      const report = await this.getVoicesReport();
      console.log(report);
      
      // Also log the raw data for programmatic access
      const voiceData = await this.getAllAvailableVoices();
      console.log('📋 Raw voice data (for debugging):', voiceData);
      
    } catch (error) {
      console.error('❌ Failed to query voices:', error);
    }
  }

  /**
   * Console command to test a specific voice
   * Usage: await window.clippy?.tts?.testVoice('en_US-lessac-medium', 'Hello, this is a test')
   */
  async testVoice(voiceId: string, testText: string = 'Hello, this is a voice test.'): Promise<boolean> {
    console.log(`🎤 Testing voice: ${voiceId}`);
    
    // Save current settings
    const currentVoice = this.settings.voice?.ttsVoice;
    
    try {
      // Temporarily set the voice
      if (this.settings.voice) {
        this.settings.voice.ttsVoice = voiceId;
      }
      
      // Update current engine config
      this.updateSettings(this.settings);
      
      // Test speech
      const success = await this.speak(testText);
      
      if (success) {
        console.log(`✅ Voice test successful: ${voiceId}`);
      } else {
        console.log(`❌ Voice test failed: ${voiceId}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`❌ Voice test error for ${voiceId}:`, error);
      return false;
    } finally {
      // Restore original voice
      if (this.settings.voice && currentVoice) {
        this.settings.voice.ttsVoice = currentVoice;
        this.updateSettings(this.settings);
      }
    }
  }
}