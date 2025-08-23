/**
 * CLIPPY AI Assistant - Unified Tagging API
 * 
 * Central API for all tagging operations across the Clippy ecosystem.
 * Provides consistent, standardized tagging for research notes, auto-generated content,
 * user notes, and any other content that needs intelligent tagging.
 */

import { App, TFile, Editor } from 'obsidian';
import { AIProvider, VaultPatterns } from '../types';
import { CentralizedTaggingSystem, SmartTagOptions, TagValidationResult } from '../features/content-processing/services/centralized-tagging-system';
import { TagSuggestion } from '../features/content-processing/processors/auto-tagger';

export interface ClippyTaggingConfig {
    aiProvider: AIProvider;
    vaultPatterns: VaultPatterns;
    app: App;
}

export interface TaggingContext {
    type: 'research' | 'user-note' | 'auto-generated' | 'general';
    topic?: string;
    category?: string;
    metadata?: Record<string, any>;
}

export interface QuickTagOptions {
    maxTags?: number;
    includeHierarchical?: boolean;
    formatForYAML?: boolean;
    contextType?: 'research' | 'user-note' | 'auto-generated' | 'general';
}

/**
 * Unified API for all Clippy tagging operations
 */
export class ClippyTaggingAPI {
    private centralizedTagger: CentralizedTaggingSystem;
    private app: App;

    constructor(config: ClippyTaggingConfig) {
        this.app = config.app;
        this.centralizedTagger = new CentralizedTaggingSystem(
            config.app,
            config.aiProvider,
            config.vaultPatterns
        );
    }

    /**
     * Quick tag generation for any content
     * Most commonly used method - provides smart defaults
     */
    async quickTag(
        content: string,
        options: QuickTagOptions = {}
    ): Promise<string[]> {
        const {
            maxTags = 6,
            includeHierarchical = true,
            formatForYAML = true,
            contextType = 'general'
        } = options;

        const context = this.buildContextString(contextType, content);
        
        const tagResult = await this.centralizedTagger.generateSmartTags(
            content,
            context,
            {
                maxTags,
                minConfidence: 0.4,
                includeHierarchical,
                preserveExisting: false,
                formatStyle: 'yaml-list'
            }
        );

        return tagResult.normalized;
    }

    /**
     * Generate research-specific tags (for research notes)
     */
    async generateResearchTags(
        content: string,
        researchTopic: string,
        options: Partial<SmartTagOptions> = {}
    ): Promise<TagValidationResult> {
        const defaultOptions: SmartTagOptions = {
            maxTags: 8,
            minConfidence: 0.4,
            includeHierarchical: true,
            preserveExisting: true,
            formatStyle: 'yaml-list'
        };

        return await this.centralizedTagger.generateSmartTags(
            content,
            `research topic: ${researchTopic}`,
            { ...defaultOptions, ...options }
        );
    }

    /**
     * Apply tags directly to a note file
     */
    async tagNote(
        file: TFile,
        additionalContext?: string,
        options: SmartTagOptions = {}
    ): Promise<boolean> {
        return await this.centralizedTagger.applySmartTagsToNote(
            file,
            additionalContext,
            options
        );
    }

    /**
     * Apply tags to note content via editor
     */
    async tagNoteInEditor(
        editor: Editor,
        contextType: 'research' | 'user-note' | 'auto-generated' | 'general' = 'user-note',
        additionalContext?: string
    ): Promise<boolean> {
        try {
            const content = editor.getValue();
            const context = this.buildContextString(contextType, additionalContext || '');
            
            const tagResult = await this.centralizedTagger.generateSmartTags(
                content,
                context,
                {
                    maxTags: 6,
                    minConfidence: 0.4,
                    includeHierarchical: true,
                    preserveExisting: true,
                    formatStyle: 'yaml-list'
                }
            );

            if (tagResult.normalized.length === 0) {
                return false;
            }

            // Import TagEditor for applying tags
            const { TagEditor } = await import('../features/content-processing/services/tag-editor');
            const tagEditor = new TagEditor();
            
            tagEditor.addTagsToNote(editor, tagResult.normalized);
            return true;

        } catch (error) {
            console.error('ClippyTaggingAPI: Failed to tag note in editor:', error);
            return false;
        }
    }

    /**
     * Get tag suggestions without applying them
     */
    async getSuggestions(
        content: string,
        context?: TaggingContext,
        maxSuggestions = 10
    ): Promise<TagSuggestion[]> {
        const contextString = context ? this.buildContextFromObject(context) : '';
        return await this.centralizedTagger.suggestTagsForContent(content + ' ' + contextString, maxSuggestions);
    }

