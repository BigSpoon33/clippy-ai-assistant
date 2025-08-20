import { TFile, Vault, MetadataCache } from 'obsidian';
import { EmbeddingManager } from '../semantic/embedding-manager';
import { SimilarityEngine } from '../semantic/similarity-engine';

interface GraphNode {
    id: string;
    file: TFile;
    title: string;
    content: string;
    embedding?: number[];
    tags: string[];
    links: string[];
    backlinks: string[];
    clusters: string[];
    importance: number;
}

interface GraphEdge {
    source: string;
    target: string;
    weight: number;
    type: 'explicit' | 'semantic' | 'temporal' | 'causal' | 'hierarchical';
    confidence: number;
}

interface GraphCluster {
    id: string;
    name: string;
    nodes: string[];
    centroid: number[];
    coherence: number;
}

export class KnowledgeGraphManager {
    private nodes: Map<string, GraphNode> = new Map();
    private edges: Map<string, GraphEdge> = new Map();
    private clusters: Map<string, GraphCluster> = new Map();
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
     * Build the complete knowledge graph from vault files.
     */
    async buildGraph(): Promise<void> {
        const files = this.vault.getMarkdownFiles();
        
        // Create nodes for all files
        for (const file of files) {
            await this.createNode(file);
        }

        // Create explicit edges from wikilinks
        this.createExplicitEdges();

        // Create semantic edges using similarity analysis
        await this.createSemanticEdges();

        // Detect and create clusters
        await this.detectClusters();

        // Calculate node importance scores
        this.calculateImportanceScores();
    }

    /**
     * Create a graph node for a file.
     */
    private async createNode(file: TFile): Promise<GraphNode> {
        const content = await this.vault.cachedRead(file);
        const metadata = this.metadataCache.getFileCache(file);
        
        // Extract title (prefer frontmatter, fallback to filename)
        let title = file.basename;
        if (metadata?.frontmatter?.title) {
            title = metadata.frontmatter.title;
        }

        // Extract tags
        const tags = metadata?.tags?.map(tag => tag.tag) || [];
        if (metadata?.frontmatter?.tags) {
            tags.push(...metadata.frontmatter.tags);
        }

        // Extract explicit links
        const links = metadata?.links?.map(link => link.link) || [];
        
        // Find backlinks
        const backlinks = this.findBacklinks(file.path);

        // Generate embedding for semantic analysis
        const embedding = await this.embeddingManager.generateEmbedding(content);

        const node: GraphNode = {
            id: file.path,
            file,
            title,
            content,
            embedding,
            tags,
            links,
            backlinks,
            clusters: [],
            importance: 0
        };

        this.nodes.set(file.path, node);
        return node;
    }

    /**
     * Create explicit edges based on wikilinks and backlinks.
     */
    private createExplicitEdges(): void {
        for (const [nodeId, node] of this.nodes) {
            // Create edges for outgoing links
            for (const link of node.links) {
                const targetNode = this.findNodeByLink(link);
                if (targetNode) {
                    const edgeId = `${nodeId}->${targetNode.id}`;
                    this.edges.set(edgeId, {
                        source: nodeId,
                        target: targetNode.id,
                        weight: 1.0,
                        type: 'explicit',
                        confidence: 1.0
                    });
                }
            }
        }
    }

    /**
     * Create semantic edges based on content similarity.
     */
    private async createSemanticEdges(): Promise<void> {
        const nodeList = Array.from(this.nodes.values());
        const similarityThreshold = 0.7; // Configurable threshold

        for (let i = 0; i < nodeList.length; i++) {
            for (let j = i + 1; j < nodeList.length; j++) {
                const nodeA = nodeList[i];
                const nodeB = nodeList[j];

                // Skip if already has explicit connection
                const explicitEdge = this.edges.has(`${nodeA.id}->${nodeB.id}`) || 
                                   this.edges.has(`${nodeB.id}->${nodeA.id}`);
                if (explicitEdge) continue;

                // Calculate semantic similarity
                const similarity = await this.similarityEngine.calculateSimilarity(
                    nodeA.content, nodeB.content
                );

                if (similarity > similarityThreshold) {
                    // Determine relationship type using heuristics
                    const relationshipType = this.similarityEngine.classifyRelationshipType(
                        nodeA.content, nodeB.content
                    );

                    const edgeId = `${nodeA.id}~${nodeB.id}`;
                    this.edges.set(edgeId, {
                        source: nodeA.id,
                        target: nodeB.id,
                        weight: similarity,
                        type: relationshipType,
                        confidence: similarity
                    });
                }
            }
        }
    }

