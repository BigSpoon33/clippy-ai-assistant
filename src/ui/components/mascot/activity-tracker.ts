/**
 * CLIPPY AI Assistant - Activity Tracker
 * Monitors user activity to trigger appropriate mascot reactions
 */

import { App, TFile } from 'obsidian';
import { ClippyMascot } from './clippy-mascot';

export interface ActivityMetrics {
  typingSpeed: number;
  recentNoteCount: number;
  researchActivity: number;
  voiceUsage: number;
  lastActivity: number;
}

export class ActivityTracker {
  private app: App;
  private mascot: ClippyMascot | null = null;
  private metrics: ActivityMetrics;
  private typingBuffer: number[] = [];
  private lastKeystroke: number = 0;
  private recentlyCreatedNotes: string[] = [];
  private activityListeners: Map<string, ((data?: any) => void)[]> = new Map();

  constructor(app: App) {
    this.app = app;
    this.metrics = {
      typingSpeed: 0,
      recentNoteCount: 0,
      researchActivity: 0,
      voiceUsage: 0,
      lastActivity: Date.now()
    };

    this.setupActivityListeners();
  }

  /**
   * Connect a mascot to receive activity updates
   */
  public setMascot(mascot: ClippyMascot): void {
    this.mascot = mascot;
    console.log('🔗 Activity tracker connected to mascot');
  }

  /**
   * Setup various activity listeners
   */
  private setupActivityListeners(): void {
    // Track typing activity
    this.trackTypingActivity();
    
    // Track file creation/modification
    this.trackFileActivity();
    
    // Track research activities
    this.trackResearchActivity();
    
    // Track general UI interactions
    this.trackUIInteractions();

    console.log('📊 Activity tracking initialized');
  }

