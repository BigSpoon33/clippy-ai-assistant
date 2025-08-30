/**
 * CLIPPY TCG Writer - Pack Opening Modal
 * Interactive modal with animations for pack opening experience  
 * Following PRP specifications for engaging visual effects and user interaction
 */

import { Modal, App, Setting, Notice } from 'obsidian';
import { TCGCard, TCGPack, CardRarity } from '../types';
import { PackSystem, PackOpeningResult } from '../core/pack-system';

// ===== ANIMATION CONFIGURATION =====

interface AnimationConfig {
  packScale: { min: number; max: number };
  cardRevealDelay: number;
  rarityParticleCounts: Record<CardRarity, number>;
  shinyEffectIntensity: number;
  soundEnabled: boolean;
}

interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// ===== PACK OPENING MODAL =====

/**
 * Interactive modal for pack opening with animations and visual effects
 * Provides an engaging experience for revealing cards
 */
export class PackOpeningModal extends Modal {
  private packSystem: PackSystem;
  private packId: string;
  private animationConfig: AnimationConfig;
  
  // Modal state
  private isOpening: boolean = false;
  private currentResult: PackOpeningResult | null = null;
  private revealedCards: TCGCard[] = [];
  private currentCardIndex: number = 0;
  
  // Animation elements
  private packElement: HTMLElement | null = null;
  private cardContainer: HTMLElement | null = null;
  private particleCanvas: HTMLCanvasElement | null = null;
  private particleContext: CanvasRenderingContext2D | null = null;
  private particles: ParticleEffect[] = [];
  private animationFrame: number | null = null;

  constructor(app: App, packSystem: PackSystem, packId: string) {
    super(app);
    this.packSystem = packSystem;
    this.packId = packId;
    
    this.animationConfig = {
      packScale: { min: 0.8, max: 1.2 },
      cardRevealDelay: 800,
      rarityParticleCounts: {
        'Common': 10,
        'Uncommon': 20,
        'Rare': 35,
        'Epic': 50,
        'Legendary': 100
      },
      shinyEffectIntensity: 2.0,
      soundEnabled: true
    };
    
    this.setupModal();
  }

  /**
   * Setup modal structure and styling
   */
  private setupModal(): void {
    this.titleEl.setText('Pack Opening Experience');
    this.modalEl.addClass('clippy-pack-opening-modal');
    
    // Add custom CSS for pack opening
    this.addPackOpeningStyles();
    
    // Setup modal content
    this.contentEl.empty();
    this.setupModalContent();
  }

