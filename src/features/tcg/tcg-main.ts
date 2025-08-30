/**
 * CLIPPY TCG Writer - Main System Integration
 * Orchestrates all TCG components and integrates with plugin lifecycle
 * Following PRP specifications for system coordination and performance
 */

import { App, Plugin, TFile, WorkspaceLeaf, Modal, Notice } from 'obsidian';
import { ClippySettings } from '../../types';
import { ClippyErrorBoundaries } from '../../utils/error-boundaries';

// TCG Core Systems
import { ProgressionEngine } from './core/progression-engine';
import { NoteAnalyzer } from './core/note-analyzer';
import { PackSystem } from './core/pack-system';
import { FilePackSystem } from './core/file-pack-system';
import { PlayerManager } from './core/player-manager';
import { TCGKeystrokeTracker } from './core/keystroke-tracker';
import { GameWorldManager } from './core/game-world-manager';
import { GameHistoryManager } from './core/game-history-manager';

// TCG UI and Theming
import { ThemeManager } from './themes/theme-system';
import { PackOpeningModal } from './ui/pack-opening-modal';
import { PackInventoryModal } from './ui/pack-inventory-modal';
import { PackHistoryModal } from './ui/pack-history-modal';
import { TCGDashboardView, VIEW_TYPE_TCG_DASHBOARD } from './ui/tcg-dashboard-view';
import { TCGSettingsTab } from './ui/tcg-settings-tab';

// TCG AI and Analytics
import { AICommentarySystem } from './ai/commentary-system';

// TCG Types
import { TCGSettings, DEFAULT_TCG_SETTINGS } from './types';

// Existing Plugin Components
import { ActivityTracker } from '../../ui/components/mascot/activity-tracker';

// ===== SYSTEM INTEGRATION INTERFACES =====

export interface TCGSystemState {
  initialized: boolean;
  running: boolean;
  lastError?: Error;
  performance: {
    startupTime: number;
    memoryUsage: number;
    eventProcessingTime: number;
    averageResponseTime: number;
  };
  statistics: {
    sessionsStarted: number;
    cardsGenerated: number;
    packsOpened: number;
    packsAwarded: number;
    achievementsUnlocked: number;
    commentsGenerated: number;
  };
}

export interface TCGSystemEvents {
  'system-initialized': () => void;
  'system-shutdown': () => void;
  'error-occurred': (error: Error) => void;
  'performance-warning': (metric: string, value: number) => void;
  'session-started': (sessionId: string) => void;
  'session-ended': (sessionId: string) => void;
}

// ===== MAIN TCG SYSTEM ORCHESTRATOR =====

/**
 * Main TCG system that coordinates all subsystems and manages lifecycle
 */
export class TCGSystem {
  private app: App;
  private plugin: Plugin;
  private settings: ClippySettings;
  private activityTracker: ActivityTracker;

  // TCG Subsystems
  private progressionEngine: ProgressionEngine | null = null;
  private noteAnalyzer: NoteAnalyzer | null = null;
  private packSystem: PackSystem | null = null;
  private filePackSystem: FilePackSystem | null = null;
  private playerManager: PlayerManager | null = null;
  private keystrokeTracker: TCGKeystrokeTracker | null = null;
  private gameWorldManager: GameWorldManager | null = null;
  private gameHistoryManager: GameHistoryManager | null = null;
  private themeManager: ThemeManager | null = null;
  private commentarySystem: AICommentarySystem | null = null;
  private settingsTab: TCGSettingsTab | null = null;

  // System State
  private systemState: TCGSystemState;
  private eventListeners: Map<string, ((data?: any) => void)[]> = new Map();
  private cleanupFunctions: (() => void)[] = [];

  // Performance Monitoring
  private performanceTimer: number | null = null;
  private lastPerformanceCheck = Date.now();

  constructor(app: App, plugin: Plugin, settings: ClippySettings, activityTracker: ActivityTracker) {
    this.app = app;
    this.plugin = plugin;
    this.settings = settings;
    this.activityTracker = activityTracker;

    // Initialize system state
    this.systemState = {
      initialized: false,
      running: false,
      performance: {
        startupTime: 0,
        memoryUsage: 0,
        eventProcessingTime: 0,
        averageResponseTime: 0
      },
      statistics: {
        sessionsStarted: 0,
        cardsGenerated: 0,
        packsOpened: 0,
        packsAwarded: 0,
        achievementsUnlocked: 0,
        commentsGenerated: 0
      }
    };

    console.log('🎮 TCG System constructor initialized');
  }

  /**
   * Initialize the entire TCG system
   */
  async initialize(): Promise<boolean> {
    if (this.systemState.initialized) {
      console.warn('TCG System already initialized');
      return true;
    }

    const startTime = Date.now();

    try {
      console.log('🚀 Initializing TCG System...');

      // Check if TCG is enabled
      if (!this.settings.tcg?.enabled) {
        console.log('📴 TCG System disabled in settings');
        return false;
      }

      // Initialize core systems in dependency order
      await this.initializeCoreSystems();

      // Initialize UI components
      await this.initializeUIComponents();

      // Setup event coordination
      this.setupEventCoordination();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Load persistent data
      await this.loadSystemData();

      // Register plugin integrations
      this.registerPluginIntegrations();

      // Mark system as initialized
      this.systemState.initialized = true;
      this.systemState.running = true;
      this.systemState.performance.startupTime = Date.now() - startTime;

      // Emit initialization event
      this.emitEvent('system-initialized');

      console.log(`✅ TCG System initialized successfully in ${this.systemState.performance.startupTime}ms`);
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize TCG System:', error);
      this.systemState.lastError = error as Error;
      this.emitEvent('error-occurred', error);
      
      // Attempt cleanup of partial initialization
      await this.cleanup();
      return false;
    }
  }

