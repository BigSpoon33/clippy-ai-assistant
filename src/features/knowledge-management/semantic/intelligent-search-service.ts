/**
 * Intelligent Semantic Search Service
 * Combines tag analysis, keyword matching, and semantic search for optimal performance
 */

import { App, TFile, getAllTags, CachedMetadata } from 'obsidian';
import { EmbeddingManager, ContentEmbedding } from './embedding-manager';
import { SimilarityEngine } from './similarity-engine';

export interface IntelligentSearchOptions {
    maxResults?: number;
    minRelevance?: number;
    useTagFiltering?: boolean;
    useKeywordFiltering?: boolean;
    maxCandidates?: number;
}

export interface SearchCandidate {
    file: TFile;
    score: number;
    reason: string;
    tags?: string[];
    keywords?: string[];
}

export interface IntelligentSearchResult {
    file: TFile;
    title: string;
    similarity: number;
    relevantSnippet: string;
    matchReason: string;
}

export class IntelligentSearchService {
    private app: App;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private settings: any;

    // Cache for processed tag patterns
    private tagCache = new Map<string, string[]>();
    private lastTagAnalysis = 0;
    private readonly TAG_CACHE_DURATION = 60000; // 1 minute

    constructor(
        app: App, 
        embeddingManager: EmbeddingManager, 
        similarityEngine: SimilarityEngine, 
        settings: any
    ) {
        this.app = app;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
        this.settings = settings;
    }

    /**
     * Main intelligent search method - the one everyone should use
     */
    async search(query: string, options: IntelligentSearchOptions = {}): Promise<IntelligentSearchResult[]> {
        const startTime = Date.now();
        console.log(`🧠 INTELLIGENT SEARCH: Starting search for "${query}"`);

        const searchOptions = {
            maxResults: options.maxResults || 10,
            minRelevance: options.minRelevance || 0.1,
            useTagFiltering: options.useTagFiltering !== false,
            useKeywordFiltering: options.useKeywordFiltering !== false,
            maxCandidates: options.maxCandidates || 30,
            ...options
        };

        // Step 1: Get all markdown files
        const allFiles = this.app.vault.getMarkdownFiles();
        console.log(`🧠 INTELLIGENT: Processing ${allFiles.length} total files`);

        // Step 2: Multi-stage filtering to find candidates
        let candidates = await this.findCandidates(query, allFiles, searchOptions);
        console.log(`🧠 INTELLIGENT: Found ${candidates.length} candidates after filtering`);

        // Step 3: Semantic search on candidates only
        const results = await this.performSemanticSearch(query, candidates, searchOptions);
        
        const duration = Date.now() - startTime;
        console.log(`🧠 INTELLIGENT: Completed search in ${duration}ms, found ${results.length} results`);
        
        return results;
    }

    /**
     * Find candidate files using multiple filtering strategies
     */
    private async findCandidates(
        query: string, 
        files: TFile[], 
        options: IntelligentSearchOptions
    ): Promise<SearchCandidate[]> {
        const candidates = new Map<string, SearchCandidate>();

        // Strategy 1: Recent files (always include some recent files)
        await this.addRecentCandidates(files, candidates, 10);

        // Strategy 2: Keyword matching (filename, headers, content)
        if (options.useKeywordFiltering) {
            await this.addKeywordCandidates(query, files, candidates);
        }

        // Strategy 3: Smart tag matching (fuzzy, semantic)
        if (options.useTagFiltering) {
            await this.addTagCandidates(query, files, candidates);
        }

        // Strategy 4: Filename/path matching
        await this.addPathCandidates(query, files, candidates);

        // Convert to array and limit
        const candidateArray = Array.from(candidates.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, options.maxCandidates);

        return candidateArray;
    }

    /**
     * Add recently modified files as candidates
     */
    private async addRecentCandidates(files: TFile[], candidates: Map<string, SearchCandidate>, limit: number) {
        const recentFiles = files
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, limit);

