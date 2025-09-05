/**
 * OpenWakeWord Engine for Advanced Wake Word Detection
 * Integrates with local OpenWakeWord installation via Node.js processes
 */

import { BaseWakeWordEngine } from '../base-wake-word-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    WakeWordDetection, 
    WakeWordCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class OpenWakeWordEngine extends BaseWakeWordEngine {
    private pythonPath: string = 'python';
    private openWakeWordPath: string = '';
    private isOpenWakeWordAvailable: boolean = false;
    private detectionProcess: any = null;
    private loadedModels: string[] = [];

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.OPENWAKEWORD, config, eventEmitter);
        
        // Get OpenWakeWord configuration
        const owwConfig = config.wakeWordConfig.engines[VoiceEngineType.OPENWAKEWORD];
        if (owwConfig && owwConfig.settings) {
            this.pythonPath = owwConfig.settings.pythonPath || 'python';
            this.openWakeWordPath = owwConfig.settings.openWakeWordPath || '';
        }
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing OpenWakeWord...`);

            // Check if we're in a Node.js environment
            if (typeof require === 'undefined') {
                throw new Error('OpenWakeWord requires Node.js environment (not available in browser context)');
            }

            // Verify OpenWakeWord installation
            await this.verifyOpenWakeWordInstallation();
            
            if (this.isOpenWakeWordAvailable) {
                // Load initial models
                await this.loadModels(this.models);
                
                this.isAvailable = true;
                this.logger.info(`[${this.engineType}] Initialized successfully with ${this.loadedModels.length} models`);
            } else {
                throw new Error('OpenWakeWord installation not found or not functional');
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

    private async verifyOpenWakeWordInstallation(): Promise<void> {
        try {
            const { spawn } = require('child_process');

            // Test if OpenWakeWord is available
            await this.testPythonEnvironment();
            
            this.isOpenWakeWordAvailable = true;
            this.logger.debug(`[${this.engineType}] OpenWakeWord installation verified`);

        } catch (error) {
            this.isOpenWakeWordAvailable = false;
            throw new Error(`OpenWakeWord verification failed: ${error.message}`);
        }
    }

    private async testPythonEnvironment(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            // Test script to verify OpenWakeWord installation
            const testScript = `
import sys
try:
    import openwakeword.model
    print("openwakeword_available: True")
    
    # Get available models
    from openwakeword.model import Model
    model = Model()
    models = list(model.models.keys())
    print("available_models:", ",".join(models))
    
except ImportError as e:
    print("openwakeword_available: False")
    print("openwakeword_error:", str(e))

try:
    import numpy
    import pyaudio
    print("dependencies_available: True")
