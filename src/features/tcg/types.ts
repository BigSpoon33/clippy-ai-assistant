/**
 * CLIPPY TCG Writer - Type Definitions
 * Trading Card Game gamification system type definitions
 * Following PRP specifications for data models and interfaces
 */

import { TFile } from 'obsidian';

// ===== CORE TCG INTERFACES =====

/**
 * Main player profile with comprehensive progression tracking
 */
export interface TCGPlayerProfile {
  readonly id: string;
  readonly playerId: string; // Alias for id for compatibility
  characterName: string;
  level: number;
  currentLevel: number; // Alias for level for compatibility
  currentEXP: number;
  totalKeystrokes: number;
  packsOpened: number;
  cardsCollected: number;
  currentStreak: number;
  longestStreak: number;
  activeTheme: string;
  createdAt: Date;
  lastActive: Date;
  
  // Calculated properties with caching
  readonly expToNextLevel: number;
  readonly keystrokesPerMinute: number;
  readonly engagementLevel: number;
  
  stats: {
    power: number;        // Overall card collection strength
    creativity: number;   // Writing style and uniqueness  
    consistency: number;  // Daily writing streak bonuses
    knowledge: number;    // Note interconnectedness and depth
  };
  
  achievements: Record<string, {
    unlocked: boolean;
    unlockedAt?: Date;
    progress: number;
    maxProgress: number;
  }>;
  
  preferences: {
    autoOpenPacks: boolean;
    showParticleEffects: boolean;
    commentaryFrequency: 'never' | 'low' | 'medium' | 'high';
    preferredPackSize: number;
  };
}

/**
 * Individual collectible card generated from vault notes
 */
export interface TCGCard {
  readonly id: string; // UUID for uniqueness
  name: string;
  noteReference: string; // Obsidian file path
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  isShiny: boolean;
  powerLevel: number;
  
  // Generation metadata
  generatedFrom: 'note_analysis' | 'ai_creation' | 'user_custom';
  acquisitionDate: Date;
  acquisitionContext: string; // Which pack/method
  
  // Note-derived properties  
  noteStats: {
    wordCount: number;
    backlinks: number;
    forwardLinks: number;
    tags: string[];
    lastModified: Date;
    creationDate: Date;
  };
  
  // Theme-specific data
  themeData: Record<string, any>;
  
  // Gameplay properties
  abilities: string[];
  flavorText: string;
  
  // Usage tracking
  timesViewed: number;
  lastViewed?: Date;
  favorited: boolean;
}

/**
 * Card pack definition with weighted probabilities
 */
export interface TCGPack {
  readonly id: string;
  name: string;
  description: string;
  cardCount: number;
  costInEXP: number;
  costInKeystrokes: number;
  
  // Probability distribution (must sum to 1.0)
  rarityWeights: {
    Common: number;
    Uncommon: number; 
    Rare: number;
    Epic: number;
    Legendary: number;
  };
  
  shinyBaseRate: number; // Base probability (0-1)
  
  // Bonus conditions
  streakMultiplier: number;    // Multiplier for daily streaks
  qualityMultiplier: number;   // Writing quality bonus
  speedMultiplier: number;     // Fast typing bonus
  
  // Theme restrictions
  themeSpecific: boolean;
  compatibleThemes: string[];
  
  // Availability conditions
  levelRequired: number;
  achievementRequired?: string;
  timeGated?: {
    start: Date;
    end: Date;
  } | {
    hours: number;
    description: string;
  };
}

/**
 * Theme system interface for visual customization
 */
export interface TCGTheme {
  readonly id: string;
  name: string;
  description: string;
  version: string;
  
  // Visual styling
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  
  // Card appearance  
  cardTemplate: {
    backgroundImage?: string;
    borderStyle: string;
    fontFamily: string;
    rarityIndicators: Record<string, { color: string; icon: string }>;
  };
  
  // Pack definitions
  packs: TCGPack[];
  
