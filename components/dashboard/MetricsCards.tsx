"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { calculateResponseTimePercentiles, computeEscalationRisk, computeDatasetThresholds, hasFrustrationPattern } from '@/lib/analytics/aggregations';
import { format, fromUnixTime } from 'date-fns';
import { Users, Clock, ThumbsUp, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
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
    let frictionCount = 0;

    const thresholds = computeDatasetThresholds(data);
    
    for (const c of data) {
      if (c.statistics?.count_reopens > 0) reopened++;
      if (c.conversation_rating?.rating) {
        csatTotal += c.conversation_rating.rating;
        csatCount++;
      }

      // Calculate friction: high escalation risk OR frustration language
      const risk = computeEscalationRisk(c, thresholds);
      const parts = c.conversation_parts?.conversation_parts || [];
      let hasFrustration = false;
      for (const part of parts) {
        const body = (part.body || '').replace(/<[^>]*>?/gm, ' ');
        if (hasFrustrationPattern(body).hasFrustration) {
          hasFrustration = true;
          break;
        }
      }

      if (risk > 0.5 || hasFrustration) {
        frictionCount++;
      }
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
      reopenRate: total > 0 ? `${((reopened / total) * 100).toFixed(1)}%` : '0%',
      reopenSub: total > 0 ? `(${reopened}/${total})` : '',
      csat: csatCount > 0 ? `${(csatTotal / csatCount).toFixed(1)}` : '--',
      csatSub: csatCount > 0 ? `(${csatCount})` : '',
      p50Reply: formatTime(timeToAdminReply.p50),
      frictionRate: total > 0 ? `${((frictionCount / total) * 100).toFixed(1)}%` : '0%',
      frictionSub: total > 0 ? `(${frictionCount}/${total})` : '',
      frictionConvs: data.filter(c => {
        const risk = computeEscalationRisk(c, thresholds);
        const parts = c.conversation_parts?.conversation_parts || [];
        let hasFrustration = false;
        for (const part of parts) {
          const body = (part.body || '').replace(/<[^>]*>?/gm, ' ');
          if (hasFrustrationPattern(body).hasFrustration) {
            hasFrustration = true;
            break;
          }
        }
        return risk > 0.5 || hasFrustration;
      })
    };
  }, [data]);

  const frictionTrend = useMemo(() => {
    if (data.length < 10) return null;
    const dates = data.map(c => c.created_at).sort((a,b)=>a-b);
    const midDate = dates[Math.floor(dates.length/2)];
    
    const firstHalf = data.filter(c => c.created_at < midDate);
    const secondHalf = data.filter(c => c.created_at >= midDate);
    
    const firstHalfFriction = firstHalf.filter(c => metrics.frictionConvs.includes(c)).length;
    const secondHalfFriction = secondHalf.filter(c => metrics.frictionConvs.includes(c)).length;
    
    const rate1 = firstHalf.length > 0 ? firstHalfFriction / firstHalf.length : 0;
    const rate2 = secondHalf.length > 0 ? secondHalfFriction / secondHalf.length : 0;
    
    if (rate1 > 0 && rate2 > 0) {
      const delta = rate2 - rate1;
      const deltaPct = (delta * 100).toFixed(1);
      
      if (rate2 > rate1 * 1.2) {
         return { icon: ArrowUpRight, color: 'text-destructive', label: `+${deltaPct}%` };
      } else if (rate2 < rate1 * 0.8) {
         return { icon: ArrowDownRight, color: 'text-chart-2', label: `${deltaPct}%` }; // Delta is negative already
      }
    }
    return null;
  }, [data, metrics.frictionConvs]);

  const cards = [
    { title: 'Total Volume', value: metrics.volume.toLocaleString(), icon: Users, color: 'text-chart-1', tooltip: 'Total number of conversations loaded in the dataset.', sort: 'newest', filterFn: (d: PulseConversation[]) => d },
    { title: 'Median Reply Time', value: metrics.p50Reply, icon: Clock, color: 'text-chart-2', tooltip: 'Median time from ticket creation to the first admin reply.', sort: 'time_to_admin_reply_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.time_to_admin_reply != null && c.statistics.time_to_admin_reply > 0) },
    { title: 'Reopen Rate', value: metrics.reopenRate, subtext: metrics.reopenSub, icon: RefreshCw, color: 'text-chart-3', tooltip: 'Percentage of tickets that were closed and then reopened by the customer.', sort: 'reopens_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.count_reopens > 0) },
    { title: 'Friction Rate', value: metrics.frictionRate, subtext: metrics.frictionSub, icon: AlertTriangle, color: 'text-destructive', tooltip: 'Percentage of conversations with high escalation risk or frustration indicators.', sort: 'escalation_desc', filterFn: (d: PulseConversation[]) => metrics.frictionConvs, trend: frictionTrend },
    { title: 'Avg CSAT', value: metrics.csat, subtext: metrics.csatSub, icon: ThumbsUp, color: 'text-chart-4', tooltip: 'Average customer satisfaction score from all rated conversations.', sort: 'csat_asc', filterFn: (d: PulseConversation[]) => d.filter(c => c.conversation_rating?.rating != null) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card) => {
          const TrendIcon = (card as any).trend?.icon;
          return (
          <div 
            key={card.title} 
            className="p-4 bg-card border-2 border-border shadow-sm rounded-xl flex items-center justify-between hover:scale-[1.02] hover:shadow-md transition-all group"
          >
            <div>
              <div className="flex items-center gap-2 relative">
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{card.title}</p>
                {card.tooltip && (
                  <div className="group/tooltip relative flex items-center">
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help group-hover/tooltip:text-foreground group-hover/tooltip:border-foreground/50 transition-colors">
                      ?
                    </div>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 border-2 border-border shadow-sm shadow-md text-center">
                      {card.tooltip}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-2 flex-wrap">
                <p className="text-3xl font-bold">{card.value}</p>
                {(card as any).subtext && <span className="text-sm font-semibold text-muted-foreground">{(card as any).subtext}</span>}
                {TrendIcon && (
                  <div className={`flex items-center text-xs font-bold ml-1 ${(card as any).trend.color}`}>
                    <TrendIcon className="w-4 h-4 mr-0.5" />
                    {(card as any).trend.label}
                  </div>
                )}
              </div>
            </div>
            <div className={`p-4 bg-secondary rounded-full ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        )})}
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
