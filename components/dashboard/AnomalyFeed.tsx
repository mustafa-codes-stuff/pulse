"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { detectSpikes } from '@/lib/analytics/anomalies';
import { AlertTriangle, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConversationModal from './ConversationModal';

export default function AnomalyFeed({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const anomalies = useMemo(() => {
    // We'll detect volume spikes first
    const dailyVol = aggregateDailyVolume(data);
    const series = dailyVol.map(d => ({ date: d.date, value: d.total }));
    const detected = detectSpikes(series, 7, 2);
    
    return detected
      .filter(d => d.isAnomaly)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {anomalies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
            <p>No significant anomalies detected in this dataset.</p>
          </div>
        ) : (
          anomalies.map(anomaly => (
            <div 
              key={anomaly.date} 
              onClick={() => {
                setModalTitle(`Spike Anomalies: ${format(parseISO(anomaly.date), 'MMMM d, yyyy')}`);
                setModalData(data.filter(c => {
                  const dateStr = format(new Date(c.created_at * 1000), 'yyyy-MM-dd');
                  return dateStr === anomaly.date;
                }));
                setIsModalOpen(true);
              }}
              className="p-4 rounded-lg bg-anomaly-bg border border-anomaly-border text-anomaly-text flex items-start gap-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">
                  Volume Spike on {format(parseISO(anomaly.date), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm mt-1 opacity-90">
                  {anomaly.value.toLocaleString()} conversations created. This is significantly higher than the 7-day rolling average of {Math.round(anomaly.mean)}.
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