  // Mapping functions
  mapNoteToCard(note: TFile, noteContent: string): Partial<TCGCard>;
  generateFlavorText(card: TCGCard): string;
  calculateThemeSpecificStats(note: TFile): Record<string, number>;
  
  // UI customization
  particleEffects: Record<string, any>;
  soundEffects?: Record<string, string>;
  animations: Record<string, any>;
}

/**
 * Settings integration with full type safety
 */
export interface TCGSettings {
  enabled: boolean;
  
  // Core progression
  keystrokesPerEXP: number;
  expFormula: 'linear' | 'exponential' | 'logarithmic' | 'custom';
  customFormulaParams: {
    base: number;
    exponent: number;
    modifier: number;
  };
  
  // Pack system
  packUnlockThreshold: number;
  maxPacksPerDay: number;
  autoOpenPacks: boolean;
  
  // Theming
  activeTheme: string;
  customThemes: Record<string, TCGTheme>;
  
  // AI integration (uses main plugin's AI provider system)
  enableAICommentary: boolean;
  
  // Game Master and Player Character prompts for the commentary workflow
  gameMasterPrompt: string;
  playerCharacterPrompt: string;
  
  commentaryPrompts: {
    highPerformance: string;
    levelUp: string;
    packOpening: string;
    shinyCard: string;
    achievement: string;
  };
  
  // Player Card System
  autoUpdatePlayerCard: boolean;
  playerCardUpdateInterval: number; // minutes
  
  // Performance
  performanceMode: boolean;
  maxParticles: number;
  animationQuality: 'low' | 'medium' | 'high';
  
  // Achievement system
  achievements: Record<string, {
    name: string;
    description: string;
    icon: string;
    conditions: any;
    rewards: {
      exp?: number;
      packs?: string[];
      unlocks?: string[];
    };
  }>;
  
  // World Generation System
  worldGeneration: WorldGenerationConfig;
  
  // Advanced
  enableDebugMode: boolean;
  rngSeed?: string; // For reproducible testing
  dataRetentionDays: number;
  exportEnabled: boolean;
}

// ===== ANALYSIS AND PROCESSING TYPES =====

/**
 * Note analysis result for card generation
 */
export interface NoteAnalysis {
  complexity: number;      // Word count, structure depth
  connectivity: number;    // Backlinks + forward links
  uniqueness: number;      // Unique concepts, vocabulary
  recency: number;         // Creation date, modification frequency  
  engagement: number;      // User interaction patterns
}

/**
 * Card rarity type guard
 */
export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

/**
 * EXP progression formula type guard
 */
export type ProgressionFormula = 'linear' | 'exponential' | 'logarithmic' | 'custom';

// ===== AI COMMENTARY TYPES =====

/**
 * Writing context for AI commentary
 */
export interface WritingContext {
  achievement: string;
  theme: string;
  kpm: number; // Keystrokes per minute
  streak: number;
  performance: string;
  qualityScore: number;
  speedCategory: string;
}

/**
 * Obsidian-aware writing context with vault insights
 */
export interface ObsidianAwareContext extends WritingContext {
  vaultInsights: {
    activeNoteType: string;        // Daily note, project note, etc.
    recentNotePatterns: string[];  // Writing structure patterns
    linkingBehavior: string;       // How user connects ideas
    tagUsagePatterns: string[];    // Tagging habits
    focusedTopic: string;          // Current area of focus
    sessionFlow: string;           // Writing session characteristics
  };
  writingQuality: {
    structuralCoherence: number;   // How well-organized the writing is
    conceptualDepth: number;       // Depth of ideas being explored
    connectionDensity: number;     // How interconnected with vault
    originalityScore: number;      // Uniqueness of content
  };
}

/**
 * Training data for AI commentary improvement
 */
