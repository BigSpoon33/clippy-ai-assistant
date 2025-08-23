/**
 * Voice Assistant Types and Interfaces
 * Based on proven Python voice_assistant architecture
 */

export enum VoiceEngineType {
    // TTS Engines
    WEB_SPEECH_TTS = 'web_speech_tts',
    KOKORO_TTS = 'kokoro_tts',
    SYSTEM_TTS = 'system_tts',
    
    // STT Engines  
    WHISPER_STT = 'whisper_stt',
    WEB_SPEECH_STT = 'web_speech_stt',
    
    // Wake Word Engines
    OPENWAKEWORD = 'openwakeword',
    KEYWORD_SPOTTING = 'keyword_spotting'
}

export enum VoiceStatus {
    INACTIVE = 'inactive',
    INITIALIZING = 'initializing',
    ACTIVE = 'active',
    LISTENING = 'listening',
    PROCESSING = 'processing',
    SPEAKING = 'speaking',
    ERROR = 'error'
}

export interface VoiceEngineConfig {
    enabled: boolean;
    priority: number;
    settings: Record<string, any>;
}

export interface VoiceConfiguration {
    // Global settings
    enabled: boolean;
    wakeWord: string;
    wakeWordThreshold: number;
    
    // Engine configurations
    tts: {
        primary: VoiceEngineType;
        engines: Partial<Record<VoiceEngineType, VoiceEngineConfig>>;
        voice: string;
        speed: number;
        volume: number;
    };
    
    stt: {
        primary: VoiceEngineType;
        engines: Partial<Record<VoiceEngineType, VoiceEngineConfig>>;
        language: string;
        timeout: number;
    };
    
    wakeWordConfig: {
        primary: VoiceEngineType;
        engines: Partial<Record<VoiceEngineType, VoiceEngineConfig>>;
        threshold: number;
        models: string[];
    };
    
    // Audio settings
    audio: {
        sampleRate: number;
        channels: number;
        chunkSize: number;
        inputDeviceId?: string;
        outputDeviceId?: string;
    };
    
    // Fallback behavior
    fallbacks: {
        enableGracefulDegradation: boolean;
        showErrorNotifications: boolean;
        useTextFallback: boolean;
    };
}

export interface VoiceState {
    status: VoiceStatus;
    activeEngines: {
        tts?: VoiceEngineType;
        stt?: VoiceEngineType;
        wakeWord?: VoiceEngineType;
    };
    capabilities: {
        ttsAvailable: VoiceEngineType[];
        sttAvailable: VoiceEngineType[];
        wakeWordAvailable: VoiceEngineType[];
    };
    error?: string;
    lastActivity?: Date;
    statistics: {
        sessionsStarted: number;
        wakeWordsDetected: number;
        speechRecognitions: number;
        speechSyntheses: number;
        errors: number;
    };
}

export interface AudioChunk {
    data: ArrayBuffer;
    timestamp: number;
    sampleRate: number;
    channels: number;
}

export interface TranscriptionResult {
    text: string;
    confidence: number;
    language?: string;
    timestamp: number;
    engine: VoiceEngineType;
}

export interface SynthesisResult {
    audioData?: ArrayBuffer;
    filePath?: string;
    duration?: number;
    timestamp: number;
    engine: VoiceEngineType;
}

export interface WakeWordDetection {
    wakeWord: string;
    confidence: number;
    timestamp: number;
    engine: VoiceEngineType;
}

// Audio Visualizer Data Structures
export interface AudioVisualizerData {
    timestamp: number;
    volumeLevel: number;          // 0-1 normalized
    frequencyData: Uint8Array;    // Spectrum data
    vadConfidence?: number;       // VAD probability 0-1
    vadState: 'silent' | 'speech' | 'noise';
    peakFrequency?: number;       // Dominant frequency
}

export interface VADConfig {
    enabled: boolean;
    algorithm: 'simple' | 'silero' | 'spectral';
    thresholds: {
        speech: number;           // 0.5 default
        silence: number;          // 0.35 default
        confidence: number;       // 0.8 minimum confidence
    };
    sampleRate: 16000;           // Required for Silero
    frameSize: 512;              // Processing window
}

export interface TTSVisualizerConfig {
    enabled: boolean;
    spectrumAnalysis: boolean;
    textSync: boolean;
    avatarMode: boolean;         // Future Three.js avatar
    visualStyle: 'spectrum' | 'waveform' | 'level' | 'hybrid';
    height?: number;             // Container height
}

// Event types for voice system
export interface VoiceEvents {
    'status-changed': VoiceState;
    'wake-word-detected': WakeWordDetection;
    'speech-recognized': TranscriptionResult;
    'speech-synthesis-complete': SynthesisResult;
    'error': { error: string; engine?: VoiceEngineType };
    'engine-initialized': { engine: VoiceEngineType; available: boolean };
    'audio-level': { level: number };
    'vad-update': AudioVisualizerData;        // NEW
    'tts-spectrum': AudioVisualizerData;      // NEW
    'speaking-state': { isSpeaking: boolean; text?: string }; // NEW
}

// Callback types
export type VoiceEventCallback<T extends keyof VoiceEvents> = (data: VoiceEvents[T]) => void;

export interface VoiceEventEmitter {
    on<T extends keyof VoiceEvents>(event: T, callback: VoiceEventCallback<T>): void;
    off<T extends keyof VoiceEvents>(event: T, callback: VoiceEventCallback<T>): void;
    emit<T extends keyof VoiceEvents>(event: T, data: VoiceEvents[T]): void;
}

// Engine capability interfaces
export interface TTSCapabilities {
    voices: string[];
    languages: string[];
    speedRange: { min: number; max: number };
    volumeRange: { min: number; max: number };
    supportsSSML: boolean;
    maxTextLength: number;
}

export interface STTCapabilities {
    languages: string[];
    maxDuration: number;
    supportsRealTime: boolean;
    supportsBatch: boolean;
    audioFormats: string[];
}

export interface WakeWordCapabilities {
    models: string[];
    thresholdRange: { min: number; max: number };
    supportsCustomModels: boolean;
    maxConcurrentModels: number;
}

// Command processing
export interface VoiceCommand {
    trigger: string;
    action: string;
    parameters?: Record<string, any>;
    confidence?: number;
}

export interface VoiceResponse {
    text: string;
    actions?: string[];
    followUp?: boolean;
}