    /**
     * Format tags for YAML frontmatter
     */
    formatForYAML(
        tags: string[],
        style: 'yaml-list' | 'yaml-array' = 'yaml-list'
    ): string {
        return this.centralizedTagger.formatTagsForYAML(tags, style);
    }

    /**
     * Validate and normalize tags
     */
    validateTags(tags: string[]): TagValidationResult {
        return this.centralizedTagger.validateAndNormalizeTags(tags);
    }

    /**
     * Get standardized tags for a category
     */
    getStandardTags(category: string): string[] {
        return this.centralizedTagger.getStandardTagsForCategory(category);
    }

    /**
     * Get all available tag categories
     */
    getCategories(): string[] {
        return this.centralizedTagger.getTagCategories();
    }

    /**
     * Standardize all tags in the vault
     */
    async standardizeVaultTags(): Promise<{ processed: number; standardized: number }> {
        return await this.centralizedTagger.standardizeVaultTags();
    }

    /**
     * Generate tags for research content specifically
     */
    async tagResearchContent(
        content: string,
        topic: string,
        metadata?: Record<string, any>
    ): Promise<string> {
        const context = `research topic: ${topic}`;
        
        const tagResult = await this.centralizedTagger.generateSmartTags(
            content,
            context,
            {
                maxTags: 8,
                minConfidence: 0.3,
                includeHierarchical: true,
                preserveExisting: false,
                formatStyle: 'yaml-list'
            }
        );

        // Always include research and topic-specific tags
        const enhancedTags = [
            'research',
            ...tagResult.normalized.filter(tag => tag !== 'research')
        ];

        return this.centralizedTagger.formatTagsForYAML(enhancedTags, 'yaml-list');
    }

    /**
     * Generate tags for auto-generated content
     */
    async tagAutoGeneratedContent(
        content: string,
        category?: string,
        sourceType?: string
    ): Promise<string> {
        const context = [
            'auto-generated content',
            category ? `category: ${category}` : '',
            sourceType ? `source: ${sourceType}` : ''
        ].filter(Boolean).join(' ');

        const tagResult = await this.centralizedTagger.generateSmartTags(
            content,
            context,
            {
                maxTags: 6,
                minConfidence: 0.4,
                includeHierarchical: true,
                preserveExisting: false,
                formatStyle: 'yaml-list'
            }
        );

        // Always include auto-generated tag
        const enhancedTags = [
            'auto-generated',
            ...tagResult.normalized.filter(tag => tag !== 'auto-generated')
        ];

        return this.centralizedTagger.formatTagsForYAML(enhancedTags, 'yaml-list');
    }

    /**
     * Extract and validate existing tags from content
     */
    async processExistingTags(content: string): Promise<{
        existing: string[];
        normalized: string[];
        suggestions: string[];
    }> {
        // Import TagEditor for extraction
        const { TagEditor } = await import('../features/content-processing/services/tag-editor');
        const tagEditor = new TagEditor();
        
        const existingTags = tagEditor.getExistingTags(content);
        const validationResult = this.validateTags(existingTags);
        
        // Get suggestions for improvement
        const suggestions = await this.quickTag(content, { maxTags: 5 });
        const newSuggestions = suggestions.filter(tag => !validationResult.normalized.includes(tag));

        return {
            existing: existingTags,
            normalized: validationResult.normalized,
            suggestions: newSuggestions
        };
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

    /**
     * Build context string from context object
     */
    private buildContextFromObject(context: TaggingContext): string {
        const parts = [
            this.buildContextString(context.type),
            context.topic ? `topic: ${context.topic}` : '',
            context.category ? `category: ${context.category}` : '',
            context.metadata ? Object.entries(context.metadata).map(([k, v]) => `${k}: ${v}`).join(' ') : ''
        ].filter(Boolean);

        return parts.join(' ');
    }
}

/**
 * Factory function to create ClippyTaggingAPI instance
 */
export function createTaggingAPI(config: ClippyTaggingConfig): ClippyTaggingAPI {
    return new ClippyTaggingAPI(config);
}

/**
 * Convenience functions for common operations
 */
export const TaggingHelpers = {
    /**
     * Quick one-liner to get research tags
     */
    async quickResearchTags(
        api: ClippyTaggingAPI,
        content: string,
        topic: string
    ): Promise<string[]> {
        const result = await api.generateResearchTags(content, topic);
        return result.normalized;
    },

    /**
     * Quick one-liner to format tags for frontmatter
     */
    formatYAMLTags(api: ClippyTaggingAPI, tags: string[]): string {
        return api.formatForYAML(tags, 'yaml-list');
    },

    /**
     * Check if tags are valid for YAML
     */
    isValidForYAML(api: ClippyTaggingAPI, tags: string[]): boolean {
        const result = api.validateTags(tags);
        return result.invalid.length === 0;
    }
};