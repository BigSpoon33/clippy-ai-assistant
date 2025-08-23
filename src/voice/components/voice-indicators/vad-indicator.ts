/**
 * VAD Visual Indicator Component
 * Canvas-based circular confidence meter with SVG state animations
 */

import { AudioVisualizerData, VADConfig } from '../../types/voice-types';
import { CanvasAudioVisualizer, VisualizerConfig } from '../../utils/audio-visualizer';

export interface VADIndicatorConfig {
    size: number;
    position: 'corner' | 'center' | 'inline';
    showConfidence: boolean;
    showText: boolean;
    animationDuration: number;
    colors: {
        silent: string;
        speech: string;
        noise: string;
        background: string;
        text: string;
    };
}

export class VADIndicator {
    private container: HTMLElement;
    private config: VADIndicatorConfig;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private svgContainer: HTMLElement;
    private textElement: HTMLElement | null = null;
    private currentState: 'silent' | 'speech' | 'noise' = 'silent';
    private currentConfidence: number = 0;
    private animationId: number | null = null;
    private isActive: boolean = false;
    private logger: Console;

    // Default configuration
    static readonly DEFAULT_CONFIG: VADIndicatorConfig = {
        size: 24,
        position: 'corner',
        showConfidence: true,
        showText: false,
        animationDuration: 300,
        colors: {
            silent: 'var(--background-modifier-border)',
            speech: 'var(--interactive-accent)',
            noise: '#ffa500',
            background: 'rgba(0, 0, 0, 0.3)',
            text: 'var(--text-normal)'
        }
    };

    constructor(container: HTMLElement, config: Partial<VADIndicatorConfig> = {}) {
        this.container = container;
        this.config = { ...VADIndicator.DEFAULT_CONFIG, ...config };
        this.logger = console;

        this.initialize();
    }

    /**
     * Initialize the VAD indicator
     */
    private initialize(): void {
        this.createIndicatorStructure();
        this.setupStyling();
        this.logger.debug('[VAD Indicator] Initialized');
    }

    /**
     * Create the visual structure (Canvas + SVG + Text)
     */
    private createIndicatorStructure(): void {
        // Create wrapper element
        const wrapper = document.createElement('div');
        wrapper.className = 'vad-indicator-wrapper';
        
        // Create canvas for confidence visualization
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.size;
        this.canvas.height = this.config.size;
        this.canvas.className = 'vad-indicator-canvas';
        
        // Get canvas context with optimization
        this.ctx = this.canvas.getContext('2d', { alpha: true })!;
        
        // Create SVG container for state animations
        this.svgContainer = document.createElement('div');
        this.svgContainer.className = 'vad-indicator-svg';
        this.svgContainer.innerHTML = this.createSVGIcon();
        
        // Create text element if enabled
        if (this.config.showText) {
            this.textElement = document.createElement('div');
            this.textElement.className = 'vad-indicator-text';
            this.textElement.textContent = 'Silent';
        }
        
        // Assemble structure
        wrapper.appendChild(this.canvas);
        wrapper.appendChild(this.svgContainer);
        if (this.textElement) {
            wrapper.appendChild(this.textElement);
        }
        
        this.container.appendChild(wrapper);
    }

