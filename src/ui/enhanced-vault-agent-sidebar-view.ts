/**
 * Enhanced Vault Agent Sidebar View
 * Integrates new GUI enhancements with the existing vault agent functionality
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { GUIEnhancementManager } from './components/gui-enhancement-manager';
import { EnhancedAudioVisualizer } from './components/visualizers/enhanced-audio-visualizer';
import { ClippyMascot } from './components/mascot/clippy-mascot';

export const ENHANCED_VAULT_AGENT_VIEW_TYPE = 'enhanced-vault-agent-view';

export class EnhancedVaultAgentSidebarView extends ItemView {
    private guiManager: GUIEnhancementManager | null = null;
    private audioVisualizer: EnhancedAudioVisualizer | null = null;
    private chatContainer: HTMLElement | null = null;
    private inputElement: HTMLTextAreaElement | null = null;
    private isVoiceMode: boolean = false;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return ENHANCED_VAULT_AGENT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Vault Agent (Enhanced)';
    }

    getIcon(): string {
        return 'bot';
    }

    async onOpen(): Promise<void> {
        await this.initializeEnhancedView();
    }

    private async initializeEnhancedView(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('enhanced-vault-agent-sidebar');

        // Initialize GUI Enhancement Manager
        this.guiManager = new GUIEnhancementManager(this.app, {
            enableMascot: true,
            enableParticles: true,
            enableGeometricPatterns: false, // Disabled in sidebar for performance
            enableAudioVisualizers: true,
            enableAdaptiveThemes: true,
            enableActivityTracking: true,
            performanceMode: 'medium'
        });

        await this.guiManager.initialize();

        // Create enhanced header
        this.createEnhancedHeader(container);

        // Create chat interface with enhancements
        this.createEnhancedChatInterface(container);

        // Create enhanced input area
        this.createEnhancedInputArea(container);

        // Create voice controls with visualizer
        this.createEnhancedVoiceControls(container);

        // Set up integration between components
        this.setupComponentIntegration();

        console.log('🚀 Enhanced Vault Agent Sidebar initialized');
    }

    private createEnhancedHeader(container: HTMLElement): void {
        const header = container.createEl('div', { cls: 'vault-agent-header enhanced-header' });
        
        const titleContainer = header.createEl('div', { cls: 'vault-agent-title-container' });
        titleContainer.createEl('span', { text: '🤖', cls: 'vault-agent-icon' });
        titleContainer.createEl('h3', { text: 'Vault Agent', cls: 'vault-agent-title' });

        const controlsContainer = header.createEl('div', { cls: 'vault-agent-controls' });
        
        // Enhanced status indicator
        const statusIndicator = controlsContainer.createEl('div', { 
            cls: 'vault-agent-status-indicator clippy-pulse-active',
            text: 'Ready'
        });

        // Theme switcher
        const themeBtn = controlsContainer.createEl('button', {
            cls: 'vault-agent-control-btn clippy-modern-button',
            text: '🎨'
        });
        themeBtn.onclick = () => this.cycleThemes();

        // Voice mode toggle
        const voiceBtn = controlsContainer.createEl('button', {
            cls: 'vault-agent-control-btn clippy-modern-button',
            text: '🎤'
        });
        voiceBtn.onclick = () => this.toggleVoiceMode();
    }

    private createEnhancedChatInterface(container: HTMLElement): void {
        this.chatContainer = container.createEl('div', { 
            cls: 'vault-agent-chat-container enhanced-chat-container' 
        });

        // Create chat history with enhanced styling
        const chatHistory = this.chatContainer.createEl('div', { 
            cls: 'vault-agent-chat-history enhanced-chat-history' 
        });

        // Add welcome message with animation
        this.addEnhancedMessage('assistant', '👋 Welcome! I\'m your enhanced vault agent. How can I help you today?', chatHistory);
    }

    private createEnhancedInputArea(container: HTMLElement): void {
        const inputContainer = container.createEl('div', { 
            cls: 'vault-agent-input-container enhanced-input-container' 
        });

        // Create modern input with floating label
        const inputGroup = inputContainer.createEl('div', { cls: 'clippy-floating-label' });
        
        this.inputElement = inputGroup.createEl('textarea', { 
            cls: 'vault-agent-input clippy-modern-input',
            attr: { placeholder: ' ', rows: '1' }
        }) as HTMLTextAreaElement;

        const label = inputGroup.createEl('label', { text: 'Type your message...' });

        // Enhanced send button
        const sendBtn = inputContainer.createEl('button', {
            cls: 'vault-agent-send-btn clippy-modern-button',
            text: '✨ Send'
        });

        // Set up enhanced input handling
        this.setupEnhancedInputHandling();

        sendBtn.onclick = () => this.handleEnhancedSend();
    }

    private createEnhancedVoiceControls(container: HTMLElement): void {
        const voiceContainer = container.createEl('div', { 
            cls: 'vault-agent-voice-container enhanced-voice-container' 
        });

        // Voice status indicator
        const voiceStatus = voiceContainer.createEl('div', {
            cls: 'voice-status-indicator',
            text: 'Voice: Ready'
        });

        // Audio visualizer container
        const visualizerContainer = voiceContainer.createEl('div', { 
            cls: 'audio-visualizer-container' 
        });

        // Create compact audio visualizer
        this.audioVisualizer = EnhancedAudioVisualizer.createCompactVisualizer(visualizerContainer);

        // Push-to-talk button with enhanced styling
        const pttBtn = voiceContainer.createEl('button', {
            cls: 'push-to-talk-btn enhanced-ptt-btn clippy-modern-button',
            text: '🎤 Hold to Talk'
        });

        // Enhanced voice interaction setup
        this.setupEnhancedVoiceInteraction(pttBtn, voiceStatus);
    }

    private setupComponentIntegration(): void {
        if (!this.guiManager) return;

        // Connect audio visualizer to GUI manager
        if (this.audioVisualizer) {
            // The GUI manager will automatically integrate with audio visualizers
            document.dispatchEvent(new CustomEvent('audio-visualizer-created', {
                detail: { visualizer: this.audioVisualizer, container: this.containerEl }
            }));
        }

        // Set up activity tracking for the chat interface
        if (this.inputElement) {
            this.inputElement.addEventListener('input', () => {
                this.guiManager?.handleVoiceActivity('processing');
            });
        }
    }

    private setupEnhancedInputHandling(): void {
        if (!this.inputElement) return;

        let typingTimer: number;
        let lastInputTime = 0;

        this.inputElement.addEventListener('input', (e) => {
            const now = Date.now();
            const timeSinceLastInput = now - lastInputTime;
            lastInputTime = now;

            // Calculate typing speed for activity tracking
            const typingSpeed = timeSinceLastInput < 200 ? 1 : 0.5;
            
            // Notify GUI manager of typing activity
            if (this.guiManager) {
                this.guiManager.handleVoiceActivity('processing');
            }

            // Auto-resize textarea
            this.autoResizeTextarea(this.inputElement as HTMLTextAreaElement);

            // Clear existing timer
            clearTimeout(typingTimer);

            // Set new timer for "stopped typing" detection
            typingTimer = window.setTimeout(() => {
                if (this.guiManager) {
                    // Switch to idle or thinking mode
                }
            }, 2000);
        });

        // Handle Enter key with Shift modifier
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleEnhancedSend();
            }
        });
    }

    private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
        textarea.style.height = newHeight + 'px';
    }

    private async handleEnhancedSend(): Promise<void> {
        if (!this.inputElement || !this.chatContainer) return;

        const message = this.inputElement.value.trim();
        if (!message) return;

        // Add user message with animation
        this.addEnhancedMessage('user', message, this.chatContainer.querySelector('.vault-agent-chat-history')!);

        // Clear input
        this.inputElement.value = '';
        this.autoResizeTextarea(this.inputElement);

        // Show thinking state
        if (this.guiManager) {
            this.guiManager.enterCommunicationMode();
        }

        // Add typing indicator
        const typingIndicator = this.addTypingIndicator();

        try {
            // Simulate AI processing (in real implementation, this would call your AI service)
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Remove typing indicator
            typingIndicator.remove();

            // Simulate AI response
            const responses = [
                "I understand what you're looking for! Let me search through your vault...",
                "That's a great question! Based on your notes, I found some relevant information...",
                "I've analyzed your vault and here are some insights...",
                "Let me help you with that! I found several related notes..."
            ];
            const response = responses[Math.floor(Math.random() * responses.length)];

            // Add AI response with animation
            this.addEnhancedMessage('assistant', response, this.chatContainer.querySelector('.vault-agent-chat-history')!);

            // Show success state
            if (this.guiManager) {
                this.guiManager.celebrateSuccess('Response generated!');
            }

        } catch (error) {
            // Remove typing indicator
            typingIndicator.remove();

            // Show error state
            if (this.guiManager) {
                this.guiManager.handleError('Failed to process message');
            }

            // Add error message
            this.addEnhancedMessage('assistant', '❌ Sorry, I encountered an error processing your request.', this.chatContainer.querySelector('.vault-agent-chat-history')!);
        }
    }

    private addEnhancedMessage(sender: 'user' | 'assistant', content: string, container: HTMLElement): void {
        const messageEl = container.createEl('div', { 
            cls: `vault-agent-message enhanced-message ${sender === 'user' ? 'user' : 'assistant'} clippy-bounce-element` 
        });

        // Avatar
        const avatar = messageEl.createEl('div', { 
            cls: 'message-avatar',
            text: sender === 'user' ? '👤' : '🤖'
        });

        // Message content
        const messageContent = messageEl.createEl('div', { cls: 'message-content' });
        messageContent.innerHTML = this.formatMessage(content);

        // Timestamp
        const timestamp = messageEl.createEl('div', { 
            cls: 'message-timestamp',
            text: new Date().toLocaleTimeString()
        });

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Add entrance animation
        setTimeout(() => {
            messageEl.classList.add('message-visible');
        }, 50);
    }

    private addTypingIndicator(): HTMLElement {
        const chatHistory = this.chatContainer?.querySelector('.vault-agent-chat-history');
        if (!chatHistory) throw new Error('Chat history not found');

        const typingEl = chatHistory.createEl('div', { cls: 'typing-indicator enhanced-typing' });
        
        const avatar = typingEl.createEl('div', { 
            cls: 'message-avatar',
            text: '🤖'
        });

        const dotsContainer = typingEl.createEl('div', { cls: 'clippy-typing-dots' });
        dotsContainer.createEl('div', { cls: 'clippy-typing-dot' });
        dotsContainer.createEl('div', { cls: 'clippy-typing-dot' });
        dotsContainer.createEl('div', { cls: 'clippy-typing-dot' });

        // Auto-scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;

        return typingEl;
    }

    private formatMessage(content: string): string {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    private setupEnhancedVoiceInteraction(pttBtn: HTMLElement, statusIndicator: HTMLElement): void {
        let isRecording = false;

        const startRecording = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                if (this.audioVisualizer) {
                    await this.audioVisualizer.connectToStream(stream);
                }

                isRecording = true;
                pttBtn.textContent = '🔴 Recording...';
                pttBtn.classList.add('recording');
                statusIndicator.textContent = 'Voice: Listening';

                if (this.guiManager) {
                    this.guiManager.handleVoiceActivity('listening');
                }

            } catch (error) {
                console.error('Voice recording failed:', error);
                statusIndicator.textContent = 'Voice: Error';
                
                if (this.guiManager) {
                    this.guiManager.handleError('Voice access denied');
                }
            }
        };

        const stopRecording = () => {
            if (this.audioVisualizer) {
                this.audioVisualizer.stop();
            }

            isRecording = false;
            pttBtn.textContent = '🎤 Hold to Talk';
            pttBtn.classList.remove('recording');
            statusIndicator.textContent = 'Voice: Processing...';

            if (this.guiManager) {
                this.guiManager.handleVoiceActivity('processing');
            }

            // Simulate voice processing
            setTimeout(() => {
                statusIndicator.textContent = 'Voice: Ready';
                if (this.guiManager) {
                    this.guiManager.celebrateSuccess('Voice message processed!');
                }
            }, 2000);
        };

        // Mouse events
        pttBtn.addEventListener('mousedown', startRecording);
        pttBtn.addEventListener('mouseup', stopRecording);
        pttBtn.addEventListener('mouseleave', () => {
            if (isRecording) stopRecording();
        });

        // Touch events for mobile
        pttBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRecording();
        });
        pttBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (isRecording) stopRecording();
        });
    }

    private cycleThemes(): void {
        if (!this.guiManager) return;

        const themes = ['adaptive-default', 'research-mode', 'communication-mode', 'high-activity', 'night-mode'];
        const currentTheme = this.guiManager.getStatus().performance.mode || 'adaptive-default';
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        // This would need to be implemented in the theme manager
        console.log(`Switching to theme: ${nextTheme}`);
    }

    private toggleVoiceMode(): void {
        this.isVoiceMode = !this.isVoiceMode;
        
        const voiceContainer = this.containerEl.querySelector('.vault-agent-voice-container');
        if (voiceContainer) {
            voiceContainer.classList.toggle('voice-mode-active', this.isVoiceMode);
        }

        if (this.guiManager) {
            if (this.isVoiceMode) {
                this.guiManager.enterCommunicationMode();
            }
        }

        console.log(`Voice mode: ${this.isVoiceMode ? 'ON' : 'OFF'}`);
    }

    async onClose(): Promise<void> {
        // Cleanup GUI enhancements
        if (this.guiManager) {
            this.guiManager.destroy();
            this.guiManager = null;
        }

        if (this.audioVisualizer) {
            this.audioVisualizer.destroy();
            this.audioVisualizer = null;
        }
    }
}