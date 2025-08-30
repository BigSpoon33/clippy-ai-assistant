/**
 * CLIPPY TCG Writer - Theme System Architecture
 * Manages visual themes, card templates, and pack customization
 * Following PRP specifications for comprehensive theming and customization
 */

import { TFile } from 'obsidian';
import { TCGTheme, TCGCard, TCGPack, CardRarity } from '../types';
import { ClippyErrorBoundaries } from '../../../utils/error-boundaries';

// ===== THEME INTERFACES =====

export interface ThemeAssets {
  cardBackgrounds: Record<CardRarity, string>;
  packImages: Record<string, string>;
  particleTextures: string[];
  soundEffects: Record<string, string>;
  fonts: {
    primary: string;
    secondary: string;
    decorative: string;
  };
}

export interface ThemeAnimations {
  cardReveal: string;
  packOpening: string;
  shinyEffect: string;
  rarityGlow: Record<CardRarity, string>;
  particleEffects: Record<string, any>;
}

export interface ThemeConfiguration {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  baseTheme?: string; // For themes that extend others
  
  // Core theme data from TCGTheme interface
  colorScheme: TCGTheme['colorScheme'];
  cardTemplate: TCGTheme['cardTemplate'];
  packs: TCGPack[];
  
  // Enhanced theming features
  assets: ThemeAssets;
  animations: ThemeAnimations;
  customCSS?: string;
  
  // Theme-specific functions
  mapNoteToCard: (note: TFile, noteContent: string) => Partial<TCGCard>;
  generateFlavorText: (card: TCGCard) => string;
  calculateThemeSpecificStats: (note: TFile) => Record<string, number>;
}

// ===== BUILT-IN THEMES =====

/**
 * Pokemon-inspired theme with creature-style cards
 */
