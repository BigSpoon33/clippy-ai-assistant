/**
 * Voice Assistant System v2 for CLIPPY AI Assistant
 * 
 * A comprehensive voice assistant system with:
 * - Multiple TTS engines (Kokoro, Web Speech, System TTS)
 * - Multiple STT engines (Whisper, Web Speech) 
 * - Multiple wake word engines (OpenWakeWord, Keyword Spotting)
 * - Graceful fallback strategies
 * - Event-driven architecture
 * 
 * Based on proven patterns from working Python voice_assistant project.
 */

// Main components
export { VoiceManager } from './managers/voice-manager';
export { TTSManager } from './tts-manager';
export { STTManager } from './managers/stt-manager';
export { WakeWordManager } from './managers/wake-word-manager';

// Configuration
export { DEFAULT_VOICE_CONFIG, createVoiceConfig, validateVoiceConfig } from './voice-config';

// Types
export * from './types/voice-types';

// Utilities
export { AudioRecorder } from './utils/audio-recorder';
export { AudioPlayer } from './utils/audio-player';

// Integration
export { default as ClippyVoiceIntegration } from './integration-example';

// Engine base classes (for extending)
export { BaseTTSEngine } from './engines/base-tts-engine';
export { BaseSTTEngine } from './engines/base-stt-engine';
export { BaseWakeWordEngine } from './engines/base-wake-word-engine';

// Concrete engines
export { WebSpeechTTSEngine } from './engines/tts/web-speech-tts';
export { KokoroTTSEngine } from './engines/tts/kokoro-tts';
export { SystemTTSEngine } from './engines/tts/system-tts';
export { WhisperSTTEngine } from './engines/stt/whisper-stt';
export { WebSpeechSTTEngine } from './engines/stt/web-speech-stt';
export { OpenWakeWordEngine } from './engines/wake-word/openwakeword-engine';
export { KeywordSpottingEngine } from './engines/wake-word/keyword-spotting-engine';