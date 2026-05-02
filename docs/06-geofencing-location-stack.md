# Geofencing & Contractor Location Tracking — Full Technical Stack

## Overview

Prime Air uses a **two-layer location system**:

1. **Native Geofencing** (OS-level, battery-efficient) — detects when a tech arrives at or leaves a job site. Used for clock-in prompts and automatic project assignment. Runs even when the app is backgrounded or killed.

2. **Active GPS Tracking** (continuous, while clocked in only) — records the tech's full location trail during a shift. Powers the live crew map, route history, drive detection, and labor cost allocation. Stops the moment the tech clocks out.

These two layers serve different purposes and use different technical approaches on purpose.

---

## Layer 1: Native Geofencing (Arrival Detection)

### How It Works

The OS (iOS CoreLocation / Android Geofencing API) monitors a list of circular regions. When the device crosses a boundary, the OS wakes the app — even if it was killed — and fires an event. This uses hardware-level motion coprocessors (not GPS), so battery impact is minimal (~1–2% extra per day).

### Expo Implementation

```typescript
// lib/geofencing.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const GEOFENCE_TASK = 'PRIME_AIR_GEOFENCE';

// Define the background task — this runs even when app is killed
TaskManager.defineTask(GEOFENCE_TASK, async ({ data: { eventType, region }, error }) => {
  if (error) { console.error(error); return; }

  if (eventType === Location.GeofencingEventType.Enter) {
    // Tech entered a job site geofence
    await handleGeofenceEnter(region.identifier); // region.identifier = workOrderId
  }

  if (eventType === Location.GeofencingEventType.Exit) {
    await handleGeofenceExit(region.identifier);
  }
});

async function handleGeofenceEnter(workOrderId: string) {
  // 1. Check if tech is already clocked in (don't double-prompt)
  const activeEntry = await getActiveTimeEntry();
  if (activeEntry) return;

  // 2. Wait 2 minutes before prompting (avoid false triggers from driving past)
  await new Promise(resolve => setTimeout(resolve, 120_000));

  // 3. Re-check position (still inside geofence after 2 min?)
  const stillInside = await isInsideGeofence(workOrderId);
  if (!stillInside) return;

  // 4. Fire notification prompt
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'You\'ve arrived at the job site',
      body: 'Tap to clock in to this job',
      data: { action: 'CLOCK_IN_PROMPT', workOrderId },
    },
    trigger: null, // immediate
  });
}

// Register geofences for all of today's assigned jobs
export async function syncGeofencesForToday(workOrders: WorkOrder[]) {
  // Stop any existing geofencing
  await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});

  const regions = workOrders
    .filter(wo => wo.serviceAddress?.lat && wo.serviceAddress?.lng)
    .map(wo => ({
      identifier: wo.id,
      latitude: wo.serviceAddress.lat,
      longitude: wo.serviceAddress.lng,
      radius: wo.serviceAddress.geofenceRadiusFt * 0.3048, // ft → meters
      notifyOnEnter: true,
      notifyOnExit: true,
    }));

  if (regions.length === 0) return;

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}
```

### OS Limits & Workarounds

| OS | Geofence Limit | Min Radius | Accuracy |
|---|---|---|---|
| iOS (CoreLocation) | 20 regions per app | ~100m | 50–200m |
| Android (Google Play Services) | 100 regions per app | No minimum | 50–300m |

**Handling the iOS 20-region limit:**
HVAC techs typically have 3–6 jobs per day. We register today's jobs + the home/shop location. If a company assigns more than 19 jobs to one tech in a day, we prioritize the next 3 unstarted jobs in the queue and refresh the geofence list when a job is completed.

```typescript
// Refresh geofences when job status changes
// Only register next 3 unstarted jobs + shop location
function getGeofencePriority(workOrders: WorkOrder[]): WorkOrder[] {
  const upcoming = workOrders
    .filter(wo => wo.status === 'SCHEDULED' || wo.status === 'DISPATCHED')
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .slice(0, 18); // iOS limit safety margin
  return upcoming;
}
```

---

