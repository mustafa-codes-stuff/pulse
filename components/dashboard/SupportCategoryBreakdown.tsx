"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { ThumbsUp, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';
import { computeDatasetThresholds, computeEscalationRisk, CATEGORY_FRIENDLY_NAMES } from '@/lib/analytics/aggregations';
import ConversationModal from './ConversationModal';

interface SupportCategoryMetrics {
  category: string;
  title: string;
  count: number;
  percentage: number;
  averageCsat: number | null;
  reopenRate: number;
  conversations: PulseConversation[];
}

export default function SupportCategoryBreakdown({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const categories = useMemo(() => {
    if (data.length === 0) return [];

    const supportCategories = [
      'rendering_quality', 'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs',
      'customization_request', 'core_feature_request',
      'refund_request', 'subscription_cancel', 'pre_sales_info', 'delivery_status'
    ];
    const groups: Record<string, PulseConversation[]> = {};
    supportCategories.forEach(cat => groups[cat] = []);

    let totalOpsCount = 0;
    data.forEach(c => {
      const classification = classifyConversation(c.title || '', c.source.body);
      if (supportCategories.includes(classification)) {
        groups[classification].push(c);
        totalOpsCount++;
      }
    });

    const list: SupportCategoryMetrics[] = supportCategories.map(cat => {
      const convs = groups[cat] || [];
      const count = convs.length;
      
      let csatSum = 0;
      let csatCount = 0;
      let reopenedCount = 0;

      convs.forEach(c => {
        if (c.statistics?.count_reopens > 0) reopenedCount++;
        if (c.conversation_rating?.rating) {
          csatSum += c.conversation_rating.rating;
          csatCount++;
        }
      });

      return {
        category: cat,
        title: CATEGORY_FRIENDLY_NAMES[cat] || cat,
        count,
        percentage: totalOpsCount > 0 ? (count / totalOpsCount) * 100 : 0,
        averageCsat: csatCount > 0 ? csatSum / csatCount : null,
        reopenRate: count > 0 ? reopenedCount / count : 0,
        conversations: convs
      };
    });

    // Sort by count descending
    return list.sort((a, b) => b.count - a.count);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border-2 border-border shadow-sm rounded-xl flex flex-col h-[400px] overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-chart-1" />
            Customer Pain Drivers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Operational inquiries ranked by volume, satisfaction, and friction</p>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        <div className="h-full overflow-auto scrollbar-thin pb-8">
          <table className="w-full text-left border-collapse text-sm relative">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-secondary border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="p-4 pl-6">Inquiry Category</th>
              <th className="p-4">Volume Share</th>
              <th className="p-4 text-center">Avg CSAT</th>
              <th className="p-4 text-center">Reopen Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {categories.map((item) => (
              <tr 
                key={item.category}
                onClick={() => {
                  setModalTitle(`Category: ${item.title}`);
                  setModalData(item.conversations);
                  setIsModalOpen(true);
                }}
                className="hover:bg-secondary/15 transition-colors cursor-pointer group"
              >
                {/* Category Name */}
                <td className="p-4 pl-6 font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </td>
                
                {/* Volume bar & percentage */}
                <td className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <span className="w-10 shrink-0 font-semibold text-foreground/80">
                      {item.count} ({item.percentage.toFixed(0)}%)
                    </span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-chart-1 rounded-full group-hover:bg-primary transition-colors"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Avg CSAT */}
                <td className="p-4 text-center">
                  {item.averageCsat !== null ? (
                    <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <ThumbsUp className="w-3.5 h-3.5 text-chart-4 shrink-0" />
                      {item.averageCsat.toFixed(1)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </td>

                {/* Reopen Rate */}
                <td className="p-4 text-center">
                  <div className={`inline-flex items-center gap-1 font-semibold ${item.reopenRate > 0.3 ? 'text-destructive' : 'text-foreground'}`}>
                    <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${item.reopenRate > 0.3 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    {(item.reopenRate * 100).toFixed(0)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
