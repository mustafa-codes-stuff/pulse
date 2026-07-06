"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { formatPT } from '@/lib/utils/timezone';

export default function AgentCoverageHeatmap({ data, isTab = false }: { data: PulseConversation[], isTab?: boolean }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const conv of data) {
      const parts = conv.conversation_parts?.conversation_parts || [];
      for (const p of parts) {
        if (p.author?.type === 'admin' && p.part_type === 'comment') {
          months.add(formatPT(p.created_at, 'yyyy-MM'));
        }
      }
    }
    return Array.from(months).sort().reverse();
  }, [data]);

  const formatMonth = (ym: string) => {
    if (ym === 'all') return 'All Time';
    const [y, m] = ym.split('-');
    const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1));
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  const heatmapData = useMemo(() => {
    const agents: { [name: string]: { total: number, hours: number[] } } = {};

    for (const conv of data) {
      const parts = conv.conversation_parts?.conversation_parts || [];
      for (const p of parts) {
        if (p.author?.type === 'admin' && p.part_type === 'comment') {
          if (selectedMonth !== 'all') {
            const m = formatPT(p.created_at, 'yyyy-MM');
            if (m !== selectedMonth) continue;
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
  }, [data, selectedMonth]);

  const getColor = (volume: number, max: number) => {
    if (volume === 0) return 'bg-secondary/20';
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
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-secondary text-secondary-foreground text-sm rounded-md px-3 py-1.5 border-none outline-none cursor-pointer focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mb-4 shrink-0 flex justify-end">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-secondary text-secondary-foreground text-sm rounded-md px-3 py-1.5 border-none outline-none cursor-pointer focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-x-auto scrollbar-thin">
        <div className="min-w-[600px]">
          {/* Header row (hours) */}
          <div className="flex mb-2">
            <div className="w-32 shrink-0"></div>
            <div className="flex-1 flex justify-between">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                  {i}
                </div>
              ))}
            </div>
          </div>

          {/* Agent rows */}
          <div className="space-y-3">
            {heatmapData.agents.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No agent data available</div>
            ) : (
              heatmapData.agents.map(agent => (
                <div key={agent.name} className="flex items-center group">
                  <div className="w-32 shrink-0 text-sm font-medium truncate pr-4 text-foreground/80 group-hover:text-foreground transition-colors">
                    {agent.name}
                  </div>
                  <div className="flex-1 flex gap-0.5">
                    {agent.hours.map((volume, hour) => (
                      <div
                        key={hour}
                        className={`flex-1 h-8 rounded-sm ${getColor(volume, heatmapData.maxVolume)} transition-all hover:ring-2 hover:ring-ring relative group/cell cursor-pointer`}
                      >
                        {volume > 0 && (
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-sm border-2 border-border shadow-sm">
                            {volume} replies at {String(hour).padStart(2, '0')}:00
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          {heatmapData.maxVolume > 0 && (
            <div className="flex items-center justify-end gap-2 mt-6 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-4 rounded-sm bg-chart-1/20"></div>
                <div className="w-4 h-4 rounded-sm bg-chart-1/40"></div>
                <div className="w-4 h-4 rounded-sm bg-chart-1/60"></div>
                <div className="w-4 h-4 rounded-sm bg-chart-1/80"></div>
                <div className="w-4 h-4 rounded-sm bg-chart-1"></div>
              </div>
              <span>More</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
