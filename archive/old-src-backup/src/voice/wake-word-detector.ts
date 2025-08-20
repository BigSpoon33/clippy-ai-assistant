import { EventEmitter } from 'events';
import { PorcupineWebSDK } from '@picovoice/porcupine-web';
import { ClippyErrorBoundaries } from '../error-boundaries';
import type { ClippySettings } from '../types';

/**
 * Wake word detection events
 */
export interface WakeWordEvents {
    'wakeWordDetected': (wakeWord: string) => void;
    'listening': () => void;
    'stopped': () => void;
    'error': (error: Error) => void;
}

/**
 * Wake word detection engines
 */
export type WakeWordEngine = 'porcupine' | 'browser' | 'hybrid';

/**
 * Wake word configuration
 */
export interface WakeWordConfig {
    engine: WakeWordEngine;
    sensitivity: number;
    wakeWord: string;
    customWakeWords: string[];
    continuousListening: boolean;
    timeoutMs: number;
}

/**
 * Wake Word Detector with multiple engine support
 */
export class WakeWordDetector extends EventEmitter {
    private settings: ClippySettings;
    private porcupineSDK: PorcupineWebSDK | null = null;
    private speechRecognition: any = null; // Browser SpeechRecognition API
    private isListening: boolean = false;
    private isInitialized: boolean = false;
    private currentEngine: WakeWordEngine;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processorNode: ScriptProcessorNode | null = null;
    private restartTimeout: number | null = null;
    private cpuMonitorInterval: number | null = null;
    private cpuUsage: number = 0;

    constructor(settings: ClippySettings) {
        super();
        this.settings = settings;
        this.currentEngine = this.selectBestEngine();
    }

    /**
     * Initialize the wake word detector
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log(`Initializing wake word detector with engine: ${this.currentEngine}`);

            switch (this.currentEngine) {
                case 'porcupine':
                    await this.initializePorcupine();
                    break;
                case 'browser':
                    await this.initializeBrowserSpeech();
                    break;
                case 'hybrid':
                    await this.initializeHybrid();
                    break;
                default:
                    throw new Error(`Unknown wake word engine: ${this.currentEngine}`);
            }

            this.isInitialized = true;
            this.startCpuMonitoring();
            console.log('Wake word detector initialized successfully');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'WakeWordDetector.initialize');
            // Fallback to browser speech if Porcupine fails
            if (this.currentEngine !== 'browser') {
                console.warn('Primary engine failed, falling back to browser speech recognition');
                this.currentEngine = 'browser';
                await this.initializeBrowserSpeech();
                this.isInitialized = true;
            } else {
                throw error;
            }
        }
    }

    /**
     * Start wake word detection
     */
    async start(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Wake word detector not initialized');
        }

        if (this.isListening) {
            return;
        }