export interface CommentaryTrainingData {
  context: ObsidianAwareContext;
  generatedCommentary: string;
  userReaction: 'positive' | 'negative' | 'neutral' | 'dismissed' | null;
  timestamp: Date;
  effectivenessScore: number;
  vaultContext: {
    noteTypes: string[];
    writingPatterns: string[];
    userPreferences: Record<string, any>;
    vaultStructure: string;
  };
}

/**
 * Vault behavior analysis for personalization
 */
export interface VaultPersonality {
  writingStyle: string;
  primaryTopics: string[];
  organizationalStyle: string;
  linkingStyle: string;
  workflowType: string;
}

/**
 * Anonymized vault metrics for model training
 */
export interface AnonymizedVaultMetrics {
  noteCount: number;
  avgNoteLength: number;
  linkDensity: number;
  structuralComplexity: number;
  activityPatterns: string[];
}

/**
 * Training data export structure
 */
export interface TrainingDataExport {
  version: string;
  timestamp: string;
  batchSize: number;
  anonymizedVaultMetrics: AnonymizedVaultMetrics;
  trainingEntries: Array<{
    contextVector: Record<string, number>;
    commentary: string;
    userFeedback: 'positive' | 'negative' | 'neutral' | 'dismissed' | null;
    effectiveness: number;
    vaultPatterns: Record<string, any>;
  }>;
}

// ===== EVENT TYPES =====

/**
 * TCG system events
 */
export interface TCGEvents {
  'exp-awarded': (amount: number) => void;
  'level-up': (newLevel: number) => void;
  'pack-unlocked': (pack: TCGPack) => void;
  'card-acquired': (card: TCGCard) => void;
  'achievement-unlocked': (achievement: string) => void;
  'theme-changed': (newTheme: string) => void;
  'streak-extended': (newStreak: number) => void;
  'commentary-generated': (commentary: string) => void;
}

// ===== UTILITY TYPES =====

/**
 * Type guard for card rarity
 */
export function isValidCardRarity(rarity: string): rarity is CardRarity {
  return ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].includes(rarity);
}

/**
 * Type guard for progression formula
 */
export function isValidProgressionFormula(formula: string): formula is ProgressionFormula {
  return ['linear', 'exponential', 'logarithmic', 'custom'].includes(formula);
}

/**
 * TCG system statistics
 */
export interface TCGStats {
  totalEXP: number;
  currentLevel: number;
  totalKeystrokes: number;
  packsOpened: number;
  cardsCollected: number;
  achievementsUnlocked: number;
  averageSessionLength: number;
  streakDays: number;
}

/**
 * Performance metrics for validation
 */
export interface TCGPerformanceMetrics {
  keystrokeProcessingTime: number;
  cardGenerationTime: number;
  packOpeningLatency: number;
  memoryUsage: number;
  cpuUsage: number;
}

// ===== SESSION METRICS =====

/**
 * Session performance metrics for world generation
 */
export interface TCGSessionMetrics {
  sessionDuration: number;
  totalKeystrokes: number;
  sessionKeystrokes: number; // Alias for compatibility
  averageKPM: number;
  peakKPM: number;
  qualityScore: number;
  consistencyScore: number;
  focusScore: number;
  burstCount: number;
  pauseCount: number;
  longestBurst: number;
  longestPause: number;
  sessionStartTime: number;
  mostRecentActivity: number;
}

// ===== GAME HISTORY SYSTEM =====

/**
 * Types of events that can be logged in game history
 */
export type GameHistoryEventType = 
  | 'world_state_change'
  | 'player_level_up'
  | 'pack_earned'
  | 'pack_opened'
  | 'card_generated'
  | 'achievement_unlocked'
  | 'commentary_generated'
  | 'game_event_triggered'
  | 'player_effect_applied'
  | 'keystroke_milestone'
  | 'session_started'
  | 'session_ended'
  | 'timer_update'
  | 'system_error'
  | 'user_command';

/**
 * Severity levels for game history entries
 */
export type GameHistorySeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Individual game history entry
 */
