/**
 * Voice Activity Detection Engine
 * Implements multiple VAD algorithms with confidence scoring
 */

import { VADConfig, AudioVisualizerData } from '../types/voice-types';

export interface VADResult {
    confidence: number;
    state: 'silent' | 'speech' | 'noise';
    features?: {
        energy: number;
        zcr: number;
        spectralCentroid?: number;
    };
}

export class VADEngine {
    private config: VADConfig;
    private previousStates: VADResult[] = [];
    private stateBuffer: ('silent' | 'speech' | 'noise')[] = [];
    private readonly bufferSize = 5; // Smooth state transitions
    private logger: Console;

    constructor(config: VADConfig) {
        const defaultConfig: VADConfig = {
            enabled: true,
            algorithm: 'simple',
            thresholds: {
                speech: 0.5,
                silence: 0.35,
                confidence: 0.8
            },
            sampleRate: 16000,
            frameSize: 512
        };
        
        this.config = { ...defaultConfig, ...config };
        this.logger = console;
    }

    /**
     * Main VAD processing function
     */
    public processAudioFrame(
        frequencyData: Uint8Array,
        timeData: Uint8Array,
        volumeLevel: number
    ): VADResult {
        if (!this.config.enabled) {
            return {
                confidence: 0,
                state: 'silent'
            };
        }

        let result: VADResult;

        switch (this.config.algorithm) {
            case 'spectral':
                result = this.spectralVAD(frequencyData, timeData, volumeLevel);
                break;
            case 'silero':
                // Future implementation with Silero model
                result = this.simpleVAD(frequencyData, timeData, volumeLevel);
                this.logger.warn('[VAD] Silero algorithm not yet implemented, using simple VAD');
                break;
            case 'simple':
            default:
                result = this.simpleVAD(frequencyData, timeData, volumeLevel);
                break;
        }

        // Apply temporal smoothing
        result = this.applyTemporalSmoothing(result);

        // Store for history tracking
        this.previousStates.push(result);
        if (this.previousStates.length > 10) {
            this.previousStates.shift();
        }

        return result;
    }

    /**
     * Simple energy and zero-crossing rate based VAD
     */
    private simpleVAD(
        frequencyData: Uint8Array,
        timeData: Uint8Array,
        volumeLevel: number
    ): VADResult {
        // Calculate voice frequency energy (85Hz - 2kHz range)
        const voiceFreqBins = this.getVoiceFrequencyBins(frequencyData.length);
        const voiceEnergy = this.calculateVoiceEnergy(frequencyData, voiceFreqBins);

        // Calculate zero-crossing rate
        const zcr = this.calculateZeroCrossingRate(timeData);

        // Energy-based detection
        const energyThreshold = 30; // Tuned for human voice
        const isEnergyAboveThreshold = voiceEnergy > energyThreshold;

        // Voice characteristics: moderate ZCR, not too high (noise) or too low (silence)
        const isVoiceLikeZCR = zcr > 0.02 && zcr < 0.2;

        // Combine factors for confidence and state
        let confidence = 0;
        let state: 'silent' | 'speech' | 'noise' = 'silent';

        if (isEnergyAboveThreshold && isVoiceLikeZCR) {
            // High confidence speech detection
            confidence = Math.min(0.95, 0.3 + (voiceEnergy / 100) + (volumeLevel * 0.5));
            state = 'speech';
        } else if (isEnergyAboveThreshold) {
            // Energy present but not voice-like (probably noise)
            confidence = 0.2 + (voiceEnergy / 200);
            state = 'noise';
        } else {
            // Low energy = silence
            confidence = 0.1;
            state = 'silent';
        }

        return {
            confidence,
            state,
            features: {
                energy: voiceEnergy,
                zcr: zcr
            }
        };
    }

    /**
     * Advanced spectral-based VAD with multiple features
     */
    private spectralVAD(
        frequencyData: Uint8Array,
        timeData: Uint8Array,
        volumeLevel: number
    ): VADResult {
        // Start with simple VAD as baseline
        const simpleResult = this.simpleVAD(frequencyData, timeData, volumeLevel);

        // Add spectral centroid analysis
        const spectralCentroid = this.calculateSpectralCentroid(frequencyData);
        
        // Voice typically has spectral centroid in 500-2000 Hz range
        const isVoiceSpectrum = spectralCentroid > 500 && spectralCentroid < 2000;

        // Calculate spectral flux for speech dynamics detection
        const spectralFlux = this.calculateSpectralFlux(frequencyData);
        const hasSpeechDynamics = spectralFlux > 0.1; // Threshold for speech variability

        // Enhance confidence based on spectral features
        let enhancedConfidence = simpleResult.confidence;
        let enhancedState = simpleResult.state;

        if (simpleResult.state === 'speech') {
            if (isVoiceSpectrum && hasSpeechDynamics) {
                // Strong speech indicators
                enhancedConfidence = Math.min(0.98, enhancedConfidence * 1.2);
            } else if (!isVoiceSpectrum) {
                // Spectral evidence against speech
                enhancedConfidence *= 0.7;
                if (enhancedConfidence < this.config.thresholds.speech) {
                    enhancedState = 'noise';
                }
            }
        }

        return {
            confidence: enhancedConfidence,
            state: enhancedState,
            features: {
                energy: simpleResult.features?.energy || 0,
                zcr: simpleResult.features?.zcr || 0,
                spectralCentroid: spectralCentroid
            }
        };
    }

