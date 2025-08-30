/**
 * CLIPPY TCG Writer - Pack Inventory Modal
 * Shows available packs with individual and batch opening options
 * Integrates with PlayerManager pack inventory system
 */

import { Modal, App, Setting, Notice, ButtonComponent } from 'obsidian';
import { PlayerPack } from '../core/player-manager';
import { PackSystem, PackOpeningResult } from '../core/pack-system';
import { FilePackSystem } from '../core/file-pack-system';
import { GameHistoryManager } from '../core/game-history-manager';

// ===== PACK INVENTORY INTERFACES =====

export interface PackInventoryModalOptions {
  playerManager: any; // PlayerManager instance
  packSystem: PackSystem;
  filePackSystem: FilePackSystem;
  gameHistoryManager?: GameHistoryManager;
}

// ===== PACK INVENTORY MODAL =====

/**
 * Modal for viewing and opening player's pack inventory
 */
export class PackInventoryModal extends Modal {
  private playerManager: any;
  private packSystem: PackSystem;
  private filePackSystem: FilePackSystem;
  private gameHistoryManager?: GameHistoryManager;
  
  // Modal state
  private availablePacks: PlayerPack[] = [];
  private isProcessing = false;
  
  // UI elements
  private packListContainer: HTMLElement | null = null;
  private summaryContainer: HTMLElement | null = null;
  private actionButtonsContainer: HTMLElement | null = null;

  constructor(app: App, options: PackInventoryModalOptions) {
    super(app);
    this.playerManager = options.playerManager;
    this.packSystem = options.packSystem;
    this.filePackSystem = options.filePackSystem;
    this.gameHistoryManager = options.gameHistoryManager;
    
    this.setupModal();
  }

  /**
   * Setup modal structure and styling
   */
  private setupModal(): void {
    this.titleEl.setText('📦 Pack Inventory');
    this.modalEl.addClass('clippy-pack-inventory-modal');
    
    // Add custom CSS
    this.addInventoryStyles();
    
    // Setup modal content
    this.contentEl.empty();
    this.setupModalContent();
  }

  /**
   * Add custom CSS styles for pack inventory
   */
  private addInventoryStyles(): void {
    const styleId = 'clippy-pack-inventory-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .clippy-pack-inventory-modal {
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
      }

      .pack-inventory-summary {
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        border: 1px solid var(--border-color);
      }

