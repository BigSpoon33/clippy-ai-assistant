import { App, TFile, Notice } from 'obsidian';
import { OrphanDetector } from '../discovery/orphan-detector';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';

interface BridgeOpportunity {
    type: 'auto' | 'tag' | 'research' | 'index';
    title: string;
    description: string;
    clusters: any[];
    bridgeConcepts: string[];
    confidence: number;
    priority: 'high' | 'medium' | 'low';
    implementation: {
        noteContent?: string;
        tags?: string[];
        links?: string[];
        researchAreas?: string[];
        indexStructure?: { [category: string]: string[] };
    };
}

export class BridgeManager {
    private app: App;
    private orphanDetector: OrphanDetector;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;

    constructor(
        app: App,
        orphanDetector: OrphanDetector,
        embeddingManager: EmbeddingManager,
        similarityEngine: SimilarityEngine
    ) {
        this.app = app;
        this.orphanDetector = orphanDetector;
        this.embeddingManager = embeddingManager;
        this.similarityEngine = similarityEngine;
    }

    /**
     * Get all available bridge opportunities.
     */
    async getBridgeOpportunities(): Promise<BridgeOpportunity[]> {
        try {
            const opportunities = await this.orphanDetector.findBridgeOpportunities();
            console.log(`🌉 Found ${opportunities.length} bridge opportunities`);
            return opportunities;
        } catch (error) {
            console.error('Error finding bridge opportunities:', error);
            new Notice('❌ Failed to analyze bridge opportunities');
            return [];
        }
    }

    /**
     * Implement an Auto-Bridge (create bridge note + add tags + create links).
     */
    async implementAutoBridge(opportunity: BridgeOpportunity): Promise<boolean> {
        if (opportunity.type !== 'auto' || !opportunity.implementation.noteContent) {
            return false;
        }

        try {
            // Generate unique file name
            const fileName = this.generateBridgeFileName(opportunity.title);
            const filePath = `${fileName}.md`;

            // Create the bridge note
            const file = await this.app.vault.create(filePath, opportunity.implementation.noteContent);

            // Add tags to the bridge note if specified
            if (opportunity.implementation.tags && opportunity.implementation.tags.length > 0) {
                await this.addTagsToNote(file, opportunity.implementation.tags);
            }

            // Add links to related notes in clusters
            if (opportunity.implementation.links && opportunity.implementation.links.length > 0) {
                await this.addLinksToNote(file, opportunity.implementation.links);
            }

            new Notice(`✅ Created bridge note: ${fileName}`);
            return true;
        } catch (error) {
            console.error('Error implementing auto-bridge:', error);
            new Notice(`❌ Failed to create bridge note: ${opportunity.title}`);
            return false;
        }
    }

    /**
     * Implement a Tag Bridge (add bridge tags to all notes in clusters).
     */
    async implementTagBridge(opportunity: BridgeOpportunity): Promise<boolean> {
        if (opportunity.type !== 'tag' || !opportunity.implementation.tags) {
            return false;
        }

        try {
            let taggedCount = 0;
            
            for (const cluster of opportunity.clusters) {
                for (const notePath of cluster.notes) {
                    const file = this.app.vault.getAbstractFileByPath(notePath) as TFile;
                    if (file) {
                        for (const tag of opportunity.implementation.tags) {
                            await this.addTagToNote(file, tag);
                        }
                        taggedCount++;
                    }
                }
            }

            new Notice(`✅ Added bridge tags to ${taggedCount} notes`);
            return true;
        } catch (error) {
            console.error('Error implementing tag bridge:', error);
            new Notice(`❌ Failed to implement tag bridge: ${opportunity.title}`);
            return false;
        }
    }

    /**
     * Implement a Research Bridge (create research todo list for gap areas).
     */
    async implementResearchBridge(opportunity: BridgeOpportunity): Promise<boolean> {
        if (opportunity.type !== 'research' || !opportunity.implementation.researchAreas) {
            return false;
        }

        try {
            const fileName = this.generateResearchFileName(opportunity.title);
            const content = this.generateResearchNoteContent(opportunity);
            
            await this.app.vault.create(`${fileName}.md`, content);
            
            new Notice(`✅ Created research bridge: ${fileName}`);
            return true;
        } catch (error) {
            console.error('Error implementing research bridge:', error);
            new Notice(`❌ Failed to create research bridge: ${opportunity.title}`);
            return false;
        }
    }

