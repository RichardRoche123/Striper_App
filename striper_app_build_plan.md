# Striper App — Build Plan

Personal-use mobile app that logs striped bass fishing sessions (location, conditions, catches) and surfaces which locations have historically produced under similar conditions.

## Goals (v1)

- Make it fast enough to log a session mid-fishing-trip that it doesn't become a chore — most fields are optional or auto-filled.
- Capture enough structured data (location, conditions, outcome, catches) to support a "which spots produce in these conditions" query.
- Work reliably with no or spotty cell signal, since that's the normal operating environment.
- Ship as a single-user personal tool first; don't build multi-user complexity that isn't needed yet.

## Non-Goals (v1) — explicitly deferred

- **Friend sharing / multi-user data.** Not needed for personal use. If revisited later: sharing only "positive" sessions biases the shared dataset toward false positives (a spot fished 20x with 1 catch looks identical to one that produces every time) — any future version of this needs to either share full session data including skunks, or clearly separate "social feed" from "the actual recommendation engine's data source."
- **Live GPS-based "nearest good spot right now" recommender.** Real-time engine on top of a system that doesn't exist yet. Build the historical log/analysis first.
- **Authentication complexity / account system beyond what's needed for one user's data to sync and survive a device change.**

## Tech Stack

- **Framework:** React Native + TypeScript (cross-platform, one codebase for iOS + Android)
- **Storage:** Firebase (Firestore), using its built-in offline persistence — write locally, auto-syncs when signal returns. This is the mechanism that solves the "on the water, no signal" problem; don't build custom sync/queue logic.
- **Auth:** Simple email/password or Google Sign-In, tied to one personal account. (Recommended over Firebase Anonymous Auth — anonymous accounts are tied to the device install and data access can be lost on reinstall, which defeats the point of syncing for durability.)
- **Tide data:** NOAA CO-OPS API (`api.tidesandcurrents.noaa.gov`) — free, no key. Note: this API requires a **station ID**, not raw lat/long. Each Spot needs a nearest-station lookup (via the CO-OPS metadata/stations endpoint) resolved once at spot-creation time and cached on the Spot record.
- **Weather data:** NWS API (`api.weather.gov`) — free, no key, but requires a `User-Agent` header per their usage policy. Point forecast by lat/long.
- **Moon phase:** Calculated locally from date (standard synodic-month formula). No API call, works fully offline.
- **Photo access + EXIF:** e.g. `expo-image-picker` (photo selection) + an EXIF-reading library (e.g. `exifr`) for timestamp extraction. Photos themselves are never uploaded or stored — only their timestamp (and GPS if present) is read and kept.

## Data Model (Firestore)

```
spots/{spotId}
  name: string
  latitude: number
  longitude: number
  noaaStationId: string          // resolved once at creation
  active: boolean                 // soft-delete: keep historical visits resolvable even if a spot is later removed
  createdAt: timestamp

sessions/{sessionId}
  startedAt: timestamp
  endedAt: timestamp | null
  moonPhaseBucket: string          // one of 8 standard phases, calculated at session start

locationVisits/{visitId}
  sessionId: string                // FK -> sessions
  spotId: string                   // FK -> spots
  arrivedAt: timestamp
  outcome: "skunked" | "caught"    // required, single value
  conditions: {
    tide: { stageBucket: "low" | "rising" | "high" | "falling", source: "auto" | "manual" }
    wind: { directionBucket: N|NE|E|SE|S|SW|W|NW, speedMph: number, source: "auto" | "manual" }
    temp: { fahrenheit: number, bucket: string, source: "auto" | "manual" }
    cloudCover: { bucket: "clear" | "partly_cloudy" | "overcast", source: "auto" | "manual" }
    pressure: { trendBucket: "rising" | "falling" | "steady", source: "auto" | "manual" }
  }
  conditionsRefinedFromPhoto: boolean   // true if re-derived at End Session using photo EXIF timestamp

catches/{catchId}
  locationVisitId: string           // FK -> locationVisits
  hasPhoto: boolean
  photoTimestamp: timestamp | null
  species: string | null            // optional
  sizeInches: number | null         // optional
```

A "catch" record is created the same way whether it came from a photo or from the no-photo count — the only difference is whether `hasPhoto`/`photoTimestamp` are set. Optional `species`/`sizeInches` work identically either way.

## Condition Bucketing (for the analysis engine)

