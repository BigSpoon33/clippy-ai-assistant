/**
 * File-Based Pack System for CLIPPY TCG
 * Generates and manages packs as actual files in the vault
 */

import { App, TFile, parseYaml, stringifyYaml } from 'obsidian';
import { SecureTCGRandom } from './rng-system';
import { TCGSettings } from '../types';

export interface CardMetadata {
  tcg_type: 'card';
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  pull_chance: number;
  shiny_chance: number;
  power_level: number;
  abilities: string[];
  flavor_text: string;
  card_type: string;
  element: string;
  cost: number;
  attack: number;
  defense: number;
  artist_credit: string;
  collection_set: string;
}

export interface PackMetadata {
  tcg_type: 'pack';
  pack_name: string;
  pack_description: string;
  card_pool_folder: string;
  total_cards: number;
  rarity_distribution: Record<string, number>;
  guaranteed_cards: Array<{ rarity: string; minimum: number }>;
  special_rules: string[];
  shiny_multiplier: number;
  cost_exp: number;
  cost_keystrokes: number;
  unlock_level: number;
  pack_series: string;
  pack_id?: string;
  player_id?: string; // ID of player who earned this pack
  generated_date?: string;
  opened_date?: string;
  rng_seed?: string;
  pack_contents?: string[];
}

export interface GeneratedCard {
  cardId: string;
  sourceFile: string;
  metadata: CardMetadata;
  isShiny: boolean;
  rollValue: number;
  pullSequence?: number; // For gacha reveal order
}

export interface GeneratedPack {
  packId: string;
  metadata: PackMetadata;
  cards: GeneratedCard[];
  packFile: string;
}

export class FilePackSystem {
  private app: App;
  private settings: TCGSettings;
  private rng: SecureTCGRandom;
  private vaultBasePath: string;

  constructor(app: App, settings: TCGSettings) {
    this.app = app;
    this.settings = settings;
    this.rng = new SecureTCGRandom();
    
    // Get vault base path
    this.vaultBasePath = (this.app.vault.adapter as any).basePath || '';
  }

