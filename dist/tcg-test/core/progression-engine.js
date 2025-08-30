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

// src/features/tcg/core/progression-engine.ts
var progression_engine_exports = {};
__export(progression_engine_exports, {
  ProgressionEngine: () => ProgressionEngine,
  ProgressionFormulas: () => ProgressionFormulas,
  calculatePlayerLevel: () => calculatePlayerLevel,
  calculatePlayerStats: () => calculatePlayerStats
});
module.exports = __toCommonJS(progression_engine_exports);

// src/features/tcg/types.ts
function isValidProgressionFormula(formula) {
  return ["linear", "exponential", "logarithmic", "custom"].includes(formula);
}

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

// src/features/tcg/core/progression-engine.ts
var ProgressionFormulas = class _ProgressionFormulas {
  /**
   * Linear progression: EXP requirement increases linearly
   * Good for steady, predictable advancement
   */
  static linear(level, params) {
    if (level <= 1)
      return 0;
    return params.base + (level - 1) * params.modifier;
  }
  /**
   * Exponential progression: EXP requirement grows exponentially
   * Creates increasing challenge as levels get higher
   */
  static exponential(level, params) {
    if (level <= 1)
      return 0;
    return Math.floor(params.base * Math.pow(level - 1, params.exponent));
  }
  /**
   * Logarithmic progression: EXP requirement grows logarithmically
   * Initial levels are harder, later levels easier (diminishing returns)
   */
  static logarithmic(level, params) {
    if (level <= 1)
      return 0;
    return Math.floor(params.base + params.modifier * Math.log(level));
  }
  /**
   * Custom formula: User-defined progression curve
   * Combines multiple factors for complex progression patterns
   */
  static custom(level, params) {
    if (level <= 1)
      return 0;
    const exponentialComponent = params.base * Math.pow(level - 1, params.exponent);
    const linearComponent = (level - 1) * params.modifier;
    return Math.floor(exponentialComponent + linearComponent);
  }
  /**
   * Get appropriate formula function based on type
   */
  static getFormula(type) {
    switch (type) {
      case "linear":
        return _ProgressionFormulas.linear;
      case "exponential":
        return _ProgressionFormulas.exponential;
      case "logarithmic":
        return _ProgressionFormulas.logarithmic;
      case "custom":
        return _ProgressionFormulas.custom;
      default:
        throw new Error(`Invalid progression formula: ${type}`);
    }
  }
  /**
   * Validate formula parameters for sanity checks
   */
  static validateParams(type, params) {
    switch (type) {
      case "linear":
        return typeof params.base === "number" && typeof params.modifier === "number" && params.base > 0 && params.modifier > 0;
      case "exponential":
        return typeof params.base === "number" && typeof params.exponent === "number" && params.base > 0 && params.exponent >= 1 && params.exponent <= 3;
      case "logarithmic":
        return typeof params.base === "number" && typeof params.modifier === "number" && params.base > 0 && params.modifier > 0;
      case "custom":
        return typeof params.base === "number" && typeof params.exponent === "number" && typeof params.modifier === "number" && params.base > 0 && params.exponent >= 1 && params.exponent <= 2.5 && params.modifier >= 0;
      default:
        return false;
    }
  }
};
var ProgressionEngine = class {
  constructor(settings) {
    this.eventListeners = /* @__PURE__ */ new Map();
    this.settings = settings;
    this.validateSettings();
  }
  /**
   * Calculate level and progression data from total EXP
   * Core function for all level-related calculations
   */
  calculateLevel(totalEXP, previousLevel) {
    return ClippyErrorBoundaries.validationOperation(
      () => {
        if (totalEXP < 0) {
          throw new Error("Total EXP cannot be negative");
        }
        const formula = ProgressionFormulas.getFormula(this.settings.expFormula);
        let currentLevel = 1;
        let currentLevelEXP = 0;
        let low = 1;
        let high = 1e3;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const expRequired = this.calculateTotalEXPForLevel(mid);
          if (expRequired <= totalEXP) {
            currentLevel = mid;
            currentLevelEXP = expRequired;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        const nextLevelEXP = this.calculateTotalEXPForLevel(currentLevel + 1);
        const expToNextLevel = nextLevelEXP - totalEXP;
        const progressPercent = (totalEXP - currentLevelEXP) / (nextLevelEXP - currentLevelEXP) * 100;
        const levelChanged = previousLevel !== void 0 && currentLevel !== previousLevel;
        const levelsGained = previousLevel !== void 0 ? Math.max(0, currentLevel - previousLevel) : 0;
        return {
          level: currentLevel,
          currentLevelEXP,
          nextLevelEXP,
          expToNextLevel,
          progressPercent: Math.min(100, Math.max(0, progressPercent)),
          levelChanged,
          levelsGained
        };
      },
      "Level calculation"
    ) || {
      level: 1,
      currentLevelEXP: 0,
      nextLevelEXP: this.calculateEXPForLevel(2),
      expToNextLevel: this.calculateEXPForLevel(2),
      progressPercent: 0,
      levelChanged: false,
      levelsGained: 0
    };
  }
  /**
   * Calculate EXP required for a specific level
   */
  calculateEXPForLevel(level) {
    if (level <= 1)
      return 0;
    const formula = ProgressionFormulas.getFormula(this.settings.expFormula);
    return formula(level, this.settings.customFormulaParams);
  }
  /**
   * Calculate total EXP required to reach a specific level
   */
  calculateTotalEXPForLevel(level) {
    let totalEXP = 0;
    for (let i = 2; i <= level; i++) {
      totalEXP += this.calculateEXPForLevel(i);
    }
    return totalEXP;
  }
  /**
   * Process level up and generate appropriate events and rewards
   */
  processLevelUp(oldLevel, newLevel, totalEXP) {
    const events = [];
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      const rewards = this.calculateLevelUpRewards(level);
      const event = {
        type: "level_up",
        level,
        previousLevel: level - 1,
        totalEXP,
        rewards,
        timestamp: Date.now()
      };
      events.push(event);
      if (rewards.packsUnlocked.length > 0) {
        rewards.packsUnlocked.forEach((packId) => {
          events.push({
            type: "pack_unlock",
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, packsUnlocked: [packId] },
            timestamp: Date.now()
          });
        });
      }
      if (rewards.themesUnlocked.length > 0) {
        rewards.themesUnlocked.forEach((themeId) => {
          events.push({
            type: "theme_unlock",
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, themesUnlocked: [themeId] },
            timestamp: Date.now()
          });
        });
      }
      if (rewards.achievementsUnlocked.length > 0) {
        rewards.achievementsUnlocked.forEach((achievementId) => {
          events.push({
            type: "achievement_unlock",
            level,
            previousLevel: level - 1,
            totalEXP,
            rewards: { ...rewards, achievementsUnlocked: [achievementId] },
            timestamp: Date.now()
          });
        });
      }
    }
    events.forEach((event) => {
      this.emitEvent("progression_event", event);
      this.emitEvent(event.type, event);
    });
    return events;
  }
  /**
   * Calculate rewards for reaching a specific level
   */
  calculateLevelUpRewards(level) {
    const baseRewards = {
      expBonus: 0,
      statBoosts: {},
      packsUnlocked: [],
      themesUnlocked: [],
      achievementsUnlocked: [],
      specialAbilities: []
    };
    if (level % 5 === 0) {
      baseRewards.statBoosts = {
        power: 2,
        creativity: 1,
        consistency: 1,
        knowledge: 2
      };
    }
    if (level % 10 === 0) {
      baseRewards.expBonus = Math.floor(level * 50);
      baseRewards.packsUnlocked.push("milestone-pack");
    }
    switch (level) {
      case 2:
        baseRewards.packsUnlocked.push("starter-pack");
        break;
      case 5:
        baseRewards.themesUnlocked.push("classic-theme");
        break;
      case 10:
        baseRewards.achievementsUnlocked.push("level-10-milestone");
        baseRewards.specialAbilities.push("daily-bonus");
        break;
      case 15:
        baseRewards.packsUnlocked.push("advanced-pack");
        break;
      case 20:
        baseRewards.themesUnlocked.push("advanced-theme");
        baseRewards.specialAbilities.push("quality-multiplier");
        break;
      case 25:
        baseRewards.achievementsUnlocked.push("quarter-century");
        baseRewards.packsUnlocked.push("rare-pack");
        break;
      case 50:
        baseRewards.achievementsUnlocked.push("level-50-master");
        baseRewards.themesUnlocked.push("master-theme");
        baseRewards.specialAbilities.push("exp-multiplier");
        break;
      case 100:
        baseRewards.achievementsUnlocked.push("centurion");
        baseRewards.packsUnlocked.push("legendary-pack");
        baseRewards.specialAbilities.push("legendary-status");
        break;
    }
    return baseRewards;
  }
  /**
   * Calculate stat modifiers based on level and other factors
   */
  calculateStatModifiers(level, streakDays, notesCount) {
    return {
      power: this.calculatePowerModifier(level, notesCount),
      creativity: this.calculateCreativityModifier(level, notesCount),
      consistency: this.calculateConsistencyModifier(streakDays),
      knowledge: this.calculateKnowledgeModifier(level, notesCount)
    };
  }
  /**
   * Calculate power modifier (overall card collection strength)
   */
  calculatePowerModifier(level, notesCount) {
    const levelBonus = Math.floor(level / 2);
    const noteBonus = Math.floor(notesCount / 10);
    return levelBonus + noteBonus;
  }
  /**
   * Calculate creativity modifier (writing style and uniqueness)
   */
  calculateCreativityModifier(level, notesCount) {
    const levelBonus = Math.floor(level / 3);
    const diversityBonus = Math.floor(Math.sqrt(notesCount));
    return levelBonus + diversityBonus;
  }
  /**
   * Calculate consistency modifier (daily writing streak bonuses)
   */
  calculateConsistencyModifier(streakDays) {
    if (streakDays === 0)
      return 0;
    return Math.floor(5 * Math.log(streakDays + 1));
  }
  /**
   * Calculate knowledge modifier (note interconnectedness and depth)
   */
  calculateKnowledgeModifier(level, notesCount) {
    const levelBonus = Math.floor(level / 4);
    const depthBonus = Math.floor(notesCount / 20);
    return levelBonus + depthBonus;
  }
  /**
   * Check if a pack should be unlocked at the given level
   */
  isPackUnlockedAtLevel(packId, level) {
    const packUnlockLevels = {
      "starter-pack": 2,
      "basic-pack": 1,
      "advanced-pack": 15,
      "rare-pack": 25,
      "legendary-pack": 100,
      "milestone-pack": 10
    };
    return level >= (packUnlockLevels[packId] || 1);
  }
  /**
   * Register event listener for progression events
   */
  onProgressionEvent(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }
  /**
   * Emit progression event to registered listeners
   */
  emitEvent(eventType, event) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in progression event listener for ${eventType}:`, error);
        }
      });
    }
  }
  /**
   * Update settings and revalidate
   */
  updateSettings(newSettings) {
    this.settings = newSettings;
    this.validateSettings();
    console.log("\u2699\uFE0F Progression engine settings updated");
  }
  /**
   * Validate settings for mathematical correctness
   */
  validateSettings() {
    if (!isValidProgressionFormula(this.settings.expFormula)) {
      throw new Error(`Invalid progression formula: ${this.settings.expFormula}`);
    }
    if (!ProgressionFormulas.validateParams(this.settings.expFormula, this.settings.customFormulaParams)) {
      throw new Error(`Invalid formula parameters for ${this.settings.expFormula}`);
    }
    if (this.settings.keystrokesPerEXP <= 0) {
      throw new Error("Keystrokes per EXP must be positive");
    }
    console.log("\u2705 Progression engine settings validated");
  }
  /**
   * Get progression statistics for debugging and display
   */
  getProgressionStats(maxLevel = 100) {
    const levels = [];
    const expRequirements = [];
    const totalExpRequirements = [];
    for (let level = 1; level <= maxLevel; level++) {
      levels.push(level);
      const expForLevel = this.calculateEXPForLevel(level);
      expRequirements.push(expForLevel);
      const totalExpForLevel = this.calculateTotalEXPForLevel(level);
      totalExpRequirements.push(totalExpForLevel);
    }
    const averageExpPerLevel = expRequirements.slice(1).reduce((sum, exp) => sum + exp, 0) / (maxLevel - 1);
    const maxExpForLevel = Math.max(...expRequirements);
    return {
      levels,
      expRequirements,
      totalExpRequirements,
      averageExpPerLevel,
      maxExpForLevel
    };
  }
  /**
   * Cleanup and destroy progression engine
   */
  destroy() {
    this.eventListeners.clear();
    console.log("\u{1F9F9} Progression engine destroyed");
  }
};
function calculatePlayerLevel(totalEXP, settings, previousLevel) {
  const engine = new ProgressionEngine(settings);
  return engine.calculateLevel(totalEXP, previousLevel);
}
function calculatePlayerStats(level, streakDays, notesCount, settings) {
  const engine = new ProgressionEngine(settings);
  return engine.calculateStatModifiers(level, streakDays, notesCount);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProgressionEngine,
  ProgressionFormulas,
  calculatePlayerLevel,
  calculatePlayerStats
});
//# sourceMappingURL=progression-engine.js.map
