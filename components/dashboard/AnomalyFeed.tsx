"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { AlertTriangle, Activity } from 'lucide-react';
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

export default function AnomalyFeed({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const anomalies = useMemo(() => {
    const items: AnomalyItem[] = [];
    
    // 1. Detect volume spikes
    const dailyVol = aggregateDailyVolume(data);
    const series = dailyVol.map(d => ({ date: d.date, value: d.total }));
    // Use standard deviation of 1.5 to be slightly more sensitive for smaller datasets
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

    return items;
  }, [data]);

  return (
    <div className="w-full bg-card border border-border rounded-xl flex flex-col h-full min-h-[400px]">
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-chart-1" />
          <h2 className="text-lg font-semibold">Anomaly Feed</h2>
        </div>
        <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {anomalies.length} detected
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start scrollbar-thin">
        {anomalies.length === 0 ? (
          <div className="md:col-span-2 h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
            <p>No significant anomalies detected in this dataset.</p>
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
              className="p-4 rounded-lg bg-anomaly-bg border border-anomaly-border text-anomaly-text flex items-start gap-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
              <div>
                <p className="text-sm font-bold">
                  {anomaly.title}
                </p>
                <p className="text-sm mt-1 opacity-90">
                  {anomaly.description}
                </p>
              </div>
            </div>
          ))
        )}
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
