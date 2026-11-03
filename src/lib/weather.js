// 날씨 화면에서 함께 쓰는 작은 도우미 함수들

// 하늘/강수 상태 → 아이콘 이름 (bootstrap-icons)
// sky 는 "맑음"처럼 짧은 값뿐 아니라 중기예보의 "구름많고 비" 같은 문구도 올 수 있습니다.
export function iconOf({ sky, rain }) {
  if (rain.includes('눈')) return 'cloud-snow'
  if (rain !== '없음') return 'cloud-rain'
  if (sky.includes('맑')) return 'sun'
  if (sky.includes('구름')) return 'cloud-sun'
  return 'clouds'
}

// 일출·일몰 시각 (한국 시간, 분 단위: 6시 30분 = 390). 날짜와 위치만으로 계산하는 천문 공식(NOAA)이라 따로 API 가 필요 없어요.
// 위치는 제주 가운데 근처 — 제주 안에서는 동네마다 1~2분 차이라 하나로 충분해요.
export function sunTimes(ymd, lat = 33.5, lon = 126.53) {
  const rad = Math.PI / 180
  const y = Number(ymd.slice(0, 4)), m = Number(ymd.slice(4, 6)), d = Number(ymd.slice(6, 8))
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000)
  const g = (2 * Math.PI / 365) * (dayOfYear - 1)                                           // 연중 각도
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))   // 태양시 보정(분)
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)   // 태양 적위
  const cosHa = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)
  const ha = Math.acos(Math.max(-1, Math.min(1, cosHa))) / rad                                // 낮 길이의 절반(도)
  const noonUtc = 720 - 4 * lon - eqTime                                                      // 정오(UTC 분)
  return { rise: Math.round(noonUtc - 4 * ha + 540), set: Math.round(noonUtc + 4 * ha + 540) }   // +540 = 한국 시간
}

// 시간별 카드의 아이콘: 낮에는 해, 밤에는 달(일출·일몰 기준), 일출·일몰이 있는 시간에는 일출/일몰 아이콘
// 돌려주는 값: { icon: 아이콘 이름, kind: 'day' | 'night' | 'sunrise' | 'sunset', title: 설명(일출/일몰 시각) }
// 비·눈이 오는 시간은 날씨 아이콘을 그대로 쓰고(비가 더 중요한 정보), 밤인지만 kind 로 알려 줘요.
const hhmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
export function hourIconOf(h) {
  const [ymd, hhmmStr] = h.time.split(' ')
  const hour = Number(hhmmStr.slice(0, 2))
  const { rise, set } = sunTimes(ymd)
  const from = hour * 60
  const to = from + 60
  const night = from + 30 < rise || from + 30 >= set        // 그 시간의 한가운데가 일출 전이거나 일몰 뒤면 밤
  const base = iconOf(h)
  if (base === 'cloud-rain' || base === 'cloud-snow') return { icon: base, kind: night ? 'night' : 'day' }
  if (rise >= from && rise < to) return { icon: 'sunrise', kind: 'sunrise', title: `일출 ${hhmm(rise)}` }
  if (set >= from && set < to) return { icon: 'sunset', kind: 'sunset', title: `일몰 ${hhmm(set)}` }
  if (!night) return { icon: base, kind: 'day' }
  return { icon: { sun: 'moon-stars', 'cloud-sun': 'cloud-moon' }[base] ?? base, kind: 'night' }   // 맑음→달과 별, 구름 조금→구름 낀 달, 흐림은 구름 그대로
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// "20261103" → Date (현지 날짜)
export function parseDate(ymd) {
  return new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)))
}

// "20261103" → "11/3 (화)"
export function dayLabel(ymd) {
  const d = parseDate(ymd)
  return `${d.getMonth() + 1}/${d.getDate()} (${DOW[d.getDay()]})`
}

// 그 날짜가 속한 주의 월요일 (주 단위 묶기용)
function weekStart(ymd) {
  const d = parseDate(ymd)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

// 오늘 날짜 "2026-11-02" (사진 기록을 날짜별로 저장할 때 씀)
export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 시간별 예보 몇 칸을 한 줄로 요약 (오전 또는 오후)
function summarizeHours(hs) {
  if (!hs.length) return null
  const temps = hs.map((h) => h.temp)
  const wet = hs.find((h) => h.rain !== '없음')
  return {
    sky: hs[Math.floor(hs.length / 2)].sky,
    rain: wet ? wet.rain : '없음',
    pop: Math.max(...hs.map((h) => h.pop)),
    min: Math.min(...temps),
    max: Math.max(...temps),
  }
}

// "20261102 1500" → 15
const hourOf = (h) => Number(h.time.slice(9, 11))

// 사진과 함께 저장할 오늘 날씨 기록: 하루 요약(기온·하늘·강수·바람) + 오전/오후 + 기온 구간 + 지역
// 오전은 12시 전, 오후는 12시 이후 시간대. 이미 지난 시간의 예보가 없으면 오전은 null 일 수 있어요.
export function todaySnapshot(weather, { label, place }) {
  const key = todayKey().replaceAll('-', '')
  const hours = (weather.todayHours?.length ? weather.todayHours : weather.hours).filter((h) => h.time.startsWith(key))
  const day = weather.days.find((d) => d.date === key)
  const now = weather.hours[0]
  return {
    label,
    place,
    temp: now.temp,
    min: day?.min ?? Math.min(...hours.map((h) => h.temp)),
    max: day?.max ?? Math.max(...hours.map((h) => h.temp)),
    sky: day?.sky ?? now.sky,
    rain: day?.rain ?? now.rain,
    pop: day?.pop ?? now.pop,
    wind: day?.wind ?? now.wind,
    am: summarizeHours(hours.filter((h) => hourOf(h) < 12)),
    pm: summarizeHours(hours.filter((h) => hourOf(h) >= 12)),
  }
}

// 내일 날씨 요약 (내일 입을 옷과 비슷했던 날을 고를 때 씀). 내일 예보가 없으면 null
export function tomorrowSnapshot(weather) {
  const day = findTomorrow(weather.days)
  if (!day) return null
  const hours = weather.tomorrowHours ?? []
  return {
    min: day.min, max: day.max, rain: day.rain, pop: day.pop, wind: day.wind, sky: day.sky,
    am: summarizeHours(hours.filter((h) => hourOf(h) < 12)),
    pm: summarizeHours(hours.filter((h) => hourOf(h) >= 12)),
  }
}

// days 중 내일 하루치 (없으면 undefined)
export function findTomorrow(days) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return days.find((x) => x.date === ymd)
}

// days 를 "이번주 / 다음주"로 나눕니다 (월~일 기준, 오늘 이전 날짜는 예보에 없음)
export function splitWeeks(days) {
  const now = new Date()
  const thisWeek = weekStart(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
  )
  return {
    thisWeek: days.filter((d) => weekStart(d.date) === thisWeek),
    nextWeek: days.filter((d) => weekStart(d.date) === thisWeek + 7 * 24 * 3600e3),
  }
}
