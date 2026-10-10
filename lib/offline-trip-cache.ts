"use client";

export type OfflineTripSnapshot = {
  cachedAt: number;
  trip: unknown | null;
  locations: unknown[];
  events: unknown[];
};

const keyFor = (tripId: string) => `nabagagem:offline-trip:${tripId}`;

export function saveOfflineTrip(tripId: string, snapshot: Omit<OfflineTripSnapshot, "cachedAt">) {
  try {
    sessionStorage.setItem(keyFor(tripId), JSON.stringify({ ...snapshot, cachedAt: Date.now() }));
  } catch {}
}

export function readOfflineTrip(tripId: string): OfflineTripSnapshot | null {
  try {
    const raw = sessionStorage.getItem(keyFor(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineTripSnapshot;
    if (Date.now() - parsed.cachedAt > 3600000) { sessionStorage.removeItem(keyFor(tripId)); return null; }
    if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOfflineTrip(tripId: string) {
  try {
    sessionStorage.removeItem(keyFor(tripId));
  } catch {}
}
