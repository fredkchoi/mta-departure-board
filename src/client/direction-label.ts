import { TERMINUS_MAP } from '../shared/terminus-map.js';

// Returns a human-readable label for a direction at a given station.
// e.g. for routes ['1','2','3'] going N → "Van Cortlandt Park, Wakefield-241 St, Harlem-148 St"
export function directionLabel(routes: string[], dir: 'N' | 'S'): string {
  const destinations = routes
    .map((r) => TERMINUS_MAP[`${r}-${dir}`])
    .filter((d): d is string => !!d);

  // Deduplicate (some express variants share the same terminus)
  const unique = [...new Set(destinations)];

  if (!unique.length) return dir === 'N' ? 'Northbound' : 'Southbound';

  // Truncate long station names to keep labels compact
  return unique
    .map((d) => (d.length > 24 ? d.slice(0, 22) + '…' : d))
    .join(', ');
}