    /**
     * Create SVG icon for state visualization
     */
    private createSVGIcon(): string {
        const size = this.config.size;
        const iconSize = size * 0.6;
        const offset = (size - iconSize) / 2;

        return `
            <svg width="${size}" height="${size}" class="vad-state-icon">
                <g transform="translate(${offset}, ${offset})">
                    <!-- Microphone icon -->
                    <path class="vad-icon-mic" d="M${iconSize/2} ${iconSize*0.2} 
                        C${iconSize*0.35} ${iconSize*0.2} ${iconSize*0.25} ${iconSize*0.3} ${iconSize*0.25} ${iconSize*0.45}
                        L${iconSize*0.25} ${iconSize*0.65}
                        C${iconSize*0.25} ${iconSize*0.8} ${iconSize*0.35} ${iconSize*0.9} ${iconSize/2} ${iconSize*0.9}
                        C${iconSize*0.65} ${iconSize*0.9} ${iconSize*0.75} ${iconSize*0.8} ${iconSize*0.75} ${iconSize*0.65}
                        L${iconSize*0.75} ${iconSize*0.45}
                        C${iconSize*0.75} ${iconSize*0.3} ${iconSize*0.65} ${iconSize*0.2} ${iconSize/2} ${iconSize*0.2} Z" 
                        fill="currentColor" stroke="none"/>
                    
                    <!-- Sound waves (animated for speech state) -->
                    <g class="vad-icon-waves">
                        <path class="wave-1" d="M${iconSize*0.85} ${iconSize*0.4} 
                            Q${iconSize*0.95} ${iconSize*0.55} ${iconSize*0.85} ${iconSize*0.7}" 
                            fill="none" stroke="currentColor" stroke-width="2" opacity="0"/>
                        <path class="wave-2" d="M${iconSize*0.9} ${iconSize*0.35} 
                            Q${iconSize*1.05} ${iconSize*0.55} ${iconSize*0.9} ${iconSize*0.75}" 
                            fill="none" stroke="currentColor" stroke-width="2" opacity="0"/>
                    </g>
                    
                    <!-- Noise indicator (X mark) -->
                    <g class="vad-icon-noise" opacity="0">
                        <line x1="${iconSize*0.3}" y1="${iconSize*0.3}" x2="${iconSize*0.7}" y2="${iconSize*0.7}" 
                            stroke="currentColor" stroke-width="2"/>
                        <line x1="${iconSize*0.7}" y1="${iconSize*0.3}" x2="${iconSize*0.3}" y2="${iconSize*0.7}" 
                            stroke="currentColor" stroke-width="2"/>
                    </g>
                </g>
            </svg>
        `;
    }

