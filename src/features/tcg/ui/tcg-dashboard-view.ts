/**
 * CLIPPY TCG Dashboard - Sidebar View
 * Persistent dashboard that can live in the sidebar while working
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PlayerManager } from '../core/player-manager';

export const VIEW_TYPE_TCG_DASHBOARD = 'tcg-dashboard';

export class TCGDashboardView extends ItemView {
  private playerManager: PlayerManager | null = null;
  private refreshInterval: number | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_TCG_DASHBOARD;
  }

  getDisplayText(): string {
    return '🎮 TCG Dashboard';
  }

  getIcon(): string {
    return 'gamepad-2';
  }

  /**
   * Set the player manager for data access
   */
  setPlayerManager(playerManager: PlayerManager): void {
    this.playerManager = playerManager;
    this.refresh();
  }

  async onOpen(): Promise<void> {
    this.refresh();
    
    // Auto-refresh every 5 seconds
    this.refreshInterval = window.setInterval(() => {
      this.refresh();
    }, 5000);
  }

  async onClose(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh the dashboard content
   */
  public refresh(): void {
    const container = this.containerEl.children[1];
    container.empty();
    
    if (!this.playerManager) {
      container.createEl('div', { 
        text: 'TCG System not initialized',
        cls: 'tcg-dashboard-error'
      });
      return;
    }

    try {
      const profile = this.playerManager.getPlayerProfile();
      const collection = this.playerManager.getCollectionSummary();

      // Header
      const header = container.createDiv('tcg-dashboard-header');
      header.createEl('h2', { text: '🎮 TCG Dashboard' });

      // Player Stats Section
      const playerSection = container.createDiv('tcg-dashboard-section');
      playerSection.createEl('h3', { text: '👤 Player Profile' });
      
      const playerStats = playerSection.createDiv('tcg-stats-grid');
      
      this.createStatItem(playerStats, '🏷️ Name', profile.characterName);
      this.createStatItem(playerStats, '⭐ Level', profile.level.toString());
      this.createStatItem(playerStats, '⚡ EXP', profile.currentEXP.toString());
      this.createStatItem(playerStats, '🎯 To Next', profile.expToNextLevel.toString());
      this.createStatItem(playerStats, '⌨️ Keystrokes', profile.totalKeystrokes.toLocaleString());

      // Collection Section
      const collectionSection = container.createDiv('tcg-dashboard-section');
      collectionSection.createEl('h3', { text: '🎴 Card Collection' });
      
      const collectionStats = collectionSection.createDiv('tcg-stats-grid');
      
      this.createStatItem(collectionStats, '📊 Total', collection.totalCards.toString());
      this.createStatItem(collectionStats, '🆕 Unique', collection.uniqueCards.toString());
      this.createStatItem(collectionStats, '✨ Shiny', collection.shinyCount.toString());
      this.createStatItem(collectionStats, '📦 Available', this.playerManager.getUnopenedPacks().length.toString());
      this.createStatItem(collectionStats, '📂 Opened', profile.packsOpened.toString());

      // Quick Actions
      const actionsSection = container.createDiv('tcg-dashboard-section');
      actionsSection.createEl('h3', { text: '⚡ Quick Actions' });
      
      const actionsGrid = actionsSection.createDiv('tcg-actions-grid');
      
      // Open Pack button
      const openPackBtn = actionsGrid.createEl('button', { 
        text: '📦 Open Pack',
        cls: 'tcg-action-btn'
      });
      openPackBtn.onclick = () => {
        (this.app as any).commands?.executeCommandById('clippy-ai-assistant:tcg-open-pack');
      };

      // Generate Commentary button
      const commentaryBtn = actionsGrid.createEl('button', { 
        text: '💬 Commentary',
        cls: 'tcg-action-btn'
      });
      commentaryBtn.onclick = () => {
        (this.app as any).commands?.executeCommandById('clippy-ai-assistant:tcg-generate-commentary');
      };

      // Pack History button
      const historyBtn = actionsGrid.createEl('button', { 
        text: '📜 Pack History',
        cls: 'tcg-action-btn'
      });
      historyBtn.onclick = () => {
        (this.app as any).commands?.executeCommandById('clippy-ai-assistant:tcg-pack-history');
      };

      // Add basic styling
      this.addDashboardStyles();

    } catch (error) {
      console.error('🎯 Dashboard refresh error:', error);
      container.createEl('div', { 
        text: 'Error loading dashboard: ' + error.message,
        cls: 'tcg-dashboard-error'
      });
    }
  }

  /**
   * Create a stat item with label and value
   */
  private createStatItem(parent: HTMLElement, label: string, value: string): void {
    const item = parent.createDiv('tcg-stat-item');
    item.createSpan('tcg-stat-label').setText(label);
    item.createSpan('tcg-stat-value').setText(value);
  }

  /**
   * Add basic styling to the dashboard
   */
  private addDashboardStyles(): void {
    if (document.querySelector('#tcg-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'tcg-dashboard-styles';
    style.textContent = `
      .tcg-dashboard-section {
        margin: 15px 0;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
      }
      
      .tcg-stats-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      
      .tcg-stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        background: var(--background-secondary);
        border-radius: 4px;
      }
      
      .tcg-stat-label {
        font-weight: 500;
        color: var(--text-muted);
      }
      
      .tcg-stat-value {
        font-weight: bold;
        color: var(--text-normal);
      }
      
      .tcg-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      
      .tcg-action-btn {
        padding: 8px 12px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: opacity 0.2s;
      }
      
      .tcg-action-btn:hover {
        opacity: 0.8;
      }
      
      .tcg-dashboard-error {
        color: var(--text-error);
        text-align: center;
        padding: 20px;
      }
    `;
    document.head.appendChild(style);
  }
}