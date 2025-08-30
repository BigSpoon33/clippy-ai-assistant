/**
 * Integration Examples for Clippy AI Assistant GUI Enhancements
 * Complete examples showing how to integrate all components together
 */

import { App, Plugin, TFile, PluginSettingTab, Setting } from 'obsidian';
import { GUIEnhancementManager } from './src/ui/components/gui-enhancement-manager';
import { EnhancedVaultAgentSidebarView } from './src/ui/enhanced-vault-agent-sidebar-view';
import { EnhancedResearchAgentSidebarView } from './src/ui/enhanced-research-agent-sidebar-view';

/**
 * GUI Enhancement Settings Tab
 */
export class GUIEnhancementSettingTab extends PluginSettingTab {
    plugin: ClippyAIWithGUIEnhancements;

    constructor(app: App, plugin: ClippyAIWithGUIEnhancements) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'GUI Enhancement Settings' });
        
        new Setting(containerEl)
            .setName('Enable GUI Enhancements')
            .setDesc('Enable visual enhancements and animations')
            .addToggle(toggle => toggle
                .setValue(true)
                .onChange(async (value) => {
                    console.log('GUI enhancements:', value ? 'enabled' : 'disabled');
                }));
    }
}

/**
 * Example 1: Basic Plugin Integration
 */
export class ClippyAIWithGUIEnhancements extends Plugin {
    private guiManager: GUIEnhancementManager | null = null;

    async onload() {
        console.log('🚀 Loading Clippy AI with GUI Enhancements');

        // Initialize GUI Enhancement Manager
        await this.initializeGUIEnhancements();

        // Register enhanced views
        this.registerViews();

        // Set up event listeners
        this.setupEventListeners();

        // Add settings for GUI enhancements
        this.addSettingTab(new GUIEnhancementSettingTab(this.app, this));

        console.log('✅ Clippy AI with GUI Enhancements loaded successfully');
    }

    private async initializeGUIEnhancements(): Promise<void> {
        // Initialize with smart defaults based on device capabilities
        const performanceMode = this.detectPerformanceCapabilities();
        
        this.guiManager = new GUIEnhancementManager(this.app, {
            enableMascot: true,
            enableParticles: true,
            enableGeometricPatterns: true,
            enableAudioVisualizers: true,
            enableAdaptiveThemes: true,
            enableActivityTracking: true,
            performanceMode: performanceMode,
            debugMode: false // Set to true for development
        });

        await this.guiManager.initialize();

        // Set up integration with existing plugin features
        this.integrateWithExistingFeatures();
    }

    private detectPerformanceCapabilities(): 'low' | 'medium' | 'high' {
        // Simple device detection
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
        const hasLimitedMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;

        if (isMobile || isLowEnd || hasLimitedMemory) {
            return 'low';
        } else if (navigator.hardwareConcurrency && navigator.hardwareConcurrency >= 8) {
            return 'high';
        } else {
            return 'medium';
        }
    }

    private integrateWithExistingFeatures(): void {
        if (!this.guiManager) return;

        // Connect to existing research functionality
        this.app.workspace.on('file-menu', (menu, file) => {
            if (file instanceof TFile && file.extension === 'md') {
                menu.addItem((item) => {
                    item.setTitle('🔍 Enhanced Research')
                        .setIcon('search')
                        .onClick(() => {
                            this.guiManager?.enterResearchMode();
                        });
                });
            }
        });

        // Connect to vault modifications
        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.guiManager?.celebrateSuccess('New note created!');
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    // Trigger activity-based theme adaptation
                    this.guiManager?.handleVoiceActivity('processing');
                }
            })
        );
    }

    private registerViews(): void {
        // Register enhanced sidebar views
        this.registerView(
            'enhanced-vault-agent-view',
            (leaf) => new EnhancedVaultAgentSidebarView(leaf)
        );

        this.registerView(
            'enhanced-research-agent-view',
            (leaf) => new EnhancedResearchAgentSidebarView(leaf)
        );

        // Add ribbon icons for easy access
        this.addRibbonIcon('bot', 'Open Enhanced Vault Agent', () => {
            this.activateView('enhanced-vault-agent-view');
        });

        this.addRibbonIcon('search', 'Open Enhanced Research Agent', () => {
            this.activateView('enhanced-research-agent-view');
        });
    }

    private async activateView(viewType: string): Promise<void> {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(viewType)[0];

        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: viewType, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    private setupEventListeners(): void {
        // Listen for custom events from GUI components
        document.addEventListener('clippy-mascot-clicked', (event: any) => {
            const personality = event.detail.personality;
            console.log(`🤖 Mascot clicked! Current personality: ${personality}`);
        });

        document.addEventListener('clippy-theme-changed', (event: any) => {
            const theme = event.detail.theme;
            console.log(`🎨 Theme changed to: ${theme.name}`);
        });

        document.addEventListener('clippy-research-started', (event: any) => {
            console.log('🔍 Research session started');
            this.guiManager?.enterResearchMode();
        });

        document.addEventListener('clippy-voice-activity', (event: any) => {
            const { type, confidence } = event.detail;
            this.guiManager?.handleVoiceActivity(type);
        });
    }

    async onunload() {
        console.log('🧹 Unloading Clippy AI with GUI Enhancements');
        
        if (this.guiManager) {
            this.guiManager.destroy();
            this.guiManager = null;
        }
    }
}

