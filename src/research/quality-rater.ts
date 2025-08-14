import { ResearchSource } from './automated-note-generator';

interface QualityMetrics {
    credibilityScore: number;
    relevanceScore: number;
    freshnessScore: number;
    completenessScore: number;
    overallScore: number;
}

interface DomainReputation {
    domain: string;
    reputation: 'high' | 'medium' | 'low' | 'unknown';
    specialties: string[];
    trustScore: number;
}

export class QualityRater {
    private domainReputations: Map<string, DomainReputation>;
    private keywordWeights: Map<string, number>;

    constructor() {
        this.domainReputations = this.initializeDomainReputations();
        this.keywordWeights = this.initializeKeywordWeights();
    }

    /**
     * Rate the overall quality of a research source.
     */
    async rateSourceQuality(
        source: ResearchSource
    ): Promise<number> {
        const metrics = await this.calculateQualityMetrics(source);
        
        // Weighted average of different quality factors
        const weights = {
            credibility: 0.35,
            relevance: 0.25,
            freshness: 0.15,
            completeness: 0.25
        };

        const overallScore = 
            metrics.credibilityScore * weights.credibility +
            metrics.relevanceScore * weights.relevance +
            metrics.freshnessScore * weights.freshness +
            metrics.completenessScore * weights.completeness;

        return Math.min(Math.max(overallScore, 0), 1);
    }

    /**
     * Rate the relevance of a source to the search topic.
     */
    async rateRelevance(
        source: ResearchSource,
        options: any
    ): Promise<number> {
        const searchTerms = options.searchTerms || [];
        const mainTerm = searchTerms[0] || '';
        
        if (!mainTerm) return 0.5; // Default relevance if no search terms

        const content = source.content.toLowerCase();
        const title = source.title.toLowerCase();
        
        let relevanceScore = 0;

        // Check main term frequency
        const mainTermCount = this.countTermOccurrences(content + ' ' + title, mainTerm);
        relevanceScore += Math.min(mainTermCount * 0.1, 0.4);

        // Check related terms
        for (const term of searchTerms.slice(1)) {
            const termCount = this.countTermOccurrences(content + ' ' + title, term);
            relevanceScore += Math.min(termCount * 0.05, 0.1);
        }

        // Title relevance bonus
        if (title.includes(mainTerm.toLowerCase())) {
            relevanceScore += 0.3;
        }

        // Content length factor (too short might be low quality)
        const contentLength = source.content.length;
        if (contentLength < 100) {
            relevanceScore *= 0.5;
        } else if (contentLength > 500) {
            relevanceScore += 0.1;
        }

        return Math.min(relevanceScore, 1);
    }

    /**
     * Calculate detailed quality metrics for a source.
     */
    private async calculateQualityMetrics(
        source: ResearchSource
    ): Promise<QualityMetrics> {
        const credibilityScore = this.calculateCredibilityScore(source);
        const freshnessScore = this.calculateFreshnessScore(source);
        const completenessScore = this.calculateCompletenessScore(source);
        
        // Relevance will be calculated separately based on search context
        const relevanceScore = 0.5; 

        const overallScore = (credibilityScore + freshnessScore + completenessScore + relevanceScore) / 4;

        return {
            credibilityScore,
            relevanceScore,
            freshnessScore,
            completenessScore,
            overallScore
        };
    }

    /**
     * Calculate credibility score based on source type and domain.
     */
    private calculateCredibilityScore(
        source: ResearchSource
    ): number {
        let score = 0.5; // Base score

        // Source type weighting
        switch (source.type) {
            case 'pdf':
                score = 0.9; // Personal PDFs are highly trusted
                break;
            case 'note':
                score = 0.95; // Personal notes are most trusted
                break;
            case 'document':
                score = 0.8; // Other personal documents
                break;
            case 'web':
                score = this.calculateWebCredibility(source);
                break;
        }

        return score;
    }

    /**
     * Calculate web source credibility.
     */
    private calculateWebCredibility(
        source: ResearchSource
    ): number {
        if (!source.url) return 0.3;

        const domain = this.extractDomain(source.url);
        const reputation = this.domainReputations.get(domain);

        if (reputation) {
            return reputation.trustScore;
        }

        // Default scoring for unknown domains
        let score = 0.4;

        // Check for credibility indicators in content
        const content = source.content.toLowerCase();
        const title = source.title.toLowerCase();

        // Academic indicators
        if (this.hasAcademicIndicators(content, title)) {
            score += 0.2;
        }

        // Medical/health indicators
        if (this.hasMedicalIndicators(content, title)) {
            score += 0.15;
        }

        // Government source indicators
        if (this.hasGovernmentIndicators(domain, content)) {
            score += 0.25;
        }

        // Professional indicators
        if (this.hasProfessionalIndicators(content, title)) {
            score += 0.1;
        }

        // Red flags that decrease credibility
        if (this.hasCredibilityRedFlags(content, title)) {
            score -= 0.3;
        }

        return Math.min(Math.max(score, 0.1), 1);
    }

