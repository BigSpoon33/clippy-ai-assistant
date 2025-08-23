/**
 * VAD Widget - Reusable UI Component
 * Voice Activity Detection widget for vault agent interfaces
 */

import { AudioRecorder } from '../../../voice/utils/audio-recorder';
import { VADIndicator, VADIndicatorConfig } from '../../../voice/components/voice-indicators/vad-indicator';
import { VoiceConfiguration, AudioVisualizerData, VADConfig } from '../../../voice/types/voice-types';

export interface VADWidgetConfig {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
    position: 'inline' | 'floating' | 'corner';
    showText: boolean;
    showConfidence: boolean;
    autoStart: boolean;
    voiceConfig: VoiceConfiguration;
    vadConfig: VADConfig;
    onStateChange?: (state: { vadState: string; confidence: number; isActive: boolean }) => void;
    onError?: (error: Error) => void;
}

export class VADWidget {
    private container: HTMLElement;
    private config: VADWidgetConfig;
    private audioRecorder: AudioRecorder | null = null;
    private vadIndicator: VADIndicator | null = null;
    private isActive: boolean = false;
    private cleanupFunction: (() => void) | null = null;
    private lastUpdateTime: number = 0;
    private updateThrottle: number = 50; // Limit updates to 20fps for UI responsiveness
    private logger: Console;

    // Size mappings
    private static readonly SIZE_MAP = {
        small: { size: 16, showText: false, showConfidence: false },
        medium: { size: 24, showText: false, showConfidence: true },
        large: { size: 32, showText: true, showConfidence: true }
    };

    constructor(container: HTMLElement, config: Partial<VADWidgetConfig>) {
        this.container = container;
        this.config = this.mergeDefaultConfig(config);
        this.logger = console;

        this.initialize();
    }

    /**
     * Merge user config with defaults
     */
    private mergeDefaultConfig(config: Partial<VADWidgetConfig>): VADWidgetConfig {
        const sizeConfig = VADWidget.SIZE_MAP[config.size || 'medium'];
        
        const baseConfig: VADWidgetConfig = {
            enabled: true,
            size: 'medium',
            position: 'inline',
            showText: false,
            showConfidence: true,
            autoStart: false,
            voiceConfig: {
                enabled: true,
                wakeWord: 'clippy',
                wakeWordThreshold: 0.5,
                tts: {
                    primary: 'WEB_SPEECH_TTS' as any,
                    engines: {},
                    voice: 'default',
                    speed: 1.0,
                    volume: 0.8
                },
                stt: {
                    primary: 'WEB_SPEECH_STT' as any,
                    engines: {},
                    language: 'en-US',
                    timeout: 10000
                },
                wakeWordConfig: {
                    primary: 'KEYWORD_SPOTTING' as any,
                    engines: {},
                    threshold: 0.5,
                    models: []
                },
                audio: {
                    sampleRate: 16000,
                    channels: 1,
                    chunkSize: 4096
                },
                fallbacks: {
                    enableGracefulDegradation: true,
                    showErrorNotifications: false,
                    useTextFallback: true
                }
            },
            vadConfig: {
                enabled: true,
                algorithm: 'simple',
                thresholds: {
                    speech: 0.5,
                    silence: 0.35,
                    confidence: 0.8
                },
                sampleRate: 16000,
                frameSize: 512
            }
        };

        // Merge base config with user config, then apply size-specific overrides
        const mergedConfig = { ...baseConfig, ...config };
        
        return {
            ...mergedConfig,
            showText: config.showText !== undefined ? config.showText : sizeConfig.showText,
            showConfidence: config.showConfidence !== undefined ? config.showConfidence : sizeConfig.showConfidence
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
            this.initializeComponents();
            
            if (this.config.autoStart) {
                this.start();
            }

            this.logger.debug('[VAD Widget] Initialized');
        } catch (error) {
            this.logger.error('[VAD Widget] Initialization failed:', error);
            this.handleError(new Error(`VAD Widget initialization failed: ${error.message}`));
        }
    }

    /**
     * Create widget DOM structure
     */
    private createWidgetStructure(): void {
        const wrapper = document.createElement('div');
        wrapper.className = 'vad-widget-wrapper';
        wrapper.setAttribute('data-size', this.config.size);
        wrapper.setAttribute('data-position', this.config.position);

        // Add styling
        this.applyWidgetStyling(wrapper);

        this.container.appendChild(wrapper);
    }

