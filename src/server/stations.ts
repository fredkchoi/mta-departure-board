import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes: string[];
}

let allStations: StationData[] = [];
const stationById = new Map<string, StationData>();

export function loadStations(): void {
  const dataPath = join(__dirname, '../../src/data/stations.json');
  allStations = JSON.parse(readFileSync(dataPath, 'utf-8')) as StationData[];
  for (const s of allStations) {
    stationById.set(s.id, s);
  }
  console.log(`Loaded ${allStations.length} stations`);
}

export function searchStations(query: string, limit = 20): StationData[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return allStations.filter((s) => s.name.toLowerCase().includes(q)).slice(0, limit);
}

export function getRoutesForStation(stationId: string): string[] {
  return stationById.get(stationId)?.routes ?? [];
}
