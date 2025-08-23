/**
 * CLIPPY AI Assistant - Voice-Enabled Vault Chat Modal
 * Enhanced chat interface with voice input/output capabilities
 */

import { App, MarkdownView, Notice } from 'obsidian';
import { ClippySettings } from '../types';
import { VaultAgentChatModal } from './vault-agent-chat';
import { VoiceVaultAgent } from '../agents/voice-vault-agent';
import { LocalVoiceIntegration } from '../voice/local-voice-integration';
import { AgentContext } from '../agents/vault-agent';

/**
 * Voice-enabled vault chat modal that supports both text and voice interaction
 */
export class VoiceEnabledVaultChatModal extends VaultAgentChatModal {
  private voiceAgent: VoiceVaultAgent;
  private voiceSystem: LocalVoiceIntegration | null = null;
  private isVoiceMode: boolean = false;
  private isListening: boolean = false;
  
  // Voice UI elements
  private voiceControlsContainer: HTMLElement;
  private voiceButton: HTMLButtonElement;
  private pttButton: HTMLButtonElement;
  private voiceStatusEl: HTMLElement;
  
  constructor(app: App, settings: ClippySettings, context?: Partial<AgentContext>) {
    super(app, settings, context);
    
    // Get voice system from main plugin
    this.voiceSystem = this.getVoiceSystemFromPlugin();
    
    // Create voice-enabled agent
    this.voiceAgent = new VoiceVaultAgent(app, settings, this.voiceSystem || undefined);
  }

  protected createChatInterface(): void {
    super.createChatInterface();
    this.createVoiceControls();
  }

