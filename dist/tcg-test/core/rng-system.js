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

// src/features/tcg/core/rng-system.ts
var rng_system_exports = {};
__export(rng_system_exports, {
  RNGValidator: () => RNGValidator,
  SecureTCGRandom: () => SecureTCGRandom,
  getRNG: () => getRNG,
  randomBoolean: () => randomBoolean,
  randomInt: () => randomInt,
  shuffleArray: () => shuffleArray,
  weightedSelect: () => weightedSelect
});
module.exports = __toCommonJS(rng_system_exports);
var SeededPRNG = class {
  constructor(seed) {
    this.seed = this.hashString(seed);
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // LCG implementation: (a * seed + c) mod m
  next() {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
};
var SecureTCGRandom = class _SecureTCGRandom {
  constructor(seed) {
    this.useSeeded = !!seed;
    if (seed) {
      this.prng = new SeededPRNG(seed);
    } else {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        this.prng = this.createCryptoRNG.bind(this);
      } else {
        console.warn("CLIPPY TCG: crypto.getRandomValues not available, falling back to Math.random");
        this.prng = Math.random.bind(Math);
      }
    }
  }
  /**
   * Get singleton instance for consistent randomness
   */
  static getInstance(seed) {
    if (!_SecureTCGRandom.instance || seed) {
      _SecureTCGRandom.instance = new _SecureTCGRandom(seed);
    }
    return _SecureTCGRandom.instance;
  }
  /**
   * Create cryptographically secure random number generator
   */
  createCryptoRNG() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (4294967295 + 1);
  }
  /**
   * Generate a random float between 0 (inclusive) and 1 (exclusive)
   */
  random() {
    if (this.useSeeded && this.prng instanceof SeededPRNG) {
      return this.prng.next();
    } else if (typeof this.prng === "function") {
      return this.prng();
    }
    throw new Error("RNG system not properly initialized");
  }
  /**
   * Generate a cryptographically secure seed string
   */
  generateSeed() {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(8, "0")).join("");
  }
  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min, max) {
    if (min > max) {
      throw new Error("Min value cannot be greater than max value");
    }
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  /**
   * Generate a random float between min (inclusive) and max (exclusive)
   */
  randomFloat(min, max) {
    if (min >= max) {
      throw new Error("Min value must be less than max value");
    }
    return this.random() * (max - min) + min;
  }
  /**
   * Weighted selection with proper distribution validation
   * Core algorithm for fair card pack generation
   */
  selectByWeight(items, weights) {
    if (!items || !weights) {
      throw new Error("Items and weights arrays must be provided");
    }
    if (items.length === 0) {
      throw new Error("Items array cannot be empty");
    }
    if (items.length !== weights.length) {
      throw new Error("Items and weights arrays must have same length");
    }
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < 0) {
        throw new Error("Weights must be non-negative");
      }
      if (!isFinite(weights[i])) {
        throw new Error("Weights must be finite numbers");
      }
    }
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      throw new Error("Total weight cannot be zero");
    }
    let random = this.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }
  /**
   * Select multiple items with weighted probability
   * Useful for generating multiple cards in a pack
   */
  selectMultipleByWeight(items, weights, count, allowDuplicates = true) {
    if (count <= 0) {
      return [];
    }
    const results = [];
    const availableItems = [...items];
    const availableWeights = [...weights];
    for (let i = 0; i < count; i++) {
      if (availableItems.length === 0) {
        break;
      }
      const selected = this.selectByWeight(availableItems, availableWeights);
      results.push(selected);
      if (!allowDuplicates) {
        const index = availableItems.indexOf(selected);
        if (index !== -1) {
          availableItems.splice(index, 1);
          availableWeights.splice(index, 1);
        }
      }
    }
    return results;
  }
  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  /**
   * Generate random boolean with specified probability
   */
  randomBoolean(probability = 0.5) {
    if (probability < 0 || probability > 1) {
      throw new Error("Probability must be between 0 and 1");
    }
    return this.random() < probability;
  }
  /**
   * Select random item from array
   */
  selectFromArray(array) {
    if (array.length === 0) {
      throw new Error("Array cannot be empty");
    }
    const index = Math.floor(this.random() * array.length);
    return array[index];
  }
  /**
   * Select weighted option from object with weights
   */
  selectWeightedOption(weights) {
    const keys = Object.keys(weights);
    const weightValues = Object.values(weights);
    return this.selectByWeight(keys, weightValues);
  }
  /**
   * Generate random number in range (alias for randomFloat with inclusive max)
   */
  randomRange(min, max) {
    return this.randomFloat(min, max + 1);
  }
  /**
   * Reset the RNG system (useful for testing)
   */
  reset(seed) {
    if (seed) {
      this.useSeeded = true;
      this.prng = new SeededPRNG(seed);
    } else {
      this.useSeeded = false;
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        this.prng = this.createCryptoRNG.bind(this);
      } else {
        this.prng = Math.random.bind(Math);
      }
    }
  }
};
var RNGValidator = class {
  /**
   * Test distribution fairness with chi-square test
   */
  static testDistribution(items, weights, sampleSize = 1e4, seed) {
    const rng = new SecureTCGRandom(seed);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const expectedCounts = {};
    items.forEach((item, i) => {
      expectedCounts[item] = weights[i] / totalWeight * sampleSize;
    });
    const actualCounts = {};
    items.forEach((item) => {
      actualCounts[item] = 0;
    });
    for (let i = 0; i < sampleSize; i++) {
      const selected = rng.selectByWeight(items, weights);
      actualCounts[selected]++;
    }
    let chiSquare = 0;
    items.forEach((item) => {
      const expected = expectedCounts[item];
      const actual = actualCounts[item];
      if (expected > 0) {
        chiSquare += Math.pow(actual - expected, 2) / expected;
      }
    });
    const degreesOfFreedom = items.length - 1;
    const pValue = this.chiSquarePValue(chiSquare, degreesOfFreedom);
    const passed = pValue > 0.05;
    return {
      passed,
      chiSquare,
      pValue,
      expectedCounts,
      actualCounts
    };
  }
  /**
   * Simplified chi-square p-value calculation
   * For accurate results, use a proper statistical library
   */
  static chiSquarePValue(chiSquare, df) {
    if (df === 1) {
      if (chiSquare < 3.84)
        return 0.05;
      if (chiSquare < 6.64)
        return 0.01;
      return 1e-3;
    } else if (df === 2) {
      if (chiSquare < 5.99)
        return 0.05;
      if (chiSquare < 9.21)
        return 0.01;
      return 1e-3;
    } else if (df === 3) {
      if (chiSquare < 7.81)
        return 0.05;
      if (chiSquare < 11.34)
        return 0.01;
      return 1e-3;
    } else if (df === 4) {
      if (chiSquare < 9.49)
        return 0.05;
      if (chiSquare < 13.28)
        return 0.01;
      return 1e-3;
    }
    return chiSquare < df + 2 * Math.sqrt(2 * df) ? 0.05 : 1e-3;
  }
  /**
   * Test randomness quality using runs test
   */
  static testRandomness(seed, sampleSize = 1e3) {
    const rng = new SecureTCGRandom(seed);
    const sequence = [];
    for (let i = 0; i < sampleSize; i++) {
      sequence.push(rng.random() < 0.5);
    }
    let runsCount = 1;
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] !== sequence[i - 1]) {
        runsCount++;
      }
    }
    const n1 = sequence.filter((x) => x).length;
    const n2 = sequence.filter((x) => !x).length;
    const n = n1 + n2;
    const expectedRuns = 2 * n1 * n2 / n + 1;
    const variance = 2 * n1 * n2 * (2 * n1 * n2 - n) / (n * n * (n - 1));
    const zScore = Math.abs((runsCount - expectedRuns) / Math.sqrt(variance));
    const passed = zScore < 1.96;
    return {
      passed,
      runsCount,
      expectedRuns,
      variance,
      zScore
    };
  }
};
function getRNG(seed) {
  return SecureTCGRandom.getInstance(seed);
}
function weightedSelect(items, weights) {
  return getRNG().selectByWeight(items, weights);
}
function randomInt(min, max) {
  return getRNG().randomInt(min, max);
}
function randomBoolean(probability) {
  return getRNG().randomBoolean(probability);
}
function shuffleArray(array) {
  return getRNG().shuffle(array);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RNGValidator,
  SecureTCGRandom,
  getRNG,
  randomBoolean,
  randomInt,
  shuffleArray,
  weightedSelect
});
//# sourceMappingURL=rng-system.js.map
