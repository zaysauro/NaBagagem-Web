export type ItineraryEvent = {
  id: string;
  location_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string | null;
  reservation_name?: string | null;
  confirmation_code?: string | null;
};
type Coordinates = { latitude: number; longitude: number };
export type ItineraryLocation = { id: string; latitude: number | null; longitude: number | null };
type LocatedEvent = ItineraryEvent & Coordinates;

function hasCoordinates(value: Pick<ItineraryEvent, "latitude" | "longitude">): value is Coordinates {
  return typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

function distance(a: Coordinates, b: Coordinates) {
  const latitude = a.latitude - b.latitude;
  const longitude = (a.longitude - b.longitude) * Math.cos((a.latitude + b.latitude) * Math.PI / 360);
  return latitude * latitude + longitude * longitude;
}

function takeNearest(from: Coordinates, pool: LocatedEvent[]) {
  let best = 0;
  for (let index = 1; index < pool.length; index++) {
    if (distance(from, pool[index]) < distance(from, pool[best])) best = index;
  }
  return pool.splice(best, 1)[0];
}

function orderLocatedEvents(events: LocatedEvent[]) {
  const scheduled = events.filter(event => event.start_time).sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const reserved = events.filter(event => !event.start_time && (event.reservation_name || event.confirmation_code));
  const anchors = [...scheduled, ...reserved];
  const anchorIds = new Set(anchors.map(event => event.id));
  const flexible = events.filter(event => !anchorIds.has(event.id));

  if (anchors.length <= 1) {
    const start = anchors[0] || events[0];
    const remaining = events.filter(event => event.id !== start.id);
    const ordered = [start];
    while (remaining.length) ordered.push(takeNearest(ordered[ordered.length - 1], remaining));
    for (let index = 1; index < ordered.length - 2; index++) {
      for (let end = index + 1; end < ordered.length - 1; end++) {
        const before = distance(ordered[index - 1], ordered[index]) + distance(ordered[end], ordered[end + 1]);
        const after = distance(ordered[index - 1], ordered[end]) + distance(ordered[index], ordered[end + 1]);
        if (after + 1e-12 < before) ordered.splice(index, end - index + 1, ...ordered.slice(index, end + 1).reverse());
      }
    }
    // These events already include every flexible stop; do not insert them again.
    return ordered;
  }

  const ordered: LocatedEvent[] = [];
  const remaining = [...flexible];
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    const nextAnchor = anchors[index + 1];
    ordered.push(anchor);
    if (!nextAnchor) {
      let current = anchor;
      while (remaining.length) {
        current = takeNearest(current, remaining);
        ordered.push(current);
      }
      break;
    }
    while (remaining.length) {
      const candidate = remaining.reduce((best, event) => distance(anchor, event) < distance(anchor, best) ? event : best);
      const detour = distance(anchor, candidate) + distance(candidate, nextAnchor);
      if (detour > distance(anchor, nextAnchor) * 1.85) break;
      remaining.splice(remaining.findIndex(event => event.id === candidate.id), 1);
      ordered.push(candidate);
    }
  }
  return ordered;
}

export function optimizeDayEventOrder(events: ItineraryEvent[], locations: ItineraryLocation[]) {
  const locationById = new Map(locations.map(location => [location.id, location]));
  const located: LocatedEvent[] = [];
  for (const event of events) {
    // The UI stores location_id; explicit legacy event coordinates remain valid.
    const location = event.location_id ? locationById.get(event.location_id) : undefined;
    const coordinates = hasCoordinates(event) ? event : location && hasCoordinates(location) ? location : null;
    if (coordinates) located.push({ ...event, latitude: coordinates.latitude, longitude: coordinates.longitude });
  }
  if (located.length < 2) throw new Error("O dia precisa ter pelo menos 2 atividades com localização.");
  const order = orderLocatedEvents(located);
  const locatedIds = new Set(located.map(event => event.id));
  let index = 0;
  // Keep stops without coordinates in their original slots, with unique indexes.
  return events.map(event => locatedIds.has(event.id) ? order[index++].id : event.id);
}
