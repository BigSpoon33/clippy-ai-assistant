/**
 * Whisper STT Engine for Local Speech Recognition
 * Integrates with local Whisper installation via Node.js processes
 */

import { BaseSTTEngine } from '../base-stt-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    TranscriptionResult, 
    STTCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class WhisperSTTEngine extends BaseSTTEngine {
    private whisperPath: string = '';
    private pythonPath: string = 'python';
    private modelSize: string = 'base';
    private isWhisperAvailable: boolean = false;
    private modelLoaded: boolean = false;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.WHISPER_STT, config, eventEmitter);
        
        // Get Whisper configuration
        const whisperConfig = config.stt.engines[VoiceEngineType.WHISPER_STT];
        if (whisperConfig && whisperConfig.settings) {
            this.whisperPath = whisperConfig.settings.whisperPath || '';
            this.pythonPath = whisperConfig.settings.pythonPath || 'python';
            this.modelSize = whisperConfig.settings.modelSize || 'base';
        }
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing Whisper STT...`);

            // Check if we're in a Node.js environment
            if (typeof require === 'undefined') {
                throw new Error('Whisper STT requires Node.js environment (not available in browser context)');
            }

            // Verify Whisper installation
            await this.verifyWhisperInstallation();
            
            if (this.isWhisperAvailable) {
                this.isAvailable = true;
                this.logger.info(`[${this.engineType}] Initialized successfully with model: ${this.modelSize}`);
            } else {
                throw new Error('Whisper installation not found or not functional');
            }
            
            this.eventEmitter.emit('engine-initialized', {
                engine: this.engineType,
                available: this.isAvailable
            });

        } catch (error) {
            this.isAvailable = false;
            this.handleError('initialization', error);
            
            this.eventEmitter.emit('engine-initialized', {
                engine: this.engineType,
                available: false
            });
        }
    }

    private async verifyWhisperInstallation(): Promise<void> {
        try {
            const { spawn } = require('child_process');

            // Test if whisper is available
            await this.testPythonEnvironment();
            
            this.isWhisperAvailable = true;
            this.logger.debug(`[${this.engineType}] Whisper installation verified`);

        } catch (error) {
            this.isWhisperAvailable = false;
            throw new Error(`Whisper verification failed: ${error.message}`);
        }
    }

    private async testPythonEnvironment(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            // Test script to verify Whisper installation
            const testScript = `
import sys
try:
    import whisper
    print("whisper_version:", whisper.__version__)
    print("whisper_available: True")
    
    # Test model loading (just check if models exist)
    models = whisper.available_models()
    print("available_models:", ",".join(models))
    
    if "${this.modelSize}" in models:
        print("model_${this.modelSize}_available: True")
    else:
        print("model_${this.modelSize}_available: False")
        
except ImportError as e:
    print("whisper_available: False")
    print("whisper_error:", str(e))

try:
    import torch
    print("torch_available: True")
except ImportError:
    print("torch_available: False")

print("test_complete: True")
            `;

            const python = spawn(this.pythonPath, ['-c', testScript]);
            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0 && output.includes('test_complete: True')) {
                    if (output.includes('whisper_available: True')) {
                        this.logger.debug(`[${this.engineType}] Whisper environment verified`);
                        resolve();
                    } else {
                        reject(new Error('Whisper not available. Please install: pip install openai-whisper'));
                    }
                } else {
                    reject(new Error(`Whisper test failed: ${error || 'Unknown error'}`));
                }
            });

            python.on('error', (err) => {
                reject(new Error(`Failed to run Python: ${err.message}`));
            });
        });
    }

    protected async transcribeAudioFile(audioFilePath: string): Promise<TranscriptionResult> {
        if (!this.isWhisperAvailable) {
            throw new Error('Whisper STT is not available');
        }

        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const fs = require('fs');

            try {
                // Check if audio file exists
                if (!fs.existsSync(audioFilePath)) {
                    throw new Error(`Audio file not found: ${audioFilePath}`);
                }

                // Prepare Whisper transcription script
                const transcriptionScript = `
import whisper
import sys
import json