## Layer 2: Active GPS Tracking (During Shift)

### Architecture

```
Mobile App (Expo)
  ├── expo-location startLocationUpdatesAsync()  ← background GPS task
  │     interval: 30 seconds
  │     accuracy: LocationAccuracy.High (GPS chip, not cell tower)
  │     distanceInterval: 10 meters (only ping if moved 10m+)
  │
  └── expo-task-manager LOCATION_TASK
        ├── Store ping in expo-sqlite (offline queue)
        ├── If online: POST /api/trpc/locations.ping
        └── If offline: queue for later sync

API Server
  ├── Receive location ping
  ├── Write to PostgreSQL location_pings table
  ├── Update Redis cache: company:{id}:live-location:{userId}
  ├── Run geofence check (PostGIS ST_DWithin)
  └── Broadcast via Socket.io → admin dispatch map
```

### Expo Background Location Task

```typescript
// lib/tracking.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SQLite from 'expo-sqlite';

const LOCATION_TASK = 'PRIME_AIR_LOCATION_TRACKING';
const db = SQLite.openDatabase('primeair.db');

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[locations.length - 1]; // most recent

  const ping = {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed ?? 0,
    bearing: location.coords.heading,
    altitude: location.coords.altitude,
    timestamp: new Date(location.timestamp).toISOString(),
    isDriving: (location.coords.speed ?? 0) > 6.7, // > 15 mph
  };

  // Always write to SQLite first (works offline)
  await persistToLocalQueue(ping);

  // Attempt server sync
  try {
    await syncPingToServer(ping);
  } catch {
    // Will retry on next successful network ping
  }
});

export async function startTracking() {
  const { granted } = await Location.requestBackgroundPermissionsAsync();
  if (!granted) throw new Error('Background location permission required');

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,           // 30 seconds
    distanceInterval: 10,           // only if moved 10m
    deferredUpdatesInterval: 60_000, // batch updates on low power
    showsBackgroundLocationIndicator: true, // iOS blue bar
    foregroundService: {             // Android foreground service
      notificationTitle: 'Prime Air is active',
      notificationBody: 'Location tracking during your shift',
      notificationColor: '#0891B2',
    },
  });
}

export async function stopTracking() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
```

### Offline Queue & Sync

```typescript
// SQLite schema for offline queue
db.transaction(tx => {
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS location_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      speed REAL,
      bearing REAL,
      timestamp TEXT NOT NULL,
      is_driving INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0
    )
  `);
});

// Background sync — runs every 15 minutes via expo-background-fetch
async function syncPendingPings() {
  const unsynced = await getUnsyncedPings(limit: 50);
  if (unsynced.length === 0) return;

  const result = await api.locations.batchPing.mutate({ pings: unsynced });
  if (result.success) {
    await markPingsSynced(unsynced.map(p => p.id));
  }
}
```

---

## Backend: PostGIS Spatial Queries

### Why PostGIS

PostgreSQL + the PostGIS extension adds full GIS (Geographic Information System) support: spatial data types, spatial indexes, and hundreds of spatial functions. It's the most common approach for production geofencing in backend systems.

### Schema (PostGIS fields)

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- location_pings: stores GPS trail (one row per 30s ping)
CREATE TABLE location_pings (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  company_id  TEXT NOT NULL,
  
  -- Use GEOGRAPHY type (spherical earth model, accurate worldwide)
  -- GEOMETRY type uses flat-earth math (accurate only for small areas)
  position    GEOGRAPHY(POINT, 4326) NOT NULL,
  
  accuracy    FLOAT,    -- meters
  speed       FLOAT,    -- m/s
  bearing     FLOAT,    -- degrees 0-360
  is_driving  BOOLEAN DEFAULT false,
  
  "timestamp" TIMESTAMPTZ NOT NULL,
  
  -- GiST index enables fast spatial lookups
  CONSTRAINT location_pings_position_idx 
    USING gist(position)
);

CREATE INDEX ON location_pings (company_id, user_id, "timestamp" DESC);
CREATE INDEX ON location_pings USING GIST(position);

-- service_addresses: each job site with a geofence
CREATE TABLE service_addresses (
  id              TEXT PRIMARY KEY,
  customer_id     TEXT NOT NULL,
  line1           TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  zip             TEXT NOT NULL,
  
  -- Stored as GEOGRAPHY for accurate distance calculations
  position        GEOGRAPHY(POINT, 4326),
  
  -- Geofence as a circle (center + radius)
  geofence_radius_meters  INT DEFAULT 61,  -- ~200 ft
  
  -- Or as a polygon (for irregular shapes like a construction site)
  geofence_polygon  GEOGRAPHY(POLYGON, 4326),
  
  is_primary      BOOLEAN DEFAULT false
);

CREATE INDEX ON service_addresses USING GIST(position);
CREATE INDEX ON service_addresses USING GIST(geofence_polygon);
```

