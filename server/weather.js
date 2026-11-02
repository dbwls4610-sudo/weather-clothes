// 기상청 예보 — 공공데이터포털
//  · 단기예보 조회서비스 (VilageFcstInfoService_2.0): 오늘 ~ 3일 후, 시간별
//  · 중기예보 조회서비스 (MidFcstInfoService)        : 4 ~ 10일 후, 하루 단위
// 서버(api/)에서만 불러옵니다. 인증키(DATA_GO_KR_KEY)가 브라우저에 노출되면 안 되기 때문입니다.
const SHORT_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
const MID_URL = 'https://apis.data.go.kr/1360000/MidFcstInfoService'
const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' }
const PTY = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' }

// ── 좌표 변환 ────────────────────────────────────────────

// 위도·경도 → 기상청 격자 좌표(nx, ny)  (기상청 공식 Lambert 변환식)
export function toGrid(lat, lon) {
  const RAD = Math.PI / 180
  const re = 6371.00877 / 5.0                       // 지도 반경 / 격자 간격(5km)
  const slat1 = 30 * RAD, slat2 = 60 * RAD          // 표준 위도
  const olon = 126 * RAD, olat = 38 * RAD           // 기준점 경도·위도
  const XO = 43, YO = 136                           // 기준점 격자 좌표

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + lat * RAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = lon * RAD - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  }
}

// 중기예보 지역: 내 위치에서 가장 가까운 도시 → 기온 예보 코드(ta) + 날씨 예보 코드(land, 광역 단위)
const MID_CITIES = [
  { name: '서울', lat: 37.57, lon: 126.98, ta: '11B10101', land: '11B00000' },
  { name: '인천', lat: 37.46, lon: 126.71, ta: '11B20201', land: '11B00000' },
  { name: '수원', lat: 37.26, lon: 127.03, ta: '11B20601', land: '11B00000' },
  { name: '춘천', lat: 37.88, lon: 127.73, ta: '11D10301', land: '11D10000' },
  { name: '강릉', lat: 37.75, lon: 128.88, ta: '11D20501', land: '11D20000' },
  { name: '대전', lat: 36.35, lon: 127.38, ta: '11C20401', land: '11C20000' },
  { name: '세종', lat: 36.48, lon: 127.29, ta: '11C20404', land: '11C20000' },
  { name: '청주', lat: 36.64, lon: 127.49, ta: '11C10301', land: '11C10000' },
  { name: '광주', lat: 35.16, lon: 126.85, ta: '11F20501', land: '11F20000' },
  { name: '목포', lat: 34.81, lon: 126.39, ta: '21F20801', land: '11F20000' },
  { name: '여수', lat: 34.76, lon: 127.66, ta: '11F20401', land: '11F20000' },
  { name: '전주', lat: 35.82, lon: 127.15, ta: '11F10201', land: '11F10000' },
  { name: '대구', lat: 35.87, lon: 128.60, ta: '11H10701', land: '11H10000' },
  { name: '포항', lat: 36.02, lon: 129.34, ta: '11H10201', land: '11H10000' },
  { name: '안동', lat: 36.57, lon: 128.73, ta: '11H10501', land: '11H10000' },
  { name: '부산', lat: 35.18, lon: 129.08, ta: '11H20201', land: '11H20000' },
  { name: '울산', lat: 35.54, lon: 129.31, ta: '11H20101', land: '11H20000' },
  { name: '창원', lat: 35.23, lon: 128.68, ta: '11H20301', land: '11H20000' },
  { name: '제주', lat: 33.50, lon: 126.53, ta: '11G00201', land: '11G00000' },
  { name: '서귀포', lat: 33.25, lon: 126.56, ta: '11G00401', land: '11G00000' },
]

