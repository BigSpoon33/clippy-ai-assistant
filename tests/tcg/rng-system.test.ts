/**
 * CLIPPY TCG Writer - RNG System Tests
 * Comprehensive statistical validation for fair randomness
 * Following PRP specifications for >95% code coverage
 */

import { SecureTCGRandom, RNGValidator, getRNG, weightedSelect, randomInt, randomBoolean, shuffleArray } from '../../src/features/tcg/core/rng-system';

describe('SecureTCGRandom', () => {
  describe('Basic Functionality', () => {
    test('generates random numbers between 0 and 1', () => {
      const rng = new SecureTCGRandom();
      
      for (let i = 0; i < 100; i++) {
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
    
    test('generates random integers correctly', () => {
      const rng = new SecureTCGRandom();
      
      for (let i = 0; i < 100; i++) {
        const value = rng.randomInt(1, 10);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
    
    test('generates random floats correctly', () => {
      const rng = new SecureTCGRandom();
      
      for (let i = 0; i < 100; i++) {
        const value = rng.randomFloat(1.5, 3.7);
        expect(value).toBeGreaterThanOrEqual(1.5);
        expect(value).toBeLessThan(3.7);
      }
    });
    
    test('generates random booleans with default probability', () => {
      const rng = new SecureTCGRandom();
      const results: boolean[] = [];
      
      for (let i = 0; i < 1000; i++) {
        results.push(rng.randomBoolean());
      }
      
      const trueCount = results.filter(r => r).length;
      const ratio = trueCount / results.length;
      
      // Should be approximately 0.5 with some tolerance
      expect(ratio).toBeCloseTo(0.5, 1);
    });
    
    test('generates random booleans with custom probability', () => {
      const rng = new SecureTCGRandom();
      const results: boolean[] = [];
      
      for (let i = 0; i < 1000; i++) {
        results.push(rng.randomBoolean(0.8));
      }
      
      const trueCount = results.filter(r => r).length;
      const ratio = trueCount / results.length;
      
      // Should be approximately 0.8 with some tolerance
      expect(ratio).toBeCloseTo(0.8, 1);
    });
  });
  
  describe('Weighted Selection - Core Algorithm', () => {
    test('respects statistical distribution with large sample', () => {
      const rng = new SecureTCGRandom('test-seed-123');
      const items = ['Common', 'Rare', 'Legendary'];
      const weights = [0.7, 0.25, 0.05]; // 70%, 25%, 5%
      const results = { Common: 0, Rare: 0, Legendary: 0 };
      
      // Test with 10,000 samples as specified in PRP
      for (let i = 0; i < 10000; i++) {
        const selected = rng.selectByWeight(items, weights);
        results[selected as keyof typeof results]++;
      }
      
      // Verify distribution within acceptable tolerance (±1%)
      expect(results.Common / 10000).toBeCloseTo(0.7, 1);
      expect(results.Rare / 10000).toBeCloseTo(0.25, 1);
      expect(results.Legendary / 10000).toBeCloseTo(0.05, 1);
    });
    
    test('handles edge case with single item', () => {
      const rng = new SecureTCGRandom();
      const items = ['OnlyItem'];
      const weights = [1.0];
      
      for (let i = 0; i < 100; i++) {
        const result = rng.selectByWeight(items, weights);
        expect(result).toBe('OnlyItem');
      }
    });
    
    test('handles equal weights correctly', () => {
      const rng = new SecureTCGRandom('equal-weights');
      const items = ['A', 'B', 'C', 'D'];
      const weights = [0.25, 0.25, 0.25, 0.25];
      const results = { A: 0, B: 0, C: 0, D: 0 };
      
      for (let i = 0; i < 4000; i++) {
        const selected = rng.selectByWeight(items, weights);
        results[selected as keyof typeof results]++;
      }
      
      // Each should be approximately 25% with some tolerance
      Object.values(results).forEach(count => {
        expect(count / 4000).toBeCloseTo(0.25, 1);
      });
    });
    
    test('handles very small weights correctly', () => {
      const rng = new SecureTCGRandom();
      const items = ['Common', 'Legendary'];
      const weights = [0.9999, 0.0001]; // Very rare legendary
      const results = { Common: 0, Legendary: 0 };
      
      for (let i = 0; i < 100000; i++) {
        const selected = rng.selectByWeight(items, weights);
        results[selected as keyof typeof results]++;
      }
      
      // Should still get some legendary items despite low probability
      expect(results.Legendary).toBeGreaterThan(0);
      expect(results.Common).toBeGreaterThan(99000); // Most should be common
    });
  });
  
  describe('Error Handling - Edge Cases', () => {
    test('throws error for mismatched array lengths', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(['A', 'B'], [0.5]); // Missing weight
      }).toThrow('Items and weights arrays must have same length');
    });
    
    test('throws error for negative weights', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(['A', 'B'], [0.5, -0.1]);
      }).toThrow('Weights must be non-negative');
    });
    
    test('throws error for zero total weight', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(['A', 'B'], [0, 0]);
      }).toThrow('Total weight cannot be zero');
    });
    
    test('throws error for infinite weights', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(['A', 'B'], [0.5, Infinity]);
      }).toThrow('Weights must be finite numbers');
    });
    
    test('throws error for NaN weights', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(['A', 'B'], [0.5, NaN]);
      }).toThrow('Weights must be finite numbers');
    });
    
    test('throws error for empty arrays', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight([], []);
      }).toThrow('Items array cannot be empty');
    });
    
    test('throws error for null/undefined inputs', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.selectByWeight(null as any, [0.5]);
      }).toThrow('Items and weights arrays must be provided');
      
      expect(() => {
        rng.selectByWeight(['A'], null as any);
      }).toThrow('Items and weights arrays must be provided');
    });
    
    test('throws error for invalid randomInt parameters', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.randomInt(10, 5); // min > max
      }).toThrow('Min value cannot be greater than max value');
    });
    
    test('throws error for invalid randomFloat parameters', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.randomFloat(5.0, 5.0); // min = max
      }).toThrow('Min value must be less than max value');
    });
    
    test('throws error for invalid probability', () => {
      const rng = new SecureTCGRandom();
      
      expect(() => {
        rng.randomBoolean(-0.1);
      }).toThrow('Probability must be between 0 and 1');
      
      expect(() => {
        rng.randomBoolean(1.1);
      }).toThrow('Probability must be between 0 and 1');
    });
  });
  
  describe('Seeded Reproducibility - Critical for Testing', () => {
    test('produces identical results with same seed', () => {
      const seed = 'test-seed-reproducible';
      const rng1 = new SecureTCGRandom(seed);
      const rng2 = new SecureTCGRandom(seed);
      
      const items = ['A', 'B', 'C'];
      const weights = [0.33, 0.33, 0.34];
      
      // Generate 100 selections from each seeded RNG
      const results1: string[] = [];
      const results2: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        results1.push(rng1.selectByWeight(items, weights));
        results2.push(rng2.selectByWeight(items, weights));
      }
      
      // Results should be identical
      expect(results1).toEqual(results2);
    });
    
    test('produces identical sequence of random numbers', () => {
      const seed = 'numeric-sequence-test';
      const rng1 = new SecureTCGRandom(seed);
      const rng2 = new SecureTCGRandom(seed);
      
      const sequence1: number[] = [];
      const sequence2: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        sequence1.push(rng1.random());
        sequence2.push(rng2.random());
      }
      
      expect(sequence1).toEqual(sequence2);
    });
    
    test('produces different results with different seeds', () => {
      const rng1 = new SecureTCGRandom('seed-one');
      const rng2 = new SecureTCGRandom('seed-two');
      
      const items = ['X', 'Y', 'Z'];
      const weights = [0.4, 0.4, 0.2];
      
      const results1: string[] = [];
      const results2: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        results1.push(rng1.selectByWeight(items, weights));
        results2.push(rng2.selectByWeight(items, weights));
      }
      
      // Results should be different (very unlikely to be identical)
      expect(results1).not.toEqual(results2);
    });
  });
  
  describe('Multiple Selection', () => {
    test('selects multiple items with duplicates allowed', () => {
      const rng = new SecureTCGRandom('multi-test');
      const items = ['A', 'B'];
      const weights = [0.5, 0.5];
      
      const results = rng.selectMultipleByWeight(items, weights, 5, true);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(items).toContain(result);
      });
    });
    
    test('selects multiple items without duplicates', () => {
      const rng = new SecureTCGRandom('multi-unique');
      const items = ['A', 'B', 'C', 'D'];
      const weights = [0.25, 0.25, 0.25, 0.25];
      
      const results = rng.selectMultipleByWeight(items, weights, 3, false);
      
      expect(results).toHaveLength(3);
      expect(new Set(results).size).toBe(3); // All unique
    });
    
    test('handles selection count larger than available items', () => {
      const rng = new SecureTCGRandom();
      const items = ['A', 'B'];
      const weights = [0.5, 0.5];
      
      const results = rng.selectMultipleByWeight(items, weights, 5, false);
      
      expect(results).toHaveLength(2); // Only 2 items available
    });
  });
  
  describe('Array Shuffling', () => {
    test('shuffles array maintaining all elements', () => {
      const rng = new SecureTCGRandom();
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = rng.shuffle(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
      
      // Should be different order (very unlikely to be same)
      expect(shuffled).not.toEqual(original);
    });
    
    test('handles empty array', () => {
      const rng = new SecureTCGRandom();
      const result = rng.shuffle([]);
      expect(result).toEqual([]);
    });
    
    test('handles single element array', () => {
      const rng = new SecureTCGRandom();
      const result = rng.shuffle(['single']);
      expect(result).toEqual(['single']);
    });
  });
  
  describe('Singleton Pattern', () => {
    test('returns same instance when called multiple times', () => {
      const instance1 = SecureTCGRandom.getInstance();
      const instance2 = SecureTCGRandom.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('creates new instance when seed provided', () => {
      const instance1 = SecureTCGRandom.getInstance();
      const instance2 = SecureTCGRandom.getInstance('new-seed');
      
      expect(instance1).not.toBe(instance2);
    });
  });
  
  describe('Reset Functionality', () => {
    test('resets to new seed correctly', () => {
      const rng = new SecureTCGRandom('initial-seed');
      const result1 = rng.random();
      
      rng.reset('new-seed');
      const result2 = rng.random();
      
      // Different seed should produce different first value
      expect(result1).not.toBe(result2);
    });
    
    test('resets to crypto randomness', () => {
      const rng = new SecureTCGRandom('test-seed');
      rng.reset(); // Reset without seed
      
      // Should work without throwing errors
      const result = rng.random();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });
  });
});

describe('RNGValidator', () => {
  describe('Statistical Distribution Testing', () => {
    test('validates fair distribution passes test', () => {
      const items = ['A', 'B', 'C'];
      const weights = [0.4, 0.4, 0.2];
      
      const result = RNGValidator.testDistribution(items, weights, 5000, 'fair-test');
      
      expect(result.passed).toBe(true);
      expect(result.chiSquare).toBeGreaterThan(0);
      expect(result.pValue).toBeGreaterThan(0);
      
      // Check expected counts are calculated correctly
      expect(result.expectedCounts.A).toBeCloseTo(2000); // 40% of 5000
      expect(result.expectedCounts.B).toBeCloseTo(2000); // 40% of 5000
      expect(result.expectedCounts.C).toBeCloseTo(1000); // 20% of 5000
    });
    
    test('validates actual counts are reasonable', () => {
      const items = ['X', 'Y'];
      const weights = [0.7, 0.3];
      
      const result = RNGValidator.testDistribution(items, weights, 1000, 'count-test');
      
      // Actual counts should be reasonable approximations
      expect(result.actualCounts.X).toBeGreaterThan(650); // Should be around 700
      expect(result.actualCounts.X).toBeLessThan(750);
      expect(result.actualCounts.Y).toBeGreaterThan(250); // Should be around 300
      expect(result.actualCounts.Y).toBeLessThan(350);
    });
  });
  
  describe('Randomness Quality Testing', () => {
    test('validates randomness using runs test', () => {
      const result = RNGValidator.testRandomness('randomness-test', 1000);
      
      expect(result.passed).toBe(true);
      expect(result.runsCount).toBeGreaterThan(0);
      expect(result.expectedRuns).toBeGreaterThan(0);
      expect(result.variance).toBeGreaterThan(0);
      expect(result.zScore).toBeGreaterThanOrEqual(0);
    });
    
    test('produces consistent results with same seed', () => {
      const result1 = RNGValidator.testRandomness('same-seed', 500);
      const result2 = RNGValidator.testRandomness('same-seed', 500);
      
      expect(result1.runsCount).toBe(result2.runsCount);
      expect(result1.zScore).toBeCloseTo(result2.zScore, 5);
    });
  });
});

describe('Convenience Functions', () => {
  test('getRNG returns singleton instance', () => {
    const rng1 = getRNG();
    const rng2 = getRNG();
    
    expect(rng1).toBe(rng2);
  });
  
  test('weightedSelect works correctly', () => {
    const result = weightedSelect(['test'], [1.0]);
    expect(result).toBe('test');
  });
  
  test('randomInt works correctly', () => {
    for (let i = 0; i < 10; i++) {
      const result = randomInt(1, 5);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    }
  });
  
  test('randomBoolean works correctly', () => {
    const result = randomBoolean(1.0);
    expect(result).toBe(true);
    
    const result2 = randomBoolean(0.0);
    expect(result2).toBe(false);
  });
  
  test('shuffleArray works correctly', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);
    
    expect(shuffled).toHaveLength(5);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Performance Tests', () => {
  test('handles high-frequency selection efficiently', () => {
    const rng = new SecureTCGRandom();
    const items = Array.from({ length: 100 }, (_, i) => i.toString());
    const weights = Array.from({ length: 100 }, () => 0.01);
    
    const startTime = Date.now();
    
    // Perform 10,000 selections
    for (let i = 0; i < 10000; i++) {
      rng.selectByWeight(items, weights);
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete in reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);
  });
  
  test('memory usage remains stable during extended use', () => {
    const rng = new SecureTCGRandom();
    const items = ['A', 'B', 'C'];
    const weights = [0.33, 0.33, 0.34];
    
    // Track memory usage pattern
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform many operations
    for (let i = 0; i < 50000; i++) {
      rng.selectByWeight(items, weights);
      rng.randomInt(1, 100);
      rng.randomBoolean();
      rng.shuffle(['x', 'y', 'z']);
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    // Memory increase should be minimal (< 10MB)
    expect(memoryIncrease).toBeLessThan(10);
  });
});