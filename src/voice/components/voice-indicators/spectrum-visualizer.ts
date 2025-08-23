/**
 * TTS Spectrum Visualizer
 * Professional audio spectrum analysis using audioMotion-analyzer
 */

// @ts-ignore - audioMotion-analyzer doesn't have complete TypeScript definitions
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { TTSVisualizerConfig, AudioVisualizerData } from '../../types/voice-types';

export interface SpectrumVisualizerConfig extends TTSVisualizerConfig {
    mode?: number;          // audioMotion mode (1-10)
    freqMin?: number;       // Minimum frequency
    freqMax?: number;       // Maximum frequency
    showPeaks?: boolean;    // Show peak indicators
    lumiBars?: boolean;     // Luminance bars
    gradient?: string;      // Color gradient
    smoothing?: number;     // Smoothing factor
    reflexRatio?: number;   // Reflection effect
}

export class TTSSpectrumVisualizer {
    private analyzer: AudioMotionAnalyzer | null = null;
    private container: HTMLElement;
    private config: SpectrumVisualizerConfig;
    private audioElement: HTMLAudioElement | null = null;
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private isConnected: boolean = false;
    private isPlaying: boolean = false;
    private logger: Console;

    constructor(container: HTMLElement, config: SpectrumVisualizerConfig) {
        this.container = container;
        // Default config with proper inheritance
        const defaultConfig: SpectrumVisualizerConfig = {
            enabled: true,
            spectrumAnalysis: true,
            textSync: false,
            avatarMode: false,
            visualStyle: 'spectrum',
            height: 100,
            mode: 2,           // 1/12th octave bands for speech
            freqMin: 85,       // Human voice lower bound
            freqMax: 8000,     // Human voice upper bound
            showPeaks: true,
            lumiBars: true,
            gradient: 'prism',
            smoothing: 0.7,
            reflexRatio: 0.3
        };
        
        this.config = { ...defaultConfig, ...config };
        this.logger = console;

        if (this.config.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize audioMotion-analyzer
     */
    private initialize(): void {
        try {
            // Ensure container has proper styling
            this.setupContainer();

            // Create audioMotion-analyzer instance
            this.analyzer = new AudioMotionAnalyzer(this.container, {
                mode: this.config.mode,
                height: this.config.height,
                smoothing: this.config.smoothing
            } as any); // Use any to bypass incomplete TypeScript definitions
            
            // Set properties after initialization (audioMotion pattern)
            if (this.analyzer) {
                (this.analyzer as any).freqMin = this.config.freqMin;
                (this.analyzer as any).freqMax = this.config.freqMax;
                (this.analyzer as any).showPeaks = this.config.showPeaks;
                (this.analyzer as any).lumiBars = this.config.lumiBars;
                (this.analyzer as any).reflexRatio = this.config.reflexRatio;
                (this.analyzer as any).showScaleY = false;
                (this.analyzer as any).gradient = this.config.gradient;
                (this.analyzer as any).fillAlpha = 0.6;
                (this.analyzer as any).lineWidth = 2;
                (this.analyzer as any).showBgColor = false;
                (this.analyzer as any).overlay = true;
                (this.analyzer as any).showFPS = false;
            }

            // Get the AudioContext from audioMotion
            this.audioContext = this.analyzer.audioCtx;

            this.logger.debug('[TTS Spectrum] Initialized with audioMotion-analyzer');
        } catch (error) {
            this.logger.error('[TTS Spectrum] Failed to initialize:', error);
            this.createFallbackVisualization();
        }
    }

    /**
     * Setup container styling for optimal visualization
     */
    private setupContainer(): void {
        this.container.style.cssText += `
            position: relative;
            overflow: hidden;
            border-radius: 6px;
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
        `;
    }

    /**
     * Connect TTS audio for spectrum analysis
     */
    public connectTTSAudio(audioFilePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this.analyzer || !this.audioContext) {
                    throw new Error('Spectrum analyzer not initialized');
                }

                // Create audio element
                this.audioElement = new Audio(audioFilePath);
                this.audioElement.crossOrigin = 'anonymous';
                
                // Setup audio element event handlers
                this.setupAudioEventHandlers(resolve, reject);

                // Create audio source node
                this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
                
                // Connect to analyzer for visualization
                (this.analyzer as any).connectInput(this.sourceNode);
                
                // Route audio to speakers while analyzing
                this.sourceNode.connect(this.audioContext.destination);
                
                this.isConnected = true;
                this.logger.debug('[TTS Spectrum] Audio connected:', audioFilePath);

            } catch (error) {
                this.logger.error('[TTS Spectrum] Failed to connect audio:', error);
                reject(error);
            }
        });
    }

    /**
     * Setup audio element event handlers
     */
    private setupAudioEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
        if (!this.audioElement) return;

        // Handle successful load
        this.audioElement.addEventListener('canplay', () => {
            resolve();
        }, { once: true });

        // Handle load errors
        this.audioElement.addEventListener('error', (e) => {
            reject(new Error(`Audio load failed: ${e.error || 'Unknown error'}`));
        }, { once: true });

        // Track playback state
        this.audioElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.onPlaybackStateChange(true);
        });

        this.audioElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.onPlaybackStateChange(false);
        });

        this.audioElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.onPlaybackStateChange(false);
            this.disconnect();
        });
    }

    /**
     * Start visualization and audio playback
     */
    public async startVisualization(): Promise<void> {
        if (!this.audioElement || !this.isConnected) {
            throw new Error('No audio connected');
        }

        try {
            // Resume AudioContext if suspended (mobile Safari requirement)
            if (this.audioContext?.state === 'suspended') {
                await this.audioContext.resume();
            }

            await this.audioElement.play();
            this.logger.debug('[TTS Spectrum] Visualization started');
        } catch (error) {
            this.logger.error('[TTS Spectrum] Failed to start visualization:', error);
            throw error;
        }
    }

    /**
     * Stop visualization and audio playback
     */
    public stopVisualization(): void {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.logger.debug('[TTS Spectrum] Visualization stopped');
    }

    /**
     * Handle playback state changes
     */
    private onPlaybackStateChange(isPlaying: boolean): void {
        // Add/remove playing class for CSS animations
        if (isPlaying) {
            this.container.classList.add('spectrum-playing');
        } else {
            this.container.classList.remove('spectrum-playing');
        }

        // Emit event for external listeners
        this.container.dispatchEvent(new CustomEvent('spectrum-state-change', {
            detail: { isPlaying, timestamp: Date.now() }
        }));
    }

    /**
     * Disconnect audio and clean up
     */
    public disconnect(): void {
        try {
            if (this.sourceNode && this.analyzer) {
                (this.analyzer as any).disconnectInput(this.sourceNode);
            }

            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement.src = '';
                this.audioElement = null;
            }

            this.sourceNode = null;
            this.isConnected = false;
            this.isPlaying = false;

            this.logger.debug('[TTS Spectrum] Audio disconnected');
        } catch (error) {
            this.logger.error('[TTS Spectrum] Error during disconnect:', error);
        }
    }

    /**
     * Update visualizer configuration
     */
    public updateConfig(newConfig: Partial<SpectrumVisualizerConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.analyzer) {
            // Update analyzer properties that can be changed at runtime
            if (newConfig.freqMin !== undefined) (this.analyzer as any).freqMin = newConfig.freqMin;
            if (newConfig.freqMax !== undefined) (this.analyzer as any).freqMax = newConfig.freqMax;
            if (newConfig.showPeaks !== undefined) (this.analyzer as any).showPeaks = newConfig.showPeaks;
            if (newConfig.smoothing !== undefined) (this.analyzer as any).smoothing = newConfig.smoothing;
            if (newConfig.gradient !== undefined) (this.analyzer as any).gradient = newConfig.gradient;
        }

        this.logger.debug('[TTS Spectrum] Configuration updated');
    }

    /**
     * Get current playback state
     */
    public getPlaybackState(): { isConnected: boolean; isPlaying: boolean; currentTime: number; duration: number } {
        return {
            isConnected: this.isConnected,
            isPlaying: this.isPlaying,
            currentTime: this.audioElement?.currentTime || 0,
            duration: this.audioElement?.duration || 0
        };
    }

    /**
     * Get spectrum data for external processing
     */
    public getSpectrumData(): AudioVisualizerData | null {
        if (!this.analyzer || !this.isPlaying) {
            return null;
        }

        try {
            // Get frequency data from audioMotion (approximate implementation)
            const frequencyData = new Uint8Array(256); // Standard size
            const timestamp = Date.now();

            // Calculate volume level
            const average = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
            const volumeLevel = average / 255;

            return {
                timestamp,
                volumeLevel,
                frequencyData,
                vadState: 'speech', // TTS is always speech
                vadConfidence: 0.9  // High confidence for TTS
            };
        } catch (error) {
            this.logger.error('[TTS Spectrum] Failed to get spectrum data:', error);
            return null;
        }
    }

    /**
     * Create fallback visualization if audioMotion fails
     */
    private createFallbackVisualization(): void {
        this.container.innerHTML = `
            <div class="tts-spectrum-fallback" style="
                width: 100%;
                height: ${this.config.height}px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                color: var(--text-muted);
                font-size: 14px;
            ">
                <div style="text-align: center;">
                    <div>♪ Audio Visualization</div>
                    <div style="font-size: 12px; margin-top: 4px;">Spectrum analysis unavailable</div>
                </div>
            </div>
        `;
        this.logger.warn('[TTS Spectrum] Using fallback visualization');
    }

    /**
     * Resize visualizer
     */
    public resize(width: number, height: number): void {
        this.config.height = height;
        
        if (this.analyzer) {
            // audioMotion handles resize automatically via ResizeObserver
            this.analyzer.height = height;
        }
    }

    /**
     * Check if browser supports required features
     */
    public static isSupported(): boolean {
        try {
            // Check for required Web Audio API features
            return !!(window.AudioContext || (window as any).webkitAudioContext) &&
                   !!document.createElement('canvas').getContext('2d') &&
                   !!window.requestAnimationFrame;
        } catch {
            return false;
        }
    }

    /**
     * Clean up all resources
     */
    public dispose(): void {
        this.disconnect();
        
        if (this.analyzer) {
            (this.analyzer as any).destroy();
            this.analyzer = null;
        }
        
        this.audioContext = null;
        this.logger.debug('[TTS Spectrum] Disposed');
    }
}