/**
 * CLIPPY TCG Writer - Game History Manager
 * Comprehensive logging system for all game events, states, and player activities
 * Provides searchable history, statistics, and audit trail for debugging
 */

import { 
  GameHistoryEntry, 
  GameHistoryEventType, 
  GameHistorySeverity, 
  GameHistoryQuery, 
  GameHistoryStats,
  GameWorldState,
  GameEvent,
  TCGSessionMetrics
} from '../types';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== HISTORY ENTRY BUILDERS =====

/**
 * Builder functions for creating standardized history entries
 */
export class GameHistoryBuilders {
  /**
   * Create world state change entry
   */
  static worldStateChange(
    sessionId: string,
    oldState: GameWorldState | null,
    newState: GameWorldState,
    trigger: string
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'world_state_change',
      severity: 'info',
      title: `World State Changed (${trigger})`,
      description: `Location: ${newState.location} | Weather: ${newState.weather} | Threat: ${newState.threatLevel}`,
      data: {
        trigger,
        oldLocation: oldState?.location,
        newLocation: newState.location,
        oldWeather: oldState?.weather,
        newWeather: newState.weather,
        oldThreatLevel: oldState?.threatLevel,
        newThreatLevel: newState.threatLevel,
        ambiance: newState.ambiance,
        activeEvents: newState.activeEvents.map(e => e.eventType)
      },
      sessionId,
      worldStateId: newState.stateId,
      source: 'GameWorldManager',
      tags: ['world', 'environment', trigger]
    };
  }

  /**
   * Create player level up entry
   */
  static playerLevelUp(
    sessionId: string,
    playerId: string,
    oldLevel: number,
    newLevel: number,
    totalEXP: number
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'player_level_up',
      severity: 'info',
      title: `Level Up! ${oldLevel} → ${newLevel}`,
      description: `Player reached level ${newLevel} with ${totalEXP} total EXP`,
      data: {
        oldLevel,
        newLevel,
        totalEXP,
        levelGain: newLevel - oldLevel
      },
      sessionId,
      playerId,
      source: 'PlayerManager',
      tags: ['player', 'progression', 'level']
    };
  }

  /**
   * Create pack earned entry
   */
  static packEarned(
    sessionId: string,
    playerId: string,
    packType: string,
    earnedBy: string,
    keystrokeCount?: number
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'pack_earned',
      severity: 'info',
      title: `Pack Earned: ${packType}`,
      description: `${packType} pack earned through ${earnedBy}`,
      data: {
        packType,
        earnedBy,
        keystrokeCount
      },
      sessionId,
      playerId,
      source: 'TCGKeystrokeTracker',
      tags: ['pack', 'reward', earnedBy]
    };
  }

  /**
   * Create game event triggered entry
   */
  static gameEventTriggered(
    sessionId: string,
    worldStateId: string,
    gameEvent: GameEvent
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'game_event_triggered',
      severity: gameEvent.severity === 'critical' ? 'warning' : 'info',
      title: `Game Event: ${gameEvent.eventType}`,
      description: gameEvent.description,
      data: {
        eventType: gameEvent.eventType,
        eventSeverity: gameEvent.severity,
        location: gameEvent.location,
        weather: gameEvent.weather,
        conditions: gameEvent.conditions,
        playerEffects: gameEvent.playerEffects,
        probability: gameEvent.probability
      },
      sessionId,
      worldStateId,
      source: 'GameWorldManager',
      tags: ['event', gameEvent.eventType, gameEvent.severity]
    };
  }

  /**
   * Create commentary generated entry
   */
  static commentaryGenerated(
    sessionId: string,
    commentaryType: string,
    text: string,
    urgency: string,
    confidence: number
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'commentary_generated',
      severity: 'info',
      title: `Commentary: ${commentaryType}`,
      description: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      data: {
        commentaryType,
        fullText: text,
        urgency,
        confidence,
        textLength: text.length
      },
      sessionId,
      source: 'AICommentarySystem',
      tags: ['commentary', commentaryType, urgency]
    };
  }

  /**
   * Create keystroke milestone entry
   */
  static keystrokeMilestone(
    sessionId: string,
    totalKeystrokes: number,
    sessionMetrics: TCGSessionMetrics,
    milestone: string
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'keystroke_milestone',
      severity: 'info',
      title: `Keystroke Milestone: ${milestone}`,
      description: `Reached ${totalKeystrokes} total keystrokes`,
      data: {
        totalKeystrokes,
        milestone,
        sessionDuration: sessionMetrics.sessionDuration,
        averageKPM: sessionMetrics.averageKPM,
        peakKPM: sessionMetrics.peakKPM,
        qualityScore: sessionMetrics.qualityScore
      },
      sessionId,
      source: 'TCGKeystrokeTracker',
      tags: ['keystroke', 'milestone', 'performance']
    };
  }

  /**
   * Create system error entry
   */
  static systemError(
    sessionId: string,
    error: Error,
    source: string,
    context?: Record<string, any>
  ): Partial<GameHistoryEntry> {
    return {
      eventType: 'system_error',
      severity: 'error',
      title: `System Error in ${source}`,
      description: error.message,
      data: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context
      },
      sessionId,
      source,
      tags: ['error', 'system', source.toLowerCase()]
    };
  }
}

