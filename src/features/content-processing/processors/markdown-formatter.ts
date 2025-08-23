/**
 * CLIPPY AI Assistant - Markdown Formatter
 * Enhances and formats messy notes while preserving existing patterns
 */

import { AIProvider, VaultPatterns, FormattingIssue, EnhancementSuggestion, ProcessingResult, PreservedElement } from '../../../types';

export class MarkdownFormatter {
  private aiProvider: AIProvider;
  private vaultPatterns: VaultPatterns;

  constructor(aiProvider: AIProvider, vaultPatterns: VaultPatterns) {
    this.aiProvider = aiProvider;
    this.vaultPatterns = vaultPatterns;
  }

  /**
   * Enhance note content while preserving existing patterns
   */
  async enhanceNote(content: string): Promise<ProcessingResult> {
    try {
      // Step 1: Extract and preserve critical elements
      const preservedElements = this.extractPreservedElements(content);
      
      // Step 2: Analyze content for issues
      const formattingIssues = this.detectFormattingIssues(content);
      
      // Step 3: Generate AI-powered suggestions
      const aiAnalysis = await this.aiProvider.analyzeContent(content);
      
      // Step 4: Create enhancement suggestions
      const suggestions = this.generateEnhancementSuggestions(content, formattingIssues, aiAnalysis);
      
      // Step 5: Apply safe automatic fixes
      const enhancedContent = this.applySafeFixes(content, suggestions, preservedElements);

      return {
        originalContent: content,
        enhancedContent,
        suggestions,
        preservedElements,
      };
    } catch (error) {
      console.error('CLIPPY Formatter: Enhancement failed:', error);
      throw new Error(`Failed to enhance note: ${error.message}`);
    }
  }