export interface GameHistoryEntry {
  id: string;
  timestamp: Date;
  eventType: GameHistoryEventType;
  severity: GameHistorySeverity;
  
  // Event details
  title: string;
  description: string;
  
  // Context data (varies by event type)
  data: Record<string, any>;
  
  // System context
  sessionId: string;
  playerId?: string;
  worldStateId?: string;
  
  // Metadata
  source: string; // Which system generated this entry
  tags: string[]; // For filtering and searching
  
  // Relations
  relatedEntries?: string[]; // IDs of related history entries
  parentEventId?: string; // For event chains
}

/**
 * Game history query parameters
 */
export interface GameHistoryQuery {
  // Time range
  startDate?: Date;
  endDate?: Date;
  
  // Filters
  eventTypes?: GameHistoryEventType[];
  severity?: GameHistorySeverity[];
  source?: string[];
  tags?: string[];
  sessionId?: string;
  playerId?: string;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
  
  // Search
  searchText?: string;
}

/**
 * Game history statistics
 */
export interface GameHistoryStats {
  totalEntries: number;
  entriesByType: Record<GameHistoryEventType, number>;
  entriesBySeverity: Record<GameHistorySeverity, number>;
  entriesBySource: Record<string, number>;
  
  // Time-based stats
  dailyActivity: Record<string, number>; // date -> entry count
  hourlyActivity: Record<string, number>; // hour -> entry count
  
  // Recent activity
  recentSessions: string[];
  mostActiveSource: string;
  averageEntriesPerSession: number;
  
  // Error tracking
  errorRate: number;
  commonErrors: Array<{ error: string; count: number }>;
}

// ===== GAME WORLD SYSTEM =====

/**
 * Dynamic game world state that evolves with player activity
 */
export interface GameWorldState {
  // Core world properties
  location: GameLocation;
  weather: GameWeather;
  timeOfDay: TimeOfDay;
  threatLevel: ThreatLevel;
  
  // Environmental details
  ambiance: {
    sight: string;
    sound: string;
    feeling: string;
    smell: string;
  };
  
  // World metadata
  stateId: string;
  generatedAt: Date;
  lastUpdated: Date;
  sessionKeystrokes: number; // Keystrokes since last world update
  
  // Event context
  activeEvents: GameEvent[];
  worldHistory: GameWorldHistory[];
}

/**
 * Game locations that adapt to player writing patterns
 */
export type GameLocation = 
  | 'village'      // Peaceful, low-activity writing
  | 'town'         // Moderate activity, balanced writing
  | 'city'         // High activity, fast-paced writing
  | 'forest'       // Deep focus, long sessions
  | 'plains'       // Consistent, steady writing
  | 'mountains'    // Challenging content, complex writing
  | 'coast'        // Creative, flowing writing
  | 'desert'       // Sparse, focused writing
  | 'temple'       // Knowledge-heavy, research writing
  | 'cave';        // Exploratory, discovery writing

/**
 * Weather conditions that reflect writing quality and mood
 */
export type GameWeather = 
  | 'sunny'        // High quality, clear writing
  | 'cloudy'       // Mixed quality, uncertain writing
  | 'rainy'        // Reflective, melancholy writing
  | 'stormy'       // Chaotic, intense writing
  | 'foggy'        // Unclear, searching writing
  | 'snowy'        // Pure, minimalist writing
  | 'windy';       // Dynamic, changing writing

/**
 * Time progression based on session patterns
 */
export type TimeOfDay = 
  | 'dawn'         // Session beginning
  | 'morning'      // Early session, fresh ideas
  | 'noon'         // Peak session, high energy
  | 'afternoon'    // Sustained session, steady work
  | 'evening'      // Winding down, reflection
  | 'night'        // Late session, deep thoughts
  | 'midnight';    // Extended session, intense focus

/**
 * Threat levels that add excitement and challenge
 */
export type ThreatLevel = 
  | 'peaceful'     // Safe, comfortable writing
  | 'neutral'      // Standard writing conditions
  | 'tense'        // Slightly challenging content
  | 'dangerous'    // Difficult, complex topics
  | 'hostile';     // Very challenging, high stakes

