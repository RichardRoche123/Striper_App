import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { enqueueWrite } from './offlineQueue';
import { getTemperatureBucket } from '../utils/temperatureBucket';
import type {
  CloudCoverBucket,
  LocationVisit,
  LocationVisitConditions,
  PressureTrendBucket,
  TideStageBucket,
  VisitOutcome,
  WindDirectionBucket,
} from '../types/models';

const VISITS_COLLECTION = 'locationVisits';
const CACHE_KEY = 'cache:locationVisits';

type VisitDoc = {
  sessionId: string;
  spotId: string;
  arrivedAt: string; // ISO 8601 — kept as a plain string so it survives the AsyncStorage write queue untouched
  outcome: VisitOutcome;
  conditions: LocationVisitConditions;
  conditionsRefinedFromPhoto: boolean;
};

type CachedVisit = VisitDoc & { id: string };

function toVisit(cached: CachedVisit): LocationVisit {
  return {
    id: cached.id,
    sessionId: cached.sessionId,
    spotId: cached.spotId,
    arrivedAt: new Date(cached.arrivedAt),
    outcome: cached.outcome,
    conditions: cached.conditions,
    conditionsRefinedFromPhoto: cached.conditionsRefinedFromPhoto,
  };
}

function sortByArrivedAtDesc(a: CachedVisit, b: CachedVisit): number {
  return b.arrivedAt.localeCompare(a.arrivedAt);
}

async function readCache(): Promise<CachedVisit[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeCache(visits: CachedVisit[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(visits));
}

/** Instant read from the last known local copy — use for first render before the live listener catches up. */
export async function getCachedVisitsForSession(sessionId: string): Promise<LocationVisit[]> {
  const cached = await readCache();
  return cached
    .filter((v) => v.sessionId === sessionId)
    .sort(sortByArrivedAtDesc)
    .map(toVisit);
}

/**
 * Live Firestore listener for a session's visits, newest first. Sorted client-side
 * (rather than via Firestore orderBy) so this doesn't require a composite index.
 * Falls back to the local cache if the listener errors (e.g. offline).
 */
export function subscribeToVisitsForSession(sessionId: string, onChange: (visits: LocationVisit[]) => void): () => void {
  const q = query(collection(db, VISITS_COLLECTION), where('sessionId', '==', sessionId));

  return onSnapshot(
    q,
    (snapshot) => {
      const forSession: CachedVisit[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as VisitDoc) }));

      void readCache().then((cached) => {
        const others = cached.filter((v) => v.sessionId !== sessionId);
        void writeCache([...others, ...forSession]);
      });

      onChange(forSession.sort(sortByArrivedAtDesc).map(toVisit));
    },
    () => {
      void getCachedVisitsForSession(sessionId).then(onChange);
    },
  );
}

export type ManualConditionsInput = {
  tideStageBucket: TideStageBucket;
  windDirectionBucket: WindDirectionBucket;
  windSpeedMph: number;
  temperatureFahrenheit: number;
  cloudCoverBucket: CloudCoverBucket;
  pressureTrendBucket: PressureTrendBucket;
};

function buildManualConditions(input: ManualConditionsInput): LocationVisitConditions {
  return {
    tide: { stageBucket: input.tideStageBucket, source: 'manual' },
    wind: { directionBucket: input.windDirectionBucket, speedMph: input.windSpeedMph, source: 'manual' },
    temp: { fahrenheit: input.temperatureFahrenheit, bucket: getTemperatureBucket(input.temperatureFahrenheit), source: 'manual' },
    cloudCover: { bucket: input.cloudCoverBucket, source: 'manual' },
    pressure: { trendBucket: input.pressureTrendBucket, source: 'manual' },
  };
}

export async function logLocationVisit(input: {
  sessionId: string;
  spotId: string;
  outcome: VisitOutcome;
  conditions: ManualConditionsInput;
}): Promise<LocationVisit> {
  const ref = doc(collection(db, VISITS_COLLECTION));
  const data: VisitDoc = {
    sessionId: input.sessionId,
    spotId: input.spotId,
    arrivedAt: new Date().toISOString(),
    outcome: input.outcome,
    conditions: buildManualConditions(input.conditions),
    conditionsRefinedFromPhoto: false,
  };

  const cached = await readCache();
  await writeCache([{ id: ref.id, ...data }, ...cached]);

  await enqueueWrite({ collectionPath: VISITS_COLLECTION, docId: ref.id, operation: 'set', data });

  return toVisit({ id: ref.id, ...data });
}
