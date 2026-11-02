import { getWeather } from '../server/weather.js'

// /api/weather?lat=33.5&lon=126.5
export default async function handler(req, res) {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat, lon 이 필요해요' })
  }
  try {
    res.status(200).json(await getWeather({ lat, lon }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
