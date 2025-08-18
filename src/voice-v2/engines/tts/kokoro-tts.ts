/**
 * Kokoro TTS Engine for Local High-Quality Speech Synthesis
 * Integrates with local Kokoro TTS installation via Node.js processes
 */

import { BaseTTSEngine } from '../base-tts-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    SynthesisResult, 
    TTSCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class KokoroTTSEngine extends BaseTTSEngine {
    private kokoroPath: string = '';
    private pythonPath: string = 'python';
    private availableVoices: string[] = [];
    private isKokoroAvailable: boolean = false;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.KOKORO_TTS, config, eventEmitter);
        
        // Get Kokoro path from config
        const kokoroConfig = config.tts.engines[VoiceEngineType.KOKORO_TTS];
        if (kokoroConfig && kokoroConfig.settings) {
            this.kokoroPath = kokoroConfig.settings.kokoroPath || '';
            this.pythonPath = kokoroConfig.settings.pythonPath || 'python';
        }
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing Kokoro TTS...`);

            // Check if we're in a Node.js environment (Obsidian's Electron context)
            if (typeof require === 'undefined') {
                throw new Error('Kokoro TTS requires Node.js environment (not available in browser context)');
            }

            // Verify Kokoro installation
            await this.verifyKokoroInstallation();
            
            if (this.isKokoroAvailable) {
                // Load available voices
                await this.loadAvailableVoices();
                
                // Set initial voice
                await this.setVoice(this.currentVoice);
                
                this.isAvailable = true;
                this.logger.info(`[${this.engineType}] Initialized successfully with ${this.availableVoices.length} voices`);
            } else {
                throw new Error('Kokoro TTS installation not found or not functional');
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

    private async verifyKokoroInstallation(): Promise<void> {
        try {
            const { spawn } = require('child_process');
            const path = require('path');
            const fs = require('fs');

            // Check if Kokoro path exists
            if (!this.kokoroPath || !fs.existsSync(this.kokoroPath)) {
                // Try to find Kokoro in common locations
                const commonPaths = [
                    './kokoro',
                    './Kokoro-82M-WebUI',
                    '../kokoro',
                    '../../kokoro',
                    path.join(process.cwd(), 'kokoro'),
                    path.join(process.cwd(), 'Kokoro-82M-WebUI')
                ];

                for (const testPath of commonPaths) {
                    if (fs.existsSync(testPath)) {
                        this.kokoroPath = testPath;
                        this.logger.debug(`[${this.engineType}] Found Kokoro at: ${testPath}`);
                        break;
                    }
                }

                if (!this.kokoroPath) {
                    throw new Error('Kokoro TTS directory not found. Please install Kokoro TTS or set kokoroPath in configuration.');
                }
            }

            // Test Python and required packages
            await this.testPythonEnvironment();
            
            this.isKokoroAvailable = true;
            this.logger.debug(`[${this.engineType}] Kokoro installation verified at: ${this.kokoroPath}`);

        } catch (error) {
            this.isKokoroAvailable = false;
            throw new Error(`Kokoro verification failed: ${error.message}`);
        }
    }

    private async testPythonEnvironment(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            // Test script to verify Kokoro dependencies
            const testScript = `
import sys
try:
    import torch
    import torchaudio
    print("torch_version:", torch.__version__)
    print("torch_available: True")
except ImportError as e:
    print("torch_available: False")
    print("torch_error:", str(e))

try:
    import numpy
    print("numpy_available: True")
except ImportError as e:
    print("numpy_available: False")

