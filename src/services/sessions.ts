import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { enqueueWrite } from './offlineQueue';
import { getMoonPhaseBucket } from '../utils/moonPhase';
import type { MoonPhaseBucket, Session } from '../types/models';

const SESSIONS_COLLECTION = 'sessions';
const CACHE_KEY = 'cache:sessions';

type SessionDoc = {
  startedAt: string; // ISO 8601 — kept as a plain string so it survives the AsyncStorage write queue untouched
  endedAt: string | null;
  moonPhaseBucket: MoonPhaseBucket;
};

type CachedSession = SessionDoc & { id: string };

function toSession(cached: CachedSession): Session {
  return {
    id: cached.id,
    startedAt: new Date(cached.startedAt),
    endedAt: cached.endedAt ? new Date(cached.endedAt) : null,
    moonPhaseBucket: cached.moonPhaseBucket,
  };
}

function sortByStartedAtDesc(a: CachedSession, b: CachedSession): number {
  return b.startedAt.localeCompare(a.startedAt);
}

async function readCache(): Promise<CachedSession[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeCache(sessions: CachedSession[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sessions));
}

/** Instant read from the last known local copy — use for first render before the live listener catches up. */
export async function getCachedSessions(): Promise<Session[]> {
  const cached = await readCache();
  return cached.sort(sortByStartedAtDesc).map(toSession);
}

/** Live Firestore listener for all sessions, newest first. Falls back to the local cache if the listener errors (e.g. offline). */
export function subscribeToSessions(onChange: (sessions: Session[]) => void): () => void {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy('startedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const cached: CachedSession[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as SessionDoc) }));
      void writeCache(cached);
      onChange(cached.map(toSession));
    },
    () => {
      void getCachedSessions().then(onChange);
    },
  );
}

export async function startSession(): Promise<Session> {
  const ref = doc(collection(db, SESSIONS_COLLECTION));
  const now = new Date();
  const data: SessionDoc = {
    startedAt: now.toISOString(),
    endedAt: null,
    moonPhaseBucket: getMoonPhaseBucket(now),
  };

  const cached = await readCache();
  await writeCache([{ id: ref.id, ...data }, ...cached]);

  await enqueueWrite({ collectionPath: SESSIONS_COLLECTION, docId: ref.id, operation: 'set', data });

  return toSession({ id: ref.id, ...data });
}

export async function endSession(sessionId: string): Promise<void> {
  const endedAt = new Date().toISOString();

  const cached = await readCache();
  await writeCache(cached.map((s) => (s.id === sessionId ? { ...s, endedAt } : s)));

  await enqueueWrite({
    collectionPath: SESSIONS_COLLECTION,
    docId: sessionId,
    operation: 'update',
    data: { endedAt },
  });
}
