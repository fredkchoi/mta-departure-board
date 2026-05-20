import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { loadStations, searchStations } from './stations.js';
import { getDepartures } from './mta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

loadStations();

// Serve the built client
const clientDir = path.join(__dirname, '../../dist/client');
app.use(express.static(clientDir));

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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(config.port, () => {
  console.log(`MTA Departure Board → http://localhost:${config.port}`);
});
