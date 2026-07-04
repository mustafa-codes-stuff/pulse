"use client";

import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MetricsCards from '@/components/dashboard/MetricsCards';
import VolumeChart from '@/components/dashboard/VolumeChart';
import Percentiles from '@/components/dashboard/Percentiles';
import ConversationList from '@/components/dashboard/ConversationList';
import TicketState from '@/components/dashboard/TicketState';
import SourceChannel from '@/components/dashboard/SourceChannel';
import SnoozeAnalysis from '@/components/dashboard/SnoozeAnalysis';
import AgentLeaderboard from '@/components/dashboard/AgentLeaderboard';

export default function SupportOpsPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);
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

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Ops</h1>
          <p className="text-muted-foreground mt-1">
            Operational health, response times, and agent load.
          </p>
        </div>
      </div>
      
      <MetricsCards data={data} />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
        <VolumeChart data={data} />
        <Percentiles data={data} />
        <TicketState data={data} />
        <SourceChannel data={data} />
        <AgentLeaderboard data={data} />
        <SnoozeAnalysis data={data} />
      </div>

      <div className="pt-4">
        <ConversationList data={data} />
      </div>
    </div>
  );
}
