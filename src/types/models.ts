export type TideStageBucket = 'low' | 'rising' | 'high' | 'falling';

export type WindDirectionBucket = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type ConditionSource = 'auto' | 'manual';

export type CloudCoverBucket = 'clear' | 'partly_cloudy' | 'overcast';

export type PressureTrendBucket = 'rising' | 'falling' | 'steady';

export type MoonPhaseBucket =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type VisitOutcome = 'skunked' | 'caught';

export interface Spot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  noaaStationId: string;
  active: boolean;
  createdAt: Date;
}

export interface Session {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  moonPhaseBucket: MoonPhaseBucket;
}

export interface LocationVisitConditions {
  tide: {
    stageBucket: TideStageBucket;
    source: ConditionSource;
  };
  wind: {
    directionBucket: WindDirectionBucket;
    speedMph: number;
    source: ConditionSource;
  };
  temp: {
    fahrenheit: number;
    bucket: string;
    source: ConditionSource;
  };
  cloudCover: {
    bucket: CloudCoverBucket;
    source: ConditionSource;
  };
  pressure: {
    trendBucket: PressureTrendBucket;
    source: ConditionSource;
  };
}

export interface LocationVisit {
  id: string;
  sessionId: string;
  spotId: string;
  arrivedAt: Date;
  outcome: VisitOutcome;
  conditions: LocationVisitConditions;
  conditionsRefinedFromPhoto: boolean;
}

export interface Catch {
  id: string;
  locationVisitId: string;
  hasPhoto: boolean;
  photoTimestamp: Date | null;
  species: string | null;
  sizeInches: number | null;
}
