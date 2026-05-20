import { loadConfig } from './storage.js';
import { renderSetup } from './setup.js';
import { renderBoard } from './board.js';

function navigate(): void {
  const config = loadConfig();
  if (config && config.stations.length > 0) {
    renderBoard(config, () => renderSetup(() => navigate(), config));
  } else {
    renderSetup(() => navigate());
  }
}

navigate();
