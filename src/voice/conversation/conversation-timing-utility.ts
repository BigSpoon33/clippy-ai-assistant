/**
 * Conversation Timing Utility - Handles natural conversation flow detection
 * Manages timing for conversational mode with intelligent pause detection
 */

export interface TimingConfig {
  // Natural pause detection (2-4 seconds for conversation completion)
  naturalPauseThreshold: number; // milliseconds
  maxPauseThreshold: number; // milliseconds
  
  // Voice activity timeouts
  listeningTimeout: number; // max time to wait for voice input
  processingTimeout: number; // max time for message processing
  
  // Conversation flow settings
  autoStopAfterResponse: boolean; // stop listening after assistant response
  continuousListening: boolean; // keep listening between exchanges
}

export interface TimingState {
  lastActivity: Date;
  lastVoiceActivity: Date;
  lastResponse: Date;
  silenceDuration: number;
  isInNaturalPause: boolean;
  conversationActive: boolean;
}

export type TimingEventType = 
  | 'natural_pause_detected' 
  | 'conversation_timeout' 
  | 'voice_activity_detected'
  | 'silence_started'
  | 'response_completed';

export interface TimingEvent {
  type: TimingEventType;
  timestamp: Date;
  duration?: number;
  details?: string;
}

export type TimingEventListener = (event: TimingEvent) => void;

export class ConversationTimingUtility {
  private config: TimingConfig;
  private state: TimingState;
  private listeners: TimingEventListener[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<TimingConfig>) {
    this.config = {
      naturalPauseThreshold: 2500, // 2.5 seconds
      maxPauseThreshold: 4000,     // 4 seconds
      listeningTimeout: 30000,     // 30 seconds
      processingTimeout: 60000,    // 60 seconds
      autoStopAfterResponse: true,
      continuousListening: false,
      ...config
    };
    
    this.state = {
      lastActivity: new Date(),
      lastVoiceActivity: new Date(),
      lastResponse: new Date(),
      silenceDuration: 0,
      isInNaturalPause: false,
      conversationActive: false
    };
  }

  /**
   * Add event listener for timing events
   */
  addEventListener(listener: TimingEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: TimingEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Signal that voice activity was detected
   */
  onVoiceActivity(): void {
    const now = new Date();
    this.state.lastActivity = now;
    this.state.lastVoiceActivity = now;
    this.state.silenceDuration = 0;
    this.state.isInNaturalPause = false;
    this.state.conversationActive = true;
    
    this.clearTimers();
    this.emitEvent('voice_activity_detected', { details: 'Voice input detected' });
    this.startSilenceDetection();
  }

  /**
   * Signal that voice activity has stopped (silence started)
   */
  onVoiceSilence(): void {
    const now = new Date();
    this.state.lastActivity = now;
    this.state.silenceDuration = 0;
    
    this.clearTimers();
    this.emitEvent('silence_started', { details: 'Voice silence detected' });
    this.startSilenceDetection();
  }

  /**
   * Signal that assistant response is complete
   */
  onResponseComplete(): void {
    const now = new Date();
    this.state.lastActivity = now;
    this.state.lastResponse = now;
    
    this.emitEvent('response_completed', { details: 'Assistant response completed' });
    
    // Start listening for next input if in conversational mode
    if (this.config.continuousListening && !this.config.autoStopAfterResponse) {
      this.startSilenceDetection();
    } else if (this.config.autoStopAfterResponse) {
      this.stopConversation();
    }
  }

  /**
   * Start conversation timing
   */
  startConversation(): void {
    const now = new Date();
    this.state = {
      lastActivity: now,
      lastVoiceActivity: now,
      lastResponse: now,
      silenceDuration: 0,
      isInNaturalPause: false,
      conversationActive: true
    };
    
    console.log('[ConversationTiming] Conversation started');
  }

  /**
   * Stop conversation timing
   */
  stopConversation(): void {
    this.clearTimers();
    this.state.conversationActive = false;
    this.state.isInNaturalPause = false;
    
    console.log('[ConversationTiming] Conversation stopped');
  }

  /**
   * Update timing configuration
   */
  updateConfig(newConfig: Partial<TimingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[ConversationTiming] Config updated:', newConfig);
  }

  /**
   * Get current timing state
   */
  getState(): TimingState {
    return { ...this.state };
  }

  /**
   * Check if conversation has naturally paused
   */
  isInNaturalPause(): boolean {
    return this.state.isInNaturalPause;
  }

  /**
   * Get time since last activity
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.state.lastActivity.getTime();
  }

  private startSilenceDetection(): void {
    // Clear existing timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    
    // Start natural pause detection timer
    this.silenceTimer = setTimeout(() => {
      this.checkForNaturalPause();
    }, this.config.naturalPauseThreshold);
  }

  private checkForNaturalPause(): void {
    const silenceDuration = Date.now() - this.state.lastVoiceActivity.getTime();
    this.state.silenceDuration = silenceDuration;
    
    if (silenceDuration >= this.config.naturalPauseThreshold && 
        silenceDuration < this.config.maxPauseThreshold) {
      
      this.state.isInNaturalPause = true;
      this.emitEvent('natural_pause_detected', { 
        duration: silenceDuration,
        details: 'Natural conversation pause detected'
      });
      
      // Set max pause timer
      this.silenceTimer = setTimeout(() => {
        this.onConversationTimeout();
      }, this.config.maxPauseThreshold - this.config.naturalPauseThreshold);
      
    } else if (silenceDuration >= this.config.maxPauseThreshold) {
      this.onConversationTimeout();
    }
  }

  private onConversationTimeout(): void {
    const silenceDuration = Date.now() - this.state.lastVoiceActivity.getTime();
    
    this.emitEvent('conversation_timeout', { 
      duration: silenceDuration,
      details: 'Conversation timed out due to prolonged silence'
    });
    
    this.stopConversation();
  }

  private clearTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  private emitEvent(type: TimingEventType, extra?: Partial<TimingEvent>): void {
    const event: TimingEvent = {
      type,
      timestamp: new Date(),
      ...extra
    };
    
    console.log('[ConversationTiming] Event:', event);
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConversationTiming] Error in event listener:', error);
      }
    });
  }
}