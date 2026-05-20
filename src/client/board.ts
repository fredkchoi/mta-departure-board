import { fetchDepartures } from './api.js';
import { createLineBullet } from './lines.js';
import type { AppConfig, Departure } from './types.js';

const REFRESH_MS = 15_000;
const DEPART_ANIM_MS = 900; // text shows "Departed" then collapses

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let prevKeys = new Set<string>();

function depKey(d: Departure): string {
  return `${d.tripId}:${d.stopId}`;
}

export function renderBoard(config: AppConfig, onConfigure: () => void): void {
  prevKeys = new Set();
  document.body.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'board-wrap';

  const topBar = document.createElement('div');
  topBar.className = 'board-topbar';

  const title = document.createElement('span');
  title.className = 'board-title';
  title.textContent = 'NYC Subway Departures Board';

  const clock = document.createElement('span');
  clock.className = 'board-clock';
  updateClock(clock);
  setInterval(() => updateClock(clock), 1000);

  const configBtn = document.createElement('button');
  configBtn.className = 'btn-configure';
  configBtn.textContent = 'Configure';
  configBtn.addEventListener('click', () => {
    if (refreshTimer) clearInterval(refreshTimer);
    onConfigure();
  });

  topBar.appendChild(title);
  topBar.appendChild(clock);
  topBar.appendChild(configBtn);
  wrap.appendChild(topBar);

  const boardEl = document.createElement('div');
  boardEl.id = 'board-content';
  wrap.appendChild(boardEl);

  document.body.appendChild(wrap);

  refresh(config, boardEl);
  refreshTimer = setInterval(() => refresh(config, boardEl), REFRESH_MS);
}

function updateClock(el: HTMLElement): void {
  el.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function refresh(config: AppConfig, boardEl: HTMLElement): Promise<void> {
  const stopIds: string[] = [];
  for (const station of config.stations) {
    for (const dir of station.directions) {
      stopIds.push(`${station.stationId}${dir}`);
    }
  }
  if (!stopIds.length) return;

  const isFirstLoad = boardEl.childElementCount === 0;
  if (isFirstLoad) {
    boardEl.innerHTML = '<div class="board-loading">Loading…</div>';
  }

  try {
    const { departures, updatedAt } = await fetchDepartures(stopIds);
    const newKeys = new Set(departures.map(depKey));

    // Animate out any rows that have left the departure list
    if (!isFirstLoad && prevKeys.size > 0) {
      const departedKeys = new Set([...prevKeys].filter((k) => !newKeys.has(k)));
      if (departedKeys.size > 0) {
        boardEl.querySelectorAll<HTMLElement>('[data-key]').forEach((row) => {
          if (departedKeys.has(row.dataset.key!)) animateDeparture(row);
        });
        await new Promise((r) => setTimeout(r, DEPART_ANIM_MS));
      }
    }

    const keysBeforeSwap = new Set(prevKeys);
    prevKeys = newKeys;

    if (isFirstLoad) boardEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (const station of config.stations) {
      const stationStopIds = new Set(
        station.directions.map((d) => `${station.stationId}${d}`),
      );
      const selectedRoutes = new Set(station.selectedRoutes);
      const stationDeps = departures.filter(
        (d) => stationStopIds.has(d.stopId) && selectedRoutes.has(d.line),
      );
      fragment.appendChild(renderStation(station.stationName, stationDeps));
    }

    const updatedEl = document.createElement('div');
    updatedEl.className = 'board-updated';
    updatedEl.textContent = `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    fragment.appendChild(updatedEl);

    boardEl.replaceChildren(fragment);

    // Animate in rows that weren't present before this refresh
    boardEl.querySelectorAll<HTMLElement>('[data-key]').forEach((row) => {
      if (!keysBeforeSwap.has(row.dataset.key!)) {
        row.classList.add('row-arriving');
      }
    });
  } catch {
    if (boardEl.childElementCount === 0) {
      boardEl.innerHTML =
        '<div class="board-error">Could not fetch departures. Retrying…</div>';
    }
  }
}

function animateDeparture(row: HTMLElement): void {
  const timeCell = row.querySelector<HTMLElement>('.dep-time');
  if (timeCell) {
    timeCell.textContent = 'Departed';
    timeCell.className = 'dep-time departed-text';
  }
  row.classList.add('row-departing');

  // Lock the current height, then collapse on the next frame
  setTimeout(() => {
    row.style.maxHeight = `${row.offsetHeight}px`;
    row.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      row.style.maxHeight = '0';
      row.style.paddingTop = '0';
      row.style.paddingBottom = '0';
      row.style.borderBottomWidth = '0';
    });
  }, 450);
}

function renderStation(name: string, departures: Departure[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'station-section';

  const header = document.createElement('div');
  header.className = 'station-header';
  header.textContent = name.toUpperCase();
  section.appendChild(header);

  const colHeaders = document.createElement('div');
  colHeaders.className = 'col-headers';
  colHeaders.innerHTML =
    '<span>Line</span><span class="col-dest">To</span><span class="col-time">Arrives</span>';
  section.appendChild(colHeaders);

  if (!departures.length) {
    const empty = document.createElement('div');
    empty.className = 'no-deps';
    empty.textContent = 'No upcoming departures';
    section.appendChild(empty);
    return section;
  }

  for (const dep of departures.slice(0, 8)) {
    section.appendChild(renderRow(dep));
  }

  return section;
}

function renderRow(dep: Departure): HTMLElement {
  const row = document.createElement('div');
  row.className = 'dep-row';
  row.dataset.key = depKey(dep);

  const bulletCell = document.createElement('div');
  bulletCell.className = 'dep-bullet';
  bulletCell.appendChild(createLineBullet(dep.line));

  const destCell = document.createElement('div');
  destCell.className = 'dep-dest';
  destCell.textContent = dep.destination;

  const timeCell = document.createElement('div');
  const isSoon = dep.minutesAway <= 1;
  timeCell.className = `dep-time${isSoon ? ' due-soon' : ''}`;
  timeCell.textContent = isSoon ? 'Due' : `${dep.minutesAway} min`;

  row.appendChild(bulletCell);
  row.appendChild(destCell);
  row.appendChild(timeCell);

  return row;
}
