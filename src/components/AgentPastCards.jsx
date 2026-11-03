import { useEffect, useState } from 'react'
import PastCard, { PastModal } from './PastCard'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'

// AI 도우미 답변 아래에 붙는 "비슷한 날 입었던 옷" 카드
// items: 서버가 돌려준 기록(날짜·느낌·후기·기온 비교 등). 사진은 서버도 AI 도 모르고,
// 여기서 내 브라우저가 내 로그인 권한으로 Supabase 에서 직접 불러와요 (AI 에게는 보내지 않음).
export default function AgentPastCards({ items }) {
  const [urls, setUrls] = useState({})        // 날짜 → 사진 주소
  const [open, setOpen] = useState(null)

  useEffect(() => {
    if (!supabase || !items.length) return
    let cancelled = false
    ;(async () => {
      const { data: rows } = await supabase.from('outfit_logs').select('log_date, photo_path').in('log_date', items.map((i) => i.log_date))
      if (cancelled || !rows?.length) return
      const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(rows.map((r) => r.photo_path), 3600)
      if (cancelled || !signed) return
      const byPath = Object.fromEntries(signed.map((s) => [s.path, s.signedUrl]))
      setUrls(Object.fromEntries(rows.map((r) => [r.log_date, byPath[r.photo_path]])))
    })()
    return () => { cancelled = true }
  }, [items])

  if (!items.length) return null
  return (
    <div className="mb-3">
      <div className="small text-muted mb-1">
        <i className="bi bi-images me-1" />비슷한 날 내가 입었던 옷 (사진은 내 화면에서만 불러오고 AI에게는 보내지 않아요)
      </div>
      <div className="past-slider" tabIndex={0} aria-label="비슷한 날 입었던 옷 (옆으로 밀어서 보기)">
        {items.map((p) => <div key={p.log_date}><PastCard p={p} url={urls[p.log_date]} onOpen={setOpen} /></div>)}
      </div>
      <PastModal open={open} url={open && urls[open.log_date]} onClose={() => setOpen(null)} />
    </div>
  )
}