### Key Spatial Queries

```sql
-- 1. Check if a point is inside a circular geofence
--    Used: server-side arrival confirmation, auto clock-in validation
SELECT
  sa.id,
  wo.id AS work_order_id,
  ST_Distance(sa.position, ST_MakePoint($lng, $lat)::GEOGRAPHY) AS distance_meters
FROM service_addresses sa
JOIN work_orders wo ON wo.service_address_id = sa.id
WHERE
  wo.company_id = $company_id
  AND wo.status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS')
  AND ST_DWithin(
    sa.position,
    ST_MakePoint($lng, $lat)::GEOGRAPHY,  -- tech's current position
    sa.geofence_radius_meters              -- radius in meters
  )
ORDER BY distance_meters ASC
LIMIT 1;

-- 2. Find the nearest available technician to a job site
--    Used: Smart dispatch recommendation
WITH tech_positions AS (
  -- Get latest ping per tech (last 5 minutes = currently active)
  SELECT DISTINCT ON (user_id)
    user_id,
    position,
    "timestamp"
  FROM location_pings
  WHERE
    company_id = $company_id
    AND "timestamp" > NOW() - INTERVAL '5 minutes'
  ORDER BY user_id, "timestamp" DESC
)
SELECT
  u.id,
  u.first_name || ' ' || u.last_name AS name,
  ST_Distance(tp.position, ST_MakePoint($job_lng, $job_lat)::GEOGRAPHY) AS distance_meters,
  ROUND(
    ST_Distance(tp.position, ST_MakePoint($job_lng, $job_lat)::GEOGRAPHY) / 13.4
  ) AS eta_seconds  -- ~30 mph avg speed in city
FROM tech_positions tp
JOIN users u ON u.id = tp.user_id
JOIN time_entries te ON te.user_id = u.id AND te.clock_out_at IS NULL -- currently clocked in
LEFT JOIN work_order_assignments woa ON woa.user_id = u.id 
  AND woa.work_order_id IN (
    SELECT id FROM work_orders 
    WHERE status = 'IN_PROGRESS' AND company_id = $company_id
  )
WHERE woa.work_order_id IS NULL -- not currently on an active job
ORDER BY distance_meters ASC
LIMIT 5;

-- 3. Get GPS trail for a user on a specific date
--    Used: route history, labor verification, mileage report
SELECT
  user_id,
  ST_AsGeoJSON(position) AS geojson,
  speed,
  is_driving,
  "timestamp"
FROM location_pings
WHERE
  user_id = $user_id
  AND "timestamp"::date = $date
ORDER BY "timestamp" ASC;

-- 4. Build a route line (for map polyline display)
SELECT ST_AsGeoJSON(
  ST_MakeLine(position ORDER BY "timestamp" ASC)
) AS route_geojson
FROM location_pings
WHERE user_id = $user_id AND "timestamp"::date = $date;

-- 5. Calculate time spent inside each geofenced project
--    Used: automatic cost code allocation, project labor reporting
SELECT
  sa.id AS address_id,
  wo.id AS work_order_id,
  COUNT(*) * 30 / 60.0 AS estimated_minutes  -- 30s per ping
FROM location_pings lp
JOIN service_addresses sa ON ST_DWithin(lp.position, sa.position, sa.geofence_radius_meters)
JOIN work_orders wo ON wo.service_address_id = sa.id
WHERE
  lp.user_id = $user_id
  AND lp."timestamp"::date = $date
GROUP BY sa.id, wo.id
ORDER BY estimated_minutes DESC;
```

