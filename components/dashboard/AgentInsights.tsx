"use client";

import { useState } from 'react';
import { PulseConversation } from '@/lib/types';
import AgentLeaderboard from './AgentLeaderboard';
import AgentCoverageHeatmap from './AgentCoverageHeatmap';
import { Users } from 'lucide-react';

export default function AgentInsights({ data }: { data: PulseConversation[] }) {
  const [activeTab, setActiveTab] = useState<'performance' | 'coverage'>('performance');

  return (
    <div className="w-full h-[450px] bg-card border border-border rounded-xl flex flex-col overflow-hidden">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-chart-2" />
          Agent Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor individual agent performance and coverage schedules.
        </p>
      </div>
      <div className="border-b border-border flex items-center px-6 mt-6">
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
          Coverage Heatmap (UTC)
        </button>
      </div>
      <div className="flex-1">
        {activeTab === 'performance' && <AgentLeaderboard data={data} isTab={true} />}
        {activeTab === 'coverage' && <AgentCoverageHeatmap data={data} isTab={true} />}
      </div>
    </div>
  );
}
