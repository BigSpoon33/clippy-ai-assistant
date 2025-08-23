/**
 * Intelligent Auto-Backlink System for Obsidian
 * Creates high-quality, meaningful connections while avoiding link pollution
 */

import { App, TFile, Notice } from 'obsidian';
import { IntelligentSearchService } from '../semantic/intelligent-search-service';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';

export interface BacklinkSuggestion {
    sourceFile: TFile;
    targetFile: TFile;
    confidence: number;
    linkType: 'semantic' | 'title-mention' | 'tag-shared' | 'concept-related';
    context: string;
    suggestedText: string;
    reason: string;
}

export interface BacklinkOptions {
    minConfidence: number;          // Only suggest high-confidence links (0.7+)
    maxSuggestionsPerFile: number;  // Limit suggestions per file (3-5)
    semanticThreshold: number;      // Semantic similarity threshold (0.6+)
    respectExistingLinks: boolean;  // Don't suggest existing connections
    focusOn: 'orphans' | 'all' | 'recent'; // What to prioritize
}

export class IntelligentBacklinkSystem {
    private app: App;
    private intelligentSearch: IntelligentSearchService;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private settings: any;

    constructor(
        app: App,
        intelligentSearch: IntelligentSearchService,
        embeddingManager: EmbeddingManager, 
        similarityEngine: SimilarityEngine,
        settings: any
    ) {
        this.app = app;
        this.intelligentSearch = intelligentSearch;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
        this.settings = settings;
    }

    /**
     * Generate high-quality backlink suggestions for a file or vault
     */
    async generateBacklinkSuggestions(
        targetFile?: TFile, 
        options: Partial<BacklinkOptions> = {}
    ): Promise<BacklinkSuggestion[]> {
        const opts: BacklinkOptions = {
            minConfidence: options.minConfidence || 0.75,
            maxSuggestionsPerFile: options.maxSuggestionsPerFile || 4,
            semanticThreshold: options.semanticThreshold || 0.65,
            respectExistingLinks: options.respectExistingLinks !== false,
            focusOn: options.focusOn || 'orphans',
            ...options
        };

        const startTime = Date.now();
        console.log(`🔗 BACKLINK: Generating suggestions with confidence >= ${opts.minConfidence}`);

        // Determine files to analyze
        const filesToAnalyze = targetFile 
            ? [targetFile]
            : await this.selectFilesForAnalysis(opts.focusOn);

        console.log(`🔗 BACKLINK: Analyzing ${filesToAnalyze.length} files for potential connections`);

        const allSuggestions: BacklinkSuggestion[] = [];

        for (const file of filesToAnalyze) {
            const fileSuggestions = await this.generateSuggestionsForFile(file, opts);
            allSuggestions.push(...fileSuggestions);

            // Progress indication for large operations
            if (allSuggestions.length % 10 === 0 && allSuggestions.length > 0) {
                console.log(`🔗 BACKLINK: Generated ${allSuggestions.length} suggestions so far...`);
            }
        }

        // Sort by confidence and limit total suggestions
        const topSuggestions = allSuggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, Math.min(50, filesToAnalyze.length * opts.maxSuggestionsPerFile));

        const duration = Date.now() - startTime;
        console.log(`🔗 BACKLINK: Generated ${topSuggestions.length} high-quality suggestions in ${duration}ms`);