    /**
     * Calculate freshness score based on publication date.
     */
    private calculateFreshnessScore(
        source: ResearchSource
    ): number {
        if (!source.lastUpdated) return 0.5; // Neutral if no date

        const now = new Date();
        const ageInDays = (now.getTime() - source.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        // Fresher content gets higher scores
        if (ageInDays < 30) return 1.0;        // Last month
        if (ageInDays < 90) return 0.9;        // Last 3 months  
        if (ageInDays < 365) return 0.8;       // Last year
        if (ageInDays < 730) return 0.6;       // Last 2 years
        if (ageInDays < 1825) return 0.4;      // Last 5 years
        return 0.2; // Older than 5 years
    }

    /**
     * Calculate completeness score based on content length and structure.
     */
    private calculateCompletenessScore(
        source: ResearchSource
    ): number {
        const content = source.content;
        let score = 0.3; // Base score

        // Content length factor
        const length = content.length;
        if (length > 2000) score += 0.3;
        else if (length > 1000) score += 0.2;
        else if (length > 500) score += 0.1;
        else if (length < 100) score -= 0.2;

        // Structure indicators
        if (this.hasGoodStructure(content)) {
            score += 0.2;
        }

        // Information density
        if (this.hasHighInformationDensity(content)) {
            score += 0.2;
        }

        // Citations and references
        if (this.hasCitations(content)) {
            score += 0.1;
        }

        return Math.min(score, 1);
    }

    // Helper methods for quality assessment

    private countTermOccurrences(text: string, term: string): number {
        const regex = new RegExp(term.toLowerCase(), 'gi');
        return (text.match(regex) || []).length;
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    private hasAcademicIndicators(content: string, title: string): boolean {
        const academicKeywords = [
            'research', 'study', 'journal', 'peer-reviewed', 'abstract',
            'methodology', 'analysis', 'conclusion', 'bibliography',
            'doi:', 'pubmed', 'citations', 'university', 'professor'
        ];
        
        const text = (content + ' ' + title).toLowerCase();
        return academicKeywords.some(keyword => text.includes(keyword));
    }

    private hasMedicalIndicators(content: string, title: string): boolean {
        const medicalKeywords = [
            'clinical', 'patient', 'treatment', 'diagnosis', 'symptoms',
            'medicine', 'health', 'medical', 'doctor', 'physician',
            'therapeutic', 'pharmacology', 'dosage', 'side effects'
        ];
        
        const text = (content + ' ' + title).toLowerCase();
        return medicalKeywords.some(keyword => text.includes(keyword));
    }

    private hasGovernmentIndicators(domain: string, content: string): boolean {
        const govDomains = ['.gov', '.edu', '.org'];
        const govKeywords = ['government', 'official', 'policy', 'regulation'];
        
        return govDomains.some(tld => domain.includes(tld)) ||
               govKeywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    private hasProfessionalIndicators(content: string, title: string): boolean {
        const professionalKeywords = [
            'expert', 'professional', 'certified', 'licensed', 'qualified',
            'experience', 'specializes', 'practice', 'consultant'
        ];
        
        const text = (content + ' ' + title).toLowerCase();
        return professionalKeywords.some(keyword => text.includes(keyword));
    }

    private hasCredibilityRedFlags(content: string, title: string): boolean {
        const redFlags = [
            'miracle cure', 'guaranteed', 'secret', 'shocking truth',
            'doctors hate', 'big pharma', 'conspiracy', 'click here',
            'limited time', 'act now', 'free trial'
        ];
        
        const text = (content + ' ' + title).toLowerCase();
        return redFlags.some(flag => text.includes(flag));
    }

    private hasGoodStructure(content: string): boolean {
        // Check for headers, lists, paragraphs
        const hasHeaders = /^#{1,6}\s+/.test(content) || /<h[1-6]>/i.test(content);
        const hasLists = /^\s*[-*]\s+/m.test(content) || /<[uo]l>/i.test(content);
        const hasParagraphs = content.split('\n\n').length > 2;
        
        return hasHeaders || hasLists || hasParagraphs;
    }

    private hasHighInformationDensity(content: string): boolean {
        // Simple heuristic: ratio of meaningful words to total words
        const words = content.split(/\s+/);
        const meaningfulWords = words.filter(word => 
            word.length > 3 && 
            !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|its|did|get|may|say|she|use|her|now|see|him|two|way|out|may|get|use|man|new|now|see|two|way|out|may|get)$/i.test(word)
        );
        
        return meaningfulWords.length / words.length > 0.6;
    }

    private hasCitations(content: string): boolean {
        // Look for citation patterns
        const citationPatterns = [
            /\[\d+\]/,           // [1], [2], etc.
            /\(\d{4}\)/,         // (2023), (2024), etc.
            /doi:\s*\d+/i,       // DOI references
            /https?:\/\/[^\s]+/, // URLs
            /et al\./i,          // Academic citation style
            /\bbibliography\b/i  // Bibliography section
        ];
        
        return citationPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Initialize domain reputation database.
     */
    private initializeDomainReputations(): Map<string, DomainReputation> {
        const reputations = new Map<string, DomainReputation>();

        // High-reputation domains
        const highRepDomains = [
            { domain: 'wikipedia.org', trustScore: 0.85, specialties: ['general', 'encyclopedia'] },
            { domain: 'ncbi.nlm.nih.gov', trustScore: 0.95, specialties: ['medical', 'research'] },
            { domain: 'pubmed.ncbi.nlm.nih.gov', trustScore: 0.95, specialties: ['medical', 'research'] },
            { domain: 'nature.com', trustScore: 0.9, specialties: ['science', 'research'] },
            { domain: 'science.org', trustScore: 0.9, specialties: ['science', 'research'] },
            { domain: 'sciencedirect.com', trustScore: 0.85, specialties: ['academic', 'research'] },
            { domain: 'mayoclinic.org', trustScore: 0.9, specialties: ['medical', 'health'] },
            { domain: 'webmd.com', trustScore: 0.75, specialties: ['medical', 'health'] },
            { domain: 'healthline.com', trustScore: 0.8, specialties: ['health', 'wellness'] },
            { domain: 'who.int', trustScore: 0.95, specialties: ['health', 'global'] },
            { domain: 'cdc.gov', trustScore: 0.95, specialties: ['health', 'public-health'] },
            { domain: 'nih.gov', trustScore: 0.95, specialties: ['medical', 'research'] }
        ];

        highRepDomains.forEach(({ domain, trustScore, specialties }) => {
            reputations.set(domain, {
                domain,
                reputation: 'high',
                specialties,
                trustScore
            });
        });

        // Medium-reputation domains
        const mediumRepDomains = [
            { domain: 'britannica.com', trustScore: 0.75, specialties: ['encyclopedia', 'general'] },
            { domain: 'medicalnewstoday.com', trustScore: 0.7, specialties: ['health', 'news'] },
            { domain: 'verywellhealth.com', trustScore: 0.7, specialties: ['health', 'wellness'] },
            { domain: 'drugs.com', trustScore: 0.75, specialties: ['pharmaceutical', 'medical'] }
        ];

        mediumRepDomains.forEach(({ domain, trustScore, specialties }) => {
            reputations.set(domain, {
                domain,
                reputation: 'medium',
                specialties,
                trustScore
            });
        });

        return reputations;
    }

    /**
     * Initialize keyword importance weights.
     */
    private initializeKeywordWeights(): Map<string, number> {
        const weights = new Map<string, number>();

        // High-importance keywords
        const highImportance = [
            'research', 'study', 'clinical', 'evidence', 'scientific',
            'peer-reviewed', 'meta-analysis', 'systematic review'
        ];
        highImportance.forEach(keyword => weights.set(keyword, 1.5));

        // Medium-importance keywords
        const mediumImportance = [
            'analysis', 'investigation', 'findings', 'results',
            'methodology', 'data', 'statistics'
        ];
        mediumImportance.forEach(keyword => weights.set(keyword, 1.2));

        return weights;
    }

    /**
     * Update domain reputation based on user feedback.
     */
    updateDomainReputation(domain: string, feedbackScore: number): void {
        const existing = this.domainReputations.get(domain);
        if (existing) {
            // Adjust trust score based on feedback
            const adjustment = (feedbackScore - 0.5) * 0.1; // Small adjustments
            existing.trustScore = Math.min(Math.max(existing.trustScore + adjustment, 0.1), 1);
        }
    }
}