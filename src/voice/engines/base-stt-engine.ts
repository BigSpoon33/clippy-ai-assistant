/**
 * Base Speech-to-Text Engine
 * Abstract base class for all STT engines, following the Python architecture pattern
 */

import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    TranscriptionResult, 
    STTCapabilities,
    VoiceEventEmitter,
    AudioChunk 
} from '../types/voice-types';

export abstract class BaseSTTEngine {
    protected config: VoiceConfiguration;
    protected logger: Console;
    protected isAvailable: boolean = false;
    protected engineType: VoiceEngineType;
    protected eventEmitter: VoiceEventEmitter;
    
    // Current settings
    protected currentLanguage: string = 'en-US';
    protected timeout: number = 5000;

    constructor(
        engineType: VoiceEngineType,
        config: VoiceConfiguration,
        eventEmitter: VoiceEventEmitter
    ) {
        this.engineType = engineType;
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
        
        this.currentLanguage = config.stt.language;
        this.timeout = config.stt.timeout * 1000; // Convert to milliseconds
        
        this.initialize();
    }

    /**
     * Initialize the STT engine
     */
    protected abstract initialize(): Promise<void>;

    /**
     * Transcribe audio file to text
     */
    protected abstract transcribeAudioFile(audioFilePath: string): Promise<TranscriptionResult>;

    /**
     * Transcribe audio data to text
     */
    protected abstract transcribeAudioData(audioData: ArrayBuffer): Promise<TranscriptionResult>;

    /**
     * Set language for STT
     */
    public abstract setLanguage(language: string): Promise<boolean>;

    /**
     * Get available languages
     */
    public abstract getAvailableLanguages(): Promise<string[]>;

    /**
     * Get engine capabilities
     */
    public abstract getCapabilities(): Promise<STTCapabilities>;

    /**
     * Record from microphone and transcribe
     */
    public async transcribeFromMicrophone(duration: number = 5): Promise<TranscriptionResult> {
        if (!this.isAvailable) {
            throw new Error(`STT engine ${this.engineType} is not available`);
        }

        try {
            this.logger.debug(`[${this.engineType}] Recording audio for ${duration} seconds...`);
            
            // Record audio
            const audioData = await this.recordAudio(duration);
            
            // Transcribe
            const result = await this.transcribeAudioData(audioData);
            
            this.eventEmitter.emit('speech-recognized', result);
            this.logger.debug(`[${this.engineType}] Transcription: "${result.text}"`);
            
            return result;
        } catch (error) {
            this.handleError('microphone transcription', error);
            throw error;
        }
    }

    /**
     * Transcribe from audio file
     */
    public async transcribeFile(filePath: string): Promise<TranscriptionResult> {
        if (!this.isAvailable) {
            throw new Error(`STT engine ${this.engineType} is not available`);
        }

        try {
            this.logger.debug(`[${this.engineType}] Transcribing file: ${filePath}`);
            
            const result = await this.transcribeAudioFile(filePath);
            
            this.eventEmitter.emit('speech-recognized', result);
            this.logger.debug(`[${this.engineType}] File transcription: "${result.text}"`);
            
            return result;
        } catch (error) {
            this.handleError('file transcription', error);
            throw error;
        }
    }

    /**
     * Record audio from microphone
     */
    protected async recordAudio(duration: number): Promise<ArrayBuffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Request microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        sampleRate: this.config.audio.sampleRate,
                        channelCount: this.config.audio.channels
                    } 
                });

                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks: Blob[] = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                    
                    try {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        resolve(arrayBuffer);
                    } catch (error) {
                        reject(new Error(`Failed to process recorded audio: ${error.message}`));
                    }
                };

                mediaRecorder.onerror = (event) => {
                    stream.getTracks().forEach(track => track.stop());
                    reject(new Error(`Recording failed: ${event.error}`));
                };

                // Start recording
                mediaRecorder.start();
                
                // Stop recording after duration
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }, duration * 1000);

            } catch (error) {
                reject(new Error(`Failed to access microphone: ${error.message}`));
            }
        });
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
        this.currentLanguage = config.stt.language;
        this.timeout = config.stt.timeout * 1000;
    }

    /**
     * Test the engine with a simple recording
     */
    public async test(): Promise<boolean> {
        try {
            this.logger.debug(`[${this.engineType}] Testing STT engine...`);
            
            // Quick 2-second test recording
            const result = await this.transcribeFromMicrophone(2);
            
            this.logger.debug(`[${this.engineType}] Test result: "${result.text}"`);
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
     * Validate audio data
     */
    protected validateAudioData(audioData: ArrayBuffer): void {
        if (!audioData || audioData.byteLength === 0) {
            throw new Error('Invalid audio data: data cannot be empty');
        }

        // Check minimum size (e.g., at least 1 second of audio)
        const minSize = this.config.audio.sampleRate * 2; // 16-bit samples = 2 bytes per sample
        if (audioData.byteLength < minSize) {
            throw new Error(`Audio data too short: minimum ${minSize} bytes required`);
        }
    }

    /**
     * Create temporary audio file
     */
    protected createTempAudioFile(suffix: string = '.wav'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `/tmp/stt_${this.engineType}_${timestamp}_${random}${suffix}`;
    }

    /**
     * Convert ArrayBuffer to WAV format if needed
     */
    protected async convertToWav(audioData: ArrayBuffer): Promise<ArrayBuffer> {
        // This is a simplified conversion - in a real implementation,
        // you might want to use a proper audio processing library
        return audioData;
    }
}