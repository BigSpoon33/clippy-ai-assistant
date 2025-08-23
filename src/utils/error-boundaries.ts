import { Notice } from 'obsidian';

/**
 * Error types for categorization
 */
export enum ErrorType {
    VOICE_INITIALIZATION = 'voice_initialization',
    VOICE_PROCESSING = 'voice_processing',
    AUDIO_CAPTURE = 'audio_capture',
    SPEECH_RECOGNITION = 'speech_recognition',
    TEXT_TO_SPEECH = 'text_to_speech',
    WAKE_WORD_DETECTION = 'wake_word_detection',
    AI_PROVIDER = 'ai_provider',
    KNOWLEDGE_GRAPH = 'knowledge_graph',
    FILE_OPERATIONS = 'file_operations',
    SETTINGS = 'settings',
    NETWORK = 'network',
    PERMISSIONS = 'permissions',
    UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    LOW = 'low',       // Non-critical, doesn't affect core functionality
    MEDIUM = 'medium', // Affects some features but plugin remains usable
    HIGH = 'high',     // Affects core functionality
    CRITICAL = 'critical' // Plugin unusable
}

/**
 * Error information interface
 */
export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    context?: string;
    timestamp: number;
    stack?: string;
    userAction?: string;
    recoveryAction?: string;
}

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
    showUserNotifications: boolean;
    logToConsole: boolean;
    maxErrorHistory: number;
    retryAttempts: number;
}

/**
 * Central error handling system for CLIPPY AI Assistant
 */
export class ClippyErrorBoundaries {
    private static instance: ClippyErrorBoundaries;
    private errorHistory: ErrorInfo[] = [];
    private config: ErrorHandlerConfig;

    constructor(config?: Partial<ErrorHandlerConfig>) {
        this.config = {
            showUserNotifications: true,
            logToConsole: true,
            maxErrorHistory: 100,
            retryAttempts: 3,
            ...config
        };
    }

    /**
     * Initialize the error boundary system
     */
    static initialize(config?: Partial<ErrorHandlerConfig>): void {
        if (!ClippyErrorBoundaries.instance) {
            ClippyErrorBoundaries.instance = new ClippyErrorBoundaries(config);
        }
    }

    /**
     * Handle an error with context and automatic recovery
     */
    static handleError(
        error: Error | string,
        context?: string,
        customType?: ErrorType,
        customSeverity?: ErrorSeverity
    ): ErrorInfo {
        if (!ClippyErrorBoundaries.instance) {
            ClippyErrorBoundaries.initialize();
        }

        return ClippyErrorBoundaries.instance.processError(
            error,
            context,
            customType,
            customSeverity
        );
    }

