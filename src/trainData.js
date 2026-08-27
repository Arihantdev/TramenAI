/*
 * TramenAI — live train data adapter
 *
 * The UI can consume live operational records from:
 *   1) Firebase/Firestore `train` documents (already wired in App.jsx)
 *   2) An authorized JSON endpoint configured as VITE_TRAIN_DATA_URL
 *
 * No public scraping or unofficial railway feed is bundled here. If no live
 * source is configured, TramenAI stays in its clearly-labelled simulation mode.
 */

const pick = (obj, keys, fallback = undefined) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") return obj[key];
  }
  return fallback;
};

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeLiveTrainRecord(raw) {
  const typeRaw = String(pick(raw, ["type", "trainType", "category"], "Express"));
  const typeMap = {
    superfast: "Superfast",
    express: "Express",
    passenger: "Passenger",
    freight: "Freight",
    goods: "Freight",
    "oil tanker": "Oil Tanker",
    tanker: "Oil Tanker",
  };

  return {
    id: String(pick(raw, ["id", "trainId", "trainNumber", "trainNo"], "")),
    name: pick(raw, ["name", "trainName", "serviceName"], "LIVE SERVICE"),
    type: typeMap[typeRaw.toLowerCase()] || typeRaw,
    status: String(pick(raw, ["status", "operationalStatus"], "MOVING")).toUpperCase(),
    delay: toNumber(pick(raw, ["delay", "delayMinutes", "lateBy"], 0), 0),
    seg: toNumber(pick(raw, ["seg", "segment", "segmentIndex"], 0), 0),
    prog: toNumber(pick(raw, ["prog", "progress", "segmentProgress"], 0), 0),
    dir: pick(raw, ["dir", "direction"], "down"),
    load: toNumber(pick(raw, ["load", "passengers", "passengerLoad"], 0), 0),
    from: pick(raw, ["from", "origin", "source"], undefined),
    to: pick(raw, ["to", "destination"], undefined),
    platform: pick(raw, ["platform"], undefined),
    platformPlan: pick(raw, ["platformPlan"], undefined),
    // Optional map-matched coordinates in the RailFlow digital-twin viewBox.
    // A backend can populate these after converting real lat/lon to the active route geometry.
    mapX: toNumber(pick(raw, ["mapX", "x"], undefined), undefined),
    mapY: toNumber(pick(raw, ["mapY", "y"], undefined), undefined),
    latitude: toNumber(pick(raw, ["latitude", "lat"], undefined), undefined),
    longitude: toNumber(pick(raw, ["longitude", "lon", "lng"], undefined), undefined),
    currentStation: pick(raw, ["currentStation", "current_station"], undefined),
    nextStation: pick(raw, ["nextStation", "next_station"], undefined),
    lastUpdate: pick(raw, ["lastUpdate", "last_update", "updatedAt"], undefined),
  };
}

export function normalizeLiveTrainRecords(records = []) {
  return records
    .map(normalizeLiveTrainRecord)
    .filter((record) => record.id);
}


// RailRadar (https://railradar.in) — GET /v1/trains/{number}/live
// Response shape: { success, data: { trainNumber, trainName, status,
//   delayMinutes, train: { name, category, source, destination }, ... } }
const RAILRADAR_STATUS_MAP = {
  running: "MOVING",
  "not-started": "SCHEDULED",
  completed: "ARRIVED",
  cancelled: "CANCELLED",
};

