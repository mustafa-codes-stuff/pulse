"use client";

import { useEffect, useState, useMemo } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MetricsCards from '@/components/dashboard/MetricsCards';
import VolumeChart from '@/components/dashboard/VolumeChart';
import ConversationList from '@/components/dashboard/ConversationList';
import AgentInsights from '@/components/dashboard/AgentInsights';
import FlaggedMoments from '@/components/dashboard/FlaggedMoments';
import SupportCategoryBreakdown from '@/components/dashboard/SupportCategoryBreakdown';
import ResponseTimeByHour from '@/components/dashboard/ResponseTimeByHour';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';

export default function SupportOpsPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);
  const [excludeNoHuman, setExcludeNoHuman] = useState(false);
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
    <div className="px-8 pb-8 pt-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Ops</h1>
          <p className="text-muted-foreground mt-1">
            Operational health, response times, and agent load.
          </p>
        </div>
        <div className="absolute top-6 right-24 z-50 flex items-center space-x-2 bg-card border border-border px-4 py-2 rounded-md cursor-pointer h-10" onClick={() => setExcludeNoHuman(!excludeNoHuman)}>
          <input 
            type="checkbox"
            id="exclude-human" 
            checked={excludeNoHuman} 
            onChange={(e) => setExcludeNoHuman(e.target.checked)} 
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="exclude-human" className="text-sm font-medium cursor-pointer select-none">
            Hide Bot-Only Chats
          </label>
        </div>
      </div>
      
      <MetricsCards data={analyzableData} />
      
      {/* Row 1: Customer Pain Drivers */}
      <div>
        <SupportCategoryBreakdown data={analyzableData} />
      </div>
      
      {/* Row 2: Volume Timeline & Response Times */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <VolumeChart data={analyzableData} />
        <ResponseTimeByHour data={analyzableData} />
      </div>

      {/* Row 3: Agent Insights & Flagged Frustration */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <AgentInsights data={analyzableData} />
        <FlaggedMoments data={analyzableData} />
      </div>

      {/* Row 5: Conversation List */}
      <div>
        <ConversationList data={analyzableData} />
      </div>
    </div>
  );
}
