"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PulseConversation } from '@/lib/types';
import { aggregateDailyVolume } from '@/lib/analytics/aggregations';

export default function VolumeChart({ data }: { data: PulseConversation[] }) {
  const chartData = useMemo(() => aggregateDailyVolume(data), [data]);

  return (
    <div className="w-full h-full min-h-[320px] p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col">
      <div className="mb-6 shrink-0 flex items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Conversation Volume</h2>
          <p className="text-sm text-muted-foreground mt-1">Daily trend of incoming support requests</p>
        </div>
        <span className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {data.length.toLocaleString()} total
        </span>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => val.substring(5)}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--color-popover-foreground)' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              name="Total" 
              stroke="#2563eb" 
              fill="#3b82f6" 
              fillOpacity={0.2} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
