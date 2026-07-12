"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getConversations, saveConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { Loader2, Activity } from 'lucide-react';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export default function ProcessingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState('Initializing AI pipeline...');
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Helper to safely clean text and strip email boilerplate
  const cleanText = (text: string, maxLength: number) => {
    if (!text) return '';
    let cleaned = text.replace(/<[^>]*>?/gm, ' '); // Strip HTML
    cleaned = cleaned.replace(/On\s+.*?(?:wrote|sent):/gmi, ' '); // Strip "On date, person wrote:"
    cleaned = cleaned.replace(/---.*?Forwarded message.*?---/gmi, ' '); // Strip forwarded headers
    cleaned = cleaned.replace(/From:.*?Sent:.*?To:.*?Subject:/gmi, ' '); // Strip Outlook headers
    cleaned = cleaned.replace(/>/g, ' '); // Strip email quote indents
    return cleaned.replace(/\s+/g, ' ').substring(0, maxLength).trim();
  };

  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function processData() {
      try {
        const data = await getConversations();
        if (!data || data.length === 0) {
          router.push('/');
          return;
        }

        const pending = data.filter((c) => !c.llm_classification);
        
        if (pending.length === 0) {
          router.push('/support');
          return;
        }

        setStatus('Analyzing conversations...');
        setProgress({ current: 0, total: pending.length });

        const pendingConversations = pending.map(conv => {
          const rawBody = conv.source?.body || '';
          const cleanBody = cleanText(rawBody, 20000);
          const replies = conv.conversation_parts?.conversation_parts
              ?.map((p: any) => `${p.author?.type === 'user' ? 'Customer' : 'Agent'}: ${cleanText(p.body || '', 10000)}`) || [];
          const tags = conv.tags?.tags?.map((t: any) => t.name).join(', ') || 'None';
          const rating = conv.conversation_rating ? `CSAT Rating: ${conv.conversation_rating.rating}/5 - Remark: ${conv.conversation_rating.remark || 'None'}` : 'No rating given';
          const contentString = `Tags: ${tags}\nTitle: ${conv.title || ''}\nRating: ${rating}\nCustomer: ${cleanBody}\nReplies:\n${replies.join('\n')}`;
          
          return { id: conv.id, text: contentString };
        });

        // We chunk the requests on the client so the UI progress bar updates dynamically!
        const CHUNK_SIZE = 10;
        const CONCURRENCY = 3;
        let modified = false;

        const chunks = [];
        for (let i = 0; i < pendingConversations.length; i += CHUNK_SIZE) {
          chunks.push(pendingConversations.slice(i, i + CHUNK_SIZE));
        }

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
          const batch = chunks.slice(i, i + CONCURRENCY);
          
          await Promise.all(batch.map(async (chunk) => {
            let attempt = 0;
            const maxAttempts = 3;
            
            while (attempt < maxAttempts) {
              try {
                const res = await fetch('/api/classify-batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ conversations: chunk })
                });
                
                if (!res.ok) {
                  const errText = await res.text();
                  let errMsg = errText;
                  try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error) errMsg = parsed.error;
                  } catch(e) {}
                  throw new Error(`Server returned ${res.status}: ${errMsg}`);
                }
                
                const { results } = await res.json();
                pending.forEach(conv => {
                  if (results[conv.id]) {
                    conv.llm_classification = results[conv.id];
                    modified = true;
                  }
                });
                setRateLimitMessage(null);
                break; // Success! Exit retry loop
              } catch (err: any) {
                attempt++;
                console.warn(`Chunk failed (attempt ${attempt}/${maxAttempts}):`, err.message);
                if (attempt >= maxAttempts) {
                  throw err; // Give up, throw to outer catch
                }
                
                // Show the retry clearly to the user instead of silently hanging
                if (err.message.includes('429') || err.message.includes('rate limit')) {
                  setRateLimitMessage(`API Rate limit paused processing. Retrying in ${attempt * 2}s...`);
                } else {
                  setRateLimitMessage(`Network hiccup. Retrying batch (Attempt ${attempt}/${maxAttempts})...`);
                }
                
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              }
            }
            
            setProgress(prev => ({ 
              current: Math.min(prev.current + chunk.length, pending.length), 
              total: pending.length 
            }));
          }));
        }

        // Done!
        setStatus('Analysis complete! Redirecting...');
        
        // Final save just in case
        if (modified) {
          await saveConversations([...data]);
          // Dispatch event to update other tabs if needed
          window.dispatchEvent(new Event('pulse-dataset-updated'));
        }

        setTimeout(() => {
          router.push('/support');
        }, 500);

      } catch (err: any) {
        console.error("Processing error:", err);
        const errMsg = err.message || 'Failed to process data';
        setStatus(`Error: ${errMsg.length > 150 ? errMsg.substring(0, 150) + '...' : errMsg}`);
      }
    }

    processData();

    // No strict mode cleanup needed since we use hasStarted ref
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-2xl shadow-sm text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Processing AI Insights</h1>
          <p className="text-muted-foreground">{status}</p>
          {rateLimitMessage && (
            <div className="inline-flex items-center gap-2 px-3 py-1 mt-2 text-sm text-amber-600 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Loader2 className="w-4 h-4 animate-spin" />
              {rateLimitMessage}
            </div>
          )}
        </div>

        {progress.total > 0 && (
          <div className="space-y-4">
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span>{progress.current} classified</span>
              <span>{progress.total} total</span>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
