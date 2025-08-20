// Note: ElevenLabs integration will be implemented when package is available
// import { ElevenLabsApi, play } from '@elevenlabs/elevenlabs-js';
import { ClippyErrorBoundaries } from '../error-boundaries';
import type { ClippySettings, VoiceState } from '../types';

/**
 * TTS Engine types for different providers
 */
export type TTSEngine = 'elevenlabs' | 'browser' | 'kokoro' | 'chatterbox';

/**
 * Voice synthesis options for customization
 */
export interface VoiceSynthesisOptions {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    stability?: number;
    similarity?: number;
    model?: string;
    language?: string;
}

/**
 * TTS Provider interface for consistent implementation
 */
export interface TTSProvider {
    initialize(apiKey?: string): Promise<void>;
    synthesize(text: string, options?: VoiceSynthesisOptions): Promise<AudioBuffer | ArrayBuffer>;
    getVoices(): Promise<string[]>;
    isAvailable(): boolean;
    cleanup(): Promise<void>;
}

/**
 * ElevenLabs TTS Provider implementation (placeholder until package is available)
 */
class ElevenLabsProvider implements TTSProvider {
    private apiKey: string = '';

    async initialize(apiKey?: string): Promise<void> {
        if (!apiKey) {
            throw new Error('ElevenLabs API key required');
        }
        
        this.apiKey = apiKey;
        // TODO: Initialize ElevenLabs client when package is available
    }

    async synthesize(text: string, options: VoiceSynthesisOptions = {}): Promise<ArrayBuffer> {
        // Placeholder implementation - will use fetch API directly when needed
        throw new Error('ElevenLabs TTS not fully implemented yet - using browser TTS instead');
    }

    async getVoices(): Promise<string[]> {
        return [];
    }

    isAvailable(): boolean {
        return false; // Disabled until package is available
    }

    async cleanup(): Promise<void> {
        this.apiKey = '';
    }
}

/**
 * Browser Speech Synthesis Provider implementation
 */
class BrowserSpeechProvider implements TTSProvider {
    private synth: SpeechSynthesis | null = null;
    private voices: SpeechSynthesisVoice[] = [];

    async initialize(): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Speech synthesis not supported');
        }

        this.synth = window.speechSynthesis;
        
        // Wait for voices to load
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = this.synth!.getVoices();
                if (this.voices.length > 0) {
                    resolve();
                } else {
                    // Voices might not be loaded yet, wait a bit
                    setTimeout(loadVoices, 100);
                }
            };
            
            if (this.synth!.onvoiceschanged !== undefined) {
                this.synth!.onvoiceschanged = loadVoices;
            }
            loadVoices();
        });
    }

    async synthesize(text: string, options: VoiceSynthesisOptions = {}): Promise<AudioBuffer> {
        if (!this.synth) {
            throw new Error('Speech synthesis not initialized');
        }

        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Find requested voice or use default
            if (options.voice) {
                const voice = this.voices.find(v => 
                    v.name.toLowerCase().includes(options.voice!.toLowerCase()) ||
                    v.voiceURI.toLowerCase().includes(options.voice!.toLowerCase())
                );
                if (voice) {
                    utterance.voice = voice;
                }
            }

            // Apply voice settings
            utterance.rate = Math.max(0.1, Math.min(10, options.rate || 1));
            utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1));
            utterance.volume = Math.max(0, Math.min(1, options.volume || 1));

            // Set up event handlers
            utterance.onend = () => {
                // Browser synthesis doesn't return AudioBuffer, 
                // so we create empty one for consistency
                const audioContext = new AudioContext();
                const buffer = audioContext.createBuffer(1, 44100, 44100);
                resolve(buffer);
            };

            utterance.onerror = (event: any) => {
                reject(new Error(`Speech synthesis failed: ${event.error}`));
            };

            // Start synthesis
            this.synth.speak(utterance);
        });
    }

    async getVoices(): Promise<string[]> {
        return this.voices.map(voice => voice.name);
    }

    isAvailable(): boolean {
        return typeof window !== 'undefined' && 
               'speechSynthesis' in window && 
               'SpeechSynthesisUtterance' in window;
    }

    async cleanup(): Promise<void> {
        if (this.synth) {
            this.synth.cancel();
            this.synth = null;
        }
        this.voices = [];
    }
}

