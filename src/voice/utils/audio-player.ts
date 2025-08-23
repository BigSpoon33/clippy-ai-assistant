/**
 * Audio Player Utility
 * Handles audio playback for TTS and other audio files
 */

import { VoiceConfiguration } from '../types/voice-types';

export interface PlaybackOptions {
    volume?: number;
    speed?: number;
    startTime?: number;
    loop?: boolean;
    deviceId?: string;
}

export interface PlaybackResult {
    duration: number;
    success: boolean;
    error?: string;
}

export class AudioPlayer {
    private config: VoiceConfiguration;
    private currentAudio: HTMLAudioElement | null = null;
    private audioContext: AudioContext | null = null;
    private isPlaying: boolean = false;
    private logger: Console;

    constructor(config: VoiceConfiguration) {
        this.config = config;
        this.logger = console;
    }

    /**
     * Play audio from ArrayBuffer
     */
    public async playFromBuffer(
        audioData: ArrayBuffer, 
        options: PlaybackOptions = {}
    ): Promise<PlaybackResult> {
        try {
            this.logger.debug(`[AudioPlayer] Playing audio from buffer: ${audioData.byteLength} bytes`);

            // Create blob and URL
            const audioBlob = new Blob([audioData], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            const result = await this.playFromUrl(audioUrl, options);
            
            // Clean up URL
            URL.revokeObjectURL(audioUrl);
            
            return result;
        } catch (error) {
            return {
                duration: 0,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Play audio from file path
     */
    public async playFromFile(
        filePath: string, 
        options: PlaybackOptions = {}
    ): Promise<PlaybackResult> {
        try {
            this.logger.debug(`[AudioPlayer] Playing audio from file: ${filePath}`);

            // In browser environment, treat as URL
            return await this.playFromUrl(filePath, options);
        } catch (error) {
            return {
                duration: 0,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Play audio from URL
     */
    public async playFromUrl(
        audioUrl: string, 
        options: PlaybackOptions = {}
    ): Promise<PlaybackResult> {
        const {
            volume = this.config.tts.volume,
            speed = this.config.tts.speed,
            startTime = 0,
            loop = false,
            deviceId = this.config.audio.outputDeviceId
        } = options;

        return new Promise((resolve) => {
            try {
                // Stop any current playback
                this.stopPlayback();

                // Create audio element
                this.currentAudio = new Audio(audioUrl);
                this.currentAudio.volume = Math.max(0, Math.min(1, volume));
                this.currentAudio.playbackRate = Math.max(0.25, Math.min(4, speed));
                this.currentAudio.loop = loop;
                this.currentAudio.currentTime = startTime;

                // Set output device if supported and specified
                if (deviceId && 'setSinkId' in this.currentAudio) {
                    (this.currentAudio as any).setSinkId(deviceId).catch((error: any) => {
                        this.logger.warn(`[AudioPlayer] Failed to set output device: ${error.message}`);
                    });
                }

                const startPlaybackTime = Date.now();
                this.isPlaying = true;

                // Set up event handlers
                this.currentAudio.onended = () => {
                    const duration = Date.now() - startPlaybackTime;
                    this.isPlaying = false;
                    this.logger.debug(`[AudioPlayer] Playback completed in ${duration}ms`);
                    
                    resolve({
                        duration: duration,
                        success: true
                    });
                };

                this.currentAudio.onerror = (event) => {
                    this.isPlaying = false;
                    const errorMsg = `Audio playback error: ${this.currentAudio?.error?.message || 'Unknown error'}`;
                    this.logger.error(`[AudioPlayer] ${errorMsg}`);
                    
                    resolve({
                        duration: Date.now() - startPlaybackTime,
                        success: false,
                        error: errorMsg
                    });
                };

                this.currentAudio.onabort = () => {
                    this.isPlaying = false;
                    resolve({
                        duration: Date.now() - startPlaybackTime,
                        success: false,
                        error: 'Playback aborted'
                    });
                };

                // Start playback
                this.currentAudio.play().catch((error) => {
                    this.isPlaying = false;
                    this.logger.error(`[AudioPlayer] Failed to start playback:`, error);
                    
                    resolve({
                        duration: 0,
                        success: false,
                        error: `Failed to start playback: ${error.message}`
                    });
                });

            } catch (error) {
                this.isPlaying = false;
                resolve({
                    duration: 0,
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Play audio using Web Audio API for advanced processing
     */
    public async playWithWebAudio(
        audioData: ArrayBuffer,
        options: PlaybackOptions = {}
    ): Promise<PlaybackResult> {
        const {
            volume = this.config.tts.volume,
            speed = this.config.tts.speed,
            startTime = 0
        } = options;

        try {
            this.logger.debug(`[AudioPlayer] Playing with Web Audio API`);

            // Create or reuse audio context
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));

            // Create source and gain nodes
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = audioBuffer;
            source.playbackRate.value = Math.max(0.25, Math.min(4, speed));
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const startPlaybackTime = Date.now();
            this.isPlaying = true;

            return new Promise((resolve) => {
                source.onended = () => {
                    const duration = Date.now() - startPlaybackTime;
                    this.isPlaying = false;
                    this.logger.debug(`[AudioPlayer] Web Audio playback completed in ${duration}ms`);
                    
                    resolve({
                        duration: duration,
                        success: true
                    });
                };

                // Start playback
                source.start(0, startTime);
            });

        } catch (error) {
            this.isPlaying = false;
            this.logger.error(`[AudioPlayer] Web Audio playback failed:`, error);
            
            return {
                duration: 0,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop current playback
     */
    public stopPlayback(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        this.isPlaying = false;
        this.logger.debug(`[AudioPlayer] Playback stopped`);
    }

    /**
     * Pause current playback
     */
    public pausePlayback(): void {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this.logger.debug(`[AudioPlayer] Playback paused`);
        }
    }

    /**
     * Resume paused playback
     */
    public resumePlayback(): void {
        if (this.currentAudio && !this.isPlaying) {
            this.currentAudio.play().then(() => {
                this.isPlaying = true;
                this.logger.debug(`[AudioPlayer] Playback resumed`);
            }).catch((error) => {
                this.logger.error(`[AudioPlayer] Failed to resume playback:`, error);
            });
        }
    }

    /**
     * Set playback volume
     */
    public setVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentAudio) {
            this.currentAudio.volume = clampedVolume;
        }

        this.logger.debug(`[AudioPlayer] Volume set to: ${clampedVolume}`);
    }

    /**
     * Set playback speed
     */
    public setSpeed(speed: number): void {
        const clampedSpeed = Math.max(0.25, Math.min(4, speed));
        
        if (this.currentAudio) {
            this.currentAudio.playbackRate = clampedSpeed;
        }

        this.logger.debug(`[AudioPlayer] Speed set to: ${clampedSpeed}`);
    }

    /**
     * Get current playback position
     */
    public getCurrentTime(): number {
        return this.currentAudio ? this.currentAudio.currentTime : 0;
    }

    /**
     * Get total audio duration
     */
    public getDuration(): number {
        return this.currentAudio ? this.currentAudio.duration : 0;
    }

    /**
     * Seek to specific time
     */
    public seekTo(time: number): void {
        if (this.currentAudio) {
            this.currentAudio.currentTime = Math.max(0, Math.min(this.currentAudio.duration, time));
            this.logger.debug(`[AudioPlayer] Seeked to: ${time}s`);
        }
    }

    /**
     * Check if audio is currently playing
     */
    public isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get available audio output devices
     */
    public async getAvailableOutputDevices(): Promise<MediaDeviceInfo[]> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audiooutput');
        } catch (error) {
            this.logger.error(`[AudioPlayer] Failed to get output devices:`, error);
            return [];
        }
    }

    /**
     * Test audio output device
     */
    public async testOutputDevice(deviceId?: string): Promise<boolean> {
        try {
            // Create a test audio element with a brief tone
            const testAudio = new Audio();
            
            // Set output device if supported and specified
            if (deviceId && 'setSinkId' in testAudio) {
                await (testAudio as any).setSinkId(deviceId);
            }

            // Create a brief test tone
            const testTone = this.generateTestTone(440, 0.1); // 440Hz for 0.1 seconds
            const testBlob = new Blob([testTone], { type: 'audio/wav' });
            const testUrl = URL.createObjectURL(testBlob);

            testAudio.src = testUrl;
            testAudio.volume = 0.1; // Low volume for test

            await testAudio.play();
            
            // Clean up
            URL.revokeObjectURL(testUrl);
            
            return true;
        } catch (error) {
            this.logger.error(`[AudioPlayer] Device test failed:`, error);
            return false;
        }
    }

    /**
     * Generate a test tone for audio testing
     */
    private generateTestTone(frequency: number, duration: number): ArrayBuffer {
        const sampleRate = 44100;
        const samples = Math.floor(sampleRate * duration);
        const buffer = new ArrayBuffer(44 + samples * 2); // WAV header + data
        const view = new DataView(buffer);

        // WAV header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + samples * 2, true); // File size
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true); // Chunk size
        view.setUint16(20, 1, true); // Audio format (PCM)
        view.setUint16(22, 1, true); // Channels
        view.setUint32(24, sampleRate, true); // Sample rate
        view.setUint32(28, sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, samples * 2, true); // Data size

        // Generate sine wave
        for (let i = 0; i < samples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
            const int16Sample = Math.round(sample * 32767 * 0.1); // Low volume
            view.setInt16(44 + i * 2, int16Sample, true);
        }

        return buffer;
    }

    /**
     * Play system notification sound
     */
    public async playNotificationSound(type: 'success' | 'error' | 'warning' | 'info' = 'info'): Promise<void> {
        try {
            // Generate different tones for different notification types
            let frequency = 800;
            let duration = 0.2;

            switch (type) {
                case 'success':
                    frequency = 800;
                    duration = 0.15;
                    break;
                case 'error':
                    frequency = 400;
                    duration = 0.3;
                    break;
                case 'warning':
                    frequency = 600;
                    duration = 0.25;
                    break;
                case 'info':
                    frequency = 800;
                    duration = 0.1;
                    break;
            }

            const tone = this.generateTestTone(frequency, duration);
            await this.playFromBuffer(tone, { volume: 0.3 });
        } catch (error) {
            this.logger.error(`[AudioPlayer] Failed to play notification sound:`, error);
        }
    }

    /**
     * Clean up audio context and resources
     */
    public async dispose(): Promise<void> {
        this.stopPlayback();

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        this.logger.debug(`[AudioPlayer] Disposed`);
    }

    /**
     * Get audio capabilities
     */
    public getCapabilities(): {
        supportedFormats: string[];
        supportsWebAudio: boolean;
        supportsDeviceSelection: boolean;
        maxVolume: number;
        speedRange: { min: number; max: number };
    } {
        const audio = new Audio();
        
        return {
            supportedFormats: this.getSupportedFormats(),
            supportsWebAudio: 'AudioContext' in window,
            supportsDeviceSelection: 'setSinkId' in audio,
            maxVolume: 1.0,
            speedRange: { min: 0.25, max: 4.0 }
        };
    }

    /**
     * Get supported audio formats
     */
    private getSupportedFormats(): string[] {
        const audio = new Audio();
        const formats = [];

        const testFormats = [
            { format: 'mp3', mime: 'audio/mpeg' },
            { format: 'wav', mime: 'audio/wav' },
            { format: 'ogg', mime: 'audio/ogg' },
            { format: 'webm', mime: 'audio/webm' },
            { format: 'm4a', mime: 'audio/mp4' },
            { format: 'flac', mime: 'audio/flac' }
        ];

        for (const test of testFormats) {
            if (audio.canPlayType(test.mime) !== '') {
                formats.push(test.format);
            }
        }

        return formats;
    }
}