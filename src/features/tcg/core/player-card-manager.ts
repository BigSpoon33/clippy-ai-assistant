/**
 * CLIPPY TCG Writer - Player Card Note Template System
 * Manages generation and updating of player profile notes using template system
 * Following PRP specifications for comprehensive player card management
 */

import { App, TFile } from 'obsidian';
import { TCGPlayerProfile, TCGSettings } from '../types';
import { PlayerManager, PlayerSession, CollectionAnalytics } from './player-manager';
import { ThemeManager } from '../themes/theme-system';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== PLAYER CARD INTERFACES =====

export interface PlayerCardMetadata {
  tcg_type: 'player_card';
  player_id: string;
  character_name: string;
  level: number;
  current_exp: number;
  exp_to_next_level: number;
  total_keystrokes: number;
  packs_opened: number;
  cards_collected: number;
  current_streak: number;
  longest_streak: number;
  active_theme: string;
  engagement_level: number;
  keystrokes_per_minute: number;
  stats: {
    power: number;
    creativity: number;
    consistency: number;
    knowledge: number;
  };
  achievements_unlocked: number;
  favorite_cards: number;
  total_card_power: number;
  generated_date: string;
  last_updated: string;
}

export interface PlayerCardTemplateData {
  // Basic player info
  player_id: string;
  character_name: string;
  level: number;
  current_exp: number;
  exp_to_next_level: number;
  total_keystrokes: number;
  packs_opened: number;
  cards_collected: number;
  current_streak: number;
  longest_streak: number;
  active_theme: string;
  engagement_level: number;
  keystrokes_per_minute: number;
  
  // Stats
  stats: {
    power: number;
    creativity: number;
    consistency: number;
    knowledge: number;
  };
  
  // Collection info
  achievements_unlocked: number;
  favorite_cards: number;
  total_card_power: number;
  
  // Computed display values
  engagement_level_percentage: number;
  engagement_status: string;
  exp_progress_bar: string;
  power_bar: string;
  creativity_bar: string;
  consistency_bar: string;
  knowledge_bar: string;
  streak_status: string;
  theme_description: string;
  
  // Analytics
  recent_achievements: Array<{
    name: string;
    icon: string;
    description: string;
    unlocked_date: string;
    progress: number;
    max_progress: number;
  }>;
  
  rarity_distribution: Array<{
    rarity: string;
    count: number;
    percentage: string;
  }>;
  
  current_objectives: Array<{
    objective: string;
    progress: number;
  }>;
  
  upcoming_milestones: Array<{
    milestone_level: number;
    milestone_reward: string;
    milestone_achievement: string;
    milestone_description: string;
  }>;
  
  // Session data
  avg_session_length: number;
  peak_kmp: number;
  best_session_exp: number;
  weekly_activity_chart: string;
  
  // Metadata
  generated_date: string;
  last_updated: string;
  card_version: string;
  avatar_url: string;
  player_notes: string;
}

export interface PlayerCardGenerationOptions {
  forceUpdate?: boolean;
  includeAnalytics?: boolean;
  customNotes?: string;
  outputPath?: string;
  templateOverride?: string;
}

// ===== MAIN PLAYER CARD MANAGER =====

/**
 * Manages player card note generation and updates
 */
export class PlayerCardManager {
  private app: App;
  private settings: TCGSettings;
  private playerManager: PlayerManager;
  private themeManager: ThemeManager;
  
  // Template system
  private templateCache: Map<string, string> = new Map();
  private lastGeneratedCard: TFile | null = null;
  
  // Configuration
  private readonly PLAYER_CARDS_FOLDER = 'tcg/player-cards';
  private readonly TEMPLATE_PATH = 'tcg/templates/player-card-template.md';
  
  // Auto-update timer
  private autoUpdateTimer: NodeJS.Timeout | null = null;

  constructor(
    app: App, 
    settings: TCGSettings, 
    playerManager: PlayerManager,
    themeManager: ThemeManager
  ) {
    this.app = app;
    this.settings = settings;
    this.playerManager = playerManager;
    this.themeManager = themeManager;
    
    // Ensure player cards directory exists
    this.ensurePlayerCardsDirectory();
    
    // Set up auto-update if enabled
    if (settings.autoUpdatePlayerCard) {
      this.startAutoUpdate();
    }
    
    console.log('🎴 Player card manager initialized');
  }

