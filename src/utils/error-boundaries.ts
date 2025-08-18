/**
 * CLIPPY AI Assistant - Error Boundaries
 * Comprehensive error handling and recovery utilities
 */

import { Notice } from 'obsidian';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorCategory {
    AI_PROVIDER = 'ai_provider',
    NETWORK = 'network',
    FILE_SYSTEM = 'file_system',
    VALIDATION = 'validation',
    PARSING = 'parsing',
    AUTHENTICATION = 'authentication',
    RATE_LIMIT = 'rate_limit',
    UNKNOWN = 'unknown'
}

export interface ErrorContext {
    operation: string;
    component: string;
    userAction?: string;
    retryable: boolean;
    metadata?: Record<string, any>;
}

export interface ClippyError {
    id: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    context: ErrorContext;
    originalError?: Error;
    timestamp: Date;
    stack?: string;
}

/**
 * Enhanced error boundary for CLIPPY operations
 */
export class ErrorBoundary {
    private static instance: ErrorBoundary;
    private errorLog: ClippyError[] = [];
    private maxLogSize = 100;

    static getInstance(): ErrorBoundary {
        if (!ErrorBoundary.instance) {
            ErrorBoundary.instance = new ErrorBoundary();
        }
        return ErrorBoundary.instance;
    }