    /**
     * Implement an Index Bridge (create comprehensive MoC-style index note).
     */
    async implementIndexBridge(opportunity: BridgeOpportunity): Promise<boolean> {
        if (opportunity.type !== 'index' || !opportunity.implementation.noteContent) {
            return false;
        }

        try {
            const fileName = this.generateMoCFileName(opportunity.title);
            
            await this.app.vault.create(`${fileName}.md`, opportunity.implementation.noteContent);
            
            new Notice(`✅ Created Map of Content: ${fileName}`);
            return true;
        } catch (error) {
            console.error('Error implementing index bridge:', error);
            new Notice(`❌ Failed to create index bridge: ${opportunity.title}`);
            return false;
        }
    }

    // Helper methods

    private generateBridgeFileName(title: string): string {
        const cleanTitle = title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        return `bridge-${cleanTitle}`;
    }

    private generateResearchFileName(title: string): string {
        const cleanTitle = title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        return `research-${cleanTitle}`;
    }

    private generateMoCFileName(title: string): string {
        const cleanTitle = title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        return `moc-${cleanTitle}`;
    }

    private generateResearchNoteContent(opportunity: BridgeOpportunity): string {
        const title = opportunity.title.replace('Research Gap: ', '');
        
        let content = `# ${title} - Research Plan\n\n`;
        content += `## Overview\n${opportunity.description}\n\n`;
        content += `## Research Questions\n`;
        
        if (opportunity.implementation.researchAreas) {
            for (const question of opportunity.implementation.researchAreas) {
                content += `- [ ] ${question}\n`;
            }
        }
        
        content += `\n## Key Concepts to Explore\n`;
        for (const concept of opportunity.bridgeConcepts) {
            content += `- ${concept}\n`;
        }
        
        content += `\n## Related Clusters\n`;
        for (const cluster of opportunity.clusters) {
            content += `### ${cluster.centralConcepts[0] || 'Cluster'}\n`;
            for (const notePath of cluster.notes.slice(0, 5)) {
                const fileName = notePath.split('/').pop()?.replace('.md', '') || notePath;
                content += `- [[${fileName}]]\n`;
            }
            content += '\n';
        }
        
        content += `\n---\n*Generated by CLIPPY AI Assistant - Research Bridge*`;
        
        return content;
    }

    private async addTagsToNote(file: TFile, tags: string[]): Promise<void> {
        const content = await this.app.vault.read(file);
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        
        if (frontmatterMatch) {
            // Add to existing frontmatter
            const frontmatterContent = frontmatterMatch[1];
            const remainingContent = content.substring(frontmatterMatch[0].length);
            
            const lines = frontmatterContent.split('\n');
            let tagsLineIndex = lines.findIndex(line => line.trim().startsWith('tags:'));
            
            if (tagsLineIndex >= 0) {
                // Add new tags to existing tags section
                for (const tag of tags) {
                    lines.splice(tagsLineIndex + 1, 0, `  - ${tag}`);
                    tagsLineIndex++;
                }
            } else {
                // Add new tags section
                lines.push('tags:');
                for (const tag of tags) {
                    lines.push(`  - ${tag}`);
                }
            }
            
            const newFrontmatter = `---\n${lines.join('\n')}\n---\n`;
            const newContent = newFrontmatter + remainingContent;
            await this.app.vault.modify(file, newContent);
        } else {
            // Create new frontmatter
            const frontmatter = `---\ntags:\n${tags.map(tag => `  - ${tag}`).join('\n')}\n---\n\n`;
            const newContent = frontmatter + content;
            await this.app.vault.modify(file, newContent);
        }
    }

    private async addLinksToNote(file: TFile, links: string[]): Promise<void> {
        const content = await this.app.vault.read(file);
        const newContent = content.trim() + '\n\n## Bridge Links\n' + links.map(link => `- ${link}`).join('\n');
        await this.app.vault.modify(file, newContent);
    }

    private async addTagToNote(file: TFile, tag: string): Promise<void> {
        await this.addTagsToNote(file, [tag]);
    }
}