        return topSuggestions;
    }

    /**
     * Generate backlink suggestions for a specific file
     */
    private async generateSuggestionsForFile(
        sourceFile: TFile, 
        options: BacklinkOptions
    ): Promise<BacklinkSuggestion[]> {
        const suggestions: BacklinkSuggestion[] = [];
        
        try {
            const sourceContent = await this.app.vault.read(sourceFile);
            if (sourceContent.length < 100) return []; // Skip very short files

            // Get existing links to avoid duplicates
            const existingLinks = options.respectExistingLinks 
                ? this.extractExistingLinks(sourceContent)
                : new Set<string>();

            // Strategy 1: Semantic similarity (highest quality)
            const semanticSuggestions = await this.findSemanticallySimilarFiles(
                sourceFile, sourceContent, existingLinks, options
            );
            suggestions.push(...semanticSuggestions);

            // Strategy 2: Title mentions (explicit references)
            const titleMentionSuggestions = await this.findTitleMentions(
                sourceFile, sourceContent, existingLinks, options
            );
            suggestions.push(...titleMentionSuggestions);

            // Strategy 3: Shared concepts/tags (contextual connections)
            const conceptSuggestions = await this.findSharedConcepts(
                sourceFile, sourceContent, existingLinks, options
            );
            suggestions.push(...conceptSuggestions);

        } catch (error) {
            console.warn(`🔗 BACKLINK: Error analyzing ${sourceFile.path}:`, error);
        }

        // Return top suggestions for this file
        return suggestions
            .filter(s => s.confidence >= options.minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, options.maxSuggestionsPerFile);
    }

    /**
     * Find semantically similar files using embeddings
     */
    private async findSemanticallySimilarFiles(
        sourceFile: TFile,
        sourceContent: string,
        existingLinks: Set<string>,
        options: BacklinkOptions
    ): Promise<BacklinkSuggestion[]> {
        const suggestions: BacklinkSuggestion[] = [];

        // Use intelligent search to find similar content
        const similarFiles = await this.intelligentSearch.search(
            this.extractKeyTerms(sourceContent), 
            {
                maxResults: 10,
                minRelevance: options.semanticThreshold,
                maxCandidates: 20
            }
        );

        for (const result of similarFiles) {
            // Skip self and existing links
            if (result.file.path === sourceFile.path) continue;
            if (existingLinks.has(result.file.basename)) continue;

            // Calculate contextual confidence
            const confidence = this.calculateSemanticConfidence(
                result.similarity,
                sourceContent,
                await this.app.vault.read(result.file),
                sourceFile,
                result.file
            );

            if (confidence >= options.minConfidence) {
                suggestions.push({
                    sourceFile,
                    targetFile: result.file,
                    confidence,
                    linkType: 'semantic',
                    context: result.relevantSnippet,
                    suggestedText: `[[${result.file.basename}]]`,
                    reason: `Semantically related content (${Math.round(result.similarity * 100)}% match)`
                });
            }
        }

        return suggestions;
    }

    /**
     * Find explicit mentions of other note titles
     */
    private async findTitleMentions(
        sourceFile: TFile,
        sourceContent: string,
        existingLinks: Set<string>,
        options: BacklinkOptions
    ): Promise<BacklinkSuggestion[]> {
        const suggestions: BacklinkSuggestion[] = [];
        const allFiles = this.app.vault.getMarkdownFiles();

        // Look for note titles mentioned in content
        for (const targetFile of allFiles) {
            if (targetFile.path === sourceFile.path) continue;
            if (existingLinks.has(targetFile.basename)) continue;

            const titleMentions = this.findTitleInContent(sourceContent, targetFile);
            
            for (const mention of titleMentions) {
                const confidence = this.calculateTitleMentionConfidence(
                    mention,
                    sourceContent,
                    sourceFile,
                    targetFile
                );

                if (confidence >= options.minConfidence) {
                    suggestions.push({
                        sourceFile,
                        targetFile,
                        confidence,
                        linkType: 'title-mention',
                        context: mention.context,
                        suggestedText: `[[${targetFile.basename}]]`,
                        reason: `Explicit mention of "${targetFile.basename}"`
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Find files sharing important concepts/tags
     */
    private async findSharedConcepts(
        sourceFile: TFile,
        sourceContent: string,
        existingLinks: Set<string>,
        options: BacklinkOptions
    ): Promise<BacklinkSuggestion[]> {
        const suggestions: BacklinkSuggestion[] = [];

        // Get source file tags and key concepts
        const sourceTags = this.extractTags(sourceFile);
        const sourceConcepts = this.extractKeyConcepts(sourceContent);

        if (sourceTags.length === 0 && sourceConcepts.length === 0) {
            return suggestions; // Nothing to match against
        }

        const allFiles = this.app.vault.getMarkdownFiles();

        for (const targetFile of allFiles) {
            if (targetFile.path === sourceFile.path) continue;
            if (existingLinks.has(targetFile.basename)) continue;

            const targetTags = this.extractTags(targetFile);
            const sharedTags = sourceTags.filter(tag => targetTags.includes(tag));

            if (sharedTags.length >= 2) { // Require at least 2 shared tags
                const confidence = this.calculateConceptConfidence(
                    sharedTags,
                    sourceTags,
                    targetTags,
                    sourceFile,
                    targetFile
                );

                if (confidence >= options.minConfidence) {
                    suggestions.push({
                        sourceFile,
                        targetFile,
                        confidence,
                        linkType: 'tag-shared',
                        context: `Shared tags: ${sharedTags.join(', ')}`,
                        suggestedText: `[[${targetFile.basename}]]`,
                        reason: `${sharedTags.length} shared tags: ${sharedTags.slice(0, 3).join(', ')}`
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Select which files to analyze based on strategy
     */
    private async selectFilesForAnalysis(focusOn: 'orphans' | 'all' | 'recent'): Promise<TFile[]> {
        const allFiles = this.app.vault.getMarkdownFiles();

        switch (focusOn) {
            case 'orphans':
                // Focus on files with few/no links
                const orphanFiles = [];
                for (const file of allFiles) {
                    const content = await this.app.vault.read(file);
                    const linkCount = (content.match(/\[\[.*?\]\]/g) || []).length;
                    if (linkCount <= 1) { // 0-1 links = likely orphan
                        orphanFiles.push(file);
                    }
                }
                return orphanFiles.slice(0, 30); // Limit for performance

            case 'recent':
                // Focus on recently modified files
                return allFiles
                    .sort((a, b) => b.stat.mtime - a.stat.mtime)
                    .slice(0, 20);

            case 'all':
            default:
                // Process all files (limited for performance)
                return allFiles.slice(0, 50);
        }
    }

    /**
     * Extract existing links from content to avoid duplicates
     */
    private extractExistingLinks(content: string): Set<string> {
        const linkPattern = /\[\[([^\]|]+)(\|[^\]]*)?\]\]/g;
        const links = new Set<string>();
        let match;

        while ((match = linkPattern.exec(content)) !== null) {
            links.add(match[1]); // Extract note title
        }

        return links;
    }

    /**
     * Extract key terms from content for semantic search
     */
    private extractKeyTerms(content: string): string {
        // Extract first paragraph and any headers
        const lines = content.split('\n');
        const keyLines = lines.filter(line => 
            line.startsWith('#') || // Headers
            (line.length > 50 && line.length < 200) // Substantial sentences
        );

        return keyLines.slice(0, 3).join(' '); // First few key lines
    }

    /**
     * Find mentions of a file title in content
     */
    private findTitleInContent(content: string, targetFile: TFile): Array<{context: string, position: number}> {
        const mentions = [];
        const title = targetFile.basename;
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();

        let pos = contentLower.indexOf(titleLower);
        while (pos !== -1) {
            // Extract context around the mention
            const start = Math.max(0, pos - 50);
            const end = Math.min(content.length, pos + title.length + 50);
            const context = content.slice(start, end);

            mentions.push({ context, position: pos });
            pos = contentLower.indexOf(titleLower, pos + 1);
        }

        return mentions;
    }

    /**
     * Calculate confidence for semantic similarity
     */
    private calculateSemanticConfidence(
        similarity: number,
        sourceContent: string,
        targetContent: string,
        sourceFile: TFile,
        targetFile: TFile
    ): number {
        let confidence = similarity;

        // Boost confidence for files in related folders
        if (this.areInRelatedFolders(sourceFile, targetFile)) {
            confidence += 0.1;
        }

        // Boost confidence for similar length/complexity
        const lengthRatio = Math.min(sourceContent.length, targetContent.length) / 
                           Math.max(sourceContent.length, targetContent.length);
        if (lengthRatio > 0.5) {
            confidence += 0.05;
        }

        return Math.min(confidence, 0.95); // Cap at 95%
    }

    /**
     * Calculate confidence for title mentions
     */
    private calculateTitleMentionConfidence(
        mention: {context: string, position: number},
        sourceContent: string,
        sourceFile: TFile,
        targetFile: TFile
    ): number {
        let confidence = 0.8; // Base confidence for explicit mentions

        // Check if it's in a meaningful context (not just a list)
        const context = mention.context.toLowerCase();
        if (context.includes('see also') || context.includes('related') || context.includes('about')) {
            confidence += 0.1;
        }

        // Reduce confidence if it's just in a title or list
        if (context.includes('#') || context.includes('-')) {
            confidence -= 0.2;
        }

        return Math.max(0.5, Math.min(confidence, 0.9));
    }

    /**
     * Calculate confidence for shared concepts
     */
    private calculateConceptConfidence(
        sharedTags: string[],
        sourceTags: string[],
        targetTags: string[],
        sourceFile: TFile,
        targetFile: TFile
    ): number {
        const sharedRatio = sharedTags.length / Math.max(sourceTags.length, targetTags.length);
        let confidence = sharedRatio * 0.7; // Base confidence from tag overlap

        // Boost for highly specific tags (longer tag names)
        const specificTags = sharedTags.filter(tag => tag.length > 8);
        if (specificTags.length > 0) {
            confidence += 0.1;
        }

        // Boost for files in same folder
        if (sourceFile.parent?.path === targetFile.parent?.path) {
            confidence += 0.1;
        }

        return Math.min(confidence, 0.85); // Cap at 85% for concept-based
    }

    /**
     * Check if files are in related folders
     */
    private areInRelatedFolders(file1: TFile, file2: TFile): boolean {
        const path1 = file1.parent?.path || '';
        const path2 = file2.parent?.path || '';

        // Same folder
        if (path1 === path2) return true;

        // Parent/child relationship
        if (path1.startsWith(path2) || path2.startsWith(path1)) return true;

        // Similar naming patterns
        const folder1 = path1.split('/').pop() || '';
        const folder2 = path2.split('/').pop() || '';
        if (folder1.toLowerCase().includes(folder2.toLowerCase()) || 
            folder2.toLowerCase().includes(folder1.toLowerCase())) {
            return true;
        }

        return false;
    }

    /**
     * Extract tags from file metadata
     */
    private extractTags(file: TFile): string[] {
        const cache = this.app.metadataCache.getFileCache(file);
        const tags = [];

        // Get tags from frontmatter
        if (cache?.frontmatter?.tags) {
            const frontmatterTags = Array.isArray(cache.frontmatter.tags) 
                ? cache.frontmatter.tags 
                : [cache.frontmatter.tags];
            tags.push(...frontmatterTags);
        }

        // Get inline tags
        if (cache?.tags) {
            tags.push(...cache.tags.map(t => t.tag.replace('#', '')));
        }

        return tags.filter(tag => tag && tag.length > 1);
    }

    /**
     * Extract key concepts from content (simplified)
     */
    private extractKeyConcepts(content: string): string[] {
        // Extract headers as concepts
        const headers = content.match(/^#{1,3}\s+(.+)$/gm) || [];
        return headers.map(h => h.replace(/^#+\s+/, '').toLowerCase());
    }

    /**
     * Apply suggested backlinks to files (with user confirmation)
     */
    async applyBacklinkSuggestions(suggestions: BacklinkSuggestion[]): Promise<number> {
        let appliedCount = 0;

        for (const suggestion of suggestions) {
            try {
                // Read current content
                const content = await this.app.vault.read(suggestion.sourceFile);
                
                // Add link at end of file with context
                const linkText = `\n\n## Related\n- ${suggestion.suggestedText} - ${suggestion.reason}`;
                const newContent = content + linkText;

                // Write back to file
                await this.app.vault.modify(suggestion.sourceFile, newContent);
                appliedCount++;

                console.log(`🔗 BACKLINK: Added link from ${suggestion.sourceFile.basename} to ${suggestion.targetFile.basename}`);

            } catch (error) {
                console.error(`🔗 BACKLINK: Error applying suggestion:`, error);
            }
        }

        return appliedCount;
    }
}