  /**
   * Extract elements that must be preserved
   */
  private extractPreservedElements(content: string): PreservedElement[] {
    const preserved: PreservedElement[] = [];
    
    // Preserve frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      preserved.push({
        type: 'frontmatter',
        startIndex: frontmatterMatch.index!,
        endIndex: frontmatterMatch.index! + frontmatterMatch[0].length,
        content: frontmatterMatch[0],
      });
    }

    // Preserve wikilinks
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikilinkRegex.exec(content)) !== null) {
      preserved.push({
        type: 'wikilink',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        content: match[0],
      });
    }

    // Preserve templater syntax
    const templaterRegex = /<%[^%]*%>/g;
    while ((match = templaterRegex.exec(content)) !== null) {
      preserved.push({
        type: 'template',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        content: match[0],
      });
    }

    // Preserve dataview queries
    const dataviewRegex = /```dataviewjs?\n([\s\S]*?)\n```/g;
    while ((match = dataviewRegex.exec(content)) !== null) {
      preserved.push({
        type: 'dataview',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        content: match[0],
      });
    }

    // Preserve comment blocks
    const commentRegex = /%%[\s\S]*?%%/g;
    while ((match = commentRegex.exec(content)) !== null) {
      preserved.push({
        type: 'comment',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        content: match[0],
      });
    }

    return preserved.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Detect formatting issues in the content
   */
  private detectFormattingIssues(content: string): FormattingIssue[] {
    const issues: FormattingIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for heading issues
      if (line.match(/^#{7,}/)) {
        issues.push({
          type: 'heading',
          line: lineNumber,
          description: 'Heading level too deep (7+ levels)',
          suggestion: 'Use heading levels 1-6 only',
        });
      }

      // Check for inconsistent heading spacing
      if (line.match(/^#+[^ #]/) && !line.match(/^#+ *$/)) {
        issues.push({
          type: 'heading',
          line: lineNumber,
          description: 'Missing space after heading markers',
          suggestion: 'Add space after # markers: "# Heading"',
        });
      }

      // Check for malformed lists
      if (line.match(/^[*+-]\S/) || line.match(/^\d+\.\S/)) {
        issues.push({
          type: 'list',
          line: lineNumber,
          description: 'Missing space after list marker',
          suggestion: 'Add space after list markers: "- Item" or "1. Item"',
        });
      }

      // Check for excessive whitespace
      if (line.match(/\s{3,}$/)) {
        issues.push({
          type: 'whitespace',
          line: lineNumber,
          description: 'Trailing whitespace',
          suggestion: 'Remove trailing spaces',
        });
      }

      // Check for multiple consecutive blank lines
      if (i > 0 && line.trim() === '' && lines[i - 1].trim() === '') {
        let blankCount = 0;
        for (let j = i; j >= 0 && lines[j].trim() === ''; j--) {
          blankCount++;
        }
        if (blankCount > 2) {
          issues.push({
            type: 'whitespace',
            line: lineNumber,
            description: 'Multiple consecutive blank lines',
            suggestion: 'Use maximum 2 blank lines for spacing',
          });
        }
      }

      // Check for broken wikilinks (missing closing brackets)
      if (line.includes('[[') && !line.includes(']]')) {
        issues.push({
          type: 'link',
          line: lineNumber,
          description: 'Incomplete wikilink (missing closing brackets)',
          suggestion: 'Close wikilink with ]]',
        });
      }
    }

    return issues;
  }

  /**
   * Generate enhancement suggestions based on analysis
   */
  private generateEnhancementSuggestions(
    content: string,
    formattingIssues: FormattingIssue[],
    aiAnalysis: any
  ): EnhancementSuggestion[] {
    const suggestions: EnhancementSuggestion[] = [];

    // Convert formatting issues to suggestions
    for (const issue of formattingIssues) {
      suggestions.push({
        type: 'format',
        priority: this.getIssuePriority(issue.type),
        description: issue.description,
        before: this.getLineContent(content, issue.line),
        after: this.generateFixedLine(content, issue),
      });
    }

    // Add structure suggestions
    if (!content.includes('#') && content.length > 200) {
      suggestions.push({
        type: 'structure',
        priority: 'medium',
        description: 'Consider adding headings to organize content',
        before: content.slice(0, 100) + '...',
        after: '# Main Title\n\n' + content.slice(0, 100) + '...',
      });
    }

    // Add link suggestions from AI analysis
    if (aiAnalysis.relatedNotes?.length > 0) {
      for (const relatedNote of aiAnalysis.relatedNotes.slice(0, 3)) {
        suggestions.push({
          type: 'link',
          priority: 'low',
          description: `Consider linking to "${relatedNote}"`,
          before: relatedNote,
          after: `[[${relatedNote}]]`,
        });
      }
    }

    return suggestions.slice(0, 10); // Limit suggestions
  }

  private getIssuePriority(type: string): 'low' | 'medium' | 'high' {
    switch (type) {
      case 'heading':
      case 'frontmatter':
        return 'high';
      case 'list':
      case 'link':
        return 'medium';
      case 'whitespace':
        return 'low';
      default:
        return 'medium';
    }
  }

  private getLineContent(content: string, lineNumber: number): string {
    const lines = content.split('\n');
    return lines[lineNumber - 1] || '';
  }

  private generateFixedLine(content: string, issue: FormattingIssue): string {
    const line = this.getLineContent(content, issue.line);
    
    switch (issue.type) {
      case 'heading':
        if (line.match(/^#+[^ #]/)) {
          return line.replace(/^(#+)(\S)/, '$1 $2');
        }
        if (line.match(/^#{7,}/)) {
          return line.replace(/^#{7,}/, '######');
        }
        break;
        
      case 'list':
        if (line.match(/^([*+-])\S/)) {
          return line.replace(/^([*+-])(\S)/, '$1 $2');
        }
        if (line.match(/^(\d+\.)\S/)) {
          return line.replace(/^(\d+\.)(\S)/, '$1 $2');
        }
        break;
        
      case 'whitespace':
        return line.replace(/\s+$/, '');
        
      case 'link':
        if (line.includes('[[') && !line.includes(']]')) {
          return line.replace(/\[\[([^\]]+)$/, '[[$1]]');
        }
        break;
    }
    
    return line;
  }

  /**
   * Apply safe automatic fixes that won't break content
   */
  private applySafeFixes(
    content: string,
    suggestions: EnhancementSuggestion[],
    preservedElements: PreservedElement[]
  ): string {
    let enhanced = content;
    
    // Only apply low-risk formatting fixes automatically
    const safeSuggestions = suggestions.filter(s => 
      s.type === 'format' && 
      s.priority !== 'high' &&
      this.isSafeFix(s)
    );

    // Apply fixes in reverse order to maintain string indices
    const sortedSuggestions = safeSuggestions
      .map(s => ({ ...s, lineNumber: this.findLineNumber(content, s.before) }))
      .filter(s => s.lineNumber > 0)
      .sort((a, b) => b.lineNumber - a.lineNumber);

    for (const suggestion of sortedSuggestions) {
      // Check if this change would affect preserved elements
      if (!this.wouldAffectPreservedElements(suggestion, preservedElements)) {
        enhanced = this.applySuggestion(enhanced, suggestion);
      }
    }

    return enhanced;
  }

  private isSafeFix(suggestion: EnhancementSuggestion): boolean {
    // Only allow safe, reversible changes
    const safePatterns = [
      /^[*+-]\S/, // List spacing
      /\s+$/, // Trailing whitespace
      /^#+[^ ]/, // Heading spacing
    ];

    return safePatterns.some(pattern => pattern.test(suggestion.before));
  }

  private findLineNumber(content: string, searchText: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText.trim())) {
        return i + 1;
      }
    }
    return -1;
  }

  private wouldAffectPreservedElements(
    suggestion: EnhancementSuggestion, 
    preservedElements: PreservedElement[]
  ): boolean {
    const lineNumber = this.findLineNumber('dummy', suggestion.before);
    // Simple check - could be more sophisticated
    return preservedElements.some(elem => 
      elem.content.includes(suggestion.before)
    );
  }

  private applySuggestion(content: string, suggestion: EnhancementSuggestion): string {
    return content.replace(suggestion.before, suggestion.after);
  }

  /**
   * Generate formatted content suggestions
   */
  async generateFormattingSuggestions(content: string): Promise<string[]> {
    try {
      const prompt = `Analyze this Obsidian note and suggest 3-5 specific formatting improvements:

CONTENT:
${content.slice(0, 2000)}

Provide concise suggestions that:
- Improve readability and organization
- Follow Markdown best practices
- Respect Obsidian conventions (wikilinks, tags, frontmatter)
- Maintain the original meaning and structure

Format as a simple list of actionable suggestions.`;

      const response = await this.aiProvider.generateResponse(prompt);
      
      // Extract suggestions from response
      const suggestions = response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => line.match(/^[-*]\s/))
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .slice(0, 5);

      return suggestions;
    } catch (error) {
      console.warn('CLIPPY Formatter: Failed to generate AI suggestions:', error);
      return [];
    }
  }

  /**
   * Clean up and standardize markdown formatting
   */
  cleanupMarkdown(content: string): string {
    let cleaned = content;

    // Standardize heading spacing
    cleaned = cleaned.replace(/^(#+)([^ #])/gm, '$1 $2');

    // Standardize list spacing
    cleaned = cleaned.replace(/^([*+-])([^ ])/gm, '$1 $2');
    cleaned = cleaned.replace(/^(\d+\.)([^ ])/gm, '$1 $2');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/[ \t]+$/gm, ''); // Trailing whitespace
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n'); // Max 2 blank lines

    // Standardize emphasis
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '**$1**'); // Bold
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '*$1*'); // Italic

    return cleaned;
  }
}