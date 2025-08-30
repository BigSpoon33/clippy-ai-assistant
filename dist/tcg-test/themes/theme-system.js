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

// src/features/tcg/themes/theme-system.ts
var theme_system_exports = {};
__export(theme_system_exports, {
  MTG_THEME: () => MTG_THEME,
  POKEMON_THEME: () => POKEMON_THEME,
  SPACE_THEME: () => SPACE_THEME,
  ThemeManager: () => ThemeManager,
  generateThemedCard: () => generateThemedCard,
  switchTheme: () => switchTheme
});
module.exports = __toCommonJS(theme_system_exports);

// src/utils/error-boundaries.ts
var import_obsidian = require("obsidian");
var ClippyErrorBoundaries = class _ClippyErrorBoundaries {
  constructor(config) {
    this.errorHistory = [];
    this.config = {
      showUserNotifications: true,
      logToConsole: true,
      maxErrorHistory: 100,
      retryAttempts: 3,
      ...config
    };
  }
  /**
   * Initialize the error boundary system
   */
  static initialize(config) {
    if (!_ClippyErrorBoundaries.instance) {
      _ClippyErrorBoundaries.instance = new _ClippyErrorBoundaries(config);
    }
  }
  /**
   * Handle an error with context and automatic recovery
   */
  static handleError(error, context, customType, customSeverity) {
    if (!_ClippyErrorBoundaries.instance) {
      _ClippyErrorBoundaries.initialize();
    }
    return _ClippyErrorBoundaries.instance.processError(
      error,
      context,
      customType,
      customSeverity
    );
  }
  /**
   * Execute a function with error boundary protection
   */
  static async withErrorBoundary(fn, context, fallback) {
    try {
      return await fn();
    } catch (error) {
      _ClippyErrorBoundaries.handleError(error, context);
      return fallback;
    }
  }
  /**
   * Get error history for debugging
   */
  static getErrorHistory() {
    if (!_ClippyErrorBoundaries.instance) {
      return [];
    }
    return _ClippyErrorBoundaries.instance.errorHistory.slice();
  }
  /**
   * Clear error history
   */
  static clearErrorHistory() {
    if (_ClippyErrorBoundaries.instance) {
      _ClippyErrorBoundaries.instance.errorHistory = [];
    }
  }
  /**
   * Process and categorize an error
   */
  processError(error, context, customType, customSeverity) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : void 0;
    const errorInfo = {
      type: customType || this.categorizeError(errorMessage, context),
      severity: customSeverity || this.determineSeverity(errorMessage, context),
      message: errorMessage,
      context,
      timestamp: Date.now(),
      stack: errorStack,
      userAction: this.suggestUserAction(errorMessage, context),
      recoveryAction: this.suggestRecoveryAction(errorMessage, context)
    };
    this.addToHistory(errorInfo);
    if (this.config.logToConsole) {
      this.logError(errorInfo);
    }
    if (this.config.showUserNotifications) {
      this.notifyUser(errorInfo);
    }
    return errorInfo;
  }
  /**
   * Categorize error based on message and context
   */
  categorizeError(message, context) {
    const lowerMessage = message.toLowerCase();
    const lowerContext = context?.toLowerCase() || "";
    if (lowerContext.includes("voice") || lowerContext.includes("speech") || lowerContext.includes("audio")) {
      if (lowerMessage.includes("microphone") || lowerMessage.includes("audio capture")) {
        return "audio_capture" /* AUDIO_CAPTURE */;
      }
      if (lowerMessage.includes("speech recognition") || lowerMessage.includes("transcription")) {
        return "speech_recognition" /* SPEECH_RECOGNITION */;
      }
      if (lowerMessage.includes("text to speech") || lowerMessage.includes("synthesis")) {
        return "text_to_speech" /* TEXT_TO_SPEECH */;
      }
      if (lowerMessage.includes("wake word") || lowerMessage.includes("porcupine")) {
        return "wake_word_detection" /* WAKE_WORD_DETECTION */;
      }
      return "voice_processing" /* VOICE_PROCESSING */;
    }
    if (lowerMessage.includes("permission") || lowerMessage.includes("denied") || lowerMessage.includes("not allowed")) {
      return "permissions" /* PERMISSIONS */;
    }
    if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
      return "network" /* NETWORK */;
    }
    if (lowerMessage.includes("api") || lowerMessage.includes("openai") || lowerMessage.includes("anthropic")) {
      return "ai_provider" /* AI_PROVIDER */;
    }
    if (lowerMessage.includes("file") || lowerMessage.includes("read") || lowerMessage.includes("write")) {
      return "file_operations" /* FILE_OPERATIONS */;
    }
    if (lowerContext.includes("graph") || lowerContext.includes("knowledge")) {
      return "knowledge_graph" /* KNOWLEDGE_GRAPH */;
    }
    if (lowerContext.includes("settings") || lowerContext.includes("config")) {
      return "settings" /* SETTINGS */;
    }
    return "unknown" /* UNKNOWN */;
  }
  /**
   * Determine error severity
   */
  determineSeverity(message, context) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("cannot initialize") || lowerMessage.includes("failed to load") || lowerMessage.includes("critical")) {
      return "critical" /* CRITICAL */;
    }
    if (lowerMessage.includes("failed to") && (lowerMessage.includes("voice") || lowerMessage.includes("ai"))) {
      return "high" /* HIGH */;
    }
    if (lowerMessage.includes("timeout") || lowerMessage.includes("not available") || lowerMessage.includes("fallback")) {
      return "medium" /* MEDIUM */;
    }
    return "low" /* LOW */;
  }
  /**
   * Suggest user action based on error
   */
  suggestUserAction(message, context) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("permission") && lowerMessage.includes("microphone")) {
      return "Please allow microphone access in your browser settings and reload Obsidian.";
    }
    if (lowerMessage.includes("api key")) {
      return "Please check your API key in the plugin settings.";
    }
    if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
      return "Please check your internet connection and try again.";
    }
    if (lowerMessage.includes("not supported") || lowerMessage.includes("browser")) {
      return "This feature may not be supported in your browser. Try updating or using a different browser.";
    }
    if (lowerMessage.includes("file not found")) {
      return "Please ensure the file exists and try again.";
    }
    return "Please try again or check the plugin settings.";
  }
  /**
   * Suggest recovery action for automatic handling
   */
  suggestRecoveryAction(message, context) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("fallback") || lowerMessage.includes("not available")) {
      return "retry_with_fallback";
    }
    if (lowerMessage.includes("timeout") || lowerMessage.includes("network")) {
      return "retry_with_backoff";
    }
    if (lowerMessage.includes("initialization")) {
      return "reinitialize_component";
    }
    if (lowerMessage.includes("invalid") || lowerMessage.includes("malformed")) {
      return "reset_to_defaults";
    }
    return "manual_intervention_required";
  }
  /**
   * Add error to history with size limit
   */
  addToHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }
  }
  /**
   * Log error to console with formatting
   */
  logError(errorInfo) {
    const prefix = `[CLIPPY ${errorInfo.severity.toUpperCase()}]`;
    const context = errorInfo.context ? ` [${errorInfo.context}]` : "";
    const timestamp = new Date(errorInfo.timestamp).toISOString();
    console.error(`${prefix}${context} ${errorInfo.message}`);
    if (errorInfo.stack) {
      console.error("Stack trace:", errorInfo.stack);
    }
    if (errorInfo.userAction) {
      console.info("Suggested action:", errorInfo.userAction);
    }
  }
  /**
   * Show user notification based on severity
   */
  notifyUser(errorInfo) {
    const shouldNotify = this.shouldNotifyUser(errorInfo);
    if (!shouldNotify) {
      return;
    }
    const message = this.formatUserMessage(errorInfo);
    switch (errorInfo.severity) {
      case "critical" /* CRITICAL */:
      case "high" /* HIGH */:
        new import_obsidian.Notice(message, 8e3);
        break;
      case "medium" /* MEDIUM */:
        new import_obsidian.Notice(message, 5e3);
        break;
      case "low" /* LOW */:
        new import_obsidian.Notice(message, 3e3);
        break;
    }
  }
  /**
   * Determine if user should be notified
   */
  shouldNotifyUser(errorInfo) {
    if (errorInfo.severity === "low" /* LOW */) {
      const recentSimilarErrors = this.errorHistory.filter(
        (err) => err.type === errorInfo.type && Date.now() - err.timestamp < 6e4
        // Last minute
      ).length;
      return recentSimilarErrors <= 2;
    }
    return true;
  }
  /**
   * Format user-friendly error message
   */
  formatUserMessage(errorInfo) {
    const context = errorInfo.context ? ` (${errorInfo.context})` : "";
    const userAction = errorInfo.userAction ? ` ${errorInfo.userAction}` : "";
    return `CLIPPY Error${context}: ${errorInfo.message}${userAction}`;
  }
  /**
   * Get error statistics for debugging
   */
  static getErrorStatistics() {
    if (!_ClippyErrorBoundaries.instance) {
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
        recentErrors: 0
      };
    }
    const history = _ClippyErrorBoundaries.instance.errorHistory;
    const recentThreshold = Date.now() - 60 * 60 * 1e3;
    const errorsByType = {};
    const errorsBySeverity = {};
    let recentErrors = 0;
    for (const error of history) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      if (error.timestamp > recentThreshold) {
        recentErrors++;
      }
    }
    return {
      totalErrors: history.length,
      errorsByType,
      errorsBySeverity,
      recentErrors
    };
  }
  /**
   * Handle file system operations with error boundaries
   */
  static async fileSystemOperation(fn, context, fallback) {
    try {
      return await fn();
    } catch (error) {
      _ClippyErrorBoundaries.handleError(error, context || "file system operation");
      return fallback;
    }
  }
  /**
   * Handle AI provider operations with error boundaries
   */
  static async aiProviderOperation(fn, context, fallback) {
    try {
      return await fn();
    } catch (error) {
      _ClippyErrorBoundaries.handleError(error, context || "AI provider operation");
      return fallback;
    }
  }
  /**
   * Handle network operations with error boundaries
   */
  static async networkOperation(fn, context, fallback) {
    try {
      return await fn();
    } catch (error) {
      _ClippyErrorBoundaries.handleError(error, context || "network operation");
      return fallback;
    }
  }
  /**
   * Handle validation operations with error boundaries
   */
  static validationOperation(fn, context, fallback) {
    try {
      return fn();
    } catch (error) {
      _ClippyErrorBoundaries.handleError(error, context || "validation operation");
      return fallback;
    }
  }
};

