import { EventEmitter } from 'events';
import { AudioPipeline } from './audio-pipeline';
import { WakeWordDetector } from './wake-word-detector';
import { SpeechToText } from './speech-to-text';
import { TextToSpeech } from './text-to-speech';
import { ClippyErrorBoundaries } from '../error-boundaries';
import type { ClippySettings, VoiceState, ConversationTurn, ConversationContext } from '../types';

/**
 * Voice Manager Events for communication with main plugin
 */
export interface VoiceManagerEvents {
    'wake-word-detected': (wakeWord: string) => void;
    'speech-recognized': (text: string, confidence: number) => void;
    'voice-command': (command: string, context: ConversationContext) => void;
    'conversation-started': () => void;
    'conversation-ended': () => void;
    'error': (error: Error) => void;
    'status-changed': (status: VoiceState) => void;
    'audio-level': (level: number) => void;
}

/**
 * Voice processing pipeline stages
 */
export enum VoicePipelineStage {
    IDLE = 'idle',
    LISTENING_WAKE_WORD = 'listening_wake_word',
    PROCESSING_WAKE_WORD = 'processing_wake_word',
    LISTENING_COMMAND = 'listening_command',
    PROCESSING_SPEECH = 'processing_speech',
    GENERATING_RESPONSE = 'generating_response',
    SPEAKING_RESPONSE = 'speaking_response',
    ERROR = 'error'
}

/**
 * Main Voice Manager orchestrating all voice components
 */
export class VoiceManager extends EventEmitter {
    private settings: ClippySettings;
    private audioPipeline: AudioPipeline;
    private wakeWordDetector: WakeWordDetector;
    private speechToText: SpeechToText;
    private textToSpeech: TextToSpeech;
    
    private currentStage: VoicePipelineStage = VoicePipelineStage.IDLE;
    private isEnabled: boolean = false;
    private isInitialized: boolean = false;
    private conversationActive: boolean = false;
    private lastWakeWordTime: number = 0;
    private speechTimeoutId: number | null = null;
    private conversationTimeoutId: number | null = null;
    
    // Audio level monitoring
    private audioLevelInterval: number | null = null;
    private currentAudioLevel: number = 0;

    constructor(settings: ClippySettings) {
        super();
        this.settings = settings;
        
        // Initialize voice components
        this.audioPipeline = new AudioPipeline();
        this.wakeWordDetector = new WakeWordDetector(settings);
        this.speechToText = new SpeechToText(settings);
        this.textToSpeech = new TextToSpeech(settings);
        
        // Bind event handlers
        this.setupEventHandlers();
    }

    /**
     * Initialize the voice manager and all components
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('Initializing Voice Manager...');
            
            // Initialize audio pipeline first
            await this.audioPipeline.initialize();
            
            // Initialize individual components
            await Promise.all([
                this.wakeWordDetector.initialize(),
                this.speechToText.initialize(),
                this.textToSpeech.initialize()
            ]);
            
            this.isInitialized = true;
            this.updateStage(VoicePipelineStage.IDLE);
            
            console.log('Voice Manager initialized successfully');
        } catch (error: any) {
            this.updateStage(VoicePipelineStage.ERROR);
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.initialize');
            throw error;
        }
    }

    /**
     * Enable voice processing
     */
    async enable(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Voice manager not initialized');
        }

        if (this.isEnabled) {
            return;
        }

