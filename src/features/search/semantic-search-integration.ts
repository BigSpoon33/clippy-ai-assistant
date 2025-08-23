/**
 * Semantic Search Integration for Obsidian
 * Extends default search with AI-powered semantic similarity
 */

import { App, TFile, Modal, Setting, Notice, FuzzySuggestModal, SuggestModal } from 'obsidian';
import { EmbeddingManager, ContentEmbedding } from '../knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../knowledge-management/semantic/similarity-engine';
import { IntelligentSearchService, IntelligentSearchResult, IntelligentSearchOptions } from '../knowledge-management/semantic/intelligent-search-service';

export interface SemanticSearchResult {
    file: TFile;
    title: string;
    content: string;
    relevantSnippet: string;
    similarity: number;
    embedding?: ContentEmbedding;
}

export interface SemanticSearchOptions {
    maxResults: number;
    minRelevance: number;
    searchMode: 'semantic' | 'hybrid' | 'traditional';
    includeContent: boolean;
    chunkSize: number;
}

/**
 * Modal for semantic search with real-time results
 */
export class SemanticSearchModal extends SuggestModal<SemanticSearchResult> {
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private intelligentSearch: IntelligentSearchService;
    private settings: any;
    private lastQuery: string = '';
    private searchResults: SemanticSearchResult[] = [];
    private searchOptions: SemanticSearchOptions;

    constructor(
        app: App, 
        embeddingManager: EmbeddingManager, 
        similarityEngine: SimilarityEngine,
        settings?: any
    ) {
        super(app);
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
        this.intelligentSearch = new IntelligentSearchService(app, embeddingManager, similarityEngine, settings);
        this.settings = settings;
        
        this.searchOptions = {
            maxResults: settings?.rag?.retrieval?.maxResults || 10,
            minRelevance: Math.min(settings?.rag?.retrieval?.minRelevanceScore || 0.1, 0.1), // Very low threshold for search
            searchMode: 'hybrid', // semantic + traditional
            includeContent: true,
            chunkSize: settings?.rag?.chunking?.chunkSize || 1000
        };

        this.setPlaceholder('🧠 Semantic search: Type to find notes by meaning...');
        this.setInstructions([
            { command: '↑↓', purpose: 'Navigate results' },
            { command: '↵', purpose: 'Open note' },
            { command: 'Ctrl/Cmd+↵', purpose: 'Open in new pane' },
            { command: 'Esc', purpose: 'Close search' }
        ]);
    }

    async getSuggestions(query: string): Promise<SemanticSearchResult[]> {
        query = query.trim();
        
        if (!query || query.length < 3) {
            return [];
        }

        // Avoid re-searching the same query
        if (query === this.lastQuery) {
            return this.searchResults;
        }

        this.lastQuery = query;
        console.log(`🔍 Semantic search query: "${query}"`);

        try {
            console.log(`🔍 UI: Starting intelligent search for "${query}"`);
            
            // Use the new intelligent search service
            const intelligentResults = await this.intelligentSearch.search(query, {
                maxResults: this.searchOptions.maxResults,
                minRelevance: this.searchOptions.minRelevance,
                maxCandidates: 30
            });

            // Convert to SemanticSearchResult format
            this.searchResults = intelligentResults.map(result => ({
                file: result.file,
                title: result.title,
                content: '',
                relevantSnippet: result.relevantSnippet,
                similarity: result.similarity
            }));

            console.log(`🔍 UI: Intelligent search returning ${this.searchResults.length} results to UI`);
            console.log(`🔍 UI: First result:`, this.searchResults[0]?.title || 'none');
            return this.searchResults;
        } catch (error) {
            console.error('🔍 UI: Intelligent search failed:', error);
            new Notice(`Intelligent search error: ${error.message}`);
            return [];
        }
    }