/**
 * Placeholder providers for future implementation
 */
class KokoroProvider implements TTSProvider {
    async initialize(): Promise<void> {
        throw new Error('Kokoro TTS not implemented yet');
    }

    async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<AudioBuffer> {
        throw new Error('Kokoro TTS not implemented yet');
    }

    async getVoices(): Promise<string[]> {
        return [];
    }

    isAvailable(): boolean {
        return false;
    }

    async cleanup(): Promise<void> {
        // No-op
    }
}

class ChatterboxProvider implements TTSProvider {
    async initialize(): Promise<void> {
        throw new Error('Chatterbox TTS not implemented yet');
    }

    async synthesize(text: string, options?: VoiceSynthesisOptions): Promise<AudioBuffer> {
        throw new Error('Chatterbox TTS not implemented yet');
    }

    async getVoices(): Promise<string[]> {
        return [];
    }

    isAvailable(): boolean {
        return false;
    }

    async cleanup(): Promise<void> {
        // No-op
    }
}

/**
 * Main Text-to-Speech Engine with multi-provider support
 */
export class TextToSpeech {
    private settings: ClippySettings;
    private currentProvider: TTSProvider | null = null;
    private audioContext: AudioContext | null = null;
    private providers: Map<TTSEngine, TTSProvider>;
    private isInitialized: boolean = false;

    constructor(settings: ClippySettings) {
        this.settings = settings;
        this.providers = new Map<TTSEngine, TTSProvider>([
            ['elevenlabs', new ElevenLabsProvider()],
            ['browser', new BrowserSpeechProvider()],
            ['kokoro', new KokoroProvider()],
            ['chatterbox', new ChatterboxProvider()]
        ]);
    }

    /**
     * Initialize the TTS engine with current settings
     */
    async initialize(): Promise<void> {
        try {
            // Initialize audio context
            this.audioContext = new AudioContext();
            
            // Get the configured TTS engine
            const engine = this.settings.voice.ttsEngine;
            const provider = this.providers.get(engine);
            
            if (!provider) {
                throw new Error(`TTS engine '${engine}' not found`);
            }

            if (!provider.isAvailable()) {
                // Fallback to browser synthesis
                const fallbackProvider = this.providers.get('browser');
                if (fallbackProvider && fallbackProvider.isAvailable()) {
                    console.warn(`TTS engine '${engine}' not available, falling back to browser synthesis`);
                    this.currentProvider = fallbackProvider;
                    await this.currentProvider.initialize();
                } else {
                    throw new Error(`TTS engine '${engine}' not available and no fallback found`);
                }
            } else {
                this.currentProvider = provider;
                
                // Initialize with API key if needed
                const apiKey = engine === 'elevenlabs' ? this.settings.voice.elevenLabsApiKey : undefined;
                await this.currentProvider.initialize(apiKey);
            }

            this.isInitialized = true;
            console.log(`TTS initialized with engine: ${engine}`);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.initialize');
            throw error;
        }
    }

    /**
     * Convert text to speech and play it
     */
    async speak(text: string, options: VoiceSynthesisOptions = {}): Promise<void> {
        if (!this.isInitialized || !this.currentProvider) {
            throw new Error('TTS engine not initialized');
        }

        try {
            // Apply user preferences to options
            const finalOptions: VoiceSynthesisOptions = {
                voice: options.voice || this.settings.voice.selectedVoice,
                rate: options.rate || this.settings.voice.speechRate,
                pitch: options.pitch || this.settings.voice.speechPitch,
                volume: options.volume || this.settings.voice.speechVolume,
                ...options
            };

            // Synthesize speech
            const audioData = await this.currentProvider.synthesize(text, finalOptions);
            
            // Play audio
            await this.playAudio(audioData);
            
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.speak');
            throw error;
        }
    }

