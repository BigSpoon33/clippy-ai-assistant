/**
 * CLIPPY AI Assistant - Unified Tag Manager
 * 
 * Consolidated tagging system that handles all tag-related functionality:
 * - AI-powered tag generation (Ollama and other providers)
 * - Hierarchical tag organization
 * - YAML frontmatter formatting
 * - Vault-wide tag consistency
 * - Pattern-based suggestions
 */

import { App, TFile, Editor } from 'obsidian';
import { AIProvider, VaultPatterns, ClippySettings } from '../../../types';
import { AutoTagger, TagSuggestion } from '../processors/auto-tagger';
import { TagEditor } from './tag-editor';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

export interface TagHierarchy {
    category: string;
    subcategories: string[];
    standardTags: string[];
    patterns: RegExp[];
}

export interface TagOptions {
    maxTags?: number;
    minConfidence?: number;
    includeHierarchical?: boolean;
    preserveExisting?: boolean;
    formatStyle?: 'yaml-list' | 'yaml-array';
    provider?: 'auto' | 'ollama' | 'openai' | 'anthropic';
}

export interface TagValidationResult {
    valid: string[];
    invalid: string[];
    normalized: string[];
    hierarchical: string[];
}

export interface TagGenerationResult {
    suggestions: TagSuggestion[];
    validation: TagValidationResult;
    formatted: string;
}

/**
 * Unified tagging system for consistent, intelligent tagging across Clippy
 */
export class TagManager {
    private app: App;
    private aiProvider: AIProvider;
    private vaultPatterns: VaultPatterns;
    private settings: ClippySettings;
    private autoTagger: AutoTagger;
    private tagEditor: TagEditor;
    
    // Hierarchical tag system with broad categories and specific subcategories
    private readonly TAG_HIERARCHIES: TagHierarchy[] = [
        {
            category: 'academic',
            subcategories: ['study', 'research', 'learning', 'coursework'],
            standardTags: [
                'academic/study', 'academic/research', 'academic/coursework',
                'academic/university', 'academic/homework', 'academic/exam',
                'academic/thesis', 'academic/paper', 'academic/literature-review'
            ],
            patterns: [/study|research|learn|course|school|university|education|academic/i]
        },
        {
            category: 'work',
            subcategories: ['project', 'meeting', 'task', 'planning'],
            standardTags: [
                'work/project', 'work/meeting', 'work/task', 'work/planning',
                'work/deadline', 'work/collaboration', 'work/presentation',
                'work/review', 'work/documentation', 'work/strategy'
            ],
            patterns: [/work|project|meeting|task|todo|deadline|business|professional/i]
        },
        {
            category: 'personal',
            subcategories: ['health', 'fitness', 'travel', 'family', 'hobbies'],
            standardTags: [
                'personal/health', 'personal/fitness', 'personal/travel',
                'personal/family', 'personal/friends', 'personal/hobbies',
                'personal/goals', 'personal/journal', 'personal/reflection'
            ],
            patterns: [/health|fitness|travel|family|friend|hobby|personal|life/i]
        },
        {
            category: 'tech',
            subcategories: ['programming', 'tools', 'learning', 'projects'],
            standardTags: [
                'tech/programming', 'tech/code', 'tech/software', 'tech/development',
                'tech/tools', 'tech/ai', 'tech/web', 'tech/mobile', 'tech/data',
                'tech/security', 'tech/infrastructure', 'tech/api'
            ],
            patterns: [/programming|code|software|dev|tech|computer|digital|api/i]
        },
        {
            category: 'content',
            subcategories: ['reading', 'media', 'writing', 'creation'],
            standardTags: [
                'content/book', 'content/article', 'content/paper', 'content/blog',
                'content/video', 'content/podcast', 'content/movie', 'content/music',
                'content/writing', 'content/notes', 'content/documentation'
            ],
            patterns: [/book|article|paper|video|podcast|movie|music|content|media/i]
        },
        {
            category: 'research',
            subcategories: ['topic', 'method', 'source', 'analysis'],
            standardTags: [
                'research/topic', 'research/methodology', 'research/source',
                'research/analysis', 'research/data', 'research/literature',
                'research/findings', 'research/hypothesis', 'research/experiment'
            ],
            patterns: [/research|analysis|study|investigation|exploration|discovery/i]
        }
    ];

