"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { computeDatasetThresholds, computeEscalationRisk, extractFrustrationPairs, aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { extractThemesWithMembership } from '@/lib/nlp/tfidf';
import { AlertCircle, Clock, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConversationModal from './ConversationModal';

export default function AttentionCallouts({ data, mode = 'support' }: { data: PulseConversation[], mode?: 'support' | 'engineering' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const callouts = useMemo(() => {
    if (data.length === 0) return [];
    
    const items = [];
    const thresholds = computeDatasetThresholds(data);
    const datasetMaxTime = Math.max(0, ...data.map(c => c.updated_at || c.created_at));

    // 1. Highest Risk Conversation
    const openData = data.filter(c => c.state === 'open');
    if (openData.length > 0) {
      const highestRisk = openData.reduce((prev, current) => {
        return computeEscalationRisk(current, thresholds) > computeEscalationRisk(prev, thresholds) ? current : prev;
      });
      if (computeEscalationRisk(highestRisk, thresholds) > 0.5) {
        items.push({
          id: 'risk',
          title: 'Critical Escalation Risk',
          description: highestRisk.title || 'Untitled Conversation',
          icon: AlertCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          badge: '1 ticket',
          conversations: [highestRisk]
        });
      }
    }

    if (mode === 'support') {
      // 2. Unhandled Frustration
      const frustrationPairs = extractFrustrationPairs(data);
      const openFrustration = frustrationPairs.filter(p => p.conversation.state === 'open');
      if (openFrustration.length > 0) {
        const latest = openFrustration[0];
        items.push({
          id: 'frustration',
          title: 'Unhandled Frustration',
          description: `Customer expressed frustration after ${latest.agentName}'s reply`,
          icon: MessageSquareWarning,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: '1 ticket',
          conversations: [latest.conversation]
        });
      }

      // 3. Snooze Breaches
      const overdueSnoozes = data.filter(c => c.state === 'snoozed' && c.snoozed_until && c.snoozed_until < datasetMaxTime);
      if (overdueSnoozes.length > 0) {
        const overdueSecs = overdueSnoozes.map(c => datasetMaxTime - (c.snoozed_until || datasetMaxTime)).sort((a,b)=>a-b);
        const medianOverdueSecs = overdueSecs[Math.floor(overdueSecs.length/2)];
        const medianDaysOverdue = medianOverdueSecs / (24 * 3600);
        
        let color = 'text-chart-2';
        let bg = 'bg-chart-2/10';
        let border = 'border-chart-2/20';

        if (medianDaysOverdue >= 7) {
           color = 'text-destructive';
           bg = 'bg-destructive/10';
           border = 'border-destructive/20';
        } else if (medianDaysOverdue >= 2) {
           color = 'text-chart-4';
           bg = 'bg-chart-4/10';
           border = 'border-chart-4/20';
        }
        
        items.push({
          id: 'snooze',
          title: `${overdueSnoozes.length} overdue snoozes`,
          description: `median ${medianDaysOverdue.toFixed(1)} days overdue`,
          icon: Clock,
          color,
          bg,
          border,
          badge: `${overdueSnoozes.length} tickets`,
          conversations: overdueSnoozes
        });
      }

      // 4. Reopen Spikes
      const dailyReopens = aggregateDailyVolume(data.filter(c => (c.statistics?.count_reopens || 0) > 0));
      const reopenSeries = dailyReopens.map(d => ({ date: d.date, value: d.total }));
      const reopenDetected = detectSpikes(reopenSeries, 7, 1.5);
      
      reopenDetected.filter(d => d.isAnomaly && d.value > 0).forEach(anomaly => {
        const convs = data.filter(c => {
           const dateStr = format(new Date(c.created_at * 1000), 'yyyy-MM-dd');
           return dateStr === anomaly.date && (c.statistics?.count_reopens || 0) > 0;
        });
        items.push({
          id: `reopen-spike-${anomaly.date}`,
          title: `Reopen Spike on ${format(parseISO(anomaly.date), 'MMM d')}`,
          description: `${anomaly.value} conversations were reopened.`,
          icon: AlertTriangle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          badge: `${convs.length} tickets`,
          conversations: convs
        });
      });

      // 5. Extreme Response Times
      const extremeResponse = data.filter(c => (c.statistics?.time_to_admin_reply || 0) > (4 * 3600));
      if (extremeResponse.length > 0) {
        items.push({
          id: 'extreme-response',
          title: 'Extreme Response Times',
          description: `Took >4 hours for an initial agent reply.`,
          icon: AlertTriangle,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: `${extremeResponse.length} tickets`,
          conversations: extremeResponse
        });
      }

    } else {
      // ENGINEERING MODE
      
      // 1. Detect volume spikes
      const dailyVol = aggregateDailyVolume(data);
      const series = dailyVol.map(d => ({ date: d.date, value: d.total }));
      const detected = detectSpikes(series, 7, 1.5);
      
      detected.filter(d => d.isAnomaly).forEach(anomaly => {
        const convs = data.filter(c => format(new Date(c.created_at * 1000), 'yyyy-MM-dd') === anomaly.date);
        items.push({
          id: `spike-${anomaly.date}`,
          title: `Volume Spike on ${format(parseISO(anomaly.date), 'MMM d')}`,
          description: `${anomaly.value.toLocaleString()} conversations created.`,
          icon: AlertTriangle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          badge: `${convs.length} tickets`,
          conversations: convs
        });
      });

      // 1.5 Theme-tied volume spikes
      const topThemes = extractThemesWithMembership(data, 5);
      topThemes.forEach(theme => {
        const themeDailyVol = aggregateDailyVolume(theme.conversations);
        const themeSeries = themeDailyVol.map(d => ({ date: d.date, value: d.total }));
        const themeDetected = detectSpikes(themeSeries, 7, 1.5);
        
        themeDetected.filter(d => d.isAnomaly && d.value >= 3).forEach(anomaly => {
          const convs = theme.conversations.filter(c => format(new Date(c.created_at * 1000), 'yyyy-MM-dd') === anomaly.date);
          items.push({
            id: `theme-spike-${theme.theme}-${anomaly.date}`,
            title: `Theme Spike: "${theme.theme}"`,
            description: `Had ${anomaly.value} complaints on ${format(parseISO(anomaly.date), 'MMM d')}.`,
            icon: AlertTriangle,
            color: 'text-destructive',
            bg: 'bg-destructive/10',
            border: 'border-destructive/20',
            badge: `${convs.length} tickets`,
            conversations: convs
          });
        });
      });

      // 2. High Re-opens
      const highReopens = data.filter(c => (c.statistics?.count_reopens || 0) >= 3);
      if (highReopens.length > 0) {
        items.push({
          id: 'high-reopens',
          title: 'High Re-open Rate',
          description: `Re-opened 3 or more times.`,
          icon: AlertTriangle,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: `${highReopens.length} tickets`,
          conversations: highReopens
        });
      }

      // 3. Extreme Handling Time (> 24 hours)
      const extremeHandling = data.filter(c => (c.statistics?.handling_time || 0) > (24 * 3600));
      if (extremeHandling.length > 0) {
        items.push({
          id: 'extreme-handling',
          title: 'Extreme Handling Times',
          description: `Took >24 hours of active handling time.`,
          icon: AlertTriangle,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: `${extremeHandling.length} tickets`,
          conversations: extremeHandling
        });
      }
    }

    return items;
  }, [data, mode]);

  if (callouts.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-2">
        {callouts.map(callout => (
          <div 
            key={callout.id} 
            onClick={() => {
              setModalTitle(callout.title);
              setModalData(callout.conversations);
              setIsModalOpen(true);
            }}
            className="flex flex-col justify-between p-6 rounded-xl border border-border bg-card shadow-sm h-full relative cursor-pointer hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 border mt-0.5 ${callout.bg} ${callout.border} ${callout.color}`}>
                <callout.icon className="w-4 h-4" />
              </div>
              <div className="pr-20">
                <p className="text-sm font-semibold text-foreground">
                  {callout.title}
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {callout.description}
                </p>
              </div>
            </div>
            {callout.badge && (
              <div className="absolute top-5 right-5">
                <div className="text-xs font-semibold bg-secondary/80 text-muted-foreground px-2.5 py-1 rounded-md border border-border/50">
                  {callout.badge}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </>
  );
}
