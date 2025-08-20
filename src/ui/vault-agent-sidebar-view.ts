/**
 * CLIPPY AI Assistant - Vault Agent Sidebar View
 * A dockable sidebar view for the voice-enabled vault agent
 */

import { ItemView, WorkspaceLeaf, MarkdownView } from 'obsidian';
import ClippyPlugin from '../main';
import { ClippySettings } from '../types';
import { VoiceVaultAgent } from '../agents/voice-vault-agent';
import { AgentContext } from '../agents/vault-agent';
import { LocalVoiceIntegration } from '../voice-v2/local-voice-integration';
import { VADWidget, VADWidgetConfig } from './components/audio-visualizers/vad-widget';
import { TTSSpectrumWidget, TTSSpectrumWidgetConfig } from './components/audio-visualizers/tts-spectrum-widget';
import { ConversationManager, ConversationMessage } from '../conversation/conversation-manager';
import { ConversationBrowserModal } from './conversation-browser-modal';

export const VIEW_TYPE_VAULT_AGENT = 'clippy-vault-agent-view';

export class VaultAgentSidebarView extends ItemView {
  private plugin: ClippyPlugin;
  private settings: ClippySettings;
  private voiceAgent: VoiceVaultAgent;
  private voiceSystem: LocalVoiceIntegration | null = null;
  private context: AgentContext;
  private conversationManager: ConversationManager;

  // UI elements
  private chatHistoryEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private voiceBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private toolsBtn: HTMLButtonElement;
  private historyBtn: HTMLButtonElement;
  private newChatBtn: HTMLButtonElement;
  private vadWidget: VADWidget | null = null;
  