// ===== MAIN HISTORY MANAGER =====

/**
 * Comprehensive game history management system
 */
export class GameHistoryManager {
  private entries: GameHistoryEntry[] = [];
  private currentSessionId: string;
  private maxEntries: number;
  private autoCleanupDays: number;

  // Performance tracking
  private entryCount = 0;
  private lastCleanup = Date.now();

  // Event listeners
  private eventHandlers: Map<string, ((entry: GameHistoryEntry) => void)[]> = new Map();

  constructor(
    sessionId: string,
    maxEntries = 10000,
    autoCleanupDays = 30
  ) {
    this.currentSessionId = sessionId;
    this.maxEntries = maxEntries;
    this.autoCleanupDays = autoCleanupDays;
    
    console.log(`📚 Game History Manager initialized (session: ${sessionId.substring(0, 8)})`);
    
    // Log system startup
    this.addEntry({
      eventType: 'session_started',
      severity: 'info',
      title: 'Game Session Started',
      description: 'TCG system initialized and history logging started',
      data: { sessionId, maxEntries, autoCleanupDays },
      source: 'GameHistoryManager',
      tags: ['session', 'startup']
    });
  }

  // ===== ENTRY MANAGEMENT =====

  /**
   * Add new history entry
   */
  addEntry(partialEntry: Partial<GameHistoryEntry>): GameHistoryEntry {
    return ClippyErrorBoundaries.catchAndReturn(
      () => {
        const entry: GameHistoryEntry = {
          id: this.generateEntryId(),
          timestamp: new Date(),
          sessionId: this.currentSessionId,
          tags: [],
          data: {},
          ...partialEntry
        } as GameHistoryEntry;

        // Validate required fields
        if (!entry.eventType || !entry.severity || !entry.title || !entry.source) {
          throw new Error('Missing required fields for history entry');
        }

        this.entries.push(entry);
        this.entryCount++;

        console.log(`📚 History logged: ${entry.eventType} - ${entry.title}`);

        // Emit event to listeners
        this.emitEvent('entry-added', entry);

        // Auto-cleanup if needed
        this.performMaintenanceIfNeeded();

        return entry;
      },
      (error) => {
        console.error('Failed to add history entry:', error);
        return this.createErrorEntry(error, 'GameHistoryManager');
      }
    );
  }

  /**
   * Quick logging methods using builders
   */
  logWorldStateChange(oldState: GameWorldState | null, newState: GameWorldState, trigger: string): GameHistoryEntry {
    const partial = GameHistoryBuilders.worldStateChange(this.currentSessionId, oldState, newState, trigger);
    return this.addEntry(partial);
  }

  logPlayerLevelUp(playerId: string, oldLevel: number, newLevel: number, totalEXP: number): GameHistoryEntry {
    const partial = GameHistoryBuilders.playerLevelUp(this.currentSessionId, playerId, oldLevel, newLevel, totalEXP);
    return this.addEntry(partial);
  }

  logPackEarned(playerId: string, packType: string, earnedBy: string, keystrokeCount?: number): GameHistoryEntry {
    const partial = GameHistoryBuilders.packEarned(this.currentSessionId, playerId, packType, earnedBy, keystrokeCount);
    return this.addEntry(partial);
  }

  logGameEvent(worldStateId: string, gameEvent: GameEvent): GameHistoryEntry {
    const partial = GameHistoryBuilders.gameEventTriggered(this.currentSessionId, worldStateId, gameEvent);
    return this.addEntry(partial);
  }

  logCommentary(commentaryType: string, text: string, urgency: string, confidence: number): GameHistoryEntry {
    const partial = GameHistoryBuilders.commentaryGenerated(this.currentSessionId, commentaryType, text, urgency, confidence);
    return this.addEntry(partial);
  }

  logKeystrokeMilestone(totalKeystrokes: number, sessionMetrics: TCGSessionMetrics, milestone: string): GameHistoryEntry {
    const partial = GameHistoryBuilders.keystrokeMilestone(this.currentSessionId, totalKeystrokes, sessionMetrics, milestone);
    return this.addEntry(partial);
  }