/**
 * Example 2: Custom Research Integration
 */
export class CustomResearchIntegration {
    private guiManager: GUIEnhancementManager;

    constructor(guiManager: GUIEnhancementManager) {
        this.guiManager = guiManager;
    }

    async performEnhancedResearch(query: string): Promise<void> {
        console.log(`🔍 Starting enhanced research for: ${query}`);

        // Enter research mode
        this.guiManager.enterResearchMode();

        try {
            // Stage 1: Semantic search
            this.updateResearchProgress('Performing semantic search...', 0.2);
            await this.delay(800);

            // Stage 2: Finding connections
            this.updateResearchProgress('Mapping knowledge connections...', 0.5);
            await this.delay(1000);

            // Stage 3: Analyzing patterns
            this.updateResearchProgress('Analyzing patterns...', 0.8);
            await this.delay(600);

            // Stage 4: Complete
            this.updateResearchProgress('Research complete!', 1.0);
            this.guiManager.celebrateSuccess(`Research completed for "${query}"`);

        } catch (error) {
            console.error('Research failed:', error);
            this.guiManager.handleError('Research failed');
        }
    }

    private updateResearchProgress(status: string, progress: number): void {
        // Emit custom event for progress updates
        document.dispatchEvent(new CustomEvent('research-progress', {
            detail: { status, progress }
        }));

        // Update mascot based on progress
        if (progress < 0.5) {
            // Early stage - thinking
            document.dispatchEvent(new CustomEvent('mascot-expression', {
                detail: { expression: 'thinking', intensity: progress }
            }));
        } else if (progress < 0.9) {
            // Middle stage - working
            document.dispatchEvent(new CustomEvent('mascot-expression', {
                detail: { expression: 'working', intensity: progress }
            }));
        } else {
            // Final stage - excited
            document.dispatchEvent(new CustomEvent('mascot-expression', {
                detail: { expression: 'excited', intensity: 1 }
            }));
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Example 3: Voice Chat Integration
 */
export class VoiceChatIntegration {
    private guiManager: GUIEnhancementManager;
    private audioVisualizer: any = null;

    constructor(guiManager: GUIEnhancementManager) {
        this.guiManager = guiManager;
    }

    async startVoiceChat(): Promise<void> {
        console.log('🎤 Starting enhanced voice chat');

        // Enter communication mode
        this.guiManager.enterCommunicationMode();

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create audio visualizer
            this.audioVisualizer = this.guiManager.createAudioVisualizer(
                document.body, 
                { type: 'waveform', showVAD: true }
            );

            await this.audioVisualizer.connectToStream(stream);

            // Set up voice activity monitoring
            this.monitorVoiceActivity();

            console.log('✅ Voice chat started successfully');

        } catch (error) {
            console.error('Voice chat failed:', error);
            this.guiManager.handleError('Voice access denied');
        }
    }

    private monitorVoiceActivity(): void {
        if (!this.audioVisualizer) return;

        setInterval(() => {
            const vadData = this.audioVisualizer.getVoiceActivity();
            
            if (vadData.isActive && vadData.confidence > 0.7) {
                // User is speaking - show listening state
                this.guiManager.handleVoiceActivity('listening');
                
                // Emit voice activity event
                document.dispatchEvent(new CustomEvent('voice-activity-detected', {
                    detail: vadData
                }));
            } else if (vadData.volume > 0.1) {
                // Audio detected but not clear speech
                this.guiManager.handleVoiceActivity('processing');
            }
        }, 100);
    }

    stopVoiceChat(): void {
        if (this.audioVisualizer) {
            this.audioVisualizer.destroy();
            this.audioVisualizer = null;
        }

        console.log('🎤 Voice chat stopped');
    }
}

/**
 * Example 4: Workflow Automation
 */
export class WorkflowAutomation {
    private guiManager: GUIEnhancementManager;
    private activityHistory: Array<{type: string, timestamp: number, intensity: number}> = [];

    constructor(guiManager: GUIEnhancementManager) {
        this.guiManager = guiManager;
        this.setupActivityTracking();
    }

    private setupActivityTracking(): void {
        // Track typing patterns
        let typingTimer: number;
        let keystrokeCount = 0;

        document.addEventListener('keydown', (event) => {
            if (event.key.length === 1 || event.key === 'Backspace') {
                keystrokeCount++;
                
                clearTimeout(typingTimer);
                typingTimer = window.setTimeout(() => {
                    this.analyzeTypingSession(keystrokeCount);
                    keystrokeCount = 0;
                }, 2000);
            }
        });

        // Track research activities
        document.addEventListener('research-activity', (event: any) => {
            this.recordActivity('research', event.detail.intensity || 1);
        });

        // Track voice activities  
        document.addEventListener('voice-activity-detected', (event: any) => {
            this.recordActivity('voice', event.detail.confidence);
        });
    }

    private analyzeTypingSession(keystrokeCount: number): void {
        const intensity = Math.min(keystrokeCount / 50, 1); // Normalize to 0-1
        this.recordActivity('typing', intensity);

        // Trigger appropriate visual responses
        if (intensity > 0.8) {
            // High intensity typing - energetic theme
            this.guiManager.enterCommunicationMode(); // Could be high-activity mode
        } else if (intensity > 0.4) {
            // Medium intensity - standard active theme
            // Keep current theme but update activity level
        }
    }

    private recordActivity(type: string, intensity: number): void {
        this.activityHistory.push({
            type,
            timestamp: Date.now(),
            intensity
        });

        // Keep only last 50 activities
        if (this.activityHistory.length > 50) {
            this.activityHistory.shift();
        }

        // Analyze patterns
        this.analyzeWorkflowPatterns();
    }

    private analyzeWorkflowPatterns(): void {
        const recentActivity = this.activityHistory.filter(
            activity => Date.now() - activity.timestamp < 300000 // Last 5 minutes
        );

        if (recentActivity.length === 0) return;

        // Calculate average intensity
        const avgIntensity = recentActivity.reduce((sum, activity) => sum + activity.intensity, 0) / recentActivity.length;

        // Detect workflow patterns
        const hasResearch = recentActivity.some(a => a.type === 'research');
        const hasVoice = recentActivity.some(a => a.type === 'voice');
        const hasTyping = recentActivity.some(a => a.type === 'typing');

        // Apply contextual themes
        if (hasResearch && avgIntensity > 0.6) {
            this.guiManager.enterResearchMode();
        } else if (hasVoice) {
            this.guiManager.enterCommunicationMode();
        } else if (avgIntensity > 0.8) {
            // High activity detected
            document.dispatchEvent(new CustomEvent('high-activity-detected', {
                detail: { intensity: avgIntensity }
            }));
        }
    }

    getWorkflowSummary(): object {
        const summary = {
            totalActivities: this.activityHistory.length,
            recentIntensity: 0,
            primaryActivity: 'idle',
            suggestions: []
        };

        if (this.activityHistory.length > 0) {
            const recent = this.activityHistory.slice(-10);
            summary.recentIntensity = recent.reduce((sum, a) => sum + a.intensity, 0) / recent.length;
            
            // Find most common activity type
            const activityCounts = recent.reduce((counts, activity) => {
                counts[activity.type] = (counts[activity.type] || 0) + 1;
                return counts;
            }, {} as Record<string, number>);

            summary.primaryActivity = Object.entries(activityCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'idle';
        }

        return summary;
    }
}

/**
 * Example 5: Custom Theme Creation
 */
export class CustomThemeCreator {
    private guiManager: GUIEnhancementManager;

    constructor(guiManager: GUIEnhancementManager) {
        this.guiManager = guiManager;
    }

    createProductivityTheme(): void {
        const productivityTheme = {
            name: 'Productivity Boost',
            description: 'Energizing theme for maximum productivity',
            colors: {
                primary: '#ff6b35',
                secondary: '#f7931e',
                accent: '#ffb347',
                background: 'var(--background-primary)',
                backgroundSecondary: 'var(--background-secondary)',
                text: 'var(--text-normal)',
                textMuted: 'var(--text-muted)',
                success: '#32cd32',
                warning: '#ffa500',
                error: '#ff4500',
                glow: '#ff6b35',
                particle: '#ffb347'
            },
            animations: {
                duration: '0.25s',
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                glowIntensity: 1.0
            },
            contexts: ['productivity', 'focused-work', 'deadline']
        };

        // Add to theme manager
        const status = this.guiManager.getStatus();
        if (status && (status as any).components?.themeManager) {
            // This would require access to the theme manager
            console.log('🎨 Custom productivity theme created');
        }
    }

    createRelaxationTheme(): void {
        const relaxationTheme = {
            name: 'Relaxation Mode',
            description: 'Calming theme for peaceful work',
            colors: {
                primary: '#87ceeb',
                secondary: '#98d8e8',
                accent: '#b0e0e6',
                background: 'var(--background-primary)',
                backgroundSecondary: 'var(--background-secondary)',
                text: 'var(--text-normal)',
                textMuted: 'var(--text-muted)',
                success: '#90ee90',
                warning: '#f0e68c',
                error: '#ffa07a',
                glow: '#87ceeb',
                particle: '#b0e0e6'
            },
            animations: {
                duration: '0.6s',
                easing: 'ease-in-out',
                glowIntensity: 0.4
            },
            contexts: ['relaxation', 'evening', 'meditation']
        };

        console.log('🌸 Custom relaxation theme created');
    }
}

/**
 * Example 6: Performance Monitoring
 */
export class PerformanceMonitor {
    private guiManager: GUIEnhancementManager;
    private performanceMetrics: {
        frameRate: number;
        memoryUsage: number;
        particleCount: number;
        lastCheck: number;
    } = {
        frameRate: 60,
        memoryUsage: 0,
        particleCount: 0,
        lastCheck: Date.now()
    };

    constructor(guiManager: GUIEnhancementManager) {
        this.guiManager = guiManager;
        this.startMonitoring();
    }

    private startMonitoring(): void {
        setInterval(() => {
            this.measurePerformance();
            this.optimizeBasedOnPerformance();
        }, 5000); // Check every 5 seconds
    }

    private measurePerformance(): void {
        // Measure frame rate
        this.measureFrameRate();

        // Check memory usage if available
        if ((performance as any).memory) {
            this.performanceMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        }

        // Get current particle count from GUI manager
        const status = this.guiManager.getStatus();
        this.performanceMetrics.particleCount = (status as any).performance?.particleCount || 0;

        this.performanceMetrics.lastCheck = Date.now();
    }

    private measureFrameRate(): void {
        let frames = 0;
        const startTime = Date.now();

        const countFrames = () => {
            frames++;
            const elapsed = Date.now() - startTime;
            
            if (elapsed < 1000) {
                requestAnimationFrame(countFrames);
            } else {
                this.performanceMetrics.frameRate = frames;
            }
        };

        requestAnimationFrame(countFrames);
    }

    private optimizeBasedOnPerformance(): void {
        const { frameRate, memoryUsage, particleCount } = this.performanceMetrics;

        // Auto-adjust performance mode based on metrics
        if (frameRate < 30 || memoryUsage > 100 || particleCount > 100) {
            // Performance is struggling - reduce quality
            this.guiManager.updateConfig({ performanceMode: 'low' });
            console.log('⚠️ Performance optimization: Switching to low mode');
            
        } else if (frameRate > 55 && memoryUsage < 50 && particleCount < 50) {
            // Performance is good - can increase quality
            this.guiManager.updateConfig({ performanceMode: 'high' });
            console.log('🚀 Performance optimization: Switching to high mode');
        }
    }

    getPerformanceReport(): object {
        return {
            ...this.performanceMetrics,
            status: this.getPerformanceStatus(),
            recommendations: this.getPerformanceRecommendations()
        };
    }

    private getPerformanceStatus(): string {
        const { frameRate, memoryUsage } = this.performanceMetrics;
        
        if (frameRate < 30 || memoryUsage > 100) return 'Poor';
        if (frameRate < 50 || memoryUsage > 75) return 'Fair';
        if (frameRate > 55 && memoryUsage < 50) return 'Excellent';
        return 'Good';
    }

    private getPerformanceRecommendations(): string[] {
        const recommendations = [];
        const { frameRate, memoryUsage, particleCount } = this.performanceMetrics;

        if (frameRate < 30) {
            (recommendations as string[]).push('Consider reducing animation complexity');
        }
        if (memoryUsage > 100) {
            (recommendations as string[]).push('High memory usage detected - consider closing unused features');
        }
        if (particleCount > 100) {
            (recommendations as string[]).push('Reduce maximum particle count for better performance');
        }
        if (recommendations.length === 0) {
            (recommendations as string[]).push('Performance is optimal! All systems running smoothly.');
        }

        return recommendations;
    }
}

// Export all examples for easy import
export const integrationExamples = {
    ClippyAIWithGUIEnhancements,
    CustomResearchIntegration,
    VoiceChatIntegration,
    WorkflowAutomation,
    CustomThemeCreator,
    PerformanceMonitor
};

/**
 * Usage Example:
 * 
 * ```typescript
 * // In your main plugin file
 * import { ClippyAIWithGUIEnhancements } from './integration-examples';
 * 
 * export default class MyPlugin extends ClippyAIWithGUIEnhancements {
 *     // Your plugin extends the enhanced functionality
 * }
 * 
 * // Or use individual components
 * import { CustomResearchIntegration, VoiceChatIntegration } from './integration-examples';
 * 
 * const research = new CustomResearchIntegration(guiManager);
 * const voiceChat = new VoiceChatIntegration(guiManager);
 * 
 * await research.performEnhancedResearch('quantum computing');
 * await voiceChat.startVoiceChat();
 * ```
 */