export const POKEMON_THEME: ThemeConfiguration = {
  id: 'pokemon',
  name: 'Pokemon Knowledge',
  version: '1.0.0',
  author: 'CLIPPY TCG Team',
  description: 'Classic Pokemon-inspired cards with knowledge creatures',
  
  colorScheme: {
    primary: '#3b4cca',
    secondary: '#ffde00',
    accent: '#ff0000',
    background: '#ffffff',
    text: '#2c2c2c'
  },
  
  cardTemplate: {
    backgroundImage: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
    borderStyle: '2px solid #495057',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    rarityIndicators: {
      'Common': { color: '#6c757d', icon: '○' },
      'Uncommon': { color: '#28a745', icon: '◆' },
      'Rare': { color: '#007bff', icon: '★' },
      'Epic': { color: '#6610f2', icon: '◆◆' },
      'Legendary': { color: '#fd7e14', icon: '★★★' }
    }
  },
  
  packs: [
    {
      id: 'pokemon-basic-pack',
      name: 'Basic Knowledge Booster',
      description: 'Standard Pokemon-style knowledge cards',
      cardCount: 11, // Pokemon booster pack size
      costInEXP: 150,
      costInKeystrokes: 750,
      rarityWeights: {
        Common: 0.55,
        Uncommon: 0.25,
        Rare: 0.15,
        Epic: 0.04,
        Legendary: 0.01
      },
      shinyBaseRate: 0.08,
      streakMultiplier: 1.2,
      qualityMultiplier: 1.1,
      speedMultiplier: 1.05,
      themeSpecific: true,
      compatibleThemes: ['pokemon'],
      levelRequired: 1,
      timeGated: undefined
    },
    {
      id: 'pokemon-premium-pack',
      name: 'Elite Knowledge Pack',
      description: 'Premium Pokemon-style pack with guaranteed rare+',
      cardCount: 15,
      costInEXP: 400,
      costInKeystrokes: 1500,
      rarityWeights: {
        Common: 0.30,
        Uncommon: 0.35,
        Rare: 0.25,
        Epic: 0.08,
        Legendary: 0.02
      },
      shinyBaseRate: 0.12,
      streakMultiplier: 1.4,
      qualityMultiplier: 1.2,
      speedMultiplier: 1.15,
      themeSpecific: true,
      compatibleThemes: ['pokemon'],
      levelRequired: 25,
      timeGated: undefined
    }
  ],
  
  assets: {
    cardBackgrounds: {
      'Common': 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmOGY5ZmEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlOWVjZWYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)',
      'Uncommon': 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkNGVkZGEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNhM2Q5YTUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)',
      'Rare': 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNjY2U3ZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2NmI2ZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)',
      'Epic': 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlM2NjZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNhMzY2ZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)',
      'Legendary': 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmU0YzciLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmI4MzMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg=='
    },
    packImages: {
      'pokemon-basic-pack': '🎒',
      'pokemon-premium-pack': '🏆'
    },
    particleTextures: [],
    soundEffects: {},
    fonts: {
      primary: '"Segoe UI", system-ui, sans-serif',
      secondary: '"Courier New", monospace',
      decorative: '"Brush Script MT", cursive'
    }
  },
  
  animations: {
    cardReveal: 'pokemonCardReveal',
    packOpening: 'pokemonPackOpen',
    shinyEffect: 'pokemonShiny',
    rarityGlow: {
      'Common': 'commonGlow',
      'Uncommon': 'uncommonGlow',
      'Rare': 'rareGlow',
      'Epic': 'epicGlow',
      'Legendary': 'legendaryGlow'
    },
    particleEffects: {}
  },
  
  mapNoteToCard: (note: TFile, noteContent: string): Partial<TCGCard> => {
    const words = noteContent.split(/\s+/).length;
    const hasCode = noteContent.includes('```');
    const hasImages = noteContent.includes('![');
    
    // Pokemon-style abilities based on content
    const abilities: string[] = [];
    
    if (hasCode) abilities.push('Code Mastery: Technical implementations provide battle advantages');
    if (hasImages) abilities.push('Visual Learning: Enhanced memory through imagery');
    if (words > 1000) abilities.push('Deep Knowledge: Comprehensive understanding boosts all stats');
    if (note.path.includes('project')) abilities.push('Project Power: Organized knowledge creates synergy effects');
    
    return {
      abilities: abilities.length > 0 ? abilities : ['Basic Knowledge: Foundation for greater understanding'],
      themeData: {
        pokemonType: hasCode ? 'Digital' : hasImages ? 'Visual' : 'Conceptual',
        habitat: note.path.split('/')[0] || 'General',
        evolutionStage: words < 500 ? 'Basic' : words < 1500 ? 'Stage 1' : 'Stage 2'
      }
    };
  },
  
  generateFlavorText: (card: TCGCard): string => {
    const type = card.themeData?.pokemonType || 'Knowledge';
    const habitat = card.themeData?.habitat || 'the vault';
    
    const templates = [
      `This ${type} knowledge roams freely throughout ${habitat}, sharing wisdom with those who seek it.`,
      `A mysterious ${type} concept that appears when understanding is needed most in ${habitat}.`,
      `Legends speak of this ${type} insight that transformed entire regions of ${habitat}.`,
      `Trainers who master this ${type} knowledge gain unprecedented power in ${habitat}.`,
      `Wild ${type} thoughts like these are rarely seen outside of ${habitat}.`
    ];
    
    const rarityIndex = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].indexOf(card.rarity);
    return templates[Math.min(rarityIndex, templates.length - 1)];
  },
  
  calculateThemeSpecificStats: (note: TFile): Record<string, number> => {
    // Pokemon-style stats
    return {
      hp: 50 + Math.floor(Math.random() * 100),
      attack: 20 + Math.floor(Math.random() * 80),
      defense: 20 + Math.floor(Math.random() * 80),
      speed: 10 + Math.floor(Math.random() * 90),
      special: 30 + Math.floor(Math.random() * 70)
    };
  }
};

/**
 * Magic: The Gathering inspired theme
 */