        try {
            console.log('Starting wake word detection');

            switch (this.currentEngine) {
                case 'porcupine':
                    await this.startPorcupineListening();
                    break;
                case 'browser':
                    await this.startBrowserListening();
                    break;
                case 'hybrid':
                    await this.startHybridListening();
                    break;
            }

            this.isListening = true;
            this.emit('listening');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'WakeWordDetector.start');
            throw error;
        }
    }

    /**
     * Stop wake word detection
     */
    async stop(): Promise<void> {
        try {
            console.log('Stopping wake word detection');

            if (this.restartTimeout) {
                clearTimeout(this.restartTimeout);
                this.restartTimeout = null;
            }

            switch (this.currentEngine) {
                case 'porcupine':
                    await this.stopPorcupineListening();
                    break;
                case 'browser':
                    await this.stopBrowserListening();
                    break;
                case 'hybrid':
                    await this.stopHybridListening();
                    break;
            }

            this.isListening = false;
            this.emit('stopped');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'WakeWordDetector.stop');
        }
    }

    /**
     * Update settings and reconfigure if needed
     */
    async updateSettings(newSettings: ClippySettings): Promise<void> {
        const wakeWordChanged = newSettings.voice.wakeWord !== this.settings.voice.wakeWord;
        const customWordsChanged = JSON.stringify(newSettings.voice.customWakeWords) !== 
                                  JSON.stringify(this.settings.voice.customWakeWords);

        this.settings = newSettings;

        if ((wakeWordChanged || customWordsChanged) && this.isInitialized) {
            // Restart detection with new settings
            const wasListening = this.isListening;
            await this.stop();
            await this.cleanup();
            await this.initialize();
            if (wasListening) {
                await this.start();
            }
        }
    }

    /**
     * Check if currently listening for wake words
     */
    isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Get current detection status
     */
    getStatus(): {
        initialized: boolean;
        listening: boolean;
        engine: WakeWordEngine;
        wakeWord: string;
        cpuUsage: number;
    } {
        return {
            initialized: this.isInitialized,
            listening: this.isListening,
            engine: this.currentEngine,
            wakeWord: this.settings.voice.wakeWord,
            cpuUsage: this.cpuUsage
        };
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        try {
            await this.stop();

            if (this.cpuMonitorInterval) {
                clearInterval(this.cpuMonitorInterval);
                this.cpuMonitorInterval = null;
            }

            if (this.porcupineSDK) {
                await this.porcupineSDK.release();
                this.porcupineSDK = null;
            }

            if (this.speechRecognition) {
                this.speechRecognition = null;
            }

            if (this.processorNode) {
                this.processorNode.disconnect();
                this.processorNode = null;
            }

            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            this.removeAllListeners();
            this.isInitialized = false;
            
            console.log('Wake word detector cleaned up');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'WakeWordDetector.cleanup');
        }
    }

    /**
     * Select the best available wake word engine
     */
    private selectBestEngine(): WakeWordEngine {
        // Check for Porcupine support
        if (typeof window !== 'undefined' && window.WebAssembly) {
            return 'porcupine';
        }

        // Check for browser speech recognition
        if (typeof window !== 'undefined' && 
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            return 'browser';
        }

        // Default to browser with fallback
        return 'browser';
    }

    /**
     * Initialize Porcupine wake word detection
     */
    private async initializePorcupine(): Promise<void> {
        try {
            // Get audio context and stream
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Initialize Porcupine SDK
            this.porcupineSDK = new PorcupineWebSDK({
                accessKey: this.settings.voice.porcupineAccessKey || 'demo', // Use demo key for testing
                keywords: this.getDetectionKeywords(),
                sensitivities: new Array(this.getDetectionKeywords().length).fill(0.5)
            });

            await this.porcupineSDK.start();
            console.log('Porcupine initialized successfully');
        } catch (error: any) {
            throw new Error(`Failed to initialize Porcupine: ${error.message}`);
        }
    }

    /**
     * Initialize browser speech recognition
     */
    private async initializeBrowserSpeech(): Promise<void> {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                throw new Error('Browser does not support speech recognition');
            }

            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'en-US';

            this.speechRecognition.onresult = this.handleBrowserSpeechResult.bind(this);
            this.speechRecognition.onerror = this.handleBrowserSpeechError.bind(this);
            this.speechRecognition.onend = this.handleBrowserSpeechEnd.bind(this);

            console.log('Browser speech recognition initialized successfully');
        } catch (error: any) {
            throw new Error(`Failed to initialize browser speech recognition: ${error.message}`);
        }
    }

    /**
     * Initialize hybrid mode (both engines)
     */
    private async initializeHybrid(): Promise<void> {
        try {
            await Promise.all([
                this.initializePorcupine(),
                this.initializeBrowserSpeech()
            ]);
            console.log('Hybrid wake word detection initialized');
        } catch (error: any) {
            // If hybrid fails, fall back to browser only
            console.warn('Hybrid initialization failed, falling back to browser only');
            this.currentEngine = 'browser';
            await this.initializeBrowserSpeech();
        }
    }

    /**
     * Start Porcupine listening
     */
    private async startPorcupineListening(): Promise<void> {
        if (!this.porcupineSDK || !this.audioContext || !this.mediaStream) {
            throw new Error('Porcupine not properly initialized');
        }

        // Set up audio processing
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processorNode.onaudioprocess = async (event) => {
            if (!this.porcupineSDK) return;

            const inputBuffer = event.inputBuffer.getChannelData(0);
            const detectionResult = await this.porcupineSDK.process(inputBuffer);

            if (detectionResult.isKeywordDetected) {
                const keyword = this.getDetectionKeywords()[detectionResult.keywordIndex];
                console.log(`Porcupine detected wake word: ${keyword}`);
                this.emit('wakeWordDetected', keyword);
            }
        };

        source.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
    }

    /**
     * Start browser speech listening
     */
    private async startBrowserListening(): Promise<void> {
        if (!this.speechRecognition) {
            throw new Error('Browser speech recognition not initialized');
        }

        try {
            this.speechRecognition.start();
        } catch (error: any) {
            if (error.name === 'InvalidStateError') {
                // Already started, ignore
                return;
            }
            throw error;
        }
    }

    /**
     * Start hybrid listening
     */
    private async startHybridListening(): Promise<void> {
        await Promise.all([
            this.startPorcupineListening(),
            this.startBrowserListening()
        ]);
    }

    /**
     * Stop Porcupine listening
     */
    private async stopPorcupineListening(): Promise<void> {
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        if (this.porcupineSDK) {
            await this.porcupineSDK.stop();
        }
    }

    /**
     * Stop browser speech listening
     */
    private async stopBrowserListening(): Promise<void> {
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch (error) {
                // Ignore errors when stopping
            }
        }
    }

    /**
     * Stop hybrid listening
     */
    private async stopHybridListening(): Promise<void> {
        await Promise.all([
            this.stopPorcupineListening(),
            this.stopBrowserListening()
        ]);
    }

    /**
     * Handle browser speech recognition results
     */
    private handleBrowserSpeechResult(event: any): void {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        
        const wakeWords = this.getAllWakeWords();
        for (const wakeWord of wakeWords) {
            if (transcript.includes(wakeWord.toLowerCase())) {
                console.log(`Browser detected wake word: ${wakeWord}`);
                this.emit('wakeWordDetected', wakeWord);
                return;
            }
        }
    }

    /**
     * Handle browser speech recognition errors
     */
    private handleBrowserSpeechError(event: any): void {
        console.warn('Browser speech recognition error:', event.error);
        
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
            // These are common and not critical, restart automatically
            this.scheduleRestart();
        } else {
            this.emit('error', new Error(`Speech recognition error: ${event.error}`));
        }
    }

    /**
     * Handle browser speech recognition end
     */
    private handleBrowserSpeechEnd(): void {
        if (this.isListening) {
            // Restart automatically if we should still be listening
            this.scheduleRestart();
        }
    }

    /**
     * Schedule automatic restart of speech recognition
     */
    private scheduleRestart(): void {
        if (this.restartTimeout) return;

        this.restartTimeout = window.setTimeout(async () => {
            this.restartTimeout = null;
            if (this.isListening) {
                try {
                    await this.startBrowserListening();
                } catch (error: any) {
                    ClippyErrorBoundaries.handleError(error, 'WakeWordDetector.scheduleRestart');
                }
            }
        }, 1000);
    }

    /**
     * Get all wake words for detection
     */
    private getAllWakeWords(): string[] {
        const words = [this.settings.voice.wakeWord];
        if (this.settings.voice.customWakeWords) {
            words.push(...this.settings.voice.customWakeWords);
        }
        return words.filter(word => word && word.trim().length > 0);
    }

    /**
     * Get keywords for Porcupine detection
     */
    private getDetectionKeywords(): string[] {
        // Porcupine has built-in keywords, map our wake words to them
        const keywordMap: Record<string, string> = {
            'hey clippy': 'hey siri', // Use similar keyword
            'clippy': 'computer',
            'assistant': 'computer'
        };

        const wakeWord = this.settings.voice.wakeWord.toLowerCase();
        return [keywordMap[wakeWord] || 'computer'];
    }

    /**
     * Start CPU usage monitoring
     */
    private startCpuMonitoring(): void {
        let lastTime = performance.now();
        let lastUsage = 0;

        this.cpuMonitorInterval = window.setInterval(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            // Simple CPU usage estimation based on processing time
            // This is a rough estimate, not precise CPU measurement
            this.cpuUsage = Math.min((lastUsage + deltaTime) / 100, 1);
            lastTime = currentTime;
            lastUsage = this.cpuUsage;
        }, 5000);
    }
}