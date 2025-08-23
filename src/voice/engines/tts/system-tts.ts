/**
 * System TTS Engine
 * Uses system-level text-to-speech commands (espeak, say, etc.) as ultimate fallback
 */

import { BaseTTSEngine } from '../base-tts-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    SynthesisResult, 
    TTSCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class SystemTTSEngine extends BaseTTSEngine {
    private systemCommand: string = '';
    private platform: string = '';
    private availableVoices: string[] = [];

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.SYSTEM_TTS, config, eventEmitter);
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing System TTS...`);

            // Check if we're in a Node.js environment
            if (typeof require === 'undefined') {
                throw new Error('System TTS requires Node.js environment');
            }

            // Detect platform and find appropriate TTS command
            await this.detectSystemTTS();
            
            if (this.systemCommand) {
                // Load available voices
                await this.loadSystemVoices();
                
                this.isAvailable = true;
                this.logger.info(`[${this.engineType}] Initialized successfully with command: ${this.systemCommand}`);
            } else {
                throw new Error('No system TTS command found');
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

    private async detectSystemTTS(): Promise<void> {
        const os = require('os');
        this.platform = os.platform();

        this.logger.debug(`[${this.engineType}] Detecting TTS for platform: ${this.platform}`);

        switch (this.platform) {
            case 'darwin': // macOS
                if (await this.testCommand('say', ['--version'])) {
                    this.systemCommand = 'say';
                }
                break;
                
            case 'linux':
                // Try espeak first (most common)
                if (await this.testCommand('espeak', ['--version'])) {
                    this.systemCommand = 'espeak';
                }
                // Try espeak-ng as alternative
                else if (await this.testCommand('espeak-ng', ['--version'])) {
                    this.systemCommand = 'espeak-ng';
                }
                // Try festival
                else if (await this.testCommand('festival', ['--version'])) {
                    this.systemCommand = 'festival';
                }
                // Try flite
                else if (await this.testCommand('flite', ['--version'])) {
                    this.systemCommand = 'flite';
                }
                break;
                
            case 'win32': // Windows
                // Try PowerShell's built-in speech
                if (await this.testPowerShellSpeech()) {
                    this.systemCommand = 'powershell';
                }
                break;
                
            default:
                throw new Error(`Unsupported platform: ${this.platform}`);
        }

        if (!this.systemCommand) {
            throw new Error(`No TTS command found for platform: ${this.platform}`);
        }
    }

    private async testCommand(command: string, args: string[] = []): Promise<boolean> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            const process = spawn(command, args, { 
                stdio: ['ignore', 'ignore', 'ignore'] 
            });
            
            const timeout = setTimeout(() => {
                process.kill();
                resolve(false);
            }, 2000);
            
            process.on('close', (code) => {
                clearTimeout(timeout);
                resolve(code !== null); // Command exists if it returns any exit code
            });
            
            process.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    private async testPowerShellSpeech(): Promise<boolean> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            const testScript = 'Add-Type -AssemblyName System.Speech; $null';
            const process = spawn('powershell', ['-Command', testScript], {
                stdio: ['ignore', 'ignore', 'ignore']
            });
            
            const timeout = setTimeout(() => {
                process.kill();
                resolve(false);
            }, 3000);
            
            process.on('close', (code) => {
                clearTimeout(timeout);
                resolve(code === 0);
            });
            
            process.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    private async loadSystemVoices(): Promise<void> {
        try {
            switch (this.systemCommand) {
                case 'say': // macOS
                    this.availableVoices = await this.getMacOSVoices();
                    break;
                case 'espeak':
                case 'espeak-ng':
                    this.availableVoices = await this.getEspeakVoices();
                    break;
                case 'powershell':
                    this.availableVoices = await this.getWindowsVoices();
                    break;
                default:
                    this.availableVoices = ['default'];
            }
            
            this.logger.debug(`[${this.engineType}] Loaded ${this.availableVoices.length} system voices`);
        } catch (error) {
            this.logger.warn(`[${this.engineType}] Failed to load system voices:`, error);
            this.availableVoices = ['default'];
        }
    }

    private async getMacOSVoices(): Promise<string[]> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const process = spawn('say', ['-v', '?']);
            
            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', () => {
                const voices = output.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => line.split(/\s+/)[0])
                    .filter(voice => voice && voice.length > 0);
                    
                resolve(voices.length > 0 ? voices : ['Alex']);
            });
            
            setTimeout(() => {
                process.kill();
                resolve(['Alex']);
            }, 3000);
        });
    }

    private async getEspeakVoices(): Promise<string[]> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const process = spawn(this.systemCommand, ['--voices']);
            
            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', () => {
                const voices = output.split('\n')
                    .slice(1) // Skip header
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => line.split(/\s+/)[4]) // Voice name is usually 5th column
                    .filter(voice => voice && voice.length > 0);
                    
                resolve(voices.length > 0 ? voices : ['en']);
            });
            
            setTimeout(() => {
                process.kill();
                resolve(['en']);
            }, 3000);
        });
    }

    private async getWindowsVoices(): Promise<string[]> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            const script = `
                Add-Type -AssemblyName System.Speech;
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
                $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
            `;
            
            const process = spawn('powershell', ['-Command', script]);
            
            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', () => {
                const voices = output.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                    
                resolve(voices.length > 0 ? voices : ['Microsoft David Desktop']);
            });
            
            setTimeout(() => {
                process.kill();
                resolve(['Microsoft David Desktop']);
            }, 5000);
        });
    }

    protected async generateSpeech(text: string): Promise<SynthesisResult> {
        this.validateText(text);

        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            try {
                const startTime = Date.now();
                let args: string[] = [];
                
                // Build command arguments based on system
                switch (this.systemCommand) {
                    case 'say': // macOS
                        args = ['-v', this.currentVoice || 'Alex', '-r', (this.currentSpeed * 200).toString(), text];
                        break;
                        
                    case 'espeak':
                    case 'espeak-ng':
                        args = ['-v', this.currentVoice || 'en', '-s', (this.currentSpeed * 175).toString(), text];
                        break;
                        
                    case 'powershell': // Windows
                        const script = `
                            Add-Type -AssemblyName System.Speech;
                            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
                            $synth.SelectVoice('${this.currentVoice || 'Microsoft David Desktop'}');
                            $synth.Rate = ${Math.round((this.currentSpeed - 1) * 10)};
                            $synth.Volume = ${Math.round(this.currentVolume * 100)};
                            $synth.Speak('${text.replace(/'/g, "''")}');
                        `;
                        args = ['-Command', script];
                        break;
                        
                    default:
                        reject(new Error(`Unknown system command: ${this.systemCommand}`));
                        return;
                }

                this.logger.debug(`[${this.engineType}] Executing: ${this.systemCommand} ${args.join(' ')}`);
                
                const process = spawn(this.systemCommand, args);
                
                let error = '';
                process.stderr.on('data', (data) => {
                    error += data.toString();
                });

                process.on('close', (code) => {
                    const duration = Date.now() - startTime;
                    
                    if (code === 0) {
                        this.logger.debug(`[${this.engineType}] Speech completed in ${duration}ms`);
                        
                        resolve({
                            audioData: undefined, // System TTS doesn't provide audio data
                            filePath: undefined,
                            duration: duration,
                            timestamp: startTime,
                            engine: this.engineType
                        });
                    } else {
                        reject(new Error(`System TTS failed with code ${code}: ${error}`));
                    }
                });

                process.on('error', (err) => {
                    reject(new Error(`Failed to run system TTS: ${err.message}`));
                });

                // Set timeout
                setTimeout(() => {
                    process.kill();
                    reject(new Error('System TTS timeout after 30 seconds'));
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
                this.logger.debug(`[${this.engineType}] Voice set to: ${partialMatch} (partial match)`);
                return true;
            } else {
                this.logger.warn(`[${this.engineType}] Voice not found: ${voice}`);
                return false;
            }
        }
    }

    public async setSpeed(speed: number): Promise<void> {
        this.currentSpeed = Math.max(0.1, Math.min(3.0, speed));
        this.logger.debug(`[${this.engineType}] Speed set to: ${this.currentSpeed}`);
    }

    public async setVolume(volume: number): Promise<void> {
        this.currentVolume = Math.max(0.0, Math.min(1.0, volume));
        this.logger.debug(`[${this.engineType}] Volume set to: ${this.currentVolume}`);
    }

    public async getAvailableVoices(): Promise<string[]> {
        return [...this.availableVoices];
    }

    public async getCapabilities(): Promise<TTSCapabilities> {
        return {
            voices: [...this.availableVoices],
            languages: this.getSystemLanguages(),
            speedRange: { min: 0.1, max: 3.0 },
            volumeRange: { min: 0.0, max: 1.0 },
            supportsSSML: false,
            maxTextLength: 5000 // Conservative limit for system commands
        };
    }

    private getSystemLanguages(): string[] {
        switch (this.platform) {
            case 'darwin':
                return ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP'];
            case 'linux':
                return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru'];
            case 'win32':
                return ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'];
            default:
                return ['en-US'];
        }
    }

    public async cleanup(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Get system information
     */
    public getSystemInfo(): {
        platform: string;
        command: string;
        voices: string[];
    } {
        return {
            platform: this.platform,
            command: this.systemCommand,
            voices: [...this.availableVoices]
        };
    }
}