/**
 * CLIPPY TCG Writer - Settings UI Integration
 * Comprehensive settings interface for TCG system configuration
 * Following PRP specifications for complete user control and visibility
 */

import { App, PluginSettingTab, Setting, ButtonComponent, DropdownComponent } from 'obsidian';
import { TCGSettings, CardRarity, ProgressionFormula } from '../types';
import { PlayerManager } from '../core/player-manager';
import { ThemeManager } from '../themes/theme-system';
import { PackSystem } from '../core/pack-system';
import { AICommentarySystem } from '../ai/commentary-system';
import { NoteAnalyzer } from '../core/note-analyzer';

// ===== SETTINGS TAB INTERFACES =====

interface TCGSettingsTabConfig {
  app: App;
  settings: TCGSettings;
  playerManager: PlayerManager;
  themeManager: ThemeManager;
  packSystem: PackSystem;
  commentarySystem: AICommentarySystem;
  noteAnalyzer: NoteAnalyzer;
  onSettingsChanged: (settings: TCGSettings) => void;
}

interface SettingsSection {
  title: string;
  description: string;
  render: (containerEl: HTMLElement) => void;
}

// ===== MAIN SETTINGS TAB =====

/**
 * Comprehensive TCG settings interface integrated with Obsidian settings
 */
export class TCGSettingsTab extends PluginSettingTab {
  private settings: TCGSettings;
  private playerManager: PlayerManager;
  private themeManager: ThemeManager;
  private packSystem: PackSystem;
  private commentarySystem: AICommentarySystem;
  private noteAnalyzer: NoteAnalyzer;
  private onSettingsChanged: (settings: TCGSettings) => void;

  // UI State
  private currentSection: string = 'overview';
  private refreshInterval: number | null = null;

  constructor(config: TCGSettingsTabConfig) {
    super(config.app, config.app.plugins.getPlugin('clippy-ai-assistant') as any);
    
    this.settings = config.settings;
    this.playerManager = config.playerManager;
    this.themeManager = config.themeManager;
    this.packSystem = config.packSystem;
    this.commentarySystem = config.commentarySystem;
    this.noteAnalyzer = config.noteAnalyzer;
    this.onSettingsChanged = config.onSettingsChanged;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Add custom CSS for TCG settings
    this.addTCGSettingsCSS();

    // Create main container
    const mainContainer = containerEl.createDiv('tcg-settings-container');

    // Create navigation
    this.createNavigation(mainContainer);

    // Create content area
    const contentArea = mainContainer.createDiv('tcg-content-area');
    
    // Render current section
    this.renderSection(contentArea);

    // Start refresh interval for dynamic content
    this.startRefreshInterval();
  }

  /**
   * Add custom CSS for TCG settings UI
   */
  private addTCGSettingsCSS(): void {
    const styleId = 'tcg-settings-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .tcg-settings-container {
        display: flex;
        min-height: 600px;
        gap: 20px;
      }

      .tcg-navigation {
        min-width: 200px;
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 15px;
      }

