import express from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { loadStations, searchStations } from './stations.js';
import { getDepartures, getAlerts } from './mta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

loadStations();

const clientDir = path.join(__dirname, '../../dist/client');
const hasBuiltClient = existsSync(path.join(clientDir, 'index.html'));

if (hasBuiltClient) {
  app.use(express.static(clientDir));
}

app.get('/api/stations/search', (req, res) => {
  const q = String(req.query.q ?? '');
  res.json(searchStations(q));
});

app.get('/api/departures', async (req, res) => {
  const stopIds = String(req.query.stops ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!stopIds.length) {
    res.status(400).json({ error: 'stops parameter is required' });
    return;
  }

  try {
    const departures = await getDepartures(stopIds);
    res.json({ departures, updatedAt: Date.now() });
  } catch (err) {
    console.error('Error fetching departures:', err);
    res.status(500).json({ error: 'Failed to fetch departures' });
  }
});

app.get('/api/alerts', async (_req, res) => {
  try {
    const alerts = await getAlerts();
    res.json({ alerts });
  } catch {
    res.json({ alerts: [] });
  }
});

if (hasBuiltClient) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`MTA Departure Board → http://localhost:${config.port}`);
});
