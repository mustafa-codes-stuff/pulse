"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getConversations, saveConversations, clearConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { X, FileJson, Trash2, Plus, Loader2 } from 'lucide-react';
import { ParseRequest, ParseResponse } from '@/lib/parser/worker';

export default function DatasetManager({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void 
}) {
  const [data, setData] = useState<PulseConversation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getConversations().then(res => {
        if (res) setData(res);
      });
    }
  }, [isOpen]);

  const fileStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const c of data) {
      const fn = c._sourceFilename || 'Unknown File';
      stats.set(fn, (stats.get(fn) || 0) + 1);
    }
    return Array.from(stats.entries()).map(([filename, count]) => ({ filename, count }));
  }, [data]);

  const handleRemoveFile = async (filename: string) => {
    setIsProcessing(true);
    const newData = data.filter(c => (c._sourceFilename || 'Unknown File') !== filename);
    await saveConversations(newData);
    setData(newData);
    setIsProcessing(false);
    
    // If we removed all data, navigate to home (or we just reload and let the page handle it)
    if (newData.length === 0) {
      window.location.href = '/';
    } else {
      // Reload the page to refresh charts with new data
      window.location.reload();
    }
  };

  const handleClearAll = async () => {
    setIsProcessing(true);
    await clearConversations();
    window.location.href = '/';
  };

  const handleAppendFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    const files = Array.from(e.target.files);
    const newConversations: PulseConversation[] = [];
    let hasError = false;

    for (const file of files) {
      if (hasError) break;
      
      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsText(file);
        });

        const conversations = await new Promise<PulseConversation[]>((resolve, reject) => {
          const worker = new Worker(new URL('../../lib/parser/worker.ts', import.meta.url), { type: 'module' });
          
          worker.onmessage = (event: MessageEvent<ParseResponse>) => {
            const response = event.data;
            if (response.type === 'success') {
              resolve(response.data);
            } else {
              reject(new Error(`Error parsing ${file.name}: ${response.error}`));
            }
            worker.terminate();
          };

          worker.onerror = () => {
            reject(new Error(`Worker failed to parse ${file.name}`));
            worker.terminate();
          };

          worker.postMessage({
            type: 'parse_string',
            content,
            filename: file.name
          } as ParseRequest);
        });

        newConversations.push(...conversations);
      } catch {
        hasError = true;
        setError(`Failed to process ${file.name}`);
        setIsProcessing(false);
        return; // Stop processing further files
      }
    }

    if (!hasError) {
      try {
        // If the current dataset is ONLY the sample data, we should discard it when uploading real data
        const isOnlySampleData = data.length > 0 && data.every(c => c._sourceFilename === 'sample-conversations.json');
        
        const rawMerged = isOnlySampleData 
          ? [...newConversations] 
          : [...data, ...newConversations];
          
        // Deduplicate by conversation ID
        const seenIds = new Set<string>();
        const merged = rawMerged.filter(c => {
          if (seenIds.has(c.id)) return false;
          seenIds.add(c.id);
          return true;
        });
          
        await saveConversations(merged);
        window.location.reload();
      } catch (err) {
        setError("Failed to save to local storage. Dataset may be too large.");
        setIsProcessing(false);
      }
    }
  }, [data]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Manage Dataset</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Loaded Files</h3>
            <span className="text-sm font-medium">{data.length.toLocaleString()} total items</span>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {fileStats.map(({ filename, count }) => (
              <div key={filename} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileJson className="w-5 h-5 text-chart-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate max-w-full inline-block cursor-default" title={filename}>{filename}</p>
                    <p className="text-xs text-muted-foreground">{count.toLocaleString()} conversations</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveFile(filename)}
                  disabled={isProcessing}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex items-center justify-between bg-secondary/20 rounded-b-xl">
          <button 
            onClick={handleClearAll}
            disabled={isProcessing}
            className="text-sm font-medium text-destructive hover:underline disabled:opacity-50 cursor-pointer"
          >
            Clear All Data
          </button>
          
          <label className={`relative cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
            <input 
              type="file" 
              multiple
              accept=".json,application/json" 
              className="hidden"
              onChange={handleAppendFiles}
              disabled={isProcessing}
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Append Files
            </div>
          </label>
        </div>
      </div>
    </div>,
    document.body
  );
}
