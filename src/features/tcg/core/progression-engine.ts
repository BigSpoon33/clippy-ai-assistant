/**
 * CLIPPY TCG Writer - Progression Engine
 * Handles EXP-to-level conversions, multiple progression formulas, and level-up events
 * Following PRP specifications for balanced and configurable progression
 */

import { TCGSettings, ProgressionFormula, isValidProgressionFormula } from '../types';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== PROGRESSION INTERFACES =====

export interface LevelCalculationResult {
  level: number;
  currentLevelEXP: number;
  nextLevelEXP: number;
  expToNextLevel: number;
  progressPercent: number;
  levelChanged: boolean;
  levelsGained: number;
}

export interface StatModifiers {
  power: number;        // Card collection strength bonus
  creativity: number;   // Writing style bonus
  consistency: number;  // Daily streak bonus
  knowledge: number;    // Note interconnectedness bonus
}

export interface LevelUpRewards {
  expBonus: number;
  statBoosts: Partial<StatModifiers>;
  packsUnlocked: string[];
  themesUnlocked: string[];
  achievementsUnlocked: string[];
  specialAbilities: string[];
}

export interface ProgressionEvent {
  type: 'level_up' | 'pack_unlock' | 'theme_unlock' | 'achievement_unlock';
  level: number;
  previousLevel: number;
  totalEXP: number;
  rewards: LevelUpRewards;
  timestamp: number;
}

// ===== PROGRESSION FORMULAS =====

/**
 * Collection of mathematical progression formulas
 * Each formula provides different leveling curves for varied gameplay
 */
export class ProgressionFormulas {
  /**
   * Linear progression: EXP requirement increases linearly
   * Good for steady, predictable advancement
   */
  static linear(level: number, params: { base: number; modifier: number }): number {
    if (level <= 1) return 0;
    return params.base + (level - 1) * params.modifier;
  }

  /**
   * Exponential progression: EXP requirement grows exponentially
   * Creates increasing challenge as levels get higher
   */
  static exponential(level: number, params: { base: number; exponent: number }): number {
    if (level <= 1) return 0;
    return Math.floor(params.base * Math.pow(level - 1, params.exponent));
  }

  /**
   * Logarithmic progression: EXP requirement grows logarithmically
   * Initial levels are harder, later levels easier (diminishing returns)
   */
  static logarithmic(level: number, params: { base: number; modifier: number }): number {
    if (level <= 1) return 0;
    return Math.floor(params.base + params.modifier * Math.log(level));
  }

  /**
   * Custom formula: User-defined progression curve
   * Combines multiple factors for complex progression patterns
   */
  static custom(
    level: number, 
    params: { base: number; exponent: number; modifier: number }
  ): number {
    if (level <= 1) return 0;
    
    const exponentialComponent = params.base * Math.pow(level - 1, params.exponent);
    const linearComponent = (level - 1) * params.modifier;
    
    return Math.floor(exponentialComponent + linearComponent);
  }

  /**
   * Get appropriate formula function based on type
   */
  static getFormula(type: ProgressionFormula): (level: number, params: any) => number {
    switch (type) {
      case 'linear':
        return ProgressionFormulas.linear;
      case 'exponential':
        return ProgressionFormulas.exponential;
      case 'logarithmic':
        return ProgressionFormulas.logarithmic;
      case 'custom':
        return ProgressionFormulas.custom;
      default:
        throw new Error(`Invalid progression formula: ${type}`);
    }
  }

  /**
   * Validate formula parameters for sanity checks
   */
  static validateParams(type: ProgressionFormula, params: any): boolean {
    switch (type) {
      case 'linear':
        return typeof params.base === 'number' && 
               typeof params.modifier === 'number' &&
               params.base > 0 && 
               params.modifier > 0;
      
      case 'exponential':
        return typeof params.base === 'number' && 
               typeof params.exponent === 'number' &&
               params.base > 0 && 
               params.exponent >= 1 && 
               params.exponent <= 3; // Prevent extreme values
      
      case 'logarithmic':
        return typeof params.base === 'number' && 
               typeof params.modifier === 'number' &&
               params.base > 0 && 
               params.modifier > 0;
      
      case 'custom':
        return typeof params.base === 'number' && 
               typeof params.exponent === 'number' &&
               typeof params.modifier === 'number' &&
               params.base > 0 && 
               params.exponent >= 1 && 
               params.exponent <= 2.5 && 
               params.modifier >= 0;
      
      default:
        return false;
    }
  }
}