function nearestCity(lat, lon) {
  const d = (c) => (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2
  return MID_CITIES.reduce((a, b) => (d(b) < d(a) ? b : a))
}

// ── 시간 계산 (모두 한국시간 기준) ───────────────────────────

const kstNow = (offsetMin = 0) => new Date(Date.now() + 9 * 3600e3 - offsetMin * 60e3)
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')

// 단기예보 발표시각: 02·05·08·11·14·17·20·23시 (발표 후 약 10분 뒤부터 조회 가능)
function shortBase() {
  const kst = kstNow(15) // 15분 여유
  let h = [23, 20, 17, 14, 11, 8, 5, 2].find((x) => x <= kst.getUTCHours())
  let day = kst
  if (h === undefined) { day = new Date(kst.getTime() - 24 * 3600e3); h = 23 }
  return { base_date: ymd(day), base_time: String(h).padStart(2, '0') + '00' }
}

// 중기예보 발표시각: 06·18시
function midBase() {
  const kst = kstNow(30) // 30분 여유
  const h = kst.getUTCHours()
  if (h >= 18) return { date: kst, tmFc: ymd(kst) + '1800' }
  if (h >= 6) return { date: kst, tmFc: ymd(kst) + '0600' }
  const prev = new Date(kst.getTime() - 24 * 3600e3)
  return { date: prev, tmFc: ymd(prev) + '1800' }
}

// ── 기상청 호출 ──────────────────────────────────────────

// 응답을 JSON 으로 읽고, 인증키 오류 등은 알아보기 쉬운 에러로 바꿔 던집니다
export async function callApi(url, params) {
  const r = await fetch(`${url}?${new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_KEY, dataType: 'JSON', ...params })}`)
  const text = await r.text()
  let data
  try { data = JSON.parse(text) }
  catch { throw new Error('기상청 응답이 JSON이 아님: ' + text.slice(0, 120)) }
  const err = data?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (err) {
    throw new Error(err.errMsg === 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR'
      ? '이 서비스는 공공데이터포털에서 활용신청이 필요해요 (또는 승인 대기 중)'
      : `기상청 오류: ${err.returnAuthMsg ?? err.errMsg}`)
  }
  const header = data?.response?.header
  if (header && header.resultCode !== '00') throw new Error(`기상청 오류: ${header.resultMsg}`)
  const items = data?.response?.body?.items?.item ?? []
  return Array.isArray(items) ? items : [items]
}

// 단기예보 → 시간별 + 일별
async function getShort(nx, ny) {
  const base = shortBase()
  const query = { numOfRows: '1000', pageNo: '1', nx: String(nx), ny: String(ny) }
  // 오늘 새벽~오전 값도 필요해서(오전/오후 날씨), 최신 발표가 02시가 아니면 오늘 02시 발표도 함께 받습니다.
  // 실패해도 괜찮아요 (그냥 지난 시간대가 빠질 뿐). 최신 발표 값이 겹치면 최신 쪽이 이깁니다.
  const early = base.base_time !== '0200' && base.base_date === ymd(kstNow())
    ? callApi(SHORT_URL, { ...query, base_date: base.base_date, base_time: '0200' }).catch(() => [])
    : Promise.resolve([])
  const [latest, earlier] = await Promise.all([callApi(SHORT_URL, { ...query, ...base }), early])
  const items = [...earlier, ...latest]

  const slots = {} // "날짜 시간" → { TMP, SKY, PTY, POP, WSD, REH, TMN, TMX }
  for (const it of items) {
    const key = `${it.fcstDate} ${it.fcstTime}`
    ;(slots[key] ??= {})[it.category] = it.fcstValue
  }
  const all = Object.entries(slots).map(([time, v]) => ({
    time,                                  // "20261102 1500"
    temp: Number(v.TMP),                   // 기온(℃)
    sky: SKY[v.SKY] ?? v.SKY,              // 하늘 상태
    rain: PTY[v.PTY] ?? v.PTY,             // 강수 형태
    pop: Number(v.POP),                    // 강수확률(%)
    wind: Number(v.WSD),                   // 풍속(m/s)
    humidity: Number(v.REH),               // 습도(%)
    tmn: v.TMN === undefined ? null : Number(v.TMN),  // 일 최저기온 (해당 시각에만 있음)
    tmx: v.TMX === undefined ? null : Number(v.TMX),  // 일 최고기온
  }))

  // 이미 지난 시간은 빼고 앞으로 12시간
  const nowKey = ymd(kstNow()) + ' ' + String(kstNow().getUTCHours()).padStart(2, '0') + '00'
  const hours = all.filter((h) => h.time >= nowKey).slice(0, 12)

  // 날짜별로 묶어서 하루 요약
  const byDate = {}
  for (const h of all) (byDate[h.time.slice(0, 8)] ??= []).push(h)
  const today = ymd(kstNow())
  const days = Object.entries(byDate)
    // 시간대가 거의 없는 날은 뺍니다. 마지막 날(3일 후)은 일부 시간대만 오므로 partial 로 표시해 둡니다.
    .filter(([date, hs]) => date === today || hs.length >= 6)
    .map(([date, hs]) => {
    const temps = hs.map((h) => h.temp)
    const noon = hs.find((h) => h.time.endsWith('1200')) ?? hs[Math.floor(hs.length / 2)]
    const wet = hs.find((h) => h.rain !== '없음')
    return {
      date,
      min: hs.find((h) => h.tmn !== null)?.tmn ?? Math.min(...temps),
      max: hs.find((h) => h.tmx !== null)?.tmx ?? Math.max(...temps),
      pop: Math.max(...hs.map((h) => h.pop)),
      wind: Math.max(...hs.map((h) => h.wind)),
      sky: noon.sky,
      rain: wet ? wet.rain : '없음',
      partial: date !== today && hs.length < 24,   // 하루 중 일부 시간대만 있는 날
      source: 'short',
    }
  })
  const tomorrow = ymd(new Date(kstNow().getTime() + 24 * 3600e3))
  const tomorrowHours = all.filter((h) => h.time.startsWith(tomorrow))   // 내일 0~23시 (시간별)
  const todayHours = all.filter((h) => h.time.startsWith(today))   // 오늘 하루 (지난 시간 포함, 오전/오후 요약용)
  return { hours: hours.length ? hours : all.slice(0, 12), todayHours, tomorrowHours, days }
}

// 중기예보 → 일별 (4 ~ 10일 후)
async function getMid(lat, lon, startFromDate) {
  const city = nearestCity(lat, lon)
  const { date: baseDate, tmFc } = midBase()
  const [[land], [ta]] = await Promise.all([
    callApi(`${MID_URL}/getMidLandFcst`, { numOfRows: '10', pageNo: '1', regId: city.land, tmFc }),
    callApi(`${MID_URL}/getMidTa`, { numOfRows: '10', pageNo: '1', regId: city.ta, tmFc }),
  ])
  if (!land || !ta) throw new Error('중기예보 데이터가 비어 있어요')

  const days = []
  for (let n = 4; n <= 10; n++) {
    const d = ymd(new Date(baseDate.getTime() + n * 24 * 3600e3))
    if (d <= startFromDate) continue // 단기예보가 이미 채운 날짜는 건너뜀
    // 4~7일 후는 오전/오후로 나뉘고, 8~10일 후는 하루 한 값
    const am = n <= 7 ? [`Am`, `Pm`] : ['']
    const wf = am.map((s) => land[`wf${n}${s}`]).filter(Boolean)
    const pops = am.map((s) => Number(land[`rnSt${n}${s}`])).filter((x) => Number.isFinite(x))
    const min = ta[`taMin${n}`], max = ta[`taMax${n}`]
    if (!wf.length || min === undefined || max === undefined) continue
    const text = wf[wf.length - 1] // 오후(또는 하루) 날씨 문구, 예: "구름많고 비"
    days.push({
      date: d,
      min: Number(min),
      max: Number(max),
      pop: pops.length ? Math.max(...pops) : 0,
      wind: null,
      sky: text,
      rain: wf.some((t) => t.includes('눈')) ? '눈' : wf.some((t) => /비|소나기/.test(t)) ? '비' : '없음',
      source: 'mid',
    })
  }
  return { days, region: city.name }
}

// 위도·경도에 해당하는 시간별(12시간) + 일별(최대 10일) 예보
export async function getWeather({ lat, lon }) {
  if (!process.env.DATA_GO_KR_KEY) throw new Error('서버에 DATA_GO_KR_KEY 가 설정되지 않았어요')
  const { nx, ny } = toGrid(lat, lon)
  const short = await getShort(nx, ny)

  // 중기예보는 별도 서비스 — 실패해도(활용신청 전 등) 단기예보는 그대로 보여줍니다
  let days = short.days
  let midRegion = null
  let midError = null
  try {
    const last = short.days[short.days.length - 1]?.date ?? ymd(kstNow())
    const mid = await getMid(lat, lon, last)
    days = [...short.days, ...mid.days.filter((d) => d.date > last)]
    midRegion = mid.region
  } catch (e) {
    midError = e.message
  }
  return { nx, ny, hours: short.hours, todayHours: short.todayHours, tomorrowHours: short.tomorrowHours, days, midRegion, midError }
}
