import { App, TFile, Notice, MarkdownView } from 'obsidian';
import { WebSearchEngine } from './web-search-engine';
import { DocumentParser } from './document-parser';
import { QualityRater } from './quality-rater';
import { ProjectTracker } from './project-tracker';
import { RAGSystem } from '../features/knowledge-management/rag/rag-architecture';
import { SubagentCoordinator } from '../agents/subagent-system';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';
import { ValidationHelper, ChecklistItemSchema, ExtractedWisdomSchema } from '../schemas/research-schemas';
import { AutoTagger, TagSuggestion } from '../features/content-processing/processors/auto-tagger';
import { 
    processThinkingTags, 
    sanitizeFileName, 
    replacePlaceholder, 
    extractFrontmatter,
    replaceFrontmatter,
    delay,
    escapeRegex,
    ProgressTracker 
} from '../utils/shared-utilities';
import { ClippyErrorBoundaries } from '../utils/error-boundaries';

// Import types
import { VaultPatterns } from '../types';

interface ChecklistItem {
    name: string;
    id: string;
    completed: boolean;
    researchNoteFile?: TFile;
}

interface VaultNote {
    file: TFile;
    relevantSections: string[];
    similarity: number;
}

interface WebSearchNote {
    file: TFile;
    url: string;
    content: string;
    title: string;
    domain: string;
}

interface ExtractedWisdom {
    keyFacts: string[];
    definitions: string[];
    uses: string[];
    warnings: string[];
    researchFindings: string[];
    relatedConcepts: string[];
    sources: string[];
}

export class ComprehensiveResearchSystem {
    private app: App;
    private plugin: any; // ClippyPlugin reference for AI access
    private webSearchEngine: WebSearchEngine;
    private documentParser: DocumentParser;
    private qualityRater: QualityRater;
    private projectTracker: ProjectTracker;
    private ragSystem: RAGSystem;
    private subagentCoordinator: SubagentCoordinator;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;
    private autoTagger: AutoTagger;

    constructor(app: App, plugin?: any) {
        this.app = app;
        this.plugin = plugin;
        this.webSearchEngine = new WebSearchEngine(); // Will be reconfigured in processResearchChecklist
        this.documentParser = new DocumentParser(app);
        this.qualityRater = new QualityRater();
        
        // Use shared project tracker from plugin if available, otherwise create new one
        this.projectTracker = plugin?.projectTracker || new ProjectTracker(app);
        
        // Use shared embedding/similarity/RAG systems if available, otherwise create new ones
        this.embeddingManager = plugin?.embeddingManager || new EmbeddingManager(
            plugin?.settings?.rag?.embeddings?.ollamaUrl, 
            plugin?.settings
        );
        this.similarityEngine = plugin?.similarityEngine || new SimilarityEngine(this.embeddingManager);
        this.ragSystem = plugin?.ragSystem || new RAGSystem(this.embeddingManager, this.similarityEngine, this.qualityRater);
        
        if (plugin && plugin.aiProvider) {
            this.subagentCoordinator = new SubagentCoordinator(plugin.aiProvider, this.ragSystem, plugin);
            
            // Initialize AutoTagger for research note tagging using shared vault patterns
            const vaultPatterns = plugin.vaultPatterns || {
                tagPatterns: [],
                dateFormats: [],
                cssClasses: [],
                frontmatterSchemas: [],
                wikilinkPatterns: []
            };
            this.autoTagger = new AutoTagger(plugin.aiProvider, vaultPatterns);
        }
    }

