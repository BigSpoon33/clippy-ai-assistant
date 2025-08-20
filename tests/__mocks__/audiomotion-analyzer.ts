/**
 * AudioMotion-Analyzer Mock for Testing
 */

export default class AudioMotionAnalyzer {
  public static isSupported = true;
  
  // Mock properties that match real audioMotion-analyzer
  public isOn: boolean = false;
  public isPaused: boolean = false;
  public mode: number = 0;
  public freqMin: number = 20;
  public freqMax: number = 22000;
  public smoothing: number = 0.5;
  public fftSize: number = 8192;
  public minDecibels: number = -85;
  public maxDecibels: number = -25;
  public showPeaks: boolean = true;
  public gradient: string = 'classic';
  public lumiBars: boolean = false;
  public reflexRatio: number = 0;
  public height: number = 300;
  public width: number = 600;
  
  // Mock canvas and context
  public canvas: HTMLCanvasElement;
  public canvasCtx: CanvasRenderingContext2D;
  
  // Mock audio context
  public audioCtx: AudioContext;
  public analyzer: AnalyserNode;
  
  // Mock event handling
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor(container: HTMLElement, options: any = {}) {
    // Apply options
    Object.assign(this, options);
    
    // Create mock canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvasCtx = this.canvas.getContext('2d')!;
    
    // Append to container
    if (container) {
      container.appendChild(this.canvas);
    }
    
    // Create mock audio context and analyzer
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyzer = this.audioCtx.createAnalyser();
    
    // Set default analyzer properties
    this.analyzer.fftSize = this.fftSize;
    this.analyzer.smoothingTimeConstant = this.smoothing;
    this.analyzer.minDecibels = this.minDecibels;
    this.analyzer.maxDecibels = this.maxDecibels;
  }
  
  // Mock methods
  public connectInput(source: AudioNode): AudioMotionAnalyzer {
    if (source && typeof source.connect === 'function') {
      source.connect(this.analyzer);
    }
    return this;
  }
  
  public disconnectInput(): void {
    // Mock disconnect
  }
  
  public start(): void {
    this.isOn = true;
    this.isPaused = false;
    // Simulate animation frame
    this.mockAnimationFrame();
  }
  
  public stop(): void {
    this.isOn = false;
    this.isPaused = false;
  }
  
  public pause(): void {
    this.isPaused = true;
  }
  
  public resume(): void {
    this.isPaused = false;
    if (this.isOn) {
      this.mockAnimationFrame();
    }
  }
  
  public toggleAnalyzer(): boolean {
    if (this.isOn) {
      this.stop();
    } else {
      this.start();
    }
    return this.isOn;
  }
  
  public setFreqRange(minFreq: number, maxFreq: number): void {
    this.freqMin = minFreq;
    this.freqMax = maxFreq;
  }
  
  public setCanvasSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  public getCanvasSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
  
  public destroy(): void {
    this.stop();
    this.disconnectInput();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
  
  // Mock event handling
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  public dispatchEvent(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  // Mock getters and setters for common properties
  public get version(): string {
    return '4.5.1-mock';
  }
  
  public get isFullscreen(): boolean {
    return false;
  }
  
  public get isLedDisplay(): boolean {
    return false;
  }
  
  public get isLumiBars(): boolean {
    return this.lumiBars;
  }
  
  public set isLumiBars(value: boolean) {
    this.lumiBars = value;
  }
  
  public get showScaleX(): boolean {
    return false;
  }
  
  public get showScaleY(): boolean {
    return false;
  }
  
  // Mock animation frame
  private mockAnimationFrame(): void {
    if (!this.isOn || this.isPaused) return;
    
    // Simulate frequency data
    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Fill with mock data that simulates audio spectrum
    for (let i = 0; i < bufferLength; i++) {
      // Create a mock spectrum with some variation
      const frequency = (i / bufferLength) * (this.freqMax - this.freqMin) + this.freqMin;
      let amplitude = 0;
      
      // Simulate human voice frequency range (85-8000 Hz) with higher activity
      if (frequency >= 85 && frequency <= 8000) {
        amplitude = Math.random() * 100 + 50; // 50-150 range
      } else {
        amplitude = Math.random() * 30; // 0-30 range for other frequencies
      }
      
      dataArray[i] = Math.min(255, Math.max(0, amplitude));
    }
    
    // Mock drawing on canvas
    this.mockDraw(dataArray);
    
    // Continue animation if still running
    if (this.isOn && !this.isPaused) {
      setTimeout(() => this.mockAnimationFrame(), 16); // ~60 FPS
    }
  }
  
  // Mock drawing method
  private mockDraw(dataArray: Uint8Array): void {
    if (!this.canvasCtx) return;
    
    // Clear canvas
    this.canvasCtx.fillStyle = '#000';
    this.canvasCtx.fillRect(0, 0, this.width, this.height);
    
    // Draw mock spectrum bars
    const barWidth = this.width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * this.height;
      
      // Use a gradient color
      const hue = (i / dataArray.length) * 360;
      this.canvasCtx.fillStyle = `hsl(${hue}, 50%, 50%)`;
      
      this.canvasCtx.fillRect(x, this.height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
    
    // Emit mock events
    this.dispatchEvent('draw', { dataArray, timestamp: performance.now() });
  }
  
  // Static method to check support
  public static checkSupport(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}

// Export as both default and named export for compatibility
export { AudioMotionAnalyzer };
export const audioMotion = AudioMotionAnalyzer;