export const MTG_THEME: ThemeConfiguration = {
  id: 'mtg',
  name: 'Magic Knowledge',
  version: '1.0.0',
  author: 'CLIPPY TCG Team',
  description: 'Magic-inspired spells and artifacts from your knowledge',
  
  colorScheme: {
    primary: '#0e1114',
    secondary: '#8b7355',
    accent: '#d4af37',
    background: '#1a1a1a',
    text: '#f0f0f0'
  },
  
  cardTemplate: {
    backgroundImage: 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)',
    borderStyle: '2px solid #8b7355',
    fontFamily: '"Cinzel", "Times New Roman", serif',
    rarityIndicators: {
      'Common': { color: '#c0c0c0', icon: '●' },
      'Uncommon': { color: '#c0c0c0', icon: '◆' },
      'Rare': { color: '#ffd700', icon: '★' },
      'Epic': { color: '#ff6b35', icon: '♦' },
      'Legendary': { color: '#ff6b35', icon: '★★' }
    }
  },
  
  packs: [
    {
      id: 'mtg-draft-pack',
      name: 'Knowledge Draft Booster',
      description: 'MTG-style draft pack with balanced mana curve',
      cardCount: 15,
      costInEXP: 200,
      costInKeystrokes: 1000,
      rarityWeights: {
        Common: 0.60,
        Uncommon: 0.25,
        Rare: 0.125,
        Epic: 0.02,
        Legendary: 0.005
      },
      shinyBaseRate: 0.04,
      streakMultiplier: 1.15,
      qualityMultiplier: 1.1,
      speedMultiplier: 1.05,
      themeSpecific: true,
      compatibleThemes: ['mtg'],
      levelRequired: 5,
      timeGated: undefined
    }
  ],
  
  assets: {
    cardBackgrounds: {
      'Common': 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)',
      'Uncommon': 'linear-gradient(145deg, #3d3d3d 0%, #2a2a2a 100%)',
      'Rare': 'linear-gradient(145deg, #4d4d2d 0%, #3a3a1a 100%)',
      'Epic': 'linear-gradient(145deg, #4d2d2d 0%, #3a1a1a 100%)',
      'Legendary': 'linear-gradient(145deg, #5d3d2d 0%, #4a2a1a 100%)'
    },
    packImages: {
      'mtg-draft-pack': '📜'
    },
    particleTextures: [],
    soundEffects: {},
    fonts: {
      primary: '"Cinzel", "Times New Roman", serif',
      secondary: '"Roboto", sans-serif',
      decorative: '"Uncial Antiqua", cursive'
    }
  },
  
  animations: {
    cardReveal: 'mtgCardReveal',
    packOpening: 'mtgPackOpen',
    shinyEffect: 'mtgShiny',
    rarityGlow: {
      'Common': 'mtgCommonGlow',
      'Uncommon': 'mtgUncommonGlow', 
      'Rare': 'mtgRareGlow',
      'Epic': 'mtgEpicGlow',
      'Legendary': 'mtgLegendaryGlow'
    },
    particleEffects: {}
  },
  
  mapNoteToCard: (note: TFile, noteContent: string): Partial<TCGCard> => {
    const words = noteContent.split(/\s+/).length;
    const links = (noteContent.match(/\[\[.*?\]\]/g) || []).length;
    const hasFormulas = noteContent.includes('$$');
    
    // MTG-style abilities
    const abilities: string[] = [];
    
    if (links > 5) abilities.push('Network {T}: Draw connections between related knowledge');
    if (hasFormulas) abilities.push('Calculate X: Where X is the complexity of the problem');
    if (words > 2000) abilities.push('Comprehensive: This knowledge enters with additional understanding counters');
    
    // Determine MTG card type based on content
    let cardType = 'Sorcery';
    if (note.path.includes('project')) cardType = 'Artifact';
    else if (hasFormulas) cardType = 'Instant';
    else if (links > 3) cardType = 'Enchantment';
    
    return {
      abilities: abilities.length > 0 ? abilities : ['Basic: Fundamental knowledge that builds understanding'],
      themeData: {
        cardType,
        manaCost: Math.min(Math.floor(words / 200), 10),
        colorIdentity: hasFormulas ? 'Blue' : links > 3 ? 'Green' : 'White'
      }
    };
  },
  
  generateFlavorText: (card: TCGCard): string => {
    const cardType = card.themeData?.cardType || 'Knowledge';
    
    const templates = [
      `"Knowledge is the most powerful magic of all." —Ancient Scholar`,
      `"Understanding flows through those who seek it." —Vault Keeper`,
      `"In the deepest archives lie the greatest truths." —Master Librarian`,
      `"Wisdom shared is wisdom multiplied." —Circle of Sages`,
      `"The mind is the greatest repository of power." —Elder Mage`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  },
  
  calculateThemeSpecificStats: (note: TFile): Record<string, number> => {
    const words = note.stat.size / 5; // Rough word estimate
    return {
      manaCost: Math.min(Math.floor(words / 200), 15),
      power: Math.floor(words / 100),
      toughness: Math.floor(words / 150),
      loyalty: note.path.split('/').length * 2
    };
  }
};