export function normalizeRailRadarLiveTrain(raw) {
  if (!raw?.success || !raw?.data) return null;
  const d = raw.data;
  const cur = d.currentLocation || {};
  const prevHalt = d.previousHalt || {};
  const nextHalt = d.nextHalt || {};
  const route = Array.isArray(d.route) ? d.route : [];
  const geometryCoordinates = d?.geojson?.geometry?.type === "LineString" && Array.isArray(d.geojson.geometry.coordinates)
    ? d.geojson.geometry.coordinates
    : d?.geometry?.type === "LineString" && Array.isArray(d.geometry.coordinates)
      ? d.geometry.coordinates
      : d?.routeGeometry?.type === "LineString" && Array.isArray(d.routeGeometry.coordinates)
        ? d.routeGeometry.coordinates
        : [];
  const geometryPoints = geometryCoordinates
    .map((pair) => ({ lng: Number(pair?.[0]), lat: Number(pair?.[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const routeAtCurrent = route.find((r) => Number(r.sequence) === Number(cur.sequence)) ||
    route.find((r) => String(r.stationCode || r.code || "").toUpperCase() === String(cur.stationCode || "").toUpperCase());
  const currentIndex = routeAtCurrent ? route.indexOf(routeAtCurrent) : -1;
  const nextRouteStop = currentIndex >= 0 ? route[currentIndex + 1] : undefined;
  const previousRouteStop = currentIndex > 0 ? route[currentIndex - 1] : undefined;
  let latitude = toNumber(routeAtCurrent?.lat, undefined);
  let longitude = toNumber(routeAtCurrent?.lng, undefined);
  if (!Number.isFinite(latitude)) latitude = toNumber(cur.lat ?? prevHalt.lat ?? nextHalt.lat, undefined);
  if (!Number.isFinite(longitude)) longitude = toNumber(cur.lng ?? prevHalt.lng ?? nextHalt.lng, undefined);
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(nextRouteStop?.lat) && Number.isFinite(nextRouteStop?.lng)) {
    const progress = Math.min(1, Math.max(0, toNumber(cur.segmentProgress, 0)));
    latitude += (Number(nextRouteStop.lat) - latitude) * progress;
    longitude += (Number(nextRouteStop.lng) - longitude) * progress;
  }

  const statusKey = String(d.status || "").toLowerCase();

  return {
    id: String(d.trainNumber ?? ""),
    name: d.trainName || d.train?.name || "LIVE SERVICE",
    type: d.train?.category || d.train?.type || "Express",
    status: RAILRADAR_STATUS_MAP[statusKey] || (statusKey ? statusKey.toUpperCase() : "MOVING"),
    delay: toNumber(d.delayMinutes, 0),
    from: d.train?.source?.name,
    to: d.train?.destination?.name,
    currentStation: cur.stationCode,
    currentStationName: prevHalt.stationName,
    nextStation: nextHalt.stationCode,
    nextStationName: nextHalt.stationName,
    platform: routeAtCurrent?.platform || undefined,
    segmentProgress: toNumber(cur.segmentProgress, undefined),
    // RailRadar can expose either live telemetry speed or the provider's
    // route speed-to-next-stop. Both are provider data and are safe for
    // smooth client-side interpolation between live snapshots.
    speedKmh: toNumber(cur.speedKmh, toNumber(routeAtCurrent?.speedToNextStationKmph, undefined)),
    isDiverted: Boolean(cur.isDiverted),
    lastUpdate: d.lastUpdatedAt,
    latitude,
    longitude,
    bearingDegrees: toNumber(cur.bearingDegrees, undefined),
    // Prefer dense GIS geometry; fall back to station-stop coordinates if geometry
    // is temporarily unavailable. RailRadar returns GeoJSON as [lng, lat].
    routePoints: geometryPoints.length > 1
      ? geometryPoints.map((p) => ({ lat: p.lat, lng: p.lng }))
      : route
        .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)))
        .map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), stationCode: r.stationCode || r.code, name: r.stationName || r.name }))
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)),
    routeStops: route
      .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)))
      .map((r) => ({ code: r.stationCode || r.code, name: r.stationName || r.name, lat: Number(r.lat), lng: Number(r.lng), sequence: r.sequence }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)),
  };
}

export function normalizeIrctcLiveTrain(raw) {
  if (!raw?.success || !raw?.data) return null;
  const d = raw.data;
  const currentStop = Array.isArray(d.stations)
    ? d.stations.find((s) => s?.station_name === d.current_station)
    : null;
  const delay = currentStop?.arrival_delay_minutes ?? currentStop?.departure_delay_minutes ?? 0;
  const stations = Array.isArray(d.stations) ? d.stations : [];
  return {
    id: String(d.train_no ?? ""),
    name: d.train_name || "LIVE SERVICE",
    status: /on time/i.test(String(d.position || "")) ? "ON TIME" : "DELAYED",
    delay: Number(delay) || 0,
    from: d.from_station,
    to: stations.length ? stations[stations.length - 1]?.station_name : undefined,
    currentStation: d.current_station,
    nextStation: d.next_station,
    lastUpdate: d.last_update,
    platform: currentStop?.platform,
  };
}

export function normalizeRailRadarStationBoard(raw, stationLookup = {}) {
  if (!raw?.success || !raw?.data) return [];
  const rows = Array.isArray(raw.data.trains) ? raw.data.trains : [];
  return rows.slice(0, 6).map((row) => {
    const train = row?.train || {};
    const live = row?.live || {};
    const code = String(raw.data?.station?.code || "").toUpperCase();
    const point = stationLookup[code];
    const status = String(live.type || "scheduled").toUpperCase().replace(/-/g, "_");
    return {
      id: String(train.number || ""),
      name: train.name || "LIVE SERVICE",
      type: train.type || "Express",
      status: status === "AT_STATION" ? "DWELLING" : status === "UPCOMING" ? "SCHEDULED" : status === "DEPARTED" ? "MOVING" : "SCHEDULED",
      delay: Number(live.delayMinutes) || 0,
      platform: live.platform,
      currentStation: code,
      currentStationName: raw.data?.station?.name,
      from: train.source?.name || train.source,
      to: train.destination?.name || train.destination,
      latitude: point?.lat,
      longitude: point?.lng,
      lastUpdate: live.expectedDepartureTime || undefined,
      speedKmh: undefined,
    };
  }).filter((t) => t.id);
}

export function normalizeRailRadarRoute(raw) {
  if (!raw?.success || !raw?.data) return null;
  const d = raw.data;
  const coords = d?.geojson?.geometry?.type === "LineString" && Array.isArray(d.geojson.geometry.coordinates)
    ? d.geojson.geometry.coordinates
    : [];
  const routePoints = coords.map((pair) => ({ lng: Number(pair?.[0]), lat: Number(pair?.[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const routeStops = Array.isArray(d.stops)
    ? d.stops.map((stop) => ({
        code: stop.code || stop.stationCode,
        name: stop.name || stop.stationName,
        lat: Number(stop.lat),
        lng: Number(stop.lng),
        sequence: Number(stop.sequence),
      })).filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
    : [];
  return { routePoints, routeStops };
}
