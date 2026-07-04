"use client";

import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AnomalyFeed from '@/components/dashboard/AnomalyFeed';
import IssueLeaderboards from '@/components/dashboard/IssueLeaderboards';
import EngineeringConversationList from '@/components/dashboard/EngineeringConversationList';

export default function EngineeringPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Engineering & Product</h1>
          <p className="text-muted-foreground mt-1">
            Actionable bug and feature leaderboards, impact analysis, and triage.
          </p>
        </div>
      </div>
      
      <IssueLeaderboards data={data} />
      
      <div className="pt-4">
        <AnomalyFeed data={data} />
      </div>

      <div className="pt-4">
        <EngineeringConversationList data={data} />
      </div>
    </div>
  );
}
