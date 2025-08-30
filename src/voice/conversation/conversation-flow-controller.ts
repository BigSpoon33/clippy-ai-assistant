/**
 * Conversation Flow Controller - Central coordinator for voice conversation states
 * Coordinates between ConversationManager, ConversationTimingUtility, and STT/TTS systems
 */

import { 
    ConversationManager, 
    ConversationState, 
    ConversationMode, 
    ConversationStateUpdate 
} from './conversation-manager';
import { ConversationTimingUtility, TimingEvent } from './conversation-timing-utility';
import { VoiceEventEmitter } from '../types/voice-types';

export interface ConversationFlowConfig {
    // Timing settings
    naturalPauseThreshold: number;
    maxPauseThreshold: number;
    responseTimeout: number;
    
    // Flow behavior
    autoStopAfterResponse: boolean;
    enableContinuousMode: boolean;
    wakeWordRequired: boolean;
    
    // TTS settings
    enableVoiceResponses: boolean;
    interruptibleTTS: boolean;
}

export interface ConversationFlowState {
    // Current state
    conversationState: ConversationState;
    conversationMode: ConversationMode;
    
    // Timing state
    isInNaturalPause: boolean;
    timeSinceLastActivity: number;
    
    // Voice state
    isListening: boolean;
    isProcessing: boolean;
    isResponding: boolean;
    
    // Flow control
    canAcceptInput: boolean;
    shouldAutoRespond: boolean;
}

export type FlowEventType = 
    | 'flow_state_changed'
    | 'conversation_started'
    | 'conversation_ended'
    | 'user_input_ready'
    | 'response_ready'
    | 'natural_pause_ready';

export interface FlowEvent {
    type: FlowEventType;
    timestamp: Date;
    state: ConversationFlowState;
    details?: string;
}

export type FlowEventListener = (event: FlowEvent) => void;

export class ConversationFlowController {
    private conversationManager: ConversationManager;
    private timingUtility: ConversationTimingUtility;
    private eventEmitter: VoiceEventEmitter | null = null;
    
    private config: ConversationFlowConfig;
    private state: ConversationFlowState;
    private listeners: FlowEventListener[] = [];
    
    private activeConversationId: string | null = null;
    
