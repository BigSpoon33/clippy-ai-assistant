import { EventEmitter } from 'events';
import { ClippyErrorBoundaries } from '../error-boundaries';

/**
 * Audio device information interface
 */
export interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'audiooutput';
    groupId: string;
}

/**
 * Audio configuration options
 */
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bufferSize: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
}

/**
 * Audio pipeline events for component communication
 */
export interface AudioPipelineEvents {
    'audioLevel': (level: number) => void;
    'audioData': (data: Float32Array) => void;
    'deviceChange': (devices: AudioDeviceInfo[]) => void;
    'error': (error: Error) => void;
    'streamStarted': () => void;
    'streamStopped': () => void;
}

/**
 * Audio pipeline for real-time processing and recording
 */
export class AudioPipeline extends EventEmitter {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private currentConfig: AudioConfig;
    private isInitialized: boolean = false;
    private isStreaming: boolean = false;
    private isRecording: boolean = false;
    private audioLevelInterval: number | null = null;

    constructor(config?: Partial<AudioConfig>) {
        super();
        this.currentConfig = {
            sampleRate: 44100,
            channels: 1,
            bufferSize: 4096,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...config
        };
    }

    /**
     * Initialize the audio pipeline with microphone access
     */
    async initialize(): Promise<void> {
        try {
            if (this.isInitialized) {
                return;
            }

            // Check browser support
            if (!this.checkBrowserSupport()) {
                throw new Error('Browser does not support required audio features');
            }

            // Request microphone permission
            await this.requestMicrophonePermission();

            // Initialize audio context
            this.audioContext = new AudioContext({
                sampleRate: this.currentConfig.sampleRate
            });

            this.isInitialized = true;
            console.log('Audio pipeline initialized successfully');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.initialize');
            throw error;
        }
    }

    /**
     * Start real-time audio streaming
     */
    async startStreaming(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Audio pipeline not initialized');
        }

        if (this.isStreaming) {
            return;
        }

