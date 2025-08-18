/**
 * CLIPPY AI Assistant - Shared Utility Functions
 * Consolidated utility functions used across multiple components
 */

export interface ThinkingTagsOptions {
  showThinkingTags?: boolean;
}

/**
 * Remove or format <thinking> tags from AI responses based on settings.
 */
export function processThinkingTags(content: string, options: ThinkingTagsOptions = {}): string {
  const { showThinkingTags = false } = options;
  
  if (showThinkingTags) {
    // Keep thinking tags but format them nicely
    return content
      .replace(/<thinking>/gi, '\n\n**🤔 AI Thinking Process:**\n> ')
      .replace(/<\/thinking>/gi, '\n\n')
      .replace(/\n\n+/g, '\n\n')
      .trim();
  } else {
    // Remove thinking tags completely
    return content
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();
  }
}

/**
 * Sanitize filename by removing/replacing invalid characters
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .substring(0, 200); // Limit length to 200 characters
}

/**
 * Extract content between specific delimiters
 */
export function extractDelimitedContent(
  content: string, 
  startDelimiter: string, 
  endDelimiter: string
): string[] {
  const regex = new RegExp(`${escapeRegex(startDelimiter)}([\\s\\S]*?)${escapeRegex(endDelimiter)}`, 'gi');
  const matches = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1].trim());
  }
  
  return matches;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace placeholder content in markdown sections
 */
export function replacePlaceholder(content: string, sectionHeader: string, newContent: string): string {
  // Try multiple patterns to find and replace placeholder content
  const patterns = [
    // Pattern 1: Replace placeholder text like "Extracted facts from AI response"
    new RegExp(`(${escapeRegex(sectionHeader)}\\s*\\n)- Extracted [^\\n]+ from AI response`, 'gi'),
    // Pattern 2: Replace empty sections or placeholder markers
    new RegExp(`(${escapeRegex(sectionHeader)}\\s*\\n)\\*\\[.*?\\]\\*`, 's'),
    // Pattern 3: Replace content between section header and next header
    new RegExp(`(${escapeRegex(sectionHeader)}\\s*\\n)[^#]*(?=\\n##|$)`, 's')
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(pattern, `$1${newContent}`);
    }
  }

  // If no pattern matches, try to add content after section header
  const headerIndex = content.indexOf(sectionHeader);
  if (headerIndex !== -1) {
    const afterHeader = headerIndex + sectionHeader.length;
    const nextLineIndex = content.indexOf('\\n', afterHeader);
    
    if (nextLineIndex !== -1) {
      return content.slice(0, nextLineIndex + 1) + newContent + '\\n' + content.slice(nextLineIndex + 1);
    }
  }

  return content;
}

/**
 * Extract frontmatter from markdown content
 */
export function extractFrontmatter(content: string): { frontmatter: string; content: string } {
  const frontmatterMatch = content.match(/^---\\n([\\s\\S]*?)\\n---\\n?/);
  
  if (frontmatterMatch) {
    return {
      frontmatter: frontmatterMatch[1],
      content: content.slice(frontmatterMatch[0].length)
    };
  }
  
  return {
    frontmatter: '',
    content: content
  };
}

/**
 * Replace frontmatter in markdown content
 */
export function replaceFrontmatter(content: string, newFrontmatter: string): string {
  if (content.startsWith('---\\n')) {
    return content.replace(/^---\\n[\\s\\S]*?\\n---/, `---\\n${newFrontmatter}\\n---`);
  } else {
    return `---\\n${newFrontmatter}\\n---\\n\\n${content}`;
  }
}

/**
 * Calculate text similarity using simple word overlap
 */
export function calculateSimpleTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Debounce function to limit rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Create a delay/sleep function
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generate a simple hash for caching purposes
 */
export function generateSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Progress tracking utility
 */
export class ProgressTracker {
  private current: number = 0;
  private total: number = 0;
  private callbacks: ((progress: { current: number; total: number; percentage: number }) => void)[] = [];

  constructor(total: number) {
    this.total = total;
  }

  increment(amount: number = 1): void {
    this.current = Math.min(this.current + amount, this.total);
    this.notifyCallbacks();
  }

  setProgress(current: number): void {
    this.current = Math.min(current, this.total);
    this.notifyCallbacks();
  }

  reset(): void {
    this.current = 0;
    this.notifyCallbacks();
  }

  onProgress(callback: (progress: { current: number; total: number; percentage: number }) => void): void {
    this.callbacks.push(callback);
  }

  private notifyCallbacks(): void {
    const progress = {
      current: this.current,
      total: this.total,
      percentage: this.total > 0 ? (this.current / this.total) * 100 : 0
    };
    
    this.callbacks.forEach(callback => callback(progress));
  }

  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.current,
      total: this.total,
      percentage: this.total > 0 ? (this.current / this.total) * 100 : 0
    };
  }
}