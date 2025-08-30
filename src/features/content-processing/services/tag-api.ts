/**
 * CLIPPY AI Assistant - Unified Tag API
 * 
 * Single entry point for all tagging operations across the Clippy ecosystem.
 * Provides consistent, standardized tagging for research notes, auto-generated content,
 * user notes, and any other content that needs intelligent tagging.
 */

import { App, TFile, Editor } from 'obsidian';
import { AIProvider, VaultPatterns, ClippySettings } from '../../../types';
import { TagManager, TagOptions, TagValidationResult, TagGenerationResult } from './tag-manager';
import { TagSuggestion } from '../processors/auto-tagger';

export interface TagAPIConfig {
    aiProvider: AIProvider;
    vaultPatterns: VaultPatterns;
    settings: ClippySettings;
    app: App;
}

export interface TagContext {
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
    provider?: 'auto' | 'ollama' | 'openai' | 'anthropic';
}

/**
 * Unified API for all Clippy tagging operations
 */
export class TagAPI {
    private tagManager: TagManager;
    private app: App;

    constructor(config: TagAPIConfig) {
        this.app = config.app;
        this.tagManager = new TagManager(
            config.app,
            config.aiProvider,
            config.vaultPatterns,
            config.settings
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
            contextType = 'general',
            provider = 'auto'
        } = options;

        const context = this.buildContextString(contextType, '');
        
        const result = await this.tagManager.generateTagSuggestions(
            content,
            context,
            {
                maxTags,
                minConfidence: 0.4,
                includeHierarchical,
                preserveExisting: false,
                formatStyle: 'yaml-list',
                provider
            }
        );

        return result.validation.normalized;
    }

    /**
     * Generate comprehensive tag suggestions with full result details
     */
    async generateTagSuggestions(
        content: string,
        context?: string,
        options: TagOptions = {}
    ): Promise<TagGenerationResult> {
        return await this.tagManager.generateTagSuggestions(content, context, options);
    }

    /**
     * Generate research-specific tags (for research notes)
     */
    async generateResearchTags(
        content: string,
        researchTopic: string,
        options: Partial<TagOptions> = {}
    ): Promise<TagGenerationResult> {
        const defaultOptions: TagOptions = {
            maxTags: 8,
            minConfidence: 0.4,
            includeHierarchical: true,
            preserveExisting: true,
            formatStyle: 'yaml-list'
        };

        return await this.tagManager.generateTagSuggestions(
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
        options: TagOptions = {}
    ): Promise<boolean> {
        return await this.tagManager.applyTagsToNote(file, additionalContext, options);
    }

    /**
     * Apply tags to note content via editor
     */
    async tagNoteInEditor(
        editor: Editor,
        contextType: 'research' | 'user-note' | 'auto-generated' | 'general' = 'user-note',
        additionalContext?: string,
        options: TagOptions = {}
    ): Promise<boolean> {
        return await this.tagManager.applyTagsInEditor(editor, contextType, additionalContext, options);
    }

    /**
     * Get tag suggestions without applying them (for modals, etc.)
     */
    async getSuggestions(
        content: string,
        context?: TagContext,
        maxSuggestions = 10
    ): Promise<TagSuggestion[]> {
        const contextString = context ? this.buildContextFromObject(context) : '';
        const result = await this.tagManager.generateTagSuggestions(
            content + ' ' + contextString,
            '',
            { maxTags: maxSuggestions }
        );
        return result.suggestions;
    }

    /**
     * Format tags for YAML frontmatter
     */
    formatForYAML(
        tags: string[],
        style: 'yaml-list' | 'yaml-array' = 'yaml-list'
    ): string {
        return this.tagManager.formatTagsForYAML(tags, style);
    }

    /**
     * Validate and normalize tags
     */
    validateTags(tags: string[]): TagValidationResult {
        return this.tagManager.validateAndNormalizeTags(tags);
    }

    /**
     * Get standardized tags for a category
     */
    getStandardTags(category: string): string[] {
        return this.tagManager.getStandardTagsForCategory(category);
    }

    /**
     * Get all available tag categories
     */
    getCategories(): string[] {
        return this.tagManager.getTagCategories();
    }

    /**
     * Standardize all tags in the vault
     */
    async standardizeVaultTags(): Promise<{ processed: number; standardized: number }> {
        return await this.tagManager.standardizeVaultTags();
    }

    /**
     * Generate tags for research content specifically
     */
    async tagResearchContent(
        content: string,
        topic: string,
        metadata?: Record<string, any>
    ): Promise<string> {
        const contextParts = [`research topic: ${topic}`];
        
        // Include metadata in context if provided
        if (metadata) {
            const metadataContext = Object.entries(metadata)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' ');
            contextParts.push(metadataContext);
        }
        
        const context = contextParts.join(' ');
        
        const result = await this.tagManager.generateTagSuggestions(
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
            ...result.validation.normalized.filter(tag => tag !== 'research')
        ];

        return this.tagManager.formatTagsForYAML(enhancedTags, 'yaml-list');
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

        const result = await this.tagManager.generateTagSuggestions(
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
            ...result.validation.normalized.filter(tag => tag !== 'auto-generated')
        ];

        return this.tagManager.formatTagsForYAML(enhancedTags, 'yaml-list');
    }

    /**
     * Get all tags from vault for quick selection
     */
    getVaultTags(): string[] {
        // Extract tags from vault patterns
        return this.tagManager.getTagCategories()
            .flatMap(category => this.tagManager.getStandardTagsForCategory(category))
            .concat(
                // Add popular tags from vault
                Object.keys((this.app.metadataCache as any).getAllTags?.() || {})
                    .map(tag => tag.replace('#', ''))
                    .filter(tag => tag.length > 0)
                    .slice(0, 50)
            );
    }

    /**
     * Update settings
     */
    updateSettings(settings: ClippySettings): void {
        this.tagManager.updateSettings(settings);
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
    private buildContextFromObject(context: TagContext): string {
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
 * Factory function to create TagAPI instance
 */
export function createTagAPI(config: TagAPIConfig): TagAPI {
    return new TagAPI(config);
}

/**
 * Convenience functions for common operations
 */
export const TagHelpers = {
    /**
     * Quick one-liner to get research tags
     */
    async quickResearchTags(
        api: TagAPI,
        content: string,
        topic: string
    ): Promise<string[]> {
        const result = await api.generateResearchTags(content, topic);
        return result.validation.normalized;
    },

    /**
     * Quick one-liner to format tags for frontmatter
     */
    formatYAMLTags(api: TagAPI, tags: string[]): string {
        return api.formatForYAML(tags, 'yaml-list');
    },

    /**
     * Check if tags are valid for YAML
     */
    isValidForYAML(api: TagAPI, tags: string[]): boolean {
        const result = api.validateTags(tags);
        return result.invalid.length === 0;
    },

    /**
     * Get suggestions as simple tag array for quick use
     */
    async getSimpleSuggestions(
        api: TagAPI,
        content: string,
        maxTags: number = 5
    ): Promise<string[]> {
        const suggestions = await api.getSuggestions(content, undefined, maxTags);
        return suggestions.map(s => s.tag);
    }
};