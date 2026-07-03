import { rollingStats } from './stats';

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface AnomalyResult extends TimeSeriesPoint {
  mean: number;
  stddev: number;
  isAnomaly: boolean;
}

/**
 * Detects spikes in a daily time series using a rolling baseline.
 * Flags points where the value exceeds (mean + numStdDevs * stddev).
 */
export function detectSpikes(
  series: TimeSeriesPoint[], 
  windowSize: number = 7, 
  numStdDevs: number = 2
): AnomalyResult[] {
  // Assume series is sorted by date ascending
  const values = series.map(p => p.value);
  const stats = rollingStats(values, windowSize);
  
  return series.map((point, i) => {
    const { mean, stddev } = stats[i];
    // Don't flag anomalies if standard deviation is 0 or very small to avoid noise
    const threshold = mean + (numStdDevs * stddev);
    // Add a minimum threshold (e.g. if mean is 1, spike needs to be > 3) to prevent micro-spikes from triggering
    const isAnomaly = stddev > 0.5 && point.value > Math.max(threshold, mean * 1.5, 3);
    
    return {
      ...point,
      mean,
      stddev,
      isAnomaly
    };
  });
}