  /**
   * Initialize core TCG systems
   */
  private async initializeCoreSystems(): Promise<void> {
    console.log('🔧 Initializing core systems...');

    // Initialize progression engine
    this.progressionEngine = new ProgressionEngine(this.settings.tcg);
    
    // Initialize note analyzer
    this.noteAnalyzer = new NoteAnalyzer(this.app, this.settings.tcg);
    
    // Initialize theme manager
    this.themeManager = new ThemeManager(this.settings.tcg.activeTheme);
    
    // Initialize player manager (depends on progression engine)
    this.playerManager = new PlayerManager(this.app, this.settings.tcg, this.progressionEngine);
    
    // Initialize pack system (depends on note analyzer)
    this.packSystem = new PackSystem(this.app, this.settings.tcg, this.noteAnalyzer);
    
    // Initialize file-based pack system
    this.filePackSystem = new FilePackSystem(this.app, this.settings.tcg);
    
    // Initialize commentary system (depends on player manager)
    this.commentarySystem = new AICommentarySystem(this.app, this.settings.tcg, this.settings, this.playerManager);
    
    // Initialize keystroke tracker (depends on activity tracker)
    this.keystrokeTracker = new TCGKeystrokeTracker(this.activityTracker, this.settings.tcg);
    
    // Initialize game world manager (depends on settings)
    this.gameWorldManager = new GameWorldManager(this.settings.tcg.worldGeneration);
    
    // Initialize game history manager (must be initialized early for logging)
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.gameHistoryManager = new GameHistoryManager(sessionId);

    console.log('✅ Core systems initialized');
  }

  /**
   * Initialize UI components
   */
  private async initializeUIComponents(): Promise<void> {
    console.log('🎨 Initializing UI components...');

    if (!this.playerManager || !this.themeManager || !this.packSystem || 
        !this.commentarySystem || !this.noteAnalyzer) {
      throw new Error('Core systems not initialized before UI components');
    }

    // Register TCG dashboard view
    this.plugin.registerView(
      VIEW_TYPE_TCG_DASHBOARD,
      (leaf) => new TCGDashboardView(leaf)
    );

    // Initialize settings tab
    this.settingsTab = new TCGSettingsTab({
      app: this.app,
      settings: this.settings.tcg,
      playerManager: this.playerManager,
      themeManager: this.themeManager,
      packSystem: this.packSystem,
      commentarySystem: this.commentarySystem,
      noteAnalyzer: this.noteAnalyzer,
      onSettingsChanged: async (newSettings) => {
        await this.updateSettings(newSettings);
      }
    });

    console.log('✅ UI components initialized');
  }