    constructor(
        app: App,
        aiProvider: AIProvider,
        vaultPatterns: VaultPatterns,
        settings: ClippySettings
    ) {
        this.app = app;
        this.aiProvider = aiProvider;
        this.vaultPatterns = vaultPatterns;
        this.settings = settings;
        this.autoTagger = new AutoTagger(aiProvider, vaultPatterns);
        this.tagEditor = new TagEditor();
    }

    /**
     * Generate comprehensive tag suggestions using multiple methods
     */
    async generateTagSuggestions(
        content: string,
        context?: string,
        options: TagOptions = {}
    ): Promise<TagGenerationResult> {
        const {
            maxTags = 8,
            minConfidence = 0.4,
            includeHierarchical = true,
            preserveExisting = true,
            formatStyle = 'yaml-list',
            provider = 'auto'
        } = options;

        try {
            // Get existing tags if preserving
            const existingTags = preserveExisting ? this.extractExistingTags(content) : [];
            
            // Gather suggestions from multiple sources
            let suggestions: TagSuggestion[] = [];

            // 1. AI-powered suggestions (Ollama, OpenAI, etc.)
            if (provider === 'auto' || provider === 'ollama' || provider === 'openai' || provider === 'anthropic') {
                const aiSuggestions = await this.generateAISuggestions(content, provider);
                suggestions.push(...aiSuggestions);
            }

            // 2. AutoTagger suggestions (pattern-based, keyword, similarity)
            const autoSuggestions = await this.autoTagger.suggestTags(content, existingTags);
            suggestions.push(...autoSuggestions);

            // 3. Hierarchical tags
            if (includeHierarchical) {
                const hierarchicalTags = this.generateHierarchicalTags(content, context);
                const hierarchicalSuggestions: TagSuggestion[] = hierarchicalTags.map(tag => ({
                    tag,
                    confidence: 0.7,
                    reason: 'Hierarchical category match',
                    source: 'pattern' as const,
                    category: tag.split('/')[0]
                }));
                suggestions.push(...hierarchicalSuggestions);
            }

            // Filter by confidence and limit
            const filteredSuggestions = suggestions
                .filter(s => s.confidence >= minConfidence)
                .slice(0, maxTags);

            // Combine and normalize all tags
            const allTags = [
                ...existingTags,
                ...filteredSuggestions.map(s => s.tag)
            ];

            const validation = this.validateAndNormalizeTags(allTags);
            const formatted = this.formatTagsForYAML(validation.normalized, formatStyle);

            return {
                suggestions: filteredSuggestions,
                validation,
                formatted
            };

        } catch (error) {
            console.error('CLIPPY TagManager: Failed to generate tag suggestions:', error);
            return {
                suggestions: [],
                validation: {
                    valid: [],
                    invalid: [],
                    normalized: [],
                    hierarchical: []
                },
                formatted: ''
            };
        }
    }

    /**
     * Generate AI-powered tag suggestions using configured provider
     */
    private async generateAISuggestions(
        content: string, 
        preferredProvider: string = 'auto'
    ): Promise<TagSuggestion[]> {
        return await ClippyErrorBoundaries.aiProviderOperation(
            async () => {
                const provider = preferredProvider === 'auto' ? this.settings.aiProvider : preferredProvider;
                
                switch (provider) {
                    case 'ollama':
                        return await this.generateTagsWithOllama(content);
                    case 'openai':
                        return await this.generateTagsWithOpenAI(content);
                    case 'anthropic':
                        return await this.generateTagsWithAnthropic(content);
                    default:
                        console.warn(`TagManager: Provider ${provider} not implemented for tagging, falling back to pattern matching`);
                        return [];
                }
            },
            'generate AI tag suggestions'
        ) || this.getFallbackTags();
    }

