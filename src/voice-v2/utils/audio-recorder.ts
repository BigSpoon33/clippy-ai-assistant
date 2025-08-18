/**
 * Audio Recorder Utility
 * Handles audio recording from microphone with various format support
 */

import { VoiceConfiguration, AudioChunk, AudioVisualizerData, VADConfig } from '../types/voice-types';
import { VADEngine } from './vad-engine';

export interface RecordingOptions {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    format?: 'wav' | 'webm' | 'mp4';
    deviceId?: string;
}

export interface RecordingResult {
    audioData: ArrayBuffer;
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    filePath?: string;
}

export class AudioRecorder {
    private config: VoiceConfiguration;
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private isRecording: boolean = false;
    private recordingChunks: Blob[] = [];
    private logger: Console;

    constructor(config: VoiceConfiguration) {
        this.config = config;
        this.logger = console;
    }

    /**
     * Record audio from microphone
     */
    public async recordFromMicrophone(options: RecordingOptions = {}): Promise<RecordingResult> {
        const {
            duration = 5,
            sampleRate = this.config.audio.sampleRate,
            channels = this.config.audio.channels,
            format = 'wav',
            deviceId = this.config.audio.inputDeviceId
        } = options;

        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        try {
            this.logger.debug(`[AudioRecorder] Starting recording: ${duration}s, ${sampleRate}Hz, ${channels}ch, ${format}`);

            // Request microphone access
            const constraints: MediaStreamConstraints = {
                audio: {
                    sampleRate: sampleRate,
                    channelCount: channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    ...(deviceId && { deviceId: { exact: deviceId } })
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Initialize audio recording
            const result = await this.performRecording(duration, format);
            
            this.logger.debug(`[AudioRecorder] Recording completed: ${result.duration}ms`);
            return result;

        } catch (error) {
            this.cleanup();
            throw new Error(`Recording failed: ${error.message}`);
        }
    }

    /**
     * Start continuous recording with chunk callback
     */
    public async startContinuousRecording(
        onAudioChunk: (chunk: AudioChunk) => void,
        options: RecordingOptions = {}
    ): Promise<void> {
        const {
            sampleRate = this.config.audio.sampleRate,
            channels = this.config.audio.channels,
            deviceId = this.config.audio.inputDeviceId
        } = options;

        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        try {
            this.logger.debug(`[AudioRecorder] Starting continuous recording: ${sampleRate}Hz, ${channels}ch`);

            // Request microphone access
            const constraints: MediaStreamConstraints = {
                audio: {
                    sampleRate: sampleRate,
                    channelCount: channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    ...(deviceId && { deviceId: { exact: deviceId } })
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create audio context for processing
            this.audioContext = new AudioContext({ sampleRate: sampleRate });
            const source = this.audioContext.createMediaStreamSource(this.stream);
            
            // Create script processor for audio chunks
            const processor = this.audioContext.createScriptProcessor(
                this.config.audio.chunkSize,
                channels,
                channels
            );

            processor.onaudioprocess = (event) => {
                if (!this.isRecording) return;

                const inputBuffer = event.inputBuffer;
                const audioData = new Float32Array(inputBuffer.length * channels);
                
                // Interleave channels
                for (let channel = 0; channel < channels; channel++) {
                    const channelData = inputBuffer.getChannelData(channel);
                    for (let i = 0; i < channelData.length; i++) {
                        audioData[i * channels + channel] = channelData[i];
                    }
                }

                // Convert to Int16Array
                const int16Array = new Int16Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    int16Array[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
                }

                const chunk: AudioChunk = {
                    data: int16Array.buffer,
                    timestamp: Date.now(),
                    sampleRate: sampleRate,
                    channels: channels
                };

                onAudioChunk(chunk);
            };

            source.connect(processor);
            processor.connect(this.audioContext.destination);

            this.isRecording = true;
            this.logger.debug(`[AudioRecorder] Continuous recording started`);

        } catch (error) {
            this.cleanup();
            throw new Error(`Failed to start continuous recording: ${error.message}`);
        }
    }

    /**
     * Stop continuous recording
     */
    public stopContinuousRecording(): void {
        if (!this.isRecording) {
            return;
        }

        this.logger.debug(`[AudioRecorder] Stopping continuous recording`);
        this.isRecording = false;
        this.cleanup();
    }

    /**
     * Get available audio input devices
     */
    public async getAvailableInputDevices(): Promise<MediaDeviceInfo[]> {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput');
        } catch (error) {
            this.logger.error(`[AudioRecorder] Failed to get input devices:`, error);
            return [];
        }
    }

    /**
     * Test audio input device
     */
    public async testInputDevice(deviceId?: string): Promise<boolean> {
        try {
            const constraints: MediaStreamConstraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            const testStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Test for a brief moment
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Cleanup
            testStream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (error) {
            this.logger.error(`[AudioRecorder] Device test failed:`, error);
            return false;
        }
    }

    /**
     * Get current audio levels (for visualizing input)
     */
    public async getAudioLevels(
        onLevelUpdate: (level: number) => void,
        deviceId?: string
    ): Promise<() => void> {
        try {
            const constraints: MediaStreamConstraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            
            analyser.fftSize = 256;
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let isActive = true;

            const updateLevel = () => {
                if (!isActive) return;

                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average level
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                const normalizedLevel = average / 255;
                
                onLevelUpdate(normalizedLevel);
                requestAnimationFrame(updateLevel);
            };

            updateLevel();

            // Return cleanup function
            return () => {
                isActive = false;
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            };

        } catch (error) {
            throw new Error(`Failed to get audio levels: ${error.message}`);
        }
    }

    /**
     * Get enhanced audio visualizer data with VAD (Voice Activity Detection)
     * Extends getAudioLevels() with VAD algorithms and confidence scoring
     */
    public async getAudioVisualizerData(
        onUpdate: (data: AudioVisualizerData) => void,
        config: VADConfig = {
            enabled: true,
            algorithm: 'simple',
            thresholds: { speech: 0.5, silence: 0.35, confidence: 0.8 },
            sampleRate: 16000,
            frameSize: 512
        },
        deviceId?: string
    ): Promise<() => void> {
        try {
            // Setup microphone with VAD-optimized constraints
            const constraints: MediaStreamConstraints = {
                audio: {
                    sampleRate: config.sampleRate,
                    channelCount: 1,      // Mono for performance
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    ...(deviceId && { deviceId: { exact: deviceId } })
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const audioContext = new AudioContext({ sampleRate: config.sampleRate });
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            
            // Optimize analyser for VAD + visualization
            analyser.fftSize = config.frameSize;  // Good balance of resolution vs performance
            analyser.smoothingTimeConstant = 0.3; // More responsive for voice
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            source.connect(analyser);
            
            const frequencyDataArray = new Uint8Array(analyser.frequencyBinCount); // 256 bins for 512 FFT
            const timeDataArray = new Uint8Array(analyser.fftSize);       // 512 samples
            let isActive = true;
            
            // Initialize VAD engine
            const vadEngine = new VADEngine(config);
            
            // Performance: Pre-allocate arrays to avoid garbage collection
            const voiceFreqBins = this.getVoiceFrequencyBins(analyser.frequencyBinCount, config.sampleRate);
            
            const processAudio = () => {
                if (!isActive) return;
                
                // Get both frequency and time domain data
                analyser.getByteFrequencyData(frequencyDataArray);
                analyser.getByteTimeDomainData(timeDataArray);
                
                // Calculate voice-specific metrics
                const voiceEnergy = frequencyDataArray.slice(voiceFreqBins.start, voiceFreqBins.end)
                    .reduce((sum, val) => sum + val, 0) / (voiceFreqBins.end - voiceFreqBins.start);
                
                const volumeLevel = voiceEnergy / 255; // Normalize to 0-1
                
                // Run VAD algorithm
                const vadResult = vadEngine.processAudioFrame(frequencyDataArray, timeDataArray, volumeLevel);
                
                // Find peak frequency for additional info
                const peakFrequency = this.findPeakFrequency(frequencyDataArray, config.sampleRate);
                
                const visualizerData: AudioVisualizerData = {
                    timestamp: Date.now(),
                    volumeLevel,
                    frequencyData: new Uint8Array(frequencyDataArray), // Copy for async safety
                    vadConfidence: vadResult.confidence,
                    vadState: vadResult.state,
                    peakFrequency: peakFrequency
                };
                
                onUpdate(visualizerData);
                requestAnimationFrame(processAudio);
            };
            
            processAudio();
            
            // Return cleanup function following existing pattern
            return () => {
                isActive = false;
                vadEngine.reset();
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            };

        } catch (error) {
            throw new Error(`Failed to get audio visualizer data: ${error.message}`);
        }
    }

    /**
     * Check if recording is currently active
     */
    public isCurrentlyRecording(): boolean {
        return this.isRecording;
    }

    /**
     * Perform actual recording
     */
    private async performRecording(duration: number, format: string): Promise<RecordingResult> {
        return new Promise((resolve, reject) => {
            try {
                if (!this.stream) {
                    throw new Error('No audio stream available');
                }

                this.recordingChunks = [];
                this.isRecording = true;

                // Determine MIME type
                let mimeType = 'audio/webm';
                if (format === 'mp4') {
                    mimeType = 'audio/mp4';
                } else if (format === 'wav') {
                    mimeType = 'audio/wav';
                }

                // Create MediaRecorder
                const options: MediaRecorderOptions = {};
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    options.mimeType = mimeType;
                }

                this.mediaRecorder = new MediaRecorder(this.stream, options);

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.recordingChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstop = async () => {
                    try {
                        const audioBlob = new Blob(this.recordingChunks, { type: mimeType });
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        
                        const result: RecordingResult = {
                            audioData: arrayBuffer,
                            duration: duration * 1000,
                            sampleRate: this.config.audio.sampleRate,
                            channels: this.config.audio.channels,
                            format: format
                        };

                        this.cleanup();
                        resolve(result);
                    } catch (error) {
                        this.cleanup();
                        reject(new Error(`Failed to process recording: ${error.message}`));
                    }
                };

                this.mediaRecorder.onerror = (event) => {
                    this.cleanup();
                    reject(new Error(`Recording error: ${(event as any).error || 'Unknown recording error'}`));
                };

                // Start recording
                this.mediaRecorder.start();

                // Stop after duration
                setTimeout(() => {
                    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                        this.mediaRecorder.stop();
                    }
                }, duration * 1000);

            } catch (error) {
                this.cleanup();
                reject(error);
            }
        });
    }

    /**
     * Save recorded audio to file (if in Node.js environment)
     */
    public async saveToFile(audioData: ArrayBuffer, filePath: string): Promise<void> {
        try {
            // Check if we're in Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const uint8Array = new Uint8Array(audioData);
                
                return new Promise((resolve, reject) => {
                    fs.writeFile(filePath, uint8Array, (err: any) => {
                        if (err) {
                            reject(new Error(`Failed to save audio file: ${err.message}`));
                        } else {
                            this.logger.debug(`[AudioRecorder] Audio saved to: ${filePath}`);
                            resolve();
                        }
                    });
                });
            } else {
                throw new Error('File saving not available in browser environment');
            }
        } catch (error) {
            throw new Error(`Failed to save audio file: ${error.message}`);
        }
    }

    /**
     * Convert audio format (basic conversion)
     */
    public async convertFormat(
        audioData: ArrayBuffer, 
        fromFormat: string, 
        toFormat: string
    ): Promise<ArrayBuffer> {
        // This is a placeholder for audio format conversion
        // In a real implementation, you might use libraries like FFmpeg.js
        
        if (fromFormat === toFormat) {
            return audioData;
        }

        // Basic WAV header addition for raw PCM data
        if (toFormat === 'wav' && fromFormat === 'pcm') {
            return this.addWavHeader(audioData);
        }

        // For now, just return the original data
        this.logger.warn(`[AudioRecorder] Format conversion from ${fromFormat} to ${toFormat} not implemented`);
        return audioData;
    }

    /**
     * Add WAV header to PCM data
     */
    private addWavHeader(pcmData: ArrayBuffer): ArrayBuffer {
        const pcmLength = pcmData.byteLength;
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // RIFF header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + pcmLength, true); // File size
        view.setUint32(8, 0x57415645, false); // "WAVE"

        // Format chunk
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true); // Chunk size
        view.setUint16(20, 1, true); // Audio format (1 = PCM)
        view.setUint16(22, this.config.audio.channels, true); // Channels
        view.setUint32(24, this.config.audio.sampleRate, true); // Sample rate
        view.setUint32(28, this.config.audio.sampleRate * this.config.audio.channels * 2, true); // Byte rate
        view.setUint16(32, this.config.audio.channels * 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample

        // Data chunk
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, pcmLength, true); // Data size

        // Combine header and data
        const wavData = new Uint8Array(44 + pcmLength);
        wavData.set(new Uint8Array(header), 0);
        wavData.set(new Uint8Array(pcmData), 44);

        return wavData.buffer;
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        this.isRecording = false;

        if (this.mediaRecorder) {
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
            this.mediaRecorder = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.recordingChunks = [];
    }

    /**
     * Get frequency bins corresponding to human voice range (85Hz - 2kHz)
     */
    private getVoiceFrequencyBins(frequencyBinCount: number, sampleRate: number): { start: number; end: number } {
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / frequencyBinCount;
        
        // Human voice range: 85Hz - 2000Hz
        const voiceStart = 85;
        const voiceEnd = 2000;

        return {
            start: Math.floor(voiceStart / binWidth),
            end: Math.floor(voiceEnd / binWidth)
        };
    }

    /**
     * Find peak frequency in spectrum for voice analysis
     */
    private findPeakFrequency(frequencyData: Uint8Array, sampleRate: number): number {
        let maxValue = 0;
        let maxIndex = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }

        // Convert bin index to frequency
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / frequencyData.length;
        return maxIndex * binWidth;
    }

    /**
     * Clean up all resources
     */
    public dispose(): void {
        this.cleanup();
        this.logger.debug(`[AudioRecorder] Disposed`);
    }
}