  private createVoiceControls(): void {
    this.voiceControlsContainer = this.contentEl.createDiv('voice-controls-container');
    this.voiceControlsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      margin: 8px 0;
      padding: 12px;
      background: var(--background-secondary);
      border-radius: 8px;
      border: 1px solid var(--background-modifier-border);
    `;
    
    // Voice mode toggle
    this.voiceButton = this.voiceControlsContainer.createEl('button', {
      text: '🎤 Enable Voice',
      cls: 'voice-mode-toggle'
    });
    this.voiceButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-accent);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s;
    `;
    this.voiceButton.addEventListener('click', () => this.toggleVoiceMode());
    
    // Push to talk button (disabled initially)
    this.pttButton = this.voiceControlsContainer.createEl('button', {
      text: '🗣️ Hold to Speak',
      cls: 'push-to-talk-btn'
    });
    this.pttButton.style.cssText = `
      padding: 8px 16px;
      background: var(--background-modifier-border);
      color: var(--text-muted);
      border: none;
      border-radius: 6px;
      cursor: not-allowed;
      font-weight: 600;
      transition: background-color 0.2s;
    `;
    this.pttButton.disabled = true;
    
    // Add mouse event listeners for push-to-talk
    this.pttButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!this.pttButton.disabled) {
        this.startListening();
      }
    });
    
    this.pttButton.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (!this.pttButton.disabled) {
        this.stopListening();
      }
    });
    
    this.pttButton.addEventListener('mouseleave', (e) => {
      e.preventDefault();
      if (!this.pttButton.disabled && this.isListening) {
        this.stopListening();
      }
    });
    
    // Voice status indicator
    this.voiceStatusEl = this.voiceControlsContainer.createDiv('voice-status');
    this.voiceStatusEl.style.cssText = `
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: var(--background-modifier-border);
      color: var(--text-muted);
      min-width: 120px;
      text-align: center;
    `;
    this.voiceStatusEl.textContent = '🔇 Voice Disabled';
    
    // Check if voice system is available
    if (!this.voiceSystem) {
      this.voiceButton.disabled = true;
      this.voiceButton.textContent = '❌ Voice Unavailable';
      this.voiceButton.style.opacity = '0.5';
      this.voiceStatusEl.textContent = '❌ Voice System Not Found';
    }
  }

  private async toggleVoiceMode(): Promise<void> {
    if (!this.voiceSystem) {
      new Notice('Voice system is not available');
      return;
    }

    try {
      if (!this.isVoiceMode) {
        await this.enableVoiceMode();
      } else {
        await this.disableVoiceMode();
      }
    } catch (error) {
      console.error('Voice mode toggle error:', error);
      new Notice(`Voice mode error: ${error.message}`);
    }
  }

  private async enableVoiceMode(): Promise<void> {
    if (!this.voiceSystem) return;
    
    try {
      console.log('VoiceChat: Enabling voice mode...');
      
      // Activate voice system if not already active
      if (!this.voiceSystem.isActive) {
        await this.voiceSystem.toggleVoice();
      }
      
      this.isVoiceMode = true;
      
      // Update UI
      this.voiceButton.textContent = '🔇 Disable Voice';
      this.voiceButton.style.background = 'var(--text-error)';
      
      this.pttButton.disabled = false;
      this.pttButton.style.cssText = `
        padding: 8px 16px;
        background: var(--interactive-accent-hover);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
      `;
      
      this.voiceStatusEl.textContent = '🎤 Voice Ready';
      this.voiceStatusEl.style.cssText = `
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        background: var(--interactive-accent);
        color: white;
        min-width: 120px;
        text-align: center;
      `;
      
      // Speak welcome message
      const welcomeMessage = this.voiceAgent.getVoiceWelcomeMessage();
      await this.voiceAgent.speak(welcomeMessage);
      
      // Add welcome message to chat
      this.addMessage('assistant', '🎤 **Voice mode enabled!**\n\n' +
        'You can now:\n' +
        '- Hold "🗣️ Hold to Speak" and speak your commands\n' +
        '- Continue typing if you prefer\n' +
        '- I\'ll speak my responses back to you\n' +
        '- All vault operations work with voice!\n\n' +
        '*Try saying: "Create a new note called test" or "List all my notes"*');
      
      console.log('VoiceChat: Voice mode enabled successfully');
      
    } catch (error) {
      console.error('VoiceChat: Failed to enable voice mode:', error);
      new Notice(`Failed to enable voice mode: ${error.message}`);
      this.isVoiceMode = false;
    }
  }

  private async disableVoiceMode(): Promise<void> {
    console.log('VoiceChat: Disabling voice mode...');
    
    this.isVoiceMode = false;
    this.isListening = false;
    
    // Update UI
    this.voiceButton.textContent = '🎤 Enable Voice';
    this.voiceButton.style.background = 'var(--interactive-accent)';
    
    this.pttButton.disabled = true;
    this.pttButton.style.cssText = `
      padding: 8px 16px;
      background: var(--background-modifier-border);
      color: var(--text-muted);
      border: none;
      border-radius: 6px;
      cursor: not-allowed;
      font-weight: 600;
    `;
    
    this.voiceStatusEl.textContent = '🔇 Voice Disabled';
    this.voiceStatusEl.style.cssText = `
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: var(--background-modifier-border);
      color: var(--text-muted);
      min-width: 120px;
      text-align: center;
    `;
    
    // Speak goodbye message
    if (this.voiceAgent) {
      const goodbyeMessage = this.voiceAgent.getVoiceGoodbyeMessage();
      await this.voiceAgent.speak(goodbyeMessage);
    }
    
    // Add message to chat
    this.addMessage('assistant', '🔇 **Voice mode disabled.**\n\nYou can continue using the text interface. Type your commands below or click "🎤 Enable Voice" to use voice again.');
    
    console.log('VoiceChat: Voice mode disabled');
  }

  private async startListening(): Promise<void> {
    if (!this.isVoiceMode || this.isListening || !this.voiceAgent) return;
    
    try {
      console.log('VoiceChat: Starting to listen...');
      this.isListening = true;
      
      // Update UI to show listening state
      this.pttButton.textContent = '🔴 Listening...';
      this.pttButton.style.background = 'var(--text-error)';
      this.voiceStatusEl.textContent = '🎧 Listening...';
      this.voiceStatusEl.style.background = 'var(--text-warning)';
      
      // Listen for voice input (5 second timeout)
      const transcript = await this.voiceAgent.listen(5);
      
      if (transcript && transcript.trim()) {
        console.log('VoiceChat: Received transcript:', transcript);
        
        // Add user message to chat
        this.addMessage('user', `🎤 "${transcript}"`);
        
        // Process the voice command
        await this.processVoiceMessage(transcript);
      } else {
        console.log('VoiceChat: No speech detected');
        this.voiceStatusEl.textContent = '❌ No speech detected';
        this.voiceStatusEl.style.background = 'var(--text-error)';
        
        // Reset status after 2 seconds
        setTimeout(() => {
          if (this.isVoiceMode && !this.isListening) {
            this.voiceStatusEl.textContent = '🎤 Voice Ready';
            this.voiceStatusEl.style.background = 'var(--interactive-accent)';
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('VoiceChat: Voice input error:', error);
      new Notice(`Voice input error: ${error.message}`);
      
      this.voiceStatusEl.textContent = '❌ Voice Error';
      this.voiceStatusEl.style.background = 'var(--text-error)';
    } finally {
      this.isListening = false;
      this.pttButton.textContent = '🗣️ Hold to Speak';
      this.pttButton.style.background = 'var(--interactive-accent-hover)';
      
      // Reset status if still in voice mode
      if (this.isVoiceMode) {
        setTimeout(() => {
          this.voiceStatusEl.textContent = '🎤 Voice Ready';
          this.voiceStatusEl.style.background = 'var(--interactive-accent)';
        }, 1000);
      }
    }
  }

  private async stopListening(): Promise<void> {
    // The voice system handles stopping automatically after timeout
    // This is mainly for UI feedback
    console.log('VoiceChat: Stop listening requested');
  }

  private async processVoiceMessage(transcript: string): Promise<void> {
    if (!this.voiceAgent) return;
    
    this.setProcessing(true);
    
    try {
      console.log('VoiceChat: Processing voice message:', transcript);
      
      // Update status
      this.voiceStatusEl.textContent = '🤖 Processing...';
      this.voiceStatusEl.style.background = 'var(--text-warning)';
      
      // Process through voice agent
      const result = await this.voiceAgent.processVoiceMessage(transcript, this.context);
      
      // Add text response to chat
      this.addMessage('assistant', result.textResponse);
      
      // Speak the response if enabled
      if (result.shouldSpeak && this.isVoiceMode) {
        this.voiceStatusEl.textContent = '🗣️ Speaking...';
        this.voiceStatusEl.style.background = 'var(--interactive-accent-hover)';
        
        const speechSuccess = await this.voiceAgent.speak(result.spokenResponse);
        
        if (!speechSuccess) {
          console.warn('VoiceChat: Speech output failed');
        }
      }
      
    } catch (error) {
      console.error('VoiceChat: Voice message processing error:', error);
      this.addMessage('assistant', `❌ Sorry, I encountered an error processing your voice command: ${error.message}`);
      
      if (this.isVoiceMode) {
        await this.voiceAgent.speak('Sorry, I encountered an error processing your voice command.');
      }
    } finally {
      this.setProcessing(false);
      
      // Reset status
      if (this.isVoiceMode) {
        this.voiceStatusEl.textContent = '🎤 Voice Ready';
        this.voiceStatusEl.style.background = 'var(--interactive-accent)';
      }
    }
  }

  // Override sendMessage to support voice output when voice mode is enabled
  protected async sendMessage(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message || this.isProcessing) return;

    this.addMessage('user', message);
    this.inputEl.value = '';
    this.setProcessing(true);

    try {
      let result;
      
      if (this.isVoiceMode && this.voiceAgent) {
        // Use voice agent with speech output
        result = await this.voiceAgent.processTextMessage(message, this.context, true);
        
        // Add text response
        this.addMessage('assistant', result.textResponse);
        
        // Speak response if enabled
        if (result.shouldSpeak) {
          this.voiceStatusEl.textContent = '🗣️ Speaking...';
          this.voiceStatusEl.style.background = 'var(--interactive-accent-hover)';
          
          await this.voiceAgent.speak(result.spokenResponse);
          
          this.voiceStatusEl.textContent = '🎤 Voice Ready';
          this.voiceStatusEl.style.background = 'var(--interactive-accent)';
        }
      } else {
        // Use regular vault agent (text only)
        const response = await this.vaultAgent.processMessage(message, this.context);
        this.addMessage('assistant', response);
      }

    } catch (error) {
      console.error('VoiceChat: Message processing error:', error);
      this.addMessage('assistant', `❌ Sorry, I encountered an error: ${error.message}`);
      
      if (this.isVoiceMode && this.voiceAgent) {
        await this.voiceAgent.speak('Sorry, I encountered an error.');
      }
    } finally {
      this.setProcessing(false);
      this.inputEl.focus();
    }
  }

  private getVoiceSystemFromPlugin(): LocalVoiceIntegration | null {
    try {
      // Access voice system from main plugin
      const plugin = (this.app as any).plugins.plugins['clippy-ai-assistant'];
      if (plugin && plugin.voiceSystemV2) {
        console.log('VoiceChat: Found voice system from plugin');
        return plugin.voiceSystemV2;
      } else {
        console.warn('VoiceChat: Voice system not found in plugin');
        return null;
      }
    } catch (error) {
      console.error('VoiceChat: Error accessing voice system:', error);
      return null;
    }
  }

  // Override onClose to clean up voice mode
  onClose(): void {
    if (this.isVoiceMode) {
      this.disableVoiceMode();
    }
    super.onClose();
  }
}