// src/features/tcg/themes/theme-system.ts
var POKEMON_THEME = {
  id: "pokemon",
  name: "Pokemon Knowledge",
  version: "1.0.0",
  author: "CLIPPY TCG Team",
  description: "Classic Pokemon-inspired cards with knowledge creatures",
  colorScheme: {
    primary: "#3b4cca",
    secondary: "#ffde00",
    accent: "#ff0000",
    background: "#ffffff",
    text: "#2c2c2c"
  },
  cardTemplate: {
    backgroundImage: "linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)",
    borderStyle: "2px solid #495057",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    rarityIndicators: {
      "Common": { color: "#6c757d", icon: "\u25CB" },
      "Uncommon": { color: "#28a745", icon: "\u25C6" },
      "Rare": { color: "#007bff", icon: "\u2605" },
      "Epic": { color: "#6610f2", icon: "\u25C6\u25C6" },
      "Legendary": { color: "#fd7e14", icon: "\u2605\u2605\u2605" }
    }
  },
  packs: [
    {
      id: "pokemon-basic-pack",
      name: "Basic Knowledge Booster",
      description: "Standard Pokemon-style knowledge cards",
      cardCount: 11,
      // Pokemon booster pack size
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
      compatibleThemes: ["pokemon"],
      levelRequired: 1,
      timeGated: void 0
    },
    {
      id: "pokemon-premium-pack",
      name: "Elite Knowledge Pack",
      description: "Premium Pokemon-style pack with guaranteed rare+",
      cardCount: 15,
      costInEXP: 400,
      costInKeystrokes: 1500,
      rarityWeights: {
        Common: 0.3,
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
      compatibleThemes: ["pokemon"],
      levelRequired: 25,
      timeGated: void 0
    }
  ],
  assets: {
    cardBackgrounds: {
      "Common": "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmOGY5ZmEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlOWVjZWYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)",
      "Uncommon": "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkNGVkZGEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNhM2Q5YTUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)",
      "Rare": "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNjY2U3ZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2NmI2ZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)",
      "Epic": "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlM2NjZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNhMzY2ZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==)",
      "Legendary": "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmU0YzciLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmI4MzMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg=="
    },
    packImages: {
      "pokemon-basic-pack": "\u{1F392}",
      "pokemon-premium-pack": "\u{1F3C6}"
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
    cardReveal: "pokemonCardReveal",
    packOpening: "pokemonPackOpen",
    shinyEffect: "pokemonShiny",
    rarityGlow: {
      "Common": "commonGlow",
      "Uncommon": "uncommonGlow",
      "Rare": "rareGlow",
      "Epic": "epicGlow",
      "Legendary": "legendaryGlow"
    },
    particleEffects: {}
  },
  mapNoteToCard: (note, noteContent) => {
    const words = noteContent.split(/\s+/).length;
    const hasCode = noteContent.includes("```");
    const hasImages = noteContent.includes("![");
    const abilities = [];
    if (hasCode)
      abilities.push("Code Mastery: Technical implementations provide battle advantages");
    if (hasImages)
      abilities.push("Visual Learning: Enhanced memory through imagery");
    if (words > 1e3)
      abilities.push("Deep Knowledge: Comprehensive understanding boosts all stats");
    if (note.path.includes("project"))
      abilities.push("Project Power: Organized knowledge creates synergy effects");
    return {
      abilities: abilities.length > 0 ? abilities : ["Basic Knowledge: Foundation for greater understanding"],
      themeData: {
        pokemonType: hasCode ? "Digital" : hasImages ? "Visual" : "Conceptual",
        habitat: note.path.split("/")[0] || "General",
        evolutionStage: words < 500 ? "Basic" : words < 1500 ? "Stage 1" : "Stage 2"
      }
    };
  },
  generateFlavorText: (card) => {
    const type = card.themeData?.pokemonType || "Knowledge";
    const habitat = card.themeData?.habitat || "the vault";
    const templates = [
      `This ${type} knowledge roams freely throughout ${habitat}, sharing wisdom with those who seek it.`,
      `A mysterious ${type} concept that appears when understanding is needed most in ${habitat}.`,
      `Legends speak of this ${type} insight that transformed entire regions of ${habitat}.`,
      `Trainers who master this ${type} knowledge gain unprecedented power in ${habitat}.`,
      `Wild ${type} thoughts like these are rarely seen outside of ${habitat}.`
    ];
    const rarityIndex = ["Common", "Uncommon", "Rare", "Epic", "Legendary"].indexOf(card.rarity);
    return templates[Math.min(rarityIndex, templates.length - 1)];
  },
  calculateThemeSpecificStats: (note) => {
    return {
      hp: 50 + Math.floor(Math.random() * 100),
      attack: 20 + Math.floor(Math.random() * 80),
      defense: 20 + Math.floor(Math.random() * 80),
      speed: 10 + Math.floor(Math.random() * 90),
      special: 30 + Math.floor(Math.random() * 70)
    };
  }
};
var MTG_THEME = {
  id: "mtg",
  name: "Magic Knowledge",
  version: "1.0.0",
  author: "CLIPPY TCG Team",
  description: "Magic-inspired spells and artifacts from your knowledge",
  colorScheme: {
    primary: "#0e1114",
    secondary: "#8b7355",
    accent: "#d4af37",
    background: "#1a1a1a",
    text: "#f0f0f0"
  },
  cardTemplate: {
    backgroundImage: "linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)",
    borderStyle: "2px solid #8b7355",
    fontFamily: '"Cinzel", "Times New Roman", serif',
    rarityIndicators: {
      "Common": { color: "#c0c0c0", icon: "\u25CF" },
      "Uncommon": { color: "#c0c0c0", icon: "\u25C6" },
      "Rare": { color: "#ffd700", icon: "\u2605" },
      "Epic": { color: "#ff6b35", icon: "\u2666" },
      "Legendary": { color: "#ff6b35", icon: "\u2605\u2605" }
    }
  },
  packs: [
    {
      id: "mtg-draft-pack",
      name: "Knowledge Draft Booster",
      description: "MTG-style draft pack with balanced mana curve",
      cardCount: 15,
      costInEXP: 200,
      costInKeystrokes: 1e3,
      rarityWeights: {
        Common: 0.6,
        Uncommon: 0.25,
        Rare: 0.125,
        Epic: 0.02,
        Legendary: 5e-3
      },
      shinyBaseRate: 0.04,
      streakMultiplier: 1.15,
      qualityMultiplier: 1.1,
      speedMultiplier: 1.05,
      themeSpecific: true,
      compatibleThemes: ["mtg"],
      levelRequired: 5,
      timeGated: void 0
    }
  ],
  assets: {
    cardBackgrounds: {
      "Common": "linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)",
      "Uncommon": "linear-gradient(145deg, #3d3d3d 0%, #2a2a2a 100%)",
      "Rare": "linear-gradient(145deg, #4d4d2d 0%, #3a3a1a 100%)",
      "Epic": "linear-gradient(145deg, #4d2d2d 0%, #3a1a1a 100%)",
      "Legendary": "linear-gradient(145deg, #5d3d2d 0%, #4a2a1a 100%)"
    },
    packImages: {
      "mtg-draft-pack": "\u{1F4DC}"
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
    cardReveal: "mtgCardReveal",
    packOpening: "mtgPackOpen",
    shinyEffect: "mtgShiny",
    rarityGlow: {
      "Common": "mtgCommonGlow",
      "Uncommon": "mtgUncommonGlow",
      "Rare": "mtgRareGlow",
      "Epic": "mtgEpicGlow",
      "Legendary": "mtgLegendaryGlow"
    },
    particleEffects: {}
  },
  mapNoteToCard: (note, noteContent) => {
    const words = noteContent.split(/\s+/).length;
    const links = (noteContent.match(/\[\[.*?\]\]/g) || []).length;
    const hasFormulas = noteContent.includes("$$");
    const abilities = [];
    if (links > 5)
      abilities.push("Network {T}: Draw connections between related knowledge");
    if (hasFormulas)
      abilities.push("Calculate X: Where X is the complexity of the problem");
    if (words > 2e3)
      abilities.push("Comprehensive: This knowledge enters with additional understanding counters");
    let cardType = "Sorcery";
    if (note.path.includes("project"))
      cardType = "Artifact";
    else if (hasFormulas)
      cardType = "Instant";
    else if (links > 3)
      cardType = "Enchantment";
    return {
      abilities: abilities.length > 0 ? abilities : ["Basic: Fundamental knowledge that builds understanding"],
      themeData: {
        cardType,
        manaCost: Math.min(Math.floor(words / 200), 10),
        colorIdentity: hasFormulas ? "Blue" : links > 3 ? "Green" : "White"
      }
    };
  },
  generateFlavorText: (card) => {
    const cardType = card.themeData?.cardType || "Knowledge";
    const templates = [
      `"Knowledge is the most powerful magic of all." \u2014Ancient Scholar`,
      `"Understanding flows through those who seek it." \u2014Vault Keeper`,
      `"In the deepest archives lie the greatest truths." \u2014Master Librarian`,
      `"Wisdom shared is wisdom multiplied." \u2014Circle of Sages`,
      `"The mind is the greatest repository of power." \u2014Elder Mage`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  },
  calculateThemeSpecificStats: (note) => {
    const words = note.stat.size / 5;
    return {
      manaCost: Math.min(Math.floor(words / 200), 15),
      power: Math.floor(words / 100),
      toughness: Math.floor(words / 150),
      loyalty: note.path.split("/").length * 2
    };
  }
};
var SPACE_THEME = {
  id: "space",
  name: "Stellar Knowledge",
  version: "1.0.0",
  author: "CLIPPY TCG Team",
  description: "Futuristic space-themed cards with advanced technology",
  colorScheme: {
    primary: "#0f1419",
    secondary: "#00d4ff",
    accent: "#7c3aed",
    background: "#000814",
    text: "#e0e7ff"
  },
  cardTemplate: {
    backgroundImage: "linear-gradient(145deg, #0f1419 0%, #000814 50%, #1e1b4b 100%)",
    borderStyle: "2px solid #00d4ff",
    fontFamily: '"Orbitron", "Roboto Mono", monospace',
    rarityIndicators: {
      "Common": { color: "#9ca3af", icon: "\u25B2" },
      "Uncommon": { color: "#3b82f6", icon: "\u25C6" },
      "Rare": { color: "#8b5cf6", icon: "\u2605" },
      "Epic": { color: "#f59e0b", icon: "\u25C7" },
      "Legendary": { color: "#ef4444", icon: "\u25C8" }
    }
  },
  packs: [
    {
      id: "space-tech-pack",
      name: "Stellar Technology Pack",
      description: "Advanced knowledge from the cosmos",
      cardCount: 12,
      costInEXP: 180,
      costInKeystrokes: 900,
      rarityWeights: {
        Common: 0.5,
        Uncommon: 0.3,
        Rare: 0.15,
        Epic: 0.04,
        Legendary: 0.01
      },
      shinyBaseRate: 0.06,
      streakMultiplier: 1.25,
      qualityMultiplier: 1.15,
      speedMultiplier: 1.1,
      themeSpecific: true,
      compatibleThemes: ["space"],
      levelRequired: 10,
      timeGated: void 0
    },
    {
      id: "space-exploration-pack",
      name: "Deep Space Discovery Pack",
      description: "Rare knowledge from the far reaches of understanding",
      cardCount: 20,
      costInEXP: 500,
      costInKeystrokes: 2e3,
      rarityWeights: {
        Common: 0.25,
        Uncommon: 0.4,
        Rare: 0.25,
        Epic: 0.08,
        Legendary: 0.02
      },
      shinyBaseRate: 0.15,
      streakMultiplier: 1.5,
      qualityMultiplier: 1.3,
      speedMultiplier: 1.2,
      themeSpecific: true,
      compatibleThemes: ["space"],
      levelRequired: 50,
      timeGated: { hours: 24, description: "Available once per solar day" }
    }
  ],
  assets: {
    cardBackgrounds: {
      "Common": "linear-gradient(145deg, #1f2937 0%, #0f1419 100%)",
      "Uncommon": "linear-gradient(145deg, #1e3a8a 0%, #0f1419 100%)",
      "Rare": "linear-gradient(145deg, #5b21b6 0%, #1e1b4b 100%)",
      "Epic": "linear-gradient(145deg, #d97706 0%, #451a03 100%)",
      "Legendary": "linear-gradient(145deg, #dc2626 0%, #450a0a 100%)"
    },
    packImages: {
      "space-tech-pack": "\u{1F680}",
      "space-exploration-pack": "\u{1F30C}"
    },
    particleTextures: ["\u2726", "\u2727", "\u22C6", "\u2729", "\u272A"],
    soundEffects: {
      "card-reveal": "space-beep",
      "pack-open": "space-hiss",
      "shiny-effect": "space-chime"
    },
    fonts: {
      primary: '"Orbitron", "Roboto Mono", monospace',
      secondary: '"Space Mono", "Courier New", monospace',
      decorative: '"Exo 2", futura, sans-serif'
    }
  },
  animations: {
    cardReveal: "spaceCardReveal",
    packOpening: "spacePackOpen",
    shinyEffect: "spaceShiny",
    rarityGlow: {
      "Common": "spaceCommonGlow",
      "Uncommon": "spaceUncommonGlow",
      "Rare": "spaceRareGlow",
      "Epic": "spaceEpicGlow",
      "Legendary": "spaceLegendaryGlow"
    },
    particleEffects: {
      "nebula": "nebulaEffect",
      "stars": "starField",
      "wormhole": "wormholeEffect"
    }
  },
  mapNoteToCard: (note, noteContent) => {
    const words = noteContent.split(/\s+/).length;
    const codeBlocks = (noteContent.match(/```/g) || []).length / 2;
    const mathFormulas = (noteContent.match(/\$\$/g) || []).length / 2;
    const links = (noteContent.match(/\[\[.*?\]\]/g) || []).length;
    const abilities = [];
    if (codeBlocks >= 2)
      abilities.push("Quantum Processing: Advanced computational capabilities enhance all operations");
    if (mathFormulas >= 1)
      abilities.push("Stellar Calculations: Mathematical precision provides navigational advantages");
    if (links >= 5)
      abilities.push("Neural Network: Connected knowledge creates synergistic effects");
    if (words > 1500)
      abilities.push("Deep Space Memory: Vast knowledge storage with instant recall");
    if (note.path.includes("project"))
      abilities.push("Mission Protocol: Structured objectives unlock bonus capabilities");
    let techClass = "Data Core";
    if (codeBlocks > 0)
      techClass = "AI System";
    else if (mathFormulas > 0)
      techClass = "Navigation Computer";
    else if (links > 10)
      techClass = "Communication Array";
    else if (words > 2e3)
      techClass = "Memory Bank";
    const techLevel = Math.min(Math.floor(words / 300) + codeBlocks * 2 + mathFormulas * 3, 10);
    const pathParts = note.path.split("/");
    const sector = pathParts.length > 1 ? pathParts[0].replace(/^\d+\s*-\s*/, "") : "Unknown Sector";
    return {
      abilities: abilities.length > 0 ? abilities : ["Basic Protocol: Fundamental system operations"],
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
  generateFlavorText: (card) => {
    const techClass = card.themeData?.techClass || "System";
    const sector = card.themeData?.sector || "the void";
    const techLevel = card.themeData?.techLevel || 1;
    const templates = [
      `"This ${techClass} was discovered in the depths of ${sector}, its secrets still echoing through hyperspace."`,
      `"Advanced ${techClass} technology from ${sector}, classified level ${techLevel} by Galactic Command."`,
      `"The knowledge contained within this ${techClass} revolutionized our understanding of ${sector}."`,
      `"Explorers who mastered this ${techClass} opened new frontiers in ${sector} and beyond."`,
      `"Warning: This ${techClass} contains quantum-encrypted data from restricted zones in ${sector}."`
    ];
    const rarityIndex = ["Common", "Uncommon", "Rare", "Epic", "Legendary"].indexOf(card.rarity);
    return templates[Math.min(rarityIndex, templates.length - 1)];
  },
  calculateThemeSpecificStats: (note) => {
    const words = note.stat.size / 5;
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
var ThemeManager = class {
  constructor(initialThemeId = "pokemon") {
    this.themes = /* @__PURE__ */ new Map();
    this.customCSS = null;
    this.registerTheme(POKEMON_THEME);
    this.registerTheme(MTG_THEME);
    this.registerTheme(SPACE_THEME);
    this.activeTheme = this.themes.get(initialThemeId) || POKEMON_THEME;
    console.log(`\u{1F3A8} Theme manager initialized with ${this.themes.size} themes`);
  }
  /**
   * Register a new theme
   */
  registerTheme(theme) {
    this.themes.set(theme.id, theme);
    console.log(`\u{1F3A8} Registered theme: ${theme.name} v${theme.version}`);
  }
  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Array.from(this.themes.values());
  }
  /**
   * Get theme by ID
   */
  getTheme(themeId) {
    return this.themes.get(themeId) || null;
  }
  /**
   * Get currently active theme
   */
  getActiveTheme() {
    return this.activeTheme;
  }
  /**
   * Switch to a different theme
   */
  switchTheme(themeId) {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const theme = this.themes.get(themeId);
        if (!theme) {
          throw new Error(`Theme not found: ${themeId}`);
        }
        const previousTheme = this.activeTheme;
        this.activeTheme = theme;
        this.applyThemeStyles();
        this.emitThemeChangeEvent(previousTheme, theme);
        console.log(`\u{1F3A8} Switched to theme: ${theme.name}`);
        return true;
      },
      "Theme switching"
    ) || false;
  }
  /**
   * Apply theme-specific CSS styles
   */
  applyThemeStyles() {
    if (this.customCSS) {
      this.customCSS.remove();
    }
    const theme = this.activeTheme;
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
      ${Object.entries(theme.cardTemplate.rarityIndicators).map(([rarity, style]) => `
          .card-${rarity.toLowerCase()} .rarity-indicator {
            color: ${style.color};
          }
          .card-${rarity.toLowerCase()} .rarity-indicator::before {
            content: "${style.icon}";
          }
        `).join("\n")}
      
      /* Custom theme CSS */
      ${theme.customCSS || ""}
    `;
    this.customCSS = document.createElement("style");
    this.customCSS.textContent = css;
    document.head.appendChild(this.customCSS);
  }
  /**
   * Generate themed card HTML
   */
  generateCardHTML(card) {
    const theme = this.activeTheme;
    const rarityInfo = theme.cardTemplate.rarityIndicators[card.rarity];
    return `
      <div class="clippy-card-themed card-${card.rarity.toLowerCase()} ${card.isShiny ? "card-shiny" : ""}">
        <div class="card-header">
          <div class="card-name">${card.name}</div>
          <div class="rarity-indicator" style="color: ${rarityInfo.color}">
            ${rarityInfo.icon}
          </div>
        </div>
        
        <div class="card-body">
          <div class="card-power">${card.powerLevel}</div>
          
          ${card.themeData ? this.generateThemeSpecificContent(card) : ""}
          
          <div class="card-abilities">
            ${card.abilities.map((ability) => `
              <div class="ability">${ability}</div>
            `).join("")}
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
  generateThemeSpecificContent(card) {
    const theme = this.activeTheme;
    if (theme.id === "pokemon") {
      return `
        <div class="pokemon-stats">
          <div class="pokemon-type">${card.themeData?.pokemonType || "Normal"}</div>
          <div class="pokemon-stage">${card.themeData?.evolutionStage || "Basic"}</div>
          <div class="pokemon-habitat">Habitat: ${card.themeData?.habitat || "General"}</div>
        </div>
      `;
    } else if (theme.id === "mtg") {
      return `
        <div class="mtg-stats">
          <div class="card-type">${card.themeData?.cardType || "Sorcery"}</div>
          <div class="mana-cost">${"\u25CB".repeat(card.themeData?.manaCost || 1)}</div>
          <div class="color-identity">${card.themeData?.colorIdentity || "Colorless"}</div>
          ${card.themeData?.power !== void 0 ? `
            <div class="power-toughness">${card.themeData.power}/${card.themeData.toughness || 0}</div>
          ` : ""}
        </div>
      `;
    } else if (theme.id === "space") {
      return `
        <div class="space-stats">
          <div class="tech-class">${card.themeData?.techClass || "Data Core"}</div>
          <div class="tech-level">Level ${card.themeData?.techLevel || 1}</div>
          <div class="sector">Sector: ${card.themeData?.sector || "Unknown"}</div>
          <div class="energy-output">Energy: ${card.themeData?.energyOutput || 0}</div>
          ${card.themeData?.networkConnections ? `
            <div class="network-connections">Network: ${card.themeData.networkConnections} nodes</div>
          ` : ""}
        </div>
      `;
    }
    return "";
  }
  /**
   * Get theme-specific packs
   */
  getThemePacks(themeId) {
    const theme = themeId ? this.themes.get(themeId) : this.activeTheme;
    return theme ? theme.packs : [];
  }
  /**
   * Transform a note into a themed card
   */
  async transformNoteToCard(note, noteContent, baseCard) {
    return await ClippyErrorBoundaries.fileSystemOperation(
      async () => {
        const theme = this.activeTheme;
        const themeSpecific = theme.mapNoteToCard(note, noteContent);
        const themeStats = theme.calculateThemeSpecificStats(note);
        const themedCard = {
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
  createCustomTheme(config) {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        if (!config.id || !config.name) {
          throw new Error("Theme ID and name are required");
        }
        if (this.themes.has(config.id)) {
          throw new Error(`Theme with ID '${config.id}' already exists`);
        }
        const defaultTheme = POKEMON_THEME;
        const customTheme = {
          ...defaultTheme,
          ...config,
          version: config.version || "1.0.0",
          author: config.author || "Custom Theme",
          description: config.description || "Custom user-created theme",
          packs: config.packs || defaultTheme.packs,
          // Ensure required functions exist
          mapNoteToCard: config.mapNoteToCard || defaultTheme.mapNoteToCard,
          generateFlavorText: config.generateFlavorText || defaultTheme.generateFlavorText,
          calculateThemeSpecificStats: config.calculateThemeSpecificStats || defaultTheme.calculateThemeSpecificStats
        };
        this.registerTheme(customTheme);
        console.log(`\u{1F3A8} Created custom theme: ${customTheme.name}`);
        return customTheme;
      },
      "Custom theme creation"
    );
  }
  /**
   * Export theme configuration for sharing
   */
  exportTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme)
      return null;
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
  importTheme(themeData) {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        const parsed = JSON.parse(themeData);
        const theme = {
          ...parsed,
          mapNoteToCard: new Function("note", "noteContent", `return (${parsed.mapNoteToCard})(note, noteContent)`),
          generateFlavorText: new Function("card", `return (${parsed.generateFlavorText})(card)`),
          calculateThemeSpecificStats: new Function("note", `return (${parsed.calculateThemeSpecificStats})(note)`)
        };
        this.registerTheme(theme);
        return theme;
      },
      "Theme import"
    );
  }
  /**
   * Emit theme change event
   */
  emitThemeChangeEvent(previousTheme, newTheme) {
    const event = new CustomEvent("clippy-theme-changed", {
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
  getThemeStatistics() {
    const themes = Array.from(this.themes.values());
    const builtInThemes = themes.filter((t) => t.author === "CLIPPY TCG Team");
    const customThemes = themes.filter((t) => t.author !== "CLIPPY TCG Team");
    const themesWithPacks = themes.filter((t) => t.packs.length > 0);
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
  destroy() {
    if (this.customCSS) {
      this.customCSS.remove();
      this.customCSS = null;
    }
    this.themes.clear();
    console.log("\u{1F9F9} Theme manager destroyed");
  }
};
function switchTheme(themeManager, themeId) {
  return themeManager.switchTheme(themeId);
}
async function generateThemedCard(themeManager, note, noteContent, baseCard) {
  return await themeManager.transformNoteToCard(note, noteContent, baseCard);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MTG_THEME,
  POKEMON_THEME,
  SPACE_THEME,
  ThemeManager,
  generateThemedCard,
  switchTheme
});
//# sourceMappingURL=theme-system.js.map
