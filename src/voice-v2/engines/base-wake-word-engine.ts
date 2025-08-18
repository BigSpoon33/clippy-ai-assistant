/**
 * Base Wake Word Detection Engine
 * Abstract base class for all wake word engines, following the Python architecture pattern
 */

import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    WakeWordDetection, 
    WakeWordCapabilities,
    VoiceEventEmitter 
} from '../types/voice-types';

export abstract class BaseWakeWordEngine {
    protected config: VoiceConfiguration;
    protected logger: Console;
    protected isAvailable: boolean = false;
    protected engineType: VoiceEngineType;
    protected eventEmitter: VoiceEventEmitter;
    protected isRunning: boolean = false;
    
    // Detection settings
    protected threshold: number = 0.5;
    protected models: string[] = [];
    protected lastDetectionTime: number = 0;
    protected minDetectionInterval: number = 2000; // 2 seconds minimum between detections
    
    // Detection statistics
    protected detectionCount: number = 0;
    protected falsePositiveCount: number = 0;

    constructor(
        engineType: VoiceEngineType,
        config: VoiceConfiguration,
        eventEmitter: VoiceEventEmitter
    ) {
        this.engineType = engineType;
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.logger = console;
        
        this.threshold = config.wakeWord.threshold;
        this.models = config.wakeWord.models;
        
        this.initialize();
    }

    /**
     * Initialize the wake word detection engine
     */
    protected abstract initialize(): Promise<void>;

    /**
     * Start wake word detection
     */
    public abstract startDetection(): Promise<boolean>;

    /**
     * Stop wake word detection
     */
    public abstract stopDetection(): Promise<void>;

    /**
     * Load wake word models
     */
    protected abstract loadModels(models: string[]): Promise<boolean>;

    /**
     * Process audio chunk for wake word detection
     */
    protected abstract processAudioChunk(audioData: ArrayBuffer): Promise<WakeWordDetection[]>;

    /**
     * Set detection threshold
     */
    public setThreshold(threshold: number): void {
        this.threshold = Math.max(0.0, Math.min(1.0, threshold));
        this.logger.debug(`[${this.engineType}] Threshold set to: ${this.threshold}`);
    }

    /**
     * Add wake word model
     */
    public abstract addModel(model: string): Promise<boolean>;

    /**
     * Remove wake word model
     */
    public abstract removeModel(model: string): Promise<boolean>;

    /**
     * Get available wake word models
     */
    public abstract getAvailableModels(): Promise<string[]>;

    /**
     * Get engine capabilities
     */
    public abstract getCapabilities(): Promise<WakeWordCapabilities>;

    /**
     * Main detection loop (to be called by concrete implementations)
     */
    protected async runDetectionLoop(): Promise<void> {
        if (!this.isAvailable || !this.isRunning) {
            return;
        }

        try {
            // Set up audio stream from microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: this.config.audio.sampleRate,
                    channelCount: this.config.audio.channels
                } 
            });

            const audioContext = new AudioContext({
                sampleRate: this.config.audio.sampleRate
            });
            
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(
                this.config.audio.chunkSize, 
                this.config.audio.channels, 
                this.config.audio.channels
            );

            processor.onaudioprocess = async (event) => {
                if (!this.isRunning) {
                    return;
                }

                try {
                    const inputBuffer = event.inputBuffer;
                    const audioData = inputBuffer.getChannelData(0);
                    
                    // Convert float32 to int16 ArrayBuffer
                    const int16Array = new Int16Array(audioData.length);
                    for (let i = 0; i < audioData.length; i++) {
                        int16Array[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
                    }
                    
                    const arrayBuffer = int16Array.buffer;
                    
                    // Process for wake words
                    const detections = await this.processAudioChunk(arrayBuffer);
                    
                    // Handle detections
                    for (const detection of detections) {
                        this.handleDetection(detection);
                    }
                } catch (error) {
                    this.handleError('audio processing', error);
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            this.logger.debug(`[${this.engineType}] Wake word detection loop started`);

            // Clean up when detection stops
            const cleanup = () => {
                processor.disconnect();
                source.disconnect();
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
                this.logger.debug(`[${this.engineType}] Detection loop cleanup completed`);
            };

            // Wait for detection to stop
            while (this.isRunning) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            cleanup();

        } catch (error) {
            this.handleError('detection loop setup', error);
            this.isRunning = false;
        }
    }

    /**
     * Handle wake word detection
     */
    protected handleDetection(detection: WakeWordDetection): void {
        const currentTime = Date.now();
        
        // Check minimum interval between detections
        if (currentTime - this.lastDetectionTime < this.minDetectionInterval) {
            this.logger.debug(`[${this.engineType}] Detection ignored - too soon after last detection`);
            return;
        }

        // Check confidence threshold
        if (detection.confidence < this.threshold) {
            this.logger.debug(`[${this.engineType}] Detection ignored - confidence too low: ${detection.confidence}`);
            return;
        }

        this.detectionCount++;
        this.lastDetectionTime = currentTime;
        
        this.logger.info(`[${this.engineType}] 🎯 Wake word detected: "${detection.wakeWord}" (confidence: ${detection.confidence.toFixed(3)})`);
        
        // Emit detection event
        this.eventEmitter.emit('wake-word-detected', detection);
    }

    /**
     * Check if engine is available
     */
    public isEngineAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Check if detection is running
     */
    public isDetectionRunning(): boolean {
        return this.isRunning;
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
        this.threshold = config.wakeWord.threshold;
        this.models = config.wakeWord.models;
    }

    /**
     * Get detection statistics
     */
    public getDetectionStats(): {
        isRunning: boolean;
        detectionCount: number;
        falsePositiveCount: number;
        lastDetectionTime: number;
        threshold: number;
        models: string[];
    } {
        return {
            isRunning: this.isRunning,
            detectionCount: this.detectionCount,
            falsePositiveCount: this.falsePositiveCount,
            lastDetectionTime: this.lastDetectionTime,
            threshold: this.threshold,
            models: [...this.models]
        };
    }

    /**
     * Test the engine
     */
    public async test(): Promise<boolean> {
        try {
            this.logger.debug(`[${this.engineType}] Testing wake word engine...`);
            
            // Test model loading
            if (this.models.length > 0) {
                const loaded = await this.loadModels(this.models.slice(0, 1)); // Test with first model
                if (!loaded) {
                    return false;
                }
            }
            
            // Test start/stop detection
            const started = await this.startDetection();
            if (started) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Brief test
                await this.stopDetection();
            }
            
            return started;
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
    }

    /**
     * Report false positive detection
     */
    public reportFalsePositive(): void {
        this.falsePositiveCount++;
        this.logger.debug(`[${this.engineType}] False positive reported. Total: ${this.falsePositiveCount}`);
    }

    /**
     * Reset detection statistics
     */
    public resetStats(): void {
        this.detectionCount = 0;
        this.falsePositiveCount = 0;
        this.lastDetectionTime = 0;
        this.logger.debug(`[${this.engineType}] Detection statistics reset`);
    }
}