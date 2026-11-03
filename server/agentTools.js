// AI 도우미(Claude)가 부를 수 있는 도구들 — 이 앱이 이미 가진 기능(날씨 조회, 옷차림 규칙)을 그대로 빌려 줍니다.
// 새 도구를 만들려면: ① TOOLS 에 설명(이름·언제 쓰는지·입력) 추가 ② TOOL_RUNNERS 에 실행 함수 추가
import { getWeather } from './weather.js'
import { recommendDay, recommendOutfit } from '../src/lib/outfit.js'
import { findPlace, placeLabel } from '../src/lib/places.js'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const kstNow = () => new Date(Date.now() + 9 * 3600e3)              // 한국 시간 (서버는 UTC 일 수 있어서)
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const dateLabel = (s) => {                                          // "20261103" → "11/3(화)"
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
  return `${Number(s.slice(4, 6))}/${Number(s.slice(6, 8))}(${DOW[d.getUTCDay()]})`
}

export const TOOLS = [
  {
    name: 'get_weather',
    description:
      '제주 지역의 날씨 예보와, 이 앱의 규칙으로 계산한 추천 옷차림을 가져온다. ' +
      '날씨·기온·비·바람·옷차림에 대한 질문에는 추측하지 말고 반드시 이 도구로 확인한 뒤 답한다. ' +
      '결과의 "옷차림추천"(기온 구간, 추천 옷, 팁)이 앱이 화면에서 보여 주는 추천과 같으므로 그 내용을 바탕으로 답한다.',
    input_schema: {
      type: 'object',
      properties: {
        day: {
          type: 'string',
          enum: ['today', 'tomorrow', 'week'],
          description: 'today = 오늘(지금부터 12시간), tomorrow = 내일(최저·최고, 시간별), week = 오늘부터 최대 10일의 일별 예보(이번주·다음주 질문)',
        },
        place: {
          type: 'string',
          description: '제주시·서귀포시, 또는 동·읍·면 이름 (예: 노형동, 성산, 중문, 서귀포). 사용자가 지역을 말했을 때만 넣고, 말하지 않았으면 생략한다(앱에서 보고 있는 지역을 쓴다).',
        },
      },
      required: ['day'],
    },
  },
]

// 하루치 예보 한 줄 + 그 날의 추천 옷차림
function dayRow(d) {
  const rec = recommendDay(d)
  return {
    날짜: dateLabel(d.date), 최저: d.min, 최고: d.max, 하늘: d.sky, 강수: d.rain, 강수확률: d.pop,
    최대풍속: d.wind, 기온구간: rec.label, 추천옷: rec.items, 팁: rec.tips,
  }
}

// 시간별 예보를 step 칸마다 하나씩만 (Claude 에게 보내는 글자 수를 줄이려고)
const hourRows = (hours, step) =>
  hours.filter((_, i) => i % step === 0).map((h) => ({
    시: Number(h.time.slice(9, 11)), 기온: h.temp, 하늘: h.sky, 강수: h.rain, 강수확률: h.pop, 풍속: h.wind,
  }))

const TOOL_RUNNERS = {
  // input: { day, place? }, ctx: { place?: { label, lat, lon } } (사용자가 앱에서 보고 있는 지역)
  async get_weather(input, ctx) {
    let spot
    if (input.place) {
      const p = findPlace(input.place)
      if (!p) return { 오류: `'${input.place}' 지역을 찾지 못했어요. 제주시·서귀포시와 그 동·읍·면만 조회할 수 있어요. (예: 제주시, 노형동, 성산, 중문)` }
      spot = { label: placeLabel(p.id), lat: p.lat, lon: p.lon }
    } else if (ctx.place) {
      spot = ctx.place
    } else {
      const p = findPlace('제주시')                                    // 지역을 모르면 제주시 기준
      spot = { label: `${placeLabel(p.id)} (지역을 몰라 기본값 사용)`, lat: p.lat, lon: p.lon }
    }

    const w = await getWeather({ lat: spot.lat, lon: spot.lon })
    const today = ymd(kstNow())
    const tomorrow = ymd(new Date(kstNow().getTime() + 24 * 3600e3))
    const base = { 지역: spot.label, 오늘날짜: dateLabel(today) }

    if (input.day === 'tomorrow') {
      const d = w.days.find((x) => x.date === tomorrow)
      if (!d) return { ...base, 오류: '내일 예보를 찾지 못했어요' }
      return { ...base, 기준: '내일', 하루요약: dayRow(d), 시간별: hourRows(w.tomorrowHours ?? [], 3) }
    }

    if (input.day === 'week') {
      return {
        ...base, 기준: '오늘부터 일별 예보(최대 10일)', 일별: w.days.map(dayRow),
        ...(w.midError ? { 참고: '4일 뒤부터의 중기예보는 불러오지 못했어요' } : {}),
      }
    }

    // today: 지금 기온 기준 추천 (바람이 센 날은 체감을 낮춰서 계산하는 앱의 규칙 그대로)
    const now = w.hours[0]
    const rec = recommendOutfit(w.hours)
    const day = w.days.find((x) => x.date === today)
    return {
      ...base, 기준: '오늘(지금)',
      지금: { 기온: now.temp, 하늘: now.sky, 강수: now.rain, 강수확률: now.pop, 풍속: now.wind },
      ...(day ? { 오늘최저: day.min, 오늘최고: day.max } : {}),
      앞으로12시간: hourRows(w.hours, 2),
      옷차림추천: { 기온구간: rec.label, 설명: rec.text, 추천옷: rec.items, 팁: rec.tips },
    }
  },
}

// 도구 하나 실행. 실패해도 대화가 멈추지 않도록 오류를 결과로 돌려줘서 Claude 가 알아서 안내하게 합니다.
export async function runTool(name, input, ctx = {}) {
  const run = TOOL_RUNNERS[name]
  if (!run) return { ok: false, result: { 오류: `알 수 없는 도구예요: ${name}` } }
  try {
    const result = await run(input ?? {}, ctx)
    return { ok: !result.오류, result }
  } catch (e) {
    return { ok: false, result: { 오류: `날씨를 가져오지 못했어요: ${e.message}` } }
  }
}
