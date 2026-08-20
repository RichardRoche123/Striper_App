import type { MoonPhaseBucket } from '../types/models';

const SYNODIC_MONTH_DAYS = 29.530588853;
// A known new moon reference point (2000-01-06 18:14 UTC), used to measure moon age by elapsed days.
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);
const MS_PER_DAY = 86400000;

const PHASES: MoonPhaseBucket[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

export function getMoonPhaseBucket(date: Date): MoonPhaseBucket {
  const daysSinceKnownNewMoon = (date.getTime() - KNOWN_NEW_MOON_UTC) / MS_PER_DAY;
  const age = daysSinceKnownNewMoon % SYNODIC_MONTH_DAYS;
  const normalizedAge = age < 0 ? age + SYNODIC_MONTH_DAYS : age;
  const phaseIndex = Math.floor((normalizedAge / SYNODIC_MONTH_DAYS) * 8 + 0.5) % 8;
  return PHASES[phaseIndex];
}

const MOON_PHASE_LABELS: Record<MoonPhaseBucket, string> = {
  new: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
};

export function formatMoonPhase(bucket: MoonPhaseBucket): string {
  return MOON_PHASE_LABELS[bucket];
}
