import { EventEmitter } from 'events';
import { ClippyErrorBoundaries } from '../error-boundaries';
import type { 
    ClippySettings, 
    ConversationTurn, 
    ConversationContext, 
    VaultContext 
} from '../types';

/**
 * Conversation memory levels for different retention strategies
 */
export enum ConversationMemoryLevel {
    SESSION = 'session',      // Current session only
    SHORT_TERM = 'short_term', // Last few hours
    LONG_TERM = 'long_term',   // Persistent across restarts
    CONTEXTUAL = 'contextual'  // Context-aware based on current vault state
}

/**
 * Conversation summary for efficient memory management
 */
export interface ConversationSummary {
    id: string;
    sessionId: string;
    startTime: number;
    endTime: number;
    turnCount: number;
    topics: string[];
    summary: string;
    keyDecisions: string[];
    vaultContext: VaultContext;
}

/**
 * Active conversation session data
 */
export interface ConversationSession {
    id: string;
    startTime: number;
    turns: ConversationTurn[];
    context: ConversationContext;
    summary?: ConversationSummary;
    isActive: boolean;
}

/**
 * Conversation Manager Events
 */
export interface ConversationManagerEvents {
    'conversation-started': (session: ConversationSession) => void;
    'conversation-ended': (session: ConversationSession) => void;
    'turn-added': (turn: ConversationTurn, session: ConversationSession) => void;
    'context-updated': (context: ConversationContext) => void;
    'memory-cleanup': (removedCount: number) => void;
    'error': (error: Error) => void;
}

/**
 * Manages conversation history, context, and memory for voice interactions
 */
export class ConversationManager extends EventEmitter {
    private settings: ClippySettings;
    private currentSession: ConversationSession | null = null;
    private conversationHistory: ConversationSession[] = [];
    private conversationSummaries: ConversationSummary[] = [];
    private memoryCleanupInterval: number | null = null;
    private contextExtractionCache: Map<string, VaultContext> = new Map();
    
    // Configuration constants
    private readonly MAX_MEMORY_TURNS = 100;
    private readonly MAX_SESSION_TURNS = 50;
    private readonly MEMORY_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
    private readonly SHORT_TERM_RETENTION = 24 * 60 * 60 * 1000; // 24 hours
    private readonly LONG_TERM_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days

    constructor(settings: ClippySettings) {
        super();
        this.settings = settings;
        this.startMemoryCleanup();
    }

    /**
     * Start a new conversation session
     */
    async startConversation(context: ConversationContext): Promise<ConversationSession> {
        try {
            // End current session if active
            if (this.currentSession && this.currentSession.isActive) {
                await this.endConversation();
            }

            // Create new session
            const session: ConversationSession = {
                id: this.generateSessionId(),
                startTime: Date.now(),
                turns: [],
                context: { ...context },
                isActive: true
            };

            this.currentSession = session;
            this.conversationHistory.push(session);

            console.log(`Started conversation session: ${session.id}`);
            this.emit('conversation-started', session);

            return session;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.startConversation');
            throw error;
        }
    }

    /**
     * End the current conversation session
     */
    async endConversation(): Promise<ConversationSession | null> {
        if (!this.currentSession || !this.currentSession.isActive) {
            return null;
        }

        try {
            const session = this.currentSession;
            session.isActive = false;

            // Generate conversation summary if it has enough content
            if (session.turns.length >= 3) {
                session.summary = await this.generateConversationSummary(session);
                this.conversationSummaries.push(session.summary);
            }

            console.log(`Ended conversation session: ${session.id} with ${session.turns.length} turns`);
            this.emit('conversation-ended', session);

            this.currentSession = null;
            return session;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.endConversation');
            throw error;
        }
    }

