import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const RAILRADAR_BASE = 'https://api.railradar.in/v1'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const key = env.RAILRADAR_API_KEY

  return {
    plugins: [
      react(),
      {
        name: 'tramenai-local-live-api',
        configureServer(server) {
          server.middlewares.use('/api/live-trains', async (req, res) => {
            if (!key) {
              res.statusCode = 503
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, message: 'RAILRADAR_API_KEY is missing from the local .env file.' }))
              return
            }
            try {
              const requestUrl = new URL(req.url || '/', 'http://localhost')
              const action = String(requestUrl.searchParams.get('action') || 'train').toLowerCase()
              const headers = { accept: 'application/json', authorization: `Bearer ${key}` }
              let upstream

              if (action === 'station-live') {
                const station = String(requestUrl.searchParams.get('station') || 'NDLS').trim().toUpperCase()
                upstream = new URL(`${RAILRADAR_BASE}/stations/${encodeURIComponent(station)}/live`)
                upstream.searchParams.set('hours', requestUrl.searchParams.get('hours') || '4')
                upstream.searchParams.set('includeIntermediate', 'false')
              } else if (action === 'geocode') {
                const q = String(requestUrl.searchParams.get('q') || '').trim()
                upstream = new URL('https://nominatim.openstreetmap.org/search')
                upstream.searchParams.set('q', q)
                upstream.searchParams.set('format', 'jsonv2')
                upstream.searchParams.set('limit', '1')
              } else if (action === 'stations') {
                const q = String(requestUrl.searchParams.get('q') || '').trim()
                upstream = new URL(`${RAILRADAR_BASE}/lookup/search/stations`)
                upstream.searchParams.set('q', q)
                upstream.searchParams.set('limit', requestUrl.searchParams.get('limit') || '10')
              } else if (action === 'ncr-network') {
                upstream = new URL('https://bharatnetprogress.nic.in/nicclouddb/rest/services/NCR/NCR_Geo_Portal_23_01_2025/MapServer/54/query')
                upstream.searchParams.set('where', '1=1')
                upstream.searchParams.set('outFields', '*')
                upstream.searchParams.set('f', 'geojson')
                upstream.searchParams.set('outSR', '4326')
                upstream.searchParams.set('geometry', '76.70,28.10,77.70,29.10')
                upstream.searchParams.set('geometryType', 'esriGeometryEnvelope')
                upstream.searchParams.set('inSR', '4326')
                upstream.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
                upstream.searchParams.set('returnGeometry', 'true')
                upstream.searchParams.set('resultRecordCount', '1000')
              } else {
                const train = String(requestUrl.searchParams.get('train') || '').trim()
                upstream = new URL(`${RAILRADAR_BASE}/trains/${encodeURIComponent(train)}/live`)
                upstream.searchParams.set('includeCoordinates', 'true')
                upstream.searchParams.set('geometry', 'true')
              }

              const upstreamResponse = await fetch(upstream, {
                headers: action === 'geocode'
                  ? { accept: 'application/json', 'user-agent': 'TramenAI/1.0 (live railway station map)' }
                  : headers,
              })
              const text = await upstreamResponse.text()
              res.statusCode = upstreamResponse.status
              res.setHeader('content-type', 'application/json')
              if (action === 'geocode') {
                let rows = []
                try { rows = JSON.parse(text) } catch { rows = [] }
                const first = Array.isArray(rows) ? rows[0] : null
                res.end(JSON.stringify({ success: upstreamResponse.ok, data: first ? { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name } : null }))
              } else {
                res.end(text)
              }
            } catch (error) {
              res.statusCode = 502
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : 'Live API unavailable' }))
            }
          })
        },
      },
    ],
  }
})
