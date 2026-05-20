import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import Long from 'long';
import { FEED_URLS, ROUTE_TO_FEED } from './feeds.js';
import { TERMINUS_MAP } from '../shared/terminus-map.js';
import { getRoutesForStation } from './stations.js';

export interface Departure {
  line: string;
  direction: 'N' | 'S';
  destination: string;
  departureTime: number;
  minutesAway: number;
  tripId: string;
  stopId: string;
}

function toTimestamp(value: number | Long | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Long) return value.toNumber();
  return value;
}

async function fetchFeed(
  feedKey: string,
): Promise<GtfsRealtimeBindings.transit_realtime.FeedMessage | null> {
  const url = FEED_URLS[feedKey];
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  } catch (err) {
    console.error(`Failed to fetch ${feedKey} feed:`, err);
    return null;
  }
}

export async function getDepartures(stopIds: string[]): Promise<Departure[]> {
  if (!stopIds.length) return [];

  const now = Math.floor(Date.now() / 1000);
  const stopIdSet = new Set(stopIds);

  // Determine which feeds are needed based on routes at these stops
  const feedsNeeded = new Set<string>();
  for (const stopId of stopIds) {
    const parentId = stopId.replace(/[NS]$/, '');
    for (const route of getRoutesForStation(parentId)) {
      const feed = ROUTE_TO_FEED[route];
      if (feed) feedsNeeded.add(feed);
    }
  }

  const departures: Departure[] = [];

  await Promise.all(
    [...feedsNeeded].map(async (feedKey) => {
      const feed = await fetchFeed(feedKey);
      if (!feed) return;

      for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu?.trip || !tu.stopTimeUpdate) continue;

        const routeId = tu.trip.routeId ?? '?';

        for (const stu of tu.stopTimeUpdate) {
          if (!stu.stopId || !stopIdSet.has(stu.stopId)) continue;

          const depTime =
            toTimestamp(stu.departure?.time) ?? toTimestamp(stu.arrival?.time);
          if (!depTime || depTime <= now) continue;

          const minutesAway = Math.round((depTime - now) / 60);
          if (minutesAway > 90) continue;

          const direction = stu.stopId.endsWith('N') ? 'N' : 'S';
          const destination =
            TERMINUS_MAP[`${routeId}-${direction}`] ??
            (direction === 'N' ? 'Uptown' : 'Downtown');

          departures.push({
            line: routeId,
            direction,
            destination,
            departureTime: depTime,
            minutesAway,
            tripId: tu.trip.tripId ?? '',
            stopId: stu.stopId,
          });
        }
      }
    }),
  );

  return departures.sort((a, b) => a.departureTime - b.departureTime);
}
