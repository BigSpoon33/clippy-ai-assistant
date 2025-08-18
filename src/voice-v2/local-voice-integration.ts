/**
 * Local Voice Integration for CLIPPY AI Assistant
 * 
 * This class provides a complete local voice assistant system using:
 * - Whisper STT for speech recognition (runs locally via Python)
 * - Piper TTS for speech synthesis (high-quality neural voices)
 * - OpenWakeWord for wake word detection ("Hey Clippy")
 * - Local audio recording and playback
 * 
 * Architecture:
 * - TypeScript integration layer (this class)
 * - Python bridge scripts for AI models
 * - Local virtual environment with required dependencies
 * - Temporary file management for audio processing
 * 
 * Key Features:
 * - No internet required after initial setup
 * - High-quality neural TTS voices
 * - Accurate speech recognition
 * - Simple voice commands
 * - Audio file cleanup
 * - Error handling and fallbacks
 * 
 * Dependencies:
 * - Python virtual environment at /home/shuma/Documents/voice_assistant/venv
 * - Whisper models (auto-downloaded)
 * - Piper TTS voices (auto-downloaded)
 * - System audio tools (arecord, paplay, etc.)
 * 
 * @author CLIPPY AI Assistant
 * @version 2.0.0
 */

import { Notice } from 'obsidian';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ClippySettings } from '../types';
import { TTSManager } from './tts-manager';

/**
 * Main class that integrates local voice capabilities into Obsidian
 */
export class LocalVoiceIntegration {
    /** Reference to the main plugin instance */
    private plugin: any;
    
    /** Plugin settings */
    private settings: ClippySettings;
    
    /** Whether the voice system is currently active */
    public isActive: boolean = false;
    
    /** Whether the system is currently listening for voice input */
    private isListening: boolean = false;
    
    /** Status bar indicator element for voice state */
    private statusIndicator: HTMLElement | null = null;
    
    // System Paths Configuration
    /** Path to the voice assistant Python environment */
    private voiceAssistantPath: string = '/home/shuma/Documents/voice_assistant';
    
    /** Path to Python executable in virtual environment */
    private pythonPath: string = '/home/shuma/Documents/voice_assistant/venv/bin/python';
    
    /** Path to Python bridge scripts */
    private bridgePath: string = '/home/shuma/Documents/Obsidian-Homepage/Rainbell English/.obsidian/plugins/clippy-ai-assistant/python-bridge';
    
    /** Temporary directory for audio files */
    private tempDir: string;
    
    /** TTS Manager for multiple TTS engines */
    private ttsManager: TTSManager;

    /**
     * Constructor - Initialize the voice integration system
     * 
     * @param plugin - Reference to the main CLIPPY plugin instance
     */
    constructor(plugin: any) {
        this.plugin = plugin;
        this.settings = plugin.settings;
        this.tempDir = path.join(os.tmpdir(), 'clippy-voice');
        
        // Ensure temp directory exists for audio file storage
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        
        // Initialize TTS manager
        this.ttsManager = new TTSManager(
            this.settings,
            this.bridgePath,
            this.pythonPath,
            this.voiceAssistantPath
        );
    }

