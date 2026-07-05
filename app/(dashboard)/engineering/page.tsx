"use client";

import { useEffect, useState, useMemo } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AnomalyFeed from '@/components/dashboard/AnomalyFeed';
import IssueLeaderboards from '@/components/dashboard/IssueLeaderboards';
import EngineeringConversationList from '@/components/dashboard/EngineeringConversationList';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';

export default function EngineeringPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Engineering & Product</h1>
          <p className="text-muted-foreground mt-1">
            Actionable bug and feature leaderboards, impact analysis, and triage.
          </p>
        </div>
        <div className="absolute top-6 right-24 z-50 flex items-center space-x-2 bg-card border border-border px-4 py-2 rounded-md cursor-pointer h-10" onClick={() => setExcludeNoHuman(!excludeNoHuman)}>
          <input 
            type="checkbox"
            id="exclude-human-eng" 
            checked={excludeNoHuman} 
            onChange={(e) => setExcludeNoHuman(e.target.checked)} 
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="exclude-human-eng" className="text-sm font-medium cursor-pointer select-none">
            Hide Bot-Only Chats
          </label>
        </div>
      </div>
      
      <IssueLeaderboards data={analyzableData} />
      
      <div>
        <AnomalyFeed data={analyzableData} />
      </div>

      <div>
        <EngineeringConversationList data={analyzableData} />
      </div>
    </div>
  );
}