| Dimension | Buckets | Notes |
|---|---|---|
| Wind direction | 8 compass points (N, NE, E, SE, S, SW, W, NW) | From NWS wind direction degrees |
| Tide | Low / Rising / High / Falling | **Assumption:** consolidated the original doc's separate "stage" + "direction" fields into one 4-value field. Flag if you actually want them tracked as two independent fields. |
| Moon phase | 8 standard phases (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent) | Calculated locally |
| Barometric pressure | Rising / Falling / Steady | Trend computed vs. the reading from ~3 hours prior (standard meteorological window) — not absolute pressure |
| Temperature | Suggested: <40°F, 40–49, 50–59, 60–69, 70–79, 80+ | Adjustable — not a decision that changes app behavior, just tune the ranges if they feel wrong once you have real data |
| Cloud cover | Clear / Partly Cloudy / Overcast | Adjustable simple 3-way split |

## Core User Flows

**1. Start Session**
- Logs `startedAt`, calculates moon phase bucket.

**2. Log a Location Visit**
- User selects a spot from the saved list (see Spot Management below).
- App auto-fills tide (via spot's cached NOAA station), weather/wind/pressure-trend (via NWS at spot's lat/long), using current time. Every field is editable/overridable.

**3. Tag Outcome**
- Required, single choice: **Skunked** or **Caught**. No other fields are required at this point.

**4. Log Catches** *(only if outcome = Caught)*
- **Photo-based:** user adds photos "now" or flags "add after session ends." Each photo becomes a Catch record; species/size are optional per photo.
- **No-photo count:** a simple field — "Any fish caught without a photo?" — enter a number. If count > 1, prompt for optional species/size **per fish** (not one note for the batch). If count = 1, same optional fields, just once.
- These two paths aren't mutually exclusive — a visit can have both photographed and non-photographed catches.

**5. Next Location or End Session**
- "New Location" repeats step 2 onward.
- The **last** location of a session still goes through outcome tagging (step 3) before End Session — it's not skipped.

**6. End Session**
- For any visit flagged "add photos after," prompt to select those photos now.
- Read each photo's EXIF timestamp. If it differs meaningfully from the originally logged time, re-query the tide API for the corrected timestamp and update that visit's tide bucket. Set `conditionsRefinedFromPhoto = true`.
- Set `endedAt` on the session.

**7. Manage Saved Spots**
- Simple list screen: add a new spot (name + location, resolves nearest NOAA station), remove a spot you no longer fish (soft-delete via `active: false` so historical visits still display correctly).

**8. Get Recommendations**
- **Auto mode:** pulls current/today's forecast conditions, buckets them the same way as logged data, and shows top 3 spots ranked by historical catch rate under matching conditions.
- **On-demand mode:** user manually picks any combination of bucket values (or leaves dimensions as "any") to explore hypothetical conditions, same ranking logic.
- **Matching logic:** score each spot by number of matching condition dimensions rather than requiring an exact all-dimensions match (data will be sparse early on, especially in year one). Show the sample size (number of historical visits) alongside each result so low-confidence recommendations (e.g., based on 1 visit) are visibly distinguishable from well-supported ones.

## Requirements Summary

### P0 — Must-have for v1
- [ ] Start/End session with timestamps
- [ ] Spot management (add/remove, NOAA station auto-resolve)
- [ ] Location visit logging with auto-fill + manual override for all condition fields
- [ ] Required outcome tag (skunked/caught) per visit, including the final visit of a session
- [ ] Photo-based catch logging (now or deferred) with optional species/size
- [ ] No-photo catch count with per-fish optional species/size
- [ ] End-of-session photo reconciliation (EXIF timestamp → tide re-lookup)
- [ ] Offline-first logging with Firestore sync
- [ ] Condition bucketing per the table above
- [ ] Recommendation engine: both auto (today's forecast) and on-demand (manual query) modes, with sample-size shown

### P1 — Nice-to-have, fast follow
- [ ] Edit/correct a past session or visit after the fact
- [ ] Basic export (e.g., CSV) for poking at data outside the app
- [ ] Simple charts (catches over time, catches by spot)

### P2 / Future — explicitly out of scope for v1
- Friend sharing (see caveat under Non-Goals)
- Live GPS-based nearest-spot recommender
- Multi-species-specific tuning beyond basic species field

## Open Items for Claude Code to Flag Back (not blocking, but worth a sanity check during build)

- Exact temperature and cloud-cover bucket ranges (defaults suggested above)
- Whether tide should actually be 2 separate fields (stage + direction) instead of the consolidated 4-value bucket assumed here
- Minimum sample size threshold before a recommendation is shown at all vs. shown with a low-confidence flag
- Behavior when fewer than 3 locations have any historical data matching current conditions (show fewer than 3? show best-available with a note?)
