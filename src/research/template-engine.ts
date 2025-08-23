import { App } from 'obsidian';
import { ResearchSource } from './automated-note-generator';

interface TemplateData {
    title: string;
    category: string;
    content: any;
    sources: ResearchSource[];
    template: string;
    metadata?: any;
}

interface NoteTemplate {
    name: string;
    description: string;
    template: string;
    requiredFields: string[];
    optionalFields: string[];
}

export class TemplateEngine {
    private app: App;
    private templates: Map<string, NoteTemplate>;

    constructor(app: App) {
        this.app = app;
        this.templates = this.initializeTemplates();
    }

    /**
     * Generate a note using the specified template.
     */
    async generateNote(data: TemplateData): Promise<string> {
        const template = this.templates.get(data.template);
        if (!template) {
            throw new Error(`Template '${data.template}' not found`);
        }

        console.log(`📝 Generating note using template: ${template.name}`);

        // Prepare template variables
        const variables = await this.prepareTemplateVariables(data);

        // Process the template
        let noteContent = template.template;
        
        // Replace template variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            noteContent = noteContent.replace(new RegExp(this.escapeRegex(placeholder), 'g'), value);
        }

        // Clean up any remaining placeholders
        noteContent = this.cleanupTemplate(noteContent);

        return noteContent;
    }

    /**
     * Prepare all template variables from the data.
     */
    private async prepareTemplateVariables(data: TemplateData): Promise<Record<string, string>> {
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        const timeString = now.toTimeString().split(' ')[0];

        const variables: Record<string, string> = {
            // Basic metadata
            title: data.title,
            category: data.category,
            date: dateString,
            time: timeString,
            datetime: now.toISOString(),
            
            // Content sections
            description: this.formatDescription(data.content),
            uses: this.formatUses(data.content),
            research: this.formatResearch(data.content),
            warnings: this.formatWarnings(data.content),
            properties: this.formatProperties(data.content),
            
            // Sources and citations
            sources: this.formatSources(data.sources),
            citations: this.formatCitations(data.sources),
            webSources: this.formatWebSources(data.sources),
            personalSources: this.formatPersonalSources(data.sources),
            
            // Tags and links
            tags: this.formatTags(data),
            relatedLinks: this.formatRelatedLinks(data),
            
            // Quality indicators
            qualityScore: this.formatQualityScore(data.sources),
            sourceCount: data.sources.length.toString(),
            
            // Additional metadata
            generatedBy: 'CLIPPY AI Assistant',
            generationDate: dateString,
            creationDate: dateString, // For when note was first created
            searchTerms: data.metadata?.searchTerms?.join(', ') || data.title,
            
            // Project and research context
            projectName: data.metadata?.projectName || 'Default Research Project',
            researchType: '{{researchType}}' // Will be populated by AI after content generation
        };

        return variables;
    }

    /**
     * Format the description section.
     */
    private formatDescription(content: any): string {
        if (!content?.description) return '';
        
        return typeof content.description === 'string' 
            ? content.description 
            : content.description.join('\n\n');
    }

    /**
     * Format the uses/applications section.
     */
    private formatUses(content: any): string {
        if (!content?.uses || !Array.isArray(content.uses)) return '';
        
        return content.uses.map((use: string) => `- ${use}`).join('\n');
    }

    /**
     * Format the research findings section.
     */
    private formatResearch(content: any): string {
        if (!content?.research) return '';
        
        if (typeof content.research === 'string') {
            return content.research;
        }
        
        if (Array.isArray(content.research)) {
            return content.research.map((finding: string) => `- ${finding}`).join('\n');
        }
        
        return '';
    }

    /**
     * Format warnings and precautions.
     */
    private formatWarnings(content: any): string {
        if (!content?.warnings || !Array.isArray(content.warnings)) return '';
        
        return content.warnings.map((warning: string) => `⚠️ ${warning}`).join('\n\n');
    }

    /**
     * Format properties/characteristics.
     */
    private formatProperties(content: any): string {
        if (!content?.properties) return '';
        
        if (typeof content.properties === 'object' && !Array.isArray(content.properties)) {
            return Object.entries(content.properties)
                .map(([key, value]) => `**${key}**: ${value}`)
                .join('\n');
        }
        
        return '';
    }

    /**
     * Format all sources section.
     */
    private formatSources(sources: ResearchSource[]): string {
        if (sources.length === 0) return 'No sources available.';
        
        return sources
            .sort((a, b) => b.qualityScore - a.qualityScore)
            .map((source, index) => {
                const qualityIndicator = this.getQualityIndicator(source.qualityScore);
                const sourceType = this.getSourceTypeIcon(source.type);
                
                return `${index + 1}. ${sourceType} **${source.title}** ${qualityIndicator}\n   ${source.citations[0] || source.url || source.filePath || 'No citation'}`;
            })
            .join('\n\n');
    }

    /**
     * Format citations in academic style.
     */
    private formatCitations(sources: ResearchSource[]): string {
        return sources
            .map(source => source.citations[0] || this.generateCitation(source))
            .join('\n');
    }

    /**
     * Format web sources separately.
     */
    private formatWebSources(sources: ResearchSource[]): string {
        const webSources = sources.filter(s => s.type === 'web');
        if (webSources.length === 0) return '';
        
        return webSources
            .map(source => `- [${source.title}](${source.url})`)
            .join('\n');
    }

    /**
     * Format personal document sources.
     */
    private formatPersonalSources(sources: ResearchSource[]): string {
        const personalSources = sources.filter(s => s.type !== 'web');
        if (personalSources.length === 0) return '';
        
        return personalSources
            .map(source => `- [[${source.title}]]`)
            .join('\n');
    }

    /**
     * Format tags for YAML frontmatter (proper list format).
     */
    private formatTags(data: TemplateData): string {
        const tags = new Set<string>(['research', 'auto-generated']);
        
        // Add category tag
        if (data.category) {
            tags.add(data.category.toLowerCase().replace(/\s+/g, '-'));
        }
        
        // Add content-based tags
        if (data.content?.categories) {
            data.content.categories.forEach((cat: string) => 
                tags.add(cat.toLowerCase().replace(/\s+/g, '-'))
            );
        }
        
        // Add source type tags
        const sourceTypes = [...new Set(data.sources.map(s => s.type))];
        sourceTypes.forEach(type => tags.add(`source-${type}`));
        
        // Format as YAML list (no # symbols, proper indentation)
        const normalizedTags = Array.from(tags).map(tag => 
            tag.replace(/^#+/, '') // Remove any # symbols
               .toLowerCase()
               .replace(/[^a-z0-9_/-]/g, '-') // Replace special chars with hyphens
               .replace(/--+/g, '-') // Replace multiple hyphens
               .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        );
        
        // Format as YAML list, excluding research category since it's handled separately
        const filteredTags = normalizedTags.filter(tag => 
            !tag.startsWith('research') && !tag.includes('auto-generated')
        );
        
        return filteredTags.map(tag => `  - ${tag}`).join('\n');
    }

    /**
     * Format related links.
     */
    private formatRelatedLinks(data: TemplateData): string {
        const links = new Set<string>();
        
        // Add links from personal sources
        data.sources
            .filter(s => s.type === 'note' || s.type === 'pdf')
            .forEach(source => {
                if (source.filePath) {
                    const fileName = source.filePath.split('/').pop()?.replace('.md', '') || source.title;
                    links.add(`[[${fileName}]]`);
                }
            });
        
        return Array.from(links).join(' • ');
    }

    /**
     * Format quality score indicator.
     */
    private formatQualityScore(sources: ResearchSource[]): string {
        if (sources.length === 0) return '0%';
        
        const avgQuality = sources.reduce((sum, s) => sum + s.qualityScore, 0) / sources.length;
        const percentage = Math.round(avgQuality * 100);
        
        let indicator = '';
        if (percentage >= 90) indicator = '🌟';
        else if (percentage >= 80) indicator = '⭐';
        else if (percentage >= 70) indicator = '✨';
        else if (percentage >= 60) indicator = '⚡';
        else indicator = '📋';
        
        return `${percentage}% ${indicator}`;
    }

    /**
     * Get quality indicator emoji.
     */
    private getQualityIndicator(score: number): string {
        if (score >= 0.9) return '🌟';
        if (score >= 0.8) return '⭐';
        if (score >= 0.7) return '✨';
        if (score >= 0.6) return '⚡';
        return '📋';
    }

    /**
     * Get source type icon.
     */
    private getSourceTypeIcon(type: string): string {
        const icons = {
            web: '🌐',
            pdf: '📄',
            note: '📝',
            document: '📋'
        };
        return icons[type as keyof typeof icons] || '📄';
    }

    /**
     * Generate citation for a source.
     */
    private generateCitation(source: ResearchSource): string {
        const date = source.lastUpdated.toISOString().split('T')[0];
        
        switch (source.type) {
            case 'web':
                return `${source.title}. Retrieved ${date}, from ${source.url}`;
            case 'pdf':
            case 'document':
                return `${source.title} (Personal Document, ${date})`;
            case 'note':
                return `[[${source.title}]] (Personal Note, ${date})`;
            default:
                return `${source.title} (${date})`;
        }
    }

    /**
     * Clean up template by removing unused placeholders.
     */
    private cleanupTemplate(content: string): string {
        // Remove empty sections
        content = content.replace(/## [^\n]+\n\s*\n(?=##|$)/g, '');
        
        // Remove unused placeholders
        content = content.replace(/\{\{[^}]+\}\}/g, '');
        
        // Clean up multiple empty lines
        content = content.replace(/\n{3,}/g, '\n\n');
        
        return content.trim();
    }

    /**
     * Escape regex special characters.
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Initialize default templates.
     */
    private initializeTemplates(): Map<string, NoteTemplate> {
        const templates = new Map<string, NoteTemplate>();

        // Research Standard Template
        templates.set('research-standard', {
            name: 'Research Standard',
            description: 'Comprehensive research note with all sections',
            requiredFields: ['title', 'description'],
            optionalFields: ['uses', 'research', 'warnings', 'properties'],
            template: `---
project: "{{projectName}}"
status: "in-progress"
created: "{{creationDate}}"
updated: "{{generationDate}}"
quality: {{qualityScore}}
tags:
  - research/{{researchType}}
{{tags}}
---

# {{title}}

{{#if description}}
## Overview
{{description}}
{{/if}}

{{#if uses}}
## Uses & Applications
{{uses}}
{{/if}}

{{#if properties}}
## Properties
{{properties}}
{{/if}}

{{#if research}}
## Research Findings
{{research}}
{{/if}}

{{#if warnings}}
## Warnings & Precautions
{{warnings}}
{{/if}}

## Sources
{{sources}}

{{#if relatedLinks}}
## Related Notes
{{relatedLinks}}
{{/if}}

---
*Generated by {{generatedBy}} on {{generationDate}}*
*Search terms: {{searchTerms}}*`
        });


        return templates;
    }

    /**
     * Add a custom template.
     */
    addTemplate(template: NoteTemplate): void {
        this.templates.set(template.name, template);
    }

    /**
     * Get available templates.
     */
    getAvailableTemplates(): NoteTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Update an existing template.
     */
    updateTemplate(name: string, template: Partial<NoteTemplate>): boolean {
        const existing = this.templates.get(name);
        if (!existing) return false;
        
        this.templates.set(name, { ...existing, ...template });
        return true;
    }
}