  /**
   * Generate or update player card note
   */
  async generatePlayerCard(options: PlayerCardGenerationOptions = {}): Promise<TFile | null> {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        const profile = this.playerManager.getPlayerProfile();
        
        // Check if update needed
        if (!options.forceUpdate && await this.isPlayerCardUpToDate(profile)) {
          console.log('🎴 Player card is up to date, skipping generation');
          return this.lastGeneratedCard;
        }
        
        // Load template
        const template = await this.loadTemplate(options.templateOverride);
        if (!template) {
          throw new Error('Player card template not found');
        }
        
        // Generate template data
        const templateData = await this.generateTemplateData(profile, options);
        
        // Process template
        const processedContent = this.processTemplate(template, templateData);
        
        // Determine output path
        const outputPath = options.outputPath || 
          `${this.PLAYER_CARDS_FOLDER}/${profile.characterName} - Player Card.md`;
        
        // Create or update file
        const playerCardFile = await this.createOrUpdatePlayerCard(
          outputPath, 
          processedContent, 
          templateData
        );
        
        this.lastGeneratedCard = playerCardFile;
        
        console.log(`🎴 Player card generated: ${playerCardFile.path}`);
        return playerCardFile;
      },
      'Player card generation'
    );
  }

  /**
   * Load player card template
   */
  private async loadTemplate(templateOverride?: string): Promise<string | null> {
    const templatePath = templateOverride || this.TEMPLATE_PATH;
    
    // Check cache
    if (this.templateCache.has(templatePath)) {
      return this.templateCache.get(templatePath)!;
    }
    
    // Load from file
    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
    if (!templateFile || !(templateFile instanceof TFile)) {
      console.error(`Player card template not found: ${templatePath}`);
      return null;
    }
    
    const templateContent = await this.app.vault.read(templateFile);
    
    // Cache template
    this.templateCache.set(templatePath, templateContent);
    
    return templateContent;
  }

  /**
   * Generate template data from player profile
   */
  private async generateTemplateData(
    profile: TCGPlayerProfile, 
    options: PlayerCardGenerationOptions
  ): Promise<PlayerCardTemplateData> {
    const collectionSummary = this.playerManager.getCollectionSummary();
    const analytics = options.includeAnalytics !== false ? 
      this.playerManager.getCollectionAnalytics() : null;
    const achievements = this.playerManager.getAllAchievements();
    const sessionStats = this.playerManager.getSessionStatistics();
    const activeTheme = this.themeManager.getActiveTheme();
    
    // Generate progress bars
    const expProgress = profile.expToNextLevel > 0 ? 
      (profile.currentEXP / (profile.currentEXP + profile.expToNextLevel)) * 100 : 100;
    
    return {
      // Basic info
      player_id: profile.id,
      character_name: profile.characterName,
      level: profile.level,
      current_exp: profile.currentEXP,
      exp_to_next_level: profile.expToNextLevel,
      total_keystrokes: profile.totalKeystrokes,
      packs_opened: profile.packsOpened,
      cards_collected: profile.cardsCollected,
      current_streak: profile.currentStreak,
      longest_streak: profile.longestStreak,
      active_theme: profile.activeTheme,
      engagement_level: profile.engagementLevel,
      keystrokes_per_minute: profile.keystrokesPerMinute,
      
      // Stats
      stats: profile.stats,
      
      // Collection
      achievements_unlocked: achievements.filter(a => a.unlockedAt.getTime() > 0).length,
      favorite_cards: collectionSummary.favoriteCount,
      total_card_power: collectionSummary.totalPowerLevel,
      
      // Display values
      engagement_level_percentage: Math.round(profile.engagementLevel * 100),
      engagement_status: this.getEngagementStatus(profile.engagementLevel),
      exp_progress_bar: this.generateProgressBar(expProgress),
      power_bar: this.generateStatBar(profile.stats.power),
      creativity_bar: this.generateStatBar(profile.stats.creativity),
      consistency_bar: this.generateStatBar(profile.stats.consistency),
      knowledge_bar: this.generateStatBar(profile.stats.knowledge),
      streak_status: this.getStreakStatus(profile.currentStreak),
      theme_description: activeTheme.description,
      
      // Analytics data
      recent_achievements: achievements
        .filter(a => a.unlockedAt.getTime() > 0)
        .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
        .slice(0, 5)
        .map(a => ({
          name: a.name,
          icon: a.icon,
          description: a.description,
          unlocked_date: a.unlockedAt.toLocaleDateString(),
          progress: a.progress,
          max_progress: a.maxProgress
        })),
      
      rarity_distribution: analytics ? 
        Object.entries(analytics.rarityDistribution).map(([rarity, data]) => ({
          rarity,
          count: data.count,
          percentage: data.percentage.toFixed(1)
        })) : [],
      
      current_objectives: this.generateCurrentObjectives(profile, achievements),
      upcoming_milestones: this.generateUpcomingMilestones(profile),
      
      // Session data
      avg_session_length: Math.round(sessionStats.averageSessionLength / (1000 * 60)),
      peak_kmp: sessionStats.bestSession?.peakKPM || 0,
      best_session_exp: sessionStats.bestSession?.expGained || 0,
      weekly_activity_chart: this.generateWeeklyActivityChart(),
      
      // Metadata
      generated_date: new Date().toISOString(),
      last_updated: new Date().toLocaleString(),
      card_version: '1.0.0',
      avatar_url: this.generateAvatarUrl(profile),
      player_notes: options.customNotes || this.generatePlayerNotes(profile)
    };
  }

  /**
   * Process template with data
   */
  private processTemplate(template: string, data: PlayerCardTemplateData): string {
    let processed = template;
    
    // Simple template variable replacement
    // Replace {{variable}} patterns
    processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value: any = data;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match; // Keep original if not found
        }
      }
      
      // Format numbers with commas if specified
      if (key.includes(':,') && typeof value === 'number') {
        return value.toLocaleString();
      }
      
      return String(value || '');
    });
    
    // Process array loops {{#array}} ... {{/array}}
    processed = this.processArrayLoops(processed, data);
    
    return processed;
  }

  /**
   * Process array loops in template
   */
  private processArrayLoops(template: string, data: any): string {
    const arrayRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    
    return template.replace(arrayRegex, (match, arrayName, content) => {
      const arrayData = data[arrayName];
      if (!Array.isArray(arrayData)) {
        return '';
      }
      
      return arrayData.map(item => {
        return content.replace(/\{\{(\w+)\}\}/g, (itemMatch, itemKey) => {
          return String(item[itemKey] || '');
        });
      }).join('\n');
    });
  }

  /**
   * Create or update player card file
   */
  private async createOrUpdatePlayerCard(
    path: string, 
    content: string, 
    metadata: PlayerCardTemplateData
  ): Promise<TFile> {
    const existingFile = this.app.vault.getAbstractFileByPath(path);
    
    if (existingFile && existingFile instanceof TFile) {
      // Update existing file
      await this.app.vault.modify(existingFile, content);
      return existingFile;
    } else {
      // Create new file
      return await this.app.vault.create(path, content);
    }
  }

  /**
   * Check if player card is up to date
   */
  private async isPlayerCardUpToDate(profile: TCGPlayerProfile): Promise<boolean> {
    if (!this.lastGeneratedCard) {
      return false;
    }
    
    try {
      const content = await this.app.vault.read(this.lastGeneratedCard);
      const frontmatter = this.extractFrontmatter(content);
      
      if (!frontmatter || frontmatter.tcg_type !== 'player_card') {
        return false;
      }
      
      // Check if significant changes occurred
      const lastUpdate = new Date(frontmatter.last_updated);
      const timeDiff = Date.now() - lastUpdate.getTime();
      
      // Consider outdated if more than 10 minutes old
      if (timeDiff > 10 * 60 * 1000) {
        return false;
      }
      
      // Check for level changes, significant EXP gains, etc.
      if (frontmatter.level !== profile.level ||
          frontmatter.current_exp < profile.currentEXP - 100 ||
          frontmatter.cards_collected !== profile.cardsCollected) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Error checking player card freshness:', error);
      return false;
    }
  }

  /**
   * Extract frontmatter from markdown content
   */
  private extractFrontmatter(content: string): any {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;
    
    try {
      // Simple YAML parser for frontmatter
      const yamlContent = frontmatterMatch[1];
      const result: any = {};
      
      yamlContent.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          
          // Parse value
          if (value === 'true' || value === 'false') {
            result[key] = value === 'true';
          } else if (!isNaN(Number(value))) {
            result[key] = Number(value);
          } else {
            result[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      });
      
      return result;
    } catch (error) {
      console.warn('Error parsing frontmatter:', error);
      return null;
    }
  }

  /**
   * Generate progress bar visualization
   */
  private generateProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage.toFixed(1)}%`;
  }

  /**
   * Generate stat bar visualization
   */
  private generateStatBar(value: number, max: number = 100): string {
    const percentage = Math.min((value / max) * 100, 100);
    return this.generateProgressBar(percentage, 10);
  }

  /**
   * Get engagement status description
   */
  private getEngagementStatus(engagement: number): string {
    if (engagement >= 0.8) return '🔥 Highly Engaged';
    if (engagement >= 0.6) return '✨ Engaged';
    if (engagement >= 0.4) return '📈 Developing';
    if (engagement >= 0.2) return '🌱 Growing';
    return '💤 Inactive';
  }

  /**
   * Get streak status description
   */
  private getStreakStatus(streak: number): string {
    if (streak >= 30) return '🏆 Streak Master';
    if (streak >= 14) return '🔥 On Fire';
    if (streak >= 7) return '📈 Building Momentum';
    if (streak >= 3) return '🌱 Getting Started';
    return '💫 New Journey';
  }

  /**
   * Generate current objectives
   */
  private generateCurrentObjectives(
    profile: TCGPlayerProfile, 
    achievements: any[]
  ): Array<{ objective: string; progress: number }> {
    const objectives = [];
    
    // Level progress
    if (profile.expToNextLevel > 0) {
      const progress = (profile.currentEXP / (profile.currentEXP + profile.expToNextLevel)) * 100;
      objectives.push({
        objective: `Reach Level ${profile.level + 1}`,
        progress: Math.round(progress)
      });
    }
    
    // Collection objectives
    if (profile.cardsCollected < 50) {
      objectives.push({
        objective: 'Collect 50 unique cards',
        progress: Math.round((profile.cardsCollected / 50) * 100)
      });
    }
    
    // Streak objectives
    if (profile.currentStreak < 30) {
      objectives.push({
        objective: 'Achieve 30-day streak',
        progress: Math.round((profile.currentStreak / 30) * 100)
      });
    }
    
    return objectives;
  }

  /**
   * Generate upcoming milestones
   */
  private generateUpcomingMilestones(profile: TCGPlayerProfile): Array<{
    milestone_level: number;
    milestone_reward: string;
    milestone_achievement: string;
    milestone_description: string;
  }> {
    const milestones = [];
    
    // Level milestones
    const nextLevelMilestone = Math.ceil(profile.level / 10) * 10;
    if (nextLevelMilestone > profile.level) {
      milestones.push({
        milestone_level: nextLevelMilestone,
        milestone_reward: 'Premium Pack + Theme Unlock',
        milestone_achievement: 'Level Master',
        milestone_description: `Reach level ${nextLevelMilestone}`
      });
    }
    
    // Collection milestones
    const nextCollectionMilestone = Math.ceil(profile.cardsCollected / 25) * 25;
    if (nextCollectionMilestone > profile.cardsCollected) {
      milestones.push({
        milestone_level: nextCollectionMilestone,
        milestone_reward: 'Collection Badge',
        milestone_achievement: 'Card Collector',
        milestone_description: `Collect ${nextCollectionMilestone} unique cards`
      });
    }
    
    return milestones;
  }

  /**
   * Generate weekly activity chart (ASCII)
   */
  private generateWeeklyActivityChart(): string {
    // Simplified ASCII chart
    return `
