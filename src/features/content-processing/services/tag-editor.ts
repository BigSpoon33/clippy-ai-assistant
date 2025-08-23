/**
 * CLIPPY AI Assistant - Tag Editor Service
 * Handles tag manipulation in note frontmatter
 */

import { Editor } from 'obsidian';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

export class TagEditor {
  
  /**
   * Add tags to a note's frontmatter
   */
  addTagsToNote(editor: Editor, tags: string[]): void {
    ClippyErrorBoundaries.validationOperation(
      () => {
        const content = editor.getValue();
        
        // Check if note has frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        
        if (frontmatterMatch) {
          // Note has frontmatter, add tags to it
          this.addTagsToExistingFrontmatter(editor, content, frontmatterMatch, tags);
        } else {
          // Note doesn't have frontmatter, add it with YAML list format
          this.addTagsWithNewFrontmatter(editor, content, tags);
        }
      },
      'add tags to note',
      { tags, contentLength: editor.getValue().length },
      {
        fallback: () => {
          console.warn('Failed to add tags to note, operation skipped');
        },
        showUserNotice: true
      }
    );
  }

  /**
   * Add tags to existing frontmatter
   */
  private addTagsToExistingFrontmatter(
    editor: Editor, 
    content: string, 
    frontmatterMatch: RegExpMatchArray, 
    tags: string[]
  ): void {
    const frontmatterContent = frontmatterMatch[1];
    const remainingContent = content.substring(frontmatterMatch[0].length);
    
    // Parse existing frontmatter
    const lines = frontmatterContent.split('\n');
    let tagsStartIndex = -1;
    let tagsEndIndex = -1;
    let existingTags: string[] = [];
    
    // Find existing tags section (could be multiple lines)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('tags:')) {
        tagsStartIndex = i;
        const tagsPart = line.substring(5).trim();
        
        if (tagsPart.startsWith('[') && tagsPart.endsWith(']')) {
          // Array format: tags: [tag1, tag2] - convert to YAML list
          existingTags = tagsPart.slice(1, -1)
            .split(',')
            .map(t => t.trim().replace(/['"]/g, ''))
            .filter(t => t.length > 0);
          tagsEndIndex = i;
        } else if (tagsPart.length > 0) {
          // Single tag on same line: tags: tag1
          existingTags = [tagsPart.replace(/['"]/g, '')];
          tagsEndIndex = i;
        } else {
          // Multi-line YAML list format
          tagsEndIndex = i;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine.startsWith('- ')) {
              existingTags.push(nextLine.substring(2).trim());
              tagsEndIndex = j;
            } else if (nextLine.length > 0 && !nextLine.startsWith(' ')) {
              // End of tags section
              break;
            }
          }
        }
        break;
      }
    }
    
    // Merge new tags with existing ones
    const allTags = [...new Set([...existingTags, ...tags])];
    
    // Create new tags section in YAML list format
    const newTagsLines = ['tags:'];
    allTags.forEach(tag => {
      newTagsLines.push(`  - ${tag}`);
    });
    
    // Replace the old tags section
    const newLines = [
      ...lines.slice(0, tagsStartIndex),
      ...newTagsLines,
      ...(tagsEndIndex >= 0 ? lines.slice(tagsEndIndex + 1) : [])
    ];
    
    // If no existing tags section, add it
    if (tagsStartIndex === -1) {
      newLines.push(...newTagsLines);
    }
    
    const newFrontmatter = `---\n${newLines.join('\n')}\n---\n`;
    const newContent = newFrontmatter + remainingContent;
    editor.setValue(newContent);
  }

  /**
   * Add tags with new frontmatter
   */
  private addTagsWithNewFrontmatter(editor: Editor, content: string, tags: string[]): void {
    const frontmatter = `---\ntags:\n${tags.map(tag => `  - ${tag}`).join('\n')}\n---\n\n`;
    const newContent = frontmatter + content;
    editor.setValue(newContent);
  }

  /**
   * Remove tags from note frontmatter
   */
  removeTagsFromNote(editor: Editor, tagsToRemove: string[]): void {
    ClippyErrorBoundaries.validationOperation(
      () => {
        const content = editor.getValue();
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        
        if (!frontmatterMatch) {
          return; // No frontmatter, nothing to remove
        }

        const frontmatterContent = frontmatterMatch[1];
        const remainingContent = content.substring(frontmatterMatch[0].length);
        const lines = frontmatterContent.split('\n');
        
        // Find and modify tags section
        const newLines = lines.filter((line, index) => {
          const trimmedLine = line.trim();
          
          // Skip tags section header
          if (trimmedLine.startsWith('tags:')) {
            return true;
          }
          
          // Check if this is a tag line to remove
          if (trimmedLine.startsWith('- ')) {
            const tag = trimmedLine.substring(2).trim();
            return !tagsToRemove.includes(tag);
          }
          
          return true;
        });
        
        const newFrontmatter = `---\n${newLines.join('\n')}\n---\n`;
        const newContent = newFrontmatter + remainingContent;
        editor.setValue(newContent);
      },
      'remove tags from note',
      { tagsToRemove },
      {
        fallback: () => {
          console.warn('Failed to remove tags from note, operation skipped');
        },
        showUserNotice: true
      }
    );
  }

  /**
   * Get existing tags from note content
   */
  getExistingTags(content: string): string[] {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        
        if (!frontmatterMatch) {
          return [];
        }

        const frontmatterContent = frontmatterMatch[1];
        const lines = frontmatterContent.split('\n');
        const tags: string[] = [];
        
        let inTagsSection = false;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('tags:')) {
            inTagsSection = true;
            
            // Check for inline array format
            const tagsPart = trimmedLine.substring(5).trim();
            if (tagsPart.startsWith('[') && tagsPart.endsWith(']')) {
              const inlineTags = tagsPart.slice(1, -1)
                .split(',')
                .map(t => t.trim().replace(/['"]/g, ''))
                .filter(t => t.length > 0);
              tags.push(...inlineTags);
              inTagsSection = false;
            } else if (tagsPart.length > 0) {
              tags.push(tagsPart.replace(/['"]/g, ''));
              inTagsSection = false;
            }
          } else if (inTagsSection && trimmedLine.startsWith('- ')) {
            tags.push(trimmedLine.substring(2).trim());
          } else if (inTagsSection && trimmedLine.length > 0 && !trimmedLine.startsWith(' ')) {
            inTagsSection = false;
          }
        }
        
        return [...new Set(tags)]; // Remove duplicates
      },
      'extract existing tags',
      { contentLength: content.length },
      {
        fallback: () => [],
        showUserNotice: false
      }
    );
  }

  /**
   * Validate tag format
   */
  validateTags(tags: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    tags.forEach(tag => {
      if (this.isValidTag(tag)) {
        valid.push(tag);
      } else {
        invalid.push(tag);
      }
    });
    
    return { valid, invalid };
  }

  /**
   * Check if a tag is valid
   */
  private isValidTag(tag: string): boolean {
    // Basic tag validation
    return tag.length > 0 && 
           tag.length <= 50 && 
           /^[a-zA-Z0-9-_]+$/.test(tag) &&
           !tag.startsWith('-') &&
           !tag.endsWith('-');
  }
}