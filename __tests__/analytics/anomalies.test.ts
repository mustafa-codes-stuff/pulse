import { detectSpikes, TimeSeriesPoint } from '../../lib/analytics/anomalies';

describe('detectSpikes', () => {
  it('identifies spikes correctly in a synthetic time series without false positives', () => {
    // Generate a quiet time series with values around 10
    const series: TimeSeriesPoint[] = Array.from({ length: 30 }).map((_, i) => ({
      date: `2023-01-${String(i + 1).padStart(2, '0')}`,
      value: 10 + Math.random() // between 10 and 11
    }));
    
    // Inject a massive spike on day 15
    series[14].value = 50;
    
    const results = detectSpikes(series, 7, 2);
    
    // Day 15 should be an anomaly
    expect(results[14].isAnomaly).toBe(true);
    
    // Other days should not be anomalies (testing false positive)
    expect(results[10].isAnomaly).toBe(false);
    expect(results[20].isAnomaly).toBe(false);
  });
  
  it('does not flag micro-spikes when variance is very low', () => {
    // All exactly 10
    const series: TimeSeriesPoint[] = Array.from({ length: 14 }).map((_, i) => ({
      date: `2023-01-${String(i + 1).padStart(2, '0')}`,
      value: 10
    }));
    
    // Tiny deviation
    series[10].value = 10.1;
    
    const results = detectSpikes(series, 7, 2);
    
    // Should not be flagged because stddev < 0.5 constraint or relative size
    expect(results[10].isAnomaly).toBe(false);
  });
});