    /**
     * Continue research for unfinished items in an existing project
     */
    async continueProjectResearch(
        projectId: string,
        options: any = {},
        onProgress?: (progress: { current: number; total: number; percentage: number; message: string }) => void
    ): Promise<void> {
        const project = this.projectTracker.getProject(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        // Find unfinished items
        const unfinishedItems = project.checklist.filter(item => 
            item.status === 'pending' || item.status === 'failed'
        );

        if (unfinishedItems.length === 0) {
            console.log('✅ No unfinished items in project');
            return;
        }

        console.log(`🔄 Continuing research for ${unfinishedItems.length} unfinished items`);

        // Configure WebSearchEngine with plugin settings (API configuration is global)
        const pluginSettings = this.plugin.settings;
        const searxngConfig = {
            baseUrl: pluginSettings.research?.searchEngine?.searxngUrl || 'http://localhost:8081'
        };
        const tavilyConfig = pluginSettings.research?.searchEngine?.tavilyApiKey ? {
            apiKey: pluginSettings.research?.searchEngine?.tavilyApiKey
        } : undefined;

        this.webSearchEngine = new WebSearchEngine(searxngConfig, tavilyConfig);

        // Research each unfinished item - continue until ALL are complete or manually paused
        for (let i = 0; i < unfinishedItems.length; i++) {
            const item = unfinishedItems[i];
            
            // Check for pause before processing each item (including the first)
            const currentProject = this.projectTracker.getProject(projectId);
            if (currentProject?.status === 'paused') {
                console.log(`⏸️ Project manually paused, stopping research after completing ${i} items: ${project.name}`);
                break;
            }
            
            // For first item, ensure project status is 'processing' if it's not paused
            if (i === 0 && currentProject && currentProject.status !== 'processing') {
                console.log(`🔄 Setting project status to processing: ${project.name}`);
                currentProject.status = 'processing';
                await this.projectTracker.saveProjects();
            }
            
            try {
                // Mark item as processing
                await this.projectTracker.markItemProcessing(projectId, item.id);
                
                // Check if note already exists, create if not
                let noteFile: TFile;
                const notePath = `${project.outputFolder}/${this.sanitizeFileName(item.name)}.md`;
                
                const existingFile = this.app.vault.getAbstractFileByPath(notePath);
                if (existingFile instanceof TFile) {
                    noteFile = existingFile;
                } else {
                    // Create new note using the project's template settings
                    const templateOptions = {
                        customTemplate: project.settings.customTemplate !== 'research-standard' ? project.settings.customTemplate : undefined,
                        projectName: project.name
                    };
                    const content = this.generateBlankResearchTemplate(item, templateOptions);
                    noteFile = await this.app.vault.create(notePath, content);
                    console.log(`📄 Created new research note: ${notePath}`);
                }
                
                // Perform comprehensive research using project settings
                const researchOptions = {
                    ...options,
                    outputFolder: project.settings.outputFolder,
                    enableWebSearch: project.settings.enableWebSearch,
                    saveIndividualPages: project.settings.saveIndividualPages,
                    searchVaultExactWords: project.settings.searchVaultExactWords,
                    enableSemanticSearch: project.settings.enableSemanticSearch,
                    aiEnhanceFinalNote: project.settings.aiEnhanceFinalNote,
                    maxWebSearchResults: project.settings.maxWebSearchResults,
                    customTemplate: project.settings.customTemplate,
                    searxngUrl: project.settings.searxngUrl,
                    tavilyApiKey: project.settings.tavilyApiKey
                };
                
                await this.comprehensiveResearch(
                    item,
                    noteFile,
                    researchOptions,
                    undefined,
                    onProgress,
                    i
                );
                
                // Mark item as completed
                await this.projectTracker.markItemCompleted(projectId, item.id, notePath);
                console.log(`✅ Completed research for: ${item.name} (${i + 1}/${unfinishedItems.length})`);
                
                // Report progress
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: unfinishedItems.length,
                        percentage: Math.round(((i + 1) / unfinishedItems.length) * 100),
                        message: `Completed: ${item.name}`
                    });
                }
                
            } catch (error) {
                console.error(`❌ Failed research for ${item.name}:`, error);
                await this.projectTracker.markItemFailed(projectId, item.id, error.message);
            }
        }

        console.log(`🎉 Continued research completed for project: ${project.name}`);
    }

    /**
     * Main research process: Create notes, find unchecked items, research them comprehensively.
     */
    async processResearchChecklist(
        checklist: ChecklistItem[],
        options: any = {},
        onProgress?: (progress: { current: number; total: number; percentage: number; message: string }) => void
    ): Promise<void> {
        // Configure WebSearchEngine with proper settings
        const searxngConfig = {
            baseUrl: options.searxngUrl || 'http://localhost:8081'
        };
        const tavilyConfig = options.tavilyApiKey ? {
            apiKey: options.tavilyApiKey
        } : undefined;

        this.webSearchEngine = new WebSearchEngine(searxngConfig, tavilyConfig);
        
        console.log(`🔧 Configured web search engine: ${options.searchEngine || 'searxng'} (${tavilyConfig ? 'Tavily will be used' : 'SearXNG will be used'})`);

        // Generate meaningful project name from checklist items
        const projectName = this.generateProjectName(checklist);
        
        const projectId = await this.projectTracker.createProject(
            projectName,
            'Systematic research with vault analysis and web search',
            checklist,
            options
        );

        console.log(`🔬 Starting comprehensive research for ${checklist.length} items`);

        // Initialize progress tracking
        const totalSteps = checklist.length * 5 + 1; // Each item has 5 steps + initial setup
        const progressTracker = new ProgressTracker(totalSteps);
        
        // Setup progress callback
        progressTracker.onProgress((progress) => {
            if (onProgress) {
                onProgress({
                    ...progress,
                    message: `Research Progress: ${progress.current}/${progress.total} steps completed`
                });
            }
        });

        // Report initial progress
        progressTracker.increment();
        onProgress?.({
            current: 1,
            total: totalSteps,
            percentage: (1 / totalSteps) * 100,
            message: "Initializing comprehensive research system..."
        });

        // Step 1: Create blank research notes with template for each item
        onProgress?.({
            current: 1,
            total: totalSteps,
            percentage: (1 / totalSteps) * 100,
            message: "Creating blank research notes..."
        });
        const researchNotes = await this.createBlankResearchNotes(checklist, options, progressTracker, onProgress);

        // Step 2: Process each unchecked item systematically
        for (let i = 0; i < checklist.length; i++) {
            const item = checklist[i];
            
            if (!item.completed) {
                console.log(`\n📋 Processing unchecked item: ${item.name}`);
                
                onProgress?.({
                    current: 1 + (i * 5) + 1,
                    total: totalSteps,
                    percentage: ((1 + (i * 5) + 1) / totalSteps) * 100,
                    message: `Processing item ${i + 1}/${checklist.length}: ${item.name}`
                });
                
                const itemId = `${projectId}-item-${i}`;
                await this.projectTracker.markItemProcessing(projectId, itemId);

                try {
                    await this.comprehensiveResearch(item, researchNotes[i], options, progressTracker, onProgress, i);
                    
                    // Mark as completed
                    item.completed = true;
                    await this.projectTracker.markItemCompleted(projectId, itemId, researchNotes[i].path);
                    
                    console.log(`✅ Completed research for: ${item.name}`);
                    
                    onProgress?.({
                        current: 1 + ((i + 1) * 5),
                        total: totalSteps,
                        percentage: ((1 + ((i + 1) * 5)) / totalSteps) * 100,
                        message: `✅ Completed ${i + 1}/${checklist.length}: ${item.name}`
                    });
                    
                } catch (error) {
                    console.error(`❌ Failed research for ${item.name}:`, error);
                    await this.projectTracker.markItemFailed(projectId, itemId, error.message);
                    
                    onProgress?.({
                        current: 1 + ((i + 1) * 5),
                        total: totalSteps,
                        percentage: ((1 + ((i + 1) * 5)) / totalSteps) * 100,
                        message: `❌ Failed ${i + 1}/${checklist.length}: ${item.name}`
                    });
                }

                // Rate limiting
                await this.delay(2000);
            }
        }

        new Notice(`🎉 Comprehensive research completed for all items!`);
    }

    /**
     * Step 1: Create blank research notes with comprehensive template.
     */
    private async createBlankResearchNotes(
        checklist: ChecklistItem[],
        options: any,
        progressTracker?: ProgressTracker,
        onProgress?: (progress: { current: number; total: number; percentage: number; message: string }) => void
    ): Promise<TFile[]> {
        const notes: TFile[] = [];
        const outputFolder = options.outputFolder || 'Generated Research Notes';

        // Ensure folder exists
        await this.ensureFolderExists(outputFolder);

        for (const item of checklist) {
            const fileName = this.sanitizeFileName(item.name);
            const filePath = `${outputFolder}/${fileName}.md`;
            
            const template = this.generateBlankResearchTemplate(item, options);
            
            try {
                // Check if file already exists
                let finalPath = filePath;
                let counter = 1;
                while (this.app.vault.getAbstractFileByPath(finalPath)) {
                    finalPath = `${outputFolder}/${fileName} (${counter}).md`;
                    counter++;
                }

                const file = await this.app.vault.create(finalPath, template);
                notes.push(file);
                item.researchNoteFile = file;
                
                console.log(`📝 Created blank research note: ${finalPath}`);
                
                // Update progress for each note created
                if (progressTracker) {
                    progressTracker.increment();
                }
            } catch (error) {
                console.error(`Error creating note for ${item.name}:`, error);
                throw error;
            }
        }

        return notes;
    }

    /**
     * Step 2: Comprehensive research for a single item.
     */
    private async comprehensiveResearch(
        item: ChecklistItem,
        noteFile: TFile,
        options: any,
        progressTracker?: ProgressTracker,
        onProgress?: (progress: { current: number; total: number; percentage: number; message: string }) => void,
        itemIndex?: number
    ): Promise<void> {
        console.log(`🔍 Starting comprehensive research for: ${item.name}`);
        const baseProgress = itemIndex !== undefined ? 1 + (itemIndex * 5) : 0;

        // Step 2a: Search vault for notes containing exact words
        onProgress?.({
            current: baseProgress + 1,
            total: progressTracker?.getProgress().total || 100,
            percentage: ((baseProgress + 1) / (progressTracker?.getProgress().total || 100)) * 100,
            message: `Searching vault for: ${item.name}`
        });
        const vaultNotes = await this.findVaultNotesWithExactWords(item.name, options);
        console.log(`📚 Found ${vaultNotes.length} vault notes with exact words`);
        progressTracker?.increment();

        // Step 2b: Perform web search and save each page as unique note
        onProgress?.({
            current: baseProgress + 2,
            total: progressTracker?.getProgress().total || 100,
            percentage: ((baseProgress + 2) / (progressTracker?.getProgress().total || 100)) * 100,
            message: `Performing web search for: ${item.name}`
        });
        let webSearchNotes: WebSearchNote[] = [];
        try {
            webSearchNotes = await this.performWebSearchAndSavePages(item.name, options, onProgress);
            console.log(`🌐 Created ${webSearchNotes.length} web search notes`);
        } catch (error) {
            console.warn(`⚠️ Web search failed for "${item.name}": ${error.message}`);
            console.log(`📚 Continuing research with vault notes only (${vaultNotes.length} found)`);
            // Continue without web search - vault research can still be valuable
        }
        progressTracker?.increment();

        // Step 2c: Parse and extract wisdom from all sources
        onProgress?.({
            current: baseProgress + 3,
            total: progressTracker?.getProgress().total || 100,
            percentage: ((baseProgress + 3) / (progressTracker?.getProgress().total || 100)) * 100,
            message: `Extracting wisdom from ${vaultNotes.length + webSearchNotes.length} sources`
        });
        const extractedWisdom = await this.extractWisdomFromAllSources(
            item.name,
            vaultNotes,
            webSearchNotes,
            options
        );
        progressTracker?.increment();

        // Step 2d: Update the research note with extracted wisdom
        onProgress?.({
            current: baseProgress + 4,
            total: progressTracker?.getProgress().total || 100,
            percentage: ((baseProgress + 4) / (progressTracker?.getProgress().total || 100)) * 100,
            message: `Updating research note with AI-generated content`
        });
        await this.updateResearchNoteWithWisdom(noteFile, item, extractedWisdom, vaultNotes, webSearchNotes);
        progressTracker?.increment();

        // Step 2e: Enhance the note using AI
        onProgress?.({
            current: baseProgress + 5,
            total: progressTracker?.getProgress().total || 100,
            percentage: ((baseProgress + 5) / (progressTracker?.getProgress().total || 100)) * 100,
            message: `Enhancing research note for: ${item.name}`
        });
        await this.enhanceResearchNote(noteFile, options);
        progressTracker?.increment();

        console.log(`✨ Comprehensive research completed for: ${item.name}`);
    }

    /**
     * Generate comprehensive blank research template.
     */
    private generateBlankResearchTemplate(item: ChecklistItem, options: any = {}): string {
        const today = new Date().toISOString().split('T')[0];
        
        // Use custom template if provided
        if (options.customTemplate) {
            return this.processCustomTemplate(options.customTemplate, item, today);
        }
        
        return `---
project: "${options.projectName || 'Default Research Project'}"
status: "in-progress"
created: "${today}"
updated: "${today}"
quality: "pending"
clippy_id: "${item.id}"
tags:
  - research/general
---

# 🔬 ${item.name}

## 📊 Research Status
- [ ] Vault notes analyzed
- [ ] Web search completed  
- [ ] Wisdom extracted
- [ ] Note enhanced
- [ ] Research completed

## 📖 Overview
*[This section will be filled with comprehensive overview]*

## 🔍 Key Definitions
*[Essential definitions and terminology]*

## 📚 Vault References
*[Links to related notes in your vault]*

## 🌐 Web Search Sources
*[Links to web search result notes]*

## 💡 Key Facts & Findings
*[Important facts extracted from all sources]*

## 🎯 Uses & Applications
*[Practical uses and applications]*

## ⚠️ Warnings & Precautions
*[Important safety information and warnings]*

## 🔬 Research Findings
*[Scientific research and evidence]*

## 🔗 Related Concepts
*[Connected ideas and concepts]*

## 📋 Sources
*[Comprehensive source list with links]*

## 🎓 Extracted Wisdom Summary
*[AI-enhanced synthesis of all information]*

---
*🤖 Generated by CLIPPY AI Assistant - Comprehensive Research System*
*📅 Created: ${today}*
*🔄 Status: Processing*
`;
    }

    /**
     * Process custom template with variable substitution.
     */
    private processCustomTemplate(template: string, item: ChecklistItem, today: string): string {
        return template
            .replace(/\{\{title\}\}/g, item.name)
            .replace(/\{\{item\.name\}\}/g, item.name)
            .replace(/\{\{item\.id\}\}/g, item.id)
            .replace(/\{\{today\}\}/g, today)
            .replace(/\{\{date\}\}/g, today)
            .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
            .replace(/\{\{research\.status\}\}/g, `- [ ] Vault notes analyzed
- [ ] Web search completed  
- [ ] Wisdom extracted
- [ ] Note enhanced
- [ ] Research completed`)
            .replace(/\{\{vault\.references\}\}/g, '*[Links to related notes in your vault]*')
            .replace(/\{\{web\.sources\}\}/g, '*[Links to web search result notes]*')
            .replace(/\{\{overview\}\}/g, '*[This section will be filled with comprehensive overview]*')
            .replace(/\{\{definitions\}\}/g, '*[Essential definitions and terminology]*')
            .replace(/\{\{facts\}\}/g, '*[Important facts extracted from all sources]*')
            .replace(/\{\{uses\}\}/g, '*[Practical uses and applications]*')
            .replace(/\{\{warnings\}\}/g, '*[Important safety information and warnings]*')
            .replace(/\{\{research\}\}/g, '*[Scientific research and evidence]*')
            .replace(/\{\{concepts\}\}/g, '*[Connected ideas and concepts]*')
            .replace(/\{\{sources\}\}/g, '*[Comprehensive source list with links]*')
            .replace(/\{\{wisdom\}\}/g, '*[AI-enhanced synthesis of all information]*');
    }

    /**
     * Find vault notes containing exact words from the checklist item.
     */
    private async findVaultNotesWithExactWords(searchTerm: string, options: any = {}): Promise<VaultNote[]> {
        const vaultNotes: VaultNote[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        // Get vault search options from centralized RAG settings
        const maxVaultNotes = options.maxVaultNotes || this.plugin?.settings?.rag?.retrieval?.maxResults || 10;
        const useSemanticSearch = options.enableSemanticSearch ?? this.plugin?.settings?.rag?.advanced?.enableSemanticSearch ?? true;
        const vaultMinRelevance = options.vaultMinRelevance || this.plugin?.settings?.rag?.retrieval?.minRelevanceScore || 0.3;
        
        console.log(`📚 Vault Search: maxNotes=${maxVaultNotes}, semantic=${useSemanticSearch}, minRelevance=${vaultMinRelevance}`);
        
        // If semantic search is enabled, use embedding-based similarity
        if (useSemanticSearch && this.embeddingManager && this.similarityEngine) {
            return await this.findVaultNotesWithSemanticSearch(searchTerm, maxVaultNotes, vaultMinRelevance);
        }
        
        // Fallback to exact word matching
        const searchWords = searchTerm.toLowerCase().split(/\s+/);
        
        for (const file of markdownFiles) {
            try {
                const content = await this.app.vault.read(file);
                const contentLower = content.toLowerCase();
                
                // Check if content contains ALL exact words from the search term
                const containsAllWords = searchWords.every(word => 
                    contentLower.includes(word)
                );
                
                if (containsAllWords) {
                    const relevantSections = this.extractRelevantSections(content, searchTerm);
                    const similarity = this.calculateSimilarity(content, searchTerm);
                    
                    vaultNotes.push({
                        file,
                        relevantSections,
                        similarity
                    });
                }
            } catch (error) {
                console.warn(`Error reading file ${file.path}:`, error);
            }
        }

        // Sort by similarity (highest first) and limit results
        const sortedNotes = vaultNotes.sort((a, b) => b.similarity - a.similarity);
        return sortedNotes.slice(0, maxVaultNotes);
    }

    /**
     * Find vault notes using semantic search with embeddings.
     */
    private async findVaultNotesWithSemanticSearch(
        searchTerm: string, 
        maxResults: number, 
        minRelevance: number
    ): Promise<VaultNote[]> {
        const vaultNotes: VaultNote[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        console.log(`🧠 Performing semantic search for: "${searchTerm}"`);
        
        // Generate embedding for search term
        const searchEmbedding = await this.embeddingManager.generateEmbedding(searchTerm);
        
        // Calculate similarity with each vault note
        const similarities: Array<{file: any, content: string, similarity: number}> = [];
        
        for (const file of markdownFiles) {
            try {
                const content = await this.app.vault.read(file);
                
                // Skip very short content
                if (content.length < 100) continue;
                
                // Generate embedding for note content
                const contentEmbedding = await this.embeddingManager.generateEmbedding(content);
                
                // Calculate semantic similarity
                const similarity = this.similarityEngine.calculateSimilarity(searchEmbedding, contentEmbedding);
                
                if (similarity >= minRelevance) {
                    similarities.push({ file, content, similarity });
                }
            } catch (error) {
                console.warn(`Error processing file ${file.path} for semantic search:`, error);
            }
        }
        
        // Sort by similarity and take top results
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
        
        // Convert to VaultNote format
        for (const result of topResults) {
            const relevantSections = this.extractRelevantSections(result.content, searchTerm);
            
            vaultNotes.push({
                file: result.file,
                content: result.content,
                relevantSections,
                similarity: result.similarity
            });
        }
        
        console.log(`🧠 Semantic search found ${vaultNotes.length} relevant notes (min similarity: ${minRelevance})`);
        return vaultNotes;
    }

    /**
     * Perform web search and save each page as a unique note.
     */
    private async performWebSearchAndSavePages(
        searchTerm: string,
        options: any,
        onProgress?: (progress: { current: number; total: number; percentage: number; message: string }) => void
    ): Promise<WebSearchNote[]> {
        const webSearchNotes: WebSearchNote[] = [];
        const webSearchFolder = `${options.outputFolder || 'Generated Research Notes'}/Web Search - ${this.sanitizeFileName(searchTerm)}`;
        
        await this.ensureFolderExists(webSearchFolder);

        try {
            // Perform web search
            const searchResults = await this.webSearchEngine.search(searchTerm, {
                maxResults: options.maxWebResults || 10,
                searchTerms: [searchTerm],
                qualityFilter: true
            });

            console.log(`🔍 Found ${searchResults.length} web search results`);

            // Save each search result as a unique note
            for (let i = 0; i < searchResults.length; i++) {
                const result = searchResults[i];
                
                // Show progress for each web result being saved
                if (onProgress && searchResults.length > 5) {
                    const progressMessage = `Saving web result ${i + 1}/${searchResults.length}: ${result.title}`;
                    // Note: onProgress callback will use the current progress tracking context
                }
                
                try {
                    const fileName = sanitizeFileName(`${i + 1} - ${result.title}`);
                    const filePath = `${webSearchFolder}/${fileName}.md`;
                    
                    const noteContent = this.generateWebSearchNoteContent(result, searchTerm, i + 1);
                    
                    const file = await this.app.vault.create(filePath, noteContent);
                    
                    // Generate embedding for web search content if semantic search is enabled
                    let embedding;
                    const useSemanticSearch = options.enableSemanticSearch ?? this.plugin?.settings?.rag?.advanced?.enableSemanticSearch ?? false;
                    if (useSemanticSearch && this.embeddingManager) {
                        try {
                            embedding = await this.embeddingManager.generateEmbedding(result.content);
                            console.log(`🧠 Generated embedding for web result: ${result.title}`);
                        } catch (error) {
                            console.warn(`Failed to generate embedding for ${result.title}:`, error);
                        }
                    }
                    
                    webSearchNotes.push({
                        file,
                        url: result.url || '',
                        content: result.content,
                        title: result.title,
                        domain: this.extractDomain(result.url || ''),
                        embedding
                    });
                    
                    console.log(`💾 Saved web search note: ${fileName}`);
                    
                    // Small delay between saves to prevent overwhelming the system
                    if (i < searchResults.length - 1) {
                        await this.delay(500);
                    }
                } catch (error) {
                    console.warn(`Error saving web search result ${i + 1}:`, error);
                }
            }
        } catch (error) {
            console.error('Web search failed:', error);
            new Notice(`⚠️ Web search failed: ${error.message}`);
        }

        return webSearchNotes;
    }

    /**
     * Generate content for web search result note.
     */
    private generateWebSearchNoteContent(
        result: any,
        searchTerm: string,
        index: number
    ): string {
        const today = new Date().toISOString().split('T')[0];
        const domain = this.extractDomain(result.url || '');
        
        return `---
title: "Web Search ${index} - ${result.title}"
type: web-search-result
source: web
url: "${result.url || ''}"
domain: "${domain}"
search-term: "${searchTerm}"
quality-score: ${result.qualityScore || 0}
retrieved: ${today}
tags:
  - web-search
  - "${this.sanitizeFileName(searchTerm)}"
  - "${domain}"
---

# 🌐 ${result.title}

**Source**: [${domain}](${result.url || ''})  
**Retrieved**: ${today}  
**Quality Score**: ${Math.round((result.qualityScore || 0) * 100)}%  

## 📄 Content

${result.content || result.snippet || 'No content available'}

## 🔗 Original URL
${result.url || 'No URL available'}

---
*Retrieved by CLIPPY AI Assistant Web Search*
`;
    }

    /**
     * Extract wisdom from all sources using AI.
     */
    private async extractWisdomFromAllSources(
        searchTerm: string,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[],
        options: any
    ): Promise<ExtractedWisdom> {
        console.log(`🧠 Extracting wisdom from ${vaultNotes.length} vault notes and ${webSearchNotes.length} web notes`);

        const allContent: string[] = [];

        // Collect content from vault notes
        for (const vaultNote of vaultNotes) {
            try {
                const content = await this.app.vault.read(vaultNote.file);
                allContent.push(`**Vault Note - ${vaultNote.file.basename}**:\n${content}`);
            } catch (error) {
                console.warn(`Error reading vault note ${vaultNote.file.path}:`, error);
            }
        }

        // Collect content from web search notes
        for (const webNote of webSearchNotes) {
            allContent.push(`**Web Source - ${webNote.title}** (${webNote.domain}):\n${webNote.content}`);
        }

        // Use AI to extract wisdom
        const prompt = this.createWisdomExtractionPrompt(searchTerm, allContent);
        
        try {
            // Get AI provider (placeholder - would use existing CLIPPY AI system)
            const aiResponse = await this.getAIResponse(prompt);
            // Remove <thinking> tags from wisdom response
            const cleanedResponse = this.removeThinkingTags(aiResponse);
            return this.parseWisdomResponse(cleanedResponse, vaultNotes, webSearchNotes);
        } catch (error) {
            console.error('AI wisdom extraction failed:', error);
            return this.createFallbackWisdom(vaultNotes, webSearchNotes);
        }
    }

    /**
     * Create AI prompt for wisdom extraction.
     */
    private createWisdomExtractionPrompt(searchTerm: string, allContent: string[]): string {
        // Use custom prompt from settings if available
        const customPrompt = this.plugin?.settings?.research?.prompts?.wisdomExtraction;
        
        if (customPrompt) {
            // Replace template variables
            return customPrompt
                .replace(/\{\{searchTerm\}\}/g, searchTerm)
                .replace(/\{\{allContent\}\}/g, allContent.join('\n\n---\n\n'));
        }
        
        // Fallback to default prompt
        return `You are a research assistant extracting comprehensive information about "${searchTerm}".

Please analyze all the following sources and extract the most important information:

${allContent.join('\n\n---\n\n')}

Please extract and organize information into these categories:

1. **Key Definitions**: Clear, concise definitions of "${searchTerm}" and related terms
2. **Key Facts**: The most important factual information
3. **Uses & Applications**: How "${searchTerm}" is used or applied
4. **Warnings & Precautions**: Any safety concerns, side effects, or warnings
5. **Research Findings**: Scientific studies, evidence, or research results
6. **Related Concepts**: Connected ideas, similar topics, or related terms

Format your response as:

## Key Definitions
- [Definition 1]
- [Definition 2]

## Key Facts
- [Fact 1]
- [Fact 2]

## Uses & Applications
- [Use 1]
- [Use 2]

## Warnings & Precautions
- [Warning 1]
- [Warning 2]

## Research Findings
- [Finding 1]
- [Finding 2]

## Related Concepts
- [Concept 1]
- [Concept 2]

Focus on accuracy, cite contradictions if found, and prioritize information from multiple sources.`;
    }

    /**
     * Update research note with extracted wisdom.
     */
    private async updateResearchNoteWithWisdom(
        noteFile: TFile,
        item: ChecklistItem,
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[]
    ): Promise<void> {
        // Use RAG-enhanced processing if available, fallback to original method
        if (this.ragSystem && this.subagentCoordinator) {
            try {
                // Validate inputs
                const validatedWisdom = ValidationHelper.parse(ExtractedWisdomSchema, wisdom, 'ExtractedWisdom');
                const validatedItem = ValidationHelper.parse(ChecklistItemSchema, item, 'ChecklistItem');

                const currentContent = await this.app.vault.read(noteFile);
                
                // Add documents to RAG system for context
                await this.populateRAGWithSources(validatedItem.name, vaultNotes, webSearchNotes, validatedWisdom);
                
                // Analyze template structure to identify all sections
                const templateStructure = this.analyzeTemplateStructure(currentContent);
                console.log(`🔍 Found ${templateStructure.headings.length} headings and ${templateStructure.frontmatter.length} frontmatter fields`);
                
                // Generate RAG context for the research topic
                const ragMaxResults = options.ragMaxResults || this.plugin?.settings?.rag?.retrieval?.maxResults || 10;
                const ragMinRelevance = options.ragMinRelevance || this.plugin?.settings?.rag?.retrieval?.minRelevanceScore || 0.7;
                
                console.log(`🧠 RAG Search: maxResults=${ragMaxResults}, minRelevance=${ragMinRelevance}`);
                const ragContext = await this.ragSystem.search({
                    text: validatedItem.name,
                    maxResults: ragMaxResults,
                    minRelevance: ragMinRelevance
                });

                // Use subagents to generate content for each section
                const sectionResponses = await this.generateResponsesWithSubagents(
                    validatedItem.name, 
                    templateStructure, 
                    validatedWisdom, 
                    vaultNotes, 
                    webSearchNotes,
                    ragContext
                );
                
                // First, apply all content updates WITHOUT frontmatter to populate the note body
                let updatedContent = await this.applyAllUpdatesWithMandatorySections(
                    currentContent, 
                    validatedItem, 
                    sectionResponses, 
                    '', // Empty frontmatter for now - we'll generate it after content is populated
                    validatedWisdom, 
                    vaultNotes, 
                    webSearchNotes
                );

                // Now generate dynamic frontmatter using the populated content for better context
                console.log(`🏷️ Generating frontmatter AFTER content population for: ${validatedItem.name}`);
                const frontmatterResponse = await this.generateDynamicFrontmatter(
                    updatedContent, 
                    validatedItem.name, 
                    ragContext
                );

                // Apply the generated frontmatter to the populated content
                updatedContent = this.replaceFrontmatter(updatedContent, frontmatterResponse);

                // Update status checkboxes
                updatedContent = this.updateStatusCheckboxes(updatedContent);

                await this.app.vault.modify(noteFile, updatedContent);
                console.log(`📝 Updated research note with RAG-enhanced AI responses for ${sectionResponses.size} sections: ${noteFile.basename}`);
                return;
            } catch (error) {
                console.error('Error with RAG-enhanced processing, falling back to basic method:', error);
            }
        }

        // Fallback to original method
        try {
            const currentContent = await this.app.vault.read(noteFile);
            
            // Analyze template structure to identify all sections
            const templateStructure = this.analyzeTemplateStructure(currentContent);
            console.log(`🔍 Found ${templateStructure.headings.length} headings and ${templateStructure.frontmatter.length} frontmatter fields`);
            
            // Generate AI responses for all sections
            const sectionResponses = await this.generateResponsesForAllSections(
                item.name, 
                templateStructure, 
                wisdom, 
                vaultNotes, 
                webSearchNotes
            );
            
            // Apply all updates
            let updatedContent = await this.applyAllUpdates(
                currentContent, 
                item, 
                sectionResponses, 
                wisdom, 
                vaultNotes, 
                webSearchNotes
            );

            // Update status checkboxes
            updatedContent = this.updateStatusCheckboxes(updatedContent);

            await this.app.vault.modify(noteFile, updatedContent);
            console.log(`📝 Updated research note with AI responses for ${sectionResponses.size} sections: ${noteFile.basename}`);

        } catch (error) {
            console.error('Error updating research note:', error);
            throw error;
        }
    }

    /**
     * Enhance the research note using AI.
     */
    private async enhanceResearchNote(noteFile: TFile, options: any): Promise<void> {
        try {
            console.log(`✨ Enhancing research note: ${noteFile.basename}`);
            
            // Open the note in the editor
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeLeaf && activeLeaf.file?.path === noteFile.path) {
                // File is already open, enhance it
                // This would integrate with existing CLIPPY enhance note command
                console.log('Note is open, would enhance via existing CLIPPY system');
            } else {
                // Open the file first
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(noteFile);
                console.log('Opened note for enhancement');
            }

            // Mark enhancement as complete
            const content = await this.app.vault.read(noteFile);
            let updatedContent = content
                .replace('- [ ] Note enhanced', '- [x] Note enhanced')
                .replace('- [ ] Research completed', '- [x] Research completed')
                .replace('🔄 Status: Processing', '✅ Status: Completed');

            // Update status more robustly
            updatedContent = updatedContent.replace(/^status:\s*"?in-progress"?$/m, 'status: "needs-review"');
            updatedContent = updatedContent.replace(/^status:\s*in-progress$/m, 'status: needs-review');

            await this.app.vault.modify(noteFile, updatedContent);

        } catch (error) {
            console.error('Error enhancing research note:', error);
        }
    }

    // Helper methods

    private extractRelevantSections(content: string, searchTerm: string): string[] {
        const lines = content.split('\n');
        const relevantSections: string[] = [];
        const searchTermLower = searchTerm.toLowerCase();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(searchTermLower)) {
                // Extract context around the match
                const start = Math.max(0, i - 3);
                const end = Math.min(lines.length, i + 4);
                const section = lines.slice(start, end).join('\n');
                relevantSections.push(section);
            }
        }

        return relevantSections;
    }

    private calculateSimilarity(content: string, searchTerm: string): number {
        const contentLower = content.toLowerCase();
        const searchTermLower = searchTerm.toLowerCase();
        const words = searchTermLower.split(/\s+/);
        
        let matches = 0;
        for (const word of words) {
            try {
                // Escape special regex characters to prevent syntax errors
                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedWord, 'gi');
                const wordMatches = (contentLower.match(regex) || []).length;
                matches += wordMatches;
            } catch (error) {
                console.warn(`Failed to create regex for word "${word}":`, error);
                // Fallback to simple string matching
                const simpleMatches = contentLower.split(word).length - 1;
                matches += simpleMatches;
            }
        }
        
        return matches / Math.max(content.length / 100, 1);
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    private sanitizeFileName(name: string): string {
        return name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, ' ');
    }

    private async ensureFolderExists(folderPath: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    private generateOverview(term: string, wisdom: ExtractedWisdom): string {
        // Generate overview based on available wisdom content
        const hasDefinitions = wisdom.definitions.length > 0;
        const hasUses = wisdom.uses.length > 0;
        const hasWarnings = wisdom.warnings.length > 0;
        const hasFindings = wisdom.researchFindings.length > 0;
        const hasRelated = wisdom.relatedConcepts.length > 0;
        
        let overview = `This research compilation provides comprehensive information about ${term}.`;
        
        // Add sections based on available content
        const availableSections = [];
        if (hasDefinitions) availableSections.push('definitions and terminology');
        if (hasUses) availableSections.push('practical applications');
        if (hasWarnings) availableSections.push('safety considerations');
        if (hasFindings) availableSections.push('research findings');
        if (hasRelated) availableSections.push('related concepts');
        
        if (availableSections.length > 0) {
            overview += ` The information covers ${availableSections.join(', ')}.`;
        }
        
        overview += `\n\n**Sources analyzed:** ${wisdom.sources.length} total references including vault notes and web sources.`;
        
        return overview;
    }

    private formatWisdomContent(items: string[], prefix: string = '- ', separator: string = '\n'): string {
        if (!items || items.length === 0) {
            return 'No information available';
        }
        return items.map(item => `${prefix}${item}`).join(separator);
    }

    private formatFullWisdomSummary(wisdom: ExtractedWisdom): string {
        const sections = [];
        
        if (wisdom.keyFacts.length > 0) {
            sections.push(`**Key Facts:** ${wisdom.keyFacts.join('; ')}`);
        }
        
        if (wisdom.definitions.length > 0) {
            sections.push(`**Definitions:** ${wisdom.definitions.join('; ')}`);
        }
        
        if (wisdom.uses.length > 0) {
            sections.push(`**Applications:** ${wisdom.uses.join('; ')}`);
        }
        
        if (wisdom.warnings.length > 0) {
            sections.push(`**Warnings:** ${wisdom.warnings.join('; ')}`);
        }
        
        return sections.join('\n\n') || 'Comprehensive analysis completed from all available sources.';
    }

    private updateLegacySections(content: string, wisdom: ExtractedWisdom, vaultNotes: VaultNote[], webSearchNotes: WebSearchNote[], searchTerm?: string): string {
        // Handle legacy template format with placeholder replacement
        let updatedContent = content;

        // Update overview
        const overview = this.generateOverview(searchTerm || 'research topic', wisdom);
        updatedContent = this.replacePlaceholder(updatedContent, '## 📖 Overview', overview);

        // Update sections with actual extracted wisdom
        if (wisdom.definitions.length > 0) {
            const definitions = wisdom.definitions.map(def => `- ${def}`).join('\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## 🔍 Key Definitions', definitions);
        }

        if (wisdom.keyFacts.length > 0) {
            const facts = wisdom.keyFacts.map(fact => `- ${fact}`).join('\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## 💡 Key Facts & Findings', facts);
        }

        if (wisdom.uses.length > 0) {
            const uses = wisdom.uses.map(use => `- ${use}`).join('\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## 🎯 Uses & Applications', uses);
        }

        if (wisdom.warnings.length > 0) {
            const warnings = wisdom.warnings.map(warning => `⚠️ ${warning}`).join('\n\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## ⚠️ Warnings & Precautions', warnings);
        }

        if (wisdom.researchFindings.length > 0) {
            const research = wisdom.researchFindings.map(finding => `- ${finding}`).join('\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## 🔬 Research Findings', research);
        }

        if (wisdom.relatedConcepts.length > 0) {
            const concepts = wisdom.relatedConcepts.map(concept => `- ${concept}`).join('\n');
            updatedContent = this.replacePlaceholder(updatedContent, '## 🔗 Related Concepts', concepts);
        }

        // Update references
        const vaultRefs = vaultNotes.map(note => `- [[${note.file.basename}]]`).join('\n');
        updatedContent = this.replacePlaceholder(updatedContent, '## 📚 Vault References', vaultRefs);

        const webRefs = webSearchNotes.map(note => `- [[${note.file.basename}]]`).join('\n');
        updatedContent = this.replacePlaceholder(updatedContent, '## 🌐 Web Search Sources', webRefs);

        const sources = wisdom.sources.join('\n');
        updatedContent = this.replacePlaceholder(updatedContent, '## 📋 Sources', sources);

        return updatedContent;
    }

    private replacePlaceholder(content: string, sectionHeader: string, newContent: string): string {
        // Try multiple patterns to find and replace placeholder content
        const patterns = [
            // Pattern 1: Replace placeholder text like "Extracted facts from AI response"
            new RegExp(`(${this.escapeRegex(sectionHeader)}\\s*\\n)- Extracted [^\\n]+ from AI response`, 'gi'),
            // Pattern 2: Replace empty sections or placeholder markers
            new RegExp(`(${this.escapeRegex(sectionHeader)}\\s*\\n)\\*\\[.*?\\]\\*`, 's'),
            // Pattern 3: Replace content between section header and next header
            new RegExp(`(${this.escapeRegex(sectionHeader)}\\s*\\n)[^#]*(?=\\n##|$)`, 's')
        ];

        for (const pattern of patterns) {
            if (pattern.test(content)) {
                return content.replace(pattern, `$1${newContent}\n\n`);
            }
        }

        // If no patterns match, try simple append after header
        const simplePattern = new RegExp(`(${this.escapeRegex(sectionHeader)})`);
        if (simplePattern.test(content)) {
            return content.replace(simplePattern, `$1\n${newContent}\n`);
        }

        return content;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Analyze template structure to identify all headings and frontmatter fields
     */
    private analyzeTemplateStructure(content: string): {
        headings: Array<{level: number, text: string, fullMatch: string}>,
        frontmatter: Array<{key: string, value: string}>,
        hasEmptyContent: boolean
    } {
        const structure = {
            headings: [] as Array<{level: number, text: string, fullMatch: string}>,
            frontmatter: [] as Array<{key: string, value: string}>,
            hasEmptyContent: false
        };

        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatterContent = frontmatterMatch[1];
            const lines = frontmatterContent.split('\n');
            for (const line of lines) {
                const match = line.match(/^(\w+):\s*(.*)$/);
                if (match) {
                    structure.frontmatter.push({
                        key: match[1],
                        value: match[2].trim()
                    });
                }
            }
        }

        // Extract headings (# ## ### etc.)
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            structure.headings.push({
                level: match[1].length,
                text: match[2].trim(),
                fullMatch: match[0]
            });
        }

        // Check if there are sections with placeholder content
        structure.hasEmptyContent = content.includes('Extracted') && content.includes('from AI response');

        return structure;
    }

    /**
     * Create section-specific context based on heading type and content
     */
    private createSectionContext(sectionTitle: string, searchTerm: string, wisdom: ExtractedWisdom): string {
        const titleLower = sectionTitle.toLowerCase();
        
        // Determine section type and provide focused context
        if (titleLower.includes('overview') || titleLower.includes('introduction') || titleLower.includes('description')) {
            return `This section should provide a comprehensive overview of ${searchTerm}, including its basic definition, key characteristics, and general information.`;
        }
        
        if (titleLower.includes('use') || titleLower.includes('application') || titleLower.includes('benefit')) {
            const relevantUses = wisdom.uses.length > 0 ? ` Key uses identified: ${wisdom.uses.join(', ')}.` : '';
            return `This section should focus on the practical uses, applications, and benefits of ${searchTerm}.${relevantUses}`;
        }
        
        if (titleLower.includes('warning') || titleLower.includes('precaution') || titleLower.includes('safety') || titleLower.includes('risk')) {
            const relevantWarnings = wisdom.warnings.length > 0 ? ` Key warnings identified: ${wisdom.warnings.join(', ')}.` : '';
            return `This section should focus on warnings, precautions, safety considerations, and potential risks related to ${searchTerm}.${relevantWarnings}`;
        }
        
        if (titleLower.includes('research') || titleLower.includes('finding') || titleLower.includes('study') || titleLower.includes('evidence')) {
            const relevantFindings = wisdom.researchFindings.length > 0 ? ` Key findings identified: ${wisdom.researchFindings.join(', ')}.` : '';
            return `This section should focus on research findings, scientific studies, and evidence-based information about ${searchTerm}.${relevantFindings}`;
        }
        
        if (titleLower.includes('propert') || titleLower.includes('characteristic') || titleLower.includes('feature')) {
            return `This section should focus on the properties, characteristics, and key features of ${searchTerm}.`;
        }
        
        if (titleLower.includes('source') || titleLower.includes('reference') || titleLower.includes('citation')) {
            return `This section contains source information and references for the research on ${searchTerm}.`;
        }
        
        // Default context for unrecognized section types
        return `This section ("${sectionTitle}") should provide specific information about ${searchTerm} as it relates to the section topic.`;
    }

    /**
     * Generate AI responses for all identified sections
     */
    private async generateResponsesForAllSections(
        searchTerm: string,
        templateStructure: {headings: Array<{level: number, text: string, fullMatch: string}>, frontmatter: Array<{key: string, value: string}>},
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[]
    ): Promise<Map<string, string>> {
        const responses = new Map<string, string>();

        // Generate responses for each heading
        for (const heading of templateStructure.headings) {
            console.log(`🤖 Generating AI response for: ${heading.text}`);
            
            const prompt = this.createSectionSpecificPrompt(
                searchTerm,
                heading.text,
                heading.level,
                wisdom,
                vaultNotes,
                webSearchNotes
            );

            try {
                const response = await this.getAIResponse(prompt);
                // Remove <thinking> tags from response
                const cleanedResponse = this.removeThinkingTags(response);
                responses.set(heading.fullMatch, cleanedResponse);
            } catch (error) {
                console.warn(`Failed to generate AI response for "${heading.text}":`, error);
                responses.set(heading.fullMatch, this.getFallbackContent(heading.text, wisdom));
            }
        }

        // Generate frontmatter values
        for (const field of templateStructure.frontmatter) {
            if (field.value === '' || field.value.includes('{{')) {
                console.log(`🏷️ Generating AI value for frontmatter: ${field.key}`);
                
                const prompt = this.createFrontmatterPrompt(searchTerm, field.key, wisdom);
                
                try {
                    const response = await this.getAIResponse(prompt);
                    // Remove <thinking> tags from frontmatter response - ALWAYS force clean
                    const cleanedResponse = this.removeThinkingTags(response, true);
                    responses.set(`frontmatter_${field.key}`, cleanedResponse.trim());
                } catch (error) {
                    console.warn(`Failed to generate frontmatter for "${field.key}":`, error);
                    responses.set(`frontmatter_${field.key}`, this.getFallbackFrontmatterValue(field.key, searchTerm));
                }
            }
        }

        return responses;
    }

    /**
     * Create section-specific AI prompts
     */
    private createSectionSpecificPrompt(
        searchTerm: string,
        sectionTitle: string,
        level: number,
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[]
    ): string {
        // Build comprehensive context from vault notes
        const vaultContext = vaultNotes.length > 0 ? 
            vaultNotes.map(note => {
                const preview = note.relevantSections.join(' ').slice(0, 300);
                return `**${note.file.basename}**: ${preview}...`;
            }).join('\n\n') 
            : 'No relevant vault notes found.';

        // Build comprehensive context from web search results
        const webContext = webSearchNotes.length > 0 ?
            webSearchNotes.map(note => {
                const preview = note.content.slice(0, 300);
                return `**${note.title}** (${note.url}): ${preview}...`;
            }).join('\n\n')
            : 'No web search results available.';

        // Create section-specific context based on heading type
        const sectionContext = this.createSectionContext(sectionTitle, searchTerm, wisdom);

        return `You are a research specialist writing the "${sectionTitle}" section about "${searchTerm}".

**RESEARCH TOPIC:** ${searchTerm}
**SECTION FOCUS:** ${sectionTitle}
**SECTION LEVEL:** ${level}

**SECTION-SPECIFIC CONTEXT:**
${sectionContext}

**VAULT REFERENCES:**
${vaultContext}

**WEB SEARCH RESULTS:**
${webContext}

**EXTRACTED RESEARCH DATA:**
- Key Facts: ${wisdom.keyFacts.length > 0 ? wisdom.keyFacts.join('; ') : 'None extracted'}
- Definitions: ${wisdom.definitions.length > 0 ? wisdom.definitions.join('; ') : 'None extracted'}
- Uses/Applications: ${wisdom.uses.length > 0 ? wisdom.uses.join('; ') : 'None extracted'}
- Warnings/Precautions: ${wisdom.warnings.length > 0 ? wisdom.warnings.join('; ') : 'None extracted'}
- Research Findings: ${wisdom.researchFindings.length > 0 ? wisdom.researchFindings.join('; ') : 'None extracted'}
- Related Concepts: ${wisdom.relatedConcepts.length > 0 ? wisdom.relatedConcepts.join('; ') : 'None extracted'}

**INSTRUCTIONS:**
1. Write content specifically for the "${sectionTitle}" section about "${searchTerm}"
2. Use ALL available context (vault references, web results, and extracted data)
3. Focus on information that directly relates to "${sectionTitle}" as it pertains to "${searchTerm}"
4. Write 2-4 substantial, informative paragraphs or bullet points
5. Make the content specific to "${searchTerm}" - avoid generic responses
6. Do NOT include the heading itself in your response
7. If sources are limited, acknowledge this but provide what information is available
8. Format content appropriately (paragraphs, bullet points, or lists)

**CRITICAL:** Your response should be directly about "${searchTerm}" in the context of "${sectionTitle}". Do not write conversational responses or meta-commentary about the research process.`;
    }

    /**
     * Create frontmatter-specific AI prompts
     */
    private createFrontmatterPrompt(searchTerm: string, fieldKey: string, wisdom: ExtractedWisdom): string {
        const fieldLower = fieldKey.toLowerCase();
        
        if (fieldLower.includes('tag')) {
            return `Generate YAML-formatted tags for "${searchTerm}" research.

**Research Context:**
- Topic: ${searchTerm}
- Key facts: ${wisdom.keyFacts.slice(0, 3).join('; ')}
- Uses: ${wisdom.uses.slice(0, 2).join('; ')}

**Tag Categories (adapt to your specific topic):**
- **Properties**: Key characteristics, attributes, qualities
- **Functions**: What it does, purposes, capabilities  
- **Type**: Classification, category, variant
- **Scope**: Range, application area, domain
- **Status**: Current state, maturity level
- **Context**: Field, industry, use case

**Instructions:** 
- Return ONLY the hyphenated list format below (NO "tags:" prefix)
- Use short, specific descriptors (no spaces in individual tags)
- No generic words like "research" or "analysis"
- Focus on actual properties and characteristics relevant to ${searchTerm}
- Generate 4-6 specific tags that accurately describe the topic
- Make tags useful for categorization and discovery

**Required Format (EXACTLY like this, no "tags:" line):**
- tag1
- tag2  
- tag3
- tag4
- tag5`;
        }
        
        if (fieldLower.includes('properties')) {
            return `List the key properties of "${searchTerm}" based on the research data.

**Available Data:** ${wisdom.keyFacts.join('; ')}

**Instructions:**
- Extract 2-4 specific properties or characteristics
- Use descriptive terms relevant to the topic
- Format as a simple list

Generate properties:`;
        }
        
        if (fieldLower.includes('type') || fieldLower.includes('category')) {
            return `Classify the type or category of "${searchTerm}" based on the research data.

**Available Data:** ${wisdom.keyFacts.join('; ')}

**Instructions:**
- Provide 1-2 specific classification terms
- Use standard terminology for the field
- Be precise and descriptive

Generate type/category:`;
        }

        // Generic frontmatter handling
        return `Generate a value for the "${fieldKey}" frontmatter field for a research document about "${searchTerm}".

**Research Context:**
- Topic: ${searchTerm}
- Key facts available: ${wisdom.keyFacts.slice(0, 3).join('; ')}
- Main concepts: ${wisdom.relatedConcepts.slice(0, 3).join('; ')}

**Instructions:**
1. Generate an appropriate value for the "${fieldKey}" field
2. Keep it concise and relevant
3. Common field meanings:
   - description/summary: Brief 1-sentence description
   - category: Single category name
   - status: "completed" or "in-progress"
   - author: Keep as is or generate appropriate attribution
   - date: Use current date format

**Respond with only the value (no quotes unless it's a string that needs them):**`;
    }


    /**
     * Apply all updates to the content
     */
    private async applyAllUpdates(
        content: string,
        item: ChecklistItem,
        sectionResponses: Map<string, string>,
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[]
    ): Promise<string> {
        let updatedContent = content;

        // Apply template variables first
        const templateVariables = {
            '{{title}}': item.name,
            '{{today}}': new Date().toISOString().split('T')[0],
            '{{research.status}}': 'Completed',
            '{{overview}}': this.generateOverview(item.name, wisdom),
            '{{definitions}}': this.formatWisdomContent(wisdom.definitions, '- '),
            '{{facts}}': this.formatWisdomContent(wisdom.keyFacts, '- '),
            '{{uses}}': this.formatWisdomContent(wisdom.uses, '- '),
            '{{warnings}}': this.formatWisdomContent(wisdom.warnings, '⚠️ ', '\n\n'),
            '{{research}}': this.formatWisdomContent(wisdom.researchFindings, '- '),
            '{{concepts}}': this.formatWisdomContent(wisdom.relatedConcepts, '- '),
            '{{vault.references}}': vaultNotes.map(note => `- [[${note.file.basename}]]`).join('\n'),
            '{{web.sources}}': webSearchNotes.map(note => `- [[${note.file.basename}]]`).join('\n'),
            '{{sources}}': wisdom.sources.join('\n'),
            '{{wisdom}}': this.formatFullWisdomSummary(wisdom)
        };

        for (const [variable, value] of Object.entries(templateVariables)) {
            updatedContent = updatedContent.replace(new RegExp(this.escapeRegex(variable), 'g'), value || 'No information available');
        }

        // Apply section-specific AI responses
        for (const [sectionHeading, aiResponse] of sectionResponses.entries()) {
            if (sectionHeading.startsWith('frontmatter_')) {
                // Handle frontmatter updates
                const fieldKey = sectionHeading.replace('frontmatter_', '');
                updatedContent = this.updateFrontmatterField(updatedContent, fieldKey, aiResponse);
            } else {
                // Handle heading section updates
                updatedContent = this.updateSectionContent(updatedContent, sectionHeading, aiResponse);
            }
        }

        // Also apply legacy updates for backwards compatibility
        updatedContent = this.updateLegacySections(updatedContent, wisdom, vaultNotes, webSearchNotes, item.name);

        return updatedContent;
    }

    /**
     * Update frontmatter field with AI-generated content
     */
    private updateFrontmatterField(content: string, fieldKey: string, value: string): string {
        const frontmatterRegex = /^(---\n)([\s\S]*?)\n(---)/;
        const match = content.match(frontmatterRegex);
        
        if (match) {
            let frontmatterContent = match[2];
            const fieldRegex = new RegExp(`^${fieldKey}:\\s*.*$`, 'm');
            
            if (fieldRegex.test(frontmatterContent)) {
                // Update existing field
                frontmatterContent = frontmatterContent.replace(fieldRegex, `${fieldKey}: ${value}`);
            } else {
                // Add new field
                frontmatterContent += `\n${fieldKey}: ${value}`;
            }
            
            return content.replace(frontmatterRegex, `$1${frontmatterContent}\n$3`);
        }
        
        return content;
    }

    /**
     * Update section content with AI-generated content
     */
    private updateSectionContent(content: string, sectionHeading: string, aiResponse: string): string {
        // Find the section and replace content until next heading or end
        const escapedHeading = this.escapeRegex(sectionHeading);
        const sectionRegex = new RegExp(`(${escapedHeading}\\s*\\n)([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`, 'g');
        
        return content.replace(sectionRegex, `$1${aiResponse}\n\n`);
    }

    /**
     * Update status checkboxes
     */
    private updateStatusCheckboxes(content: string): string {
        return content
            .replace(/- \[ \] Vault notes analyzed/g, '- [x] Vault notes analyzed')
            .replace(/- \[ \] Web search completed/g, '- [x] Web search completed')
            .replace(/- \[ \] Wisdom extracted/g, '- [x] Wisdom extracted')
            .replace(/- \[ \] Note enhanced/g, '- [x] Note enhanced')
            .replace(/- \[ \] Research completed/g, '- [x] Research completed');
    }

    /**
     * Get fallback content for sections when AI fails
     */
    private getFallbackContent(sectionTitle: string, wisdom: ExtractedWisdom): string {
        const title = sectionTitle.toLowerCase();
        
        if (title.includes('definition') || title.includes('overview')) {
            return wisdom.definitions.length > 0 
                ? wisdom.definitions.map(def => `- ${def}`).join('\n')
                : 'Comprehensive information compiled from research sources.';
        } else if (title.includes('fact') || title.includes('finding')) {
            return wisdom.keyFacts.length > 0
                ? wisdom.keyFacts.map(fact => `- ${fact}`).join('\n')
                : 'Key information extracted from available sources.';
        } else if (title.includes('use') || title.includes('application')) {
            return wisdom.uses.length > 0
                ? wisdom.uses.map(use => `- ${use}`).join('\n')
                : 'Applications and uses documented in research.';
        } else if (title.includes('warning') || title.includes('caution') || title.includes('safety')) {
            return wisdom.warnings.length > 0
                ? wisdom.warnings.map(warning => `⚠️ ${warning}`).join('\n')
                : 'Safety considerations documented in sources.';
        } else {
            return 'Information compiled from research sources and analysis.';
        }
    }

    /**
     * Get fallback frontmatter values
     */
    private getFallbackFrontmatterValue(fieldKey: string, searchTerm: string): string {
        const key = fieldKey.toLowerCase();
        
        if (key.includes('tag')) {
            return `[research, ${searchTerm.toLowerCase().replace(/\s+/g, '-')}, analysis]`;
        } else if (key.includes('status')) {
            return 'completed';
        } else if (key.includes('date') || key.includes('created')) {
            return new Date().toISOString().split('T')[0];
        } else if (key.includes('description') || key.includes('summary')) {
            return `Research analysis of ${searchTerm}`;
        } else if (key.includes('category')) {
            return 'research';
        } else {
            return searchTerm;
        }
    }

    private async getAIResponse(prompt: string): Promise<string> {
        try {
            if (!this.plugin) {
                console.warn('No plugin instance available for AI integration');
                return "AI integration not available - plugin reference missing";
            }

            const aiProvider = await this.plugin.getAIProvider();
            if (!aiProvider) {
                console.warn('No AI provider available');
                return "AI provider not available - check your AI settings";
            }

            console.log('🤖 Using AI to extract wisdom from research sources');
            const response = await aiProvider.generateResponse(prompt);
            return response;
        } catch (error) {
            console.error('AI wisdom extraction failed:', error);
            return `AI extraction failed: ${error.message}`;
        }
    }

    private parseWisdomResponse(response: string, vaultNotes: VaultNote[], webSearchNotes: WebSearchNote[]): ExtractedWisdom {
        // Parse AI response into structured wisdom
        const sections = {
            keyFacts: [] as string[],
            definitions: [] as string[],
            uses: [] as string[],
            warnings: [] as string[],
            researchFindings: [] as string[],
            relatedConcepts: [] as string[]
        };

        // Extract sections from AI response using markers
        const sectionMarkers = {
            'Key Definitions': 'definitions',
            'Key Facts': 'keyFacts',
            'Uses & Applications': 'uses',
            'Warnings & Precautions': 'warnings',
            'Research Findings': 'researchFindings',
            'Related Concepts': 'relatedConcepts'
        };

        let currentSection = '';
        const lines = response.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check for section headers
            for (const [marker, sectionKey] of Object.entries(sectionMarkers)) {
                if (trimmed.toLowerCase().includes(marker.toLowerCase()) && trimmed.includes('**')) {
                    currentSection = sectionKey;
                    break;
                }
            }

            // Extract bullet points or numbered items
            if (currentSection && (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed))) {
                const content = trimmed.replace(/^[*\-\d\.\s]+/, '').trim();
                if (content && content.length > 3) {
                    sections[currentSection as keyof typeof sections].push(content);
                }
            }
        }

        // Debug logging
        console.log('🔍 AI Response length:', response.length);
        console.log('🔍 Parsed sections:', Object.keys(sections).map(key => `${key}: ${sections[key as keyof typeof sections].length} items`));

        // Fallback: if no structured sections found, extract key information
        if (Object.values(sections).every(arr => arr.length === 0)) {
            console.log('⚠️ No structured sections found, using fallback parsing');
            
            // More aggressive content extraction
            const sentences = response.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
            const paragraphs = response.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 50);
            
            // Extract different types of content
            sections.keyFacts = sentences.slice(0, 3);
            sections.definitions = paragraphs.filter(p => p.toLowerCase().includes('definition') || p.toLowerCase().includes('defined as')).slice(0, 2);
            sections.uses = paragraphs.filter(p => p.toLowerCase().includes('use') || p.toLowerCase().includes('application')).slice(0, 2);
            sections.warnings = paragraphs.filter(p => p.toLowerCase().includes('warning') || p.toLowerCase().includes('caution') || p.toLowerCase().includes('risk')).slice(0, 2);
            sections.researchFindings = paragraphs.filter(p => p.toLowerCase().includes('research') || p.toLowerCase().includes('study')).slice(0, 2);
            sections.relatedConcepts = sentences.filter(s => s.toLowerCase().includes('related') || s.toLowerCase().includes('similar')).slice(0, 2);
        }

        return {
            ...sections,
            sources: [
                ...vaultNotes.map(note => `[[${note.file.basename}]]`),
                ...webSearchNotes.map(note => `[[${note.file.basename}]]`)
            ]
        };
    }

    private createFallbackWisdom(vaultNotes: VaultNote[], webSearchNotes: WebSearchNote[]): ExtractedWisdom {
        return {
            keyFacts: ["Information compiled from multiple sources"],
            definitions: ["See referenced sources for detailed definitions"],
            uses: ["See referenced sources for applications"],
            warnings: ["Review all sources for safety information"],
            researchFindings: ["Research details available in linked sources"],
            relatedConcepts: ["Related topics linked in source materials"],
            sources: [
                ...vaultNotes.map(note => `[[${note.file.basename}]]`),
                ...webSearchNotes.map(note => `[[${note.file.basename}]]`)
            ]
        };
    }


    // ==================== NEW RAG-ENHANCED METHODS ====================

    /**
     * Populate RAG system with research sources for context.
     */
    private async populateRAGWithSources(
        searchTerm: string,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[],
        wisdom: ExtractedWisdom
    ): Promise<void> {
        const documents = [];
        const ragId = `research-${searchTerm.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

        // Add vault notes as RAG documents
        for (let i = 0; i < vaultNotes.length; i++) {
            const vaultNote = vaultNotes[i];
            const content = await this.app.vault.read(vaultNote.file);
            
            documents.push({
                id: `${ragId}-vault-${i}`,
                content: content,
                metadata: {
                    title: vaultNote.file.basename,
                    source: vaultNote.file.path,
                    sourceType: 'vault' as const,
                    qualityScore: 0.95, // High trust for vault notes
                    relevanceScore: vaultNote.similarity || 0.8,
                    extractedAt: new Date()
                }
            });
        }

        // Add web search notes as RAG documents
        for (let i = 0; i < webSearchNotes.length; i++) {
            const webNote = webSearchNotes[i];
            
            // Use ContentParserAgent to clean web content if available
            let cleanedContent = webNote.content;
            if (this.subagentCoordinator) {
                try {
                    const parseResult = await this.subagentCoordinator.executeAgent('contentParser', {
                        task: `Parse and clean web content for "${searchTerm}"`,
                        input: {
                            rawContent: webNote.content,
                            url: webNote.url,
                            title: webNote.title
                        }
                    });
                    
                    if (parseResult.success) {
                        cleanedContent = parseResult.output;
                        console.log(`📝 Cleaned web content using ContentParserAgent: ${webNote.title}`);
                    }
                } catch (error) {
                    console.warn('ContentParserAgent failed, using original content:', error);
                }
            }
            
            // Rate the quality of this web source
            let qualityScore = 0.7; // Default
            try {
                qualityScore = await this.qualityRater.rateSourceQuality({
                    title: webNote.title,
                    content: webNote.content,
                    url: webNote.url,
                    type: 'web',
                    lastUpdated: new Date(),
                    qualityScore: 0.7, // Will be overwritten
                    relevanceScore: 0.6,
                    citations: []
                });
            } catch (error) {
                console.warn('Quality rating failed:', error);
            }

            documents.push({
                id: `${ragId}-web-${i}`,
                content: cleanedContent,
                metadata: {
                    title: webNote.title,
                    source: webNote.url,
                    sourceType: 'web' as const,
                    url: webNote.url,
                    qualityScore: qualityScore,
                    relevanceScore: 0.6, // Base relevance for web sources
                    extractedAt: new Date()
                }
            });
        }

        // Add documents to RAG system
        if (documents.length > 0) {
            await this.ragSystem.addDocuments(documents);
            console.log(`📚 Added ${documents.length} documents to RAG system for "${searchTerm}"`);
        }
    }

    /**
     * Generate responses for all sections using subagents with RAG context.
     */
    private async generateResponsesWithSubagents(
        searchTerm: string,
        templateStructure: any,
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[],
        ragContext: any
    ): Promise<Map<string, string>> {
        const responses = new Map<string, string>();
        
        if (!this.subagentCoordinator) {
            console.warn('SubagentCoordinator not available, falling back to basic responses');
            return this.generateResponsesForAllSections(searchTerm, templateStructure, wisdom, vaultNotes, webSearchNotes);
        }

        // Generate content for each section using SectionSpecialistAgent
        for (const heading of templateStructure.headings || []) {
            try {
                // Build comprehensive context for this section
                const vaultContext = vaultNotes.length > 0 ? 
                    vaultNotes.map(note => {
                        const preview = note.relevantSections.join(' ').slice(0, 300);
                        return `**${note.file.basename}**: ${preview}...`;
                    }).join('\n\n') 
                    : 'No relevant vault notes found.';

                const webContext = webSearchNotes.length > 0 ?
                    webSearchNotes.map(note => {
                        const preview = note.content.slice(0, 300);
                        return `**${note.title}** (${note.url}): ${preview}...`;
                    }).join('\n\n')
                    : 'No web search results available.';

                const sectionContext = this.createSectionContext(heading, searchTerm, wisdom);

                const comprehensivePrompt = `You are a research specialist writing the "${heading}" section about "${searchTerm}".

**RESEARCH TOPIC:** ${searchTerm}
**SECTION FOCUS:** ${heading}

**SECTION-SPECIFIC CONTEXT:**
${sectionContext}

**VAULT REFERENCES:**
${vaultContext}

**WEB SEARCH RESULTS:**
${webContext}

**EXTRACTED RESEARCH DATA:**
- Key Facts: ${wisdom.keyFacts.length > 0 ? wisdom.keyFacts.join('; ') : 'None extracted'}
- Definitions: ${wisdom.definitions.length > 0 ? wisdom.definitions.join('; ') : 'None extracted'}
- Uses/Applications: ${wisdom.uses.length > 0 ? wisdom.uses.join('; ') : 'None extracted'}
- Warnings/Precautions: ${wisdom.warnings.length > 0 ? wisdom.warnings.join('; ') : 'None extracted'}
- Research Findings: ${wisdom.researchFindings.length > 0 ? wisdom.researchFindings.join('; ') : 'None extracted'}
- Related Concepts: ${wisdom.relatedConcepts.length > 0 ? wisdom.relatedConcepts.join('; ') : 'None extracted'}

**INSTRUCTIONS:**
Write content specifically for the "${heading}" section about "${searchTerm}". Use ALL available context and focus on information that directly relates to "${heading}" as it pertains to "${searchTerm}". Write 2-4 substantial, informative paragraphs or bullet points. Make the content specific to "${searchTerm}" - avoid generic responses. Do NOT include the heading itself in your response.`;

                const sectionResult = await this.subagentCoordinator.executeAgent('sectionSpecialist', {
                    task: `Write the "${heading}" section about "${searchTerm}"`,
                    input: {
                        sectionName: heading,
                        sectionContext: comprehensivePrompt,
                        topic: searchTerm,
                        template: templateStructure,
                        vaultContext: vaultContext,
                        webContext: webContext,
                        wisdom: wisdom
                    },
                    ragContext: ragContext
                });

                if (sectionResult.success) {
                    // Remove <thinking> tags from response
                    const cleanedResponse = this.removeThinkingTags(sectionResult.output);
                    responses.set(heading, cleanedResponse);
                    console.log(`✨ Generated content for section "${heading}" using SectionSpecialistAgent`);
                } else {
                    console.warn(`SectionSpecialistAgent failed for "${heading}": ${sectionResult.reasoning}`);
                    responses.set(heading, `*Information about ${heading.toLowerCase()} will be added here.*`);
                }
            } catch (error) {
                console.error(`Error generating content for section "${heading}":`, error);
                responses.set(heading, `*Information about ${heading.toLowerCase()} will be added here.*`);
            }

            // Rate limiting between AI calls
            await this.delay(1000);
        }

        return responses;
    }

    /**
     * Generate dynamic frontmatter using FrontmatterExtractorAgent.
     */
    private async generateDynamicFrontmatter(
        currentContent: string,
        searchTerm: string,
        ragContext: any
    ): Promise<string> {
        if (!this.subagentCoordinator) {
            console.warn('SubagentCoordinator not available, using static frontmatter');
            return this.extractCurrentFrontmatter(currentContent);
        }

        try {
            // Extract existing frontmatter structure
            const currentFrontmatter = this.extractCurrentFrontmatter(currentContent);
            const noteContentWithoutFrontmatter = this.removeExistingFrontmatter(currentContent);

            const frontmatterResult = await this.subagentCoordinator.executeAgent('frontmatterExtractor', {
                task: `Generate contextual frontmatter for research note on "${searchTerm}"`,
                input: {
                    templateFrontmatter: currentFrontmatter,
                    noteContent: noteContentWithoutFrontmatter,
                    topic: searchTerm
                },
                ragContext: ragContext
            });

            if (frontmatterResult.success) {
                console.log(`✨ Generated dynamic frontmatter using FrontmatterExtractorAgent`);
                // ALWAYS clean thinking tags from AI-generated frontmatter
                const cleanedOutput = this.removeThinkingTags(frontmatterResult.output, true);
                return cleanedOutput;
            } else {
                console.warn(`FrontmatterExtractorAgent failed: ${frontmatterResult.reasoning}`);
                return currentFrontmatter;
            }
        } catch (error) {
            console.error('Error generating dynamic frontmatter:', error);
            return this.extractCurrentFrontmatter(currentContent);
        }
    }

    /**
     * Apply all updates with mandatory sections ensured.
     */
    private async applyAllUpdatesWithMandatorySections(
        currentContent: string,
        item: ChecklistItem,
        sectionResponses: Map<string, string>,
        frontmatterResponse: string,
        wisdom: ExtractedWisdom,
        vaultNotes: VaultNote[],
        webSearchNotes: WebSearchNote[]
    ): Promise<string> {
        let updatedContent = currentContent;

        // Generate intelligent tags for the research note using centralized system
        const enhancedFrontmatter = await this.enhanceFrontmatterWithCentralizedTags(
            frontmatterResponse, 
            updatedContent, 
            item.name
        );
        
        // Update frontmatter
        updatedContent = this.replaceFrontmatter(updatedContent, enhancedFrontmatter);

        // Ensure mandatory sections are present
        updatedContent = this.ensureMandatorySections(updatedContent);

        // Apply section responses
        for (const [sectionName, response] of sectionResponses.entries()) {
            updatedContent = this.replacePlaceholder(updatedContent, `## ${sectionName}`, response);
        }

        // Update mandatory sections with specific content
        const vaultRefs = vaultNotes.map(note => `- [[${note.file.basename}]]`).join('\n');
        updatedContent = this.replacePlaceholder(updatedContent, '## 📚 Vault References', vaultRefs);

        const webRefs = webSearchNotes.map(note => `- [[${note.file.basename}]]`).join('\n');
        updatedContent = this.replacePlaceholder(updatedContent, '## 🌐 Web Search Sources', webRefs);

        // Update research status
        const researchStatus = `- [x] Vault notes analyzed (${vaultNotes.length} found)
- [x] Web search completed (${webSearchNotes.length} sources)
- [x] RAG system populated with ${vaultNotes.length + webSearchNotes.length} documents
- [x] AI agents generated section content
- [x] Wisdom extracted and processed`;
        
        updatedContent = this.replacePlaceholder(updatedContent, '## 📊 Research Status', researchStatus);

        return updatedContent;
    }

    /**
     * Ensure mandatory sections are present in the content.
     */
    private ensureMandatorySections(content: string): string {
        const mandatorySections = [
            '## 📊 Research Status',
            '## 📚 Vault References', 
            '## 🌐 Web Search Sources'
        ];

        let updatedContent = content;

        for (const section of mandatorySections) {
            if (!updatedContent.includes(section)) {
                // Add section before the last section or at the end
                const lastSectionMatch = updatedContent.match(/\n## [^#\n]+\n[^]*$/);
                if (lastSectionMatch) {
                    const insertPoint = updatedContent.lastIndexOf(lastSectionMatch[0]);
                    updatedContent = updatedContent.slice(0, insertPoint) + 
                                   `\n${section}\n*[Content will be populated automatically]*\n` + 
                                   updatedContent.slice(insertPoint);
                } else {
                    updatedContent += `\n${section}\n*[Content will be populated automatically]*\n`;
                }
                console.log(`📝 Added mandatory section: ${section}`);
            }
        }

        return updatedContent;
    }

    /**
     * Remove <thinking> tags from AI responses based on settings.
     */
    private removeThinkingTags(content: string, forceCleaning: boolean = false): string {
        const showThinkingTags = this.plugin?.settings?.research?.defaults?.showThinkingTags || false;
        
        // If forceCleaning is true (for frontmatter), always remove thinking tags regardless of settings
        const shouldShowTags = forceCleaning ? false : showThinkingTags;
        
        if (forceCleaning || !shouldShowTags) {
            // ULTRA-AGGRESSIVE removal for frontmatter - remove ALL content between tags
            let cleaned = content;
            
            // Multiple passes with different patterns to catch all variations
            for (let i = 0; i < 7; i++) {
                const beforeClean = cleaned;
                
                // Primary patterns - remove EVERYTHING between tags (greedy and non-greedy)
                cleaned = cleaned
                  .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')  // Non-greedy
                  .replace(/<thinking>[\s\S]*<\/thinking>/gi, '')   // Greedy for nested
                  .replace(/<think>[\s\S]*?<\/think>/gi, '')       // Non-greedy  
                  .replace(/<think>[\s\S]*<\/think>/gi, '')        // Greedy for nested
                  
                  // Handle broken/malformed tags
                  .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '')
                  .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
                  
                  // Handle cases where closing tag might be missing
                  .replace(/<thinking>[\s\S]*$/gi, '')  // From opening tag to end
                  .replace(/<think>[\s\S]*$/gi, '')     // From opening tag to end
                  
                  // Clean up orphaned closing tags
                  .replace(/<\/thinking>/gi, '')
                  .replace(/<\/think>/gi, '')
                  
                  // Clean up orphaned opening tags  
                  .replace(/<thinking[^>]*>/gi, '')
                  .replace(/<think[^>]*>/gi, '')
                  
                  // Remove field names that might appear in YAML
                  .replace(/^\s*thinking\s*:\s*.*$/gmi, '')  // Remove thinking: field lines
                  .replace(/^\s*think\s*:\s*.*$/gmi, '');    // Remove think: field lines
                
                // Break if no changes were made
                if (cleaned === beforeClean) break;
            }
            
            // Final cleanup
            return cleaned
              .replace(/\n\s*\n\s*\n/g, '\n\n')  // Reduce multiple newlines
              .replace(/^\s*\n/gm, '')           // Remove lines with only whitespace
              .replace(/\n\s*$/g, '')            // Remove trailing whitespace lines
              .trim();
        }
        
        return processThinkingTags(content, { showThinkingTags: shouldShowTags });
    }

    /**
     * Generate a meaningful project name from checklist items.
     */
    private generateProjectName(checklist: ChecklistItem[]): string {
        if (!checklist || checklist.length === 0) {
            return `Research Project ${new Date().toLocaleDateString()}`;
        }

        // Get the first few item names to create a meaningful project title
        const itemNames = checklist.slice(0, 3).map(item => item.name);
        
        if (itemNames.length === 1) {
            return `${itemNames[0]} Research`;
        } else if (itemNames.length === 2) {
            return `${itemNames[0]} & ${itemNames[1]} Research`;
        } else {
            // For 3+ items, show first two and indicate there are more
            return `${itemNames[0]}, ${itemNames[1]} & ${checklist.length - 2} More Research`;
        }
    }

    /**
     * Extract current frontmatter from content.
     */
    private extractCurrentFrontmatter(content: string): string {
        return extractFrontmatter(content).frontmatter;
    }

    /**
     * Remove existing frontmatter from content.
     */
    private removeExistingFrontmatter(content: string): string {
        return extractFrontmatter(content).content;
    }

    /**
     * Replace frontmatter in content with proper cleanup.
     */
    private replaceFrontmatter(content: string, newFrontmatter: string): string {
        // Clean frontmatter of any thinking tags and formatting issues
        const cleanedFrontmatter = this.cleanFrontmatter(newFrontmatter);
        return replaceFrontmatter(content, cleanedFrontmatter);
    }

    /**
     * Clean frontmatter of thinking tags and format properly for YAML.
     */
    private cleanFrontmatter(frontmatter: string): string {
        let cleaned = frontmatter;
        
        // AGGRESSIVE thinking tag removal - do this FIRST and MULTIPLE times
        for (let i = 0; i < 3; i++) {
            cleaned = cleaned
              .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
              .replace(/<think>[\s\S]*?<\/think>/gi, '')
              .replace(/<\/thinking>/gi, '')
              .replace(/<thinking>/gi, '')
              .replace(/<\/think>/gi, '')
              .replace(/<think>/gi, '');
        }
        
        // Force clean using the utility function
        cleaned = this.removeThinkingTags(cleaned, true);
        
        // Fix YAML formatting issues AFTER cleaning thinking tags
        cleaned = this.formatYAMLFrontmatter(cleaned);
        
        // Final aggressive cleanup of any remaining artifacts
        cleaned = cleaned
          .replace(/thinking[\s]*:/gi, '') // Remove thinking field names
          .replace(/think[\s]*:/gi, '') // Remove think field names
          .replace(/\n\n+/g, '\n')
          .replace(/^\s*\n/gm, '') // Remove empty lines
          .trim();
        
        console.log('🧹 Cleaned frontmatter, final result:', cleaned.substring(0, 200) + '...');
        
        return cleaned;
    }

    /**
     * Format frontmatter to ensure proper YAML structure.
     */
    private formatYAMLFrontmatter(frontmatter: string): string {
        const lines = frontmatter.split('\n');
        const formattedLines: string[] = [];
        
        for (const line of lines) {
            let cleanLine = line.trim();
            
            // Skip empty lines
            if (!cleanLine) continue;
            
            // Handle tags field specially to ensure proper YAML array format
            if (cleanLine.startsWith('tags:')) {
                const afterColon = cleanLine.substring(5).trim();
                
                if (afterColon.startsWith('- ')) {
                    // Format: "tags: - tag1" - split into proper YAML format
                    formattedLines.push('tags:');
                    const tagValue = afterColon.substring(2).trim();
                    const cleanTag = tagValue.replace(/^["']|["']$/g, ''); // Remove quotes
                    formattedLines.push(`  - ${cleanTag}`);
                } else if (afterColon === '') {
                    // Format: "tags:" - already correct
                    formattedLines.push('tags:');
                } else {
                    // Format: "tags: value" - treat as single tag
                    formattedLines.push('tags:');
                    const cleanTag = afterColon.replace(/^["']|["']$/g, ''); // Remove quotes
                    formattedLines.push(`  - ${cleanTag}`);
                }
            } else if (cleanLine.startsWith('-') && formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === 'tags:') {
                // This is a tag item - ensure proper indentation and no quotes around single words
                const tagValue = cleanLine.substring(1).trim();
                const cleanTag = tagValue.replace(/^["']|["']$/g, ''); // Remove quotes
                formattedLines.push(`  - ${cleanTag}`);
            } else if (cleanLine.startsWith('-') && formattedLines.length > 0 && formattedLines[formattedLines.length - 1].startsWith('  -')) {
                // Continue tag list
                const tagValue = cleanLine.substring(1).trim();
                const cleanTag = tagValue.replace(/^["']|["']$/g, ''); // Remove quotes
                formattedLines.push(`  - ${cleanTag}`);
            } else {
                // Regular frontmatter field
                formattedLines.push(cleanLine);
            }
        }
        
        return formattedLines.join('\n');
    }

    /**
     * Enhance frontmatter with intelligent tags using CentralizedTaggingSystem.
     */
    private async enhanceFrontmatterWithCentralizedTags(
        originalFrontmatter: string,
        noteContent: string,
        researchTopic: string
    ): Promise<string> {
        try {
            // Import and initialize centralized tagging system
            const { CentralizedTaggingSystem } = await import('../features/content-processing/services/centralized-tagging-system');
            
            const aiProvider = await this.plugin.getAIProvider();
            if (!aiProvider) {
                console.warn('No AI provider available for tagging');
                return originalFrontmatter;
            }
            
            const centralizedTagger = new CentralizedTaggingSystem(
                this.app,
                aiProvider,
                this.plugin.vaultPatterns || { tagPatterns: [], dateFormats: [], linkPatterns: [], orphans: [] }
            );

            // Generate content for tag analysis (combine topic + note content)
            const contentForAnalysis = `# ${researchTopic}\n\n${this.removeExistingFrontmatter(noteContent)}`;

            // Generate smart tags with research context
            const tagResult = await centralizedTagger.generateSmartTags(
                contentForAnalysis,
                `research topic: ${researchTopic}`,
                {
                    maxTags: 8,
                    minConfidence: 0.4,
                    includeHierarchical: true,
                    preserveExisting: true,
                    formatStyle: 'yaml-list'
                }
            );

            if (tagResult.normalized.length === 0) {
                console.log('🏷️ No valid tags generated for research note');
                return originalFrontmatter;
            }

            // Generate AI-powered research type based on content and vault trends
            const researchType = await this.generateResearchType(contentForAnalysis, researchTopic);
            
            // Format tags properly for YAML frontmatter
            const formattedTags = centralizedTagger.formatTagsForYAML(tagResult.normalized, 'yaml-list');
            
            // Update the frontmatter with properly formatted tags and research type
            let enhancedFrontmatter = this.updateFrontmatterWithFormattedTags(originalFrontmatter, formattedTags);
            enhancedFrontmatter = this.updateFrontmatterField(enhancedFrontmatter, 'researchType', researchType);
            
            // Ensure research/general gets replaced with research/{researchType}
            enhancedFrontmatter = enhancedFrontmatter.replace(
                /(\s*-\s*)research\/general\b/g, 
                `$1research/${researchType}`
            );
            
            console.log(`🏷️ CentralizedTagger added ${tagResult.normalized.length} standardized tags for "${researchTopic}": ${tagResult.normalized.join(', ')}`);
            
            return enhancedFrontmatter;
            
        } catch (error) {
            console.error('Failed to enhance frontmatter with centralized tags:', error);
            return originalFrontmatter;
        }
    }

    /**
     * Generate AI-powered research type based on content and vault trends
     */
    private async generateResearchType(content: string, topic: string): Promise<string> {
        try {
            // Get vault tag patterns to understand common research areas
            const vaultPatterns = this.plugin.vaultPatterns?.tagPatterns || [];
            const commonResearchAreas = vaultPatterns
                .filter(p => p.pattern.includes('research') || p.pattern.includes('/'))
                .map(p => p.pattern.replace(/^#+/, ''))
                .slice(0, 10);

            const prompt = `Based on the research content and common patterns in this vault, determine the most appropriate research subcategory.

**Content Analysis:**
Topic: ${topic}
Content: ${content.slice(0, 1000)}...

**Vault Research Patterns:**
${commonResearchAreas.length > 0 ? commonResearchAreas.join(', ') : 'medical, technology, academic, business, social, scientific, historical'}

**Instructions:**
1. Analyze the content to understand the research domain
2. Consider the vault's existing research patterns 
3. Return ONLY a single word/phrase that best categorizes this research
4. Use lowercase with hyphens (e.g., "medical", "technology", "social-science", "business-analysis")
5. If uncertain, use "general"

Research Type:`;

            const aiProvider = await this.plugin.getAIProvider();
            if (!aiProvider) {
                console.warn('No AI provider available for research type generation');
                return 'general';
            }
            
            const response = await aiProvider.generateResponse(prompt);
            const researchType = response.trim().toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 20);

            return researchType || 'general';

        } catch (error) {
            console.error('Failed to generate research type:', error);
            return 'general';
        }
    }


    /**
     * Update frontmatter with properly formatted tags
     */
    private updateFrontmatterWithFormattedTags(frontmatter: string, formattedTags: string): string {
        try {
            // Remove existing tags section
            const lines = frontmatter.split('\n');
            const filteredLines: string[] = [];
            let inTagsSection = false;
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine.startsWith('tags:')) {
                    inTagsSection = true;
                    // Don't add this line, we'll replace with formatted tags
                    continue;
                } else if (inTagsSection && trimmedLine.startsWith('- ')) {
                    // Skip tag lines
                    continue;
                } else if (inTagsSection && trimmedLine.length > 0 && !trimmedLine.startsWith(' ')) {
                    // End of tags section
                    inTagsSection = false;
                    filteredLines.push(line);
                } else if (!inTagsSection) {
                    filteredLines.push(line);
                }
            }
            
            // Add the new formatted tags section
            // Find the position to insert tags (before closing ---)
            let insertIndex = filteredLines.length - 1; // Before the last line (---)
            for (let i = 1; i < filteredLines.length - 1; i++) {
                if (filteredLines[i].trim() === '---') {
                    insertIndex = i;
                    break;
                }
            }
            
            if (formattedTags && formattedTags.trim()) {
                filteredLines.splice(insertIndex, 0, formattedTags);
            }
            
            return filteredLines.join('\n');
            
        } catch (error) {
            console.error('Failed to update frontmatter with formatted tags:', error);
            return frontmatter;
        }
    }

    /**
     * Extract tags from YAML frontmatter.
     */
    private extractTagsFromFrontmatter(frontmatter: string): string[] {
        const tags: string[] = [];
        const lines = frontmatter.split('\n');
        
        let inTagsSection = false;
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('tags:')) {
                inTagsSection = true;
                // Handle inline tags: tags: [tag1, tag2]
                const inlineMatch = trimmed.match(/tags:\s*\[(.*?)\]/);
                if (inlineMatch) {
                    const inlineTags = inlineMatch[1]
                        .split(',')
                        .map(tag => tag.trim().replace(/["']/g, ''))
                        .filter(tag => tag.length > 0);
                    tags.push(...inlineTags);
                    inTagsSection = false;
                }
            } else if (inTagsSection && trimmed.startsWith('- ')) {
                // Handle YAML array format: - tag
                const tag = trimmed.replace('- ', '').replace(/["']/g, '').trim();
                if (tag.length > 0) {
                    tags.push(tag);
                }
            } else if (inTagsSection && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
                // End of tags section
                inTagsSection = false;
            }
        }
        
        return tags;
    }

    /**
     * Update frontmatter with enhanced tags.
     */
    private updateFrontmatterTags(frontmatter: string, tags: string[]): string {
        const lines = frontmatter.split('\n');
        const updatedLines: string[] = [];
        let tagsReplaced = false;
        let inTagsSection = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('tags:')) {
                // Replace tags section
                if (tags.length > 0) {
                    updatedLines.push('tags:');
                    tags.forEach(tag => {
                        updatedLines.push(`  - ${tag}`);
                    });
                } else {
                    updatedLines.push('tags: []');
                }
                tagsReplaced = true;
                inTagsSection = true;
                
                // Skip inline tags if present
                if (!trimmed.match(/tags:\s*\[.*?\]/)) {
                    continue;
                }
            } else if (inTagsSection && (trimmed.startsWith('- ') || trimmed.startsWith('  - '))) {
                // Skip existing tag lines, they're already replaced
                continue;
            } else if (inTagsSection && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
                // End of tags section
                inTagsSection = false;
                updatedLines.push(line);
            } else {
                updatedLines.push(line);
            }
        }
        
        // If no tags section existed, add it after title
        if (!tagsReplaced && tags.length > 0) {
            const titleIndex = updatedLines.findIndex(line => line.trim().startsWith('title:'));
            const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 1;
            
            updatedLines.splice(insertIndex, 0, 'tags:');
            tags.forEach(tag => {
                updatedLines.splice(insertIndex + 1, 0, `  - ${tag}`);
            });
        }
        
        return updatedLines.join('\n');
    }

    /**
     * Get shared vault patterns for research context
     */
    getVaultPatterns(): VaultPatterns | null {
        return this.plugin?.vaultPatterns || null;
    }

    /**
     * Utility delay function
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}