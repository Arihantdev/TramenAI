// Server-side RailRadar proxy. The API key is read only from Netlify
// environment variables and is never bundled into the React application.
const RAILRADAR_BASE = "https://api.railradar.in/v1";

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "public, max-age=30", ...extraHeaders },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const railradarKey = process.env.RAILRADAR_API_KEY;
  if (!railradarKey) {
    return json(503, { ok: false, mode: "LIVE_UNAVAILABLE", message: "RAILRADAR_API_KEY is not configured on the server." });
  }

  const params = event.queryStringParameters || {};
  const action = String(params.action || "train").toLowerCase();
  const headers = { accept: "application/json", authorization: `Bearer ${railradarKey}` };
  let upstream;

  try {
    if (action === "station-live") {
      const station = String(params.station || "NDLS").trim().toUpperCase();
      const hours = [2, 4, 6, 8].includes(Number(params.hours)) ? Number(params.hours) : 4;
      upstream = new URL(`${RAILRADAR_BASE}/stations/${encodeURIComponent(station)}/live`);
      upstream.searchParams.set("hours", String(hours));
      upstream.searchParams.set("includeIntermediate", params.includeIntermediate === "true" ? "true" : "false");
    } else if (action === "geocode") {
      const q = String(params.q || "").trim();
      if (!q) return json(400, { ok: false, message: "Station name is required." });
      upstream = new URL("https://nominatim.openstreetmap.org/search");
      upstream.searchParams.set("q", q);
      upstream.searchParams.set("format", "jsonv2");
      upstream.searchParams.set("limit", "1");
    } else if (action === "stations") {
      const q = String(params.q || "").trim();
      if (!q) return json(400, { ok: false, message: "Enter a station name or code." });
      const limit = [5, 10, 20, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
      upstream = new URL(`${RAILRADAR_BASE}/lookup/search/stations`);
      upstream.searchParams.set("q", q);
      upstream.searchParams.set("limit", String(limit));
    } else if (action === "ncr-network") {
      upstream = new URL("https://bharatnetprogress.nic.in/nicclouddb/rest/services/NCR/NCR_Geo_Portal_23_01_2025/MapServer/54/query");
      upstream.searchParams.set("where", "1=1");
      upstream.searchParams.set("outFields", "*");
      upstream.searchParams.set("f", "geojson");
      upstream.searchParams.set("outSR", "4326");
      upstream.searchParams.set("geometry", "76.70,28.10,77.70,29.10");
      upstream.searchParams.set("geometryType", "esriGeometryEnvelope");
      upstream.searchParams.set("inSR", "4326");
      upstream.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      upstream.searchParams.set("returnGeometry", "true");
      upstream.searchParams.set("resultRecordCount", "1000");
    } else if (action === "route") {
      const train = String(params.train || "").trim();
      if (!train) return json(400, { ok: false, message: "Train number is required." });
      upstream = new URL(`${RAILRADAR_BASE}/trains/${encodeURIComponent(train)}/route`);
      upstream.searchParams.set("format", "geojson");
      upstream.searchParams.set("stops", "true");
    } else {
      const train = String(params.train || "").trim();
      if (!train) return json(400, { ok: false, message: "Train number is required." });
      upstream = new URL(`${RAILRADAR_BASE}/trains/${encodeURIComponent(train)}/live`);
      if (params.authoritative === "true") upstream.searchParams.set("authoritative", "true");
      upstream.searchParams.set("includeCoordinates", "true");
      // Include actual GIS track geometry so LIVE mode can draw real rail corridors.
      upstream.searchParams.set("geometry", "true");
      upstream.searchParams.set("format", "geojson");
    }

    const response = await fetch(upstream, {
      headers: action === "geocode"
        ? { accept: "application/json", "user-agent": "TramenAI/1.0 (live railway station map)" }
        : headers,
    });
    const text = await response.text();
    if (action === "geocode") {
      let rows = [];
      try { rows = JSON.parse(text); } catch { rows = []; }
      const first = Array.isArray(rows) ? rows[0] : null;
      return json(response.status, {
        success: response.ok,
        data: first ? { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name } : null,
      });
    }
    return {
      statusCode: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "cache-control": action === "stations" ? "public, max-age=300" : action === "ncr-network" ? "public, max-age=900" : "public, max-age=60",
      },
      body: text,
    };
  } catch (error) {
    return json(502, { ok: false, mode: "LIVE_UNAVAILABLE", message: error instanceof Error ? error.message : "RailRadar unavailable" });
  }
};
