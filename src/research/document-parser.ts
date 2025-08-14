import { App, TFile } from 'obsidian';

interface ParsedContent {
    text: string;
    metadata: DocumentMetadata;
    sections: DocumentSection[];
    relevantExtracts: string[];
}

interface DocumentMetadata {
    title?: string;
    author?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount?: number;
    fileSize: number;
    language?: string;
}

interface DocumentSection {
    title: string;
    content: string;
    pageNumber?: number;
    relevanceScore: number;
}

export class DocumentParser {
    private app: App;
    private cache: Map<string, ParsedContent> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Extract relevant content from a document based on search terms.
     */
    async extractRelevantContent(
        file: TFile,
        mainTerm: string,
        searchTerms: string[]
    ): Promise<string | null> {
        try {
            const parsed = await this.parseDocument(file);
            if (!parsed) return null;

            const relevantSections = this.findRelevantSections(
                parsed,
                mainTerm,
                searchTerms
            );

            if (relevantSections.length === 0) return null;

            return this.formatRelevantContent(relevantSections, mainTerm);

        } catch (error) {
            console.error(`Error extracting content from ${file.path}:`, error);
            return null;
        }
    }

    /**
     * Parse a document based on its type.
     */
    async parseDocument(file: TFile): Promise<ParsedContent | null> {
        // Check cache first
        const cacheKey = `${file.path}-${file.stat.mtime}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        let parsed: ParsedContent | null = null;

        switch (file.extension.toLowerCase()) {
            case 'pdf':
                parsed = await this.parsePDF(file);
                break;
            case 'md':
            case 'markdown':
                parsed = await this.parseMarkdown(file);
                break;
            case 'txt':
                parsed = await this.parseTextFile(file);
                break;
            case 'docx':
                parsed = await this.parseDocx(file);
                break;
            case 'html':
            case 'htm':
                parsed = await this.parseHTML(file);
                break;
            default:
                console.warn(`Unsupported file type: ${file.extension}`);
                return null;
        }

        // Cache the result
        if (parsed) {
            this.cache.set(cacheKey, parsed);
        }

        return parsed;
    }

    /**
     * Parse PDF files (placeholder - would need PDF.js or similar in real implementation).
     */
    private async parsePDF(file: TFile): Promise<ParsedContent | null> {
        try {
            // For now, return a placeholder since PDF parsing requires additional libraries
            // In a real implementation, you would use PDF.js or a similar library
            console.warn('PDF parsing not fully implemented - would need PDF.js integration');
            
            return {
                text: `[PDF Content from ${file.basename} - PDF parsing requires additional setup]`,
                metadata: {
                    title: file.basename,
                    modificationDate: new Date(file.stat.mtime),
                    fileSize: file.stat.size
                },
                sections: [{
                    title: file.basename,
                    content: `[PDF Content from ${file.basename}]`,
                    relevanceScore: 0.5
                }],
                relevantExtracts: []
            };

        } catch (error) {
            console.error('PDF parsing error:', error);
            return null;
        }
    }

    /**
     * Parse Markdown files.
     */
    private async parseMarkdown(file: TFile): Promise<ParsedContent | null> {
        try {
            const content = await this.app.vault.read(file);
            const sections = this.extractMarkdownSections(content);
            const metadata = this.extractMarkdownMetadata(content, file);

            return {
                text: content,
                metadata,
                sections,
                relevantExtracts: []
            };

        } catch (error) {
            console.error('Markdown parsing error:', error);
            return null;
        }
    }

    /**
     * Parse plain text files.
     */
    private async parseTextFile(file: TFile): Promise<ParsedContent | null> {
        try {
            const content = await this.app.vault.read(file);
            const sections = this.extractTextSections(content);
            const metadata: DocumentMetadata = {
                title: file.basename,
                modificationDate: new Date(file.stat.mtime),
                fileSize: file.stat.size
            };

            return {
                text: content,
                metadata,
                sections,
                relevantExtracts: []
            };

        } catch (error) {
            console.error('Text file parsing error:', error);
            return null;
        }
    }

    /**
     * Parse DOCX files (placeholder).
     */
    private async parseDocx(file: TFile): Promise<ParsedContent | null> {
        console.warn('DOCX parsing not implemented - would need mammoth.js or similar');
        return null;
    }

    /**
     * Parse HTML files.
     */
    private async parseHTML(file: TFile): Promise<ParsedContent | null> {
        try {
            const content = await this.app.vault.read(file);
            const textContent = this.extractTextFromHTML(content);
            const sections = this.extractHTMLSections(content);
            
            const metadata: DocumentMetadata = {
                title: this.extractHTMLTitle(content) || file.basename,
                modificationDate: new Date(file.stat.mtime),
                fileSize: file.stat.size
            };

            return {
                text: textContent,
                metadata,
                sections,
                relevantExtracts: []
            };

        } catch (error) {
            console.error('HTML parsing error:', error);
            return null;
        }
    }

    /**
     * Extract sections from Markdown content.
     */
    private extractMarkdownSections(content: string): DocumentSection[] {
        const sections: DocumentSection[] = [];
        const lines = content.split('\n');
        let currentSection: DocumentSection | null = null;
        let currentContent: string[] = [];

        for (const line of lines) {
            // Check for headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                // Save previous section
                if (currentSection) {
                    currentSection.content = currentContent.join('\n').trim();
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: headerMatch[2],
                    content: '',
                    relevanceScore: 0
                };
                currentContent = [];
            } else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection) {
            currentSection.content = currentContent.join('\n').trim();
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Extract metadata from Markdown frontmatter.
     */
    private extractMarkdownMetadata(content: string, file: TFile): DocumentMetadata {
        const metadata: DocumentMetadata = {
            title: file.basename,
            modificationDate: new Date(file.stat.mtime),
            fileSize: file.stat.size
        };

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const lines = frontmatter.split('\n');

            for (const line of lines) {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    
                    switch (key.trim().toLowerCase()) {
                        case 'title':
                            metadata.title = value.replace(/['"]/g, '');
                            break;
                        case 'author':
                            metadata.author = value.replace(/['"]/g, '');
                            break;
                        case 'created':
                        case 'date':
                            const createdDate = new Date(value);
                            if (!isNaN(createdDate.getTime())) {
                                metadata.creationDate = createdDate;
                            }
                            break;
                    }
                }
            }
        }

        return metadata;
    }

    /**
     * Extract sections from plain text.
     */
    private extractTextSections(content: string): DocumentSection[] {
        // Simple paragraph-based sections for text files
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        return paragraphs.map((paragraph, index) => ({
            title: `Section ${index + 1}`,
            content: paragraph.trim(),
            relevanceScore: 0
        }));
    }

    /**
     * Extract text content from HTML.
     */
    private extractTextFromHTML(html: string): string {
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract sections from HTML based on headers.
     */
    private extractHTMLSections(html: string): DocumentSection[] {
        const sections: DocumentSection[] = [];
        
        // Simple regex-based extraction (would be better with a proper HTML parser)
        const headerPattern = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        let match;
        
        while ((match = headerPattern.exec(html)) !== null) {
            const level = parseInt(match[1]);
            const title = this.extractTextFromHTML(match[2]);
            
            sections.push({
                title,
                content: '', // Would need more sophisticated extraction
                relevanceScore: 0
            });
        }

        return sections;
    }

    /**
     * Extract title from HTML.
     */
    private extractHTMLTitle(html: string): string | null {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        return titleMatch ? this.extractTextFromHTML(titleMatch[1]) : null;
    }

    /**
     * Find sections relevant to search terms.
     */
    private findRelevantSections(
        parsed: ParsedContent,
        mainTerm: string,
        searchTerms: string[]
    ): DocumentSection[] {
        const allTerms = [mainTerm, ...searchTerms].map(term => term.toLowerCase());
        
        return parsed.sections
            .map(section => {
                const sectionText = (section.title + ' ' + section.content).toLowerCase();
                let relevanceScore = 0;
                
                // Calculate relevance based on term matches
                for (const term of allTerms) {
                    const matches = (sectionText.match(new RegExp(term, 'gi')) || []).length;
                    relevanceScore += matches * (term === mainTerm.toLowerCase() ? 2 : 1);
                }
                
                // Normalize by content length
                relevanceScore = relevanceScore / Math.max(sectionText.length / 100, 1);
                
                return {
                    ...section,
                    relevanceScore
                };
            })
            .filter(section => section.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5); // Top 5 most relevant sections
    }

    /**
     * Format relevant content for display.
     */
    private formatRelevantContent(sections: DocumentSection[], mainTerm: string): string {
        const formattedSections = sections.map(section => {
            let content = section.content;
            
            // Highlight the main term (simple approach)
            const regex = new RegExp(`(${mainTerm})`, 'gi');
            content = content.replace(regex, '**$1**');
            
            return `### ${section.title}\n\n${content}`;
        });

        return formattedSections.join('\n\n---\n\n');
    }

    /**
     * Clear cache to free memory.
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics.
     */
    getCacheStats(): { size: number; files: string[] } {
        return {
            size: this.cache.size,
            files: Array.from(this.cache.keys())
        };
    }
}