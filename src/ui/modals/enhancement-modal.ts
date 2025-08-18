/**
 * CLIPPY AI Assistant - Enhancement Modal
 * Modal for AI-powered content enhancement with custom instructions
 */

import { Modal, App, ButtonComponent } from 'obsidian';

export interface ContentEnhancer {
  enhanceContent(content: string, instructions: string): Promise<string>;
}

export class EnhancementModal extends Modal {
  private originalContent: string;
  private enhancedContent: string = '';
  private onAccept: (content: string) => void;
  private contentEnhancer: ContentEnhancer;

  constructor(
    app: App, 
    originalContent: string, 
    onAccept: (content: string) => void, 
    contentEnhancer: ContentEnhancer
  ) {
    super(app);
    this.originalContent = originalContent;
    this.onAccept = onAccept;
    this.contentEnhancer = contentEnhancer;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: '🤖 CLIPPY Note Enhancement' });
    
    // Show original content
    contentEl.createEl('h3', { text: 'Original Content:' });
    const originalDiv = contentEl.createDiv('clippy-original');
    originalDiv.createEl('pre', { text: this.originalContent.substring(0, 200) + '...' });
    
    // Custom instructions area
    contentEl.createEl('h3', { text: 'Custom Instructions (Optional):' });
    const instructionsContainer = contentEl.createDiv('clippy-instructions');
    const instructionsTextarea = instructionsContainer.createEl('textarea', {
      placeholder: 'Add specific instructions for the AI (e.g., "Add more detail to the methodology section", "Make it more formal", "Focus on clarity for beginners")...',
      attr: {
        rows: '3',
        style: 'width: 100%; resize: vertical; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);'
      }
    });
    
    // Enhanced content area
    contentEl.createEl('h3', { text: 'Enhanced Content:' });
    const enhancedDiv = contentEl.createDiv('clippy-enhanced');
    const enhancedPre = enhancedDiv.createEl('pre', { text: 'Add custom instructions above and click "Enhance" to generate improved content...' });
    
    // Button container
    const buttonContainer = contentEl.createDiv('clippy-buttons');
    
    // Enhance button
    const enhanceBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✨ Enhance with AI')
      .setCta()
      .onClick(async () => {
        enhanceBtn.setDisabled(true);
        enhanceBtn.setButtonText('🤔 Thinking...');
        
        try {
          const customInstructions = instructionsTextarea.value.trim();
          this.enhancedContent = await this.contentEnhancer.enhanceContent(this.originalContent, customInstructions);
          enhancedPre.textContent = this.enhancedContent;
          
          // Show accept/reject buttons
          acceptBtn.setDisabled(false);
          enhanceBtn.setButtonText('✨ Enhance Again');
        } catch (error) {
          enhancedPre.textContent = `Error: ${error.message}`;
          enhanceBtn.setButtonText('✨ Try Again');
        }
        
        enhanceBtn.setDisabled(false);
      });
    
    // Accept button
    const acceptBtn = new ButtonComponent(buttonContainer)
      .setButtonText('✅ Accept')
      .setDisabled(true)
      .onClick(() => {
        this.onAccept(this.enhancedContent);
        this.close();
      });
    
    // Cancel button  
    new ButtonComponent(buttonContainer)
      .setButtonText('❌ Cancel')
      .onClick(() => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}