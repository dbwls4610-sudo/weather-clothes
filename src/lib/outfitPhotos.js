// 옷 사진 올리기 공통 기능 — 홈(오늘 사진)과 마이페이지(지난 날짜 사진)가 함께 씁니다
import { PHOTO_BUCKET, supabase } from './supabase'

// 사진을 가로·세로 최대 1280px 의 JPEG 으로 줄여서 올립니다 (휴대폰 원본은 용량이 커요)
export function shrinkImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 변환하지 못했어요'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 읽지 못했어요. 다른 사진으로 해 보세요')) }
    img.src = url
  })
}

// 그 날짜(date: "2026-11-02")의 사진 한 장 저장. 같은 날짜에 이미 있으면 덮어씁니다.
// weather 는 todaySnapshot() 값 — 지난 날짜는 그날 날씨를 알 수 없어서 null 로 저장해요.
export async function saveOutfitLog({ userId, date, file, weather = null, feel = null, note = null }) {
  const blob = await shrinkImage(file)
  const path = `${userId}/${date}.jpg`
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const row = {
    user_id: userId, log_date: date, photo_path: path,
    label: weather?.label ?? null, temp: weather?.temp ?? null, place: weather?.place ?? null, weather, feel, note: note?.trim() || null,
  }
  const { data, error } = await supabase.from('outfit_logs').upsert(row, { onConflict: 'user_id,log_date' }).select().single()
  if (error) throw error
  const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
  return { ...data, url: signed?.signedUrl }
}

// DB 준비가 안 됐을 때의 안내 (SQL 은 supabase/schema.sql)
export function friendlyError(e) {
  const m = e?.message ?? ''
  if (m.includes('Bucket not found')) return '사진 보관함이 아직 없어요 (supabase/schema.sql 실행 필요)'
  if (m.includes("'weather'")) return '날씨를 저장할 칸이 아직 없어요 (supabase/schema.sql 을 다시 실행해 주세요)'
  if (m.includes("'note'")) return '후기를 저장할 칸이 아직 없어요 (supabase/schema.sql 을 다시 실행해 주세요)'
  if (m.includes("'feel'")) return '느낌을 저장할 칸이 아직 없어요 (supabase/schema.sql 을 다시 실행해 주세요)'
  return m || '문제가 생겼어요'
}
