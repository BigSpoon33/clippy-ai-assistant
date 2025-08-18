/**
 * Web Speech API STT Engine
 * Browser-based speech recognition using Web Speech API as fallback
 */

import { BaseSTTEngine } from '../base-stt-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    TranscriptionResult, 
    STTCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class WebSpeechSTTEngine extends BaseSTTEngine {
    private recognition: any = null;
    private isRecognitionActive: boolean = false;
    private supportedLanguages: string[] = [];

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.WEB_SPEECH_STT, config, eventEmitter);
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing Web Speech STT...`);

            // Check if Web Speech API is available
            if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
                throw new Error('Web Speech API not supported in this browser');
            }

            // Initialize speech recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition
            this.configureRecognition();
            
            // Load supported languages
            this.loadSupportedLanguages();
            
            this.isAvailable = true;
            this.logger.info(`[${this.engineType}] Initialized successfully`);
            
            this.eventEmitter.emit('engine-initialized', {
                engine: this.engineType,
                available: true
            });

        } catch (error) {
            this.isAvailable = false;
            this.handleError('initialization', error);
            
            this.eventEmitter.emit('engine-initialized', {
                engine: this.engineType,
                available: false
            });
        }
    }

    private configureRecognition(): void {
        if (!this.recognition) return;

        // Basic configuration
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.currentLanguage;
        this.recognition.maxAlternatives = 1;
    }

    private loadSupportedLanguages(): void {
        // Common languages supported by most Web Speech implementations
        this.supportedLanguages = [
            'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA',
            'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-VE',
            'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH',
            'de-DE', 'de-AT', 'de-CH',
            'it-IT', 'it-CH',
            'pt-PT', 'pt-BR',
            'ru-RU',
            'ja-JP',
            'ko-KR',
            'zh-CN', 'zh-TW', 'zh-HK',
            'ar-SA', 'ar-EG',
            'hi-IN',
            'nl-NL', 'nl-BE',
            'sv-SE',
            'no-NO',
            'da-DK',
            'fi-FI',
            'pl-PL',
            'cs-CZ',
            'hu-HU',
            'tr-TR',
            'th-TH'
        ];
    }

    protected async transcribeAudioFile(audioFilePath: string): Promise<TranscriptionResult> {
        // Web Speech API cannot transcribe files directly
        throw new Error('Web Speech API does not support file transcription. Use transcribeFromMicrophone instead.');
    }

    protected async transcribeAudioData(audioData: ArrayBuffer): Promise<TranscriptionResult> {
        // Web Speech API cannot transcribe audio data directly
        throw new Error('Web Speech API does not support audio data transcription. Use transcribeFromMicrophone instead.');
    }

    /**
     * Override base method to use Web Speech API directly
     */
    public async transcribeFromMicrophone(duration: number = 5): Promise<TranscriptionResult> {
        if (!this.isAvailable || !this.recognition) {
            throw new Error(`STT engine ${this.engineType} is not available`);
        }

        if (this.isRecognitionActive) {
            throw new Error('Recognition is already active');
        }

        return new Promise(async (resolve, reject) => {
            try {
                this.logger.debug(`[${this.engineType}] Starting speech recognition for ${duration} seconds...`);

                // Request microphone permission
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (permError) {
                    reject(new Error(`Microphone permission denied: ${permError.message}`));
                    return;
                }

                const startTime = Date.now();
                this.isRecognitionActive = true;

                // Set timeout for recognition
                const recognitionTimeout = setTimeout(() => {
                    if (this.isRecognitionActive) {
                        this.recognition.stop();
                        reject(new Error(`Speech recognition timeout after ${duration} seconds`));
                    }
                }, duration * 1000);

                // Set up event handlers
                this.recognition.onstart = () => {
                    this.logger.debug(`[${this.engineType}] Recognition started`);
                };

                this.recognition.onresult = (event: any) => {
                    clearTimeout(recognitionTimeout);
                    this.isRecognitionActive = false;

                    try {
                        const transcript = Array.from(event.results)
                            .map((result: any) => result[0])
                            .map((result: any) => result.transcript)
                            .join('');

                        const confidence = event.results[0] && event.results[0][0] 
                            ? event.results[0][0].confidence || 0.8 
                            : 0.8;

                        this.logger.debug(`[${this.engineType}] Recognition result: "${transcript}" (confidence: ${confidence})`);

                        const result: TranscriptionResult = {
                            text: transcript.trim(),
                            confidence: confidence,
                            language: this.currentLanguage,
                            timestamp: startTime,
                            engine: this.engineType
                        };

                        resolve(result);
                    } catch (error) {
                        reject(new Error(`Failed to process recognition result: ${error.message}`));
                    }
                };

                this.recognition.onerror = (event: any) => {
                    clearTimeout(recognitionTimeout);
                    this.isRecognitionActive = false;

                    let errorMessage = 'Speech recognition failed';
                    
                    switch (event.error) {
                        case 'no-speech':
                            errorMessage = 'No speech detected';
                            break;
                        case 'audio-capture':
                            errorMessage = 'Audio capture failed';
                            break;
                        case 'not-allowed':
                            errorMessage = 'Microphone permission denied';
                            break;
                        case 'network':
                            errorMessage = 'Network error during recognition';
                            break;
                        case 'service-not-allowed':
                            errorMessage = 'Speech recognition service not allowed';
                            break;
                        default:
                            errorMessage = `Speech recognition error: ${event.error}`;
                    }

                    this.logger.error(`[${this.engineType}] ${errorMessage}`);
                    reject(new Error(errorMessage));
                };

                this.recognition.onend = () => {
                    this.isRecognitionActive = false;
                    this.logger.debug(`[${this.engineType}] Recognition ended`);
                };

                // Start recognition
                this.recognition.lang = this.currentLanguage;
                this.recognition.start();

            } catch (error) {
                this.isRecognitionActive = false;
                this.handleError('microphone transcription', error);
                reject(error);
            }
        });
    }

    public async setLanguage(language: string): Promise<boolean> {
        if (this.supportedLanguages.includes(language)) {
            this.currentLanguage = language;
            
            // Update recognition language if active
            if (this.recognition) {
                this.recognition.lang = language;
            }
            
            this.logger.debug(`[${this.engineType}] Language set to: ${language}`);
            return true;
        } else {
            // Try to find a close match
            const languageBase = language.split('-')[0];
            const closeMatch = this.supportedLanguages.find(lang => 
                lang.startsWith(languageBase)
            );
            
            if (closeMatch) {
                this.currentLanguage = closeMatch;
                if (this.recognition) {
                    this.recognition.lang = closeMatch;
                }
                this.logger.debug(`[${this.engineType}] Language set to: ${closeMatch} (closest match for: ${language})`);
                return true;
            } else {
                this.logger.warn(`[${this.engineType}] Unsupported language: ${language}, keeping current: ${this.currentLanguage}`);
                return false;
            }
        }
    }

    public async getAvailableLanguages(): Promise<string[]> {
        return [...this.supportedLanguages];
    }

    public async getCapabilities(): Promise<STTCapabilities> {
        return {
            languages: [...this.supportedLanguages],
            maxDuration: 60, // Web Speech API typically has limits
            supportsRealTime: true,
            supportsBatch: false, // Web Speech API is real-time only
            audioFormats: ['microphone'] // Only supports live microphone input
        };
    }

    public async cleanup(): Promise<void> {
        try {
            // Stop any active recognition
            if (this.recognition && this.isRecognitionActive) {
                this.recognition.stop();
            }
            
            this.isRecognitionActive = false;
            this.recognition = null;
            
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Stop any active recognition
     */
    public stopRecognition(): void {
        if (this.recognition && this.isRecognitionActive) {
            this.recognition.stop();
            this.isRecognitionActive = false;
            this.logger.debug(`[${this.engineType}] Recognition stopped manually`);
        }
    }

    /**
     * Check if recognition is currently active
     */
    public isRecognizing(): boolean {
        return this.isRecognitionActive;
    }

    /**
     * Configure recognition parameters
     */
    public configureRecognitionParams(params: {
        continuous?: boolean;
        interimResults?: boolean;
        maxAlternatives?: number;
    }): void {
        if (!this.recognition) return;

        if (params.continuous !== undefined) {
            this.recognition.continuous = params.continuous;
        }
        
        if (params.interimResults !== undefined) {
            this.recognition.interimResults = params.interimResults;
        }
        
        if (params.maxAlternatives !== undefined) {
            this.recognition.maxAlternatives = Math.max(1, Math.min(10, params.maxAlternatives));
        }

        this.logger.debug(`[${this.engineType}] Recognition parameters updated:`, params);
    }

    /**
     * Start continuous recognition with callback
     */
    public async startContinuousRecognition(
        onResult: (result: TranscriptionResult) => void,
        onError?: (error: string) => void
    ): Promise<void> {
        if (!this.isAvailable || !this.recognition) {
            throw new Error(`STT engine ${this.engineType} is not available`);
        }

        if (this.isRecognitionActive) {
            throw new Error('Recognition is already active');
        }

        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            this.logger.debug(`[${this.engineType}] Starting continuous recognition...`);

            // Configure for continuous mode
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage;

            this.isRecognitionActive = true;

            this.recognition.onstart = () => {
                this.logger.debug(`[${this.engineType}] Continuous recognition started`);
            };

            this.recognition.onresult = (event: any) => {
                try {
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        
                        if (result.isFinal) {
                            const transcript = result[0].transcript;
                            const confidence = result[0].confidence || 0.8;

                            const transcriptionResult: TranscriptionResult = {
                                text: transcript.trim(),
                                confidence: confidence,
                                language: this.currentLanguage,
                                timestamp: Date.now(),
                                engine: this.engineType
                            };

                            onResult(transcriptionResult);
                        }
                    }
                } catch (error) {
                    if (onError) {
                        onError(`Failed to process recognition result: ${error.message}`);
                    }
                }
            };

            this.recognition.onerror = (event: any) => {
                const errorMessage = `Speech recognition error: ${event.error}`;
                this.logger.error(`[${this.engineType}] ${errorMessage}`);
                
                if (onError) {
                    onError(errorMessage);
                }
            };

            this.recognition.onend = () => {
                this.isRecognitionActive = false;
                this.logger.debug(`[${this.engineType}] Continuous recognition ended`);
            };

            this.recognition.start();

        } catch (error) {
            this.isRecognitionActive = false;
            throw new Error(`Failed to start continuous recognition: ${error.message}`);
        }
    }

    /**
     * Stop continuous recognition
     */
    public stopContinuousRecognition(): void {
        this.stopRecognition();
    }
}