"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { computeDatasetThresholds, computeEscalationRisk, extractFrustrationPairs, aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { extractThemesWithMembership } from '@/lib/nlp/tfidf';
import { AlertCircle, Clock, MessageSquareWarning, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConversationModal from './ConversationModal';

export default function AttentionCallouts({ data, mode = 'support' }: { data: PulseConversation[], mode?: 'support' | 'engineering' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [isPassedExpanded, setIsPassedExpanded] = useState(false);

  const formatTime = (secs: number) => {
    if (secs < 60) return `${Math.floor(secs)}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  const callouts = useMemo(() => {
    if (data.length === 0) return [];
    
    const items = [];
    const thresholds = computeDatasetThresholds(data);
    const datasetMaxTime = Math.max(0, ...data.map(c => c.updated_at || c.created_at));

    if (mode === 'support') {
      // 1. Critical Escalation Risk
      const openData = data.filter(c => c.state === 'open');
      let foundRisk = false;
      if (openData.length > 0) {
        const highestRisk = openData.reduce((prev, current) => {
          return computeEscalationRisk(current, thresholds) > computeEscalationRisk(prev, thresholds) ? current : prev;
        });
        if (computeEscalationRisk(highestRisk, thresholds) > 0.5) {
          foundRisk = true;
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
      if (!foundRisk) {
        items.push({
          id: 'risk-clear',
          title: 'No Escalation Risks',
          description: 'No open conversations with high escalation risk.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

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
      } else {
        items.push({
          id: 'frustration-clear',
          title: 'No Unhandled Frustration',
          description: 'All post-reply customer frustration has been addressed.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
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
      } else {
        items.push({
          id: 'snooze-clear',
          title: 'No overdue snoozes',
          description: 'All snoozed conversations are currently pending.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

      // 4. Reopen Spikes
      const dailyReopens = aggregateDailyVolume(data.filter(c => (c.statistics?.count_reopens || 0) > 0));
      const reopenSeries = dailyReopens.map(d => ({ date: d.date, value: d.total }));
      const reopenDetected = detectSpikes(reopenSeries, 7, 1.5).filter(d => d.isAnomaly && d.value > 0);
      
      if (reopenDetected.length > 0) {
        reopenDetected.forEach(anomaly => {
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
      } else {
        items.push({
          id: 'reopen-clear',
          title: 'No Reopen Spikes',
          description: 'Reopen rates are stable and within normal bounds.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

      // 5. Extreme Response Times (Dataset relative P90)
      const extremeResponse = data.filter(c => (c.statistics?.time_to_admin_reply || 0) > thresholds.responseTimeP90);
      if (extremeResponse.length > 0) {
        items.push({
          id: 'extreme-response',
          title: 'Extreme Response Times',
          description: `Initial replies exceeding the dataset P90 threshold (${formatTime(thresholds.responseTimeP90)}).`,
          icon: AlertTriangle,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: `${extremeResponse.length} tickets`,
          conversations: extremeResponse
        });
      } else {
        items.push({
          id: 'extreme-response-clear',
          title: 'No Extreme Response Times',
          description: 'All initial replies occurred within the dataset threshold.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

    } else {
      // ENGINEERING MODE
      
      // 1. Detect volume spikes
      const dailyVol = aggregateDailyVolume(data);
      const series = dailyVol.map(d => ({ date: d.date, value: d.total }));
      const detected = detectSpikes(series, 7, 1.5).filter(d => d.isAnomaly);
      
      if (detected.length > 0) {
        detected.forEach(anomaly => {
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
      } else {
        items.push({
          id: 'spike-clear',
          title: 'No Volume Spikes',
          description: 'Conversation volume is stable and within normal bounds.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

      // 1.5 Theme-tied volume spikes (capped at top 3 + N more)
      const topThemes = extractThemesWithMembership(data, 5);
      const themeSpikeItems: any[] = [];
      topThemes.forEach(theme => {
        const themeDailyVol = aggregateDailyVolume(theme.conversations);
        const themeSeries = themeDailyVol.map(d => ({ date: d.date, value: d.total }));
        const themeDetected = detectSpikes(themeSeries, 7, 1.5);
        
        themeDetected.filter(d => d.isAnomaly && d.value >= 3).forEach(anomaly => {
          const convs = theme.conversations.filter(c => format(new Date(c.created_at * 1000), 'yyyy-MM-dd') === anomaly.date);
          themeSpikeItems.push({
            id: `theme-spike-${theme.theme}-${anomaly.date}`,
            title: `Theme Spike: "${theme.theme}"`,
            description: `Had ${anomaly.value} complaints on ${format(parseISO(anomaly.date), 'MMM d')}.`,
            icon: AlertTriangle,
            color: 'text-destructive',
            bg: 'bg-destructive/10',
            border: 'border-destructive/20',
            badge: `${convs.length} tickets`,
            conversations: convs,
            value: anomaly.value // for sorting
          });
        });
      });

      themeSpikeItems.sort((a, b) => b.value - a.value);

      if (themeSpikeItems.length > 3) {
        const top3 = themeSpikeItems.slice(0, 3);
        const remaining = themeSpikeItems.slice(3);
        const allRemainingConvs = remaining.flatMap(item => item.conversations);
        
        items.push(...top3);
        items.push({
          id: 'theme-spikes-more',
          title: `+${remaining.length} other theme spikes`,
          description: `Spikes in topics like: ${remaining.map(item => item.title.replace('Theme Spike: ', '')).join(', ')}`,
          icon: AlertTriangle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          badge: `${allRemainingConvs.length} tickets`,
          conversations: allRemainingConvs
        });
      } else {
        items.push(...themeSpikeItems);
      }

      if (themeSpikeItems.length === 0) {
        items.push({
          id: 'theme-spike-clear',
          title: 'No Theme Spikes',
          description: 'No unusual volume detected for specific themes.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

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
      } else {
        items.push({
          id: 'high-reopens-clear',
          title: 'No Extreme Re-opens',
          description: 'No conversations have been re-opened 3 or more times.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }

      // 3. Extreme Handling Time (Dataset relative P90)
      const extremeHandling = data.filter(c => (c.statistics?.handling_time || 0) > thresholds.handlingTimeP90);
      if (extremeHandling.length > 0) {
        items.push({
          id: 'extreme-handling',
          title: 'Extreme Handling Times',
          description: `Active handling times exceeding the dataset P90 threshold (${formatTime(thresholds.handlingTimeP90)}).`,
          icon: AlertTriangle,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
          border: 'border-chart-4/20',
          badge: `${extremeHandling.length} tickets`,
          conversations: extremeHandling
        });
      } else {
        items.push({
          id: 'extreme-handling-clear',
          title: 'No Extreme Handling Times',
          description: 'No conversations exceeded the dataset threshold.',
          icon: CheckCircle2,
          color: 'text-muted-foreground',
          bg: 'bg-secondary/50',
          border: 'border-border/50',
          conversations: []
        });
      }
    }

    return items;
  }, [data, mode]);

  if (callouts.length === 0) return null;

  const alertCallouts = callouts.filter(c => c.conversations.length > 0);
  const passedCallouts = callouts.filter(c => c.conversations.length === 0);

  const renderCalloutRow = (callout: any, isPassedRow = false) => (
    <div
      key={callout.id}
      onClick={() => {
        if (callout.conversations.length > 0) {
          setModalTitle(callout.title);
          setModalData(callout.conversations);
          setIsModalOpen(true);
        }
      }}
      className={`flex items-center justify-between px-4 py-3 sm:px-6 transition-colors ${callout.conversations.length > 0 ? 'cursor-pointer hover:bg-secondary/30' : 'bg-card/30'
        } ${isPassedRow ? 'bg-secondary/10' : ''}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 border ${callout.bg} ${callout.border} ${callout.color}`}>
          <callout.icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 pr-4 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className={`text-sm font-semibold truncate ${callout.conversations.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
            {callout.title}
          </p>
          <p className="text-sm text-muted-foreground truncate hidden sm:block">
            <span className="mr-2 opacity-50">-</span>
            {callout.description}
          </p>
        </div>
      </div>
      {callout.badge && (
        <div className="shrink-0 ml-4">
          <div className="text-xs font-semibold bg-secondary/80 text-muted-foreground px-2.5 py-1 rounded-md border border-border/50 whitespace-nowrap">
            {callout.badge}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-4">
      <div className="bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-secondary/10 flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-chart-2" />
          <h2 className="text-base font-semibold">Pulse Check</h2>
        </div>
        <div className="divide-y divide-border/50 max-h-[260px] overflow-y-auto scrollbar-thin">
          {alertCallouts.map(callout => renderCalloutRow(callout))}

          {passedCallouts.length > 0 && (
            <>
              <div
                onClick={() => setIsPassedExpanded(!isPassedExpanded)}
                className="flex items-center justify-between px-4 py-3 sm:px-6 bg-card/30 cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 border bg-chart-2/10 border-chart-2/20 text-chart-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 pr-4 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <p className="text-sm font-semibold truncate text-muted-foreground">
                      {passedCallouts.length} other checks passed
                    </p>
                    <p className="text-sm text-muted-foreground truncate hidden sm:block">
                      <span className="mr-2 opacity-50">-</span>
                      no {passedCallouts.map(c => c.title.replace(/^No /i, '').toLowerCase()).join(', no ')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 ml-4 text-muted-foreground">
                  {isPassedExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {isPassedExpanded && (
                <div className="divide-y divide-border/50 bg-secondary/5">
                  {passedCallouts.map(callout => renderCalloutRow(callout, true))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </div>
  );
}