    /**
     * Detect content clusters using embedding similarity.
     */
    private async detectClusters(): Promise<void> {
        const nodes = Array.from(this.nodes.values()).filter(n => n.embedding);
        if (nodes.length < 3) return;

        // Use k-means clustering on embeddings
        const k = Math.min(Math.ceil(nodes.length / 5), 10); // Dynamic k based on vault size
        const clusters = await this.performKMeansClustering(nodes, k);

        for (let i = 0; i < clusters.length; i++) {
            const clusterNodes = clusters[i];
            if (clusterNodes.length < 2) continue;

            // Calculate cluster centroid
            const centroid = this.calculateCentroid(clusterNodes.map(n => n.embedding!));
            
            // Calculate cluster coherence (average intra-cluster similarity)
            let totalSimilarity = 0;
            let pairCount = 0;
            for (let j = 0; j < clusterNodes.length; j++) {
                for (let k = j + 1; k < clusterNodes.length; k++) {
                    totalSimilarity += this.embeddingManager.calculateSimilarity(
                        clusterNodes[j].embedding!, clusterNodes[k].embedding!
                    );
                    pairCount++;
                }
            }
            const coherence = pairCount > 0 ? totalSimilarity / pairCount : 0;

            // Generate cluster name from most common tags or keywords
            const clusterName = this.generateClusterName(clusterNodes);

            const clusterId = `cluster_${i}`;
            const cluster: GraphCluster = {
                id: clusterId,
                name: clusterName,
                nodes: clusterNodes.map(n => n.id),
                centroid,
                coherence
            };

            this.clusters.set(clusterId, cluster);

            // Update nodes with cluster membership
            for (const node of clusterNodes) {
                node.clusters.push(clusterId);
            }
        }
    }

    /**
     * Calculate importance scores using PageRank-like algorithm.
     */
    private calculateImportanceScores(): void {
        const damping = 0.85;
        const iterations = 100;
        const nodes = Array.from(this.nodes.values());
        
        // Initialize scores
        const scores = new Map<string, number>();
        for (const node of nodes) {
            scores.set(node.id, 1.0);
        }

        // Iterate PageRank algorithm
        for (let iter = 0; iter < iterations; iter++) {
            const newScores = new Map<string, number>();
            
            for (const node of nodes) {
                let score = (1 - damping);
                
                // Add contributions from incoming edges
                for (const [, edge] of this.edges) {
                    if (edge.target === node.id) {
                        const sourceNode = this.nodes.get(edge.source);
                        if (sourceNode) {
                            const outDegree = this.getOutDegree(edge.source);
                            score += damping * (scores.get(edge.source) || 0) * edge.weight / Math.max(outDegree, 1);
                        }
                    }
                }
                
                newScores.set(node.id, score);
            }
            
            // Update scores
            for (const [nodeId, score] of newScores) {
                scores.set(nodeId, score);
            }
        }

        // Apply scores to nodes
        for (const node of nodes) {
            node.importance = scores.get(node.id) || 0;
        }
    }