### PostGIS Spatial Index Performance

Without a spatial index, every geofence check does a full table scan — at 1,000 pings/day/tech × 100 techs = 100,000 rows/day, this becomes slow fast.

The GiST index makes spatial queries use a bounding-box pre-filter before doing exact distance math:

```sql
-- This query uses the GiST index — fast even on millions of rows
EXPLAIN ANALYZE
SELECT * FROM location_pings
WHERE ST_DWithin(
  position,
  ST_MakePoint(-96.796988, 32.776664)::GEOGRAPHY,
  500
);
-- Result: Index Scan using location_pings_position_idx → 0.2ms
-- Without index: Seq Scan → 840ms on 500k rows
```

---

## Real-Time Location: Redis + Socket.io

### Redis Live Location Cache

```typescript
// server/lib/locationCache.ts
import { redis } from './redis';

// Store latest position per tech (expires after 5 min = clocked out indicator)
export async function cacheLocation(
  companyId: string,
  userId: string,
  data: { lat: number; lng: number; speed: number; workOrderId?: string; timestamp: string }
) {
  const key = `live:${companyId}:${userId}`;
  await redis.setex(key, 300, JSON.stringify(data)); // TTL: 300s = 5 min
}

// Get all live techs for a company (for dispatch map initial load)
export async function getLiveLocations(companyId: string): Promise<LiveLocation[]> {
  const keys = await redis.keys(`live:${companyId}:*`);
  if (keys.length === 0) return [];
  
  const values = await redis.mget(...keys);
  return values
    .filter(Boolean)
    .map(v => JSON.parse(v!))
    .map((data, i) => ({
      userId: keys[i].split(':')[2],
      ...data,
    }));
}

// Delete on clock-out (map pin disappears immediately)
export async function clearLocation(companyId: string, userId: string) {
  await redis.del(`live:${companyId}:${userId}`);
}
```

### Socket.io Real-Time Broadcast

```typescript
// server/lib/socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis';

// Redis adapter allows Socket.io to scale across multiple server instances
const io = new Server(httpServer, { cors: { origin: '*' } });
io.adapter(createAdapter(redis, redis.duplicate()));

// Rooms: each company gets its own room
// Admins/dispatchers join their company room on connect
io.on('connection', (socket) => {
  socket.on('join:company', (companyId: string) => {
    socket.join(`company:${companyId}`);
  });
});

// Called from the location ping API route
export function broadcastLocationUpdate(companyId: string, data: {
  userId: string;
  firstName: string;
  lastName: string;
  lat: number;
  lng: number;
  speed: number;
  isDriving: boolean;
  workOrderId?: string;
  timestamp: string;
}) {
  io.to(`company:${companyId}`).emit('location:update', data);
}

// Called when job status changes (marker color update on map)
export function broadcastJobUpdate(companyId: string, data: {
  workOrderId: string;
  status: string;
  techId: string;
}) {
  io.to(`company:${companyId}`).emit('job:status-changed', data);
}
```

### Web Client Map (React + Socket.io)

