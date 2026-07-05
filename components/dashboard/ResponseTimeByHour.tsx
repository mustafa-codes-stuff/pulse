"use client";

import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PulseConversation } from '@/lib/types';
import { calculatePercentile } from '@/lib/analytics/stats';
import { Clock } from 'lucide-react';

export default function ResponseTimeByHour({ data }: { data: PulseConversation[] }) {
  const chartData = useMemo(() => {
    const hours: { [hour: number]: number[] } = {};
    for (let i = 0; i < 24; i++) hours[i] = [];

    data.forEach(c => {
      if (c.statistics?.time_to_admin_reply != null) {
        const hour = new Date(c.created_at * 1000).getUTCHours();
        hours[hour].push(c.statistics.time_to_admin_reply);
      }
    });

    const result = [];
    const allMedians: number[] = [];

    for (let i = 0; i < 24; i++) {
      const times = hours[i];
      times.sort((a, b) => a - b);
      const median = times.length > 0 ? (calculatePercentile(times, 50) || 0) / 60 : 0; // in minutes
      if (median > 0) allMedians.push(median);
      
      result.push({
        hour: i,
        hourLabel: `${String(i).padStart(2, '0')}:00`,
        median: Number(median.toFixed(1)),
        count: times.length
      });
    }

    const dailyMedian = allMedians.length > 0 ? (calculatePercentile(allMedians.sort((a,b)=>a-b), 50) || 0) : 0;

    return { data: result, dailyMedian };
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border-2 border-border shadow-sm p-3 rounded-lg shadow-md text-sm">
          <p className="font-semibold text-foreground mb-1">{data.hourLabel} UTC</p>
          <p className="text-muted-foreground flex items-center justify-between gap-4">
            <span>Median Reply:</span>
            <span className="font-bold text-foreground">{data.median} min</span>
          </p>
          <p className="text-muted-foreground flex items-center justify-between gap-4">
            <span>Sample Size:</span>
            <span className="font-bold text-foreground">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[320px] p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col">
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-chart-1" />
            Response Time by Hour (UTC)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Median time to admin reply based on creation hour</p>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[100px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No response time data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData.data}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis 
              dataKey="hourLabel" 
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false} 
              interval={2}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              axisLine={false} 
              tickLine={false}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-muted-foreground)' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="median" radius={[4, 4, 0, 0]}>
              {chartData.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.median > chartData.dailyMedian * 2 && entry.count >= 3 ? 'var(--color-destructive)' : '#3b82f6'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
