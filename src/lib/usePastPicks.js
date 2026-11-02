import { useEffect, useMemo, useState } from 'react'
import { PHOTO_BUCKET, supabase } from './supabase'
import { recommendPast } from './pastOutfits'
import { todayKey } from './weather'
import { useAppStore } from '../store/useAppStore'

export const PAST_MAX = 30   // 비슷한 날 기록은 최대 30개까지

// 비교할 날(오늘/내일)의 날씨와 비슷한 날 내가 입은 옷 기록을 고릅니다 — 홈의 카드와 "더보기" 페이지가 함께 씀
//  · weather: todaySnapshot() / tomorrowSnapshot() 값, label: "오늘" | "내일", includeToday: 오늘 올린 기록도 후보에 넣을지
//  · show: 사진 주소를 받아 올 개수 (홈 카드는 5개, 더보기 페이지는 30개)
// 돌려주는 값: user, rows(내 기록 전부, 불러오는 중이면 null), picks(고른 순서대로 최대 30개), urls(사진 경로 → 주소)
export function usePastPicks({ weather, label, includeToday = false, show }) {
  const user = useAppStore((s) => s.user)
  const [rows, setRows] = useState(null)
  const [urls, setUrls] = useState({})

  useEffect(() => {
    if (!user || !supabase) return
    let cancelled = false
    ;(async () => {
      let query = supabase.from('outfit_logs').select('log_date, photo_path, label, temp, place, weather, feel, note')
      if (!includeToday) query = query.neq('log_date', todayKey())
      const { data } = await query.order('log_date', { ascending: false }).limit(400)
      if (!cancelled) setRows(data ?? [])   // 아직 DB 준비 전이면 조용히 빈 목록으로 (사진 올리기 쪽에서 안내해요)
    })()
    return () => { cancelled = true }
  }, [user, includeToday])

  // 비교할 날의 날씨(기온·비)가 바뀌면 다시 고릅니다
  const picks = useMemo(
    () => (rows && weather ? recommendPast(rows, weather, PAST_MAX, label) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, weather?.min, weather?.max, weather?.rain, label],
  )

  // 보여줄 기록의 사진 주소만 받아 옵니다
  useEffect(() => {
    const need = picks.slice(0, show).map((p) => p.photo_path).filter((path) => !urls[path])
    if (!need.length) return
    let cancelled = false
    supabase.storage.from(PHOTO_BUCKET).createSignedUrls(need, 3600).then(({ data }) => {
      if (cancelled || !data) return
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.map((d) => [d.path, d.signedUrl])) }))
    })
    return () => { cancelled = true }
  }, [picks, urls, show])

  return { user, rows, picks, urls }
}
