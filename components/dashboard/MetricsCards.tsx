"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Users, Clock, ThumbsUp, RefreshCw } from 'lucide-react';
import { calculateResponseTimePercentiles } from '@/lib/analytics/aggregations';
import { format, fromUnixTime } from 'date-fns';
import ConversationModal from './ConversationModal';

export default function MetricsCards({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const [modalInitialFilter, setModalInitialFilter] = useState<any>(undefined);

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
    { title: 'Total Volume', value: metrics.volume.toLocaleString(), icon: Users, color: 'text-chart-1', tooltip: 'Total number of conversations loaded in the dataset.', sort: 'newest', filterFn: (d: PulseConversation[]) => d },
    { title: 'Median Reply Time', value: metrics.p50Reply, icon: Clock, color: 'text-chart-2', tooltip: 'Median time from ticket creation to the first admin reply.', sort: 'time_to_admin_reply_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.time_to_admin_reply != null && c.statistics.time_to_admin_reply > 0) },
    { title: 'Reopen Rate', value: metrics.reopenRate, icon: RefreshCw, color: 'text-chart-3', tooltip: 'Percentage of tickets that were closed and then reopened by the customer.', sort: 'reopens_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.count_reopens > 0) },
    { title: 'Avg CSAT', value: metrics.csat, icon: ThumbsUp, color: 'text-chart-4', tooltip: 'Average customer satisfaction score from all rated conversations.', sort: 'csat_asc', filterFn: (d: PulseConversation[]) => d.filter(c => c.conversation_rating?.rating != null) },
  ];

  const datasetContext = useMemo(() => {
    if (data.length === 0) return null;
    const sources = Array.from(new Set(data.map(c => c._sourceFilename || 'Unknown Source')));
    const dates = data.map(c => c.created_at).sort((a, b) => a - b);
    const dateRange = dates.length > 0 
      ? `${format(fromUnixTime(dates[0]), 'MMM d, yyyy')} - ${format(fromUnixTime(dates[dates.length - 1]), 'MMM d, yyyy')}` 
      : '';
    
    return {
      sources: sources.join(', '),
      dateRange
    };
  }, [data]);

  return (
    <div className="space-y-4">
      {datasetContext && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground bg-secondary/30 border border-border px-4 py-2 rounded-lg w-fit">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-chart-2 animate-pulse"></span>
            Data from: {datasetContext.sources}
          </div>
          {datasetContext.dateRange && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                Date Range: {datasetContext.dateRange}
              </div>
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
        <div 
          key={card.title} 
          onClick={() => {
            setModalTitle(`Conversations: ${card.title}`);
            setModalData(card.filterFn(data));
            setModalInitialFilter({ sort: card.sort });
            setIsModalOpen(true);
          }}
          className="p-6 bg-card border border-border rounded-xl flex items-center justify-between hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center gap-2 relative">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{card.title}</p>
              {card.tooltip && (
                <div className="group/tooltip relative flex items-center">
                  <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help group-hover/tooltip:text-foreground group-hover/tooltip:border-foreground/50 transition-colors">
                    ?
                  </div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 border border-border shadow-md text-center">
                    {card.tooltip}
                  </div>
                </div>
              )}
            </div>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
          <div className={`p-4 bg-secondary rounded-full ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
        </div>
      ))}
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
        initialFilter={modalInitialFilter}
      />
    </div>
  );
}