      .pack-inventory-summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }

      .pack-inventory-stat {
        text-align: center;
        padding: 8px;
        background: var(--background-primary);
        border-radius: 6px;
        border: 1px solid var(--border-color);
      }

      .pack-inventory-stat-value {
        font-size: 1.2em;
        font-weight: bold;
        color: var(--text-accent);
      }

      .pack-inventory-stat-label {
        font-size: 0.8em;
        opacity: 0.8;
        margin-top: 2px;
      }

      .pack-inventory-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--background-primary);
      }

      .pack-inventory-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        transition: background-color 0.2s;
      }

      .pack-inventory-item:last-child {
        border-bottom: none;
      }

      .pack-inventory-item:hover {
        background: var(--background-secondary);
      }

      .pack-inventory-item.opened {
        opacity: 0.6;
      }

      .pack-item-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        margin-right: 10px;
      }

      .pack-item-name {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .pack-item-details {
        font-size: 0.8em;
        opacity: 0.8;
        display: flex;
        gap: 12px;
      }

      .pack-item-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .pack-inventory-actions {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .pack-inventory-empty {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.6;
        font-style: italic;
      }

      .pack-rarity-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 6px;
      }

      .pack-rarity-common { background: #9e9e9e; }
      .pack-rarity-uncommon { background: #4caf50; }
      .pack-rarity-rare { background: #2196f3; }
      .pack-rarity-epic { background: #9c27b0; }
      .pack-rarity-legendary { background: #ff9800; }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup modal content structure
   */
  private setupModalContent(): void {
    // Summary section
    this.summaryContainer = this.contentEl.createDiv('pack-inventory-summary');
    
    // Pack list section
    this.packListContainer = this.contentEl.createDiv('pack-inventory-list');
    
    // Action buttons section
    this.actionButtonsContainer = this.contentEl.createDiv('pack-inventory-actions');
    
    // Load and display pack data
    this.refreshPackInventory();
  }

  /**
   * Refresh pack inventory data and update UI
   */
  private async refreshPackInventory(): Promise<void> {
    try {
      // Get available packs from player manager
      this.availablePacks = this.playerManager.getUnopenedPacks();
      
      console.log(`📦 Found ${this.availablePacks.length} available packs in inventory`);
      
      // Update UI sections
      this.updateSummary();
      this.updatePackList();
      this.updateActionButtons();
      
    } catch (error) {
      console.error('Failed to refresh pack inventory:', error);
      new Notice('Failed to load pack inventory');
    }
  }

  /**
   * Update summary section
   */
  private updateSummary(): void {
    if (!this.summaryContainer) return;
    
    this.summaryContainer.empty();
    
    // Title
    const title = this.summaryContainer.createEl('h3');
    title.textContent = 'Pack Inventory Summary';
    
    // Statistics
    const statsContainer = this.summaryContainer.createDiv('pack-inventory-summary-stats');
    
    const unopenedCount = this.availablePacks.length;
    const totalPacks = this.playerManager.getAvailablePacks().length;
    const openedCount = totalPacks - unopenedCount;
    
    // Group packs by type
    const packsByType: Record<string, number> = {};
    this.availablePacks.forEach(pack => {
      packsByType[pack.packType] = (packsByType[pack.packType] || 0) + 1;
    });
    
    // Create stat elements
    this.createStatElement(statsContainer, unopenedCount.toString(), 'Unopened');
    this.createStatElement(statsContainer, openedCount.toString(), 'Opened');
    this.createStatElement(statsContainer, totalPacks.toString(), 'Total');
    
    // Pack type breakdown
    Object.entries(packsByType).forEach(([type, count]) => {
      const displayName = this.getPackTypeDisplayName(type);
      this.createStatElement(statsContainer, count.toString(), displayName);
    });
  }

  /**
   * Create a stat element
   */
  private createStatElement(container: HTMLElement, value: string, label: string): void {
    const statEl = container.createDiv('pack-inventory-stat');
    
    const valueEl = statEl.createDiv('pack-inventory-stat-value');
    valueEl.textContent = value;
    
    const labelEl = statEl.createDiv('pack-inventory-stat-label');
    labelEl.textContent = label;
  }

  /**
   * Update pack list section
   */
  private updatePackList(): void {
    if (!this.packListContainer) return;
    
    this.packListContainer.empty();
    
    if (this.availablePacks.length === 0) {
      const emptyEl = this.packListContainer.createDiv('pack-inventory-empty');
      emptyEl.textContent = '📭 No packs available. Keep writing to earn more packs!';
      return;
    }
    
    // Sort packs by earned date (newest first)
    const sortedPacks = [...this.availablePacks].sort((a, b) => 
      b.earnedAt.getTime() - a.earnedAt.getTime()
    );
    
    // Create pack items
    sortedPacks.forEach(pack => this.createPackItem(pack));
  }

  /**
   * Create a pack item in the list
   */
  private createPackItem(pack: PlayerPack): void {
    if (!this.packListContainer) return;
    
    const itemEl = this.packListContainer.createDiv('pack-inventory-item');
    if (pack.opened) {
      itemEl.addClass('opened');
    }
    
    // Pack info section
    const infoEl = itemEl.createDiv('pack-item-info');
    
    const nameEl = infoEl.createDiv('pack-item-name');
    nameEl.textContent = pack.packName;
    
    const detailsEl = infoEl.createDiv('pack-item-details');
    detailsEl.innerHTML = `
      <span>📅 ${this.formatDate(pack.earnedAt)}</span>
      <span>🎯 ${this.formatEarnedBy(pack.earnedBy)}</span>
      <span>🃏 ${pack.totalCards} cards</span>
      ${pack.opened ? `<span>✅ Opened ${this.formatDate(pack.openedAt!)}</span>` : ''}
    `;
    
    // Actions section
    const actionsEl = itemEl.createDiv('pack-item-actions');
    
    if (!pack.opened) {
      // Open button
      const openBtn = new ButtonComponent(actionsEl);
      openBtn.setButtonText('Open Pack');
      openBtn.setCta();
      openBtn.onClick(() => this.openSinglePack(pack));
      
      // Quick view button
      const previewBtn = new ButtonComponent(actionsEl);
      previewBtn.setButtonText('Preview');
      previewBtn.onClick(() => this.previewPack(pack));
    } else {
      // Already opened indicator
      const openedEl = actionsEl.createSpan();
      openedEl.textContent = '✅ Opened';
      openedEl.style.opacity = '0.6';
    }
  }

  /**
   * Update action buttons section
   */
  private updateActionButtons(): void {
    if (!this.actionButtonsContainer) return;
    
    this.actionButtonsContainer.empty();
    
    const unopenedPacks = this.availablePacks.filter(pack => !pack.opened);
    
    if (unopenedPacks.length === 0) {
      return;
    }
    
    // Left side buttons
    const leftActions = this.actionButtonsContainer.createDiv();
    leftActions.style.display = 'flex';
    leftActions.style.gap = '10px';
    
    // Open All button
    if (unopenedPacks.length > 1) {
      const openAllBtn = new ButtonComponent(leftActions);
      openAllBtn.setButtonText(`Open All (${unopenedPacks.length})`);
      openAllBtn.setWarning();
      openAllBtn.onClick(() => this.openAllPacks());
    }
    
    // Refresh button
    const refreshBtn = new ButtonComponent(leftActions);
    refreshBtn.setButtonText('Refresh');
    refreshBtn.onClick(() => this.refreshPackInventory());
    
    // Right side info
    const rightInfo = this.actionButtonsContainer.createDiv();
    rightInfo.style.opacity = '0.8';
    rightInfo.style.fontSize = '0.9em';
    rightInfo.textContent = `${unopenedPacks.length} packs ready to open`;
  }

  /**
   * Open a single pack
   */
  private async openSinglePack(pack: PlayerPack): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      console.log(`📦 Opening pack: ${pack.packName} (${pack.packId})`);
      
      let packFile: any = null;
      
      // Check if this is a vault-based pack (has filePath)
      if (pack.filePath) {
        console.log(`📂 Opening existing vault pack at ${pack.filePath}`);
        
        // Open the existing pack file using its file path
        const cards = await this.filePackSystem.openPack(pack.filePath);
        
        // Get the pack file for display
        packFile = this.app.vault.getAbstractFileByPath(pack.filePath);
        
        console.log(`🎴 Opened pack with ${cards.length} cards`);
        
      } else {
        console.log(`🆕 Creating new pack file for pack type: ${pack.packType}`);
        
        // Create the physical pack file first (for in-memory packs)
        const generatedPack = await this.filePackSystem.generatePack(pack.packType, this.playerManager.getPlayerProfile().id);
        
        if (!generatedPack) {
          throw new Error('Failed to create pack file');
        }
        
        // Open the generated pack
        const cards = await this.filePackSystem.openPack(generatedPack.packId);
        
        // Get the pack file
        packFile = this.app.vault.getAbstractFileByPath(generatedPack.packFile);
        
        console.log(`🎴 Generated and opened pack with ${cards.length} cards`);
      }
      
      if (!packFile) {
        throw new Error('Failed to locate pack file');
      }
      
      // Mark pack as opened in player manager
      this.playerManager.markPackOpened(pack.packId);
      
      // Log the opening
      this.gameHistoryManager?.addEntry({
        eventType: 'pack_opened',
        severity: 'info',
        title: `Pack Opened: ${pack.packName}`,
        description: `Opened ${pack.packName} containing ${pack.totalCards} cards`,
        data: {
          packId: pack.packId,
          packType: pack.packType,
          packName: pack.packName,
          totalCards: pack.totalCards,
          earnedBy: pack.earnedBy,
          isVaultBased: !!pack.filePath
        },
        playerId: this.playerManager.getPlayerProfile().playerId,
        source: 'PackInventoryModal',
        tags: ['pack', 'opened', pack.packType]
      });
      
      // Open the pack file
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(packFile);
      
      new Notice(`📦 Opened ${pack.packName}! Check the new file in your vault.`);
      
      // Refresh the inventory
      await this.refreshPackInventory();
      
    } catch (error) {
      console.error('Failed to open pack:', error);
      new Notice(`❌ Failed to open ${pack.packName}: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Open all available packs
   */
  private async openAllPacks(): Promise<void> {
    if (this.isProcessing) return;
    
    const unopenedPacks = this.availablePacks.filter(pack => !pack.opened);
    if (unopenedPacks.length === 0) return;
    
    // Confirm action
    const confirmed = await this.confirmOpenAll(unopenedPacks.length);
    if (!confirmed) return;
    
    this.isProcessing = true;
    
    try {
      console.log(`📦 Opening ${unopenedPacks.length} packs...`);
      
      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      // Open packs sequentially to avoid overwhelming the system
      for (const pack of unopenedPacks) {
        try {
          let success = false;
          
          // Check if this is a vault-based pack (has filePath)
          if (pack.filePath) {
            // Open the existing pack file using its file path
            const cards = await this.filePackSystem.openPack(pack.filePath);
            success = cards.length > 0;
          } else {
            // Create the physical pack file first (for in-memory packs)
            const packFile = await this.filePackSystem.generatePack(pack.packType, this.playerManager.getPlayerProfile().id);
            
            if (packFile) {
              // Open the generated pack
              const cards = await this.filePackSystem.openPack(packFile.packId);
              success = cards.length > 0;
            }
          }
          
          if (success) {
            // Mark as opened
            this.playerManager.markPackOpened(pack.packId);
            results.success++;
            
            // Small delay between packs
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            results.failed++;
            results.errors.push(`Failed to open ${pack.packName}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${pack.packName}: ${error.message}`);
        }
      }
      
      // Log bulk opening
      this.gameHistoryManager?.addEntry({
        eventType: 'pack_opened',
        severity: 'info',
        title: `Bulk Pack Opening`,
        description: `Opened ${results.success} packs (${results.failed} failed)`,
        data: {
          totalPacks: unopenedPacks.length,
          successfulPacks: results.success,
          failedPacks: results.failed,
          errors: results.errors
        },
        playerId: this.playerManager.getPlayerProfile().playerId,
        source: 'PackInventoryModal',
        tags: ['pack', 'bulk-open', 'batch']
      });
      
      // Show results
      if (results.failed === 0) {
        new Notice(`🎉 Successfully opened all ${results.success} packs!`);
      } else {
        new Notice(`📦 Opened ${results.success} packs, ${results.failed} failed (check console for details)`);
        console.warn('Pack opening errors:', results.errors);
      }
      
      // Refresh the inventory
      await this.refreshPackInventory();
      
    } catch (error) {
      console.error('Failed to open all packs:', error);
      new Notice(`❌ Bulk pack opening failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Preview a pack (show details without opening)
   */
  private previewPack(pack: PlayerPack): void {
    const modal = new Modal(this.app);
    modal.titleEl.setText(`Preview: ${pack.packName}`);
    
    const content = modal.contentEl;
    content.innerHTML = `
      <div style="padding: 10px;">
        <p><strong>Pack Type:</strong> ${pack.packType}</p>
        <p><strong>Total Cards:</strong> ${pack.totalCards}</p>
        <p><strong>Earned:</strong> ${this.formatDate(pack.earnedAt)}</p>
        <p><strong>Earned By:</strong> ${this.formatEarnedBy(pack.earnedBy)}</p>
        ${pack.cost ? `<p><strong>Cost:</strong> ${pack.cost} EXP</p>` : ''}
        <p><strong>Pack ID:</strong> <code>${pack.packId}</code></p>
        
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="this.closest('.modal').remove()" 
                  style="padding: 8px 16px; margin-right: 10px;">Close</button>
        </div>
      </div>
    `;
    
    modal.open();
  }

  /**
   * Confirm opening all packs
   */
  private confirmOpenAll(count: number): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText('Confirm Open All Packs');
      
      const content = modal.contentEl;
      content.innerHTML = `
        <div style="padding: 10px; text-align: center;">
          <p>Are you sure you want to open all <strong>${count}</strong> packs?</p>
          <p style="opacity: 0.8; font-size: 0.9em;">This will create ${count} new files in your vault.</p>
          
          <div style="margin-top: 20px;">
            <button id="confirm-yes" 
                    style="padding: 8px 16px; margin-right: 10px; background: var(--interactive-accent); color: white;">
              Yes, Open All
            </button>
            <button id="confirm-no" 
                    style="padding: 8px 16px;">
              Cancel
            </button>
          </div>
        </div>
      `;
      
      content.querySelector('#confirm-yes')?.addEventListener('click', () => {
        modal.close();
        resolve(true);
      });
      
      content.querySelector('#confirm-no')?.addEventListener('click', () => {
        modal.close();
        resolve(false);
      });
      
      modal.open();
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Format earned by reason
   */
  private formatEarnedBy(earnedBy: string): string {
    const formats: Record<string, string> = {
      'level_up': 'Level Up',
      'milestone': 'Milestone',
      'purchase': 'Purchase',
      'achievement': 'Achievement',
      'daily_bonus': 'Daily Bonus'
    };
    return formats[earnedBy] || earnedBy;
  }

  /**
   * Get pack type display name
   */
  private getPackTypeDisplayName(packType: string): string {
    const names: Record<string, string> = {
      'starter-pack': 'Starter',
      'core-set': 'Core Set',
      'booster': 'Booster',
      'premium': 'Premium'
    };
    return names[packType] || packType;
  }

  /**
   * Modal cleanup
   */
  onClose(): void {
    // Clean up any resources
    const styleEl = document.getElementById('clippy-pack-inventory-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Open pack inventory modal
 */
export function openPackInventoryModal(
  app: App, 
  options: PackInventoryModalOptions
): void {
  const modal = new PackInventoryModal(app, options);
  modal.open();
}