"use client";

import { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PulseConversation } from '@/lib/types';
import { calculatePercentile } from '@/lib/analytics/stats';
import { aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { Clock } from 'lucide-react';
import { formatPT } from '@/lib/utils/timezone';
import { Tooltip as RadixTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

const CustomTooltipHour = ({ active, payload }: { active?: boolean, payload?: { payload: { hourLabel: string, median: number, count: number } }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border-2 border-border shadow-sm p-3 rounded-lg shadow-md text-sm">
        <p className="font-semibold text-foreground mb-1">{data.hourLabel} PST</p>
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

export default function TimelineResponseMetrics({ data }: { data: PulseConversation[] }) {
  const [activeTab, setActiveTab] = useState<'hour' | 'volume'>('hour');

  // Hour Data
  const hourData = useMemo(() => {
    const hours: { [hour: number]: number[] } = {};
    for (let i = 0; i < 24; i++) hours[i] = [];

    data.forEach(c => {
      if (c.statistics?.time_to_admin_reply != null) {
        const hour = parseInt(formatPT(c.created_at, 'H'), 10);
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



  // Volume Data
  const volumeData = useMemo(() => aggregateDailyVolume(data), [data]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-chart-2" />
          Response times
          <RadixTooltip>
            <TooltipTrigger asChild>
              <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors ml-1">
                ?
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Tracks the median time to first agent reply and total ticket volume. Red bars indicate response times double the daily average.
            </TooltipContent>
          </RadixTooltip>
        </h2>
      </div>
      
      <div className="flex-1 min-h-[300px] bg-card border border-border/60 shadow-sm rounded-2xl flex flex-col overflow-hidden">
        <div className="border-b border-border/40 flex items-center px-2 shrink-0">
          <button 
            onClick={() => setActiveTab('hour')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'hour' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            By Hour
          </button>

          <button 
            onClick={() => setActiveTab('volume')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'volume' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Volume Trend
          </button>
        </div>
        <div className="w-full flex-1 p-6">
        {activeTab === 'hour' && (
          data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No response time data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData.data} margin={{ top: 10, right: 30, left: 15, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} interval={2} label={{ value: 'Time of Day (PST)', position: 'insideBottom', offset: -25, style: { fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 500 } }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', offset: -10, style: { fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 500 } }} />
                <Tooltip content={<CustomTooltipHour />} />
                <Bar dataKey="median" radius={[4, 4, 0, 0]}>
                  {hourData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.median > hourData.dailyMedian * 2 && entry.count >= 3 ? 'var(--color-destructive)' : 'var(--color-chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}



        {activeTab === 'volume' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData} margin={{ top: 10, right: 30, left: 15, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(val) => val.substring(5)} label={{ value: 'Date (MM-DD)', position: 'insideBottom', offset: -25, style: { fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 500 } }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} label={{ value: 'Volume', angle: -90, position: 'insideLeft', offset: -10, style: { fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 500 } }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-popover-foreground)' }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>
    </div>
  );
}