    /**
     * Add a conversation turn to the current session
     */
    async addTurn(turn: ConversationTurn): Promise<void> {
        if (!this.currentSession || !this.currentSession.isActive) {
            throw new Error('No active conversation session');
        }

        try {
            // Add timestamp if not provided
            if (!turn.timestamp) {
                turn.timestamp = Date.now();
            }

            // Add session ID if not provided
            if (!turn.sessionId) {
                turn.sessionId = this.currentSession.id;
            }

            this.currentSession.turns.push(turn);

            // Update conversation context based on turn
            await this.updateContextFromTurn(turn);

            // Trim session if it gets too long
            if (this.currentSession.turns.length > this.MAX_SESSION_TURNS) {
                const removedTurn = this.currentSession.turns.shift();
                console.log(`Trimmed conversation turn from session ${this.currentSession.id}`);
            }

            console.log(`Added turn to session ${this.currentSession.id}: ${turn.userInput}`);
            this.emit('turn-added', turn, this.currentSession);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.addTurn');
            throw error;
        }
    }

    /**
     * Get conversation history for context
     */
    getConversationHistory(
        memoryLevel: ConversationMemoryLevel = ConversationMemoryLevel.SESSION,
        limit: number = 10
    ): ConversationTurn[] {
        try {
            let turns: ConversationTurn[] = [];

            switch (memoryLevel) {
                case ConversationMemoryLevel.SESSION:
                    if (this.currentSession) {
                        turns = this.currentSession.turns.slice(-limit);
                    }
                    break;

                case ConversationMemoryLevel.SHORT_TERM:
                    const shortTermCutoff = Date.now() - this.SHORT_TERM_RETENTION;
                    turns = this.getAllTurns()
                        .filter(turn => turn.timestamp >= shortTermCutoff)
                        .slice(-limit);
                    break;

                case ConversationMemoryLevel.LONG_TERM:
                    const longTermCutoff = Date.now() - this.LONG_TERM_RETENTION;
                    turns = this.getAllTurns()
                        .filter(turn => turn.timestamp >= longTermCutoff)
                        .slice(-limit);
                    break;

                case ConversationMemoryLevel.CONTEXTUAL:
                    turns = this.getContextualHistory(limit);
                    break;
            }

            return turns;
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.getConversationHistory');
            return [];
        }
    }

    /**
     * Get current conversation context
     */
    getCurrentContext(): ConversationContext | null {
        return this.currentSession?.context || null;
    }

