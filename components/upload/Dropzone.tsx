"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileJson, Loader2, AlertCircle } from 'lucide-react';
import { saveConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { ParseRequest, ParseResponse } from '@/lib/parser/worker';

export default function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const processFiles = useCallback((fileList: FileList) => {
    setIsParsing(true);
    setError(null);

    const files = Array.from(fileList);
    if (files.length === 0) return;

    const allConversations: PulseConversation[] = [];
    let processedCount = 0;
    let hasError = false;

    // Use a single worker for all files could be complex with state, 
    // so we spawn a short-lived worker per file, or process them one by one.
    // For simplicity and parallel speed, we spawn a worker per file.
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (hasError) return;
        const content = e.target?.result as string;
        
        const worker = new Worker(new URL('../../lib/parser/worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = async (event: MessageEvent<ParseResponse>) => {
          const response = event.data;
          if (response.type === 'success') {
            allConversations.push(...response.data);
            processedCount++;
            
            if (processedCount === files.length && !hasError) {
              try {
                await saveConversations(allConversations);
                router.push('/support');
              } catch (err) {
                setError("Failed to save to local storage.");
                setIsParsing(false);
              }
            }
          } else {
            if (!hasError) {
              hasError = true;
              setError(`Error in file ${file.name}: ${response.error}`);
              setIsParsing(false);
            }
          }
          worker.terminate();
        };

        worker.onerror = (err) => {
          if (!hasError) {
            hasError = true;
            setError(`Worker failed to parse ${file.name}.`);
            setIsParsing(false);
          }
          worker.terminate();
        };

        worker.postMessage({
          type: 'parse_string',
          content,
          filename: file.name
        } as ParseRequest);
      };

      reader.onerror = () => {
        if (!hasError) {
          hasError = true;
          setError(`Failed to read file ${file.name}.`);
          setIsParsing(false);
        }
      };

      reader.readAsText(file);
    });
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        f => f.type === "application/json" || f.name.endsWith(".json")
      );
      
      if (validFiles.length > 0) {
        // We need to pass a FileList or array, let's just pass the array disguised as FileList
        // actually processFiles takes FileList, but we can change it to take File[]
        // Wait, processFiles signature is processFiles(fileList: FileList). Let's fix that.
        // I will pass the original DataTransfer.files and let it convert.
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

  const loadSampleData = useCallback(() => {
    setIsParsing(true);
    setError(null);
    
    const worker = new Worker(new URL('../../lib/parser/worker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = async (event: MessageEvent<ParseResponse>) => {
      const response = event.data;
      if (response.type === 'success') {
        try {
          await saveConversations(response.data);
          router.push('/support');
        } catch (err) {
          setError("Failed to save sample data.");
          setIsParsing(false);
        }
      } else {
        setError(response.error);
        setIsParsing(false);
      }
      worker.terminate();
    };

    worker.postMessage({
      type: 'parse_url',
      url: '/sample-conversations.json', // Will be served from public folder
      filename: 'sample-conversations.json'
    } as ParseRequest);
    
  }, [router]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl transition-colors
          ${isDragging ? 'border-primary bg-secondary/50' : 'border-border hover:border-primary/50 hover:bg-secondary/20'}
          ${isParsing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input 
          type="file" 
          accept=".json,application/json" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={onFileChange}
          disabled={isParsing}
        />
        
        {isParsing ? (
          <div className="flex flex-col items-center space-y-4 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium text-foreground">Parsing Export...</p>
              <p className="text-sm">This happens entirely in your browser.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-secondary text-primary">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Upload your Intercom JSON Export</p>
              <p className="text-sm text-muted-foreground mt-1">Drag and drop, or click to browse</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 mt-4">
              <FileJson className="w-4 h-4" />
              Processed entirely in your browser — nothing is uploaded to a server
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

      <div className="flex flex-col items-center gap-4 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">Don't have an export handy?</p>
        <button 
          onClick={loadSampleData}
          disabled={isParsing}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          Explore with Sample Data
        </button>
      </div>
    </div>
  );
}
