export interface StationInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes: string[];
}

export interface SelectedStation {
  stationId: string;
  stationName: string;
  allRoutes: string[];
  selectedRoutes: string[];
  directions: ('N' | 'S')[];
}

export interface AppConfig {
  stations: SelectedStation[];
}

export interface Departure {
  line: string;
  direction: 'N' | 'S';
  destination: string;
  departureTime: number;
  minutesAway: number;
  tripId: string;
  stopId: string;
}

export interface DeparturesResponse {
  departures: Departure[];
  updatedAt: number;
}
