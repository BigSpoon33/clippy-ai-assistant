/**
 * Audio Visualizer Foundation
 * Multi-layer rendering system supporting Canvas, SVG, and WebGL
 */

import { AudioVisualizerData, TTSVisualizerConfig } from '../types/voice-types';

export interface VisualizerConfig {
    width: number;
    height: number;
    renderingMode: 'canvas' | 'svg' | 'webgl' | 'auto';
    targetFPS: number;
    enablePerformanceMonitoring: boolean;
    mobileOptimized: boolean;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
}

export interface PerformanceMetrics {
    fps: number;
    memoryUsageMB: number;
    cpuUsage: number;
    droppedFrames: number;
    averageRenderTime: number;
}

export abstract class BaseAudioVisualizer {
    protected container: HTMLElement;
    protected config: VisualizerConfig;
    protected isActive: boolean = false;
    protected animationId: number | null = null;
    protected performanceMonitor: PerformanceMonitor | null = null;
    protected logger: Console;

    // Default configuration
    static readonly DEFAULT_CONFIG: VisualizerConfig = {
        width: 800,
        height: 200,
        renderingMode: 'auto',
        targetFPS: 60,
        enablePerformanceMonitoring: true,
        mobileOptimized: true,
        colors: {
            primary: 'var(--interactive-accent)',
            secondary: 'var(--text-muted)',
            accent: 'var(--text-accent)',
            background: 'var(--background-secondary)'
        }
    };

    constructor(container: HTMLElement, config: Partial<VisualizerConfig> = {}) {
        this.container = container;
        this.config = { ...BaseAudioVisualizer.DEFAULT_CONFIG, ...config };
        this.logger = console;

        // Auto-detect optimal rendering mode
        if (this.config.renderingMode === 'auto') {
            this.config.renderingMode = this.detectOptimalRenderingMode();
        }

        // Detect mobile and optimize
        if (this.isMobileDevice() && this.config.mobileOptimized) {
            this.optimizeForMobile();
        }

        // Initialize performance monitoring
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor = new PerformanceMonitor(this.config.targetFPS);
        }

        this.initialize();
    }

    /**
     * Initialize the visualizer (must be implemented by subclasses)
     */
    protected abstract initialize(): void;

    /**
     * Update visualization with new audio data (must be implemented by subclasses)
     */
    public abstract updateVisualization(data: AudioVisualizerData): void;

    /**
     * Start visualization loop
     */
    public start(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.performanceMonitor?.start();
        this.logger.debug('[Audio Visualizer] Started');
    }

    /**
     * Stop visualization loop
     */
    public stop(): void {
        if (!this.isActive) return;

        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.performanceMonitor?.stop();
        this.logger.debug('[Audio Visualizer] Stopped');
    }

    /**
     * Resize visualizer
     */
    public resize(width: number, height: number): void {
        this.config.width = width;
        this.config.height = height;
        this.handleResize();
    }

    /**
     * Handle resize event (can be overridden by subclasses)
     */
    protected handleResize(): void {
        // Default implementation - subclasses can override
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<VisualizerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.debug('[Audio Visualizer] Configuration updated');
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics | null {
        return this.performanceMonitor?.getMetrics() || null;
    }

    /**
     * Check if visualizer is currently active
     */
    public getIsActive(): boolean {
        return this.isActive;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();
        this.performanceMonitor?.dispose();
        this.logger.debug('[Audio Visualizer] Disposed');
    }

    /**
     * Detect optimal rendering mode based on browser capabilities
     */
    private detectOptimalRenderingMode(): 'canvas' | 'svg' | 'webgl' {
        // Check WebGL support
        if (this.supportsWebGL() && !this.isMobileDevice()) {
            return 'webgl';
        }

        // Check Canvas support (almost universal)
        if (this.supportsCanvas()) {
            return 'canvas';
        }

        // Fallback to SVG
        return 'svg';
    }

    /**
     * Check if browser supports WebGL
     */
    private supportsWebGL(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if browser supports Canvas
     */
    private supportsCanvas(): boolean {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext && canvas.getContext('2d'));
        } catch (e) {
            return false;
        }
    }

    /**
     * Detect mobile device
     */
    private isMobileDevice(): boolean {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Optimize configuration for mobile devices
     */
    private optimizeForMobile(): void {
        this.config.targetFPS = 30; // Reduce FPS for battery life
        this.config.width = Math.min(this.config.width, 400); // Smaller visualization
        this.config.height = Math.min(this.config.height, 100);
        this.logger.debug('[Audio Visualizer] Mobile optimizations applied');
    }
}

/**
 * Canvas-based audio visualizer
 */
