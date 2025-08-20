import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { VoiceManager } from './voice/voice-manager';
import { ConversationManager } from './voice/conversation-manager';
import { VoiceCommandProcessor } from './voice/voice-commands';
import { KnowledgeGraphManager } from './knowledge-graph/graph-manager';
import { SuggestionPanel } from './ui/suggestion-panel';
import { OrphanDetector } from './discovery/orphan-detector';
import { ClippyErrorBoundaries } from './error-boundaries';
import type { 
    ClippySettings, 
    VoiceState, 
    ConversationContext,
    ConversationTurn
} from './types';
import { DEFAULT_SETTINGS } from './types';

/**
 * Main CLIPPY AI Assistant Plugin class
 */
export default class ClippyAIAssistantPlugin extends Plugin {
    settings: ClippySettings = DEFAULT_SETTINGS;
    
    // Voice components
    private voiceManager: VoiceManager | null = null;
    private conversationManager: ConversationManager | null = null;
    private voiceCommandProcessor: VoiceCommandProcessor | null = null;
    
    // Core components
    private knowledgeGraphManager: KnowledgeGraphManager | null = null;
    private orphanDetector: OrphanDetector | null = null;
    private suggestionPanel: SuggestionPanel | null = null;
    
    // UI elements
    private ribbonIconEl: HTMLElement | null = null;
    private statusBarEl: HTMLElement | null = null;
    private voiceIndicatorEl: HTMLElement | null = null;
    
    // State
    private isInitialized: boolean = false;
    private currentVoiceState: VoiceState = {
        enabled: false,
        listening: false,
        speaking: false,
        processing: false,
        error: false,
        stage: 'idle'
    };

    /**
     * Plugin initialization
     */
    async onload() {
        try {
            console.log('Loading CLIPPY AI Assistant Plugin...');

            // Load settings
            await this.loadSettings();

            // Initialize error boundaries
            ClippyErrorBoundaries.initialize();

            // Initialize core components
            await this.initializeComponents();

            // Set up UI elements
            this.setupUI();

            // Register commands
            this.registerCommands();

            // Register settings tab
            this.addSettingTab(new ClippySettingTab(this.app, this));

            this.isInitialized = true;
            console.log('CLIPPY AI Assistant Plugin loaded successfully');

            // Show welcome notice
            new Notice('🎉 CLIPPY AI Assistant is ready! Use the ribbon button or voice commands to get started.');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ClippyAIAssistantPlugin.onload');
            new Notice(`Failed to load CLIPPY AI Assistant: ${error.message}`);
        }
    }

    /**
     * Plugin cleanup
     */
    async onunload() {
        try {
            console.log('Unloading CLIPPY AI Assistant Plugin...');

            // Clean up voice components
            if (this.voiceManager) {
                await this.voiceManager.cleanup();
                this.voiceManager = null;
            }

            if (this.conversationManager) {
                await this.conversationManager.cleanup();
                this.conversationManager = null;
            }

            if (this.voiceCommandProcessor) {
                this.voiceCommandProcessor = null;
            }

            // Clean up core components
            if (this.knowledgeGraphManager) {
                await this.knowledgeGraphManager.cleanup();
                this.knowledgeGraphManager = null;
            }

            if (this.orphanDetector) {
                this.orphanDetector = null;
            }

            if (this.suggestionPanel) {
                this.suggestionPanel.unload();
                this.suggestionPanel = null;
            }

            // Clean up UI elements
            this.cleanupUI();

            console.log('CLIPPY AI Assistant Plugin unloaded');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ClippyAIAssistantPlugin.onunload');
        }
    }