  /**
   * Add custom CSS styles for pack opening animations
   */
  private addPackOpeningStyles(): void {
    const styleId = 'clippy-pack-opening-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .clippy-pack-opening-modal {
        width: 900px;
        height: 600px;
        background: linear-gradient(135deg, #1e1e2f 0%, #2d2d42 100%);
        border-radius: 15px;
        border: 2px solid #4a4a6a;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      }

      .pack-opening-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .pack-display {
        position: relative;
        width: 200px;
        height: 280px;
        margin-bottom: 30px;
        cursor: pointer;
        transition: all 0.3s ease;
        transform-style: preserve-3d;
      }

      .pack-display:hover {
        transform: scale(1.05) rotateY(5deg);
      }

      .pack-display.opening {
        animation: packShake 0.5s ease-in-out infinite alternate;
      }

      .pack-display.opened {
        animation: packExplode 0.8s ease-out forwards;
      }

      @keyframes packShake {
        0% { transform: translateX(0px) rotate(0deg); }
        25% { transform: translateX(-2px) rotate(-1deg); }
        50% { transform: translateX(2px) rotate(1deg); }
        75% { transform: translateX(-1px) rotate(-0.5deg); }
        100% { transform: translateX(1px) rotate(0.5deg); }
      }

      @keyframes packExplode {
        0% { transform: scale(1) rotate(0deg); opacity: 1; }
        50% { transform: scale(1.3) rotate(180deg); opacity: 0.7; }
        100% { transform: scale(0) rotate(360deg); opacity: 0; }
      }

      .pack-image {
        width: 100%;
        height: 100%;
        background: linear-gradient(145deg, #4a90e2 0%, #357abd 100%);
        border-radius: 15px;
        border: 3px solid #2c5f8f;
        box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      .pack-image::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
        animation: packGlimmer 3s ease-in-out infinite;
      }

      @keyframes packGlimmer {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
      }

      .pack-name {
        color: white;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        margin-bottom: 10px;
        z-index: 1;
      }

      .pack-icon {
        font-size: 48px;
        z-index: 1;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
      }

      .card-reveal-area {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 15px;
        width: 100%;
        max-width: 800px;
        min-height: 200px;
        padding: 20px;
      }

      .revealed-card {
        width: 120px;
        height: 168px;
        position: relative;
        border-radius: 8px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        transform: scale(0);
        animation: cardReveal 0.6s ease-out forwards;
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .revealed-card:hover {
        transform: scale(1.1);
      }

      @keyframes cardReveal {
        0% { 
          transform: scale(0) rotateY(180deg); 
          opacity: 0; 
        }
        50% { 
          transform: scale(1.2) rotateY(90deg); 
          opacity: 0.7; 
        }
        100% { 
          transform: scale(1) rotateY(0deg); 
          opacity: 1; 
        }
      }

      .card-common { background: linear-gradient(145deg, #8e8e8e 0%, #6a6a6a 100%); border: 2px solid #5a5a5a; }
      .card-uncommon { background: linear-gradient(145deg, #4caf50 0%, #388e3c 100%); border: 2px solid #2e7d32; }
      .card-rare { background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%); border: 2px solid #1565c0; }
      .card-epic { background: linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%); border: 2px solid #6a1b9a; }
      .card-legendary { background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%); border: 2px solid #ef6c00; }

      .card-shiny {
        position: relative;
        animation: shinyPulse 2s ease-in-out infinite;
      }

      .card-shiny::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, #ffd700, #fff, #ffd700, #fff);
        border-radius: 10px;
        z-index: -1;
        animation: shinyBorder 1.5s linear infinite;
      }

      @keyframes shinyPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        50% { box-shadow: 0 0 40px rgba(255, 215, 0, 1); }
      }

      @keyframes shinyBorder {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }

      .card-content {
        padding: 10px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      }

      .card-name {
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        line-height: 1.2;
        margin-bottom: 5px;
      }

      .card-rarity {
        font-size: 10px;
        text-align: center;
        opacity: 0.9;
      }

      .card-power {
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin-top: auto;
        background: rgba(0,0,0,0.3);
        border-radius: 4px;
        padding: 2px 4px;
      }

      .pack-info {
        text-align: center;
        color: #ffffff;
        margin-bottom: 20px;
      }

      .pack-info h3 {
        color: #4a90e2;
        margin-bottom: 10px;
      }

      .open-pack-button {
        background: linear-gradient(145deg, #4a90e2 0%, #357abd 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        margin-top: 20px;
      }

      .open-pack-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.3);
      }

      .open-pack-button:active {
        transform: translateY(0px);
      }

      .open-pack-button:disabled {
        background: #666;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .particle-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      }

      .pack-summary {
        text-align: center;
        color: #ffffff;
        padding: 20px;
        background: rgba(0,0,0,0.2);
        border-radius: 10px;
        margin-top: 20px;
      }

      .summary-stats {
        display: flex;
        justify-content: space-around;
        margin-top: 15px;
      }

      .stat-item {
        text-align: center;
      }

      .stat-value {
        font-size: 20px;
        font-weight: bold;
        color: #4a90e2;
      }

      .stat-label {
        font-size: 12px;
        opacity: 0.8;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Setup modal content structure
   */
  private setupModalContent(): void {
    const container = this.contentEl.createDiv('pack-opening-container');

    // Get pack definition for display
    const packDefinitions = this.packSystem.getAvailablePackDefinitions();
    const pack = packDefinitions.find(p => p.id === this.packId);
    
    if (!pack) {
      container.createEl('p', { text: 'Pack not found!' });
      return;
    }

    // Pack info section
    const packInfo = container.createDiv('pack-info');
    packInfo.createEl('h3', { text: pack.name });
    packInfo.createEl('p', { text: pack.description });

    // Pack display
    this.packElement = container.createDiv('pack-display');
    const packImage = this.packElement.createDiv('pack-image');
    packImage.createDiv('pack-name').setText(pack.name);
    packImage.createDiv('pack-icon').setText('📦');

    // Particle canvas for effects
    this.particleCanvas = container.createEl('canvas', { cls: 'particle-canvas' });
    this.particleContext = this.particleCanvas.getContext('2d');
    this.resizeCanvas();

    // Card reveal area
    this.cardContainer = container.createDiv('card-reveal-area');

    // Open pack button
    const openButton = container.createEl('button', {
      cls: 'open-pack-button',
      text: `Open ${pack.name}`
    });

    openButton.addEventListener('click', () => this.openPack());

    // Setup event listeners
    this.setupEventListeners();

    // Resize canvas when window resizes
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Setup event listeners for interactions
   */
  private setupEventListeners(): void {
    if (this.packElement) {
      this.packElement.addEventListener('click', () => {
        if (!this.isOpening) {
          this.openPack();
        }
      });
    }
  }

  /**
   * Resize particle canvas to fit container
   */
  private resizeCanvas(): void {
    if (this.particleCanvas && this.contentEl) {
      const rect = this.contentEl.getBoundingClientRect();
      this.particleCanvas.width = rect.width;
      this.particleCanvas.height = rect.height;
    }
  }

  /**
   * Open pack and start animation sequence
   */
  private async openPack(): Promise<void> {
    if (this.isOpening) return;

    this.isOpening = true;

    // Add opening animation class
    this.packElement?.addClass('opening');

    try {
      // Simulate opening delay
      await this.delay(500);

      // Call pack system to open pack
      const result = await this.packSystem.openPack(this.packId);
      
      if (!result) {
        throw new Error('Failed to open pack');
      }

      this.currentResult = result;

      // Start pack explosion animation
      this.packElement?.removeClass('opening');
      this.packElement?.addClass('opened');

      // Create particle explosion
      this.createPackExplosion();

      // Start revealing cards
      await this.delay(800);
      await this.revealCards(result.cards);

      // Show pack summary
      this.showPackSummary(result);

    } catch (error) {
      console.error('Pack opening failed:', error);
      this.showError('Failed to open pack. Please try again.');
    } finally {
      this.isOpening = false;
    }
  }

  /**
   * Create particle explosion effect when pack opens
   */
  private createPackExplosion(): void {
    if (!this.particleCanvas || !this.particleContext) return;

    const centerX = this.particleCanvas.width / 2;
    const centerY = this.particleCanvas.height / 2 - 50;

    // Create explosion particles
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const velocity = 3 + Math.random() * 4;
      
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        life: 1.0,
        color: `hsl(${Math.random() * 60 + 200}, 70%, 60%)`,
        size: Math.random() * 6 + 2
      });
    }

    this.startParticleAnimation();
  }

  /**
   * Start particle animation loop
   */
  private startParticleAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const animate = () => {
      if (!this.particleContext || !this.particleCanvas) return;

      // Clear canvas
      this.particleContext.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);

      // Update and draw particles
      this.particles = this.particles.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        
        // Update life
        particle.life -= 0.02;
        
        // Draw particle
        if (particle.life > 0) {
          this.particleContext!.save();
          this.particleContext!.globalAlpha = particle.life;
          this.particleContext!.fillStyle = particle.color;
          this.particleContext!.beginPath();
          this.particleContext!.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.particleContext!.fill();
          this.particleContext!.restore();
          
          return true;
        }
        return false;
      });

      // Continue animation if particles exist
      if (this.particles.length > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Reveal cards one by one with animations
   */
  private async revealCards(cards: TCGCard[]): Promise<void> {
    this.revealedCards = [];
    this.currentCardIndex = 0;

    for (let i = 0; i < cards.length; i++) {
      await this.delay(this.animationConfig.cardRevealDelay);
      await this.revealCard(cards[i], i);
      this.revealedCards.push(cards[i]);
      this.currentCardIndex++;
    }
  }

  /**
   * Reveal a single card with animation
   */
  private async revealCard(card: TCGCard, index: number): Promise<void> {
    if (!this.cardContainer) return;

    const cardElement = this.cardContainer.createDiv('revealed-card');
    
    // Add rarity class
    cardElement.addClass(`card-${card.rarity.toLowerCase()}`);
    
    // Add shiny effect if applicable
    if (card.isShiny) {
      cardElement.addClass('card-shiny');
    }

    // Card content
    const content = cardElement.createDiv('card-content');
    content.createDiv('card-name').setText(card.name);
    content.createDiv('card-rarity').setText(card.rarity + (card.isShiny ? ' ✨' : ''));
    content.createDiv('card-power').setText(`⚡ ${card.powerLevel}`);

    // Add click handler for card details
    cardElement.addEventListener('click', () => {
      this.showCardDetails(card);
    });

    // Create rarity-specific particle effects
    this.createCardParticles(card, cardElement);

    // Trigger card reveal animation by adding to DOM
    // (CSS animation will automatically start)
    
    return new Promise(resolve => {
      setTimeout(resolve, 300); // Wait for animation to mostly complete
    });
  }

  /**
   * Create particle effects for card reveal based on rarity
   */
  private createCardParticles(card: TCGCard, cardElement: HTMLElement): void {
    if (!this.particleCanvas || !this.particleContext) return;

    const rect = cardElement.getBoundingClientRect();
    const containerRect = this.contentEl.getBoundingClientRect();
    
    const cardX = rect.left - containerRect.left + rect.width / 2;
    const cardY = rect.top - containerRect.top + rect.height / 2;

    const particleCount = this.animationConfig.rarityParticleCounts[card.rarity];
    const intensity = card.isShiny ? this.animationConfig.shinyEffectIntensity : 1.0;

    // Rarity-specific colors
    const rarityColors: Record<CardRarity, string[]> = {
      'Common': ['#888', '#aaa'],
      'Uncommon': ['#4caf50', '#8bc34a'],
      'Rare': ['#2196f3', '#64b5f6'],
      'Epic': ['#9c27b0', '#ba68c8'],
      'Legendary': ['#ff9800', '#ffd54f']
    };

    const colors = rarityColors[card.rarity];

    for (let i = 0; i < particleCount * intensity; i++) {
      const angle = (Math.PI * 2 * i) / (particleCount * intensity);
      const velocity = 1 + Math.random() * 2;
      
      this.particles.push({
        x: cardX,
        y: cardY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 1
      });
    }

    if (!this.animationFrame) {
      this.startParticleAnimation();
    }
  }

  /**
   * Show pack opening summary
   */
  private showPackSummary(result: PackOpeningResult): void {
    if (!this.contentEl) return;

    const summary = this.contentEl.createDiv('pack-summary');
    summary.createEl('h3', { text: '🎉 Pack Opened Successfully!' });
    
    const stats = summary.createDiv('summary-stats');
    
    // Total cards
    const totalStat = stats.createDiv('stat-item');
    totalStat.createDiv('stat-value').setText(result.cards.length.toString());
    totalStat.createDiv('stat-label').setText('Cards');

    // Shiny count
    const shinyStat = stats.createDiv('stat-item');
    shinyStat.createDiv('stat-value').setText(result.shinyCount.toString());
    shinyStat.createDiv('stat-label').setText('Shiny');

    // Total power
    const powerStat = stats.createDiv('stat-item');
    powerStat.createDiv('stat-value').setText(result.totalPowerLevel.toString());
    powerStat.createDiv('stat-label').setText('Total Power');

    // Rarity breakdown
    const rarityBreakdown = summary.createEl('p');
    const rarityText = Object.entries(result.rarityBreakdown)
      .filter(([_, count]) => count > 0)
      .map(([rarity, count]) => `${count} ${rarity}`)
      .join(', ');
    rarityBreakdown.setText(`Rarities: ${rarityText}`);
  }

  /**
   * Show card details in a tooltip or expanded view
   */
  private showCardDetails(card: TCGCard): void {
    // Create a simple tooltip for now
    // In a full implementation, this would show a detailed card view
    new Notice(`${card.name} (${card.rarity}${card.isShiny ? ' ✨' : ''}) - Power: ${card.powerLevel}`);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (this.contentEl) {
      const errorDiv = this.contentEl.createDiv('error-message');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.textAlign = 'center';
      errorDiv.style.padding = '20px';
      errorDiv.setText(message);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up animations and resources
   */
  onClose(): void {
    // Cancel animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Clear particles
    this.particles = [];

    // Remove event listeners
    window.removeEventListener('resize', () => this.resizeCanvas());

    // Remove custom styles (optional, may be used by other modals)
    
    super.onClose();
  }
}

// ===== PACK SELECTION MODAL =====

/**
 * Modal for selecting which pack to open from inventory
 */
export class PackSelectionModal extends Modal {
  private packSystem: PackSystem;
  private onPackSelected: (packId: string) => void;

  constructor(app: App, packSystem: PackSystem, onPackSelected: (packId: string) => void) {
    super(app);
    this.packSystem = packSystem;
    this.onPackSelected = onPackSelected;
  }

  onOpen(): void {
    this.titleEl.setText('Select Pack to Open');
    this.contentEl.empty();

    const inventory = this.packSystem.getInventory();
    const packDefinitions = this.packSystem.getAvailablePackDefinitions();

    if (inventory.availablePacks.size === 0) {
      this.contentEl.createEl('p', { text: 'No packs available! Purchase packs to get started.' });
      return;
    }

    for (const [packId, count] of inventory.availablePacks.entries()) {
      if (count > 0) {
        const pack = packDefinitions.find(p => p.id === packId);
        if (pack) {
          new Setting(this.contentEl)
            .setName(`${pack.name} (${count} available)`)
            .setDesc(pack.description)
            .addButton(button => {
              button
                .setButtonText('Open Pack')
                .setCta()
                .onClick(() => {
                  this.onPackSelected(packId);
                  this.close();
                });
            });
        }
      }
    }
  }
}