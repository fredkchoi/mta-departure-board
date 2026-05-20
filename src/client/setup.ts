import { searchStations } from './api.js';
import { saveConfig } from './storage.js';
import { createLineBullet, displayRoutes } from './lines.js';
import { directionLabel } from './direction-label.js';
import type { StationInfo, SelectedStation, AppConfig } from './types.js';

let searchTimeout: ReturnType<typeof setTimeout> | null = null;
let selectedStations: SelectedStation[] = [];

export function renderSetup(onDone: () => void, initial?: AppConfig): void {
  selectedStations = initial ? [...initial.stations] : [];
  document.body.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'setup-wrap';

  wrap.innerHTML = `
    <header class="setup-header">
      <h1 class="logo">NYC Subway<br>Departure Board</h1>
      <p class="subtitle">Choose the stations and lines you want to track.</p>
    </header>
    <section class="search-section">
      <label class="field-label" for="station-search">Search station</label>
      <input id="station-search" class="search-input" type="text" placeholder="e.g. Union Square, Atlantic Av…" autocomplete="off" />
      <div id="search-results" class="search-results hidden"></div>
    </section>
    <section id="selected-section" class="selected-section hidden">
      <h2 class="section-title">Selected stations</h2>
      <div id="selected-list"></div>
    </section>
    <div class="setup-footer">
      <button id="view-board-btn" class="btn-primary" disabled>View Board</button>
    </div>
  `;

  document.body.appendChild(wrap);

  const input = document.getElementById('station-search') as HTMLInputElement;
  const resultsEl = document.getElementById('search-results')!;
  const viewBtn = document.getElementById('view-board-btn') as HTMLButtonElement;

  input.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (!q) {
      resultsEl.classList.add('hidden');
      return;
    }
    searchTimeout = setTimeout(() => runSearch(q, resultsEl), 250);
  });

  viewBtn.addEventListener('click', () => {
    const cfg: AppConfig = { stations: [...selectedStations] };
    saveConfig(cfg);
    onDone();
  });

  // Pre-populate if editing existing config
  if (selectedStations.length) {
    renderSelectedList();
  }
  updateViewButton(viewBtn);
}

async function runSearch(q: string, container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="search-loading">Searching…</div>';
  container.classList.remove('hidden');

  try {
    const results = await searchStations(q);
    renderResults(results, container);
  } catch {
    container.innerHTML = '<div class="search-error">Search failed. Is the server running?</div>';
  }
}

function renderResults(stations: StationInfo[], container: HTMLElement): void {
  if (!stations.length) {
    container.innerHTML = '<div class="search-empty">No stations found.</div>';
    return;
  }

  container.innerHTML = '';
  for (const station of stations) {
    const row = document.createElement('button');
    row.className = 'result-row';
    row.dataset.id = station.id;

    const nameEl = document.createElement('span');
    nameEl.className = 'result-name';
    nameEl.textContent = station.name;

    const pillsEl = document.createElement('span');
    pillsEl.className = 'result-pills';
    for (const route of displayRoutes(station.routes)) {
      pillsEl.appendChild(createLineBullet(route));
    }

    const addEl = document.createElement('span');
    addEl.className = 'result-add';
    addEl.textContent = '+';

    row.appendChild(nameEl);
    row.appendChild(pillsEl);
    row.appendChild(addEl);

    row.addEventListener('click', () => addStation(station));
    container.appendChild(row);
  }
}

function addStation(station: StationInfo): void {
  if (selectedStations.some((s) => s.stationId === station.id)) return;

  selectedStations.push({
    stationId: station.id,
    stationName: station.name,
    allRoutes: station.routes,
    selectedRoutes: [...station.routes],
    directions: ['N', 'S'],
  });

  const input = document.getElementById('station-search') as HTMLInputElement;
  const resultsEl = document.getElementById('search-results')!;
  input.value = '';
  resultsEl.classList.add('hidden');

  renderSelectedList();
  updateViewButton(document.getElementById('view-board-btn') as HTMLButtonElement);
}

function removeStation(stationId: string): void {
  const idx = selectedStations.findIndex((s) => s.stationId === stationId);
  if (idx !== -1) selectedStations.splice(idx, 1);
  renderSelectedList();
  updateViewButton(document.getElementById('view-board-btn') as HTMLButtonElement);
}

function renderSelectedList(): void {
  const section = document.getElementById('selected-section')!;
  const list = document.getElementById('selected-list')!;
  list.innerHTML = '';

  if (!selectedStations.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  for (const station of selectedStations) {
    const card = buildStationCard(station);
    list.appendChild(card);
  }
}

function buildStationCard(station: SelectedStation): HTMLElement {
  const card = document.createElement('div');
  card.className = 'station-card';

  // Header row
  const header = document.createElement('div');
  header.className = 'card-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'card-name';
  nameEl.textContent = station.stationName;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-remove';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => removeStation(station.stationId));

  header.appendChild(nameEl);
  header.appendChild(removeBtn);
  card.appendChild(header);

  // Direction toggles
  const dirRow = document.createElement('div');
  dirRow.className = 'card-row';

  const dirLabel = document.createElement('span');
  dirLabel.className = 'card-label';
  dirLabel.textContent = 'Directions';
  dirRow.appendChild(dirLabel);

  for (const dir of ['N', 'S'] as const) {
    const lbl = document.createElement('label');
    lbl.className = 'toggle-label';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = station.directions.includes(dir);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!station.directions.includes(dir)) station.directions.push(dir);
      } else {
        station.directions = station.directions.filter((d) => d !== dir);
      }
    });

    const arrow = document.createElement('span');
    arrow.className = 'dir-arrow';
    arrow.textContent = dir === 'N' ? '↑' : '↓';

    const dest = document.createElement('span');
    dest.className = 'dir-dest';
    dest.textContent = directionLabel(station.allRoutes, dir);

    lbl.appendChild(cb);
    lbl.appendChild(arrow);
    lbl.appendChild(dest);
    dirRow.appendChild(lbl);
  }
  card.appendChild(dirRow);

  // Route toggles
  const routeRow = document.createElement('div');
  routeRow.className = 'card-row';

  const routeLabel = document.createElement('span');
  routeLabel.className = 'card-label';
  routeLabel.textContent = 'Lines';
  routeRow.appendChild(routeLabel);

  const pills = document.createElement('div');
  pills.className = 'route-pills';

  for (const route of displayRoutes(station.allRoutes)) {
    // Find all route IDs that map to this display label (e.g., '6' covers '6' and '6X')
    const matchingRoutes = station.allRoutes.filter(
      (r) => r === route || r === route + 'X',
    );

    const pill = createLineBullet(route);
    pill.classList.add('route-toggle');
    const isSelected = matchingRoutes.some((r) => station.selectedRoutes.includes(r));
    if (!isSelected) pill.classList.add('route-off');

    pill.addEventListener('click', () => {
      const anySelected = matchingRoutes.some((r) => station.selectedRoutes.includes(r));
      if (anySelected) {
        station.selectedRoutes = station.selectedRoutes.filter(
          (r) => !matchingRoutes.includes(r),
        );
        pill.classList.add('route-off');
      } else {
        for (const r of matchingRoutes) {
          if (!station.selectedRoutes.includes(r)) station.selectedRoutes.push(r);
        }
        pill.classList.remove('route-off');
      }
    });

    pills.appendChild(pill);
  }

  routeRow.appendChild(pills);
  card.appendChild(routeRow);

  return card;
}

function updateViewButton(btn: HTMLButtonElement): void {
  btn.disabled = selectedStations.length === 0;
}