/**
 * Space/Sci-Fi inspired theme with futuristic technology cards
 */
export const SPACE_THEME: ThemeConfiguration = {
  id: 'space',
  name: 'Stellar Knowledge',
  version: '1.0.0',
  author: 'CLIPPY TCG Team',
  description: 'Futuristic space-themed cards with advanced technology',
  
  colorScheme: {
    primary: '#0f1419',
    secondary: '#00d4ff',
    accent: '#7c3aed',
    background: '#000814',
    text: '#e0e7ff'
  },
  
  cardTemplate: {
    backgroundImage: 'linear-gradient(145deg, #0f1419 0%, #000814 50%, #1e1b4b 100%)',
    borderStyle: '2px solid #00d4ff',
    fontFamily: '"Orbitron", "Roboto Mono", monospace',
    rarityIndicators: {
      'Common': { color: '#9ca3af', icon: '▲' },
      'Uncommon': { color: '#3b82f6', icon: '◆' },
      'Rare': { color: '#8b5cf6', icon: '★' },
      'Epic': { color: '#f59e0b', icon: '◇' },
      'Legendary': { color: '#ef4444', icon: '◈' }
    }
  },
  
  packs: [
    {
      id: 'space-tech-pack',
      name: 'Stellar Technology Pack',
      description: 'Advanced knowledge from the cosmos',
      cardCount: 12,
      costInEXP: 180,
      costInKeystrokes: 900,
      rarityWeights: {
        Common: 0.50,
        Uncommon: 0.30,
        Rare: 0.15,
        Epic: 0.04,
        Legendary: 0.01
      },
      shinyBaseRate: 0.06,
      streakMultiplier: 1.25,
      qualityMultiplier: 1.15,
      speedMultiplier: 1.1,
      themeSpecific: true,
      compatibleThemes: ['space'],
      levelRequired: 10,
      timeGated: undefined
    },
    {
      id: 'space-exploration-pack',
      name: 'Deep Space Discovery Pack',
      description: 'Rare knowledge from the far reaches of understanding',
      cardCount: 20,
      costInEXP: 500,
      costInKeystrokes: 2000,
      rarityWeights: {
        Common: 0.25,
        Uncommon: 0.40,
        Rare: 0.25,
        Epic: 0.08,
        Legendary: 0.02
      },
      shinyBaseRate: 0.15,
      streakMultiplier: 1.5,
      qualityMultiplier: 1.3,
      speedMultiplier: 1.2,
      themeSpecific: true,
      compatibleThemes: ['space'],
      levelRequired: 50,
      timeGated: { hours: 24, description: 'Available once per solar day' }
    }
  ],
  
  assets: {
    cardBackgrounds: {
      'Common': 'linear-gradient(145deg, #1f2937 0%, #0f1419 100%)',
      'Uncommon': 'linear-gradient(145deg, #1e3a8a 0%, #0f1419 100%)',
      'Rare': 'linear-gradient(145deg, #5b21b6 0%, #1e1b4b 100%)',
      'Epic': 'linear-gradient(145deg, #d97706 0%, #451a03 100%)',
      'Legendary': 'linear-gradient(145deg, #dc2626 0%, #450a0a 100%)'
    },
    packImages: {
      'space-tech-pack': '🚀',
      'space-exploration-pack': '🌌'
    },
    particleTextures: ['✦', '✧', '⋆', '✩', '✪'],
    soundEffects: {
      'card-reveal': 'space-beep',
      'pack-open': 'space-hiss',
      'shiny-effect': 'space-chime'
    },
    fonts: {
      primary: '"Orbitron", "Roboto Mono", monospace',
      secondary: '"Space Mono", "Courier New", monospace',
      decorative: '"Exo 2", futura, sans-serif'
    }
  },
  
  animations: {
    cardReveal: 'spaceCardReveal',
    packOpening: 'spacePackOpen',
    shinyEffect: 'spaceShiny',
    rarityGlow: {
      'Common': 'spaceCommonGlow',
      'Uncommon': 'spaceUncommonGlow',
      'Rare': 'spaceRareGlow',
      'Epic': 'spaceEpicGlow',
      'Legendary': 'spaceLegendaryGlow'
    },
    particleEffects: {
      'nebula': 'nebulaEffect',
      'stars': 'starField',
      'wormhole': 'wormholeEffect'
    }
  },
  
  mapNoteToCard: (note: TFile, noteContent: string): Partial<TCGCard> => {
    const words = noteContent.split(/\s+/).length;
    const codeBlocks = (noteContent.match(/```/g) || []).length / 2;
    const mathFormulas = (noteContent.match(/\$\$/g) || []).length / 2;
    const links = (noteContent.match(/\[\[.*?\]\]/g) || []).length;
    
    // Space-themed abilities based on content analysis
    const abilities: string[] = [];
    
    if (codeBlocks >= 2) abilities.push('Quantum Processing: Advanced computational capabilities enhance all operations');
    if (mathFormulas >= 1) abilities.push('Stellar Calculations: Mathematical precision provides navigational advantages');
    if (links >= 5) abilities.push('Neural Network: Connected knowledge creates synergistic effects');
    if (words > 1500) abilities.push('Deep Space Memory: Vast knowledge storage with instant recall');
    if (note.path.includes('project')) abilities.push('Mission Protocol: Structured objectives unlock bonus capabilities');
    
    // Determine technology classification
    let techClass = 'Data Core';
    if (codeBlocks > 0) techClass = 'AI System';
    else if (mathFormulas > 0) techClass = 'Navigation Computer';
    else if (links > 10) techClass = 'Communication Array';
    else if (words > 2000) techClass = 'Memory Bank';
    
    // Calculate technology level
    const techLevel = Math.min(Math.floor(words / 300) + codeBlocks * 2 + mathFormulas * 3, 10);
    
    // Determine sector based on file location
    const pathParts = note.path.split('/');
    const sector = pathParts.length > 1 ? pathParts[0].replace(/^\d+\s*-\s*/, '') : 'Unknown Sector';
    
    return {
      abilities: abilities.length > 0 ? abilities : ['Basic Protocol: Fundamental system operations'],
      themeData: {
        techClass,
        techLevel,
        sector,
        energyOutput: Math.floor(words / 100) + codeBlocks * 5,
        networkConnections: links,
        processingPower: codeBlocks * 10 + mathFormulas * 15
      }
    };
  },
  
  generateFlavorText: (card: TCGCard): string => {
    const techClass = card.themeData?.techClass || 'System';
    const sector = card.themeData?.sector || 'the void';
    const techLevel = card.themeData?.techLevel || 1;
    
    const templates = [
      `"This ${techClass} was discovered in the depths of ${sector}, its secrets still echoing through hyperspace."`,
      `"Advanced ${techClass} technology from ${sector}, classified level ${techLevel} by Galactic Command."`,
      `"The knowledge contained within this ${techClass} revolutionized our understanding of ${sector}."`,
      `"Explorers who mastered this ${techClass} opened new frontiers in ${sector} and beyond."`,
      `"Warning: This ${techClass} contains quantum-encrypted data from restricted zones in ${sector}."`
    ];
    
    const rarityIndex = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].indexOf(card.rarity);
    return templates[Math.min(rarityIndex, templates.length - 1)];
  },
  
  calculateThemeSpecificStats: (note: TFile): Record<string, number> => {
    const words = note.stat.size / 5; // Rough word estimate
    const complexity = Math.floor(words / 200);
    
    return {
      energyOutput: 25 + Math.floor(Math.random() * 100) + complexity * 5,
      shieldCapacity: 15 + Math.floor(Math.random() * 85) + complexity * 3,
      processingSpeed: 10 + Math.floor(Math.random() * 90) + complexity * 4,
      networkRange: 20 + Math.floor(Math.random() * 80) + complexity * 2,
      quantumStability: 30 + Math.floor(Math.random() * 70) + complexity * 6
    };
  }
};

// ===== THEME MANAGER =====

/**
 * Central theme management system
 */
export class ThemeManager {
  private themes: Map<string, ThemeConfiguration> = new Map();
  private activeTheme: ThemeConfiguration;
  private customCSS: HTMLStyleElement | null = null;
  
  constructor(initialThemeId: string = 'pokemon') {
    // Register built-in themes
    this.registerTheme(POKEMON_THEME);
    this.registerTheme(MTG_THEME);
    this.registerTheme(SPACE_THEME);
    
    // Set initial theme
    this.activeTheme = this.themes.get(initialThemeId) || POKEMON_THEME;
    
    console.log(`🎨 Theme manager initialized with ${this.themes.size} themes`);
  }
  
  /**
   * Register a new theme
   */
  registerTheme(theme: ThemeConfiguration): void {
    this.themes.set(theme.id, theme);
    console.log(`🎨 Registered theme: ${theme.name} v${theme.version}`);
  }
  
  /**
   * Get all available themes
   */
  getAvailableThemes(): ThemeConfiguration[] {
    return Array.from(this.themes.values());
  }
  
  /**
   * Get theme by ID
   */
  getTheme(themeId: string): ThemeConfiguration | null {
    return this.themes.get(themeId) || null;
  }
  
  /**
   * Get currently active theme
   */
  getActiveTheme(): ThemeConfiguration {
    return this.activeTheme;
  }
  
  /**
   * Switch to a different theme
   */
  switchTheme(themeId: string): boolean {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const theme = this.themes.get(themeId);
        if (!theme) {
          throw new Error(`Theme not found: ${themeId}`);
        }
        
        const previousTheme = this.activeTheme;
        this.activeTheme = theme;
        
        // Apply theme styles
        this.applyThemeStyles();
        
        // Emit theme change event
        this.emitThemeChangeEvent(previousTheme, theme);
        
        console.log(`🎨 Switched to theme: ${theme.name}`);
        return true;
      },
      'Theme switching'
    ) || false;
  }
  
  /**
   * Apply theme-specific CSS styles
   */
  private applyThemeStyles(): void {
    // Remove previous custom CSS
    if (this.customCSS) {
      this.customCSS.remove();
    }
    
    const theme = this.activeTheme;
    
    // Create CSS for the current theme
    const css = `
      /* Theme: ${theme.name} */
      .clippy-tcg-themed {
        --theme-primary: ${theme.colorScheme.primary};
        --theme-secondary: ${theme.colorScheme.secondary};
        --theme-accent: ${theme.colorScheme.accent};
        --theme-background: ${theme.colorScheme.background};
        --theme-text: ${theme.colorScheme.text};
        --theme-font-primary: ${theme.assets.fonts.primary};
        --theme-font-secondary: ${theme.assets.fonts.secondary};
        --theme-font-decorative: ${theme.assets.fonts.decorative};
      }
      
      .clippy-card-themed {
        background: ${theme.cardTemplate.backgroundImage};
        border: ${theme.cardTemplate.borderStyle};
        font-family: ${theme.cardTemplate.fontFamily};
      }
      
      /* Rarity indicators */
      ${Object.entries(theme.cardTemplate.rarityIndicators)
        .map(([rarity, style]) => `
          .card-${rarity.toLowerCase()} .rarity-indicator {
            color: ${style.color};
          }
          .card-${rarity.toLowerCase()} .rarity-indicator::before {
            content: "${style.icon}";
          }
        `).join('\n')}
      
      /* Custom theme CSS */
      ${theme.customCSS || ''}
    `;
    
    // Apply CSS to document
    this.customCSS = document.createElement('style');
    this.customCSS.textContent = css;
    document.head.appendChild(this.customCSS);
  }
  
  /**
   * Generate themed card HTML
   */
  generateCardHTML(card: TCGCard): string {
    const theme = this.activeTheme;
    const rarityInfo = theme.cardTemplate.rarityIndicators[card.rarity];
    
    return `
      <div class="clippy-card-themed card-${card.rarity.toLowerCase()} ${card.isShiny ? 'card-shiny' : ''}">
        <div class="card-header">
          <div class="card-name">${card.name}</div>
          <div class="rarity-indicator" style="color: ${rarityInfo.color}">
            ${rarityInfo.icon}
          </div>
        </div>
        
        <div class="card-body">
          <div class="card-power">${card.powerLevel}</div>
          
          ${card.themeData ? this.generateThemeSpecificContent(card) : ''}
          
          <div class="card-abilities">
            ${card.abilities.map(ability => `
              <div class="ability">${ability}</div>
            `).join('')}
          </div>
        </div>
        
        <div class="card-footer">
          <div class="flavor-text">${card.flavorText}</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate theme-specific content for cards
   */
  private generateThemeSpecificContent(card: TCGCard): string {
    const theme = this.activeTheme;
    
    if (theme.id === 'pokemon') {
      return `
        <div class="pokemon-stats">
          <div class="pokemon-type">${card.themeData?.pokemonType || 'Normal'}</div>
          <div class="pokemon-stage">${card.themeData?.evolutionStage || 'Basic'}</div>
          <div class="pokemon-habitat">Habitat: ${card.themeData?.habitat || 'General'}</div>
        </div>
      `;
    } else if (theme.id === 'mtg') {
      return `
        <div class="mtg-stats">
          <div class="card-type">${card.themeData?.cardType || 'Sorcery'}</div>
          <div class="mana-cost">${'○'.repeat(card.themeData?.manaCost || 1)}</div>
          <div class="color-identity">${card.themeData?.colorIdentity || 'Colorless'}</div>
          ${card.themeData?.power !== undefined ? `
            <div class="power-toughness">${card.themeData.power}/${card.themeData.toughness || 0}</div>
          ` : ''}
        </div>
      `;
    } else if (theme.id === 'space') {
      return `
        <div class="space-stats">
          <div class="tech-class">${card.themeData?.techClass || 'Data Core'}</div>
          <div class="tech-level">Level ${card.themeData?.techLevel || 1}</div>
          <div class="sector">Sector: ${card.themeData?.sector || 'Unknown'}</div>
          <div class="energy-output">Energy: ${card.themeData?.energyOutput || 0}</div>
          ${card.themeData?.networkConnections ? `
            <div class="network-connections">Network: ${card.themeData.networkConnections} nodes</div>
          ` : ''}
        </div>
      `;
    }
    
    return '';
  }
  
  /**
   * Get theme-specific packs
   */
  getThemePacks(themeId?: string): TCGPack[] {
    const theme = themeId ? this.themes.get(themeId) : this.activeTheme;
    return theme ? theme.packs : [];
  }
  
  /**
   * Transform a note into a themed card
   */
  async transformNoteToCard(note: TFile, noteContent: string, baseCard: TCGCard): Promise<TCGCard> {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        const theme = this.activeTheme;
        
        // Apply theme-specific transformations
        const themeSpecific = theme.mapNoteToCard(note, noteContent);
        const themeStats = theme.calculateThemeSpecificStats(note);
        
        // Create themed card
        const themedCard: TCGCard = {
          ...baseCard,
          ...themeSpecific,
          flavorText: theme.generateFlavorText({ ...baseCard, ...themeSpecific }),
          themeData: {
            ...baseCard.themeData,
            ...themeSpecific.themeData,
            themeId: theme.id,
            themeVersion: theme.version,
            themeStats
          }
        };
        
        return themedCard;
      },
      `Theme transformation for ${note.path}`
    ) || baseCard;
  }
  
  /**
   * Create a custom theme from configuration
   */
  createCustomTheme(config: Partial<ThemeConfiguration>): ThemeConfiguration | null {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        if (!config.id || !config.name) {
          throw new Error('Theme ID and name are required');
        }
        
        if (this.themes.has(config.id)) {
          throw new Error(`Theme with ID '${config.id}' already exists`);
        }
        
        // Create theme with defaults
        const defaultTheme = POKEMON_THEME; // Use as base template
        
        const customTheme: ThemeConfiguration = {
          ...defaultTheme,
          ...config,
          version: config.version || '1.0.0',
          author: config.author || 'Custom Theme',
          description: config.description || 'Custom user-created theme',
          packs: config.packs || defaultTheme.packs,
          
          // Ensure required functions exist
          mapNoteToCard: config.mapNoteToCard || defaultTheme.mapNoteToCard,
          generateFlavorText: config.generateFlavorText || defaultTheme.generateFlavorText,
          calculateThemeSpecificStats: config.calculateThemeSpecificStats || defaultTheme.calculateThemeSpecificStats
        };
        
        this.registerTheme(customTheme);
        
        console.log(`🎨 Created custom theme: ${customTheme.name}`);
        return customTheme;
      },
      'Custom theme creation'
    );
  }
  
  /**
   * Export theme configuration for sharing
   */
  exportTheme(themeId: string): string | null {
    const theme = this.themes.get(themeId);
    if (!theme) return null;
    
    // Create exportable version (without functions)
    const exportableTheme = {
      ...theme,
      mapNoteToCard: theme.mapNoteToCard.toString(),
      generateFlavorText: theme.generateFlavorText.toString(),
      calculateThemeSpecificStats: theme.calculateThemeSpecificStats.toString()
    };
    
    return JSON.stringify(exportableTheme, null, 2);
  }
  
  /**
   * Import theme from configuration string
   */
  importTheme(themeData: string): ThemeConfiguration | null {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const parsed = JSON.parse(themeData);
        
        // Reconstruct functions from strings
        const theme: ThemeConfiguration = {
          ...parsed,
          mapNoteToCard: new Function('note', 'noteContent', `return (${parsed.mapNoteToCard})(note, noteContent)`),
          generateFlavorText: new Function('card', `return (${parsed.generateFlavorText})(card)`),
          calculateThemeSpecificStats: new Function('note', `return (${parsed.calculateThemeSpecificStats})(note)`)
        };
        
        this.registerTheme(theme);
        return theme;
      },
      'Theme import'
    );
  }
  
  /**
   * Emit theme change event
   */
  private emitThemeChangeEvent(previousTheme: ThemeConfiguration, newTheme: ThemeConfiguration): void {
    const event = new CustomEvent('clippy-theme-changed', {
      detail: {
        previousTheme: previousTheme.id,
        newTheme: newTheme.id,
        timestamp: Date.now()
      }
    });
    
    document.dispatchEvent(event);
  }
  
  /**
   * Get theme statistics
   */
  getThemeStatistics(): {
    totalThemes: number;
    builtInThemes: number;
    customThemes: number;
    activeTheme: string;
    themesWithPacks: number;
  } {
    const themes = Array.from(this.themes.values());
    const builtInThemes = themes.filter(t => t.author === 'CLIPPY TCG Team');
    const customThemes = themes.filter(t => t.author !== 'CLIPPY TCG Team');
    const themesWithPacks = themes.filter(t => t.packs.length > 0);
    
    return {
      totalThemes: themes.length,
      builtInThemes: builtInThemes.length,
      customThemes: customThemes.length,
      activeTheme: this.activeTheme.id,
      themesWithPacks: themesWithPacks.length
    };
  }
  
  /**
   * Clean up theme manager
   */
  destroy(): void {
    if (this.customCSS) {
      this.customCSS.remove();
      this.customCSS = null;
    }
    
    this.themes.clear();
    
    console.log('🧹 Theme manager destroyed');
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick theme switching function
 */
export function switchTheme(themeManager: ThemeManager, themeId: string): boolean {
  return themeManager.switchTheme(themeId);
}

/**
 * Quick themed card generation function
 */
export async function generateThemedCard(
  themeManager: ThemeManager,
  note: TFile,
  noteContent: string,
  baseCard: TCGCard
): Promise<TCGCard> {
  return await themeManager.transformNoteToCard(note, noteContent, baseCard);
}