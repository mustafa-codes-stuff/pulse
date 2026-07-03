"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Users, Clock, ThumbsUp, RefreshCw } from 'lucide-react';
import { calculateResponseTimePercentiles } from '@/lib/analytics/aggregations';
import ConversationModal from './ConversationModal';

export default function MetricsCards({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const metrics = useMemo(() => {
    const total = data.length;
    let reopened = 0;
    let csatTotal = 0;
    let csatCount = 0;
    let aiHandled = 0;
    
    for (const c of data) {
      if (c.statistics?.count_reopens > 0) reopened++;
      if (c.conversation_rating?.rating) {
        csatTotal += c.conversation_rating.rating;
        csatCount++;
      }
      if (c.ai_agent_participated) aiHandled++;
    }

    const { timeToAdminReply } = calculateResponseTimePercentiles(data);
    
    // Convert seconds to a readable string (e.g., 2h 15m or 45m)
    const formatTime = (secs: number | null) => {
      if (secs === null) return '--';
      if (secs < 60) return `${Math.floor(secs)}s`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    };

    return {
      volume: total,
      reopenRate: total > 0 ? ((reopened / total) * 100).toFixed(1) + '%' : '0%',
      csat: csatCount > 0 ? (csatTotal / csatCount).toFixed(1) : '--',
      p50Reply: formatTime(timeToAdminReply.p50),
      aiRate: total > 0 ? ((aiHandled / total) * 100).toFixed(1) + '%' : '0%'
    };
  }, [data]);

  const cards = [
    { title: 'Total Volume', value: metrics.volume.toLocaleString(), icon: Users, color: 'text-chart-1', filterFn: (d: PulseConversation[]) => d },
    { title: 'Median Reply Time', value: metrics.p50Reply, icon: Clock, color: 'text-chart-2', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.time_to_admin_reply != null && c.statistics.time_to_admin_reply > 0) },
    { title: 'Reopen Rate', value: metrics.reopenRate, icon: RefreshCw, color: 'text-chart-3', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.count_reopens > 0) },
    { title: 'Avg CSAT', value: metrics.csat, icon: ThumbsUp, color: 'text-chart-4', filterFn: (d: PulseConversation[]) => d.filter(c => c.conversation_rating?.rating != null) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div 
          key={card.title} 
          onClick={() => {
            setModalTitle(`Conversations: ${card.title}`);
            setModalData(card.filterFn(data));
            setIsModalOpen(true);
          }}
          className="p-6 bg-card border border-border rounded-xl flex items-center justify-between hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer group"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{card.title}</p>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
          <div className={`p-4 bg-secondary rounded-full ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
        </div>
      ))}

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </div>
  );
}
