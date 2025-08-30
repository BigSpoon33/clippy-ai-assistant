/**
 * CLIPPY TCG Writer - Player & Card Management System
 * Manages player profiles, card collections, achievements, and progression data
 * Following PRP specifications for comprehensive player experience management
 */

import { App, TFile } from 'obsidian';
import { 
  TCGPlayerProfile, 
  TCGCard, 
  TCGSettings, 
  CardRarity,
  TCGStats,
  TCGPerformanceMetrics
} from '../types';
import { ProgressionEngine, LevelCalculationResult } from './progression-engine';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== PLAYER MANAGEMENT INTERFACES =====

export interface CardCollection {
  cards: Map<string, TCGCard>; // cardId -> card
  cardsByRarity: Map<CardRarity, string[]>; // rarity -> cardIds
  cardsByTheme: Map<string, string[]>; // themeId -> cardIds
  cardsByNote: Map<string, string[]>; // notePath -> cardIds
  favoriteCards: Set<string>; // cardIds
  totalCards: number;
  uniqueCards: number;
  duplicateCount: number;
}

export interface PlayerPack {
  packId: string;
  packType: string; // 'starter-pack', 'core-set', 'booster', 'premium'
  packName: string;
  totalCards: number;
  earnedAt: Date;
  earnedBy: 'level_up' | 'milestone' | 'purchase' | 'achievement' | 'daily_bonus';
  cost?: number; // EXP cost if purchased
  opened: boolean;
  openedAt?: Date;
  filePath?: string; // Obsidian file path for vault-based packs
  cards?: any[]; // Card contents for opened packs
}

export interface PackInventory {
  availablePacks: Map<string, PlayerPack>; // packId -> pack
  packsByType: Map<string, string[]>; // packType -> packIds
  totalPacks: number;
  unopenedPacks: number;
}

export interface PlayerAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress: number;
  maxProgress: number;
  category: 'collection' | 'progression' | 'engagement' | 'social' | 'special';
  rewards: {
    exp?: number;
    packs?: string[];
    unlocks?: string[];
    titles?: string[];
  };
}

export interface PlayerSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  keystrokeCount: number;
  expGained: number;
  packsOpened: number;
  cardsAcquired: number;
  achievements: string[];
  qualityScore: number;
  averageKPM: number;
  peakKPM: number;
  notesCreated: number;
  notesModified: number;
}

export interface CollectionFilter {
  rarity?: CardRarity[];
  themes?: string[];
  favorite?: boolean;
  shiny?: boolean;
  powerRange?: { min: number; max: number };
  searchText?: string;
  sortBy?: 'name' | 'rarity' | 'power' | 'acquired' | 'viewed';
  sortOrder?: 'asc' | 'desc';
}

export interface CollectionAnalytics {
  totalValue: number;
  averagePowerLevel: number;
  rarityDistribution: Record<CardRarity, { count: number; percentage: number }>;
  themeDistribution: Record<string, { count: number; percentage: number }>;
  shinyPercentage: number;
  collectionCompleteness: Record<string, { collected: number; total: number; percentage: number }>;
  mostViewedCards: TCGCard[];
  recentAcquisitions: TCGCard[];
  powerProgression: { date: Date; totalPower: number }[];
}

// ===== ACHIEVEMENT DEFINITIONS =====

export const DEFAULT_ACHIEVEMENTS: Record<string, Omit<PlayerAchievement, 'unlockedAt' | 'progress'>> = {
  'first-card': {
    id: 'first-card',
    name: 'First Steps',
    description: 'Acquire your first knowledge card',
    icon: '🌟',
    maxProgress: 1,
    category: 'collection',
    rewards: { exp: 50 }
  },
  'collector-10': {
    id: 'collector-10',
    name: 'Novice Collector',
    description: 'Collect 10 unique cards',
    icon: '📚',
    maxProgress: 10,
    category: 'collection',
    rewards: { exp: 100, packs: ['basic-pack'] }
  },
  'collector-50': {
    id: 'collector-50',
    name: 'Knowledge Seeker',
    description: 'Collect 50 unique cards',
    icon: '🔍',
    maxProgress: 50,
    category: 'collection',
    rewards: { exp: 500, packs: ['advanced-pack'] }
  },
  'collector-100': {
    id: 'collector-100',
    name: 'Master Collector',
    description: 'Collect 100 unique cards',
    icon: '🏆',
    maxProgress: 100,
    category: 'collection',
    rewards: { exp: 1000, unlocks: ['master-theme'], titles: ['Card Master'] }
  },
  'shiny-hunter': {
    id: 'shiny-hunter',
    name: 'Shiny Hunter',
    description: 'Collect 5 shiny cards',
    icon: '✨',
    maxProgress: 5,
    category: 'collection',
    rewards: { exp: 300, packs: ['premium-pack'] }
  },
  'legendary-collector': {
    id: 'legendary-collector',
    name: 'Legendary Collector',
    description: 'Collect a legendary card',
    icon: '👑',
    maxProgress: 1,
    category: 'collection',
    rewards: { exp: 1000, titles: ['Legend Seeker'] }
  },
  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Achieve 200+ KPM in a session',
    icon: '⚡',
    maxProgress: 1,
    category: 'engagement',
    rewards: { exp: 200, unlocks: ['speed-bonus'] }
  },
  'marathon-writer': {
    id: 'marathon-writer',
    name: 'Marathon Writer',
    description: 'Write 5000 keystrokes in one session',
    icon: '🏃',
    maxProgress: 5000,
    category: 'engagement',
    rewards: { exp: 500, packs: ['endurance-pack'] }
  },
  'streak-master': {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Maintain a 30-day writing streak',
    icon: '🔥',
    maxProgress: 30,
    category: 'engagement',
    rewards: { exp: 2000, unlocks: ['streak-multiplier'], titles: ['Consistency King'] }
  },
  'theme-explorer': {
    id: 'theme-explorer',
    name: 'Theme Explorer',
    description: 'Try all available themes',
    icon: '🎨',
    maxProgress: 5,
    category: 'progression',
    rewards: { exp: 300, unlocks: ['theme-creator'] }
  }
};

