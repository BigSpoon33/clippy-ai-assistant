import { TFile, Vault, MetadataCache } from 'obsidian';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';

interface OrphanNote {
    file: TFile;
    title: string;
    content: string;
    tags: string[];
    incomingLinks: number;
    outgoingLinks: number;
    lastModified: number;
    wordCount: number;
    isolationScore: number;
}

interface BridgeSuggestion {
    sourceNote: string;
    targetNote: string;
    bridgeNotes: string[];
    pathStrength: number;
    reasoning: string;
}

interface ConnectionOpportunity {
    note: string;
    potentialConnections: {
        target: string;
        similarity: number;
        sharedConcepts: string[];
        suggestedLinkText: string;
    }[];
    priority: 'high' | 'medium' | 'low';
}

export class OrphanDetector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private embeddingManager: EmbeddingManager;
    private similarityEngine: SimilarityEngine;

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.embeddingManager = new EmbeddingManager();
        this.similarityEngine = new SimilarityEngine(this.embeddingManager);
    }

    /**
     * Find orphaned notes with no or minimal connections.
     */
    async findOrphanedNotes(strictMode: boolean = false): Promise<OrphanNote[]> {
        const files = this.vault.getMarkdownFiles();
        const orphans: OrphanNote[] = [];

        for (const file of files) {
            const metadata = this.metadataCache.getFileCache(file);
            const content = await this.vault.cachedRead(file);
            
            // Count incoming links (backlinks)
            const incomingLinks = this.countBacklinks(file.path);
            
            // Count outgoing links
            const outgoingLinks = metadata?.links?.length || 0;
            
            // Calculate isolation score (0 = completely isolated, 1 = well connected)
            const totalConnections = incomingLinks + outgoingLinks;
            const isolationScore = Math.max(0, 1 - (totalConnections / 10)); // Normalize to 0-1

            // Determine if note is orphaned
            const isOrphan = strictMode ? 
                (incomingLinks === 0 && outgoingLinks === 0) :
                (totalConnections <= 2);

            if (isOrphan) {
                const wordCount = content.split(/\s+/).length;
                const tags = metadata?.tags?.map(tag => tag.tag) || [];

                orphans.push({
                    file,
                    title: file.basename,
                    content,
                    tags,
                    incomingLinks,
                    outgoingLinks,
                    lastModified: file.stat.mtime,
                    wordCount,
                    isolationScore
                });
            }
        }

        // Sort by isolation score (most isolated first) and content length
        return orphans.sort((a, b) => {
            if (a.isolationScore !== b.isolationScore) {
                return b.isolationScore - a.isolationScore;
            }
            return b.wordCount - a.wordCount; // Prioritize longer content
        });
    }

    /**
     * Find potential bridge notes that could connect isolated clusters.
     */
    async findBridgeOpportunities(): Promise<BridgeSuggestion[]> {
        const files = this.vault.getMarkdownFiles();
        const bridges: BridgeSuggestion[] = [];
        
        // Find notes with high betweenness centrality potential
        const centralNotes = await this.findCentralNotes();
        
        for (const centralNote of centralNotes) {
            // Find disconnected clusters this note could bridge
            const bridgeOpportunities = await this.analyzeBridgePotential(centralNote);
            bridges.push(...bridgeOpportunities);
        }

        return bridges.sort((a, b) => b.pathStrength - a.pathStrength);
    }

    /**
     * Suggest connections for orphaned or isolated notes.
     */
    async suggestConnectionsForOrphans(
        orphans: OrphanNote[], 
        similarityThreshold: number = 0.6
    ): Promise<ConnectionOpportunity[]> {
        const opportunities: ConnectionOpportunity[] = [];
        const allFiles = this.vault.getMarkdownFiles();

        for (const orphan of orphans) {
            const connections: ConnectionOpportunity['potentialConnections'] = [];
            
            for (const file of allFiles) {
                if (file.path === orphan.file.path) continue;
                
                const targetContent = await this.vault.cachedRead(file);
                const similarity = await this.similarityEngine.calculateSimilarity(
                    orphan.content, targetContent
                );

                if (similarity > similarityThreshold) {
                    const sharedConcepts = this.findSharedConcepts(orphan.content, targetContent);
                    const suggestedLinkText = this.generateLinkSuggestion(file, sharedConcepts);

                    connections.push({
                        target: file.path,
                        similarity,
                        sharedConcepts,
                        suggestedLinkText
                    });
                }
            }

            if (connections.length > 0) {
                // Sort connections by similarity
                connections.sort((a, b) => b.similarity - a.similarity);
                
                // Determine priority based on orphan characteristics
                const priority = this.calculateConnectionPriority(orphan, connections);
                
                opportunities.push({
                    note: orphan.file.path,
                    potentialConnections: connections.slice(0, 5), // Top 5 suggestions
                    priority
                });
            }
        }

        return opportunities.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Analyze vault connectivity patterns and suggest structural improvements.
     */
    async analyzeVaultStructure(): Promise<{
        totalNotes: number;
        orphanCount: number;
        averageConnections: number;
        clusterCount: number;
        hubNotes: string[];
        recommendations: string[];
    }> {
        const files = this.vault.getMarkdownFiles();
        const orphans = await this.findOrphanedNotes(false);
        
        // Calculate average connections
        let totalConnections = 0;
        const hubNotes: { path: string; connections: number }[] = [];
        
        for (const file of files) {
            const metadata = this.metadataCache.getFileCache(file);
            const incomingLinks = this.countBacklinks(file.path);
            const outgoingLinks = metadata?.links?.length || 0;
            const connections = incomingLinks + outgoingLinks;
            
            totalConnections += connections;
            
            // Identify hub notes (highly connected)
            if (connections >= 10) {
                hubNotes.push({ path: file.path, connections });
            }
        }
        
        const averageConnections = files.length > 0 ? totalConnections / files.length : 0;
        
        // Detect clusters using tag analysis
        const clusterCount = await this.estimateClusterCount();
        
        // Generate recommendations
        const recommendations = this.generateStructuralRecommendations(
            files.length, orphans.length, averageConnections, hubNotes.length
        );

        return {
            totalNotes: files.length,
            orphanCount: orphans.length,
            averageConnections,
            clusterCount,
            hubNotes: hubNotes
                .sort((a, b) => b.connections - a.connections)
                .slice(0, 10)
                .map(hub => hub.path),
            recommendations
        };
    }

    /**
     * Find notes that could serve as effective bridges between clusters.
     */
    private async findCentralNotes(): Promise<string[]> {
        const files = this.vault.getMarkdownFiles();
        const centralityScores: { path: string; score: number }[] = [];

        for (const file of files) {
            const content = await this.vault.cachedRead(file);
            const metadata = this.metadataCache.getFileCache(file);
            
            // Calculate centrality based on:
            // 1. Number of connections
            // 2. Diversity of connected topics (tags)
            // 3. Content richness
            const connections = (metadata?.links?.length || 0) + this.countBacklinks(file.path);
            const tagDiversity = new Set(metadata?.tags?.map(t => t.tag) || []).size;
            const contentRichness = content.split(/\s+/).length / 1000; // Normalize word count
            
            const centralityScore = connections * 0.5 + tagDiversity * 0.3 + contentRichness * 0.2;
            centralityScores.push({ path: file.path, score: centralityScore });
        }

        return centralityScores
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(20, Math.ceil(files.length * 0.1))) // Top 10% or 20 notes
            .map(item => item.path);
    }

    /**
     * Analyze potential for a note to serve as a bridge.
     */
    private async analyzeBridgePotential(notePath: string): Promise<BridgeSuggestion[]> {
        const bridges: BridgeSuggestion[] = [];
        const noteContent = await this.vault.cachedRead(this.vault.getAbstractFileByPath(notePath) as TFile);
        
        // Find notes this could potentially bridge
        const files = this.vault.getMarkdownFiles();
        const similarNotes: { path: string; similarity: number }[] = [];

        for (const file of files) {
            if (file.path === notePath) continue;
            
            const content = await this.vault.cachedRead(file);
            const similarity = await this.similarityEngine.calculateSimilarity(noteContent, content);
            
            if (similarity > 0.5) {
                similarNotes.push({ path: file.path, similarity });
            }
        }

        // Group similar notes that aren't directly connected
        for (let i = 0; i < similarNotes.length; i++) {
            for (let j = i + 1; j < similarNotes.length; j++) {
                const noteA = similarNotes[i];
                const noteB = similarNotes[j];
                
                // Check if noteA and noteB are directly connected
                if (!this.areNotesConnected(noteA.path, noteB.path)) {
                    const pathStrength = (noteA.similarity + noteB.similarity) / 2;
                    const reasoning = `${notePath} shares semantic similarity with both notes and could serve as a conceptual bridge`;
                    
                    bridges.push({
                        sourceNote: noteA.path,
                        targetNote: noteB.path,
                        bridgeNotes: [notePath],
                        pathStrength,
                        reasoning
                    });
                }
            }
        }

        return bridges;
    }

    /**
     * Find shared concepts between two texts.
     */
    private findSharedConcepts(text1: string, text2: string): string[] {
        // Extract key terms using simple NLP techniques
        const extractKeyTerms = (text: string): Set<string> => {
            const words = text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3)
                .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));
            
            return new Set(words);
        };

        const terms1 = extractKeyTerms(text1);
        const terms2 = extractKeyTerms(text2);
        
        const shared: string[] = [];
        for (const term of terms1) {
            if (terms2.has(term)) {
                shared.push(term);
            }
        }

        return shared.slice(0, 5); // Top 5 shared concepts
    }

    /**
     * Generate suggested link text based on shared concepts.
     */
    private generateLinkSuggestion(file: TFile, sharedConcepts: string[]): string {
        if (sharedConcepts.length > 0) {
            const concept = sharedConcepts[0];
            return `[[${file.basename}|${concept} (see ${file.basename})]]]`;
        }
        return `[[${file.basename}]]`;
    }

    /**
     * Calculate connection priority for an orphaned note.
     */
    private calculateConnectionPriority(
        orphan: OrphanNote, 
        connections: ConnectionOpportunity['potentialConnections']
    ): 'high' | 'medium' | 'low' {
        // High priority: recent, substantial content, good connections
        if (orphan.wordCount > 500 && 
            connections[0]?.similarity > 0.8 && 
            Date.now() - orphan.lastModified < 30 * 24 * 60 * 60 * 1000) { // 30 days
            return 'high';
        }
        
        // Medium priority: moderate content or connections
        if (orphan.wordCount > 200 || connections[0]?.similarity > 0.7) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * Check if two notes are directly connected.
     */
    private areNotesConnected(pathA: string, pathB: string): boolean {
        const metadataA = this.metadataCache.getFileCache(this.vault.getAbstractFileByPath(pathA) as TFile);
        const metadataB = this.metadataCache.getFileCache(this.vault.getAbstractFileByPath(pathB) as TFile);
        
        // Check if A links to B
        const aLinksToB = metadataA?.links?.some(link => this.resolveLink(link.link) === pathB) || false;
        
        // Check if B links to A  
        const bLinksToA = metadataB?.links?.some(link => this.resolveLink(link.link) === pathA) || false;
        
        return aLinksToB || bLinksToA;
    }

    /**
     * Count backlinks to a specific file.
     */
    private countBacklinks(filePath: string): number {
        let count = 0;
        const files = this.vault.getMarkdownFiles();
        
        for (const file of files) {
            const metadata = this.metadataCache.getFileCache(file);
            if (metadata?.links?.some(link => this.resolveLink(link.link) === filePath)) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Estimate cluster count using tag analysis.
     */
    private async estimateClusterCount(): Promise<number> {
        const files = this.vault.getMarkdownFiles();
        const tagGroups = new Map<string, number>();
        
        for (const file of files) {
            const metadata = this.metadataCache.getFileCache(file);
            const tags = metadata?.tags?.map(tag => tag.tag) || [];
            
            if (tags.length === 0) {
                tagGroups.set('untagged', (tagGroups.get('untagged') || 0) + 1);
            } else {
                for (const tag of tags) {
                    tagGroups.set(tag, (tagGroups.get(tag) || 0) + 1);
                }
            }
        }
        
        // Count significant tag groups (more than 2 files)
        return Array.from(tagGroups.values()).filter(count => count > 2).length;
    }

    /**
     * Generate structural improvement recommendations.
     */
    private generateStructuralRecommendations(
        totalNotes: number,
        orphanCount: number,
        averageConnections: number,
        hubCount: number
    ): string[] {
        const recommendations: string[] = [];
        
        const orphanPercentage = (orphanCount / totalNotes) * 100;
        
        if (orphanPercentage > 20) {
            recommendations.push(`High orphan rate (${orphanPercentage.toFixed(1)}%). Consider creating index notes or topic overviews.`);
        }
        
        if (averageConnections < 2) {
            recommendations.push('Low connectivity detected. Try linking related concepts and creating cross-references.');
        }
        
        if (hubCount === 0 && totalNotes > 50) {
            recommendations.push('No hub notes found. Create central topic pages to improve navigation.');
        }
        
        if (hubCount > totalNotes * 0.1) {
            recommendations.push('Many hub notes detected. Consider breaking down overly-connected notes into smaller topics.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Vault structure looks healthy! Continue building connections between related ideas.');
        }
        
        return recommendations;
    }

    /**
     * Resolve link to file path.
     */
    private resolveLink(link: string): string {
        if (link.endsWith('.md')) {
            return link;
        }
        return `${link}.md`;
    }
}