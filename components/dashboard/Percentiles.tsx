"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PulseConversation } from '@/lib/types';
import { calculateResponseTimePercentiles } from '@/lib/analytics/aggregations';

export default function Percentiles({ data }: { data: PulseConversation[] }) {
  const chartData = useMemo(() => {
    const { timeToAdminReply, timeToFirstClose } = calculateResponseTimePercentiles(data);
    
    const toHours = (secs: number | null) => secs ? Number((secs / 3600).toFixed(2)) : 0;
    
    return [
      {
        name: 'Reply Time (hrs)',
        p50: toHours(timeToAdminReply.p50),
        p90: toHours(timeToAdminReply.p90),
        p99: toHours(timeToAdminReply.p99),
      },
      {
        name: 'Resolution Time (hrs)',
        p50: toHours(timeToFirstClose.p50),
        p90: toHours(timeToFirstClose.p90),
        p99: toHours(timeToFirstClose.p99),
      }
    ];
  }, [data]);

  return (
    <div className="w-full h-full min-h-[320px] p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col">
      <div className="mb-6 shrink-0 flex flex-col gap-3">
        <h2 className="text-base font-semibold">Response & Resolution Times</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-chart-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-chart-2" />
            <span>Median (P50)</span>
          </div>
          <div className="flex items-center gap-1.5 text-chart-4">
            <div className="w-2.5 h-2.5 rounded-sm bg-chart-4" />
            <span>P90</span>
          </div>
          <div className="flex items-center gap-1.5 text-chart-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-chart-1" />
            <span>P99 (Long-tail)</span>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false}
              width={120}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--color-popover-foreground)' }}
            />
            <Bar dataKey="p50" name="Median (P50)" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="p90" name="P90" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="p99" name="P99 (Long-tail)" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