// ===== MAIN PLAYER MANAGER =====

/**
 * Comprehensive player and card management system
 * Handles all player-related data, collections, and progression
 */
export class PlayerManager {
  private app: App;
  private settings: TCGSettings;
  private progressionEngine: ProgressionEngine;
  private filePackSystem?: any; // FilePackSystem instance for creating physical pack files
  
  // Player data
  private playerProfile: TCGPlayerProfile;
  private cardCollection: CardCollection;
  private packInventory: PackInventory;
  private achievements: Map<string, PlayerAchievement> = new Map();
  private sessions: PlayerSession[] = [];
  private currentSession: PlayerSession | null = null;
  
  // Event listeners
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  
  // Performance tracking
  private performanceMetrics: TCGPerformanceMetrics = {
    keystrokeProcessingTime: 0,
    cardGenerationTime: 0,
    packOpeningLatency: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  constructor(app: App, settings: TCGSettings, progressionEngine: ProgressionEngine) {
    this.app = app;
    this.settings = settings;
    this.progressionEngine = progressionEngine;
    
    // Initialize player profile with defaults
    this.playerProfile = this.createDefaultProfile();
    
    // Initialize card collection
    this.cardCollection = this.createEmptyCollection();
    
    // Initialize pack inventory
    this.packInventory = this.createEmptyPackInventory();
    
    // Initialize achievements
    this.initializeAchievements();
    
    // Start initial session
    this.startNewSession();
    
    console.log('👤 Player manager initialized');
  }

  /**
   * Create a default player profile
   */
  private createDefaultProfile(): TCGPlayerProfile {
    const now = new Date();
    
    return {
      id: `player-${Date.now()}`,
      playerId: `player-${Date.now()}`, // Alias for compatibility
      characterName: 'Knowledge Seeker',
      level: 1,
      currentLevel: 1, // Alias for compatibility
      currentEXP: 0,
      totalKeystrokes: 0,
      packsOpened: 0,
      cardsCollected: 0,
      currentStreak: 0,
      longestStreak: 0,
      activeTheme: this.settings.activeTheme,
      createdAt: now,
      lastActive: now,
      
      // Calculated properties will be computed by PlayerManager methods
      expToNextLevel: 0,
      keystrokesPerMinute: 0,
      engagementLevel: 0.5,
      
      stats: {
        power: 10,
        creativity: 10,
        consistency: 10,
        knowledge: 10
      },
      
      achievements: {},
      
      preferences: {
        autoOpenPacks: this.settings.autoOpenPacks,
        showParticleEffects: true,
        commentaryFrequency: 'medium',
        preferredPackSize: 5
      }
    };
  }

  /**
   * Create an empty card collection
   */
  private createEmptyCollection(): CardCollection {
    return {
      cards: new Map(),
      cardsByRarity: new Map(),
      cardsByTheme: new Map(),
      cardsByNote: new Map(),
      favoriteCards: new Set(),
      totalCards: 0,
      uniqueCards: 0,
      duplicateCount: 0
    };
  }

  /**
   * Create an empty pack inventory
   */
  private createEmptyPackInventory(): PackInventory {
    return {
      availablePacks: new Map(),
      packsByType: new Map(),
      totalPacks: 0,
      unopenedPacks: 0
    };
  }

  /**
   * Initialize achievement system
   */
  private initializeAchievements(): void {
    for (const [id, achievement] of Object.entries(DEFAULT_ACHIEVEMENTS)) {
      this.achievements.set(id, {
        ...achievement,
        unlockedAt: new Date(0), // Not unlocked yet
        progress: 0
      } as PlayerAchievement);
    }

    // Initialize achievement progress from settings
    for (const [achievementId, data] of Object.entries(this.settings.achievements)) {
      if (this.achievements.has(achievementId)) {
        const achievement = this.achievements.get(achievementId)!;
        achievement.progress = 0; // Will be updated by checkAchievements
      }
    }
  }

  // ===== DEPENDENCY INJECTION =====
  
  /**
   * Set FilePackSystem for creating physical pack files
   */
  setFilePackSystem(filePackSystem: any): void {
    this.filePackSystem = filePackSystem;
  }

  // ===== PLAYER PROFILE METHODS =====

  /**
   * Get current player profile
   */
  getPlayerProfile(): TCGPlayerProfile {
    // Update calculated properties
    const levelResult = this.progressionEngine.calculateLevel(
      this.playerProfile.currentEXP,
      this.playerProfile.level
    );
    
    return {
      ...this.playerProfile,
      level: levelResult.level,
      expToNextLevel: levelResult.expToNextLevel,
      keystrokesPerMinute: this.calculateKPM(),
      engagementLevel: this.calculateEngagement()
    };
  }

  /**
   * Update player profile
   */
  updatePlayerProfile(updates: Partial<TCGPlayerProfile>): void {
    const oldLevel = this.playerProfile.level;
    
    // Apply updates
    Object.assign(this.playerProfile, updates);
    this.playerProfile.lastActive = new Date();
    
    // Check for level up
    if (updates.currentEXP !== undefined) {
      const levelResult = this.progressionEngine.calculateLevel(
        this.playerProfile.currentEXP,
        oldLevel
      );
      
      if (levelResult.levelChanged) {
        this.handleLevelUp(oldLevel, levelResult.level, this.playerProfile.currentEXP);
      }
      
      this.playerProfile.level = levelResult.level;
    }
    
    // Update stats
    if (updates.level || updates.currentEXP || updates.currentStreak) {
      this.updatePlayerStats();
    }
    
    // Check achievements
    this.checkAchievements();
    
    // Emit profile update event
    this.emitEvent('profile_updated', { 
      profile: this.getPlayerProfile(),
      updates 
    });
  }

  /**
   * Calculate current level from EXP
   */
  private calculateLevel(): LevelCalculationResult {
    return this.progressionEngine.calculateLevel(
      this.playerProfile.currentEXP,
      this.playerProfile.level
    );
  }

  /**
   * Calculate keystrokes per minute
   */
  private calculateKPM(): number {
    if (!this.currentSession) return 0;
    
    const sessionDuration = Date.now() - this.currentSession.startTime.getTime();
    const sessionMinutes = sessionDuration / (1000 * 60);
    
    return sessionMinutes > 0 ? this.currentSession.keystrokeCount / sessionMinutes : 0;
  }

  /**
   * Calculate engagement level (0-1)
   */
  private calculateEngagement(): number {
    const factors = [
      Math.min(this.playerProfile.currentStreak / 30, 1), // Streak factor
      Math.min(this.calculateKPM() / 200, 1), // Speed factor
      Math.min(this.cardCollection.uniqueCards / 100, 1), // Collection factor
      Math.min(this.getUnlockedAchievements().length / 10, 1) // Achievement factor
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  /**
   * Handle level up event
   */
  private handleLevelUp(oldLevel: number, newLevel: number, totalEXP: number): void {
    // Process level up rewards
    const events = this.progressionEngine.processLevelUp(oldLevel, newLevel, totalEXP);
    
    // Update profile
    this.playerProfile.level = newLevel;
    
    // Emit level up event
    this.emitEvent('level_up', {
      oldLevel,
      newLevel,
      totalEXP,
      events,
      playerProfile: this.getPlayerProfile()
    });
    
    console.log(`🎉 Level up! ${oldLevel} → ${newLevel}`);
  }

  /**
   * Update player stats based on current state
   */
  private updatePlayerStats(): void {
    const stats = this.progressionEngine.calculateStatModifiers(
      this.playerProfile.level,
      this.playerProfile.currentStreak,
      this.cardCollection.uniqueCards
    );
    
    this.playerProfile.stats = {
      power: 10 + stats.power,
      creativity: 10 + stats.creativity,
      consistency: 10 + stats.consistency,
      knowledge: 10 + stats.knowledge
    };
  }

  // ===== PACK INVENTORY METHODS =====

  /**
   * Award a pack to the player
   */
  awardPack(packType: string, earnedBy: 'level_up' | 'milestone' | 'purchase' | 'achievement' | 'daily_bonus', cost?: number): PlayerPack {
    const pack: PlayerPack = {
      packId: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packType,
      packName: this.getPackDisplayName(packType),
      totalCards: this.getPackCardCount(packType),
      earnedAt: new Date(),
      earnedBy,
      cost,
      opened: false
    };

    // Add to inventory
    this.packInventory.availablePacks.set(pack.packId, pack);
    
    // Update type mapping
    if (!this.packInventory.packsByType.has(packType)) {
      this.packInventory.packsByType.set(packType, []);
    }
    this.packInventory.packsByType.get(packType)!.push(pack.packId);
    
    // Update counts
    this.packInventory.totalPacks++;
    this.packInventory.unopenedPacks++;

    console.log(`📦 Awarded ${pack.packName} (${pack.packId}) to player - earned by ${earnedBy}`);
    
    // Emit pack awarded event
    this.emitEvent('pack_awarded', { pack, earnedBy });
    
    return pack;
  }

  /**
   * Mark a pack as opened
   */
  markPackOpened(packId: string): boolean {
    const pack = this.packInventory.availablePacks.get(packId);
    if (!pack || pack.opened) {
      return false;
    }

    pack.opened = true;
    pack.openedAt = new Date();
    this.packInventory.unopenedPacks--;

    // Update player stats
    this.playerProfile.packsOpened++;
    
    console.log(`📂 Pack ${packId} marked as opened`);
    
    // Emit pack opened event
    this.emitEvent('pack_opened', { pack });
    
    return true;
  }

  /**
   * Get all available packs for the player
   */
  getAvailablePacks(): PlayerPack[] {
    return Array.from(this.packInventory.availablePacks.values());
  }

  /**
   * Get unopened packs for the player (from actual vault files)
   */
  getUnopenedPacks(): PlayerPack[] {
    return this.getVaultBasedUnoopenedPacks();
  }

  /**
   * Get opened packs for pack history (from actual vault files)
   */
  getOpenedPacks(): PlayerPack[] {
    return this.getVaultBasedOpenedPacks();
  }

  /**
   * Get pack opening history with detailed statistics
   */
  getPackHistory(): {
    openedPacks: PlayerPack[];
    totalPacks: number;
    totalCards: number;
    packsByType: Record<string, number>;
    recentOpens: PlayerPack[];
    oldestOpen?: Date;
    newestOpen?: Date;
  } {
    const openedPacks = this.getOpenedPacks();
    
    // Calculate statistics
    let totalCards = 0;
    const packsByType: Record<string, number> = {};
    let oldestOpen: Date | undefined;
    let newestOpen: Date | undefined;
    
    for (const pack of openedPacks) {
      totalCards += pack.totalCards;
      packsByType[pack.packType] = (packsByType[pack.packType] || 0) + 1;
      
      if (pack.openedAt) {
        if (!oldestOpen || pack.openedAt < oldestOpen) {
          oldestOpen = pack.openedAt;
        }
        if (!newestOpen || pack.openedAt > newestOpen) {
          newestOpen = pack.openedAt;
        }
      }
    }
    
    // Get recent opens (last 10)
    const recentOpens = openedPacks.slice(0, 10);
    
    return {
      openedPacks,
      totalPacks: openedPacks.length,
      totalCards,
      packsByType,
      recentOpens,
      oldestOpen,
      newestOpen
    };
  }

  /**
   * Find unopened packs in the vault for this player
   */
  private getVaultBasedUnoopenedPacks(): PlayerPack[] {
    const packs: PlayerPack[] = [];
    const allFiles = this.app.vault.getMarkdownFiles();
    
    for (const file of allFiles) {
      try {
        // Check if it's a pack file by looking for pack- prefix
        if (!file.basename.startsWith('pack-')) continue;
        
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        
        if (!frontmatter || frontmatter.tcg_type !== 'pack') continue;
        
        // Check if it belongs to this player
        const packPlayerId = frontmatter.player_id;
        if (!packPlayerId || packPlayerId !== this.playerProfile.id) continue;
        
        // Check if it's unopened (no opened_date)
        if (frontmatter.opened_date) continue;
        
        // Convert to PlayerPack format
        const pack: PlayerPack = {
          packId: frontmatter.pack_id || file.basename,
          packType: this.inferPackTypeFromName(frontmatter.pack_name || file.basename),
          packName: frontmatter.pack_name || 'Unknown Pack',
          totalCards: frontmatter.total_cards || 5,
          earnedAt: new Date(frontmatter.generated_date || file.stat.ctime),
          earnedBy: 'unknown' as any, // We'll infer this later
          opened: false
        };
        
        // Add file path for pack operations
        pack.filePath = file.path;
        
        packs.push(pack);
        
      } catch (error) {
        // Skip invalid pack files
        console.warn(`Failed to process pack file ${file.path}:`, error);
      }
    }
    
    console.log(`📦 Found ${packs.length} unopened packs in vault for player ${this.playerProfile.id}`);
    return packs;
  }
  
  /**
   * Find opened packs in the vault for this player
   */
  private getVaultBasedOpenedPacks(): PlayerPack[] {
    const packs: PlayerPack[] = [];
    const allFiles = this.app.vault.getMarkdownFiles();
    
    for (const file of allFiles) {
      try {
        // Check if it's a pack file by looking for pack- prefix
        if (!file.basename.startsWith('pack-')) continue;
        
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        
        if (!frontmatter || frontmatter.tcg_type !== 'pack') continue;
        
        // Check if it belongs to this player
        const packPlayerId = frontmatter.player_id;
        if (!packPlayerId || packPlayerId !== this.playerProfile.id) continue;
        
        // Check if it's opened (has opened_date)
        if (!frontmatter.opened_date) continue;
        
        // Convert to PlayerPack format
        const pack: PlayerPack = {
          packId: frontmatter.pack_id || file.basename,
          packType: this.inferPackTypeFromName(frontmatter.pack_name || file.basename),
          packName: frontmatter.pack_name || 'Unknown Pack',
          totalCards: frontmatter.total_cards || 5,
          earnedAt: new Date(frontmatter.generated_date || file.stat.ctime),
          earnedBy: 'unknown' as any, // We'll infer this later
          opened: true,
          openedAt: new Date(frontmatter.opened_date)
        };
        
        // Add file path and card contents for pack history
        pack.filePath = file.path;
        pack.cards = frontmatter.cards || [];
        
        packs.push(pack);
        
      } catch (error) {
        // Skip invalid pack files
        console.warn(`Failed to process opened pack file ${file.path}:`, error);
      }
    }
    
    console.log(`📦 Found ${packs.length} opened packs in vault for player ${this.playerProfile.id}`);
    return packs.sort((a, b) => (b.openedAt?.getTime() || 0) - (a.openedAt?.getTime() || 0)); // Sort by most recent first
  }
  
  /**
   * Infer pack type from pack name or filename
   */
  private inferPackTypeFromName(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('starter')) return 'starter-pack';
    if (lowerName.includes('core') || lowerName.includes('booster')) return 'core-set';
    if (lowerName.includes('premium')) return 'premium';
    return 'starter-pack'; // Default
  }

  /**
   * Get packs by type
   */
  getPacksByType(packType: string): PlayerPack[] {
    const packIds = this.packInventory.packsByType.get(packType) || [];
    return packIds.map(id => this.packInventory.availablePacks.get(id))
      .filter(pack => pack !== undefined) as PlayerPack[];
  }

  /**
   * Get pack display name from type
   */
  private getPackDisplayName(packType: string): string {
    const names: Record<string, string> = {
      'starter-pack': 'Starter Pack',
      'core-set': 'Core Set Booster',
      'booster': 'Standard Booster',
      'premium': 'Premium Pack'
    };
    return names[packType] || `${packType} Pack`;
  }

  /**
   * Get expected card count for pack type
   */
  private getPackCardCount(packType: string): number {
    const counts: Record<string, number> = {
      'starter-pack': 5,
      'core-set': 11,
      'booster': 15,
      'premium': 20
    };
    return counts[packType] || 5;
  }

  // ===== CARD COLLECTION METHODS =====

  /**
   * Add a card to the collection
   */
  addCard(card: TCGCard): boolean {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        // Check if card already exists
        const existingCard = this.cardCollection.cards.get(card.id);
        if (existingCard) {
          // Handle duplicate
          this.cardCollection.duplicateCount++;
          this.emitEvent('duplicate_card', { card, existingCard });
          return false;
        }
        
        // Add card to collection
        this.cardCollection.cards.set(card.id, card);
        
        // Update indices
        this.updateCardIndices(card);
        
        // Update collection stats
        this.cardCollection.totalCards++;
        this.cardCollection.uniqueCards++;
        
        // Update player stats
        this.playerProfile.cardsCollected = this.cardCollection.uniqueCards;
        
        // Check achievements
        this.checkAchievements();
        
        // Emit card added event
        this.emitEvent('card_added', { card, collection: this.getCollectionSummary() });
        
        console.log(`📇 Added card: ${card.name} (${card.rarity})`);
        return true;
      },
      'Add card to collection'
    ) || false;
  }

