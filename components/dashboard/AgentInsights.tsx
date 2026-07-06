"use client";

import { useState } from 'react';
import { PulseConversation } from '@/lib/types';
import AgentLeaderboard from './AgentLeaderboard';
import AgentCoverageHeatmap from './AgentCoverageHeatmap';
import { Users } from 'lucide-react';

export default function AgentInsights({ data }: { data: PulseConversation[] }) {
  const [activeTab, setActiveTab] = useState<'performance' | 'coverage'>('performance');

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="border-b border-border/40 flex items-center px-2">
        <button 
          onClick={() => setActiveTab('performance')}
          className={`px-1 py-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Performance Metrics
        </button>
        <button 
          onClick={() => setActiveTab('coverage')}
          className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'coverage' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Coverage Heatmap (PST)
        </button>
      </div>
      <div className="flex-1">
        {activeTab === 'performance' && <AgentLeaderboard data={data} isTab={true} />}
        {activeTab === 'coverage' && <AgentCoverageHeatmap data={data} isTab={true} />}
      </div>
    </div>
  );
}