    /**
     * Apply responsive styling to widget
     */
    private applyWidgetStyling(wrapper: HTMLElement): void {
        const sizeConfig = VADWidget.SIZE_MAP[this.config.size];
        
        wrapper.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            min-width: ${sizeConfig.size}px;
            min-height: ${sizeConfig.size}px;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            cursor: ${this.isActive ? 'pointer' : 'default'};
            user-select: none;
        `;

        // Position-specific styling
        switch (this.config.position) {
            case 'floating':
                wrapper.style.position = 'fixed';
                wrapper.style.zIndex = '1000';
                wrapper.style.top = '20px';
                wrapper.style.right = '20px';
                wrapper.style.background = 'var(--background-primary)';
                wrapper.style.border = '1px solid var(--background-modifier-border)';
                wrapper.style.boxShadow = 'var(--shadow-s)';
                break;
            case 'corner':
                wrapper.style.position = 'absolute';
                wrapper.style.top = '8px';
                wrapper.style.right = '8px';
                wrapper.style.zIndex = '10';
                break;
            case 'inline':
            default:
                wrapper.style.marginLeft = '8px';
                break;
        }

        // Add hover effects
        wrapper.addEventListener('mouseenter', () => {
            if (this.isActive) {
                wrapper.style.background = 'var(--background-modifier-hover)';
            }
        });

        wrapper.addEventListener('mouseleave', () => {
            wrapper.style.background = '';
        });
    }

    /**
     * Initialize core components
     */
    private initializeComponents(): void {
        const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
        if (!wrapper) throw new Error('Widget wrapper not found');

        // Initialize audio recorder
        this.audioRecorder = new AudioRecorder(this.config.voiceConfig);

        // Initialize VAD indicator
        const sizeConfig = VADWidget.SIZE_MAP[this.config.size];
        const indicatorConfig: Partial<VADIndicatorConfig> = {
            size: sizeConfig.size,
            position: 'inline',
            showConfidence: this.config.showConfidence,
            showText: this.config.showText,
            colors: {
                silent: 'var(--text-muted)',
                speech: 'var(--interactive-accent)',
                noise: '#ffa500',
                background: 'rgba(0, 0, 0, 0.2)',
                text: 'var(--text-normal)'
            }
        };

        this.vadIndicator = new VADIndicator(wrapper, indicatorConfig);

        // Add click handler for manual start/stop
        wrapper.addEventListener('click', () => {
            if (this.isActive) {
                this.stop();
            } else {
                this.start();
            }
        });
    }

    /**
     * Start VAD monitoring
     */
    public async start(): Promise<void> {
        if (!this.audioRecorder || !this.vadIndicator || this.isActive) {
            return;
        }

        try {
            this.logger.debug('[VAD Widget] Starting...');

            // Start audio recording with VAD
            this.cleanupFunction = await this.audioRecorder.getAudioVisualizerData(
                (data) => this.handleVADUpdate(data),
                this.config.vadConfig
            );

            this.isActive = true;
            this.vadIndicator.start();

            // Update UI state
            const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
            if (wrapper) {
                wrapper.classList.add('vad-active');
                wrapper.title = 'Voice Activity Detection Active - Click to stop';
            }

            this.logger.debug('[VAD Widget] Started successfully');

        } catch (error) {
            this.logger.error('[VAD Widget] Failed to start:', error);
            this.handleError(new Error(`Failed to start VAD: ${error.message}`));
        }
    }

    /**
     * Stop VAD monitoring
     */
    public stop(): void {
        if (!this.isActive) return;

        try {
            // Cleanup audio recording
            if (this.cleanupFunction) {
                this.cleanupFunction();
                this.cleanupFunction = null;
            }

            this.isActive = false;
            this.vadIndicator?.stop();

            // Update UI state
            const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
            if (wrapper) {
                wrapper.classList.remove('vad-active');
                wrapper.title = 'Voice Activity Detection Inactive - Click to start';
            }

            this.logger.debug('[VAD Widget] Stopped');

        } catch (error) {
            this.logger.error('[VAD Widget] Error during stop:', error);
        }
    }

    /**
     * Handle VAD updates with throttling
     */
    private handleVADUpdate(data: AudioVisualizerData): void {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return; // Throttle updates for performance
        }

        this.lastUpdateTime = now;

        // Update VAD indicator
        this.vadIndicator?.updateVAD(data);

        // Notify external listeners
        if (this.config.onStateChange) {
            this.config.onStateChange({
                vadState: data.vadState,
                confidence: data.vadConfidence || 0,
                isActive: this.isActive
            });
        }

        // Update accessibility attributes
        this.updateAccessibility(data);
    }

    /**
     * Update accessibility attributes
     */
    private updateAccessibility(data: AudioVisualizerData): void {
        const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
        if (!wrapper) return;

        const confidencePercent = Math.round((data.vadConfidence || 0) * 100);
        const stateText = data.vadState.charAt(0).toUpperCase() + data.vadState.slice(1);
        
        wrapper.setAttribute('aria-label', 
            `Voice Activity Detection: ${stateText}, ${confidencePercent}% confidence`
        );
        wrapper.setAttribute('aria-live', 'polite');
    }

    /**
     * Handle errors
     */
    private handleError(error: Error): void {
        this.logger.error('[VAD Widget] Error:', error);
        
        if (this.config.onError) {
            this.config.onError(error);
        }

        // Show error state in UI
        this.showErrorState(error.message);
    }

    /**
     * Show error state in UI
     */
    private showErrorState(message: string): void {
        const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div class="vad-error-state" style="
                color: var(--text-error);
                font-size: 12px;
                text-align: center;
                padding: 4px;
                background: var(--background-modifier-error);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-error-border);
            ">
                <div>⚠️</div>
                <div title="${message}">VAD Error</div>
            </div>
        `;
    }

