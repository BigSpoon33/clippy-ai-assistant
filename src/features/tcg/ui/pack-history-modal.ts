/**
 * CLIPPY TCG Writer - Pack History Modal
 * Shows player's pack opening history with card details
 */

import { Modal, App, Setting, ButtonComponent, Notice, TFile } from 'obsidian';
import { PlayerPack } from '../core/player-manager';

// ===== PACK HISTORY INTERFACES =====

export interface PackHistoryModalOptions {
  playerManager: any; // PlayerManager instance
}

// ===== PACK HISTORY MODAL =====

/**
 * Modal for viewing player's pack opening history
 */
export class PackHistoryModal extends Modal {
  private playerManager: any;
  
  // Modal state
  private packHistory: any = null;
  
  // UI elements
  private historyContainer: HTMLElement | null = null;
  private summaryContainer: HTMLElement | null = null;

  constructor(app: App, options: PackHistoryModalOptions) {
    super(app);
    this.playerManager = options.playerManager;
    
    this.setupModal();
  }

  /**
   * Setup modal structure and styling
   */
  private setupModal(): void {
    this.titleEl.setText('📜 Pack History');
    this.modalEl.addClass('clippy-pack-history-modal');
    
    // Add custom CSS
    this.addHistoryStyles();
    
    // Setup modal content
    this.contentEl.empty();
    this.setupModalContent();
  }

  /**
   * Add custom CSS styles for pack history
   */
  private addHistoryStyles(): void {
    const styleId = 'clippy-pack-history-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .clippy-pack-history-modal {
        width: 700px;
        max-width: 95vw;
        max-height: 85vh;
      }

      .pack-history-summary {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        border: 1px solid var(--border-color);
      }

      .pack-history-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .pack-history-stat {
        text-align: center;
        padding: 10px;
        background: var(--background-primary);
        border-radius: 6px;
        border: 1px solid var(--border-color);
      }

      .pack-history-stat-value {
        font-size: 1.4em;
        font-weight: bold;
        color: var(--text-accent);
        display: block;
      }

      .pack-history-stat-label {
        font-size: 0.85em;
        color: var(--text-muted);
        margin-top: 2px;
      }

