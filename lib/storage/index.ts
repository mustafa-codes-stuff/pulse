import { get, set, del, clear } from 'idb-keyval';
import { PulseConversation } from '../types';

const DATASET_KEY = 'pulse_conversations';

/**
 * Persist conversations to IndexedDB.
 */
export async function saveConversations(conversations: PulseConversation[]): Promise<void> {
  await set(DATASET_KEY, conversations);
}

/**
 * Retrieve conversations from IndexedDB.
 */
export async function getConversations(): Promise<PulseConversation[] | undefined> {
  return await get(DATASET_KEY);
}

/**
 * Clear the dataset from IndexedDB.
 */
export async function clearConversations(): Promise<void> {
  await del(DATASET_KEY);
}

/**
 * Completely clear the whole store (if needed).
 */
export async function clearAll(): Promise<void> {
  await clear();
}