    /**
     * Initialize all plugin components
     */
    private async initializeComponents(): Promise<void> {
        try {
            // Initialize conversation manager first
            this.conversationManager = new ConversationManager(this.settings);

            // Initialize voice command processor
            this.voiceCommandProcessor = new VoiceCommandProcessor(
                this.app, 
                this.settings, 
                this.conversationManager
            );

            // Initialize voice manager
            this.voiceManager = new VoiceManager(this.settings);
            this.setupVoiceEventHandlers();

            // Initialize voice if enabled
            if (this.settings.voice.enabled) {
                await this.voiceManager.initialize();
                await this.voiceManager.enable();
            }

            // Initialize knowledge graph manager
            this.knowledgeGraphManager = new KnowledgeGraphManager(this.app, this.settings);
            if (this.settings.knowledgeGraph.enabled) {
                await this.knowledgeGraphManager.initialize();
            }

            // Initialize orphan detector
            this.orphanDetector = new OrphanDetector(this.app, this.settings);

            // Initialize suggestion panel if enabled
            if (this.settings.linkSuggestions.enabled && this.settings.linkSuggestions.showInSidebar) {
                // Note: We'll need to create the suggestion engine
                // this.suggestionPanel = new SuggestionPanel(...);
            }

            console.log('All plugin components initialized');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'ClippyAIAssistantPlugin.initializeComponents');
            throw error;
        }
    }

    /**
     * Set up voice event handlers
     */
    private setupVoiceEventHandlers(): void {
        if (!this.voiceManager || !this.voiceCommandProcessor) {
            return;
        }

        // Voice state changes
        this.voiceManager.on('status-changed', (state: VoiceState) => {
            this.currentVoiceState = state;
            this.updateVoiceIndicator();
        });

        // Wake word detected
        this.voiceManager.on('wake-word-detected', (wakeWord: string) => {
            console.log(`Wake word detected: ${wakeWord}`);
            // Visual feedback for wake word
            new Notice(`👋 Hey there! I heard "${wakeWord}"`);
        });

        // Speech recognized
        this.voiceManager.on('speech-recognized', (text: string, confidence: number) => {
            console.log(`Speech recognized: "${text}" (${confidence})`);
        });

        // Voice command processing
        this.voiceManager.on('voice-command', async (command: string, context: ConversationContext) => {
            try {
                const result = await this.voiceCommandProcessor!.processVoiceCommand(command, context);
                
                if (result.success) {
                    // Speak the response
                    await this.voiceManager!.speak(result.message);
                    
                    // Handle follow-up actions
                    if (result.followUpActions) {
                        await this.handleFollowUpActions(result.followUpActions);
                    }
                } else {
                    await this.voiceManager!.speak(result.message || 'Sorry, I couldn\'t process that command.');
                }
            } catch (error: any) {
                ClippyErrorBoundaries.handleError(error, 'Voice command processing');
                await this.voiceManager!.speak('Sorry, I encountered an error processing your command.');
            }
        });

        // Voice errors
        this.voiceManager.on('error', (error: Error) => {
            console.error('Voice manager error:', error);
            new Notice(`Voice error: ${error.message}`);
        });
    }

    /**
     * Handle follow-up actions from voice commands
     */
    private async handleFollowUpActions(actions: string[]): Promise<void> {
        for (const action of actions) {
            switch (action) {
                case 'voice_disable':
                    await this.toggleVoice();
                    break;
                default:
                    console.log(`Unknown follow-up action: ${action}`);
            }
        }
    }

    /**
     * Set up UI elements
     */
    private setupUI(): void {
        // Add ribbon icon
        if (this.settings.ui.showRibbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon('microphone', 'CLIPPY AI Assistant', (evt: MouseEvent) => {
                this.toggleVoice();
            });
        }

        // Add status bar
        if (this.settings.ui.showStatusBar) {
            this.statusBarEl = this.addStatusBarItem();
            this.statusBarEl.setText('CLIPPY');
            this.statusBarEl.addClass('clippy-status');
            
            // Add voice indicator
            this.voiceIndicatorEl = this.statusBarEl.createEl('span', { cls: 'clippy-voice-indicator' });
            this.updateVoiceIndicator();
        }
    }

    /**
     * Clean up UI elements
     */
    private cleanupUI(): void {
        if (this.ribbonIconEl) {
            this.ribbonIconEl.remove();
            this.ribbonIconEl = null;
        }

        if (this.statusBarEl) {
            this.statusBarEl.remove();
            this.statusBarEl = null;
        }

        this.voiceIndicatorEl = null;
    }

    /**
     * Update voice indicator in status bar
     */
    private updateVoiceIndicator(): void {
        if (!this.voiceIndicatorEl) return;

        const { enabled, listening, speaking, processing, error } = this.currentVoiceState;

        // Clear previous classes
        this.voiceIndicatorEl.removeClass('listening', 'speaking', 'processing', 'error', 'disabled');

        if (!enabled) {
            this.voiceIndicatorEl.addClass('disabled');
            this.voiceIndicatorEl.setText('🔇');
        } else if (error) {
            this.voiceIndicatorEl.addClass('error');
            this.voiceIndicatorEl.setText('❌');
        } else if (speaking) {
            this.voiceIndicatorEl.addClass('speaking');
            this.voiceIndicatorEl.setText('🗣️');
        } else if (processing) {
            this.voiceIndicatorEl.addClass('processing');
            this.voiceIndicatorEl.setText('⚡');
        } else if (listening) {
            this.voiceIndicatorEl.addClass('listening');
            this.voiceIndicatorEl.setText('👂');
        } else {
            this.voiceIndicatorEl.setText('🎤');
        }

        // Update title
        const statusText = error ? 'Voice Error' :
                          speaking ? 'Speaking' :
                          processing ? 'Processing' :
                          listening ? 'Listening' :
                          enabled ? 'Voice Ready' : 'Voice Disabled';
        
        this.voiceIndicatorEl.title = `CLIPPY Voice: ${statusText}`;
    }

    /**
     * Register plugin commands
     */
    private registerCommands(): void {
        // Toggle voice assistant
        this.addCommand({
            id: 'toggle-voice',
            name: 'Toggle Voice Assistant',
            callback: () => {
                this.toggleVoice();
            }
        });

        // Start listening (bypass wake word)
        this.addCommand({
            id: 'start-listening',
            name: 'Start Voice Listening',
            callback: () => {
                this.startListening();
            }
        });

        // Stop listening
        this.addCommand({
            id: 'stop-listening',
            name: 'Stop Voice Listening',
            callback: () => {
                this.stopListening();
            }
        });

        // Show knowledge graph
        this.addCommand({
            id: 'show-knowledge-graph',
            name: 'Show Knowledge Graph',
            callback: () => {
                this.showKnowledgeGraph();
            }
        });

        // Find orphaned notes
        this.addCommand({
            id: 'find-orphans',
            name: 'Find Orphaned Notes',
            callback: () => {
                this.findOrphanedNotes();
            }
        });

        // Open AI chat
        this.addCommand({
            id: 'open-ai-chat',
            name: 'Open AI Chat',
            callback: () => {
                this.openAIChat();
            }
        });
    }

    /**
     * Command implementations
     */
    private async toggleVoice(): Promise<void> {
        if (!this.voiceManager) {
            new Notice('Voice manager not initialized');
            return;
        }

        try {
            if (this.currentVoiceState.enabled) {
                await this.voiceManager.disable();
                new Notice('🔇 Voice assistant disabled');
            } else {
                if (!this.voiceManager.getStatus().initialized) {
                    await this.voiceManager.initialize();
                }
                await this.voiceManager.enable();
                new Notice('🎤 Voice assistant enabled - say "' + this.settings.voice.wakeWord + '" to start');
            }
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'Toggle voice');
            new Notice(`Failed to toggle voice: ${error.message}`);
        }
    }

    private async startListening(): Promise<void> {
        if (!this.voiceManager) {
            new Notice('Voice manager not initialized');
            return;
        }

        try {
            await this.voiceManager.startListening();
            new Notice('👂 Listening for voice command...');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'Start listening');
            new Notice(`Failed to start listening: ${error.message}`);
        }
    }

    private async stopListening(): Promise<void> {
        if (!this.voiceManager) {
            return;
        }

        try {
            await this.voiceManager.stopListening();
            new Notice('🤐 Stopped listening');
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'Stop listening');
        }
    }

    private showKnowledgeGraph(): void {
        if (!this.knowledgeGraphManager) {
            new Notice('Knowledge graph not available');
            return;
        }

        // TODO: Implement knowledge graph view
        new Notice('Knowledge graph view coming soon!');
    }

    private async findOrphanedNotes(): Promise<void> {
        if (!this.orphanDetector) {
            new Notice('Orphan detector not available');
            return;
        }

        try {
            const orphans = await this.orphanDetector.findOrphans();
            new Notice(`Found ${orphans.length} orphaned notes`);
            
            // TODO: Show orphans in a modal or view
            console.log('Orphaned files:', orphans);
        } catch (error: any) {
            ClippyErrorBoundaries.handleError(error, 'Find orphans');
            new Notice(`Failed to find orphans: ${error.message}`);
        }
    }

    private openAIChat(): void {
        // TODO: Implement AI chat modal
        new Notice('AI Chat modal coming soon!');
    }

    /**
     * Load plugin settings
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Save plugin settings
     */
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update components with new settings
        if (this.voiceManager) {
            await this.voiceManager.updateSettings(this.settings);
        }
        
        if (this.conversationManager) {
            await this.conversationManager.updateSettings(this.settings);
        }
        
        if (this.voiceCommandProcessor) {
            this.voiceCommandProcessor.updateSettings(this.settings);
        }
        
        if (this.knowledgeGraphManager) {
            this.knowledgeGraphManager.updateSettings(this.settings);
        }
    }

    /**
     * Get current plugin status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            voiceState: this.currentVoiceState,
            components: {
                voiceManager: !!this.voiceManager,
                conversationManager: !!this.conversationManager,
                knowledgeGraph: !!this.knowledgeGraphManager,
                orphanDetector: !!this.orphanDetector,
                suggestionPanel: !!this.suggestionPanel
            }
        };
    }
}

/**
 * Settings tab for the plugin
 */
