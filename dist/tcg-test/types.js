var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/features/tcg/types.ts
var types_exports = {};
__export(types_exports, {
  DEFAULT_TCG_SETTINGS: () => DEFAULT_TCG_SETTINGS,
  isValidCardRarity: () => isValidCardRarity,
  isValidProgressionFormula: () => isValidProgressionFormula
});
module.exports = __toCommonJS(types_exports);
function isValidCardRarity(rarity) {
  return ["Common", "Uncommon", "Rare", "Epic", "Legendary"].includes(rarity);
}
function isValidProgressionFormula(formula) {
  return ["linear", "exponential", "logarithmic", "custom"].includes(formula);
}
var DEFAULT_TCG_SETTINGS = {
  enabled: true,
  // Enabled for testing
  // Core progression settings
  keystrokesPerEXP: 500,
  // Balanced for sustained engagement
  expFormula: "exponential",
  customFormulaParams: {
    base: 100,
    exponent: 1.2,
    modifier: 0
  },
  // Pack system settings
  packUnlockThreshold: 2,
  // Unlock packs at level 2
  maxPacksPerDay: 10,
  // Reasonable daily limit
  autoOpenPacks: false,
  // Let user control pack opening
  // Theme settings
  activeTheme: "pokemon",
  customThemes: {},
  // No custom themes by default
  // AI commentary settings
  enableAICommentary: true,
  commentaryPrompts: {
    highPerformance: "Incredible speed! Your writing power level is off the charts!",
    levelUp: "Level up achieved! Your knowledge mastery grows stronger!",
    packOpening: "Pack opening time! Let's see what rare knowledge cards await!",
    shinyCard: "Shiny discovery! A legendary insight appears in your collection!",
    achievement: "Achievement unlocked! Your dedication to knowledge grows!"
  },
  // Player Card System settings
  autoUpdatePlayerCard: true,
  playerCardUpdateInterval: 5,
  // 5 minutes
  // Performance settings
  performanceMode: false,
  maxParticles: 100,
  animationQuality: "medium",
  // Achievement system
  achievements: {
    "first-level": {
      name: "Getting Started",
      description: "Reach your first level in the TCG system",
      icon: "\u{1F31F}",
      conditions: { type: "level", value: 1 },
      rewards: { exp: 50 }
    },
    "first-pack": {
      name: "Pack Opener",
      description: "Open your first card pack",
      icon: "\u{1F4E6}",
      conditions: { type: "packs_opened", value: 1 },
      rewards: { exp: 25 }
    },
    "streak-7": {
      name: "Weekly Warrior",
      description: "Maintain a 7-day writing streak",
      icon: "\u{1F525}",
      conditions: { type: "streak", value: 7 },
      rewards: { exp: 200, packs: ["bonus-pack"] }
    },
    "cards-50": {
      name: "Collector",
      description: "Collect 50 unique cards",
      icon: "\u{1F3B4}",
      conditions: { type: "cards_collected", value: 50 },
      rewards: { exp: 500, unlocks: ["rare-theme"] }
    }
  },
  // World Generation System
  worldGeneration: {
    // Response triggers
    keystrokeTrigger: true,
    keystrokeInterval: 500,
    // Every 500 keystrokes
    timerTrigger: true,
    timerInterval: 10,
    // Every 10 minutes
    // World generation weights (higher = more likely)
    locationWeights: {
      village: 0.2,
      town: 0.15,
      city: 0.1,
      forest: 0.15,
      plains: 0.15,
      mountains: 0.1,
      coast: 0.05,
      desert: 0.05,
      temple: 0.03,
      cave: 0.02
    },
    weatherWeights: {
      sunny: 0.3,
      cloudy: 0.25,
      rainy: 0.2,
      stormy: 0.1,
      foggy: 0.1,
      snowy: 0.03,
      windy: 0.02
    },
    threatWeights: {
      peaceful: 0.4,
      neutral: 0.35,
      tense: 0.15,
      dangerous: 0.08,
      hostile: 0.02
    },
    // Player influence factors
    kmpInfluence: 0.3,
    // KPM moderately affects world state
    qualityInfluence: 0.4,
    // Writing quality strongly affects world state
    vaultInfluence: 0.2,
    // Vault activity somewhat affects world state
    // Event system
    enableEvents: true,
    baseEventChance: 0.15,
    // 15% base chance for events
    eventCooldown: 1e3
    // At least 1000 keystrokes between events
  },
  // Advanced settings
  enableDebugMode: false,
  rngSeed: void 0,
  // Use secure randomness by default
  dataRetentionDays: 365,
  // Keep data for 1 year
  exportEnabled: true
  // Allow data export
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_TCG_SETTINGS,
  isValidCardRarity,
  isValidProgressionFormula
});
//# sourceMappingURL=types.js.map
