/**
 * CLIPPY AI Assistant - Centralized Smart Tagging System
 * 
 * Provides standardized, hierarchical tagging for the entire Clippy ecosystem.
 * Ensures proper YAML frontmatter formatting and vault-wide tag consistency.
 */

import { App, TFile } from 'obsidian';
import { AIProvider, VaultPatterns } from '../../../types';
import { AutoTagger, TagSuggestion } from '../processors/auto-tagger';
import { TagEditor } from './tag-editor';

export interface TagHierarchy {
    category: string;
    subcategories: string[];
    standardTags: string[];
    patterns: RegExp[];
}

export interface SmartTagOptions {
    maxTags?: number;
    minConfidence?: number;
    includeHierarchical?: boolean;
    preserveExisting?: boolean;
    formatStyle?: 'yaml-list' | 'yaml-array';
}

export interface TagValidationResult {
    valid: string[];
    invalid: string[];
    normalized: string[];
    hierarchical: string[];
}

/**
 * Centralized tagging system for consistent, intelligent tagging across Clippy
 */
export class CentralizedTaggingSystem {
    private app: App;
    private aiProvider: AIProvider;
    private vaultPatterns: VaultPatterns;
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
        vaultPatterns: VaultPatterns
    ) {
        this.app = app;
        this.aiProvider = aiProvider;
        this.vaultPatterns = vaultPatterns;
        this.autoTagger = new AutoTagger(aiProvider, vaultPatterns);
        this.tagEditor = new TagEditor();
    }

    /**
     * Generate smart, standardized tags for content
     */
    async generateSmartTags(
        content: string,
        context?: string,
        options: SmartTagOptions = {}
    ): Promise<TagValidationResult> {
        const {
            maxTags = 8,
            minConfidence = 0.4,
            includeHierarchical = true,
            preserveExisting = true,
            formatStyle = 'yaml-list'
        } = options;

        try {
            // Get existing tags if preserving
            const existingTags = preserveExisting ? this.extractExistingTags(content) : [];
            
            // Get AI-powered suggestions
            const suggestions = await this.autoTagger.suggestTags(content, existingTags);
            
            // Filter by confidence and limit
            const filteredSuggestions = suggestions
                .filter(s => s.confidence >= minConfidence)
                .slice(0, maxTags);

            // Generate hierarchical tags
            const hierarchicalTags = includeHierarchical 
                ? this.generateHierarchicalTags(content, context)
                : [];

            // Combine and normalize all tags
            const allTags = [
                ...existingTags,
                ...filteredSuggestions.map(s => s.tag),
                ...hierarchicalTags
            ];

            return this.validateAndNormalizeTags(allTags);

        } catch (error) {
            console.error('CLIPPY CentralizedTagging: Failed to generate smart tags:', error);
            return {
                valid: [],
                invalid: [],
                normalized: [],
                hierarchical: []
            };
        }
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
                        break; // Only add one specific tag per category
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
            normalized: [...new Set(normalized)], // Remove duplicates
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
     * Apply smart tags to a note's frontmatter
     */
    async applySmartTagsToNote(
        file: TFile,
        additionalContext?: string,
        options: SmartTagOptions = {}
    ): Promise<boolean> {
        try {
            const content = await this.app.vault.read(file);
            const tagResult = await this.generateSmartTags(content, additionalContext, options);
            
            if (tagResult.normalized.length === 0) {
                console.log('CLIPPY CentralizedTagging: No valid tags generated');
                return false;
            }

            // Create a mock editor to use with TagEditor
            const editor = {
                getValue: () => content,
                setValue: (newContent: string) => {
                    this.app.vault.modify(file, newContent);
                }
            } as any;

            this.tagEditor.addTagsToNote(editor, tagResult.normalized);
            
            console.log(`🏷️ Applied ${tagResult.normalized.length} smart tags to ${file.basename}:`, tagResult.normalized);
            return true;

        } catch (error) {
            console.error('CLIPPY CentralizedTagging: Failed to apply tags:', error);
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
     * Suggest tags based on vault patterns and content analysis
     */
    async suggestTagsForContent(content: string, maxSuggestions = 10): Promise<TagSuggestion[]> {
        const suggestions = await this.autoTagger.suggestTags(content);
        const hierarchical = this.generateHierarchicalTags(content);
        
        // Add hierarchical suggestions
        const hierarchicalSuggestions: TagSuggestion[] = hierarchical.map(tag => ({
            tag,
            confidence: 0.7,
            reason: 'Hierarchical category match',
            source: 'pattern' as const,
            category: tag.split('/')[0]
        }));

        const allSuggestions = [...suggestions, ...hierarchicalSuggestions];
        
        // Deduplicate and sort by confidence
        const uniqueSuggestions = new Map<string, TagSuggestion>();
        for (const suggestion of allSuggestions) {
            const normalizedTag = this.normalizeTagForYAML(suggestion.tag);
            if (!uniqueSuggestions.has(normalizedTag) || 
                suggestion.confidence > uniqueSuggestions.get(normalizedTag)!.confidence) {
                uniqueSuggestions.set(normalizedTag, {
                    ...suggestion,
                    tag: normalizedTag
                });
            }
        }

        return Array.from(uniqueSuggestions.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxSuggestions);
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
                console.error(`CLIPPY CentralizedTagging: Failed to process ${file.basename}:`, error);
            }
        }

        return { processed, standardized };
    }
}