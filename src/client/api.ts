import type { StationInfo, DeparturesResponse } from './types.js';

export async function searchStations(query: string): Promise<StationInfo[]> {
  const res = await fetch(`/api/stations/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Station search failed');
  return res.json();
}

export async function fetchDepartures(stopIds: string[]): Promise<DeparturesResponse> {
  const res = await fetch(`/api/departures?stops=${stopIds.join(',')}`);
  if (!res.ok) throw new Error('Failed to fetch departures');
  return res.json();
}