    /**
     * Update conversation context
     */
    async updateContext(updates: Partial<ConversationContext>): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        try {
            this.currentSession.context = {
                ...this.currentSession.context,
                ...updates
            };

            console.log(`Updated conversation context for session ${this.currentSession.id}`);
            this.emit('context-updated', this.currentSession.context);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.updateContext');
        }
    }

    /**
     * Search conversation history by query
     */
    searchHistory(query: string, limit: number = 10): ConversationTurn[] {
        try {
            const lowerQuery = query.toLowerCase();
            const allTurns = this.getAllTurns();
            
            const matchingTurns = allTurns.filter(turn => 
                turn.userInput.toLowerCase().includes(lowerQuery) ||
                (turn.assistantResponse && turn.assistantResponse.toLowerCase().includes(lowerQuery))
            );

            return matchingTurns.slice(-limit);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.searchHistory');
            return [];
        }
    }

    /**
     * Get conversation statistics
     */
    getConversationStats(): {
        currentSessionTurns: number;
        totalSessions: number;
        totalTurns: number;
        averageTurnsPerSession: number;
        activeSince: number | null;
        memoryUsage: {
            sessions: number;
            summaries: number;
            cacheEntries: number;
        }
    } {
        const allTurns = this.getAllTurns();
        const activeSessions = this.conversationHistory.filter(s => s.isActive);

        return {
            currentSessionTurns: this.currentSession?.turns.length || 0,
            totalSessions: this.conversationHistory.length,
            totalTurns: allTurns.length,
            averageTurnsPerSession: this.conversationHistory.length > 0 
                ? allTurns.length / this.conversationHistory.length 
                : 0,
            activeSince: this.currentSession?.startTime || null,
            memoryUsage: {
                sessions: this.conversationHistory.length,
                summaries: this.conversationSummaries.length,
                cacheEntries: this.contextExtractionCache.size
            }
        };
    }

    /**
     * Export conversation data for backup or analysis
     */
    exportConversations(): {
        sessions: ConversationSession[];
        summaries: ConversationSummary[];
        exportedAt: number;
    } {
        return {
            sessions: this.conversationHistory.map(s => ({ ...s })),
            summaries: this.conversationSummaries.map(s => ({ ...s })),
            exportedAt: Date.now()
        };
    }

    /**
     * Import conversation data from backup
     */
    async importConversations(data: {
        sessions: ConversationSession[];
        summaries: ConversationSummary[];
    }): Promise<void> {
        try {
            // Validate and merge sessions
            const validSessions = data.sessions.filter(this.validateSession.bind(this));
            this.conversationHistory.push(...validSessions);

            // Validate and merge summaries
            const validSummaries = data.summaries.filter(this.validateSummary.bind(this));
            this.conversationSummaries.push(...validSummaries);

            // Clean up duplicates and old data
            await this.performMemoryCleanup();

            console.log(`Imported ${validSessions.length} sessions and ${validSummaries.length} summaries`);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.importConversations');
            throw error;
        }
    }

    /**
     * Update settings and apply changes
     */
    async updateSettings(newSettings: ClippySettings): Promise<void> {
        this.settings = newSettings;
        
        // Apply any setting-dependent changes
        if (this.currentSession) {
            this.currentSession.context.continuousMode = newSettings.voice.continuousMode;
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        try {
            // End current conversation
            if (this.currentSession?.isActive) {
                await this.endConversation();
            }

            // Stop memory cleanup
            this.stopMemoryCleanup();

            // Clear caches
            this.contextExtractionCache.clear();

            // Remove all listeners
            this.removeAllListeners();

            console.log('Conversation Manager cleaned up');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.cleanup');
        }
    }

    /**
     * Get all conversation turns across all sessions
     */
    private getAllTurns(): ConversationTurn[] {
        return this.conversationHistory.flatMap(session => session.turns);
    }

    /**
     * Get contextually relevant conversation history
     */
    private getContextualHistory(limit: number): ConversationTurn[] {
        // This would ideally use AI to determine relevance
        // For now, return recent turns from current session and similar topics
        let contextualTurns: ConversationTurn[] = [];

        // Add current session turns
        if (this.currentSession) {
            contextualTurns.push(...this.currentSession.turns);
        }

        // Add recent turns from other sessions
        const recentTurns = this.getAllTurns()
            .filter(turn => turn.sessionId !== this.currentSession?.id)
            .slice(-limit);

        contextualTurns.push(...recentTurns);
        return contextualTurns.slice(-limit);
    }

    /**
     * Update conversation context based on a turn
     */
    private async updateContextFromTurn(turn: ConversationTurn): Promise<void> {
        if (!this.currentSession) return;

        try {
            // Extract topics and entities from the turn
            const topics = this.extractTopics(turn.userInput);
            const entities = this.extractEntities(turn.userInput);

            // Update context with extracted information
            const updates: Partial<ConversationContext> = {
                lastInteraction: turn.timestamp,
                topics: [...(this.currentSession.context.topics || []), ...topics],
                entities: [...(this.currentSession.context.entities || []), ...entities]
            };

            // Deduplicate topics and entities
            updates.topics = [...new Set(updates.topics)];
            updates.entities = [...new Set(updates.entities)];

            await this.updateContext(updates);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.updateContextFromTurn');
        }
    }

    /**
     * Extract topics from text (simple keyword-based approach)
     */
    private extractTopics(text: string): string[] {
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));

        return [...new Set(words)].slice(0, 5); // Return top 5 unique topics
    }

    /**
     * Extract entities from text (simple pattern-based approach)
     */
    private extractEntities(text: string): string[] {
        const entities: string[] = [];
        
        // Extract file references (e.g., "file.md", "folder/file.txt")
        const fileMatches = text.match(/\b[\w\-\.]+\.(md|txt|pdf|jpg|png|gif)\b/gi);
        if (fileMatches) {
            entities.push(...fileMatches);
        }

        // Extract dates (simple patterns)
        const dateMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g);
        if (dateMatches) {
            entities.push(...dateMatches);
        }

        return entities;
    }

    /**
     * Generate a summary for a completed conversation session
     */
    private async generateConversationSummary(session: ConversationSession): Promise<ConversationSummary> {
        try {
            // Extract key information from the session
            const topics = [...new Set(session.turns.flatMap(turn => this.extractTopics(turn.userInput)))];
            const keyDecisions = session.turns
                .filter(turn => turn.userInput.toLowerCase().includes('decide') || 
                              turn.userInput.toLowerCase().includes('choose') ||
                              turn.assistantResponse?.toLowerCase().includes('recommend'))
                .map(turn => turn.userInput);

            // Create a simple summary (in a real implementation, this might use AI)
            const turnCount = session.turns.length;
            const duration = (Date.now() - session.startTime) / 1000 / 60; // minutes
            const summary = `Conversation with ${turnCount} turns over ${Math.round(duration)} minutes. ` +
                           `Discussed: ${topics.slice(0, 3).join(', ')}.`;

            return {
                id: `summary_${session.id}`,
                sessionId: session.id,
                startTime: session.startTime,
                endTime: Date.now(),
                turnCount,
                topics,
                summary,
                keyDecisions,
                vaultContext: session.context.vaultContext || {
                    currentFile: '',
                    openFiles: [],
                    recentFiles: [],
                    workspaceLayout: 'default'
                }
            };
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.generateConversationSummary');
            throw error;
        }
    }

    /**
     * Start periodic memory cleanup
     */
    private startMemoryCleanup(): void {
        this.memoryCleanupInterval = window.setInterval(() => {
            this.performMemoryCleanup();
        }, this.MEMORY_CLEANUP_INTERVAL);
    }

    /**
     * Stop memory cleanup interval
     */
    private stopMemoryCleanup(): void {
        if (this.memoryCleanupInterval) {
            clearInterval(this.memoryCleanupInterval);
            this.memoryCleanupInterval = null;
        }
    }

    /**
     * Perform memory cleanup to prevent excessive memory usage
     */
    private async performMemoryCleanup(): Promise<void> {
        try {
            let removedCount = 0;
            const now = Date.now();

            // Remove old completed sessions beyond retention period
            const longTermCutoff = now - this.LONG_TERM_RETENTION;
            this.conversationHistory = this.conversationHistory.filter(session => {
                if (!session.isActive && session.startTime < longTermCutoff) {
                    removedCount++;
                    return false;
                }
                return true;
            });

            // Remove old summaries
            this.conversationSummaries = this.conversationSummaries.filter(summary => {
                if (summary.endTime < longTermCutoff) {
                    removedCount++;
                    return false;
                }
                return true;
            });

            // Limit total memory usage
            if (this.getAllTurns().length > this.MAX_MEMORY_TURNS) {
                const excess = this.getAllTurns().length - this.MAX_MEMORY_TURNS;
                const oldestSessions = this.conversationHistory
                    .filter(s => !s.isActive)
                    .sort((a, b) => a.startTime - b.startTime)
                    .slice(0, Math.ceil(excess / 10));

                oldestSessions.forEach(session => {
                    const index = this.conversationHistory.indexOf(session);
                    if (index > -1) {
                        this.conversationHistory.splice(index, 1);
                        removedCount++;
                    }
                });
            }

            // Clear context extraction cache periodically
            if (this.contextExtractionCache.size > 100) {
                this.contextExtractionCache.clear();
            }

            if (removedCount > 0) {
                console.log(`Memory cleanup removed ${removedCount} items`);
                this.emit('memory-cleanup', removedCount);
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ConversationManager.performMemoryCleanup');
        }
    }

    /**
     * Validate conversation session structure
     */
    private validateSession(session: any): session is ConversationSession {
        return session &&
               typeof session.id === 'string' &&
               typeof session.startTime === 'number' &&
               Array.isArray(session.turns) &&
               typeof session.isActive === 'boolean';
    }

    /**
     * Validate conversation summary structure
     */
    private validateSummary(summary: any): summary is ConversationSummary {
        return summary &&
               typeof summary.id === 'string' &&
               typeof summary.sessionId === 'string' &&
               typeof summary.startTime === 'number' &&
               typeof summary.endTime === 'number' &&
               typeof summary.turnCount === 'number';
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}