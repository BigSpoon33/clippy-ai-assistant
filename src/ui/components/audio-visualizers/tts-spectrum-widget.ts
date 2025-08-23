/**
 * TTS Spectrum Widget - Reusable UI Component
 * Spectrum visualization widget for TTS audio playback
 */

import { TTSSpectrumVisualizer, SpectrumVisualizerConfig } from '../../../voice/components/voice-indicators/spectrum-visualizer';
import { TTSVisualizerConfig } from '../../../voice/types/voice-types';

export interface TTSSpectrumWidgetConfig {
    enabled: boolean;
    size: 'compact' | 'normal' | 'large';
    theme: 'auto' | 'light' | 'dark';
    showControls: boolean;
    autoHide: boolean;
    animationDuration: number;
    spectrumConfig: SpectrumVisualizerConfig;
    onPlaybackStateChange?: (state: { isPlaying: boolean; currentTime: number; duration: number }) => void;
    onError?: (error: Error) => void;
}

export class TTSSpectrumWidget {
    private container: HTMLElement;
    private config: TTSSpectrumWidgetConfig;
    private spectrumVisualizer: TTSSpectrumVisualizer | null = null;
    private spectrumContainer: HTMLElement | null = null;
    private controlsContainer: HTMLElement | null = null;
    private statusContainer: HTMLElement | null = null;
    private isVisible: boolean = false;
    private currentAudioPath: string | null = null;
    private playbackTimer: number | null = null;
    private logger: Console;

    // Size configurations
    private static readonly SIZE_MAP = {
        compact: { 
            width: 200, 
            height: 60, 
            showControls: false, 
            showStatus: false 
        },
        normal: { 
            width: 400, 
            height: 100, 
            showControls: true, 
            showStatus: true 
        },
        large: { 
            width: 600, 
            height: 150, 
            showControls: true, 
            showStatus: true 
        }
    };

    constructor(container: HTMLElement, config: Partial<TTSSpectrumWidgetConfig>) {
        this.container = container;
        this.config = this.mergeDefaultConfig(config);
        this.logger = console;

        this.initialize();
    }

    /**
     * Merge user config with defaults
     */
    private mergeDefaultConfig(config: Partial<TTSSpectrumWidgetConfig>): TTSSpectrumWidgetConfig {
        const sizeConfig = TTSSpectrumWidget.SIZE_MAP[config.size || 'normal'];
        
        const baseConfig: TTSSpectrumWidgetConfig = {
            enabled: true,
            size: 'normal',
            theme: 'auto',
            showControls: true,
            autoHide: true,
            animationDuration: 300,
            spectrumConfig: {
                enabled: true,
                spectrumAnalysis: true,
                textSync: false,
                avatarMode: false,
                visualStyle: 'spectrum',
                height: sizeConfig.height,
                mode: 2,
                freqMin: 85,
                freqMax: 8000,
                showPeaks: true,
                lumiBars: true,
                gradient: 'prism',
                smoothing: 0.7,
                reflexRatio: 0.3
            }
        };

        // Merge base config with user config, then apply size-specific overrides
        const mergedConfig = { ...baseConfig, ...config };
        
        return {
            ...mergedConfig,
            showControls: config.showControls !== undefined ? config.showControls : sizeConfig.showControls
        };
    }

    /**
     * Initialize the widget
     */
    private initialize(): void {
        if (!this.config.enabled) {
            this.createDisabledPlaceholder();
            return;
        }

        try {
            this.createWidgetStructure();
            this.initializeSpectrum();
            this.setupEventHandlers();
            
            if (!this.config.autoHide) {
                this.show();
            }

            this.logger.debug('[TTS Spectrum Widget] Initialized');
        } catch (error) {
            this.logger.error('[TTS Spectrum Widget] Initialization failed:', error);
            this.handleError(new Error(`TTS Spectrum Widget initialization failed: ${error.message}`));
        }
    }

