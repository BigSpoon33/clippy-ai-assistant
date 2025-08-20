# Voice-Enabled Vault Agent Integration Plan

## 🎯 **Goal: Unified AI Interface**

Transform the Vault Agent into the single, comprehensive AI interface for CLIPPY that seamlessly combines:
- **Text chat interface** (existing)
- **Voice input/output** (integrate with existing voice system)
- **All vault operations** (existing 16 tools)
- **Existing CLIPPY features** (enhancement, tagging, research, etc.)

## 🏗️ **Current Architecture Analysis**

### **Existing Voice System (`LocalVoiceIntegration`)**
- ✅ **Whisper STT** (local speech-to-text)
- ✅ **Piper TTS** (high-quality text-to-speech)
- ✅ **Wake word detection** ("Hey Clippy")
- ✅ **Audio recording/playback**
- ❌ **Limited command processing** (only basic pattern matching)

### **Existing Vault Agent**
- ✅ **16 comprehensive vault tools**
- ✅ **Natural language processing**
- ✅ **Chat interface**
- ✅ **Context awareness**
- ❌ **No voice integration**

### **Integration Opportunities**
1. **Replace simple voice commands** with vault agent processing
2. **Add voice I/O to vault agent chat**
3. **Unify all AI interactions** through single agent
4. **Maintain existing voice infrastructure**

## 📋 **Integration Architecture**

### **Phase 1: Voice-Enabled Vault Agent**

```typescript
// Enhanced VaultAgentChatModal with voice capabilities
export class VoiceEnabledVaultAgent extends VaultAgentChatModal {
  private voiceSystem: LocalVoiceIntegration;
  private isVoiceMode: boolean = false;
  private voiceButton: HTMLButtonElement;
  
  constructor(app: App, settings: ClippySettings, context?: AgentContext) {
    super(app, settings, context);
    this.voiceSystem = this.getVoiceSystem();
  }
  
  // Voice integration methods
  async enableVoiceMode(): Promise<void>;
  async disableVoiceMode(): Promise<void>;
  async processVoiceInput(transcript: string): Promise<void>;
  async speakResponse(text: string): Promise<void>;
}
```

### **Phase 2: Unified Command Processing**

```typescript
// Replace LocalVoiceIntegration.processVoiceCommand()
export class UnifiedVaultAgent extends VaultAgent {
  private voiceSystem: LocalVoiceIntegration;
  
  async processMessage(
    message: string, 
    context: AgentContext,
    inputMode: 'text' | 'voice' = 'text'
  ): Promise<string> {
    // Process through existing vault agent logic
    const response = await super.processMessage(message, context);
    
    // If voice mode, also speak the response
    if (inputMode === 'voice') {
      await this.voiceSystem.speak(this.formatForSpeech(response));
    }
    
    return response;
  }
  
  private formatForSpeech(text: string): string {
    // Convert markdown and technical output to speech-friendly format
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown
      .replace(/```[\s\S]*?```/g, 'code block')  // Replace code blocks
      .replace(/#{1,6}\s*/g, '')  // Remove heading markers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Extract link text
      .substring(0, 500);  // Limit length for TTS
  }
}
```

### **Phase 3: Chat Interface Enhancement**

```typescript
// Add voice controls to existing chat UI
private createVoiceControls(): void {
  const voiceContainer = this.contentEl.createDiv('voice-controls');
  
  // Voice toggle button
  this.voiceButton = voiceContainer.createEl('button', {
    text: '🎤 Voice Mode',
    cls: 'voice-toggle-btn'
  });
  
  // Push-to-talk button
  const pttButton = voiceContainer.createEl('button', {
    text: '🗣️ Push to Talk',
    cls: 'push-to-talk-btn'
  });
  
  // Voice status indicator
  const voiceStatus = voiceContainer.createDiv('voice-status');
}
```

## 🔧 **Implementation Strategy**

### **Step 1: Extend VaultAgent with Voice Methods**

```typescript
// src/agents/voice-vault-agent.ts
export class VoiceVaultAgent extends VaultAgent {
  private voiceSystem: LocalVoiceIntegration | null = null;
  
  constructor(app: App, settings: ClippySettings, voiceSystem?: LocalVoiceIntegration) {
    super(app, settings);
    this.voiceSystem = voiceSystem;
  }
  
  async processVoiceMessage(transcript: string, context: AgentContext): Promise<{
    textResponse: string;
    spokenResponse: string;
    shouldSpeak: boolean;
  }> {
    // Process through normal vault agent
    const textResponse = await this.processMessage(transcript, context);
    
    // Format for speech
    const spokenResponse = this.formatForSpeech(textResponse);
    
    return {
      textResponse,
      spokenResponse,
      shouldSpeak: true
    };
  }
  
  private formatForSpeech(text: string): string {
    // Convert technical responses to natural speech
    return text
      .replace(/✅ Executed (\w+):/g, 'I completed the $1 operation.')
      .replace(/❌ Error executing (\w+):/g, 'There was an error with the $1 operation.')
      .replace(/TOOL_CALL:.*$/gm, '')  // Remove tool call syntax
      .replace(/```[\s\S]*?```/g, 'Here are the results.')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\n{2,}/g, '. ')
      .substring(0, 300);  // Reasonable length for TTS
  }
}
```

