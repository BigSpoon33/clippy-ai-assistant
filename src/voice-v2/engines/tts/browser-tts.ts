/**
 * Browser TTS Engine
 * Uses Web Speech API for text-to-speech
 */

import { TTSEngine, TTSVoice, TTSConfig, TTSResult } from './tts-interface';

export class BrowserTTSEngine extends TTSEngine {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(config: TTSConfig) {
    super(config);
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
  }

  getName(): string {
    return 'Browser TTS';
  }

  getType(): 'local' | 'cloud' {
    return 'local';
  }

  async isAvailable(): Promise<boolean> {
    return 'speechSynthesis' in window;
  }

  private loadVoices(): void {
    // Load voices (may be async on some browsers)
    const loadVoicesHandler = () => {
      this.voices = this.synthesis.getVoices();
    };

    loadVoicesHandler();
    
    // Some browsers load voices asynchronously
    if (this.voices.length === 0) {
      this.synthesis.addEventListener('voiceschanged', loadVoicesHandler);
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    // Ensure voices are loaded
    if (this.voices.length === 0) {
      await new Promise(resolve => {
        const checkVoices = () => {
          this.voices = this.synthesis.getVoices();
          if (this.voices.length > 0) {
            resolve(undefined);
          } else {
            setTimeout(checkVoices, 100);
          }
        };
        checkVoices();
      });
    }

    return this.voices.map(voice => ({
      id: voice.name,
      name: voice.name,
      language: voice.lang,
      gender: this.guessGender(voice.name),
      description: `${voice.name} (${voice.lang})`
    }));
  }

  private guessGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    
    // Common patterns to guess gender
    if (name.includes('female') || name.includes('woman') || 
        name.includes('alice') || name.includes('samantha') || 
        name.includes('victoria') || name.includes('karen') ||
        name.includes('zira') || name.includes('hazel')) {
      return 'female';
    }
    
    if (name.includes('male') || name.includes('man') || 
        name.includes('alex') || name.includes('daniel') || 
        name.includes('david') || name.includes('mark') ||
        name.includes('rishi') || name.includes('tom')) {
      return 'male';
    }
    
    return 'neutral';
  }

  async synthesize(text: string, outputFile?: string): Promise<TTSResult> {
    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the selected voice
        const selectedVoice = this.voices.find(voice => 
          voice.name === this.config.voice || voice.name.includes(this.config.voice)
        );
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Apply settings
        if (this.config.speed) {
          utterance.rate = this.config.speed;
        }
        if (this.config.pitch) {
          utterance.pitch = this.config.pitch;
        }
        if (this.config.volume) {
          utterance.volume = this.config.volume;
        }

        utterance.onend = () => {
          resolve({
            success: true,
            // Browser TTS doesn't produce files, just plays audio
            audioFile: undefined
          });
        };

        utterance.onerror = (event) => {
          resolve({
            success: false,
            error: `Browser TTS error: ${event.error}`
          });
        };

        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        // Start speaking
        this.synthesis.speak(utterance);

      } catch (error) {
        resolve({
          success: false,
          error: `Browser TTS failed: ${error.message}`
        });
      }
    });
  }

  /**
   * Stop current speech
   */
  stop(): void {
    this.synthesis.cancel();
  }

  /**
   * Pause current speech
   */
  pause(): void {
    this.synthesis.pause();
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    this.synthesis.resume();
  }
}