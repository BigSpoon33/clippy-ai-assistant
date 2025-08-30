/**
 * CLIPPY TCG Writer - Secure RNG System
 * Cryptographically secure random number generation for fair card distribution
 * Following PRP specifications for statistical fairness and validation
 */

// ===== SEEDED PRNG IMPLEMENTATION =====

/**
 * Simple seeded PRNG using Linear Congruential Generator (LCG) algorithm
 * Used for reproducible testing scenarios only
 */
class SeededPRNG {
  private seed: number;
  
  constructor(seed: string) {
    // Convert string seed to numeric seed using simple hash
    this.seed = this.hashString(seed);
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  // LCG implementation: (a * seed + c) mod m
  next(): number {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
}

// ===== MAIN RNG SYSTEM =====

/**
 * Secure TCG random number generator with cryptographic security
 * and fallback to seeded PRNG for testing scenarios
 */
export class SecureTCGRandom {
  private static instance: SecureTCGRandom;
  private prng: (() => number) | SeededPRNG;
  private useSeeded: boolean;
  
  constructor(seed?: string) {
    this.useSeeded = !!seed;
    
    if (seed) {
      // Use seeded PRNG for reproducible testing
      this.prng = new SeededPRNG(seed);
    } else {
      // Use crypto.getRandomValues for production randomness
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        this.prng = this.createCryptoRNG.bind(this);
      } else {
        // Fallback to Math.random if crypto not available
        console.warn('CLIPPY TCG: crypto.getRandomValues not available, falling back to Math.random');
        this.prng = Math.random.bind(Math);
      }
    }
  }
  
  /**
   * Get singleton instance for consistent randomness
   */
  static getInstance(seed?: string): SecureTCGRandom {
    if (!SecureTCGRandom.instance || seed) {
      SecureTCGRandom.instance = new SecureTCGRandom(seed);
    }
    return SecureTCGRandom.instance;
  }
  
  /**
   * Create cryptographically secure random number generator
   */
  private createCryptoRNG(): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  
  /**
   * Generate a random float between 0 (inclusive) and 1 (exclusive)
   */
  random(): number {
    if (this.useSeeded && this.prng instanceof SeededPRNG) {
      return this.prng.next();
    } else if (typeof this.prng === 'function') {
      return this.prng();
    }
    throw new Error('RNG system not properly initialized');
  }

  /**
   * Generate a cryptographically secure seed string
   */
  generateSeed(): string {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(8, '0')).join('');
  }
  
  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    if (min > max) {
      throw new Error('Min value cannot be greater than max value');
    }
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Generate a random float between min (inclusive) and max (exclusive)
   */
  randomFloat(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min value must be less than max value');
    }
    return this.random() * (max - min) + min;
  }
  
  /**
   * Weighted selection with proper distribution validation
   * Core algorithm for fair card pack generation
   */
  selectByWeight<T>(items: T[], weights: number[]): T {
    // Input validation
    if (!items || !weights) {
      throw new Error('Items and weights arrays must be provided');
    }
    
    if (items.length === 0) {
      throw new Error('Items array cannot be empty');
    }
    
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have same length');
    }
    
    // Validate weights
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < 0) {
        throw new Error('Weights must be non-negative');
      }
      if (!isFinite(weights[i])) {
        throw new Error('Weights must be finite numbers');
      }
    }
    
    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }
    
    // Generate random selection
    let random = this.random() * totalWeight;
    
    // Find selected item using cumulative probability
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    // Fallback to last item (should never reach here with valid weights)
    // This can happen due to floating-point precision issues
    return items[items.length - 1];
  }
  
  /**
   * Select multiple items with weighted probability
   * Useful for generating multiple cards in a pack
   */
  selectMultipleByWeight<T>(
    items: T[], 
    weights: number[], 
    count: number, 
    allowDuplicates = true
  ): T[] {
    if (count <= 0) {
      return [];
    }
    
    const results: T[] = [];
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
  shuffle<T>(array: T[]): T[] {
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
  randomBoolean(probability = 0.5): boolean {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    return this.random() < probability;
  }
  
  /**
   * Select random item from array
   */
  selectFromArray<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Array cannot be empty');
    }
    const index = Math.floor(this.random() * array.length);
    return array[index];
  }

  /**
   * Select weighted option from object with weights
   */
  selectWeightedOption<T extends string>(weights: Record<T, number>): T {
    const keys = Object.keys(weights) as T[];
    const weightValues = Object.values(weights) as number[];
    return this.selectByWeight(keys, weightValues);
  }

  /**
   * Generate random number in range (alias for randomFloat with inclusive max)
   */
  randomRange(min: number, max: number): number {
    return this.randomFloat(min, max + 1);
  }
  
  /**
   * Reset the RNG system (useful for testing)
   */
  reset(seed?: string): void {
    if (seed) {
      this.useSeeded = true;
      this.prng = new SeededPRNG(seed);
    } else {
      this.useSeeded = false;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        this.prng = this.createCryptoRNG.bind(this);
      } else {
        this.prng = Math.random.bind(Math);
      }
    }
  }
}

