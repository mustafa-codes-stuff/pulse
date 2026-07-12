"use client";

import { useState, useMemo, useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import { formatPT } from '@/lib/utils/timezone';
import { CustomCalendar } from '@/components/ui/CustomCalendar';
import AgentLeaderboard from './AgentLeaderboard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

export default function AgentCoverageHeatmap({ data, isTab = false }: { data: PulseConversation[], isTab?: boolean }) {
  const { availableDays, activeDays } = useMemo(() => {
    const days = new Set<string>();
    const active = new Set<string>();
    for (const conv of data) {
      days.add(formatPT(conv.created_at, 'yyyy-MM-dd'));
      if (conv.updated_at) days.add(formatPT(conv.updated_at, 'yyyy-MM-dd'));
      const parts = conv.conversation_parts?.conversation_parts || [];
      for (const p of parts) {
        if (p.created_at) {
          const d = formatPT(p.created_at, 'yyyy-MM-dd');
          days.add(d);
          if (p.author?.type === 'admin' && p.part_type === 'comment') {
            active.add(d);
          }
        }
      }
    }
    return {
      availableDays: Array.from(days).sort().reverse(),
      activeDays: Array.from(active).sort().reverse()
    };
  }, [data]);

  const defaultDay = useMemo(() => {
    if (activeDays.length > 0) return activeDays[0];
    return availableDays.length > 0 ? availableDays[0] : 'all';
  }, [availableDays, activeDays]);

  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDay(defaultDay);
  }, [defaultDay]);

  const formatDay = (ymd: string) => {
    if (ymd === 'all') return 'All Time';
    const [y, m, d] = ymd.split('-');
    const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const heatmapData = useMemo(() => {
    const agents: { [name: string]: { total: number, hours: number[] } } = {};

    for (const conv of data) {
      const parts = conv.conversation_parts?.conversation_parts || [];
      for (const p of parts) {
        if (p.author?.type === 'admin' && p.part_type === 'comment') {
          if (selectedDay !== 'all') {
            const d = formatPT(p.created_at, 'yyyy-MM-dd');
            if (d !== selectedDay) continue;
          }

          const name = p.author.name || 'Unknown';
          if (!agents[name]) {
            agents[name] = { total: 0, hours: Array(24).fill(0) };
          }
          const hour = parseInt(formatPT(p.created_at, 'H'), 10);
          agents[name].hours[hour]++;
          agents[name].total++;
        }
      }
    }

    let maxHourlyVolume = 0;
    const sortedAgents = Object.entries(agents)
      .map(([name, info]) => {
        info.hours.forEach(v => { if (v > maxHourlyVolume) maxHourlyVolume = v; });
        return { name, ...info };
      })
      .sort((a, b) => b.total - a.total);

    return { agents: sortedAgents, maxVolume: maxHourlyVolume };
  }, [data, selectedDay]);

  const getColor = (volume: number, max: number) => {
    if (volume === 0) return 'bg-secondary/10 border border-border/50';
    if (max === 0) return 'bg-chart-1';

    // 5 buckets of intensity
    const intensity = volume / max;
    if (intensity < 0.2) return 'bg-chart-1/20';
    if (intensity < 0.4) return 'bg-chart-1/40';
    if (intensity < 0.6) return 'bg-chart-1/60';
    if (intensity < 0.8) return 'bg-chart-1/80';
    return 'bg-chart-1';
  };

  return (
    <div className={isTab ? "w-full flex flex-col p-6" : "w-full h-fit self-start p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col"}>
      {!isTab ? (
        <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Agent Coverage Heatmap (PST)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hourly ticket handling volume per agent.
            </p>
          </div>
          <CustomCalendar
            selectedDate={selectedDay}
            onSelect={setSelectedDay}
            availableDays={availableDays}
            activeDays={activeDays}
          />
        </div>
      ) : (
        <div className="mb-4 shrink-0 flex justify-end">
          <CustomCalendar
            selectedDate={selectedDay}
            onSelect={setSelectedDay}
            availableDays={availableDays}
            activeDays={activeDays}
          />
        </div>
      )}

      <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 mb-2 xl:hidden italic px-1">
        <span>Scroll horizontally to view all 24 hours →</span>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Agent Column */}
        <div className="w-32 shrink-0 flex flex-col h-full z-10 bg-card pb-4">
          <div className="flex mb-4 shrink-0 items-center">
            <div className="h-[15px]"></div>
          </div>
          <div className="flex-1 flex flex-col justify-around gap-6 py-2 min-h-[200px]">
            {heatmapData.agents.length === 0 ? (
              <div className="text-sm text-transparent text-center py-4 shrink-0">Empty</div>
            ) : (
              heatmapData.agents.map(agent => (
                <div key={agent.name} className="flex items-stretch group flex-1 min-h-[48px] max-h-[80px]">
                  <div className="w-32 shrink-0 flex items-center pr-4">
                    <button
                      onClick={() => setSelectedAgentForModal(agent.name)}
                      className="text-sm font-semibold truncate text-foreground/80 hover:text-primary bg-secondary/30 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors cursor-pointer ring-1 ring-border/50 hover:ring-primary/30 shadow-sm max-w-full"
                    >
                      {agent.name}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scrollable Timeline Column */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-secondary/40 [&::-webkit-scrollbar-track]:rounded-full">
          <div className="min-w-[800px] h-full flex flex-col min-h-min">
            {/* Header row (hours) */}
            <div className="flex mb-4 shrink-0">
              <div className="flex-1 flex justify-between">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {i % 2 === 0 ? `${String(i).padStart(2, '0')}:00` : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Agent rows */}
            <div className="flex-1 flex flex-col justify-around gap-6 py-2 min-h-[200px]">
              {heatmapData.agents.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 shrink-0">No agent data available</div>
              ) : (
                heatmapData.agents.map(agent => (
                  <div key={agent.name} className="flex items-stretch group flex-1 min-h-[48px] max-h-[80px]">
                    <div className="flex-1 flex gap-1 items-center">
                      {agent.hours.map((volume, hour) => {
                        const cell = (
                          <div
                            tabIndex={0}
                            aria-label={`${agent.name} handled ${volume} replies at ${String(hour).padStart(2, '0')}:00`}
                            className={`flex-1 h-14 rounded-md ${getColor(volume, heatmapData.maxVolume)} transition-all hover:ring-2 hover:ring-ring cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring`}
                          />
                        );
                        
                        if (volume > 0) {
                          return (
                            <Tooltip key={hour}>
                              <TooltipTrigger asChild>
                                {cell}
                              </TooltipTrigger>
                              <TooltipContent>
                                {volume} replies at {String(hour).padStart(2, '0')}:00
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                        
                        return <div key={hour} className="flex-1">{cell}</div>;
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {heatmapData.maxVolume > 0 && (
        <div className="flex items-center justify-end gap-2 mt-4 shrink-0 text-xs text-muted-foreground border-t border-border/40 pt-4">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-secondary/10 border border-border/50"></div>
            <div className="w-4 h-4 rounded-sm bg-chart-1/20"></div>
            <div className="w-4 h-4 rounded-sm bg-chart-1/40"></div>
            <div className="w-4 h-4 rounded-sm bg-chart-1/60"></div>
            <div className="w-4 h-4 rounded-sm bg-chart-1/80"></div>
            <div className="w-4 h-4 rounded-sm bg-chart-1"></div>
          </div>
          <span>More</span>
        </div>
      )}

      {selectedAgentForModal && (
        <div 
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" 
          onClick={() => setSelectedAgentForModal(null)}
        >
          <div 
            className="bg-card w-full max-w-4xl border border-border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-secondary/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Performance Metrics: {selectedAgentForModal}
              </h3>
              <button 
                onClick={() => setSelectedAgentForModal(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-secondary/5">
              <AgentLeaderboard data={data} isTab={true} agentName={selectedAgentForModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
