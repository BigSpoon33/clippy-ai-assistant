/**
 * CLIPPY AI Assistant - Content Processing Features
 * Unified exports for all content processing functionality
 */

// Services
export * from './services';

// UI Components  
export * from './ui';

// Processors
export { AutoTagger, type TagSuggestion } from './processors/auto-tagger';
export { ContentAnalyzer } from './processors/content-analyzer';
export { MarkdownFormatter } from './processors/markdown-formatter';

// Templates
export { SmartTemplateGenerator } from './templates/smart-template-generator';
export { AutoPopulateService } from './templates/auto-populate-service';