      .pack-history-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        border-radius: 8px;
      }

      .pack-history-item {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--background-primary);
        transition: background-color 0.2s ease;
      }

      .pack-history-item:last-child {
        border-bottom: none;
      }

      .pack-history-item:hover {
        background: var(--background-secondary);
      }

      .pack-history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .pack-history-name {
        font-weight: bold;
        color: var(--text-normal);
        font-size: 1.1em;
      }

      .pack-history-date {
        color: var(--text-muted);
        font-size: 0.9em;
      }

      .pack-history-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
        color: var(--text-muted);
        font-size: 0.9em;
      }

      .pack-history-detail {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pack-history-cards {
        margin-top: 12px;
        padding: 10px;
        background: var(--background-secondary);
        border-radius: 6px;
        font-family: var(--font-monospace);
        font-size: 0.85em;
      }

      .pack-history-cards-header {
        font-weight: bold;
        margin-bottom: 6px;
        color: var(--text-normal);
      }

      .pack-history-card-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .pack-history-card-chip {
        background: var(--background-primary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.8em;
        color: var(--text-muted);
      }

      .pack-history-empty {
        text-align: center;
        padding: 40px;
        color: var(--text-muted);
      }

      .pack-history-empty-icon {
        font-size: 3em;
        margin-bottom: 16px;
        display: block;
      }

      .pack-type-breakdown {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .pack-type-tag {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup modal content structure
   */
  private async setupModalContent(): Promise<void> {
    // Load pack history data
    this.packHistory = this.playerManager.getPackHistory();
    
    // Summary section
    this.summaryContainer = this.contentEl.createDiv('pack-history-summary');
    this.renderSummary();
    
    // History list section
    this.historyContainer = this.contentEl.createDiv('pack-history-container');
    this.renderHistory();
    
    // Action buttons
    this.setupActionButtons();
  }

  /**
   * Render pack history summary
   */
  private renderSummary(): void {
    if (!this.summaryContainer) return;
    
    this.summaryContainer.empty();
    
    // Title
    const title = this.summaryContainer.createEl('h3', { text: '📊 Pack Opening Statistics' });
    title.style.margin = '0 0 12px 0';
    
    // Stats grid
    const statsGrid = this.summaryContainer.createDiv('pack-history-stats');
    
    // Create stat displays
    this.createStatDisplay(statsGrid, this.packHistory.totalPacks.toString(), 'Total Packs Opened');
    this.createStatDisplay(statsGrid, this.packHistory.totalCards.toString(), 'Total Cards Acquired');
    
    if (this.packHistory.newestOpen) {
      const daysSinceLastOpen = Math.floor(
        (Date.now() - this.packHistory.newestOpen.getTime()) / (1000 * 60 * 60 * 24)
      );
      this.createStatDisplay(statsGrid, `${daysSinceLastOpen}d ago`, 'Last Pack Opened');
    }
    
    if (this.packHistory.oldestOpen && this.packHistory.newestOpen) {
      const totalDays = Math.floor(
        (this.packHistory.newestOpen.getTime() - this.packHistory.oldestOpen.getTime()) / (1000 * 60 * 60 * 24)
      );
      this.createStatDisplay(statsGrid, `${totalDays} days`, 'Opening Period');
    }
    
    // Pack type breakdown
    if (Object.keys(this.packHistory.packsByType).length > 0) {
      const breakdownContainer = this.summaryContainer.createDiv();
      breakdownContainer.createEl('h4', { text: 'Pack Types', attr: { style: 'margin: 16px 0 8px 0' } });
      
      const typeBreakdown = breakdownContainer.createDiv('pack-type-breakdown');
      for (const [packType, count] of Object.entries(this.packHistory.packsByType)) {
        const tag = typeBreakdown.createDiv('pack-type-tag');
        tag.setText(`${packType}: ${count}`);
      }
    }
  }

  /**
   * Create a stat display element
   */
  private createStatDisplay(container: HTMLElement, value: string, label: string): void {
    const statEl = container.createDiv('pack-history-stat');
    statEl.createSpan({ text: value, cls: 'pack-history-stat-value' });
    statEl.createDiv({ text: label, cls: 'pack-history-stat-label' });
  }

  /**
   * Render pack history list
   */
  private renderHistory(): void {
    if (!this.historyContainer) return;
    
    this.historyContainer.empty();
    
    // Title
    const title = this.historyContainer.createEl('h3', { text: '📜 Pack Opening History' });
    title.style.margin = '0 0 12px 0';
    
    if (this.packHistory.openedPacks.length === 0) {
      // Empty state
      const emptyContainer = this.historyContainer.createDiv('pack-history-empty');
      emptyContainer.createSpan({ text: '📦', cls: 'pack-history-empty-icon' });
      emptyContainer.createDiv({ text: 'No packs opened yet!' });
      emptyContainer.createDiv({ 
        text: 'Open some packs to see your history here.',
        attr: { style: 'margin-top: 8px; font-size: 0.9em;' }
      });
      return;
    }
    
    // Pack list
    const listContainer = this.historyContainer.createDiv('pack-history-list');
    
    for (const pack of this.packHistory.openedPacks) {
      this.renderPackHistoryItem(listContainer, pack);
    }
  }

  /**
   * Render individual pack history item
   */
  private renderPackHistoryItem(container: HTMLElement, pack: PlayerPack): void {
    const itemEl = container.createDiv('pack-history-item');
    
    // Header
    const header = itemEl.createDiv('pack-history-header');
    header.createDiv({ text: `📦 ${pack.packName}`, cls: 'pack-history-name' });
    
    if (pack.openedAt) {
      const dateStr = pack.openedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      header.createDiv({ text: dateStr, cls: 'pack-history-date' });
    }
    
    // Details
    const details = itemEl.createDiv('pack-history-details');
    
    details.createDiv('pack-history-detail').innerHTML = `<span>🎴</span> ${pack.totalCards} cards`;
    details.createDiv('pack-history-detail').innerHTML = `<span>📊</span> ${pack.packType}`;
    
    if (pack.earnedBy && pack.earnedBy !== 'daily_bonus') {
      const earnedByText = pack.earnedBy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      details.createDiv('pack-history-detail').innerHTML = `<span>🎯</span> ${earnedByText}`;
    }
    
    // Show cards if available
    if (pack.cards && pack.cards.length > 0) {
      const cardsContainer = itemEl.createDiv('pack-history-cards');
      cardsContainer.createDiv({ text: '🎴 Pack Contents:', cls: 'pack-history-cards-header' });
      
      const cardList = cardsContainer.createDiv('pack-history-card-list');
      for (const card of pack.cards) {
        const cardName = typeof card === 'string' ? card : (card.name || 'Unknown Card');
        cardList.createDiv({ text: cardName, cls: 'pack-history-card-chip' });
      }
    }
    
    // Click to view pack file
    if (pack.filePath) {
      itemEl.style.cursor = 'pointer';
      itemEl.title = 'Click to view pack file';
      itemEl.addEventListener('click', async () => {
        const file = this.app.vault.getAbstractFileByPath(pack.filePath!);
        if (file && file instanceof TFile) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
          this.close();
        } else {
          new Notice(`Pack file not found: ${pack.filePath}`);
        }
      });
    }
  }

  /**
   * Setup action buttons
   */
  private setupActionButtons(): void {
    const buttonContainer = this.contentEl.createDiv({ 
      cls: 'modal-button-container',
      attr: { style: 'margin-top: 20px; text-align: right;' }
    });
    
    // Refresh button
    new ButtonComponent(buttonContainer)
      .setButtonText('🔄 Refresh')
      .setTooltip('Refresh pack history')
      .onClick(async () => {
        await this.refreshHistory();
      });
    
    // Close button
    new ButtonComponent(buttonContainer)
      .setButtonText('Close')
      .onClick(() => this.close());
  }

  /**
   * Refresh pack history data
   */
  private async refreshHistory(): Promise<void> {
    this.packHistory = this.playerManager.getPackHistory();
    
    // Re-render components
    this.renderSummary();
    this.renderHistory();
    
    new Notice('📜 Pack history refreshed!');
  }

  /**
   * Called when modal is opened
   */
  onOpen(): void {
    // Focus on the modal for keyboard navigation
    this.modalEl.focus();
  }

  /**
   * Called when modal is closed
   */
  onClose(): void {
    // Cleanup
    this.contentEl.empty();
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Open pack history modal
 */
export function openPackHistoryModal(
  app: App,
  playerManager: any
): void {
  new PackHistoryModal(app, { playerManager }).open();
}