    renderSuggestion(result: SemanticSearchResult, el: HTMLElement): void {
        console.log(`🔍 UI: Rendering suggestion for ${result.title}`);
        el.empty();
        el.addClass('mod-complex');

        const container = el.createDiv({ cls: 'suggestion-content' });
        
        // Title with similarity score
        const titleEl = container.createDiv({ cls: 'suggestion-title' });
        titleEl.createSpan({ text: result.title });
        
        const scoreEl = titleEl.createSpan({ cls: 'suggestion-note' });
        scoreEl.setText(` (${Math.round(result.similarity * 100)}% match)`);
        scoreEl.style.color = this.getSimilarityColor(result.similarity);

        // Relevant snippet
        if (result.relevantSnippet) {
            const snippetEl = container.createDiv({ cls: 'suggestion-note' });
            snippetEl.setText(result.relevantSnippet);
            snippetEl.style.fontSize = '12px';
            snippetEl.style.color = 'var(--text-muted)';
            snippetEl.style.marginTop = '4px';
        }

        // File path
        const pathEl = container.createDiv({ cls: 'suggestion-aux' });
        pathEl.setText(result.file.path);
        pathEl.style.fontSize = '11px';
        pathEl.style.color = 'var(--text-faint)';
    }

    onChooseSuggestion(result: SemanticSearchResult, evt: MouseEvent | KeyboardEvent): void {
        const shouldOpenInNewPane = evt.ctrlKey || evt.metaKey;
        
        if (shouldOpenInNewPane) {
            this.app.workspace.openLinkText(result.file.path, '', true);
        } else {
            this.app.workspace.openLinkText(result.file.path, '');
        }
    }

    private async performSemanticSearch(query: string): Promise<SemanticSearchResult[]> {
        const results: SemanticSearchResult[] = [];
        
        console.log(`🔍 SEMANTIC: Starting search for "${query}" (threshold: ${this.searchOptions.minRelevance})`);
        
        // Generate embedding for search query
        const queryEmbedding = await this.embeddingManager.generateEmbedding(query);
        console.log(`🔍 SEMANTIC: Generated query embedding, dimensions: ${queryEmbedding.vector.length}`);
        
        // Get all markdown files, excluding irrelevant folders
        const allMarkdownFiles = this.app.vault.getMarkdownFiles();
        const markdownFiles = allMarkdownFiles.filter(file => {
            const path = file.path.toLowerCase();
            return !path.includes('node_modules') && 
                   !path.includes('.obsidian') && 
                   !path.includes('.git') &&
                   !path.includes('archive') &&
                   !path.includes('temp') &&
                   !path.startsWith('node_modules/') &&
                   !path.includes('/node_modules/') &&
                   !file.path.includes('.npm') &&
                   !file.path.includes('package-lock.json') &&
                   !file.path.includes('yarn.lock') &&
                   !path.includes('/venv/') &&
                   !path.includes('venv/') &&
                   !path.includes('/site-packages/') &&
                   !path.includes('upload.wikimedia.org') &&
                   !path.includes('/dist-info/');
        });
        console.log(`🔍 SEMANTIC: Found ${markdownFiles.length} relevant files (${allMarkdownFiles.length} total)`);
        const similarities: Array<{file: TFile, similarity: number, snippet: string}> = [];

        // Performance optimization: limit files and sort by recency
        const filesToProcess = markdownFiles
            .sort((a, b) => b.stat.mtime - a.stat.mtime) // Most recently modified first
            .slice(0, 30); // Process max 30 files for performance
            
        console.log(`🔍 SEMANTIC: Processing ${filesToProcess.length} most recent files for performance`);
        
        let processedCount = 0;
        const maxResults = 10; // Early termination when we have enough good results

        for (const file of filesToProcess) {
            // Early termination if we have enough good results
            const goodResults = similarities.filter(s => s.similarity >= 0.4).length;
            if (goodResults >= maxResults) {
                console.log(`🔍 SEMANTIC: Early termination - found ${goodResults} good results (>40% similarity)`);
                break;
            }
            
            processedCount++;
            try {
                const content = await this.app.vault.read(file);
                
                // Skip very short content
                if (content.length < 50) {
                    continue;
                }

                // Progress indicator
                if (processedCount % 5 === 0) {
                    console.log(`🔍 SEMANTIC: Processing file ${processedCount}/${filesToProcess.length}: ${file.basename}`);
                }

                // Simplified search: only full content (much faster than chunks)
                const contentEmbedding = await this.embeddingManager.generateEmbedding(content);
                const bestSimilarity = await this.similarityEngine.calculateSimilarity(queryEmbedding, contentEmbedding);
                const bestSnippet = this.extractBestSnippet(content, query);

                // Debug: log a few similarity scores to see what we're getting
                if (similarities.length < 3) {
                    console.log(`🔍 SEMANTIC: ${file.path} - Similarity: ${bestSimilarity.toFixed(3)} (threshold: ${this.searchOptions.minRelevance})`);
                }
                
                // Only log files that meet threshold to reduce spam
                if (bestSimilarity >= this.searchOptions.minRelevance) {
                    console.log(`🔍 SEMANTIC: ${file.path} - Similarity: ${bestSimilarity.toFixed(3)} ✅`);
                }
                
                if (bestSimilarity >= this.searchOptions.minRelevance) {
                    similarities.push({
                        file,
                        similarity: bestSimilarity,
                        snippet: bestSnippet
                    });
                }
            } catch (error) {
                console.warn(`Error processing ${file.path} for semantic search:`, error);
            }
        }

        // Sort by similarity and take top results
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, this.searchOptions.maxResults);

