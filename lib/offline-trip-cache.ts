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
    localStorage.setItem(keyFor(tripId), JSON.stringify({ ...snapshot, cachedAt: Date.now() }));
  } catch {}
}

export function readOfflineTrip(tripId: string): OfflineTripSnapshot | null {
  try {
    const raw = localStorage.getItem(keyFor(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineTripSnapshot;
    if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOfflineTrip(tripId: string) {
  try {
    localStorage.removeItem(keyFor(tripId));
  } catch {}
}
