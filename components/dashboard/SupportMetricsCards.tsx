"use client";

import { useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { calculateResponseTimePercentiles, computeDatasetThresholds, hasFrustrationPattern, computeEscalationRisk, getAiAgentRating } from '@/lib/analytics/aggregations';
import { Users, ThumbsUp, Star, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

export default function SupportMetricsCards({ data, onCardClick }: { data: PulseConversation[], onCardClick?: (filter: { sort?: string }, title?: string) => void }) {
  const metrics = useMemo(() => {
    const total = data.length;
    let csatTotal = 0;
    let csatCount = 0;
    let aiAgentRatingTotal = 0;
    let aiAgentRatingCount = 0;
    let repliedCount = 0;
    const frictionConvs: PulseConversation[] = [];

    const thresholds = computeDatasetThresholds(data);
    
    for (const c of data) {
      if (c.conversation_rating?.rating) {
        csatTotal += c.conversation_rating.rating;
        csatCount++;
      }
      const agentRating = getAiAgentRating(c);
      if (agentRating !== null) {
        aiAgentRatingTotal += agentRating;
        aiAgentRatingCount++;
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
      csat: csatCount > 0 ? `${(csatTotal / csatCount).toFixed(1)}` : '--',
      csatSub: csatCount > 0 ? `(${csatCount} ratings)` : 'No ratings',
      aiAgentRating: aiAgentRatingCount > 0 ? `${(aiAgentRatingTotal / aiAgentRatingCount).toFixed(1)}` : '--',
      aiAgentRatingSub: aiAgentRatingCount > 0 ? `(${aiAgentRatingCount} analyzed)` : '',
      p50Reply: formatTime(timeToAdminReply.p50),
      replySub: total > 0 ? `(${repliedCount} replied)` : '',
      frictionRate: total > 0 ? `${((frictionConvs.length / total) * 100).toFixed(1)}%` : '0%',
      frictionSub: total > 0 ? `(${frictionConvs.length}/${total})` : '',
      frictionConvs
    };
  }, [data]);

  const allCards = [
    { title: 'Total Support Volume', value: metrics.volume.toLocaleString(), subtext: 'Tickets in dataset', icon: Users, color: 'text-chart-1', tooltip: 'Total number of conversations loaded in the current support dataset.', sort: 'newest' },
    { title: 'Customer Satisfaction', value: metrics.csat, subtext: metrics.csatSub, icon: ThumbsUp, color: 'text-chart-4', tooltip: 'Average customer satisfaction score from explicitly rated conversations.', sort: 'csat_asc' },
    { title: 'AI Agent Rating', value: metrics.aiAgentRating, subtext: metrics.aiAgentRatingSub, icon: Star, color: 'text-chart-2', tooltip: 'AI-generated score (1-10) evaluating the quality and empathy of agent responses.', sort: 'newest' },
    { title: 'Friction Rate', value: metrics.frictionRate, subtext: metrics.frictionSub, icon: AlertTriangle, color: 'text-destructive', tooltip: 'Percentage of conversations exhibiting frustration patterns or high churn risk.', sort: 'escalation_desc' }
  ];

  return (
    <div className="space-y-4">
      {/* 2xl:grid-cols-4 for MacBook Pro 16" optimization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {allCards.map((card) => {
          return (
            <div 
              key={card.title} 
              onClick={() => {
                if (onCardClick) {
                  onCardClick({ sort: card.sort }, card.title);
                }
              }}
              className="px-6 py-4 bg-card border border-border/60 shadow-sm rounded-2xl flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:border-border transition-all duration-300 group cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{card.title}</p>
                  {card.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors">
                          ?
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {card.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                  <p className="text-3xl xl:text-4xl font-bold tracking-tight text-foreground">{card.value}</p>
                  {card.subtext && <span className="text-xs font-medium text-muted-foreground">{card.subtext}</span>}
                </div>
              </div>
              <div className={`p-3.5 bg-secondary/50 border border-border/50 rounded-xl ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
