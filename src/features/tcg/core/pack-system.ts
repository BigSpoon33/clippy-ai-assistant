/**
 * CLIPPY TCG Writer - Pack Opening System
 * Handles pack generation, opening logic, and inventory management
 * Following PRP specifications for balanced pack mechanics and engaging experience
 */

import { App, TFile } from 'obsidian';
import { TCGCard, TCGPack, TCGSettings, CardRarity } from '../types';
import { SecureTCGRandom, weightedSelect } from './rng-system';
import { NoteAnalyzer } from './note-analyzer';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== PACK OPENING INTERFACES =====

export interface PackOpeningResult {
  packId: string;
  packName: string;
  cards: TCGCard[];
  rarityBreakdown: Record<CardRarity, number>;
  shinyCount: number;
  totalPowerLevel: number;
  bonusMultipliers: {
    streak: number;
    quality: number;
    speed: number;
  };
  openingTimestamp: Date;
}

export interface PackInventory {
  availablePacks: Map<string, number>; // packId -> count
  openedPacks: PackOpeningResult[];
  totalPacksOpened: number;
  totalCardsAcquired: number;
  packOpeningStreak: number;
  lastPackOpeningDate?: Date;
}

export interface PackPurchaseResult {
  success: boolean;
  packsAdded: number;
  costPaid: number;
  newBalance: number;
  error?: string;
}

// ===== DEFAULT PACK DEFINITIONS =====

/**
 * Built-in pack definitions for the TCG system
 * Each pack has different rarity distributions and themes
 */
export const DEFAULT_PACKS: Record<string, TCGPack> = {
  'starter-pack': {
    id: 'starter-pack',
    name: 'Knowledge Starter Pack',
    description: 'Perfect for beginning your knowledge collection journey',
    cardCount: 5,
    costInEXP: 0,
    costInKeystrokes: 100,
    rarityWeights: {
      Common: 0.60,      // 60%
      Uncommon: 0.25,    // 25%
      Rare: 0.12,        // 12%
      Epic: 0.03,        // 3%
      Legendary: 0.00    // 0%
    },
    shinyBaseRate: 0.02,
    streakMultiplier: 1.1,
    qualityMultiplier: 1.05,
    speedMultiplier: 1.0,
    themeSpecific: false,
    compatibleThemes: [],
    levelRequired: 1,
    timeGated: undefined
  },

  'basic-pack': {
    id: 'basic-pack',
    name: 'Basic Knowledge Pack',
    description: 'Standard pack with balanced rarity distribution',
    cardCount: 5,
    costInEXP: 100,
    costInKeystrokes: 500,
    rarityWeights: {
      Common: 0.45,      // 45%
      Uncommon: 0.30,    // 30%
      Rare: 0.18,        // 18%
      Epic: 0.06,        // 6%
      Legendary: 0.01    // 1%
    },
    shinyBaseRate: 0.05,
    streakMultiplier: 1.2,
    qualityMultiplier: 1.1,
    speedMultiplier: 1.05,
    themeSpecific: false,
    compatibleThemes: [],
    levelRequired: 1,
    timeGated: undefined
  },

  'advanced-pack': {
    id: 'advanced-pack',
    name: 'Advanced Insights Pack',
    description: 'Higher chance of rare and epic knowledge cards',
    cardCount: 5,
    costInEXP: 250,
    costInKeystrokes: 1000,
    rarityWeights: {
      Common: 0.25,      // 25%
      Uncommon: 0.35,    // 35%
      Rare: 0.25,        // 25%
      Epic: 0.12,        // 12%
      Legendary: 0.03    // 3%
    },
    shinyBaseRate: 0.08,
    streakMultiplier: 1.3,
    qualityMultiplier: 1.15,
    speedMultiplier: 1.1,
    themeSpecific: false,
    compatibleThemes: [],
    levelRequired: 15,
    timeGated: undefined
  },

  'legendary-pack': {
    id: 'legendary-pack',
    name: 'Legendary Mastery Pack',
    description: 'Guaranteed epic or legendary knowledge with premium rarities',
    cardCount: 3,
    costInEXP: 500,
    costInKeystrokes: 2000,
    rarityWeights: {
      Common: 0.00,      // 0%
      Uncommon: 0.20,    // 20%
      Rare: 0.40,        // 40%
      Epic: 0.30,        // 30%
      Legendary: 0.10    // 10%
    },
    shinyBaseRate: 0.15,
    streakMultiplier: 1.5,
    qualityMultiplier: 1.25,
    speedMultiplier: 1.2,
    themeSpecific: false,
    compatibleThemes: [],
    levelRequired: 100,
    timeGated: undefined
  }
};