    /**
     * Create widget DOM structure
     */
    private createWidgetStructure(): void {
        const wrapper = document.createElement('div');
        wrapper.className = 'tts-spectrum-widget-wrapper';
        wrapper.setAttribute('data-size', this.config.size);
        wrapper.setAttribute('data-theme', this.config.theme);

        // Apply styling
        this.applyWidgetStyling(wrapper);

        // Create spectrum container
        this.spectrumContainer = document.createElement('div');
        this.spectrumContainer.className = 'tts-spectrum-container';
        wrapper.appendChild(this.spectrumContainer);

        // Create controls container if enabled
        if (this.config.showControls) {
            this.controlsContainer = document.createElement('div');
            this.controlsContainer.className = 'tts-spectrum-controls';
            this.createControls();
            wrapper.appendChild(this.controlsContainer);
        }

        // Create status container
        this.statusContainer = document.createElement('div');
        this.statusContainer.className = 'tts-spectrum-status';
        this.createStatus();
        wrapper.appendChild(this.statusContainer);

        this.container.appendChild(wrapper);
    }

    /**
     * Apply styling to widget
     */
    private applyWidgetStyling(wrapper: HTMLElement): void {
        const sizeConfig = TTSSpectrumWidget.SIZE_MAP[this.config.size];
        
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            width: ${sizeConfig.width}px;
            min-height: ${sizeConfig.height + (this.config.showControls ? 40 : 0)}px;
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            overflow: hidden;
            transition: all ${this.config.animationDuration}ms ease;
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
        `;

        // Theme-specific styling
        this.applyThemeStyling(wrapper);
    }

    /**
     * Apply theme-specific styling
     */
    private applyThemeStyling(wrapper: HTMLElement): void {
        const isDark = this.config.theme === 'dark' || 
            (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            wrapper.style.background = 'var(--background-primary)';
            wrapper.style.borderColor = 'var(--background-modifier-border)';
        }
    }

    /**
     * Initialize spectrum visualizer
     */
    private initializeSpectrum(): void {
        if (!this.spectrumContainer) return;

        // Style spectrum container
        this.spectrumContainer.style.cssText = `
            flex: 1;
            position: relative;
            overflow: hidden;
            background: var(--background-primary);
        `;

        try {
            this.spectrumVisualizer = new TTSSpectrumVisualizer(
                this.spectrumContainer,
                this.config.spectrumConfig
            );
        } catch (error) {
            this.logger.warn('[TTS Spectrum Widget] Failed to initialize spectrum, using fallback');
            this.createSpectrumFallback();
        }
    }

    /**
     * Create fallback visualization
     */
    private createSpectrumFallback(): void {
        if (!this.spectrumContainer) return;

        this.spectrumContainer.innerHTML = `
            <div class="spectrum-fallback" style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-muted);
                font-size: 14px;
                background: var(--background-secondary);
            ">
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🎵</div>
                    <div>Audio Playing</div>
                </div>
            </div>
        `;
    }

    /**
     * Create control buttons
     */
    private createControls(): void {
        if (!this.controlsContainer) return;

        this.controlsContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--background-modifier-form-field);
            border-top: 1px solid var(--background-modifier-border);
            min-height: 40px;
        `;

        // Play/Pause button
        const playButton = document.createElement('button');
        playButton.className = 'tts-play-button';
        playButton.innerHTML = '▶️';
        playButton.title = 'Play/Pause';
        playButton.disabled = true;
        
        // Stop button
        const stopButton = document.createElement('button');
        stopButton.className = 'tts-stop-button';
        stopButton.innerHTML = '⏹️';
        stopButton.title = 'Stop';
        stopButton.disabled = true;

        // Volume control
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.className = 'tts-volume-slider';
        volumeSlider.min = '0';
        volumeSlider.max = '1';
        volumeSlider.step = '0.1';
        volumeSlider.value = '0.8';
        volumeSlider.title = 'Volume';

        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'tts-progress-bar';
        progressBar.style.cssText = `
            flex: 1;
            height: 4px;
            background: var(--background-modifier-border);
            border-radius: 2px;
            margin: 0 12px;
            position: relative;
            cursor: pointer;
        `;