    /**
     * Generate tags using Ollama (migrated from TagGenerator)
     */
    private async generateTagsWithOllama(content: string): Promise<TagSuggestion[]> {
        const contentPreview = content.substring(0, 1000);
        const prompt = `You are a tag suggestion system. Analyze the content and return ONLY a JSON array of tag suggestions.

Content to analyze:
"""
${contentPreview}${content.length > 1000 ? '...' : ''}
"""

Rules:
- Suggest 3-6 relevant tags
- Use lowercase with hyphens (e.g. "machine-learning")
- Include confidence 0.1-1.0 and brief reason

Response format (ONLY return this JSON, nothing else):
[{"tag": "example-tag", "confidence": 0.8, "reason": "Main topic discussed"}]`;

        return await ClippyErrorBoundaries.networkOperation(
            async () => {
                const response = await fetch(`${this.settings.providers.ollama.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.settings.providers.ollama.model,
                        prompt: prompt,
                        stream: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`Ollama request failed: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.response) {
                    throw new Error('No response from Ollama');
                }

                return this.parseAITagResponse(data.response);
            },
            'Ollama tag generation'
        ) || this.extractTagsFromText(content);
    }

    /**
     * Generate tags using OpenAI (placeholder for future implementation)
     */
    private async generateTagsWithOpenAI(content: string): Promise<TagSuggestion[]> {
        // TODO: Implement OpenAI tag generation
        console.warn('TagManager: OpenAI tag generation not yet implemented');
        return [];
    }

    /**
     * Generate tags using Anthropic (placeholder for future implementation)
     */
    private async generateTagsWithAnthropic(content: string): Promise<TagSuggestion[]> {
        // TODO: Implement Anthropic tag generation
        console.warn('TagManager: Anthropic tag generation not yet implemented');
        return [];
    }

