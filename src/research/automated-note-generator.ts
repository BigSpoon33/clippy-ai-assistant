import { App, TFile, Notice } from 'obsidian';
import { WebSearchEngine } from './web-search-engine';
import { DocumentParser } from './document-parser';
import { QualityRater } from './quality-rater';
import { TemplateEngine } from './template-engine';
import { ProjectTracker } from './project-tracker';

interface ChecklistItem {
    name: string;
    searchTerms?: string[];
    category?: string;
    priority: 'high' | 'medium' | 'low';
    personalReferences?: string[]; // File paths to check
}

export interface ResearchSource {
    type: 'web' | 'pdf' | 'note' | 'document';
    title: string;
    url?: string;
    filePath?: string;
    content: string;
    snippet?: string;
    qualityScore: number;
    relevanceScore: number;
    lastUpdated: Date;
    citations: string[];
}

interface GeneratedNote {
    title: string;
    content: string;
    tags: string[];
    links: string[];
    sources: ResearchSource[];
    metadata: {
        generated: Date;
        searchTerms: string[];
        qualityScore: number;
        completeness: number;
    };
}

export class AutomatedNoteGenerator {
    private app: App;
    private webSearchEngine: WebSearchEngine;
    private documentParser: DocumentParser;
    private qualityRater: QualityRater;
    private templateEngine: TemplateEngine;
    private projectTracker: ProjectTracker;

    constructor(app: App, projectTracker?: ProjectTracker) {
        this.app = app;
        this.webSearchEngine = new WebSearchEngine();
        this.documentParser = new DocumentParser(app);
        this.qualityRater = new QualityRater();
        this.templateEngine = new TemplateEngine(app);
        this.projectTracker = projectTracker || new ProjectTracker(app);
    }

