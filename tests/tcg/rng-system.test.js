/**
 * TCG RNG System Tests
 * Tests the core randomness generation system
 */

const { SecureTCGRandom } = require('../../dist/tcg-test/core/rng-system.js');

describe('TCG RNG System', () => {
  let rng;

  beforeEach(() => {
    rng = new SecureTCGRandom('test-seed-123');
  });

  test('should generate consistent results with same seed', () => {
    const rng1 = new SecureTCGRandom('test-seed');
    const rng2 = new SecureTCGRandom('test-seed');
    
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
  });

  test('should generate different results with different seeds', () => {
    const rng1 = new SecureTCGRandom('seed-a');
    const rng2 = new SecureTCGRandom('seed-b');
    
    expect(rng1.next()).not.toBe(rng2.next());
  });

  test('should generate numbers in range [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('should generate integers in specified range', () => {
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(20);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  test('should select from weighted array correctly', () => {
    const items = [
      { value: 'common', weight: 0.7 },
      { value: 'rare', weight: 0.2 },
      { value: 'legendary', weight: 0.1 }
    ];
    
    const results = {};
    for (let i = 0; i < 1000; i++) {
      const result = rng.weightedSelect(items);
      results[result] = (results[result] || 0) + 1;
    }
    
    // Common should appear most frequently
    expect(results.common).toBeGreaterThan(results.rare);
    expect(results.rare).toBeGreaterThan(results.legendary);
  });

  test('should calculate statistical properties', () => {
    const stats = rng.getStatistics();
    
    expect(stats).toHaveProperty('callCount');
    expect(stats).toHaveProperty('averageValue');
    expect(stats).toHaveProperty('distribution');
    expect(typeof stats.callCount).toBe('number');
  });
});

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testTCGRNG = () => {
    console.log('🎲 Testing TCG RNG System...');
    const rng = new SecureTCGRandom();
    
    console.log('Random values:', Array.from({length: 10}, () => rng.next()));
    console.log('Random integers (1-6):', Array.from({length: 10}, () => rng.nextInt(1, 6)));
    console.log('Statistics:', rng.getStatistics());
  };
}