// ===== STATISTICAL VALIDATION UTILITIES =====

/**
 * Statistical validation utilities for RNG testing
 */
export class RNGValidator {
  /**
   * Test distribution fairness with chi-square test
   */
  static testDistribution(
    items: string[], 
    weights: number[], 
    sampleSize = 10000, 
    seed?: string
  ): {
    passed: boolean;
    chiSquare: number;
    pValue: number;
    expectedCounts: Record<string, number>;
    actualCounts: Record<string, number>;
  } {
    const rng = new SecureTCGRandom(seed);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Calculate expected counts
    const expectedCounts: Record<string, number> = {};
    items.forEach((item, i) => {
      expectedCounts[item] = (weights[i] / totalWeight) * sampleSize;
    });
    
    // Generate sample and count occurrences
    const actualCounts: Record<string, number> = {};
    items.forEach(item => {
      actualCounts[item] = 0;
    });
    
    for (let i = 0; i < sampleSize; i++) {
      const selected = rng.selectByWeight(items, weights);
      actualCounts[selected]++;
    }
    
    // Calculate chi-square statistic
    let chiSquare = 0;
    items.forEach(item => {
      const expected = expectedCounts[item];
      const actual = actualCounts[item];
      if (expected > 0) {
        chiSquare += Math.pow(actual - expected, 2) / expected;
      }
    });
    
    // Calculate p-value (simplified approximation)
    const degreesOfFreedom = items.length - 1;
    const pValue = this.chiSquarePValue(chiSquare, degreesOfFreedom);
    
    // Consider test passed if p-value > 0.05 (95% confidence)
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
  private static chiSquarePValue(chiSquare: number, df: number): number {
    // This is a simplified approximation for common cases
    // In practice, you would use a proper statistical library
    if (df === 1) {
      if (chiSquare < 3.84) return 0.05;
      if (chiSquare < 6.64) return 0.01;
      return 0.001;
    } else if (df === 2) {
      if (chiSquare < 5.99) return 0.05;
      if (chiSquare < 9.21) return 0.01;
      return 0.001;
    } else if (df === 3) {
      if (chiSquare < 7.81) return 0.05;
      if (chiSquare < 11.34) return 0.01;
      return 0.001;
    } else if (df === 4) {
      if (chiSquare < 9.49) return 0.05;
      if (chiSquare < 13.28) return 0.01;
      return 0.001;
    }
    
    // For other degrees of freedom, return a conservative estimate
    return chiSquare < (df + 2 * Math.sqrt(2 * df)) ? 0.05 : 0.001;
  }
  
  /**
   * Test randomness quality using runs test
   */
  static testRandomness(seed?: string, sampleSize = 1000): {
    passed: boolean;
    runsCount: number;
    expectedRuns: number;
    variance: number;
    zScore: number;
  } {
    const rng = new SecureTCGRandom(seed);
    const sequence: boolean[] = [];
    
    // Generate binary sequence
    for (let i = 0; i < sampleSize; i++) {
      sequence.push(rng.random() < 0.5);
    }
    
    // Count runs (sequences of consecutive same values)
    let runsCount = 1;
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] !== sequence[i - 1]) {
        runsCount++;
      }
    }
    
    // Calculate expected runs and variance
    const n1 = sequence.filter(x => x).length; // Count of true values
    const n2 = sequence.filter(x => !x).length; // Count of false values
    const n = n1 + n2;
    
    const expectedRuns = (2 * n1 * n2) / n + 1;
    const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
    
    // Calculate z-score
    const zScore = Math.abs((runsCount - expectedRuns) / Math.sqrt(variance));
    
    // Test passes if z-score < 1.96 (95% confidence)
    const passed = zScore < 1.96;
    
    return {
      passed,
      runsCount,
      expectedRuns,
      variance,
      zScore
    };
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Get the global RNG instance
 */
export function getRNG(seed?: string): SecureTCGRandom {
  return SecureTCGRandom.getInstance(seed);
}

/**
 * Quick weighted selection using global RNG
 */
export function weightedSelect<T>(items: T[], weights: number[]): T {
  return getRNG().selectByWeight(items, weights);
}

/**
 * Quick random integer using global RNG
 */
export function randomInt(min: number, max: number): number {
  return getRNG().randomInt(min, max);
}

/**
 * Quick random boolean using global RNG
 */
export function randomBoolean(probability?: number): boolean {
  return getRNG().randomBoolean(probability);
}

/**
 * Quick array shuffle using global RNG
 */
export function shuffleArray<T>(array: T[]): T[] {
  return getRNG().shuffle(array);
}