    /**
     * Generate notes from a checklist of items.
     */
    async generateNotesFromChecklist(
        checklist: ChecklistItem[],
        options: GenerationOptions = {}
    ): Promise<GeneratedNote[]> {
        const results: GeneratedNote[] = [];
        const notice = new Notice(`🔍 Generating ${checklist.length} research notes...`, 0);

        // Create project tracking
        const projectId = await this.projectTracker.createProject(
            options.projectName || `Research Project ${new Date().toLocaleDateString()}`,
            options.projectDescription || 'Automated research note generation',
            checklist,
            options
        );

        try {
            for (let i = 0; i < checklist.length; i++) {
                const item = checklist[i];
                const itemId = `${projectId}-item-${i}`;
                
                notice.setMessage(`🔍 Researching ${item.name} (${i + 1}/${checklist.length})`);
                
                // Mark item as processing
                await this.projectTracker.markItemProcessing(projectId, itemId);
                
                try {
                    const generatedNote = await this.generateSingleNote(item, options);
                    results.push(generatedNote);
                    
                    // Save note to vault
                    let savedFile: TFile | undefined;
                    if (options.autoSave !== false) {
                        savedFile = await this.saveNoteToVault(generatedNote, options);
                    }

                    // Mark item as completed with project tracking
                    if (savedFile) {
                        await this.projectTracker.markItemCompleted(projectId, itemId, savedFile.path);
                    }

                } catch (itemError) {
                    console.error(`Error generating note for ${item.name}:`, itemError);
                    await this.projectTracker.markItemFailed(projectId, itemId, itemError.message);
                    // Continue with other items
                }

                // Rate limiting between requests
                await this.delay(options.delayBetweenRequests || 2000);
            }

            notice.hide();
            new Notice(`✅ Generated ${results.length} research notes successfully!`);
            return results;

        } catch (error) {
            notice.hide();
            console.error('Error generating notes:', error);
            new Notice(`❌ Error generating notes: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a single research note for a checklist item.
     */
    async generateSingleNote(
        item: ChecklistItem,
        options: GenerationOptions = {}
    ): Promise<GeneratedNote> {
        console.log(`🔍 Researching: ${item.name}`);

        // 1. Collect all research sources
        const sources = await this.gatherResearchSources(item, options);

        // 2. Rate and filter sources by quality
        const qualifiedSources = await this.filterAndRateSources(sources, options);

        // 3. Extract and synthesize information
        const synthesizedContent = await this.synthesizeInformation(
            item, 
            qualifiedSources, 
            options
        );

        // 4. Generate standardized note
        const generatedNote = await this.createStandardizedNote(
            item, 
            synthesizedContent, 
            qualifiedSources, 
            options
        );

        console.log(`✅ Generated note for: ${item.name}`);
        return generatedNote;
    }

    /**
     * Gather research sources from web search and personal documents.
     */
    private async gatherResearchSources(
        item: ChecklistItem,
        options: GenerationOptions
    ): Promise<ResearchSource[]> {
        const sources: ResearchSource[] = [];

        // 1. Web search using SearXNG/Tavily
        if (options.enableWebSearch !== false) {
            try {
                const webSources = await this.webSearchEngine.search(
                    item.name,
                    {
                        maxResults: options.maxWebResults || 10,
                        searchTerms: item.searchTerms || [item.name],
                        qualityFilter: true,
                        domains: options.preferredDomains
                    }
                );
                sources.push(...webSources);
            } catch (error) {
                console.warn(`Web search failed for ${item.name}:`, error);
            }
        }

        // 2. Search personal documents (PDFs, notes)
        if (options.enablePersonalSearch !== false) {
            try {
                const personalSources = await this.searchPersonalDocuments(item, options);
                sources.push(...personalSources);
            } catch (error) {
                console.warn(`Personal document search failed for ${item.name}:`, error);
            }
        }

        return sources;
    }

    /**
     * Search personal documents for relevant information.
     */
    private async searchPersonalDocuments(
        item: ChecklistItem,
        options: GenerationOptions
    ): Promise<ResearchSource[]> {
        const sources: ResearchSource[] = [];

        // Search PDFs
        const pdfFiles = this.app.vault.getFiles()
            .filter(file => file.extension === 'pdf');

        for (const pdfFile of pdfFiles) {
            try {
                const relevantContent = await this.documentParser.extractRelevantContent(
                    pdfFile,
                    item.name,
                    item.searchTerms || [item.name]
                );

                if (relevantContent && relevantContent.length > 0) {
                    sources.push({
                        type: 'pdf',
                        title: pdfFile.basename,
                        filePath: pdfFile.path,
                        content: relevantContent,
                        qualityScore: 0.8, // Personal documents get high base quality
                        relevanceScore: 0,
                        lastUpdated: new Date(pdfFile.stat.mtime),
                        citations: [`[[${pdfFile.basename}]]`]
                    });
                }
            } catch (error) {
                console.warn(`Error parsing PDF ${pdfFile.path}:`, error);
            }
        }

        // Search existing notes
        const markdownFiles = this.app.vault.getMarkdownFiles();
        for (const mdFile of markdownFiles) {
            if (this.isRelevantNote(mdFile, item)) {
                try {
                    const content = await this.app.vault.read(mdFile);
                    const relevantContent = this.extractRelevantSection(content, item.name);

                    if (relevantContent) {
                        sources.push({
                            type: 'note',
                            title: mdFile.basename,
                            filePath: mdFile.path,
                            content: relevantContent,
                            qualityScore: 0.9, // Existing notes are high quality
                            relevanceScore: 0,
                            lastUpdated: new Date(mdFile.stat.mtime),
                            citations: [`[[${mdFile.basename}]]`]
                        });
                    }
                } catch (error) {
                    console.warn(`Error reading note ${mdFile.path}:`, error);
                }
            }
        }

        return sources;
    }

    /**
     * Filter and rate sources by quality and relevance.
     */
    private async filterAndRateSources(
        sources: ResearchSource[],
        options: GenerationOptions
    ): Promise<ResearchSource[]> {
        const ratedSources: ResearchSource[] = [];

        for (const source of sources) {
            // Rate quality and relevance
            const qualityScore = await this.qualityRater.rateSourceQuality(source);
            const relevanceScore = await this.qualityRater.rateRelevance(source, options);

            source.qualityScore = qualityScore;
            source.relevanceScore = relevanceScore;

            // Filter by minimum thresholds
            const minQuality = options.minQualityScore || 0.6;
            const minRelevance = options.minRelevanceScore || 0.5;

            if (qualityScore >= minQuality && relevanceScore >= minRelevance) {
                ratedSources.push(source);
            }
        }

        // Sort by combined score and limit results
        return ratedSources
            .sort((a, b) => (b.qualityScore + b.relevanceScore) - (a.qualityScore + a.relevanceScore))
            .slice(0, options.maxSources || 15);
    }

    /**
     * Synthesize information from all sources into structured content.
     */
    private async synthesizeInformation(
        item: ChecklistItem,
        sources: ResearchSource[],
        options: GenerationOptions
    ): Promise<SynthesizedContent> {
        // Use AI to synthesize information from all sources
        const prompt = this.createSynthesisPrompt(item, sources, options);
        
        // Get AI provider from existing CLIPPY system
        const aiProvider = await this.getAIProvider();
        const synthesisResult = await aiProvider.generateResponse(prompt);

        return this.parseSynthesisResult(synthesisResult, sources);
    }

    /**
     * Create standardized note with proper formatting, tags, and links.
     */
    private async createStandardizedNote(
        item: ChecklistItem,
        content: SynthesizedContent,
        sources: ResearchSource[],
        options: GenerationOptions
    ): Promise<GeneratedNote> {
        // Generate note using template
        const noteContent = await this.templateEngine.generateNote({
            title: item.name,
            category: item.category || 'Research',
            content: content,
            sources: sources,
            template: options.noteTemplate || 'research-standard'
        });

        // Extract tags and links
        const tags = this.generateTags(item, content, options);
        const links = this.generateLinks(content, sources);

        return {
            title: item.name,
            content: noteContent,
            tags,
            links,
            sources,
            metadata: {
                generated: new Date(),
                searchTerms: item.searchTerms || [item.name],
                qualityScore: this.calculateOverallQuality(sources),
                completeness: this.calculateCompleteness(content, sources)
            }
        };
    }

    /**
     * Save generated note to vault with proper naming and organization.
     */
    private async saveNoteToVault(
        note: GeneratedNote,
        options: GenerationOptions
    ): Promise<TFile> {
        const fileName = this.generateFileName(note, options);
        const folderPath = options.outputFolder || 'Generated Notes';

        // Ensure folder exists
        await this.ensureFolderExists(folderPath);

        // Create full file path
        const filePath = `${folderPath}/${fileName}.md`;

        try {
            // Check if file already exists
            let finalPath = filePath;
            let counter = 1;
            while (this.app.vault.getAbstractFileByPath(finalPath)) {
                finalPath = `${folderPath}/${fileName} (${counter}).md`;
                counter++;
            }

            // Create the file
            const file = await this.app.vault.create(finalPath, note.content);
            console.log(`✅ Saved note: ${finalPath}`);
            return file;

        } catch (error) {
            console.error(`Error saving note ${filePath}:`, error);
            throw error;
        }
    }

    // Helper methods
    private isRelevantNote(file: TFile, item: ChecklistItem): boolean {
        const fileName = file.basename.toLowerCase();
        const itemName = item.name.toLowerCase();
        
        return fileName.includes(itemName) || 
               Boolean(item.searchTerms && item.searchTerms.some(term => 
                   fileName.includes(term.toLowerCase())
               ));
    }

    private extractRelevantSection(content: string, searchTerm: string): string | null {
        const lines = content.split('\n');
        const relevantLines: string[] = [];
        const searchTermLower = searchTerm.toLowerCase();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(searchTermLower)) {
                // Include context around the match
                const start = Math.max(0, i - 2);
                const end = Math.min(lines.length, i + 3);
                relevantLines.push(...lines.slice(start, end));
                break; // Take first match for now
            }
        }

        return relevantLines.length > 0 ? relevantLines.join('\n') : null;
    }

    private generateTags(
        item: ChecklistItem,
        content: SynthesizedContent,
        options: GenerationOptions
    ): string[] {
        const tags = ['research', 'auto-generated'];
        
        if (item.category) {
            tags.push(item.category.toLowerCase().replace(/\s+/g, '-'));
        }

        // Add content-based tags
        if (content.categories) {
            tags.push(...content.categories.map((cat: string) => cat.toLowerCase().replace(/\s+/g, '-')));
        }

        return [...new Set(tags)];
    }

    private generateLinks(content: SynthesizedContent, sources: ResearchSource[]): string[] {
        const links: string[] = [];

        // Add links to source notes
        sources.forEach(source => {
            if (source.type === 'note' || source.type === 'pdf') {
                links.push(...source.citations);
            }
        });

        return [...new Set(links)];
    }

    private generateFileName(note: GeneratedNote, options: GenerationOptions): string {
        const date = new Date().toISOString().split('T')[0];
        const cleanTitle = note.title.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
        
        if (options.includeDate !== false) {
            return `${date} - ${cleanTitle}`;
        }
        
        return cleanTitle;
    }

    private async ensureFolderExists(folderPath: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    private calculateOverallQuality(sources: ResearchSource[]): number {
        if (sources.length === 0) return 0;
        return sources.reduce((sum, source) => sum + source.qualityScore, 0) / sources.length;
    }

    private calculateCompleteness(content: SynthesizedContent, sources: ResearchSource[]): number {
        // Simple completeness heuristic based on content sections and source diversity
        const hasDescription = !!content.description;
        const hasUses = !!content.uses;
        const hasResearch = !!content.research;
        const hasWarnings = !!content.warnings;
        
        const contentScore = [hasDescription, hasUses, hasResearch, hasWarnings]
            .filter(Boolean).length / 4;
        
        const sourceScore = Math.min(sources.length / 5, 1); // Up to 5 sources = 100%
        
        return (contentScore + sourceScore) / 2;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async getAIProvider(): Promise<any> {
        // Get AI provider from existing CLIPPY system
        // This would integrate with the existing provider factory
        return null; // Placeholder
    }

    private createSynthesisPrompt(item: ChecklistItem, sources: ResearchSource[], options: GenerationOptions): string {
        return `Synthesize information about "${item.name}" from the following sources...`;
        // Detailed prompt implementation
    }

    private parseSynthesisResult(result: string, sources: ResearchSource[]): SynthesizedContent {
        // Parse AI synthesis result into structured content
        return {} as SynthesizedContent; // Placeholder
    }

    /**
     * Get the project tracker instance.
     */
    getProjectTracker(): ProjectTracker {
        return this.projectTracker;
    }
}

// Supporting interfaces
interface GenerationOptions {
    enableWebSearch?: boolean;
    enablePersonalSearch?: boolean;
    maxWebResults?: number;
    maxSources?: number;
    minQualityScore?: number;
    minRelevanceScore?: number;
    delayBetweenRequests?: number;
    autoSave?: boolean;
    outputFolder?: string;
    noteTemplate?: string;
    includeDate?: boolean;
    preferredDomains?: string[];
    projectName?: string;
    projectDescription?: string;
}

interface SynthesizedContent {
    description?: string;
    uses?: string[];
    research?: string;
    warnings?: string[];
    categories?: string[];
    keyPoints?: string[];
}