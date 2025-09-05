/**
 * Vault Context System - Comprehensive Obsidian Vault Intelligence
 * Extracts detailed vault information for AI agent processing
 */

import { App, TFile, CachedMetadata, getAllTags, parseFrontMatterTags, WorkspaceLeaf, MarkdownView } from 'obsidian';

export interface VaultContext {
  // Current State
  currentNote: {
    file: TFile | null;
    name: string | null;
    path: string | null;
    content: string | null;
    wordCount: number;
    frontmatter: Record<string, any> | null;
    tags: string[];
    outlinks: string[];
    backlinks: string[];
    createdDate: Date | null;
    modifiedDate: Date | null;
  };

  // Vault Statistics  
  vaultStats: {
    totalNotes: number;
    totalAttachments: number;
    totalTags: number;
    avgNoteLength: number;
    oldestNote: Date | null;
    newestNote: Date | null;
    recentlyModified: TFile[];
  };

  // Tag Analysis
  tagAnalysis: {
    allTags: string[];
    tagCounts: Record<string, number>;
    topTags: Array<{ tag: string; count: number }>;
    orphanTags: string[];  // Tags used only once
  };

  // Link Analysis
  linkAnalysis: {
    totalLinks: number;
    mostLinkedNotes: Array<{ file: string; linkCount: number }>;
    orphanNotes: string[];  // Notes with no incoming links
    brokenLinks: string[];
  };

  // Workspace State
  workspace: {
    openTabs: string[];
    activeViewType: string;
    sidebarsOpen: {
      left: boolean;
      right: boolean;
    };
    recentFiles: string[];
  };

  // Content Patterns
  contentPatterns: {
    commonWords: Array<{ word: string; count: number }>;
    averageSentenceLength: number;
    readingTimeEstimate: string;
    contentTypes: Record<string, number>; // md, canvas, etc
  };
}

export class VaultContextExtractor {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Extract comprehensive vault context for AI processing
   */
  public async extractFullContext(): Promise<VaultContext> {
    const currentNote = await this.getCurrentNoteContext();
    const vaultStats = await this.getVaultStatistics();
    const tagAnalysis = await this.getTagAnalysis();
    const linkAnalysis = await this.getLinkAnalysis();
    const workspace = this.getWorkspaceContext();
    const contentPatterns = await this.getContentPatterns();

    return {
      currentNote,
      vaultStats,
      tagAnalysis,
      linkAnalysis,
      workspace,
      contentPatterns
    };
  }

  /**
   * Get current active note details
   */
  private async getCurrentNoteContext() {
    // Try multiple approaches to find the active note
    let activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    let activeFile: TFile | null = null;

    if (activeView && activeView.file) {
      activeFile = activeView.file;
    } else {
      // Fallback 1: Try to get the most recently active markdown file
      const leaves = this.app.workspace.getLeavesOfType('markdown');
      if (leaves.length > 0) {
        // Get the most recently accessed markdown leaf
        const recentLeaf = leaves.find(leaf => {
          const view = leaf.view as MarkdownView;
          return view.file && view.file instanceof TFile;
        });
        if (recentLeaf) {
          activeFile = (recentLeaf.view as MarkdownView).file;
          activeView = recentLeaf.view as MarkdownView;
        }
      }
      
      // Fallback 2: Try to get from recent files
      if (!activeFile) {
        const recentFiles = (this.app.workspace as any).recentFileTracker?.recentFiles;
        if (recentFiles && recentFiles.length > 0) {
          const recentPath = recentFiles[0];
          const file = this.app.vault.getAbstractFileByPath(recentPath);
          if (file instanceof TFile && file.extension === 'md') {
            activeFile = file;
          }
        }
      }
      
      // Fallback 3: Get any markdown file that's currently open
      if (!activeFile) {
        const openFiles = this.app.workspace.getLeavesOfType('markdown')
          .map(leaf => (leaf.view as MarkdownView).file)
          .filter(file => file instanceof TFile);
        if (openFiles.length > 0) {
          activeFile = openFiles[0];
        }
      }
    }
    
    if (!activeFile) {
      console.log('[VaultContext] No active markdown file found');
      return {
        file: null,
        name: null,
        path: null,
        content: null,
        wordCount: 0,
        frontmatter: null,
        tags: [],
        outlinks: [],
        backlinks: [],
        createdDate: null,
        modifiedDate: null
      };
    }

    console.log('[VaultContext] Found active file:', activeFile.path);

    const file = activeFile;
    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter || null;
    
    // Extract tags from multiple sources
    const tags = new Set<string>();
    if (cache?.tags) {
      cache.tags.forEach(tag => tags.add(tag.tag));
    }
    if (frontmatter?.tags) {
      const fmTags = parseFrontMatterTags(frontmatter) || [];
      fmTags.forEach(tag => tags.add(tag));
    }

    // Get outgoing links
    const outlinks = cache?.links?.map(link => link.link) || [];
    
    // Get backlinks
    const backlinks = Object.keys(this.app.metadataCache.resolvedLinks)
      .filter(notePath => {
        const noteLinks = this.app.metadataCache.resolvedLinks[notePath];
        return noteLinks && noteLinks[file.path] !== undefined;
      });

    return {
      file,
      name: file.name,
      path: file.path,
      content,
      wordCount: content.split(/\s+/).length,
      frontmatter,
      tags: Array.from(tags),
      outlinks,
      backlinks,
      createdDate: new Date(file.stat.ctime),
      modifiedDate: new Date(file.stat.mtime)
    };
  }

