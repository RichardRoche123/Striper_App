import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { enqueueWrite } from './offlineQueue';
import type { Catch } from '../types/models';

const CATCHES_COLLECTION = 'catches';
const CACHE_KEY = 'cache:catches';

type CatchDoc = {
  locationVisitId: string;
  hasPhoto: boolean;
  photoTimestamp: string | null; // ISO 8601 — kept as a plain string so it survives the AsyncStorage write queue untouched
  species: string | null;
  sizeInches: number | null;
};

type CachedCatch = CatchDoc & { id: string };

function toCatch(cached: CachedCatch): Catch {
  return {
    id: cached.id,
    locationVisitId: cached.locationVisitId,
    hasPhoto: cached.hasPhoto,
    photoTimestamp: cached.photoTimestamp ? new Date(cached.photoTimestamp) : null,
    species: cached.species,
    sizeInches: cached.sizeInches,
  };
}

async function readCache(): Promise<CachedCatch[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeCache(catches: CachedCatch[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(catches));
}

/** Instant read from the last known local copy — use for first render before the live listener catches up. */
export async function getCachedCatchesForVisit(visitId: string): Promise<Catch[]> {
  const cached = await readCache();
  return cached.filter((c) => c.locationVisitId === visitId).map(toCatch);
}

/** Live Firestore listener for a visit's catches. Falls back to the local cache if the listener errors (e.g. offline). */
export function subscribeToCatchesForVisit(visitId: string, onChange: (catches: Catch[]) => void): () => void {
  const q = query(collection(db, CATCHES_COLLECTION), where('locationVisitId', '==', visitId));

  return onSnapshot(
    q,
    (snapshot) => {
      const forVisit: CachedCatch[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as CatchDoc) }));

      void readCache().then((cached) => {
        const others = cached.filter((c) => c.locationVisitId !== visitId);
        void writeCache([...others, ...forVisit]);
      });

      onChange(forVisit.map(toCatch));
    },
    () => {
      void getCachedCatchesForVisit(visitId).then(onChange);
    },
  );
}

/** Logs one no-photo catch. Photo-based catches are added in a later step. */
export async function logNoPhotoCatch(input: {
  locationVisitId: string;
  species: string | null;
  sizeInches: number | null;
}): Promise<Catch> {
  const ref = doc(collection(db, CATCHES_COLLECTION));
  const data: CatchDoc = {
    locationVisitId: input.locationVisitId,
    hasPhoto: false,
    photoTimestamp: null,
    species: input.species,
    sizeInches: input.sizeInches,
  };

  const cached = await readCache();
  await writeCache([...cached, { id: ref.id, ...data }]);

  await enqueueWrite({ collectionPath: CATCHES_COLLECTION, docId: ref.id, operation: 'set', data });

  return toCatch({ id: ref.id, ...data });
}
