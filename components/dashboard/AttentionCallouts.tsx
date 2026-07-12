"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { computeDatasetThresholds, computeEscalationRisk, extractFrustrationPairs, aggregateDailyVolume, getEngineeringInsights } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatPT } from '@/lib/utils/timezone';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

export default function AttentionCallouts({ data, mode = 'support', onCardClick }: { data: PulseConversation[], mode?: 'support' | 'engineering', onCardClick?: (conversations: PulseConversation[], title: string) => void }) {

  const formatTime = (secs: number) => {
    if (secs < 60) return `${Math.floor(secs)}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  const { items, healthyCount, healthyLabels } = useMemo(() => {
    const activeItems = [];
    let hCount = 0;
    const hLabels: string[] = [];

    if (data.length === 0) return { items: [], healthyCount: 0, healthyLabels: [] };
    const thresholds = computeDatasetThresholds(data);
    const datasetMaxTime = Math.max(0, ...data.map(c => c.updated_at || c.created_at));

    if (mode === 'support') {
      // 1. Slow first replies
      const extremeResponse = data.filter(c => (c.statistics?.time_to_admin_reply || 0) > thresholds.responseTimeP90);
      if (extremeResponse.length > 0) {
        activeItems.push({
          id: 'extreme-response',
          title: 'Slow first replies',
          description: `${extremeResponse.length} conversations exceeded the reply-time target (${formatTime(thresholds.responseTimeP90)}).`,
          conversations: extremeResponse,
          severity: 1
        });
      }

      // 2. Unresolved frustration
      const frustrationPairs = extractFrustrationPairs(data);
      const openFrustration = frustrationPairs.filter(p => p.conversation.state === 'open');
      if (openFrustration.length > 0) {
        activeItems.push({
          id: 'frustration',
          title: 'Unresolved frustration',
          description: `${openFrustration.length} conversation${openFrustration.length > 1 ? 's show' : ' shows'} frustration after an agent reply.`,
          conversations: openFrustration.map(p => p.conversation),
          severity: 2
        });
      } else {
        hCount++;
        hLabels.push('unresolved frustration');
      }

      // 3. Overdue follow-ups
      const overdueSnoozes = data.filter(c => c.state === 'snoozed' && c.snoozed_until && c.snoozed_until < datasetMaxTime);
      if (overdueSnoozes.length > 0) {
        const overdueSecs = overdueSnoozes.map(c => datasetMaxTime - (c.snoozed_until || datasetMaxTime)).sort((a,b)=>a-b);
        const medianOverdueSecs = overdueSecs[Math.floor(overdueSecs.length/2)];
        const medianDaysOverdue = medianOverdueSecs / (24 * 3600);
        
        activeItems.push({
          id: 'snooze',
          title: 'Overdue follow-ups',
          description: `${overdueSnoozes.length} conversations are overdue, a median of ${medianDaysOverdue.toFixed(1)} days late.`,
          conversations: overdueSnoozes,
          severity: 3
        });
      }

      // Escalation Risk
      const openData = data.filter(c => c.state === 'open');
      let foundRisk = false;
      if (openData.length > 0) {
        const highestRisk = openData.reduce((prev, current) => computeEscalationRisk(current, thresholds) > computeEscalationRisk(prev, thresholds) ? current : prev);
        if (computeEscalationRisk(highestRisk, thresholds) > 0.5) {
          foundRisk = true;
          activeItems.push({
            id: 'risk',
            title: 'Critical escalation risk',
            description: `1 conversation has a high risk of escalation.`,
            conversations: [highestRisk],
            severity: 0 // Most severe
          });
        }
      }
      if (!foundRisk) {
        hCount++;
        hLabels.push('escalation risk');
      }

      // Reopen Spikes
      const dailyReopens = aggregateDailyVolume(data.filter(c => (c.statistics?.count_reopens || 0) > 0));
      const reopenSeries = dailyReopens.map(d => ({ date: d.date, value: d.total }));
      const reopenDetected = detectSpikes(reopenSeries, 7, 1.5).filter(d => d.isAnomaly && d.value > 0);
      if (reopenDetected.length > 0) {
        reopenDetected.sort((a, b) => b.value - a.value);
        const anomaly = reopenDetected[0];
        const convs = data.filter(c => {
            const dateStr = formatPT(c.created_at, 'yyyy-MM-dd');
            return dateStr === anomaly.date && (c.statistics?.count_reopens || 0) > 0;
        });
        activeItems.push({
          id: 'reopen-spike',
          title: 'Reopen spike detected',
          description: `${anomaly.value} conversations were reopened on ${format(parseISO(anomaly.date), 'MMM d')}.`,
          conversations: convs,
          severity: 1.5
        });
      } else {
        hCount++;
        hLabels.push('reopen spike');
      }

      // Sort by severity (0 is most severe)
      activeItems.sort((a, b) => a.severity - b.severity);

    } else {
      // ENGINEERING MODE
      const criticalBugs = data.filter(c => {
        const eng = getEngineeringInsights(c);
        return eng.technical_issue_type === 'bug' && (c.llm_classification?.churn_risk_1_to_10 || 1) >= 7;
      });

      if (criticalBugs.length > 0) {
        activeItems.push({
          id: 'critical-bugs',
          title: 'Critical Escaped Defects',
          description: `${criticalBugs.length} high-severity bug${criticalBugs.length === 1 ? ' is' : 's are'} causing high churn risk (>= 7/10).`,
          conversations: criticalBugs,
          severity: 0
        });
      }

      const uiFriction = data.filter(c => getEngineeringInsights(c).technical_issue_type === 'ui_friction');
      if (uiFriction.length > 0) {
        activeItems.push({
          id: 'ui-friction',
          title: 'UI Friction Points',
          description: `${uiFriction.length} conversation${uiFriction.length === 1 ? ' indicates' : 's indicate'} confusing UI or UX issues.`,
          conversations: uiFriction,
          severity: 2
        });
      }
      
      activeItems.sort((a, b) => a.severity - b.severity);
    }

    return { items: activeItems, healthyCount: hCount, healthyLabels: hLabels };
  }, [data, mode]);

  if (items.length === 0 && healthyCount === 0) return null;

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-chart-4" />
        {mode === 'support' ? (
           <div className="flex items-center gap-2">
             <span>Attention Required</span>
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors ml-1">
                   ?
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 High-priority issues and unresolved customer frustrations that need immediate review.
               </TooltipContent>
             </Tooltip>
           </div>
        ) : (
           <span>Engineering Escalations</span>
        )}
      </h2>
      <div className="flex-1 bg-card border border-border/60 rounded-2xl shadow-sm flex flex-col">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground p-5">
             No items needing immediate review.
          </div>
        ) : (
          items.map((item, index) => {
            let severityBadge = null;
            if (mode === 'support' || mode === 'engineering') {
              if (item.severity === 0 || item.severity === 2) {
                severityBadge = (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-destructive/10 text-destructive border border-destructive/20 cursor-help">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 animate-pulse" />
                        Action Required
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      High priority items that need immediate attention.
                    </TooltipContent>
                  </Tooltip>
                );
              } else {
                severityBadge = (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold bg-chart-4/10 text-chart-4 border border-chart-4/20 cursor-help">
                        <span className="w-1.5 h-1.5 rounded-full bg-chart-4 mr-1.5" />
                        Needs Review
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Items that are slipping from our targets.
                    </TooltipContent>
                  </Tooltip>
                );
              }
            }
            
            return (
              <div 
                key={item.id} 
                onClick={() => {
                  if (onCardClick) {
                    onCardClick(item.conversations, item.title);
                  }
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 ${index !== 0 ? 'border-t border-border/40' : ''} hover:bg-secondary/40 transition-colors gap-4 cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl`}
              >
                <div className="flex flex-col gap-1.5 group-hover:translate-x-1 transition-transform duration-300">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    {severityBadge}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