  /**
   * Calculate vault-wide statistics
   */
  private async getVaultStatistics() {
    const files = this.app.vault.getMarkdownFiles();
    const attachments = this.app.vault.getFiles().filter(f => !f.path.endsWith('.md'));
    
    let totalWordCount = 0;
    let oldestDate = Date.now();
    let newestDate = 0;

    for (const file of files.slice(0, 100)) { // Limit for performance
      try {
        const content = await this.app.vault.read(file);
        totalWordCount += content.split(/\s+/).length;
        
        if (file.stat.ctime < oldestDate) oldestDate = file.stat.ctime;
        if (file.stat.mtime > newestDate) newestDate = file.stat.mtime;
      } catch (e) {
        // Skip files that can't be read
      }
    }

    // Get recently modified files
    const recentlyModified = files
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 10);

    // Get tag count using the same robust method as tag analysis
    const tagAnalysis = await this.getTagAnalysis();
    const totalTags = tagAnalysis.allTags.length;

    return {
      totalNotes: files.length,
      totalAttachments: attachments.length,
      totalTags,
      avgNoteLength: Math.round(totalWordCount / Math.max(files.length, 1)),
      oldestNote: new Date(oldestDate),
      newestNote: new Date(newestDate),
      recentlyModified
    };
  }

  /**
   * Analyze tag usage patterns
   */
  private async getTagAnalysis() {
    // Try multiple approaches to get tags
    let allTagsData = getAllTags(this.app.metadataCache) || {};
    
    // Fallback: Manual tag extraction if getAllTags fails
    if (Object.keys(allTagsData).length === 0) {
      console.log('[VaultContext] getAllTags returned empty, trying manual extraction...');
      allTagsData = await this.extractTagsManually();
    }
    
    const allTags = Object.keys(allTagsData);
    const tagCounts = allTagsData;

    // Get top tags by usage
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Find orphan tags (used only once)
    const orphanTags = Object.entries(tagCounts)
      .filter(([tag, count]) => count === 1)
      .map(([tag]) => tag);

    console.log('[VaultContext] Tag analysis:', { 
      totalTags: allTags.length, 
      topTags: topTags.slice(0, 5),
      sampleCounts: Object.entries(tagCounts).slice(0, 3)
    });

    return {
      allTags,
      tagCounts,
      topTags,
      orphanTags
    };
  }

  /**
   * Manual tag extraction as fallback
   */
  private async extractTagsManually(): Promise<Record<string, number>> {
    const tagCounts: Record<string, number> = {};
    const files = this.app.vault.getMarkdownFiles(); // Process ALL files for complete audit
    
    console.log(`[VaultContext] Scanning ${files.length} files for complete tag audit...`);
    
    for (const file of files) {
      try {
        const cache = this.app.metadataCache.getFileCache(file);
        const tags = new Set<string>();
        
        // Extract from cache tags
        if (cache?.tags) {
          cache.tags.forEach(tag => tags.add(tag.tag));
        }
        
        // Extract from frontmatter
        if (cache?.frontmatter?.tags) {
          const fmTags = parseFrontMatterTags(cache.frontmatter) || [];
          fmTags.forEach(tag => tags.add(tag));
        }
        
        // Count tags
        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
        
      } catch (error) {
        console.warn('[VaultContext] Error processing file:', file.path, error);
      }
    }
    
    const totalUniqueTags = Object.keys(tagCounts).length;
    const totalTagUsages = Object.values(tagCounts).reduce((sum, count) => sum + count, 0);
    
    console.log(`[VaultContext] Complete tag audit: ${totalUniqueTags} unique tags, ${totalTagUsages} total usages`);
    
    return tagCounts;
  }

  /**
   * Analyze link patterns and relationships
   */
  private async getLinkAnalysis() {
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    const files = this.app.vault.getMarkdownFiles();
    
    let totalLinks = 0;
    const incomingLinks: Record<string, number> = {};
    const brokenLinks = new Set<string>();

    // Count incoming links for each file
    Object.values(resolvedLinks).forEach(fileLinks => {
      Object.entries(fileLinks).forEach(([targetPath, linkCount]) => {
        totalLinks += linkCount;
        incomingLinks[targetPath] = (incomingLinks[targetPath] || 0) + linkCount;
      });
    });

    // Find most linked notes
    const mostLinkedNotes = Object.entries(incomingLinks)
      .map(([file, linkCount]) => ({ file, linkCount }))
      .sort((a, b) => b.linkCount - a.linkCount)
      .slice(0, 10);

    // Find orphan notes (no incoming links)
    const orphanNotes = files
      .filter(file => !incomingLinks[file.path])
      .map(file => file.path);

    // Detect broken links (simplified)
    const unresolvedLinks = this.app.metadataCache.unresolvedLinks;
    Object.values(unresolvedLinks).forEach(fileLinks => {
      Object.keys(fileLinks).forEach(link => brokenLinks.add(link));
    });

    return {
      totalLinks,
      mostLinkedNotes,
      orphanNotes: orphanNotes.slice(0, 20), // Limit for readability
      brokenLinks: Array.from(brokenLinks).slice(0, 10)
    };
  }

  /**
   * Get current workspace state
   */
  private getWorkspaceContext() {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType('markdown');
    const openTabs = leaves.map(leaf => {
      const view = leaf.view as MarkdownView;
      return view.file?.name || 'Unknown';
    });

    const activeView = workspace.getActiveViewOfType(MarkdownView);
    const recentFiles = (workspace as any).recentFileTracker?.recentFiles || [];

    return {
      openTabs,
      activeViewType: activeView?.getViewType() || 'none',
      sidebarsOpen: {
        left: workspace.leftSplit.collapsed === false,
        right: workspace.rightSplit.collapsed === false
      },
      recentFiles: recentFiles.slice(0, 10)
    };
  }

  /**
   * Analyze content patterns across the vault
   */
  private async getContentPatterns() {
    const files = this.app.vault.getFiles();
    const wordFreq: Record<string, number> = {};
    let totalWords = 0;
    let totalSentences = 0;
    const contentTypes: Record<string, number> = {};

    // Analyze file types
    files.forEach(file => {
      const ext = file.extension || 'unknown';
      contentTypes[ext] = (contentTypes[ext] || 0) + 1;
    });

    // Sample a subset of markdown files for content analysis
    const sampleFiles = this.app.vault.getMarkdownFiles().slice(0, 50);
    
    for (const file of sampleFiles) {
      try {
        const content = await this.app.vault.read(file);
        const words = content.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3); // Skip short words
        
        totalWords += words.length;
        totalSentences += content.split(/[.!?]+/).length;
        
        // Count word frequency (limit to avoid memory issues)
        words.slice(0, 1000).forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
      } catch (e) {
        // Skip problematic files
      }
    }

    // Get most common words
    const commonWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    const avgSentenceLength = totalWords / Math.max(totalSentences, 1);
    const estimatedReadingTime = Math.round(totalWords / 200); // 200 WPM average

    return {
      commonWords,
      averageSentenceLength: Math.round(avgSentenceLength),
      readingTimeEstimate: `${estimatedReadingTime} minutes`,
      contentTypes
    };
  }

  /**
   * Get a lightweight context for quick AI queries
   */
  public async getQuickContext(): Promise<Partial<VaultContext>> {
    const currentNote = await this.getCurrentNoteContext();
    const workspace = this.getWorkspaceContext();
    
    return {
      currentNote,
      workspace
    };
  }

  /**
   * Format context for AI consumption
   */
  public formatForAI(context: VaultContext): string {
    return `OBSIDIAN VAULT CONTEXT:

CURRENT NOTE:
- Name: ${context.currentNote.name || 'None'}
- Path: ${context.currentNote.path || 'N/A'}
- Word Count: ${context.currentNote.wordCount}
- Tags: ${context.currentNote.tags.join(', ') || 'None'}
- Outlinks: ${context.currentNote.outlinks.length}
- Backlinks: ${context.currentNote.backlinks.length}

VAULT STATISTICS:
- Total Notes: ${context.vaultStats.totalNotes}
- Total Tags: ${context.vaultStats.totalTags}
- Average Note Length: ${context.vaultStats.avgNoteLength} words

TOP TAGS: ${context.tagAnalysis.topTags.slice(0, 10).map(t => `${t.tag} (${t.count})`).join(', ')}

WORKSPACE:
- Open Tabs: ${context.workspace.openTabs.join(', ')}
- Active View: ${context.workspace.activeViewType}

CONTENT INSIGHTS:
- Most Common Words: ${context.contentPatterns.commonWords.slice(0, 5).map(w => w.word).join(', ')}
- Estimated Reading Time: ${context.contentPatterns.readingTimeEstimate}`;
  }
}