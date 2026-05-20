# NYC Subway Departure Board

A real-time MTA subway departure board for Raspberry Pi (or any machine). Open it in a browser to see upcoming trains before you leave the house.

**No API key required** — the MTA's GTFS-Realtime feeds are freely accessible.

## Setup

```bash
npm install
cp .env.example .env
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

### Production (Raspberry Pi)

```bash
npm run build
npm start
```

Opens at `http://localhost:3000`. To auto-launch on boot, add `npm start` to your Pi's startup script or a systemd service.

## Usage

1. Open the URL in a browser
2. Search for your station(s) by name
3. Toggle which lines and directions (Uptown/Downtown) to track
4. Click **View Board** — your config is saved in the browser and persists across reloads
5. The board auto-refreshes every 30 seconds
6. Click **Configure** to change stations at any time

## Project structure

```
src/
  server/       Express API + GTFS-RT parsing
  client/       TypeScript frontend (Vite)
  data/         Pre-built station list from MTA static GTFS
```

## Updating station data

The `src/data/stations.json` file was generated from the MTA's static GTFS feed. To refresh it (e.g., when new stations open):

```bash
npm run generate-stations
```

(This script will be added in a future update.)
