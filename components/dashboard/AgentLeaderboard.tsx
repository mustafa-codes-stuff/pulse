"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { aggregateAgentPerformance } from '@/lib/analytics/aggregations';
import { User, Clock, MessageSquare, Star, AlertTriangle } from 'lucide-react';
import ConversationModal from './ConversationModal';

export default function AgentLeaderboard({ data, isTab = false }: { data: PulseConversation[], isTab?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const agentMetrics = useMemo(() => aggregateAgentPerformance(data), [data]);

  // Filter conversations for a specific agent
  const getConversationsForAgent = (agentId: string) => {
    return data.filter(conv => {
      const parts = conv.conversation_parts?.conversation_parts || [];
      return parts.some(p => p.author?.type === 'admin' && String(p.author?.id) === agentId);
    });
  };

  // Convert seconds to a readable string (e.g., 2h 15m or 45m)
  const formatTime = (secs: number | null) => {
    if (secs === null) return '--';
    if (secs < 60) return `${Math.floor(secs)}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  // Calculate turns percentiles outside the loop
  const { p50, p75, p90 } = useMemo(() => {
    const allAvgTurns = agentMetrics.map(a => a.avgTurns).filter((t): t is number => t !== null).sort((a, b) => a - b);
    return {
      p50: allAvgTurns.length > 0 ? allAvgTurns[Math.floor(allAvgTurns.length * 0.5)] : 0,
      p75: allAvgTurns.length > 0 ? allAvgTurns[Math.floor(allAvgTurns.length * 0.75)] : 0,
      p90: allAvgTurns.length > 0 ? allAvgTurns[Math.floor(allAvgTurns.length * 0.90)] : 0,
    };
  }, [agentMetrics]);

  return (
    <div className={isTab ? "w-full flex flex-col overflow-hidden" : "w-full h-fit self-start p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col overflow-hidden"}>
      {!isTab && (
        <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Agent Performance
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track responsiveness, CSAT, and friction by agent.
            </p>
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        <div className={`h-full overflow-y-auto scrollbar-thin pb-12 ${isTab ? 'p-6' : 'pr-2'}`}>
        {agentMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[200px]">
            <User className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No agent data available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agentMetrics.slice(0, 10).map((agent, index) => {
              let turnColor = 'text-foreground';
              if (agent.avgTurns !== null) {
                if (agent.avgTurns > p90) turnColor = 'text-destructive';
                else if (agent.avgTurns > p75) turnColor = 'text-chart-4';
                else if (agent.avgTurns <= p50) turnColor = 'text-chart-2';
              }

              return (
                <div 
                  key={agent.id} 
                  onClick={() => {
                    setModalTitle(`Conversations: ${agent.name}`);
                    setModalData(getConversationsForAgent(agent.id));
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{agent.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {agent.volume} tickets
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(agent.medianTimeToAdminReply)} median
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {agent.avgTurns !== null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Turns</span>
                        <span className={`flex items-center gap-1 font-bold text-sm ${turnColor}`}>
                          ~{agent.avgTurns.toFixed(1)} avg
                        </span>
                      </div>
                    )}

                    {agent.csatAvg !== null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">CSAT</span>
                        <span className={`flex items-center gap-1 font-bold text-sm ${agent.csatAvg >= 4.5 ? 'text-chart-2' : agent.csatAvg >= 4.0 ? 'text-chart-4' : 'text-destructive'}`}>
                          {agent.csatAvg.toFixed(1)} <Star className="w-3.5 h-3.5 fill-current" />
                        </span>
                      </div>
                    )}
                    
                    {agent.frictionRate > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Friction</span>
                        <span className={`flex items-center gap-1 font-bold text-sm ${agent.frictionRate > 0.2 ? 'text-destructive' : 'text-chart-3'}`}>
                          {(agent.frictionRate * 100).toFixed(0)}% <span className="text-xs font-normal opacity-70">({agent.frictionCount}/{agent.volume})</span> <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}

                    {agent.reopenRate > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reopens</span>
                        <span className={`flex items-center gap-1 font-bold text-sm ${agent.reopenRate > 0.1 ? 'text-destructive' : 'text-chart-1'}`}>
                          {(agent.reopenRate * 100).toFixed(0)}% <span className="text-xs font-normal opacity-70">({agent.reopenCount}/{agent.volume})</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </div>
  );
}
