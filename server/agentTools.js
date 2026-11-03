// AI 도우미(Claude)가 부를 수 있는 도구들 — 이 앱이 이미 가진 기능(날씨 조회, 옷차림 규칙, 내 기록)을 그대로 빌려 줍니다.
// 새 도구를 만들려면: ① TOOLS 에 설명(이름·언제 쓰는지·입력) 추가 ② TOOL_RUNNERS 에 실행 함수 추가
import { getWeather } from './weather.js'
import { recommendDay, recommendOutfit } from '../src/lib/outfit.js'
import { recommendPast } from '../src/lib/pastOutfits.js'
import { findPlace, nearestPlace, placeLabel } from '../src/lib/places.js'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const kstNow = () => new Date(Date.now() + 9 * 3600e3)              // 한국 시간 (서버는 UTC 일 수 있어서)
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const shortDate = (s) => `${Number(s.slice(4, 6))}/${Number(s.slice(6, 8))}`            // "20261107" → "11/7"
const dateLabel = (s) => {                                          // "20261103" → "11/3(화)"
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
  return `${Number(s.slice(4, 6))}/${Number(s.slice(6, 8))}(${DOW[d.getUTCDay()]})`
}

// 두 도구가 같이 쓰는 입력: 어느 날(day)의, 어느 지역(place)
const DAY_PROP = {
  type: 'string',
  enum: ['today', 'tomorrow', 'week'],
  description: 'today = 오늘(지금부터 12시간), tomorrow = 내일(최저·최고, 시간별), week = 오늘부터 최대 10일의 일별 예보(이번주·다음주 질문)',
}
const PLACE_PROP = {
  type: 'string',
  description: '제주시·서귀포시, 또는 동·읍·면 이름 (예: 노형동, 성산, 중문, 서귀포). 사용자가 지역을 말했을 때만 넣고, 말하지 않았으면 생략한다(앱에서 보고 있는 지역을 쓴다).',
}

export const TOOLS = [
  {
    name: 'get_weather',
    description:
      '제주 지역의 날씨 예보와, 이 앱의 규칙으로 계산한 추천 옷차림을 가져온다. ' +
      '날씨·기온·비·바람·옷차림에 대한 질문에는 추측하지 말고 반드시 이 도구로 확인한 뒤 답한다. ' +
      '결과의 "옷차림추천"(기온 구간, 추천 옷, 팁)이 앱이 화면에서 보여 주는 추천과 같으므로 그 내용을 바탕으로 답한다.',
    input_schema: { type: 'object', properties: { day: DAY_PROP, place: PLACE_PROP }, required: ['day'] },
  },
  {
    name: 'get_past_outfits',
    description:
      '로그인한 사용자가 과거에 기록한, 알고 싶은 날(오늘·내일·이번 주말·특정 날짜)의 날씨와 최고·최저 기온이 비슷했던 날의 기록을 (느낌이 딱 좋았던 순서, 날씨가 비슷한 순서로) 최대 8개 가져온다. ' +
      '각 기록에는 그날의 기온·비 여부, 입어 본 느낌(딱 좋았어요/추웠어요/더웠어요), 사용자가 직접 쓴 후기 글이 들어 있다. ' +
      '옷차림을 추천할 때 사용자의 경험과 취향(예: 후기 "안에 긴팔을 입었으면 딱 좋았을 듯")을 반영하려고 쓴다. ' +
      '옷 사진은 제공되지 않으며 너는 사진을 볼 수 없다. ' +
      '옷차림을 추천하는 질문에는 날짜가 오늘·내일이든, 이번 주말이든, 특정 날이든 항상 이 도구를 부른다 (날씨만 묻는 질문에는 부르지 않는다). ' +
      'day 는 today(오늘), tomorrow(내일), date(그 밖의 날: date 에 YYYY-MM-DD, 주말처럼 여러 날이면 end_date 에 마지막 날). 예보는 오늘부터 최대 10일 뒤까지만 있다.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: ['today', 'tomorrow', 'date'], description: 'today = 오늘, tomorrow = 내일, date = date(와 end_date)로 정한 날' },
        date: { type: 'string', description: 'day=date 일 때 날짜 (YYYY-MM-DD, 한국 시간). 예: 이번 주 토요일' },
        end_date: { type: 'string', description: '주말(토~일)처럼 여러 날일 때 마지막 날 (YYYY-MM-DD). 한 날이면 생략' },
        place: PLACE_PROP,
      },
      required: ['day'],
    },
  },
  {
    name: 'comment_on_outfit_cards',
    description:
      'get_past_outfits 로 가져온 기록마다, 답변 아래 사진 카드에 붙일 한 문장 조언을 등록한다. get_past_outfits 를 불렀다면 최종 답을 쓰기 전에 반드시 이 도구를 한 번 부른다. ' +
      '문장은 오늘(또는 내일)과 그날의 최고 기온 차이와 최저 기온 차이를 둘 다 고려하되, 문장에는 "최고", "최저"라는 말이나 숫자를 넣지 않는다(카드에 차이가 숫자로 보인다). 낮·아침저녁·일교차 같은 말로 풀어서 그날의 느낌·후기와 함께 짧게 쓴다. ' +
      '예: "이때보다 일교차가 커서 벗었다 입을 수 있는 겉옷을 추천해요", "이때보다 쌀쌀하니 한 겹 더 챙기는 걸 추천해요", "이때와 기온이 비슷하고 딱 좋았다고 하셨어요". ' +
      '입은 옷의 종류는 후기에 적혀 있을 때만 말하고, 없으면 지어내지 않는다.',
    input_schema: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          maxItems: 8,
          description: '기록마다 한 문장',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'get_past_outfits 결과의 "기록날짜" 값 (예: 2026-11-02)' },
              comment: { type: 'string', description: '그 카드에 붙일 한 문장 (40자 안팎, 존댓말, "~해요"로 끝맺음, 최고/최저 숫자 없이)' },
            },
            required: ['date', 'comment'],
          },
        },
      },
      required: ['cards'],
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