        const progressFill = document.createElement('div');
        progressFill.className = 'tts-progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: var(--interactive-accent);
            border-radius: 2px;
            width: 0%;
            transition: width 0.1s ease;
        `;
        progressBar.appendChild(progressFill);

        // Style buttons
        [playButton, stopButton].forEach(button => {
            button.style.cssText = `
                background: transparent;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s ease;
            `;
            
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    button.style.background = 'var(--background-modifier-hover)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = 'transparent';
            });
        });

        // Style volume slider
        volumeSlider.style.cssText = `
            width: 60px;
            margin-left: 8px;
        `;

        // Assemble controls
        this.controlsContainer.appendChild(playButton);
        this.controlsContainer.appendChild(stopButton);
        this.controlsContainer.appendChild(progressBar);
        this.controlsContainer.appendChild(volumeSlider);

        // Store references for event handling
        this.controlsContainer.setAttribute('data-has-controls', 'true');
    }

    /**
     * Create status display
     */
    private createStatus(): void {
        if (!this.statusContainer) return;

        this.statusContainer.style.cssText = `
            display: none;
            padding: 4px 12px;
            background: var(--background-modifier-form-field);
            border-top: 1px solid var(--background-modifier-border);
            font-size: 12px;
            color: var(--text-muted);
            min-height: 20px;
        `;

        this.statusContainer.textContent = 'Ready';
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        // Listen for spectrum state changes
        this.spectrumContainer?.addEventListener('spectrum-state-change', (event: CustomEvent) => {
            this.handlePlaybackStateChange(event.detail);
        });

        // Control button handlers
        if (this.controlsContainer?.hasAttribute('data-has-controls')) {
            this.setupControlHandlers();
        }

        // Theme change detection
        if (this.config.theme === 'auto') {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                const wrapper = this.container.querySelector('.tts-spectrum-widget-wrapper') as HTMLElement;
                if (wrapper) this.applyThemeStyling(wrapper);
            });
        }
    }

    /**
     * Setup control button handlers
     */
    private setupControlHandlers(): void {
        const playButton = this.controlsContainer?.querySelector('.tts-play-button') as HTMLButtonElement;
        const stopButton = this.controlsContainer?.querySelector('.tts-stop-button') as HTMLButtonElement;
        const volumeSlider = this.controlsContainer?.querySelector('.tts-volume-slider') as HTMLInputElement;
        const progressBar = this.controlsContainer?.querySelector('.tts-progress-bar') as HTMLElement;

        if (playButton) {
            playButton.addEventListener('click', () => {
                if (this.spectrumVisualizer) {
                    const state = this.spectrumVisualizer.getPlaybackState();
                    if (state.isPlaying) {
                        this.pause();
                    } else {
                        this.play();
                    }
                }
            });
        }

        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stop();
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                this.setVolume(parseFloat(volumeSlider.value));
            });
        }

        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.seek(percent);
            });
        }
    }

    /**
     * Load and play TTS audio
     */
    public async playTTS(audioPath: string): Promise<void> {
        if (!this.config.enabled || !this.spectrumVisualizer) {
            return;
        }

        try {
            this.currentAudioPath = audioPath;
            
            // Show widget if auto-hide is enabled
            if (this.config.autoHide && !this.isVisible) {
                this.show();
            }

            // Connect audio to spectrum
            await this.spectrumVisualizer.connectTTSAudio(audioPath);
            
            // Start visualization
            await this.spectrumVisualizer.startVisualization();
            
            this.updateStatus('Playing...');
            this.enableControls();
            this.startPlaybackTimer();

            this.logger.debug('[TTS Spectrum Widget] Playing:', audioPath);

        } catch (error) {
            this.logger.error('[TTS Spectrum Widget] Failed to play TTS:', error);
            this.handleError(new Error(`Failed to play TTS: ${error.message}`));
        }
    }

    /**
     * Pause playback
     */
    public pause(): void {
        // Note: Basic implementation - full pause/resume would require more complex audio handling
        this.updateStatus('Paused');
        this.updatePlayButton(false);
    }

    /**
     * Resume playback
     */
    public play(): void {
        if (this.spectrumVisualizer && this.currentAudioPath) {
            this.spectrumVisualizer.startVisualization().catch(error => {
                this.handleError(error);
            });
        }
    }

    /**
     * Stop playback
     */
    public stop(): void {
        if (this.spectrumVisualizer) {
            this.spectrumVisualizer.stopVisualization();
            this.spectrumVisualizer.disconnect();
        }

        this.stopPlaybackTimer();
        this.updateStatus('Stopped');
        this.disableControls();
        this.updateProgress(0);

        // Hide widget if auto-hide is enabled
        if (this.config.autoHide && this.isVisible) {
            setTimeout(() => this.hide(), 1000); // Delay hide for user feedback
        }
    }

    /**
     * Set playback volume
     */
    public setVolume(volume: number): void {
        // Volume control would need to be implemented in the spectrum visualizer
        this.updateStatus(`Volume: ${Math.round(volume * 100)}%`);
    }

    /**
     * Seek to position (0-1)
     */
    public seek(position: number): void {
        // Seek functionality would need to be implemented in the spectrum visualizer
        this.updateProgress(position);
        this.updateStatus(`Seeking to ${Math.round(position * 100)}%`);
    }

    /**
     * Show widget with animation
     */
    public show(): void {
        if (this.isVisible) return;

        const wrapper = this.container.querySelector('.tts-spectrum-widget-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
            wrapper.style.pointerEvents = 'auto';
        }

        this.isVisible = true;
        this.logger.debug('[TTS Spectrum Widget] Shown');
    }

    /**
     * Hide widget with animation
     */
    public hide(): void {
        if (!this.isVisible) return;

        const wrapper = this.container.querySelector('.tts-spectrum-widget-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'translateY(10px)';
            wrapper.style.pointerEvents = 'none';
        }

        this.isVisible = false;
        this.logger.debug('[TTS Spectrum Widget] Hidden');
    }

    /**
     * Handle playback state changes
     */
    private handlePlaybackStateChange(state: { isPlaying: boolean; timestamp: number }): void {
        this.updatePlayButton(state.isPlaying);
        
        if (!state.isPlaying) {
            this.stopPlaybackTimer();
        }

        // Notify external listeners
        if (this.config.onPlaybackStateChange) {
            const fullState = this.spectrumVisualizer?.getPlaybackState() || {
                isConnected: false,
                isPlaying: state.isPlaying,
                currentTime: 0,
                duration: 0
            };
            this.config.onPlaybackStateChange(fullState);
        }
    }

    /**
     * Update play button state
     */
    private updatePlayButton(isPlaying: boolean): void {
        const playButton = this.controlsContainer?.querySelector('.tts-play-button') as HTMLButtonElement;
        if (playButton) {
            playButton.innerHTML = isPlaying ? '⏸️' : '▶️';
            playButton.title = isPlaying ? 'Pause' : 'Play';
        }
    }

    /**
     * Enable control buttons
     */
    private enableControls(): void {
        const buttons = this.controlsContainer?.querySelectorAll('button');
        buttons?.forEach(button => {
            button.disabled = false;
        });
    }

    /**
     * Disable control buttons
     */
    private disableControls(): void {
        const buttons = this.controlsContainer?.querySelectorAll('button');
        buttons?.forEach(button => {
            button.disabled = true;
        });
    }

    /**
     * Update status text
     */
    private updateStatus(text: string): void {
        if (this.statusContainer) {
            this.statusContainer.textContent = text;
            this.statusContainer.style.display = 'block';
        }
    }

    /**
     * Update progress bar
     */
    private updateProgress(percent: number): void {
        const progressFill = this.controlsContainer?.querySelector('.tts-progress-fill') as HTMLElement;
        if (progressFill) {
            progressFill.style.width = `${percent * 100}%`;
        }
    }

    /**
     * Start playback timer for progress updates
     */
    private startPlaybackTimer(): void {
        this.stopPlaybackTimer(); // Clear any existing timer
        
        this.playbackTimer = window.setInterval(() => {
            if (this.spectrumVisualizer) {
                const state = this.spectrumVisualizer.getPlaybackState();
                if (state.duration > 0) {
                    const progress = state.currentTime / state.duration;
                    this.updateProgress(progress);
                    
                    const currentMin = Math.floor(state.currentTime / 60);
                    const currentSec = Math.floor(state.currentTime % 60);
                    const totalMin = Math.floor(state.duration / 60);
                    const totalSec = Math.floor(state.duration % 60);
                    
                    this.updateStatus(
                        `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${totalMin}:${totalSec.toString().padStart(2, '0')}`
                    );
                }
            }
        }, 100); // Update every 100ms
    }

    /**
     * Stop playback timer
     */
    private stopPlaybackTimer(): void {
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
    }

    /**
     * Handle errors
     */
    private handleError(error: Error): void {
        this.logger.error('[TTS Spectrum Widget] Error:', error);
        
        if (this.config.onError) {
            this.config.onError(error);
        }

        this.updateStatus(`Error: ${error.message}`);
        this.stop();
    }

    /**
     * Create disabled placeholder
     */
    private createDisabledPlaceholder(): void {
        const placeholder = document.createElement('div');
        placeholder.className = 'tts-spectrum-disabled';
        placeholder.style.cssText = `
            width: 200px;
            height: 60px;
            background: var(--background-modifier-border);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: 14px;
            opacity: 0.5;
        `;
        placeholder.textContent = 'TTS Spectrum Disabled';
        this.container.appendChild(placeholder);
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<TTSSpectrumWidgetConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Re-initialize spectrum with new config if needed
        if (this.spectrumVisualizer && newConfig.spectrumConfig) {
            this.spectrumVisualizer.updateConfig(newConfig.spectrumConfig);
        }

        this.logger.debug('[TTS Spectrum Widget] Configuration updated');
    }

    /**
     * Resize widget
     */
    public resize(size: 'compact' | 'normal' | 'large'): void {
        this.config.size = size;
        const sizeConfig = TTSSpectrumWidget.SIZE_MAP[size];
        
        // Update wrapper styling
        const wrapper = this.container.querySelector('.tts-spectrum-widget-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.setAttribute('data-size', size);
            this.applyWidgetStyling(wrapper);
        }

        // Update spectrum size
        if (this.spectrumVisualizer) {
            this.spectrumVisualizer.resize(sizeConfig.width, sizeConfig.height);
        }
    }

    /**
     * Get current widget state
     */
    public getState(): {
        isVisible: boolean;
        isPlaying: boolean;
        currentAudioPath: string | null;
        playbackState: any;
    } {
        return {
            isVisible: this.isVisible,
            isPlaying: this.spectrumVisualizer?.getPlaybackState().isPlaying || false,
            currentAudioPath: this.currentAudioPath,
            playbackState: this.spectrumVisualizer?.getPlaybackState() || null
        };
    }

    /**
     * Check if widget is supported
     */
    public static isSupported(): boolean {
        return TTSSpectrumVisualizer.isSupported();
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        this.stopPlaybackTimer();
        
        this.spectrumVisualizer?.dispose();
        
        // Clear DOM
        this.container.innerHTML = '';
        
        this.spectrumVisualizer = null;
        this.spectrumContainer = null;
        this.controlsContainer = null;
        this.statusContainer = null;
        
        this.logger.debug('[TTS Spectrum Widget] Disposed');
    }
}