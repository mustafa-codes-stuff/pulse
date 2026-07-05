"use client";

import { useEffect, useState, useMemo } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, fromUnixTime } from 'date-fns';
import IssueLeaderboards from '@/components/dashboard/IssueLeaderboards';
import EngineeringConversationList from '@/components/dashboard/EngineeringConversationList';
import AttentionCallouts from '@/components/dashboard/AttentionCallouts';
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
        <div className="absolute top-6 right-24 z-50 flex items-center space-x-2 bg-card border-2 border-border shadow-sm px-4 py-2 rounded-md cursor-pointer h-10 group/toggle hover:bg-secondary transition-colors" onClick={() => setExcludeNoHuman(!excludeNoHuman)}>
          <input
            type="checkbox"
            id="exclude-human-eng"
            checked={excludeNoHuman}
            onChange={(e) => setExcludeNoHuman(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="exclude-human-eng" className="text-sm font-medium cursor-pointer select-none">
            Human Conversations Only
          </label>
          <div className="absolute top-full mt-2 right-0 w-56 p-2.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none z-50 border border-border shadow-md leading-relaxed">
            Excludes tickets where no customer or lead ever replied; such as automated sequences and unanswered outbound messages.
          </div>
        </div>
      </div>

      <AttentionCallouts data={analyzableData} mode="engineering" />

      <IssueLeaderboards data={analyzableData} />

      <div>
        <EngineeringConversationList data={analyzableData} />
      </div>
    </div>
  );
}