try:
    # Load model (this might take time on first load)
    print("Loading Whisper model: ${this.modelSize}")
    model = whisper.load_model("${this.modelSize}")
    
    # Transcribe audio
    print("Transcribing audio file: ${audioFilePath}")
    result = model.transcribe("${audioFilePath}", language="${this.currentLanguage.split('-')[0]}")
    
    # Output result as JSON
    output = {
        "text": result["text"].strip(),
        "language": result.get("language", "${this.currentLanguage}"),
        "confidence": 1.0,  # Whisper doesn't provide confidence scores
        "segments": len(result.get("segments", []))
    }
    
    print("RESULT:", json.dumps(output))
    
except Exception as e:
    print("ERROR:", str(e))
    sys.exit(1)
                `;

                const startTime = Date.now();
                
                // Show loading indicator for first model load
                if (!this.modelLoaded) {
                    this.eventEmitter.emit('status-changed', {
                        status: 'initializing',
                        activeEngines: { stt: this.engineType },
                        capabilities: { ttsAvailable: [], sttAvailable: [this.engineType], wakeWordAvailable: [] },
                        statistics: { sessionsStarted: 0, wakeWordsDetected: 0, speechRecognitions: 0, speechSyntheses: 0, errors: 0 }
                    });
                }
                
                const python = spawn(this.pythonPath, ['-c', transcriptionScript]);
                
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    
                    // Log progress
                    if (text.includes('Loading Whisper model')) {
                        this.logger.debug(`[${this.engineType}] Loading model: ${this.modelSize}`);
                    } else if (text.includes('Transcribing audio')) {
                        this.logger.debug(`[${this.engineType}] Transcribing audio...`);
                    }
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    const duration = Date.now() - startTime;
                    this.modelLoaded = true; // Mark model as loaded after first use
                    
                    if (code === 0 && output.includes('RESULT:')) {
                        try {
                            // Extract JSON result
                            const resultLine = output.split('\n').find(line => line.startsWith('RESULT:'));
                            const resultData = JSON.parse(resultLine.substring(7)); // Remove "RESULT:" prefix
                            
                            this.logger.debug(`[${this.engineType}] Transcription completed in ${duration}ms: "${resultData.text}"`);
                            
                            const result: TranscriptionResult = {
                                text: resultData.text,
                                confidence: resultData.confidence,
                                language: resultData.language,
                                timestamp: startTime,
                                engine: this.engineType
                            };
                            
                            resolve(result);
                        } catch (parseError) {
                            reject(new Error(`Failed to parse Whisper result: ${parseError.message}`));
                        }
                    } else {
                        const errorMsg = error || output || 'Unknown Whisper error';
                        reject(new Error(`Whisper transcription failed: ${errorMsg}`));
                    }
                });

                python.on('error', (err) => {
                    reject(new Error(`Failed to run Whisper: ${err.message}`));
                });

                // Set timeout (first model load can take a while)
                const timeoutDuration = this.modelLoaded ? 30000 : 120000; // 2 minutes for first load
                setTimeout(() => {
                    python.kill();
                    reject(new Error(`Whisper timeout after ${timeoutDuration / 1000} seconds`));
                }, timeoutDuration);

            } catch (error) {
                reject(error);
            }
        });
    }

    protected async transcribeAudioData(audioData: ArrayBuffer): Promise<TranscriptionResult> {
        this.validateAudioData(audioData);

        try {
            // Save audio data to temporary file
            const tempFile = this.createTempAudioFile('.wav');
            await this.saveAudioDataToFile(audioData, tempFile);
            
            // Transcribe the file
            const result = await this.transcribeAudioFile(tempFile);
            
            // Clean up temporary file
            this.cleanupTempFile(tempFile);
            
            return result;
        } catch (error) {
            throw new Error(`Failed to transcribe audio data: ${error.message}`);
        }
    }

    private async saveAudioDataToFile(audioData: ArrayBuffer, filePath: string): Promise<void> {
        const fs = require('fs');
        const uint8Array = new Uint8Array(audioData);
        
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, uint8Array, (err: any) => {
                if (err) {
                    reject(new Error(`Failed to save audio file: ${err.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    private cleanupTempFile(filePath: string): void {
        try {
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            this.logger.warn(`[${this.engineType}] Failed to cleanup temp file: ${filePath}`);
        }
    }

    public async setLanguage(language: string): Promise<boolean> {
        // Whisper supports many languages, but we'll validate common ones
        const supportedLanguages = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'
        ];
        
        const langCode = language.split('-')[0].toLowerCase(); // Extract base language
        
        if (supportedLanguages.includes(langCode)) {
            this.currentLanguage = language;
            this.logger.debug(`[${this.engineType}] Language set to: ${language}`);
            return true;
        } else {
            this.logger.warn(`[${this.engineType}] Unsupported language: ${language}, keeping current: ${this.currentLanguage}`);
            return false;
        }
    }

    public async getAvailableLanguages(): Promise<string[]> {
        return [
            'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'pt-BR',
            'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA', 'hi-IN', 'nl-NL', 'sv-SE',
            'no-NO', 'da-DK', 'fi-FI', 'pl-PL', 'cs-CZ', 'hu-HU', 'tr-TR', 'th-TH'
        ];
    }

    public async getCapabilities(): Promise<STTCapabilities> {
        return {
            languages: await this.getAvailableLanguages(),
            maxDuration: 600, // 10 minutes max for reasonable performance
            supportsRealTime: false, // Whisper is batch processing
            supportsBatch: true,
            audioFormats: ['wav', 'mp3', 'mp4', 'm4a', 'flac', 'ogg']
        };
    }

    public async cleanup(): Promise<void> {
        try {
            this.modelLoaded = false;
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Change Whisper model size
     */
    public async changeModel(modelSize: string): Promise<boolean> {
        const availableModels = ['tiny', 'base', 'small', 'medium', 'large'];
        
        if (availableModels.includes(modelSize)) {
            this.modelSize = modelSize;
            this.modelLoaded = false; // Force reload on next use
            this.logger.info(`[${this.engineType}] Model changed to: ${modelSize}`);
            return true;
        } else {
            this.logger.warn(`[${this.engineType}] Invalid model size: ${modelSize}`);
            return false;
        }
    }

    /**
     * Check if Whisper is installed and functional
     */
    public async healthCheck(): Promise<boolean> {
        try {
            await this.verifyWhisperInstallation();
            return this.isWhisperAvailable;
        } catch (error) {
            this.logger.error(`[${this.engineType}] Health check failed:`, error);
            return false;
        }
    }

    /**
     * Get Whisper installation information
     */
    public getInstallationInfo(): {
        pythonPath: string;
        modelSize: string;
        isAvailable: boolean;
        modelLoaded: boolean;
    } {
        return {
            pythonPath: this.pythonPath,
            modelSize: this.modelSize,
            isAvailable: this.isWhisperAvailable,
            modelLoaded: this.modelLoaded
        };
    }

    /**
     * Force model preload to reduce latency on first use
     */
    public async preloadModel(): Promise<boolean> {
        try {
            this.logger.debug(`[${this.engineType}] Preloading model: ${this.modelSize}`);
            
            // Create a dummy audio file for model loading
            const fs = require('fs');
            const tempFile = this.createTempAudioFile('.wav');
            
            // Create minimal WAV file (silence)
            const sampleRate = 16000;
            const duration = 0.1; // 100ms of silence
            const samples = Math.floor(sampleRate * duration);
            const buffer = Buffer.alloc(44 + samples * 2); // WAV header + audio data
            
            // Write minimal WAV header
            buffer.write('RIFF', 0);
            buffer.writeUInt32LE(36 + samples * 2, 4);
            buffer.write('WAVE', 8);
            buffer.write('fmt ', 12);
            buffer.writeUInt32LE(16, 16);
            buffer.writeUInt16LE(1, 20);
            buffer.writeUInt16LE(1, 22);
            buffer.writeUInt32LE(sampleRate, 24);
            buffer.writeUInt32LE(sampleRate * 2, 28);
            buffer.writeUInt16LE(2, 32);
            buffer.writeUInt16LE(16, 34);
            buffer.write('data', 36);
            buffer.writeUInt32LE(samples * 2, 40);
            
            fs.writeFileSync(tempFile, buffer);
            
            // Load model by transcribing dummy file
            await this.transcribeAudioFile(tempFile);
            
            // Cleanup
            this.cleanupTempFile(tempFile);
            
            this.logger.info(`[${this.engineType}] Model preloaded successfully`);
            return true;
            
        } catch (error) {
            this.logger.error(`[${this.engineType}] Model preload failed:`, error);
            return false;
        }
    }
}