/**
 * Dynamic events that occur based on world conditions
 */
export interface GameEvent {
  eventId: string;
  type: GameEventType;
  name: string;
  description: string;
  
  // Event conditions
  triggers: EventCondition[];
  probability: number; // 0-1 chance of occurring
  
  // Event effects
  playerEffects: PlayerEffect[];
  worldEffects: WorldEffect[];
  
  // Event metadata
  duration?: number; // In keystrokes or time
  createdAt: Date;
  triggeredAt?: Date;
}

/**
 * Types of events that can occur in the game world
 */
export type GameEventType = 
  | 'discovery'    // Finding rare cards or items
  | 'encounter'    // Meeting NPCs or challenges  
  | 'weather'      // Weather-based events
  | 'location'     // Location-specific events
  | 'milestone'    // Achievement-based events
  | 'random'       // Pure chance events
  | 'timed';       // Time-based recurring events

/**
 * Conditions that must be met for events to trigger
 */
export interface EventCondition {
  type: 'weather' | 'location' | 'threat_level' | 'time' | 'keystrokes' | 'kpm' | 'streak';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

/**
 * Effects that events have on the player
 */
export interface PlayerEffect {
  type: 'exp' | 'pack' | 'damage' | 'heal' | 'item' | 'buff' | 'debuff';
  value: number | string;
  duration?: number;
  message: string;
}

/**
 * Effects that events have on the world state
 */
export interface WorldEffect {
  type: 'weather_change' | 'location_change' | 'threat_change' | 'ambiance_change';
  target: keyof GameWorldState;
  value: any;
  duration?: number;
}

/**
 * Historical record of world state changes
 */
export interface GameWorldHistory {
  timestamp: Date;
  previousState: Partial<GameWorldState>;
  newState: Partial<GameWorldState>;
  trigger: 'keystroke' | 'timer' | 'event' | 'manual';
  keystrokeCount: number;
}

/**
 * Configuration for world generation algorithms
 */
export interface WorldGenerationConfig {
  // Response triggers
  keystrokeTrigger: boolean;
  keystrokeInterval: number; // Every X keystrokes
  timerTrigger: boolean;
  timerInterval: number; // Every X minutes
  
  // World generation weights
  locationWeights: Record<GameLocation, number>;
  weatherWeights: Record<GameWeather, number>;
  threatWeights: Record<ThreatLevel, number>;
  
  // Player influence factors
  kmpInfluence: number; // 0-1 how much KPM affects world state
  qualityInfluence: number; // 0-1 how much writing quality affects world state
  vaultInfluence: number; // 0-1 how much vault activity affects world state
  
