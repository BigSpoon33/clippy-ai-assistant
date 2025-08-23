/**
 * CLIPPY AI Assistant - Vault Pattern Analyzer
 * Analyzes existing vault structure to understand user patterns and conventions
 */

import { App, TFile, CachedMetadata } from 'obsidian';
import { VaultPatterns, TagPattern, FrontmatterSchema, WikilinkPattern } from '../types';

export class VaultAnalyzer {
  private app: App;
  private cache: VaultPatterns | null = null;
  private lastAnalysis: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Analyze vault patterns with caching
   */
  async analyzeVaultPatterns(force = false): Promise<VaultPatterns> {
    const now = Date.now();
    
    if (!force && this.cache && (now - this.lastAnalysis) < this.CACHE_DURATION) {
      return this.cache;
    }

    console.log('CLIPPY: Analyzing vault patterns...');
    
    const files = this.app.vault.getMarkdownFiles();
    const patterns: VaultPatterns = {
      tagPatterns: [],
      dateFormats: [],
      cssClasses: [],
      frontmatterSchemas: [],
      wikilinkPatterns: [],
    };

    // Analyze files in batches to avoid blocking UI
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await this.processBatch(batch, patterns);
      
      // Yield control to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Process and clean up results
    patterns.tagPatterns = this.consolidateTagPatterns(patterns.tagPatterns);
    patterns.frontmatterSchemas = this.consolidateFrontmatterSchemas(patterns.frontmatterSchemas);
    patterns.dateFormats = [...new Set(patterns.dateFormats)].slice(0, 10);
    patterns.cssClasses = [...new Set(patterns.cssClasses)].slice(0, 20);

    this.cache = patterns;
    this.lastAnalysis = now;

    console.log('CLIPPY: Vault analysis completed', patterns);
    return patterns;
  }

  private async processBatch(files: TFile[], patterns: VaultPatterns): Promise<void> {
    for (const file of files) {
      try {
        const metadata = this.app.metadataCache.getFileCache(file);
        const content = await this.app.vault.read(file);
        
        // Analyze frontmatter
        if (metadata?.frontmatter) {
          this.analyzeFrontmatter(metadata.frontmatter, patterns);
        }

        // Analyze tags
        if (metadata?.tags) {
          this.analyzeTags(metadata.tags, patterns);
        }

        // Analyze content patterns
        this.analyzeContent(content, file, patterns);
        
      } catch (error) {
        console.warn(`CLIPPY: Error analyzing file ${file.path}:`, error);
      }
    }
  }

  private analyzeFrontmatter(frontmatter: any, patterns: VaultPatterns): void {
    for (const [key, value] of Object.entries(frontmatter)) {
      const type = this.inferType(value);
      
      // Check for existing schema
      let schema = patterns.frontmatterSchemas.find(s => s.field === key);
      if (!schema) {
        schema = {
          field: key,
          type,
          frequency: 0,
          examples: [],
        };
        patterns.frontmatterSchemas.push(schema);
      }
      
      schema.frequency++;
      
      // Add example if not too many
      if (schema.examples.length < 5) {
        const example = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (!schema.examples.includes(example)) {
          schema.examples.push(example);
        }
      }

      // Extract CSS classes
      if (key === 'cssclass' || key === 'cssclasses' || key === 'css-classes') {
        const classes = Array.isArray(value) ? value : [value];
        patterns.cssClasses.push(...classes.map(c => String(c)));
      }

      // Extract date formats
      if (key.includes('date') || key === 'created' || key === 'modified') {
        const dateStr = String(value);
        const format = this.inferDateFormat(dateStr);
        if (format) {
          patterns.dateFormats.push(format);
        }
      }
    }
  }

  private analyzeTags(tags: any[], patterns: VaultPatterns): void {
    for (const tagCache of tags) {
      const tag = tagCache.tag;
      if (!tag) continue;

      // Find or create tag pattern
      let tagPattern = patterns.tagPatterns.find(p => p.pattern === tag);
      if (!tagPattern) {
        tagPattern = {
          pattern: tag,
          frequency: 0,
          categories: this.extractTagCategories(tag),
        };
        patterns.tagPatterns.push(tagPattern);
      }
      
      tagPattern.frequency++;
    }
  }

  private analyzeContent(content: string, file: TFile, patterns: VaultPatterns): void {
    // Analyze wikilinks
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    const linkPatterns = new Map<string, number>();
    
    while ((match = wikilinkRegex.exec(content)) !== null) {
      const link = match[1];
      const pattern = this.categorizeWikilink(link);
      linkPatterns.set(pattern, (linkPatterns.get(pattern) || 0) + 1);
    }

    // Add to patterns
    for (const [pattern, frequency] of linkPatterns) {
      let existingPattern = patterns.wikilinkPatterns.find(p => p.displayFormat === pattern);
      if (!existingPattern) {
        existingPattern = {
          pattern: new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
          displayFormat: pattern,
          frequency: 0,
        };
        patterns.wikilinkPatterns.push(existingPattern);
      }
      existingPattern.frequency += frequency;
    }

    // Analyze inline tags
    const inlineTagRegex = /#([a-zA-Z0-9/_-]+)/g;
    while ((match = inlineTagRegex.exec(content)) !== null) {
      const tag = '#' + match[1];
      let tagPattern = patterns.tagPatterns.find(p => p.pattern === tag);
      if (!tagPattern) {
        tagPattern = {
          pattern: tag,
          frequency: 0,
          categories: this.extractTagCategories(tag),
        };
        patterns.tagPatterns.push(tagPattern);
      }
      tagPattern.frequency++;
    }
  }

  private inferType(value: any): 'string' | 'number' | 'date' | 'array' | 'boolean' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    
    const str = String(value);
    