  // State
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date; messageEl?: HTMLElement | null }> = [];
  private isProcessing: boolean = false;
  private isVoiceMode: boolean = false;
  private isListening: boolean = false;
  private currentSpeakingMessage: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClippyPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.settings = plugin.settings;
    
    // Initialize context
    this.context = {
      currentNote: undefined,
      workingDirectory: 'root',
      conversationHistory: [],
      sessionId: Date.now().toString(),
      recentlyMentionedFiles: [],
      activeContext: {
        lastCreatedFile: undefined,
        lastMentionedFile: undefined,
        currentWorkingFile: undefined
      }
    };

    // Initialize conversation manager
    this.conversationManager = new ConversationManager(this.app);
    
    // Get voice system from main plugin
    this.voiceSystem = this.getVoiceSystemFromPlugin();
    
    // Create voice-enabled agent
    this.voiceAgent = new VoiceVaultAgent(this.app, this.settings, this.voiceSystem || undefined);
  }

  getViewType(): string {
    return VIEW_TYPE_VAULT_AGENT;
  }

  getDisplayText(): string {
    return 'Vault Agent';
  }

  getIcon(): string {
    return 'robot';
  }

  async onOpen(): Promise<void> {
    console.log('[Conversation] Initializing vault agent sidebar with conversation system');
    
    // Initialize conversation system
    await this.conversationManager.initialize();
    
    this.createSidebarInterface();
    await this.loadOrStartConversation();
    
    console.log('[Conversation] Vault agent sidebar initialization complete');
  }

  async onClose(): Promise<void> {
    // Save current conversation before closing
    try {
      await this.conversationManager.saveCurrentConversation();
      console.log('[Conversation] Saved conversation on close');
    } catch (error) {
      console.error('[Conversation] Failed to save conversation on close:', error);
    }
    
    // Cleanup
    if (this.isVoiceMode && this.voiceSystem) {
      await this.disableVoiceMode();
    }
    
    // Dispose VAD widget
    if (this.vadWidget) {
      this.vadWidget.dispose();
      this.vadWidget = null;
    }
    
    // Cleanup speaking message
    if (this.currentSpeakingMessage) {
      this.resetAudioReactiveBorder(this.currentSpeakingMessage);
      this.currentSpeakingMessage = null;
    }
  }

  private createSidebarInterface(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('vault-agent-sidebar');

    // Header
    const header = container.createEl('div', { cls: 'vault-agent-header' });
    
    const title = header.createEl('h3', { text: 'CLIPPY Vault Agent' });
    title.style.cssText = 'margin: 0; display: flex; align-items: center; gap: 8px;';
    title.insertAdjacentHTML('afterbegin', '🤖 ');

    // Conversation controls container
    const conversationControls = header.createEl('div', { cls: 'conversation-controls' });
    conversationControls.style.cssText = 'display: flex; gap: 4px; align-items: center;';
    
    // New conversation button
    this.newChatBtn = conversationControls.createEl('button', { 
      text: '🆕',
      title: 'Start new conversation'
    });
    this.newChatBtn.addClass('vault-agent-btn');
    this.newChatBtn.style.cssText = 'padding: 4px 8px; margin: 0 2px; font-size: 14px; border-radius: 4px;';
    this.newChatBtn.addEventListener('click', () => this.startNewConversation());
    console.log('[Conversation] New chat button created');

    // Chat history button
    this.historyBtn = conversationControls.createEl('button', { 
      text: '📋',
      title: 'Browse conversation history'
    });
    this.historyBtn.addClass('vault-agent-btn');
    this.historyBtn.style.cssText = 'padding: 4px 8px; margin: 0 2px; font-size: 14px; border-radius: 4px;';
    this.historyBtn.addEventListener('click', () => this.showConversationHistory());
    console.log('[Conversation] History button created');

    // Tools button
    this.toolsBtn = conversationControls.createEl('button', { 
      text: '🔧',
      title: 'Show available tools'
    });
    this.toolsBtn.addClass('vault-agent-btn');
    this.toolsBtn.style.cssText = 'padding: 4px 8px; margin: 0 2px; font-size: 14px; border-radius: 4px;';
    this.toolsBtn.addEventListener('click', () => this.showToolsInChat());

    // Voice button
    this.voiceBtn = conversationControls.createEl('button', { 
      text: '🎤',
      title: 'Toggle voice mode'
    });
    this.voiceBtn.addClass('vault-agent-btn');
    this.voiceBtn.style.cssText = 'padding: 4px 8px; margin: 0 2px; font-size: 14px; border-radius: 4px;';
    this.voiceBtn.addEventListener('click', () => this.toggleVoiceMode());

    // Save conversation button (for debugging)
    const saveBtn = conversationControls.createEl('button', { 
      text: '💾',
      title: 'Save conversation'
    });
    saveBtn.addClass('vault-agent-btn');
    saveBtn.style.cssText = 'padding: 4px 8px; margin: 0 2px; font-size: 14px; border-radius: 4px;';
    saveBtn.addEventListener('click', async () => {
      try {
        await this.conversationManager.saveCurrentConversation();
        this.addMessage('assistant', '💾 Conversation saved successfully!');
      } catch (error) {
        this.addMessage('assistant', `❌ Failed to save conversation: ${error.message}`);
      }
    });

    // Initialize VAD widget next to voice button
    this.initializeVADWidget(header);

    // Status indicator
    this.statusEl = container.createEl('div', { cls: 'vault-agent-status' });
    this.statusEl.textContent = '💬 Text Mode';

    // Chat history container
    this.chatHistoryEl = container.createEl('div', { cls: 'vault-agent-chat-history' });
    this.chatHistoryEl.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      margin: 8px 0;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-secondary);
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    `;

    // Input area
    const inputArea = container.createEl('div', { cls: 'vault-agent-input-area' });
    
    this.inputEl = inputArea.createEl('input', { 
      type: 'text',
      placeholder: 'Ask about your vault or give commands...'
    });
    this.inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isProcessing) {
        this.sendMessage();
      }
    });

    this.sendBtn = inputArea.createEl('button', { text: 'Send' });
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    // Voice controls (initially hidden)
    const voiceControls = container.createEl('div', { cls: 'vault-agent-voice-controls' });
    voiceControls.style.display = 'none';
    
    const pushToTalkBtn = voiceControls.createEl('button', { 
      text: '🎤 Hold to Speak',
      cls: 'push-to-talk-btn'
    });
    
    pushToTalkBtn.addEventListener('mousedown', () => this.startListening());
    pushToTalkBtn.addEventListener('mouseup', () => this.stopListening());
    pushToTalkBtn.addEventListener('mouseleave', () => this.stopListening());
  }

  private addMessage(role: 'user' | 'assistant', content: string, isStreaming: boolean = false): HTMLElement {
    const message = {
      role,
      content,
      timestamp: new Date(),
      messageEl: null as HTMLElement | null
    };
    
    // Create message element
    const messageEl = this.chatHistoryEl.createEl('div', { 
      cls: `vault-agent-message vault-agent-message-${role}` 
    });
    messageEl.style.cssText = `
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
      padding: 8px;
      border-radius: 6px;
      background: ${role === 'user' ? 'var(--interactive-accent)' : 'var(--background-primary)'};
      color: ${role === 'user' ? 'white' : 'var(--text-normal)'};
      border: ${role === 'assistant' ? '1px solid var(--background-modifier-border)' : 'none'};
    `;
    
    // Message header with avatar and content
    const messageHeader = messageEl.createEl('div', { cls: 'message-header' });
    messageHeader.style.cssText = 'display: flex; align-items: flex-start;';
    
    const avatar = messageHeader.createEl('div', { cls: 'message-avatar' });
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    avatar.style.cssText = `
      margin-right: 8px;
      flex-shrink: 0;
    `;
    
    const content_el = messageHeader.createEl('div', { cls: 'message-content' });
    content_el.style.cssText = `
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      cursor: text;
      line-height: 1.4;
      margin-left: 8px;
      flex: 1;
    `;
    
    if (role === 'assistant') {
      // Render markdown-like formatting
      content_el.innerHTML = this.formatAssistantMessage(content);
      
      // Add streaming cursor if this is a streaming message
      if (isStreaming) {
        const cursor = content_el.createEl('span', { cls: 'streaming-cursor' });
        cursor.textContent = '▊';
        cursor.style.cssText = `
          animation: blink 1s infinite;
          color: var(--interactive-accent);
          font-weight: bold;
        `;
        
        // Add blink animation if not already added
        if (!document.head.querySelector('style[data-streaming-cursor]')) {
          const style = document.createElement('style');
          style.setAttribute('data-streaming-cursor', 'true');
          style.textContent = `
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      // Add TTS spectrum container for assistant messages
      const spectrumContainer = messageEl.createEl('div', { cls: 'tts-spectrum-container' });
      spectrumContainer.style.cssText = `
        margin-top: 8px;
        margin-left: 32px;
        display: none;
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 8px;
        min-height: 60px;
        background: var(--background-secondary-alt);
        border-radius: 4px;
      `;
      
      // Add a placeholder text for debugging
      spectrumContainer.innerHTML = '<div style="padding: 8px; color: var(--text-muted); font-size: 12px; text-align: center;">🎵 Spectrum visualizer will appear here during speech 🔊 Stop button will appear when speaking</div>';
      
      console.log('[TTS Container] Created spectrum container in addMessage with placeholder');
      
      // Store reference to spectrum container for later use
      messageEl.dataset.spectrumContainer = 'true';
      
      console.log('[Message] Spectrum container created for assistant message');
    } else {
      content_el.textContent = content;
    }
    
    // Store message element reference
    message.messageEl = messageEl;
    this.chatHistory.push(message);
    
    // Scroll to bottom
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
    
    return messageEl;
  }

  /**
   * Speak text with spectrum visualization in the message bubble
   */
  private async speakWithSpectrum(text: string, messageEl: HTMLElement): Promise<void> {
    console.log('[TTS Spectrum] Starting speech with spectrum visualization for text:', text.substring(0, 50) + '...');
    console.log('[TTS Spectrum] Full text length:', text.length, 'contains <think>:', text.includes('<think'));
    console.log('[TTS Spectrum] Text preview (first 200 chars):', text.substring(0, 200));
    
    try {
      // Find spectrum container in the message element
      const spectrumContainer = messageEl.querySelector('.tts-spectrum-container') as HTMLElement;
      if (!spectrumContainer) {
        console.log('[TTS Spectrum] No spectrum container found, falling back to regular TTS');
        await this.voiceAgent.speak(text);
        return;
      }
      
      console.log('[TTS Spectrum] Spectrum container found, initializing visualization');

      // Clear placeholder and show spectrum container
      console.log('[TTS Interrupt] Clearing placeholder and showing spectrum container');
      spectrumContainer.innerHTML = ''; // Clear placeholder
      spectrumContainer.style.display = 'block';
      this.currentSpeakingMessage = messageEl;
      
      // Add blue border to indicate speaking
      console.log('[TTS Spectrum] Adding blue border to speaking message');
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--interactive-accent').trim() || '#7c3aed';
      messageEl.style.borderLeftColor = accentColor;
      messageEl.style.borderLeftWidth = '3px';
      messageEl.style.borderLeftStyle = 'solid';
      
      console.log('[TTS Spectrum] Spectrum container visible, creating widget');

      // Create TTS spectrum widget
      const spectrumConfig: TTSSpectrumWidgetConfig = {
        enabled: true,
        size: 'compact',
        theme: 'auto',
        showControls: false,
        autoHide: true,
        animationDuration: 300,
        spectrumConfig: {
          enabled: true,
          spectrumAnalysis: true,
          textSync: false,
          avatarMode: false,
          visualStyle: 'spectrum',
          height: 60,
          mode: 3,
          freqMin: 85,
          freqMax: 8000,
          showPeaks: true,
          lumiBars: false,
          smoothing: 0.8
        },
        onPlaybackStateChange: (state) => {
          // Add visual speaking indicator to message
          if (state.isPlaying) {
            console.log('[TTS Spectrum] Adding blue border to speaking message');
            messageEl.style.borderLeftColor = 'var(--interactive-accent)';
            messageEl.style.borderLeftWidth = '3px';
            messageEl.style.borderLeftStyle = 'solid';
          } else {
            console.log('[TTS Spectrum] Removing blue border from message');
            messageEl.style.borderLeft = 'none';
          }
        },
        onError: (error) => {
          console.error('TTS Spectrum Widget Error:', error);
          spectrumContainer.style.display = 'none';
          messageEl.style.borderLeft = 'none';
          this.currentSpeakingMessage = null;
        }
      };

      console.log('[TTS Interrupt] Creating status container and interrupt button');
      
      // Add speaking status indicator with pulse animation and interrupt button
      const statusContainer = spectrumContainer.createEl('div', { cls: 'tts-status-container' });
      statusContainer.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative;
        z-index: 1000;
        background: var(--background-primary);
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      `;
      
      console.log('[TTS Interrupt] Status container created:', statusContainer);
      
      const statusEl = statusContainer.createEl('div', { cls: 'tts-status' });
      statusEl.style.cssText = `
        padding: 4px 8px;
        background: var(--interactive-accent);
        color: white;
        border-radius: 12px;
        font-size: 11px;
        display: inline-block;
        animation: pulse 1.5s ease-in-out infinite;
      `;
      statusEl.textContent = '🔊 Speaking...';
      
      // Add TTS interrupt button
      const interruptBtn = statusContainer.createEl('button', { cls: 'tts-interrupt-btn' });
      interruptBtn.style.cssText = `
        padding: 6px 12px;
        background: #dc2626;
        color: white;
        border: 2px solid #dc2626;
        border-radius: 8px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        display: inline-block !important;
        visibility: visible !important;
        transition: all 0.2s ease;
        white-space: nowrap;
        min-width: 70px;
        text-align: center;
        position: relative;
        z-index: 1000;
      `;
      interruptBtn.textContent = '⏹️ Stop';
      interruptBtn.title = 'Stop speech immediately';
      
      console.log('[TTS Interrupt] Created interrupt button with explicit styling');
      console.log('[TTS Interrupt] Button element:', interruptBtn);
      console.log('[TTS Interrupt] Button parent container:', statusContainer);
      console.log('[TTS Interrupt] Spectrum container:', spectrumContainer);
      
      // Force a DOM update and verify button is visible
      setTimeout(() => {
        const buttonCheck = spectrumContainer.querySelector('.tts-interrupt-btn') as HTMLElement;
        console.log('[TTS Interrupt] Button visibility check after timeout:', {
          buttonExists: !!buttonCheck,
          buttonVisible: buttonCheck ? getComputedStyle(buttonCheck).display !== 'none' : false,
          containerVisible: getComputedStyle(spectrumContainer).display !== 'none',
          buttonOffsetWidth: buttonCheck ? buttonCheck.offsetWidth : 0,
          buttonOffsetHeight: buttonCheck ? buttonCheck.offsetHeight : 0
        });
      }, 100);
      
      // Add interrupt functionality
      let isInterrupted = false;
      interruptBtn.addEventListener('click', () => {
        console.log('[TTS Interrupt] User clicked stop button');
        isInterrupted = true;
        
        // Stop TTS immediately
        this.stopCurrentSpeech();
        
        // Hide spectrum container and reset border
        spectrumContainer.style.display = 'none';
        this.resetAudioReactiveBorder(messageEl);
        this.currentSpeakingMessage = null;
        
        // Visual feedback
        interruptBtn.textContent = '✅ Stopped';
        interruptBtn.style.background = '#22c55e';
        interruptBtn.style.borderColor = '#22c55e';
        setTimeout(() => {
          if (spectrumContainer.parentNode) {
            spectrumContainer.style.display = 'none';
          }
        }, 1000);
      });
      
      // Hover effect for interrupt button
      interruptBtn.addEventListener('mouseenter', () => {
        if (!isInterrupted) {
          interruptBtn.style.background = '#b91c1c';
          interruptBtn.style.borderColor = '#b91c1c';
          interruptBtn.style.transform = 'scale(1.05)';
        }
      });
      
      interruptBtn.addEventListener('mouseleave', () => {
        if (!isInterrupted) {
          interruptBtn.style.background = '#dc2626';
          interruptBtn.style.borderColor = '#dc2626';
          interruptBtn.style.transform = 'scale(1)';
        }
      });
      
      // Add pulse animation CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `;
      if (!document.head.querySelector('style[data-tts-pulse]')) {
        style.setAttribute('data-tts-pulse', 'true');
        document.head.appendChild(style);
      }
      
      // Setup real audio spectrum analysis
      const ttsManager = this.voiceSystem?.getTTSManager();
      if (ttsManager) {
        console.log('[TTS Spectrum] Setting up real audio spectrum analysis');
        
        // Setup audio ready callback for real spectrum
        (ttsManager as any).onAudioReady = (audio: HTMLAudioElement, filePath: string) => {
          console.log('[TTS Spectrum] Real audio element received, creating spectrum analyzer');
          this.createRealAudioSpectrum(spectrumContainer, audio, messageEl);
        };
        
        // Start TTS with real audio
        console.log('[TTS Spectrum] Using TTS manager for speech with real audio');
        await ttsManager.speak(text);
      } else {
        console.log('[TTS Spectrum] Using voice agent for speech (fallback)');
        // Fallback: Create animated spectrum for voice agent
        this.createAnimatedSpectrum(spectrumContainer);
        await this.voiceAgent.speak(text);
      }

      // Clean up spectrum after a delay (estimated speech duration)
      const estimatedDuration = Math.max(3000, text.length * 50); // Rough estimate: 50ms per character
      console.log('[TTS Spectrum] Setting cleanup timer for', estimatedDuration, 'ms');
      setTimeout(() => {
        console.log('[TTS Spectrum] Cleaning up spectrum visualization');
        if (spectrumContainer.style.display !== 'none') {
          spectrumContainer.style.display = 'none';
        }
        if (this.currentSpeakingMessage === messageEl) {
          console.log('[TTS Spectrum] Removing blue border from message');
          this.resetAudioReactiveBorder(messageEl);
          this.currentSpeakingMessage = null;
        }
      }, estimatedDuration);

    } catch (error) {
      console.error('Error during TTS with spectrum:', error);
      // Fallback to regular speaking
      await this.voiceAgent.speak(text);
      
      // Ensure cleanup
      if (this.currentSpeakingMessage === messageEl) {
        this.resetAudioReactiveBorder(messageEl);
        this.currentSpeakingMessage = null;
      }
    }
  }

  /**
   * Create real audio spectrum analysis using Web Audio API
   */
  private createRealAudioSpectrum(container: HTMLElement, audio: HTMLAudioElement, messageEl: HTMLElement): void {
    try {
      // Create audio context and analyzer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);
      
      // Configure analyzer for speech
      analyser.fftSize = 256;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      // Connect audio graph
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Create canvas for visualization
      const canvas = container.createEl('canvas', { cls: 'tts-spectrum-canvas-real' });
      canvas.width = 300;
      canvas.height = 50;
      canvas.style.cssText = `
        width: 100%;
        height: 50px;
        border-radius: 4px;
        background: var(--background-primary);
      `;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Animation variables
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const bars = 24;
      let animationId: number;
      
      // Get colors
      const getAccentColor = () => {
        const computed = getComputedStyle(document.documentElement);
        return computed.getPropertyValue('--interactive-accent').trim() || '#7c3aed';
      };
      
      const getAccentHoverColor = () => {
        const computed = getComputedStyle(document.documentElement);
        return computed.getPropertyValue('--interactive-accent-hover').trim() || '#8b5cf6';
      };
      
      // Real-time analysis function
      const analyzeAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = canvas.width / bars;
        const accentColor = getAccentColor();
        const accentHoverColor = getAccentHoverColor();
        
        // Calculate overall audio level for border pulsing
        let totalVolume = 0;
        for (let i = 0; i < bufferLength; i++) {
          totalVolume += dataArray[i];
        }
        const avgVolume = totalVolume / bufferLength;
        const volumeIntensity = avgVolume / 255; // 0-1 range
        
        // Update message border with audio-reactive pulsing
        this.updateAudioReactiveBorder(messageEl, volumeIntensity, accentColor);
        
        // Draw bars based on real frequency data
        for (let i = 0; i < bars; i++) {
          // Average multiple frequency bins per bar
          const binStart = Math.floor((i * bufferLength) / bars);
          const binEnd = Math.floor(((i + 1) * bufferLength) / bars);
          let sum = 0;
          for (let j = binStart; j < binEnd; j++) {
            sum += dataArray[j];
          }
          const average = sum / (binEnd - binStart);
          
          // Convert to height (0-255 to 0-canvas.height)
          const height = (average / 255) * canvas.height * 0.8 + 3;
          const x = i * barWidth + 1;
          
          // Create gradient
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, accentColor);
          gradient.addColorStop(1, accentHoverColor);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
          
          // Add glow effect
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 2;
          ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
          ctx.shadowBlur = 0;
        }
        
        // Continue animation if audio is playing
        if (!audio.paused && !audio.ended) {
          animationId = requestAnimationFrame(analyzeAudio);
        }
      };
      
      // Start analysis when audio starts playing
      audio.addEventListener('play', () => {
        console.log('[TTS Spectrum] Starting real audio analysis');
        analyzeAudio();
      });
      
      // Stop analysis when audio ends
      audio.addEventListener('ended', () => {
        console.log('[TTS Spectrum] Real audio analysis ended');
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        // Reset border to normal state
        this.resetAudioReactiveBorder(messageEl);
      });
      
      // Debug: Check if audio is ready to play
      audio.addEventListener('canplay', () => {
        console.log('[TTS Spectrum] Audio can play - duration:', audio.duration, 'current time:', audio.currentTime);
      });
      
      // Start analysis immediately if audio is already playing
      if (!audio.paused && audio.duration > 0) {
        console.log('[TTS Spectrum] Audio already playing, starting analysis immediately');
        analyzeAudio();
      }
      
      console.log('[TTS Spectrum] Real audio spectrum analyzer initialized');
      console.log('[TTS Spectrum] Canvas created with dimensions:', canvas.width, 'x', canvas.height);
      console.log('[TTS Spectrum] Audio element state - paused:', audio.paused, 'ended:', audio.ended, 'duration:', audio.duration);
      
      // Fallback: If audio doesn't start playing within 2 seconds, show animated spectrum
      setTimeout(() => {
        if (audio.paused && audio.currentTime === 0) {
          console.log('[TTS Spectrum] Real audio never started, adding animated fallback');
          this.createAnimatedSpectrum(container);
        }
      }, 2000);
      
    } catch (error) {
      console.error('[TTS Spectrum] Failed to create real audio spectrum, falling back to animated:', error);
      // Fallback to animated spectrum
      this.createAnimatedSpectrum(container);
    }
  }

  /**
   * Create an animated spectrum fallback for when audio analysis isn't available
   */
  private createAnimatedSpectrum(container: HTMLElement): void {
    // Don't clear container - preserve existing elements like status badge
    
    // Create spectrum canvas
    const canvas = container.createEl('canvas', { cls: 'tts-spectrum-canvas' });
    canvas.width = 300;
    canvas.height = 50;
    canvas.style.cssText = `
      width: 100%;
      height: 50px;
      border-radius: 4px;
      background: var(--background-primary);
    `;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Animation variables
    const bars = 24;
    const barWidth = canvas.width / bars;
    let animationId: number;
    let time = 0;
    
    // Get colors from CSS variables
    const getAccentColor = () => {
      const computed = getComputedStyle(document.documentElement);
      return computed.getPropertyValue('--interactive-accent').trim() || '#7c3aed';
    };
    
    const getAccentHoverColor = () => {
      const computed = getComputedStyle(document.documentElement);
      return computed.getPropertyValue('--interactive-accent-hover').trim() || '#8b5cf6';
    };
    
    // Speech-like animation patterns
    const speechPattern = (barIndex: number, time: number) => {
      // Simulate voice frequency distribution (more activity in speech range)
      const voiceFreqs = [1, 2, 3, 4, 5, 4, 3, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const baseIntensity = voiceFreqs[barIndex] || 0.1;
      
      // Add speech-like modulation
      const speechWave = Math.sin(time * 0.1 + barIndex * 0.3) * 0.5 + 0.5;
      const speechBurst = Math.sin(time * 0.05) * 0.3 + 0.7; // Simulate speech bursts
      const randomVariation = (Math.random() - 0.5) * 0.2;
      
      return Math.max(0.1, Math.min(1, baseIntensity * speechWave * speechBurst + randomVariation));
    };
    
    // Animate bars with speech-like patterns
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;
      
      const accentColor = getAccentColor();
      const accentHoverColor = getAccentHoverColor();
      
      // Draw speech-pattern animated bars
      for (let i = 0; i < bars; i++) {
        const intensity = speechPattern(i, time);
        const height = intensity * canvas.height * 0.85 + 3;
        const x = i * barWidth + 1;
        
        // Create gradient with actual color values
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, accentHoverColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
        
        // Add glow effect for more realistic look
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 2;
        ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
        ctx.shadowBlur = 0;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Stop animation when container is hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target.style.display === 'none') {
            cancelAnimationFrame(animationId);
            observer.disconnect();
          }
        }
      });
    });
    
    observer.observe(container, { attributes: true });
  }

  /**
   * Update message border with audio-reactive pulsing
   */
  private updateAudioReactiveBorder(messageEl: HTMLElement, volumeIntensity: number, accentColor: string): void {
    // Map volume intensity to border width (3px to 8px)
    const minWidth = 3;
    const maxWidth = 8;
    const borderWidth = minWidth + (volumeIntensity * (maxWidth - minWidth));
    
    // Map volume intensity to opacity (0.6 to 1.0)
    const minOpacity = 0.6;
    const maxOpacity = 1.0;
    const opacity = minOpacity + (volumeIntensity * (maxOpacity - minOpacity));
    
    // Create color with dynamic opacity
    const rgbMatch = accentColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    let borderColor;
    
    if (rgbMatch) {
      // RGB color - convert to rgba with opacity
      borderColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
    } else if (accentColor.startsWith('#')) {
      // Hex color - convert to rgba
      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);
      borderColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
      // Fallback
      borderColor = accentColor;
    }
    
    // Apply audio-reactive border
    messageEl.style.borderLeftColor = borderColor;
    messageEl.style.borderLeftWidth = `${borderWidth}px`;
    messageEl.style.borderLeftStyle = 'solid';
    
    // Add subtle glow effect during high volume
    if (volumeIntensity > 0.7) {
      messageEl.style.boxShadow = `0 0 ${volumeIntensity * 10}px ${borderColor}`;
    } else {
      messageEl.style.boxShadow = 'none';
    }
  }

  /**
   * Reset message border to normal state after audio ends
   */
  private resetAudioReactiveBorder(messageEl: HTMLElement): void {
    messageEl.style.borderLeft = 'none';
    messageEl.style.boxShadow = 'none';
  }


  /**
   * Stop current speech immediately
   */
  private stopCurrentSpeech(): void {
    console.log('[TTS Interrupt] Stopping current speech');
    
    try {
      // Stop TTS through voice system
      if (this.voiceSystem) {
        const ttsManager = this.voiceSystem.getTTSManager();
        if (ttsManager && typeof (ttsManager as any).stopSpeech === 'function') {
          console.log('[TTS Interrupt] Stopping TTS manager');
          (ttsManager as any).stopSpeech();
        }
      }
      
      // Stop voice agent speech
      if (this.voiceAgent && typeof (this.voiceAgent as any).stopSpeaking === 'function') {
        console.log('[TTS Interrupt] Stopping voice agent speech');
        (this.voiceAgent as any).stopSpeaking();
      }
      
      // Stop any Web Speech API synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        console.log('[TTS Interrupt] Stopping Web Speech API');
        window.speechSynthesis.cancel();
      }
      
      // Stop any audio elements that might be playing
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (!audio.paused) {
          console.log('[TTS Interrupt] Stopping audio element');
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      console.log('[TTS Interrupt] Speech stop commands sent');
    } catch (error) {
      console.error('[TTS Interrupt] Error stopping speech:', error);
    }
  }

  private formatAssistantMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.sendBtn.disabled = processing;
    this.inputEl.disabled = processing;
    
    if (processing) {
      this.sendBtn.textContent = '...';
      this.statusEl.textContent = this.isVoiceMode ? '🎤 Processing...' : '💬 Processing...';
    } else {
      this.sendBtn.textContent = 'Send';
      this.statusEl.textContent = this.isVoiceMode ? '🎤 Voice Mode' : '💬 Text Mode';
    }
  }

  private async sendMessage(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message || this.isProcessing) return;

    // Add user message to chat
    this.addMessage('user', message);
    this.inputEl.value = '';
    this.setProcessing(true);

    // Add user message to conversation manager
    this.conversationManager.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    try {
      // Update context with current note if available
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      this.context.currentNote = activeView?.file || undefined;
      this.context.workingDirectory = activeView?.file?.parent?.path || 'root';

      // Update context with full conversation history
      this.context.conversationHistory = this.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      // Always try streaming first, with fallback
      console.log('[Vault Agent] Attempting streaming response...');
      
      try {
        // Try streaming response
        await this.handleStreamingResponse(message);
      } catch (streamingError) {
        console.warn('[Vault Agent] Streaming failed, falling back to non-streaming:', streamingError);
        
        // Fallback to non-streaming with thinking support
        const response = await this.voiceAgent.processMessage(message, this.context);
        const messageEl = this.addMessage('assistant', '');
        
        // Extract thinking content from the response
        const { thinking, cleanResponse } = this.extractThinkingFromResponse(response);
        
        // Add thinking sections if present
        thinking.forEach(thinkingContent => {
          this.addThinkingSection(messageEl, thinkingContent);
        });
        
        // Set the clean response content
        const contentEl = messageEl.querySelector('.message-content') as HTMLElement;
        if (contentEl) {
          contentEl.innerHTML = this.formatAssistantMessage(cleanResponse);
        }
        
        // Add assistant message to conversation manager
        this.conversationManager.addMessage({
          role: 'assistant',
          content: cleanResponse,
          timestamp: new Date(),
          thinking: thinking.length > 0 ? thinking : undefined
        });
        
        // Speak response if voice mode is enabled (use clean response for TTS)
        if (this.isVoiceMode && this.voiceSystem && this.voiceSystem.isActive) {
          await this.speakWithSpectrum(cleanResponse, messageEl);
        }
      }

    } catch (error) {
      console.error('CLIPPY Vault Agent: Error processing message:', error);
      this.addMessage('assistant', `❌ Error: ${error.message}`);
    } finally {
      this.setProcessing(false);
    }
  }

  private addWelcomeMessage(): void {
    // Check if MoE is enabled
    const moeStatus = this.voiceAgent.isMoEEnabled();
    const moeInfo = moeStatus ? '\n\n🧠 **MoE System Active**: I now use a Mixture of Experts to provide more consistent and intelligent responses!' : '';
    
    const welcomeMessage = `Welcome to CLIPPY Vault Agent! 🤖

I can help you manage your vault with these capabilities:
• Create, read, edit, and delete notes
• Search across your vault
• Manage folders and organize files
• Handle templates and metadata
• Analyze vault patterns
• And much more!

Try commands like:
• "Create a new note called meeting notes"
• "List all my notes tagged with project"
• "Search for notes about obsidian"

🎤 Enable voice mode for hands-free interaction!${moeInfo}`;

    this.addMessage('assistant', welcomeMessage);
    
    if (moeStatus) {
      console.log('🧠 CLIPPY MoE System is ACTIVE in vault agent sidebar');
      console.log('🧠 MoE Status:', this.voiceAgent.getMoEStatus());
    } else {
      console.log('❌ CLIPPY MoE System is DISABLED in vault agent sidebar');
    }
  }

  private showToolsInChat(): void {
    const toolsList = this.voiceAgent.getAvailableTools()
      .map(tool => `• **${tool.name}**: ${tool.description}`)
      .join('\n');

    const toolsMessage = `🔧 **Available Vault Agent Tools:**

${toolsList}

You can use these tools by describing what you want to do in natural language.`;

    this.addMessage('assistant', toolsMessage);
  }

  private async toggleVoiceMode(): Promise<void> {
    if (this.isVoiceMode) {
      await this.disableVoiceMode();
    } else {
      await this.enableVoiceMode();
    }
  }

  private async enableVoiceMode(): Promise<void> {
    if (!this.voiceSystem) {
      this.addMessage('assistant', '❌ Voice system not available. Please check your voice integration setup.');
      return;
    }

    try {
      // Activate the voice system
      await this.voiceSystem.startVoice();

      this.isVoiceMode = true;
      this.voiceBtn.textContent = '🔇';
      this.voiceBtn.title = 'Disable voice mode';
      this.statusEl.textContent = '🎤 Voice Mode';
      
      // Show voice controls
      const voiceControls = this.containerEl.querySelector('.vault-agent-voice-controls') as HTMLElement;
      if (voiceControls) {
        voiceControls.style.display = 'block';
      }

      this.addMessage('assistant', '🎤 Voice mode enabled! Hold the "Hold to Speak" button to talk.');
      
      // Start VAD widget if available
      if (this.vadWidget) {
        await this.vadWidget.start();
      }
      
    } catch (error) {
      console.error('Failed to enable voice mode:', error);
      this.addMessage('assistant', `❌ Failed to enable voice mode: ${error.message}`);
    }
  }

  private async disableVoiceMode(): Promise<void> {
    this.isVoiceMode = false;
    this.voiceBtn.textContent = '🎤';
    this.voiceBtn.title = 'Enable voice mode';
    this.statusEl.textContent = '💬 Text Mode';
    
    // Hide voice controls
    const voiceControls = this.containerEl.querySelector('.vault-agent-voice-controls') as HTMLElement;
    if (voiceControls) {
      voiceControls.style.display = 'none';
    }

    if (this.isListening) {
      await this.stopListening();
    }

    // Stop the voice system
    if (this.voiceSystem) {
      await this.voiceSystem.stopVoice();
    }

    // Stop VAD widget if available
    if (this.vadWidget) {
      this.vadWidget.stop();
    }

    this.addMessage('assistant', '💬 Voice mode disabled. Back to text mode.');
  }

  private async startListening(): Promise<void> {
    if (!this.voiceSystem || !this.isVoiceMode || this.isListening || this.isProcessing) return;

    try {
      this.isListening = true;
      this.statusEl.textContent = '🎤 Listening...';
      
      const pushToTalkBtn = this.containerEl.querySelector('.push-to-talk-btn') as HTMLButtonElement;
      if (pushToTalkBtn) {
        pushToTalkBtn.textContent = '🔴 Listening...';
        pushToTalkBtn.style.background = 'var(--interactive-accent)';
      }

      const result = await this.voiceSystem.listen(10); // 10 second timeout
      
      if (result && result.trim()) {
        this.addMessage('user', result);
        await this.processVoiceMessage(result);
      } else {
        this.addMessage('assistant', '🤔 I didn\'t catch that. Please try again.');
      }

    } catch (error) {
      console.error('Voice listening error:', error);
      this.addMessage('assistant', `❌ Voice error: ${error.message}`);
    } finally {
      this.isListening = false;
      this.statusEl.textContent = this.isVoiceMode ? '🎤 Voice Mode' : '💬 Text Mode';
      
      const pushToTalkBtn = this.containerEl.querySelector('.push-to-talk-btn') as HTMLButtonElement;
      if (pushToTalkBtn) {
        pushToTalkBtn.textContent = '🎤 Hold to Speak';
        pushToTalkBtn.style.background = '';
      }
    }
  }

  private async stopListening(): Promise<void> {
    this.isListening = false;
    // The actual stopping is handled by releasing the button
  }

  private async processVoiceMessage(message: string): Promise<void> {
    this.setProcessing(true);

    try {
      // Update context
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      this.context.currentNote = activeView?.file || undefined;
      this.context.workingDirectory = activeView?.file?.parent?.path || 'root';

      // Update context with full conversation history
      this.context.conversationHistory = this.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      // Try streaming first for voice mode to get thinking sections
      console.log('[Voice Mode] Attempting streaming response for voice message...');
      
      try {
        // Try streaming response which handles thinking sections
        await this.handleStreamingResponse(message);
      } catch (streamingError) {
        console.warn('[Voice Mode] Streaming failed, falling back to regular voice processing:', streamingError);
        
        // Fallback to non-streaming voice processing with thinking extraction
        const response = await this.voiceAgent.processVoiceMessage(message, this.context);
        
        // Handle VoiceResponse type
        if (typeof response === 'string') {
          // Extract thinking content from string response
          const { thinking, cleanResponse } = this.extractThinkingFromResponse(response);
          const messageEl = this.addMessage('assistant', '');
          
          // Add thinking sections if present
          thinking.forEach(thinkingContent => {
            this.addThinkingSection(messageEl, thinkingContent);
          });
          
          // Set the clean response content
          const contentEl = messageEl.querySelector('.message-content') as HTMLElement;
          if (contentEl) {
            contentEl.innerHTML = this.formatAssistantMessage(cleanResponse);
          }
          
          // Speak only the clean response (no thinking content for TTS)
          if (this.isVoiceMode && this.voiceSystem && this.voiceSystem.isActive) {
            console.log('[Voice Mode] Speaking clean response for TTS:', cleanResponse.substring(0, 100) + '...');
            await this.speakWithSpectrum(cleanResponse, messageEl);
          }
        } else {
          // Handle VoiceResponse object - extract thinking from textResponse
          const { thinking, cleanResponse } = this.extractThinkingFromResponse(response.textResponse);
          const messageEl = this.addMessage('assistant', '');
          
          // Add thinking sections if present
          thinking.forEach(thinkingContent => {
            this.addThinkingSection(messageEl, thinkingContent);
          });
          
          // Set the clean text response
          const contentEl = messageEl.querySelector('.message-content') as HTMLElement;
          if (contentEl) {
            contentEl.innerHTML = this.formatAssistantMessage(cleanResponse);
          }
          
          // Speak the spokenResponse if available, otherwise cleanResponse
          if (response.shouldSpeak && this.voiceSystem) {
            const speechText = response.spokenResponse || cleanResponse;
            console.log('[Voice Mode] Speaking voice response for TTS:', speechText.substring(0, 100) + '...');
            await this.speakWithSpectrum(speechText, messageEl);
          }
        }
      }

    } catch (error) {
      console.error('Error processing voice message:', error);
      this.addMessage('assistant', `❌ Error: ${error.message}`);
    } finally {
      this.setProcessing(false);
    }
  }

  /**
   * Initialize VAD widget for visual voice activity feedback
   */
  private initializeVADWidget(container: HTMLElement): void {
    if (!this.voiceSystem) {
      return; // No voice system available
    }

    try {
      // Create VAD widget container
      const vadContainer = container.createEl('div', { cls: 'vad-widget-container' });
      vadContainer.style.cssText = `
        margin-left: 8px;
        display: inline-flex;
        align-items: center;
      `;

      // Configure VAD widget
      const vadConfig: Partial<VADWidgetConfig> = {
        enabled: true,
        size: 'medium',
        position: 'inline',
        showText: false,
        showConfidence: true,
        autoStart: false,
        voiceConfig: {
          enabled: true,
          wakeWord: 'clippy',
          wakeWordThreshold: 0.5,
          tts: { primary: 'WEB_SPEECH_TTS' as any, engines: {}, voice: 'default', speed: 1.0, volume: 0.8 },
          stt: { primary: 'WEB_SPEECH_STT' as any, engines: {}, language: 'en-US', timeout: 10000 },
          wakeWordConfig: { primary: 'KEYWORD_SPOTTING' as any, engines: {}, threshold: 0.5, models: [] },
          audio: { sampleRate: 16000, channels: 1, chunkSize: 4096 },
          fallbacks: { enableGracefulDegradation: true, showErrorNotifications: false, useTextFallback: true }
        },
        vadConfig: {
          enabled: true,
          algorithm: 'simple',
          thresholds: { speech: 0.5, silence: 0.35, confidence: 0.8 },
          sampleRate: 16000,
          frameSize: 512
        },
        onStateChange: (state) => {
          // Update voice button appearance based on VAD state
          this.updateVoiceButtonFromVAD(state);
        },
        onError: (error) => {
          console.error('[Vault Agent] VAD Widget Error:', error);
          this.addMessage('assistant', `⚠️ Voice detection error: ${error.message}`);
        }
      };

      // Create VAD widget
      this.vadWidget = new VADWidget(vadContainer, vadConfig);

      console.log('[Vault Agent] VAD widget initialized');
    } catch (error) {
      console.error('[Vault Agent] Failed to initialize VAD widget:', error);
    }
  }

  /**
   * Update voice button appearance based on VAD state
   */
  private updateVoiceButtonFromVAD(state: { vadState: string; confidence: number; isActive: boolean }): void {
    if (!this.voiceBtn || !this.isVoiceMode) return;

    // Update button styling based on VAD state
    const button = this.voiceBtn;
    
    // Remove existing VAD classes
    button.classList.remove('vad-silent', 'vad-speech', 'vad-noise');
    
    // Add current VAD state class
    button.classList.add(`vad-${state.vadState}`);
    
    // Update button title with confidence info
    const confidencePercent = Math.round(state.confidence * 100);
    button.title = `Voice mode active - ${state.vadState} detected (${confidencePercent}% confidence)`;
    
    // Add subtle visual feedback for high-confidence speech
    if (state.vadState === 'speech' && state.confidence > 0.8) {
      button.style.transform = 'scale(1.05)';
      button.style.transition = 'transform 0.1s ease';
    } else {
      button.style.transform = '';
    }
  }

  private getVoiceSystemFromPlugin(): LocalVoiceIntegration | null {
    return this.plugin.voiceSystemV2 || null;
  }

  /**
   * Load existing conversation or start new one
   */
  private async loadOrStartConversation(): Promise<void> {
    const currentConversation = this.conversationManager.getCurrentConversation();
    
    if (currentConversation) {
      console.log('[Conversation] Loading existing conversation:', currentConversation.id);
      const messages = this.conversationManager.getCurrentMessages();
      this.loadConversationMessages(messages);
      this.updateActiveContext(currentConversation.activeContext);
    } else {
      console.log('[Conversation] Starting new conversation');
      await this.conversationManager.startNewConversation();
      this.addWelcomeMessage();
    }
  }

  /**
   * Start a new conversation
   */
  private async startNewConversation(): Promise<void> {
    console.log('[Conversation] User starting new conversation');
    
    // Clear current chat display
    this.chatHistoryEl.empty();
    this.chatHistory = [];
    
    // Start new conversation
    await this.conversationManager.startNewConversation();
    
    // Show welcome message
    this.addWelcomeMessage();
    
    // Reset context
    this.context.recentlyMentionedFiles = [];
    this.context.activeContext = {
      lastCreatedFile: undefined,
      lastMentionedFile: undefined,
      currentWorkingFile: undefined
    };
  }

  /**
   * Show conversation history browser
   */
  private showConversationHistory(): void {
    const modal = new ConversationBrowserModal(
      this.app,
      this.conversationManager,
      (conversationId) => this.loadConversation(conversationId),
      () => this.startNewConversation()
    );
    modal.open();
  }

  /**
   * Load a specific conversation
   */
  private async loadConversation(conversationId: string): Promise<void> {
    try {
      console.log('[Conversation] Loading conversation:', conversationId);
      
      // Clear current display
      this.chatHistoryEl.empty();
      this.chatHistory = [];
      
      // Load conversation
      const messages = await this.conversationManager.loadConversation(conversationId);
      const conversation = this.conversationManager.getCurrentConversation();
      
      if (conversation) {
        // Update active context
        this.updateActiveContext(conversation.activeContext);
        
        // Load messages into UI
        this.loadConversationMessages(messages);
        
        // Update status
        this.statusEl.textContent = `📖 Loaded conversation: ${conversation.title}`;
        setTimeout(() => {
          this.statusEl.textContent = this.isVoiceMode ? '🎤 Voice Mode' : '💬 Text Mode';
        }, 3000);
      }
      
    } catch (error) {
      console.error('[Conversation] Failed to load conversation:', error);
      this.addMessage('assistant', `❌ Failed to load conversation: ${error.message}`);
    }
  }

  /**
   * Load conversation messages into the UI
   */
  private loadConversationMessages(messages: ConversationMessage[]): void {
    for (const message of messages) {
      const messageEl = this.addMessage(message.role, message.content);
      
      // Add thinking sections if present
      if (message.thinking && message.thinking.length > 0) {
        message.thinking.forEach(thinkingContent => {
          this.addThinkingSection(messageEl, thinkingContent);
        });
      }
      
      // Add tool call information if present
      if (message.toolCalls && message.toolCalls.length > 0) {
        const toolInfo = message.toolCalls.map(tool => 
          `${tool.success ? '✅' : '❌'} ${tool.tool}: ${tool.result}`
        ).join('\n');
        
        // Add as a small info section
        const toolEl = messageEl.createEl('div', { cls: 'message-tool-info' });
        toolEl.style.cssText = `
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
          padding: 6px;
          background: var(--background-secondary-alt);
          border-radius: 4px;
          border-left: 3px solid var(--interactive-accent);
        `;
        toolEl.textContent = toolInfo;
      }
    }
  }

  /**
   * Update active context from conversation metadata
   */
  private updateActiveContext(activeContext: any): void {
    this.context.activeContext = {
      lastCreatedFile: activeContext.lastCreatedFile,
      lastMentionedFile: activeContext.lastMentionedFile,  
      currentWorkingFile: activeContext.currentWorkingFile
    };
    
    // Also update conversation manager context
    this.conversationManager.updateActiveContext(activeContext);
  }

  /**
   * Handle streaming response with thinking sections
   */
  private async handleStreamingResponse(message: string): Promise<void> {
    let currentMessageEl: HTMLElement | null = null;
    let currentContentEl: HTMLElement | null = null;
    let currentThinkingEl: HTMLElement | null = null;
    let streamingCursor: HTMLElement | null = null;
    let fullResponse = ''; // Only includes clean text, not thinking content
    let chunkCount = 0;
    
    console.log('[Vault Agent] Starting streaming response handler');
    
    try {
      // Ensure context has latest conversation history
      this.context.conversationHistory = this.chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
      
      console.log('[Vault Agent] Getting streaming generator...');
      const streamGenerator = this.voiceAgent.processMessageStreaming(message, this.context);
      console.log('[Vault Agent] Stream generator created:', streamGenerator);
      
      for await (const chunk of streamGenerator) {
        chunkCount++;
        console.log(`[Vault Agent] Received chunk ${chunkCount}:`, chunk);
        if (chunk.type === 'thinking') {
          console.log('[Vault Agent] Received thinking chunk, creating toggleable section');
          
          // Ensure message element exists first
          if (!currentMessageEl) {
            console.log('[Vault Agent] Creating message element for thinking section');
            currentMessageEl = this.addMessage('assistant', '', true);
            currentContentEl = currentMessageEl.querySelector('.message-content') as HTMLElement;
            streamingCursor = currentContentEl?.querySelector('.streaming-cursor') as HTMLElement;
          }
          
          // Add thinking section if not exists - place at the top of message
          if (!currentThinkingEl && currentMessageEl) {
            console.log('[Vault Agent] Adding thinking section to message element');
            const messageHeader = currentMessageEl.querySelector('.message-header') as HTMLElement;
            currentThinkingEl = this.createThinkingSectionElement(chunk.content);
            
            // Insert thinking section immediately after the message header (avatar + content)
            if (messageHeader && currentThinkingEl) {
              messageHeader.parentNode?.insertBefore(currentThinkingEl, messageHeader.nextSibling);
            }
          } else if (currentThinkingEl) {
            // Update existing thinking content
            const thinkingContent = currentThinkingEl.querySelector('.thinking-content') as HTMLElement;
            if (thinkingContent) {
              thinkingContent.innerHTML = this.formatAssistantMessage(chunk.content);
            }
          }
        } else if (chunk.type === 'text') {
          // Initialize message element if not exists
          if (!currentMessageEl) {
            console.log('[Vault Agent] Creating new message element for streaming');
            currentMessageEl = this.addMessage('assistant', '', true);
            currentContentEl = currentMessageEl.querySelector('.message-content') as HTMLElement;
            streamingCursor = currentContentEl?.querySelector('.streaming-cursor') as HTMLElement;
          }
          
          if (currentContentEl) {
            // Remove cursor temporarily
            if (streamingCursor) {
              streamingCursor.remove();
            }
            
            // Add new content - Note: chunk.content should be the NEXT part, not cumulative
            fullResponse += chunk.content;
            console.log('[Vault Agent] Updating content. Chunk:', chunk.content, 'Full so far:', fullResponse.length, 'chars');
            currentContentEl.innerHTML = this.formatAssistantMessage(fullResponse);
            
            // Re-add cursor
            if (streamingCursor) {
              currentContentEl.appendChild(streamingCursor);
            }
            
            // Scroll to bottom
            this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
          }
        } else if (chunk.type === 'tool_result') {
          // Add tool result as separate message
          this.addMessage('assistant', chunk.content);
        }
      }
      
      // Remove streaming cursor when complete
      if (streamingCursor) {
        streamingCursor.remove();
      }
      
      // Add assistant message to conversation manager (for streaming responses)
      if (fullResponse) {
        // Extract thinking from fullResponse for the conversation manager
        const { thinking, cleanResponse } = this.extractThinkingFromResponse(fullResponse);
        this.conversationManager.addMessage({
          role: 'assistant',
          content: cleanResponse,
          timestamp: new Date(),
          thinking: thinking.length > 0 ? thinking : undefined
        });
        console.log('[Conversation] Added streaming response to conversation manager');
      }
      
      // Speak final response if voice mode is enabled (filter out thinking content for TTS)
      if (this.isVoiceMode && this.voiceSystem && this.voiceSystem.isActive && currentMessageEl && fullResponse) {
        // Extract clean response without thinking content for TTS
        const { thinking, cleanResponse } = this.extractThinkingFromResponse(fullResponse);
        
        console.log('[Vault Agent] Original response length:', fullResponse.length, 'Clean response length:', cleanResponse.length);
        console.log('[Vault Agent] Original response preview:', fullResponse.substring(0, 100) + '...');
        console.log('[Vault Agent] Clean response preview:', cleanResponse.substring(0, 100) + '...');
        console.log('[Vault Agent] Extracted thinking sections:', thinking.length);
        console.log('[Vault Agent] Filtered out thinking content. Contains <think>:', fullResponse.includes('<think'));
        
        // Only speak if there's actual clean content (not just thinking)
        if (cleanResponse.trim().length > 0) {
          console.log('[Vault Agent] Speaking non-empty clean response for TTS');
          await this.speakWithSpectrum(cleanResponse, currentMessageEl);
        } else {
          console.log('[Vault Agent] No clean response content to speak (was all thinking)');
          // Hide spectrum container since there's nothing to speak
          const spectrumContainer = currentMessageEl.querySelector('.tts-spectrum-container') as HTMLElement;
          if (spectrumContainer) {
            spectrumContainer.style.display = 'none';
          }
          this.resetAudioReactiveBorder(currentMessageEl);
          this.currentSpeakingMessage = null;
        }
      }
      
    } catch (error) {
      console.error('CLIPPY Vault Agent: Error in streaming response:', error);
      this.addMessage('assistant', `❌ Streaming Error: ${error.message}`);
    }
  }

  /**
   * Add a collapsible thinking section to a message
   */
  private addThinkingSection(messageEl: HTMLElement, content: string): HTMLElement {
    console.log('[Vault Agent] Creating thinking section with content:', content.substring(0, 100) + '...');
    const thinkingContainer = this.createThinkingSectionElement(content);
    
    // Find the message header and insert thinking section immediately after it
    const messageHeader = messageEl.querySelector('.message-header') as HTMLElement;
    if (messageHeader) {
      messageHeader.parentNode?.insertBefore(thinkingContainer, messageHeader.nextSibling);
    } else {
      // Fallback: add to message element directly
      messageEl.appendChild(thinkingContainer);
    }
    
    console.log('[Vault Agent] Thinking section created and added to message element');
    return thinkingContainer;
  }

  /**
   * Create a thinking section element without adding it to DOM
   */
  private createThinkingSectionElement(content: string): HTMLElement {
    console.log('[Vault Agent] Creating thinking section element with content:', content.substring(0, 100) + '...');
    
    const thinkingContainer = document.createElement('div');
    thinkingContainer.className = 'thinking-container';
    thinkingContainer.style.cssText = `
      margin: 8px 0 12px 32px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-secondary-alt);
      overflow: hidden;
      display: block !important;
      visibility: visible !important;
    `;
    
    // Collapsible header
    const thinkingHeader = thinkingContainer.createEl('div', { cls: 'thinking-header' });
    thinkingHeader.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: var(--background-modifier-hover);
      cursor: pointer;
      border-bottom: 1px solid var(--background-modifier-border);
      user-select: none;
      transition: background-color 0.2s ease;
    `;
    
    // Toggle icon
    const toggleIcon = thinkingHeader.createEl('span', { cls: 'thinking-toggle' });
    toggleIcon.textContent = '▶';
    toggleIcon.style.cssText = `
      margin-right: 8px;
      transition: transform 0.2s ease;
      font-size: 12px;
      color: var(--text-muted);
    `;
    
    // Header text
    const headerText = thinkingHeader.createEl('span', { cls: 'thinking-header-text' });
    headerText.textContent = '🤔 Thinking... (click to expand)';
    headerText.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    `;
    
    // Content container (initially collapsed)
    const thinkingContent = thinkingContainer.createEl('div', { cls: 'thinking-content' });
    thinkingContent.style.cssText = `
      padding: 12px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      line-height: 1.4;
      font-size: 13px;
      color: var(--text-muted);
      font-style: italic;
    `;
    
    // Set initial content
    thinkingContent.innerHTML = this.formatAssistantMessage(content);
    
    // Add toggle functionality
    let isExpanded = false;
    thinkingHeader.addEventListener('click', () => {
      isExpanded = !isExpanded;
      
      if (isExpanded) {
        thinkingContent.style.maxHeight = `${thinkingContent.scrollHeight}px`;
        toggleIcon.style.transform = 'rotate(90deg)';
        headerText.textContent = '🤔 Thinking... (click to hide)';
      } else {
        thinkingContent.style.maxHeight = '0';
        toggleIcon.style.transform = 'rotate(0deg)';
        headerText.textContent = '🤔 Thinking... (click to expand)';
      }
    });
    
    // Hover effects
    thinkingHeader.addEventListener('mouseenter', () => {
      thinkingHeader.style.backgroundColor = 'var(--background-modifier-border-hover)';
    });
    
    thinkingHeader.addEventListener('mouseleave', () => {
      thinkingHeader.style.backgroundColor = 'var(--background-modifier-hover)';
    });
    
    return thinkingContainer;
  }

  /**
   * Extract thinking content from response text
   */
  private extractThinkingFromResponse(response: string): { thinking: string[], cleanResponse: string } {
    console.log('[Thinking] Extracting thinking from response:', response.substring(0, 200) + '...');
    
    const thinking: string[] = [];
    let cleanResponse = response;
    
    // Handle malformed thinking tags - if response starts with <think> but no closing tag
    if (response.trimStart().startsWith('<think>') || response.trimStart().startsWith('<thinking>')) {
      console.log('[Thinking] Response starts with thinking tag, handling malformed case');
      
      // Check if there's a proper closing tag
      const hasClosingThink = response.includes('</think>') || response.includes('</thinking>');
      
      if (!hasClosingThink) {
        // Entire response is thinking content - extract it all
        const thinkStart = response.indexOf('<think>') !== -1 ? '<think>' : '<thinking>';
        const thinkContent = response.substring(response.indexOf(thinkStart) + thinkStart.length).trim();
        
        if (thinkContent.length > 0) {
          thinking.push(thinkContent);
          cleanResponse = ''; // No clean response, it's all thinking
          console.log('[Thinking] Extracted malformed thinking content:', thinkContent.substring(0, 100) + '...');
          console.log('[Thinking] Setting cleanResponse to empty string due to malformed thinking');
          return { thinking, cleanResponse }; // Return early to avoid further processing
        }
      }
    }
    
    // Extract all proper thinking blocks (both <thinking> and <think> formats)
    const thinkingRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/g;
    let match;
    
    while ((match = thinkingRegex.exec(response)) !== null) {
      thinking.push(match[1].trim());
      console.log('[Thinking] Found proper thinking content:', match[1].trim().substring(0, 100) + '...');
    }
    
    // Remove thinking blocks from the clean response and clean up extra whitespace
    cleanResponse = cleanResponse.replace(thinkingRegex, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // Remove malformed thinking tags at the start
    cleanResponse = cleanResponse.replace(/^<think(?:ing)?>[^]*$/, '').trim();
    
    console.log('[Thinking] Clean response for TTS:', cleanResponse.substring(0, 200) + '...');
    console.log('[Thinking] Found', thinking.length, 'thinking sections');
    
    return { thinking, cleanResponse };
  }
}