"use client";

import { useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { computeDatasetThresholds, extractFrustrationPairs, aggregateDailyVolume, computeEscalationRisk } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { CheckCircle2 } from 'lucide-react';

export default function HealthyChecks({ data }: { data: PulseConversation[] }) {
  const { healthyCount, healthyLabels } = useMemo(() => {
    let hCount = 0;
    const hLabels: string[] = [];

    if (data.length === 0) return { healthyCount: 0, healthyLabels: [] };
    const thresholds = computeDatasetThresholds(data);

    // 1. Unresolved frustration
    const frustrationPairs = extractFrustrationPairs(data);
    const openFrustration = frustrationPairs.filter(p => p.conversation.state === 'open');
    if (openFrustration.length === 0) {
      hCount++;
      hLabels.push('unresolved frustration');
    }

    // 2. Escalation Risk
    const openData = data.filter(c => c.state === 'open');
    let foundRisk = false;
    if (openData.length > 0) {
      const highestRisk = openData.reduce((prev, current) => computeEscalationRisk(current, thresholds) > computeEscalationRisk(prev, thresholds) ? current : prev);
      if (computeEscalationRisk(highestRisk, thresholds) > 0.5) {
        foundRisk = true;
      }
    }
    if (!foundRisk) {
      hCount++;
      hLabels.push('escalation risk');
    }

    // 3. Reopen Spikes
    const dailyReopens = aggregateDailyVolume(data.filter(c => (c.statistics?.count_reopens || 0) > 0));
    const reopenSeries = dailyReopens.map(d => ({ date: d.date, value: d.total }));
    const reopenDetected = detectSpikes(reopenSeries, 7, 1.5).filter(d => d.isAnomaly && d.value > 0);
    if (reopenDetected.length === 0) {
      hCount++;
      hLabels.push('reopen spike');
    }

    return { healthyCount: hCount, healthyLabels: hLabels };
  }, [data]);

  if (healthyCount === 0) return null;

  return (
    <div className="flex items-start sm:items-center gap-3 text-sm text-muted-foreground p-5 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-default">
      <CheckCircle2 className="w-5 h-5 text-chart-3 shrink-0 mt-0.5 sm:mt-0" />
      <span className="leading-snug">{healthyCount} checks healthy ({healthyLabels.join(', ')})</span>
    </div>
  );
}