  // Event system
  enableEvents: boolean;
  baseEventChance: number; // 0-1 base probability for events
  eventCooldown: number; // Minimum keystrokes between events
}

// ===== DEFAULT TCG SETTINGS =====

/**
 * Comprehensive default settings for TCG system
 */
export const DEFAULT_TCG_SETTINGS: TCGSettings = {
  enabled: true, // Enabled for testing
  
  // Core progression settings
  keystrokesPerEXP: 500, // Balanced for sustained engagement
  expFormula: 'exponential',
  customFormulaParams: {
    base: 100,
    exponent: 1.2,
    modifier: 0
  },
  
  // Pack system settings
  packUnlockThreshold: 2, // Unlock packs at level 2
  maxPacksPerDay: 10, // Reasonable daily limit
  autoOpenPacks: false, // Let user control pack opening
  
  // Theme settings
  activeTheme: 'pokemon',
  customThemes: {}, // No custom themes by default
  
  // AI commentary settings
  enableAICommentary: true,
  
  // Game Master prompt for generating world context and environmental descriptions
  gameMasterPrompt: `You are the Game Master of a writing-focused RPG. The player is a writer on an adventure through different environments. Based on the provided world state (location, weather, threat level, time of day, active events), describe the environment in 1-2 immersive sentences that relate to writing and creativity. Focus on how the environment might inspire or affect their writing session. Keep it atmospheric and encouraging.`,
  
  // Player Character prompt for personal commentary and reactions
  playerCharacterPrompt: `You are the player character in a writing RPG adventure. You're an aspiring writer exploring different environments to find inspiration. Based on the Game Master's world description and your current writing activity, respond with a brief, personal reaction (1-2 sentences) about how this environment makes you feel as a writer, or what kind of writing it inspires. Be encouraging and relate it to the writing process.`,
  
  commentaryPrompts: {
    highPerformance: "Incredible speed! Your writing power level is off the charts!",
    levelUp: "Level up achieved! Your knowledge mastery grows stronger!",
    packOpening: "Pack opening time! Let's see what rare knowledge cards await!",
    shinyCard: "Shiny discovery! A legendary insight appears in your collection!",
    achievement: "Achievement unlocked! Your dedication to knowledge grows!"
  },
  
  // Player Card System settings
  autoUpdatePlayerCard: true,
  playerCardUpdateInterval: 5, // 5 minutes
  
  // Performance settings
  performanceMode: false,
  maxParticles: 100,
  animationQuality: 'medium',
  
  // Achievement system
  achievements: {
    'first-level': {
      name: 'Getting Started',
      description: 'Reach your first level in the TCG system',
      icon: '🌟',
      conditions: { type: 'level', value: 1 },
      rewards: { exp: 50 }
    },
    'first-pack': {
      name: 'Pack Opener',
      description: 'Open your first card pack',
      icon: '📦',
      conditions: { type: 'packs_opened', value: 1 },
      rewards: { exp: 25 }
    },
    'streak-7': {
      name: 'Weekly Warrior',
      description: 'Maintain a 7-day writing streak',
      icon: '🔥',
      conditions: { type: 'streak', value: 7 },
      rewards: { exp: 200, packs: ['bonus-pack'] }
    },
    'cards-50': {
      name: 'Collector',
      description: 'Collect 50 unique cards',
      icon: '🎴',
      conditions: { type: 'cards_collected', value: 50 },
      rewards: { exp: 500, unlocks: ['rare-theme'] }
    }
  },
  
  // World Generation System
  worldGeneration: {
    // Response triggers
    keystrokeTrigger: true,
    keystrokeInterval: 500, // Every 500 keystrokes
    timerTrigger: true,
    timerInterval: 10, // Every 10 minutes
    
    // World generation weights (higher = more likely)
    locationWeights: {
      village: 0.2,
      town: 0.15,
      city: 0.1,
      forest: 0.15,
      plains: 0.15,
      mountains: 0.1,
      coast: 0.05,
      desert: 0.05,
      temple: 0.03,
      cave: 0.02
    },
    weatherWeights: {
      sunny: 0.3,
      cloudy: 0.25,
      rainy: 0.2,
      stormy: 0.1,
      foggy: 0.1,
      snowy: 0.03,
      windy: 0.02
    },
    threatWeights: {
      peaceful: 0.4,
      neutral: 0.35,
      tense: 0.15,
      dangerous: 0.08,
      hostile: 0.02
    },
    
    // Player influence factors
    kmpInfluence: 0.3, // KPM moderately affects world state
    qualityInfluence: 0.4, // Writing quality strongly affects world state
    vaultInfluence: 0.2, // Vault activity somewhat affects world state
    
    // Event system
    enableEvents: true,
    baseEventChance: 0.15, // 15% base chance for events
    eventCooldown: 1000 // At least 1000 keystrokes between events
  },
  
  // Advanced settings
  enableDebugMode: false,
  rngSeed: undefined, // Use secure randomness by default
  dataRetentionDays: 365, // Keep data for 1 year
  exportEnabled: true // Allow data export
};

// All types are exported individually above where they are defined