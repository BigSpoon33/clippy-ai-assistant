import { Notice } from 'obsidian';
import { ResearchSource } from './automated-note-generator';

interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    content?: string;
    domain: string;
    publishedDate?: Date;
    score?: number;
}

interface SearchOptions {
    maxResults: number;
    searchTerms: string[];
    qualityFilter: boolean;
    domains?: string[];
    language?: string;
    timeRange?: 'day' | 'week' | 'month' | 'year';
}

interface SearXNGConfig {
    baseUrl: string;
    engines?: string[];
    categories?: string[];
}

interface TavilyConfig {
    apiKey: string;
    includeAnswer?: boolean;
    includeImages?: boolean;
    searchDepth?: 'basic' | 'advanced';
}

export class WebSearchEngine {
    private searxngConfig: SearXNGConfig;
    private tavilyConfig?: TavilyConfig;
    private preferredEngine: 'searxng' | 'tavily' = 'searxng';

    constructor(
        searxngConfig: SearXNGConfig = { baseUrl: 'http://localhost:8888' },
        tavilyConfig?: TavilyConfig
    ) {
        this.searxngConfig = searxngConfig;
        this.tavilyConfig = tavilyConfig;
        
        // Use Tavily if API key is provided, otherwise SearXNG
        if (tavilyConfig?.apiKey) {
            this.preferredEngine = 'tavily';
        }
    }

    /**
     * Search the web for information about a topic.
     */
    async search(
        query: string,
        options: SearchOptions
    ): Promise<ResearchSource[]> {
        console.log(`🔍 Web searching: ${query}`);
        
        try {
            let results: WebSearchResult[];
            
            if (this.preferredEngine === 'tavily' && this.tavilyConfig) {
                results = await this.searchWithTavily(query, options);
            } else {
                results = await this.searchWithSearXNG(query, options);
            }

            // Convert to ResearchSource format
            const sources = await Promise.all(
                results.map(result => this.convertToResearchSource(result))
            );

            console.log(`✅ Found ${sources.length} web sources for: ${query}`);
            return sources.filter(source => source !== null) as ResearchSource[];

        } catch (error) {
            console.error('Web search failed:', error);
            new Notice(`⚠️ Web search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search using SearXNG instance.
     */
    private async searchWithSearXNG(
        query: string,
        options: SearchOptions
    ): Promise<WebSearchResult[]> {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            engines: this.searxngConfig.engines?.join(',') || 'google,duckduckgo,bing',
            categories: this.searxngConfig.categories?.join(',') || 'general',
            language: options.language || 'en',
            pageno: '1'
        });

        // Add time range if specified
        if (options.timeRange) {
            params.append('time_range', options.timeRange);
        }

        const url = `${this.searxngConfig.baseUrl}/search?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'CLIPPY-AI-Assistant/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`SearXNG search failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Invalid SearXNG response format');
        }

        return data.results
            .slice(0, options.maxResults)
            .map((result: any) => ({
                title: result.title || 'No title',
                url: result.url,
                snippet: result.content || result.snippet || '',
                domain: this.extractDomain(result.url),
                publishedDate: result.publishedDate ? new Date(result.publishedDate) : undefined,
                score: result.score || 0
            }))
            .filter((result: WebSearchResult) => this.isValidResult(result, options));
    }

    /**
     * Search using Tavily API.
     */
    private async searchWithTavily(
        query: string,
        options: SearchOptions
    ): Promise<WebSearchResult[]> {
        if (!this.tavilyConfig?.apiKey) {
            throw new Error('Tavily API key not configured');
        }

        const requestBody = {
            api_key: this.tavilyConfig.apiKey,
            query: query,
            search_depth: this.tavilyConfig.searchDepth || 'basic',
            include_answer: this.tavilyConfig.includeAnswer || false,
            include_images: this.tavilyConfig.includeImages || false,
            include_raw_content: true,
            max_results: Math.min(options.maxResults, 20), // Tavily max is 20
            include_domains: options.domains || undefined
        };

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Invalid Tavily response format');
        }