### **Step 2: Enhanced Chat Modal with Voice**

```typescript
// src/ui/voice-vault-chat.ts
export class VoiceEnabledVaultChatModal extends VaultAgentChatModal {
  private voiceAgent: VoiceVaultAgent;
  private voiceSystem: LocalVoiceIntegration;
  private isVoiceMode: boolean = false;
  private isListening: boolean = false;
  
  private voiceButton: HTMLButtonElement;
  private pttButton: HTMLButtonElement;
  private voiceStatusEl: HTMLElement;
  
  constructor(app: App, settings: ClippySettings, context?: AgentContext) {
    super(app, settings, context);
    
    // Get voice system from main plugin
    this.voiceSystem = this.getVoiceSystemFromPlugin();
    this.voiceAgent = new VoiceVaultAgent(app, settings, this.voiceSystem);
  }
  
  protected createChatInterface(): void {
    super.createChatInterface();
    this.createVoiceControls();
  }
  
  private createVoiceControls(): void {
    const voiceContainer = this.contentEl.createDiv('voice-controls-container');
    voiceContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      margin: 8px 0;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 6px;
      border: 1px solid var(--background-modifier-border);
    `;
    
    // Voice mode toggle
    this.voiceButton = voiceContainer.createEl('button', {
      text: '🎤 Enable Voice',
      cls: 'voice-mode-toggle'
    });
    this.voiceButton.addEventListener('click', () => this.toggleVoiceMode());
    
    // Push to talk button (disabled initially)
    this.pttButton = voiceContainer.createEl('button', {
      text: '🗣️ Hold to Speak',
      cls: 'push-to-talk-btn'
    });
    this.pttButton.disabled = true;
    this.pttButton.addEventListener('mousedown', () => this.startListening());
    this.pttButton.addEventListener('mouseup', () => this.stopListening());
    this.pttButton.addEventListener('mouseleave', () => this.stopListening());
    
    // Voice status
    this.voiceStatusEl = voiceContainer.createDiv('voice-status');
    this.voiceStatusEl.textContent = '🔇 Voice Disabled';
    this.voiceStatusEl.style.cssText = `
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: var(--background-modifier-border);
    `;
  }
  
  private async toggleVoiceMode(): Promise<void> {
    if (!this.isVoiceMode) {
      await this.enableVoiceMode();
    } else {
      await this.disableVoiceMode();
    }
  }
  
  private async enableVoiceMode(): Promise<void> {
    try {
      if (!this.voiceSystem.isActive) {
        await this.voiceSystem.toggleVoice();
      }
      
      this.isVoiceMode = true;
      this.voiceButton.textContent = '🔇 Disable Voice';
      this.pttButton.disabled = false;
      this.voiceStatusEl.textContent = '🎤 Voice Ready';
      this.voiceStatusEl.style.backgroundColor = 'var(--interactive-accent)';
      
      await this.voiceSystem.speak('Voice mode enabled. You can now use push to talk.');
      this.addMessage('assistant', '🎤 **Voice mode enabled!** You can now:\n- Hold "🗣️ Hold to Speak" and talk\n- I\'ll speak my responses back to you\n- All vault operations work with voice commands');
      
    } catch (error) {
      new Notice(`Failed to enable voice mode: ${error.message}`);
    }
  }
  
  private async disableVoiceMode(): Promise<void> {
    this.isVoiceMode = false;
    this.voiceButton.textContent = '🎤 Enable Voice';
    this.pttButton.disabled = true;
    this.voiceStatusEl.textContent = '🔇 Voice Disabled';
    this.voiceStatusEl.style.backgroundColor = 'var(--background-modifier-border)';
    
    this.addMessage('assistant', '🔇 Voice mode disabled. You can continue using text chat.');
  }
  
  private async startListening(): Promise<void> {
    if (!this.isVoiceMode || this.isListening) return;
    
    try {
      this.isListening = true;
      this.pttButton.textContent = '🔴 Listening...';
      this.voiceStatusEl.textContent = '🎧 Listening...';
      
      // Use voice system to listen
      const transcript = await this.voiceSystem.listen(5);
      
      if (transcript && transcript.trim()) {
        this.addMessage('user', `🎤 ${transcript}`);
        await this.processVoiceMessage(transcript);
      } else {
        this.voiceStatusEl.textContent = '❌ No speech detected';
        setTimeout(() => {
          if (this.isVoiceMode) {
            this.voiceStatusEl.textContent = '🎤 Voice Ready';
          }
        }, 2000);
      }
      
    } catch (error) {
      new Notice(`Voice input error: ${error.message}`);
    } finally {
      this.isListening = false;
      this.pttButton.textContent = '🗣️ Hold to Speak';
      if (this.isVoiceMode) {
        this.voiceStatusEl.textContent = '🎤 Voice Ready';
      }
    }
  }
  
  private async stopListening(): Promise<void> {
    // Voice system handles stopping automatically after timeout
    this.isListening = false;
    this.pttButton.textContent = '🗣️ Hold to Speak';
  }
  
  private async processVoiceMessage(transcript: string): Promise<void> {
    this.setProcessing(true);
    
    try {
      const result = await this.voiceAgent.processVoiceMessage(transcript, this.context);
      
      // Add text response to chat
      this.addMessage('assistant', result.textResponse);
      
      // Speak the response
      if (result.shouldSpeak && this.isVoiceMode) {
        this.voiceStatusEl.textContent = '🗣️ Speaking...';
        await this.voiceSystem.speak(result.spokenResponse);
        this.voiceStatusEl.textContent = '🎤 Voice Ready';
      }
      
    } catch (error) {
      console.error('Voice message processing error:', error);
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
      this.setProcessing(false);
    }
  }
  
  // Override sendMessage to also support voice output
  protected async sendMessage(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message || this.isProcessing) return;

    this.addMessage('user', message);
    this.inputEl.value = '';
    this.setProcessing(true);

    try {
      let response: string;
      
      if (this.isVoiceMode) {
        // Use voice agent for processing
        const result = await this.voiceAgent.processVoiceMessage(message, this.context);
        response = result.textResponse;
        
        // Speak the response
        if (result.shouldSpeak) {
          this.voiceStatusEl.textContent = '🗣️ Speaking...';
          await this.voiceSystem.speak(result.spokenResponse);
          this.voiceStatusEl.textContent = '🎤 Voice Ready';
        }
      } else {
        // Use regular vault agent
        response = await this.vaultAgent.processMessage(message, this.context);
      }
      
      this.addMessage('assistant', response);

    } catch (error) {
      console.error('Message processing error:', error);
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
      this.setProcessing(false);
      this.inputEl.focus();
    }
  }
  
  private getVoiceSystemFromPlugin(): LocalVoiceIntegration {
    // Access voice system from main plugin
    return (this.app as any).plugins.plugins['clippy-ai-assistant'].voiceSystemV2;
  }
}
```

### **Step 3: Update Main Plugin Integration**

```typescript
// Update command-handlers.ts
async handleVaultAgentChat(): Promise<void> {
  try {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const context = { 
      currentNote: activeView?.file || undefined,
      workingDirectory: activeView?.file?.parent?.path || 'root'
    };

    // Use voice-enabled vault agent instead
    const modal = new VoiceEnabledVaultChatModal(
      this.plugin.app,
      this.plugin.settings,
      context
    );
    modal.open();

  } catch (error) {
    console.error('CLIPPY: Error opening vault agent chat:', error);
    new Notice(`Failed to open vault agent: ${error.message}`);
  }
}
```

## 🎯 **User Experience Flow**

### **Text Mode (Default)**
1. User opens Vault Agent chat
2. Types commands like "Create a note called 'Meeting Notes'"
3. Agent processes and responds with text
4. All existing functionality works as before

### **Voice Mode (Enhanced)**
1. User clicks "🎤 Enable Voice" button
2. System activates voice capabilities
3. User holds "🗣️ Hold to Speak" and speaks: "Create a note called Meeting Notes"
4. Agent processes voice input using same vault tools
5. Agent responds with both text (in chat) and speech
6. User can continue with voice or switch back to text

### **Wake Word Integration (Future)**
- "Hey Clippy, create a new note" → Opens vault agent in voice mode
- Seamless transition between wake word activation and vault operations

## 🔄 **Migration Strategy**

### **Phase 1: Foundation (Week 1)**
- [x] Create VoiceVaultAgent class extending VaultAgent
- [x] Add voice processing methods
- [x] Create VoiceEnabledVaultChatModal

### **Phase 2: Integration (Week 2)**
- [ ] Integrate with existing LocalVoiceIntegration
- [ ] Add voice controls to chat UI
- [ ] Test voice input/output flow

### **Phase 3: Replacement (Week 3)**
- [ ] Replace simple voice command processing with vault agent
- [ ] Update main plugin to use voice-enabled agent as default
- [ ] Deprecate old voice command patterns

### **Phase 4: Enhancement (Week 4)**
- [ ] Add wake word → vault agent integration
- [ ] Optimize speech-to-text → tool execution flow
- [ ] Add voice-specific features (speech rate, voice selection, etc.)

## 🎉 **Expected Outcome**

### **Unified AI Interface**
- **Single entry point** for all CLIPPY interactions
- **Seamless voice/text** switching within same conversation
- **All vault operations** accessible via natural language (voice or text)
- **Context preservation** across input modes

### **Enhanced User Experience**
- **Hands-free vault management** for accessibility and convenience
- **Natural conversation flow** with AI assistant
- **All existing features** maintained and enhanced
- **Progressive enhancement** - voice adds to, doesn't replace text

### **Technical Benefits**
- **Simplified architecture** - one agent handles everything
- **Easier maintenance** - centralized AI logic
- **Better extensibility** - new tools automatically work with voice
- **Consistent behavior** - same processing for voice and text

This integration will transform CLIPPY from a collection of AI features into a true conversational assistant that can manage your entire Obsidian vault through natural language, whether spoken or typed.