    /**
     * Parse AI response for tag suggestions (migrated from TagGenerator)
     */
    private parseAITagResponse(response: string): TagSuggestion[] {
        try {
            let cleanedResponse = response.trim();
            
            // Try to extract JSON array from response
            const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const tagSuggestions = JSON.parse(jsonMatch[0]);
                
                // Validate the response format
                if (Array.isArray(tagSuggestions)) {
                    // Validate and process each tag suggestion
                    const validatedTags = tagSuggestions
                        .filter(item => 
                            item.tag && 
                            typeof item.tag === 'string' &&
                            typeof item.confidence === 'number' &&
                            typeof item.reason === 'string'
                        )
                        .map(item => ({
                            tag: this.normalizeTagForYAML(item.tag),
                            confidence: Math.min(Math.max(item.confidence, 0), 1),
                            reason: item.reason,
                            source: 'ai' as const
                        }))
                        .filter(item => item.tag.length > 0);

                    if (validatedTags.length > 0) {
                        return validatedTags.slice(0, 8);
                    }
                }
            }
            
            throw new Error('No valid JSON array found in response');
        } catch (parseError) {
            // Fallback: extract tags from response text
            return this.extractTagsFromText(response);
        }
    }

    /**
     * Extract tags from text when JSON parsing fails (migrated from TagGenerator)
     */
    private extractTagsFromText(text: string): TagSuggestion[] {
        const tagPattern = /#([a-zA-Z0-9-]+)/g;
        const matches = text.match(tagPattern);
        
        if (!matches) {
            return this.getFallbackTags();
        }

        return matches
            .slice(0, 5)
            .map(match => ({
                tag: this.normalizeTagForYAML(match.substring(1)),
                confidence: 0.6,
                reason: 'Extracted from AI response',
                source: 'ai' as const
            }));
    }

    /**
     * Get fallback tags when AI fails (migrated from TagGenerator)
     */
    private getFallbackTags(): TagSuggestion[] {
        return [
            { 
                tag: 'general-note', 
                confidence: 0.5, 
                reason: 'Default tag when AI parsing failed',
                source: 'ai' as const
            }
        ];
    }

    /**
     * Generate hierarchical tags based on content and context
     */
    private generateHierarchicalTags(content: string, context?: string): string[] {
        const hierarchicalTags: string[] = [];
        const textToAnalyze = `${content} ${context || ''}`.toLowerCase();

        for (const hierarchy of this.TAG_HIERARCHIES) {
            // Check if content matches this category
            const matches = hierarchy.patterns.some(pattern => pattern.test(textToAnalyze));
            
            if (matches) {
                // Add category tag
                hierarchicalTags.push(hierarchy.category);
                
                // Add specific subcategory tags based on content
                for (const subcategory of hierarchy.subcategories) {
                    if (textToAnalyze.includes(subcategory)) {
                        hierarchicalTags.push(`${hierarchy.category}/${subcategory}`);
                    }
                }
                
                // Add any relevant standard tags
                for (const standardTag of hierarchy.standardTags) {
                    const tagKeywords = standardTag.split('/')[1].split('-');
                    if (tagKeywords.some(keyword => textToAnalyze.includes(keyword))) {
                        hierarchicalTags.push(standardTag);
                        break;
                    }
                }
            }
        }

        return hierarchicalTags;
    }

    /**
     * Validate and normalize tags for proper YAML frontmatter format
     */
    validateAndNormalizeTags(tags: string[]): TagValidationResult {
        const valid: string[] = [];
        const invalid: string[] = [];
        const normalized: string[] = [];
        const hierarchical: string[] = [];

        const seen = new Set<string>();

        for (const tag of tags) {
            if (!tag || typeof tag !== 'string') {
                invalid.push(String(tag));
                continue;
            }

            // Normalize tag format for YAML frontmatter
            const normalizedTag = this.normalizeTagForYAML(tag);
            
            // Validate normalized tag
            if (this.isValidYAMLTag(normalizedTag) && !seen.has(normalizedTag)) {
                valid.push(tag);
                normalized.push(normalizedTag);
                seen.add(normalizedTag);
                
                // Check if it's hierarchical
                if (normalizedTag.includes('/')) {
                    hierarchical.push(normalizedTag);
                }
            } else {
                invalid.push(tag);
            }
        }

        return {
            valid,
            invalid,
            normalized: [...new Set(normalized)],
            hierarchical: [...new Set(hierarchical)]
        };
    }

    /**
     * Normalize tag for YAML frontmatter (no # symbols, proper format)
     */
    private normalizeTagForYAML(tag: string): string {
        return tag
            .replace(/^#+/, '') // Remove leading # symbols
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9_/-]/g, '') // Remove special characters except _ / -
            .replace(/--+/g, '-') // Replace multiple hyphens with single
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            .substring(0, 50); // Limit length for YAML compatibility
    }

    /**
     * Validate tag for YAML frontmatter format
     */
    private isValidYAMLTag(tag: string): boolean {
        if (!tag || tag.length === 0 || tag.length > 50) return false;
        if (tag.startsWith('-') || tag.endsWith('-')) return false;
        if (tag.startsWith('/') || tag.endsWith('/')) return false;
        if (!/^[a-z0-9_/-]+$/.test(tag)) return false;
        
        return true;
    }

    /**
     * Extract existing tags from content (handles various formats)
     */
    private extractExistingTags(content: string): string[] {
        return this.tagEditor.getExistingTags(content);
    }

    /**
     * Format tags for YAML frontmatter
     */
    formatTagsForYAML(tags: string[], style: 'yaml-list' | 'yaml-array' = 'yaml-list'): string {
        if (tags.length === 0) return '';

        const validationResult = this.validateAndNormalizeTags(tags);
        const normalizedTags = validationResult.normalized;

        if (style === 'yaml-array') {
            // Array format: tags: [tag1, tag2, tag3]
            const tagList = normalizedTags.map(tag => `"${tag}"`).join(', ');
            return `tags: [${tagList}]`;
        } else {
            // List format (recommended):
            // tags:
            //   - tag1
            //   - tag2
            const tagLines = normalizedTags.map(tag => `  - ${tag}`);
            return `tags:\n${tagLines.join('\n')}`;
        }
    }

    /**
     * Apply tags directly to a note file
     */
    async applyTagsToNote(
        file: TFile,
        additionalContext?: string,
        options: TagOptions = {}
    ): Promise<boolean> {
        try {
            const content = await this.app.vault.read(file);
            const result = await this.generateTagSuggestions(content, additionalContext, options);
            
            if (result.validation.normalized.length === 0) {
                console.log('TagManager: No valid tags generated');
                return false;
            }

            // Create a mock editor to use with TagEditor
            const editor = {
                getValue: () => content,
                setValue: (newContent: string) => {
                    this.app.vault.modify(file, newContent);
                }
            } as any;

            this.tagEditor.addTagsToNote(editor, result.validation.normalized);
            
            console.log(`🏷️ Applied ${result.validation.normalized.length} tags to ${file.basename}:`, result.validation.normalized);
            return true;

        } catch (error) {
            console.error('TagManager: Failed to apply tags:', error);
            return false;
        }
    }

    /**
     * Apply tags to note content via editor
     */
    async applyTagsInEditor(
        editor: Editor,
        contextType: 'research' | 'user-note' | 'auto-generated' | 'general' = 'user-note',
        additionalContext?: string,
        options: TagOptions = {}
    ): Promise<boolean> {
        try {
            const content = editor.getValue();
            const context = this.buildContextString(contextType, additionalContext || '');
            
            const result = await this.generateTagSuggestions(content, context, {
                maxTags: 6,
                minConfidence: 0.4,
                includeHierarchical: true,
                preserveExisting: true,
                formatStyle: 'yaml-list',
                ...options
            });

            if (result.validation.normalized.length === 0) {
                return false;
            }

            this.tagEditor.addTagsToNote(editor, result.validation.normalized);
            return true;

        } catch (error) {
            console.error('TagManager: Failed to apply tags in editor:', error);
            return false;
        }
    }

    /**
     * Get standardized tags for a specific category
     */
    getStandardTagsForCategory(category: string): string[] {
        const hierarchy = this.TAG_HIERARCHIES.find(h => h.category === category);
        return hierarchy ? hierarchy.standardTags : [];
    }

    /**
     * Get all available tag categories
     */
    getTagCategories(): string[] {
        return this.TAG_HIERARCHIES.map(h => h.category);
    }

    /**
     * Clean and standardize existing vault tags
     */
    async standardizeVaultTags(): Promise<{ processed: number; standardized: number }> {
        const files = this.app.vault.getMarkdownFiles();
        let processed = 0;
        let standardized = 0;

        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                const existingTags = this.extractExistingTags(content);
                
                if (existingTags.length === 0) continue;

                const validationResult = this.validateAndNormalizeTags(existingTags);
                
                if (validationResult.invalid.length > 0) {
                    // Create mock editor for TagEditor
                    const editor = {
                        getValue: () => content,
                        setValue: (newContent: string) => {
                            this.app.vault.modify(file, newContent);
                        }
                    } as any;

                    // Remove invalid tags and add normalized ones
                    this.tagEditor.removeTagsFromNote(editor, validationResult.invalid);
                    this.tagEditor.addTagsToNote(editor, validationResult.normalized);
                    
                    standardized++;
                }
                
                processed++;
            } catch (error) {
                console.error(`TagManager: Failed to process ${file.basename}:`, error);
            }
        }

        return { processed, standardized };
    }

    /**
     * Update settings
     */
    updateSettings(settings: ClippySettings): void {
        this.settings = settings;
    }

    /**
     * Build context string for different types
     */
    private buildContextString(type: string, additionalInfo: string = ''): string {
        const contexts = {
            'research': 'research document academic study investigation',
            'user-note': 'personal note user content manual entry',
            'auto-generated': 'automatically generated content system created',
            'general': 'general content document note'
        };

        return `${contexts[type] || contexts.general} ${additionalInfo}`.trim();
    }
}