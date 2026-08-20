import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { enqueueWrite } from './offlineQueue';
import type { Spot } from '../types/models';

const SPOTS_COLLECTION = 'spots';
const CACHE_KEY = 'cache:spots';

type SpotDoc = {
  name: string;
  latitude: number;
  longitude: number;
  noaaStationId: string;
  active: boolean;
  createdAt: string; // ISO 8601 — kept as a plain string so it survives the AsyncStorage write queue untouched
};

type CachedSpot = SpotDoc & { id: string };

function toSpot(cached: CachedSpot): Spot {
  return {
    id: cached.id,
    name: cached.name,
    latitude: cached.latitude,
    longitude: cached.longitude,
    noaaStationId: cached.noaaStationId,
    active: cached.active,
    createdAt: new Date(cached.createdAt),
  };
}

async function readCache(): Promise<CachedSpot[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeCache(spots: CachedSpot[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(spots));
}

/** Instant read from the last known local copy — use for first render before the live listener catches up. */
export async function getCachedSpots(): Promise<Spot[]> {
  const cached = await readCache();
  return cached
    .filter((s) => s.active)
    .map(toSpot)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Live Firestore listener for active spots. Falls back to the local cache if the listener errors (e.g. offline). */
export function subscribeToActiveSpots(onChange: (spots: Spot[]) => void): () => void {
  const q = query(collection(db, SPOTS_COLLECTION), where('active', '==', true));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const cached: CachedSpot[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as SpotDoc) }));
      void writeCache(cached);
      onChange(cached.map(toSpot).sort((a, b) => a.name.localeCompare(b.name)));
    },
    () => {
      void getCachedSpots().then(onChange);
    },
  );

  return unsubscribe;
}

export async function addSpot(input: { name: string; latitude: number; longitude: number }): Promise<Spot> {
  const ref = doc(collection(db, SPOTS_COLLECTION));
  const data: SpotDoc = {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    noaaStationId: '', // resolved in a later step once NOAA station lookup is wired in
    active: true,
    createdAt: new Date().toISOString(),
  };

  const cached = await readCache();
  await writeCache([...cached, { id: ref.id, ...data }]);

  await enqueueWrite({ collectionPath: SPOTS_COLLECTION, docId: ref.id, operation: 'set', data });

  return toSpot({ id: ref.id, ...data });
}

export async function deactivateSpot(spotId: string): Promise<void> {
  const cached = await readCache();
  await writeCache(cached.map((s) => (s.id === spotId ? { ...s, active: false } : s)));

  await enqueueWrite({
    collectionPath: SPOTS_COLLECTION,
    docId: spotId,
    operation: 'update',
    data: { active: false },
  });
}