    /**
     * Convert text to speech without playing (for processing/saving)
     */
    async synthesize(text: string, options: VoiceSynthesisOptions = {}): Promise<AudioBuffer | ArrayBuffer> {
        if (!this.isInitialized || !this.currentProvider) {
            throw new Error('TTS engine not initialized');
        }

        try {
            const finalOptions: VoiceSynthesisOptions = {
                voice: options.voice || this.settings.voice.selectedVoice,
                rate: options.rate || this.settings.voice.speechRate,
                pitch: options.pitch || this.settings.voice.speechPitch,
                volume: options.volume || this.settings.voice.speechVolume,
                ...options
            };

            return await this.currentProvider.synthesize(text, finalOptions);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.synthesize');
            throw error;
        }
    }

    /**
     * Get available voices for current provider
     */
    async getAvailableVoices(): Promise<string[]> {
        if (!this.currentProvider) {
            return [];
        }

        try {
            return await this.currentProvider.getVoices();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.getAvailableVoices');
            return [];
        }
    }

    /**
     * Switch to a different TTS engine
     */
    async switchEngine(engine: TTSEngine): Promise<void> {
        try {
            // Clean up current provider
            if (this.currentProvider) {
                await this.currentProvider.cleanup();
            }

            // Update settings
            this.settings.voice.ttsEngine = engine;
            
            // Re-initialize with new engine
            this.isInitialized = false;
            await this.initialize();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.switchEngine');
            throw error;
        }
    }

    /**
     * Check if TTS is currently speaking
     */
    isSpeaking(): boolean {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            return window.speechSynthesis.speaking;
        }
        return false;
    }

    /**
     * Stop current speech synthesis
     */
    async stop(): Promise<void> {
        try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.stop');
        }
    }

    /**
     * Update settings and reinitialize if needed
     */
    async updateSettings(newSettings: ClippySettings): Promise<void> {
        const engineChanged = newSettings.voice.ttsEngine !== this.settings.voice.ttsEngine;
        this.settings = newSettings;

        if (engineChanged && this.isInitialized) {
            await this.initialize();
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        try {
            if (this.currentProvider) {
                await this.currentProvider.cleanup();
                this.currentProvider = null;
            }

            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            this.isInitialized = false;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'TextToSpeech.cleanup');
        }
    }

    /**
     * Play audio data through Web Audio API
     */
    private async playAudio(audioData: AudioBuffer | ArrayBuffer): Promise<void> {
        if (!this.audioContext) {
            throw new Error('Audio context not initialized');
        }

        try {
            let audioBuffer: AudioBuffer;

            if (audioData instanceof AudioBuffer) {
                audioBuffer = audioData;
            } else {
                // Decode ArrayBuffer to AudioBuffer
                audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
            }

            // Create and play audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            return new Promise((resolve, reject) => {
                source.onended = () => resolve();
                source.addEventListener('error', (error: any) => reject(error));
                source.start(0);
            });
        } catch (error: any) {
            // Fallback for browser synthesis or audio context issues
            if (audioData instanceof AudioBuffer) {
                // Can't easily play AudioBuffer without context, just resolve
                return Promise.resolve();
            }
            throw error;
        }
    }

    /**
     * Get current TTS engine status
     */
    getStatus(): {
        engine: TTSEngine;
        initialized: boolean;
        available: boolean;
        speaking: boolean;
    } {
        return {
            engine: this.settings.voice.ttsEngine,
            initialized: this.isInitialized,
            available: this.currentProvider?.isAvailable() || false,
            speaking: this.isSpeaking()
        };
    }
}