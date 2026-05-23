import { fetchDepartures, fetchAlerts } from './api.js';
import { createLineBullet, getLineStyle } from './lines.js';
import { directionLabel } from './direction-label.js';
import type { AppConfig, Departure, SelectedStation, ServiceAlert } from './types.js';

const REFRESH_MS = 15_000;
const DEPART_ANIM_MS = 900; // text shows "Departed" then collapses

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
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

  const logo = document.createElement('img');
  logo.className = 'board-logo';
  logo.src = '/mta-logo.svg';
  logo.alt = 'MTA';

  const spacer = document.createElement('div');
  spacer.className = 'board-spacer';

  const configBtn = document.createElement('button');
  configBtn.className = 'btn-configure';
  configBtn.textContent = 'Configure';
  configBtn.addEventListener('click', () => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (tickTimer) clearInterval(tickTimer);
    onConfigure();
  });

  const clock = document.createElement('span');
  clock.className = 'board-clock';
  updateClock(clock);
  setInterval(() => updateClock(clock), 1000);

  topBar.appendChild(logo);
  topBar.appendChild(spacer);
  topBar.appendChild(configBtn);
  topBar.appendChild(clock);
  wrap.appendChild(topBar);

  const boardEl = document.createElement('div');
  boardEl.id = 'board-content';
  const colCount = Math.max(1, Math.min(config.stations.length, 4));
  boardEl.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;
  wrap.appendChild(boardEl);

  document.body.appendChild(wrap);

  refresh(config, boardEl);
  refreshTimer = setInterval(() => refresh(config, boardEl), REFRESH_MS);
  tickTimer = setInterval(tickTimes, 30_000);
}

function updateClock(el: HTMLElement): void {
  el.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
    const [{ departures, updatedAt }, alerts] = await Promise.all([
      fetchDepartures(stopIds),
      fetchAlerts(),
    ]);

    // Discard empty responses when we already have data — almost always a bad feed
    if (departures.length === 0 && prevKeys.size > 0) return;

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
      const stationAlerts = alerts.filter((a) =>
        a.routeIds.some((r) => station.selectedRoutes.includes(r)),
      );
      fragment.appendChild(renderStation(station, stationDeps, stationAlerts));
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
    if (isFirstLoad) {
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
}

function tickTimes(): void {
  const now = Math.floor(Date.now() / 1000);
  document.querySelectorAll<HTMLElement>('[data-departure-time]').forEach((row) => {
    if (row.classList.contains('row-departing')) return;
    const timeCell = row.querySelector<HTMLElement>('.dep-time');
    if (!timeCell || timeCell.classList.contains('departed-text')) return;
    const depTime = parseInt(row.dataset.departureTime!, 10);
    if (isNaN(depTime)) return;
    const minutesAway = Math.round((depTime - now) / 60);
    if (isNaN(minutesAway)) return;
    const isSoon = minutesAway <= 1;
    timeCell.className = `dep-time${isSoon ? ' due-soon' : ''}`;
    timeCell.textContent = isSoon ? 'Due' : `${minutesAway} min`;
  });
}

function renderStation(station: SelectedStation, departures: Departure[], alerts: ServiceAlert[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'station-section';

  const header = document.createElement('div');
  header.className = 'station-header';
  header.textContent = station.stationName;
  section.appendChild(header);

  for (const alert of alerts) {
    section.appendChild(renderAlertBanner(alert));
  }

  const maxRows = station.directions.length > 1 ? 5 : 10;
  for (const dir of station.directions) {
    const dirDeps = departures.filter((d) => d.direction === dir);
    const label = directionLabel(station.selectedRoutes, dir);
    section.appendChild(renderDirectionSubsection(label, dirDeps, maxRows));
  }

  return section;
}

function createAlertBullet(routeId: string): SVGSVGElement {
  const style = getLineStyle(routeId);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('viewBox', '0 0 22 22');
  svg.classList.add('alert-bullet');

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '11');
  circle.setAttribute('cy', '11');
  circle.setAttribute('r', '11');
  circle.setAttribute('fill', style.bg);

  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', '11');
  text.setAttribute('y', '11');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('fill', style.text);
  text.setAttribute('font-family', "Helvetica, 'Helvetica Neue', Arial, sans-serif");
  text.setAttribute('font-size', '13');
  text.setAttribute('font-weight', '700');
  text.textContent = style.label;

  svg.appendChild(circle);
  svg.appendChild(text);
  return svg;
}

function renderAlertBanner(alert: ServiceAlert): HTMLElement {
  const banner = document.createElement('div');
  const effectClass =
    alert.effect === 1 || alert.effect === 2
      ? 'alert-severe'
      : alert.effect === 3
      ? 'alert-delay'
      : 'alert-info';
  banner.className = `alert-banner ${effectClass}`;

  // Collapse any newlines/extra whitespace MTA embeds in alert text
  const header = alert.header.replace(/\s+/g, ' ').trim();

  // Replace [7], [A/C/E], [N] etc. with inline route bullets
  const regex = /\[([A-Z0-9/]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(header)) !== null) {
    if (match.index > lastIndex) {
      banner.appendChild(document.createTextNode(header.slice(lastIndex, match.index)));
    }
    for (const routeId of match[1].split('/')) {
      banner.appendChild(createAlertBullet(routeId.trim()));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < header.length) {
    banner.appendChild(document.createTextNode(header.slice(lastIndex)));
  }

  return banner;
}

function renderDirectionSubsection(label: string, departures: Departure[], maxRows: number): HTMLElement {
  const sub = document.createElement('div');
  sub.className = 'direction-subsection';

  const dirHeader = document.createElement('div');
  dirHeader.className = 'direction-header';
  dirHeader.textContent = label;
  sub.appendChild(dirHeader);

  sub.appendChild(renderDepTable(departures, maxRows));
  return sub;
}

function renderDepTable(departures: Departure[], maxRows: number = 12): HTMLElement {
  const container = document.createElement('div');


  const rowCount = Math.min(departures.length || 6, maxRows);
  if (!departures.length) {
    for (let i = 0; i < rowCount; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'dep-row dep-row-placeholder';
      container.appendChild(placeholder);
    }
    return container;
  }

  for (const dep of departures.slice(0, maxRows)) {
    container.appendChild(renderRow(dep));
  }

  return container;
}

function renderRow(dep: Departure): HTMLElement {
  const row = document.createElement('div');
  row.className = 'dep-row';
  row.dataset.key = depKey(dep);
  row.dataset.departureTime = String(dep.departureTime);

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
