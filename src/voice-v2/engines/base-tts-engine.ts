/**
 * Base Text-to-Speech Engine
 * Abstract base class for all TTS engines, following the Python architecture pattern
 */

import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    SynthesisResult, 
    TTSCapabilities,
    VoiceEventEmitter 
} from '../types/voice-types';

export abstract class BaseTTSEngine {
    protected config: VoiceConfiguration;
    protected logger: Console;
    protected isAvailable: boolean = false;
    protected engineType: VoiceEngineType;
    protected eventEmitter: VoiceEventEmitter;
    
    // Current settings
    protected currentVoice: string = '';
    protected currentSpeed: number = 1.0;
    protected currentVolume: number = 0.8;

    constructor(
        engineType: VoiceEngineType,
        config: VoiceConfiguration,
        eventEmitter: VoiceEventEmitter
    ) {
        this.engineType = engineType;
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
        
        this.currentVoice = config.tts.voice;
        this.currentSpeed = config.tts.speed;
        this.currentVolume = config.tts.volume;
        
        this.initialize();
    }

    /**
     * Initialize the TTS engine
     */
    protected abstract initialize(): Promise<void>;

    /**
     * Generate speech from text and return result
     */
    protected abstract generateSpeech(text: string): Promise<SynthesisResult>;

    /**
     * Set voice for TTS
     */
    public abstract setVoice(voice: string): Promise<boolean>;

    /**
     * Set speech speed
     */
    public abstract setSpeed(speed: number): Promise<void>;

    /**
     * Set speech volume
     */
    public abstract setVolume(volume: number): Promise<void>;

    /**
     * Get available voices
     */
    public abstract getAvailableVoices(): Promise<string[]>;

    /**
     * Get engine capabilities
     */
    public abstract getCapabilities(): Promise<TTSCapabilities>;

    /**
     * Main speech synthesis method
     */
    public async speak(text: string): Promise<SynthesisResult> {
        if (!this.isAvailable) {
            throw new Error(`TTS engine ${this.engineType} is not available`);
        }

        if (!text.trim()) {
            throw new Error('Empty text provided for speech synthesis');
        }

        try {
            this.logger.debug(`[${this.engineType}] Synthesizing: "${text.substring(0, 50)}..."`);
            
            const result = await this.generateSpeech(text);
            
            this.eventEmitter.emit('speech-synthesis-complete', result);
            this.logger.debug(`[${this.engineType}] Speech synthesis completed`);
            
            return result;
        } catch (error) {
            this.logger.error(`[${this.engineType}] Speech synthesis failed:`, error);
            this.eventEmitter.emit('error', { 
                error: `Speech synthesis failed: ${error.message}`, 
                engine: this.engineType 
            });
            throw error;
        }
    }

    /**
     * Check if engine is available
     */
    public isEngineAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Get engine type
     */
    public getEngineType(): VoiceEngineType {
        return this.engineType;
    }

    /**
     * Update configuration
     */
    public updateConfig(config: VoiceConfiguration): void {
        this.config = config;
        this.currentVoice = config.tts.voice;
        this.currentSpeed = config.tts.speed;
        this.currentVolume = config.tts.volume;
    }

    /**
     * Test the engine with a simple phrase
     */
    public async test(): Promise<boolean> {
        try {
            const testText = 'TTS engine test successful';
            await this.speak(testText);
            return true;
        } catch (error) {
            this.logger.error(`[${this.engineType}] Engine test failed:`, error);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    public abstract cleanup(): Promise<void>;

    /**
     * Handle errors with consistent logging
     */
    protected handleError(operation: string, error: any): void {
        const message = `[${this.engineType}] ${operation} failed: ${error.message}`;
        this.logger.error(message, error);
        this.eventEmitter.emit('error', { 
            error: message, 
            engine: this.engineType 
        });
    }

    /**
     * Validate text input
     */
    protected validateText(text: string): void {
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input: text must be a non-empty string');
        }

        if (text.trim().length === 0) {
            throw new Error('Invalid text input: text cannot be empty or whitespace only');
        }

        // Check max length if specified in capabilities
        const maxLength = 1000; // Default max length
        if (text.length > maxLength) {
            throw new Error(`Text too long: maximum length is ${maxLength} characters`);
        }
    }

    /**
     * Create temporary file for audio output
     */
    protected createTempFile(suffix: string = '.wav'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `/tmp/tts_${this.engineType}_${timestamp}_${random}${suffix}`;
    }
}