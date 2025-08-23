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

interface BridgeCluster {
    id: string;
    notes: string[];
    centralConcepts: string[];
    tags: string[];
    avgEmbedding: number[];
    density: number;
    size: number;
}

interface BridgeOpportunity {
    type: 'auto' | 'tag' | 'research' | 'index';
    title: string;
    description: string;
    clusters: BridgeCluster[];
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

    constructor(vault: Vault, metadataCache: MetadataCache, embeddingManager?: EmbeddingManager, similarityEngine?: SimilarityEngine, settings?: any) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.embeddingManager = embeddingManager || new EmbeddingManager(
            settings?.rag?.embeddings?.ollamaUrl,
            settings
        );
        this.similarityEngine = similarityEngine || new SimilarityEngine(this.embeddingManager);
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
     * Find potential bridge opportunities using semantic clustering and MoC methodology.
     */
    async findBridgeOpportunities(): Promise<BridgeOpportunity[]> {
        console.log('🌉 Starting comprehensive bridge detection...');
        
        // Step 1: Perform semantic clustering of notes
        const clusters = await this.performSemanticClustering();
        console.log(`Found ${clusters.length} semantic clusters`);
        
        // Step 2: Analyze cluster relationships and gaps
        const opportunities: BridgeOpportunity[] = [];
        
        // Auto-Bridge opportunities (direct connections)
        const autoOpportunities = await this.findAutoBridgeOpportunities(clusters);
        opportunities.push(...autoOpportunities);
        
        // Tag Bridge opportunities (shared conceptual space)
        const tagOpportunities = await this.findTagBridgeOpportunities(clusters);
        opportunities.push(...tagOpportunities);
        
        // Research Bridge opportunities (knowledge gaps)
        const researchOpportunities = await this.findResearchBridgeOpportunities(clusters);
        opportunities.push(...researchOpportunities);
        
        // Index Bridge opportunities (MoC-style organization)
        const indexOpportunities = await this.findIndexBridgeOpportunities(clusters);
        opportunities.push(...indexOpportunities);
        
        console.log(`Generated ${opportunities.length} bridge opportunities`);
        return opportunities.sort((a, b) => {
            // Sort by priority and confidence
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.confidence - a.confidence;
        });
    }

