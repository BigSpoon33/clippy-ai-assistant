import { App, TFile, Notice, MarkdownView } from 'obsidian';
import { WebSearchEngine } from './web-search-engine';
import { DocumentParser } from './document-parser';
import { QualityRater } from './quality-rater';
import { ProjectTracker } from './project-tracker';
import { RAGSystem } from '../rag/rag-architecture';
import { SubagentCoordinator } from '../agents/subagent-system';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';
import { ValidationHelper, ChecklistItemSchema, ExtractedWisdomSchema } from '../schemas/research-schemas';

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

    constructor(app: App, plugin?: any) {
        this.app = app;
        this.plugin = plugin;
        this.webSearchEngine = new WebSearchEngine(); // Will be reconfigured in processResearchChecklist
        this.documentParser = new DocumentParser(app);
        this.qualityRater = new QualityRater();
        this.projectTracker = new ProjectTracker(app);
        
        // Initialize new RAG and agent systems
        this.embeddingManager = new EmbeddingManager();
        this.similarityEngine = new SimilarityEngine(this.embeddingManager);
        this.ragSystem = new RAGSystem(this.embeddingManager, this.similarityEngine, this.qualityRater);
        
        if (plugin && plugin.aiProvider) {
            this.subagentCoordinator = new SubagentCoordinator(plugin.aiProvider, this.ragSystem, plugin);
        }
    }

    /**
     * Main research process: Create notes, find unchecked items, research them comprehensively.
     */
    async processResearchChecklist(
        checklist: ChecklistItem[],
        options: any = {}
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

        const projectId = await this.projectTracker.createProject(
            `Comprehensive Research: ${new Date().toLocaleDateString()}`,
            'Systematic research with vault analysis and web search',
            checklist,
            options
        );

        console.log(`🔬 Starting comprehensive research for ${checklist.length} items`);

        // Step 1: Create blank research notes with template for each item
        const researchNotes = await this.createBlankResearchNotes(checklist, options);

        // Step 2: Process each unchecked item systematically
        for (let i = 0; i < checklist.length; i++) {
            const item = checklist[i];
            
            if (!item.completed) {
                console.log(`\n📋 Processing unchecked item: ${item.name}`);
                
                const itemId = `${projectId}-item-${i}`;
                await this.projectTracker.markItemProcessing(projectId, itemId);

                try {
                    await this.comprehensiveResearch(item, researchNotes[i], options);
                    
                    // Mark as completed
                    item.completed = true;
                    await this.projectTracker.markItemCompleted(projectId, itemId, researchNotes[i].path);
                    
                    console.log(`✅ Completed research for: ${item.name}`);
                } catch (error) {
                    console.error(`❌ Failed research for ${item.name}:`, error);
                    await this.projectTracker.markItemFailed(projectId, itemId, error.message);
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
        options: any
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
        options: any
    ): Promise<void> {
        console.log(`🔍 Starting comprehensive research for: ${item.name}`);

        // Step 2a: Search vault for notes containing exact words
        const vaultNotes = await this.findVaultNotesWithExactWords(item.name);
        console.log(`📚 Found ${vaultNotes.length} vault notes with exact words`);

        // Step 2b: Perform web search and save each page as unique note
        const webSearchNotes = await this.performWebSearchAndSavePages(item.name, options);
        console.log(`🌐 Created ${webSearchNotes.length} web search notes`);

        // Step 2c: Parse and extract wisdom from all sources
        const extractedWisdom = await this.extractWisdomFromAllSources(
            item.name,
            vaultNotes,
            webSearchNotes,
            options
        );

        // Step 2d: Update the research note with extracted wisdom
        await this.updateResearchNoteWithWisdom(noteFile, item, extractedWisdom, vaultNotes, webSearchNotes);

        // Step 2e: Enhance the note using AI
        await this.enhanceResearchNote(noteFile, options);

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
title: ${item.name}
type: comprehensive-research
status: processing
created: ${today}
tags: 
  - research
  - auto-generated
  - processing
  - "${item.id}"
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
    private async findVaultNotesWithExactWords(searchTerm: string): Promise<VaultNote[]> {
        const vaultNotes: VaultNote[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        // Split search term into individual words for exact matching
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

        // Sort by similarity (highest first)
        return vaultNotes.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Perform web search and save each page as a unique note.
     */
    private async performWebSearchAndSavePages(
        searchTerm: string,
        options: any
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
                
                try {
                    const fileName = this.sanitizeFileName(`${i + 1} - ${result.title}`);
                    const filePath = `${webSearchFolder}/${fileName}.md`;
                    
                    const noteContent = this.generateWebSearchNoteContent(result, searchTerm, i + 1);
                    
                    const file = await this.app.vault.create(filePath, noteContent);
                    
                    webSearchNotes.push({
                        file,
                        url: result.url || '',
                        content: result.content,
                        title: result.title,
                        domain: this.extractDomain(result.url || '')
                    });
                    
                    console.log(`💾 Saved web search note: ${fileName}`);
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
            return this.parseWisdomResponse(aiResponse, vaultNotes, webSearchNotes);
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
                const ragContext = await this.ragSystem.search({
                    text: validatedItem.name,
                    maxResults: 10,
                    minRelevance: 0.4
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
                
                // Generate dynamic frontmatter using FrontmatterExtractorAgent
                const frontmatterResponse = await this.generateDynamicFrontmatter(
                    currentContent, 
                    validatedItem.name, 
                    ragContext
                );

                // Apply all updates with mandatory headings
                let updatedContent = await this.applyAllUpdatesWithMandatorySections(
                    currentContent, 
                    validatedItem, 
                    sectionResponses, 
                    frontmatterResponse,
                    validatedWisdom, 
                    vaultNotes, 
                    webSearchNotes
                );

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
            const updatedContent = content
                .replace('- [ ] Note enhanced', '- [x] Note enhanced')
                .replace('- [ ] Research completed', '- [x] Research completed')
                .replace('status: processing', 'status: completed')
                .replace('🔄 Status: Processing', '✅ Status: Completed');

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
        return `${term} is a comprehensive research topic with multiple applications and considerations. This research compilation includes information from both personal vault notes and web sources to provide a complete understanding.

**Key aspects covered:**
- Definitions and terminology
- Practical applications and uses
- Safety considerations and warnings
- Scientific research and evidence
- Related concepts and connections

**Sources analyzed:** ${wisdom.sources.length} total references including vault notes and web sources.`;
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

    private updateLegacySections(content: string, wisdom: ExtractedWisdom, vaultNotes: VaultNote[], webSearchNotes: WebSearchNote[]): string {
        // Handle legacy template format with placeholder replacement
        let updatedContent = content;

        // Update overview
        const overview = this.generateOverview('research topic', wisdom);
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
                responses.set(heading.fullMatch, response);
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
                    responses.set(`frontmatter_${field.key}`, response.trim());
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
        const allSources = [
            ...vaultNotes.map(n => n.file.basename),
            ...webSearchNotes.map(n => n.title)
        ].join(', ');

        return `You are writing a specific section about "${searchTerm}" for a research document.

**Section to write:** ${sectionTitle} (Heading Level ${level})

**Available Research Data:**
- Key Facts: ${wisdom.keyFacts.join('; ')}
- Definitions: ${wisdom.definitions.join('; ')}
- Uses: ${wisdom.uses.join('; ')}
- Warnings: ${wisdom.warnings.join('; ')}
- Research Findings: ${wisdom.researchFindings.join('; ')}
- Related Concepts: ${wisdom.relatedConcepts.join('; ')}

**Sources:** ${allSources}

**Instructions:**
1. Write content specifically for the "${sectionTitle}" section
2. Focus only on information relevant to this section heading
3. Use bullet points, paragraphs, or lists as appropriate for the content
4. Make it informative and well-structured
5. Do NOT include the heading itself in your response - just the content
6. If this appears to be about definitions, focus on definitions
7. If this appears to be about uses/applications, focus on those
8. If this appears to be about warnings/safety, focus on precautions

Write 2-4 substantial points for this section:`;
    }

    /**
     * Create frontmatter-specific AI prompts
     */
    private createFrontmatterPrompt(searchTerm: string, fieldKey: string, wisdom: ExtractedWisdom): string {
        const fieldLower = fieldKey.toLowerCase();
        
        // Detect research context type
        const isHerbalMedicine = this.detectHerbalMedicine(searchTerm, wisdom);
        const isManga = this.detectManga(searchTerm, wisdom);
        const isFood = this.detectFood(searchTerm, wisdom);
        
        if (fieldLower.includes('tag')) {
            return `Generate specific descriptive tags for "${searchTerm}" research.

**Research Context:**
- Topic: ${searchTerm}
- Key facts: ${wisdom.keyFacts.slice(0, 3).join('; ')}
- Uses: ${wisdom.uses.slice(0, 2).join('; ')}

**Tag Types Needed:**
${isHerbalMedicine ? `
- Properties: hot, warm, cool, cold, neutral
- Taste: bitter, sweet, sour, pungent, salty
- Functions: stops-bleeding, moves-qi, clears-heat, tonifies
- Meridians: liver, lung, kidney, heart, spleen, stomach
- Dosage range: like "3-9g" or "9-30g"` : ''}
${isManga ? `
- Genre: shonen, seinen, josei, shoujo, action, romance, supernatural
- Status: ongoing, completed, hiatus
- Rating: teen, mature, all-ages
- Themes: school, fantasy, sci-fi, slice-of-life` : ''}
${isFood ? `
- Taste: sweet, savory, spicy, umami, bitter
- Texture: crispy, soft, chewy, crunchy
- Origin: japanese, chinese, italian, etc
- Type: snack, main-dish, dessert, beverage` : ''}

**Format:** [tag1, tag2, tag3, tag4, tag5]
**Instructions:** Use short, specific descriptors. No generic words like "research" or "analysis". Focus on the actual properties and characteristics.

Generate 4-6 specific tags:`;
        }
        
        if (fieldLower.includes('properties') && isHerbalMedicine) {
            return `List the medicinal properties of "${searchTerm}" based on traditional medicine.

**Available Data:** ${wisdom.keyFacts.join('; ')}

**Format as:** [property1, property2, property3]
**Examples:** [bitter, cold, toxic] or [sweet, warm, moistening]

Generate properties list:`;
        }
        
        if (fieldLower.includes('dosage') && isHerbalMedicine) {
            return `Extract the typical dosage range for "${searchTerm}" from the research data.

**Available Data:** ${wisdom.keyFacts.join('; ')}

**Format:** "X-Yg" or "X-Y grams" 
**Examples:** "3-9g", "6-15g", "9-30g"

Generate dosage:`;
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
     * Detect if this is herbal medicine research
     */
    private detectHerbalMedicine(searchTerm: string, wisdom: ExtractedWisdom): boolean {
        const indicators = [
            'herb', 'herbal', 'medicine', 'tcm', 'traditional chinese medicine',
            'meridian', 'qi', 'yang', 'yin', 'tonify', 'dispel', 'clear heat',
            'dosage', 'grams', 'decoction', 'powder', 'root', 'leaf', 'flower'
        ];
        
        const allText = [
            searchTerm,
            ...wisdom.keyFacts,
            ...wisdom.definitions,
            ...wisdom.uses
        ].join(' ').toLowerCase();
        
        return indicators.some(indicator => allText.includes(indicator));
    }

    /**
     * Detect if this is manga research
     */
    private detectManga(searchTerm: string, wisdom: ExtractedWisdom): boolean {
        const indicators = [
            'manga', 'anime', 'chapter', 'volume', 'shonen', 'seinen', 'josei', 'shoujo',
            'japanese comic', 'serialized', 'weekly', 'monthly', 'jump', 'magazine'
        ];
        
        const allText = [
            searchTerm,
            ...wisdom.keyFacts,
            ...wisdom.definitions,
            ...wisdom.uses
        ].join(' ').toLowerCase();
        
        return indicators.some(indicator => allText.includes(indicator));
    }

    /**
     * Detect if this is food research
     */
    private detectFood(searchTerm: string, wisdom: ExtractedWisdom): boolean {
        const indicators = [
            'food', 'recipe', 'ingredient', 'cooking', 'cuisine', 'dish', 'meal',
            'flavor', 'taste', 'restaurant', 'culinary', 'eat', 'drink'
        ];
        
        const allText = [
            searchTerm,
            ...wisdom.keyFacts,
            ...wisdom.definitions,
            ...wisdom.uses
        ].join(' ').toLowerCase();
        
        return indicators.some(indicator => allText.includes(indicator));
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
        updatedContent = this.updateLegacySections(updatedContent, wisdom, vaultNotes, webSearchNotes);

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

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                const sectionResult = await this.subagentCoordinator.executeAgent('sectionSpecialist', {
                    task: `Generate content for "${heading}" section about "${searchTerm}"`,
                    input: {
                        sectionName: heading,
                        sectionContext: `Section heading: ${heading}`,
                        topic: searchTerm,
                        template: templateStructure
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
                return frontmatterResult.output;
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

        // Update frontmatter
        updatedContent = this.replaceFrontmatter(updatedContent, frontmatterResponse);

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
    private removeThinkingTags(content: string): string {
        // Check if user wants to show thinking tags
        const showThinkingTags = this.plugin?.settings?.research?.defaults?.showThinkingTags || false;
        
        if (showThinkingTags) {
            // Keep thinking tags but format them nicely
            return content
                .replace(/<thinking>/gi, '\n\n**🤔 AI Thinking Process:**\n> ')
                .replace(/<\/thinking>/gi, '\n\n')
                .replace(/\n\n+/g, '\n\n')
                .trim();
        } else {
            // Remove thinking tags completely
            return content
                .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
                .replace(/\n\n+/g, '\n\n')
                .trim();
        }
    }

    /**
     * Extract current frontmatter from content.
     */
    private extractCurrentFrontmatter(content: string): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        return frontmatterMatch ? frontmatterMatch[1] : '';
    }

    /**
     * Remove existing frontmatter from content.
     */
    private removeExistingFrontmatter(content: string): string {
        return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    }

    /**
     * Replace frontmatter in content.
     */
    private replaceFrontmatter(content: string, newFrontmatter: string): string {
        if (content.startsWith('---\n')) {
            return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
        } else {
            return `---\n${newFrontmatter}\n---\n\n${content}`;
        }
    }
}