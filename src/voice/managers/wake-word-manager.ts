/**
 * Wake Word Manager - Wake Word Detection Engine Coordinator
 * Manages multiple wake word engines with fallback strategy
 */

import { 
    VoiceConfiguration, 
    VoiceEngineType, 
    VoiceEventEmitter,
    WakeWordDetection,
    WakeWordCapabilities
} from '../types/voice-types';

import { BaseWakeWordEngine } from '../engines/base-wake-word-engine';
import { OpenWakeWordEngine } from '../engines/wake-word/openwakeword-engine';
import { KeywordSpottingEngine } from '../engines/wake-word/keyword-spotting-engine';

export class WakeWordManager implements VoiceEventEmitter {
    private config: VoiceConfiguration;
    private eventEmitter: VoiceEventEmitter;
    private logger: Console;
    
    private engines: Map<VoiceEngineType, BaseWakeWordEngine> = new Map();
    private currentEngine: BaseWakeWordEngine | null = null;
    private fallbackEngines: VoiceEngineType[] = [];
    private isDetecting: boolean = false;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
    }

    /**
     * Initialize all wake word engines
     */
    public async initialize(): Promise<void> {
        try {
            this.logger.debug('[WakeWordManager] Initializing wake word engines...');

            // Initialize engines in priority order
            const engineClasses = {
                [VoiceEngineType.OPENWAKEWORD]: OpenWakeWordEngine,
                [VoiceEngineType.KEYWORD_SPOTTING]: KeywordSpottingEngine
            };

            // Initialize all engines
            for (const [engineType, EngineClass] of Object.entries(engineClasses)) {
                try {
                    this.logger.info(`[WakeWordManager] Initializing ${engineType} engine...`);
                    const engine = new EngineClass(this.config, this.eventEmitter);
                    this.engines.set(engineType as VoiceEngineType, engine);
                    
                    // Properly await the engine initialization
                    this.logger.debug(`[WakeWordManager] Calling initialize() for ${engineType}...`);
                    await (engine as any).initialize();
                    
                    this.logger.debug(`[WakeWordManager] Checking availability for ${engineType}...`);
                    
                    if (engine.isEngineAvailable()) {
                        this.logger.info(`[WakeWordManager] ✅ ${engineType} engine available`);
                    } else {
                        this.logger.warn(`[WakeWordManager] ❌ ${engineType} engine not available`);
                        
                        // Try to test the engine explicitly
                        try {
                            const testResult = await engine.test();
                            this.logger.debug(`[WakeWordManager] Engine test result for ${engineType}: ${testResult}`);
                        } catch (testError) {
                            this.logger.error(`[WakeWordManager] Engine test failed for ${engineType}:`, testError);
                        }
                    }
                } catch (error) {
                    this.logger.error(`[WakeWordManager] Failed to initialize ${engineType}:`, error);
                }
            }

            // Set up fallback chain
            this.setupFallbackChain();

            // Set current engine
            await this.setEngine(this.config.wakeWordConfig.primary);

            this.logger.info('[WakeWordManager] Wake Word Manager initialized');

        } catch (error) {
            this.logger.error('[WakeWordManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up fallback engine chain
     */
    private setupFallbackChain(): void {
        // Define fallback priority (prefer advanced over simple)
        const fallbackPriority = [
            VoiceEngineType.OPENWAKEWORD,
            VoiceEngineType.KEYWORD_SPOTTING
        ];

        this.fallbackEngines = fallbackPriority.filter(engineType => {
            const engine = this.engines.get(engineType);
            return engine && engine.isEngineAvailable();
        });

        this.logger.debug(`[WakeWordManager] Fallback chain: ${this.fallbackEngines.join(' → ')}`);
    }

    /**
     * Set current wake word engine
     */
    public async setEngine(engineType: VoiceEngineType): Promise<boolean> {
        try {
            const engine = this.engines.get(engineType);
            
            if (engine && engine.isEngineAvailable()) {
                // Stop current detection if running
                if (this.isDetecting && this.currentEngine) {
                    await this.currentEngine.stopDetection();
                }
                
                this.currentEngine = engine;
                this.logger.info(`[WakeWordManager] Wake word engine set to: ${engineType}`);
                
                // Restart detection if it was running
                if (this.isDetecting) {
                    await this.currentEngine.startDetection();
                }
                
                return true;
            } else {
                this.logger.warn(`[WakeWordManager] Engine ${engineType} not available, using fallback`);
                return await this.setFallbackEngine();
            }
        } catch (error) {
            this.logger.error(`[WakeWordManager] Failed to set engine ${engineType}:`, error);
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
                // Stop current detection if running
                if (this.isDetecting && this.currentEngine) {
                    await this.currentEngine.stopDetection();
                }
                
                this.currentEngine = engine;
                this.logger.info(`[WakeWordManager] Using fallback wake word engine: ${engineType}`);
                
                // Restart detection if it was running
                if (this.isDetecting) {
                    await this.currentEngine.startDetection();
                }
                
                return true;
            }
        }
        
        this.logger.error('[WakeWordManager] No wake word engines available');
        return false;
    }

    /**
     * Start wake word detection
     */
    public async startDetection(): Promise<boolean> {
        if (!this.currentEngine) {
            // Try to set a fallback engine
            const fallbackSet = await this.setFallbackEngine();
            if (!fallbackSet) {
                this.logger.error('[WakeWordManager] No wake word engines available for detection');
                return false;
            }
        }

        if (this.isDetecting) {
            this.logger.warn('[WakeWordManager] Wake word detection is already running');
            return true;
        }

        try {
            const success = await this.currentEngine!.startDetection();
            if (success) {
                this.isDetecting = true;
                this.logger.info('[WakeWordManager] Wake word detection started');
            }
            return success;
        } catch (error) {
            this.logger.warn(`[WakeWordManager] Current engine failed to start detection, trying fallback: ${error.message}`);
            
            // Try fallback engines
            for (const engineType of this.fallbackEngines) {
                if (this.currentEngine && engineType === this.currentEngine.getEngineType()) {
                    continue; // Skip the already failed engine
                }
                
                const engine = this.engines.get(engineType);
                if (engine && engine.isEngineAvailable()) {
                    try {
                        const success = await engine.startDetection();
                        if (success) {
                            this.currentEngine = engine; // Switch to working engine
                            this.isDetecting = true;
                            this.logger.info(`[WakeWordManager] Switched to fallback engine: ${engineType}`);
                            return true;
                        }
                    } catch (fallbackError) {
                        this.logger.warn(`[WakeWordManager] Fallback engine ${engineType} also failed: ${fallbackError.message}`);
                    }
                }
            }
            
            this.logger.error('[WakeWordManager] All wake word engines failed to start detection');
            return false;
        }
    }

    /**
     * Stop wake word detection
     */
    public async stopDetection(): Promise<void> {
        if (!this.isDetecting) {
            return;
        }

        try {
            if (this.currentEngine) {
                await this.currentEngine.stopDetection();
            }
            this.isDetecting = false;
            this.logger.info('[WakeWordManager] Wake word detection stopped');
        } catch (error) {
            this.logger.error('[WakeWordManager] Failed to stop wake word detection:', error);
        }
    }

    /**
     * Set detection threshold
     */
    public setThreshold(threshold: number): void {
        if (this.currentEngine) {
            this.currentEngine.setThreshold(threshold);
            this.logger.debug(`[WakeWordManager] Detection threshold set to: ${threshold}`);
        }
    }

    /**
     * Add wake word model
     */
    public async addModel(model: string): Promise<boolean> {
        if (this.currentEngine) {
            const success = await this.currentEngine.addModel(model);
            if (success) {
                this.logger.info(`[WakeWordManager] Added wake word model: ${model}`);
            }
            return success;
        }
        return false;
    }

    /**
     * Remove wake word model
     */
    public async removeModel(model: string): Promise<boolean> {
        if (this.currentEngine) {
            const success = await this.currentEngine.removeModel(model);
            if (success) {
                this.logger.info(`[WakeWordManager] Removed wake word model: ${model}`);
            }
            return success;
        }
        return false;
    }

    /**
     * Get available wake word models
     */
    public async getAvailableModels(): Promise<string[]> {
        if (this.currentEngine) {
            return await this.currentEngine.getAvailableModels();
        }
        return [];
    }

    /**
     * Get current engine capabilities
     */
    public async getCapabilities(): Promise<WakeWordCapabilities | null> {
        if (this.currentEngine) {
            return await this.currentEngine.getCapabilities();
        }
        return null;
    }

    /**
     * Get available wake word engines
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
     * Check if detection is currently running
     */
    public isDetectionRunning(): boolean {
        return this.isDetecting;
    }

    /**
     * Get detection statistics
     */
    public getDetectionStats(): any {
        if (this.currentEngine) {
            return this.currentEngine.getDetectionStats();
        }
        return null;
    }

    /**
     * Report false positive detection
     */
    public reportFalsePositive(): void {
        if (this.currentEngine) {
            this.currentEngine.reportFalsePositive();
            this.logger.debug('[WakeWordManager] False positive reported');
        }
    }

    /**
     * Reset detection statistics
     */
    public resetStats(): void {
        if (this.currentEngine) {
            this.currentEngine.resetStats();
            this.logger.debug('[WakeWordManager] Detection statistics reset');
        }
    }

    /**
     * Get engine status
     */
    public getEngineStatus(): {
        currentEngine?: VoiceEngineType;
        availableEngines: VoiceEngineType[];
        fallbackChain: VoiceEngineType[];
        isDetecting: boolean;
        detectionStats?: any;
    } {
        return {
            currentEngine: this.getCurrentEngine(),
            availableEngines: this.fallbackEngines,
            fallbackChain: [...this.fallbackEngines],
            isDetecting: this.isDetecting,
            detectionStats: this.getDetectionStats()
        };
    }

    /**
     * Switch to specific engine
     */
    public async switchEngine(engineType: VoiceEngineType): Promise<boolean> {
        const success = await this.setEngine(engineType);
        if (success) {
            this.logger.info(`[WakeWordManager] Switched to engine: ${engineType}`);
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
        
        // Update current threshold if needed
        if (this.currentEngine) {
            this.currentEngine.setThreshold(config.wakeWordConfig.threshold);
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
                this.logger.warn(`[WakeWordManager] Health check failed for ${engineType}:`, error);
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
        } else if (engine && 'getKeywords' in engine) {
            return (engine as any).getDetectionStatus();
        }
        return null;
    }

    /**
     * Configure engine-specific settings
     */
    public async configureEngine(engineType: VoiceEngineType, settings: any): Promise<boolean> {
        const engine = this.engines.get(engineType);
        if (engine) {
            try {
                // Handle different engine-specific configurations
                if (engineType === VoiceEngineType.KEYWORD_SPOTTING && 'setKeywords' in engine) {
                    if (settings.keywords) {
                        (engine as any).setKeywords(settings.keywords);
                        return true;
                    }
                } else if (engineType === VoiceEngineType.OPENWAKEWORD) {
                    if (settings.models) {
                        // Load new models
                        for (const model of settings.models) {
                            await engine.addModel(model);
                        }
                        return true;
                    }
                }
                
                return false;
            } catch (error) {
                this.logger.error(`[WakeWordManager] Failed to configure ${engineType}:`, error);
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
            await this.stopDetection();
            
            // Clean up all engines
            for (const engine of this.engines.values()) {
                await engine.cleanup();
            }
            
            this.engines.clear();
            this.currentEngine = null;
            this.isDetecting = false;
            
            this.logger.debug('[WakeWordManager] Cleanup completed');
        } catch (error) {
            this.logger.error('[WakeWordManager] Cleanup error:', error);
        }
    }
}