class ClippySettingTab extends PluginSettingTab {
    plugin: ClippyAIAssistantPlugin;

    constructor(app: App, plugin: ClippyAIAssistantPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'CLIPPY AI Assistant Settings' });

        // AI Provider Settings
        this.addAIProviderSettings();
        
        // Voice Settings
        this.addVoiceSettings();
        
        // Knowledge Graph Settings
        this.addKnowledgeGraphSettings();
        
        // UI Settings
        this.addUISettings();
    }

    private addAIProviderSettings(): void {
        const { containerEl } = this;
        
        containerEl.createEl('h3', { text: 'AI Provider' });

        new Setting(containerEl)
            .setName('AI Provider')
            .setDesc('Choose your AI provider')
            .addDropdown(dropdown => dropdown
                .addOption('openai', 'OpenAI')
                .addOption('anthropic', 'Anthropic')
                .addOption('ollama', 'Ollama (Local)')
                .addOption('gemini', 'Google Gemini')
                .setValue(this.plugin.settings.aiProvider)
                .onChange(async (value: any) => {
                    this.plugin.settings.aiProvider = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your AI provider API key')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Model')
            .setDesc('AI model to use')
            .addText(text => text
                .setPlaceholder('gpt-4')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));
    }

    private addVoiceSettings(): void {
        const { containerEl } = this;
        
        containerEl.createEl('h3', { text: 'Voice Assistant' });

        new Setting(containerEl)
            .setName('Enable Voice')
            .setDesc('Enable voice commands and responses')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.voice.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.voice.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Wake Word')
            .setDesc('Phrase to activate voice assistant')
            .addText(text => text
                .setPlaceholder('hey clippy')
                .setValue(this.plugin.settings.voice.wakeWord)
                .onChange(async (value) => {
                    this.plugin.settings.voice.wakeWord = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Continuous Mode')
            .setDesc('Stay active after wake word for follow-up commands')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.voice.continuousMode)
                .onChange(async (value) => {
                    this.plugin.settings.voice.continuousMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('TTS Engine')
            .setDesc('Text-to-speech engine')
            .addDropdown(dropdown => dropdown
                .addOption('browser', 'Browser (Free)')
                .addOption('elevenlabs', 'ElevenLabs')
                .addOption('kokoro', 'Kokoro (Coming Soon)')
                .addOption('chatterbox', 'Chatterbox (Coming Soon)')
                .setValue(this.plugin.settings.voice.ttsEngine)
                .onChange(async (value: any) => {
                    this.plugin.settings.voice.ttsEngine = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('STT Engine')
            .setDesc('Speech-to-text engine')
            .addDropdown(dropdown => dropdown
                .addOption('browser', 'Browser (Free)')
                .addOption('whisper', 'Whisper (Local)')
                .setValue(this.plugin.settings.voice.sttEngine)
                .onChange(async (value: any) => {
                    this.plugin.settings.voice.sttEngine = value;
                    await this.plugin.saveSettings();
                }));

        // ElevenLabs API Key (conditional)
        if (this.plugin.settings.voice.ttsEngine === 'elevenlabs') {
            new Setting(containerEl)
                .setName('ElevenLabs API Key')
                .setDesc('Your ElevenLabs API key')
                .addText(text => text
                    .setPlaceholder('your-elevenlabs-key')
                    .setValue(this.plugin.settings.voice.elevenLabsApiKey || '')
                    .onChange(async (value) => {
                        this.plugin.settings.voice.elevenLabsApiKey = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }

    private addKnowledgeGraphSettings(): void {
        const { containerEl } = this;
        
        containerEl.createEl('h3', { text: 'Knowledge Graph' });

        new Setting(containerEl)
            .setName('Enable Knowledge Graph')
            .setDesc('Analyze and visualize note connections')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.knowledgeGraph.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.knowledgeGraph.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Update')
            .setDesc('Automatically update graph when notes change')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.knowledgeGraph.autoUpdate)
                .onChange(async (value) => {
                    this.plugin.settings.knowledgeGraph.autoUpdate = value;
                    await this.plugin.saveSettings();
                }));
    }

    private addUISettings(): void {
        const { containerEl } = this;
        
        containerEl.createEl('h3', { text: 'Interface' });

        new Setting(containerEl)
            .setName('Show Ribbon Icon')
            .setDesc('Show CLIPPY icon in the ribbon')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ui.showRibbonIcon)
                .onChange(async (value) => {
                    this.plugin.settings.ui.showRibbonIcon = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Status Bar')
            .setDesc('Show CLIPPY status in the status bar')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ui.showStatusBar)
                .onChange(async (value) => {
                    this.plugin.settings.ui.showStatusBar = value;
                    await this.plugin.saveSettings();
                }));
    }
}