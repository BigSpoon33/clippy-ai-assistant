/**
 * Voice Configuration for CLIPPY AI Assistant
 * Default configuration with sensible fallback settings
 */

import { VoiceConfiguration, VoiceEngineType } from './types/voice-types';

export const DEFAULT_VOICE_CONFIG: VoiceConfiguration = {
    // Global settings
    enabled: true,
    wakeWord: 'hey clippy',
    wakeWordThreshold: 0.5,
    
    // TTS configuration
    tts: {
        primary: VoiceEngineType.WEB_SPEECH_TTS,
        engines: {
            [VoiceEngineType.WEB_SPEECH_TTS]: {
                enabled: true,
                priority: 2,
                settings: {}
            },
            [VoiceEngineType.KOKORO_TTS]: {
                enabled: true,
                priority: 1,
                settings: {
                    kokoroPath: './kokoro',
                    pythonPath: 'python'
                }
            },
            [VoiceEngineType.SYSTEM_TTS]: {
                enabled: true,
                priority: 3,
                settings: {}
            }
        },
        voice: 'af_bella',
        speed: 1.0,
        volume: 0.8
    },
    
    // STT configuration
    stt: {
        primary: VoiceEngineType.WEB_SPEECH_STT,
        engines: {
            [VoiceEngineType.WHISPER_STT]: {
                enabled: true,
                priority: 1,
                settings: {
                    pythonPath: 'python',
                    modelSize: 'base'
                }
            },
            [VoiceEngineType.WEB_SPEECH_STT]: {
                enabled: true,
                priority: 2,
                settings: {}
            }
        },
        language: 'en-US',
        timeout: 5
    },
    
    // Wake word configuration  
    wakeWordConfig: {
        primary: VoiceEngineType.OPENWAKEWORD,
        engines: {
            [VoiceEngineType.OPENWAKEWORD]: {
                enabled: true,
                priority: 1,
                settings: {
                    pythonPath: '/home/shuma/Documents/voice_assistant/venv/bin/python',
                    openWakeWordPath: ''
                }
            },
            [VoiceEngineType.KEYWORD_SPOTTING]: {
                enabled: true,
                priority: 2,
                settings: {}
            }
        },
        threshold: 0.5,
        models: ['hey_mycroft', 'hey_jarvis', 'alexa']
    },
    
    // Audio settings
    audio: {
        sampleRate: 16000,
        channels: 1,
        chunkSize: 1280,
        inputDeviceId: undefined,
        outputDeviceId: undefined
    },
    
    // Fallback behavior
    fallbacks: {
        enableGracefulDegradation: true,
        showErrorNotifications: true,
        useTextFallback: true
    }
};

/**
 * Create voice configuration from user settings
 */
export function createVoiceConfig(userSettings?: Partial<VoiceConfiguration>): VoiceConfiguration {
    // Deep merge user settings with defaults
    const config = JSON.parse(JSON.stringify(DEFAULT_VOICE_CONFIG));
    
    if (userSettings) {
        // Simple deep merge for configuration
        mergeConfig(config, userSettings);
    }
    
    return config;
}

/**
 * Simple deep merge utility for configuration objects
 */
function mergeConfig(target: any, source: any): void {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

/**
 * Validate voice configuration
 */
export function validateVoiceConfig(config: VoiceConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!config.wakeWord || config.wakeWord.trim().length === 0) {
        errors.push('Wake word cannot be empty');
    }
    
    if (config.wakeWordThreshold < 0 || config.wakeWordThreshold > 1) {
        errors.push('Wake word threshold must be between 0 and 1');
    }
    
    if (config.tts.speed < 0.1 || config.tts.speed > 3.0) {
        errors.push('TTS speed must be between 0.1 and 3.0');
    }
    
    if (config.tts.volume < 0 || config.tts.volume > 1) {
        errors.push('TTS volume must be between 0 and 1');
    }
    
    if (config.stt.timeout < 1 || config.stt.timeout > 60) {
        errors.push('STT timeout must be between 1 and 60 seconds');
    }
    
    if (config.audio.sampleRate < 8000 || config.audio.sampleRate > 48000) {
        errors.push('Audio sample rate must be between 8000 and 48000 Hz');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}