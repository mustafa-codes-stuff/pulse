"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2, Users, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SupportMetricsCards from '@/components/dashboard/SupportMetricsCards';
import ConversationList from '@/components/dashboard/ConversationList';
import ServiceMetricsInsights from '@/components/dashboard/ServiceMetricsInsights';
import SupportCategoryBreakdown from '@/components/dashboard/SupportCategoryBreakdown';
import TimelineResponseMetrics from '@/components/dashboard/TimelineResponseMetrics';
import AgentCoverageHeatmap from '@/components/dashboard/AgentCoverageHeatmap';
import AttentionCallouts from '@/components/dashboard/AttentionCallouts';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

import { filterAnalyzableConversations } from '@/lib/analytics/filters';

export default function SupportOpsPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);

  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<{ id: string, title?: string } | undefined>(undefined);
  const [activeListData, setActiveListData] = useState<{ data: PulseConversation[], title: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = () => {
      getConversations().then(res => {
        if (!res || res.length === 0) {
          router.push('/');
        } else {
          setData(res);
        }
      });
    };

    fetchData();

    window.addEventListener('pulse-dataset-updated', fetchData);
    return () => {
      window.removeEventListener('pulse-dataset-updated', fetchData);
    };
  }, [router]);

  const analyzableData = useMemo(() => {
    if (!data) return null;
    return filterAnalyzableConversations(data).analyzable;
  }, [data]);

  if (!analyzableData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-8 pb-8 pt-6 space-y-6 w-full">
      <div className="flex items-start justify-between mb-2">
        <p className="text-muted-foreground mb-4">
          Actionable service metrics, agent performance, and customer friction.
        </p>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <SupportMetricsCards 
            data={analyzableData} 
            onCardClick={(filter, title) => {
              setActiveListData(null); // Clear active list data when using sorts
              setSelectedFilter({ id: filter.sort as string }); // Intentionally omit title so no badge is shown
              // Scroll to the list panel
              setTimeout(() => {
                listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }} 
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <AttentionCallouts 
            data={analyzableData} 
            onCardClick={(convs, title) => {
              setActiveListData({ data: convs, title });
              setSelectedFilter({ id: 'newest', title });
              setTimeout(() => {
                listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }} 
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <SupportCategoryBreakdown 
            data={analyzableData} 
            onCardClick={(convs, title) => {
              setActiveListData({ data: convs, title });
              setSelectedFilter({ id: 'newest', title });
              setTimeout(() => {
                listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }} 
          />
        </div>

        <div className="lg:col-span-4 flex flex-col h-full gap-6">
          <TimelineResponseMetrics data={analyzableData} />
        </div>

        <div className="lg:col-span-12 flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/2 relative">
            <div className="lg:absolute lg:inset-0 group border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm h-full flex flex-col">
              <div className="px-6 py-4 font-semibold border-b border-border/40 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-chart-1" />
                Customer Friction Signals
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors ml-1">
                      ?
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Moments where the customer expressed frustration immediately after an agent reply.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 bg-secondary/5 h-full overflow-hidden">
                <ServiceMetricsInsights data={analyzableData} />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="group border border-border/60 rounded-2xl bg-card shadow-sm h-full flex flex-col">
              <div className="px-6 py-4 font-semibold border-b border-border/40 flex items-center gap-2">
                <Users className="w-5 h-5 text-chart-2" />
                Agent Activity Heatmap (PST)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors ml-1">
                      ?
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Hourly heat map of agent comment activity. Helps identify coverage gaps and peak loads.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 bg-secondary/5 h-full min-h-0">
                <AgentCoverageHeatmap data={analyzableData} isTab={true} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12" ref={listRef}>
          <ConversationList 
            data={activeListData ? activeListData.data : analyzableData} 
            initialFilter={selectedFilter ? { sort: selectedFilter.id } : undefined}
            filterTitle={activeListData ? activeListData.title : selectedFilter?.title}
            onClearFilter={() => {
              setActiveListData(null);
              setSelectedFilter(undefined);
            }}
          />
        </div>
      </div>
    </div>
  );
}
