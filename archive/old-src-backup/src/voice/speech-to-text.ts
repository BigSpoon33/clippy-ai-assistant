import { EventEmitter } from 'events';
import { pipeline, AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';
import { ClippyErrorBoundaries } from '../error-boundaries';
import type { ClippySettings } from '../types';

/**
 * Speech-to-Text events for component communication
 */
export interface SpeechToTextEvents {
    'speechRecognized': (text: string, confidence: number) => void;
    'speechStarted': () => void;
    'speechEnded': () => void;
    'processing': (progress: number) => void;
    'error': (error: Error) => void;
}

/**
 * STT Engine types for different providers
 */
export type STTEngine = 'whisper' | 'browser' | 'hybrid';

/**
 * Speech recognition configuration
 */
export interface SpeechConfig {
    engine: STTEngine;
    model: string;
    language: string;
    continuous: boolean;
    interimResults: boolean;
    maxSpeechLength: number;
    silenceThreshold: number;
    confidenceThreshold: number;
}

/**
 * Recognition result with metadata
 */
export interface RecognitionResult {
    text: string;
    confidence: number;
    isFinal: boolean;
    alternatives?: { text: string; confidence: number }[];
    processingTime: number;
}

/**
 * Speech-to-Text Engine with multiple provider support
 */
export class SpeechToText extends EventEmitter {
    private settings: ClippySettings;
    private whisperPipeline: AutomaticSpeechRecognitionPipeline | null = null;
    private speechRecognition: any = null; // Browser SpeechRecognition API
    private currentEngine: STTEngine;
    private isInitialized: boolean = false;
    private isListening: boolean = false;
    private isProcessing: boolean = false;
    private audioContext: AudioContext | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private silenceTimer: number | null = null;
    private speechStartTime: number = 0;

    constructor(settings: ClippySettings) {
        super();
        this.settings = settings;
        this.currentEngine = this.selectBestEngine();
    }

    /**
     * Initialize the speech-to-text engine
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log(`Initializing STT with engine: ${this.currentEngine}`);

            switch (this.currentEngine) {
                case 'whisper':
                    await this.initializeWhisper();
                    break;
                case 'browser':
                    await this.initializeBrowserSpeech();
                    break;
                case 'hybrid':
                    await this.initializeHybrid();
                    break;
                default:
                    throw new Error(`Unknown STT engine: ${this.currentEngine}`);
            }

            this.isInitialized = true;
            console.log('Speech-to-text initialized successfully');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'SpeechToText.initialize');
            // Fallback to browser speech if Whisper fails
            if (this.currentEngine !== 'browser') {
                console.warn('Primary STT engine failed, falling back to browser speech recognition');
                this.currentEngine = 'browser';
                await this.initializeBrowserSpeech();
                this.isInitialized = true;
            } else {
                throw error;
            }
        }
    }

    /**
     * Start listening for speech
     */
    async start(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Speech-to-text not initialized');
        }

        if (this.isListening) {
            return;
        }

        try {
            console.log('Starting speech recognition');
            this.speechStartTime = Date.now();
            this.emit('speechStarted');

            switch (this.currentEngine) {
                case 'whisper':
                    await this.startWhisperListening();
                    break;
                case 'browser':
                    await this.startBrowserListening();
                    break;
                case 'hybrid':
                    await this.startHybridListening();
                    break;
            }

            this.isListening = true;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'SpeechToText.start');
            throw error;
        }
    }

    /**
     * Stop listening for speech
     */
    async stop(): Promise<void> {
        if (!this.isListening) {
            return;
        }

        try {
            console.log('Stopping speech recognition');

            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            switch (this.currentEngine) {
                case 'whisper':
                    await this.stopWhisperListening();
                    break;
                case 'browser':
                    await this.stopBrowserListening();
                    break;
                case 'hybrid':
                    await this.stopHybridListening();
                    break;
            }

            this.isListening = false;
            this.emit('speechEnded');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'SpeechToText.stop');
        }
    }

    /**
     * Process audio blob with STT
     */
    async processAudio(audioBlob: Blob): Promise<RecognitionResult> {
        if (!this.isInitialized) {
            throw new Error('Speech-to-text not initialized');
        }

        const startTime = Date.now();
        
        try {
            this.isProcessing = true;
            this.emit('processing', 0);

            let result: RecognitionResult;

            switch (this.currentEngine) {
                case 'whisper':
                    result = await this.processWithWhisper(audioBlob);
                    break;
                case 'browser':
                    result = await this.processWithBrowser(audioBlob);
                    break;
                case 'hybrid':
                    result = await this.processWithHybrid(audioBlob);
                    break;
                default:
                    throw new Error(`Unknown STT engine: ${this.currentEngine}`);
            }

            result.processingTime = Date.now() - startTime;
            this.emit('processing', 100);
            
            return result;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'SpeechToText.processAudio');
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Update settings and reconfigure if needed
     */
    async updateSettings(newSettings: ClippySettings): Promise<void> {
        const engineChanged = newSettings.voice.sttEngine !== this.settings.voice.sttEngine;
        const modelChanged = newSettings.voice.whisperModel !== this.settings.voice.whisperModel;

        this.settings = newSettings;

        if ((engineChanged || modelChanged) && this.isInitialized) {
            // Reinitialize with new settings
            const wasListening = this.isListening;
            await this.stop();
            await this.cleanup();
            this.currentEngine = newSettings.voice.sttEngine as STTEngine;
            await this.initialize();
            if (wasListening) {
                await this.start();
            }
        }
    }

    /**
     * Check if currently listening
     */
    isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Check if currently processing
     */
    isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    /**
     * Get current STT status
     */
    getStatus(): {
        initialized: boolean;
        listening: boolean;
        processing: boolean;
        engine: STTEngine;
        model: string;
    } {
        return {
            initialized: this.isInitialized,
            listening: this.isListening,
            processing: this.isProcessing,
            engine: this.currentEngine,
            model: this.settings.voice.whisperModel
        };
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        try {
            await this.stop();

            if (this.whisperPipeline) {
                // Note: Transformers.js doesn't have explicit cleanup method
                this.whisperPipeline = null;
            }

            if (this.speechRecognition) {
                this.speechRecognition = null;
            }

            if (this.mediaRecorder) {
                this.mediaRecorder = null;
            }

            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            this.recordedChunks = [];
            this.removeAllListeners();
            this.isInitialized = false;
            
            console.log('Speech-to-text cleaned up');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'SpeechToText.cleanup');
        }
    }

    /**
     * Select the best available STT engine
     */
    private selectBestEngine(): STTEngine {
        // Use setting preference if available
        if (this.settings.voice.sttEngine) {
            return this.settings.voice.sttEngine as STTEngine;
        }

        // Check for WebAssembly support for Whisper
        if (typeof window !== 'undefined' && window.WebAssembly) {
            return 'whisper';
        }

        // Check for browser speech recognition
        if (typeof window !== 'undefined' && 
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            return 'browser';
        }

        // Default fallback
        return 'browser';
    }

    /**
     * Initialize Whisper STT engine
     */
    private async initializeWhisper(): Promise<void> {
        try {
            const modelId = this.settings.voice.whisperModel || 'Xenova/whisper-tiny.en';
            console.log(`Loading Whisper model: ${modelId}`);

            this.whisperPipeline = await pipeline(
                'automatic-speech-recognition',
                modelId,
                {
                    quantized: true, // Use quantized model for better performance
                    progress_callback: (progress: any) => {
                        if (progress.status === 'progress') {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            console.log(`Loading Whisper model: ${percent}%`);
                        }
                    }
                }
            );

            console.log('Whisper pipeline initialized successfully');
        } catch (error: any) {
            throw new Error(`Failed to initialize Whisper: ${error.message}`);
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
            this.speechRecognition.lang = this.settings.voice.language || 'en-US';

            this.speechRecognition.onresult = this.handleBrowserSpeechResult.bind(this);
            this.speechRecognition.onerror = this.handleBrowserSpeechError.bind(this);
            this.speechRecognition.onend = this.handleBrowserSpeechEnd.bind(this);

            console.log('Browser speech recognition initialized successfully');
        } catch (error: any) {
            throw new Error(`Failed to initialize browser speech recognition: ${error.message}`);
        }
    }

    /**
     * Initialize hybrid mode
     */
    private async initializeHybrid(): Promise<void> {
        try {
            await Promise.all([
                this.initializeWhisper(),
                this.initializeBrowserSpeech()
            ]);
            console.log('Hybrid STT initialized');
        } catch (error: any) {
            console.warn('Hybrid STT initialization failed, falling back to browser only');
            this.currentEngine = 'browser';
            await this.initializeBrowserSpeech();
        }
    }

    /**
     * Start Whisper-based listening
     */
    private async startWhisperListening(): Promise<void> {
        try {
            // Set up audio recording for Whisper processing
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                if (this.recordedChunks.length > 0) {
                    const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                    try {
                        const result = await this.processWithWhisper(audioBlob);
                        if (result.text.trim()) {
                            this.emit('speechRecognized', result.text, result.confidence);
                        }
                    } catch (error: any) {
                        this.emit('error', error);
                    }
                }
            };

            // Start recording in chunks
            this.mediaRecorder.start(1000); // 1 second chunks
            
            // Set up silence detection
            this.setupSilenceDetection(stream);
        } catch (error: any) {
            throw new Error(`Failed to start Whisper listening: ${error.message}`);
        }
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
        // Primary: Whisper for accuracy, Fallback: Browser for real-time
        try {
            await this.startBrowserListening(); // Immediate feedback
            // Whisper processing will happen in background
        } catch (error) {
            console.warn('Browser speech failed, using Whisper only');
            await this.startWhisperListening();
        }
    }

    /**
     * Stop Whisper listening
     */
    private async stopWhisperListening(): Promise<void> {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Stop browser listening
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
            this.stopWhisperListening(),
            this.stopBrowserListening()
        ]);
    }

    /**
     * Process audio with Whisper
     */
    private async processWithWhisper(audioBlob: Blob): Promise<RecognitionResult> {
        if (!this.whisperPipeline) {
            throw new Error('Whisper pipeline not initialized');
        }

        try {
            // Convert blob to array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Convert to the format expected by Whisper
            const audioArray = await this.convertAudioForWhisper(arrayBuffer);
            
            this.emit('processing', 25);

            // Run inference
            const output = await this.whisperPipeline(audioArray, {
                language: this.settings.voice.language?.split('-')[0] || 'english',
                task: 'transcribe',
                chunk_length_s: 30,
                stride_length_s: 5,
            });

            this.emit('processing', 75);

            // Handle both single output and array outputs
            const outputText = Array.isArray(output) ? 
                (output.length > 0 ? output[0].text || '' : '') :
                (output as any).text || '';

            const result: RecognitionResult = {
                text: outputText,
                confidence: 0.9, // Whisper doesn't provide confidence scores easily
                isFinal: true,
                processingTime: 0 // Will be set by caller
            };

            return result;
        } catch (error: any) {
            throw new Error(`Whisper processing failed: ${error.message}`);
        }
    }

    /**
     * Process audio with browser speech recognition
     */
    private async processWithBrowser(audioBlob: Blob): Promise<RecognitionResult> {
        // Browser speech recognition processes in real-time
        // This method is mainly for consistency, actual processing happens in event handlers
        return {
            text: '',
            confidence: 0,
            isFinal: true,
            processingTime: 0
        };
    }

    /**
     * Process audio with hybrid approach
     */
    private async processWithHybrid(audioBlob: Blob): Promise<RecognitionResult> {
        try {
            // Use Whisper for final high-accuracy result
            const whisperResult = await this.processWithWhisper(audioBlob);
            return whisperResult;
        } catch (error) {
            // Fallback to browser result if available
            console.warn('Whisper processing failed, using browser result');
            return this.processWithBrowser(audioBlob);
        }
    }

    /**
     * Convert audio to format suitable for Whisper
     */
    private async convertAudioForWhisper(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const audioData = audioBuffer.getChannelData(0);
            
            // Resample to 16kHz if needed
            if (audioBuffer.sampleRate !== 16000) {
                return this.resampleAudio(audioData, audioBuffer.sampleRate, 16000);
            }
            
            return audioData;
        } finally {
            await audioContext.close();
        }
    }

    /**
     * Simple audio resampling
     */
    private resampleAudio(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
        const ratio = fromSampleRate / toSampleRate;
        const newLength = Math.round(audioData.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const index = Math.min(Math.round(i * ratio), audioData.length - 1);
            result[i] = audioData[index];
        }
        
        return result;
    }

    /**
     * Set up silence detection for automatic speech segmentation
     */
    private setupSilenceDetection(stream: MediaStream): void {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkSilence = () => {
            if (!this.isListening) {
                audioContext.close();
                return;
            }

            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, value) => acc + value, 0) / bufferLength;
            
            if (average < (this.settings.voice.silenceThreshold || 20)) {
                // Silence detected
                if (!this.silenceTimer) {
                    this.silenceTimer = window.setTimeout(() => {
                        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                            this.mediaRecorder.stop();
                        }
                        this.silenceTimer = null;
                    }, 2000); // 2 seconds of silence
                }
            } else {
                // Speech detected
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
            }

            setTimeout(checkSilence, 100);
        };

        checkSilence();
    }

    /**
     * Handle browser speech recognition results
     */
    private handleBrowserSpeechResult(event: any): void {
        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.8;
        const isFinal = result.isFinal;

        if (isFinal && transcript.trim()) {
            this.emit('speechRecognized', transcript, confidence);
        }
    }

    /**
     * Handle browser speech recognition errors
     */
    private handleBrowserSpeechError(event: any): void {
        console.warn('Browser speech recognition error:', event.error);
        this.emit('error', new Error(`Speech recognition error: ${event.error}`));
    }

    /**
     * Handle browser speech recognition end
     */
    private handleBrowserSpeechEnd(): void {
        // Will be handled by the main stop() method
    }
}