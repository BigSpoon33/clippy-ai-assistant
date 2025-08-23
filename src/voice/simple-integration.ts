/**
 * Simplified Voice Integration for CLIPPY AI Assistant
 * A minimal working implementation to resolve integration issues
 */

import { Notice } from 'obsidian';

// TypeScript declarations for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export class SimpleVoiceIntegration {
    private plugin: any;
    private isActive: boolean = false;
    private statusIndicator: HTMLElement | null = null;
    private isListening: boolean = false;
    private continuousListening: boolean = false;

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    /**
     * Initialize the voice system
     */
    public async initialize(): Promise<void> {
        try {
            console.log('[CLIPPY Voice v2] Initializing simplified voice system...');
            this.addStatusIndicator();
            console.log('[CLIPPY Voice v2] Voice system ready');
            new Notice('🎤 CLIPPY Voice System v2 ready (simplified)');
        } catch (error) {
            console.error('[CLIPPY Voice v2] Initialization failed:', error);
            new Notice(`❌ Voice system initialization failed: ${error.message}`);
        }
    }

    /**
     * Toggle voice assistant
     */
    public async toggleVoice(): Promise<void> {
        if (this.isActive) {
            await this.stopVoice();
        } else {
            await this.startVoice();
        }
    }

    /**
     * Start voice assistant
     */
    public async startVoice(): Promise<boolean> {
        try {
            this.isActive = true;
            this.updateStatusIndicator();
            new Notice('🎤 Voice assistant v2 activated - Click the status icon to start listening');
            console.log('[CLIPPY Voice v2] Voice assistant started');
            
            // Start continuous listening if network allows
            this.startContinuousListening();
            
            return true;
        } catch (error) {
            console.error('[CLIPPY Voice v2] Failed to start voice:', error);
            new Notice(`❌ Voice start failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop voice assistant
     */
    public async stopVoice(): Promise<void> {
        try {
            this.isActive = false;
            this.continuousListening = false;
            this.isListening = false;
            this.updateStatusIndicator();
            new Notice('🔇 Voice assistant v2 deactivated');
            console.log('[CLIPPY Voice v2] Voice assistant stopped');
        } catch (error) {
            console.error('[CLIPPY Voice v2] Failed to stop voice:', error);
        }
    }

    /**
     * Start continuous listening for wake words
     */
    private async startContinuousListening(): Promise<void> {
        if (!this.isActive || this.continuousListening) return;
        
        // Since network STT is failing, we'll use a manual approach
        // Users can click the status indicator to trigger listening
        console.log('[CLIPPY Voice v2] Continuous listening ready (manual trigger)');
        this.continuousListening = true;
        this.updateStatusIndicator();
    }

    /**
     * Manual listening trigger (called when user clicks status indicator)
     */
    public async triggerListening(): Promise<void> {
        if (!this.isActive || this.isListening) return;
        
        try {
            this.isListening = true;
            this.updateStatusIndicator();
            
            console.log('[CLIPPY Voice v2] Manual listening triggered');
            new Notice('🎤 Listening for voice command...');
            
            const result = await this.listen(10); // Listen for 10 seconds
            
            if (result) {
                await this.processVoiceCommand(result);
            } else {
                new Notice('No speech detected');
            }
        } catch (error) {
            console.error('[CLIPPY Voice v2] Manual listening failed:', error);
            new Notice(`❌ Listening failed: ${error.message}`);
        } finally {
            this.isListening = false;
            this.updateStatusIndicator();
        }
    }

    /**
     * Process voice command
     */
    private async processVoiceCommand(text: string): Promise<void> {
        console.log(`[CLIPPY Voice v2] Processing command: "${text}"`);
        
        const lowerText = text.toLowerCase();
        
        // Check for wake words first
        if (lowerText.includes('hey clippy') || lowerText.includes('clippy')) {
            await this.speak('Yes, I\'m listening. What can I help you with?');
            
            // Listen for the actual command
            setTimeout(async () => {
                try {
                    this.isListening = true;
                    this.updateStatusIndicator();
                    
                    const command = await this.listen(8);
                    if (command) {
                        await this.handleCommand(command);
                    }
                } catch (error) {
                    console.error('[CLIPPY Voice v2] Command listening failed:', error);
                } finally {
                    this.isListening = false;
                    this.updateStatusIndicator();
                }
            }, 1000);
        } else {
            // Direct command without wake word
            await this.handleCommand(text);
        }
    }

    /**
     * Handle voice commands
     */
    private async handleCommand(command: string): Promise<void> {
        const lowerCommand = command.toLowerCase();
        
        console.log(`[CLIPPY Voice v2] Handling command: "${command}"`);
        
        if (lowerCommand.includes('enhance') || lowerCommand.includes('improve')) {
            await this.speak('I\'ll enhance the current note for you.');
            new Notice('🤖 Voice command: Note enhancement triggered');
        } else if (lowerCommand.includes('tag')) {
            await this.speak('I\'ll suggest some tags for this note.');
            new Notice('🤖 Voice command: Tagging triggered');
        } else if (lowerCommand.includes('summarize')) {
            await this.speak('I\'ll create a summary of this note.');
            new Notice('🤖 Voice command: Summarization triggered');
        } else if (lowerCommand.includes('stop') || lowerCommand.includes('disable')) {
            await this.speak('Voice assistant disabled.');
            await this.stopVoice();
        } else {
            await this.speak(`I heard you say: ${command}. I'm still learning how to help with that.`);
            new Notice(`🤖 Voice command received: "${command}"`);
        }
    }

    /**
     * Test speech synthesis
     */
    public async speak(text: string): Promise<boolean> {
        try {
            console.log(`[CLIPPY Voice v2] Speaking: "${text}"`);
            
            // Use Web Speech API as fallback
            if ('speechSynthesis' in window) {
                return new Promise((resolve, reject) => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    
                    // Wait for voices to load
                    const setVoiceAndSpeak = () => {
                        const voices = speechSynthesis.getVoices();
                        console.log(`[CLIPPY Voice v2] Available voices: ${voices.length}`);
                        
                        if (voices.length > 0) {
                            // Try to find an English voice
                            const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                            utterance.voice = englishVoice;
                            console.log(`[CLIPPY Voice v2] Using voice: ${englishVoice.name} (${englishVoice.lang})`);
                        }
                        
                        utterance.volume = 1.0;
                        utterance.rate = 1.0;
                        utterance.pitch = 1.0;
                        
                        utterance.onstart = () => {
                            console.log('[CLIPPY Voice v2] Speech started');
                        };
                        
                        utterance.onend = () => {
                            console.log('[CLIPPY Voice v2] Speech completed');
                            resolve(true);
                        };
                        
                        utterance.onerror = (event: any) => {
                            console.error('[CLIPPY Voice v2] Speech error:', event);
                            new Notice(`❌ Speech synthesis failed: ${event.error}`);
                            reject(new Error(event.error));
                        };
                        
                        // Cancel any ongoing speech
                        speechSynthesis.cancel();
                        
                        // Small delay to ensure cancellation is processed
                        setTimeout(() => {
                            speechSynthesis.speak(utterance);
                        }, 100);
                    };
                    
                    // Check if voices are already loaded
                    if (speechSynthesis.getVoices().length > 0) {
                        setVoiceAndSpeak();
                    } else {
                        // Wait for voices to load
                        speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
                        
                        // Timeout after 5 seconds
                        setTimeout(() => {
                            console.warn('[CLIPPY Voice v2] Voice loading timeout, proceeding anyway');
                            setVoiceAndSpeak();
                        }, 5000);
                    }
                });
            } else {
                console.warn('[CLIPPY Voice v2] Speech synthesis not available');
                new Notice('Speech synthesis not available in this environment');
                return false;
            }
        } catch (error) {
            console.error('[CLIPPY Voice v2] Speech synthesis failed:', error);
            new Notice(`❌ Speech failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Test speech recognition
     */
    public async listen(duration: number = 5): Promise<string | null> {
        try {
            console.log(`[CLIPPY Voice v2] Listening for ${duration} seconds...`);
            
            // Check browser support
            if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
                console.warn('[CLIPPY Voice v2] Speech recognition not available');
                new Notice('Speech recognition not available in this environment');
                return null;
            }
            
            // Check for secure context (HTTPS/localhost)
            if (!window.isSecureContext) {
                new Notice('Speech recognition requires secure context (HTTPS)');
                return null;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;
            
            return new Promise((resolve, reject) => {
                let hasResult = false;
                
                const timeout = setTimeout(() => {
                    if (!hasResult) {
                        recognition.stop();
                        console.log('[CLIPPY Voice v2] Listening timeout - no speech detected');
                        resolve(null);
                    }
                }, duration * 1000);
                
                recognition.onstart = () => {
                    console.log('[CLIPPY Voice v2] Speech recognition started - speak now!');
                    new Notice(`🎤 Listening for ${duration} seconds... Speak now!`);
                };
                
                recognition.onresult = (event: any) => {
                    hasResult = true;
                    clearTimeout(timeout);
                    
                    if (event.results && event.results.length > 0) {
                        const result = event.results[0][0].transcript;
                        const confidence = event.results[0][0].confidence;
                        console.log(`[CLIPPY Voice v2] Recognized: "${result}" (confidence: ${confidence})`);
                        resolve(result);
                    } else {
                        console.log('[CLIPPY Voice v2] No speech detected');
                        resolve(null);
                    }
                };
                
                recognition.onerror = (event: any) => {
                    hasResult = true;
                    clearTimeout(timeout);
                    
                    console.error('[CLIPPY Voice v2] Speech recognition error:', event.error);
                    
                    // Handle specific error types
                    switch (event.error) {
                        case 'network':
                            new Notice('❌ Network error - check internet connection');
                            reject(new Error('Network error: Check internet connection for speech recognition'));
                            break;
                        case 'not-allowed':
                            new Notice('❌ Microphone permission denied');
                            reject(new Error('Microphone permission denied'));
                            break;
                        case 'no-speech':
                            console.log('[CLIPPY Voice v2] No speech detected');
                            resolve(null);
                            break;
                        case 'aborted':
                            console.log('[CLIPPY Voice v2] Speech recognition aborted');
                            resolve(null);
                            break;
                        default:
                            new Notice(`❌ Speech recognition error: ${event.error}`);
                            reject(new Error(event.error));
                    }
                };
                
                recognition.onend = () => {
                    console.log('[CLIPPY Voice v2] Speech recognition ended');
                    if (!hasResult) {
                        clearTimeout(timeout);
                        resolve(null);
                    }
                };
                
                // Request microphone permission and start recognition
                try {
                    recognition.start();
                } catch (startError) {
                    clearTimeout(timeout);
                    console.error('[CLIPPY Voice v2] Failed to start recognition:', startError);
                    reject(startError);
                }
            });
        } catch (error) {
            console.error('[CLIPPY Voice v2] Speech recognition failed:', error);
            new Notice(`❌ Speech recognition failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get voice system status
     */
    public getStatus(): any {
        return {
            isActive: this.isActive,
            simplified: true,
            capabilities: {
                tts: 'speechSynthesis' in window,
                stt: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
            }
        };
    }

    /**
     * Add status indicator to status bar
     */
    private addStatusIndicator(): void {
        if (this.plugin.addStatusBarItem) {
            this.statusIndicator = this.plugin.addStatusBarItem();
            this.statusIndicator!.setText('🔴'); // Red - inactive
            this.statusIndicator!.title = 'CLIPPY Voice v2: Inactive (click to toggle)';
            this.statusIndicator!.style.cursor = 'pointer';
            this.statusIndicator!.style.fontSize = '14px';
            
            // Add click handler with improved behavior
            this.statusIndicator!.addEventListener('click', async () => {
                if (!this.isActive) {
                    await this.toggleVoice();
                } else if (this.continuousListening && !this.isListening) {
                    // If active and ready, trigger listening
                    await this.triggerListening();
                } else {
                    // If already listening or not ready, toggle off
                    await this.toggleVoice();
                }
            });
        }
    }

    /**
     * Update status indicator
     */
    private updateStatusIndicator(): void {
        if (!this.statusIndicator) return;

        if (!this.isActive) {
            this.statusIndicator!.setText('🔴'); // Red - inactive
            this.statusIndicator!.title = 'CLIPPY Voice v2: Inactive (click to activate)';
        } else if (this.isListening) {
            this.statusIndicator!.setText('🟢'); // Green - actively listening
            this.statusIndicator!.title = 'CLIPPY Voice v2: Listening... (click to stop)';
        } else if (this.continuousListening) {
            this.statusIndicator!.setText('🔵'); // Blue - ready to listen
            this.statusIndicator!.title = 'CLIPPY Voice v2: Ready (click to start listening)';
        } else {
            this.statusIndicator!.setText('🟡'); // Yellow - active but not ready
            this.statusIndicator!.title = 'CLIPPY Voice v2: Active (click to deactivate)';
        }
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        try {
            this.isActive = false;
            
            if (this.statusIndicator) {
                this.statusIndicator.remove();
                this.statusIndicator = null;
            }
            
            console.log('[CLIPPY Voice v2] Cleanup completed');
        } catch (error) {
            console.error('[CLIPPY Voice v2] Cleanup error:', error);
        }
    }
}

// Export for use in main plugin
export { SimpleVoiceIntegration as default };