print("python_version:", sys.version)
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
                    if (output.includes('torch_available: True')) {
                        this.logger.debug(`[${this.engineType}] Python environment verified`);
                        resolve();
                    } else {
                        reject(new Error('PyTorch not available. Please install: pip install torch torchaudio'));
                    }
                } else {
                    reject(new Error(`Python test failed: ${error || 'Unknown error'}`));
                }
            });

            python.on('error', (err) => {
                reject(new Error(`Failed to run Python: ${err.message}`));
            });
        });
    }

    private async loadAvailableVoices(): Promise<void> {
        try {
            // Default Kokoro voices (these are standard)
            this.availableVoices = [
                'af_bella', 'af_sarah', 'af_sky', 'af_grace', 'af_ruby',
                'am_adam', 'am_michael', 'am_daniel', 'am_wayne', 'am_ryan',
                'bf_emma', 'bf_isabella', 'bf_jenny', 'bf_lily',
                'bm_george', 'bm_lewis', 'bm_ben', 'bm_tom'
            ];

            // TODO: Could check for custom voices in the Kokoro voices directory
            // const path = require('path');
            // const fs = require('fs');
            // const voicesDir = path.join(this.kokoroPath, 'voices');
            // if (fs.existsSync(voicesDir)) {
            //     const voiceFiles = fs.readdirSync(voicesDir).filter(f => f.endsWith('.pt'));
            //     this.availableVoices.push(...voiceFiles.map(f => f.replace('.pt', '')));
            // }

            this.logger.debug(`[${this.engineType}] Loaded ${this.availableVoices.length} voices`);
        } catch (error) {
            this.handleError('voice loading', error);
        }
    }

    protected async generateSpeech(text: string): Promise<SynthesisResult> {
        this.validateText(text);

        if (!this.isKokoroAvailable) {
            throw new Error('Kokoro TTS is not available');
        }

        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const path = require('path');
            const fs = require('fs');

            try {
                // Create temporary output file
                const outputFile = this.createTempFile('.wav');
                
                // Prepare Kokoro TTS script
                const ttsScript = `
import sys
import os
sys.path.insert(0, "${this.kokoroPath}")

try:
    from kokoro import KPipeline
    import torch
    import torchaudio
    
    # Initialize pipeline
    pipeline = KPipeline('a', device='cpu')  # Using CPU for compatibility
    
    text = """${text.replace(/"/g, '\\"')}"""
    voice = "${this.currentVoice}"
    speed = ${this.currentSpeed}
    output_file = "${outputFile}"
    
    # Generate audio
    audio_chunks = []
    for result in pipeline(text, voice=voice, speed=speed):
        if result.audio is not None:
            audio_chunks.append(result.audio)
    
    if audio_chunks:
        # Concatenate and save
        full_audio = torch.cat(audio_chunks, dim=0)
        torchaudio.save(output_file, full_audio.unsqueeze(0), 24000)
        print(f"SUCCESS: {output_file}")
    else:
        print("ERROR: No audio generated")
        
except Exception as e:
    print(f"ERROR: {str(e)}")
                `;

                const startTime = Date.now();
                const python = spawn(this.pythonPath, ['-c', ttsScript]);
                
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    const duration = Date.now() - startTime;
                    
                    if (code === 0 && output.includes('SUCCESS:') && fs.existsSync(outputFile)) {
                        this.logger.debug(`[${this.engineType}] Speech generated in ${duration}ms: ${outputFile}`);
                        
                        resolve({
                            audioData: undefined, // Could read file to ArrayBuffer if needed
                            filePath: outputFile,
                            duration: duration,
                            timestamp: startTime,
                            engine: this.engineType
                        });
                    } else {
                        // Clean up failed output file
                        try {
                            if (fs.existsSync(outputFile)) {
                                fs.unlinkSync(outputFile);
                            }
                        } catch (cleanupError) {
                            // Ignore cleanup errors
                        }
                        
                        const errorMsg = error || output || 'Unknown Kokoro TTS error';
                        reject(new Error(`Kokoro TTS failed: ${errorMsg}`));
                    }
                });

                python.on('error', (err) => {
                    reject(new Error(`Failed to run Kokoro TTS: ${err.message}`));
                });

                // Set timeout for long operations
                setTimeout(() => {
                    python.kill();
                    reject(new Error('Kokoro TTS timeout after 30 seconds'));
                }, 30000);

            } catch (error) {
                reject(error);
            }
        });
    }

    public async setVoice(voice: string): Promise<boolean> {
        if (this.availableVoices.includes(voice)) {
            this.currentVoice = voice;
            this.logger.debug(`[${this.engineType}] Voice set to: ${voice}`);
            return true;
        } else {
            // Try partial match
            const partialMatch = this.availableVoices.find(v => 
                v.toLowerCase().includes(voice.toLowerCase())
            );
            
            if (partialMatch) {
                this.currentVoice = partialMatch;
                this.logger.debug(`[${this.engineType}] Voice set to: ${partialMatch} (partial match for: ${voice})`);
                return true;
            } else {
                this.logger.warn(`[${this.engineType}] Voice not found: ${voice}, using default: ${this.availableVoices[0]}`);
                this.currentVoice = this.availableVoices[0] || 'af_bella';
                return false;
            }
        }
    }

    public async setSpeed(speed: number): Promise<void> {
        // Kokoro supports speed range 0.1 to 3.0
        this.currentSpeed = Math.max(0.1, Math.min(3.0, speed));
        this.logger.debug(`[${this.engineType}] Speed set to: ${this.currentSpeed}`);
    }

    public async setVolume(volume: number): Promise<void> {
        // Kokoro doesn't directly support volume control in the pipeline
        // Volume would need to be handled at playback level
        this.currentVolume = Math.max(0.0, Math.min(1.0, volume));
        this.logger.debug(`[${this.engineType}] Volume set to: ${this.currentVolume} (applied at playback)`);
    }

    public async getAvailableVoices(): Promise<string[]> {
        return [...this.availableVoices];
    }

    public async getCapabilities(): Promise<TTSCapabilities> {
        return {
            voices: [...this.availableVoices],
            languages: ['en-US', 'en-GB'], // Kokoro primarily supports English
            speedRange: { min: 0.1, max: 3.0 },
            volumeRange: { min: 0.0, max: 1.0 }, // Applied at playback
            supportsSSML: false,
            maxTextLength: 10000 // Reasonable limit for Kokoro
        };
    }

    public async cleanup(): Promise<void> {
        try {
            // Clean up any temporary files
            // Note: In a production system, you might want to track and clean up temp files
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Check if Kokoro is installed and functional
     */
    public async healthCheck(): Promise<boolean> {
        try {
            await this.verifyKokoroInstallation();
            return this.isKokoroAvailable;
        } catch (error) {
            this.logger.error(`[${this.engineType}] Health check failed:`, error);
            return false;
        }
    }

    /**
     * Get Kokoro installation information
     */
    public getInstallationInfo(): {
        kokoroPath: string;
        pythonPath: string;
        isAvailable: boolean;
        voices: string[];
    } {
        return {
            kokoroPath: this.kokoroPath,
            pythonPath: this.pythonPath,
            isAvailable: this.isKokoroAvailable,
            voices: [...this.availableVoices]
        };
    }
}