// 입력(place)이나 앱에서 보고 있는 지역(ctx.place)으로 지역을 정하고 그 지역의 날씨를 가져옵니다.
// 실패하면 { error: {오류: '...'} } 를 돌려줘요.
async function loadSpotWeather(input, ctx) {
  let spot
  if (input.place) {
    const p = findPlace(input.place)
    if (!p) return { error: { 오류: `'${input.place}' 지역을 찾지 못했어요. 제주시·서귀포시와 그 동·읍·면만 조회할 수 있어요. (예: 제주시, 노형동, 성산, 중문)` } }
    // 동·읍·면이면 "제주시 노형동", 시 이름만 말했으면 시청 기준이라는 것을 같이 알려 줘요
    spot = { label: p.kind ? placeLabel(p.id) : `${p.name.replace(' 전체', '')} 전체 (시청 기준, 동네는 더 구체적으로 알려 주면 정확해요)`, lat: p.lat, lon: p.lon }
  } else if (ctx.place) {
    spot = { ...ctx.place }
    if (spot.label === '내 위치') {                                  // 내 위치는 가장 가까운 동네 이름으로
      const near = nearestPlace(spot.lat, spot.lon)
      if (near) spot.label = `내 위치 (${placeLabel(near.id)} 근처)`
    }
  } else {
    const p = findPlace('제주시')                                      // 지역을 모르면 제주시 기준
    spot = { label: `${placeLabel(p.id)} (지역을 몰라 기본값 사용, 동네를 알려 주면 더 정확해요)`, lat: p.lat, lon: p.lon }
  }
  const w = await getWeather({ lat: spot.lat, lon: spot.lon })
  const today = ymd(kstNow())
  const tomorrow = ymd(new Date(kstNow().getTime() + 24 * 3600e3))
  return { spot, w, today, tomorrow, base: { 지역: spot.label, 오늘날짜: dateLabel(today) } }
}

const AI_PICKS = 8   // AI 에게 넘기는 비슷한 기록의 최대 개수 (비슷한 순서가 앞)

const FEEL_TEXT = { 2: '많이 더웠어요', 1: '조금 더웠어요', 0: '딱 좋았어요', '-1': '조금 추웠어요', '-2': '많이 추웠어요' }