    /**
     * Setup CSS styling for the indicator
     */
    private setupStyling(): void {
        const wrapper = this.container.querySelector('.vad-indicator-wrapper') as HTMLElement;
        
        // Base wrapper styles
        wrapper.style.cssText = `
            position: relative;
            width: ${this.config.size}px;
            height: ${this.config.size}px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            transition: all ${this.config.animationDuration}ms ease;
        `;

        // Position-specific styles
        switch (this.config.position) {
            case 'corner':
                wrapper.style.position = 'absolute';
                wrapper.style.top = '8px';
                wrapper.style.right = '8px';
                wrapper.style.zIndex = '100';
                break;
            case 'center':
                wrapper.style.margin = '0 auto';
                break;
            case 'inline':
                wrapper.style.marginLeft = '8px';
                break;
        }

        // Canvas styles
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;

        // SVG styles
        this.svgContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: ${this.config.size}px;
            height: ${this.config.size}px;
            color: ${this.config.colors.silent};
            transition: color ${this.config.animationDuration}ms ease;
        `;

        // Text styles
        if (this.textElement) {
            this.textElement.style.cssText = `
                margin-top: ${this.config.size + 4}px;
                font-size: 10px;
                font-weight: 500;
                color: ${this.config.colors.text};
                text-align: center;
                white-space: nowrap;
                transition: color ${this.config.animationDuration}ms ease;
            `;
        }

        // Add CSS animations
        this.addCSSAnimations();
    }

    /**
     * Add CSS animations for different states
     */
    private addCSSAnimations(): void {
        const styleId = 'vad-indicator-animations';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .vad-indicator-wrapper.state-speech .vad-icon-waves .wave-1 {
                opacity: 1;
                animation: vad-wave-pulse 1s ease-in-out infinite;
            }
            .vad-indicator-wrapper.state-speech .vad-icon-waves .wave-2 {
                opacity: 0.7;
                animation: vad-wave-pulse 1s ease-in-out infinite 0.3s;
            }
            .vad-indicator-wrapper.state-noise .vad-icon-noise {
                opacity: 1;
                animation: vad-noise-flash 0.5s ease-in-out infinite alternate;
            }
            .vad-indicator-wrapper.state-silent .vad-icon-waves {
                opacity: 0;
            }
            
            @keyframes vad-wave-pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }
            
            @keyframes vad-noise-flash {
                0% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            @keyframes vad-confidence-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Update VAD indicator with new audio data
     */
    public updateVAD(data: AudioVisualizerData): void {
        if (!this.isActive) return;

        this.currentState = data.vadState;
        this.currentConfidence = data.vadConfidence || 0;

        // Update visual elements
        this.updateCanvas();
        this.updateSVGState();
        this.updateText();
    }

    /**
     * Update canvas-based confidence visualization
     */
    private updateCanvas(): void {
        const size = this.config.size;
        const center = size / 2;
        const maxRadius = center - 2;

        // Clear canvas
        this.ctx.clearRect(0, 0, size, size);

        if (!this.config.showConfidence) return;

        // Draw background circle
        this.ctx.beginPath();
        this.ctx.arc(center, center, maxRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fill();

        // Draw confidence indicator
        const confidenceRadius = maxRadius * this.currentConfidence;
        if (confidenceRadius > 0) {
            this.ctx.beginPath();
            this.ctx.arc(center, center, confidenceRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.getStateColor();
            this.ctx.globalAlpha = 0.7;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }

        // Draw confidence ring
        if (this.currentConfidence > 0.1) {
            this.ctx.beginPath();
            this.ctx.arc(center, center, confidenceRadius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = this.getStateColor();
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    /**
     * Update SVG state visualization
     */
    private updateSVGState(): void {
        const wrapper = this.container.querySelector('.vad-indicator-wrapper') as HTMLElement;
        const svg = this.svgContainer;

        // Remove existing state classes
        wrapper.classList.remove('state-silent', 'state-speech', 'state-noise');
        
        // Add current state class
        wrapper.classList.add(`state-${this.currentState}`);

        // Update SVG color
        svg.style.color = this.getStateColor();

        // Add pulsing animation for high confidence speech
        if (this.currentState === 'speech' && this.currentConfidence > 0.8) {
            wrapper.style.animation = 'vad-confidence-pulse 2s ease-in-out infinite';
        } else {
            wrapper.style.animation = '';
        }
    }

    /**
     * Update text display
     */
    private updateText(): void {
        if (!this.textElement) return;

        const stateText = this.currentState.charAt(0).toUpperCase() + this.currentState.slice(1);
        const confidenceText = this.config.showConfidence 
            ? ` (${Math.round(this.currentConfidence * 100)}%)`
            : '';

        this.textElement.textContent = stateText + confidenceText;
        this.textElement.style.color = this.getStateColor();
    }

    /**
     * Get color for current VAD state
     */
    private getStateColor(): string {
        switch (this.currentState) {
            case 'speech': return this.config.colors.speech;
            case 'noise': return this.config.colors.noise;
            case 'silent':
            default: return this.config.colors.silent;
        }
    }

    /**
     * Start the indicator
     */
    public start(): void {
        this.isActive = true;
        this.container.style.opacity = '1';
        this.logger.debug('[VAD Indicator] Started');
    }

    /**
     * Stop the indicator
     */
    public stop(): void {
        this.isActive = false;
        this.container.style.opacity = '0.5';
        
        // Reset to silent state
        this.currentState = 'silent';
        this.currentConfidence = 0;
        this.updateCanvas();
        this.updateSVGState();
        this.updateText();
        
        this.logger.debug('[VAD Indicator] Stopped');
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<VADIndicatorConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.setupStyling(); // Re-apply styles with new config
        this.logger.debug('[VAD Indicator] Configuration updated');
    }

    /**
     * Resize indicator
     */
    public resize(size: number): void {
        this.config.size = size;
        this.canvas.width = size;
        this.canvas.height = size;
        this.setupStyling();
        this.updateCanvas();
    }

    /**
     * Get current state
     */
    public getState(): { state: string; confidence: number; isActive: boolean } {
        return {
            state: this.currentState,
            confidence: this.currentConfidence,
            isActive: this.isActive
        };
    }

    /**
     * Set manual state (for testing or external control)
     */
    public setState(state: 'silent' | 'speech' | 'noise', confidence: number): void {
        this.currentState = state;
        this.currentConfidence = Math.max(0, Math.min(1, confidence));
        
        this.updateCanvas();
        this.updateSVGState();
        this.updateText();
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove DOM elements
        const wrapper = this.container.querySelector('.vad-indicator-wrapper');
        if (wrapper) {
            wrapper.remove();
        }
        
        this.logger.debug('[VAD Indicator] Disposed');
    }
}