        try {
            this.isEnabled = true;
            
            // Start wake word detection
            await this.startWakeWordDetection();
            
            // Start audio level monitoring
            this.startAudioLevelMonitoring();
            
            console.log('Voice processing enabled');
        } catch (error: any) {
            this.isEnabled = false;
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.enable');
            throw error;
        }
    }

    /**
     * Disable voice processing
     */
    async disable(): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        try {
            this.isEnabled = false;
            
            // Stop all active processes
            await this.stopAllProcesses();
            
            // Stop audio level monitoring
            this.stopAudioLevelMonitoring();
            
            this.updateStage(VoicePipelineStage.IDLE);
            console.log('Voice processing disabled');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.disable');
        }
    }

    /**
     * Manually trigger voice command listening (bypass wake word)
     */
    async startListening(): Promise<void> {
        if (!this.isEnabled) {
            throw new Error('Voice manager not enabled');
        }

        try {
            // Stop wake word detection temporarily
            await this.wakeWordDetector.stop();
            
            // Start speech recognition
            await this.startSpeechRecognition();
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.startListening');
            throw error;
        }
    }

    /**
     * Stop current listening session
     */
    async stopListening(): Promise<void> {
        try {
            // Stop speech recognition
            await this.speechToText.stop();
            
            // Clear timeouts
            this.clearTimeouts();
            
            // End conversation if active
            if (this.conversationActive) {
                this.endConversation();
            }
            
            // Resume wake word detection if enabled
            if (this.isEnabled) {
                await this.startWakeWordDetection();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.stopListening');
        }
    }

    /**
     * Speak text using TTS
     */
    async speak(text: string): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Voice manager not initialized');
        }

        try {
            this.updateStage(VoicePipelineStage.SPEAKING_RESPONSE);
            
            // Temporarily stop wake word detection while speaking
            if (this.isEnabled) {
                await this.wakeWordDetector.stop();
            }
            
            await this.textToSpeech.speak(text);
            
            // Resume wake word detection after speaking
            if (this.isEnabled) {
                await this.startWakeWordDetection();
            } else {
                this.updateStage(VoicePipelineStage.IDLE);
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.speak');
            throw error;
        }
    }

    /**
     * Update voice settings and reinitialize components if needed
     */
    async updateSettings(newSettings: ClippySettings): Promise<void> {
        const voiceEnabledChanged = newSettings.voice.enabled !== this.settings.voice.enabled;
        const wakeWordChanged = newSettings.voice.wakeWord !== this.settings.voice.wakeWord;
        const ttsEngineChanged = newSettings.voice.ttsEngine !== this.settings.voice.ttsEngine;
        const sttEngineChanged = newSettings.voice.sttEngine !== this.settings.voice.sttEngine;

        this.settings = newSettings;

        try {
            // Update individual components
            await Promise.all([
                this.wakeWordDetector.updateSettings(newSettings),
                this.speechToText.updateSettings(newSettings),
                this.textToSpeech.updateSettings(newSettings)
            ]);

            // Handle voice enable/disable
            if (voiceEnabledChanged) {
                if (newSettings.voice.enabled) {
                    await this.enable();
                } else {
                    await this.disable();
                }
            }

            // Restart wake word detection if wake word changed
            if (wakeWordChanged && this.isEnabled) {
                await this.wakeWordDetector.stop();
                await this.startWakeWordDetection();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.updateSettings');
            throw error;
        }
    }

    /**
     * Get current voice processing status
     */
    getStatus(): {
        enabled: boolean;
        initialized: boolean;
        stage: VoicePipelineStage;
        conversationActive: boolean;
        audioLevel: number;
        components: {
            audioPipeline: boolean;
            wakeWordDetector: boolean;
            speechToText: boolean;
            textToSpeech: boolean;
        }
    } {
        return {
            enabled: this.isEnabled,
            initialized: this.isInitialized,
            stage: this.currentStage,
            conversationActive: this.conversationActive,
            audioLevel: this.currentAudioLevel,
            components: {
                audioPipeline: this.audioPipeline.getStatus().initialized,
                wakeWordDetector: this.wakeWordDetector.isCurrentlyListening(),
                speechToText: this.speechToText.isCurrentlyListening(),
                textToSpeech: this.textToSpeech.getStatus().initialized
            }
        };
    }

    /**
     * Clean up all resources
     */
    async cleanup(): Promise<void> {
        try {
            await this.disable();
            
            await Promise.all([
                this.audioPipeline.cleanup(),
                this.wakeWordDetector.cleanup(),
                this.speechToText.cleanup(),
                this.textToSpeech.cleanup()
            ]);
            
            this.clearTimeouts();
            this.removeAllListeners();
            this.isInitialized = false;
            
            console.log('Voice Manager cleaned up');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.cleanup');
        }
    }

    /**
     * Setup event handlers for voice components
     */
    private setupEventHandlers(): void {
        // Wake word detection events
        this.wakeWordDetector.on('wakeWordDetected', this.handleWakeWordDetected.bind(this));
        this.wakeWordDetector.on('error', this.handleComponentError.bind(this));

        // Speech-to-text events
        this.speechToText.on('speechRecognized', this.handleSpeechRecognized.bind(this));
        this.speechToText.on('speechEnded', this.handleSpeechEnded.bind(this));
        this.speechToText.on('error', this.handleComponentError.bind(this));

        // Audio pipeline events
        this.audioPipeline.on('audioLevel', this.handleAudioLevel.bind(this));
        this.audioPipeline.on('error', this.handleComponentError.bind(this));
    }

    /**
     * Handle wake word detection
     */
    private async handleWakeWordDetected(wakeWord: string): Promise<void> {
        try {
            console.log(`Wake word detected: ${wakeWord}`);
            this.lastWakeWordTime = Date.now();
            
            this.emit('wake-word-detected', wakeWord);
            this.updateStage(VoicePipelineStage.PROCESSING_WAKE_WORD);
            
            // Stop wake word detection and start speech recognition
            await this.wakeWordDetector.stop();
            await this.startSpeechRecognition();
            
            // Start conversation if not already active
            if (!this.conversationActive) {
                this.startConversation();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.handleWakeWordDetected');
        }
    }

    /**
     * Handle speech recognition results
     */
    private async handleSpeechRecognized(text: string, confidence: number): Promise<void> {
        try {
            console.log(`Speech recognized: "${text}" (confidence: ${confidence})`);
            
            this.emit('speech-recognized', text, confidence);
            
            // Create conversation context
            const context: ConversationContext = {
                sessionId: this.generateSessionId(),
                timestamp: Date.now(),
                wakeWord: this.settings.voice.wakeWord,
                confidence: confidence,
                continuousMode: this.settings.voice.continuousMode
            };
            
            this.emit('voice-command', text, context);
            
            // Reset conversation timeout if in continuous mode
            if (this.settings.voice.continuousMode) {
                this.resetConversationTimeout();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.handleSpeechRecognized');
        }
    }

    /**
     * Handle speech ended event
     */
    private async handleSpeechEnded(): Promise<void> {
        try {
            this.clearSpeechTimeout();
            
            if (this.settings.voice.continuousMode && this.conversationActive) {
                // Wait for next command or timeout
                this.updateStage(VoicePipelineStage.LISTENING_COMMAND);
                this.resetConversationTimeout();
            } else {
                // End conversation and return to wake word detection
                this.endConversation();
                await this.startWakeWordDetection();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.handleSpeechEnded');
        }
    }

    /**
     * Handle audio level updates
     */
    private handleAudioLevel(level: number): void {
        this.currentAudioLevel = level;
        this.emit('audio-level', level);
    }

    /**
     * Handle component errors
     */
    private handleComponentError(error: Error): void {
        this.updateStage(VoicePipelineStage.ERROR);
        this.emit('error', error);
        ClippyErrorBoundaries.handleError(error, 'VoiceManager.componentError');
    }

    /**
     * Start wake word detection
     */
    private async startWakeWordDetection(): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        this.updateStage(VoicePipelineStage.LISTENING_WAKE_WORD);
        await this.wakeWordDetector.start();
    }

    /**
     * Start speech recognition
     */
    private async startSpeechRecognition(): Promise<void> {
        this.updateStage(VoicePipelineStage.LISTENING_COMMAND);
        
        // Set speech timeout
        this.speechTimeoutId = window.setTimeout(() => {
            this.handleSpeechTimeout();
        }, this.settings.voice.speechTimeout);
        
        await this.speechToText.start();
    }

    /**
     * Start conversation session
     */
    private startConversation(): void {
        this.conversationActive = true;
        this.emit('conversation-started');
        
        if (this.settings.voice.continuousMode) {
            this.resetConversationTimeout();
        }
    }

    /**
     * End conversation session
     */
    private endConversation(): void {
        this.conversationActive = false;
        this.clearTimeouts();
        this.emit('conversation-ended');
        this.updateStage(VoicePipelineStage.IDLE);
    }

    /**
     * Handle speech recognition timeout
     */
    private async handleSpeechTimeout(): Promise<void> {
        try {
            await this.speechToText.stop();
            
            if (this.settings.voice.continuousMode && this.conversationActive) {
                this.resetConversationTimeout();
            } else {
                this.endConversation();
                await this.startWakeWordDetection();
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'VoiceManager.handleSpeechTimeout');
        }
    }

    /**
     * Reset conversation timeout for continuous mode
     */
    private resetConversationTimeout(): void {
        this.clearConversationTimeout();
        
        if (this.settings.voice.continuousMode) {
            this.conversationTimeoutId = window.setTimeout(() => {
                this.endConversation();
                this.startWakeWordDetection();
            }, this.settings.voice.conversationTimeout);
        }
    }

    /**
     * Clear speech timeout
     */
    private clearSpeechTimeout(): void {
        if (this.speechTimeoutId) {
            clearTimeout(this.speechTimeoutId);
            this.speechTimeoutId = null;
        }
    }

    /**
     * Clear conversation timeout
     */
    private clearConversationTimeout(): void {
        if (this.conversationTimeoutId) {
            clearTimeout(this.conversationTimeoutId);
            this.conversationTimeoutId = null;
        }
    }

    /**
     * Clear all timeouts
     */
    private clearTimeouts(): void {
        this.clearSpeechTimeout();
        this.clearConversationTimeout();
    }

    /**
     * Start audio level monitoring
     */
    private startAudioLevelMonitoring(): void {
        this.audioLevelInterval = window.setInterval(() => {
            // Audio level is handled by the audio pipeline
            // This is just for periodic cleanup if needed
        }, 100);
    }

    /**
     * Stop audio level monitoring
     */
    private stopAudioLevelMonitoring(): void {
        if (this.audioLevelInterval) {
            clearInterval(this.audioLevelInterval);
            this.audioLevelInterval = null;
        }
    }

    /**
     * Stop all active processes
     */
    private async stopAllProcesses(): Promise<void> {
        await Promise.all([
            this.wakeWordDetector.stop(),
            this.speechToText.stop(),
            this.textToSpeech.stop()
        ]);
        
        this.clearTimeouts();
        this.endConversation();
    }

    /**
     * Update current pipeline stage and emit status change
     */
    private updateStage(stage: VoicePipelineStage): void {
        if (this.currentStage !== stage) {
            this.currentStage = stage;
            
            const voiceState: VoiceState = {
                enabled: this.isEnabled,
                listening: stage === VoicePipelineStage.LISTENING_WAKE_WORD || 
                          stage === VoicePipelineStage.LISTENING_COMMAND,
                speaking: stage === VoicePipelineStage.SPEAKING_RESPONSE,
                processing: stage === VoicePipelineStage.PROCESSING_WAKE_WORD || 
                           stage === VoicePipelineStage.PROCESSING_SPEECH ||
                           stage === VoicePipelineStage.GENERATING_RESPONSE,
                error: stage === VoicePipelineStage.ERROR,
                stage: stage
            };
            
            this.emit('status-changed', voiceState);
        }
    }

    /**
     * Generate unique session ID for conversation context
     */
    private generateSessionId(): string {
        return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}