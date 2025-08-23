/**
 * STT Manager - Speech-to-Text Engine Coordinator
 * Manages multiple STT engines with fallback strategy
 */

import { 
    VoiceConfiguration, 
    VoiceEngineType, 
    VoiceEventEmitter,
    TranscriptionResult,
    STTCapabilities
} from '../types/voice-types';

import { BaseSTTEngine } from '../engines/base-stt-engine';
import { WhisperSTTEngine } from '../engines/stt/whisper-stt';
import { WebSpeechSTTEngine } from '../engines/stt/web-speech-stt';

export class STTManager implements VoiceEventEmitter {
    private config: VoiceConfiguration;
    private eventEmitter: VoiceEventEmitter;
    private logger: Console;
    
    private engines: Map<VoiceEngineType, BaseSTTEngine> = new Map();
    private currentEngine: BaseSTTEngine | null = null;
    private fallbackEngines: VoiceEngineType[] = [];
    private isListening: boolean = false;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
    }

    /**
     * Initialize all STT engines
     */
    public async initialize(): Promise<void> {
        try {
            this.logger.debug('[STTManager] Initializing STT engines...');

            // Initialize engines in priority order
            const engineClasses = {
                [VoiceEngineType.WHISPER_STT]: WhisperSTTEngine,
                [VoiceEngineType.WEB_SPEECH_STT]: WebSpeechSTTEngine
            };

            // Initialize all engines
            for (const [engineType, EngineClass] of Object.entries(engineClasses)) {
                try {
                    const engine = new EngineClass(this.config, this.eventEmitter);
                    this.engines.set(engineType as VoiceEngineType, engine);
                    
                    // Wait for initialization
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (engine.isEngineAvailable()) {
                        this.logger.info(`[STTManager] ✅ ${engineType} engine available`);
                    } else {
                        this.logger.warn(`[STTManager] ❌ ${engineType} engine not available`);
                    }
                } catch (error) {
                    this.logger.error(`[STTManager] Failed to initialize ${engineType}:`, error);
                }
            }

            // Set up fallback chain
            this.setupFallbackChain();

            // Set current engine
            await this.setEngine(this.config.stt.primary);

            this.logger.info('[STTManager] STT Manager initialized');

        } catch (error) {
            this.logger.error('[STTManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up fallback engine chain
     */
    private setupFallbackChain(): void {
        // Define fallback priority (prefer local over cloud)
        const fallbackPriority = [
            VoiceEngineType.WHISPER_STT,
            VoiceEngineType.WEB_SPEECH_STT
        ];

        this.fallbackEngines = fallbackPriority.filter(engineType => {
            const engine = this.engines.get(engineType);
            return engine && engine.isEngineAvailable();
        });

        this.logger.debug(`[STTManager] Fallback chain: ${this.fallbackEngines.join(' → ')}`);
    }

    /**
     * Set current STT engine
     */
    public async setEngine(engineType: VoiceEngineType): Promise<boolean> {
        try {
            const engine = this.engines.get(engineType);
            
            if (engine && engine.isEngineAvailable()) {
                this.currentEngine = engine;
                this.logger.info(`[STTManager] STT engine set to: ${engineType}`);
                return true;
            } else {
                this.logger.warn(`[STTManager] Engine ${engineType} not available, using fallback`);
                return await this.setFallbackEngine();
            }
        } catch (error) {
            this.logger.error(`[STTManager] Failed to set engine ${engineType}:`, error);
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
                this.logger.info(`[STTManager] Using fallback STT engine: ${engineType}`);
                return true;
            }
        }
        
        this.logger.error('[STTManager] No STT engines available');
        return false;
    }

    /**
     * Transcribe from microphone
     */
    public async transcribeFromMicrophone(duration: number = 5): Promise<TranscriptionResult> {
        if (!this.currentEngine) {
            // Try to set a fallback engine
            const fallbackSet = await this.setFallbackEngine();
            if (!fallbackSet) {
                throw new Error('No STT engines available');
            }
        }

        try {
            this.isListening = true;
            const result = await this.currentEngine!.transcribeFromMicrophone(duration);
            this.isListening = false;
            return result;
        } catch (error) {
            this.isListening = false;
            this.logger.warn(`[STTManager] Current engine failed, trying fallback: ${error.message}`);
            
            // Try fallback engines
            for (const engineType of this.fallbackEngines) {
                if (this.currentEngine && engineType === this.currentEngine.getEngineType()) {
                    continue; // Skip the already failed engine
                }
                
                const engine = this.engines.get(engineType);
                if (engine && engine.isEngineAvailable()) {
                    try {
                        this.isListening = true;
                        const result = await engine.transcribeFromMicrophone(duration);
                        this.isListening = false;
                        this.currentEngine = engine; // Switch to working engine
                        this.logger.info(`[STTManager] Switched to fallback engine: ${engineType}`);
                        return result;
                    } catch (fallbackError) {
                        this.isListening = false;
                        this.logger.warn(`[STTManager] Fallback engine ${engineType} also failed: ${fallbackError.message}`);
                    }
                }
            }
            
            throw new Error('All STT engines failed');
        }
    }

    /**
     * Transcribe audio file
     */
    public async transcribeFile(filePath: string): Promise<TranscriptionResult> {
        if (!this.currentEngine) {
            const fallbackSet = await this.setFallbackEngine();
            if (!fallbackSet) {
                throw new Error('No STT engines available');
            }
        }

        try {
            return await this.currentEngine!.transcribeFile(filePath);
        } catch (error) {
            this.logger.warn(`[STTManager] Current engine failed for file transcription, trying fallback: ${error.message}`);
            
            // Try fallback engines
            for (const engineType of this.fallbackEngines) {
                if (this.currentEngine && engineType === this.currentEngine.getEngineType()) {
                    continue;
                }
                
                const engine = this.engines.get(engineType);
                if (engine && engine.isEngineAvailable()) {
                    try {
                        const result = await engine.transcribeFile(filePath);
                        this.currentEngine = engine;
                        this.logger.info(`[STTManager] Switched to fallback engine: ${engineType}`);
                        return result;
                    } catch (fallbackError) {
                        this.logger.warn(`[STTManager] Fallback engine ${engineType} also failed: ${fallbackError.message}`);
                    }
                }
            }
            
            throw new Error('All STT engines failed for file transcription');
        }
    }

    /**
     * Start continuous listening (if supported by current engine)
     */
    public async startContinuousListening(
        onTranscription: (result: TranscriptionResult) => void
    ): Promise<boolean> {
        if (!this.currentEngine) {
            const fallbackSet = await this.setFallbackEngine();
            if (!fallbackSet) {
                return false;
            }
        }

        try {
            // Check if current engine supports continuous listening
            if ('startContinuousRecognition' in this.currentEngine) {
                await (this.currentEngine as any).startContinuousRecognition(
                    onTranscription,
                    (error: string) => {
                        this.logger.error(`[STTManager] Continuous listening error: ${error}`);
                        this.emit('error', { error });
                    }
                );
                this.isListening = true;
                return true;
            } else {
                this.logger.warn(`[STTManager] Current engine doesn't support continuous listening`);
                return false;
            }
        } catch (error) {
            this.logger.error(`[STTManager] Failed to start continuous listening: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop continuous listening
     */
    public async stopContinuousListening(): Promise<void> {
        if (this.currentEngine && 'stopContinuousRecognition' in this.currentEngine) {
            try {
                (this.currentEngine as any).stopContinuousRecognition();
                this.isListening = false;
            } catch (error) {
                this.logger.warn('[STTManager] Failed to stop continuous listening:', error);
            }
        }
    }

    /**
     * Stop any active listening
     */
    public async stopListening(): Promise<void> {
        if (this.currentEngine) {
            try {
                // Check if engine has a stop method
                if ('stopRecognition' in this.currentEngine) {
                    (this.currentEngine as any).stopRecognition();
                }
                this.isListening = false;
            } catch (error) {
                this.logger.warn('[STTManager] Failed to stop listening:', error);
            }
        }
    }

    /**
     * Set language for current engine
     */
    public async setLanguage(language: string): Promise<boolean> {
        if (this.currentEngine) {
            return await this.currentEngine.setLanguage(language);
        }
        return false;
    }

    /**
     * Get available languages from current engine
     */
    public async getAvailableLanguages(): Promise<string[]> {
        if (this.currentEngine) {
            return await this.currentEngine.getAvailableLanguages();
        }
        return [];
    }

    /**
     * Get current engine capabilities
     */
    public async getCapabilities(): Promise<STTCapabilities | null> {
        if (this.currentEngine) {
            return await this.currentEngine.getCapabilities();
        }
        return null;
    }

    /**
     * Get available STT engines
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
     * Check if currently listening
     */
    public isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Get engine status
     */
    public getEngineStatus(): {
        currentEngine?: VoiceEngineType;
        availableEngines: VoiceEngineType[];
        fallbackChain: VoiceEngineType[];
        isListening: boolean;
    } {
        return {
            currentEngine: this.getCurrentEngine(),
            availableEngines: this.fallbackEngines,
            fallbackChain: [...this.fallbackEngines],
            isListening: this.isListening
        };
    }

    /**
     * Switch to specific engine
     */
    public async switchEngine(engineType: VoiceEngineType): Promise<boolean> {
        // Stop any current listening
        await this.stopListening();
        
        const success = await this.setEngine(engineType);
        if (success) {
            this.logger.info(`[STTManager] Switched to engine: ${engineType}`);
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
        
        // Update current language if needed
        if (this.currentEngine) {
            this.currentEngine.setLanguage(config.stt.language);
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
                this.logger.warn(`[STTManager] Health check failed for ${engineType}:`, error);
            }
        }
        
        return healthStatus;
    }

    /**
     * Get engine-specific information
     */
    public getEngineInfo(engineType: VoiceEngineType): any {
        const engine = this.engines.get(engineType);
        if (engine && 'getInstallationInfo' in engine) {
            return (engine as any).getInstallationInfo();
        }
        return null;
    }

    /**
     * Preload models for faster response (if supported)
     */
    public async preloadModels(): Promise<boolean> {
        if (this.currentEngine && 'preloadModel' in this.currentEngine) {
            try {
                return await (this.currentEngine as any).preloadModel();
            } catch (error) {
                this.logger.warn('[STTManager] Failed to preload models:', error);
                return false;
            }
        }
        return false;
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
            await this.stopListening();
            
            // Clean up all engines
            for (const engine of this.engines.values()) {
                await engine.cleanup();
            }
            
            this.engines.clear();
            this.currentEngine = null;
            this.isListening = false;
            
            this.logger.debug('[STTManager] Cleanup completed');
        } catch (error) {
            this.logger.error('[STTManager] Cleanup error:', error);
        }
    }
}