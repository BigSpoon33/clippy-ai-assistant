/**
 * Web Speech API TTS Engine
 * Reliable fallback TTS engine using browser's built-in speech synthesis
 */

import { BaseTTSEngine } from '../base-tts-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    SynthesisResult, 
    TTSCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class WebSpeechTTSEngine extends BaseTTSEngine {
    private synthesis: SpeechSynthesis;
    private voices: SpeechSynthesisVoice[] = [];
    private selectedVoice: SpeechSynthesisVoice | null = null;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.WEB_SPEECH_TTS, config, eventEmitter);
        this.synthesis = window.speechSynthesis;
    }

    protected async initialize(): Promise<void> {
        try {
            if (!('speechSynthesis' in window)) {
                throw new Error('Speech synthesis not supported in this browser');
            }

            // Wait for voices to load
            await this.loadVoices();
            
            // Set initial voice
            await this.setVoice(this.currentVoice);
            
            this.isAvailable = true;
            this.logger.debug(`[${this.engineType}] Initialized with ${this.voices.length} voices`);
            
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

    private async loadVoices(): Promise<void> {
        return new Promise((resolve) => {
            // Voices might be loaded synchronously or asynchronously
            const getVoices = () => {
                this.voices = this.synthesis.getVoices();
                if (this.voices.length > 0) {
                    this.logger.debug(`[${this.engineType}] Loaded ${this.voices.length} voices`);
                    resolve();
                }
            };

            // Try immediate load
            getVoices();
            
            // If no voices loaded, wait for voiceschanged event
            if (this.voices.length === 0) {
                this.synthesis.onvoiceschanged = () => {
                    getVoices();
                };
                
                // Fallback timeout
                setTimeout(() => {
                    if (this.voices.length === 0) {
                        this.logger.warn(`[${this.engineType}] No voices loaded after timeout`);
                        resolve();
                    }
                }, 2000);
            }
        });
    }

    protected async generateSpeech(text: string): Promise<SynthesisResult> {
        this.validateText(text);

        return new Promise((resolve, reject) => {
            try {
                // Stop any current speech
                this.synthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                
                // Configure utterance
                if (this.selectedVoice) {
                    utterance.voice = this.selectedVoice;
                    utterance.lang = this.selectedVoice.lang;
                } else {
                    utterance.lang = 'en-US';
                }

                utterance.rate = this.currentSpeed;
                utterance.volume = this.currentVolume;
                utterance.pitch = 1.0;

                // Set up event handlers
                const startTime = Date.now();
                
                utterance.onstart = () => {
                    this.logger.debug(`[${this.engineType}] Speech started`);
                };

                utterance.onend = () => {
                    const duration = Date.now() - startTime;
                    this.logger.debug(`[${this.engineType}] Speech completed in ${duration}ms`);
                    
                    resolve({
                        audioData: undefined, // Web Speech API doesn't provide audio data
                        filePath: undefined,
                        duration: duration,
                        timestamp: startTime,
                        engine: this.engineType
                    });
                };

                utterance.onerror = (event) => {
                    const errorMsg = `Speech synthesis failed: ${event.error}`;
                    this.logger.error(`[${this.engineType}] ${errorMsg}`);
                    reject(new Error(errorMsg));
                };

                // Add timeout fallback
                const timeout = setTimeout(() => {
                    this.synthesis.cancel();
                    reject(new Error('Speech synthesis timeout after 30 seconds'));
                }, 30000);

                utterance.onend = () => {
                    clearTimeout(timeout);
                    const duration = Date.now() - startTime;
                    resolve({
                        audioData: undefined,
                        filePath: undefined,
                        duration: duration,
                        timestamp: startTime,
                        engine: this.engineType
                    });
                };

                utterance.onerror = (event) => {
                    clearTimeout(timeout);
                    reject(new Error(`Speech synthesis failed: ${event.error}`));
                };

                // Start speech synthesis
                this.synthesis.speak(utterance);

            } catch (error) {
                reject(error);
            }
        });
    }

    public async setVoice(voice: string): Promise<boolean> {
        try {
            if (this.voices.length === 0) {
                await this.loadVoices();
            }

            // Strategy 1: Find exact match
            this.selectedVoice = this.voices.find(v => 
                v.name.toLowerCase() === voice.toLowerCase()
            ) || null;

            // Strategy 2: Find partial match
            if (!this.selectedVoice) {
                this.selectedVoice = this.voices.find(v => 
                    v.name.toLowerCase().includes(voice.toLowerCase())
                ) || null;
            }

            // Strategy 3: Find local English voice
            if (!this.selectedVoice) {
                this.selectedVoice = this.voices.find(v => 
                    v.lang.startsWith('en') && v.localService
                ) || null;
            }

            // Strategy 4: Find any English voice
            if (!this.selectedVoice) {
                this.selectedVoice = this.voices.find(v => 
                    v.lang.startsWith('en')
                ) || null;
            }

            // Strategy 5: Use first available voice
            if (!this.selectedVoice && this.voices.length > 0) {
                this.selectedVoice = this.voices[0];
            }

            if (this.selectedVoice) {
                this.currentVoice = this.selectedVoice.name;
                this.logger.debug(`[${this.engineType}] Voice set to: ${this.selectedVoice.name} (${this.selectedVoice.lang})`);
                return true;
            } else {
                this.logger.warn(`[${this.engineType}] No voice found for: ${voice}`);
                return false;
            }

        } catch (error) {
            this.handleError('voice setting', error);
            return false;
        }
    }

    public async setSpeed(speed: number): Promise<void> {
        this.currentSpeed = Math.max(0.1, Math.min(10.0, speed));
        this.logger.debug(`[${this.engineType}] Speed set to: ${this.currentSpeed}`);
    }

    public async setVolume(volume: number): Promise<void> {
        this.currentVolume = Math.max(0.0, Math.min(1.0, volume));
        this.logger.debug(`[${this.engineType}] Volume set to: ${this.currentVolume}`);
    }

    public async getAvailableVoices(): Promise<string[]> {
        if (this.voices.length === 0) {
            await this.loadVoices();
        }
        return this.voices.map(voice => voice.name);
    }

    public async getCapabilities(): Promise<TTSCapabilities> {
        if (this.voices.length === 0) {
            await this.loadVoices();
        }

        const languages = [...new Set(this.voices.map(voice => voice.lang))];
        const voiceNames = this.voices.map(voice => voice.name);

        return {
            voices: voiceNames,
            languages: languages,
            speedRange: { min: 0.1, max: 10.0 },
            volumeRange: { min: 0.0, max: 1.0 },
            supportsSSML: false, // Web Speech API has limited SSML support
            maxTextLength: 32767 // Browser limitation for utterance text
        };
    }

    public async cleanup(): Promise<void> {
        try {
            // Cancel any ongoing speech
            if (this.synthesis) {
                this.synthesis.cancel();
            }
            
            this.selectedVoice = null;
            this.voices = [];
            
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Get detailed voice information
     */
    public getVoiceDetails(): Array<{
        name: string;
        lang: string;
        localService: boolean;
        default: boolean;
        voiceURI: string;
    }> {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService,
            default: voice.default,
            voiceURI: voice.voiceURI
        }));
    }

    /**
     * Stop current speech
     */
    public stopSpeech(): void {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.logger.debug(`[${this.engineType}] Speech stopped`);
        }
    }

    /**
     * Check if speech is currently playing
     */
    public isSpeaking(): boolean {
        return this.synthesis ? this.synthesis.speaking : false;
    }

    /**
     * Pause current speech
     */
    public pauseSpeech(): void {
        if (this.synthesis && this.synthesis.speaking) {
            this.synthesis.pause();
            this.logger.debug(`[${this.engineType}] Speech paused`);
        }
    }

    /**
     * Resume paused speech
     */
    public resumeSpeech(): void {
        if (this.synthesis && this.synthesis.paused) {
            this.synthesis.resume();
            this.logger.debug(`[${this.engineType}] Speech resumed`);
        }
    }
}