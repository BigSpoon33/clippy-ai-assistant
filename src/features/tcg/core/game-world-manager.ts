/**
 * CLIPPY TCG Writer - Game World Manager
 * Creates and manages the dynamic game world that evolves with player activity
 * Integrates writing patterns, vault analytics, and RNG to generate immersive environments
 */

import { 
  GameWorldState, 
  GameLocation, 
  GameWeather, 
  TimeOfDay, 
  ThreatLevel,
  GameEvent,
  WorldGenerationConfig,
  GameWorldHistory,
  TCGSessionMetrics
} from '../types';
import { SecureTCGRandom } from './rng-system';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== ENVIRONMENTAL TEMPLATES =====

/**
 * Pre-defined ambiance templates for location and weather combinations
 * Partial record - missing combinations will use default templates
 */
const AMBIANCE_TEMPLATES: Partial<Record<GameLocation, Partial<Record<GameWeather, {
  sights: string[];
  sounds: string[];
  feelings: string[];
  smells: string[];
}>>>> = {
  village: {
    sunny: {
      sights: ["cobblestone paths gleaming in sunlight", "flowers blooming in window boxes", "children playing in the square"],
      sounds: ["birds chirping", "distant laughter", "gentle wind through trees"],
      feelings: ["warm and peaceful", "content and focused", "inspired and creative"],
      smells: ["fresh bread baking", "blooming flowers", "clean mountain air"]
    },
    cloudy: {
      sights: ["gray clouds gathering overhead", "villagers hurrying indoors", "lanterns being lit early"],
      sounds: ["distant thunder", "shutters closing", "muffled conversations"],
      feelings: ["contemplative and introspective", "slightly uncertain", "cozy and protected"],
      smells: ["approaching rain", "wood smoke from chimneys", "damp earth"]
    },
    rainy: {
      sights: ["rain pattering on rooftops", "puddles reflecting lamplight", "empty streets"],
      sounds: ["steady rainfall", "water dripping from eaves", "crackling fireplaces"],
      feelings: ["reflective and melancholy", "deeply focused", "comforted by shelter"],
      smells: ["petrichor from wet earth", "wood smoke", "fresh rain"]
    },
    stormy: {
      sights: ["lightning illuminating the village", "trees bending in fierce winds", "worried faces in windows"],
      sounds: ["howling wind", "thunder crashes", "rain lashing against walls"],
      feelings: ["intense and energized", "slightly anxious", "determined and focused"],
      smells: ["electric air after lightning", "wet stone", "strong winds carrying distant scents"]
    },
    foggy: {
      sights: ["thick mist obscuring distant buildings", "ghostly silhouettes", "dim lantern glows"],
      sounds: ["muffled footsteps", "distant voices", "dripping condensation"],
      feelings: ["mysterious and uncertain", "introspective", "searching for clarity"],
      smells: ["cool damp air", "misty dampness", "hidden pathways"]
    },
    snowy: {
      sights: ["pristine white blankets on rooftops", "icicles hanging from eaves", "smoke rising from chimneys"],
      sounds: ["crunching footsteps in snow", "wood crackling in fireplaces", "muffled winter silence"],
      feelings: ["pure and clean", "quietly focused", "peaceful isolation"],
      smells: ["crisp winter air", "wood smoke", "clean snow"]
    },
    windy: {
      sights: ["leaves and papers swirling through streets", "flags and banners flapping", "dust clouds rising"],
      sounds: ["whistling wind", "creaking signs", "rustling leaves"],
      feelings: ["dynamic and changeable", "restless energy", "ready for new directions"],
      smells: ["shifting air currents", "distant places", "stirred dust and leaves"]
    }
  },
  // Additional locations would be added here - truncated for brevity
  forest: {
    sunny: {
      sights: ["dappled sunlight through green canopy", "ancient trees towering overhead", "forest creatures moving in shadows"],
      sounds: ["leaves rustling", "bird songs echoing", "distant woodland sounds"],
      feelings: ["deeply focused and immersed", "connected to nature", "finding inner wisdom"],
      smells: ["rich earth and moss", "pine and cedar", "wild flowers"]
    },
    rainy: {
      sights: ["rain drops creating patterns on leaves", "mist rising from forest floor", "slick tree bark gleaming"],
      sounds: ["gentle rain on canopy", "water trickling down trunks", "soft forest whispers"],
      feelings: ["profoundly contemplative", "cleansed and renewed", "diving deep into thoughts"],
      smells: ["wet earth and leaves", "rich forest loam", "fresh rain on wood"]
    },
    stormy: {
      sights: ["trees swaying dramatically", "lightning illuminating the canopy", "branches creaking and bending"],
      sounds: ["wind roaring through trees", "branches snapping", "thunder echoing"],
      feelings: ["intense focus and determination", "raw creative energy", "confronting challenges"],
      smells: ["electric storm air", "broken wood", "wild nature unleashed"]
    },
    foggy: {
      sights: ["mysterious mist between trees", "shapes barely visible", "ethereal forest atmosphere"],
      sounds: ["muffled forest sounds", "dripping condensation", "distant unknown noises"],
      feelings: ["searching for hidden truths", "exploring the unknown", "mysterious inspiration"],
      smells: ["cool misty air", "hidden forest depths", "ancient secrets"]
    },
    cloudy: {
      sights: ["filtered gray light", "shadowy forest depths", "contemplative atmosphere"],
      sounds: ["subdued forest noises", "gentle wind", "thoughtful silence"],
      feelings: ["introspective and thoughtful", "steady concentration", "patient exploration"],
      smells: ["cool forest air", "damp earth", "green growing things"]
    },
    snowy: {
      sights: ["snow-laden branches", "winter forest silence", "animal tracks in snow"],
      sounds: ["muffled winter quiet", "snow falling", "distant winter birds"],
      feelings: ["pure and focused", "winter contemplation", "essential thinking"],
      smells: ["clean winter air", "snow on pine", "winter forest silence"]
    },
    windy: {
      sights: ["leaves swirling through forest", "branches dancing", "dynamic forest movement"],
      sounds: ["wind through canopy", "rustling leaves", "creaking wood"],
      feelings: ["dynamic energy", "changing perspectives", "flowing thoughts"],
      smells: ["moving forest air", "stirred earth", "wind-carried forest scents"]
    }
  }
};

