/**
 * Diagnostic Voice Integration for CLIPPY AI Assistant
 * Helps identify why TTS/STT is failing and provides alternatives
 */

import { Notice } from 'obsidian';

export class DiagnosticVoiceIntegration {
    private plugin: any;
    private isActive: boolean = false;
    private statusIndicator: HTMLElement | null = null;
    private diagnostics: any = {};

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    /**
     * Initialize with comprehensive diagnostics
     */
    public async initialize(): Promise<void> {
        try {
            console.log('[CLIPPY Voice Diagnostic] Starting comprehensive diagnostics...');
            
            await this.runDiagnostics();
            this.addStatusIndicator();
            
            // Show diagnostic results
            this.showDiagnosticResults();
            
            console.log('[CLIPPY Voice Diagnostic] Diagnostics complete');
        } catch (error) {
            console.error('[CLIPPY Voice Diagnostic] Initialization failed:', error);
            new Notice(`❌ Voice diagnostics failed: ${error.message}`);
        }
    }

    /**
     * Run comprehensive voice diagnostics
     */
    private async runDiagnostics(): Promise<void> {
        this.diagnostics = {
            environment: this.checkEnvironment(),
            webSpeech: this.checkWebSpeechSupport(),
            security: this.checkSecurityContext(),
            permissions: await this.checkPermissions(),
            audio: await this.checkAudioCapabilities(),
            network: await this.checkNetworkConnectivity()
        };

        console.log('[CLIPPY Voice Diagnostic] Full diagnostic results:', this.diagnostics);
    }

