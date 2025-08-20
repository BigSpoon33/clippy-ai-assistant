/**
 * Basic Test to Verify Jest Setup
 */

describe('Basic Test Suite', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should verify Jest environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  test('should have mocked AudioContext', () => {
    expect(typeof global.AudioContext).toBe('function');
  });

  test('should have mocked performance.now', () => {
    expect(typeof performance.now).toBe('function');
    expect(performance.now()).toBeGreaterThan(0);
  });
});