// Simplified template for other locations - would be expanded in full implementation
const DEFAULT_AMBIANCE = {
  sights: ["the surrounding environment", "details coming into focus", "the world around you"],
  sounds: ["ambient environmental sounds", "the rhythm of your work", "distant activities"],
  feelings: ["focused and engaged", "present in the moment", "making progress"],
  smells: ["the scent of concentration", "familiar workspace aromas", "productive atmosphere"]
};

// ===== MAIN GAME WORLD MANAGER =====

/**
 * Manages the dynamic game world state, generating immersive environments
 * that respond to player activity, writing patterns, and vault analytics
 */
export class GameWorldManager {
  private rng: SecureTCGRandom;
  private config: WorldGenerationConfig;
  private currentState: GameWorldState | null = null;
  private history: GameWorldHistory[] = [];
  private lastUpdateKeystrokes = 0;
  private eventCooldownRemaining = 0;

  // Timer-based response system
  private timerInterval: NodeJS.Timeout | null = null;
  private lastTimerUpdate = Date.now();

  // Event listeners
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor(config: WorldGenerationConfig, rngSeed?: string) {
    this.config = config;
    this.rng = new SecureTCGRandom(rngSeed);
    
    // Start timer if enabled
    if (config.timerTrigger) {
      this.startTimer();
    }
    
    console.log('🌍 Game World Manager initialized');
  }

