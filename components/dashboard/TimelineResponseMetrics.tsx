"use client";

import { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PulseConversation } from '@/lib/types';
import { calculatePercentile } from '@/lib/analytics/stats';
import { calculateResponseTimePercentiles, aggregateDailyVolume } from '@/lib/analytics/aggregations';
import { Clock, BarChart2, Activity } from 'lucide-react';
import { formatPT } from '@/lib/utils/timezone';

export default function TimelineResponseMetrics({ data }: { data: PulseConversation[] }) {
  const [activeTab, setActiveTab] = useState<'hour' | 'percentiles' | 'volume'>('hour');

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

  // Percentiles Data
  const percentilesData = useMemo(() => {
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

  // Volume Data
  const volumeData = useMemo(() => aggregateDailyVolume(data), [data]);

  const CustomTooltipHour = ({ active, payload }: any) => {
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

  return (
    <div className="w-full h-full min-h-[400px] p-6 bg-card border-2 border-border shadow-sm rounded-xl flex flex-col">
      <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Timeline & Response Metrics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Volume and responsiveness over time</p>
        </div>
        
        <div className="flex bg-secondary/50 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setActiveTab('hour')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'hour' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            By Hour
          </button>
          <button 
            onClick={() => setActiveTab('percentiles')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'percentiles' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Percentiles
          </button>
          <button 
            onClick={() => setActiveTab('volume')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'volume' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Activity className="w-3.5 h-3.5" />
            Volume Trend
          </button>
        </div>
      </div>
      
      <div className="w-full h-[300px]">
        {activeTab === 'hour' && (
          data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No response time data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-muted-foreground)' } }} />
                <Tooltip content={<CustomTooltipHour />} />
                <Bar dataKey="median" radius={[4, 4, 0, 0]}>
                  {hourData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.median > hourData.dailyMedian * 2 && entry.count >= 3 ? 'var(--color-destructive)' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}

        {activeTab === 'percentiles' && (
          <div className="h-full flex flex-col">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium mb-4">
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={percentilesData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-popover-foreground)' }} />
                <Bar dataKey="p50" name="Median (P50)" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="p90" name="P90" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="p99" name="P99 (Long-tail)" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'volume' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(val) => val.substring(5)} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-popover-foreground)' }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