  /**
   * Setup event coordination between systems
   */
  private setupEventCoordination(): void {
    console.log('🔗 Setting up event coordination...');

    if (!this.playerManager || !this.packSystem || !this.commentarySystem || !this.keystrokeTracker || !this.gameWorldManager || !this.gameHistoryManager) {
      throw new Error('Core systems not initialized for event coordination');
    }

    // Keystroke tracker → Player manager (EXP updates)
    this.keystrokeTracker.onEvent('tcg-exp-awarded', (data) => {
      const oldProfile = this.playerManager!.getPlayerProfile();
      
      this.playerManager!.updatePlayerProfile({ 
        currentEXP: data.totalEXP,
        totalKeystrokes: this.keystrokeTracker!.getTotalKeystrokes()
      });
      
      const newProfile = this.playerManager!.getPlayerProfile();
      
      // Log keystroke milestone
      this.gameHistoryManager!.logKeystrokeMilestone(
        data.totalKeystrokes,
        this.keystrokeTracker!.getSessionMetrics(),
        `${data.keystrokesAwarded} keystrokes → ${data.expAwarded} EXP`
      );
      
      // Log level up if occurred
      if (newProfile.currentLevel > oldProfile.currentLevel) {
        this.gameHistoryManager!.logPlayerLevelUp(
          newProfile.playerId,
          oldProfile.currentLevel,
          newProfile.currentLevel,
          newProfile.currentEXP
        );
      }
      
      this.systemState.statistics.sessionsStarted++;
    });

    // Keystroke tracker → FilePackSystem (keystroke pack rewards - generate physical pack immediately)
    this.keystrokeTracker.onEvent('tcg-keystroke-pack-earned', async (data) => {
      console.log(`📦 Processing keystroke pack: ${data.keystrokeCount} keystrokes → ${data.packType} pack`);
      
      // Generate physical pack file using the correct template
      const generatedPack = await this.filePackSystem!.generatePack(data.packType, this.playerManager!.getPlayerProfile().id);
      
      if (generatedPack) {
        console.log(`📦 Generated ${data.packType} pack: ${generatedPack.packId} with ${generatedPack.cards.length} cards`);
        
        // Log pack earned
        this.gameHistoryManager!.logPackEarned(
          this.playerManager!.getPlayerProfile().id,
          data.packType,
          data.earnedBy,
          data.keystrokeCount
        );
        
        // Show notification to user
        new Notice(`📦 ${data.reward} - Created pack file in vault!`);
        
        this.systemState.statistics.packsAwarded = (this.systemState.statistics.packsAwarded || 0) + 1;
      } else {
        console.error(`❌ Failed to generate ${data.packType} pack`);
        new Notice(`❌ Failed to create ${data.packType} pack - check console for details`);
      }
    });

    // Keystroke tracker → Player manager (milestone bonus pack rewards - achievements)
    this.keystrokeTracker.onEvent('tcg-milestone-reached', async (data) => {
      console.log(`🎁 Processing milestone bonus: ${data.exp} EXP → ${data.packType} pack`);
      
      // Award bonus pack to player
      const pack = this.playerManager!.awardPack(data.packType, data.earnedBy);
      
      // Show special notification for milestone bonus
      new Notice(`🏆 MILESTONE BONUS! ${data.reward} Premium pack awarded!`);
      
      // Generate commentary about the milestone
      if (this.commentarySystem) {
        const commentary = await this.commentarySystem.generateCommentary({
          type: 'achievement',
          context: this.buildWritingContext({ milestone: data.exp, packType: data.packType }),
          urgency: 'high'
        });
        
        this.displayCommentary(commentary);
      }
      
      this.systemState.statistics.packsAwarded = (this.systemState.statistics.packsAwarded || 0) + 1;
    });

    // Keystroke tracker → Game World Manager (world state generation)
    this.keystrokeTracker.onEvent('tcg-exp-awarded', async (data) => {
      console.log('🌍 Generating world state from keystroke trigger');
      
      // Get current session metrics
      const sessionMetrics = this.keystrokeTracker!.getSessionMetrics();
      const totalKeystrokes = this.keystrokeTracker!.getTotalKeystrokes();
      
      // Get old world state for comparison
      const oldWorldState = this.gameWorldManager!.getCurrentState();
      
      // Generate new world state
      const worldState = await this.gameWorldManager!.generateWorldState(
        sessionMetrics, 
        totalKeystrokes, 
        'keystroke'
      );
      
      // Log world state change
      this.gameHistoryManager!.logWorldStateChange(oldWorldState, worldState, 'keystroke');
      
      // Process and log any world events that affect the player
      for (const event of worldState.activeEvents) {
        this.gameHistoryManager!.logGameEvent(worldState.stateId, event);
        
        for (const effect of event.playerEffects) {
          await this.processPlayerEffect(effect, event);
        }
      }
    });

    // Game World Manager → Timer-based responses
    this.gameWorldManager.onEvent('timer-world-update', async (data) => {
      console.log(`⏰ Processing timer-based world update: ${data.worldState.location} (${data.worldState.weather})`);
      
      // Log timer update
      this.gameHistoryManager!.addEntry({
        eventType: 'timer_update',
        severity: 'info',
        title: 'Timer World Update',
        description: `World updated via timer: ${data.worldState.location} (${data.worldState.weather})`,
        data: {
          worldState: data.worldState,
          trigger: 'timer',
          intervalMinutes: data.intervalMinutes
        },
        worldStateId: data.worldState.stateId,
        source: 'GameWorldManager',
        tags: ['timer', 'world-update', 'automated']
      });
      
      // Process and log any world events from timer update
      for (const event of data.worldState.activeEvents) {
        this.gameHistoryManager!.logGameEvent(data.worldState.stateId, event);
        
        for (const effect of event.playerEffects) {
          await this.processPlayerEffect(effect, event);
        }
      }
      
      // Generate commentary for timer-based world changes if enabled
      if (this.commentarySystem && this.settings.tcg.enableAICommentary) {
        const commentary = await this.commentarySystem.generateCommentary({
          type: 'insight',
          context: {
            // Pass world state properties directly
            location: data.worldState?.location || 'unknown',
            weather: data.worldState?.weather || 'clear',  
            threatLevel: data.worldState?.threatLevel || 'safe',
            timeOfDay: data.worldState?.timeOfDay || 'day',
            activeEvents: data.worldState?.activeEvents || [],
            // Add other context
            triggerType: 'timer',
            rawContext: this.buildWorldContext(data.worldState, 'timer')
          },
          urgency: 'low'
        });
        
        // Log commentary generation
        this.gameHistoryManager!.logCommentary(
          'insight',
          commentary.text,
          'low',
          commentary.confidence
        );
        
        this.displayCommentary(commentary);
      }
      
      // Notify user of significant world changes (optional)
      if (data.worldState.threatLevel === 'extreme' || data.worldState.activeEvents.length > 0) {
        new Notice(`🌍 The world around you shifts... (${data.worldState.location}, ${data.worldState.weather})`);
      }
    });

    // Game World Manager → Commentary system (world narrative)
    this.gameWorldManager.onEvent('world-state-updated', async (data) => {
      const { newState, trigger } = data;
      
      if (this.commentarySystem && this.settings.tcg.worldGeneration.timerTrigger) {
        const commentary = await this.commentarySystem.generateCommentary({
          type: 'insight',
          context: {
            // Pass world state properties directly
            location: newState?.location || 'unknown',
            weather: newState?.weather || 'clear',
            threatLevel: newState?.threatLevel || 'safe', 
            timeOfDay: newState?.timeOfDay || 'day',
            activeEvents: newState?.activeEvents || [],
            // Add other context
            triggerType: trigger,
            rawContext: this.buildWorldContext(newState, trigger)
          },
          urgency: 'low'
        });
        
        this.displayCommentary(commentary);
      }
    });

    // Player manager → Commentary system (level ups, achievements)
    this.playerManager.onEvent('level_up', async (data) => {
      const commentary = await this.commentarySystem!.generateCommentary({
        type: 'level_up',
        context: this.buildWritingContext(data),
        urgency: 'high'
      });
      
      this.displayCommentary(commentary);
      this.systemState.statistics.commentsGenerated++;
    });

    this.playerManager.onEvent('achievement_unlocked', async (data) => {
      const commentary = await this.commentarySystem!.generateCommentary({
        type: 'achievement',
        context: this.buildWritingContext(data),
        urgency: 'medium'
      });
      
      this.displayCommentary(commentary);
      this.systemState.statistics.achievementsUnlocked++;
    });

    // Pack system → Player manager (card collection)
    this.packSystem.onEvent('pack_opened', (data) => {
      data.cards.forEach((card: any) => {
        this.playerManager!.addCard(card);
      });
      
      this.playerManager!.updatePlayerProfile({
        packsOpened: this.playerManager!.getPlayerProfile().packsOpened + 1
      });
      
      this.systemState.statistics.packsOpened++;
      this.systemState.statistics.cardsGenerated += data.cards.length;
    });

    // Activity tracker integration
    this.activityTracker.onActivity?.('note_created', async (data) => {
      if (this.noteAnalyzer && this.app.vault.getAbstractFileByPath(data.fileName) instanceof TFile) {
        const file = this.app.vault.getAbstractFileByPath(data.fileName) as TFile;
        const card = await this.noteAnalyzer.analyzeNote(file);
        
        if (card && this.playerManager) {
          this.playerManager.addCard(card);
          this.systemState.statistics.cardsGenerated++;
        }
      }
    });

    console.log('✅ Event coordination setup complete');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    console.log('📊 Setting up performance monitoring...');

    this.performanceTimer = window.setInterval(() => {
      this.checkSystemPerformance();
    }, 30000); // Check every 30 seconds

    // Monitor memory usage if available
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      this.systemState.performance.memoryUsage = memory.usedJSHeapSize;
    }

