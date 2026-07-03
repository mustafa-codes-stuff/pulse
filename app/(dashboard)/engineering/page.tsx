"use client";

import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeClusters from '@/components/dashboard/ThemeClusters';
import ClassificationBreakdown from '@/components/dashboard/ClassificationBreakdown';
import AnomalyFeed from '@/components/dashboard/AnomalyFeed';
import ComplexIssues from '@/components/dashboard/ComplexIssues';
import EngineeringConversationList from '@/components/dashboard/EngineeringConversationList';

export default function EngineeringPage() {
  const [data, setData] = useState<PulseConversation[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    getConversations().then(res => {
      if (!res || res.length === 0) {
        router.push('/');
      } else {
        setData(res);
      }
    });
  }, [router]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engineering & Product</h1>
          <p className="text-muted-foreground mt-1">
            Complaint themes, spike detection, and bug reports.
          </p>
        </div>
      </div>
      
      <ThemeClusters data={data} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ClassificationBreakdown data={data} />
        <ComplexIssues data={data} />
        <AnomalyFeed data={data} />
      </div>

      <div className="pt-4">
        <EngineeringConversationList data={data} />
      </div>
    </div>
  );
}