// ===== MAIN PROGRESSION ENGINE =====

/**
 * Core progression engine that handles all EXP/level calculations and events
 * Integrates with the TCG system to provide balanced advancement
 */
export class ProgressionEngine {
  private settings: TCGSettings;
  private eventListeners: Map<string, ((event: ProgressionEvent) => void)[]> = new Map();
  
  constructor(settings: TCGSettings) {
    this.settings = settings;
    this.validateSettings();
  }

  /**
   * Calculate level and progression data from total EXP
   * Core function for all level-related calculations
   */
  calculateLevel(totalEXP: number, previousLevel?: number): LevelCalculationResult {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        if (totalEXP < 0) {
          throw new Error('Total EXP cannot be negative');
        }

        const formula = ProgressionFormulas.getFormula(this.settings.expFormula);
        let currentLevel = 1;
        let currentLevelEXP = 0;

        // Find current level by iterating through EXP requirements
        // Using binary search for efficiency with high levels
        let low = 1;
        let high = 1000; // Reasonable upper bound
        
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const expRequired = this.calculateTotalEXPForLevel(mid);
          
          if (expRequired <= totalEXP) {
            currentLevel = mid;
            currentLevelEXP = expRequired;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        const nextLevelEXP = this.calculateTotalEXPForLevel(currentLevel + 1);
        const expToNextLevel = nextLevelEXP - totalEXP;
        const progressPercent = ((totalEXP - currentLevelEXP) / (nextLevelEXP - currentLevelEXP)) * 100;

        // Calculate level change information
        const levelChanged = previousLevel !== undefined && currentLevel !== previousLevel;
        const levelsGained = previousLevel !== undefined ? Math.max(0, currentLevel - previousLevel) : 0;

        return {
          level: currentLevel,
          currentLevelEXP,
          nextLevelEXP,
          expToNextLevel,
          progressPercent: Math.min(100, Math.max(0, progressPercent)),
          levelChanged,
          levelsGained
        };
      },
      'Level calculation'
    ) || {
      level: 1,
      currentLevelEXP: 0,
      nextLevelEXP: this.calculateEXPForLevel(2),
      expToNextLevel: this.calculateEXPForLevel(2),
      progressPercent: 0,
      levelChanged: false,
      levelsGained: 0
    };
  }

  /**
   * Calculate EXP required for a specific level
   */
  calculateEXPForLevel(level: number): number {
    if (level <= 1) return 0;
    
    const formula = ProgressionFormulas.getFormula(this.settings.expFormula);
    return formula(level, this.settings.customFormulaParams);
  }

  /**
   * Calculate total EXP required to reach a specific level
   */
  calculateTotalEXPForLevel(level: number): number {
    let totalEXP = 0;
    
    for (let i = 2; i <= level; i++) {
      totalEXP += this.calculateEXPForLevel(i);
    }
    
    return totalEXP;
  }

  /**
   * Process level up and generate appropriate events and rewards
   */
  processLevelUp(
    oldLevel: number, 
    newLevel: number, 
    totalEXP: number
  ): ProgressionEvent[] {
    const events: ProgressionEvent[] = [];

    // Process each level gained individually for proper reward calculation
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      const rewards = this.calculateLevelUpRewards(level);
      
      const event: ProgressionEvent = {
        type: 'level_up',
        level,
        previousLevel: level - 1,
        totalEXP,
        rewards,
        timestamp: Date.now()
      };

      events.push(event);

      // Emit additional events for unlocked content
      if (rewards.packsUnlocked.length > 0) {
        rewards.packsUnlocked.forEach(packId => {
          events.push({
            type: 'pack_unlock',
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, packsUnlocked: [packId] },
            timestamp: Date.now()
          });
        });
      }

      if (rewards.themesUnlocked.length > 0) {
        rewards.themesUnlocked.forEach(themeId => {
          events.push({
            type: 'theme_unlock',
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, themesUnlocked: [themeId] },
            timestamp: Date.now()
          });
        });
      }

      if (rewards.achievementsUnlocked.length > 0) {
        rewards.achievementsUnlocked.forEach(achievementId => {
          events.push({
            type: 'achievement_unlock',
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, achievementsUnlocked: [achievementId] },
            timestamp: Date.now()
          });
        });
      }
    }

    // Emit all events to registered listeners
    events.forEach(event => {
      this.emitEvent('progression_event', event);
      this.emitEvent(event.type, event);
    });

    return events;
  }

  /**
   * Calculate rewards for reaching a specific level
   */
  calculateLevelUpRewards(level: number): LevelUpRewards {
    const baseRewards: LevelUpRewards = {
      expBonus: 0,
      statBoosts: {},
      packsUnlocked: [],
      themesUnlocked: [],
      achievementsUnlocked: [],
      specialAbilities: []
    };

    // Level-based rewards
    if (level % 5 === 0) {
      // Every 5 levels: stat boosts
      baseRewards.statBoosts = {
        power: 2,
        creativity: 1,
        consistency: 1,
        knowledge: 2
      };
    }

    if (level % 10 === 0) {
      // Every 10 levels: special rewards
      baseRewards.expBonus = Math.floor(level * 50); // Scaling EXP bonus
      baseRewards.packsUnlocked.push('milestone-pack');
    }

    // Specific level milestones
    switch (level) {
      case 2:
        baseRewards.packsUnlocked.push('starter-pack');
        break;
      case 5:
        baseRewards.themesUnlocked.push('classic-theme');
        break;
      case 10:
        baseRewards.achievementsUnlocked.push('level-10-milestone');
        baseRewards.specialAbilities.push('daily-bonus');
        break;
      case 15:
        baseRewards.packsUnlocked.push('advanced-pack');
        break;
      case 20:
        baseRewards.themesUnlocked.push('advanced-theme');
        baseRewards.specialAbilities.push('quality-multiplier');
        break;
      case 25:
        baseRewards.achievementsUnlocked.push('quarter-century');
        baseRewards.packsUnlocked.push('rare-pack');
        break;
      case 50:
        baseRewards.achievementsUnlocked.push('level-50-master');
        baseRewards.themesUnlocked.push('master-theme');
        baseRewards.specialAbilities.push('exp-multiplier');
        break;
      case 100:
        baseRewards.achievementsUnlocked.push('centurion');
        baseRewards.packsUnlocked.push('legendary-pack');
        baseRewards.specialAbilities.push('legendary-status');
        break;
    }

    return baseRewards;
  }

  /**
   * Calculate stat modifiers based on level and other factors
   */
  calculateStatModifiers(level: number, streakDays: number, notesCount: number): StatModifiers {
    return {
      power: this.calculatePowerModifier(level, notesCount),
      creativity: this.calculateCreativityModifier(level, notesCount),
      consistency: this.calculateConsistencyModifier(streakDays),
      knowledge: this.calculateKnowledgeModifier(level, notesCount)
    };
  }

  /**
   * Calculate power modifier (overall card collection strength)
   */
  private calculatePowerModifier(level: number, notesCount: number): number {
    const levelBonus = Math.floor(level / 2);
    const noteBonus = Math.floor(notesCount / 10);
    return levelBonus + noteBonus;
  }

  /**
   * Calculate creativity modifier (writing style and uniqueness)
   */
  private calculateCreativityModifier(level: number, notesCount: number): number {
    const levelBonus = Math.floor(level / 3);
    const diversityBonus = Math.floor(Math.sqrt(notesCount));
    return levelBonus + diversityBonus;
  }

  /**
   * Calculate consistency modifier (daily writing streak bonuses)
   */
  private calculateConsistencyModifier(streakDays: number): number {
    if (streakDays === 0) return 0;
    
    // Logarithmic scaling for streak bonuses to prevent excessive growth
    return Math.floor(5 * Math.log(streakDays + 1));
  }

  /**
   * Calculate knowledge modifier (note interconnectedness and depth)
   */
  private calculateKnowledgeModifier(level: number, notesCount: number): number {
    const levelBonus = Math.floor(level / 4);
    const depthBonus = Math.floor(notesCount / 20);
    return levelBonus + depthBonus;
  }

  /**
   * Check if a pack should be unlocked at the given level
   */
  isPackUnlockedAtLevel(packId: string, level: number): boolean {
    // This would typically check against pack definitions
    // For now, implement basic level-based unlocking
    const packUnlockLevels: Record<string, number> = {
      'starter-pack': 2,
      'basic-pack': 1,
      'advanced-pack': 15,
      'rare-pack': 25,
      'legendary-pack': 100,
      'milestone-pack': 10
    };

    return level >= (packUnlockLevels[packId] || 1);
  }

  /**
   * Register event listener for progression events
   */
  onProgressionEvent(eventType: string, callback: (event: ProgressionEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit progression event to registered listeners
   */
  private emitEvent(eventType: string, event: ProgressionEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in progression event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Update settings and revalidate
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    this.validateSettings();
    
    console.log('⚙️ Progression engine settings updated');
  }

  /**
   * Validate settings for mathematical correctness
   */
  private validateSettings(): void {
    if (!isValidProgressionFormula(this.settings.expFormula)) {
      throw new Error(`Invalid progression formula: ${this.settings.expFormula}`);
    }

    if (!ProgressionFormulas.validateParams(this.settings.expFormula, this.settings.customFormulaParams)) {
      throw new Error(`Invalid formula parameters for ${this.settings.expFormula}`);
    }

    if (this.settings.keystrokesPerEXP <= 0) {
      throw new Error('Keystrokes per EXP must be positive');
    }

    console.log('✅ Progression engine settings validated');
  }

  /**
   * Get progression statistics for debugging and display
   */
  getProgressionStats(maxLevel = 100): {
    levels: number[];
    expRequirements: number[];
    totalExpRequirements: number[];
    averageExpPerLevel: number;
    maxExpForLevel: number;
  } {
    const levels: number[] = [];
    const expRequirements: number[] = [];
    const totalExpRequirements: number[] = [];

    for (let level = 1; level <= maxLevel; level++) {
      levels.push(level);
      
      const expForLevel = this.calculateEXPForLevel(level);
      expRequirements.push(expForLevel);
      
      const totalExpForLevel = this.calculateTotalEXPForLevel(level);
      totalExpRequirements.push(totalExpForLevel);
    }

    const averageExpPerLevel = expRequirements.slice(1).reduce((sum, exp) => sum + exp, 0) / (maxLevel - 1);
    const maxExpForLevel = Math.max(...expRequirements);

    return {
      levels,
      expRequirements,
      totalExpRequirements,
      averageExpPerLevel,
      maxExpForLevel
    };
  }

  /**
   * Cleanup and destroy progression engine
   */
  destroy(): void {
    this.eventListeners.clear();
    console.log('🧹 Progression engine destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick level calculation function
 */
export function calculatePlayerLevel(
  totalEXP: number, 
  settings: TCGSettings, 
  previousLevel?: number
): LevelCalculationResult {
  const engine = new ProgressionEngine(settings);
  return engine.calculateLevel(totalEXP, previousLevel);
}

/**
 * Quick stat modifier calculation
 */
export function calculatePlayerStats(
  level: number, 
  streakDays: number, 
  notesCount: number, 
  settings: TCGSettings
): StatModifiers {
  const engine = new ProgressionEngine(settings);
  return engine.calculateStatModifiers(level, streakDays, notesCount);
}