  /**
   * Generate new world state based on player activity and session metrics
   */
  async generateWorldState(
    sessionMetrics: TCGSessionMetrics,
    totalKeystrokes: number,
    trigger: 'keystroke' | 'timer' | 'manual' = 'keystroke'
  ): Promise<GameWorldState> {
    
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        console.log(`🌍 Generating world state (trigger: ${trigger})`);
        
        const previousState = this.currentState ? { ...this.currentState } : null;
        
        // Generate core world properties
        const location = this.generateLocation(sessionMetrics);
        const weather = this.generateWeather(sessionMetrics, location);
        const timeOfDay = this.generateTimeOfDay(sessionMetrics);
        const threatLevel = this.generateThreatLevel(sessionMetrics, location, weather);
        
        // Generate environmental ambiance
        const ambiance = this.generateAmbiance(location, weather, timeOfDay);
        
        // Create new world state
        const newState: GameWorldState = {
          stateId: this.rng.generateSeed().substring(0, 12),
          location,
          weather,
          timeOfDay,
          threatLevel,
          ambiance,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          sessionKeystrokes: totalKeystrokes - this.lastUpdateKeystrokes,
          activeEvents: [],
          worldHistory: this.history.slice(-10) // Keep last 10 history entries
        };

        // Generate events if enabled
        if (this.config.enableEvents && this.eventCooldownRemaining <= 0) {
          const events = await this.generateEvents(newState, sessionMetrics);
          newState.activeEvents = events;
          
          if (events.length > 0) {
            this.eventCooldownRemaining = this.config.eventCooldown;
          }
        }

        // Update internal state
        this.currentState = newState;
        this.lastUpdateKeystrokes = totalKeystrokes;
        this.eventCooldownRemaining = Math.max(0, this.eventCooldownRemaining - newState.sessionKeystrokes);

        // Record history
        if (previousState) {
          this.history.push({
            timestamp: new Date(),
            previousState,
            newState,
            trigger,
            keystrokeCount: totalKeystrokes
          });
        }

        // Emit world state updated event
        this.emitEvent('world-state-updated', {
          newState,
          previousState,
          trigger,
          keystrokeCount: totalKeystrokes
        });

        console.log(`🌍 World state: ${location} (${weather}, ${threatLevel})`);
        return newState;
      },
      'World state generation'
    ) || this.getDefaultWorldState();
  }

  /**
   * Generate location based on writing patterns and session metrics
   */
  private generateLocation(metrics: TCGSessionMetrics): GameLocation {
    const baseWeights = { ...this.config.locationWeights };
    
    // Adjust weights based on session metrics
    const kpm = metrics.averageKPM;
    const sessionLength = metrics.sessionDuration / (1000 * 60); // minutes
    const quality = metrics.qualityScore;

    // High KPM = city/town (bustling activity)
    if (kpm > 100) {
      baseWeights.city *= 1.5;
      baseWeights.town *= 1.3;
    }
    
    // Long sessions = forest/mountains (deep exploration)
    if (sessionLength > 30) {
      baseWeights.forest *= 1.4;
      baseWeights.mountains *= 1.2;
    }
    
    // High quality = temple/village (wisdom and peace)
    if (quality > 0.8) {
      baseWeights.temple *= 1.6;
      baseWeights.village *= 1.3;
    }
    
    // Low activity = desert/cave (sparse, focused)
    if (kpm < 50 && sessionLength < 10) {
      baseWeights.desert *= 1.4;
      baseWeights.cave *= 1.2;
    }

    return this.rng.selectWeightedOption(baseWeights) as GameLocation;
  }

  /**
   * Generate weather based on writing quality and mood patterns
   */
  private generateWeather(metrics: TCGSessionMetrics, location: GameLocation): GameWeather {
    const baseWeights = { ...this.config.weatherWeights };
    
    const quality = metrics.qualityScore;
    const consistency = this.calculateWritingConsistency(metrics);
    
    // High quality writing = sunny weather
    if (quality > 0.7) {
      baseWeights.sunny *= 1.5;
    }
    
    // Inconsistent writing = stormy/chaotic weather
    if (consistency < 0.3) {
      baseWeights.stormy *= 1.4;
      baseWeights.windy *= 1.2;
    }
    
    // Very low activity = foggy (unclear, searching)
    if (metrics.averageKPM < 30) {
      baseWeights.foggy *= 1.3;
    }
    
    // Location influences weather
    if (location === 'mountains') {
      baseWeights.snowy *= 1.3;
      baseWeights.windy *= 1.2;
    }
    if (location === 'coast') {
      baseWeights.rainy *= 1.2;
      baseWeights.windy *= 1.4;
    }
    if (location === 'desert') {
      baseWeights.sunny *= 1.4;
      baseWeights.stormy *= 0.5;
    }

    return this.rng.selectWeightedOption(baseWeights) as GameWeather;
  }

  /**
   * Generate time of day based on session progression
   */
  private generateTimeOfDay(metrics: TCGSessionMetrics): TimeOfDay {
    const sessionMinutes = metrics.sessionDuration / (1000 * 60);
    const keystrokes = metrics.sessionKeystrokes;
    
    // Map session progression to time of day
    if (sessionMinutes < 5 || keystrokes < 100) return 'dawn';
    if (sessionMinutes < 15 || keystrokes < 500) return 'morning';
    if (sessionMinutes < 30 || keystrokes < 1500) return 'noon';
    if (sessionMinutes < 45 || keystrokes < 2500) return 'afternoon';
    if (sessionMinutes < 60 || keystrokes < 4000) return 'evening';
    if (sessionMinutes < 90 || keystrokes < 6000) return 'night';
    
    return 'midnight'; // Extended deep sessions
  }

  /**
   * Generate threat level based on writing difficulty and environmental factors
   */
  private generateThreatLevel(
    metrics: TCGSessionMetrics, 
    location: GameLocation, 
    weather: GameWeather
  ): ThreatLevel {
    const baseWeights = { ...this.config.threatWeights };
    
    // Environmental factors increase threat
    if (weather === 'stormy') baseWeights.dangerous *= 1.5;
    if (weather === 'foggy') baseWeights.tense *= 1.3;
    if (location === 'mountains' || location === 'cave') {
      baseWeights.dangerous *= 1.2;
      baseWeights.tense *= 1.1;
    }
    
    // High intensity writing = higher threat (challenging content)
    const intensity = this.calculateWritingIntensity(metrics);
    if (intensity > 0.8) {
      baseWeights.hostile *= 1.3;
      baseWeights.dangerous *= 1.2;
    }
    
    // Very peaceful writing = lower threat
    if (intensity < 0.3 && metrics.qualityScore > 0.7) {
      baseWeights.peaceful *= 1.4;
    }

    return this.rng.selectWeightedOption(baseWeights) as ThreatLevel;
  }

  /**
   * Generate rich environmental ambiance descriptions
   */
  private generateAmbiance(
    location: GameLocation, 
    weather: GameWeather, 
    timeOfDay: TimeOfDay
  ): GameWorldState['ambiance'] {
    
    // Get templates for this location/weather combination
    const templates = AMBIANCE_TEMPLATES[location]?.[weather] || DEFAULT_AMBIANCE;
    
    // Randomly select from each category
    const sight = this.rng.selectFromArray(templates.sights);
    const sound = this.rng.selectFromArray(templates.sounds);
    const feeling = this.rng.selectFromArray(templates.feelings);
    const smell = this.rng.selectFromArray(templates.smells);
    
    // Add time of day modifiers
    const timeModifiers = this.getTimeModifiers(timeOfDay);
    
    return {
      sight: this.applyTimeModifier(sight, timeModifiers.sight),
      sound: this.applyTimeModifier(sound, timeModifiers.sound),
      feeling: this.applyTimeModifier(feeling, timeModifiers.feeling),
      smell: this.applyTimeModifier(smell, timeModifiers.smell)
    };
  }

  /**
   * Generate dynamic events based on world state and conditions
   */
  private async generateEvents(
    worldState: GameWorldState, 
    metrics: TCGSessionMetrics
  ): Promise<GameEvent[]> {
    const events: GameEvent[] = [];
    
    // Base chance for any event to occur
    const eventRoll = this.rng.random();
    if (eventRoll > this.config.baseEventChance) {
      return events; // No events this time
    }
    
    // Lightning strike event (rainy + plains/forest)
    if ((worldState.weather === 'rainy' || worldState.weather === 'stormy') && 
        (worldState.location === 'plains' || worldState.location === 'forest')) {
      
      const lightningChance = worldState.weather === 'stormy' ? 0.4 : 0.2;
      if (this.rng.random() < lightningChance) {
        events.push(this.createLightningStrikeEvent(worldState));
      }
    }
    
    // Discovery events in exploration locations
    if ((worldState.location === 'cave' || worldState.location === 'temple' || 
         worldState.location === 'mountains') && worldState.threatLevel !== 'hostile') {
      
      const discoveryChance = metrics.qualityScore * 0.3; // Higher quality = better discoveries
      if (this.rng.random() < discoveryChance) {
        events.push(this.createDiscoveryEvent(worldState, metrics));
      }
    }
    
    // More event types would be added here...
    
    return events;
  }

  /**
   * Create a lightning strike event
   */
  private createLightningStrikeEvent(worldState: GameWorldState): GameEvent {
    const damage = this.rng.randomRange(5, 15);
    const eventId = `lightning-${worldState.stateId}-${Date.now()}`;
    
    return {
      eventId,
      type: 'weather',
      name: 'Lightning Strike',
      description: 'A brilliant flash illuminates the sky as lightning strikes nearby!',
      triggers: [
        { type: 'weather', operator: 'contains', value: 'rainy|stormy' },
        { type: 'location', operator: 'contains', value: 'plains|forest' }
      ],
      probability: worldState.weather === 'stormy' ? 0.4 : 0.2,
      playerEffects: [
        { type: 'damage', value: damage, message: `You take ${damage} shock damage from the lightning!` }
      ],
      worldEffects: [
        { type: 'threat_change', target: 'threatLevel', value: 'dangerous', duration: 500 }
      ],
      createdAt: new Date(),
      triggeredAt: new Date()
    };
  }

  /**
   * Create a discovery event
   */
  private createDiscoveryEvent(worldState: GameWorldState, metrics: TCGSessionMetrics): GameEvent {
    const eventId = `discovery-${worldState.stateId}-${Date.now()}`;
    const qualityBonus = Math.floor(metrics.qualityScore * 50);
    
    // Higher quality writing = better rewards
    const rewardType = metrics.qualityScore > 0.8 ? 'pack' : 'exp';
    const rewardValue = rewardType === 'pack' ? 'core-set' : (25 + qualityBonus);
    
    return {
      eventId,
      type: 'discovery',
      name: 'Ancient Discovery',
      description: `Your focused exploration reveals something valuable hidden in the ${worldState.location}!`,
      triggers: [
        { type: 'location', operator: 'contains', value: 'cave|temple|mountains' },
        { type: 'threat_level', operator: 'equals', value: 'peaceful|neutral' }
      ],
      probability: metrics.qualityScore * 0.3,
      playerEffects: [
        { 
          type: rewardType, 
          value: rewardValue, 
          message: rewardType === 'pack' 
            ? 'You discovered a rare pack of cards!' 
            : `You gained ${rewardValue} experience from your discovery!`
        }
      ],
      worldEffects: [],
      createdAt: new Date(),
      triggeredAt: new Date()
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate writing consistency from metrics
   */
  private calculateWritingConsistency(metrics: TCGSessionMetrics): number {
    // This would analyze keystroke timing patterns
    // For now, return a placeholder based on available metrics
    const speedVariation = Math.abs(metrics.peakKPM - metrics.averageKPM) / Math.max(metrics.averageKPM, 1);
    return Math.max(0, 1 - (speedVariation / 50)); // Normalize to 0-1
  }

  /**
   * Calculate writing intensity from metrics
   */
  private calculateWritingIntensity(metrics: TCGSessionMetrics): number {
    // Combine various factors to determine writing intensity
    const speedFactor = Math.min(metrics.averageKPM / 100, 1);
    const qualityFactor = metrics.qualityScore;
    const durationFactor = Math.min(metrics.sessionDuration / (1000 * 60 * 30), 1); // Normalize to 30 min
    
    return (speedFactor * 0.4 + qualityFactor * 0.4 + durationFactor * 0.2);
  }

  /**
   * Get time of day modifiers for ambiance
   */
  private getTimeModifiers(timeOfDay: TimeOfDay) {
    const modifiers = {
      dawn: { sight: 'in the early morning light', sound: 'with dawn\'s quiet awakening', feeling: 'with fresh morning energy', smell: 'in the crisp morning air' },
      morning: { sight: 'bathed in bright morning light', sound: 'accompanied by morning activity', feeling: 'energized by the new day', smell: 'with fresh morning scents' },
      noon: { sight: 'illuminated by brilliant sunlight', sound: 'amidst peak daily activity', feeling: 'at full energy and focus', smell: 'in the warm midday air' },
      afternoon: { sight: 'in the warm afternoon glow', sound: 'with steady afternoon rhythm', feeling: 'with sustained concentration', smell: 'in the comfortable afternoon atmosphere' },
      evening: { sight: 'touched by golden evening light', sound: 'as the day winds down', feeling: 'with reflective evening calm', smell: 'in the cooling evening air' },
      night: { sight: 'shrouded in peaceful darkness', sound: 'in the quiet of night', feeling: 'with deep nighttime focus', smell: 'in the still night air' },
      midnight: { sight: 'cloaked in deep midnight shadows', sound: 'in profound midnight silence', feeling: 'with intense midnight concentration', smell: 'in the mysterious midnight atmosphere' }
    };
    
    return modifiers[timeOfDay];
  }

  /**
   * Apply time modifier to ambiance description
   */
  private applyTimeModifier(baseDescription: string, timeModifier: string): string {
    return `${baseDescription} ${timeModifier}`;
  }

  /**
   * Get default world state for error recovery
   */
  private getDefaultWorldState(): GameWorldState {
    return {
      stateId: 'default-' + Date.now(),
      location: 'village',
      weather: 'cloudy',
      timeOfDay: 'morning',
      threatLevel: 'neutral',
      ambiance: {
        sight: 'a quiet writing space',
        sound: 'the gentle rhythm of typing',
        feeling: 'focused and ready to write',
        smell: 'familiar workspace comfort'
      },
      generatedAt: new Date(),
      lastUpdated: new Date(),
      sessionKeystrokes: 0,
      activeEvents: [],
      worldHistory: []
    };
  }

  // ===== PUBLIC INTERFACE =====

  /**
   * Get current world state
   */
  getCurrentState(): GameWorldState | null {
    return this.currentState;
  }

  /**
   * Get world state history
   */
  getHistory(): GameWorldHistory[] {
    return [...this.history];
  }

  /**
   * Force update world state (for testing)
   */
  async forceUpdate(sessionMetrics: TCGSessionMetrics, totalKeystrokes: number): Promise<GameWorldState> {
    return await this.generateWorldState(sessionMetrics, totalKeystrokes, 'manual');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: WorldGenerationConfig): void {
    const oldTimerSetting = this.config.timerTrigger;
    const oldInterval = this.config.timerInterval;
    
    this.config = newConfig;
    
    // Handle timer configuration changes
    if (oldTimerSetting !== newConfig.timerTrigger || oldInterval !== newConfig.timerInterval) {
      this.resetTimer();
    }
    
    console.log('🌍 World generation config updated');
  }

  /**
   * Add event listener
   */
  onEvent(eventType: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in world manager event handler for ${eventType}:`, error);
        }
      });
    }
  }

  // ===== TIMER SYSTEM =====

  /**
   * Start timer-based world state updates
   */
  startTimer(): void {
    if (!this.config.timerTrigger || this.timerInterval !== null) {
      return;
    }

    const intervalMs = this.config.timerInterval * 60 * 1000; // Convert minutes to milliseconds
    console.log(`⏰ Starting world state timer: ${this.config.timerInterval} minute intervals`);

    this.timerInterval = setInterval(async () => {
      try {
        if (this.config.timerTrigger) {
          // Create placeholder session metrics for timer-based updates
          const timerMetrics: TCGSessionMetrics = {
            sessionDuration: Date.now() - this.lastTimerUpdate,
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
            sessionStartTime: this.lastTimerUpdate,
            mostRecentActivity: Date.now()
          };

          const newState = await this.generateWorldState(timerMetrics, 0, 'timer');
          this.lastTimerUpdate = Date.now();

          // Emit timer update event
          this.emitEvent('timer-world-update', {
            worldState: newState,
            trigger: 'timer',
            intervalMinutes: this.config.timerInterval
          });

          console.log(`⏰ Timer-based world state update: ${newState.location} (${newState.weather})`);
        }
      } catch (error) {
        console.error('❌ Error during timer-based world update:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop timer-based updates
   */
  stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('⏹️ World state timer stopped');
    }
  }

  /**
   * Reset timer (restart with current config)
   */
  resetTimer(): void {
    this.stopTimer();
    if (this.config.timerTrigger) {
      this.startTimer();
    }
  }

  /**
   * Check if timer is active
   */
  isTimerActive(): boolean {
    return this.timerInterval !== null;
  }

  /**
   * Clean up and destroy manager
   */
  destroy(): void {
    this.stopTimer();
    this.eventHandlers.clear();
    this.history = [];
    this.currentState = null;
    console.log('🌍 Game World Manager destroyed');
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create a game world manager with default configuration
 */
export function createGameWorldManager(config?: Partial<WorldGenerationConfig>): GameWorldManager {
  // Would get full config from settings, for now use defaults
  const defaultConfig: WorldGenerationConfig = {
    keystrokeTrigger: true,
    keystrokeInterval: 500,
    timerTrigger: true,
    timerInterval: 10,
    locationWeights: {
      village: 0.2, town: 0.15, city: 0.1, forest: 0.15, plains: 0.15,
      mountains: 0.1, coast: 0.05, desert: 0.05, temple: 0.03, cave: 0.02
    },
    weatherWeights: {
      sunny: 0.3, cloudy: 0.25, rainy: 0.2, stormy: 0.1,
      foggy: 0.1, snowy: 0.03, windy: 0.02
    },
    threatWeights: {
      peaceful: 0.4, neutral: 0.35, tense: 0.15, dangerous: 0.08, hostile: 0.02
    },
    kmpInfluence: 0.3,
    qualityInfluence: 0.4,
    vaultInfluence: 0.2,
    enableEvents: true,
    baseEventChance: 0.15,
    eventCooldown: 1000
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  return new GameWorldManager(finalConfig);
}