      .tcg-nav-item {
        padding: 8px 12px;
        margin: 4px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tcg-nav-item:hover {
        background: var(--background-modifier-hover);
      }

      .tcg-nav-item.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .tcg-content-area {
        flex: 1;
        background: var(--background-primary);
        border-radius: 8px;
        padding: 20px;
        overflow-y: auto;
      }

      .tcg-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--background-modifier-border);
      }

      .tcg-section-title {
        font-size: 1.4em;
        font-weight: bold;
        color: var(--text-accent);
      }

      .tcg-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }

      .tcg-stat-card {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
      }

      .tcg-stat-value {
        font-size: 2em;
        font-weight: bold;
        color: var(--text-accent);
        display: block;
      }

      .tcg-stat-label {
        font-size: 0.9em;
        color: var(--text-muted);
        margin-top: 5px;
      }

      .tcg-progress-bar {
        width: 100%;
        height: 20px;
        background: var(--background-modifier-border);
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
      }

      .tcg-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--interactive-accent), var(--text-accent));
        transition: width 0.3s ease;
        border-radius: 10px;
      }

      .tcg-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }

      .tcg-mini-card {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        border: 2px solid var(--background-modifier-border);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tcg-mini-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }

      .tcg-mini-card.rarity-common { border-color: #8e8e8e; }
      .tcg-mini-card.rarity-uncommon { border-color: #4caf50; }
      .tcg-mini-card.rarity-rare { border-color: #2196f3; }
      .tcg-mini-card.rarity-epic { border-color: #9c27b0; }
      .tcg-mini-card.rarity-legendary { border-color: #ff9800; }

      .tcg-card-name {
        font-size: 0.8em;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .tcg-card-rarity {
        font-size: 0.7em;
        opacity: 0.8;
      }

      .tcg-achievement-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .tcg-achievement-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: var(--background-secondary);
        border-radius: 8px;
        border-left: 4px solid var(--interactive-accent);
      }

      .tcg-achievement-item.locked {
        opacity: 0.6;
        border-left-color: var(--text-muted);
      }

      .tcg-achievement-icon {
        font-size: 2em;
        min-width: 50px;
        text-align: center;
      }

      .tcg-achievement-content {
        flex: 1;
      }

      .tcg-achievement-name {
        font-weight: bold;
        color: var(--text-accent);
        margin-bottom: 5px;
      }

      .tcg-achievement-desc {
        font-size: 0.9em;
        color: var(--text-muted);
      }

      .tcg-theme-selector {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }

      .tcg-theme-card {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        border: 2px solid var(--background-modifier-border);
        transition: all 0.2s ease;
      }

      .tcg-theme-card:hover {
        border-color: var(--interactive-accent);
      }

      .tcg-theme-card.active {
        border-color: var(--text-accent);
        background: var(--interactive-accent-hover);
      }

      .tcg-theme-name {
        font-weight: bold;
        color: var(--text-accent);
        margin-bottom: 5px;
      }

      .tcg-theme-desc {
        font-size: 0.9em;
        color: var(--text-muted);
        margin-bottom: 10px;
      }

      .tcg-control-group {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 15px 0;
      }

      .tcg-export-area {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }

      .tcg-data-preview {
        background: var(--background-modifier-border);
        border-radius: 4px;
        padding: 10px;
        font-family: var(--font-monospace);
        font-size: 0.8em;
        max-height: 200px;
        overflow-y: auto;
        margin: 10px 0;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Create navigation sidebar
   */
  private createNavigation(container: HTMLElement): void {
    const nav = container.createDiv('tcg-navigation');
    
    const sections: Array<{id: string; title: string; icon: string}> = [
      { id: 'overview', title: 'Overview', icon: '📊' },
      { id: 'player', title: 'Player Profile', icon: '👤' },
      { id: 'collection', title: 'Card Collection', icon: '🎴' },
      { id: 'packs', title: 'Pack Management', icon: '📦' },
      { id: 'themes', title: 'Themes', icon: '🎨' },
      { id: 'achievements', title: 'Achievements', icon: '🏆' },
      { id: 'commentary', title: 'AI Commentary', icon: '🤖' },
      { id: 'progression', title: 'Progression', icon: '📈' },
      { id: 'analytics', title: 'Analytics', icon: '📋' },
      { id: 'data', title: 'Data & Export', icon: '💾' },
      { id: 'advanced', title: 'Advanced', icon: '⚙️' }
    ];

    sections.forEach(section => {
      const navItem = nav.createDiv('tcg-nav-item');
      if (section.id === this.currentSection) {
        navItem.addClass('active');
      }
      
      navItem.createSpan().setText(section.icon);
      navItem.createSpan().setText(section.title);
      
      navItem.addEventListener('click', () => {
        this.currentSection = section.id;
        this.display();
      });
    });
  }

  /**
   * Render the current section
   */
  private renderSection(contentArea: HTMLElement): void {
    contentArea.empty();

    switch (this.currentSection) {
      case 'overview':
        this.renderOverview(contentArea);
        break;
      case 'player':
        this.renderPlayerProfile(contentArea);
        break;
      case 'collection':
        this.renderCollection(contentArea);
        break;
      case 'packs':
        this.renderPackManagement(contentArea);
        break;
      case 'themes':
        this.renderThemes(contentArea);
        break;
      case 'achievements':
        this.renderAchievements(contentArea);
        break;
      case 'commentary':
        this.renderCommentary(contentArea);
        break;
      case 'progression':
        this.renderProgression(contentArea);
        break;
      case 'analytics':
        this.renderAnalytics(contentArea);
        break;
      case 'data':
        this.renderDataManagement(contentArea);
        break;
      case 'advanced':
        this.renderAdvanced(contentArea);
        break;
    }
  }

  /**
   * Render overview section
   */
  private renderOverview(container: HTMLElement): void {
    this.createSectionHeader(container, '📊', 'TCG Overview', 'Your knowledge gamification at a glance');

    // System status
    const statusContainer = container.createDiv();
    new Setting(statusContainer)
      .setName('TCG System Status')
      .setDesc('Enable or disable the Trading Card Game system')
      .addToggle(toggle => {
        toggle
          .setValue(this.settings.enabled)
          .onChange(async (value) => {
            this.settings.enabled = value;
            await this.saveSettings();
          });
      });

    if (this.settings.enabled) {
      // Quick stats
      const playerProfile = this.playerManager.getPlayerProfile();
      const collection = this.playerManager.getCollectionSummary();
      
      const statsGrid = container.createDiv('tcg-stats-grid');
      
      this.createStatCard(statsGrid, playerProfile.level.toString(), 'Level');
      this.createStatCard(statsGrid, playerProfile.currentEXP.toString(), 'Total EXP');
      this.createStatCard(statsGrid, collection.uniqueCards.toString(), 'Cards Collected');
      this.createStatCard(statsGrid, playerProfile.currentStreak.toString(), 'Day Streak');
      this.createStatCard(statsGrid, playerProfile.packsOpened.toString(), 'Packs Opened');
      this.createStatCard(statsGrid, collection.shinyCount.toString(), 'Shiny Cards');

      // Progress to next level
      const progressContainer = container.createDiv();
      progressContainer.createEl('h3', { text: 'Progress to Next Level' });
      
      const levelResult = this.playerManager.getPlayerProfile();
      const progressBar = progressContainer.createDiv('tcg-progress-bar');
      const progressFill = progressBar.createDiv('tcg-progress-fill');
      
      const progressPercent = ((levelResult.currentEXP - levelResult.expToNextLevel) / levelResult.expToNextLevel) * 100;
      progressFill.style.width = `${Math.max(progressPercent, 0)}%`;
      
      progressContainer.createEl('p', { 
        text: `${levelResult.expToNextLevel} EXP to next level` 
      });

      // Recent activity
      const recentContainer = container.createDiv();
      recentContainer.createEl('h3', { text: 'Recent Activity' });
      
      const achievements = this.playerManager.getUnlockedAchievements().slice(-3);
      if (achievements.length > 0) {
        achievements.forEach(achievement => {
          const achievementEl = recentContainer.createDiv('tcg-achievement-item');
          achievementEl.createSpan('tcg-achievement-icon').setText(achievement.icon);
          const contentEl = achievementEl.createDiv('tcg-achievement-content');
          contentEl.createDiv('tcg-achievement-name').setText(achievement.name);
          contentEl.createDiv('tcg-achievement-desc').setText(achievement.description);
        });
      } else {
        recentContainer.createEl('p', { 
          text: 'No achievements unlocked yet. Start writing to earn your first achievements!' 
        });
      }
    }
  }

  /**
   * Render player profile section
   */
  private renderPlayerProfile(container: HTMLElement): void {
    this.createSectionHeader(container, '👤', 'Player Profile', 'Customize your knowledge character');

    const profile = this.playerManager.getPlayerProfile();

    // Character name
    new Setting(container)
      .setName('Character Name')
      .setDesc('Your name in the knowledge realm')
      .addText(text => {
        text
          .setPlaceholder('Enter character name')
          .setValue(profile.characterName)
          .onChange(async (value) => {
            this.playerManager.updatePlayerProfile({ characterName: value });
            await this.saveSettings();
          });
      });

    // Player stats display
    const statsContainer = container.createDiv();
    statsContainer.createEl('h3', { text: 'Character Stats' });

    const statsGrid = statsContainer.createDiv('tcg-stats-grid');
    this.createStatCard(statsGrid, profile.stats.power.toString(), 'Power', '💪');
    this.createStatCard(statsGrid, profile.stats.creativity.toString(), 'Creativity', '🎨');
    this.createStatCard(statsGrid, profile.stats.consistency.toString(), 'Consistency', '🔥');
    this.createStatCard(statsGrid, profile.stats.knowledge.toString(), 'Knowledge', '🧠');

    // Preferences
    const prefsContainer = container.createDiv();
    prefsContainer.createEl('h3', { text: 'Preferences' });

    new Setting(prefsContainer)
      .setName('Auto-open Packs')
      .setDesc('Automatically open packs when earned')
      .addToggle(toggle => {
        toggle
          .setValue(profile.preferences.autoOpenPacks)
          .onChange(async (value) => {
            this.playerManager.updatePlayerProfile({
              preferences: { ...profile.preferences, autoOpenPacks: value }
            });
            await this.saveSettings();
          });
      });

    new Setting(prefsContainer)
      .setName('Particle Effects')
      .setDesc('Show visual effects during pack opening')
      .addToggle(toggle => {
        toggle
          .setValue(profile.preferences.showParticleEffects)
          .onChange(async (value) => {
            this.playerManager.updatePlayerProfile({
              preferences: { ...profile.preferences, showParticleEffects: value }
            });
            await this.saveSettings();
          });
      });

    new Setting(prefsContainer)
      .setName('Commentary Frequency')
      .setDesc('How often to show AI commentary')
      .addDropdown(dropdown => {
        dropdown
          .addOption('never', 'Never')
          .addOption('low', 'Low')
          .addOption('medium', 'Medium')
          .addOption('high', 'High')
          .setValue(profile.preferences.commentaryFrequency)
          .onChange(async (value) => {
            this.playerManager.updatePlayerProfile({
              preferences: { ...profile.preferences, commentaryFrequency: value as any }
            });
            await this.saveSettings();
          });
      });
  }

  /**
   * Render collection section
   */
  private renderCollection(container: HTMLElement): void {
    this.createSectionHeader(container, '🎴', 'Card Collection', 'View and manage your knowledge cards');

    const collection = this.playerManager.getCollectionSummary();
    const cards = this.playerManager.getAllCards().slice(0, 20); // Show first 20

    // Collection summary
    const summaryGrid = container.createDiv('tcg-stats-grid');
    this.createStatCard(summaryGrid, collection.uniqueCards.toString(), 'Unique Cards');
    this.createStatCard(summaryGrid, collection.duplicates.toString(), 'Duplicates');
    this.createStatCard(summaryGrid, collection.favoriteCount.toString(), 'Favorites');
    this.createStatCard(summaryGrid, collection.totalPowerLevel.toString(), 'Total Power');

    // Rarity distribution
    const rarityContainer = container.createDiv();
    rarityContainer.createEl('h3', { text: 'Collection by Rarity' });
    
    const rarityGrid = rarityContainer.createDiv('tcg-stats-grid');
    Object.entries(collection.rarityBreakdown).forEach(([rarity, count]) => {
      if (count > 0) {
        this.createStatCard(rarityGrid, count.toString(), rarity);
      }
    });

    // Recent cards preview
    if (cards.length > 0) {
      const cardsContainer = container.createDiv();
      cardsContainer.createEl('h3', { text: 'Recent Cards (Preview)' });

      const cardGrid = cardsContainer.createDiv('tcg-card-grid');
      cards.forEach(card => {
        const cardEl = cardGrid.createDiv(`tcg-mini-card rarity-${card.rarity.toLowerCase()}`);
        cardEl.createDiv('tcg-card-name').setText(card.name);
        cardEl.createDiv('tcg-card-rarity').setText(`${card.rarity} ${card.isShiny ? '✨' : ''}`);
        cardEl.createDiv().setText(`⚡ ${card.powerLevel}`);
        
        cardEl.addEventListener('click', () => {
          this.showCardDetails(card);
        });
      });
    }

    // Collection controls
    const controlsContainer = container.createDiv('tcg-control-group');
    
    const viewAllBtn = controlsContainer.createEl('button', { 
      text: 'View Full Collection',
      cls: 'mod-cta'
    });
    viewAllBtn.addEventListener('click', () => {
      // Would open full collection modal
      console.log('Opening full collection...');
    });

    const analyzeBtn = controlsContainer.createEl('button', { 
      text: 'Analyze Collection' 
    });
    analyzeBtn.addEventListener('click', () => {
      const analytics = this.playerManager.getCollectionAnalytics();
      console.log('Collection Analytics:', analytics);
    });
  }

  /**
   * Render pack management section
   */
  private renderPackManagement(container: HTMLElement): void {
    this.createSectionHeader(container, '📦', 'Pack Management', 'Purchase and manage your card packs');

    const inventory = this.packSystem.getInventory();
    const packDefinitions = this.packSystem.getAvailablePackDefinitions();

    // Available packs
    const availableContainer = container.createDiv();
    availableContainer.createEl('h3', { text: 'Available Packs' });

    if (inventory.availablePacks.size > 0) {
      Array.from(inventory.availablePacks.entries()).forEach(([packId, count]) => {
        const pack = packDefinitions.find(p => p.id === packId);
        if (pack && count > 0) {
          const packEl = availableContainer.createDiv('tcg-achievement-item');
          packEl.createSpan('tcg-achievement-icon').setText('📦');
          
          const contentEl = packEl.createDiv('tcg-achievement-content');
          contentEl.createDiv('tcg-achievement-name').setText(`${pack.name} (${count})`);
          contentEl.createDiv('tcg-achievement-desc').setText(pack.description);
          
          const openBtn = packEl.createEl('button', { 
            text: 'Open Pack',
            cls: 'mod-cta'
          });
          openBtn.addEventListener('click', async () => {
            // Would open pack opening modal
            console.log(`Opening ${packId}...`);
          });
        }
      });
    } else {
      availableContainer.createEl('p', { text: 'No packs available. Purchase packs to get started!' });
    }

    // Pack shop
    const shopContainer = container.createDiv();
    shopContainer.createEl('h3', { text: 'Pack Shop' });

    packDefinitions.forEach(pack => {
      const packEl = shopContainer.createDiv('tcg-theme-card');
      
      packEl.createDiv('tcg-theme-name').setText(pack.name);
      packEl.createDiv('tcg-theme-desc').setText(pack.description);
      
      const infoEl = packEl.createDiv();
      infoEl.createEl('p', { text: `${pack.cardCount} cards per pack` });
      infoEl.createEl('p', { text: `Cost: ${pack.costInEXP} EXP or ${pack.costInKeystrokes} keystrokes` });
      
      if (pack.levelRequired > 1) {
        infoEl.createEl('p', { 
          text: `Requires Level ${pack.levelRequired}`,
          cls: 'text-warning'
        });
      }
      
      const buyBtn = packEl.createEl('button', { 
        text: 'Purchase',
        cls: 'mod-cta'
      });
      buyBtn.addEventListener('click', () => {
        // Would open purchase confirmation
        console.log(`Purchasing ${pack.id}...`);
      });
    });

    // Pack statistics
    const statsContainer = container.createDiv();
    statsContainer.createEl('h3', { text: 'Pack Statistics' });

    const packStats = this.packSystem.getPackStatistics();
    const statsGrid = statsContainer.createDiv('tcg-stats-grid');
    
    this.createStatCard(statsGrid, packStats.totalPacksOpened.toString(), 'Packs Opened');
    this.createStatCard(statsGrid, packStats.totalCardsGenerated.toString(), 'Cards Generated');
    this.createStatCard(statsGrid, (packStats.shinyRate * 100).toFixed(1) + '%', 'Shiny Rate');
    this.createStatCard(statsGrid, Math.floor(packStats.averagePowerLevel).toString(), 'Avg Power');
  }

  /**
   * Render themes section
   */
  private renderThemes(container: HTMLElement): void {
    this.createSectionHeader(container, '🎨', 'Themes', 'Customize your card appearance and style');

    const activeTheme = this.themeManager.getActiveTheme();
    const availableThemes = this.themeManager.getAvailableThemes();

    // Current theme display
    const currentContainer = container.createDiv();
    currentContainer.createEl('h3', { text: 'Current Theme' });
    
    const currentThemeEl = currentContainer.createDiv('tcg-theme-card active');
    currentThemeEl.createDiv('tcg-theme-name').setText(activeTheme.name);
    currentThemeEl.createDiv('tcg-theme-desc').setText(activeTheme.description);
    currentThemeEl.createEl('p', { text: `Version ${activeTheme.version} by ${activeTheme.author}` });

    // Theme selector
    const selectorContainer = container.createDiv();
    selectorContainer.createEl('h3', { text: 'Available Themes' });
    
    const themeGrid = selectorContainer.createDiv('tcg-theme-selector');
    
    availableThemes.forEach(theme => {
      const themeEl = themeGrid.createDiv('tcg-theme-card');
      if (theme.id === activeTheme.id) {
        themeEl.addClass('active');
      }
      
      themeEl.createDiv('tcg-theme-name').setText(theme.name);
      themeEl.createDiv('tcg-theme-desc').setText(theme.description);
      
      const metaEl = themeEl.createDiv();
      metaEl.createEl('small', { text: `v${theme.version} • ${theme.packs.length} packs` });
      
      themeEl.addEventListener('click', async () => {
        if (this.themeManager.switchTheme(theme.id)) {
          this.settings.activeTheme = theme.id;
          await this.saveSettings();
          this.display(); // Refresh to show active theme
        }
      });
    });

    // Theme creation
    const creationContainer = container.createDiv();
    creationContainer.createEl('h3', { text: 'Create Custom Theme' });
    
    const createBtn = creationContainer.createEl('button', { 
      text: 'Create New Theme',
      cls: 'mod-cta'
    });
    createBtn.addEventListener('click', () => {
      // Would open theme creation modal
      console.log('Opening theme creation...');
    });
  }

  /**
   * Render achievements section
   */
  private renderAchievements(container: HTMLElement): void {
    this.createSectionHeader(container, '🏆', 'Achievements', 'Track your progress and milestones');

    const allAchievements = this.playerManager.getAllAchievements();
    const unlockedAchievements = this.playerManager.getUnlockedAchievements();

    // Achievement summary
    const summaryGrid = container.createDiv('tcg-stats-grid');
    this.createStatCard(summaryGrid, unlockedAchievements.length.toString(), 'Unlocked');
    this.createStatCard(summaryGrid, (allAchievements.length - unlockedAchievements.length).toString(), 'Remaining');
    this.createStatCard(summaryGrid, Math.floor((unlockedAchievements.length / allAchievements.length) * 100) + '%', 'Progress');

    // Achievement list
    const achievementsList = container.createDiv('tcg-achievement-list');
    
    allAchievements.forEach(achievement => {
      const isUnlocked = achievement.unlockedAt.getTime() > 0;
      const achievementEl = achievementsList.createDiv(`tcg-achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`);
      
      achievementEl.createSpan('tcg-achievement-icon').setText(achievement.icon);
      
      const contentEl = achievementEl.createDiv('tcg-achievement-content');
      contentEl.createDiv('tcg-achievement-name').setText(achievement.name);
      contentEl.createDiv('tcg-achievement-desc').setText(achievement.description);
      
      // Progress bar
      const progressContainer = contentEl.createDiv();
      const progressBar = progressContainer.createDiv('tcg-progress-bar');
      const progressFill = progressBar.createDiv('tcg-progress-fill');
      
      const progressPercent = (achievement.progress / achievement.maxProgress) * 100;
      progressFill.style.width = `${progressPercent}%`;
      
      progressContainer.createEl('small', { 
        text: `${achievement.progress}/${achievement.maxProgress}` 
      });
      
      if (isUnlocked) {
        contentEl.createEl('small', { 
          text: `Unlocked ${achievement.unlockedAt.toLocaleDateString()}` 
        });
      }
    });
  }

  /**
   * Render commentary section
   */
  private renderCommentary(container: HTMLElement): void {
    this.createSectionHeader(container, '🤖', 'AI Commentary', 'Configure intelligent writing assistance');

    // Commentary settings
    new Setting(container)
      .setName('Enable AI Commentary')
      .setDesc('Receive contextual feedback and encouragement while writing')
      .addToggle(toggle => {
        toggle
          .setValue(this.settings.enableAICommentary)
          .onChange(async (value) => {
            this.settings.enableAICommentary = value;
            await this.saveSettings();
          });
      });

    if (this.settings.enableAICommentary) {
      // Commentary frequency
      new Setting(container)
        .setName('Commentary Frequency')
        .setDesc('How often to receive AI commentary')
        .addDropdown(dropdown => {
          dropdown
            .addOption('never', 'Never')
            .addOption('low', 'Low (Major events only)')
            .addOption('medium', 'Medium (Balanced)')
            .addOption('high', 'High (Frequent feedback)')
            .setValue(this.playerManager.getPlayerProfile().preferences.commentaryFrequency)
            .onChange(async (value) => {
              const profile = this.playerManager.getPlayerProfile();
              this.playerManager.updatePlayerProfile({
                preferences: { ...profile.preferences, commentaryFrequency: value as any }
              });
              await this.saveSettings();
            });
        });

      // Commentary analytics
      const analytics = this.commentarySystem.getAnalytics();
      const analyticsContainer = container.createDiv();
      analyticsContainer.createEl('h3', { text: 'Commentary Statistics' });

      const analyticsGrid = analyticsContainer.createDiv('tcg-stats-grid');
      this.createStatCard(analyticsGrid, analytics.totalCommentaries.toString(), 'Total Comments');
      this.createStatCard(analyticsGrid, (analytics.averageConfidence * 100).toFixed(1) + '%', 'Avg Confidence');
      this.createStatCard(analyticsGrid, analytics.averageGenerationTime.toFixed(0) + 'ms', 'Generation Time');
      this.createStatCard(analyticsGrid, (analytics.feedbackStats.averageEffectiveness * 100).toFixed(1) + '%', 'Effectiveness');

      // Feedback distribution
      const feedbackContainer = container.createDiv();
      feedbackContainer.createEl('h3', { text: 'User Feedback Distribution' });

      const feedbackGrid = feedbackContainer.createDiv('tcg-stats-grid');
      this.createStatCard(feedbackGrid, analytics.feedbackStats.positive.toString(), 'Positive', '👍');
      this.createStatCard(feedbackGrid, analytics.feedbackStats.neutral.toString(), 'Neutral', '😐');
      this.createStatCard(feedbackGrid, analytics.feedbackStats.negative.toString(), 'Negative', '👎');
      this.createStatCard(feedbackGrid, analytics.feedbackStats.dismissed.toString(), 'Dismissed', '❌');
    }
  }

  /**
   * Render progression section
   */
  private renderProgression(container: HTMLElement): void {
    this.createSectionHeader(container, '📈', 'Progression', 'Configure experience and leveling');

    // Progression formula
    new Setting(container)
      .setName('Progression Formula')
      .setDesc('Choose how experience requirements scale with level')
      .addDropdown(dropdown => {
        dropdown
          .addOption('linear', 'Linear (Steady increase)')
          .addOption('exponential', 'Exponential (Increasing difficulty)')
          .addOption('logarithmic', 'Logarithmic (Easier at higher levels)')
          .addOption('custom', 'Custom (Manual configuration)')
          .setValue(this.settings.expFormula)
          .onChange(async (value) => {
            this.settings.expFormula = value as ProgressionFormula;
            await this.saveSettings();
          });
      });

    // Keystrokes per EXP
    new Setting(container)
      .setName('Keystrokes per EXP')
      .setDesc('How many keystrokes are needed to earn 1 EXP')
      .addSlider(slider => {
        slider
          .setLimits(100, 2000, 50)
          .setValue(this.settings.keystrokesPerEXP)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.keystrokesPerEXP = value;
            await this.saveSettings();
          });
      });

    // Custom formula parameters (if custom selected)
    if (this.settings.expFormula === 'custom') {
      new Setting(container)
        .setName('Base EXP')
        .setDesc('Starting EXP requirement')
        .addText(text => {
          text
            .setPlaceholder('100')
            .setValue(this.settings.customFormulaParams.base.toString())
            .onChange(async (value) => {
              const num = parseInt(value) || 100;
              this.settings.customFormulaParams.base = num;
              await this.saveSettings();
            });
        });

      new Setting(container)
        .setName('Exponent')
        .setDesc('Scaling factor (1.0-3.0)')
        .addSlider(slider => {
          slider
            .setLimits(1.0, 3.0, 0.1)
            .setValue(this.settings.customFormulaParams.exponent)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.settings.customFormulaParams.exponent = value;
              await this.saveSettings();
            });
        });
    }

    // Level preview
    const previewContainer = container.createDiv();
    previewContainer.createEl('h3', { text: 'Level Preview' });
    
    const previewBtn = previewContainer.createEl('button', { 
      text: 'Generate Level Chart' 
    });
    previewBtn.addEventListener('click', () => {
      // Would show progression chart
      console.log('Generating level preview...');
    });
  }

  /**
   * Render analytics section
   */
  private renderAnalytics(container: HTMLElement): void {
    this.createSectionHeader(container, '📋', 'Analytics', 'Detailed system performance and usage');

    const sessionStats = this.playerManager.getSessionStatistics();
    const tcgStats = this.playerManager.getTCGStatistics();

    // Session analytics
    const sessionContainer = container.createDiv();
    sessionContainer.createEl('h3', { text: 'Session Analytics' });

    const sessionGrid = sessionContainer.createDiv('tcg-stats-grid');
    this.createStatCard(sessionGrid, sessionStats.totalSessions.toString(), 'Total Sessions');
    this.createStatCard(sessionGrid, (sessionStats.averageSessionLength / (1000 * 60)).toFixed(1) + ' min', 'Avg Session Length');
    this.createStatCard(sessionGrid, sessionStats.totalKeystrokes.toString(), 'Total Keystrokes');
    this.createStatCard(sessionGrid, sessionStats.averageKPM.toFixed(1), 'Avg KPM');

    // Performance analytics
    const performanceContainer = container.createDiv();
    performanceContainer.createEl('h3', { text: 'System Performance' });
    
    const perfBtn = performanceContainer.createEl('button', { 
      text: 'Run Performance Test' 
    });
    perfBtn.addEventListener('click', () => {
      // Would run performance diagnostics
      console.log('Running performance test...');
    });

    // Usage patterns
    const usageContainer = container.createDiv();
    usageContainer.createEl('h3', { text: 'Usage Patterns' });
    
    const patternBtn = usageContainer.createEl('button', { 
      text: 'Analyze Usage Patterns' 
    });
    patternBtn.addEventListener('click', () => {
      // Would show usage pattern analysis
      console.log('Analyzing usage patterns...');
    });
  }

  /**
   * Render data management section
   */
  private renderDataManagement(container: HTMLElement): void {
    this.createSectionHeader(container, '💾', 'Data & Export', 'Manage your TCG data and exports');

    // Data export
    const exportContainer = container.createDiv('tcg-export-area');
    exportContainer.createEl('h3', { text: 'Data Export' });

    const exportPlayerBtn = exportContainer.createEl('button', { 
      text: 'Export Player Data',
      cls: 'mod-cta'
    });
    exportPlayerBtn.addEventListener('click', () => {
      const playerData = this.playerManager.exportPlayerData();
      this.showDataExport('Player Data', JSON.stringify(playerData, null, 2));
    });

    const exportTrainingBtn = exportContainer.createEl('button', { 
      text: 'Export Training Data' 
    });
    exportTrainingBtn.addEventListener('click', () => {
      const trainingData = this.commentarySystem.exportTrainingData();
      this.showDataExport('Training Data', JSON.stringify(trainingData, null, 2));
    });

    const exportSettingsBtn = exportContainer.createEl('button', { 
      text: 'Export Settings' 
    });
    exportSettingsBtn.addEventListener('click', () => {
      this.showDataExport('TCG Settings', JSON.stringify(this.settings, null, 2));
    });

    // Data import
    const importContainer = container.createDiv('tcg-export-area');
    importContainer.createEl('h3', { text: 'Data Import' });

    const importBtn = importContainer.createEl('button', { 
      text: 'Import Data' 
    });
    importBtn.addEventListener('click', () => {
      // Would open file picker or text area for import
      console.log('Opening data import...');
    });

    // Data management
    const managementContainer = container.createDiv();
    managementContainer.createEl('h3', { text: 'Data Management' });

    const clearDataBtn = managementContainer.createEl('button', { 
      text: 'Clear All Data',
      cls: 'mod-warning'
    });
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all TCG data? This cannot be undone.')) {
        // Would clear all data
        console.log('Clearing all data...');
      }
    });

    const resetProgressBtn = managementContainer.createEl('button', { 
      text: 'Reset Progress' 
    });
    resetProgressBtn.addEventListener('click', () => {
      if (confirm('Reset progress while keeping cards? This will reset level and achievements.')) {
        // Would reset progress only
        console.log('Resetting progress...');
      }
    });
  }

  /**
   * Render advanced settings section
   */
  private renderAdvanced(container: HTMLElement): void {
    this.createSectionHeader(container, '⚙️', 'Advanced Settings', 'Technical configuration and debugging');

    // Debug mode
    new Setting(container)
      .setName('Debug Mode')
      .setDesc('Enable debug logging and additional information')
      .addToggle(toggle => {
        toggle
          .setValue(this.settings.enableDebugMode)
          .onChange(async (value) => {
            this.settings.enableDebugMode = value;
            await this.saveSettings();
          });
      });

    // Performance mode
    new Setting(container)
      .setName('Performance Mode')
      .setDesc('Reduce visual effects for better performance')
      .addToggle(toggle => {
        toggle
          .setValue(this.settings.performanceMode)
          .onChange(async (value) => {
            this.settings.performanceMode = value;
            await this.saveSettings();
          });
      });

    // Data retention
    new Setting(container)
      .setName('Data Retention (Days)')
      .setDesc('How long to keep detailed analytics data')
      .addSlider(slider => {
        slider
          .setLimits(30, 730, 30)
          .setValue(this.settings.dataRetentionDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.dataRetentionDays = value;
            await this.saveSettings();
          });
      });

    // RNG seed
    new Setting(container)
      .setName('RNG Seed (for testing)')
      .setDesc('Set a specific seed for reproducible randomness')
      .addText(text => {
        text
          .setPlaceholder('Leave empty for true randomness')
          .setValue(this.settings.rngSeed || '')
          .onChange(async (value) => {
            this.settings.rngSeed = value || undefined;
            await this.saveSettings();
          });
      });

    // System diagnostics
    const diagnosticsContainer = container.createDiv();
    diagnosticsContainer.createEl('h3', { text: 'System Diagnostics' });

    const runDiagnosticsBtn = diagnosticsContainer.createEl('button', { 
      text: 'Run Diagnostics' 
    });
    runDiagnosticsBtn.addEventListener('click', () => {
      // Would run system diagnostics
      console.log('Running system diagnostics...');
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Create section header
   */
  private createSectionHeader(container: HTMLElement, icon: string, title: string, description: string): void {
    const header = container.createDiv('tcg-section-header');
    header.createSpan().setText(icon);
    header.createDiv('tcg-section-title').setText(title);
    
    if (description) {
      container.createEl('p', { text: description, cls: 'setting-item-description' });
    }
  }

  /**
   * Create stat card
   */
  private createStatCard(container: HTMLElement, value: string, label: string, icon?: string): void {
    const card = container.createDiv('tcg-stat-card');
    
    if (icon) {
      card.createSpan().setText(icon);
    }
    
    card.createSpan('tcg-stat-value').setText(value);
    card.createDiv('tcg-stat-label').setText(label);
  }

  /**
   * Show card details modal
   */
  private showCardDetails(card: any): void {
    // Would open detailed card view
    console.log('Showing card details:', card);
  }

  /**
   * Show data export modal
   */
  private showDataExport(title: string, data: string): void {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const content = modal.createDiv();
    content.style.backgroundColor = 'var(--background-primary)';
    content.style.padding = '20px';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '80%';
    content.style.maxHeight = '80%';
    content.style.overflow = 'auto';

    content.createEl('h2', { text: title });
    
    const dataEl = content.createEl('pre', { cls: 'tcg-data-preview' });
    dataEl.textContent = data;
    
    const closeBtn = content.createEl('button', { 
      text: 'Close',
      cls: 'mod-cta'
    });
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    document.body.appendChild(modal);
  }

  /**
   * Start refresh interval for dynamic content
   */
  private startRefreshInterval(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = window.setInterval(() => {
      // Only refresh if showing dynamic sections
      if (['overview', 'player', 'collection'].includes(this.currentSection)) {
        this.renderSection(document.querySelector('.tcg-content-area') as HTMLElement);
      }
    }, 10000); // Refresh every 10 seconds
  }

  /**
   * Save settings
   */
  private async saveSettings(): Promise<void> {
    await this.onSettingsChanged(this.settings);
  }

  /**
   * Clean up when closing settings
   */
  hide(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Remove custom CSS
    const style = document.getElementById('tcg-settings-styles');
    if (style) {
      style.remove();
    }
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create TCG settings tab
 */
export function createTCGSettingsTab(
  app: App,
  settings: TCGSettings,
  managers: {
    playerManager: PlayerManager;
    themeManager: ThemeManager;
    packSystem: PackSystem;
    commentarySystem: AICommentarySystem;
    noteAnalyzer: NoteAnalyzer;
  },
  onSettingsChanged: (settings: TCGSettings) => void
): TCGSettingsTab {
  return new TCGSettingsTab({
    app,
    settings,
    ...managers,
    onSettingsChanged
  });
}