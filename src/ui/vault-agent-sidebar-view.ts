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

export const VIEW_TYPE_VAULT_AGENT = 'clippy-vault-agent-view';

export class VaultAgentSidebarView extends ItemView {
  private plugin: ClippyPlugin;
  private settings: ClippySettings;
  private voiceAgent: VoiceVaultAgent;
  private voiceSystem: LocalVoiceIntegration | null = null;
  private context: AgentContext;

  // UI elements
  private chatHistoryEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private voiceBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private toolsBtn: HTMLButtonElement;
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
      sessionId: Date.now().toString()
    };

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
    this.createSidebarInterface();
    this.addWelcomeMessage();
  }

  async onClose(): Promise<void> {
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

    // Tools button
    this.toolsBtn = header.createEl('button', { 
      text: '🔧',
      title: 'Show available tools'
    });
    this.toolsBtn.addClass('vault-agent-tools-btn');
    this.toolsBtn.addEventListener('click', () => this.showToolsInChat());

    // Voice button
    this.voiceBtn = header.createEl('button', { 
      text: '🎤',
      title: 'Toggle voice mode'
    });
    this.voiceBtn.addClass('vault-agent-voice-btn');
    this.voiceBtn.addEventListener('click', () => this.toggleVoiceMode());

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

  private addMessage(role: 'user' | 'assistant', content: string): HTMLElement {
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
      spectrumContainer.innerHTML = '<div style="padding: 8px; color: var(--text-muted); font-size: 12px; text-align: center;">🎵 Spectrum visualizer will appear here during speech</div>';
      
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
    
    try {
      // Find spectrum container in the message element
      const spectrumContainer = messageEl.querySelector('.tts-spectrum-container') as HTMLElement;
      if (!spectrumContainer) {
        console.log('[TTS Spectrum] No spectrum container found, falling back to regular TTS');
        await this.voiceAgent.speak(text);
        return;
      }
      
      console.log('[TTS Spectrum] Spectrum container found, initializing visualization');

      // Show spectrum container
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

      // Add speaking status indicator with pulse animation
      const statusEl = spectrumContainer.createEl('div', { cls: 'tts-status' });
      statusEl.style.cssText = `
        padding: 4px 8px;
        background: var(--interactive-accent);
        color: white;
        border-radius: 12px;
        font-size: 11px;
        margin-bottom: 8px;
        display: inline-block;
        animation: pulse 1.5s ease-in-out infinite;
      `;
      statusEl.textContent = '🔊 Speaking...';
      
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

    try {
      // Update context with current note if available
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      this.context.currentNote = activeView?.file || undefined;
      this.context.workingDirectory = activeView?.file?.parent?.path || 'root';

      // Process message through voice agent
      const response = await this.voiceAgent.processMessage(message, this.context);
      
      // Add response to chat
      const messageEl = this.addMessage('assistant', response);
      
      // Speak response if voice mode is enabled
      if (this.isVoiceMode && this.voiceSystem && this.voiceSystem.isActive) {
        await this.speakWithSpectrum(response, messageEl);
      }

    } catch (error) {
      console.error('CLIPPY Vault Agent: Error processing message:', error);
      this.addMessage('assistant', `❌ Error: ${error.message}`);
    } finally {
      this.setProcessing(false);
    }
  }

  private addWelcomeMessage(): void {
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

🎤 Enable voice mode for hands-free interaction!`;

    this.addMessage('assistant', welcomeMessage);
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
      // Voice system activation is handled internally

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

      // Process through voice agent
      const response = await this.voiceAgent.processVoiceMessage(message, this.context);
      
      // Handle VoiceResponse type
      if (typeof response === 'string') {
        const messageEl = this.addMessage('assistant', response);
        // Speak if voice mode is enabled
        if (this.isVoiceMode && this.voiceSystem && this.voiceSystem.isActive) {
          await this.speakWithSpectrum(response, messageEl);
        }
      } else {
        const messageEl = this.addMessage('assistant', response.textResponse);
        
        // Speak if voice response is available
        if (response.shouldSpeak && response.spokenResponse && this.voiceSystem) {
          await this.speakWithSpectrum(response.spokenResponse, messageEl);
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
}