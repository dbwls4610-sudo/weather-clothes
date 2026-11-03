// 날씨 → 옷차림 추천 (규칙 기반). 숫자 기준을 바꾸고 싶으면 이 파일만 고치면 됩니다.

// 기온 구간별 기본 옷차림 (위에서부터 먼저 맞는 것이 적용)
const BY_TEMP = [
  { min: 28, label: '매우 더움', text: '아주 더운 날씨예요. 통풍이 잘 되는 가벼운 옷으로 시원하게 입으세요.', items: ['민소매', '반팔', '반바지', '린넨 옷'] },
  { min: 23, label: '더움', text: '더운 날씨예요. 반팔에 얇은 하의로 가볍게 입으면 좋아요.', items: ['얇은 셔츠', '반팔', '반바지', '면바지'] },
  { min: 20, label: '따뜻함', text: '따뜻한 날씨예요. 긴팔에 얇은 가디건 정도면 충분해요.', items: ['얇은 가디건', '긴팔 티', '면바지', '청바지'] },
  { min: 17, label: '선선함', text: '선선한 날씨예요. 가벼운 니트나 맨투맨에 가디건을 걸치세요.', items: ['가디건', '얇은 니트', '맨투맨', '청바지'] },
  { min: 12, label: '쌀쌀함', text: '쌀쌀한 날씨예요. 자켓이나 가디건처럼 걸칠 겉옷을 챙기세요.', items: ['자켓', '가디건', '야상', '니트', '청바지'] },
  { min: 9, label: '추움', text: '추운 날씨예요. 트렌치코트나 자켓에 니트를 받쳐 입으세요.', items: ['트렌치코트', '자켓', '니트', '기모 바지'] },
  { min: 5, label: '꽤 추움', text: '꽤 추워요. 코트에 히트텍을 안에 입어 따뜻하게 입으세요.', items: ['코트', '가죽 자켓', '니트', '히트텍', '기모 바지'] },
  { min: -Infinity, label: '매우 추움', text: '매우 추워요. 패딩이나 두꺼운 코트로 단단히 챙겨 입으세요.', items: ['패딩', '두꺼운 코트', '목도리', '장갑', '두꺼운 니트', '히트텍', '기모 바지'] },
]

// 기온 구간 목록 (날씨별 옷차림 페이지에서 씀)
export const TIERS = BY_TEMP.map(({ min, label }) => ({ min, label }))

// 기온 구간 이름 → 배지 색 { bg: 배경, fg: 글자 }. 채도를 낮춘 부드러운 색 + 같은 색 계열의 진한 글자.
const LABEL_COLOR = {
  '매우 더움': { bg: '#eba9ae', fg: '#6b1f27' },   // 빨강
  더움: { bg: '#f2c19a', fg: '#6b3510' },          // 주황
  따뜻함: { bg: '#f1e0a0', fg: '#5c4a0a' },        // 노랑
  선선함: { bg: '#b2d9b5', fg: '#1f4d24' },        // 초록
  쌀쌀함: { bg: '#b0dde8', fg: '#1b4f5c' },        // 하늘
  추움: { bg: '#a9c1ea', fg: '#1f3a6b' },          // 파랑
  '꽤 추움': { bg: '#b5b4de', fg: '#2f2e72' },   // 남색
  '매우 추움': { bg: '#cbb3e3', fg: '#46286b' },   // 보라
}
export const labelColor = (label) => LABEL_COLOR[label] ?? { bg: '#6c757d', fg: '#fff' }

// 옷 이름 → 그림(이모지). 새 옷을 추가하면 여기에도 한 줄 추가하세요.
const EMOJI = {
  민소매: '🎽', 반팔: '👕', 반바지: '🩳', '얇은 셔츠': '👔', 면바지: '👖',
  청바지: '👖', 자켓: '🧥', 트렌치코트: '🧥', '기모 바지': '👖',
  코트: '🧥', '두꺼운 코트': '🧥',
  목도리: '🧣', 장갑: '🧤', 우산: '☂️', 모자: '🧢', '방수 신발': '🥾',
}
export const emojiOf = (item) => EMOJI[item] ?? '👕'

// 이모지로는 구분이 안 되는 옷은 직접 그린 그림(GarmentIcon)으로 보여줍니다. 옷 이름 → 그림 종류
const ICON_TYPE = {
  가디건: 'cardigan', '얇은 가디건': 'cardigan', 니트: 'sweater', '얇은 니트': 'sweater', '두꺼운 니트': 'thickknit',
  '린넨 옷': 'blouse', '긴팔 티': 'longsleeve', 맨투맨: 'sweatshirt', 히트텍: 'heattech',
  야상: 'parka', '가죽 자켓': 'leather', 패딩: 'puffer', 바람막이: 'windbreaker',
}
export const iconTypeOf = (item) => ICON_TYPE[item] ?? null

// 카드로 보여줄 순서: 소품(우산 등) → 아우터 → 상의 → 바지. 새 옷을 추가하면 알맞은 줄에 넣으세요.
const ORDER = [
  ['우산', '모자', '목도리', '장갑', '방수 신발'],                                   // 소품
  ['바람막이', '패딩', '두꺼운 코트', '코트', '트렌치코트', '가죽 자켓', '자켓', '야상'], // 아우터
  ['가디건', '얇은 가디건', '두꺼운 니트', '니트', '얇은 니트', '맨투맨', '히트텍', '긴팔 티', '얇은 셔츠', '반팔', '린넨 옷', '민소매'], // 상의
  ['청바지', '면바지', '기모 바지', '반바지'],                                       // 바지
]
const GROUP = Object.fromEntries(ORDER.flatMap((g, i) => g.map((name) => [name, i])))
// 같은 줄 안에서는 원래 순서를 그대로 둡니다 (sort 는 안정 정렬)
const sortItems = (items) => [...items].sort((a, b) => (GROUP[a] ?? 9) - (GROUP[b] ?? 9))

