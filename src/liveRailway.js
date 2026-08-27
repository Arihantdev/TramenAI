/* TramenAI live railway adapter. All provider requests go through the
 * Netlify function so the RailRadar API key never reaches the browser. */

const DEFAULT_URL = "/api/live-trains";

export async function searchLiveStations(query, signal) {
  const q = String(query || "").trim();
  if (!q) return [];
  const url = `${import.meta.env.VITE_TRAIN_DATA_URL || DEFAULT_URL}?action=stations&q=${encodeURIComponent(q)}&limit=10`;
  const response = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Station search failed (HTTP ${response.status})`);
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export function stationKey(station) {
  return String(station?.code || station?.id || station?.name || "").trim().toUpperCase();
}

export function withStationCoordinates(station, coordinates = {}) {
  const key = stationKey(station);
  const point = coordinates[key];
  return point ? { ...station, lat: point.lat, lng: point.lng, coordinatesSource: "verified-hub" } : station;
}