    // Check for date patterns
    if (this.isDateString(str)) return 'date';
    
    return 'string';
  }

  private isDateString(str: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO datetime
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
      /^\d{4}-\d{2}$/,                 // YYYY-MM
      /^\d{4}-W\d{2}$/,                // YYYY-WW (week)
    ];
    
    return datePatterns.some(pattern => pattern.test(str));
  }

  private inferDateFormat(dateStr: string): string | null {
    const formats: [RegExp, string][] = [
      [/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'],
      [/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'YYYY-MM-DDTHH:mm'],
      [/^\d{2}\/\d{2}\/\d{4}$/, 'MM/DD/YYYY'],
      [/^\d{4}-\d{2}$/, 'YYYY-MM'],
      [/^\d{4}-W\d{2}$/, 'YYYY-WW'],
      [/^\d{4}$/, 'YYYY'],
    ];
    
    for (const [pattern, format] of formats) {
      if (pattern.test(dateStr)) {
        return format;
      }
    }
    
    return null;
  }

  private extractTagCategories(tag: string): string[] {
    const categories: string[] = [];
    
    // Remove leading #
    const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
    
    // Split by common delimiters
    const parts = cleanTag.split(/[/_-]/);
    
    if (parts.length > 1) {
      categories.push(parts[0]); // First part is usually the category
    }
    
    // Common category patterns
    const categoryPatterns = [
      { pattern: /^(work|study|learning|education)/i, category: 'academic' },
      { pattern: /^(project|todo|task)/i, category: 'tasks' },
      { pattern: /^(person|people|family|friend)/i, category: 'people' },
      { pattern: /^(book|reading|literature)/i, category: 'reading' },
      { pattern: /^(code|programming|dev)/i, category: 'development' },
      { pattern: /^(note|idea|thought)/i, category: 'notes' },
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(cleanTag)) {
        categories.push(category);
        break;
      }
    }
    
    return [...new Set(categories)];
  }

  private categorizeWikilink(link: string): string {
    // Extract display text if present
    const [target, display] = link.split('|');
    
    if (display) {
      return `${target}|${display}`;
    }
    
    // Categorize by common patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(target)) {
      return 'YYYY-MM-DD (date)';
    }
    
    if (/^00\./.test(target)) {
      return '00. (index)';
    }
    
    if (/\d+\s*-/.test(target)) {
      return 'NN - (structured)';
    }
    
    return 'plain';
  }

  private consolidateTagPatterns(patterns: TagPattern[]): TagPattern[] {
    // Sort by frequency and keep top patterns
    return patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Keep top 50 tag patterns
  }

  private consolidateFrontmatterSchemas(schemas: FrontmatterSchema[]): FrontmatterSchema[] {
    // Sort by frequency and keep commonly used fields
    return schemas
      .filter(s => s.frequency >= 2) // Must appear at least twice
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 30); // Keep top 30 frontmatter fields
  }

  /**
   * Get common tag prefixes used in the vault
   */
  getTagPrefixes(patterns: VaultPatterns): string[] {
    const prefixes = new Set<string>();
    
    for (const tagPattern of patterns.tagPatterns) {
      if (tagPattern.frequency < 3) continue; // Skip rare tags
      
      const tag = tagPattern.pattern.startsWith('#') ? tagPattern.pattern.slice(1) : tagPattern.pattern;
      const parts = tag.split(/[/_-]/);
      
      if (parts.length > 1) {
        prefixes.add(parts[0]);
      }
    }
    
    return Array.from(prefixes).slice(0, 10);
  }

  /**
   * Get most common date format used in the vault
   */
  getPrimaryDateFormat(patterns: VaultPatterns): string {
    const formatCounts = new Map<string, number>();
    
    for (const format of patterns.dateFormats) {
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    }
    
    const sortedFormats = Array.from(formatCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return sortedFormats[0]?.[0] || 'YYYY-MM-DD';
  }

  /**
   * Get folder-based organization patterns
   */
  async getFolderPatterns(): Promise<{ pattern: string; examples: string[] }[]> {
    const files = this.app.vault.getMarkdownFiles();
    const folderPatterns = new Map<string, Set<string>>();
    
    for (const file of files) {
      const pathParts = file.path.split('/');
      if (pathParts.length > 1) {
        const folder = pathParts[0];
        const pattern = this.inferFolderPattern(folder);
        
        if (!folderPatterns.has(pattern)) {
          folderPatterns.set(pattern, new Set());
        }
        folderPatterns.get(pattern)!.add(folder);
      }
    }
    
    return Array.from(folderPatterns.entries())
      .map(([pattern, examples]) => ({
        pattern,
        examples: Array.from(examples).slice(0, 5)
      }))
      .filter(({ examples }) => examples.length > 1);
  }

  private inferFolderPattern(folder: string): string {
    if (/^\d{2}\s*-/.test(folder)) {
      return 'NN - (numbered)';
    }
    
    if (/^\d{4}-\d{2}/.test(folder)) {
      return 'YYYY-MM (date)';
    }
    
    if (folder.includes(' ')) {
      return 'Multi Word';
    }
    
    return 'Single Word';
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache = null;
    this.lastAnalysis = 0;
  }

  /**
   * Get cached vault patterns without triggering new analysis
   */
  getPatterns(): VaultPatterns | null {
    return this.cache;
  }

  /**
   * Get vault patterns, analyzing if cache is empty or stale
   */
  async getOrAnalyzePatterns(): Promise<VaultPatterns> {
    if (!this.cache || (Date.now() - this.lastAnalysis) > this.CACHE_DURATION) {
      return await this.analyzeVaultPatterns();
    }
    return this.cache;
  }
}