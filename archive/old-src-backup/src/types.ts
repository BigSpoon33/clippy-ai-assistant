import { TFile } from 'obsidian';

/**
 * Core plugin settings interface
 */
export interface ClippySettings {
    // Core AI settings
    aiProvider: 'openai' | 'anthropic' | 'ollama' | 'gemini';
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    
    // Voice settings
    voice: {
        enabled: boolean;
        wakeWord: string;
        customWakeWords: string[];
        continuousMode: boolean;
        
        // TTS settings
        ttsEngine: 'kokoro' | 'chatterbox' | 'elevenlabs' | 'browser';
        selectedVoice: string;
        speechRate: number;
        speechPitch: number;
        speechVolume: number;
        elevenLabsApiKey?: string;
        
        // STT settings
        sttEngine: 'whisper' | 'browser';
        whisperModel: string;
        language: string;
        confidenceThreshold: number;
        
        // Wake word settings
        porcupineAccessKey?: string;
        wakeWordSensitivity: number;
        
        // Timing settings
        speechTimeout: number;
        conversationTimeout: number;
        silenceThreshold: number;
        
        // Audio settings
        audioDeviceId?: string;
        echoCancellation: boolean;
        noiseSuppression: boolean;
        autoGainControl: boolean;
    };
    
    // Knowledge graph settings
    knowledgeGraph: {
        enabled: boolean;
        autoUpdate: boolean;
        visualizationMode: 'force' | 'hierarchical' | 'circular';
        nodeSize: number;
        linkStrength: number;
        maxNodes: number;
    };
    
    // Link suggestions
    linkSuggestions: {
        enabled: boolean;
        minConfidence: number;
        maxSuggestions: number;
        includeContent: boolean;
        showInSidebar: boolean;
    };
    
    // Orphan detection
    orphanDetection: {
        enabled: boolean;
        ignoreTemplates: boolean;
        ignoreAttachments: boolean;
        customIgnorePatterns: string[];
    };
    
    // UI settings
    ui: {
        showRibbonIcon: boolean;
        showStatusBar: boolean;
        panelPosition: 'left' | 'right';
        theme: 'auto' | 'light' | 'dark';
    };
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: ClippySettings = {
    aiProvider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    
    voice: {
        enabled: false,
        wakeWord: 'hey clippy',
        customWakeWords: [],
        continuousMode: false,
        
        ttsEngine: 'browser',
        selectedVoice: '',
        speechRate: 1.0,
        speechPitch: 1.0,
        speechVolume: 1.0,
        
        sttEngine: 'browser',
        whisperModel: 'Xenova/whisper-tiny.en',
        language: 'en-US',
        confidenceThreshold: 0.7,
        
        wakeWordSensitivity: 0.5,
        
        speechTimeout: 5000,
        conversationTimeout: 30000,
        silenceThreshold: 20,
        
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
    
    knowledgeGraph: {
        enabled: true,
        autoUpdate: true,
        visualizationMode: 'force',
        nodeSize: 8,
        linkStrength: 1,
        maxNodes: 500,
    },
    
    linkSuggestions: {
        enabled: true,
        minConfidence: 0.5,
        maxSuggestions: 5,
        includeContent: true,
        showInSidebar: true,
    },
    
    orphanDetection: {
        enabled: true,
        ignoreTemplates: true,
        ignoreAttachments: true,
        customIgnorePatterns: ['daily/', 'templates/'],
    },
    
    ui: {
        showRibbonIcon: true,
        showStatusBar: true,
        panelPosition: 'right',
        theme: 'auto',
    }
};

/**
 * Voice state interface
 */
export interface VoiceState {
    enabled: boolean;
    listening: boolean;
    speaking: boolean;
    processing: boolean;
    error: boolean;
    stage: string;
}

/**
 * Audio configuration interface
 */
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bufferSize: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
}

/**
 * Conversation turn interface
 */
export interface ConversationTurn {
    id: string;
    sessionId: string;
    timestamp: number;
    userInput: string;
    assistantResponse?: string;
    intent?: string;
    confidence: number;
    success?: boolean;
    metadata?: Record<string, any>;
}

/**
 * Conversation context interface
 */
export interface ConversationContext {
    sessionId: string;
    timestamp: number;
    wakeWord: string;
    confidence: number;
    continuousMode: boolean;
    vaultContext?: VaultContext;
    topics?: string[];
    entities?: string[];
    lastInteraction?: number;
}

/**
 * Vault context interface for conversation awareness
 */
export interface VaultContext {
    currentFile: string;
    openFiles: string[];
    recentFiles: string[];
    workspaceLayout: string;
}

/**
 * Voice command interface
 */
export interface VoiceCommand {
    id: string;
    command: string;
    intent: string;
    confidence: number;
    parameters: Record<string, any>;
    timestamp: number;
}

/**
 * Audio device information
 */
export interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'audiooutput';
    groupId: string;
}

/**
 * AI Provider configuration
 */
export interface AIProvider {
    name: string;
    apiKey: string;
    baseUrl?: string;
    models: string[];
    supportsFunctions: boolean;
    supportsStreaming: boolean;
}

/**
 * Link suggestion interface
 */
export interface LinkSuggestion {
    sourceFile: TFile;
    targetFile: TFile;
    confidence: number;
    reason: string;
    context: string;
    suggestionType: 'content' | 'semantic' | 'structural';
}

/**
 * Knowledge graph node interface
 */
export interface KnowledgeNode {
    id: string;
    label: string;
    file: TFile;
    connections: number;
    centrality: number;
    cluster?: string;
    metadata: Record<string, any>;
}

/**
 * Knowledge graph edge interface
 */
export interface KnowledgeEdge {
    source: string;
    target: string;
    weight: number;
    type: 'link' | 'mention' | 'tag' | 'semantic';
    metadata: Record<string, any>;
}

/**
 * Orphan file interface
 */
export interface OrphanFile {
    file: TFile;
    lastModified: number;
    size: number;
    hasBacklinks: boolean;
    suggestedConnections: LinkSuggestion[];
}

/**
 * Plugin event types
 */
export interface ClippyEvents {
    'voice-state-changed': (state: VoiceState) => void;
    'conversation-started': () => void;
    'conversation-ended': () => void;
    'wake-word-detected': (wakeWord: string) => void;
    'speech-recognized': (text: string) => void;
    'ai-response': (response: string) => void;
    'graph-updated': () => void;
    'suggestions-updated': (suggestions: LinkSuggestion[]) => void;
    'orphans-detected': (orphans: OrphanFile[]) => void;
    'settings-changed': (settings: ClippySettings) => void;
    'error': (error: Error) => void;
}

/**
 * Command result interface
 */
export interface CommandResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

/**
 * AI chat message interface
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

/**
 * Plugin status interface
 */
export interface PluginStatus {
    initialized: boolean;
    voiceEnabled: boolean;
    aiConnected: boolean;
    graphReady: boolean;
    activeFeatures: string[];
    errors: string[];
}