import { PulseConversation, IntercomConversation } from '../types';

export type ParseRequest = 
  | { type: 'parse_string'; content: string; filename: string }
  | { type: 'parse_url'; url: string; filename: string };

export type ParseResponse = 
  | { type: 'success'; data: PulseConversation[] }
  | { type: 'error'; error: string; filename?: string };

// We want this to be treated as a module worker
self.addEventListener('message', async (e: MessageEvent<ParseRequest>) => {
  try {
    let parsed: any;
    
    if (e.data.type === 'parse_url') {
      const res = await fetch(e.data.url);
      if (!res.ok) throw new Error(`Failed to fetch ${e.data.url}`);
      parsed = await res.json();
    } else {
      parsed = JSON.parse(e.data.content);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Root of JSON must be an array of conversations.");
    }

    const conversations: PulseConversation[] = [];

    // Loose validation: ensure it roughly looks like a conversation
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (typeof item !== 'object' || item === null) continue;
      
      if (item.type !== 'conversation' || !item.id || !item.created_at) {
        // Skip or throw? The prompt says "Validate loosely... show clear specific error"
        // If one item fails, we can either reject the whole file or just skip. 
        // Let's reject the file with a clear error for the first invalid item.
        throw new Error(`Item at index ${i} is missing required fields (type='conversation', id, created_at).`);
      }

      // Add our internal filename tracker
      item._sourceFilename = e.data.filename;
      
      // We could strip HTML from body here, but it's better to do it on demand 
      // or during NLP phase to keep the raw data intact for viewing.
      
      conversations.push(item as PulseConversation);
    }

    self.postMessage({ type: 'success', data: conversations } as ParseResponse);
  } catch (error: any) {
    self.postMessage({ 
      type: 'error', 
      error: error.message || String(error),
      filename: (e.data as any).filename 
    } as ParseResponse);
  }
});