Mon ████████░░ 80%
Tue ██████░░░░ 60%
Wed ██████████ 100%
Thu ████░░░░░░ 40%
Fri ████████░░ 80%
Sat ██░░░░░░░░ 20%
Sun ██████░░░░ 60%
    `.trim();
  }

  /**
   * Generate avatar URL based on profile
   */
  private generateAvatarUrl(profile: TCGPlayerProfile): string {
    // Return a placeholder or generate based on theme/level
    return `https://via.placeholder.com/200x200/3b4cca/ffffff?text=${profile.characterName.charAt(0)}`;
  }

  /**
   * Generate personalized player notes
   */
  private generatePlayerNotes(profile: TCGPlayerProfile): string {
    const notes = [];
    
    if (profile.currentStreak > 10) {
      notes.push(`Impressive ${profile.currentStreak}-day streak! Keep up the momentum.`);
    }
    
    if (profile.cardsCollected > 50) {
      notes.push(`Excellent collection of ${profile.cardsCollected} cards!`);
    }
    
    if (profile.engagementLevel > 0.7) {
      notes.push('High engagement level shows dedication to learning!');
    }
    
    return notes.join('\n\n') || 'Keep exploring and collecting knowledge!';
  }

  /**
   * Ensure player cards directory exists
   */
  private async ensurePlayerCardsDirectory(): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(this.PLAYER_CARDS_FOLDER);
    if (!folder) {
      try {
        await this.app.vault.createFolder(this.PLAYER_CARDS_FOLDER);
        console.log(`📁 Created player cards directory: ${this.PLAYER_CARDS_FOLDER}`);
      } catch (error) {
        console.warn('Could not create player cards directory:', error);
      }
    }
  }

  /**
   * Start auto-update timer
   */
  private startAutoUpdate(): void {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
    }
    
    const intervalMs = this.settings.playerCardUpdateInterval * 60 * 1000; // Convert minutes to milliseconds
    
    this.autoUpdateTimer = setInterval(async () => {
      try {
        await this.generatePlayerCard({ forceUpdate: false });
      } catch (error) {
        console.warn('Auto-update player card failed:', error);
      }
    }, intervalMs);
    
    console.log(`🔄 Player card auto-update started (every ${this.settings.playerCardUpdateInterval} minutes)`);
  }

  /**
   * Stop auto-update timer
   */
  private stopAutoUpdate(): void {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
      this.autoUpdateTimer = null;
    }
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: TCGSettings): void {
    this.settings = newSettings;
    
    // Handle auto-update setting changes
    if (newSettings.autoUpdatePlayerCard) {
      this.startAutoUpdate();
    } else {
      this.stopAutoUpdate();
    }
  }

  /**
   * Get available player card templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    const templates = this.app.vault.getFiles()
      .filter(file => 
        file.path.includes('templates/') && 
        file.name.includes('player-card') &&
        file.extension === 'md'
      )
      .map(file => file.path);
    
    return templates;
  }

  /**
   * Export player card data
   */
  exportPlayerCardData(): any {
    const profile = this.playerManager.getPlayerProfile();
    const collectionSummary = this.playerManager.getCollectionSummary();
    const achievements = this.playerManager.getAllAchievements();
    
    return {
      profile,
      collection: collectionSummary,
      achievements: achievements.filter(a => a.unlockedAt.getTime() > 0),
      lastGenerated: this.lastGeneratedCard?.path,
      exportTimestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up and destroy manager
   */
  destroy(): void {
    this.stopAutoUpdate();
    this.templateCache.clear();
    console.log('🧹 Player card manager destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create player card manager instance
 */
export function createPlayerCardManager(
  app: App,
  settings: TCGSettings,
  playerManager: PlayerManager,
  themeManager: ThemeManager
): PlayerCardManager {
  return new PlayerCardManager(app, settings, playerManager, themeManager);
}

/**
 * Quick player card generation
 */
export async function generatePlayerCard(
  playerCardManager: PlayerCardManager,
  options: PlayerCardGenerationOptions = {}
): Promise<TFile | null> {
  return await playerCardManager.generatePlayerCard(options);
}