"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { saveConversations, clearConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { ParseRequest, ParseResponse } from '@/lib/parser/worker';

export default function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Reset data when someone accesses the homepage
    clearConversations();
  }, []);

    const processFiles = useCallback(async (fileList: FileList | File[]) => {
      setIsParsing(true);
      setError(null);

      const files = Array.from(fileList);
      if (files.length === 0) return;

      const allConversations: PulseConversation[] = [];

      for (const file of files) {
        
        try {
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
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
                reject(new Error(`Error in ${file.name}: ${response.error}`));
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

          allConversations.push(...conversations);
        } catch (err: unknown) {
          console.error(err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred.';
          setError(`Error parsing JSON in file ${file.name}: ${errorMsg}`);
          setIsParsing(false);
          return; // Stop processing further files
        }
      }


      try {
        // Deduplicate by conversation ID
        const seenIds = new Set<string>();
        const deduplicated = allConversations.filter(c => {
          if (seenIds.has(c.id)) return false;
          seenIds.add(c.id);
          return true;
        });
        
        await saveConversations(deduplicated);
        router.push('/processing');
      } catch {
        // Fallback for IDB failures (e.g. quota exceeded)
        console.warn("Could not save to IndexedDB.");
        setIsParsing(false);
      }
    }, [router]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        f => f.type === "application/json" || f.name.endsWith(".json")
      );
      
      if (validFiles.length > 0) {
        processFiles(e.dataTransfer.files);
      } else {
        setError("Please upload valid JSON files.");
      }
    }
  }, [processFiles]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const loadSampleData = async () => {
    try {
      setIsParsing(true);
      setError(null);
      const res = await fetch('/sample-conversations.json');
      if (!res.ok) throw new Error('Failed to fetch sample data');
      const blob = await res.blob();
      const file = new File([blob], 'sample-conversations.json', { type: 'application/json' });
      await processFiles([file]);
    } catch (err: any) {
      setError(err.message);
      setIsParsing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl transition-all shadow-sm
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-md'}
          ${isParsing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input 
          type="file" 
          multiple
          accept=".json,application/json" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={onFileChange}
          disabled={isParsing}
        />
        
        {isParsing ? (
          <div className="flex flex-col items-center space-y-4 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium text-foreground">Processing Uploads...</p>
              <p className="text-sm">This may take a moment for large datasets.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-secondary text-primary">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Upload Daily Snapshots</p>
              <p className="text-sm text-muted-foreground mt-1">Drag and drop your Intercom snapshot JSON files, or click to browse</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadSampleData}
            disabled={isParsing}
            className="text-sm px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
          >
            Load Sample Data for QA
          </button>
        </div>
      )}
    </div>
  );
}
