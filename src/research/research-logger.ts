/**
 * Comprehensive Research Logger - Captures every step of the research process
 * Creates detailed log files for each research topic to aid in debugging and understanding
 */

import { App, TFile } from 'obsidian';

interface LogEntry {
    timestamp: string;
    step: string;
    action: string;
    data?: any;
    metadata?: {
        duration?: number;
        success?: boolean;
        error?: string;
    };
}

interface VaultSearchResult {
    query: string;
    files: Array<{
        path: string;
        title: string;
        similarity?: number;
        relevantSections: string[];
    }>;
    totalFound: number;
}

interface WebSearchResult {
    query: string;
    results: Array<{
        title: string;
        url: string;
        domain: string;
        content: string;
        snippet?: string;
        score?: number;
    }>;
    totalFound: number;
}

interface AIInteraction {
    prompt: string;
    response: string;
    cleanedResponse?: string;
    model?: string;
    tokens?: {
        input: number;
        output: number;
    };
    duration?: number;
}

interface TemplateOperation {
    operation: 'create' | 'process_variables' | 'apply_content' | 'update_frontmatter';
    template?: string;
    variables?: Record<string, any>;
    before?: string;
    after?: string;
}

export class ResearchLogger {
    private app: App;
    private topicName: string;
    private logEntries: LogEntry[] = [];
    private sessionId: string;
    private logFilePath: string;
    private startTime: number;