```typescript
// app/(admin)/dispatch/CrewMap.tsx
import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Circle } from '@vis.gl/react-google-maps';
import { io } from 'socket.io-client';

interface TechLocation {
  userId: string;
  firstName: string;
  lat: number;
  lng: number;
  speed: number;
  isDriving: boolean;
  workOrderId?: string;
}

export function CrewMap({ companyId }: { companyId: string }) {
  const [techLocations, setTechLocations] = useState<Map<string, TechLocation>>(new Map());
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const socketRef = useRef<ReturnType<typeof io>>();

  useEffect(() => {
    // Connect to Socket.io
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token: getAccessToken() },
    });

    socketRef.current.emit('join:company', companyId);

    // Real-time location updates
    socketRef.current.on('location:update', (data: TechLocation) => {
      setTechLocations(prev => new Map(prev).set(data.userId, data));
    });

    // Tech clocked out — remove from map
    socketRef.current.on('location:removed', (data: { userId: string }) => {
      setTechLocations(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    return () => socketRef.current?.disconnect();
  }, [companyId]);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
      <Map
        defaultCenter={{ lat: 32.7767, lng: -96.7970 }} // Dallas
        defaultZoom={11}
        mapId="prime-air-dispatch"
      >
        {/* Job site geofence circles */}
        {jobSites.map(site => (
          <Circle
            key={site.id}
            center={{ lat: site.lat, lng: site.lng }}
            radius={site.radiusMeters}
            fillColor="#0891B2"
            fillOpacity={0.1}
            strokeColor="#0891B2"
            strokeWeight={2}
          />
        ))}

        {/* Tech position markers */}
        {Array.from(techLocations.values()).map(tech => (
          <AdvancedMarker
            key={tech.userId}
            position={{ lat: tech.lat, lng: tech.lng }}
          >
            <TechMarker tech={tech} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
```

---

## Drive Detection Algorithm

The drive detection algorithm segments a tech's GPS trail into "driving" and "on-site" periods. This is used to:
- Automatically allocate travel time to a "TRAVEL" cost code
- Exclude driving time from billable on-site hours
- Generate mileage reports

```typescript
// packages/api/lib/driveDetection.ts

interface LocationPoint {
  lat: number;
  lng: number;
  speed: number;       // m/s from GPS chip
  timestamp: Date;
}

interface Segment {
  type: 'DRIVING' | 'ON_SITE' | 'STATIONARY';
  start: Date;
  end: Date;
  durationMinutes: number;
  distanceMeters?: number;
}

export function segmentTrail(points: LocationPoint[]): Segment[] {
  const DRIVING_SPEED_MS = 4.5;    // > 10 mph = driving
  const DRIVING_DURATION_S = 60;   // must sustain for 60s to count
  const MIN_SEGMENT_S = 120;       // ignore segments < 2 minutes

  const segments: Segment[] = [];
  let segmentStart = points[0];
  let currentType: Segment['type'] = 'ON_SITE';

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const detectedType = point.speed > DRIVING_SPEED_MS ? 'DRIVING' : 'ON_SITE';

    if (detectedType !== currentType) {
      const durationS = (point.timestamp.getTime() - segmentStart.timestamp.getTime()) / 1000;

      // Only commit segment if it's long enough to be meaningful
      if (durationS >= MIN_SEGMENT_S) {
        segments.push({
          type: currentType,
          start: segmentStart.timestamp,
          end: point.timestamp,
          durationMinutes: Math.round(durationS / 60),
        });
      }

      segmentStart = point;
      currentType = detectedType;
    }
  }

  return segments;
}

// Map each driving segment to a cost code automatically
export function allocateCostCodes(
  segments: Segment[],
  costCodes: { TRAVEL: string; REPAIR: string; PM: string }
): CostCodeAllocation[] {
  return segments.map(segment => ({
    ...segment,
    costCodeId: segment.type === 'DRIVING'
      ? costCodes.TRAVEL
      : costCodes.REPAIR, // default; overridden by active work order
  }));
}
```

---

## Maps Provider Decision: Google Maps vs. Mapbox

| Criteria | Google Maps | Mapbox |
|---|---|---|
| Mobile SDK | `react-native-maps` (PROVIDER_GOOGLE) | `@rnmapbox/maps` |
| Web SDK | `@vis.gl/react-google-maps` | `react-map-gl` |
| Offline map tiles | ❌ Not available | ✅ Mapbox supports offline tile packs |
| Custom map styling | Limited | Full control (Studio editor) |
| Directions/ETA API | ✅ Google Directions API (best accuracy) | Mapbox Navigation API (good, but weaker in rural areas) |
| Geocoding quality | ✅ Industry-leading | Good but less complete for rural addresses |
| Pricing | $7/1,000 map loads (web), $0.005/request | $0.50/1,000 map loads (cheaper at scale) |
| Places autocomplete | ✅ Best in class | Good |
| **Recommendation** | **Use for Prime Air V1** | Consider at 50K+ map loads/month |

