"use client";

import { useEffect, useState, useMemo } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2, Users, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MetricsCards from '@/components/dashboard/MetricsCards';
// ... I'll do a chunk replace for the lower section instead.
import ConversationList from '@/components/dashboard/ConversationList';
import AgentInsights from '@/components/dashboard/AgentInsights';
import ServiceMetricsInsights from '@/components/dashboard/ServiceMetricsInsights';
import SupportCategoryBreakdown from '@/components/dashboard/SupportCategoryBreakdown';
import TimelineResponseMetrics from '@/components/dashboard/TimelineResponseMetrics';
import AttentionCallouts from '@/components/dashboard/AttentionCallouts';
import GlobalFilterToggle from '@/components/ui/GlobalFilterToggle';
import { useFilterContext } from '@/lib/context/FilterContext';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';

export default function SupportOpsPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);
  const { excludeNoHuman } = useFilterContext();
  const router = useRouter();

  useEffect(() => {
    getConversations().then(res => {
      if (!res || res.length === 0) {
        router.push('/');
      } else {
        setData(res);
      }
    });
  }, [router]);

  const analyzableData = useMemo(() => {
    if (!data) return null;
    return filterAnalyzableConversations(data, excludeNoHuman).analyzable;
  }, [data, excludeNoHuman]);

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
        <GlobalFilterToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <MetricsCards data={analyzableData} mode="primary" />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <AttentionCallouts data={analyzableData} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <SupportCategoryBreakdown data={analyzableData} />
        </div>

        <div className="lg:col-span-4 flex flex-col h-full gap-6">
          <TimelineResponseMetrics data={analyzableData} />
        </div>

        <div className="lg:col-span-6">
          <div className="group border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm h-full flex flex-col">
            <div className="px-6 py-4 font-semibold border-b border-border/40 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-chart-1" />
              More service metrics
            </div>
            <div className="flex-1 bg-secondary/5 h-full">
              <ServiceMetricsInsights data={analyzableData} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="group border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm h-full flex flex-col">
            <div className="px-6 py-4 font-semibold border-b border-border/40 flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-2" />
              Agent Performance
            </div>
            <div className="p-6 flex-1 bg-secondary/5 h-full">
              <AgentInsights data={analyzableData} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-12">
          <ConversationList data={analyzableData} />
        </div>
      </div>
    </div>
  );
}