    /**
     * Create disabled placeholder
     */
    private createDisabledPlaceholder(): void {
        const placeholder = document.createElement('div');
        placeholder.className = 'vad-widget-disabled';
        placeholder.style.cssText = `
            width: 16px;
            height: 16px;
            background: var(--background-modifier-border);
            border-radius: 50%;
            opacity: 0.5;
            cursor: not-allowed;
        `;
        placeholder.title = 'Voice Activity Detection Disabled';
        this.container.appendChild(placeholder);
    }

    /**
     * Update widget configuration
     */
    public updateConfig(newConfig: Partial<VADWidgetConfig>): void {
        const wasActive = this.isActive;
        
        if (wasActive) {
            this.stop();
        }

        this.config = { ...this.config, ...newConfig };
        
        // Re-initialize if needed
        if (this.config.enabled && !this.vadIndicator) {
            this.container.innerHTML = ''; // Clear existing content
            this.initialize();
        }

        if (wasActive && this.config.enabled) {
            this.start();
        }

        this.logger.debug('[VAD Widget] Configuration updated');
    }

    /**
     * Get current widget state
     */
    public getState(): {
        isActive: boolean;
        vadState: string;
        confidence: number;
        isEnabled: boolean;
    } {
        const indicatorState = this.vadIndicator?.getState();
        
        return {
            isActive: this.isActive,
            vadState: indicatorState?.state || 'silent',
            confidence: indicatorState?.confidence || 0,
            isEnabled: this.config.enabled
        };
    }

    /**
     * Resize widget
     */
    public resize(size: 'small' | 'medium' | 'large'): void {
        this.config.size = size;
        const sizeConfig = VADWidget.SIZE_MAP[size];
        
        this.vadIndicator?.resize(sizeConfig.size);
        
        // Update wrapper styling
        const wrapper = this.container.querySelector('.vad-widget-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.setAttribute('data-size', size);
            this.applyWidgetStyling(wrapper);
        }
    }

    /**
     * Toggle widget state
     */
    public toggle(): Promise<void> {
        if (this.isActive) {
            this.stop();
            return Promise.resolve();
        } else {
            return this.start();
        }
    }

    /**
     * Check if widget is supported in current browser
     */
    public static isSupported(): boolean {
        try {
            return !!(navigator.mediaDevices && 
                     typeof navigator.mediaDevices.getUserMedia === 'function' &&
                     (window.AudioContext || (window as any).webkitAudioContext));
        } catch {
            return false;
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        
        this.vadIndicator?.dispose();
        this.audioRecorder?.dispose();
        
        // Clear DOM
        this.container.innerHTML = '';
        
        this.audioRecorder = null;
        this.vadIndicator = null;
        
        this.logger.debug('[VAD Widget] Disposed');
    }
}