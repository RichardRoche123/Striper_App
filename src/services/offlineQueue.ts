import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

type QueuedWrite = {
  id: string;
  collectionPath: string;
  docId: string;
  operation: 'set' | 'update' | 'delete';
  data?: Record<string, unknown>;
  queuedAt: number;
};

const STORAGE_KEY = 'offlineWriteQueue';

let queue: QueuedWrite[] = [];
let loaded = false;
let flushing = false;

async function loadQueue() {
  if (loaded) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  queue = raw ? JSON.parse(raw) : [];
  loaded = true;
}

async function persistQueue() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Saves a write to durable local storage immediately, then attempts to sync it
 * to Firestore. If the device is offline (or the sync fails), the write stays
 * queued on disk and is retried on the next connectivity change or app launch
 * — so it survives the app being killed, unlike Firestore's in-memory retry queue.
 */
export async function enqueueWrite(write: Omit<QueuedWrite, 'id' | 'queuedAt'>) {
  await loadQueue();
  queue.push({
    ...write,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
  });
  await persistQueue();
  void flushQueue();
}

export async function flushQueue() {
  await loadQueue();
  if (flushing || queue.length === 0) return;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  flushing = true;
  try {
    while (queue.length > 0) {
      const next = queue[0];
      try {
        const ref = doc(db, next.collectionPath, next.docId);
        if (next.operation === 'set') {
          await setDoc(ref, next.data ?? {});
        } else if (next.operation === 'update') {
          await updateDoc(ref, next.data ?? {});
        } else {
          await deleteDoc(ref);
        }
        queue.shift();
        await persistQueue();
      } catch {
        // Still offline or a transient failure — stop here and retry on the next flush.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Call once at app startup. Flushes any writes left over from a previous
 * session and re-flushes whenever connectivity is regained.
 */
export function startQueueSync(): () => void {
  void flushQueue();
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void flushQueue();
    }
  });
  return unsubscribe;
}