  logSystemError(error: Error, source: string, context?: Record<string, any>): GameHistoryEntry {
    const partial = GameHistoryBuilders.systemError(this.currentSessionId, error, source, context);
    return this.addEntry(partial);
  }

  // ===== QUERY INTERFACE =====

  /**
   * Query history entries with filters
   */
  queryEntries(query: GameHistoryQuery = {}): GameHistoryEntry[] {
    let results = [...this.entries];

    // Apply filters
    if (query.startDate) {
      results = results.filter(entry => entry.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(entry => entry.timestamp <= query.endDate!);
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      results = results.filter(entry => query.eventTypes!.includes(entry.eventType));
    }

    if (query.severity && query.severity.length > 0) {
      results = results.filter(entry => query.severity!.includes(entry.severity));
    }

    if (query.source && query.source.length > 0) {
      results = results.filter(entry => query.source!.includes(entry.source));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry => 
        query.tags!.some(tag => entry.tags.includes(tag))
      );
    }

    if (query.sessionId) {
      results = results.filter(entry => entry.sessionId === query.sessionId);
    }

    if (query.playerId) {
      results = results.filter(entry => entry.playerId === query.playerId);
    }

    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      results = results.filter(entry => 
        entry.title.toLowerCase().includes(searchLower) ||
        entry.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    results.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'timestamp':
          aVal = a.timestamp.getTime();
          bVal = b.timestamp.getTime();
          break;
        case 'severity':
          const severityOrder = { 'critical': 4, 'error': 3, 'warning': 2, 'info': 1 };
          aVal = severityOrder[a.severity];
          bVal = severityOrder[b.severity];
          break;
        case 'eventType':
          aVal = a.eventType;
          bVal = b.eventType;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Apply pagination
    if (query.offset || query.limit) {
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Get recent entries (last N entries)
   */
  getRecentEntries(count = 50): GameHistoryEntry[] {
    return this.entries.slice(-count).reverse();
  }

  /**
   * Get entries for current session
   */
  getCurrentSessionEntries(): GameHistoryEntry[] {
    return this.queryEntries({ sessionId: this.currentSessionId });
  }

  /**
   * Get entries by event type
   */
  getEntriesByType(eventType: GameHistoryEventType): GameHistoryEntry[] {
    return this.queryEntries({ eventTypes: [eventType] });
  }

  /**
   * Get error entries
   */
  getErrorEntries(): GameHistoryEntry[] {
    return this.queryEntries({ severity: ['error', 'critical'] });
  }

  // ===== STATISTICS =====

  /**
   * Generate comprehensive statistics
   */
  getStatistics(): GameHistoryStats {
    const entriesByType: Record<GameHistoryEventType, number> = {} as any;
    const entriesBySeverity: Record<GameHistorySeverity, number> = {} as any;
    const entriesBySource: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    const hourlyActivity: Record<string, number> = {};
    const sessionCounts: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    // Initialize counters
    const eventTypes: GameHistoryEventType[] = [
      'world_state_change', 'player_level_up', 'pack_earned', 'pack_opened',
      'card_generated', 'achievement_unlocked', 'commentary_generated',
      'game_event_triggered', 'player_effect_applied', 'keystroke_milestone',
      'session_started', 'session_ended', 'timer_update', 'system_error', 'user_command'
    ];

    eventTypes.forEach(type => entriesByType[type] = 0);
    ['info', 'warning', 'error', 'critical'].forEach(severity => 
      entriesBySeverity[severity as GameHistorySeverity] = 0
    );

    // Process entries
    this.entries.forEach(entry => {
      // Count by type
      entriesByType[entry.eventType]++;

      // Count by severity
      entriesBySeverity[entry.severity]++;

      // Count by source
      entriesBySource[entry.source] = (entriesBySource[entry.source] || 0) + 1;

      // Daily activity
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;

      // Hourly activity
      const hourKey = entry.timestamp.getHours().toString();
      hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1;

      // Session counting
      sessionCounts[entry.sessionId] = (sessionCounts[entry.sessionId] || 0) + 1;

      // Error tracking
      if (entry.severity === 'error' || entry.severity === 'critical') {
        const errorKey = entry.title;
        errorMessages[errorKey] = (errorMessages[errorKey] || 0) + 1;
      }
    });

    const totalEntries = this.entries.length;
    const errorCount = entriesBySeverity.error + entriesBySeverity.critical;
    const recentSessions = Object.keys(sessionCounts).slice(-10);
    const mostActiveSource = Object.entries(entriesBySource)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

    const averageEntriesPerSession = totalEntries > 0 ? 
      totalEntries / Object.keys(sessionCounts).length : 0;

    const commonErrors = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return {
      totalEntries,
      entriesByType,
      entriesBySeverity,
      entriesBySource,
      dailyActivity,
      hourlyActivity,
      recentSessions,
      mostActiveSource,
      averageEntriesPerSession: Math.round(averageEntriesPerSession * 100) / 100,
      errorRate: totalEntries > 0 ? Math.round((errorCount / totalEntries) * 10000) / 100 : 0,
      commonErrors
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error entry for internal errors
   */
  private createErrorEntry(error: Error, source: string): GameHistoryEntry {
    return {
      id: this.generateEntryId(),
      timestamp: new Date(),
      eventType: 'system_error',
      severity: 'critical',
      title: `Internal Error in ${source}`,
      description: error.message,
      data: { errorName: error.name, errorMessage: error.message },
      sessionId: this.currentSessionId,
      source,
      tags: ['internal-error', source.toLowerCase()]
    };
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenanceIfNeeded(): void {
    const now = Date.now();
    
    // Run cleanup every hour
    if (now - this.lastCleanup > 3600000) { // 1 hour
      this.performMaintenance();
      this.lastCleanup = now;
    }
  }

  /**
   * Cleanup old entries and optimize storage
   */
  private performMaintenance(): void {
    const startCount = this.entries.length;
    
    // Remove entries older than autoCleanupDays
    const cutoffDate = new Date(Date.now() - (this.autoCleanupDays * 24 * 60 * 60 * 1000));
    this.entries = this.entries.filter(entry => entry.timestamp > cutoffDate);
    
    // Enforce max entries limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    
    const endCount = this.entries.length;
    const removed = startCount - endCount;
    
    if (removed > 0) {
      console.log(`🧹 History cleanup: removed ${removed} old entries`);
      this.addEntry({
        eventType: 'system_error', // Using as maintenance event
        severity: 'info',
        title: 'History Maintenance',
        description: `Cleaned up ${removed} old entries`,
        data: { entriesRemoved: removed, totalEntries: endCount },
        source: 'GameHistoryManager',
        tags: ['maintenance', 'cleanup']
      });
    }
  }

  /**
   * Get total entry count
   */
  getTotalEntries(): number {
    return this.entries.length;
  }

  /**
   * Update current session ID
   */
  updateSessionId(newSessionId: string): void {
    this.currentSessionId = newSessionId;
    this.addEntry({
      eventType: 'session_started',
      severity: 'info',
      title: 'Session Updated',
      description: `Session ID changed to ${newSessionId.substring(0, 8)}`,
      data: { newSessionId },
      source: 'GameHistoryManager',
      tags: ['session', 'update']
    });
  }

  /**
   * Add event listener
   */
  onEvent(eventType: string, handler: (entry: GameHistoryEntry) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in history event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Export history data
   */
  exportHistory(query: GameHistoryQuery = {}): any {
    const entries = this.queryEntries(query);
    const stats = this.getStatistics();
    
    return {
      exportedAt: new Date(),
      query,
      totalEntries: entries.length,
      entries,
      statistics: stats
    };
  }

  /**
   * Clear all history (use with caution)
   */
  clearHistory(): void {
    const oldCount = this.entries.length;
    this.entries = [];
    this.entryCount = 0;
    
    console.log(`🧹 History cleared: ${oldCount} entries removed`);
    
    // Log the clear operation
    this.addEntry({
      eventType: 'user_command',
      severity: 'warning',
      title: 'History Cleared',
      description: `All history entries cleared (${oldCount} entries removed)`,
      data: { entriesRemoved: oldCount },
      source: 'GameHistoryManager',
      tags: ['clear', 'user-action']
    });
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.addEntry({
      eventType: 'session_ended',
      severity: 'info',
      title: 'Game Session Ended',
      description: 'History manager shutting down',
      data: { totalEntries: this.entries.length },
      source: 'GameHistoryManager',
      tags: ['session', 'shutdown']
    });

    this.eventHandlers.clear();
    console.log('📚 Game History Manager destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create a quick history entry
 */
export function createQuickHistoryEntry(
  eventType: GameHistoryEventType,
  title: string,
  description: string,
  source: string,
  data: Record<string, any> = {},
  severity: GameHistorySeverity = 'info'
): Partial<GameHistoryEntry> {
  return {
    eventType,
    severity,
    title,
    description,
    data,
    source,
    tags: [eventType.replace('_', '-'), source.toLowerCase()]
  };
}