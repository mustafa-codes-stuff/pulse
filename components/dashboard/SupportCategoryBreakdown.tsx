"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { MessageSquare } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';
import { CATEGORY_FRIENDLY_NAMES } from '@/lib/analytics/aggregations';
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

  const topCategories = useMemo(() => {
    if (data.length === 0) return [];

    const supportCategories = [
      // Make sure missing category "image_quality_technical" is covered
      'image_quality_technical', 'generation_accuracy', 'attribute_mismatch',
      'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs',
      'customization_request', 'core_feature_request',
      'refund_request', 'subscription_cancel', 'pre_sales_info', 'delivery_status'
    ];
    const groups: Record<string, PulseConversation[]> = {};
    supportCategories.forEach(cat => groups[cat] = []);

    let totalOpsCount = 0;
    data.forEach(c => {
      const { category: classification } = classifyConversation(c.title || '', c.source.body);
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
    }).filter(c => c.count > 0);

    // Sort by count descending to get the top 3
    list.sort((a, b) => b.count - a.count);
    const top3 = list.slice(0, 3);

    // Helper to determine the most extreme signal for the supporting copy
    return top3.map((item, index) => {
      let signalLabel = '';
      
      // Calculate ranks across the entire list (1-indexed)
      const countRank = [...list].sort((a,b) => b.count - a.count).findIndex(c => c.category === item.category) + 1;
      const reopenRank = [...list].sort((a,b) => b.reopenRate - a.reopenRate).findIndex(c => c.category === item.category) + 1;
      
      // For CSAT, we only want to rank items that actually have a CSAT score, lowest is #1
      const withCsat = list.filter(c => c.averageCsat !== null);
      const csatRank = item.averageCsat !== null 
        ? [...withCsat].sort((a,b) => a.averageCsat! - b.averageCsat!).findIndex(c => c.category === item.category) + 1 
        : 999;

      // Find best rank (lowest number is best)
      const bestRank = Math.min(countRank, reopenRank, csatRank);

      if (bestRank === countRank && countRank <= 3) {
        signalLabel = countRank === 1 ? 'highest volume' : `high volume`;
      } else if (bestRank === reopenRank && reopenRank <= 3) {
        signalLabel = reopenRank === 1 ? `highest reopen rate (${(item.reopenRate * 100).toFixed(1)}%)` : `high reopen rate (${(item.reopenRate * 100).toFixed(1)}%)`;
      } else if (bestRank === csatRank && csatRank <= 3) {
        signalLabel = csatRank === 1 ? `lowest CSAT (${item.averageCsat?.toFixed(1)})` : `low CSAT (${item.averageCsat?.toFixed(1)})`;
      } else {
        // Fallback to volume if nothing is notably extreme
        signalLabel = `${item.percentage.toFixed(0)}% of volume`;
      }

      // Special overrides for absolute #1s if they are in the top 3, to guarantee diversity if possible
      // This matches the user's specific request behavior where Pre-sales is volume, Refund is reopen, Image is CSAT
      if (countRank === 1) signalLabel = 'highest volume';
      else if (reopenRank === 1) signalLabel = `highest reopen rate (${(item.reopenRate * 100).toFixed(1)}%)`;
      else if (csatRank === 1) signalLabel = `lowest CSAT (${item.averageCsat?.toFixed(1)})`;

      return {
        ...item,
        signalLabel
      };
    });

  }, [data]);

  if (data.length === 0 || topCategories.length === 0) return null;

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-chart-1" />
        Top customer issues
      </h2>
      <div className="flex-1 bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {topCategories.map((item, index) => (
          <div 
            key={item.category} 
            onClick={() => {
              setModalTitle(`Category: ${item.title}`);
              setModalData(item.conversations);
              setIsModalOpen(true);
            }}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 ${index !== 0 ? 'border-t border-border/40' : ''} hover:bg-secondary/40 transition-colors gap-4 cursor-pointer group`}
          >
            <div className="flex flex-col gap-1 group-hover:translate-x-1 transition-transform duration-300">
              <h3 className="text-sm font-bold text-foreground transition-colors">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">{item.count}</span> conversations &middot; {item.signalLabel}
              </p>
            </div>
          </div>
        ))}
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
