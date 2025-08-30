/**
 * CLIPPY TCG Writer - Keystroke Tracker
 * Extends existing activity tracker for TCG EXP and progression
 * Following PRP specifications for performance and compatibility
 */

import { ActivityTracker } from '../../../ui/components/mascot/activity-tracker';
import { TCGSettings, TCGSessionMetrics } from '../types';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== INTERFACES =====

export interface TCGKeystrokeData {
  timestamp: number;
  keystroke: boolean;
  expAwarded?: number;
  sessionKeystrokes: number;
  totalKeystrokes: number;
}

// ===== MAIN TCG KEYSTROKE TRACKER =====

/**
 * TCG Keystroke Tracker that extends existing activity tracking
 * Implements batched processing and EXP calculation
 */
export class TCGKeystrokeTracker {
  private activityTracker: ActivityTracker;
  private settings: TCGSettings;
  
  // Keystroke buffering for performance
  private keystrokeBuffer: number[] = [];
  private lastFlush = 0;
  private readonly BATCH_SIZE = 10; // Process every 10 keystrokes
  private readonly BATCH_TIMEOUT = 100; // Or every 100ms
  private batchTimeout: number | null = null;
  
  // EXP and progression tracking
  private totalKeystrokes = 0;
  private sessionKeystrokes = 0;
  private sessionStartTime = Date.now();
  private lastEXPAward = 0;
  private currentEXP = 0;
  
  // Performance metrics
  private keystrokeTimestamps: number[] = [];
  private peakKPM = 0;
  private lastKeystrokeTime?: number;
  
  // Writing pattern analysis
  private burstSequences: { start: number; end: number; duration: number; keystrokes: number }[] = [];
  private pauseSequences: { start: number; end: number; duration: number }[] = [];
  
  // Event listeners for cleanup
  private eventListeners: (() => void)[] = [];
  
  // Event emitters
  private tcgEventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  
  constructor(activityTracker: ActivityTracker, settings: TCGSettings) {
    this.activityTracker = activityTracker;
    this.settings = settings;
    
    this.setupTCGKeystrokeTracking();
    console.log('⚡ TCG Keystroke Tracker initialized');
  }
  
  /**
   * Setup TCG-specific keystroke tracking by extending existing activity tracker
   * CRITICAL: Does not replace existing functionality - only extends it
   */
  private setupTCGKeystrokeTracking(): void {
    // Listen to existing typing events from activity tracker
    this.activityTracker.onActivity('typing', (data) => {
      this.handleTypingActivity(data);
    });
    
    // Listen to existing note creation events for bonus EXP
    this.activityTracker.onActivity('note_created', (data) => {
      this.handleNoteCreation(data);
    });
    
    // Listen to existing note modification events
    this.activityTracker.onActivity('note_modified', (data) => {
      this.handleNoteModification(data);
    });
    
    console.log('🔗 TCG keystroke tracking connected to existing activity tracker');
  }
  
  /**
   * Handle typing activity from the existing activity tracker
   * Implements batched processing for performance
   */
  private handleTypingActivity(data: { speed: number; intensity: number }): void {
    const now = Date.now();
    
    // Add to keystroke buffer
    this.keystrokeBuffer.push(now);
    this.sessionKeystrokes++;
    this.totalKeystrokes++;
    
    // Track keystroke timestamps for KPM calculation (last 10 seconds)
    this.keystrokeTimestamps.push(now);
    this.keystrokeTimestamps = this.keystrokeTimestamps.filter(ts => now - ts < 10000);
    
    // Analyze burst and pause patterns
    this.analyzeBurstPausePatterns(now);
    
    // Update peak KPM
    const currentKPM = this.calculateCurrentKPM();
    if (currentKPM > this.peakKPM) {
      this.peakKPM = currentKPM;
    }
    
    // Batch processing to prevent UI lag
    if (this.keystrokeBuffer.length >= this.BATCH_SIZE || 
        now - this.lastFlush > this.BATCH_TIMEOUT) {
      this.flushKeystrokes();
    } else if (!this.batchTimeout) {
      // Set timeout to ensure processing even with low typing speed
      this.batchTimeout = window.setTimeout(() => {
        this.flushKeystrokes();
      }, this.BATCH_TIMEOUT);
    }
  }
  
  /**
   * Process accumulated keystrokes and award EXP
   * Implements error boundaries for robust operation
   */
  private async flushKeystrokes(): Promise<void> {
    if (this.keystrokeBuffer.length === 0) return;
    
    const keystrokesToProcess = this.keystrokeBuffer.length;
    this.keystrokeBuffer = []; // Clear buffer
    this.lastFlush = Date.now();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Process EXP awards with error boundaries
    await this.processEXPAwards(keystrokesToProcess);
  }
  