    /**
     * Legacy bridge detection for backward compatibility.
     */
    async findLegacyBridgeOpportunities(): Promise<BridgeSuggestion[]> {
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
            return `[[${file.basename}|${concept} (see ${file.basename})]]`;
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
     * Perform semantic clustering of notes using embedding-based similarity.
     */
    private async performSemanticClustering(): Promise<BridgeCluster[]> {
        const files = this.vault.getMarkdownFiles();
        const noteData: { file: TFile; content: string; embedding: number[]; tags: string[] }[] = [];
        
        // Generate embeddings for all notes
        for (const file of files) {
            const content = await this.vault.cachedRead(file);
            const metadata = this.metadataCache.getFileCache(file);
            const tags = metadata?.tags?.map(tag => tag.tag) || [];
            
            try {
                const embeddingResult = await this.embeddingManager.generateEmbedding(content);
                const embedding = embeddingResult.vector;
                noteData.push({ file, content, embedding, tags });
            } catch (error) {
                console.warn(`Failed to generate embedding for ${file.path}:`, error);
            }
        }
        
        // Perform clustering using similarity threshold
        const clusters: BridgeCluster[] = [];
        const visited = new Set<string>();
        const similarityThreshold = 0.6;
        
        for (const note of noteData) {
            if (visited.has(note.file.path)) continue;
            
            const cluster: BridgeCluster = {
                id: `cluster_${clusters.length}`,
                notes: [note.file.path],
                centralConcepts: this.extractCentralConcepts(note.content),
                tags: [...note.tags],
                avgEmbedding: [...note.embedding],
                density: 0,
                size: 1
            };
            
            visited.add(note.file.path);
            
            // Find similar notes to add to cluster
            for (const otherNote of noteData) {
                if (visited.has(otherNote.file.path)) continue;
                
                const similarity = await this.similarityEngine.calculateSimilarity(
                    note.content, otherNote.content
                );
                
                if (similarity > similarityThreshold) {
                    cluster.notes.push(otherNote.file.path);
                    cluster.tags.push(...otherNote.tags);
                    cluster.centralConcepts.push(...this.extractCentralConcepts(otherNote.content));
                    
                    // Update average embedding
                    for (let i = 0; i < cluster.avgEmbedding.length; i++) {
                        cluster.avgEmbedding[i] = (cluster.avgEmbedding[i] * cluster.size + otherNote.embedding[i]) / (cluster.size + 1);
                    }
                    
                    cluster.size++;
                    visited.add(otherNote.file.path);
                }
            }
            
            // Clean up duplicates and calculate density
            cluster.tags = [...new Set(cluster.tags)];
            cluster.centralConcepts = [...new Set(cluster.centralConcepts)].slice(0, 5);
            cluster.density = this.calculateClusterDensity(cluster);
            
            if (cluster.size >= 2) { // Only keep clusters with multiple notes
                clusters.push(cluster);
            }
        }
        
        return clusters.sort((a, b) => b.size - a.size);
    }

    /**
     * Find Auto-Bridge opportunities (create bridge note + add tags + create links).
     */
    private async findAutoBridgeOpportunities(clusters: BridgeCluster[]): Promise<BridgeOpportunity[]> {
        const opportunities: BridgeOpportunity[] = [];
        
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const clusterA = clusters[i];
                const clusterB = clusters[j];
                
                // Calculate semantic similarity between clusters
                const similarity = this.calculateClusterSimilarity(clusterA, clusterB);
                
                if (similarity > 0.4 && similarity < 0.8) { // Sweet spot for bridging
                    const bridgeConcepts = this.findBridgeConcepts(clusterA, clusterB);
                    
                    if (bridgeConcepts.length > 0) {
                        const bridgeTitle = this.generateBridgeTitle(clusterA, clusterB, bridgeConcepts);
                        const noteContent = this.generateBridgeNoteContent(clusterA, clusterB, bridgeConcepts);
                        const bridgeTags = this.generateBridgeTags(clusterA, clusterB);
                        const links = this.generateBridgeLinks(clusterA, clusterB);
                        
                        opportunities.push({
                            type: 'auto',
                            title: bridgeTitle,
                            description: `Connect ${clusterA.size} notes about ${clusterA.centralConcepts.slice(0, 2).join(', ')} with ${clusterB.size} notes about ${clusterB.centralConcepts.slice(0, 2).join(', ')}`,
                            clusters: [clusterA, clusterB],
                            bridgeConcepts,
                            confidence: similarity,
                            priority: similarity > 0.6 ? 'high' : 'medium',
                            implementation: {
                                noteContent,
                                tags: bridgeTags,
                                links
                            }
                        });
                    }
                }
            }
        }
        
