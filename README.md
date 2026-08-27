# TramenAI — TramenAI

Multi-route railway traffic-control demo built with React + Vite.

## Included in this final build

- Four connected demo routes with 7 stations each:
  - R1 North: Ratnapur → Chandigarh Jn
  - R2 Central: Ratnapur → Chandigarh Jn via Suryanagar / Bhimgarh
  - R3 East: Ratnapur → Chandigarh Jn via Eshanpur / Fatehpur Road
  - R4 Express: Ratnapur → Chandigarh Jn via Bravpur / Dhanpur / Rajgarh / Sonapur
- Platform-aware digital twin with conflict detection and TramenAI resolution.
- Responsive map layout that keeps all stations and labels inside the map viewport, including fullscreen layouts.
- Firestore live updates with simulation fallback.
- Optional authorized live-train API adapter via `VITE_TRAIN_DATA_URL`.
- Optional RapidAPI-style train-status adapter via `VITE_RAPIDAPI_KEY`.
- Passenger, controller, copilot, complaints, optimizer, disruptions, crew/rake and analytics views.
- Dark control-room UI and multilingual support.

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

For linting:

```bash
npm run lint
```

## Live train feed (RailRadar)

LIVE mode's default data source is [RailRadar](https://railradar.in), a real Indian Railways tracking API.

1. Create a free RailRadar account and generate an API key (free sandbox tier: 1,000 requests/month).
2. In your Netlify site: **Site settings → Environment variables** → add `RAILRADAR_API_KEY` with that key. Do this on Netlify itself, not in a committed file — the key is read only by the serverless function at `netlify/functions/live-trains.js` and is never bundled into the frontend.
3. Deploy (or run `netlify dev` locally with the key in an untracked `.env`). The frontend automatically calls `/api/live-trains?train=<number>` — no extra `VITE_` variable is needed for RailRadar.
4. In the dashboard, switch the DEMO/LIVE toggle to LIVE. The app polls live status for a small, bounded set of trains (default 1, `VITE_MAX_LIVE_TRAINS`) on a 1-hour interval by default (`VITE_TRAIN_DATA_POLL_MS`) to stay well inside the free-tier monthly quota.

Because RailRadar reports real trains on real Indian Railways corridors and this app's map is a fictional demo network, live data updates status, delay, current/next station, and platform for the matching train IDs — it does not relocate the fictional map dot onto real GPS coordinates. See "Live train data" below for what a full geographic integration would require.

To use a different provider instead of RailRadar, set `TRAIN_DATA_URL` (and optionally `TRAIN_DATA_API_KEY`) as Netlify environment variables — this bypasses RailRadar entirely. Copy `.env.example` to `.env.local` for local reference; never commit a real API key.

The application always falls back to the built-in simulation when a live feed is not configured or is unavailable.

## Validation performed for this build

- Source delimiter integrity checked after the mode/map changes.
- The project remains installable with the included package.json/package-lock.json; run `npm install` before `npm run dev`.
- All 4 routes verified at 7 stations / 6 segments each.
- Every route's declared station sequence matches its segment sequence.
- Every segment endpoint references a valid station.
- Station coordinates and labels fit within the digital-twin SVG viewport.


## Map controls
The digital-twin map is interactive: drag to pan, use the mouse wheel/trackpad to zoom around the cursor, or use the + / − / reset controls. The map keeps its entire network inside the viewport and supports future route geometries without changing the interaction model.

## Live train data
The application is deliberately split into DEMO and LIVE data modes. DEMO mode uses the built-in multi-route simulation. LIVE mode uses the bundled RailRadar proxy by default. Never place a real secret in frontend source control.

A live backend should normalize each train to the schema consumed by `src/trainData.js`. For real geographic feeds, the backend should map latitude/longitude to the active route geometry and optionally provide `mapX`/`mapY` in the digital-twin viewBox. This lets the same frontend display real train positions without treating fictional demo stations as real railway infrastructure.

The dashboard explicitly distinguishes DEMO SIMULATION, LIVE DATA NOT CONNECTED, FIRESTORE FEED, and AUTHORIZED LIVE API.


## Data mode
The dashboard has an explicit **DEMO / LIVE** switch. DEMO uses the fictional multi-route simulation. LIVE intentionally hides simulated trains and waits for an authorized railway data source (Firestore feed or configured live API). The UI never labels demo trains as live Indian Railways data.

## Live mode — RailRadar

LIVE mode now separates real railway data from the fictional demo corridor.

- The map opens centered on real Delhi railway stations (NDLS, DLI, NZM, ANVT, DEE, DEC, SSB and SZM).
- Station search calls the RailRadar station autocomplete endpoint through the Netlify function, so searches return real station records rather than demo stations.
- Live train status is proxied through `/api/live-trains`; the API key stays server-side in `RAILRADAR_API_KEY`.
- The default live status poll is 60 minutes with one tracked train to stay within the free 1,000-request/month sandbox budget. Search requests are only made when the user searches.
- The demo corridor remains unchanged and is shown only in DEMO mode.

### Local setup

1. Rotate any API key that was previously exposed in a screenshot or uploaded `.env` file.
2. Put the new key in the local `.env` file as `RAILRADAR_API_KEY=...` when using `netlify dev`.
3. For Netlify deployment, add `RAILRADAR_API_KEY` under Site configuration → Environment variables.
4. Run the project with Netlify's local development server so `/api/live-trains` is available.

RailRadar's station search endpoint returns station code/name/city records; the API documentation does not return coordinates from that search response. TramenAI therefore uses verified coordinates for the initial Delhi hub set and adds searched stations to the map when coordinates are available from the live data layer.

## LIVE mode behavior
- Starts with a real Delhi / Delhi-NCR station locator set (about 40 stations).
- Station search queries the RailRadar station database.
- LIVE mode can track up to 3 discovered trains and uses a conservative 3-hour auto-refresh interval by default to stay within the free sandbox quota.
- Train markers fall back to the latest valid station/position when a telemetry payload temporarily omits GPS fields.
- When RailRadar provides route stop coordinates, the LIVE map draws the actual route geometry as a visual guide.

## Safe Disruption Simulator
The Disruptions tab can create temporary, UI-only operational stress scenarios (delay spike, track blockage, signal failure, platform closure). These are clearly labeled as simulation-only and are never sent to RailRadar or any railway control system.

## LIVE mode
- Starts around 40 real Delhi / Delhi-NCR stations.
- Station search uses RailRadar's real station database.
- LIVE mode tracks up to 3 discovered trains by default.
- Default automatic refresh is every 3 hours to keep free-tier usage bounded; adjust only if your plan allows more.
- Train markers preserve the last valid coordinates if a telemetry response temporarily omits GPS fields.
- RailRadar route stop coordinates are displayed as real route lines when available.

## Safe disruption simulator
The Disruptions tab can create temporary, UI-only operational stress scenarios (delay spike, track blockage, signal failure, platform closure). These are explicitly simulation-only and are never sent to RailRadar or a railway control system.

## LIVE map station spacing
The LIVE SVG uses one shared geographic projection for stations, railway/network geometry, live routes, and live train markers. A gentle cartographic spread is applied around the Delhi core so nearby stations are easier to distinguish while remaining aligned to the same projected network. Source coordinates are not modified.