  /**
   * Track typing patterns and speed
   */
  private trackTypingActivity(): void {
    let typingTimer: number | null = null;
    
    // Monitor keystrokes across the app
    document.addEventListener('keydown', (event) => {
      const now = Date.now();
      
      // Filter out non-content keys
      if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
        this.lastKeystroke = now;
        this.typingBuffer.push(now);
        
        // Keep only recent keystrokes (last 10 seconds)
        this.typingBuffer = this.typingBuffer.filter(timestamp => now - timestamp < 10000);
        
        // Calculate typing speed (characters per minute)
        const timeSpan = (this.typingBuffer[this.typingBuffer.length - 1] - this.typingBuffer[0]) / 1000;
        this.metrics.typingSpeed = timeSpan > 0 ? (this.typingBuffer.length / timeSpan) * 60 : 0;
        
        // Determine typing intensity
        const intensity = Math.min(this.metrics.typingSpeed / 200, 1); // Normalize to 0-1
        
        // React with mascot
        if (this.mascot) {
          this.mascot.reactToActivity('typing', intensity);
        }
        
        // Emit typing activity event
        this.emitActivityEvent('typing', { speed: this.metrics.typingSpeed, intensity });
        
        // Reset idle timer
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
          if (this.mascot && Date.now() - this.lastKeystroke > 3000) {
            this.mascot.reactToActivity('idle');
          }
        }, 3000);
        
        this.updateLastActivity();
      }
    });
  }

  /**
   * Track file creation and modification
   */
  private trackFileActivity(): void {
    // Track file creation
    this.app.vault.on('create', (file: TFile) => {
      if (file instanceof TFile && file.extension === 'md') {
        console.log('📝 New note created:', file.name);
        
        // Track recent note creation
        this.recentlyCreatedNotes.push(file.name);
        this.recentlyCreatedNotes = this.recentlyCreatedNotes.slice(-5); // Keep last 5
        this.metrics.recentNoteCount = this.recentlyCreatedNotes.length;
        
        // React with mascot
        if (this.mascot) {
          this.mascot.reactToActivity('note_created', 0.8);
        }
        
        // Emit note creation event
        this.emitActivityEvent('note_created', { fileName: file.name });
        
        this.updateLastActivity();
      }
    });

    // Track file modification
    this.app.vault.on('modify', (file: TFile) => {
      if (file instanceof TFile && file.extension === 'md') {
        // Only react to significant modifications (not every keystroke)
        const now = Date.now();
        if (now - this.lastKeystroke > 1000) { // 1 second since last keystroke
          this.emitActivityEvent('note_modified', { fileName: file.name });
        }
      }
    });
  }

  /**
   * Track research-related activities
   */
  private trackResearchActivity(): void {
    // This would be connected to the research system
    // For now, we'll set up the framework
    
    this.onActivity('research_start', () => {
      console.log('🔍 Research activity started');
      this.metrics.researchActivity += 1;
      
      if (this.mascot) {
        this.mascot.reactToActivity('research_start', 1);
      }
      
      this.updateLastActivity();
    });

    this.onActivity('research_complete', () => {
      console.log('✅ Research activity completed');
      this.metrics.researchActivity += 2; // Completion worth more
      
      if (this.mascot) {
        this.mascot.reactToActivity('research_complete', 1);
      }
      
      this.updateLastActivity();
    });

    this.onActivity('research_progress', (data: any) => {
      if (this.mascot && data.percentage > 50) {
        this.mascot.reactToActivity('thinking', data.percentage / 100);
      }
    });
  }

  /**
   * Track voice interaction activities
   */
  public trackVoiceActivity(activityType: 'listening' | 'speaking' | 'processing'): void {
    console.log(`🎤 Voice activity: ${activityType}`);
    this.metrics.voiceUsage += 1;
    
    if (this.mascot) {
      this.mascot.reactToActivity(`voice_${activityType}`, 1);
    }
    
    this.emitActivityEvent('voice_activity', { type: activityType });
    this.updateLastActivity();
  }

  /**
   * Track general UI interactions
   */
  private trackUIInteractions(): void {
    // Track clicks on plugin elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on plugin elements
      if (target.closest('.clippy-modal') || 
          target.closest('.research-agent-sidebar') || 
          target.closest('.vault-agent-sidebar')) {
        
        this.emitActivityEvent('ui_interaction', { element: target.className });
        this.updateLastActivity();
      }
    });

    // Track scroll activity in plugin areas
    document.addEventListener('scroll', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.closest('.clippy-modal') || 
          target.closest('.research-agent-sidebar') || 
          target.closest('.vault-agent-sidebar')) {
        
        // Only emit occasionally to avoid spam
        if (Math.random() < 0.1) { // 10% chance
          this.emitActivityEvent('ui_scroll', { element: target.className });
        }
      }
    });
  }

  /**
   * Track AI processing activities
   */
  public trackAIActivity(activityType: 'thinking' | 'processing' | 'complete' | 'error'): void {
    console.log(`🤖 AI activity: ${activityType}`);
    
    if (this.mascot) {
      let intensity = 1;
      if (activityType === 'thinking') intensity = 0.7;
      if (activityType === 'processing') intensity = 0.9;
      
      this.mascot.reactToActivity(`ai_${activityType}`, intensity);
    }
    
    this.emitActivityEvent('ai_activity', { type: activityType });
    this.updateLastActivity();
  }

  /**
   * Register activity event listeners
   */
  public onActivity(eventType: string, callback: (data?: any) => void): void {
    if (!this.activityListeners.has(eventType)) {
      this.activityListeners.set(eventType, []);
    }
    this.activityListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit activity events to registered listeners
   */
  private emitActivityEvent(eventType: string, data?: any): void {
    const listeners = this.activityListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in activity listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.metrics.lastActivity = Date.now();
  }

  /**
   * Get current activity metrics
   */
  public getMetrics(): ActivityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get activity summary for display
   */
  public getActivitySummary(): string {
    const now = Date.now();
    const timeSinceLastActivity = now - this.metrics.lastActivity;
    const minutesSinceActivity = Math.floor(timeSinceLastActivity / 60000);
    
    let status = 'active';
    if (minutesSinceActivity > 30) status = 'idle';
    else if (minutesSinceActivity > 10) status = 'low activity';
    else if (this.metrics.typingSpeed > 100) status = 'very active';
    
    return `Status: ${status} | Typing: ${Math.round(this.metrics.typingSpeed)} cpm | Notes: ${this.metrics.recentNoteCount}`;
  }

  /**
   * Check if user seems actively engaged
   */
  public isUserEngaged(): boolean {
    const now = Date.now();
    const recentActivity = now - this.metrics.lastActivity < 60000; // Activity in last minute
    const goodTypingSpeed = this.metrics.typingSpeed > 30;
    const recentNotes = this.metrics.recentNoteCount > 0;
    
    return recentActivity && (goodTypingSpeed || recentNotes || this.metrics.voiceUsage > 0);
  }

  /**
   * Get engagement level (0-1)
   */
  public getEngagementLevel(): number {
    const factors = [
      Math.min(this.metrics.typingSpeed / 200, 1), // Normalize typing speed
      Math.min(this.metrics.recentNoteCount / 5, 1), // Normalize note count
      Math.min(this.metrics.researchActivity / 10, 1), // Normalize research activity
      Math.min(this.metrics.voiceUsage / 5, 1), // Normalize voice usage
    ];
    
    // Weighted average
    const weights = [0.3, 0.2, 0.3, 0.2];
    const weightedSum = factors.reduce((sum, factor, index) => sum + factor * weights[index], 0);
    
    // Factor in recency
    const timeFactor = Math.max(0, 1 - (Date.now() - this.metrics.lastActivity) / 300000); // 5 minute decay
    
    return Math.min(weightedSum * timeFactor, 1);
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      typingSpeed: 0,
      recentNoteCount: 0,
      researchActivity: 0,
      voiceUsage: 0,
      lastActivity: Date.now()
    };
    
    this.typingBuffer = [];
    this.recentlyCreatedNotes = [];
    
    console.log('📊 Activity metrics reset');
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.activityListeners.clear();
    this.typingBuffer = [];
    this.recentlyCreatedNotes = [];
    
    // Remove any event listeners that were directly attached
    // (Note: document event listeners will be cleaned up automatically)
    
    console.log('📊 Activity tracker destroyed');
  }
}