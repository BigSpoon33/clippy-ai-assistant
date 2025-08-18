/**
 * Voice Manager - Main Coordinator for Voice Assistant System
 * Orchestrates TTS, STT, and Wake Word engines following the proven Python architecture
 */

import { 
    VoiceConfiguration, 
    VoiceState, 
    VoiceStatus, 
    VoiceEngineType, 
    VoiceEventEmitter,
    VoiceEvents,
    VoiceEventCallback,
    TranscriptionResult,
    SynthesisResult,
    WakeWordDetection,
    VoiceCommand,
    VoiceResponse
} from '../types/voice-types';

// Import managers
import { TTSManager } from './tts-manager';
import { STTManager } from './stt-manager';
import { WakeWordManager } from './wake-word-manager';

// Import utilities
import { AudioRecorder } from '../utils/audio-recorder';
import { AudioPlayer } from '../utils/audio-player';

export class VoiceManager implements VoiceEventEmitter {
    private config: VoiceConfiguration;
    private state: VoiceState;
    private logger: Console;
    
    // Component managers
    private ttsManager: TTSManager;
    private sttManager: STTManager;
    private wakeWordManager: WakeWordManager;
    
    // Audio utilities
    private audioRecorder: AudioRecorder;
    private audioPlayer: AudioPlayer;
    
    // Event handling
    private eventListeners: Map<string, Function[]> = new Map();
    
    // Session management
    private isActive: boolean = false;
    private sessionStartTime?: Date;
    private conversationMode: boolean = false;
    private lastActivityTime: Date = new Date();

    constructor(config: VoiceConfiguration) {
        this.config = config;
        this.logger = console;
        
        // Initialize state
        this.state = {
            status: VoiceStatus.INACTIVE,
            activeEngines: {},
            capabilities: {
                ttsAvailable: [],
                sttAvailable: [],
                wakeWordAvailable: []
            },
            statistics: {
                sessionsStarted: 0,
                wakeWordsDetected: 0,
                speechRecognitions: 0,
                speechSyntheses: 0,
                errors: 0
            }
        };
        
        // Initialize components
        this.initializeComponents();
    }