    /**
     * Wrap async operations with comprehensive error handling
     */
    async wrapAsync<T>(
        operation: () => Promise<T>,
        context: ErrorContext,
        options: {
            retries?: number;
            retryDelay?: number;
            fallback?: () => Promise<T>;
            showUserNotice?: boolean;
            suppressConsoleLog?: boolean;
        } = {}
    ): Promise<T> {
        const {
            retries = 0,
            retryDelay = 1000,
            fallback,
            showUserNotice = true,
            suppressConsoleLog = false
        } = options;

        let lastError: ClippyError | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                const clippyError = this.createError(error, context, attempt);
                lastError = clippyError;

                // Log error
                this.logError(clippyError, suppressConsoleLog);

                // If this is not the last attempt, wait and retry
                if (attempt < retries && context.retryable) {
                    console.log(`CLIPPY: Retrying ${context.operation} (attempt ${attempt + 2}/${retries + 1}) in ${retryDelay}ms`);
                    await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
                    continue;
                }

                // If we have a fallback and this is the last attempt
                if (fallback) {
                    try {
                        console.log(`CLIPPY: Using fallback for ${context.operation}`);
                        return await fallback();
                    } catch (fallbackError) {
                        const fallbackClippyError = this.createError(
                            fallbackError,
                            { ...context, operation: `${context.operation} (fallback)` },
                            0
                        );
                        this.logError(fallbackClippyError, suppressConsoleLog);
                    }
                }

                break;
            }
        }

        // Show user-friendly notice
        if (showUserNotice && lastError) {
            this.showUserNotice(lastError);
        }

        throw lastError?.originalError || new Error(`Operation failed: ${context.operation}`);
    }

    /**
     * Wrap sync operations with error handling
     */
    wrapSync<T>(
        operation: () => T,
        context: ErrorContext,
        options: {
            fallback?: () => T;
            showUserNotice?: boolean;
            suppressConsoleLog?: boolean;
        } = {}
    ): T {
        const { fallback, showUserNotice = true, suppressConsoleLog = false } = options;

        try {
            return operation();
        } catch (error) {
            const clippyError = this.createError(error, context, 0);
            this.logError(clippyError, suppressConsoleLog);

            // Try fallback
            if (fallback) {
                try {
                    console.log(`CLIPPY: Using fallback for ${context.operation}`);
                    return fallback();
                } catch (fallbackError) {
                    const fallbackClippyError = this.createError(
                        fallbackError,
                        { ...context, operation: `${context.operation} (fallback)` },
                        0
                    );
                    this.logError(fallbackClippyError, suppressConsoleLog);
                }
            }

            // Show user-friendly notice
            if (showUserNotice) {
                this.showUserNotice(clippyError);
            }

            throw clippyError.originalError;
        }
    }

    /**
     * Create standardized error object
     */
    private createError(error: any, context: ErrorContext, attempt: number): ClippyError {
        const category = this.categorizeError(error);
        const severity = this.determineSeverity(category, context);
        
        return {
            id: this.generateErrorId(),
            message: this.extractErrorMessage(error),
            category,
            severity,
            context: {
                ...context,
                metadata: {
                    ...context.metadata,
                    attempt: attempt + 1
                }
            },
            originalError: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined
        };
    }

    /**
     * Categorize error based on error type and message
     */
    private categorizeError(error: any): ErrorCategory {
        const message = String(error?.message || error).toLowerCase();

        // AI Provider errors
        if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
            return ErrorCategory.AUTHENTICATION;
        }
        if (message.includes('rate limit') || message.includes('too many requests') || message.includes('quota')) {
            return ErrorCategory.RATE_LIMIT;
        }
        if (message.includes('ollama') || message.includes('openai') || message.includes('anthropic') || message.includes('ai provider')) {
            return ErrorCategory.AI_PROVIDER;
        }

        // Network errors
        if (message.includes('network') || message.includes('fetch') || message.includes('connection') || 
            message.includes('timeout') || message.includes('cors') || message.includes('dns')) {
            return ErrorCategory.NETWORK;
        }

        // File system errors
        if (message.includes('file') || message.includes('path') || message.includes('directory') || 
            message.includes('permission') || message.includes('enoent') || message.includes('eacces')) {
            return ErrorCategory.FILE_SYSTEM;
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || message.includes('schema') || 
            message.includes('required') || message.includes('format')) {
            return ErrorCategory.VALIDATION;
        }

        // Parsing errors
        if (message.includes('parse') || message.includes('json') || message.includes('yaml') || 
            message.includes('syntax') || message.includes('malformed')) {
            return ErrorCategory.PARSING;
        }

        return ErrorCategory.UNKNOWN;
    }

    /**
     * Determine error severity
     */
    private determineSeverity(category: ErrorCategory, context: ErrorContext): ErrorSeverity {
        // Critical errors that completely break functionality
        if (category === ErrorCategory.AUTHENTICATION && context.component === 'main') {
            return ErrorSeverity.CRITICAL;
        }
        if (category === ErrorCategory.FILE_SYSTEM && context.operation.includes('save')) {
            return ErrorSeverity.HIGH;
        }

        // High severity errors
        if (category === ErrorCategory.AI_PROVIDER || category === ErrorCategory.RATE_LIMIT) {
            return ErrorSeverity.HIGH;
        }

        // Medium severity errors
        if (category === ErrorCategory.NETWORK || category === ErrorCategory.VALIDATION) {
            return ErrorSeverity.MEDIUM;
        }

        // Default to low severity
        return ErrorSeverity.LOW;
    }

    /**
     * Extract meaningful error message
     */
    private extractErrorMessage(error: any): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error?.message) {
            return error.message;
        }
        return 'Unknown error occurred';
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `clippy-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log error to console and internal log
     */
    private logError(error: ClippyError, suppressConsoleLog: boolean): void {
        // Add to internal log
        this.errorLog.unshift(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.pop();
        }

        // Console logging
        if (!suppressConsoleLog) {
            const logLevel = this.getLogLevel(error.severity);
            const logMessage = `CLIPPY Error [${error.category}/${error.severity}] ${error.context.component}:${error.context.operation} - ${error.message}`;
            
            switch (logLevel) {
                case 'error':
                    console.error(logMessage, error.originalError);
                    break;
                case 'warn':
                    console.warn(logMessage, error.originalError);
                    break;
                default:
                    console.log(logMessage, error.originalError);
            }
        }
    }

    /**
     * Get appropriate console log level
     */
    private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'log' {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 'error';
            case ErrorSeverity.MEDIUM:
                return 'warn';
            default:
                return 'log';
        }
    }

    /**
     * Show user-friendly notice
     */
    private showUserNotice(error: ClippyError): void {
        const userMessage = this.generateUserMessage(error);
        const noticeTimeout = this.getNoticeTimeout(error.severity);
        
        new Notice(userMessage, noticeTimeout);
    }

    /**
     * Generate user-friendly error message
     */
    private generateUserMessage(error: ClippyError): string {
        const baseMessage = `CLIPPY: ${error.context.operation} failed`;
        
        switch (error.category) {
            case ErrorCategory.AUTHENTICATION:
                return `${baseMessage} - Please check your AI provider API key in settings`;
            case ErrorCategory.RATE_LIMIT:
                return `${baseMessage} - Rate limit exceeded. Please wait and try again`;
            case ErrorCategory.NETWORK:
                return `${baseMessage} - Check your internet connection`;
            case ErrorCategory.AI_PROVIDER:
                return `${baseMessage} - AI provider error. Check settings and try again`;
            case ErrorCategory.FILE_SYSTEM:
                return `${baseMessage} - File system error. Check permissions`;
            case ErrorCategory.VALIDATION:
                return `${baseMessage} - Invalid data format`;
            case ErrorCategory.PARSING:
                return `${baseMessage} - Data parsing error`;
            default:
                return `${baseMessage} - ${error.message}`;
        }
    }

    /**
     * Get notice timeout based on severity
     */
    private getNoticeTimeout(severity: ErrorSeverity): number {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 0; // Persistent notice
            case ErrorSeverity.HIGH:
                return 8000;
            case ErrorSeverity.MEDIUM:
                return 5000;
            default:
                return 3000;
        }
    }

    /**
     * Utility delay function
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get recent errors
     */
    getRecentErrors(limit = 10): ClippyError[] {
        return this.errorLog.slice(0, limit);
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        total: number;
        byCategory: Record<ErrorCategory, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recent24h: number;
    } {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const byCategory: Record<ErrorCategory, number> = Object.values(ErrorCategory).reduce(
            (acc, category) => ({ ...acc, [category]: 0 }),
            {} as Record<ErrorCategory, number>
        );

        const bySeverity: Record<ErrorSeverity, number> = Object.values(ErrorSeverity).reduce(
            (acc, severity) => ({ ...acc, [severity]: 0 }),
            {} as Record<ErrorSeverity, number>
        );

        let recent24h = 0;

        for (const error of this.errorLog) {
            byCategory[error.category]++;
            bySeverity[error.severity]++;
            
            if (error.timestamp >= twentyFourHoursAgo) {
                recent24h++;
            }
        }

        return {
            total: this.errorLog.length,
            byCategory,
            bySeverity,
            recent24h
        };
    }
}

/**
 * Convenient helper functions for common error boundary patterns
 */
export const errorBoundary = ErrorBoundary.getInstance();

export async function withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'retryable'>,
    options?: {
        retries?: number;
        retryable?: boolean;
        showUserNotice?: boolean;
        fallback?: () => Promise<T>;
    }
): Promise<T> {
    return errorBoundary.wrapAsync(
        operation,
        { ...context, retryable: options?.retryable ?? true },
        options
    );
}

export function withErrorBoundarySync<T>(
    operation: () => T,
    context: Omit<ErrorContext, 'retryable'>,
    options?: {
        showUserNotice?: boolean;
        fallback?: () => T;
    }
): T {
    return errorBoundary.wrapSync(
        operation,
        { ...context, retryable: false },
        options
    );
}

/**
 * Specific error boundary helpers for common CLIPPY operations
 */
export class ClippyErrorBoundaries {
    static async aiProviderOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        options?: { fallback?: () => Promise<T>; showUserNotice?: boolean }
    ): Promise<T> {
        return withErrorBoundary(
            operation,
            {
                operation: operationName,
                component: 'ai-provider',
                userAction: `Using AI for ${operationName}`,
            },
            {
                retries: 2,
                retryable: true,
                ...options
            }
        );
    }

    static async fileSystemOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        filePath?: string,
        options?: { fallback?: () => Promise<T>; showUserNotice?: boolean }
    ): Promise<T> {
        return withErrorBoundary(
            operation,
            {
                operation: operationName,
                component: 'file-system',
                userAction: `File operation: ${operationName}`,
                metadata: { filePath }
            },
            {
                retries: 1,
                retryable: false,
                ...options
            }
        );
    }

    static async networkOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        url?: string,
        options?: { fallback?: () => Promise<T>; showUserNotice?: boolean }
    ): Promise<T> {
        return withErrorBoundary(
            operation,
            {
                operation: operationName,
                component: 'network',
                userAction: `Network request: ${operationName}`,
                metadata: { url }
            },
            {
                retries: 3,
                retryable: true,
                ...options
            }
        );
    }

    static validationOperation<T>(
        operation: () => T,
        operationName: string,
        data?: any,
        options?: { fallback?: () => T; showUserNotice?: boolean }
    ): T {
        return withErrorBoundarySync(
            operation,
            {
                operation: operationName,
                component: 'validation',
                userAction: `Data validation: ${operationName}`,
                metadata: { dataType: typeof data }
            },
            options
        );
    }
}