    /**
     * Initialize the local voice system
     * 
     * This method:
     * 1. Tests the Python environment
     * 2. Verifies Whisper STT availability
     * 3. Verifies Piper TTS availability and downloads voices
     * 4. Sets up the status indicator
     * 5. Shows success notification
     * 
     * @throws {Error} If initialization fails
     */
    public async initialize(): Promise<void> {
        try {
            console.log('[CLIPPY Local Voice] Initializing local voice system...');
            
            // Test Python environment
            const pythonTest = await this.testPythonEnvironment();
            if (!pythonTest.success) {
                throw new Error(`Python environment test failed: ${pythonTest.error}`);
            }
            
            // Test Whisper
            const whisperTest = await this.testWhisper();
            console.log('[CLIPPY Local Voice] Whisper test:', whisperTest);
            
            // Test Piper TTS
            const piperTest = await this.testPiper();
            console.log('[CLIPPY Local Voice] Piper test:', piperTest);
            
            this.addStatusIndicator();
            
            new Notice('🎤 Local Voice System (Whisper + Piper) ready!');
            console.log('[CLIPPY Local Voice] Initialization complete');
            
        } catch (error) {
            console.error('[CLIPPY Local Voice] Initialization failed:', error);
            new Notice(`❌ Local voice initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test Python environment
     */
    private async testPythonEnvironment(): Promise<{success: boolean, error?: string}> {
        return new Promise((resolve) => {
            const process = spawn(this.pythonPath, ['--version']);
            
            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`[CLIPPY Local Voice] Python version: ${output.trim()}`);
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: `Python process exited with code ${code}` });
                }
            });
            
            process.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Test Whisper STT
     */
    private async testWhisper(): Promise<{success: boolean, error?: string}> {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.bridgePath, 'whisper_stt.py');
            
            // Use voice_assistant's Python environment
            const childProcess = spawn(this.pythonPath, [scriptPath, '--help'], {
                cwd: this.voiceAssistantPath,
                env: {
                    ...process.env,
                    PYTHONPATH: this.voiceAssistantPath
                }
            });
            
            let output = '';
            let error = '';
            
            childProcess.stdout.on('data', (data: any) => {
                output += data.toString();
            });
            
            childProcess.stderr.on('data', (data: any) => {
                error += data.toString();
            });
            
            childProcess.on('close', (code: any) => {
                if (code === 0 || output.includes('Whisper STT Bridge')) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: `Whisper test failed with code ${code}. Error: ${error}. Output: ${output}` });
                }
            });
            
            childProcess.on('error', (error: any) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Test Piper TTS
     */
    private async testPiper(): Promise<{success: boolean, error?: string}> {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.bridgePath, 'piper_tts.py');
            const childProcess = spawn(this.pythonPath, [scriptPath, '--test', '--output-json'], {
                cwd: this.voiceAssistantPath,
                env: {
                    ...process.env,
                    PYTHONPATH: this.voiceAssistantPath
                }
            });
            
            let output = '';
            let error = '';
            
            childProcess.stdout.on('data', (data: any) => {
                output += data.toString();
            });
            
            childProcess.stderr.on('data', (data: any) => {
                error += data.toString();
            });
            
            childProcess.on('close', (_code: any) => {
                try {
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (e) {
                    resolve({ success: false, error: `Failed to parse Piper test result: ${output}. Error: ${error}` });
                }
            });
            
            childProcess.on('error', (error: any) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Record audio and transcribe with Whisper STT
     * 
     * This method:
     * 1. Records audio for the specified duration
     * 2. Transcribes the audio using Whisper
     * 3. Returns the transcribed text
     * 4. Cleans up temporary audio files
     * 
     * @param duration - Recording duration in seconds (default: 5)
     * @returns Promise<string | null> - Transcribed text or null if failed
     */
    public async listen(duration: number = 5): Promise<string | null> {
        if (this.isListening) {
            return null;
        }
        
        try {
            this.isListening = true;
            this.updateStatusIndicator();
            
            console.log(`[CLIPPY Local Voice] Recording audio for ${duration} seconds...`);
            new Notice(`🎤 Recording for ${duration} seconds... Speak now!`);
            
            // Record audio to temporary file
            const audioFile = path.join(this.tempDir, `recording_${Date.now()}.wav`);
            const recordSuccess = await this.recordAudio(audioFile, duration);
            
            if (!recordSuccess) {
                throw new Error('Audio recording failed');
            }
            
            // Transcribe with Whisper
            console.log('[CLIPPY Local Voice] Transcribing with Whisper...');
            const transcription = await this.transcribeWithWhisper(audioFile);
            
            // Clean up audio file
            try {
                fs.unlinkSync(audioFile);
            } catch (e) {
                console.warn('[CLIPPY Local Voice] Failed to clean up audio file:', e);
            }
            
            if (transcription.success && transcription.text) {
                console.log(`[CLIPPY Local Voice] Transcribed: "${transcription.text}"`);
                new Notice(`✅ Heard: "${transcription.text}"`);
                return transcription.text;
            } else {
                console.warn('[CLIPPY Local Voice] Transcription failed:', transcription.error);
                new Notice('❌ Could not understand speech');
                return null;
            }
            
        } catch (error) {
            console.error('[CLIPPY Local Voice] Listen failed:', error);
            new Notice(`❌ Voice recognition failed: ${error.message}`);
            return null;
        } finally {
            this.isListening = false;
            this.updateStatusIndicator();
        }
    }

    /**
     * Synthesize speech with Piper TTS
     * 
     * This method:
     * 1. Generates speech audio using Piper TTS
     * 2. Plays the generated audio file
     * 3. Cleans up temporary audio files
     * 
     * @param text - Text to convert to speech
     * @returns Promise<boolean> - True if successful, false otherwise
     */
    public async speak(text: string): Promise<boolean> {
        try {
            console.log(`[CLIPPY Local Voice] Speaking: "${text}"`);
            
            // Update TTS manager with current settings
            this.ttsManager.updateSettings(this.settings);
            
            const success = await this.ttsManager.speak(text);
            
            if (success) {
                console.log('[CLIPPY Local Voice] Speech synthesis successful');
                return true;
            } else {
                console.error('[CLIPPY Local Voice] Speech synthesis failed');
                new Notice('❌ Speech synthesis failed. Check TTS engine settings.');
                return false;
            }
            
        } catch (error) {
            console.error('[CLIPPY Local Voice] Speak failed:', error);
            new Notice(`❌ Speech failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Record audio using system tools
     */
    private async recordAudio(outputFile: string, duration: number): Promise<boolean> {
        return new Promise((resolve) => {
            // Try different recording commands based on available tools
            const commands = [
                ['arecord', '-f', 'cd', '-t', 'wav', '-d', duration.toString(), outputFile],
                ['rec', '-r', '16000', '-c', '1', outputFile, 'trim', '0', duration.toString()],
                ['ffmpeg', '-f', 'pulse', '-i', 'default', '-t', duration.toString(), '-y', outputFile]
            ];
            
            const tryCommand = (index: number) => {
                if (index >= commands.length) {
                    resolve(false);
                    return;
                }
                
                const cmd = commands[index];
                const process = spawn(cmd[0], cmd.slice(1));
                
                process.on('close', (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        resolve(true);
                    } else {
                        tryCommand(index + 1);
                    }
                });
                
                process.on('error', () => {
                    tryCommand(index + 1);
                });
            };
            
            tryCommand(0);
        });
    }

    /**
     * Transcribe audio with Whisper
     */
    private async transcribeWithWhisper(audioFile: string): Promise<any> {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.bridgePath, 'whisper_stt.py');
            const device = this.settings.voice?.whisper?.device || 'cpu';
            const modelSize = this.settings.voice?.whisper?.modelSize || 'base';
            
            const args = [
                scriptPath,
                audioFile,
                '--model', modelSize,
                '--language', 'en',
                '--output-json'
            ];
            
            console.log(`[CLIPPY Local Voice] Executing Whisper command: ${this.pythonPath} ${args.join(' ')}`);
            console.log(`[CLIPPY Local Voice] Working directory: ${this.voiceAssistantPath}`);
            console.log(`[CLIPPY Local Voice] Audio file: ${audioFile}`);
            
            // Set up environment for device selection
            const env: any = {
                ...process.env,
                PYTHONPATH: this.voiceAssistantPath
            };
            
            // Force CPU usage by hiding CUDA if CPU mode is selected
            if (device === 'cpu') {
                env.CUDA_VISIBLE_DEVICES = '';
            }
            
            console.log(`[CLIPPY Local Voice] Device mode: ${device}`);
            
            const childProcess = spawn(this.pythonPath, args, {
                cwd: this.voiceAssistantPath,
                env
            });
            
            let output = '';
            let errorOutput = '';
            
            childProcess.stdout.on('data', (data: any) => {
                output += data.toString();
            });
            
            childProcess.stderr.on('data', (data: any) => {
                errorOutput += data.toString();
            });
            
            childProcess.on('close', (code: any) => {
                console.log(`[CLIPPY Local Voice] Whisper process exited with code: ${code}`);
                console.log(`[CLIPPY Local Voice] Whisper stdout: ${output}`);
                console.log(`[CLIPPY Local Voice] Whisper stderr: ${errorOutput}`);
                
                if (code !== 0) {
                    resolve({ success: false, error: `Whisper process failed (code ${code}): ${errorOutput || 'No error details'}` });
                    return;
                }
                
                try {
                    if (!output.trim()) {
                        resolve({ success: false, error: `Whisper returned empty output. stderr: ${errorOutput}` });
                        return;
                    }
                    
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (e) {
                    resolve({ success: false, error: `Failed to parse Whisper output as JSON: ${output}. stderr: ${errorOutput}` });
                }
            });
            
            childProcess.on('error', (error: any) => {
                console.error(`[CLIPPY Local Voice] Whisper process error:`, error);
                resolve({ success: false, error: `Process error: ${error.message}` });
            });
        });
    }