// ===== MAIN PACK SYSTEM =====

/**
 * Core pack system that handles pack opening, inventory, and purchasing
 */
export class PackSystem {
  private app: App;
  private settings: TCGSettings;
  private rng: SecureTCGRandom;
  private noteAnalyzer: NoteAnalyzer;
  private inventory: PackInventory;
  
  // Event listeners
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(app: App, settings: TCGSettings, noteAnalyzer: NoteAnalyzer) {
    this.app = app;
    this.settings = settings;
    this.rng = SecureTCGRandom.getInstance(settings.rngSeed);
    this.noteAnalyzer = noteAnalyzer;
    
    this.inventory = {
      availablePacks: new Map(),
      openedPacks: [],
      totalPacksOpened: 0,
      totalCardsAcquired: 0,
      packOpeningStreak: 0
    };

    this.initializeDefaultPacks();
    console.log('📦 Pack system initialized');
  }

  /**
   * Initialize player with starter packs
   */
  private initializeDefaultPacks(): void {
    this.addPacksToInventory('starter-pack', 3);
    this.addPacksToInventory('basic-pack', 1);
  }

  /**
   * Open a pack and generate cards
   */
  async openPack(packId: string, bonusMultipliers?: {
    streak?: number;
    quality?: number; 
    speed?: number;
  }): Promise<PackOpeningResult | null> {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        // Check if pack is available
        const packCount = this.inventory.availablePacks.get(packId) || 0;
        if (packCount === 0) {
          throw new Error(`No ${packId} packs available in inventory`);
        }

        // Get pack definition
        const pack = this.getPackDefinition(packId);
        if (!pack) {
          throw new Error(`Unknown pack: ${packId}`);
        }

        // Calculate bonus multipliers
        const finalMultipliers = {
          streak: bonusMultipliers?.streak || pack.streakMultiplier,
          quality: bonusMultipliers?.quality || pack.qualityMultiplier,
          speed: bonusMultipliers?.speed || pack.speedMultiplier
        };

        // Generate cards for the pack
        const cards = await this.generatePackCards(pack, finalMultipliers);

        // Remove pack from inventory
        this.inventory.availablePacks.set(packId, packCount - 1);

        // Create opening result
        const result: PackOpeningResult = {
          packId,
          packName: pack.name,
          cards,
          rarityBreakdown: this.calculateRarityBreakdown(cards),
          shinyCount: cards.filter(card => card.isShiny).length,
          totalPowerLevel: cards.reduce((sum, card) => sum + card.powerLevel, 0),
          bonusMultipliers: finalMultipliers,
          openingTimestamp: new Date()
        };

        // Update inventory statistics
        this.updateInventoryStats(result);

        // Emit pack opening event
        this.emitEvent('pack_opened', result);

        console.log(`📦 Opened ${pack.name}: ${cards.length} cards generated`);
        return result;
      },
      `Pack opening: ${packId}`
    );
  }

  /**
   * Generate cards for a pack using weighted selection
   */
  private async generatePackCards(
    pack: TCGPack, 
    bonusMultipliers: { streak: number; quality: number; speed: number }
  ): Promise<TCGCard[]> {
    const cards: TCGCard[] = [];
    const availableNotes = this.getEligibleNotes();

    if (availableNotes.length === 0) {
      throw new Error('No eligible notes available for card generation');
    }

    // Apply bonus multipliers to rarity weights
    const adjustedWeights = this.applyBonusMultipliers(pack.rarityWeights, bonusMultipliers);

    for (let i = 0; i < pack.cardCount; i++) {
      // Select rarity using weighted selection
      const rarities = Object.keys(adjustedWeights) as CardRarity[];
      const weights = Object.values(adjustedWeights);
      const selectedRarity = weightedSelect(rarities, weights);

      // Generate card with selected rarity
      const card = await this.generateCardWithRarity(availableNotes, selectedRarity, pack);
      if (card) {
        cards.push(card);
      }
    }

    return cards;
  }

  /**
   * Apply bonus multipliers to pack rarity weights
   */
  private applyBonusMultipliers(
    baseWeights: Record<CardRarity, number>,
    multipliers: { streak: number; quality: number; speed: number }
  ): Record<CardRarity, number> {
    const totalMultiplier = multipliers.streak * multipliers.quality * multipliers.speed;
    
    // Higher multipliers increase chance of better rarities
    const rarityBonuses: Record<CardRarity, number> = {
      'Common': 1.0,
      'Uncommon': totalMultiplier > 1.2 ? 1.1 : 1.0,
      'Rare': totalMultiplier > 1.3 ? 1.2 : 1.0,
      'Epic': totalMultiplier > 1.4 ? 1.4 : 1.0,
      'Legendary': totalMultiplier > 1.5 ? 1.8 : 1.0
    };

    const adjustedWeights: Record<CardRarity, number> = {} as any;
    let totalWeight = 0;

    // Apply bonuses
    for (const [rarity, weight] of Object.entries(baseWeights)) {
      const adjustedWeight = weight * rarityBonuses[rarity as CardRarity];
      adjustedWeights[rarity as CardRarity] = adjustedWeight;
      totalWeight += adjustedWeight;
    }

    // Normalize to ensure weights sum to 1
    for (const rarity of Object.keys(adjustedWeights) as CardRarity[]) {
      adjustedWeights[rarity] /= totalWeight;
    }

    return adjustedWeights;
  }

  /**
   * Generate a card with specific rarity from available notes
   */
  private async generateCardWithRarity(
    availableNotes: TFile[],
    targetRarity: CardRarity,
    pack: TCGPack
  ): Promise<TCGCard | null> {
    // Try to find a note that naturally generates the target rarity
    const attempts = 5;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      const randomNote = this.rng.selectByWeight(
        availableNotes,
        availableNotes.map(() => 1) // Equal weights for now
      );

      const card = await this.noteAnalyzer.analyzeNote(randomNote);
      if (card && card.rarity === targetRarity) {
        // Apply pack-specific modifications
        this.applyPackModifications(card, pack);
        return card;
      }
    }

    // If no natural match found, force the rarity on a random card
    const randomNote = this.rng.selectByWeight(
      availableNotes,
      availableNotes.map(() => 1)
    );

    const card = await this.noteAnalyzer.analyzeNote(randomNote);
    if (card) {
      // Force the target rarity
      card.rarity = targetRarity;
      
      // Adjust power level to match rarity
      const rarityMultipliers: Record<CardRarity, number> = {
        'Common': 1.0,
        'Uncommon': 1.3,
        'Rare': 1.7,
        'Epic': 2.2,
        'Legendary': 3.0
      };
      
      card.powerLevel = Math.floor(card.powerLevel * rarityMultipliers[targetRarity]);
      
      // Update shiny status based on forced rarity
      const shinyRates: Record<CardRarity, number> = {
        'Common': 0.01,
        'Uncommon': 0.03,
        'Rare': 0.05,
        'Epic': 0.08,
        'Legendary': 0.15
      };
      
      card.isShiny = this.rng.randomBoolean(shinyRates[targetRarity] + pack.shinyBaseRate);
      
      // Apply pack-specific modifications
      this.applyPackModifications(card, pack);
      
      card.acquisitionContext = `forced_rarity_${pack.id}`;
      return card;
    }

    return null;
  }

  /**
   * Apply pack-specific modifications to cards
   */
  private applyPackModifications(card: TCGCard, pack: TCGPack): void {
    // Update acquisition context
    card.acquisitionContext = `pack_${pack.id}`;
    card.acquisitionDate = new Date();

    // Apply theme-specific data if applicable
    if (pack.themeSpecific && pack.compatibleThemes.length > 0) {
      card.themeData = {
        compatibleThemes: pack.compatibleThemes,
        packOrigin: pack.id
      };
    }
  }

  /**
   * Get eligible notes for card generation
   */
  private getEligibleNotes(): TFile[] {
    return this.app.vault.getMarkdownFiles().filter(file => {
      // Basic eligibility criteria
      return file.stat.size > 100; // Minimum content size
    });
  }

  /**
   * Calculate rarity breakdown for pack results
   */
  private calculateRarityBreakdown(cards: TCGCard[]): Record<CardRarity, number> {
    const breakdown: Record<CardRarity, number> = {
      'Common': 0,
      'Uncommon': 0,
      'Rare': 0,
      'Epic': 0,
      'Legendary': 0
    };

    cards.forEach(card => {
      breakdown[card.rarity]++;
    });

    return breakdown;
  }

  /**
   * Update inventory statistics after pack opening
   */
  private updateInventoryStats(result: PackOpeningResult): void {
    this.inventory.openedPacks.push(result);
    this.inventory.totalPacksOpened++;
    this.inventory.totalCardsAcquired += result.cards.length;

    // Update opening streak
    const now = new Date();
    const lastOpening = this.inventory.lastPackOpeningDate;
    
    if (lastOpening) {
      const daysSinceLastOpening = Math.floor((now.getTime() - lastOpening.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastOpening === 1) {
        // Consecutive day
        this.inventory.packOpeningStreak++;
      } else if (daysSinceLastOpening > 1) {
        // Streak broken
        this.inventory.packOpeningStreak = 1;
      }
      // Same day doesn't affect streak
    } else {
      // First pack
      this.inventory.packOpeningStreak = 1;
    }

    this.inventory.lastPackOpeningDate = now;
  }

  /**
   * Purchase packs using EXP or keystrokes
   */
  purchasePack(
    packId: string, 
    quantity: number, 
    paymentMethod: 'exp' | 'keystrokes',
    currentBalance: number
  ): PackPurchaseResult {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const pack = this.getPackDefinition(packId);
        if (!pack) {
          return { success: false, packsAdded: 0, costPaid: 0, newBalance: currentBalance, error: 'Pack not found' };
        }

        const costPerPack = paymentMethod === 'exp' ? pack.costInEXP : pack.costInKeystrokes;
        const totalCost = costPerPack * quantity;

        if (currentBalance < totalCost) {
          return { 
            success: false, 
            packsAdded: 0, 
            costPaid: 0, 
            newBalance: currentBalance, 
            error: `Insufficient ${paymentMethod}. Need ${totalCost}, have ${currentBalance}` 
          };
        }

        // Add packs to inventory
        this.addPacksToInventory(packId, quantity);

        const newBalance = currentBalance - totalCost;

        // Emit purchase event
        this.emitEvent('pack_purchased', {
          packId,
          quantity,
          paymentMethod,
          costPaid: totalCost,
          newBalance
        });

        console.log(`💰 Purchased ${quantity}x ${pack.name} for ${totalCost} ${paymentMethod}`);

        return {
          success: true,
          packsAdded: quantity,
          costPaid: totalCost,
          newBalance
        };
      },
      'Pack purchase'
    ) || { success: false, packsAdded: 0, costPaid: 0, newBalance: currentBalance, error: 'Purchase failed' };
  }

  /**
   * Add packs to inventory
   */
  addPacksToInventory(packId: string, quantity: number): void {
    const currentCount = this.inventory.availablePacks.get(packId) || 0;
    this.inventory.availablePacks.set(packId, currentCount + quantity);
    
    console.log(`📦 Added ${quantity}x ${packId} to inventory`);
  }

  /**
   * Get pack definition by ID
   */
  private getPackDefinition(packId: string): TCGPack | null {
    // Check built-in packs
    if (DEFAULT_PACKS[packId]) {
      return DEFAULT_PACKS[packId];
    }

    // Check custom packs from settings
    const customThemes = this.settings.customThemes;
    for (const theme of Object.values(customThemes)) {
      const pack = theme.packs.find(p => p.id === packId);
      if (pack) {
        return pack;
      }
    }

    return null;
  }

  /**
   * Get all available pack definitions
   */
  getAvailablePackDefinitions(): TCGPack[] {
    const packs: TCGPack[] = [];
    
    // Add built-in packs
    packs.push(...Object.values(DEFAULT_PACKS));

    // Add custom theme packs
    const customThemes = this.settings.customThemes;
    for (const theme of Object.values(customThemes)) {
      packs.push(...theme.packs);
    }

    return packs;
  }

  /**
   * Get current inventory status
   */
  getInventory(): PackInventory {
    return {
      availablePacks: new Map(this.inventory.availablePacks),
      openedPacks: [...this.inventory.openedPacks],
      totalPacksOpened: this.inventory.totalPacksOpened,
      totalCardsAcquired: this.inventory.totalCardsAcquired,
      packOpeningStreak: this.inventory.packOpeningStreak,
      lastPackOpeningDate: this.inventory.lastPackOpeningDate
    };
  }

  /**
   * Get pack opening history
   */
  getPackHistory(limit?: number): PackOpeningResult[] {
    const history = [...this.inventory.openedPacks].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get pack statistics
   */
  getPackStatistics(): {
    totalPacksOpened: number;
    totalCardsGenerated: number;
    packTypeBreakdown: Record<string, number>;
    rarityDistribution: Record<CardRarity, number>;
    shinyRate: number;
    averagePowerLevel: number;
  } {
    const packTypeBreakdown: Record<string, number> = {};
    const rarityDistribution: Record<CardRarity, number> = {
      'Common': 0,
      'Uncommon': 0, 
      'Rare': 0,
      'Epic': 0,
      'Legendary': 0
    };

    let totalShinyCards = 0;
    let totalPowerLevel = 0;
    let totalCards = 0;

    for (const result of this.inventory.openedPacks) {
      // Pack type breakdown
      packTypeBreakdown[result.packId] = (packTypeBreakdown[result.packId] || 0) + 1;

      // Rarity distribution
      for (const [rarity, count] of Object.entries(result.rarityBreakdown)) {
        rarityDistribution[rarity as CardRarity] += count;
      }

      // Aggregate statistics
      totalShinyCards += result.shinyCount;
      totalPowerLevel += result.totalPowerLevel;
      totalCards += result.cards.length;
    }

    return {
      totalPacksOpened: this.inventory.totalPacksOpened,
      totalCardsGenerated: totalCards,
      packTypeBreakdown,
      rarityDistribution,
      shinyRate: totalCards > 0 ? totalShinyCards / totalCards : 0,
      averagePowerLevel: totalCards > 0 ? totalPowerLevel / totalCards : 0
    };
  }

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
          console.error(`Error in pack system event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    this.rng.reset(newSettings.rngSeed);
    
    console.log('⚙️ Pack system settings updated');
  }

  /**
   * Load inventory from saved data
   */
  loadInventory(savedInventory: Partial<PackInventory>): void {
    if (savedInventory.availablePacks) {
      this.inventory.availablePacks = new Map(savedInventory.availablePacks);
    }
    if (savedInventory.openedPacks) {
      this.inventory.openedPacks = savedInventory.openedPacks;
    }
    if (savedInventory.totalPacksOpened !== undefined) {
      this.inventory.totalPacksOpened = savedInventory.totalPacksOpened;
    }
    if (savedInventory.totalCardsAcquired !== undefined) {
      this.inventory.totalCardsAcquired = savedInventory.totalCardsAcquired;
    }
    if (savedInventory.packOpeningStreak !== undefined) {
      this.inventory.packOpeningStreak = savedInventory.packOpeningStreak;
    }
    if (savedInventory.lastPackOpeningDate) {
      this.inventory.lastPackOpeningDate = savedInventory.lastPackOpeningDate;
    }

    console.log('💾 Pack inventory loaded');
  }

  /**
   * Export inventory for saving
   */
  exportInventory(): any {
    return {
      availablePacks: Array.from(this.inventory.availablePacks.entries()),
      openedPacks: this.inventory.openedPacks,
      totalPacksOpened: this.inventory.totalPacksOpened,
      totalCardsAcquired: this.inventory.totalCardsAcquired,
      packOpeningStreak: this.inventory.packOpeningStreak,
      lastPackOpeningDate: this.inventory.lastPackOpeningDate
    };
  }

  /**
   * Clean up and destroy pack system
   */
  destroy(): void {
    this.eventListeners.clear();
    this.inventory = {
      availablePacks: new Map(),
      openedPacks: [],
      totalPacksOpened: 0,
      totalCardsAcquired: 0,
      packOpeningStreak: 0
    };

    console.log('🧹 Pack system destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick pack opening function
 */
export async function openPack(
  app: App,
  packId: string,
  settings: TCGSettings,
  noteAnalyzer: NoteAnalyzer
): Promise<PackOpeningResult | null> {
  const packSystem = new PackSystem(app, settings, noteAnalyzer);
  return await packSystem.openPack(packId);
}

/**
 * Quick pack purchase function
 */
export function purchasePacks(
  app: App,
  packId: string,
  quantity: number,
  paymentMethod: 'exp' | 'keystrokes',
  currentBalance: number,
  settings: TCGSettings,
  noteAnalyzer: NoteAnalyzer
): PackPurchaseResult {
  const packSystem = new PackSystem(app, settings, noteAnalyzer);
  return packSystem.purchasePack(packId, quantity, paymentMethod, currentBalance);
}