    /**
     * Execute a function with error boundary protection
     */
    static async withErrorBoundary<T>(
        fn: () => Promise<T>,
        context: string,
        fallback?: T
    ): Promise<T | undefined> {
        try {
            return await fn();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, context);
            return fallback;
        }
    }

    /**
     * Get error history for debugging
     */
    static getErrorHistory(): ErrorInfo[] {
        if (!ClippyErrorBoundaries.instance) {
            return [];
        }
        return ClippyErrorBoundaries.instance.errorHistory.slice();
    }

    /**
     * Clear error history
     */
    static clearErrorHistory(): void {
        if (ClippyErrorBoundaries.instance) {
            ClippyErrorBoundaries.instance.errorHistory = [];
        }
    }

    /**
     * Process and categorize an error
     */
    private processError(
        error: Error | string,
        context?: string,
        customType?: ErrorType,
        customSeverity?: ErrorSeverity
    ): ErrorInfo {
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : undefined;

        const errorInfo: ErrorInfo = {
            type: customType || this.categorizeError(errorMessage, context),
            severity: customSeverity || this.determineSeverity(errorMessage, context),
            message: errorMessage,
            context: context,
            timestamp: Date.now(),
            stack: errorStack,
            userAction: this.suggestUserAction(errorMessage, context),
            recoveryAction: this.suggestRecoveryAction(errorMessage, context)
        };

        // Add to history
        this.addToHistory(errorInfo);

        // Log to console if enabled
        if (this.config.logToConsole) {
            this.logError(errorInfo);
        }

        // Show user notification if enabled
        if (this.config.showUserNotifications) {
            this.notifyUser(errorInfo);
        }

        return errorInfo;
    }

    /**
     * Categorize error based on message and context
     */
    private categorizeError(message: string, context?: string): ErrorType {
        const lowerMessage = message.toLowerCase();
        const lowerContext = context?.toLowerCase() || '';

        // Voice-related errors
        if (lowerContext.includes('voice') || lowerContext.includes('speech') || lowerContext.includes('audio')) {
            if (lowerMessage.includes('microphone') || lowerMessage.includes('audio capture')) {
                return ErrorType.AUDIO_CAPTURE;
            }
            if (lowerMessage.includes('speech recognition') || lowerMessage.includes('transcription')) {
                return ErrorType.SPEECH_RECOGNITION;
            }
            if (lowerMessage.includes('text to speech') || lowerMessage.includes('synthesis')) {
                return ErrorType.TEXT_TO_SPEECH;
            }
            if (lowerMessage.includes('wake word') || lowerMessage.includes('porcupine')) {
                return ErrorType.WAKE_WORD_DETECTION;
            }
            return ErrorType.VOICE_PROCESSING;
        }

        // Permission errors
        if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('not allowed')) {
            return ErrorType.PERMISSIONS;
        }

        // Network errors
        if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
            return ErrorType.NETWORK;
        }

        // AI provider errors
        if (lowerMessage.includes('api') || lowerMessage.includes('openai') || lowerMessage.includes('anthropic')) {
            return ErrorType.AI_PROVIDER;
        }

        // File operation errors
        if (lowerMessage.includes('file') || lowerMessage.includes('read') || lowerMessage.includes('write')) {
            return ErrorType.FILE_OPERATIONS;
        }

        // Knowledge graph errors
        if (lowerContext.includes('graph') || lowerContext.includes('knowledge')) {
            return ErrorType.KNOWLEDGE_GRAPH;
        }

        // Settings errors
        if (lowerContext.includes('settings') || lowerContext.includes('config')) {
            return ErrorType.SETTINGS;
        }

        return ErrorType.UNKNOWN;
    }

    /**
     * Determine error severity
     */
    private determineSeverity(message: string, context?: string): ErrorSeverity {
        const lowerMessage = message.toLowerCase();

        // Critical errors
        if (lowerMessage.includes('cannot initialize') || 
            lowerMessage.includes('failed to load') ||
            lowerMessage.includes('critical')) {
            return ErrorSeverity.CRITICAL;
        }

        // High severity
        if (lowerMessage.includes('failed to') && 
            (lowerMessage.includes('voice') || lowerMessage.includes('ai'))) {
            return ErrorSeverity.HIGH;
        }

        // Medium severity
        if (lowerMessage.includes('timeout') || 
            lowerMessage.includes('not available') ||
            lowerMessage.includes('fallback')) {
            return ErrorSeverity.MEDIUM;
        }

        // Default to low severity
        return ErrorSeverity.LOW;
    }

    /**
     * Suggest user action based on error
     */
    private suggestUserAction(message: string, context?: string): string {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('permission') && lowerMessage.includes('microphone')) {
            return 'Please allow microphone access in your browser settings and reload Obsidian.';
        }

        if (lowerMessage.includes('api key')) {
            return 'Please check your API key in the plugin settings.';
        }

        if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
            return 'Please check your internet connection and try again.';
        }

        if (lowerMessage.includes('not supported') || lowerMessage.includes('browser')) {
            return 'This feature may not be supported in your browser. Try updating or using a different browser.';
        }

        if (lowerMessage.includes('file not found')) {
            return 'Please ensure the file exists and try again.';
        }

        return 'Please try again or check the plugin settings.';
    }

    /**
     * Suggest recovery action for automatic handling
     */
    private suggestRecoveryAction(message: string, context?: string): string {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('fallback') || lowerMessage.includes('not available')) {
            return 'retry_with_fallback';
        }

        if (lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
            return 'retry_with_backoff';
        }

        if (lowerMessage.includes('initialization')) {
            return 'reinitialize_component';
        }

        if (lowerMessage.includes('invalid') || lowerMessage.includes('malformed')) {
            return 'reset_to_defaults';
        }

        return 'manual_intervention_required';
    }

    /**
     * Add error to history with size limit
     */
    private addToHistory(errorInfo: ErrorInfo): void {
        this.errorHistory.push(errorInfo);
        
        // Maintain history size limit
        if (this.errorHistory.length > this.config.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
        }
    }

    /**
     * Log error to console with formatting
     */
    private logError(errorInfo: ErrorInfo): void {
        const prefix = `[CLIPPY ${errorInfo.severity.toUpperCase()}]`;
        const context = errorInfo.context ? ` [${errorInfo.context}]` : '';
        const timestamp = new Date(errorInfo.timestamp).toISOString();
        
        console.error(`${prefix}${context} ${errorInfo.message}`);
        
        if (errorInfo.stack) {
            console.error('Stack trace:', errorInfo.stack);
        }
        
        if (errorInfo.userAction) {
            console.info('Suggested action:', errorInfo.userAction);
        }
    }

    /**
     * Show user notification based on severity
     */
    private notifyUser(errorInfo: ErrorInfo): void {
        const shouldNotify = this.shouldNotifyUser(errorInfo);
        
        if (!shouldNotify) {
            return;
        }

        const message = this.formatUserMessage(errorInfo);
        
        // Use different notification types based on severity
        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                new Notice(message, 8000); // 8 seconds
                break;
            case ErrorSeverity.MEDIUM:
                new Notice(message, 5000); // 5 seconds
                break;
            case ErrorSeverity.LOW:
                new Notice(message, 3000); // 3 seconds
                break;
        }
    }

    /**
     * Determine if user should be notified
     */
    private shouldNotifyUser(errorInfo: ErrorInfo): boolean {
        // Don't spam users with low severity errors
        if (errorInfo.severity === ErrorSeverity.LOW) {
            // Check if we've had too many recent similar errors
            const recentSimilarErrors = this.errorHistory
                .filter(err => 
                    err.type === errorInfo.type && 
                    (Date.now() - err.timestamp) < 60000 // Last minute
                )
                .length;
            
            return recentSimilarErrors <= 2;
        }

        // Always notify for medium and above
        return true;
    }

    /**
     * Format user-friendly error message
     */
    private formatUserMessage(errorInfo: ErrorInfo): string {
        const context = errorInfo.context ? ` (${errorInfo.context})` : '';
        const userAction = errorInfo.userAction ? ` ${errorInfo.userAction}` : '';
        
        return `CLIPPY Error${context}: ${errorInfo.message}${userAction}`;
    }

    /**
     * Get error statistics for debugging
     */
    static getErrorStatistics(): {
        totalErrors: number;
        errorsByType: Record<ErrorType, number>;
        errorsBySeverity: Record<ErrorSeverity, number>;
        recentErrors: number;
    } {
        if (!ClippyErrorBoundaries.instance) {
            return {
                totalErrors: 0,
                errorsByType: {} as Record<ErrorType, number>,
                errorsBySeverity: {} as Record<ErrorSeverity, number>,
                recentErrors: 0
            };
        }

        const history = ClippyErrorBoundaries.instance.errorHistory;
        const recentThreshold = Date.now() - (60 * 60 * 1000); // Last hour

        const errorsByType = {} as Record<ErrorType, number>;
        const errorsBySeverity = {} as Record<ErrorSeverity, number>;
        let recentErrors = 0;

        for (const error of history) {
            // Count by type
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
            
            // Count by severity
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
            
            // Count recent errors
            if (error.timestamp > recentThreshold) {
                recentErrors++;
            }
        }

        return {
            totalErrors: history.length,
            errorsByType,
            errorsBySeverity,
            recentErrors
        };
    }

    /**
     * Handle file system operations with error boundaries
     */
    static async fileSystemOperation<T>(
        fn: () => Promise<T> | T,
        context?: string,
        fallback?: T
    ): Promise<T | undefined> {
        try {
            return await fn();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, context || 'file system operation');
            return fallback;
        }
    }

    /**
     * Handle AI provider operations with error boundaries
     */
    static async aiProviderOperation<T>(
        fn: () => Promise<T> | T,
        context?: string,
        fallback?: T
    ): Promise<T | undefined> {
        try {
            return await fn();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, context || 'AI provider operation');
            return fallback;
        }
    }

    /**
     * Handle network operations with error boundaries
     */
    static async networkOperation<T>(
        fn: () => Promise<T> | T,
        context?: string,
        fallback?: T
    ): Promise<T | undefined> {
        try {
            return await fn();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, context || 'network operation');
            return fallback;
        }
    }

    /**
     * Handle validation operations with error boundaries
     */
    static validationOperation<T>(
        fn: () => T,
        context?: string,
        fallback?: T
    ): T | undefined {
        try {
            return fn();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, context || 'validation operation');
            return fallback;
        }
    }
}