except ImportError as e:
    print("dependencies_available: False")
    print("dependencies_error:", str(e))

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
                    if (output.includes('openwakeword_available: True')) {
                        this.logger.debug(`[${this.engineType}] OpenWakeWord environment verified`);
                        resolve();
                    } else {
                        reject(new Error('OpenWakeWord not available. Please install: pip install openwakeword'));
                    }
                } else {
                    reject(new Error(`OpenWakeWord test failed: ${error || 'Unknown error'}`));
                }
            });

            python.on('error', (err) => {
                reject(new Error(`Failed to run Python: ${err.message}`));
            });
        });
    }

    public async startDetection(): Promise<boolean> {
        if (!this.isOpenWakeWordAvailable || this.isRunning) {
            return false;
        }

        try {
            this.logger.debug(`[${this.engineType}] Starting wake word detection...`);

            // Create detection script
            const detectionScript = this.createDetectionScript();
            
            // Start detection process
            const { spawn } = require('child_process');
            this.detectionProcess = spawn(this.pythonPath, ['-c', detectionScript]);
            
            this.isRunning = true;

            // Handle detection output
            this.detectionProcess.stdout.on('data', (data: Buffer) => {
                this.handleDetectionOutput(data.toString());
            });

            this.detectionProcess.stderr.on('data', (data: Buffer) => {
                const error = data.toString();
                if (!error.includes('ALSA lib') && !error.includes('jackdmp')) { // Ignore common audio warnings
                    this.logger.warn(`[${this.engineType}] Detection warning: ${error}`);
                }
            });

            this.detectionProcess.on('close', (code: number) => {
                this.isRunning = false;
                this.detectionProcess = null;
                
                if (code !== 0) {
                    this.handleError('detection process', new Error(`Detection process exited with code ${code}`));
                } else {
                    this.logger.debug(`[${this.engineType}] Detection process ended normally`);
                }
            });

            this.detectionProcess.on('error', (error: Error) => {
                this.isRunning = false;
                this.detectionProcess = null;
                this.handleError('detection process start', error);
            });

            this.logger.info(`[${this.engineType}] Wake word detection started`);
            return true;

        } catch (error) {
            this.isRunning = false;
            this.detectionProcess = null;
            this.handleError('start detection', error);
            return false;
        }
    }

    public async stopDetection(): Promise<void> {
        try {
            if (this.detectionProcess) {
                this.logger.debug(`[${this.engineType}] Stopping wake word detection...`);
                
                this.detectionProcess.kill('SIGTERM');
                
                // Wait for process to exit, then force kill if needed
                setTimeout(() => {
                    if (this.detectionProcess) {
                        this.detectionProcess.kill('SIGKILL');
                    }
                }, 2000);
                
                this.detectionProcess = null;
            }
            
            this.isRunning = false;
            this.logger.info(`[${this.engineType}] Wake word detection stopped`);

        } catch (error) {
            this.handleError('stop detection', error);
        }
    }

    private createDetectionScript(): string {
        // Get full paths for the models
        const modelPathsScript = this.loadedModels.length > 0 
            ? `model_paths = ${JSON.stringify(this.loadedModels)}`
            : `
# Get pretrained model paths
import openwakeword
model_paths = [
    path for path in openwakeword.get_pretrained_model_paths() 
    if any(name in path for name in ['hey_mycroft', 'hey_jarvis', 'alexa'])
][:3]  # Limit to first 3 models
`;
        
        return `
import openwakeword.model
import pyaudio
import numpy as np
import time
import json
import sys

${modelPathsScript}

print(f"Loading OpenWakeWord models: {model_paths}")
sys.stdout.flush()

# Initialize model with specific models
model = openwakeword.model.Model(model_paths)

# Audio configuration
CHUNK = ${this.config.audio.chunkSize}
FORMAT = pyaudio.paInt16
CHANNELS = ${this.config.audio.channels}
RATE = ${this.config.audio.sampleRate}
THRESHOLD = ${this.threshold}

# Initialize PyAudio
audio = pyaudio.PyAudio()

try:
    # Open stream
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK
    )
    
    print("DETECTION_STARTED")
    sys.stdout.flush()
    
    while True:
        # Read audio chunk
        data = stream.read(CHUNK, exception_on_overflow=False)
        audio_array = np.frombuffer(data, dtype=np.int16)
        
        # Get predictions
        predictions = model.predict(audio_array)
        
        # Check for detections
        for wake_word, confidence in predictions.items():
            if confidence >= THRESHOLD:
                result = {
                    "wake_word": wake_word,
                    "confidence": float(confidence),
                    "timestamp": time.time()
                }
                print("DETECTION:", json.dumps(result))
                sys.stdout.flush()

except KeyboardInterrupt:
    print("DETECTION_STOPPED")
    
except Exception as e:
    print("ERROR:", str(e))
    
finally:
    try:
        stream.stop_stream()
        stream.close()
        audio.terminate()
    except:
        pass
        `;
    }

    private handleDetectionOutput(output: string): void {
        const lines = output.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('DETECTION:')) {
                try {
                    const jsonStr = trimmed.substring(10); // Remove "DETECTION:" prefix
                    const detection = JSON.parse(jsonStr);
                    
                    const wakeWordDetection: WakeWordDetection = {
                        wakeWord: detection.wake_word,
                        confidence: detection.confidence,
                        timestamp: detection.timestamp * 1000, // Convert to milliseconds
                        engine: this.engineType
                    };
                    
                    this.handleDetection(wakeWordDetection);
                    
                } catch (error) {
                    this.logger.error(`[${this.engineType}] Failed to parse detection result: ${error.message}`);
                }
            } else if (trimmed === 'DETECTION_STARTED') {
                this.logger.debug(`[${this.engineType}] Detection loop started successfully`);
            } else if (trimmed === 'DETECTION_STOPPED') {
                this.logger.debug(`[${this.engineType}] Detection loop stopped`);
            } else if (trimmed.startsWith('ERROR:')) {
                const errorMsg = trimmed.substring(6);
                this.handleError('detection runtime', new Error(errorMsg));
            }
        }
    }

    protected async loadModels(models: string[]): Promise<boolean> {
        try {
            // Get full model paths from Python
            const modelPaths = await this.getAvailableModelPaths();
            
            // Filter to requested models or use defaults
            if (models.length > 0) {
                this.loadedModels = modelPaths.filter(path => 
                    models.some(model => path.includes(model))
                );
            } else {
                // Use default models: hey_mycroft, hey_jarvis, alexa
                this.loadedModels = modelPaths.filter(path => 
                    path.includes('hey_mycroft') || path.includes('hey_jarvis') || path.includes('alexa')
                );
            }
            
            if (this.loadedModels.length === 0) {
                // Fallback: use first 3 available models
                this.loadedModels = modelPaths.slice(0, 3);
            }
            
            this.logger.debug(`[${this.engineType}] Loaded model paths: ${this.loadedModels.join(', ')}`);
            return true;
            
        } catch (error) {
            this.handleError('model loading', error);
            return false;
        }
    }

    protected async processAudioChunk(audioData: ArrayBuffer): Promise<WakeWordDetection[]> {
        // This method is called by the base class runDetectionLoop
        // For OpenWakeWord, we handle detection in the Python process
        // So this method is not directly used, but required by interface
        return [];
    }

    public async addModel(model: string): Promise<boolean> {
        try {
            const availableModels = await this.getAvailableModels();
            
            if (availableModels.includes(model) && !this.loadedModels.includes(model)) {
                this.loadedModels.push(model);
                this.logger.debug(`[${this.engineType}] Added model: ${model}`);
                
                // Restart detection if running
                if (this.isRunning) {
                    await this.stopDetection();
                    await this.startDetection();
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            this.handleError('add model', error);
            return false;
        }
    }

    public async removeModel(model: string): Promise<boolean> {
        try {
            const index = this.loadedModels.indexOf(model);
            
            if (index !== -1) {
                this.loadedModels.splice(index, 1);
                this.logger.debug(`[${this.engineType}] Removed model: ${model}`);
                
                // Restart detection if running
                if (this.isRunning) {
                    await this.stopDetection();
                    if (this.loadedModels.length > 0) {
                        await this.startDetection();
                    }
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            this.handleError('remove model', error);
            return false;
        }
    }

    public async getAvailableModels(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            const modelsScript = `
import openwakeword.model
try:
    model = openwakeword.model.Model()
    models = list(model.models.keys())
    print("MODELS:", ",".join(models))
except Exception as e:
    print("ERROR:", str(e))
            `;

            const python = spawn(this.pythonPath, ['-c', modelsScript]);
            let output = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0 && output.includes('MODELS:')) {
                    const modelsLine = output.split('\n').find(line => line.startsWith('MODELS:'));
                    const modelsString = modelsLine.substring(7); // Remove "MODELS:" prefix
                    const models = modelsString.split(',').map(m => m.trim()).filter(m => m.length > 0);
                    resolve(models);
                } else {
                    // Default models if detection fails
                    resolve(['hey_mycroft', 'alexa', 'hey_google', 'hey_jarvis']);
                }
            });

            setTimeout(() => {
                python.kill();
                resolve(['hey_mycroft', 'alexa']); // Fallback
            }, 5000);
        });
    }

    public async getAvailableModelPaths(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            const modelsScript = `
import openwakeword
import json
try:
    model_paths = openwakeword.get_pretrained_model_paths()
    print("MODEL_PATHS:", json.dumps(model_paths))
except Exception as e:
    print("ERROR:", str(e))
            `;

            const python = spawn(this.pythonPath, ['-c', modelsScript]);
            let output = '';

            python.stdout.on('data', (data: any) => {
                output += data.toString();
            });

            python.on('close', (code: any) => {
                if (code === 0 && output.includes('MODEL_PATHS:')) {
                    const modelPathsLine = output.split('\n').find(line => line.startsWith('MODEL_PATHS:'));
                    if (modelPathsLine) {
                        const modelPathsString = modelPathsLine.substring(12); // Remove "MODEL_PATHS:" prefix
                        try {
                            const modelPaths = JSON.parse(modelPathsString);
                            resolve(modelPaths);
                        } catch (e) {
                            resolve([]);
                        }
                    } else {
                        resolve([]);
                    }
                } else {
                    // Return empty array if detection fails
                    resolve([]);
                }
            });

            python.stderr.on('data', (data: any) => {
                this.logger.warn(`[${this.engineType}] Model paths stderr: ${data.toString()}`);
            });

            setTimeout(() => {
                python.kill();
                resolve([]); // Fallback
            }, 5000);
        });
    }

    public async getCapabilities(): Promise<WakeWordCapabilities> {
        const models = await this.getAvailableModels();
        
        return {
            models: models,
            thresholdRange: { min: 0.0, max: 1.0 },
            supportsCustomModels: true,
            maxConcurrentModels: 10
        };
    }

    public async cleanup(): Promise<void> {
        try {
            await this.stopDetection();
            this.loadedModels = [];
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Get OpenWakeWord installation information
     */
    public getInstallationInfo(): {
        pythonPath: string;
        isAvailable: boolean;
        loadedModels: string[];
    } {
        return {
            pythonPath: this.pythonPath,
            isAvailable: this.isOpenWakeWordAvailable,
            loadedModels: [...this.loadedModels]
        };
    }

    /**
     * Test OpenWakeWord with a specific model
     */
    public async testModel(model: string): Promise<boolean> {
        try {
            const availableModels = await this.getAvailableModels();
            
            if (!availableModels.includes(model)) {
                this.logger.warn(`[${this.engineType}] Model not available: ${model}`);
                return false;
            }

            this.logger.debug(`[${this.engineType}] Testing model: ${model}`);
            
            // Test by temporarily loading the model
            const originalModels = [...this.loadedModels];
            this.loadedModels = [model];
            
            const testResult = await this.test();
            
            // Restore original models
            this.loadedModels = originalModels;
            
            return testResult;
            
        } catch (error) {
            this.logger.error(`[${this.engineType}] Model test failed:`, error);
            return false;
        }
    }
}