// 날씨 조건에 따라 챙길 물건(우산·바람막이·모자 등)을 더하고, 보여줄 순서로 정렬합니다
// 바람이 센 날 구간별 안내 — 바람막이는 더움~선선함(17~27℃)에서만 추천합니다.
//  · 매우 더움: 바람이 오히려 시원해서 안내 없음
//  · 쌀쌀함: 자켓·야상이 바람을 막아 주므로 바람막이 없이 안내만
//  · 추움 이하: 두꺼운 코트·패딩이 바람도 막아 주므로 바람막이 없이 안내만
const windAdvice = (base) => (base.min >= 28 ? null : base.min >= 17 ? 'windbreaker' : base.min >= 12 ? 'jacket' : 'thick')
const WIND_TIP = {
  windbreaker: '바람막이를 입으세요.',
  jacket: '자켓이나 야상으로 바람을 막으세요.',
  thick: '바람을 막아 주는 두꺼운 겉옷을 입으세요.',
}

function withExtras(items, { rain, windbreaker, hot }) {
  const extra = []
  if (rain) extra.push('우산')
  if (windbreaker) extra.push('바람막이')
  if (hot) extra.push('모자')
  return sortItems([...items, ...extra.filter((e) => !items.includes(e))])
}

// 하루 단위 추천 — day: { min, max, pop, wind, rain } (일별 예보 한 칸)
export function recommendDay(day) {
  const base = BY_TEMP.find((b) => (day.min + day.max) / 2 >= b.min)  // 하루 평균 기온 기준
  const range = day.max - day.min
  const rain = day.rain !== '없음' || day.pop >= 60
  const tips = []
  if (day.rain.includes('눈')) tips.push('눈 예보 — 미끄럽지 않은 신발을 신으세요.')
  else if (rain) tips.push(`비 소식(${day.pop}%) — 우산을 챙기세요.`)
  if (day.wind >= 9 && windAdvice(base)) tips.push(`바람이 강해요 — ${WIND_TIP[windAdvice(base)]}`)
  if (range >= 8) tips.push(`일교차가 ${range}℃예요 — 겉옷을 챙겨 두세요.`)
  return {
    label: base.label,
    text: base.text,
    items: withExtras(base.items, { rain, windbreaker: day.wind >= 9 && windAdvice(base) === 'windbreaker', hot: day.max >= 28 }),
    tips,
  }
}

// 한 주 요약 — days: 그 주의 일별 예보 배열
export function summarizeWeek(days) {
  if (!days.length) return null
  // 가장 추운 날 / 따뜻한 날은 둘 다 "최고 기온"으로 비교해요 (하루의 대표 기온을 같은 기준으로 맞추려고)
  const byMaxAsc = [...days].sort((a, b) => a.max - b.max)
  const byMaxDesc = [...days].sort((a, b) => b.max - a.max)
  const wet = days.filter((d) => d.rain !== '없음' || d.pop >= 60)
  return {
    coldest: byMaxAsc[0],   // 가장 추운 날 (최고기온이 가장 낮은 날)
    warmest: byMaxDesc[0],  // 가장 따뜻한 날 (최고기온이 가장 높은 날)
    wetDays: wet,          // 우산이 필요한 날
    gap: byMaxDesc[0].max - byMaxAsc[0].max,   // 기간 기온 차: 가장 따뜻한 날의 최고 − 가장 추운 날의 최고 (위의 두 날과 같은 기준)
  }
}

// hours: server/weather.js 가 주는 시간별 예보 배열
export function recommendOutfit(hours) {
  if (!hours?.length) return null

  const temps = hours.map((h) => h.temp)
  const now = hours[0]
  const maxWind = Math.max(...hours.map((h) => h.wind))
  const maxPop = Math.max(...hours.map((h) => h.pop))
  const range = Math.max(...temps) - Math.min(...temps)

  // 바람이 세면 체감온도가 낮아지므로 조금 낮춰서 판단
  const feel = now.temp - (now.wind >= 7 ? 2 : 0)
  const base = BY_TEMP.find((b) => feel >= b.min)

  const tips = []
  const isSnow = hours.some((h) => h.rain.includes('눈'))
  const isRain = hours.some((h) => h.rain !== '없음' && !h.rain.includes('눈'))
  if (isSnow) tips.push('눈이 예보돼요. 미끄럽지 않은 방수 신발을 신으세요.')
  if (isRain || maxPop >= 60) tips.push(`강수확률 ${maxPop}%! 우산과 방수되는 신발을 챙기세요.`)
  if (maxWind >= 9 && windAdvice(base)) tips.push(`바람이 강해요(최대 ${maxWind}m/s). ${WIND_TIP[windAdvice(base)]}`)
  if (range >= 8) tips.push(`앞으로 12시간 기온 차가 ${range}℃예요. 겉옷을 챙겨 두세요.`)
  if (now.temp >= 28) tips.push('햇볕이 강할 수 있어요. 모자와 선크림을 챙기세요.')
  if (now.temp <= 4) tips.push('손과 목이 시려요. 목도리와 장갑을 챙기세요.')

  return {
    label: base.label,
    text: base.text,
    items: withExtras(base.items, {
      rain: isRain || isSnow || maxPop >= 60, windbreaker: maxWind >= 9 && windAdvice(base) === 'windbreaker', hot: now.temp >= 28,
    }),
    tips,
  }
}
