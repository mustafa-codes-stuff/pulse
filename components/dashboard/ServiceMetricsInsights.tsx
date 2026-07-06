"use client";

import { useState } from 'react';
import { PulseConversation } from '@/lib/types';
import FlaggedMoments from './FlaggedMoments';
import MetricsCards from './MetricsCards';

export default function ServiceMetricsInsights({ data }: { data: PulseConversation[] }) {
  const [activeTab, setActiveTab] = useState<'frustration' | 'kpis'>('frustration');

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="border-b border-border/40 flex items-center px-2 shrink-0">
        <button 
          onClick={() => setActiveTab('frustration')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'frustration' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Frustration History
        </button>
        <button 
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'kpis' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Service KPIs
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-6 relative">
        {activeTab === 'frustration' && <FlaggedMoments data={data} isTab={true} />}
        {activeTab === 'kpis' && (
          <div className="h-full overflow-y-auto">
            <MetricsCards data={data} mode="secondary_rows" />
          </div>
        )}
      </div>
    </div>
  );
}