        try {
            // Get user media
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.currentConfig.sampleRate,
                    channelCount: this.currentConfig.channels,
                    echoCancellation: this.currentConfig.echoCancellation,
                    noiseSuppression: this.currentConfig.noiseSuppression,
                    autoGainControl: this.currentConfig.autoGainControl
                }
            });

            // Set up audio processing chain
            await this.setupAudioChain();

            this.isStreaming = true;
            this.startAudioLevelMonitoring();
            this.emit('streamStarted');
            
            console.log('Audio streaming started');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.startStreaming');
            throw error;
        }
    }

    /**
     * Stop audio streaming
     */
    async stopStreaming(): Promise<void> {
        try {
            if (this.audioLevelInterval) {
                clearInterval(this.audioLevelInterval);
                this.audioLevelInterval = null;
            }

            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }

            if (this.analyser) {
                this.analyser.disconnect();
                this.analyser = null;
            }

            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            this.isStreaming = false;
            this.emit('streamStopped');
            
            console.log('Audio streaming stopped');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.stopStreaming');
        }
    }

    /**
     * Start recording audio to file
     */
    async startRecording(options?: { mimeType?: string }): Promise<void> {
        if (!this.mediaStream) {
            throw new Error('No audio stream available for recording');
        }

        if (this.isRecording) {
            return;
        }

        try {
            const mimeType = options?.mimeType || this.getBestMimeType();
            
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(100); // Record in 100ms chunks
            this.isRecording = true;
            
            console.log('Audio recording started');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.startRecording');
            throw error;
        }
    }

    /**
     * Stop recording and return audio data
     */
    async stopRecording(): Promise<Blob> {
        if (!this.mediaRecorder || !this.isRecording) {
            throw new Error('No active recording');
        }

        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('MediaRecorder is null'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                try {
                    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                    const recordedBlob = new Blob(this.recordedChunks, { type: mimeType });
                    this.recordedChunks = [];
                    this.isRecording = false;
                    console.log('Audio recording stopped, blob size:', recordedBlob.size);
                    resolve(recordedBlob);
                } catch (error: any) {
                    ClippyErrorBoundaries.handleError(error, 'AudioPipeline.stopRecording.onstop');
                    reject(error);
                }
            };

            this.mediaRecorder.onerror = (event: any) => {
                reject(new Error(`Recording error: ${event.error}`));
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Get current audio level (0-1)
     */
    getAudioLevel(): number {
        if (!this.analyser) {
            return 0;
        }

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((acc, value) => acc + value, 0);
        const average = sum / dataArray.length;
        
        return Math.min(average / 128, 1); // Normalize to 0-1
    }

    /**
     * Get available audio devices
     */
    async getAudioDevices(): Promise<AudioDeviceInfo[]> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices
                .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label,
                    kind: device.kind as 'audioinput' | 'audiooutput',
                    groupId: device.groupId
                }));
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.getAudioDevices');
            return [];
        }
    }

    /**
     * Switch to a different audio input device
     */
    async switchAudioDevice(deviceId: string): Promise<void> {
        try {
            // Stop current stream
            await this.stopStreaming();

            // Start with new device
            await this.startStreaming();
            
            console.log(`Switched to audio device: ${deviceId}`);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.switchAudioDevice');
            throw error;
        }
    }

    /**
     * Update audio configuration
     */
    async updateConfig(newConfig: Partial<AudioConfig>): Promise<void> {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        
        // Restart streaming if active to apply new config
        if (this.isStreaming) {
            await this.stopStreaming();
            await this.startStreaming();
        }
    }

    /**
     * Get current pipeline status
     */
    getStatus(): {
        initialized: boolean;
        streaming: boolean;
        recording: boolean;
        audioLevel: number;
        config: AudioConfig;
    } {
        return {
            initialized: this.isInitialized,
            streaming: this.isStreaming,
            recording: this.isRecording,
            audioLevel: this.getAudioLevel(),
            config: { ...this.currentConfig }
        };
    }

    /**
     * Clean up all resources
     */
    async cleanup(): Promise<void> {
        try {
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            if (this.isStreaming) {
                await this.stopStreaming();
            }

            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            this.removeAllListeners();
            this.isInitialized = false;
            
            console.log('Audio pipeline cleaned up');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.cleanup');
        }
    }

    /**
     * Check browser support for required features
     */
    private checkBrowserSupport(): boolean {
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            (window.AudioContext || (window as any).webkitAudioContext) &&
            window.MediaRecorder
        );
    }

    /**
     * Request microphone permission
     */
    private async requestMicrophonePermission(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (error: any) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone permission denied. Please allow microphone access in browser settings.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No microphone found. Please ensure a microphone is connected.');
            }
            throw error;
        }
    }

    /**
     * Set up the audio processing chain
     */
    private async setupAudioChain(): Promise<void> {
        if (!this.audioContext || !this.mediaStream) {
            throw new Error('Audio context or media stream not available');
        }

        try {
            // Create audio source
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create analyser for audio level monitoring
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.8;

            // Create script processor for real-time audio processing
            this.processor = this.audioContext.createScriptProcessor(
                this.currentConfig.bufferSize,
                this.currentConfig.channels,
                this.currentConfig.channels
            );

            this.processor.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer;
                const audioData = inputBuffer.getChannelData(0);
                this.emit('audioData', audioData);
            };

            // Connect the chain
            source.connect(this.analyser);
            this.analyser.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'AudioPipeline.setupAudioChain');
            throw error;
        }
    }

    /**
     * Start monitoring audio level
     */
    private startAudioLevelMonitoring(): void {
        this.audioLevelInterval = window.setInterval(() => {
            const level = this.getAudioLevel();
            this.emit('audioLevel', level);
        }, 100);
    }

    /**
     * Get the best available MIME type for recording
     */
    private getBestMimeType(): string {
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];

        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }

        return 'audio/webm'; // Fallback
    }
}