        // Convert to SemanticSearchResult format
        for (const result of topResults) {
            results.push({
                file: result.file,
                title: result.file.basename,
                content: '', // We can load this on demand
                relevantSnippet: result.snippet,
                similarity: result.similarity
            });
        }

        console.log(`🔍 SEMANTIC: Found ${similarities.length} matches, showing top ${topResults.length}`);
        console.log(`🎯 Found ${results.length} semantic matches for "${query}"`);
        
        if (results.length > 0) {
            console.log(`🔍 SEMANTIC: Results array:`, results.map(r => `${r.title} (${r.similarity.toFixed(3)})`));
        }
        
        if (results.length === 0) {
            console.log(`🔍 SEMANTIC: No results found! Threshold: ${this.searchOptions.minRelevance}, Files processed: ${markdownFiles.length}`);
        }
        
        return results;
    }


    private extractBestSnippet(content: string, query: string): string {
        // Try to find content around query terms
        const queryWords = query.toLowerCase().split(/\s+/);
        const sentences = content.split(/[.!?]+/);
        
        let bestSentence = '';
        let bestScore = 0;
        
        for (const sentence of sentences) {
            const lowerSentence = sentence.toLowerCase();
            let score = 0;
            
            for (const word of queryWords) {
                if (lowerSentence.includes(word)) {
                    score++;
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestSentence = sentence.trim();
            }
        }
        
        return bestSentence || this.truncateSnippet(content, 200);
    }

    private truncateSnippet(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        return (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated) + '...';
    }

    private getSimilarityColor(similarity: number): string {
        if (similarity >= 0.8) return 'var(--color-green)';
        if (similarity >= 0.6) return 'var(--color-yellow)';
        if (similarity >= 0.4) return 'var(--color-orange)';
        return 'var(--text-muted)';
    }
}

/**
 * Service for managing semantic search functionality
 */
export class SemanticSearchService {
    private app: App;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private settings: any;

    constructor(
        app: App,
        embeddingManager: EmbeddingManager,
        similarityEngine: SimilarityEngine,
        settings?: any
    ) {
        this.app = app;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
        this.settings = settings;
    }

    /**
     * Open semantic search modal
     */
    openSemanticSearch(): void {
        const modal = new SemanticSearchModal(
            this.app,
            this.embeddingManager,
            this.similarityEngine,
            this.settings
        );
        modal.open();
    }

    /**
     * Perform semantic search programmatically
     */
    async search(query: string, options?: Partial<SemanticSearchOptions>): Promise<SemanticSearchResult[]> {
        const modal = new SemanticSearchModal(
            this.app,
            this.embeddingManager,
            this.similarityEngine,
            this.settings
        );

        // Override options if provided
        if (options) {
            Object.assign(modal['searchOptions'], options);
        }

        // Set query and get results
        modal['lastQuery'] = query;
        
        return await modal['performSemanticSearch'](query);
    }
}