    /**
     * Apply temporal smoothing to reduce false positives
     */
    private applyTemporalSmoothing(result: VADResult): VADResult {
        this.stateBuffer.push(result.state);
        if (this.stateBuffer.length > this.bufferSize) {
            this.stateBuffer.shift();
        }

        // Count state occurrences in buffer
        const stateCounts = this.stateBuffer.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        // Use majority vote for state smoothing
        const dominantState = Object.keys(stateCounts).reduce((a, b) => 
            stateCounts[a] > stateCounts[b] ? a : b
        ) as 'silent' | 'speech' | 'noise';

        // Adjust confidence based on consistency
        const consistency = stateCounts[dominantState] / this.stateBuffer.length;
        const smoothedConfidence = result.confidence * consistency;

        return {
            ...result,
            state: dominantState,
            confidence: smoothedConfidence
        };
    }

    /**
     * Calculate energy in voice frequency range
     */
    private calculateVoiceEnergy(frequencyData: Uint8Array, voiceFreqBins: { start: number; end: number }): number {
        const voiceSlice = frequencyData.slice(voiceFreqBins.start, voiceFreqBins.end);
        return voiceSlice.reduce((sum, val) => sum + val, 0) / voiceSlice.length;
    }

    /**
     * Calculate zero-crossing rate for voice detection
     */
    private calculateZeroCrossingRate(timeData: Uint8Array): number {
        let zeroCrossings = 0;
        const centerLine = 128; // Middle value for Uint8Array

        for (let i = 1; i < timeData.length; i++) {
            if ((timeData[i] - centerLine) * (timeData[i - 1] - centerLine) < 0) {
                zeroCrossings++;
            }
        }

        return zeroCrossings / timeData.length;
    }

    /**
     * Calculate spectral centroid (brightness of sound)
     */
    private calculateSpectralCentroid(frequencyData: Uint8Array): number {
        let weightedSum = 0;
        let magnitudeSum = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = (i / frequencyData.length) * (this.config.sampleRate / 2);
            const magnitude = frequencyData[i];
            
            weightedSum += frequency * magnitude;
            magnitudeSum += magnitude;
        }

        return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }

    /**
     * Calculate spectral flux for speech dynamics detection
     */
    private calculateSpectralFlux(frequencyData: Uint8Array): number {
        if (this.previousStates.length === 0) {
            return 0;
        }

        const lastFeatures = this.previousStates[this.previousStates.length - 1]?.features;
        if (!lastFeatures) {
            return 0;
        }

        // Simple spectral flux approximation using energy difference
        const currentEnergy = frequencyData.reduce((sum, val) => sum + val * val, 0);
        const previousEnergy = lastFeatures.energy * lastFeatures.energy;

        return Math.abs(currentEnergy - previousEnergy) / Math.max(currentEnergy, previousEnergy, 1);
    }

    /**
     * Get frequency bins corresponding to human voice range
     */
    private getVoiceFrequencyBins(fftSize: number): { start: number; end: number } {
        const nyquist = this.config.sampleRate / 2;
        const binWidth = nyquist / fftSize;
        
        // Human voice range: 85Hz - 2000Hz
        const voiceStart = 85;
        const voiceEnd = 2000;

        return {
            start: Math.floor(voiceStart / binWidth),
            end: Math.floor(voiceEnd / binWidth)
        };
    }

    /**
     * Update VAD configuration
     */
    public updateConfig(newConfig: Partial<VADConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.debug('[VAD Engine] Configuration updated:', this.config);
    }

    /**
     * Get current configuration
     */
    public getConfig(): VADConfig {
        return { ...this.config };
    }

    /**
     * Reset VAD state
     */
    public reset(): void {
        this.previousStates = [];
        this.stateBuffer = [];
        this.logger.debug('[VAD Engine] State reset');
    }

    /**
     * Get VAD statistics
     */
    public getStatistics(): {
        averageConfidence: number;
        speechPercentage: number;
        silencePercentage: number;
        noisePercentage: number;
    } {
        if (this.previousStates.length === 0) {
            return {
                averageConfidence: 0,
                speechPercentage: 0,
                silencePercentage: 100,
                noisePercentage: 0
            };
        }

        const totalStates = this.previousStates.length;
        const averageConfidence = this.previousStates.reduce((sum, state) => sum + state.confidence, 0) / totalStates;
        
        const stateCounts = this.previousStates.reduce((counts, state) => {
            counts[state.state] = (counts[state.state] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        return {
            averageConfidence,
            speechPercentage: (stateCounts.speech || 0) / totalStates * 100,
            silencePercentage: (stateCounts.silent || 0) / totalStates * 100,
            noisePercentage: (stateCounts.noise || 0) / totalStates * 100
        };
    }
}