/**
 * CLIPPY AI Assistant - Voice-Enabled Vault Agent
 * Extends VaultAgent with voice input/output capabilities
 */

import { App } from 'obsidian';
import { ClippySettings } from '../types';
import { VaultAgent, AgentContext } from './vault-agent';
import { LocalVoiceIntegration } from '../voice-v2/local-voice-integration';

export interface VoiceResponse {
  textResponse: string;
  spokenResponse: string;
  shouldSpeak: boolean;
}

/**
 * Voice-enabled vault agent that processes both text and voice input
 * and can respond with both text and speech
 */
export class VoiceVaultAgent extends VaultAgent {
  private voiceSystem: LocalVoiceIntegration | null = null;

  constructor(app: App, settings: ClippySettings, voiceSystem?: LocalVoiceIntegration) {
    super(app, settings);
    this.voiceSystem = voiceSystem || null;
  }

  /**
   * Set the voice system reference
   */
  setVoiceSystem(voiceSystem: LocalVoiceIntegration): void {
    this.voiceSystem = voiceSystem;
  }

  /**
   * Process voice input and return both text and speech responses
   */
  async processVoiceMessage(transcript: string, context: AgentContext): Promise<VoiceResponse> {
    try {
      // Process through normal vault agent
      const textResponse = await this.processMessage(transcript, context);
      
      // Format for speech output
      const spokenResponse = this.formatForSpeech(textResponse);
      
      return {
        textResponse,
        spokenResponse,
        shouldSpeak: true
      };
    } catch (error) {
      const errorMessage = `Sorry, I encountered an error processing your voice command: ${error.message}`;
      return {
        textResponse: errorMessage,
        spokenResponse: "Sorry, I encountered an error processing your voice command.",
        shouldSpeak: true
      };
    }
  }

  /**
   * Process text message with optional voice output
   */
  async processTextMessage(message: string, context: AgentContext, withVoice: boolean = false): Promise<VoiceResponse> {
    try {
      const textResponse = await this.processMessage(message, context);
      
      if (withVoice) {
        const spokenResponse = this.formatForSpeech(textResponse);
        return {
          textResponse,
          spokenResponse,
          shouldSpeak: true
        };
      } else {
        return {
          textResponse,
          spokenResponse: '',
          shouldSpeak: false
        };
      }
    } catch (error) {
      const errorMessage = `Sorry, I encountered an error: ${error.message}`;
      return {
        textResponse: errorMessage,
        spokenResponse: withVoice ? "Sorry, I encountered an error." : '',
        shouldSpeak: withVoice
      };
    }
  }

  /**
   * Speak a response using the voice system
   */
  async speak(text: string): Promise<boolean> {
    if (!this.voiceSystem) {
      console.warn('VoiceVaultAgent: No voice system available');
      return false;
    }

    try {
      return await this.voiceSystem.speak(text);
    } catch (error) {
      console.error('VoiceVaultAgent: Speech error:', error);
      return false;
    }
  }

  /**
   * Listen for voice input using the voice system
   */
  async listen(duration: number = 5): Promise<string | null> {
    if (!this.voiceSystem) {
      console.warn('VoiceVaultAgent: No voice system available');
      return null;
    }

    try {
      return await this.voiceSystem.listen(duration);
    } catch (error) {
      console.error('VoiceVaultAgent: Listen error:', error);
      return null;
    }
  }

  /**
   * Check if voice system is available and active
   */
  isVoiceAvailable(): boolean {
    return this.voiceSystem !== null;
  }

  /**
   * Check if voice system is currently active
   */
  isVoiceActive(): boolean {
    return this.voiceSystem?.isActive || false;
  }