        for (const file of recentFiles) {
            candidates.set(file.path, {
                file,
                score: 0.3, // Base score for recent files
                reason: 'recently modified',
                tags: await this.getFileTags(file)
            });
        }
    }

    /**
     * Add files that match keywords in title, headers, or content preview
     */
    private async addKeywordCandidates(query: string, files: TFile[], candidates: Map<string, SearchCandidate>) {
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        for (const file of files) {
            let score = 0;
            const matchedKeywords: string[] = [];

            // Check filename
            const filename = file.basename.toLowerCase();
            for (const word of queryWords) {
                if (filename.includes(word)) {
                    score += 0.5;
                    matchedKeywords.push(word);
                }
            }

            // Check content preview (first 500 chars)
            try {
                const content = await this.app.vault.read(file);
                const preview = content.substring(0, 500).toLowerCase();
                
                for (const word of queryWords) {
                    const matches = (preview.match(new RegExp(word, 'g')) || []).length;
                    if (matches > 0) {
                        score += Math.min(matches * 0.2, 0.8); // Cap contribution
                        if (!matchedKeywords.includes(word)) {
                            matchedKeywords.push(word);
                        }
                    }
                }
            } catch (error) {
                // Skip files we can't read
                continue;
            }

            if (score > 0) {
                const existing = candidates.get(file.path);
                const newScore = (existing?.score || 0) + score;
                
                candidates.set(file.path, {
                    file,
                    score: newScore,
                    reason: existing ? `${existing.reason}, keyword match` : 'keyword match',
                    tags: await this.getFileTags(file),
                    keywords: matchedKeywords
                });
            }
        }
    }

    /**
     * Add files with relevant tags (fuzzy matching)
     */
    private async addTagCandidates(query: string, files: TFile[], candidates: Map<string, SearchCandidate>) {
        // Get query-relevant tags using fuzzy matching
        const relevantTags = await this.findRelevantTags(query);
        console.log(`🧠 TAG MATCHING: Found ${relevantTags.length} relevant tags for "${query}"`);

        if (relevantTags.length === 0) return;

        for (const file of files) {
            const fileTags = await this.getFileTags(file);
            if (fileTags.length === 0) continue;

            let tagScore = 0;
            const matchedTags: string[] = [];

            for (const fileTag of fileTags) {
                for (const relevantTag of relevantTags) {
                    const similarity = this.calculateTagSimilarity(fileTag, relevantTag);
                    if (similarity > 0.3) { // Fuzzy threshold
                        tagScore += similarity;
                        matchedTags.push(fileTag);
                    }
                }
            }

            if (tagScore > 0) {
                const existing = candidates.get(file.path);
                const newScore = (existing?.score || 0) + tagScore;
                
                candidates.set(file.path, {
                    file,
                    score: newScore,
                    reason: existing ? `${existing.reason}, tag match` : 'tag match',
                    tags: fileTags,
                    keywords: existing?.keywords
                });
            }
        }
    }

    /**
     * Add files with matching paths/filenames
     */
    private async addPathCandidates(query: string, files: TFile[], candidates: Map<string, SearchCandidate>) {
        const queryWords = query.toLowerCase().split(/\s+/);
        
        for (const file of files) {
            const path = file.path.toLowerCase();
            let pathScore = 0;

            for (const word of queryWords) {
                if (path.includes(word)) {
                    pathScore += 0.3;
                }
            }

            if (pathScore > 0) {
                const existing = candidates.get(file.path);
                const newScore = (existing?.score || 0) + pathScore;
                
                candidates.set(file.path, {
                    file,
                    score: newScore,
                    reason: existing ? `${existing.reason}, path match` : 'path match',
                    tags: existing?.tags || await this.getFileTags(file),
                    keywords: existing?.keywords
                });
            }
        }
    }

    /**
     * Perform semantic search only on candidate files
     */
    private async performSemanticSearch(
        query: string, 
        candidates: SearchCandidate[], 
        options: IntelligentSearchOptions
    ): Promise<IntelligentSearchResult[]> {
        const results: IntelligentSearchResult[] = [];
        const queryEmbedding = await this.embeddingManager.generateEmbedding(query);

        console.log(`🧠 SEMANTIC: Processing ${candidates.length} candidates for semantic similarity`);

        for (const candidate of candidates) {
            try {
                const content = await this.app.vault.read(candidate.file);
                if (content.length < 50) continue;

                // Generate embedding for this candidate
                const contentEmbedding = await this.embeddingManager.generateEmbedding(content);
                const similarity = await this.similarityEngine.calculateSimilarity(queryEmbedding, contentEmbedding);

                if (similarity >= options.minRelevance) {
                    results.push({
                        file: candidate.file,
                        title: candidate.file.basename,
                        similarity: similarity,
                        relevantSnippet: this.extractSnippet(content, query),
                        matchReason: `${candidate.reason} (${Math.round(similarity * 100)}% semantic match)`
                    });
                }

                // Progress indication
                if (results.length % 5 === 0 && results.length > 0) {
                    console.log(`🧠 SEMANTIC: Processed ${results.length} candidates so far...`);
                }

            } catch (error) {
                console.warn(`Error processing candidate ${candidate.file.path}:`, error);
            }
        }

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, options.maxResults);
    }

    /**
     * Find tags relevant to the query using fuzzy matching
     */
    private async findRelevantTags(query: string): Promise<string[]> {
        const now = Date.now();
        
        // Check cache
        if (this.tagCache.has('all') && (now - this.lastTagAnalysis) < this.TAG_CACHE_DURATION) {
            const allTags = this.tagCache.get('all')!;
            return this.fuzzyMatchTags(query, allTags);
        }

        // Rebuild tag cache
        const allTags = new Set<string>();
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files.slice(0, 100)) { // Sample to avoid slowdown
            const tags = await this.getFileTags(file);
            tags.forEach(tag => allTags.add(tag));
        }

        // Filter out junk tags
        const cleanTags = Array.from(allTags).filter(tag => 
            tag.length > 1 && 
            !tag.match(/^#ref\d+$/) &&           // Remove #ref1, #ref2, etc.
            !tag.match(/^#cite/) &&              // Remove citation tags
            !tag.includes('device-table') &&     // Remove UI fragments
            !tag.match(/^#\s*$/)                 // Remove empty tags
        );

        this.tagCache.set('all', cleanTags);
        this.lastTagAnalysis = now;

        console.log(`🏷️  TAG CACHE: Found ${cleanTags.length} clean tags (filtered from ${allTags.size} total)`);
        
        return this.fuzzyMatchTags(query, cleanTags);
    }

    /**
     * Fuzzy match query against tags
     */
    private fuzzyMatchTags(query: string, tags: string[]): string[] {
        const queryWords = query.toLowerCase().split(/\s+/);
        const relevantTags: string[] = [];

        for (const tag of tags) {
            const tagLower = tag.toLowerCase().replace('#', '');
            let maxSimilarity = 0;

            for (const word of queryWords) {
                const similarity = this.calculateTagSimilarity(tagLower, word);
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }

            if (maxSimilarity > 0.4) { // Fuzzy threshold
                relevantTags.push(tag);
            }
        }

        return relevantTags.slice(0, 10); // Limit relevant tags
    }

    /**
     * Calculate similarity between two strings (for tag matching)
     */
    private calculateTagSimilarity(str1: string, str2: string): number {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();

        // Exact match
        if (str1 === str2 || str1.includes(str2) || str2.includes(str1)) {
            return 1.0;
        }

        // Simple character overlap ratio
        const chars1 = new Set(str1);
        const chars2 = new Set(str2);
        const intersection = new Set([...chars1].filter(c => chars2.has(c)));
        const union = new Set([...chars1, ...chars2]);
        
        return intersection.size / union.size;
    }

    /**
     * Get tags from a file (cached)
     */
    private async getFileTags(file: TFile): Promise<string[]> {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return [];

        const tags = getAllTags(cache) || [];
        return tags.filter(tag => tag && tag.length > 1); // Filter empty/short tags
    }

    /**
     * Extract relevant snippet from content
     */
    private extractSnippet(content: string, query: string): string {
        const queryWords = query.toLowerCase().split(/\s+/);
        const sentences = content.split(/[.!?]+/);
        
        let bestSentence = sentences[0] || content.substring(0, 200);
        let bestScore = 0;

        for (const sentence of sentences) {
            if (sentence.length < 20) continue;
            
            let score = 0;
            const sentenceLower = sentence.toLowerCase();
            
            for (const word of queryWords) {
                if (sentenceLower.includes(word)) {
                    score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestSentence = sentence.trim();
            }
        }

        return bestSentence.length > 200 
            ? bestSentence.substring(0, 200) + '...'
            : bestSentence;
    }
}