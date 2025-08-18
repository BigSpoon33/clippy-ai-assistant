/**
 * TTS Manager - Text-to-Speech Engine Coordinator
 * Manages multiple TTS engines with fallback strategy
 */

import { 
    VoiceConfiguration, 
    VoiceEngineType, 
    VoiceEventEmitter,
    SynthesisResult,
    TTSCapabilities
} from '../types/voice-types';

import { BaseTTSEngine } from '../engines/base-tts-engine';
import { WebSpeechTTSEngine } from '../engines/tts/web-speech-tts';
import { KokoroTTSEngine } from '../engines/tts/kokoro-tts';
import { SystemTTSEngine } from '../engines/tts/system-tts';

export class TTSManager implements VoiceEventEmitter {
    private config: VoiceConfiguration;
    private eventEmitter: VoiceEventEmitter;
    private logger: Console;
    
    private engines: Map<VoiceEngineType, BaseTTSEngine> = new Map();
    private currentEngine: BaseTTSEngine | null = null;
    private fallbackEngines: VoiceEngineType[] = [];

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
    }

    /**
     * Initialize all TTS engines
     */
    public async initialize(): Promise<void> {
        try {
            this.logger.debug('[TTSManager] Initializing TTS engines...');

            // Initialize engines in priority order
            const engineClasses = {
                [VoiceEngineType.KOKORO_TTS]: KokoroTTSEngine,
                [VoiceEngineType.WEB_SPEECH_TTS]: WebSpeechTTSEngine,
                [VoiceEngineType.SYSTEM_TTS]: SystemTTSEngine
            };

            // Initialize all engines
            for (const [engineType, EngineClass] of Object.entries(engineClasses)) {
                try {
                    const engine = new EngineClass(this.config, this.eventEmitter);
                    this.engines.set(engineType as VoiceEngineType, engine);
                    
                    // Wait for initialization
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (engine.isEngineAvailable()) {
                        this.logger.info(`[TTSManager] ✅ ${engineType} engine available`);
                    } else {
                        this.logger.warn(`[TTSManager] ❌ ${engineType} engine not available`);
                    }
                } catch (error) {
                    this.logger.error(`[TTSManager] Failed to initialize ${engineType}:`, error);
                }
            }

            // Set up fallback chain
            this.setupFallbackChain();

            // Set current engine
            await this.setEngine(this.config.tts.primary);

            this.logger.info('[TTSManager] TTS Manager initialized');

        } catch (error) {
            this.logger.error('[TTSManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up fallback engine chain
     */
    private setupFallbackChain(): void {
        // Define fallback priority
        const fallbackPriority = [
            VoiceEngineType.KOKORO_TTS,
            VoiceEngineType.WEB_SPEECH_TTS,
            VoiceEngineType.SYSTEM_TTS
        ];

        this.fallbackEngines = fallbackPriority.filter(engineType => {
            const engine = this.engines.get(engineType);
            return engine && engine.isEngineAvailable();
        });

        this.logger.debug(`[TTSManager] Fallback chain: ${this.fallbackEngines.join(' → ')}`);
    }

    /**
     * Set current TTS engine
     */
    public async setEngine(engineType: VoiceEngineType): Promise<boolean> {
        try {
            const engine = this.engines.get(engineType);
            
            if (engine && engine.isEngineAvailable()) {
                this.currentEngine = engine;
                this.logger.info(`[TTSManager] TTS engine set to: ${engineType}`);
                return true;
            } else {
                this.logger.warn(`[TTSManager] Engine ${engineType} not available, using fallback`);
                return await this.setFallbackEngine();
            }
        } catch (error) {
            this.logger.error(`[TTSManager] Failed to set engine ${engineType}:`, error);
            return await this.setFallbackEngine();
        }
    }

    /**
     * Set fallback engine
     */
    private async setFallbackEngine(): Promise<boolean> {
        for (const engineType of this.fallbackEngines) {
            const engine = this.engines.get(engineType);
            if (engine && engine.isEngineAvailable()) {
                this.currentEngine = engine;
                this.logger.info(`[TTSManager] Using fallback TTS engine: ${engineType}`);
                return true;
            }
        }
        
        this.logger.error('[TTSManager] No TTS engines available');
        return false;
    }

    /**
     * Speak text using current engine
     */
    public async speak(text: string): Promise<SynthesisResult> {
        if (!this.currentEngine) {
            // Try to set a fallback engine
            const fallbackSet = await this.setFallbackEngine();
            if (!fallbackSet) {
                throw new Error('No TTS engines available');
            }
        }

        try {
            return await this.currentEngine!.speak(text);
        } catch (error) {
            this.logger.warn(`[TTSManager] Current engine failed, trying fallback: ${error.message}`);
            
            // Try fallback engines
            for (const engineType of this.fallbackEngines) {
                if (this.currentEngine && engineType === this.currentEngine.getEngineType()) {
                    continue; // Skip the already failed engine
                }
                
                const engine = this.engines.get(engineType);
                if (engine && engine.isEngineAvailable()) {
                    try {
                        const result = await engine.speak(text);
                        this.currentEngine = engine; // Switch to working engine
                        this.logger.info(`[TTSManager] Switched to fallback engine: ${engineType}`);
                        return result;
                    } catch (fallbackError) {
                        this.logger.warn(`[TTSManager] Fallback engine ${engineType} also failed: ${fallbackError.message}`);
                    }
                }
            }
            
            throw new Error('All TTS engines failed');
        }
    }

    /**
     * Stop current speech
     */
    public async stopSpeech(): Promise<void> {
        if (this.currentEngine) {
            try {
                // Check if engine has a stop method
                if ('stopSpeech' in this.currentEngine) {
                    (this.currentEngine as any).stopSpeech();
                }
            } catch (error) {
                this.logger.warn('[TTSManager] Failed to stop speech:', error);
            }
        }
    }

    /**
     * Set voice for current engine
     */
    public async setVoice(voice: string): Promise<boolean> {
        if (this.currentEngine) {
            return await this.currentEngine.setVoice(voice);
        }
        return false;
    }

    /**
     * Set speed for current engine
     */
    public async setSpeed(speed: number): Promise<void> {
        if (this.currentEngine) {
            await this.currentEngine.setSpeed(speed);
        }
    }

    /**
     * Set volume for current engine
     */
    public async setVolume(volume: number): Promise<void> {
        if (this.currentEngine) {
            await this.currentEngine.setVolume(volume);
        }
    }

    /**
     * Get available voices from current engine
     */
    public async getAvailableVoices(): Promise<string[]> {
        if (this.currentEngine) {
            return await this.currentEngine.getAvailableVoices();
        }
        return [];
    }

    /**
     * Get current engine capabilities
     */
    public async getCapabilities(): Promise<TTSCapabilities | null> {
        if (this.currentEngine) {
            return await this.currentEngine.getCapabilities();
        }
        return null;
    }

    /**
     * Get available TTS engines
     */
    public async getAvailableEngines(): Promise<VoiceEngineType[]> {
        const availableEngines: VoiceEngineType[] = [];
        
        for (const [engineType, engine] of this.engines) {
            if (engine.isEngineAvailable()) {
                availableEngines.push(engineType);
            }
        }
        
        return availableEngines;
    }

    /**
     * Get current engine type
     */
    public getCurrentEngine(): VoiceEngineType | undefined {
        return this.currentEngine?.getEngineType();
    }

    /**
     * Test current engine
     */
    public async testEngine(): Promise<boolean> {
        if (this.currentEngine) {
            return await this.currentEngine.test();
        }
        return false;
    }

    /**
     * Get engine status
     */
    public getEngineStatus(): {
        currentEngine?: VoiceEngineType;
        availableEngines: VoiceEngineType[];
        fallbackChain: VoiceEngineType[];
    } {
        return {
            currentEngine: this.getCurrentEngine(),
            availableEngines: this.fallbackEngines,
            fallbackChain: [...this.fallbackEngines]
        };
    }

    /**
     * Switch to specific engine
     */
    public async switchEngine(engineType: VoiceEngineType): Promise<boolean> {
        const success = await this.setEngine(engineType);
        if (success) {
            this.logger.info(`[TTSManager] Switched to engine: ${engineType}`);
        }
        return success;
    }

    /**
     * Update configuration
     */
    public updateConfiguration(config: VoiceConfiguration): void {
        this.config = config;
        
        // Update all engines
        for (const engine of this.engines.values()) {
            engine.updateConfig(config);
        }
        
        // Update current voice/speed/volume if needed
        if (this.currentEngine) {
            this.currentEngine.setVoice(config.tts.voice);
            this.currentEngine.setSpeed(config.tts.speed);
            this.currentEngine.setVolume(config.tts.volume);
        }
    }

    /**
     * Health check for all engines
     */
    public async healthCheck(): Promise<Map<VoiceEngineType, boolean>> {
        const healthStatus = new Map<VoiceEngineType, boolean>();
        
        for (const [engineType, engine] of this.engines) {
            try {
                const isHealthy = engine.isEngineAvailable() && await engine.test();
                healthStatus.set(engineType, isHealthy);
            } catch (error) {
                healthStatus.set(engineType, false);
                this.logger.warn(`[TTSManager] Health check failed for ${engineType}:`, error);
            }
        }
        
        return healthStatus;
    }

    /**
     * Event emitter implementation
     */
    public on<T extends keyof any>(event: T, callback: any): void {
        this.eventEmitter.on(event, callback);
    }

    public off<T extends keyof any>(event: T, callback: any): void {
        this.eventEmitter.off(event, callback);
    }

    public emit<T extends keyof any>(event: T, data: any): void {
        this.eventEmitter.emit(event, data);
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        try {
            await this.stopSpeech();
            
            // Clean up all engines
            for (const engine of this.engines.values()) {
                await engine.cleanup();
            }
            
            this.engines.clear();
            this.currentEngine = null;
            
            this.logger.debug('[TTSManager] Cleanup completed');
        } catch (error) {
            this.logger.error('[TTSManager] Cleanup error:', error);
        }
    }
}