  /**
   * Generate a new pack from template
   */
  async generatePack(templateName: string = 'starter-pack', playerId?: string): Promise<GeneratedPack | null> {
    try {
      // Map pack types to template filenames
      const templateMapping: Record<string, string> = {
        'starter-pack': 'starter-pack',
        'core-set': 'core-set-pack',
        'booster': 'pack-template',
        'premium': 'pack-template'
      };
      
      // Get actual template filename
      const actualTemplateName = templateMapping[templateName] || templateName;
      const templatePath = `tcg/templates/${actualTemplateName}.md`;
      const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
      
      if (!templateFile || !(templateFile instanceof TFile)) {
        console.warn(`Pack template not found: ${templatePath} (for pack type: ${templateName})`);
        return null;
      }

      // Read template content
      const templateContent = await this.app.vault.read(templateFile);
      const templateMatter = this.extractFrontmatter(templateContent);
      
      if (!templateMatter || templateMatter.tcg_type !== 'pack') {
        console.warn(`Invalid pack template: ${templatePath}`);
        return null;
      }

      // Generate unique pack ID and seed
      const packId = `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const rngSeed = this.rng.generateSeed();
      
      // Load card pool
      const cardPool = await this.loadCardPool(templateMatter.card_pool_folder);
      if (cardPool.length === 0) {
        console.warn(`No cards found in pool: ${templateMatter.card_pool_folder}`);
        return null;
      }

      // Generate pack contents using seeded RNG
      const seededRng = new SecureTCGRandom(rngSeed);
      const selectedCards = this.selectCardsForPack(templateMatter, cardPool, seededRng);

      // Update template metadata
      const packMetadata: PackMetadata = {
        ...templateMatter,
        pack_id: packId,
        generated_date: new Date().toISOString(),
        rng_seed: rngSeed,
        pack_contents: selectedCards.map(card => card.cardId),
        player_id: playerId // Associate pack with specific player
      };

      // Create pack file content
      const packContent = this.createPackFileContent(packMetadata);
      
      // Save pack file
      const packFileName = `${packId}.md`;
      const packFilePath = `tcg/packs/${packFileName}`;
      
      await this.app.vault.create(packFilePath, packContent);
      
      console.log(`📦 Generated pack: ${packId} with ${selectedCards.length} cards`);
      
      return {
        packId,
        metadata: packMetadata,
        cards: selectedCards,
        packFile: packFilePath
      };

    } catch (error) {
      console.error('Failed to generate pack:', error);
      return null;
    }
  }

  /**
   * Open a pack and create card files
   * Supports both standard pack IDs and direct file paths
   */
  async openPack(packIdOrPath: string): Promise<GeneratedCard[]> {
    try {
      // Try to find pack file by ID first, then by direct path
      let packFile: TFile | null = null;
      
      // First try standard pack path
      if (!packIdOrPath.includes('/')) {
        const packPath = `tcg/packs/${packIdOrPath}.md`;
        packFile = this.app.vault.getAbstractFileByPath(packPath) as TFile;
      }
      
      // If not found, try direct file path (for vault-discovered packs)
      if (!packFile) {
        packFile = this.app.vault.getAbstractFileByPath(packIdOrPath) as TFile;
      }
      
      if (!packFile || !(packFile instanceof TFile)) {
        console.warn(`Pack file not found: ${packIdOrPath}`);
        return [];
      }

      // Read pack content
      const packContent = await this.app.vault.read(packFile);
      const packMetadata = this.extractFrontmatter(packContent) as PackMetadata;
      
      if (!packMetadata || !packMetadata.pack_contents) {
        console.warn(`Invalid pack file: ${packFile.path}`);
        return [];
      }

      // Check if already opened
      if (packMetadata.opened_date) {
        console.warn(`Pack already opened: ${packIdOrPath}`);
        return [];
      }

      // 🎮 GACHA EXPERIENCE: Create pack opening view first
      console.log(`🎮 Starting gacha-style pack opening for: ${packMetadata.pack_name}`);
      const packOpeningViewPath = await this.createPackOpeningView(packMetadata);
      
      if (packOpeningViewPath) {
        // Open the pack opening view in workspace
        const viewFile = this.app.vault.getAbstractFileByPath(packOpeningViewPath) as TFile;
        if (viewFile) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(viewFile);
          console.log(`🎮 Pack opening view opened: ${packOpeningViewPath}`);
        }
      }

      // Recreate pack contents using stored seed
      const seededRng = new SecureTCGRandom(packMetadata.rng_seed!);
      const cardPool = await this.loadCardPool(packMetadata.card_pool_folder);
      const generatedCards = this.selectCardsForPack(packMetadata, cardPool, seededRng);

      // Create card files with sequential numbering for gacha reveal
      const createdCards: GeneratedCard[] = [];
      
      console.log(`🎴 Generating ${generatedCards.length} cards with dramatic timing...`);
      for (let i = 0; i < generatedCards.length; i++) {
        const card = generatedCards[i];
        
        // Set pull sequence for gacha reveal order
        card.pullSequence = i + 1;
        
        // Add delay for dramatic effect (cards appear one by one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay between cards
        }
        
        const cardFile = await this.createCardFile(card, packMetadata, i + 1); // Pass pull sequence
        if (cardFile) {
          createdCards.push(card);
          console.log(`🎴 Card ${i + 1}/${generatedCards.length}: ${card.metadata.name} (${card.metadata.rarity})`);
        }
      }

      // Mark pack as opened
      packMetadata.opened_date = new Date().toISOString();
      const updatedPackContent = this.createPackFileContent(packMetadata);
      await this.app.vault.modify(packFile, updatedPackContent);

      console.log(`📂 Opened pack ${packIdOrPath}: ${createdCards.length} cards created`);
      
      // 🎭 CARD FLIP SEQUENCE: Start the reveal animation!
      if (createdCards.length > 0) {
        console.log(`🎭 Starting card flip sequence in 2 seconds...`);
        
        // Wait a moment before starting the reveal sequence
        setTimeout(async () => {
          await this.executeCardFlipSequence(createdCards, packMetadata.pack_id!);
        }, 2000); // 2 second pause before flips begin
      }
      
      return createdCards;

    } catch (error) {
      console.error('Failed to open pack:', error);
      return [];
    }
  }

  /**
   * Load all cards from a card pool folder
   */
  private async loadCardPool(poolFolder: string): Promise<CardMetadata[]> {
    try {
      const poolFiles = this.app.vault.getFiles()
        .filter(file => file.path.startsWith(poolFolder) && file.extension === 'md');

      const cardPool: CardMetadata[] = [];

      for (const file of poolFiles) {
        const content = await this.app.vault.read(file);
        const metadata = this.extractFrontmatter(content);
        
        if (metadata && metadata.tcg_type === 'card') {
          // Store full frontmatter from pool card for inheritance
          const poolCardMetadata = {
            ...metadata,
            _sourceFilePath: file.path, // Track source file for debugging
            _fullFrontmatter: metadata // Store complete frontmatter for inheritance
          };
          cardPool.push(poolCardMetadata as CardMetadata);
        }
      }

      console.log(`📚 Loaded ${cardPool.length} cards from ${poolFolder}`);
      return cardPool;

    } catch (error) {
      console.error('Failed to load card pool:', error);
      return [];
    }
  }

  /**
   * Select cards for pack based on rarity distribution and rules
   */
  private selectCardsForPack(
    packMeta: PackMetadata, 
    cardPool: CardMetadata[], 
    rng: SecureTCGRandom
  ): GeneratedCard[] {
    const selectedCards: GeneratedCard[] = [];
    const usedCards = new Set<string>();

    // First, ensure guaranteed cards
    for (const guarantee of packMeta.guaranteed_cards || []) {
      const rarityCards = cardPool.filter(card => 
        card.rarity === guarantee.rarity && !usedCards.has(card.name)
      );
      
      for (let i = 0; i < guarantee.minimum && rarityCards.length > 0; i++) {
        const selectedCard = rng.selectByWeight(
          rarityCards.filter(c => !usedCards.has(c.name)),
          rarityCards.filter(c => !usedCards.has(c.name)).map(c => c.pull_chance)
        );
        
        if (selectedCard) {
          const isShiny = rng.random() < (selectedCard.shiny_chance * packMeta.shiny_multiplier);
          
          selectedCards.push({
            cardId: this.generateCardId(),
            sourceFile: selectedCard.name,
            metadata: selectedCard,
            isShiny,
            rollValue: rng.random()
          });
          
          usedCards.add(selectedCard.name);
        }
      }
    }

    // Fill remaining slots with weighted random selection
    const remainingSlots = packMeta.total_cards - selectedCards.length;
    
    for (let i = 0; i < remainingSlots; i++) {
      const availableCards = cardPool.filter(card => !usedCards.has(card.name));
      
      if (availableCards.length === 0) break;

      const selectedCard = rng.selectByWeight(
        availableCards,
        availableCards.map(card => card.pull_chance)
      );
      
      if (selectedCard) {
        const isShiny = rng.random() < (selectedCard.shiny_chance * packMeta.shiny_multiplier);
        
        selectedCards.push({
          cardId: this.generateCardId(),
          sourceFile: selectedCard.name,
          metadata: selectedCard,
          isShiny,
          rollValue: rng.random()
        });
        
        usedCards.add(selectedCard.name);
      }
    }

    return selectedCards;
  }

  /**
   * Create a card file in the vault with gacha-style properties
   */
  private async createCardFile(card: GeneratedCard, packMeta: PackMetadata, pullSequence: number = 1): Promise<boolean> {
    try {
      // Generate random stats for the card
      const randomizedMetadata = this.randomizeCardStats(card.metadata, card.cardId);
      
      // Get pool card's full frontmatter for inheritance
      const poolCardFrontmatter = (card.metadata as any)._fullFrontmatter || {};
      
      const cardMetadata = {
        // 1. Start with inherited pool card frontmatter (template/visual properties)
        ...poolCardFrontmatter,
        
        // 2. Apply randomized stats (overwrites any conflicting properties)
        ...randomizedMetadata,
        
        // 3. Apply pack-specific properties (always unique per pull)
        card_id: card.cardId,
        is_shiny: card.isShiny,
        pulled_from_pack: packMeta.pack_id,
        pull_date: new Date().toISOString(),
        roll_value: card.rollValue,
        
        // 4. Apply gacha properties (use pool card images if available)
        card_display_state: 'back', // 'back' or 'front' - controls flip animation
        pull_sequence: pullSequence, // Order of reveal (1, 2, 3...)
        back_image: poolCardFrontmatter.back_image || '🎴', // Use pool card's back_image
        front_image: poolCardFrontmatter.front_image || this.getCardImage(card.metadata),
        animation_type: this.determineAnimationType(card), // Animation based on rarity/properties
        
        // 5. Remove internal tracking properties from final frontmatter
        _sourceFilePath: undefined,
        _fullFrontmatter: undefined,
      };

      const cardContent = this.createCardFileContent(cardMetadata);
      
      // Generate unique filename using card name with duplicate handling
      const cardFileName = await this.generateUniqueCardFilename(card.metadata.name);
      const cardFilePath = `tcg/cards/${cardFileName}`;

      await this.app.vault.create(cardFilePath, cardContent);
      console.log(`🎴 Created card: ${cardFileName} (${card.isShiny ? 'Shiny ' : ''}${card.metadata.rarity})`);
      console.log(`✨ INHERITED: Used pool card frontmatter from ${(card.metadata as any)._sourceFilePath || 'unknown'}`);
      console.log(`✨ RANDOMIZATION: Applied random stats to ${card.metadata.name}`);
      
      return true;

    } catch (error) {
      console.error('Failed to create card file:', error);
      return false;
    }
  }

  /**
   * Generate unique card ID
   */
  private generateCardId(): string {
    return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique filename based on card name with duplicate handling
   */
  private async generateUniqueCardFilename(cardName: string): Promise<string> {
    // Sanitize card name for filename
    let baseName = cardName.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
    if (!baseName) baseName = 'Unknown Card';
    
    const cardsFolder = 'tcg/cards/';
    let filename = `${baseName}.md`;
    let counter = 1;
    
    // Check if file exists and add counter if needed
    while (this.app.vault.getAbstractFileByPath(`${cardsFolder}${filename}`)) {
      const paddedCounter = counter.toString().padStart(3, '0');
      filename = `${baseName}${paddedCounter}.md`;
      counter++;
    }
    
    return filename;
  }

  /**
   * Get card image (emoji fallback for now)
   */
  private getCardImage(metadata: CardMetadata): string {
    // For now, use type-based emojis as fallback
    // Later this can be expanded to support actual image files
    
    const pokemonEmojis: Record<string, string> = {
      'pikachu': '⚡',
      'charizard': '🔥',
      'blastoise': '💧',
      'venusaur': '🌿',
      'bulbasaur': '🌱',
      'squirtle': '🌊',
      'charmander': '🔥',
      'jigglypuff': '🎵',
      'psyduck': '💛',
      'snorlax': '😴',
      'meowth': '🐱',
      'eevee': '🦊',
      'vulpix': '🦊',
      'nidorina': '💜',
      'nidorino': '💜',
      'rattata': '🐭',
      'ekans': '🐍',
      'sandshrew': '🟤',
      'diglett': '🕳️',
      'wortortle': '🌊',
    };
    
    const pokemonName = metadata.name?.toLowerCase() || '';
    return pokemonEmojis[pokemonName] || '🎴';
  }

  /**
   * Determine animation type based on card properties
   */
  private determineAnimationType(card: GeneratedCard): string {
    if (card.isShiny) {
      return 'rainbow_sparkle'; // Special animation for shiny cards
    }
    
    switch (card.metadata.rarity) {
      case 'Legendary':
        return 'golden_glow';
      case 'Epic':
        return 'purple_flash';
      case 'Rare':
        return 'blue_sparkle';
      case 'Uncommon':
        return 'silver_glint';
      case 'Common':
      default:
        return 'simple_flip';
    }
  }

  /**
   * Randomize card stats (IV, nature, etc.) based on template
   */
  private randomizeCardStats(templateMetadata: any, cardId: string): any {
    const seededRng = new SecureTCGRandom(cardId);
    
    // Pokemon natures that affect stats
    const natures = [
      'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
      'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
      'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
      'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
      'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
    ];
    
    // Get RNG ranges from template frontmatter or use defaults
    const getRngRange = (statName: string): { min: number, max: number } => {
      const rangeKey = `${statName}_range`;
      
      // Check direct range property first (e.g., hp_range: [0, 29])
      if (templateMetadata[rangeKey] && Array.isArray(templateMetadata[rangeKey]) && templateMetadata[rangeKey].length === 2) {
        return { 
          min: templateMetadata[rangeKey][0], 
          max: templateMetadata[rangeKey][1] 
        };
      }
      
      // Check nested base_stats.iv structure for backwards compatibility
      if (templateMetadata.base_stats?.iv?.[statName] && Array.isArray(templateMetadata.base_stats.iv[statName]) && templateMetadata.base_stats.iv[statName].length === 2) {
        return {
          min: templateMetadata.base_stats.iv[statName][0],
          max: templateMetadata.base_stats.iv[statName][1]
        };
      }
      
      // Default Pokemon IV range (0-31)
      return { min: 0, max: 31 };
    };

    // Generate random IVs using template-defined ranges or defaults
    const randomIVs = {
      hp: Math.floor(seededRng.random() * (getRngRange('hp').max - getRngRange('hp').min + 1)) + getRngRange('hp').min,
      attack: Math.floor(seededRng.random() * (getRngRange('attack').max - getRngRange('attack').min + 1)) + getRngRange('attack').min,
      defense: Math.floor(seededRng.random() * (getRngRange('defense').max - getRngRange('defense').min + 1)) + getRngRange('defense').min,
      sp_attack: Math.floor(seededRng.random() * (getRngRange('sp_attack').max - getRngRange('sp_attack').min + 1)) + getRngRange('sp_attack').min,
      sp_defense: Math.floor(seededRng.random() * (getRngRange('sp_defense').max - getRngRange('sp_defense').min + 1)) + getRngRange('sp_defense').min,
      speed: Math.floor(seededRng.random() * (getRngRange('speed').max - getRngRange('speed').min + 1)) + getRngRange('speed').min
    };
    
    // Random nature
    const randomNature = seededRng.selectFromArray(natures);
    
    // Handle abilities safely
    let cardAbilities = ['No Special Abilities'];
    if (templateMetadata.abilities) {
      if (Array.isArray(templateMetadata.abilities)) {
        cardAbilities = templateMetadata.abilities;
      } else if (typeof templateMetadata.abilities === 'string') {
        cardAbilities = [templateMetadata.abilities];
      }
    }
    
    // Log the ranges being used for debugging
    const rangesUsed = {
      hp: getRngRange('hp'),
      attack: getRngRange('attack'),
      defense: getRngRange('defense'),
      sp_attack: getRngRange('sp_attack'),
      sp_defense: getRngRange('sp_defense'),
      speed: getRngRange('speed')
    };

    console.log(`🎲 Randomizing stats for ${templateMetadata.name}: Nature=${randomNature}, IVs=`, randomIVs);
    console.log(`📏 RNG Ranges used:`, rangesUsed);
    console.log(`📊 Template stats:`, templateMetadata.base_stats);
    
    // Create randomized metadata
    const randomized = {
      ...templateMetadata,
      abilities: cardAbilities,
      nature: randomNature,
      // Always ensure we have base_stats structure
      base_stats: templateMetadata.base_stats ? {
        ...templateMetadata.base_stats,
        iv: randomIVs
      } : {
        hp: templateMetadata.attack || 50,
        attack: templateMetadata.attack || 50,
        defense: templateMetadata.defense || 50,
        sp_attack: 50,
        sp_defense: 50,
        speed: 50,
        iv: randomIVs,
        ev: {
          hp: 0,
          attack: 0,
          defense: 0,
          sp_attack: 0,
          sp_defense: 0,
          speed: 0
        }
      }
    };
    
    console.log(`🔄 Final randomized metadata for ${templateMetadata.name}:`, randomized);
    return randomized;
  }

  /**
   * Extract frontmatter from markdown content
   */
  private extractFrontmatter(content: string): any {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        return parseYaml(match[1]);
      } catch (error) {
        console.error('Failed to parse frontmatter:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Create pack file content with metadata
   */
  private createPackFileContent(metadata: PackMetadata): string {
    const frontmatter = stringifyYaml(metadata);
    
    // Create embedded Base view for pack contents
    const embeddedBaseView = metadata.opened_date ? `
## 🎴 Pack Contents

\`\`\`base
views:
  - type: cards
    name: Gacha!
    filters:
      and:
        - pulled_from_pack == "${metadata.pack_id}"
    order: []
    sort:
      - property: pull_sequence
        direction: ASC
    cardSize: 120
    imageFit: contain
    image: note.front_image
\`\`\`
` : '';
    
    return `---
${frontmatter}---

# 📦 ${metadata.pack_name}

${metadata.pack_description}

## Pack Details
- **Total Cards**: ${metadata.total_cards}
- **Series**: ${metadata.pack_series}
- **Generated**: ${metadata.generated_date}
- **Status**: ${metadata.opened_date ? `Opened on ${metadata.opened_date}` : 'Sealed'}

${metadata.opened_date ? embeddedBaseView : '*Contents hidden until opened*'}

---
*Generated by CLIPPY TCG System*`;
  }

  /**
   * Create card file content with metadata
   */
  private createCardFileContent(metadata: any): string {
    try {
      const frontmatter = stringifyYaml(metadata);
      
      // Safe ability handling
      let abilitiesText = '- No abilities';
      if (metadata.abilities) {
        if (Array.isArray(metadata.abilities)) {
          abilitiesText = metadata.abilities.map((ability: string) => `- ${ability}`).join('\n');
        } else if (typeof metadata.abilities === 'string') {
          abilitiesText = `- ${metadata.abilities}`;
        }
      }
      
      // Pokemon-style stats display if available
      let statsSection = `## Card Stats
- **Rarity**: ${metadata.rarity}
- **Power Level**: ${metadata.power_level || 'N/A'}
- **Element**: ${metadata.element}
- **Cost**: ${metadata.cost}
- **Attack**: ${metadata.attack}
- **Defense**: ${metadata.defense}`;

      // Add Pokemon stats if present
      if (metadata.base_stats) {
        statsSection = `## Pokemon Stats
- **Type**: ${metadata.primary_type}${metadata.secondary_type ? `/${metadata.secondary_type}` : ''}
- **Level**: ${metadata.card_level}
- **HP**: ${metadata.base_stats.hp}
- **Attack**: ${metadata.base_stats.attack}
- **Defense**: ${metadata.base_stats.defense}
- **Sp. Attack**: ${metadata.base_stats.sp_attack}
- **Sp. Defense**: ${metadata.base_stats.sp_defense}
- **Speed**: ${metadata.base_stats.speed}
- **Nature**: ${metadata.nature}

## IVs
- **HP**: ${metadata.base_stats.iv?.hp || 0}
- **Attack**: ${metadata.base_stats.iv?.attack || 0}
- **Defense**: ${metadata.base_stats.iv?.defense || 0}
- **Sp. Attack**: ${metadata.base_stats.iv?.sp_attack || 0}
- **Sp. Defense**: ${metadata.base_stats.iv?.sp_defense || 0}
- **Speed**: ${metadata.base_stats.iv?.speed || 0}`;
      }
      
      return `---
${frontmatter}---

# ${metadata.is_shiny ? '✨ ' : ''}${metadata.name}

${metadata.is_shiny ? '*This is a rare SHINY card!*' : ''}

🎲 **RANDOMIZED STATS** - This card has unique random IVs and nature!

${statsSection}

## Abilities
${abilitiesText}

## Flavor Text
> "${metadata.flavor_text}"

## Collection Info
- **Set**: ${metadata.collection_set}
- **Artist**: ${metadata.artist_credit}
- **Card ID**: \`${metadata.card_id}\`
- **Pulled From**: ${metadata.pulled_from_pack}
- **Pull Date**: ${metadata.pull_date}

---
*${metadata.is_shiny ? 'Shiny ' : ''}${metadata.rarity} Card • CLIPPY TCG System*`;
      
    } catch (error) {
      console.error('Error creating card file content:', error, 'Metadata:', metadata);
      throw error;
    }
  }

  /**
   * Get all available pack templates
   */
  async getAvailablePackTemplates(): Promise<string[]> {
    try {
      const templateFiles = this.app.vault.getFiles()
        .filter(file => 
          file.path.startsWith('tcg/templates/') && 
          file.extension === 'md' && 
          file.name !== 'card-template.md'
        );

      const packTemplates: string[] = [];

      for (const file of templateFiles) {
        const content = await this.app.vault.read(file);
        const metadata = this.extractFrontmatter(content);
        
        if (metadata && metadata.tcg_type === 'pack') {
          packTemplates.push(file.basename);
        }
      }

      return packTemplates;

    } catch (error) {
      console.error('Failed to get pack templates:', error);
      return [];
    }
  }

  /**
   * Update dedicated Gacha!.base file for pack opening
   */
  async createPackOpeningView(packMetadata: PackMetadata): Promise<string | null> {
    try {
      const packName = packMetadata.pack_name || 'Mystery Pack';
      const packId = packMetadata.pack_id;
      const gachaFilePath = 'tcg/Gacha!.base';

      // Read the existing Gacha!.base file
      const gachaFile = this.app.vault.getAbstractFileByPath(gachaFilePath) as TFile;
      
      if (!gachaFile) {
        console.error('Gacha!.base file not found');
        return null;
      }

      // Create updated content for the dedicated gacha file
      const updatedContent = this.createGachaFileContent(packMetadata);
      
      // Update the Gacha!.base file with latest pack opening
      await this.app.vault.modify(gachaFile, updatedContent);
      
      console.log(`🎮 Updated Gacha!.base for pack opening: ${packName}`);
      return gachaFilePath;
      
    } catch (error) {
      console.error('Failed to update Gacha!.base:', error);
      return null;
    }
  }

  /**
   * Create content for the dedicated Gacha!.base file
   */
  private createGachaFileContent(packMetadata: PackMetadata): string {
    const packName = packMetadata.pack_name || 'Mystery Pack';
    const packId = packMetadata.pack_id;
    
    return `views:
  - type: cards
    name: Gacha!
    filters:
      and:
        - pulled_from_pack == "${packId}"
    order:
      - pull_sequence
      - name
      - rarity
      - is_shiny
    sort:
      - property: pull_sequence
        direction: ASC
    cardSize: 280
    imageFit: contain
    image: note.front_image
`;
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      // Check if directory exists by trying to get folder
      const folder = this.app.vault.getAbstractFileByPath(dirPath);
      if (!folder) {
        // Directory doesn't exist, create it
        await this.app.vault.createFolder(dirPath);
        console.log(`📁 Created directory: ${dirPath}`);
      }
    } catch (error) {
      // Directory might not exist or there's an error - try to create it
      try {
        await this.app.vault.createFolder(dirPath);
        console.log(`📁 Created directory: ${dirPath}`);
      } catch (createError) {
        console.warn(`Could not create directory ${dirPath}:`, createError);
      }
    }
  }