export class CanvasAudioVisualizer extends BaseAudioVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastFrameTime: number = 0;

    protected initialize(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';

        // Optimize canvas context for performance
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,      // Disable alpha for performance
            desynchronized: true // Allow async rendering
        })!;

        // Set high DPI support
        this.setupHighDPI();

        this.container.appendChild(this.canvas);
        this.logger.debug('[Canvas Visualizer] Initialized');
    }

    public updateVisualization(data: AudioVisualizerData): void {
        if (!this.isActive) return;

        const now = performance.now();
        const frameInterval = 1000 / this.config.targetFPS;

        // Frame rate limiting
        if (now - this.lastFrameTime < frameInterval) {
            this.animationId = requestAnimationFrame(() => this.updateVisualization(data));
            return;
        }

        this.performanceMonitor?.frameStart();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw frequency spectrum
        this.drawSpectrum(data.frequencyData);

        // Draw VAD indicator
        this.drawVADIndicator(data.vadState, data.vadConfidence || 0);

        // Draw volume level
        this.drawVolumeLevel(data.volumeLevel);

        this.performanceMonitor?.frameEnd();
        this.lastFrameTime = now;
    }

    private drawSpectrum(frequencyData: Uint8Array): void {
        const barWidth = this.canvas.width / frequencyData.length;
        const barSpacing = 1;
        const actualBarWidth = barWidth - barSpacing;

        this.ctx.fillStyle = this.config.colors.primary;

        for (let i = 0; i < frequencyData.length; i++) {
            const barHeight = (frequencyData[i] / 255) * this.canvas.height * 0.8;
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;

            // Use integer coordinates for performance
            this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(actualBarWidth), Math.floor(barHeight));
        }
    }

    private drawVADIndicator(vadState: 'silent' | 'speech' | 'noise', confidence: number): void {
        const indicatorSize = 20;
        const x = this.canvas.width - indicatorSize - 10;
        const y = 10;

        // Background circle
        this.ctx.beginPath();
        this.ctx.arc(x + indicatorSize / 2, y + indicatorSize / 2, indicatorSize / 2, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();

        // VAD state indicator
        let color = this.config.colors.secondary;
        if (vadState === 'speech') color = this.config.colors.accent;
        else if (vadState === 'noise') color = '#ffa500';

        this.ctx.beginPath();
        this.ctx.arc(x + indicatorSize / 2, y + indicatorSize / 2, (indicatorSize / 2) * confidence, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    private drawVolumeLevel(level: number): void {
        const meterWidth = 150;
        const meterHeight = 10;
        const x = 10;
        const y = 10;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x, y, meterWidth, meterHeight);

        // Level indicator
        const levelWidth = level * meterWidth;
        this.ctx.fillStyle = this.config.colors.primary;
        this.ctx.fillRect(x, y, levelWidth, meterHeight);
    }

    protected handleResize(): void {
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        this.setupHighDPI();
    }

    private setupHighDPI(): void {
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set actual canvas size
        this.canvas.width = this.config.width * devicePixelRatio;
        this.canvas.height = this.config.height * devicePixelRatio;
        
        // Scale canvas back down using CSS
        this.canvas.style.width = this.config.width + 'px';
        this.canvas.style.height = this.config.height + 'px';
        
        // Scale drawing context
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }
}

/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
    private targetFPS: number;
    private frameCount: number = 0;
    private lastTime: number = 0;
    private frameStartTime: number = 0;
    private renderTimes: number[] = [];
    private droppedFrames: number = 0;
    private isRunning: boolean = false;

    constructor(targetFPS: number) {
        this.targetFPS = targetFPS;
    }

    public start(): void {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.droppedFrames = 0;
        this.renderTimes = [];
    }

    public stop(): void {
        this.isRunning = false;
    }

    public frameStart(): void {
        this.frameStartTime = performance.now();
    }

    public frameEnd(): void {
        if (!this.isRunning) return;

        const now = performance.now();
        const renderTime = now - this.frameStartTime;
        const frameTime = now - this.lastTime;

        this.renderTimes.push(renderTime);
        if (this.renderTimes.length > 60) {
            this.renderTimes.shift();
        }

        // Check for dropped frames
        const expectedFrameTime = 1000 / this.targetFPS;
        if (frameTime > expectedFrameTime * 1.5) {
            this.droppedFrames++;
        }

        this.frameCount++;
        this.lastTime = now;
    }

    public getMetrics(): PerformanceMetrics {
        const now = performance.now();
        const elapsed = (now - this.lastTime) / 1000;
        const fps = elapsed > 0 ? this.frameCount / elapsed : 0;
        const averageRenderTime = this.renderTimes.length > 0 
            ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length 
            : 0;

        // Estimate memory usage (approximate)
        const memoryUsageMB = (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0;

        return {
            fps: Math.round(fps),
            memoryUsageMB: Math.round(memoryUsageMB),
            cpuUsage: Math.round((averageRenderTime / (1000 / this.targetFPS)) * 100),
            droppedFrames: this.droppedFrames,
            averageRenderTime: Math.round(averageRenderTime * 100) / 100
        };
    }

    public dispose(): void {
        this.stop();
    }
}

/**
 * Factory function to create appropriate visualizer based on configuration
 */
export function createAudioVisualizer(
    container: HTMLElement, 
    config: Partial<VisualizerConfig> = {}
): BaseAudioVisualizer {
    const finalConfig = { ...BaseAudioVisualizer.DEFAULT_CONFIG, ...config };
    
    switch (finalConfig.renderingMode) {
        case 'canvas':
        default:
            return new CanvasAudioVisualizer(container, finalConfig);
        // Future: SVGAudioVisualizer, WebGLAudioVisualizer
    }
}