    console.log('✅ Performance monitoring active');
  }

  /**
   * Load persistent system data
   */
  private async loadSystemData(): Promise<void> {
    console.log('💾 Loading system data...');

    try {
      // Load player data if available
      const playerData = (this.plugin as any).settings?.tcgPlayerData;
      if (playerData && this.playerManager) {
        this.playerManager.loadPlayerData(playerData);
      }

      // Load pack inventory if available
      const packData = (this.plugin as any).settings?.tcgPackData;
      if (packData && this.packSystem) {
        this.packSystem.loadInventory(packData);
      }

      console.log('✅ System data loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load some system data:', error);
      // Continue initialization even if data loading fails
    }
  }

  /**
   * Register integrations with main plugin
   */
  private registerPluginIntegrations(): void {
    console.log('🔌 Registering plugin integrations...');

    // Register settings tab if plugin supports it
    if (typeof (this.plugin as any).addSettingTab === 'function' && this.settingsTab) {
      (this.plugin as any).addSettingTab(this.settingsTab);
      console.log('📝 Settings tab registered');
    }

    // Register commands
    this.registerCommands();

    // Register event handlers
    this.registerEventHandlers();

    console.log('✅ Plugin integrations registered');
  }

  /**
   * Register TCG commands with the plugin
   */
  private registerCommands(): void {
    const plugin = this.plugin as any;

    if (typeof plugin.addCommand === 'function') {
      // Open pack command
      plugin.addCommand({
        id: 'tcg-open-pack',
        name: 'Open Card Pack',
        callback: () => {
          this.openPackModal();
        }
      });

      // Pack inventory command
      plugin.addCommand({
        id: 'tcg-pack-inventory',
        name: 'TCG: Pack Inventory',
        callback: () => {
          this.openPackInventoryModal();
        }
      });

      // Pack history command
      plugin.addCommand({
        id: 'tcg-pack-history',
        name: 'TCG: Pack History',
        callback: () => {
          this.openPackHistoryModal();
        }
      });

      // View collection command
      plugin.addCommand({
        id: 'tcg-view-collection',
        name: 'View Card Collection',
        callback: () => {
          this.viewCollection();
        }
      });

      // Generate commentary command
      plugin.addCommand({
        id: 'tcg-generate-commentary',
        name: 'Generate AI Commentary',
        callback: () => {
          this.generateContextualCommentary();
        }
      });

      // TCG dashboard command
      plugin.addCommand({
        id: 'tcg-dashboard',
        name: 'Open TCG Dashboard',
        callback: () => {
          this.openDashboard();
        }
      });

      // Test keystroke reward command
      plugin.addCommand({
        id: 'tcg-test-keystroke-reward',
        name: 'TCG: Test Keystroke Reward',
        callback: async () => {
          if (this.keystrokeTracker && this.playerManager) {
            await this.keystrokeTracker.testAwardEXP(1);
            
            // Show current pack inventory after test
            const availablePacks = this.playerManager.getUnopenedPacks();
            console.log(`🧪 Available packs after test: ${availablePacks.length}`);
            availablePacks.forEach(pack => {
              console.log(`  - ${pack.packName} (${pack.packId}) - ${pack.packType}`);
            });
            
            new Notice(`🧪 Test: Awarded 1 EXP + pack! Check inventory: ${availablePacks.length} packs available`);
          }
        }
      });

      // Test timer system command
      plugin.addCommand({
        id: 'tcg-test-timer-world-update',
        name: 'TCG: Test Timer World Update',
        callback: async () => {
          if (this.gameWorldManager) {
            try {
              const sessionMetrics = this.keystrokeTracker?.getSessionMetrics() || {
                sessionDuration: Date.now(),
                totalKeystrokes: 0,
                averageKPM: 0,
                peakKPM: 0,
                qualityScore: 0.5,
                consistencyScore: 0.5,
                focusScore: 0.5,
                burstCount: 0,
                pauseCount: 0,
                longestBurst: 0,
                longestPause: 0,
                sessionStartTime: Date.now(),
                mostRecentActivity: Date.now()
              };

              const worldState = await this.gameWorldManager.forceUpdate(sessionMetrics, 0);
              
              // Emit the timer event manually for testing
              this.gameWorldManager.onEvent('timer-world-update', {
                worldState,
                trigger: 'timer',
                intervalMinutes: this.settings.tcg.worldGeneration.timerInterval
              });

              new Notice(`🧪 Timer Test: World updated to ${worldState.location} (${worldState.weather}) - ${worldState.threatLevel} threat`);
              console.log('🧪 Timer test triggered:', worldState);
            } catch (error) {
              new Notice('❌ Timer test failed - check console');
              console.error('Timer test error:', error);
            }
          } else {
            new Notice('❌ Game World Manager not initialized');
          }
        }
      });

      // Message queue status command  
      plugin.addCommand({
        id: 'tcg-message-queue-status',
        name: 'TCG: Check Message Queue Status',
        callback: () => {
          if (this.commentarySystem) {
            const queueInfo = (this.commentarySystem as any).getQueueStatus ? 
              (this.commentarySystem as any).getQueueStatus() : 
              { queueLength: 0, isProcessing: false, queueIds: [] };
            
            new Notice(`📊 Queue: ${queueInfo.queueLength} messages, ${queueInfo.isProcessing ? 'Processing' : 'Idle'}`);
            console.log('📊 Message queue status:', queueInfo);
          } else {
            new Notice('❌ Commentary system not initialized');
          }
        }
      });

      // Clear message queue command
      plugin.addCommand({
        id: 'tcg-clear-message-queue',
        name: 'TCG: Clear Message Queue',
        callback: () => {
          if (this.commentarySystem && (this.commentarySystem as any).clearQueue) {
            (this.commentarySystem as any).clearQueue();
            new Notice('🧹 Message queue cleared');
          } else {
            new Notice('❌ Commentary system not initialized or missing clearQueue method');
          }
        }
      });

      // Game history commands
      plugin.addCommand({
        id: 'tcg-view-game-history',
        name: 'TCG: View Game History',
        callback: () => {
          if (this.gameHistoryManager) {
            const recentEntries = this.gameHistoryManager.getRecentEntries(20);
            const stats = this.gameHistoryManager.getStatistics();
            
            console.group('📚 Game History (Recent 20 entries)');
            console.log('📊 Statistics:', stats);
            console.log('📝 Recent entries:', recentEntries);
            console.groupEnd();
            
            new Notice(`📚 Game History: ${stats.totalEntries} entries (check console for details)`);
          } else {
            new Notice('❌ Game history manager not initialized');
          }
        }
      });

      plugin.addCommand({
        id: 'tcg-view-history-stats',
        name: 'TCG: View History Statistics',
        callback: () => {
          if (this.gameHistoryManager) {
            const stats = this.gameHistoryManager.getStatistics();
            
            console.group('📊 Game History Statistics');
            console.log('Total Entries:', stats.totalEntries);
            console.log('Entries by Type:', stats.entriesByType);
            console.log('Entries by Severity:', stats.entriesBySeverity);
            console.log('Error Rate:', `${stats.errorRate}%`);
            console.log('Most Active Source:', stats.mostActiveSource);
            console.log('Average per Session:', stats.averageEntriesPerSession);
            console.groupEnd();
            
            new Notice(`📊 Stats: ${stats.totalEntries} entries, ${stats.errorRate}% errors`);
          } else {
            new Notice('❌ Game history manager not initialized');
          }
        }
      });

      plugin.addCommand({
        id: 'tcg-clear-game-history',
        name: 'TCG: Clear Game History',
        callback: () => {
          if (this.gameHistoryManager) {
            this.gameHistoryManager.clearHistory();
            new Notice('🧹 Game history cleared');
          } else {
            new Notice('❌ Game history manager not initialized');
          }
        }
      });

      console.log('⌨️ Commands registered');
    }
  }

  /**
   * Register event handlers for plugin lifecycle
   */
  private registerEventHandlers(): void {
    // DISABLED: Automatic card generation from vault files
    // This was causing the system to generate cards for every file in the vault
    // Cards should only be generated when opening specific TCG packs
    
    console.log('🎣 Event handlers registered (automatic card generation disabled)');
  }

  // ===== SYSTEM OPERATIONS =====

  /**
   * Update system settings
   */
  async updateSettings(newSettings: TCGSettings): Promise<void> {
    try {
      // Update main settings
      this.settings.tcg = newSettings;
      
      // Update all subsystems
      this.progressionEngine?.updateSettings(newSettings);
      this.noteAnalyzer?.updateSettings(newSettings);
      this.packSystem?.updateSettings(newSettings);
      this.playerManager?.updateSettings(newSettings);
      this.keystrokeTracker?.updateSettings(newSettings);
      this.commentarySystem?.updateSettings(newSettings);

      // Save to plugin settings
      await (this.plugin as any).saveSettings?.();
      
      console.log('⚙️ TCG settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Save system data
   */
  async saveSystemData(): Promise<void> {
    try {
      if (!this.playerManager || !this.packSystem) return;

      const systemData = {
        tcgPlayerData: this.playerManager.exportPlayerData(),
        tcgPackData: this.packSystem.exportInventory(),
        tcgSystemState: {
          ...this.systemState,
          lastSaved: new Date().toISOString()
        }
      };

      // Save to plugin settings
      Object.assign((this.plugin as any).settings, systemData);
      await (this.plugin as any).saveSettings?.();

      console.log('💾 System data saved');
    } catch (error) {
      console.error('Failed to save system data:', error);
      throw error;
    }
  }

  /**
   * Check system performance and emit warnings
   */
  private checkSystemPerformance(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastPerformanceCheck;
    this.lastPerformanceCheck = now;

    // Check memory usage if available
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      const currentMemory = memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - this.systemState.performance.memoryUsage;
      
      this.systemState.performance.memoryUsage = currentMemory;
      
      // Warn if memory increased by more than 10MB in 30 seconds
      if (memoryIncrease > 10 * 1024 * 1024) {
        this.emitEvent('performance-warning', {
          metric: 'memory',
          value: memoryIncrease,
          recommendation: 'Consider reducing TCG visual effects or restarting'
        });
      }
    }

    // Check event processing performance
    const eventProcessingTime = this.systemState.performance.eventProcessingTime;
    if (eventProcessingTime > 1000) { // > 1 second
      this.emitEvent('performance-warning', {
        metric: 'event-processing',
        value: eventProcessingTime,
        recommendation: 'System may be overloaded, consider performance mode'
      });
    }
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle file open events
   */
  private async handleFileOpen(file: TFile): Promise<void> {
    // Update current session context for commentary
    if (this.playerManager?.currentSession) {
      // Track file interactions for engagement scoring
    }
  }

  // REMOVED: handleFileCreated - was causing automatic card generation for all files

  /**
   * Handle file modification events
   */
  private async handleFileModified(file: TFile): Promise<void> {
    // Update session metrics
    if (this.keystrokeTracker && this.playerManager?.currentSession) {
      this.playerManager.updateSession({
        notesModified: (this.playerManager.currentSession.notesModified || 0) + 1
      });
    }
  }

  // ===== USER INTERFACE METHODS =====

  /**
   * Open pack selection and opening modal
   */
  private async openPackModal(): Promise<void> {
    if (!this.playerManager || !this.packSystem || !this.filePackSystem) {
      new Notice('❌ TCG systems not properly initialized');
      return;
    }

    // Get available packs from player inventory
    const availablePacks = this.playerManager.getUnopenedPacks();
    
    console.log(`📦 Found ${availablePacks.length} unopened packs in player inventory`);
    
    if (availablePacks.length === 0) {
      // No packs available, offer to generate starter pack
      const shouldGenerate = confirm(
        '📭 No packs available in your inventory.\n\n' +
        'Would you like to generate a starter pack to get started?'
      );
      
      if (shouldGenerate) {
        console.log('🎁 Generating starter pack...');
        
        // Award starter pack to player
        const pack = this.playerManager.awardPack('starter-pack', 'purchase');
        
        // Log the generation
        this.gameHistoryManager?.addEntry({
          eventType: 'pack_earned',
          severity: 'info',
          title: 'Starter Pack Generated',
          description: 'Generated starter pack for new player',
          data: { packType: 'starter-pack', reason: 'no_packs_available' },
          playerId: this.playerManager.getPlayerProfile().id,
          source: 'TCGSystem',
          tags: ['pack', 'starter', 'generated']
        });
        
        new Notice(`📦 Generated ${pack.packName}! Opening pack inventory...`);
        
        // Open pack inventory to show the new pack
        this.openPackInventoryModal();
      }
    } else {
      // Open pack inventory modal
      this.openPackInventoryModal();
    }
  }

  /**
   * Open the pack inventory modal
   */
  private openPackInventoryModal(): void {
    if (!this.playerManager || !this.packSystem || !this.filePackSystem) return;
    
    const modal = new PackInventoryModal(this.app, {
      playerManager: this.playerManager,
      packSystem: this.packSystem,
      filePackSystem: this.filePackSystem,
      gameHistoryManager: this.gameHistoryManager || undefined
    });
    
    modal.open();
  }

  /**
   * Open pack history modal
   */
  private openPackHistoryModal(): void {
    if (!this.playerManager) return;
    
    const modal = new PackHistoryModal(this.app, {
      playerManager: this.playerManager
    });
    
    modal.open();
  }

  /**
   * Open a file-based pack
   */
  private async openFileBasedPack(packId: string): Promise<void> {
    if (!this.filePackSystem) return;
    
    try {
      console.log(`📦 Opening pack: ${packId}`);
      const cards = await this.filePackSystem.openPack(packId);
      
      if (cards.length > 0) {
        new Notice(`🎉 Pack opened! ${cards.length} cards added to your collection!`);
        
        // Show pack opening results
        this.showPackResults(cards);
      } else {
        new Notice('Failed to open pack');
      }
    } catch (error) {
      console.error('Pack opening error:', error);
      new Notice('Error opening pack: ' + error.message);
    }
  }

  /**
   * Show pack selection modal when multiple packs are available
   */
  private async showPackSelectionModal(packs: any[]): Promise<void> {
    const modal = new Modal(this.app);
    modal.titleEl.setText('📦 Select Pack to Open');
    
    for (const pack of packs) {
      const packBtn = modal.contentEl.createEl('button', {
        text: `${pack.pack_name} (${pack.total_cards} cards)`,
        cls: 'tcg-pack-select-btn'
      });
      
      packBtn.onclick = async () => {
        modal.close();
        await this.openFileBasedPack(pack.pack_id);
      };
    }
    
    modal.open();
  }

  /**
   * Show pack opening results
   */
  private showPackResults(cards: any[]): void {
    const modal = new Modal(this.app);
    modal.titleEl.setText('🎉 Pack Opened!');
    
    modal.contentEl.createEl('h3', { text: `You got ${cards.length} cards:` });
    
    for (const card of cards) {
      const cardEl = modal.contentEl.createDiv('tcg-result-card');
      cardEl.innerHTML = `
        <h4>${card.isShiny ? '✨ ' : ''}${card.metadata.name}</h4>
        <p><strong>Rarity:</strong> ${card.metadata.rarity}</p>
        <p><strong>Power:</strong> ${card.metadata.power_level}</p>
        <p><em>"${card.metadata.flavor_text}"</em></p>
      `;
    }
    
    modal.open();
  }

  /**
   * View card collection
   */
  private viewCollection(): void {
    if (!this.playerManager) return;

    const cards = this.playerManager.getAllCards();
    console.log(`Viewing collection of ${cards.length} cards`);
    // Would open collection viewer modal
  }

  /**
   * Generate contextual commentary
   */
  private async generateContextualCommentary(): Promise<void> {
    if (!this.commentarySystem || !this.playerManager) return;

    const context = this.buildCurrentWritingContext();
    const commentary = await this.commentarySystem.generateCommentary({
      type: 'encouragement',
      context,
      urgency: 'medium'
    });

    this.displayCommentary(commentary);
  }

  /**
   * Open TCG dashboard
   */
  private async openDashboard(): Promise<void> {
    try {
      console.log('🎯 Opening TCG dashboard sidebar');
      
      if (!this.playerManager) {
        console.error('🎯 PlayerManager not available');
        new Notice('TCG System not initialized');
        return;
      }

      // Check if TCG dashboard view is already open
      const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_TCG_DASHBOARD)[0];
      
      if (existingLeaf) {
        // Focus existing view and refresh it
        this.app.workspace.revealLeaf(existingLeaf);
        const view = existingLeaf.view as TCGDashboardView;
        view.setPlayerManager(this.playerManager);
        console.log('🎯 Focused existing TCG dashboard');
      } else {
        // Create new view in right sidebar
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf) {
          await leaf.setViewState({
            type: VIEW_TYPE_TCG_DASHBOARD,
            active: true
          });
          
          // Set up the view with player manager
          const view = leaf.view as TCGDashboardView;
          view.setPlayerManager(this.playerManager);
          
          // Reveal the sidebar
          this.app.workspace.revealLeaf(leaf);
          console.log('🎯 Created new TCG dashboard in sidebar');
        }
      }
      
    } catch (error) {
      console.error('🎯 Dashboard error:', error);
      new Notice('Failed to open TCG dashboard: ' + error.message);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Build writing context for commentary
   */
  private buildWritingContext(additionalData?: any): any {
    if (!this.playerManager) return {};

    const profile = this.playerManager.getPlayerProfile();
    const currentFile = this.app.workspace.getActiveFile();

    return {
      achievement: additionalData?.achievement || 'general',
      theme: this.settings.tcg.activeTheme,
      kmp: profile.keystrokesPerMinute,
      streak: profile.currentStreak,
      performance: 'good', // Simplified
      qualityScore: 0.7, // Simplified
      speedCategory: profile.keystrokesPerMinute > 150 ? 'fast' : 'normal',
      
      vaultInsights: {
        activeNoteType: currentFile ? this.classifyNoteType(currentFile) : 'unknown',
        recentNotePatterns: ['structured'],
        linkingBehavior: 'moderate',
        tagUsagePatterns: [],
        focusedTopic: 'general',
        sessionFlow: 'productive'
      },
      
      writingQuality: {
        structuralCoherence: 0.7,
        conceptualDepth: 0.6,
        connectionDensity: 0.5,
        originalityScore: 0.6
      },
      
      ...additionalData
    };
  }

  /**
   * Build current writing context
   */
  private buildCurrentWritingContext(): any {
    return this.buildWritingContext();
  }

  /**
   * Classify note type for context
   */
  private classifyNoteType(file: TFile): string {
    const path = file.path.toLowerCase();
    const name = file.basename.toLowerCase();

    if (name.match(/^\d{4}-\d{2}-\d{2}/)) return 'daily_note';
    if (path.includes('project')) return 'project_note';
    if (name.includes('moc')) return 'index_note';
    return 'general_note';
  }

  /**
   * Display commentary to user
   */
  private displayCommentary(commentary: any): void {
    // For now, just log to console
    // In full implementation, would show as notification or modal
    console.log(`💬 AI Commentary: ${commentary.text}`);
  }

  /**
   * Build world context string for AI commentary
   */
  private buildWorldContext(worldState: any, trigger: string): string {
    const location = worldState?.location || 'unknown';
    const weather = worldState?.weather || 'clear';
    const threatLevel = worldState?.threatLevel || 'safe';
    const timeOfDay = worldState?.timeOfDay || 'day';
    const activeEvents = worldState?.activeEvents || [];
    
    let context = `You are writing in a ${location} environment during ${timeOfDay}. `;
    context += `The weather is ${weather} and the threat level is ${threatLevel}. `;
    
    if (activeEvents.length > 0) {
      context += `Active events: ${activeEvents.map((e: any) => e.name || e).join(', ')}. `;
    }
    
    context += `This world state was triggered by: ${trigger}. `;
    context += `The environment reflects your current writing energy and focus.`;
    
    return context;
  }

  /**
   * Register event listener
   */
  onEvent(eventType: keyof TCGSystemEvents, callback: (data?: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit system event
   */
  private emitEvent(eventType: string, data?: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in TCG system event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // ===== LIFECYCLE METHODS =====

  /**
   * Get current system state
   */
  getSystemState(): TCGSystemState {
    return { ...this.systemState };
  }

  /**
   * Get system statistics
   */
  getStatistics() {
    if (!this.playerManager) return null;

    return {
      system: this.systemState.statistics,
      player: this.playerManager.getTCGStatistics(),
      collection: this.playerManager.getCollectionSummary(),
      packs: this.packSystem?.getPackStatistics(),
      commentary: this.commentarySystem?.getAnalytics()
    };
  }

  /**
   * Shutdown the TCG system
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down TCG System...');

    try {
      // Save all data before shutdown
      await this.saveSystemData();

      // Stop performance monitoring
      if (this.performanceTimer) {
        clearInterval(this.performanceTimer);
        this.performanceTimer = null;
      }

      // Run cleanup functions
      this.cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      });

      // Destroy all subsystems
      await this.cleanup();

      // Update system state
      this.systemState.running = false;
      this.systemState.initialized = false;

      // Emit shutdown event
      this.emitEvent('system-shutdown');

      console.log('✅ TCG System shutdown complete');

    } catch (error) {
      console.error('❌ Error during TCG system shutdown:', error);
      throw error;
    }
  }

  /**
   * Cleanup all resources and subsystems
   */
  private async cleanup(): Promise<void> {
    // Log system shutdown
    if (this.gameHistoryManager) {
      this.gameHistoryManager.addEntry({
        eventType: 'system_error',
        severity: 'warning',
        title: 'System Shutdown',
        description: 'TCG system performing cleanup and shutdown',
        data: { reason: 'cleanup' },
        source: 'TCGSystem',
        tags: ['shutdown', 'cleanup']
      });
    }

    // Destroy subsystems in reverse dependency order
    this.settingsTab?.hide?.();
    this.commentarySystem?.destroy?.();
    this.keystrokeTracker?.destroy?.();
    this.gameWorldManager?.destroy?.();
    this.packSystem?.destroy?.();
    this.playerManager?.destroy?.();
    this.themeManager?.destroy?.();
    this.gameHistoryManager?.destroy?.(); // Destroy history manager last
    this.noteAnalyzer = null;
    this.progressionEngine?.destroy?.();

    // Clear references
    this.progressionEngine = null;
    this.noteAnalyzer = null;
    this.packSystem = null;
    this.playerManager = null;
    this.keystrokeTracker = null;
    this.gameWorldManager = null;
    this.gameHistoryManager = null;
    this.themeManager = null;
    this.commentarySystem = null;
    this.settingsTab = null;

    // Clear event listeners
    this.eventListeners.clear();
    this.cleanupFunctions = [];

    console.log('🧹 TCG system cleanup complete');
  }

  /**
   * Handle system errors
   */
  private handleSystemError(error: Error, context: string): void {
    console.error(`TCG System Error in ${context}:`, error);
    
    this.systemState.lastError = error;
    this.emitEvent('error-occurred', { error, context });

    // Attempt recovery for certain types of errors
    if (error.message.includes('memory') || error.message.includes('performance')) {
      console.log('🔄 Attempting performance recovery...');
      // Could trigger performance mode or cleanup
    }
  }
}

// ===== PLUGIN INTEGRATION HELPER =====

/**
 * Create and integrate TCG system with existing plugin
 */
export async function integrateWithPlugin(
  app: App,
  plugin: Plugin,
  settings: ClippySettings,
  activityTracker: ActivityTracker
): Promise<TCGSystem | null> {
  
  return await ClippyErrorBoundaries.fileSystemOperation(
    async () => {
      // Ensure TCG settings exist
      if (!settings.tcg) {
        settings.tcg = { ...DEFAULT_TCG_SETTINGS };
      }

      // Create TCG system
      const tcgSystem = new TCGSystem(app, plugin, settings, activityTracker);

      // Initialize if enabled
      if (settings.tcg.enabled) {
        const success = await tcgSystem.initialize();
        if (!success) {
          console.warn('TCG system initialization failed');
          return null;
        }
      }

      // Register cleanup with plugin
      const originalUnload = (plugin as any).onunload;
      (plugin as any).onunload = async function() {
        await tcgSystem.shutdown();
        if (originalUnload) {
          await originalUnload.call(this);
        }
      };

      console.log('🎮 TCG system integrated with plugin');
      return tcgSystem;
    },
    'TCG plugin integration'
  );
}