  /**
   * Convert technical text responses to natural speech
   */
  protected formatForSpeech(text: string): string {
    // Remove markdown formatting
    let speech = text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/`(.*?)`/g, '$1')       // Inline code
      .replace(/#{1,6}\s*/g, '')       // Headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Links (keep text only)
      .replace(/!\[.*?\]\(.*?\)/g, 'image');  // Images

    // Replace tool execution indicators with natural language
    speech = speech
      .replace(/✅ Executed (\w+):/g, 'I completed the $1 operation.')
      .replace(/❌ Error executing (\w+):/g, 'There was an error with the $1 operation.')
      .replace(/TOOL_CALL:\s*\w+\s*\([^)]*\)/g, '')  // Remove tool call syntax
      .replace(/```[\s\S]*?```/g, 'Here are the results.')  // Code blocks
      .replace(/^\s*[-*+]\s+/gm, '')  // List markers
      .replace(/\n{2,}/g, '. ')       // Multiple newlines to periods
      .replace(/\n/g, ' ')            // Single newlines to spaces
      .trim();

    // Convert specific vault operation responses to natural speech
    speech = speech
      .replace(/Successfully created note: (.+)/, 'I created the note $1 for you.')
      .replace(/Successfully deleted note: (.+)/, 'I deleted the note $1.')
      .replace(/Successfully updated note: (.+)/, 'I updated the note $1.')
      .replace(/Successfully renamed (.+) to (.+)/, 'I renamed $1 to $2.')
      .replace(/Successfully created folder: (.+)/, 'I created the folder $1.')
      .replace(/Found (\d+) notes containing "(.+)"/, 'I found $1 notes containing $2.')
      .replace(/Found (\d+) notes:/, 'I found $1 notes.')
      .replace(/Found (\d+) notes with tag #(.+)/, 'I found $1 notes tagged with $2.')
      .replace(/No notes found/, 'I didn\'t find any notes matching your criteria.')
      .replace(/Content of (.+):/, 'Here\'s the content of $1.')
      .replace(/Metadata for (.+):/, 'Here\'s the metadata for $1.')
      .replace(/AI Analysis of (.+):/, 'Here\'s my analysis of $1.');

    // Clean up any remaining technical formatting
    speech = speech
      .replace(/\s+/g, ' ')           // Multiple spaces to single space
      .replace(/[{}]/g, '')           // Remove braces
      .replace(/["']/g, '')           // Remove quotes
      .trim();

    // Limit length for reasonable speech duration (about 30 seconds at normal pace)
    if (speech.length > 400) {
      speech = speech.substring(0, 400) + '... I can provide more details if you ask.';
    }

    // Ensure it ends properly
    if (speech && !speech.match(/[.!?]$/)) {
      speech += '.';
    }

    return speech || 'I completed your request.';
  }

  /**
   * Format tool execution results for speech
   */
  private formatToolResultForSpeech(toolName: string, result: any): string {
    const toolDescriptions: Record<string, string> = {
      'create_note': 'note creation',
      'read_note': 'note reading',
      'update_note': 'note update',
      'delete_note': 'note deletion',
      'rename_note': 'note renaming',
      'search_notes': 'note search',
      'list_notes': 'note listing',
      'find_note_by_tag': 'tag search',
      'create_folder': 'folder creation',
      'list_folders': 'folder listing',
      'create_from_template': 'template creation',
      'get_note_metadata': 'metadata retrieval',
      'add_frontmatter': 'frontmatter update',
      'find_backlinks': 'backlink search',
      'find_outgoing_links': 'link search',
      'get_vault_stats': 'vault analysis',
      'analyze_note': 'note analysis'
    };

    const operation = toolDescriptions[toolName] || toolName.replace('_', ' ');
    
    if (typeof result === 'string') {
      if (result.toLowerCase().includes('success')) {
        return `I completed the ${operation} successfully.`;
      } else if (result.toLowerCase().includes('error') || result.toLowerCase().includes('failed')) {
        return `There was an issue with the ${operation}.`;
      } else {
        return `I finished the ${operation}.`;
      }
    }
    
    return `I completed the ${operation}.`;
  }

  /**
   * Create a welcome message for voice mode
   */
  getVoiceWelcomeMessage(): string {
    return `Voice mode is now active. I can help you manage your vault with voice commands. Try saying things like "create a new note called meeting notes" or "list all my notes". What would you like me to do?`;
  }

  /**
   * Create a goodbye message for voice mode
   */
  getVoiceGoodbyeMessage(): string {
    return `Voice mode has been disabled. You can continue using the text interface. Let me know if you need anything else.`;
  }
}