        return opportunities.slice(0, 5); // Top 5 auto-bridge opportunities
    }

    /**
     * Find Tag Bridge opportunities (add bridge tags to all notes in clusters).
     */
    private async findTagBridgeOpportunities(clusters: BridgeCluster[]): Promise<BridgeOpportunity[]> {
        const opportunities: BridgeOpportunity[] = [];
        const tagAnalysis = this.analyzeTagPatterns(clusters);
        
        for (const pattern of tagAnalysis.gaps) {
            if (pattern.affectedClusters.length >= 2) {
                const bridgeTags = this.generateHierarchicalTags(pattern.concept);
                
                opportunities.push({
                    type: 'tag',
                    title: `Tag Bridge: ${pattern.concept}`,
                    description: `Add hierarchical tags for ${pattern.concept} across ${pattern.affectedClusters.length} clusters (${pattern.noteCount} notes)`,
                    clusters: pattern.affectedClusters,
                    bridgeConcepts: [pattern.concept],
                    confidence: pattern.confidence,
                    priority: pattern.noteCount > 10 ? 'high' : 'medium',
                    implementation: {
                        tags: bridgeTags
                    }
                });
            }
        }
        
        return opportunities.slice(0, 3); // Top 3 tag bridge opportunities
    }

    /**
     * Find Research Bridge opportunities (create research todo list for gap areas).
     */
    private async findResearchBridgeOpportunities(clusters: BridgeCluster[]): Promise<BridgeOpportunity[]> {
        const opportunities: BridgeOpportunity[] = [];
        const gapAnalysis = this.analyzeKnowledgeGaps(clusters);
        
        for (const gap of gapAnalysis) {
            if (gap.priority === 'high') {
                const researchAreas = this.generateResearchQuestions(gap);
                
                opportunities.push({
                    type: 'research',
                    title: `Research Gap: ${gap.area}`,
                    description: `Identified knowledge gap between ${gap.connectedClusters.map(c => c.centralConcepts[0]).join(' and ')}`,
                    clusters: gap.connectedClusters,
                    bridgeConcepts: gap.missingConcepts,
                    confidence: gap.confidence,
                    priority: gap.priority,
                    implementation: {
                        researchAreas
                    }
                });
            }
        }
        
        return opportunities.slice(0, 3); // Top 3 research opportunities
    }

    /**
     * Find Index Bridge opportunities (create comprehensive MoC-style index note).
     */
    private async findIndexBridgeOpportunities(clusters: BridgeCluster[]): Promise<BridgeOpportunity[]> {
        const opportunities: BridgeOpportunity[] = [];
        
        // Group clusters by domain/theme
        const domains = this.groupClustersByDomain(clusters);
        
        for (const [domain, domainClusters] of domains.entries()) {
            if (domainClusters.length >= 3) { // Need sufficient clusters for an index
                const indexStructure = this.generateMoCStructure(domainClusters);
                const confidence = Math.min(0.9, domainClusters.length / 10); // Confidence based on cluster count
                
                opportunities.push({
                    type: 'index',
                    title: `${domain} - Map of Content`,
                    description: `Create comprehensive index for ${domainClusters.length} clusters in ${domain} domain (${domainClusters.reduce((sum, c) => sum + c.size, 0)} total notes)`,
                    clusters: domainClusters,
                    bridgeConcepts: [...new Set(domainClusters.flatMap(c => c.centralConcepts))].slice(0, 8),
                    confidence,
                    priority: domainClusters.length > 5 ? 'high' : 'medium',
                    implementation: {
                        indexStructure,
                        noteContent: this.generateMoCContent(domain, domainClusters, indexStructure)
                    }
                });
            }
        }
        
        return opportunities.slice(0, 2); // Top 2 index opportunities
    }

    // Helper methods for bridge detection
    
    private extractCentralConcepts(content: string): string[] {
        // Extract key concepts using frequency analysis and importance heuristics
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'this', 'that', 'with', 'have', 'from', 'they', 'been', 'than', 'will', 'would', 'there', 'each', 'which', 'their', 'said', 'into', 'more', 'some', 'what', 'only', 'other', 'know', 'just', 'first', 'also', 'after', 'back', 'very', 'good', 'come', 'could', 'make', 'where', 'much', 'take', 'well', 'little'].includes(word));
        
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    private calculateClusterDensity(cluster: BridgeCluster): number {
        // Calculate based on note count and concept diversity
        const conceptDiversity = cluster.centralConcepts.length / Math.max(1, cluster.size);
        const tagDiversity = cluster.tags.length / Math.max(1, cluster.size);
        return Math.min(1, (conceptDiversity + tagDiversity) / 2);
    }

    private calculateClusterSimilarity(clusterA: BridgeCluster, clusterB: BridgeCluster): number {
        // Use embedding similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < Math.min(clusterA.avgEmbedding.length, clusterB.avgEmbedding.length); i++) {
            dotProduct += clusterA.avgEmbedding[i] * clusterB.avgEmbedding[i];
            normA += clusterA.avgEmbedding[i] * clusterA.avgEmbedding[i];
            normB += clusterB.avgEmbedding[i] * clusterB.avgEmbedding[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private findBridgeConcepts(clusterA: BridgeCluster, clusterB: BridgeCluster): string[] {
        const conceptsA = new Set(clusterA.centralConcepts);
        const conceptsB = new Set(clusterB.centralConcepts);
        const sharedConcepts = [...conceptsA].filter(concept => conceptsB.has(concept));
        
        if (sharedConcepts.length > 0) {
            return sharedConcepts;
        }
        
        // Generate bridging concepts based on semantic similarity
        const bridgeConcepts: string[] = [];
        for (const conceptA of clusterA.centralConcepts.slice(0, 3)) {
            for (const conceptB of clusterB.centralConcepts.slice(0, 3)) {
                const similarity = this.calculateStringSimilarity(conceptA, conceptB);
                if (similarity > 0.3) {
                    bridgeConcepts.push(`${conceptA}-${conceptB}`);
                }
            }
        }
        
        return bridgeConcepts.slice(0, 3);
    }

    private generateBridgeTitle(clusterA: BridgeCluster, clusterB: BridgeCluster, bridgeConcepts: string[]): string {
        const conceptA = clusterA.centralConcepts[0];
        const conceptB = clusterB.centralConcepts[0];
        
        if (bridgeConcepts.length > 0) {
            return `Bridge: ${conceptA} ↔ ${conceptB} via ${bridgeConcepts[0]}`;
        }
        
        return `Bridge: ${conceptA} and ${conceptB}`;
    }

    private generateBridgeNoteContent(clusterA: BridgeCluster, clusterB: BridgeCluster, bridgeConcepts: string[]): string {
        const title = this.generateBridgeTitle(clusterA, clusterB, bridgeConcepts);
        const conceptA = clusterA.centralConcepts[0];
        const conceptB = clusterB.centralConcepts[0];
        
        return `# ${title}

## Overview
This note bridges concepts between **${conceptA}** and **${conceptB}**, exploring their connections and relationships.

## Key Connections
${bridgeConcepts.map(concept => `- ${concept}`).join('\n')}

## Related Notes

### ${conceptA} Cluster
${clusterA.notes.map(note => `- [[${this.getFileNameFromPath(note)}]]`).join('\n')}

### ${conceptB} Cluster
${clusterB.notes.map(note => `- [[${this.getFileNameFromPath(note)}]]`).join('\n')}

## Synthesis
*This section can be expanded to explore the deeper connections between these concepts.*

---
*Generated by CLIPPY AI Assistant - Bridge Detection*`;
    }

    private generateBridgeTags(clusterA: BridgeCluster, clusterB: BridgeCluster): string[] {
        const sharedTags = clusterA.tags.filter(tag => clusterB.tags.includes(tag));
        const bridgeTags = ['bridge', 'synthesis', 'connection'];
        
        return [...new Set([...bridgeTags, ...sharedTags])].slice(0, 5);
    }

    private generateBridgeLinks(clusterA: BridgeCluster, clusterB: BridgeCluster): string[] {
        // Select key notes from each cluster to link
        const keyNotesA = clusterA.notes.slice(0, 3);
        const keyNotesB = clusterB.notes.slice(0, 3);
        
        return [...keyNotesA, ...keyNotesB].map(notePath => 
            `[[${this.getFileNameFromPath(notePath)}]]`
        );
    }

    private analyzeTagPatterns(clusters: BridgeCluster[]): { gaps: Array<{ concept: string; affectedClusters: BridgeCluster[]; noteCount: number; confidence: number }> } {
        const conceptMap = new Map<string, BridgeCluster[]>();
        
        // Group clusters by shared concepts
        for (const cluster of clusters) {
            for (const concept of cluster.centralConcepts) {
                if (!conceptMap.has(concept)) {
                    conceptMap.set(concept, []);
                }
                conceptMap.get(concept)!.push(cluster);
            }
        }
        
        const gaps = [];
        for (const [concept, affectedClusters] of conceptMap.entries()) {
            if (affectedClusters.length >= 2) {
                const noteCount = affectedClusters.reduce((sum, c) => sum + c.size, 0);
                const confidence = Math.min(0.9, affectedClusters.length / 5);
                
                gaps.push({ concept, affectedClusters, noteCount, confidence });
            }
        }
        
        return { gaps: gaps.sort((a, b) => b.noteCount - a.noteCount) };
    }

    private generateHierarchicalTags(concept: string): string[] {
        // Generate a hierarchy of tags for the concept
        const baseTags = [concept];
        const hierarchicalTags = [
            `${concept}/general`,
            `${concept}/specific`,
            `${concept}/application`,
            `${concept}/theory`
        ];
        
        return [...baseTags, ...hierarchicalTags];
    }

    private analyzeKnowledgeGaps(clusters: BridgeCluster[]): Array<{ area: string; connectedClusters: BridgeCluster[]; missingConcepts: string[]; confidence: number; priority: 'high' | 'medium' | 'low' }> {
        const gaps = [];
        
        // Find conceptual gaps between highly related clusters
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const clusterA = clusters[i];
                const clusterB = clusters[j];
                const similarity = this.calculateClusterSimilarity(clusterA, clusterB);
                
                if (similarity > 0.3 && similarity < 0.6) {
                    const bridgeConcepts = this.findBridgeConcepts(clusterA, clusterB);
                    
                    if (bridgeConcepts.length === 0) {
                        const missingConcepts = this.inferMissingConcepts(clusterA, clusterB);
                        const area = `${clusterA.centralConcepts[0]}-${clusterB.centralConcepts[0]}`;
                        
                        gaps.push({
                            area,
                            connectedClusters: [clusterA, clusterB],
                            missingConcepts,
                            confidence: similarity,
                            priority: (similarity > 0.4 ? 'high' : 'medium') as 'high' | 'medium' | 'low'
                        });
                    }
                }
            }
        }
        
        return gaps.sort((a, b) => b.confidence - a.confidence);
    }

    private generateResearchQuestions(gap: { area: string; connectedClusters: BridgeCluster[]; missingConcepts: string[] }): string[] {
        const questions = [];
        const conceptA = gap.connectedClusters[0].centralConcepts[0];
        const conceptB = gap.connectedClusters[1].centralConcepts[0];
        
        questions.push(
            `How does ${conceptA} relate to ${conceptB}?`,
            `What are the key connections between ${conceptA} and ${conceptB}?`,
            `What frameworks bridge ${conceptA} and ${conceptB}?`
        );
        
        for (const missingConcept of gap.missingConcepts.slice(0, 2)) {
            questions.push(`Research ${missingConcept} in the context of ${conceptA} and ${conceptB}`);
        }
        
        return questions;
    }

    private inferMissingConcepts(clusterA: BridgeCluster, clusterB: BridgeCluster): string[] {
        // Simple heuristic: combine concepts to suggest missing bridging ideas
        const missing = [];
        const conceptA = clusterA.centralConcepts[0];
        const conceptB = clusterB.centralConcepts[0];
        
        missing.push(
            `${conceptA}-${conceptB}`,
            `integration-${conceptA}-${conceptB}`,
            `comparison-${conceptA}-${conceptB}`
        );
        
        return missing;
    }

    private groupClustersByDomain(clusters: BridgeCluster[]): Map<string, BridgeCluster[]> {
        const domains = new Map<string, BridgeCluster[]>();
        
        for (const cluster of clusters) {
            // Use primary tag or first concept as domain indicator
            let domain = 'general';
            
            if (cluster.tags.length > 0) {
                domain = cluster.tags[0].split('/')[0]; // Get root tag
            } else if (cluster.centralConcepts.length > 0) {
                domain = cluster.centralConcepts[0];
            }
            
            // Normalize domain name
            domain = domain.toLowerCase().replace(/[^a-z0-9]/g, '-');
            
            if (!domains.has(domain)) {
                domains.set(domain, []);
            }
            domains.get(domain)!.push(cluster);
        }
        
        return domains;
    }

    private generateMoCStructure(clusters: BridgeCluster[]): { [category: string]: string[] } {
        const structure: { [category: string]: string[] } = {};
        
        // Group notes by cluster concepts
        for (const cluster of clusters) {
            const category = cluster.centralConcepts[0] || 'General';
            structure[category] = cluster.notes.map(note => this.getFileNameFromPath(note));
        }
        
        return structure;
    }

    private generateMoCContent(domain: string, clusters: BridgeCluster[], structure: { [category: string]: string[] }): string {
        const title = `${domain.charAt(0).toUpperCase() + domain.slice(1)} - Map of Content`;
        const totalNotes = clusters.reduce((sum, c) => sum + c.size, 0);
        
        let content = `# ${title}

`;
        content += `*A comprehensive map organizing ${totalNotes} notes across ${clusters.length} conceptual areas.*\n\n`;
        content += `## Overview\n\n`;
        content += `This Map of Content (MoC) serves as a navigation hub for the **${domain}** domain, providing structured access to related notes and concepts.\n\n`;
        
        for (const [category, notes] of Object.entries(structure)) {
            content += `## ${category}\n\n`;
            content += notes.map(note => `- [[${note}]]`).join('\n');
            content += '\n\n';
        }
        
        content += `## Related Concepts\n\n`;
        const allConcepts = [...new Set(clusters.flatMap(c => c.centralConcepts))];
        content += allConcepts.slice(0, 10).map(concept => `- #${concept}`).join('\n');
        content += '\n\n';
        
        content += `---\n*Generated by CLIPPY AI Assistant - Index Bridge*`;
        
        return content;
    }

    private getFileNameFromPath(path: string): string {
        return path.split('/').pop()?.replace('.md', '') || path;
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
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