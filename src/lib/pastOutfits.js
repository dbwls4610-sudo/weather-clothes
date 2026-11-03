// 오늘 날씨에 맞는 "내가 과거에 입었던 옷 기록" 고르기
// 그때의 느낌(feel)과 기록한 날씨(최고·최저 기온)를 함께 봐서, 오늘 입으면 좋을 것 같은 기록을 순서대로 뽑습니다.

// 그날의 평균 기온 — 날씨 전체가 있으면 (최저+최고)/2, 예전 기록은 저장해 둔 기온
const avgOf = (r) => {
  if (r.weather?.min != null && r.weather?.max != null) return (r.weather.min + r.weather.max) / 2
  return r.temp != null ? Number(r.temp) : null
}
const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length

// 입어 본 느낌의 우선순위: 딱 좋았어요 → 조금 더웠/추웠어요 → 많이 더웠/추웠어요 → (느낌 안 적음)
const tierOf = (feel) => (feel === null ? 3 : Math.abs(feel))

// 얼마나 다른 날씨까지 "비슷한 날"로 볼지 — 최고·최저 차이의 평균(avg)과, 한쪽이라도 이만큼은 안 넘게(each)
// 먼저 엄격한 기준으로 찾고, 비슷한 기록이 ENOUGH 개보다 적으면 다음(완화) 기준으로 다시 찾습니다.
const LIMITS = [
  { avg: 4, each: 6 },   // 기본 기준
  { avg: 6, each: 9 },   // 기록이 적을 때 쓰는 완화 기준 (기록이 쌓이면 자동으로 기본 기준만 쓰게 됨)
]
const ENOUGH = 3

// 오늘과 그 기록을 "최고는 최고끼리, 최저는 최저끼리" 맞춰 봅니다. (화면에 보이는 "과거: 18/12", "오늘: 16/8" 과 같은 값)
// 최고·최저가 없는 예전 기록은 저장해 둔 기온 하나를 오늘의 평균 기온과 비교해요.
function pairsOf(today, r, todayAvg, avg) {
  if (r.weather?.max != null && r.weather?.min != null) {
    return [
      { k: 'max', today: today.max, log: r.weather.max },
      { k: 'min', today: today.min, log: r.weather.min },
    ]
  }
  return [{ k: 'day', today: todayAvg, log: avg }]
}

// limit 기준으로 후보를 모두 고르고 정렬한 목록 (개수 자르기 전)
function select(rows, today, label, limit) {
  const todayAvg = (today.min + today.max) / 2
  const todayWet = today.rain !== '없음'

  return rows
    .map((r) => {
      const avg = avgOf(r)
      if (avg === null) return null
      const feel = r.feel ?? null
      const pairs = pairsOf(today, r, todayAvg, avg)
      const signed = mean(pairs.map((x) => x.today - x.log))          // 오늘이 그날보다 평균 몇 도 더 따뜻한지
      if (feel !== null && feel < 0 && signed < 0) return null        // 추웠는데 오늘이 더 추움
      if (feel !== null && feel > 0 && signed > 0) return null        // 더웠는데 오늘이 더 더움

      let gap = mean(pairs.map((x) => Math.abs(x.today - x.log)))     // 날씨 차이 (작을수록 비슷)
      if (gap > limit.avg || pairs.some((x) => Math.abs(x.today - x.log) > limit.each)) return null
      if (todayWet && r.weather?.rain && r.weather.rain !== '없음') gap -= 0.5
      return {
        ...r, avg, gap, tier: tierOf(feel),
        relaxed: gap > LIMITS[0].avg || pairs.some((x) => Math.abs(x.today - x.log) > LIMITS[0].each),   // 기본 기준으로는 못 들어오는, 기온 차이가 조금 큰 기록
        pastTemps: tempsOf(r.weather?.max, r.weather?.min, r.temp), todayTemps: tempsOf(today.max, today.min), todayName: label,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.tier - b.tier || a.gap - b.gap || b.log_date.localeCompare(a.log_date))
}

// rows: outfit_logs 기록들, today: todaySnapshot() 값 → 보여줄 순서대로 최대 max 개
// 순서: ① 느낌 우선순위(딱 좋았어요가 먼저) ② 같은 느낌끼리는 오늘과 날씨가 가장 비슷한 순서
//       (최고 기온 차와 최저 기온 차의 평균이 작을수록 비슷) ③ 그래도 같으면 최근 기록이 먼저
// 걸러내는 기록:
//  · 그날 추웠는데 오늘이 더 춥거나, 그날 더웠는데 오늘이 더 더우면 그 옷은 오늘 입기에 안 맞아서 뺍니다.
//  · 기온 차이가 한도(LIMITS)를 넘는 기록. 비슷한 기록이 3개보다 적으면 한도를 넓혀서 다시 찾아요.
// 오늘 비가 오는데 그날도 비가 왔다면 조금 더 비슷한 걸로 봐요.
// label: 비교하는 날의 이름 ("오늘" 또는 "내일") — 카드의 "오늘: 16/8" 줄 이름으로 쓰여요
export function recommendPast(rows, today, max = 5, label = '오늘') {
  let picks = []
  for (const limit of LIMITS) {
    picks = select(rows, today, label, limit)
    if (picks.length >= ENOUGH) break
  }
  return picks.slice(0, max)
}

// 카드의 "과거: 18/12" 줄에 쓸 숫자 (최고/최저, 반올림). 예전 기록처럼 최고·최저가 없으면 저장해 둔 기온 하나만 max 자리에 담아요.
function tempsOf(max, min, temp) {
  if (max != null && min != null) return { max: Math.round(max), min: Math.round(min) }
  return { max: temp != null ? Math.round(temp) : null, min: null }
}
