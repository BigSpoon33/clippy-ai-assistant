/**
 * Keyword Spotting Engine
 * Simple fallback wake word detection using basic text matching
 */

import { BaseWakeWordEngine } from '../base-wake-word-engine';
import { 
    VoiceEngineType, 
    VoiceConfiguration, 
    WakeWordDetection, 
    WakeWordCapabilities,
    VoiceEventEmitter 
} from '../../types/voice-types';

export class KeywordSpottingEngine extends BaseWakeWordEngine {
    private keywords: string[] = [];
    private sttEngine: any = null; // Will use Web Speech API for continuous listening
    private isListening: boolean = false;
    private recognition: any = null;

    constructor(config: VoiceConfiguration, eventEmitter: VoiceEventEmitter) {
        super(VoiceEngineType.KEYWORD_SPOTTING, config, eventEmitter);
        
        // Convert models to keywords
        this.keywords = this.models.map(model => model.toLowerCase());
        
        // Add default keywords if none specified
        if (this.keywords.length === 0) {
            this.keywords = ['hey clippy', 'clippy', 'hey assistant', 'assistant'];
        }
    }

    protected async initialize(): Promise<void> {
        try {
            this.logger.debug(`[${this.engineType}] Initializing Keyword Spotting...`);

            // Check if Web Speech API is available for continuous listening
            if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
                throw new Error('Web Speech API not supported - required for keyword spotting fallback');
            }

            // Initialize speech recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure for continuous listening
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;

            this.isAvailable = true;
            this.logger.info(`[${this.engineType}] Initialized successfully with keywords: ${this.keywords.join(', ')}`);
            
            this.eventEmitter.emit('engine-initialized', {
                engine: this.engineType,
                available: true
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

    public async startDetection(): Promise<boolean> {
        if (!this.isAvailable || this.isRunning || !this.recognition) {
            return false;
        }

        try {
            this.logger.debug(`[${this.engineType}] Starting keyword spotting detection...`);

            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            this.isRunning = true;
            this.isListening = false;

            // Set up recognition event handlers
            this.setupRecognitionHandlers();

            // Start recognition
            this.recognition.start();
            
            this.logger.info(`[${this.engineType}] Keyword spotting detection started`);
            return true;

        } catch (error) {
            this.isRunning = false;
            this.handleError('start detection', error);
            return false;
        }
    }

    public async stopDetection(): Promise<void> {
        try {
            if (this.recognition && this.isRunning) {
                this.logger.debug(`[${this.engineType}] Stopping keyword spotting detection...`);
                
                this.recognition.stop();
                this.isRunning = false;
                this.isListening = false;
                
                this.logger.info(`[${this.engineType}] Keyword spotting detection stopped`);
            }
        } catch (error) {
            this.handleError('stop detection', error);
        }
    }

    private setupRecognitionHandlers(): void {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.logger.debug(`[${this.engineType}] Speech recognition started`);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.logger.debug(`[${this.engineType}] Speech recognition ended`);
            
            // Restart recognition if still supposed to be running
            if (this.isRunning && this.isAvailable) {
                setTimeout(() => {
                    if (this.isRunning && this.recognition) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            this.logger.warn(`[${this.engineType}] Failed to restart recognition:`, error);
                        }
                    }
                }, 1000);
            }
        };

        this.recognition.onresult = (event: any) => {
            try {
                // Process all results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript.toLowerCase().trim();
                    
                    if (transcript.length > 0) {
                        this.processTranscript(transcript, result.isFinal);
                    }
                }
            } catch (error) {
                this.logger.error(`[${this.engineType}] Error processing recognition result:`, error);
            }
        };

        this.recognition.onerror = (event: any) => {
            this.logger.warn(`[${this.engineType}] Recognition error: ${event.error}`);
            
            // Don't treat certain errors as fatal
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                return;
            }
            
            // Handle network errors by retrying
            if (event.error === 'network') {
                this.logger.debug(`[${this.engineType}] Network error, will retry...`);
                return;
            }
            
