import { getObserved } from '../server/observed.js'

// /api/observed?date=2026-11-01&lat=33.5&lon=126.5  — 지난 날짜의 관측 날씨
export default async function handler(req, res) {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  const date = String(req.query.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'date(YYYY-MM-DD), lat, lon 이 필요해요' })
  }
  try {
    res.status(200).json(await getObserved({ date, lat, lon }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
