import { calculatePercentile, movingAverage, rollingStats } from '../../lib/analytics/stats';

describe('stats utilities', () => {
  describe('calculatePercentile', () => {
    it('returns null for empty array', () => {
      expect(calculatePercentile([], 50)).toBeNull();
    });

    it('returns the single element for an array of length 1', () => {
      expect(calculatePercentile([10], 90)).toBe(10);
    });

    it('calculates median (p50) correctly', () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
      expect(calculatePercentile([1, 2, 3, 4], 50)).toBe(2.5);
    });

    it('calculates p90 correctly', () => {
      // 0 to 10
      const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(calculatePercentile(data, 90)).toBe(9);
    });
    
    it('handles identical values correctly', () => {
      expect(calculatePercentile([5, 5, 5, 5, 5], 99)).toBe(5);
    });
  });

  describe('movingAverage', () => {
    it('calculates moving average correctly', () => {
      const data = [2, 4, 6, 8, 10];
      const result = movingAverage(data, 2);
      expect(result).toEqual([2, 3, 5, 7, 9]);
    });
  });

  describe('rollingStats', () => {
    it('calculates mean and stddev correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = rollingStats(data, 4);
      
      // Index 0: window [2]
      expect(result[0].mean).toBe(2);
      expect(result[0].stddev).toBe(0);
      
      // Index 3: window [2, 4, 4, 4], mean = 3.5, variance = ((2-3.5)^2 + 3*(4-3.5)^2) / 3 = (2.25 + 0.75) / 3 = 1
      // stddev = 1
      expect(result[3].mean).toBe(3.5);
      expect(result[3].stddev).toBe(1);
    });
  });
});