  /**
   * Process EXP awards for accumulated keystrokes
   * Uses error boundaries as specified in PRP
   */
  private async processEXPAwards(keystrokeCount: number): Promise<void> {
    await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        // Check if enough keystrokes for EXP award
        const keystrokesSinceLastAward = this.totalKeystrokes - this.lastEXPAward;
        
        if (keystrokesSinceLastAward >= this.settings.keystrokesPerEXP) {
          const expToAward = Math.floor(keystrokesSinceLastAward / this.settings.keystrokesPerEXP);
          
          if (expToAward > 0) {
            await this.awardEXP(expToAward);
            this.lastEXPAward = this.totalKeystrokes - (keystrokesSinceLastAward % this.settings.keystrokesPerEXP);
          }
        }
        
        // Emit TCG keystroke event
        this.emitTCGEvent('tcg-keystroke-batch', {
          keystrokeCount,
          sessionKeystrokes: this.sessionKeystrokes,
          totalKeystrokes: this.totalKeystrokes,
          currentKPM: this.calculateCurrentKPM(),
          qualityScore: this.calculateQualityScore()
        });
      },
      'TCG EXP processing'
    );
    
    // If the operation failed, we silently continue without awarding EXP
    // This prevents typing interruption while maintaining system stability
  }
  
  /**
   * Award EXP and emit related events
   */
  private async awardEXP(amount: number): Promise<void> {
    const previousEXP = this.currentEXP;
    const bonusMultiplier = this.calculateBonusMultiplier();
    const finalAmount = Math.floor(amount * bonusMultiplier);
    
    this.currentEXP += finalAmount;
    
    // Award pack for every keystroke threshold reached (immediate reward)
    this.awardKeystrokePack(amount);
    
    // Check for milestone achievement bonuses (separate from keystroke rewards)
    this.checkPackMilestones(previousEXP, this.currentEXP);
    
    // Emit EXP awarded event
    this.emitTCGEvent('tcg-exp-awarded', {
      amount: finalAmount,
      baseAmount: amount,
      bonusMultiplier,
      totalEXP: this.currentEXP,
      previousEXP: previousEXP,
      keystrokesTrigger: this.settings.keystrokesPerEXP
    });
    
    console.log(`⚡ TCG EXP Awarded: ${finalAmount} (${amount} base × ${bonusMultiplier.toFixed(2)} bonus) - Total: ${this.currentEXP}`);
  }

  /**
   * Award pack for every keystroke threshold (immediate reward)
   */
  private awardKeystrokePack(expAmount: number): void {
    // Award 1 core pack for every 1 EXP earned (which is every 500 keystrokes)
    for (let i = 0; i < expAmount; i++) {
      this.emitTCGEvent('tcg-keystroke-pack-earned', {
        packType: 'core-set',
        reward: `Core pack from ${this.settings.keystrokesPerEXP} keystrokes!`,
        earnedBy: 'keystroke_threshold',
        keystrokeCount: this.settings.keystrokesPerEXP
      });
      
      console.log(`📦 Keystroke Pack Earned: Core Set pack for ${this.settings.keystrokesPerEXP} keystrokes!`);
    }
  }

  /**
   * Check if EXP milestones have been reached and award bonus packs (achievement rewards)
   */
  private checkPackMilestones(previousEXP: number, currentEXP: number): void {
    const milestones = [
      { exp: 10, packType: 'starter-pack', reward: 'First milestone bonus!' },
      { exp: 25, packType: 'premium', reward: 'Quarter century achievement!' },
      { exp: 50, packType: 'premium', reward: 'Half century milestone!' },
      { exp: 100, packType: 'premium', reward: 'Century club bonus!' },
      { exp: 200, packType: 'premium', reward: 'Double century achievement!' },
      { exp: 500, packType: 'premium', reward: 'Major milestone reached!' },
      { exp: 1000, packType: 'premium', reward: 'Master writer achievement!' }
    ];

    for (const milestone of milestones) {
      if (previousEXP < milestone.exp && currentEXP >= milestone.exp) {
        // Milestone reached! Award pack via event system
        this.emitTCGEvent('tcg-milestone-reached', {
          exp: milestone.exp,
          packType: milestone.packType,
          reward: milestone.reward,
          currentEXP: currentEXP,
          earnedBy: 'milestone'
        });
        
        console.log(`🎉 Milestone reached at ${milestone.exp} EXP! Awarding ${milestone.packType}`);
      }
    }
  }
  
  /**
   * Calculate bonus multiplier based on writing performance
   */
  private calculateBonusMultiplier(): number {
    let multiplier = 1.0;
    
    // Speed bonus (up to 1.5x for fast typing)
    const currentKPM = this.calculateCurrentKPM();
    if (currentKPM > 150) {
      multiplier += 0.5 * Math.min((currentKPM - 150) / 150, 1);
    }
    
    // Quality bonus (up to 1.3x for sustained writing)
    const qualityScore = this.calculateQualityScore();
    if (qualityScore > 0.7) {
      multiplier += 0.3 * Math.min((qualityScore - 0.7) / 0.3, 1);
    }
    
    // Session length bonus (up to 1.2x for long sessions)
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    if (sessionMinutes > 15) {
      multiplier += 0.2 * Math.min((sessionMinutes - 15) / 45, 1); // Max at 60 minutes
    }
    
    return Math.min(multiplier, 2.0); // Cap at 2x bonus
  }
  
  /**
   * Calculate current keystrokes per minute
   */
  private calculateCurrentKPM(): number {
    if (this.keystrokeTimestamps.length < 2) return 0;
    
    const timeSpanSeconds = (this.keystrokeTimestamps[this.keystrokeTimestamps.length - 1] - 
                            this.keystrokeTimestamps[0]) / 1000;
    
    return timeSpanSeconds > 0 ? (this.keystrokeTimestamps.length / timeSpanSeconds) * 60 : 0;
  }
  
  /**
   * Calculate writing quality score based on various factors
   */
  private calculateQualityScore(): number {
    const factors = [
      this.calculateConsistencyScore(), // Consistent typing rhythm
      this.calculateSpeedStabilityScore(), // Stable typing speed
      this.calculateEngagementScore() // Sustained engagement
    ];
    
    // Weighted average
    const weights = [0.4, 0.3, 0.3];
    return factors.reduce((sum, factor, index) => sum + factor * weights[index], 0);
  }
  
  /**
   * Calculate consistency score (0-1) based on typing rhythm
   */
  private calculateConsistencyScore(): number {
    if (this.keystrokeTimestamps.length < 5) return 0.5; // Default for short sequences
    
    const intervals: number[] = [];
    for (let i = 1; i < this.keystrokeTimestamps.length; i++) {
      intervals.push(this.keystrokeTimestamps[i] - this.keystrokeTimestamps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const coefficient = Math.sqrt(variance) / avgInterval; // Coefficient of variation
    
    // Lower coefficient = more consistent = higher score
    return Math.max(0, 1 - coefficient);
  }
  
  /**
   * Calculate speed stability score (0-1)
   */
  private calculateSpeedStabilityScore(): number {
    const currentKPM = this.calculateCurrentKPM();
    if (currentKPM === 0) return 0;
    
    // Compare current speed to peak speed
    const speedRatio = currentKPM / Math.max(this.peakKPM, currentKPM);
    
    // Reward sustained high speed
    return Math.min(speedRatio * 1.2, 1.0);
  }
  
  /**
   * Calculate engagement score based on session metrics
   */
  private calculateEngagementScore(): number {
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    const keystrokesPerMinute = this.sessionKeystrokes / Math.max(sessionMinutes, 1);
    
    // Normalize to 0-1 scale (100 KPM = 1.0)
    return Math.min(keystrokesPerMinute / 100, 1.0);
  }

  /**
   * Calculate focus score based on writing patterns and pauses
   */
  private calculateFocusScore(): number {
    if (this.keystrokeTimestamps.length < 10) return 0.5; // Default for insufficient data
    
    // Calculate burst vs pause ratio
    const totalBurstTime = this.burstSequences.reduce((sum, burst) => sum + burst.duration, 0);
    const totalPauseTime = this.pauseSequences.reduce((sum, pause) => sum + pause.duration, 0);
    const totalTime = totalBurstTime + totalPauseTime;
    
    if (totalTime === 0) return 0.5;
    
    // Focus is higher when bursts are longer relative to pauses
    const burstRatio = totalBurstTime / totalTime;
    
    // Consider average burst length (longer bursts indicate better focus)
    const avgBurstDuration = totalBurstTime / Math.max(this.burstSequences.length, 1);
    const burstLengthScore = Math.min(avgBurstDuration / 30000, 1.0); // 30 seconds = max score
    
    // Consider pause frequency (fewer interruptions = better focus)
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    const pausesPerMinute = this.pauseSequences.length / Math.max(sessionMinutes, 1);
    const pauseFrequencyScore = Math.max(0, 1 - (pausesPerMinute / 10)); // 10 pauses/min = 0 score
    
    // Weighted combination
    return (burstRatio * 0.4) + (burstLengthScore * 0.3) + (pauseFrequencyScore * 0.3);
  }

  /**
   * Analyze burst and pause patterns in typing
   */
  private analyzeBurstPausePatterns(currentTime: number): void {
    const PAUSE_THRESHOLD = 2000; // 2 seconds without typing = pause
    
    if (this.lastKeystrokeTime) {
      const timeSinceLastKeystroke = currentTime - this.lastKeystrokeTime;
      
      if (timeSinceLastKeystroke > PAUSE_THRESHOLD) {
        // We were in a pause, now starting a new burst
        if (this.pauseSequences.length > 0) {
          const lastPause = this.pauseSequences[this.pauseSequences.length - 1];
          if (!lastPause.end) {
            lastPause.end = this.lastKeystrokeTime;
            lastPause.duration = lastPause.end - lastPause.start;
          }
        }
        
        // Start a new burst
        this.burstSequences.push({
          start: currentTime,
          end: 0,
          duration: 0,
          keystrokes: 1
        });
      } else {
        // Continue existing burst
        if (this.burstSequences.length > 0) {
          const lastBurst = this.burstSequences[this.burstSequences.length - 1];
          lastBurst.end = currentTime;
          lastBurst.duration = currentTime - lastBurst.start;
          lastBurst.keystrokes++;
        }
      }
    } else {
      // First keystroke - start first burst
      this.burstSequences.push({
        start: currentTime,
        end: 0,
        duration: 0,
        keystrokes: 1
      });
    }
    
    this.lastKeystrokeTime = currentTime;
    
    // Clean up old sequences (keep only last 5 minutes)
    const fiveMinutesAgo = currentTime - (5 * 60 * 1000);
    this.burstSequences = this.burstSequences.filter(burst => burst.start > fiveMinutesAgo);
    this.pauseSequences = this.pauseSequences.filter(pause => pause.start > fiveMinutesAgo);
  }

  /**
   * Detect when a pause starts (called by inactivity timeout)
   */
  private startPause(): void {
    if (this.lastKeystrokeTime) {
      this.pauseSequences.push({
        start: this.lastKeystrokeTime,
        end: 0,
        duration: 0
      });
      
      // End current burst if exists
      if (this.burstSequences.length > 0) {
        const lastBurst = this.burstSequences[this.burstSequences.length - 1];
        if (!lastBurst.end) {
          lastBurst.end = this.lastKeystrokeTime;
          lastBurst.duration = lastBurst.end - lastBurst.start;
        }
      }
    }
  }
  
  /**
   * Handle note creation for bonus EXP
   */
  private handleNoteCreation(data: { fileName: string }): void {
    const bonusEXP = Math.floor(this.settings.keystrokesPerEXP * 0.5); // 50% of normal EXP threshold
    
    this.emitTCGEvent('tcg-note-created-bonus', {
      fileName: data.fileName,
      bonusEXP,
      sessionKeystrokes: this.sessionKeystrokes
    });
    
    console.log(`📝 TCG Note Creation Bonus: ${bonusEXP} EXP for ${data.fileName}`);
  }
  
  /**
   * Handle note modification events
   */
  private handleNoteModification(data: { fileName: string }): void {
    // Track significant note modifications
    this.emitTCGEvent('tcg-note-progress', {
      fileName: data.fileName,
      sessionKeystrokes: this.sessionKeystrokes,
      qualityScore: this.calculateQualityScore()
    });
  }
  
  /**
   * Get unique session identifier
   */
  private getSessionId(): string {
    return `tcg-session-${this.sessionStartTime}`;
  }
  
  /**
   * Get current session metrics
   */
  public getSessionMetrics(): TCGSessionMetrics {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const sessionMinutes = sessionDuration / 60000;
    
    return {
      sessionDuration,
      totalKeystrokes: this.totalKeystrokes,
      sessionKeystrokes: this.sessionKeystrokes,
      averageKPM: sessionMinutes > 0 ? this.sessionKeystrokes / sessionMinutes : 0,
      peakKPM: this.peakKPM,
      qualityScore: this.calculateQualityScore(),
      consistencyScore: this.calculateConsistencyScore(),
      focusScore: this.calculateFocusScore(),
      burstCount: this.burstSequences.length,
      pauseCount: this.pauseSequences.length,
      longestBurst: Math.max(...this.burstSequences.map(b => b.duration), 0),
      longestPause: Math.max(...this.pauseSequences.map(p => p.duration), 0),
      sessionStartTime: this.sessionStartTime,
      mostRecentActivity: this.lastKeystrokeTime || this.sessionStartTime
    };
  }
  
  /**
   * Get total keystroke count
   */
  public getTotalKeystrokes(): number {
    return this.totalKeystrokes;
  }
  
  /**
   * Get current EXP total
   */
  public getCurrentEXP(): number {
    return this.currentEXP;
  }
  
  /**
   * Get keystrokes until next EXP reward
   */
  public getKeystrokesToNextEXP(): number {
    const keystrokesSinceLastAward = this.totalKeystrokes - this.lastEXPAward;
    return this.settings.keystrokesPerEXP - (keystrokesSinceLastAward % this.settings.keystrokesPerEXP);
  }
  
  /**
   * Reset session metrics
   */
  public resetSession(): void {
    this.sessionKeystrokes = 0;
    this.sessionStartTime = Date.now();
    this.peakKPM = 0;
    this.keystrokeTimestamps = [];
    
    this.emitTCGEvent('tcg-session-reset', {
      previousSession: this.getSessionMetrics()
    });
    
    console.log('🔄 TCG session metrics reset');
  }
  
  /**
   * Force flush any pending keystrokes (useful for testing)
   */
  public async flush(): Promise<void> {
    await this.flushKeystrokes();
  }

  /**
   * Manually award EXP and trigger rewards (for testing)
   */
  public async testAwardEXP(amount: number = 1): Promise<void> {
    console.log(`🧪 TEST: Manually awarding ${amount} EXP`);
    await this.awardEXP(amount);
  }
  
  /**
   * Update settings (for real-time configuration changes)
   */
  public updateSettings(newSettings: TCGSettings): void {
    const oldSettings = this.settings;
    this.settings = newSettings;
    
    this.emitTCGEvent('tcg-settings-updated', {
      oldSettings: {
        keystrokesPerEXP: oldSettings.keystrokesPerEXP,
        expFormula: oldSettings.expFormula
      },
      newSettings: {
        keystrokesPerEXP: newSettings.keystrokesPerEXP,
        expFormula: newSettings.expFormula
      }
    });
    
    console.log('⚙️ TCG keystroke tracker settings updated');
  }
  
  /**
   * Set EXP and keystroke values (for loading saved progress)
   */
  public setProgress(totalKeystrokes: number, currentEXP: number): void {
    this.totalKeystrokes = totalKeystrokes;
    this.currentEXP = currentEXP;
    this.lastEXPAward = totalKeystrokes - (totalKeystrokes % this.settings.keystrokesPerEXP);
    
    console.log(`💾 TCG progress loaded: ${totalKeystrokes} keystrokes, ${currentEXP} EXP`);
  }
  
  /**
   * Add event listener
   */
  public onEvent(eventType: string, handler: (data: any) => void): void {
    if (!this.tcgEventHandlers.has(eventType)) {
      this.tcgEventHandlers.set(eventType, []);
    }
    this.tcgEventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit TCG event using both internal handlers and activity tracker
   */
  private emitTCGEvent(eventType: string, data?: any): void {
    // Emit to internal handlers first
    const handlers = this.tcgEventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in TCG event handler for ${eventType}:`, error);
        }
      });
    }
    
    // Then emit to existing system
    try {
      // Add common metadata to all events
      const enrichedData = {
        ...data,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        metrics: this.getSessionMetrics()
      };
      
      // Use existing activity tracker event system
      if (this.activityTracker && typeof (this.activityTracker as any).emitActivityEvent === 'function') {
        (this.activityTracker as any).emitActivityEvent(eventType, enrichedData);
      }
    } catch (error) {
      console.error(`Error emitting TCG event ${eventType}:`, error);
    }
  }
  
  /**
   * Cleanup and destroy tracker
   * CRITICAL: Must clean up all event listeners to prevent memory leaks
   */
  public destroy(): void {
    // Clear any pending timeouts
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Flush any remaining keystrokes
    this.flushKeystrokes();
    
    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    // Clear buffers
    this.keystrokeBuffer = [];
    this.keystrokeTimestamps = [];
    
    console.log('🧹 TCG Keystroke Tracker destroyed');
  }
}