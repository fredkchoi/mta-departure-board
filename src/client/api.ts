import type { StationInfo, DeparturesResponse, ServiceAlert } from './types.js';

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

export async function fetchAlerts(): Promise<ServiceAlert[]> {
  try {
    const res = await fetch('/api/alerts');
    if (!res.ok) return [];
    const data: { alerts: ServiceAlert[] } = await res.json();
    return data.alerts;
  } catch {
    return [];
  }
}