    /**
     * Get enhanced graph data for Obsidian integration.
     */
    getEnhancedGraphData(): {
        nodes: GraphNode[];
        edges: GraphEdge[];
        clusters: GraphCluster[];
        metrics: {
            totalNodes: number;
            totalEdges: number;
            semanticEdges: number;
            averageConnectivity: number;
            clusterCount: number;
        };
    } {
        const nodes = Array.from(this.nodes.values());
        const edges = Array.from(this.edges.values());
        const clusters = Array.from(this.clusters.values());

        const semanticEdges = edges.filter(e => e.type !== 'explicit').length;
        const averageConnectivity = nodes.length > 0 ? 
            edges.length / nodes.length : 0;

        return {
            nodes,
            edges,
            clusters,
            metrics: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                semanticEdges,
                averageConnectivity,
                clusterCount: clusters.length
            }
        };
    }

    /**
     * Find missing connections that should exist based on content similarity.
     */
    async findMissingConnections(threshold: number = 0.8): Promise<{
        source: string;
        target: string;
        similarity: number;
        suggestedLinkText: string;
    }[]> {
        const suggestions: {
            source: string;
            target: string;
            similarity: number;
            suggestedLinkText: string;
        }[] = [];

        const nodes = Array.from(this.nodes.values());
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];

                // Skip if connection already exists
                const hasConnection = this.edges.has(`${nodeA.id}->${nodeB.id}`) ||
                                    this.edges.has(`${nodeB.id}->${nodeA.id}`) ||
                                    this.edges.has(`${nodeA.id}~${nodeB.id}`);
                
                if (hasConnection) continue;

                const similarity = await this.similarityEngine.calculateSimilarity(
                    nodeA.content, nodeB.content
                );

                if (similarity > threshold) {
                    suggestions.push({
                        source: nodeA.id,
                        target: nodeB.id,
                        similarity,
                        suggestedLinkText: `[[${nodeB.title}]]`
                    });
                }
            }
        }

        return suggestions.sort((a, b) => b.similarity - a.similarity);
    }

    // Helper methods
    private findBacklinks(filePath: string): string[] {
        const backlinks: string[] = [];
        for (const [, node] of this.nodes) {
            if (node.links.some(link => this.resolveLink(link) === filePath)) {
                backlinks.push(node.id);
            }
        }
        return backlinks;
    }

    private findNodeByLink(link: string): GraphNode | undefined {
        const resolvedPath = this.resolveLink(link);
        return this.nodes.get(resolvedPath);
    }

    private resolveLink(link: string): string {
        // Handle different link formats and resolve to file path
        if (link.endsWith('.md')) {
            return link;
        }
        return `${link}.md`;
    }

    private getOutDegree(nodeId: string): number {
        let count = 0;
        for (const [, edge] of this.edges) {
            if (edge.source === nodeId) count++;
        }
        return count;
    }

    private async performKMeansClustering(nodes: GraphNode[], k: number): Promise<GraphNode[][]> {
        // Simple k-means implementation for embeddings
        const embeddings = nodes.map(n => n.embedding!);
        const clusters: GraphNode[][] = Array(k).fill(null).map(() => []);
        
        // Initialize centroids randomly
        const centroids: number[][] = [];
        for (let i = 0; i < k; i++) {
            const randomIdx = Math.floor(Math.random() * embeddings.length);
            centroids.push([...embeddings[randomIdx]]);
        }

        // Iterate until convergence
        for (let iter = 0; iter < 20; iter++) {
            // Clear clusters
            clusters.forEach(cluster => cluster.length = 0);

            // Assign nodes to nearest centroid
            for (let i = 0; i < nodes.length; i++) {
                let bestCluster = 0;
                let bestSimilarity = -1;

                for (let j = 0; j < k; j++) {
                    const similarity = this.embeddingManager.calculateSimilarity(
                        embeddings[i], centroids[j]
                    );
                    if (similarity > bestSimilarity) {
                        bestSimilarity = similarity;
                        bestCluster = j;
                    }
                }

                clusters[bestCluster].push(nodes[i]);
            }

            // Update centroids
            for (let j = 0; j < k; j++) {
                if (clusters[j].length > 0) {
                    const clusterEmbeddings = clusters[j].map(n => n.embedding!);
                    centroids[j] = this.calculateCentroid(clusterEmbeddings);
                }
            }
        }

        return clusters;
    }

    private calculateCentroid(embeddings: number[][]): number[] {
        if (embeddings.length === 0) return [];
        
        const dimension = embeddings[0].length;
        const centroid = new Array(dimension).fill(0);
        
        for (const embedding of embeddings) {
            for (let i = 0; i < dimension; i++) {
                centroid[i] += embedding[i];
            }
        }
        
        for (let i = 0; i < dimension; i++) {
            centroid[i] /= embeddings.length;
        }
        
        return centroid;
    }

    private generateClusterName(nodes: GraphNode[]): string {
        // Extract common tags and keywords
        const tagCounts = new Map<string, number>();
        const wordCounts = new Map<string, number>();

        for (const node of nodes) {
            // Count tags
            for (const tag of node.tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }

            // Count significant words from titles
            const words = node.title.toLowerCase()
                .split(/\W+/)
                .filter(word => word.length > 3 && !['the', 'and', 'for', 'are', 'with'].includes(word));
            
            for (const word of words) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        }

        // Find most common tag or word
        const commonTag = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];
        
        const commonWord = Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];

        if (commonTag && commonTag[1] >= 2) {
            return commonTag[0];
        } else if (commonWord && commonWord[1] >= 2) {
            return commonWord[0];
        } else {
            return `Cluster ${Math.random().toString(36).substring(7)}`;
        }
    }
}