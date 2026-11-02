// 지난 날짜의 관측 날씨 — 기상청 지상(종관, ASOS) 시간자료 조회서비스
// 관측소 단위(동네 단위가 아님)이고, 어제까지의 자료만 제공됩니다.
import { callApi } from './weather.js'

const ASOS_URL = 'http://apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList'

// 제주의 종관(ASOS) 관측소 4곳. 가까운 곳의 값을 씁니다 (추자도처럼 먼 곳은 제주로).
const STATIONS = [
  { id: '184', name: '제주', lat: 33.514, lon: 126.530 },
  { id: '185', name: '고산', lat: 33.294, lon: 126.163 },
  { id: '188', name: '성산', lat: 33.387, lon: 126.880 },
  { id: '189', name: '서귀포', lat: 33.246, lon: 126.565 },
]

function nearestStation(lat, lon) {
  const d = (s) => (s.lat - lat) ** 2 + ((s.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2
  return STATIONS.reduce((a, b) => (d(b) < d(a) ? b : a))
}

// 전운량(0~10) → 하늘 상태: 0~5 맑음, 6~8 구름많음, 9~10 흐림 (기상청 구분과 같음)
const skyOf = (cloud) => (cloud <= 5 ? '맑음' : cloud <= 8 ? '구름많음' : '흐림')

// 값이 빈 칸("")이면 NaN 대신 null
const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))

// 시간 자료 몇 칸을 한 줄로 요약 (오전 또는 오후)
function summarize(hs) {
  if (!hs.length) return null
  const temps = hs.map((h) => h.temp).filter((t) => t !== null)
  const wet = hs.find((h) => h.rain !== '없음')
  return {
    sky: hs[Math.floor(hs.length / 2)].sky,
    rain: wet ? wet.rain : '없음',
    min: Math.min(...temps),
    max: Math.max(...temps),
  }
}

// date: "2026-11-01" → { station, min, max, sky, rain, wind, am, pm }
export async function getObserved({ date, lat, lon }) {
  if (!process.env.DATA_GO_KR_KEY) throw new Error('서버에 DATA_GO_KR_KEY 가 설정되지 않았어요')
  const ymd = date.replaceAll('-', '')
  const station = nearestStation(lat, lon)

  const items = await callApi(ASOS_URL, {
    pageNo: '1', numOfRows: '30', dataCd: 'ASOS', dateCd: 'HR',
    startDt: ymd, startHh: '00', endDt: ymd, endHh: '23', stnIds: station.id,
  })
  const hours = items
    .map((it) => {
      const snow = num(it.dsnw) > 0
      const rain = num(it.rn) > 0
      return {
        hour: Number(it.tm.slice(11, 13)),
        temp: num(it.ta),
        wind: num(it.ws),
        rain: snow ? '눈' : rain ? '비' : '없음',
        sky: skyOf(num(it.dc10Tca) ?? 0),
      }
    })
    .filter((h) => h.temp !== null)
  if (!hours.length) throw new Error('그날의 관측 자료가 없어요')

  const temps = hours.map((h) => h.temp)
  const winds = hours.map((h) => h.wind).filter((w) => w !== null)
  const wet = hours.find((h) => h.rain !== '없음')
  return {
    station: station.name,
    min: Math.min(...temps),
    max: Math.max(...temps),
    sky: hours.find((h) => h.hour === 12)?.sky ?? hours[Math.floor(hours.length / 2)].sky,
    rain: wet ? wet.rain : '없음',
    wind: winds.length ? Math.max(...winds) : null,
    am: summarize(hours.filter((h) => h.hour < 12)),
    pm: summarize(hours.filter((h) => h.hour >= 12)),
  }
}