            // Other errors might be more serious
            if (event.error === 'not-allowed') {
                this.handleError('recognition permission', new Error('Microphone permission denied'));
                this.isRunning = false;
            }
        };
    }

    private processTranscript(transcript: string, isFinal: boolean): void {
        // Check for keyword matches
        for (const keyword of this.keywords) {
            if (this.matchesKeyword(transcript, keyword)) {
                const confidence = this.calculateConfidence(transcript, keyword);
                
                // Only trigger on final results or high confidence interim results
                if (isFinal || confidence > 0.8) {
                    const detection: WakeWordDetection = {
                        wakeWord: keyword,
                        confidence: confidence,
                        timestamp: Date.now(),
                        engine: this.engineType
                    };
                    
                    this.handleDetection(detection);
                    break; // Only trigger once per transcript
                }
            }
        }
    }

    private matchesKeyword(transcript: string, keyword: string): boolean {
        // Simple contains check
        if (transcript.includes(keyword)) {
            return true;
        }
        
        // Check for partial matches (for multi-word keywords)
        const keywordWords = keyword.split(' ');
        const transcriptWords = transcript.split(' ');
        
        // Look for sequence of keyword words in transcript
        for (let i = 0; i <= transcriptWords.length - keywordWords.length; i++) {
            let match = true;
            for (let j = 0; j < keywordWords.length; j++) {
                if (transcriptWords[i + j] !== keywordWords[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        
        // Check for fuzzy matching (simple character similarity)
        return this.fuzzyMatch(transcript, keyword);
    }

    private fuzzyMatch(transcript: string, keyword: string): boolean {
        // Simple fuzzy matching for minor speech recognition errors
        const similarity = this.calculateSimilarity(transcript, keyword);
        return similarity > 0.7; // 70% similarity threshold
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance-based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    private calculateConfidence(transcript: string, keyword: string): number {
        // Calculate confidence based on match quality
        if (transcript.includes(keyword)) {
            return 0.9; // High confidence for exact match
        }
        
        // Lower confidence for fuzzy matches
        const similarity = this.calculateSimilarity(transcript, keyword);
        return Math.max(0.5, similarity); // Minimum 50% confidence
    }

    protected async loadModels(models: string[]): Promise<boolean> {
        try {
            // Convert models to keywords
            this.keywords = models.map(model => model.toLowerCase());
            
            // Add variations and common misspellings
            const expandedKeywords = [];
            for (const keyword of this.keywords) {
                expandedKeywords.push(keyword);
                
                // Add common variations
                if (keyword.includes('hey')) {
                    expandedKeywords.push(keyword.replace('hey', 'hi'));
                    expandedKeywords.push(keyword.replace('hey', 'hello'));
                }
                
                if (keyword.includes('clippy')) {
                    expandedKeywords.push(keyword.replace('clippy', 'clipy'));
                    expandedKeywords.push(keyword.replace('clippy', 'clippi'));
                }
            }
            
            this.keywords = [...new Set(expandedKeywords)]; // Remove duplicates
            
            this.logger.debug(`[${this.engineType}] Loaded keywords: ${this.keywords.join(', ')}`);
            return true;
            
        } catch (error) {
            this.handleError('model loading', error);
            return false;
        }
    }

    protected async processAudioChunk(audioData: ArrayBuffer): Promise<WakeWordDetection[]> {
        // This method is called by the base class runDetectionLoop
        // For keyword spotting, we handle detection through speech recognition
        // So this method is not directly used, but required by interface
        return [];
    }

    public async addModel(model: string): Promise<boolean> {
        try {
            const keyword = model.toLowerCase();
            
            if (!this.keywords.includes(keyword)) {
                this.keywords.push(keyword);
                this.logger.debug(`[${this.engineType}] Added keyword: ${keyword}`);
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
            const keyword = model.toLowerCase();
            const index = this.keywords.indexOf(keyword);
            
            if (index !== -1) {
                this.keywords.splice(index, 1);
                this.logger.debug(`[${this.engineType}] Removed keyword: ${keyword}`);
                return true;
            }
            
            return false;
        } catch (error) {
            this.handleError('remove model', error);
            return false;
        }
    }

    public async getAvailableModels(): Promise<string[]> {
        // Return common wake words that work well with keyword spotting
        return [
            'hey clippy',
            'clippy',
            'hey assistant',
            'assistant',
            'computer',
            'hey computer',
            'hello clippy',
            'hi clippy',
            'wake up',
            'listen'
        ];
    }

    public async getCapabilities(): Promise<WakeWordCapabilities> {
        return {
            models: await this.getAvailableModels(),
            thresholdRange: { min: 0.5, max: 1.0 },
            supportsCustomModels: true,
            maxConcurrentModels: 20 // Can handle many keywords
        };
    }

    public async cleanup(): Promise<void> {
        try {
            await this.stopDetection();
            this.keywords = [];
            this.recognition = null;
            this.logger.debug(`[${this.engineType}] Cleanup completed`);
        } catch (error) {
            this.handleError('cleanup', error);
        }
    }

    /**
     * Get current keyword list
     */
    public getKeywords(): string[] {
        return [...this.keywords];
    }

    /**
     * Set custom keywords
     */
    public setKeywords(keywords: string[]): void {
        this.keywords = keywords.map(k => k.toLowerCase());
        this.logger.debug(`[${this.engineType}] Keywords updated: ${this.keywords.join(', ')}`);
    }

    /**
     * Add keyword variation
     */
    public addKeywordVariation(original: string, variation: string): void {
        const originalLower = original.toLowerCase();
        const variationLower = variation.toLowerCase();
        
        if (this.keywords.includes(originalLower) && !this.keywords.includes(variationLower)) {
            this.keywords.push(variationLower);
            this.logger.debug(`[${this.engineType}] Added variation: ${variationLower} for ${originalLower}`);
        }
    }

    /**
     * Check if currently listening
     */
    public isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Get detection status
     */
    public getDetectionStatus(): {
        isRunning: boolean;
        isListening: boolean;
        keywords: string[];
        recognitionAvailable: boolean;
    } {
        return {
            isRunning: this.isRunning,
            isListening: this.isListening,
            keywords: [...this.keywords],
            recognitionAvailable: this.recognition !== null
        };
    }
}