        return data.results.map((result: any) => ({
            title: result.title || 'No title',
            url: result.url,
            snippet: result.content || '',
            content: result.raw_content || result.content,
            domain: this.extractDomain(result.url),
            publishedDate: result.published_date ? new Date(result.published_date) : undefined,
            score: result.score || 0
        }))
        .filter((result: WebSearchResult) => this.isValidResult(result, options));
    }

    /**
     * Convert WebSearchResult to ResearchSource format.
     */
    private async convertToResearchSource(
        result: WebSearchResult
    ): Promise<ResearchSource | null> {
        try {
            // Fetch full content if not already available
            let content = result.content || result.snippet;
            
            if (!result.content && result.url) {
                try {
                    content = await this.fetchPageContent(result.url);
                } catch (error) {
                    console.warn(`Failed to fetch content from ${result.url}:`, error);
                    content = result.snippet; // Fallback to snippet
                }
            }

            return {
                type: 'web',
                title: result.title,
                url: result.url,
                content: content || '',
                qualityScore: this.calculateInitialQualityScore(result),
                relevanceScore: 0, // Will be calculated later
                lastUpdated: result.publishedDate || new Date(),
                citations: [this.formatWebCitation(result)]
            };
        } catch (error) {
            console.warn('Error converting search result:', error);
            return null;
        }
    }

    /**
     * Fetch full content from a web page.
     */
    private async fetchPageContent(url: string): Promise<string> {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'CLIPPY-AI-Assistant/1.0',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                // Add timeout
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            return this.extractTextFromHTML(html);

        } catch (error) {
            throw new Error(`Failed to fetch ${url}: ${error.message}`);
        }
    }

    /**
     * Extract readable text from HTML content.
     */
    private extractTextFromHTML(html: string): string {
        // Simple HTML text extraction
        // Remove scripts, styles, and other non-content elements
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();

        // Limit content length to avoid huge texts
        if (text.length > 5000) {
            text = text.substring(0, 5000) + '...';
        }

        return text;
    }

    /**
     * Calculate initial quality score for a web result.
     */
    private calculateInitialQualityScore(result: WebSearchResult): number {
        let score = 0.5; // Base score

        // Domain reputation (simplified)
        const trustedDomains = [
            'wikipedia.org', 'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov',
            'nature.com', 'science.org', 'sciencedirect.com',
            'mayoclinic.org', 'webmd.com', 'healthline.com',
            'who.int', 'cdc.gov', 'nih.gov'
        ];

        if (trustedDomains.some(domain => result.domain.includes(domain))) {
            score += 0.3;
        }

        // Content length indicator
        if (result.content && result.content.length > 500) {
            score += 0.1;
        }

        // Has publication date
        if (result.publishedDate) {
            score += 0.1;
        }

        // Recent content gets slight boost
        if (result.publishedDate) {
            const daysSincePublished = (Date.now() - result.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSincePublished < 365) { // Less than a year old
                score += 0.05;
            }
        }

        return Math.min(score, 1.0);
    }

    /**
     * Check if a search result meets quality criteria.
     */
    private isValidResult(result: WebSearchResult, options: SearchOptions): boolean {
        // Filter by domains if specified
        if (options.domains && options.domains.length > 0) {
            const matchesDomain = options.domains.some(domain => 
                result.domain.includes(domain)
            );
            if (!matchesDomain) return false;
        }

        // Basic quality filters
        if (!result.title || !result.url || !result.snippet) {
            return false;
        }

        // Filter out low-quality domains if quality filter enabled
        if (options.qualityFilter) {
            const lowQualityDomains = [
                'pinterest.com', 'facebook.com', 'twitter.com',
                'reddit.com', 'quora.com', 'answers.com'
            ];
            
            if (lowQualityDomains.some(domain => result.domain.includes(domain))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Format a web citation for the source.
     */
    private formatWebCitation(result: WebSearchResult): string {
        const date = result.publishedDate 
            ? result.publishedDate.toISOString().split('T')[0]
            : 'n.d.';
        
        return `[${result.title}](${result.url}) - ${result.domain} (${date})`;
    }

    /**
     * Extract domain from URL.
     */
    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Update search engine configuration.
     */
    updateConfig(searxngConfig?: SearXNGConfig, tavilyConfig?: TavilyConfig): void {
        if (searxngConfig) {
            this.searxngConfig = { ...this.searxngConfig, ...searxngConfig };
        }
        
        if (tavilyConfig) {
            this.tavilyConfig = { ...this.tavilyConfig, ...tavilyConfig };
            this.preferredEngine = 'tavily';
        }
    }

    /**
     * Test search engine connectivity.
     */
    async testConnection(): Promise<{ searxng: boolean; tavily: boolean; errors?: { searxng?: string; tavily?: string } }> {
        const results: { searxng: boolean; tavily: boolean; errors: { searxng?: string; tavily?: string } } = { 
            searxng: false, 
            tavily: false, 
            errors: {} 
        };

        // Test SearXNG
        try {
            // Try CORS-enabled request first
            let response;
            
            try {
                response = await fetch(`${this.searxngConfig.baseUrl}/search?q=test&format=json&engines=duckduckgo`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                results.searxng = response.ok;
                if (!response.ok) {
                    results.errors.searxng = `HTTP ${response.status}: ${response.statusText}`;
                }
            } catch (corsError) {
                // If CORS error, try no-cors mode to at least check if service is reachable
                if (corsError.message.includes('CORS') || corsError.message.includes('Failed to fetch')) {
                    try {
                        await fetch(`${this.searxngConfig.baseUrl}/`, {
                            method: 'GET',
                            mode: 'no-cors', // This bypasses CORS but gives opaque response
                            signal: AbortSignal.timeout(5000)
                        });
                        
                        // If no-cors succeeds, service is running but CORS is blocking
                        results.searxng = false; // Can't use for actual searches due to CORS
                        results.errors.searxng = 'Service running but CORS blocked. See settings for CORS configuration.';
                    } catch (noCorsError) {
                        // Service not reachable at all
                        results.errors.searxng = 'Cannot connect - check if SearXNG is running and URL is correct';
                    }
                } else {
                    throw corsError; // Re-throw non-CORS errors
                }
            }
        } catch (error) {
            console.warn('SearXNG connection test failed:', error);
            if (error.name === 'AbortError') {
                results.errors.searxng = 'Connection timeout - check if SearXNG is running';
            } else if (error.message.includes('CORS')) {
                results.errors.searxng = 'CORS blocked - see settings for configuration help';
            } else if (error.message.includes('fetch')) {
                results.errors.searxng = 'Cannot connect - check URL and network connectivity';
            } else {
                results.errors.searxng = error.message;
            }
        }

        // Test Tavily
        if (this.tavilyConfig?.apiKey) {
            try {
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(10000), // 10 second timeout
                    body: JSON.stringify({
                        api_key: this.tavilyConfig.apiKey,
                        query: 'test',
                        max_results: 1
                    })
                });
                results.tavily = response.ok;
                if (!response.ok) {
                    results.errors!.tavily = `HTTP ${response.status}: ${response.statusText}`;
                }
            } catch (error) {
                console.warn('Tavily connection test failed:', error);
                if (error.name === 'AbortError') {
                    results.errors!.tavily = 'Connection timeout';
                } else {
                    results.errors!.tavily = error.message;
                }
            }
        }

        return results;
    }
}