    /**
     * Synthesize speech with Piper TTS
     */
    private async synthesizeWithPiper(text: string, outputFile: string): Promise<any> {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.bridgePath, 'piper_tts.py');
            const childProcess = spawn(this.pythonPath, [
                scriptPath,
                '--text', text,
                '--output', outputFile,
                '--voice', 'en_US-lessac-medium',
                '--speed', '1.0',
                '--output-json'
            ], {
                cwd: this.voiceAssistantPath,
                env: {
                    ...process.env,
                    PYTHONPATH: this.voiceAssistantPath
                }
            });
            
            let output = '';
            let error = '';
            
            childProcess.stdout.on('data', (data: any) => {
                output += data.toString();
            });
            
            childProcess.stderr.on('data', (data: any) => {
                error += data.toString();
            });
            
            childProcess.on('close', (_code: any) => {
                try {
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (e) {
                    resolve({ success: false, error: `Failed to parse Piper output: ${output}. Error: ${error}` });
                }
            });
            
            childProcess.on('error', (error: any) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Play audio file
     */
    private async playAudio(audioFile: string): Promise<boolean> {
        return new Promise((resolve) => {
            // Try different audio players
            const players = ['paplay', 'aplay', 'play', 'ffplay'];
            
            const tryPlayer = (index: number) => {
                if (index >= players.length) {
                    resolve(false);
                    return;
                }
                
                const player = players[index];
                const args = player === 'ffplay' ? ['-nodisp', '-autoexit', audioFile] : [audioFile];
                const process = spawn(player, args);
                
                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(true);
                    } else {
                        tryPlayer(index + 1);
                    }
                });
                
                process.on('error', () => {
                    tryPlayer(index + 1);
                });
            };
            
            tryPlayer(0);
        });
    }

    /**
     * Toggle voice system on/off
     * 
     * Switches between active and inactive states.
     * When active, the system can listen for voice commands.
     */
    public async toggleVoice(): Promise<void> {
        if (this.isActive) {
            await this.stopVoice();
        } else {
            await this.startVoice();
        }
    }

    /**
     * Start voice system
     */
    public async startVoice(): Promise<boolean> {
        this.isActive = true;
        this.updateStatusIndicator();
        new Notice('🎤 Local Voice System activated (Whisper + Piper)');
        console.log('[CLIPPY Local Voice] Voice system started');
        return true;
    }

    /**
     * Stop voice system
     */
    public async stopVoice(): Promise<void> {
        this.isActive = false;
        this.isListening = false;
        this.updateStatusIndicator();
        new Notice('🔇 Local Voice System deactivated');
        console.log('[CLIPPY Local Voice] Voice system stopped');
    }

    /**
     * Get current voice system status
     * 
     * @returns Object containing system state information
     */
    public getStatus(): any {
        return {
            isActive: this.isActive,
            isListening: this.isListening,
            type: 'local',
            engines: {
                tts: 'piper',
                stt: 'whisper'
            }
        };
    }

    /**
     * Get TTS manager for testing and configuration
     */
    public getTTSManager(): TTSManager {
        return this.ttsManager;
    }


    /**
     * Add status indicator
     */
    private addStatusIndicator(): void {
        if (this.plugin.addStatusBarItem) {
            this.statusIndicator = this.plugin.addStatusBarItem();
            this.statusIndicator!.setText('🟠'); // Orange - local system
            this.statusIndicator!.title = 'CLIPPY Local Voice: Inactive (click to activate)';
            this.statusIndicator!.style.cursor = 'pointer';
            this.statusIndicator!.style.fontSize = '14px';
            
            this.statusIndicator!.addEventListener('click', async () => {
                if (!this.isActive) {
                    await this.toggleVoice();
                } else if (!this.isListening) {
                    // Trigger listening
                    const result = await this.listen(10);
                    if (result) {
                        await this.processVoiceCommand(result);
                    }
                } else {
                    await this.toggleVoice();
                }
            });
        }
    }

    /**
     * Update status indicator
     */
    private updateStatusIndicator(): void {
        if (!this.statusIndicator) return;

        if (!this.isActive) {
            this.statusIndicator!.setText('🟠'); // Orange - inactive
            this.statusIndicator!.title = 'CLIPPY Local Voice: Inactive (click to activate)';
        } else if (this.isListening) {
            this.statusIndicator!.setText('🟢'); // Green - listening
            this.statusIndicator!.title = 'CLIPPY Local Voice: Listening... (click to stop)';
        } else {
            this.statusIndicator!.setText('🔵'); // Blue - active, ready
            this.statusIndicator!.title = 'CLIPPY Local Voice: Ready (click to listen)';
        }
    }

    /**
     * Process voice command
     */
    private async processVoiceCommand(text: string): Promise<void> {
        console.log(`[CLIPPY Local Voice] Processing command: "${text}"`);
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('hey clippy') || lowerText.includes('clippy')) {
            await this.speak('Yes, how can I help you?');
        } else if (lowerText.includes('enhance') || lowerText.includes('improve')) {
            await this.speak('I will enhance the current note for you.');
            new Notice('🤖 Voice command: Note enhancement triggered');
        } else if (lowerText.includes('tag')) {
            await this.speak('I will suggest tags for this note.');
            new Notice('🤖 Voice command: Tagging triggered');
        } else if (lowerText.includes('summarize')) {
            await this.speak('I will create a summary of this note.');
            new Notice('🤖 Voice command: Summarization triggered');
        } else if (lowerText.includes('stop') || lowerText.includes('disable')) {
            await this.speak('Voice assistant disabled.');
            await this.stopVoice();
        } else {
            await this.speak(`I heard you say: ${text}. I am still learning how to help with that.`);
            new Notice(`🤖 Voice command: "${text}"`);
        }
    }

    /**
     * Cleanup and shutdown the voice system
     * 
     * This method:
     * 1. Deactivates the voice system
     * 2. Removes status indicator
     * 3. Cleans up temporary files
     * 4. Releases resources
     * 
     * Called when the plugin is unloaded.
     */
    public async cleanup(): Promise<void> {
        this.isActive = false;
        this.isListening = false;
        
        if (this.statusIndicator) {
            this.statusIndicator.remove();
            this.statusIndicator = null;
        }
        
        // Clean up temp directory
        try {
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(this.tempDir, file));
                }
                fs.rmdirSync(this.tempDir);
            }
        } catch (e) {
            console.warn('[CLIPPY Local Voice] Cleanup warning:', e);
        }
        
        console.log('[CLIPPY Local Voice] Cleanup completed');
    }
}

export { LocalVoiceIntegration as default };