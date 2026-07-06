"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import IssueLeaderboards from '@/components/dashboard/IssueLeaderboards';
import EngineeringConversationList from '@/components/dashboard/EngineeringConversationList';
import AttentionCallouts from '@/components/dashboard/AttentionCallouts';
import GlobalFilterToggle from '@/components/ui/GlobalFilterToggle';
import { useFilterContext } from '@/lib/context/FilterContext';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';

export default function EngineeringPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);
  const { excludeNoHuman } = useFilterContext();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const evidencePanelRef = useRef<HTMLDivElement>(null);
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

  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category);
    if (category) {
      setTimeout(() => {
        evidencePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="px-8 pb-8 pt-6 space-y-6 w-full">
      <div className="flex items-start justify-between mb-2">
        <p className="text-muted-foreground mb-4">
          Actionable bug and feature leaderboards, impact analysis, and triage.
        </p>
        <GlobalFilterToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <AttentionCallouts data={analyzableData} mode="engineering" />
        </div>

        <div className="lg:col-span-12">
          <IssueLeaderboards 
            data={analyzableData} 
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>

        {activeCategory && (
          <div className="lg:col-span-12 scroll-mt-6" ref={evidencePanelRef}>
            <EngineeringConversationList 
              data={analyzableData} 
              activeCategory={activeCategory} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