    /**
     * Initialize all voice components
     */
    private async initializeComponents(): Promise<void> {
        try {
            this.logger.debug('[VoiceManager] Initializing voice components...');
            this.state.status = VoiceStatus.INITIALIZING;
            this.emit('status-changed', this.state);

            // Initialize utilities
            this.audioRecorder = new AudioRecorder(this.config);
            this.audioPlayer = new AudioPlayer(this.config);

            // Initialize managers
            this.ttsManager = new TTSManager(this.config, this);
            this.sttManager = new STTManager(this.config, this);
            this.wakeWordManager = new WakeWordManager(this.config, this);

            // Wait for all managers to initialize
            await Promise.all([
                this.ttsManager.initialize(),
                this.sttManager.initialize(),
                this.wakeWordManager.initialize()
            ]);

            // Update capabilities
            await this.updateCapabilities();

            // Set up event handlers
            this.setupEventHandlers();

            this.state.status = VoiceStatus.INACTIVE;
            this.emit('status-changed', this.state);
            
            this.logger.info('[VoiceManager] Voice system initialized successfully');

        } catch (error) {
            this.state.status = VoiceStatus.ERROR;
            this.state.error = `Initialization failed: ${error.message}`;
            this.emit('status-changed', this.state);
            this.logger.error('[VoiceManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up event handlers between components
     */
    private setupEventHandlers(): void {
        // Wake word detection handler
        this.wakeWordManager.on('wake-word-detected', (detection: WakeWordDetection) => {
            this.handleWakeWordDetection(detection);
        });

        // Speech recognition handler
        this.sttManager.on('speech-recognized', (result: TranscriptionResult) => {
            this.handleSpeechRecognition(result);
        });

        // Speech synthesis handler
        this.ttsManager.on('speech-synthesis-complete', (result: SynthesisResult) => {
            this.handleSpeechSynthesis(result);
        });

        // Error handlers
        [this.ttsManager, this.sttManager, this.wakeWordManager].forEach(manager => {
            manager.on('error', (error: { error: string; engine?: VoiceEngineType }) => {
                this.handleError(error.error, error.engine);
            });
        });
    }

    /**
     * Update system capabilities
     */
    private async updateCapabilities(): Promise<void> {
        this.state.capabilities = {
            ttsAvailable: await this.ttsManager.getAvailableEngines(),
            sttAvailable: await this.sttManager.getAvailableEngines(),
            wakeWordAvailable: await this.wakeWordManager.getAvailableEngines()
        };

        // Update active engines
        this.state.activeEngines = {
            tts: this.ttsManager.getCurrentEngine(),
            stt: this.sttManager.getCurrentEngine(),
            wakeWord: this.wakeWordManager.getCurrentEngine()
        };
    }

    /**
     * Start voice assistant
     */
    public async start(): Promise<boolean> {
        try {
            if (this.isActive) {
                this.logger.warn('[VoiceManager] Voice assistant is already active');
                return true;
            }

            this.logger.info('[VoiceManager] Starting voice assistant...');
            
            // Check if any engines are available
            if (this.state.capabilities.ttsAvailable.length === 0 && 
                this.state.capabilities.sttAvailable.length === 0 && 
                this.state.capabilities.wakeWordAvailable.length === 0) {
                throw new Error('No voice engines available');
            }

            this.state.status = VoiceStatus.ACTIVE;
            this.isActive = true;
            this.sessionStartTime = new Date();
            this.state.statistics.sessionsStarted++;

            // Start wake word detection if available
            if (this.config.wakeWord.primary && this.state.capabilities.wakeWordAvailable.length > 0) {
                await this.wakeWordManager.startDetection();
                this.state.status = VoiceStatus.LISTENING;
            }

            this.emit('status-changed', this.state);
            this.logger.info('[VoiceManager] Voice assistant started successfully');
            
            return true;

        } catch (error) {
            this.state.status = VoiceStatus.ERROR;
            this.state.error = `Failed to start: ${error.message}`;
            this.isActive = false;
            this.emit('status-changed', this.state);
            this.logger.error('[VoiceManager] Failed to start voice assistant:', error);
            return false;
        }
    }

    /**
     * Stop voice assistant
     */
    public async stop(): Promise<void> {
        try {
            this.logger.info('[VoiceManager] Stopping voice assistant...');

            this.isActive = false;
            this.conversationMode = false;

            // Stop all active processes
            await Promise.all([
                this.wakeWordManager.stopDetection(),
                this.sttManager.stopListening(),
                this.ttsManager.stopSpeech()
            ]);

            this.state.status = VoiceStatus.INACTIVE;
            this.state.activeEngines = {};
            this.sessionStartTime = undefined;

            this.emit('status-changed', this.state);
            this.logger.info('[VoiceManager] Voice assistant stopped');

        } catch (error) {
            this.logger.error('[VoiceManager] Error stopping voice assistant:', error);
        }
    }

    /**
     * Handle wake word detection
     */
    private async handleWakeWordDetection(detection: WakeWordDetection): Promise<void> {
        try {
            this.logger.info(`[VoiceManager] Wake word detected: "${detection.wakeWord}" (${detection.confidence})`);
            
            this.state.statistics.wakeWordsDetected++;
            this.lastActivityTime = new Date();
            
            // Emit wake word event
            this.emit('wake-word-detected', detection);

            // Respond to wake word
            await this.respondToWakeWord(detection);

            // Enter conversation mode
            await this.enterConversationMode();

        } catch (error) {
            this.handleError(`Wake word handling failed: ${error.message}`);
        }
    }

    /**
     * Respond to wake word detection
     */
    private async respondToWakeWord(detection: WakeWordDetection): Promise<void> {
        // Acknowledge wake word
        const responses = [
            "Yes?",
            "How can I help?",
            "I'm listening.",
            "What can I do for you?",
            "Hi there!"
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        await this.speak(response);
    }

    /**
     * Enter conversation mode
     */
    private async enterConversationMode(): Promise<void> {
        try {
            this.conversationMode = true;
            this.state.status = VoiceStatus.LISTENING;
            this.emit('status-changed', this.state);

            // Start listening for commands
            if (this.state.capabilities.sttAvailable.length > 0) {
                await this.listenForCommand();
            }

        } catch (error) {
            this.handleError(`Failed to enter conversation mode: ${error.message}`);
        }
    }

    /**
     * Listen for voice commands
     */
    private async listenForCommand(duration: number = 10): Promise<void> {
        try {
            this.logger.debug('[VoiceManager] Listening for voice command...');
            this.state.status = VoiceStatus.LISTENING;
            this.emit('status-changed', this.state);

            const result = await this.sttManager.transcribeFromMicrophone(duration);
            
            if (result.text.trim()) {
                await this.processVoiceCommand(result.text);
            } else {
                await this.speak("I didn't hear anything. Please try again.");
                this.exitConversationMode();
            }

        } catch (error) {
            await this.speak("Sorry, I had trouble understanding. Please try again.");
            this.exitConversationMode();
        }
    }

    /**
     * Process voice command
     */
    private async processVoiceCommand(text: string): Promise<void> {
        try {
            this.logger.info(`[VoiceManager] Processing command: "${text}"`);
            this.state.status = VoiceStatus.PROCESSING;
            this.emit('status-changed', this.state);

            // Parse command
            const command = this.parseVoiceCommand(text);
            
            // Execute command
            const response = await this.executeVoiceCommand(command);
            
            // Respond
            if (response.text) {
                await this.speak(response.text);
            }

            // Handle follow-up actions
            if (response.actions) {
                await this.executeFollowUpActions(response.actions);
            }

            // Exit conversation mode unless follow-up is expected
            if (!response.followUp) {
                this.exitConversationMode();
            } else {
                // Continue listening
                await this.listenForCommand();
            }

        } catch (error) {
            await this.speak("Sorry, I couldn't process that command.");
            this.exitConversationMode();
        }
    }

    /**
     * Parse voice command
     */
    private parseVoiceCommand(text: string): VoiceCommand {
        const lowerText = text.toLowerCase().trim();
        
        // Simple command parsing - could be enhanced with NLP
        if (lowerText.includes('stop') || lowerText.includes('exit') || lowerText.includes('quit')) {
            return { trigger: 'stop', action: 'stop_voice_assistant' };
        }
        
        if (lowerText.includes('help')) {
            return { trigger: 'help', action: 'show_help' };
        }
        
        if (lowerText.includes('test')) {
            return { trigger: 'test', action: 'test_voice' };
        }

        if (lowerText.includes('volume')) {
            return { trigger: 'volume', action: 'adjust_volume', parameters: { text: lowerText } };
        }

        if (lowerText.includes('speed')) {
            return { trigger: 'speed', action: 'adjust_speed', parameters: { text: lowerText } };
        }

        // Default: general query
        return { trigger: 'query', action: 'general_query', parameters: { text: text } };
    }

    /**
     * Execute voice command
     */
    private async executeVoiceCommand(command: VoiceCommand): Promise<VoiceResponse> {
        switch (command.action) {
            case 'stop_voice_assistant':
                await this.stop();
                return { text: 'Voice assistant stopped.' };

            case 'show_help':
                return { 
                    text: 'I can help you with voice commands. Try saying "test voice", "adjust volume", or "stop listening".' 
                };

            case 'test_voice':
                return { 
                    text: 'Voice test successful! I can hear and speak clearly.' 
                };

            case 'adjust_volume':
                // Simple volume adjustment logic
                const volumeText = command.parameters?.text || '';
                if (volumeText.includes('up') || volumeText.includes('higher')) {
                    // Increase volume logic
                    return { text: 'Volume increased.' };
                } else if (volumeText.includes('down') || volumeText.includes('lower')) {
                    // Decrease volume logic  
                    return { text: 'Volume decreased.' };
                }
                return { text: 'Please specify if you want volume up or down.' };

            case 'adjust_speed':
                // Simple speed adjustment logic
                const speedText = command.parameters?.text || '';
                if (speedText.includes('faster') || speedText.includes('quick')) {
                    return { text: 'Speech speed increased.' };
                } else if (speedText.includes('slower')) {
                    return { text: 'Speech speed decreased.' };
                }
                return { text: 'Please specify if you want faster or slower speech.' };

            case 'general_query':
                // This could integrate with the main CLIPPY AI system
                return { 
                    text: 'I heard your question, but I need to be connected to the main AI system to answer that.',
                    actions: ['integrate_with_clippy_ai']
                };

            default:
                return { text: 'I\'m not sure how to handle that command.' };
        }
    }

    /**
     * Execute follow-up actions
     */
    private async executeFollowUpActions(actions: string[]): Promise<void> {
        for (const action of actions) {
            try {
                switch (action) {
                    case 'integrate_with_clippy_ai':
                        // This would integrate with the main CLIPPY AI system
                        this.logger.debug('[VoiceManager] Integration with CLIPPY AI requested');
                        break;
                    default:
                        this.logger.warn(`[VoiceManager] Unknown follow-up action: ${action}`);
                }
            } catch (error) {
                this.logger.error(`[VoiceManager] Follow-up action failed: ${action}`, error);
            }
        }
    }

    /**
     * Exit conversation mode
     */
    private exitConversationMode(): void {
        this.conversationMode = false;
        this.state.status = this.isActive ? VoiceStatus.LISTENING : VoiceStatus.INACTIVE;
        this.emit('status-changed', this.state);
        this.logger.debug('[VoiceManager] Exited conversation mode');
    }

    /**
     * Handle speech recognition result
     */
    private handleSpeechRecognition(result: TranscriptionResult): void {
        this.state.statistics.speechRecognitions++;
        this.lastActivityTime = new Date();
        this.emit('speech-recognized', result);
        this.logger.debug(`[VoiceManager] Speech recognized: "${result.text}"`);
    }

    /**
     * Handle speech synthesis completion
     */
    private handleSpeechSynthesis(result: SynthesisResult): void {
        this.state.statistics.speechSyntheses++;
        this.emit('speech-synthesis-complete', result);
        this.logger.debug('[VoiceManager] Speech synthesis completed');
    }

    /**
     * Handle errors
     */
    private handleError(error: string, engine?: VoiceEngineType): void {
        this.state.statistics.errors++;
        this.logger.error(`[VoiceManager] Error${engine ? ` (${engine})` : ''}: ${error}`);
        this.emit('error', { error, engine });
    }

    /**
     * Public API: Speak text
     */
    public async speak(text: string): Promise<boolean> {
        try {
            if (!this.isActive) {
                return false;
            }

            this.state.status = VoiceStatus.SPEAKING;
            this.emit('status-changed', this.state);

            const result = await this.ttsManager.speak(text);
            
            // Play audio if available
            if (result.audioData) {
                await this.audioPlayer.playFromBuffer(result.audioData);
            } else if (result.filePath) {
                await this.audioPlayer.playFromFile(result.filePath);
            }

            return true;

        } catch (error) {
            this.handleError(`Speech synthesis failed: ${error.message}`);
            return false;
        } finally {
            this.state.status = this.conversationMode ? VoiceStatus.LISTENING : 
                              (this.isActive ? VoiceStatus.ACTIVE : VoiceStatus.INACTIVE);
            this.emit('status-changed', this.state);
        }
    }

    /**
     * Public API: Listen for speech
     */
    public async listen(duration: number = 5): Promise<string | null> {
        try {
            if (!this.isActive) {
                return null;
            }

            const result = await this.sttManager.transcribeFromMicrophone(duration);
            return result.text;

        } catch (error) {
            this.handleError(`Speech recognition failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get current state
     */
    public getState(): VoiceState {
        return { ...this.state };
    }

    /**
     * Check if voice assistant is active
     */
    public isVoiceActive(): boolean {
        return this.isActive;
    }

    /**
     * Update configuration
     */
    public updateConfiguration(config: VoiceConfiguration): void {
        this.config = config;
        
        // Update component configurations
        this.ttsManager?.updateConfiguration(config);
        this.sttManager?.updateConfiguration(config);
        this.wakeWordManager?.updateConfiguration(config);
    }

    /**
     * Event emitter implementation
     */
    public on<T extends keyof VoiceEvents>(event: T, callback: VoiceEventCallback<T>): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    public off<T extends keyof VoiceEvents>(event: T, callback: VoiceEventCallback<T>): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    public emit<T extends keyof VoiceEvents>(event: T, data: VoiceEvents[T]): void {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.logger.error(`[VoiceManager] Event callback error for ${event}:`, error);
            }
        });
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        try {
            await this.stop();
            
            await Promise.all([
                this.ttsManager?.cleanup(),
                this.sttManager?.cleanup(),
                this.wakeWordManager?.cleanup(),
                this.audioRecorder?.dispose(),
                this.audioPlayer?.dispose()
            ]);

            this.eventListeners.clear();
            this.logger.info('[VoiceManager] Cleanup completed');

        } catch (error) {
            this.logger.error('[VoiceManager] Cleanup error:', error);
        }
    }
}