    constructor(app: App, topicName: string, outputFolder: string = 'Generated Research Notes') {
        this.app = app;
        this.topicName = this.sanitizeFileName(topicName);
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        
        // Create log file path
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
        this.logFilePath = `${outputFolder}/Research Logs/${this.topicName}_${timestamp}_${this.sessionId}.log.md`;
        
        this.log('INIT', 'Research session started', {
            topicName: this.topicName,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log vault search operation
     */
    async logVaultSearch(query: string, searchType: 'exact' | 'semantic', results: VaultSearchResult): Promise<void> {
        this.log('VAULT_SEARCH', `${searchType} search executed`, {
            query,
            searchType,
            results: {
                totalFound: results.totalFound,
                files: results.files.map(file => ({
                    path: file.path,
                    title: file.title,
                    similarity: file.similarity,
                    sectionCount: file.relevantSections.length,
                    relevantSections: file.relevantSections.map(section => 
                        section.length > 200 ? section.substring(0, 200) + '...' : section
                    )
                }))
            }
        });

        // Log full content of each vault file for context
        for (const file of results.files) {
            try {
                const vaultFile = this.app.vault.getAbstractFileByPath(file.path);
                if (vaultFile instanceof TFile) {
                    const content = await this.app.vault.read(vaultFile);
                    this.log('VAULT_FILE_CONTENT', `Full content of ${file.title}`, {
                        path: file.path,
                        title: file.title,
                        content: content,
                        contentLength: content.length,
                        similarity: file.similarity
                    });
                }
            } catch (error) {
                this.log('VAULT_FILE_ERROR', `Error reading vault file ${file.path}`, null, { error: error.message });
            }
        }
    }

    /**
     * Log web search operation
     */
    async logWebSearch(query: string, results: WebSearchResult, searchEngine: string): Promise<void> {
        this.log('WEB_SEARCH', `Web search executed via ${searchEngine}`, {
            query,
            searchEngine,
            results: {
                totalFound: results.totalFound,
                results: results.results.map(result => ({
                    title: result.title,
                    url: result.url,
                    domain: result.domain,
                    contentLength: result.content.length,
                    snippet: result.snippet,
                    score: result.score
                }))
            }
        });

        // Log full content of each web result
        for (const [index, result] of results.results.entries()) {
            this.log('WEB_CONTENT', `Full web content #${index + 1}: ${result.title}`, {
                title: result.title,
                url: result.url,
                domain: result.domain,
                content: result.content,
                contentLength: result.content.length,
                score: result.score
            });
        }
    }

    /**
     * Log AI interaction
     */
    async logAIInteraction(
        step: string, 
        interaction: AIInteraction,
        purpose: string
    ): Promise<void> {
        this.log('AI_INTERACTION', `${step}: ${purpose}`, {
            purpose,
            model: interaction.model || 'unknown',
            prompt: interaction.prompt,
            promptLength: interaction.prompt.length,
            response: interaction.response,
            responseLength: interaction.response.length,
            cleanedResponse: interaction.cleanedResponse,
            cleanedResponseLength: interaction.cleanedResponse?.length,
            tokens: interaction.tokens,
            duration: interaction.duration
        });
    }

    /**
     * Log wisdom extraction process
     */
    async logWisdomExtraction(
        vaultCount: number,
        webCount: number,
        prompt: string,
        rawResponse: string,
        cleanedResponse: string,
        parsedWisdom: any
    ): Promise<void> {
        this.log('WISDOM_EXTRACTION', 'AI wisdom extraction from all sources', {
            sourceCount: {
                vault: vaultCount,
                web: webCount,
                total: vaultCount + webCount
            },
            prompt: {
                content: prompt,
                length: prompt.length
            },
            aiResponse: {
                raw: rawResponse,
                rawLength: rawResponse.length,
                cleaned: cleanedResponse,
                cleanedLength: cleanedResponse.length
            },
            parsedWisdom: {
                keyFacts: parsedWisdom.keyFacts?.length || 0,
                definitions: parsedWisdom.definitions?.length || 0,
                uses: parsedWisdom.uses?.length || 0,
                warnings: parsedWisdom.warnings?.length || 0,
                researchFindings: parsedWisdom.researchFindings?.length || 0,
                relatedConcepts: parsedWisdom.relatedConcepts?.length || 0,
                sources: parsedWisdom.sources?.length || 0
            },
            extractedContent: parsedWisdom
        });
    }

    /**
     * Log template operations
     */
    async logTemplateOperation(operation: TemplateOperation): Promise<void> {
        this.log('TEMPLATE_OPERATION', `Template ${operation.operation}`, {
            operation: operation.operation,
            template: operation.template,
            variables: operation.variables,
            beforeLength: operation.before?.length,
            afterLength: operation.after?.length,
            changes: operation.before && operation.after ? 
                this.calculateTextDiff(operation.before, operation.after) : null
        });

        // Log full before/after content for major operations
        if (operation.before && operation.after && operation.operation === 'apply_content') {
            this.log('TEMPLATE_BEFORE', 'Template content before processing', {
                content: operation.before
            });
            this.log('TEMPLATE_AFTER', 'Template content after processing', {
                content: operation.after
            });
        }
    }

    /**
     * Log frontmatter changes
     */
    async logFrontmatterChange(
        operation: string,
        before: string,
        after: string,
        changes: Record<string, any>
    ): Promise<void> {
        this.log('FRONTMATTER', `Frontmatter ${operation}`, {
            operation,
            changes,
            before: this.parseFrontmatter(before),
            after: this.parseFrontmatter(after),
            beforeRaw: before,
            afterRaw: after
        });
    }

    /**
     * Log section-specific content generation
     */
    async logSectionGeneration(
        sectionTitle: string,
        level: number,
        prompt: string,
        response: string,
        cleanedResponse: string,
        context: {
            vaultContext?: string;
            webContext?: string;
            wisdomData?: any;
        }
    ): Promise<void> {
        this.log('SECTION_GENERATION', `Generated content for: ${sectionTitle}`, {
            sectionTitle,
            level,
            context: {
                vaultContextLength: context.vaultContext?.length || 0,
                webContextLength: context.webContext?.length || 0,
                wisdomData: context.wisdomData
            },
            prompt: {
                content: prompt,
                length: prompt.length
            },
            response: {
                raw: response,
                rawLength: response.length,
                cleaned: cleanedResponse,
                cleanedLength: cleanedResponse.length
            }
        });
    }

    /**
     * Log RAG operations
     */
    async logRAGOperation(
        operation: string,
        query: string,
        results: Array<{
            content: string;
            score: number;
            metadata: any;
        }>,
        totalResults: number
    ): Promise<void> {
        this.log('RAG_OPERATION', `RAG ${operation}`, {
            operation,
            query,
            queryLength: query.length,
            resultsReturned: results.length,
            totalResults,
            results: results.map((result, index) => ({
                index,
                score: result.score,
                contentLength: result.content.length,
                metadata: result.metadata,
                contentPreview: result.content.substring(0, 200) + '...'
            }))
        });
    }

    /**
     * Log file operations
     */
    async logFileOperation(
        operation: 'create' | 'read' | 'write' | 'modify',
        filePath: string,
        content?: string,
        metadata?: any
    ): Promise<void> {
        this.log('FILE_OPERATION', `File ${operation}: ${filePath}`, {
            operation,
            filePath,
            contentLength: content?.length,
            metadata,
            contentPreview: content ? content.substring(0, 300) + '...' : null
        });
    }

    /**
     * Log error with context
     */
    async logError(step: string, error: Error, context?: any): Promise<void> {
        this.log('ERROR', `Error in ${step}`, context, {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Log performance metrics
     */
    async logPerformance(operation: string, startTime: number, endTime: number, metadata?: any): Promise<void> {
        this.log('PERFORMANCE', `${operation} performance`, {
            operation,
            duration: endTime - startTime,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            ...metadata
        });
    }

    /**
     * Core logging method
     */
    log(step: string, action: string, data?: any, metadata?: any): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            step,
            action,
            data,
            metadata
        };

        this.logEntries.push(entry);
        console.log(`🔍 RESEARCH LOG [${step}]: ${action}`);
        
        // Auto-save log every 10 entries to prevent data loss
        if (this.logEntries.length % 10 === 0) {
            this.saveLogFile().catch(error => {
                console.error('Failed to auto-save research log:', error);
            });
        }
    }

    /**
     * Save complete log file
     */
    async saveLogFile(): Promise<void> {
        try {
            const logContent = this.generateLogMarkdown();
            
            // Ensure directory exists
            await this.ensureDirectoryExists();
            
            // Create or update log file
            const existingFile = this.app.vault.getAbstractFileByPath(this.logFilePath);
            if (existingFile instanceof TFile) {
                await this.app.vault.modify(existingFile, logContent);
            } else {
                await this.app.vault.create(this.logFilePath, logContent);
            }
            
            console.log(`📝 Research log saved: ${this.logFilePath}`);
        } catch (error) {
            console.error('Failed to save research log:', error);
        }
    }

    /**
     * Generate markdown content for log file
     */
    private generateLogMarkdown(): string {
        const totalDuration = Date.now() - this.startTime;
        const summary = this.generateSummary();
        
        let markdown = `# 🔬 Research Log: ${this.topicName}

## Session Information
- **Topic**: ${this.topicName}
- **Session ID**: ${this.sessionId}
- **Started**: ${new Date(this.startTime).toISOString()}
- **Duration**: ${Math.round(totalDuration / 1000)}s
- **Total Log Entries**: ${this.logEntries.length}

## Summary
${summary}

---

## Detailed Log

`;

        for (const [index, entry] of this.logEntries.entries()) {
            const timeOffset = new Date(entry.timestamp).getTime() - this.startTime;
            
            markdown += `### ${index + 1}. [+${Math.round(timeOffset / 1000)}s] ${entry.step}: ${entry.action}

**Timestamp**: ${entry.timestamp}

`;
            
            if (entry.data) {
                markdown += `**Data**:
\`\`\`json
${this.safeStringify(entry.data)}
\`\`\`

`;
            }
            
            if (entry.metadata) {
                markdown += `**Metadata**:
\`\`\`json
${this.safeStringify(entry.metadata)}
\`\`\`

`;
            }
            
            markdown += '---\n\n';
        }
        
        return markdown;
    }

    /**
     * Safe JSON stringify that handles circular references
     */
    private safeStringify(obj: any): string {
        try {
            const seen = new WeakSet();
            return JSON.stringify(obj, (_, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular Reference]';
                    }
                    seen.add(value);
                }
                // Filter out potentially problematic objects
                if (value && typeof value === 'object') {
                    // Skip DOM elements and complex objects
                    if (value.nodeType || value.constructor?.name?.includes('Element')) {
                        return '[DOM Element]';
                    }
                    // Skip functions
                    if (typeof value === 'function') {
                        return '[Function]';
                    }
                    // Skip large or complex Obsidian objects
                    if (value.app || value.plugin || value.vault) {
                        return '[Obsidian Object]';
                    }
                }
                return value;
            }, 2);
        } catch (error) {
            return `[JSON Stringify Error: ${error.message}]`;
        }
    }

    /**
     * Generate summary of research process
     */
    private generateSummary(): string {
        const steps = this.groupEntriesByStep();
        let summary = '';
        
        for (const [stepType, entries] of Object.entries(steps)) {
            summary += `- **${stepType}**: ${entries.length} operations\n`;
        }
        
        // Performance summary
        const performanceEntries = this.logEntries.filter(e => e.step === 'PERFORMANCE');
        if (performanceEntries.length > 0) {
            summary += '\n**Performance Summary**:\n';
            for (const perf of performanceEntries) {
                summary += `- ${perf.data?.operation}: ${perf.data?.duration}ms\n`;
            }
        }
        
        // Error summary
        const errorEntries = this.logEntries.filter(e => e.step === 'ERROR');
        if (errorEntries.length > 0) {
            summary += `\n**Errors Encountered**: ${errorEntries.length}\n`;
        }
        
        return summary;
    }

    /**
     * Group log entries by step type
     */
    private groupEntriesByStep(): Record<string, LogEntry[]> {
        const groups: Record<string, LogEntry[]> = {};
        
        for (const entry of this.logEntries) {
            if (!groups[entry.step]) {
                groups[entry.step] = [];
            }
            groups[entry.step].push(entry);
        }
        
        return groups;
    }

    /**
     * Calculate text differences
     */
    private calculateTextDiff(before: string, after: string): any {
        return {
            beforeLines: before.split('\n').length,
            afterLines: after.split('\n').length,
            beforeLength: before.length,
            afterLength: after.length,
            sizeDiff: after.length - before.length
        };
    }

    /**
     * Parse frontmatter from content
     */
    private parseFrontmatter(content: string): any {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;
        
        try {
            // Simple YAML parsing - just split lines and extract key-value pairs
            const lines = match[1].split('\n');
            const parsed: any = {};
            
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    parsed[key] = value;
                }
            }
            
            return parsed;
        } catch (error) {
            return { error: 'Failed to parse YAML' };
        }
    }

    /**
     * Ensure log directory exists
     */
    private async ensureDirectoryExists(): Promise<void> {
        const dirPath = this.logFilePath.substring(0, this.logFilePath.lastIndexOf('/'));
        
        if (!this.app.vault.getAbstractFileByPath(dirPath)) {
            await this.app.vault.createFolder(dirPath);
        }
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Sanitize filename for file system
     */
    private sanitizeFileName(name: string): string {
        return name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
    }

    /**
     * Finalize and save log (call at end of research process)
     */
    async finalize(): Promise<string> {
        this.log('FINALIZE', 'Research session completed', {
            totalDuration: Date.now() - this.startTime,
            totalEntries: this.logEntries.length,
            sessionId: this.sessionId
        });
        
        await this.saveLogFile();
        return this.logFilePath;
    }
}