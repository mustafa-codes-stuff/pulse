"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { extractThemesWithMembership } from '@/lib/nlp/tfidf';
import { AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConversationModal from './ConversationModal';

interface AnomalyItem {
  id: string;
  type: 'spike' | 'friction' | 'reopen';
  date?: string;
  title: string;
  description: string;
  conversations: PulseConversation[];
}

export default function AnomalyFeed({ data, mode = 'engineering' }: { data: PulseConversation[], mode?: 'engineering' | 'support' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const anomalies = useMemo(() => {
    const items: AnomalyItem[] = [];
    
    if (mode === 'engineering') {
      // 1. Detect volume spikes
      const dailyVol = aggregateDailyVolume(data);
      const series = dailyVol.map(d => ({ date: d.date, value: d.total }));
      const detected = detectSpikes(series, 7, 1.5);
      
      detected.filter(d => d.isAnomaly).forEach(anomaly => {
        items.push({
          id: `spike-${anomaly.date}`,
          type: 'spike',
          date: anomaly.date,
          title: `Volume Spike on ${format(parseISO(anomaly.date), 'MMMM d, yyyy')}`,
          description: `${anomaly.value.toLocaleString()} conversations created. This is significantly higher than the 7-day rolling average of ${Math.round(anomaly.mean)}.`,
          conversations: data.filter(c => {
            const dateStr = format(new Date(c.created_at * 1000), 'yyyy-MM-dd');
            return dateStr === anomaly.date;
          })
        });
      });

      // 1.5 Theme-tied volume spikes
      const topThemes = extractThemesWithMembership(data, 5);
      topThemes.forEach(theme => {
        const themeDailyVol = aggregateDailyVolume(theme.conversations);
        const themeSeries = themeDailyVol.map(d => ({ date: d.date, value: d.total }));
        const themeDetected = detectSpikes(themeSeries, 7, 1.5);
        
        themeDetected.filter(d => d.isAnomaly && d.value >= 3).forEach(anomaly => {
          items.push({
            id: `theme-spike-${theme.theme}-${anomaly.date}`,
            type: 'spike',
            date: anomaly.date,
            title: `Theme Spike: "${theme.theme}"`,
            description: `On ${format(parseISO(anomaly.date), 'MMMM d')}, "${theme.theme}" had ${anomaly.value} complaints (avg ${Math.round(anomaly.mean)}).`,
            conversations: theme.conversations.filter(c => {
              const dateStr = format(new Date(c.created_at * 1000), 'yyyy-MM-dd');
              return dateStr === anomaly.date;
            })
          });
        });
      });

      // 2. High Re-opens
      const highReopens = data.filter(c => (c.statistics?.count_reopens || 0) >= 3);
      if (highReopens.length > 0) {
        items.push({
          id: 'high-reopens',
          type: 'reopen',
          title: 'High Re-open Rate Detected',
          description: `${highReopens.length} conversations have been re-opened 3 or more times, indicating potential resolution failures.`,
          conversations: highReopens
        });
      }

      // 3. Extreme Handling Time (> 24 hours)
      const extremeHandling = data.filter(c => (c.statistics?.handling_time || 0) > (24 * 3600));
      if (extremeHandling.length > 0) {
        items.push({
          id: 'extreme-handling',
          type: 'friction',
          title: 'Extreme Handling Times',
          description: `${extremeHandling.length} conversations took more than 24 hours of active handling time to resolve.`,
          conversations: extremeHandling
        });
      }
    } else {
      // SUPPORT MODE

      // 1. Reopen Spikes
      const dailyReopens = aggregateDailyVolume(data.filter(c => (c.statistics?.count_reopens || 0) > 0));
      const reopenSeries = dailyReopens.map(d => ({ date: d.date, value: d.total }));
      const reopenDetected = detectSpikes(reopenSeries, 7, 1.5);
      
      reopenDetected.filter(d => d.isAnomaly && d.value > 0).forEach(anomaly => {
        items.push({
          id: `reopen-spike-${anomaly.date}`,
          type: 'reopen',
          date: anomaly.date,
          title: `Reopen Spike on ${format(parseISO(anomaly.date), 'MMMM d, yyyy')}`,
          description: `${anomaly.value} conversations were reopened. This is significantly higher than the 7-day average of ${Math.round(anomaly.mean)}.`,
          conversations: data.filter(c => {
             const dateStr = format(new Date(c.created_at * 1000), 'yyyy-MM-dd');
             return dateStr === anomaly.date && (c.statistics?.count_reopens || 0) > 0;
          })
        });
      });

      // 2. Extreme Response Times (> 4 hours)
      const extremeResponse = data.filter(c => (c.statistics?.time_to_admin_reply || 0) > (4 * 3600));
      if (extremeResponse.length > 0) {
        items.push({
          id: 'extreme-response',
          type: 'friction',
          title: 'Extreme Response Times',
          description: `${extremeResponse.length} conversations took more than 4 hours for an initial agent reply.`,
          conversations: extremeResponse
        });
      }
    }

    return items;
  }, [data, mode]);

  return (
    <div className="w-full bg-card border-2 border-border shadow-sm rounded-xl flex flex-col max-h-[360px] overflow-hidden">
      <div className="p-6 border-b border-border flex items-start sm:items-center justify-between shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-chart-2" />
            <h2 className="text-lg font-semibold">Anomaly Feed</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Automated detection of volume spikes and unusual patterns</p>
        </div>
        <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {anomalies.length} detected
        </div>
      </div>
      
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        <div className="h-full overflow-y-auto p-0 pb-12 flex flex-col content-start scrollbar-thin divide-y divide-border/50">
        {anomalies.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-sm h-full">
            <CheckCircle2 className="w-10 h-10 mb-3 text-chart-2/50" />
            <p>No significant anomalies detected.</p>
          </div>
        ) : (
          anomalies.map(anomaly => (
            <div 
              key={anomaly.id} 
              onClick={() => {
                setModalTitle(anomaly.title);
                setModalData(anomaly.conversations);
                setIsModalOpen(true);
              }}
              className="group p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 shrink-0 border border-destructive/20 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {anomaly.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {anomaly.description}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center md:justify-end ml-11 md:ml-0">
                 <div className="text-xs font-semibold bg-secondary/80 text-muted-foreground px-2.5 py-1 rounded-md border border-border/50">
                   {anomaly.conversations.length} tickets
                 </div>
              </div>
            </div>
          ))
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