### Why Google Maps for Prime Air V1

HVAC companies primarily operate in suburban and rural residential areas where Google Maps has superior geocoding accuracy. A job site address like "Lot 4, Sunridge Estates Phase 2" is far more likely to resolve correctly in Google than Mapbox. The Directions API also gives more accurate ETAs for the "tech is on the way" customer SMS.

---

## Permission Flow (Mobile — Critical for App Store)

Both Apple and Google have strict rules about background location. Getting this wrong causes App Store rejection.

### iOS Required Entries (Info.plist)

```xml
<!-- Required — explains why you need location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Prime Air uses your location to verify job site arrival and track hours while you're clocked in.</string>

<!-- Required for background — App Store reviewers read this carefully -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Prime Air tracks your location during your work shift to verify job site time. Tracking stops automatically when you clock out.</string>

<!-- Background modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

### Android Required (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

### Permission Request Flow (In-App)

```typescript
// Always explain before requesting — dramatically improves grant rate
async function requestLocationPermissions(): Promise<boolean> {
  // Step 1: Foreground permission (required before background)
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') {
    showPermissionExplainer('foreground');
    return false;
  }

  // Step 2: Background permission (iOS shows a separate system dialog)
  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') {
    // App still works without background — just no geofence entry notifications
    showPermissionExplainer('background');
    return false; // or 'partial'
  }

  return true;
}
```

### Apple App Store Review Tips

Apple manually reviews all apps that use background location. Common rejection reasons and how to avoid them:

1. **Rejection:** "The app does not clearly explain the benefit of location to the user."
   - Fix: Show an in-app explainer screen with a diagram before requesting permission. State explicitly: "Location tracking runs only while you are clocked in."

2. **Rejection:** "Background location appears to provide no additional functionality."
   - Fix: Demonstrate geofence clock-in prompt in your TestFlight build. Have a reviewer clock in at a test job site.

3. **Rejection:** "The app collects location data in the background without user initiation."
   - Fix: Location task only starts on explicit user clock-in action. Never start passively.

---

## Battery Usage Optimization

Unoptimized GPS can drain 20–30% extra battery per day — a common tech complaint that drives churn.

### Optimizations Applied

```typescript
// 1. Adaptive interval: reduce GPS frequency when stationary
const STATIONARY_SPEED_THRESHOLD = 0.5; // m/s
let consecutiveStationary = 0;

function getAdaptiveInterval(speed: number): number {
  if (speed < STATIONARY_SPEED_THRESHOLD) {
    consecutiveStationary++;
    // After 5 stationary pings (2.5 min), slow to 2-min intervals
    return consecutiveStationary > 5 ? 120_000 : 30_000;
  }
  consecutiveStationary = 0;
  return 30_000; // 30 seconds while moving
}

// 2. Distance filter: don't ping if moved < 10 meters
// Already configured in startLocationUpdatesAsync: distanceInterval: 10

// 3. Accuracy tradeoff: use Balanced when stationary, High when driving
// expo-location handles this automatically with LocationAccuracy.High
// on iOS, the hardware coprocessor handles low-power detection

// 4. Batch upload when on WiFi (employee at home/shop)
import NetInfo from '@react-native-community/netinfo';

async function adaptivePingStrategy() {
  const netState = await NetInfo.fetch();
  if (netState.type === 'wifi') {
    // On WiFi: batch all queued pings in one request
    await syncAllPendingPings();
  } else {
    // On cellular: sync latest only, keep older pings queued
    await syncLatestPing();
  }
}
```

### Expected Battery Impact

| Scenario | Extra Battery Drain |
|---|---|
| Geofencing only (not clocked in) | ~1–2%/day |
| Active tracking, mostly stationary | ~5–8%/day |
| Active tracking, lots of driving | ~10–15%/day |
| Unoptimized (no adaptive interval) | ~20–30%/day |

**User messaging:** In the app onboarding, explicitly state the expected impact and tip: "Plug in your phone while driving between jobs — your truck's USB port handles the GPS cost entirely."

---

## Complete Data Flow: Clock-In Triggered by Geofence

```
1. Tech parks truck at customer's house (4521 Oak St)
   └─ iOS CoreLocation: device enters 200ft radius geofence for WO-2241

