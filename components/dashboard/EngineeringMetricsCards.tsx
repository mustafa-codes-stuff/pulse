"use client";

import { useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Bug, AlertCircle, TrendingDown, Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { getEngineeringInsights } from '@/lib/analytics/aggregations';

export default function EngineeringMetricsCards({ data, onCardClick }: { data: PulseConversation[], onCardClick?: (conversations: PulseConversation[], title: string, sort?: string) => void }) {
  const metrics = useMemo(() => {
    const bugs: PulseConversation[] = [];
    const criticalBugs: PulseConversation[] = [];
    let bugChurnRiskTotal = 0;
    const features: PulseConversation[] = [];

    for (const c of data) {
      const engInsights = getEngineeringInsights(c);
      const churnRisk = c.llm_classification?.churn_risk_1_to_10 || 1;
      
      if (engInsights.technical_issue_type === 'bug') {
        bugs.push(c);
        bugChurnRiskTotal += churnRisk;
        if (churnRisk >= 7) {
          criticalBugs.push(c);
        }
      } else if (engInsights.technical_issue_type === 'missing_feature') {
        features.push(c);
      }
    }

    return {
      bugs,
      criticalBugs,
      avgBugChurnRisk: bugs.length > 0 ? (bugChurnRiskTotal / bugs.length).toFixed(1) : '--',
      features
    };
  }, [data]);

  const allCards = [
    { title: 'Total Escaped Defects', value: metrics.bugs.length.toLocaleString(), items: metrics.bugs, subtext: 'Bugs reported by users', icon: Bug, color: 'text-chart-1', tooltip: 'Total number of technical bugs that escaped QA and reached production users.', sort: 'newest' },
    { title: 'Critical Defects', value: metrics.criticalBugs.length.toLocaleString(), items: metrics.criticalBugs, subtext: 'High severity bugs', icon: AlertCircle, color: 'text-destructive', tooltip: 'Escaped defects causing a critical churn risk (>= 7/10).', sort: 'escalation_desc' },
    { title: 'Bug-Driven Churn Risk', value: metrics.avgBugChurnRisk, items: metrics.bugs, subtext: '/ 10 average', icon: TrendingDown, color: 'text-chart-3', tooltip: 'The average churn risk score (1-10) for conversations where a bug was reported.', sort: 'newest' },
    { title: 'Missing Features', value: metrics.features.length.toLocaleString(), items: metrics.features, subtext: 'Feature requests', icon: Lightbulb, color: 'text-chart-4', tooltip: 'Number of conversations categorized by AI as a missing feature request.', sort: 'newest' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {allCards.map((card) => {
          return (
            <div 
              key={card.title} 
              onClick={() => {
                if (onCardClick) {
                  onCardClick(card.items, card.title, card.sort);
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
