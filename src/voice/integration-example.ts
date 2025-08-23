/**
 * Integration Example for CLIPPY AI Assistant Voice System
 * Shows how to integrate the new voice system with the existing plugin
 */

import { Notice } from 'obsidian';
import { VoiceManager } from './managers/voice-manager';
import { DEFAULT_VOICE_CONFIG, createVoiceConfig } from './voice-config';
import { VoiceStatus, WakeWordDetection, TranscriptionResult } from './types/voice-types';

export class ClippyVoiceIntegration {
    private voiceManager: VoiceManager;
    private plugin: any; // Reference to main CLIPPY plugin
    private statusIndicator: HTMLElement | null = null;

    constructor(plugin: any) {
        this.plugin = plugin;
        
        // Create voice configuration from plugin settings
        const voiceConfig = createVoiceConfig({
            // Override defaults with plugin-specific settings
            wakeWord: this.plugin.settings?.voice?.wakeWord || 'hey clippy',
            tts: {
                ...DEFAULT_VOICE_CONFIG.tts,
                voice: this.plugin.settings?.voice?.ttsVoice || 'af_bella',
                speed: this.plugin.settings?.voice?.ttsSpeed || 1.0,
                volume: this.plugin.settings?.voice?.ttsVolume || 0.8
            },
            stt: {
                ...DEFAULT_VOICE_CONFIG.stt,
                language: this.plugin.settings?.voice?.sttLanguage || 'en-US'
            }
        });

        // Initialize voice manager
        this.voiceManager = new VoiceManager(voiceConfig);
        
        // Set up event handlers
        this.setupEventHandlers();
    }

    /**
     * Initialize the voice system
     */
    public async initialize(): Promise<void> {
        try {
            console.log('[ClippyVoice] Initializing new voice system...');
            
            // The VoiceManager initializes automatically in constructor
            // Add status indicator to Obsidian's status bar
            this.addStatusIndicator();
            
            console.log('[ClippyVoice] Voice system ready');
            new Notice('🎤 CLIPPY Voice System v2 ready');
            
        } catch (error) {
            console.error('[ClippyVoice] Initialization failed:', error);
            new Notice(`❌ Voice system initialization failed: ${error.message}`);
        }
    }