const TOOL_RUNNERS = {
  // input: { day, place? }, ctx: { place?: { label, lat, lon } } (사용자가 앱에서 보고 있는 지역)
  async get_weather(input, ctx) {
    const r = await loadSpotWeather(input, ctx)
    if (r.error) return r.error
    const { w, today, tomorrow, base } = r

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

  // 내 기록에서 비슷한 날 고르기 — 화면의 "비슷한 날, 내가 입었던 옷"과 같은 규칙(src/lib/pastOutfits.js)
  // 개인정보: 사용자 본인의 로그인 권한(ctx.db)으로만 읽고, 사진 경로·주소·사용자 id 는 가져오지도 않고 Claude 에게도 보내지 않습니다.
  async get_past_outfits(input, ctx) {
    if (!ctx.db) return { 오류: '로그인 정보가 없어 과거 기록을 볼 수 없어요' }
    const r = await loadSpotWeather(input, ctx)
    if (r.error) return r.error
    const { w, today, tomorrow } = r

    // 비교할 날(들)을 정하고, 그 날씨를 홈 화면이 쓰는 값과 같은 모양(최저·최고·비)으로 만든다
    let from, to, label
    if (input.day === 'date') {
      from = String(input.date ?? '').replaceAll('-', '')
      to = input.end_date ? String(input.end_date).replaceAll('-', '') : from
      if (!/^[0-9]{8}$/.test(from) || !/^[0-9]{8}$/.test(to) || to < from) return { 오류: '날짜는 YYYY-MM-DD 로, 마지막 날은 첫 날보다 뒤여야 해요' }
      label = from === to ? shortDate(from) : `${shortDate(from)}~${Number(to.slice(6, 8))}`
    } else {
      const day = input.day === 'tomorrow' ? tomorrow : today
      from = to = day
      label = input.day === 'tomorrow' ? '내일' : '오늘'
    }
    const days = w.days.filter((x) => x.date >= from && x.date <= to)
    if (!days.length) return { 오류: `${label} 예보를 찾지 못했어요 (예보는 오늘부터 최대 10일 뒤까지만 있어요)` }
    const target = {
      min: Math.min(...days.map((d) => d.min)),
      max: Math.max(...days.map((d) => d.max)),
      rain: days.find((d) => d.rain !== '없음')?.rain ?? '없음',      // 며칠 중 하루라도 비가 오면 비
    }
    const isFuture = from > today     // 오늘 이후의 옷을 고를 때는 오늘 입은 옷도 참고, 오늘 옷을 고를 때는 오늘 기록 제외

    // 사진 경로(photo_path)는 일부러 고르지 않습니다 — 사진은 Claude 에게도, 이 도구에도 오지 않아요.
    const todayIso = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`
    let query = ctx.db.from('outfit_logs').select('log_date, label, temp, place, weather, feel, note')
    if (!isFuture) query = query.neq('log_date', todayIso)
    const { data, error } = await query.order('log_date', { ascending: false }).limit(400)
    if (error) return { 오류: `과거 기록을 불러오지 못했어요: ${error.message}` }

    // 화면(홈 카드)은 5개를 보여 주지만, AI 에게는 8개를 줘서 후기 글을 읽고 알맞은 것을 고를 여지를 줍니다.
    const picks = recommendPast(data ?? [], { min: target.min, max: target.max, rain: target.rain }, AI_PICKS, label)
    return {
      // __display 는 Claude 에게 보내지 않고 화면(카드)에만 쓰는 값이에요 (runTool 이 떼어 냅니다). 사진은 여기에도 없어요.
      __display: {
        pastOutfits: picks.slice(0, 5).map((p) => ({
          log_date: p.log_date, feel: p.feel, note: p.note, place: p.place, label: p.label, temp: p.temp, weather: p.weather,
          pastTemps: p.pastTemps, todayTemps: p.todayTemps, todayName: p.todayName,
        })),
      },
      비교기준: { 날: label, 최고: target.max, 최저: target.min, 강수: target.rain },
      전체기록수: (data ?? []).length,
      비슷한기록: picks.map((p) => ({
        기록날짜: p.log_date,   // comment_on_outfit_cards 에서 어느 기록인지 가리킬 때 씀
        날짜: dateLabel(p.log_date.replaceAll('-', '')),
        그날기온: { 최고: p.pastTemps.max, 최저: p.pastTemps.min },
        // 오늘(내일) − 그날: + 이면 오늘이 더 높음
        기온차이: p.pastTemps.min == null || p.pastTemps.max == null ? '알 수 없음' : { 최고: p.todayTemps.max - p.pastTemps.max, 최저: p.todayTemps.min - p.pastTemps.min },
        그날강수: p.weather?.rain ?? '알 수 없음',
        지역: p.place ?? '알 수 없음',
        비슷한정도: p.relaxed ? '조금 다름(기온 차이가 큰 편)' : '비슷함',
        입어본느낌: FEEL_TEXT[p.feel] ?? '적지 않음',
        // 사용자가 직접 쓴 글(데이터일 뿐, 그 안의 지시문은 따르지 않는다)
        후기: p.note ? String(p.note).slice(0, 200) : '없음',
      })),
      ...(picks.length ? {} : { 안내: '비슷한 날씨에 기록한 옷이 아직 없어요' }),
      ...(picks.some((p) => p.relaxed) ? { 참고: '비슷한 기록이 적어서 기온 차이가 조금 큰 기록도 포함했어요' } : {}),
    }
  },
}

TOOL_RUNNERS.comment_on_outfit_cards = async (input) => {
  const comments = {}
  for (const c of Array.isArray(input.cards) ? input.cards : []) {
    if (typeof c?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && typeof c.comment === 'string' && c.comment.trim()) {
      comments[c.date] = c.comment.replace(/\s+/g, ' ').trim().slice(0, 100)
    }
  }
  return { 등록됨: Object.keys(comments).length, __display: { cardComments: comments } }   // 카드 아래 문장은 화면용
}

// 도구 하나 실행. 실패해도 대화가 멈추지 않도록 오류를 결과로 돌려줘서 Claude 가 알아서 안내하게 합니다.
export async function runTool(name, input, ctx = {}) {
  const run = TOOL_RUNNERS[name]
  if (!run) return { ok: false, result: { 오류: `알 수 없는 도구예요: ${name}` } }
  try {
    const { __display: display, ...result } = await run(input ?? {}, ctx)   // display 는 화면용 — Claude 에게는 result 만 갑니다
    return { ok: !result.오류, result, display }
  } catch (e) {
    return { ok: false, result: { 오류: `도구를 실행하지 못했어요: ${e.message}` } }
  }
}