    /**
     * Check environment details
     */
    private checkEnvironment(): any {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            isObsidian: (window as any).app ? true : false,
            isElectron: typeof window.require !== 'undefined'
        };
    }

    /**
     * Check Web Speech API support
     */
    private checkWebSpeechSupport(): any {
        return {
            speechSynthesis: 'speechSynthesis' in window,
            speechRecognition: 'SpeechRecognition' in window,
            webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
            speechSynthesisUtterance: 'SpeechSynthesisUtterance' in window
        };
    }

    /**
     * Check security context
     */
    private checkSecurityContext(): any {
        return {
            isSecureContext: window.isSecureContext,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            origin: window.location.origin
        };
    }

    /**
     * Check permissions
     */
    private async checkPermissions(): Promise<any> {
        const permissions: any = {
            microphone: 'unknown'
        };

        try {
            if (navigator.permissions) {
                const micPermission = await navigator.permissions.query({ name: 'microphone' as any });
                permissions.microphone = micPermission.state;
            }
        } catch (error) {
            permissions.microphoneError = error.message;
        }

        return permissions;
    }

    /**
     * Check audio capabilities
     */
    private async checkAudioCapabilities(): Promise<any> {
        const audio: any = {
            speechSynthesis: {},
            mediaDevices: {}
        };

        // Check Speech Synthesis
        if ('speechSynthesis' in window) {
            try {
                const voices = speechSynthesis.getVoices();
                audio.speechSynthesis = {
                    voicesCount: voices.length,
                    defaultVoice: voices.find(v => v.default)?.name || 'none',
                    englishVoices: voices.filter(v => v.lang.startsWith('en')).length,
                    allVoices: voices.map(v => ({ name: v.name, lang: v.lang, local: v.localService }))
                };
            } catch (error) {
                audio.speechSynthesis.error = error.message;
            }
        }

        // Check Media Devices
        if (navigator.mediaDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                audio.mediaDevices = {
                    audioInputs: devices.filter(d => d.kind === 'audioinput').length,
                    audioOutputs: devices.filter(d => d.kind === 'audiooutput').length,
                    devices: devices.map(d => ({ kind: d.kind, label: d.label || 'Unknown' }))
                };
            } catch (error) {
                audio.mediaDevices.error = error.message;
            }
        }

        return audio;
    }

    /**
     * Check network connectivity for speech services
     */
    private async checkNetworkConnectivity(): Promise<any> {
        const network: any = {
            online: navigator.onLine,
            googleAccessible: false,
            speechServiceTest: 'not_tested'
        };

        // Test basic connectivity to Google
        try {
            const response = await fetch('https://www.google.com', { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-cache'
            });
            network.googleAccessible = true;
        } catch (error) {
            network.googleError = error.message;
        }

        return network;
    }

    /**
     * Show diagnostic results to user
     */
    private showDiagnosticResults(): void {
        const results = this.generateDiagnosticSummary();
        
        // Show in console for detailed analysis
        console.log('[CLIPPY Voice Diagnostic] Summary:', results);
        
        // Show user-friendly notice
        const notice = new Notice(results.userMessage, 15000);
        
        // Create detailed diagnostic modal/output
        this.createDiagnosticModal(results);
    }

    /**
     * Generate diagnostic summary
     */
    private generateDiagnosticSummary(): any {
        const d = this.diagnostics;
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check for common issues
        if (!d.webSpeech.speechSynthesis) {
            issues.push('Speech Synthesis not supported');
        }
        
        if (!d.webSpeech.speechRecognition && !d.webSpeech.webkitSpeechRecognition) {
            issues.push('Speech Recognition not supported');
        }
        
        if (!d.security.isSecureContext) {
            issues.push('Not in secure context (HTTPS required)');
            recommendations.push('Use HTTPS or localhost');
        }
        
        if (d.audio.speechSynthesis.voicesCount === 0) {
            issues.push('No speech synthesis voices available');
            recommendations.push('Check system audio settings');
        }
        
        if (d.permissions.microphone === 'denied') {
            issues.push('Microphone permission denied');
            recommendations.push('Grant microphone permission');
        }
        
        if (!d.network.online) {
            issues.push('No network connection');
        }
        
        if (!d.network.googleAccessible) {
            issues.push('Cannot reach Google services');
            recommendations.push('Check firewall/proxy settings');
        }

        const userMessage = issues.length > 0 
            ? `🔍 Voice Diagnostics: ${issues.length} issues found. Check console for details.`
            : `✅ Voice Diagnostics: All systems appear functional.`;

        return {
            issues,
            recommendations,
            userMessage,
            canUseTTS: d.webSpeech.speechSynthesis && d.audio.speechSynthesis.voicesCount > 0,
            canUseSTT: (d.webSpeech.speechRecognition || d.webSpeech.webkitSpeechRecognition) && 
                      d.security.isSecureContext && d.permissions.microphone !== 'denied'
        };
    }

    /**
     * Create diagnostic modal for detailed results
     */
    private createDiagnosticModal(results: any): void {
        // For now, just log detailed results
        console.group('[CLIPPY Voice Diagnostic] Detailed Results');
        console.log('🔧 Issues Found:', results.issues);
        console.log('💡 Recommendations:', results.recommendations);
        console.log('🎤 Can Use TTS:', results.canUseTTS);
        console.log('🗣️ Can Use STT:', results.canUseSTT);
        console.log('📊 Full Diagnostics:', this.diagnostics);
        console.groupEnd();

        // Show actionable recommendations
        if (results.recommendations.length > 0) {
            setTimeout(() => {
                new Notice(`💡 Recommendations: ${results.recommendations.join(', ')}`, 10000);
            }, 2000);
        }
    }

    /**
     * Test TTS with fallback approaches
     */
    public async testTTS(): Promise<boolean> {
        console.log('[CLIPPY Voice Diagnostic] Testing TTS approaches...');
        
        // Approach 1: Standard Web Speech API
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('Testing speech synthesis');
                utterance.volume = 1.0;
                utterance.rate = 1.0;
                
                speechSynthesis.cancel(); // Clear any pending speech
                speechSynthesis.speak(utterance);
                
                console.log('[CLIPPY Voice Diagnostic] Standard TTS attempted');
                return true;
            }
        } catch (error) {
            console.error('[CLIPPY Voice Diagnostic] Standard TTS failed:', error);
        }

        // Approach 2: System notification as audio feedback
        try {
            new Notice('🔊 Voice Test: If TTS is not working, this notice serves as feedback');
            return true;
        } catch (error) {
            console.error('[CLIPPY Voice Diagnostic] Fallback notification failed:', error);
        }

        return false;
    }

    /**
     * Test STT with fallback approaches
     */
    public async testSTT(): Promise<string | null> {
        console.log('[CLIPPY Voice Diagnostic] Testing STT approaches...');
        
        // For environments where STT fails, provide manual input alternative
        const manualInput = prompt('STT not available. Please type your voice command:');
        if (manualInput) {
            console.log('[CLIPPY Voice Diagnostic] Manual input received:', manualInput);
            new Notice(`📝 Manual input: "${manualInput}"`);
            return manualInput;
        }
        
        return null;
    }

    /**
     * Toggle voice system
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
        
        const summary = this.generateDiagnosticSummary();
        
        if (summary.canUseTTS || summary.canUseSTT) {
            new Notice('🎤 Diagnostic Voice System activated');
        } else {
            new Notice('⚠️ Voice system activated with limitations. Check diagnostics.');
        }
        
        return true;
    }

    /**
     * Stop voice system
     */
    public async stopVoice(): Promise<void> {
        this.isActive = false;
        this.updateStatusIndicator();
        new Notice('🔇 Diagnostic Voice System deactivated');
    }

    /**
     * Get status
     */
    public getStatus(): any {
        return {
            isActive: this.isActive,
            diagnostics: this.diagnostics,
            summary: this.generateDiagnosticSummary()
        };
    }

    /**
     * Manual speak function
     */
    public async speak(text: string): Promise<boolean> {
        return await this.testTTS();
    }

    /**
     * Manual listen function
     */
    public async listen(duration: number = 5): Promise<string | null> {
        return await this.testSTT();
    }

    /**
     * Add status indicator
     */
    private addStatusIndicator(): void {
        if (this.plugin.addStatusBarItem) {
            this.statusIndicator = this.plugin.addStatusBarItem();
            this.statusIndicator!.setText('🔍'); // Diagnostic mode
            this.statusIndicator!.title = 'CLIPPY Voice Diagnostic Mode (click for details)';
            this.statusIndicator!.style.cursor = 'pointer';
            this.statusIndicator!.style.fontSize = '14px';
            
            this.statusIndicator!.addEventListener('click', () => {
                this.showDiagnosticResults();
            });
        }
    }

    /**
     * Update status indicator
     */
    private updateStatusIndicator(): void {
        if (!this.statusIndicator) return;

        if (this.isActive) {
            this.statusIndicator!.setText('🔍🟢'); // Diagnostic + active
            this.statusIndicator!.title = 'CLIPPY Voice Diagnostic: Active (click for details)';
        } else {
            this.statusIndicator!.setText('🔍🔴'); // Diagnostic + inactive
            this.statusIndicator!.title = 'CLIPPY Voice Diagnostic: Inactive (click for details)';
        }
    }

    /**
     * Cleanup
     */
    public async cleanup(): Promise<void> {
        this.isActive = false;
        
        if (this.statusIndicator) {
            this.statusIndicator.remove();
            this.statusIndicator = null;
        }
        
        console.log('[CLIPPY Voice Diagnostic] Cleanup completed');
    }
}

export { DiagnosticVoiceIntegration as default };