    /**
     * Start voice assistant
     */
    public async startVoice(): Promise<boolean> {
        try {
            const success = await this.voiceManager.start();
            if (success) {
                new Notice('🎤 Voice assistant activated - say "Hey Clippy" to start');
            } else {
                new Notice('❌ Failed to start voice assistant');
            }
            return success;
        } catch (error) {
            console.error('[ClippyVoice] Failed to start voice:', error);
            new Notice(`❌ Voice start failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop voice assistant
     */
    public async stopVoice(): Promise<void> {
        try {
            await this.voiceManager.stop();
            new Notice('🔇 Voice assistant deactivated');
        } catch (error) {
            console.error('[ClippyVoice] Failed to stop voice:', error);
        }
    }

    /**
     * Toggle voice assistant
     */
    public async toggleVoice(): Promise<void> {
        const isActive = this.voiceManager.isVoiceActive();
        
        if (isActive) {
            await this.stopVoice();
        } else {
            await this.startVoice();
        }
    }

    /**
     * Set up event handlers
     */
    private setupEventHandlers(): void {
        // Status changes
        this.voiceManager.on('status-changed', (state) => {
            this.updateStatusIndicator(state.status);
        });

        // Wake word detection
        this.voiceManager.on('wake-word-detected', (detection: WakeWordDetection) => {
            console.log(`[ClippyVoice] Wake word detected: ${detection.wakeWord}`);
            // Could integrate with main CLIPPY AI here
        });

        // Speech recognition
        this.voiceManager.on('speech-recognized', (result: TranscriptionResult) => {
            console.log(`[ClippyVoice] Speech recognized: "${result.text}"`);
            // Process voice command through main CLIPPY AI system
            this.processVoiceCommand(result.text);
        });

        // Errors
        this.voiceManager.on('error', (error) => {
            console.error(`[ClippyVoice] Voice error:`, error);
            if (error.error.includes('permission')) {
                new Notice('🎤 Microphone permission required for voice features');
            }
        });
    }

    /**
     * Process voice command through main CLIPPY system
     */
    private async processVoiceCommand(text: string): Promise<void> {
        try {
            // This would integrate with the main CLIPPY AI assistant
            // For now, just log and show a notice
            console.log(`[ClippyVoice] Processing command: "${text}"`);
            
            // Example integration points:
            if (text.toLowerCase().includes('enhance') || text.toLowerCase().includes('improve')) {
                new Notice('🤖 Voice command: Note enhancement requested');
                // Could trigger: this.plugin.showEnhancementModal(editor);
            } else if (text.toLowerCase().includes('tag')) {
                new Notice('🤖 Voice command: Tagging requested');
                // Could trigger: this.plugin.showTaggingModal(editor);
            } else {
                new Notice(`🤖 Voice command received: "${text}"`);
                // Could integrate with main AI provider
            }
            
        } catch (error) {
            console.error('[ClippyVoice] Command processing failed:', error);
        }
    }

    /**
     * Add status indicator to status bar
     */
    private addStatusIndicator(): void {
        if (this.plugin.addStatusBarItem) {
            this.statusIndicator = this.plugin.addStatusBarItem();
            this.statusIndicator.setText('🔴'); // Red - inactive
            this.statusIndicator.title = 'CLIPPY Voice v2: Inactive (click to toggle)';
            this.statusIndicator.style.cursor = 'pointer';
            this.statusIndicator.style.fontSize = '14px';
            
            // Add click handler
            this.statusIndicator.addEventListener('click', () => {
                this.toggleVoice();
            });
        }
    }

    /**
     * Update status indicator
     */
    private updateStatusIndicator(status: VoiceStatus): void {
        if (!this.statusIndicator) return;

        switch (status) {
            case VoiceStatus.INACTIVE:
                this.statusIndicator.setText('🔴'); // Red
                this.statusIndicator.title = 'CLIPPY Voice v2: Inactive (click to activate)';
                break;
            case VoiceStatus.INITIALIZING:
                this.statusIndicator.setText('🟠'); // Orange
                this.statusIndicator.title = 'CLIPPY Voice v2: Initializing...';
                break;
            case VoiceStatus.ACTIVE:
                this.statusIndicator.setText('🔵'); // Blue
                this.statusIndicator.title = 'CLIPPY Voice v2: Active (click to deactivate)';
                break;
            case VoiceStatus.LISTENING:
                this.statusIndicator.setText('🔵'); // Blue
                this.statusIndicator.title = 'CLIPPY Voice v2: Listening for "Hey Clippy"';
                break;
            case VoiceStatus.PROCESSING:
                this.statusIndicator.setText('🟡'); // Yellow
                this.statusIndicator.title = 'CLIPPY Voice v2: Processing command...';
                break;
            case VoiceStatus.SPEAKING:
                this.statusIndicator.setText('🟢'); // Green
                this.statusIndicator.title = 'CLIPPY Voice v2: Speaking...';
                break;
            case VoiceStatus.ERROR:
                this.statusIndicator.setText('🔴'); // Red
                this.statusIndicator.title = 'CLIPPY Voice v2: Error (click to retry)';
                break;
        }
    }

    /**
     * Get voice system status
     */
    public getStatus(): any {
        return {
            isActive: this.voiceManager.isVoiceActive(),
            state: this.voiceManager.getState(),
            // Add more status info as needed
        };
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        try {
            await this.voiceManager.cleanup();
            
            if (this.statusIndicator) {
                this.statusIndicator.remove();
                this.statusIndicator = null;
            }
            
            console.log('[ClippyVoice] Cleanup completed');
        } catch (error) {
            console.error('[ClippyVoice] Cleanup error:', error);
        }
    }

    /**
     * Manual speak function for testing
     */
    public async speak(text: string): Promise<boolean> {
        return await this.voiceManager.speak(text);
    }

    /**
     * Manual listen function for testing
     */
    public async listen(duration: number = 5): Promise<string | null> {
        return await this.voiceManager.listen(duration);
    }
}

// Export for use in main plugin
export { ClippyVoiceIntegration as default };