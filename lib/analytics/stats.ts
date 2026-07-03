/**
 * Calculate the percentile of a sorted array.
 * Note: Assumes the array is already sorted in ascending order.
 */
export function calculatePercentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sortedValues.length) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Calculate moving average for a series of numbers with a given window size.
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  if (data.length === 0) return [];
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const windowSlice = data.slice(start, i + 1);
    const sum = windowSlice.reduce((a, b) => a + b, 0);
    result.push(sum / windowSlice.length);
  }
  
  return result;
}

/**
 * Calculate rolling mean and standard deviation for a given window size.
 * Returns an array of objects for each point.
 */
export function rollingStats(data: number[], windowSize: number): { mean: number; stddev: number }[] {
  if (data.length === 0) return [];
  const result: { mean: number; stddev: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const windowSlice = data.slice(start, i + 1);
    const n = windowSlice.length;
    
    if (n === 0) {
      result.push({ mean: 0, stddev: 0 });
      continue;
    }
    
    const sum = windowSlice.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    if (n === 1) {
      result.push({ mean, stddev: 0 });
      continue;
    }
    
    const variance = windowSlice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stddev = Math.sqrt(variance);
    
    result.push({ mean, stddev });
  }
  
  return result;
}