    constructor(
        conversationManager: ConversationManager, 
        timingUtility: ConversationTimingUtility,
        config?: Partial<ConversationFlowConfig>
    ) {
        this.conversationManager = conversationManager;
        this.timingUtility = timingUtility;
        
        this.config = {
            naturalPauseThreshold: 2500,
            maxPauseThreshold: 4000,
            responseTimeout: 30000,
            autoStopAfterResponse: true,
            enableContinuousMode: false,
            wakeWordRequired: false,
            enableVoiceResponses: true,
            interruptibleTTS: true,
            ...config
        };
        
        this.state = {
            conversationState: 'idle',
            conversationMode: 'manual',
            isInNaturalPause: false,
            timeSinceLastActivity: 0,
            isListening: false,
            isProcessing: false,
            isResponding: false,
            canAcceptInput: true,
            shouldAutoRespond: false
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for coordination
     */
    private setupEventListeners(): void {
        // Listen to conversation state changes
        this.conversationManager.addStateListener((update: ConversationStateUpdate) => {
            this.handleConversationStateUpdate(update);
        });
        
        // Listen to timing events
        this.timingUtility.addEventListener((event: TimingEvent) => {
            this.handleTimingEvent(event);
        });
    }

    /**
     * Handle conversation state updates from ConversationManager
     */
    private handleConversationStateUpdate(update: ConversationStateUpdate): void {
        const oldState = { ...this.state };
        
        this.state.conversationState = update.state;
        this.state.conversationMode = update.mode;
        
        // Update flow state based on conversation state
        switch (update.state) {
            case 'listening':
                this.state.isListening = true;
                this.state.isProcessing = false;
                this.state.isResponding = false;
                this.state.canAcceptInput = true;
                break;
                
            case 'processing':
                this.state.isListening = false;
                this.state.isProcessing = true;
                this.state.isResponding = false;
                this.state.canAcceptInput = false;
                break;
                
            case 'responding':
                this.state.isListening = false;
                this.state.isProcessing = false;
                this.state.isResponding = true;
                this.state.canAcceptInput = false;
                break;
                
            case 'waiting_for_user':
                this.state.isListening = false;
                this.state.isProcessing = false;
                this.state.isResponding = false;
                this.state.canAcceptInput = true;
                break;
                
            case 'idle':
            default:
                this.state.isListening = false;
                this.state.isProcessing = false;
                this.state.isResponding = false;
                this.state.canAcceptInput = true;
                break;
        }
        
        this.emitFlowEvent('flow_state_changed', 'State updated from conversation manager');
    }

    /**
     * Handle timing events from ConversationTimingUtility
     */
    private handleTimingEvent(event: TimingEvent): void {
        const oldState = { ...this.state };
        
        switch (event.type) {
            case 'natural_pause_detected':
                this.state.isInNaturalPause = true;
                this.state.shouldAutoRespond = this.shouldAutoRespondToNaturalPause();
                this.emitFlowEvent('natural_pause_ready', 'Natural pause detected');
                break;
                
            case 'conversation_timeout':
                this.state.canAcceptInput = false;
                this.emitFlowEvent('conversation_ended', 'Conversation timed out');
                break;
                
            case 'voice_activity_detected':
                this.state.isInNaturalPause = false;
                this.state.timeSinceLastActivity = 0;
                break;
                
            case 'silence_started':
                this.state.isInNaturalPause = false;
                break;
        }
        
        this.state.timeSinceLastActivity = this.timingUtility.getTimeSinceLastActivity();
    }

    /**
     * Start a new conversation flow
     */
    async startConversationFlow(mode: ConversationMode, initialMessage?: string): Promise<void> {
        console.log('[ConversationFlowController] Starting conversation flow in mode:', mode);
        
        // Update configuration based on mode
        this.updateConfigForMode(mode);
        
        // Start new conversation
        this.activeConversationId = await this.conversationManager.startNewConversation(initialMessage);
        
        // Update conversation mode
        this.conversationManager.updateConversationMode(mode);
        
        // Configure timing utility
        this.timingUtility.updateConfig({
            continuousListening: this.config.enableContinuousMode,
            autoStopAfterResponse: this.config.autoStopAfterResponse
        });
        
        this.emitFlowEvent('conversation_started', `Conversation started in ${mode} mode`);
    }

    /**
     * End current conversation flow
     */
    async endConversationFlow(): Promise<void> {
        console.log('[ConversationFlowController] Ending conversation flow');
        
        // Stop timing
        this.timingUtility.stopConversation();
        
        // Return to idle
        this.conversationManager.returnToIdle();
        
        // Save conversation
        await this.conversationManager.saveCurrentConversation();
        
        this.activeConversationId = null;
        this.state.canAcceptInput = false;
        
        this.emitFlowEvent('conversation_ended', 'Conversation flow ended');
    }

    /**
     * Process user input through the flow
     */
    async processUserInput(input: string): Promise<void> {
        if (!this.state.canAcceptInput) {
            console.warn('[ConversationFlowController] Cannot accept input in current state');
            return;
        }
        
        // Add user message to conversation
        this.conversationManager.addMessage({
            role: 'user',
            content: input,
            timestamp: new Date()
        });
        
        this.emitFlowEvent('user_input_ready', 'User input processed');
    }

    /**
     * Signal that assistant response is ready
     */
    async signalResponseReady(response: string, thinking?: string[]): Promise<void> {
        // Add assistant response to conversation
        this.conversationManager.addMessage({
            role: 'assistant',
            content: response,
            timestamp: new Date(),
            thinking
        });
        
        // Notify timing utility
        this.timingUtility.onResponseComplete();
        
        this.emitFlowEvent('response_ready', 'Assistant response processed');
    }

    /**
     * Check if should auto-respond to natural pause
     */
    private shouldAutoRespondToNaturalPause(): boolean {
        // Only auto-respond in conversational mode with voice responses enabled
        return this.state.conversationMode === 'conversational' && 
               this.config.enableVoiceResponses &&
               this.state.canAcceptInput;
    }

    /**
     * Update configuration for specific conversation mode
     */
    private updateConfigForMode(mode: ConversationMode): void {
        switch (mode) {
            case 'conversational':
                this.config.enableContinuousMode = true;
                this.config.autoStopAfterResponse = false;
                this.config.wakeWordRequired = false;
                break;
                
            case 'wake_word':
                this.config.enableContinuousMode = true;
                this.config.autoStopAfterResponse = true;
                this.config.wakeWordRequired = true;
                break;
                
            case 'manual':
            default:
                this.config.enableContinuousMode = false;
                this.config.autoStopAfterResponse = true;
                this.config.wakeWordRequired = false;
                break;
        }
        
        console.log('[ConversationFlowController] Config updated for mode:', mode, this.config);
    }

    /**
     * Add flow event listener
     */
    addEventListener(listener: FlowEventListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove flow event listener
     */
    removeEventListener(listener: FlowEventListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Set voice event emitter for coordination
     */
    setVoiceEventEmitter(emitter: VoiceEventEmitter): void {
        this.eventEmitter = emitter;
    }

    /**
     * Get current flow state
     */
    getFlowState(): ConversationFlowState {
        return { ...this.state };
    }

    /**
     * Update flow configuration
     */
    updateConfig(newConfig: Partial<ConversationFlowConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('[ConversationFlowController] Configuration updated:', newConfig);
    }

    private emitFlowEvent(type: FlowEventType, details?: string): void {
        const event: FlowEvent = {
            type,
            timestamp: new Date(),
            state: { ...this.state },
            details
        };
        
        console.log('[ConversationFlowController] Flow event:', event);
        
        // Emit to voice system if available
        if (this.eventEmitter) {
            this.eventEmitter.emit('status-changed' as any, {
                status: this.mapStateToVoiceStatus(),
                lastActivity: event.timestamp
            });
        }
        
        // Notify flow listeners
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('[ConversationFlowController] Error in flow listener:', error);
            }
        });
    }

    private mapStateToVoiceStatus(): string {
        if (this.state.isListening) return 'listening';
        if (this.state.isProcessing) return 'processing';
        if (this.state.isResponding) return 'speaking';
        return 'inactive';
    }
}