  /**
   * Update card indices for efficient searching
   */
  private updateCardIndices(card: TCGCard): void {
    // Rarity index
    if (!this.cardCollection.cardsByRarity.has(card.rarity)) {
      this.cardCollection.cardsByRarity.set(card.rarity, []);
    }
    this.cardCollection.cardsByRarity.get(card.rarity)!.push(card.id);
    
    // Theme index
    const themeId = card.themeData?.themeId || 'default';
    if (!this.cardCollection.cardsByTheme.has(themeId)) {
      this.cardCollection.cardsByTheme.set(themeId, []);
    }
    this.cardCollection.cardsByTheme.get(themeId)!.push(card.id);
    
    // Note index
    if (!this.cardCollection.cardsByNote.has(card.noteReference)) {
      this.cardCollection.cardsByNote.set(card.noteReference, []);
    }
    this.cardCollection.cardsByNote.get(card.noteReference)!.push(card.id);
  }

  /**
   * Get card by ID
   */
  getCard(cardId: string): TCGCard | null {
    return this.cardCollection.cards.get(cardId) || null;
  }

  /**
   * Get all cards
   */
  getAllCards(): TCGCard[] {
    return Array.from(this.cardCollection.cards.values());
  }

  /**
   * Filter cards by criteria
   */
  filterCards(filter: CollectionFilter): TCGCard[] {
    let cards = this.getAllCards();
    
    // Apply filters
    if (filter.rarity) {
      cards = cards.filter(card => filter.rarity!.includes(card.rarity));
    }
    
    if (filter.themes) {
      cards = cards.filter(card => 
        filter.themes!.some(theme => card.themeData?.themeId === theme)
      );
    }
    
    if (filter.favorite !== undefined) {
      cards = cards.filter(card => 
        this.cardCollection.favoriteCards.has(card.id) === filter.favorite
      );
    }
    
    if (filter.shiny !== undefined) {
      cards = cards.filter(card => card.isShiny === filter.shiny);
    }
    
    if (filter.powerRange) {
      cards = cards.filter(card => 
        card.powerLevel >= filter.powerRange!.min && 
        card.powerLevel <= filter.powerRange!.max
      );
    }
    
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      cards = cards.filter(card => 
        card.name.toLowerCase().includes(searchLower) ||
        card.flavorText.toLowerCase().includes(searchLower) ||
        card.abilities.some(ability => ability.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting
    if (filter.sortBy) {
      cards.sort((a, b) => {
        let comparison = 0;
        
        switch (filter.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'rarity':
            const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
            comparison = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            break;
          case 'power':
            comparison = a.powerLevel - b.powerLevel;
            break;
          case 'acquired':
            comparison = a.acquisitionDate.getTime() - b.acquisitionDate.getTime();
            break;
          case 'viewed':
            comparison = a.timesViewed - b.timesViewed;
            break;
        }
        
        return filter.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    return cards;
  }

  /**
   * Toggle card favorite status
   */
  toggleCardFavorite(cardId: string): boolean {
    const card = this.getCard(cardId);
    if (!card) return false;
    
    if (this.cardCollection.favoriteCards.has(cardId)) {
      this.cardCollection.favoriteCards.delete(cardId);
      card.favorited = false;
    } else {
      this.cardCollection.favoriteCards.add(cardId);
      card.favorited = true;
    }
    
    this.emitEvent('card_favorite_toggled', { cardId, favorited: card.favorited });
    return card.favorited;
  }

  /**
   * Update card view count
   */
  viewCard(cardId: string): void {
    const card = this.getCard(cardId);
    if (card) {
      card.timesViewed++;
      card.lastViewed = new Date();
      
      this.emitEvent('card_viewed', { card });
    }
  }

  /**
   * Get collection summary
   */
  getCollectionSummary(): {
    totalCards: number;
    uniqueCards: number;
    duplicates: number;
    rarityBreakdown: Record<CardRarity, number>;
    favoriteCount: number;
    shinyCount: number;
    totalPowerLevel: number;
  } {
    const rarityBreakdown: Record<CardRarity, number> = {
      'Common': 0,
      'Uncommon': 0,
      'Rare': 0,
      'Epic': 0,
      'Legendary': 0
    };
    
    let shinyCount = 0;
    let totalPowerLevel = 0;
    
    for (const card of this.cardCollection.cards.values()) {
      rarityBreakdown[card.rarity]++;
      if (card.isShiny) shinyCount++;
      totalPowerLevel += card.powerLevel;
    }
    
    return {
      totalCards: this.cardCollection.totalCards,
      uniqueCards: this.cardCollection.uniqueCards,
      duplicates: this.cardCollection.duplicateCount,
      rarityBreakdown,
      favoriteCount: this.cardCollection.favoriteCards.size,
      shinyCount,
      totalPowerLevel
    };
  }

  /**
   * Get detailed collection analytics
   */
  getCollectionAnalytics(): CollectionAnalytics {
    const cards = this.getAllCards();
    const totalCards = cards.length;
    
    if (totalCards === 0) {
      return {
        totalValue: 0,
        averagePowerLevel: 0,
        rarityDistribution: {
          'Common': { count: 0, percentage: 0 },
          'Uncommon': { count: 0, percentage: 0 },
          'Rare': { count: 0, percentage: 0 },
          'Epic': { count: 0, percentage: 0 },
          'Legendary': { count: 0, percentage: 0 }
        },
        themeDistribution: {},
        shinyPercentage: 0,
        collectionCompleteness: {},
        mostViewedCards: [],
        recentAcquisitions: [],
        powerProgression: []
      };
    }
    
    // Calculate rarity distribution
    const rarityDistribution: Record<CardRarity, { count: number; percentage: number }> = {
      'Common': { count: 0, percentage: 0 },
      'Uncommon': { count: 0, percentage: 0 },
      'Rare': { count: 0, percentage: 0 },
      'Epic': { count: 0, percentage: 0 },
      'Legendary': { count: 0, percentage: 0 }
    };
    
    // Calculate theme distribution
    const themeDistribution: Record<string, { count: number; percentage: number }> = {};
    
    let totalPowerLevel = 0;
    let shinyCount = 0;
    
    for (const card of cards) {
      // Rarity
      rarityDistribution[card.rarity].count++;
      
      // Theme
      const themeId = card.themeData?.themeId || 'default';
      if (!themeDistribution[themeId]) {
        themeDistribution[themeId] = { count: 0, percentage: 0 };
      }
      themeDistribution[themeId].count++;
      
      // Power and shiny
      totalPowerLevel += card.powerLevel;
      if (card.isShiny) shinyCount++;
    }
    
    // Calculate percentages
    for (const rarity of Object.keys(rarityDistribution) as CardRarity[]) {
      rarityDistribution[rarity].percentage = (rarityDistribution[rarity].count / totalCards) * 100;
    }
    
    for (const theme of Object.keys(themeDistribution)) {
      themeDistribution[theme].percentage = (themeDistribution[theme].count / totalCards) * 100;
    }
    
    // Most viewed cards
    const mostViewedCards = cards
      .sort((a, b) => b.timesViewed - a.timesViewed)
      .slice(0, 10);
    
    // Recent acquisitions
    const recentAcquisitions = cards
      .sort((a, b) => b.acquisitionDate.getTime() - a.acquisitionDate.getTime())
      .slice(0, 10);
    
    return {
      totalValue: totalPowerLevel,
      averagePowerLevel: totalPowerLevel / totalCards,
      rarityDistribution,
      themeDistribution,
      shinyPercentage: (shinyCount / totalCards) * 100,
      collectionCompleteness: {}, // Would be implemented based on available card sets
      mostViewedCards,
      recentAcquisitions,
      powerProgression: [] // Would track power over time
    };
  }

  // ===== ACHIEVEMENT SYSTEM =====

  /**
   * Check and update achievement progress
   */
  checkAchievements(): void {
    const profile = this.getPlayerProfile();
    const collection = this.getCollectionSummary();
    
    for (const achievement of this.achievements.values()) {
      if (achievement.progress >= achievement.maxProgress) continue; // Already unlocked
      
      let newProgress = 0;
      
      // Calculate progress based on achievement type
      switch (achievement.id) {
        case 'first-card':
          newProgress = collection.uniqueCards > 0 ? 1 : 0;
          break;
        case 'collector-10':
          newProgress = Math.min(collection.uniqueCards, 10);
          break;
        case 'collector-50':
          newProgress = Math.min(collection.uniqueCards, 50);
          break;
        case 'collector-100':
          newProgress = Math.min(collection.uniqueCards, 100);
          break;
        case 'shiny-hunter':
          newProgress = Math.min(collection.shinyCount, 5);
          break;
        case 'legendary-collector':
          newProgress = collection.rarityBreakdown.Legendary > 0 ? 1 : 0;
          break;
        case 'speed-demon':
          newProgress = this.calculateKPM() >= 200 ? 1 : 0;
          break;
        case 'marathon-writer':
          newProgress = Math.min(this.currentSession?.keystrokeCount || 0, 5000);
          break;
        case 'streak-master':
          newProgress = Math.min(profile.currentStreak, 30);
          break;
        case 'theme-explorer':
          // Would track theme usage
          newProgress = achievement.progress; // Placeholder
          break;
      }
      
      // Update progress
      if (newProgress > achievement.progress) {
        achievement.progress = newProgress;
        
        // Check if achievement is now unlocked
        if (achievement.progress >= achievement.maxProgress && achievement.unlockedAt.getTime() === 0) {
          this.unlockAchievement(achievement.id);
        }
        
        this.emitEvent('achievement_progress', { achievement, newProgress });
      }
    }
  }

  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievementId: string): void {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlockedAt.getTime() !== 0) return;
    
    achievement.unlockedAt = new Date();
    
    // Apply rewards
    if (achievement.rewards.exp) {
      this.updatePlayerProfile({ 
        currentEXP: this.playerProfile.currentEXP + achievement.rewards.exp 
      });
    }
    
    // Update profile achievements
    this.playerProfile.achievements[achievementId] = {
      unlocked: true,
      unlockedAt: achievement.unlockedAt,
      progress: achievement.progress,
      maxProgress: achievement.maxProgress
    };
    
    this.emitEvent('achievement_unlocked', { achievement });
    
    console.log(`🏆 Achievement unlocked: ${achievement.name}`);
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): PlayerAchievement[] {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.unlockedAt.getTime() > 0);
  }

  /**
   * Get all achievements with progress
   */
  getAllAchievements(): PlayerAchievement[] {
    return Array.from(this.achievements.values());
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Start a new session
   */
  startNewSession(): void {
    this.currentSession = {
      sessionId: `session-${Date.now()}`,
      startTime: new Date(),
      keystrokeCount: 0,
      expGained: 0,
      packsOpened: 0,
      cardsAcquired: 0,
      achievements: [],
      qualityScore: 0,
      averageKPM: 0,
      peakKPM: 0,
      notesCreated: 0,
      notesModified: 0
    };
    
    this.emitEvent('session_started', { session: this.currentSession });
  }

  /**
   * End current session
   */
  endCurrentSession(): PlayerSession | null {
    if (!this.currentSession) return null;
    
    this.currentSession.endTime = new Date();
    this.currentSession.averageKPM = this.calculateKPM();
    
    // Store session
    this.sessions.push({ ...this.currentSession });
    
    const endedSession = this.currentSession;
    this.currentSession = null;
    
    this.emitEvent('session_ended', { session: endedSession });
    
    return endedSession;
  }

  /**
   * Update current session
   */
  updateSession(updates: Partial<PlayerSession>): void {
    if (!this.currentSession) return;
    
    Object.assign(this.currentSession, updates);
    
    // Update peak KPM
    const currentKPM = this.calculateKPM();
    if (currentKPM > this.currentSession.peakKPM) {
      this.currentSession.peakKPM = currentKPM;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStatistics(): {
    totalSessions: number;
    totalTime: number;
    averageSessionLength: number;
    totalKeystrokes: number;
    averageKPM: number;
    bestSession: PlayerSession | null;
  } {
    if (this.sessions.length === 0) {
      return {
        totalSessions: 0,
        totalTime: 0,
        averageSessionLength: 0,
        totalKeystrokes: 0,
        averageKPM: 0,
        bestSession: null
      };
    }
    
    let totalTime = 0;
    let totalKeystrokes = 0;
    let totalKPM = 0;
    let bestSession = this.sessions[0];
    
    for (const session of this.sessions) {
      const sessionLength = session.endTime ? 
        session.endTime.getTime() - session.startTime.getTime() : 0;
      
      totalTime += sessionLength;
      totalKeystrokes += session.keystrokeCount;
      totalKPM += session.averageKPM;
      
      if (session.expGained > bestSession.expGained) {
        bestSession = session;
      }
    }
    
    return {
      totalSessions: this.sessions.length,
      totalTime,
      averageSessionLength: totalTime / this.sessions.length,
      totalKeystrokes,
      averageKPM: totalKPM / this.sessions.length,
      bestSession
    };
  }

  // ===== EVENT SYSTEM =====

  /**
   * Register event listener
   */
  onEvent(eventType: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit event to registered listeners
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in player manager event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // ===== DATA PERSISTENCE =====

  /**
   * Export player data for saving
   */
  exportPlayerData(): any {
    return {
      playerProfile: {
        ...this.playerProfile,
        // Convert dates to strings for JSON serialization
        createdAt: this.playerProfile.createdAt.toISOString(),
        lastActive: this.playerProfile.lastActive.toISOString()
      },
      cardCollection: {
        cards: Array.from(this.cardCollection.cards.entries()),
        favoriteCards: Array.from(this.cardCollection.favoriteCards),
        totalCards: this.cardCollection.totalCards,
        uniqueCards: this.cardCollection.uniqueCards,
        duplicateCount: this.cardCollection.duplicateCount
      },
      achievements: Array.from(this.achievements.entries()).map(([id, achievement]) => ({
        ...achievement,
        unlockedAt: achievement.unlockedAt.toISOString()
      })),
      sessions: this.sessions.map(session => ({
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString()
      })),
      performanceMetrics: this.performanceMetrics,
      exportTimestamp: new Date().toISOString()
    };
  }

  /**
   * Load player data from saved state
   */
  loadPlayerData(data: any): boolean {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        if (!data) throw new Error('No data provided');
        
        // Load player profile
        if (data.playerProfile) {
          this.playerProfile = {
            ...data.playerProfile,
            createdAt: new Date(data.playerProfile.createdAt),
            lastActive: new Date(data.playerProfile.lastActive)
          };
        }
        
        // Load card collection
        if (data.cardCollection) {
          this.cardCollection.cards = new Map(data.cardCollection.cards.map(([id, card]: [string, any]) => [
            id, 
            {
              ...card,
              acquisitionDate: new Date(card.acquisitionDate),
              lastViewed: card.lastViewed ? new Date(card.lastViewed) : undefined,
              noteStats: {
                ...card.noteStats,
                lastModified: new Date(card.noteStats.lastModified),
                creationDate: new Date(card.noteStats.creationDate)
              }
            }
          ]));
          
          this.cardCollection.favoriteCards = new Set(data.cardCollection.favoriteCards);
          this.cardCollection.totalCards = data.cardCollection.totalCards || 0;
          this.cardCollection.uniqueCards = data.cardCollection.uniqueCards || 0;
          this.cardCollection.duplicateCount = data.cardCollection.duplicateCount || 0;
          
          // Rebuild indices
          this.rebuildCollectionIndices();
        }
        
        // Load achievements
        if (data.achievements) {
          this.achievements.clear();
          for (const achievementData of data.achievements) {
            this.achievements.set(achievementData.id, {
              ...achievementData,
              unlockedAt: new Date(achievementData.unlockedAt)
            });
          }
        }
        
        // Load sessions
        if (data.sessions) {
          this.sessions = data.sessions.map((session: any) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined
          }));
        }
        
        // Load performance metrics
        if (data.performanceMetrics) {
          this.performanceMetrics = data.performanceMetrics;
        }
        
        console.log('💾 Player data loaded successfully');
        return true;
      },
      'Player data loading'
    ) || false;
  }

  /**
   * Rebuild collection indices after loading
   */
  private rebuildCollectionIndices(): void {
    this.cardCollection.cardsByRarity.clear();
    this.cardCollection.cardsByTheme.clear();
    this.cardCollection.cardsByNote.clear();
    
    for (const card of this.cardCollection.cards.values()) {
      this.updateCardIndices(card);
    }
  }

  /**
   * Get comprehensive TCG statistics
   */
  getTCGStatistics(): TCGStats {
    return {
      totalEXP: this.playerProfile.currentEXP,
      currentLevel: this.playerProfile.level,
      totalKeystrokes: this.playerProfile.totalKeystrokes,
      packsOpened: this.playerProfile.packsOpened,
      cardsCollected: this.cardCollection.uniqueCards,
      achievementsUnlocked: this.getUnlockedAchievements().length,
      averageSessionLength: this.getSessionStatistics().averageSessionLength / (1000 * 60), // In minutes
      streakDays: this.playerProfile.currentStreak
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    
    // Update player preferences from settings
    this.playerProfile.preferences = {
      ...this.playerProfile.preferences,
      autoOpenPacks: newSettings.autoOpenPacks
    };
    
    console.log('⚙️ Player manager settings updated');
  }

  /**
   * Clean up and destroy player manager
   */
  destroy(): void {
    // End current session
    this.endCurrentSession();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Clear data
    this.cardCollection.cards.clear();
    this.achievements.clear();
    this.sessions = [];
    
    console.log('🧹 Player manager destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick player profile creation
 */
export function createPlayerProfile(
  app: App,
  settings: TCGSettings,
  progressionEngine: ProgressionEngine
): PlayerManager {
  return new PlayerManager(app, settings, progressionEngine);
}

/**
 * Quick collection filtering
 */
export function filterPlayerCards(
  playerManager: PlayerManager,
  filter: CollectionFilter
): TCGCard[] {
  return playerManager.filterCards(filter);
}