  /**
   * Add pack opening view to existing Base file content
   */
  private addPackOpeningViewToBase(currentContent: string, packMetadata: PackMetadata): string {
    const packName = packMetadata.pack_name || 'Mystery Pack';
    const packId = packMetadata.pack_id;
    
    // Create the new pack opening view in the same format as your existing views
    const newPackView = `  - type: cards
    name: 🎮 ${packName}
    filters:
      and:
        - pulled_from_pack == "${packId}"
    order:
      - pull_sequence
      - name
      - rarity
      - is_shiny
    sort:
      - property: pull_sequence
        direction: ASC
    cardSize: 280
    imageFit: contain`;

    // Check if there's already a pack opening view for this pack
    const packViewPattern = new RegExp(`name: 🎮 ${packName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    
    if (packViewPattern.test(currentContent)) {
      // Replace existing view
      const existingViewPattern = new RegExp(
        `  - type: cards\\s*\\n    name: 🎮 ${packName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=  - type:|$)`,
        'g'
      );
      return currentContent.replace(existingViewPattern, newPackView + '\n');
    } else {
      // Add new view at the end of the views array
      // Find the last view and add after it
      const lastViewMatch = currentContent.match(/^(views:[\s\S]*)(  - type: [^\n]*(?:\n(?!  - type:|^[^\s])[^\n]*)*)$/m);
      
      if (lastViewMatch) {
        return currentContent.replace(lastViewMatch[2], lastViewMatch[2] + '\n' + newPackView);
      } else {
        // Fallback: append at the end
        return currentContent + '\n' + newPackView;
      }
    }
  }

  /**
   * Create the content for pack opening Base file (deprecated - now using existing file)
   */
  private createPackOpeningViewContent(packMetadata: PackMetadata): string {
    const packName = packMetadata.pack_name || 'Mystery Pack';
    const packId = packMetadata.pack_id;
    const totalCards = packMetadata.total_cards || 5;
    
    return `---
database:
  source: tcg/cards
  view: table
  filters:
    - field: pulled_from_pack
      condition: is
      value: "${packId}"
  sorts:
    - field: pull_sequence
      order: asc
  fields:
    - field: card_visual
      display: text
      name: Card
      template: |
        {% if card_display_state == "front" %}
          {{front_image}} {{name}}
        {% else %}
          {{back_image}} [Hidden]
        {% endif %}
    - field: pull_sequence
      display: number
      name: "#"
    - field: card_name
      display: text
      name: Name
      template: |
        {% if card_display_state == "front" %}
          {{name}}
        {% else %}
          ???
        {% endif %}
    - field: card_rarity
      display: text  
      name: Rarity
      template: |
        {% if card_display_state == "front" %}
          {{rarity}}
        {% else %}
          ???
        {% endif %}
    - field: shiny_status
      display: text
      name: Shiny
      template: |
        {% if card_display_state == "front" and is_shiny %}
          ✨ SHINY
        {% endif %}
    - field: animation_type
      display: text
      name: Effect
      template: |
        {% if card_display_state == "front" %}
          {{animation_type}}
        {% endif %}
pack_name: "${packName}"
total_cards: ${totalCards}
pack_type: "${packMetadata.pack_series || 'Standard'}"
generated_date: "${packMetadata.generated_date || 'Unknown'}"
rng_seed: "${packMetadata.rng_seed || 'N/A'}"
---

# 🎮 Pack Opening: ${packName}

Opening ${totalCards} cards from this pack...

## 🎯 Pack Statistics
- Pack Type: ${packMetadata.pack_series || 'Standard'}
- Total Cards: ${totalCards}
- Generated: ${packMetadata.generated_date || 'Unknown'}
- RNG Seed: ${packMetadata.rng_seed || 'N/A'}

## 🎲 Card Reveal Status

Cards will appear above as they are generated, initially showing card backs. Once all cards are created, they will flip to reveal their identities one by one!

**Legend:**
- 🔒 Card Back = Not yet revealed  
- 🎴 Card Front = Revealed!
- ✨ = Shiny Card
- 🌟 = Rare+ Card

Generated by CLIPPY TCG Gacha System`;
  }

  /**
   * Get all sealed packs in vault
   */
  async getSealedPacks(): Promise<PackMetadata[]> {
    try {
      const packFiles = this.app.vault.getFiles()
        .filter(file => file.path.startsWith('tcg/packs/') && file.extension === 'md');

      const sealedPacks: PackMetadata[] = [];

      for (const file of packFiles) {
        const content = await this.app.vault.read(file);
        const metadata = this.extractFrontmatter(content) as PackMetadata;
        
        if (metadata && metadata.tcg_type === 'pack' && !metadata.opened_date) {
          sealedPacks.push(metadata);
        }
      }

      return sealedPacks;

    } catch (error) {
      console.error('Failed to get sealed packs:', error);
      return [];
    }
  }

  /**
   * Execute the sequential card flip reveal sequence
   */
  private async executeCardFlipSequence(cards: GeneratedCard[], packId: string): Promise<void> {
    try {
      console.log(`🎭 Starting card reveal sequence for ${cards.length} cards!`);
      
      // Sort cards by their pull sequence to flip in order
      const sortedCards = cards.sort((a, b) => {
        const aSequence = a.pullSequence || 1;
        const bSequence = b.pullSequence || 1;
        return aSequence - bSequence;
      });
      
      // Flip each card one by one
      for (let i = 0; i < sortedCards.length; i++) {
        const card = sortedCards[i];
        
        // Add dramatic pause between flips
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay between flips
        }
        
        // Find and update the card file
        const cardFilePath = `tcg/cards/${card.cardId}.md`;
        const cardFile = this.app.vault.getAbstractFileByPath(cardFilePath) as TFile;
        
        if (cardFile) {
          // Read current content
          const currentContent = await this.app.vault.read(cardFile);
          
          // Update frontmatter to flip the card
          const flippedContent = this.flipCardInContent(currentContent, card);
          
          // Save the updated content
          await this.app.vault.modify(cardFile, flippedContent);
          
          // Log the dramatic reveal
          const rarityEmoji = this.getRarityEmoji(card.metadata.rarity);
          const shinyText = card.isShiny ? ' ✨ SHINY!' : '';
          console.log(`🎭 FLIP ${i + 1}/${sortedCards.length}: ${rarityEmoji} ${card.metadata.name} (${card.metadata.rarity})${shinyText}`);
          
          // Special console message for rare cards
          if (card.metadata.rarity === 'Legendary' || card.metadata.rarity === 'Epic' || card.isShiny) {
            console.log(`🌟 RARE PULL! Animation: ${this.determineAnimationType(card)}`);
          }
        }
      }
      
      console.log(`🎉 Pack opening sequence complete! All ${cards.length} cards revealed!`);
      
    } catch (error) {
      console.error('Error during card flip sequence:', error);
    }
  }

  /**
   * Update card content to flip from back to front
   */
  private flipCardInContent(content: string, card: GeneratedCard): string {
    // Replace the card_display_state in frontmatter
    const flippedContent = content.replace(
      /card_display_state:\s*['"]?back['"]?/g,
      'card_display_state: front'
    );
    
    return flippedContent;
  }

  /**
   * Get emoji for card rarity
   */
  private getRarityEmoji(rarity: string): string {
    switch (rarity) {
      case 'Legendary': return '👑';
      case 'Epic': return '🟣';
      case 'Rare': return '🔵';
      case 'Uncommon': return '🟢';
      case 'Common':
      default: return '⚪';
    }
  }

  /**
   * Get user's card collection from vault
   */
  async getCardCollection(): Promise<CardMetadata[]> {
    try {
      const cardFiles = this.app.vault.getFiles()
        .filter(file => file.path.startsWith('tcg/cards/') && file.extension === 'md');

      const collection: CardMetadata[] = [];

      for (const file of cardFiles) {
        const content = await this.app.vault.read(file);
        const metadata = this.extractFrontmatter(content);
        
        if (metadata && metadata.tcg_type === 'card') {
          collection.push(metadata as CardMetadata);
        }
      }

      return collection;

    } catch (error) {
      console.error('Failed to get card collection:', error);
      return [];
    }
  }
}