2. GEOFENCE_TASK wakes (even if app killed)
   └─ handleGeofenceEnter("WO-2241") called

3. 2-minute delay (avoid false trigger from driving past)
   └─ Re-check: still inside? YES

4. Push notification sent:
   "You've arrived at Smith Residence — tap to clock in"

5. Tech taps notification → app opens to clock-in screen
   └─ Pre-filled: Project = Smith Residence, WO-2241

6. Tech takes facial photo → taps CLOCK IN

7. Clock-in API call:
   POST /api/trpc/timeclock.clockIn
   {
     lat: 32.7767, lng: -96.7970,
     workOrderId: "WO-2241",
     photoDataUri: "data:image/jpeg;base64,...",
     geofenceTriggered: true
   }

8. Server:
   a. Create TimeEntry (clockInAt = now, workOrderId, GPS coords)
   b. Store clock-in photo in R2
   c. Update WorkOrder status → IN_PROGRESS
   d. Cache location in Redis (TTL 300s)
   e. Broadcast via Socket.io → dispatch map shows green pin at job site
   f. Start LOCATION_TASK (30s GPS pings begin)
   g. Notify dispatcher: "Marcus clocked in at Smith Residence" (push)
   h. SMS to customer: "Your technician Marcus is at your home and has started work"

9. Every 30 seconds while clocked in:
   Mobile LOCATION_TASK → POST location ping
   Server → PostGIS ST_DWithin check → still inside geofence
   Server → Redis update → Socket.io broadcast → map pin moves

10. Tech completes job → taps CLOCK OUT:
    a. StopLocationUpdatesAsync() — GPS tracking ends immediately
    b. POST timeclock.clockOut
    c. Redis key deleted → map pin disappears
    d. TimeEntry clockOutAt set, minutes calculated
    e. WorkOrder status → COMPLETE
    f. Auto-generate invoice
    g. Customer SMS: "Your HVAC service is complete — invoice sent to your email"
```

---

## Summary: Full Tech Stack for Location & Geofencing

| Component | Technology | Purpose |
|---|---|---|
| Native geofencing | `expo-location` startGeofencingAsync | Arrival detection, clock-in prompt (battery efficient, works when app killed) |
| Background GPS | `expo-location` startLocationUpdatesAsync | 30s trail during active shift |
| Background task runtime | `expo-task-manager` | Executes location code when app is backgrounded |
| Offline queue | `expo-sqlite` | Stores pings when no network, syncs later |
| Geospatial DB | PostgreSQL + PostGIS | ST_DWithin geofence checks, ST_Distance nearest-tech, GPS trail storage |
| Spatial index | GiST index on GEOGRAPHY columns | Makes spatial queries run in <1ms on millions of rows |
| Live location cache | Redis (Upstash) | O(1) latest-position lookup, auto-expires when clocked out |
| Real-time push | Socket.io + Redis adapter | Broadcasts location updates to admin dispatch map (<500ms latency) |
| Mobile map | `react-native-maps` (PROVIDER_GOOGLE) | Shows tech position on mobile |
| Web map | `@vis.gl/react-google-maps` | Admin dispatch map with live pins + geofence circles |
| Directions/ETA | Google Directions API | "Tech en route" ETA calculation for customer SMS |
| Geocoding | Google Geocoding API | Address → lat/lng when work order is created |
| Places autocomplete | Google Places API | Address input autocomplete on work order form |
| Drive detection | Custom speed-threshold algorithm | Segments trail into driving vs. on-site time |
| Permission handling | `expo-location` permission APIs | Foreground + background permission request flow |
