"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { calculateResponseTimePercentiles, computeEscalationRisk, computeDatasetThresholds, hasFrustrationPattern } from '@/lib/analytics/aggregations';
import { Users, Clock, ThumbsUp, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ConversationModal from './ConversationModal';

export default function MetricsCards({ data, mode = 'primary' }: { data: PulseConversation[], mode?: 'primary' | 'secondary' | 'secondary_rows' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
// ... replacing just the top line and then I'll add the new block lower down. Wait, I should replace exactly what I need.
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [modalInitialFilter, setModalInitialFilter] = useState<{ sort?: string; classification?: string } | undefined>(undefined);

  const metrics = useMemo(() => {
    const total = data.length;
    let reopened = 0;
    let csatTotal = 0;
    let csatCount = 0;
    let repliedCount = 0;
    const frictionConvs: PulseConversation[] = [];

    const thresholds = computeDatasetThresholds(data);
    
    for (const c of data) {
      if (c.statistics?.count_reopens > 0) reopened++;
      if (c.conversation_rating?.rating) {
        csatTotal += c.conversation_rating.rating;
        csatCount++;
      }
      if (c.statistics?.time_to_admin_reply != null && c.statistics.time_to_admin_reply > 0) {
        repliedCount++;
      }

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
        frictionConvs.push(c);
      }
    }

    const { timeToAdminReply } = calculateResponseTimePercentiles(data);
    
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
      replySub: total > 0 ? `(${repliedCount} replied)` : '',
      frictionRate: total > 0 ? `${((frictionConvs.length / total) * 100).toFixed(1)}%` : '0%',
      frictionSub: total > 0 ? `(${frictionConvs.length}/${total})` : '',
      frictionConvs
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
         return { icon: ArrowDownRight, color: 'text-chart-2', label: `${deltaPct}%` };
      }
    }
    return null;
  }, [data, metrics.frictionConvs]);

  interface MetricCard {
    title: string;
    value: string | number;
    subtext: string;
    icon: React.ElementType;
    color: string;
    tooltip: string;
    sort: string;
    filterFn: (_d: PulseConversation[]) => PulseConversation[];
    trend?: { icon: React.ElementType; color: string; label: string } | null;
  }

  const allCards: MetricCard[] = [
    { title: 'Total Volume', value: metrics.volume.toLocaleString(), subtext: '', icon: Users, color: 'text-chart-1', tooltip: 'Total number of conversations loaded in the dataset.', sort: 'newest', filterFn: (d: PulseConversation[]) => d },
    { title: 'Median Reply Time', value: metrics.p50Reply, subtext: metrics.replySub, icon: Clock, color: 'text-chart-2', tooltip: 'Median time from ticket creation to the first admin reply.', sort: 'time_to_admin_reply_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.time_to_admin_reply != null && c.statistics.time_to_admin_reply > 0) },
    { title: 'Reopen Rate', value: metrics.reopenRate, subtext: metrics.reopenSub, icon: RefreshCw, color: 'text-chart-3', tooltip: 'Percentage of tickets that were closed and then reopened by the customer.', sort: 'reopens_desc', filterFn: (d: PulseConversation[]) => d.filter(c => c.statistics?.count_reopens > 0) },
    { title: 'Friction Rate', value: metrics.frictionRate, subtext: metrics.frictionSub, icon: AlertTriangle, color: 'text-destructive', tooltip: 'Percentage of conversations with high escalation risk or frustration indicators.', sort: 'escalation_desc', filterFn: (_d: PulseConversation[]) => metrics.frictionConvs, trend: frictionTrend },
    { title: 'Avg CSAT', value: metrics.csat, subtext: metrics.csatSub, icon: ThumbsUp, color: 'text-chart-4', tooltip: 'Average customer satisfaction score from all rated conversations.', sort: 'csat_asc', filterFn: (d: PulseConversation[]) => d.filter(c => c.conversation_rating?.rating != null) },
  ];

  let displayedCards = allCards;
  if (mode === 'primary') {
    displayedCards = allCards.filter(c => ['Total Volume', 'Median Reply Time', 'Reopen Rate'].includes(c.title));
  } else if (mode === 'secondary' || mode === 'secondary_rows') {
    displayedCards = allCards.filter(c => ['Friction Rate', 'Avg CSAT'].includes(c.title));
  }

  if (mode === 'secondary_rows') {
    return (
      <div className="flex flex-col">
        {displayedCards.map((card, idx) => {
          const TrendIcon = card.trend?.icon;
          return (
            <div 
              key={card.title} 
              onClick={() => {
                setModalTitle(card.title);
                setModalData(card.filterFn(data));
                setModalInitialFilter({ sort: card.sort });
                setIsModalOpen(true);
              }}
              className="flex items-center justify-between py-4 px-2 hover:bg-secondary/40 transition-colors border-b border-border/40 last:border-0 rounded-lg cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                    {card.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{card.tooltip}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-right shrink-0 ml-4">
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mb-1">
                    Value
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-base font-bold ${card.color}`}>{card.value}</span>
                    {card.subtext && <span className="text-[10px] text-muted-foreground">{card.subtext}</span>}
                  </div>
                </div>
                {TrendIcon && (
                   <div className="flex flex-col items-end w-16">
                     <div className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mb-1">
                       Trend
                     </div>
                     <div className={`flex items-center text-xs font-bold ${card.trend?.color}`}>
                       <TrendIcon className="w-3 h-3 mr-0.5" />
                       {card.trend?.label}
                     </div>
                   </div>
                )}
              </div>
            </div>
          );
        })}
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

  if (mode === 'secondary') {
    return (
      <div className="flex flex-wrap gap-4 mb-2">
        {displayedCards.map((card) => {
          const TrendIcon = card.trend?.icon;
          return (
            <div 
              key={card.title} 
              onClick={() => {
                setModalTitle(card.title);
                setModalData(card.filterFn(data));
                setModalInitialFilter({ sort: card.sort });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-2 bg-background border border-border/50 shadow-sm hover:shadow hover:-translate-y-0.5 rounded-xl cursor-pointer transition-all duration-300"
            >
              <div className={`p-1.5 rounded-md bg-secondary/50 border border-border/50 ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground">{card.title}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-foreground">{card.value}</span>
                  {card.subtext && <span className="text-[10px] text-muted-foreground">{card.subtext}</span>}
                  {card.trend && (
                    <div className={`flex items-center text-[10px] font-bold ${card.trend.color}`}>
                      {TrendIcon && <TrendIcon className="w-3 h-3 mr-0.5" />}
                      {card.trend.label}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

  const gridClass = 'lg:grid-cols-3';

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridClass} gap-6`}>
        {displayedCards.map((card) => {
          const TrendIcon = card.trend?.icon;
          return (
            <div 
              key={card.title} 
              onClick={() => {
                setModalTitle(card.title);
                setModalData(card.filterFn(data));
                setModalInitialFilter({ sort: card.sort });
                setIsModalOpen(true);
              }}
              className="px-6 py-4 bg-card border border-border/60 shadow-sm rounded-2xl flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:border-border transition-all duration-300 group cursor-pointer"
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
                <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                  <p className="text-4xl font-bold tracking-tight text-foreground">{card.value}</p>
                  {card.subtext && <span className="text-xs font-medium text-muted-foreground">{card.subtext}</span>}
                  {card.trend && (
                    <div className={`flex items-center text-xs font-bold ${card.trend.color}`}>
                      {TrendIcon && <TrendIcon className="w-3 h-3 mr-0.5" />}
                      {card.trend.label}
                    </div>
                  )}
                </div>
              </div>
              <div className={`p-3.5 bg-secondary/50 border border-border/50 rounded-xl ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
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
