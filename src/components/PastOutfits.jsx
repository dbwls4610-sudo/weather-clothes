import { useState } from 'react'
import { Button, Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PastCard, { PastModal } from './PastCard'
import { usePastPicks } from '../lib/usePastPicks'

const SHOW = 5   // 홈 카드에는 5개까지 슬라이드로, 더 보려면 "더보기"

// 오늘(또는 내일) 날씨와 비슷한 날 내가 입었던 옷 사진 — 그때의 날씨 기록과 입어 본 느낌을 함께 보고 골라 줍니다
// weather: todaySnapshot() / tomorrowSnapshot() 이 만든 날씨
// label: "오늘" | "내일" — 비교할 날 / includeToday: 오늘 올린 기록도 후보에 넣을지 (내일 옷을 고를 때는 오늘 입은 옷도 참고)
export default function PastOutfits({ weather, label = '오늘', includeToday = false }) {
  const { user, rows, picks, urls } = usePastPicks({ weather, label, includeToday, show: SHOW })
  const [open, setOpen] = useState(null)       // 크게 보는 기록

  if (!user || rows === null) return null

  return (
    <Card className="mb-4">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between gap-2">
          <Card.Title className="fw-bold">
            <i className="bi bi-images me-2 text-primary" />비슷한 날, 내가 입었던 옷
          </Card.Title>
          {/* 5개보다 더 있을 때만: 최대 30개를 모아 보는 페이지로 */}
          {picks.length > SHOW && (
            <Button as={Link} to={`/similar?day=${label === '내일' ? 'tomorrow' : 'today'}`} variant="outline-primary" size="sm" className="text-nowrap">
              더보기 <i className="bi bi-chevron-right" />
            </Button>
          )}
        </div>

        {picks.length === 0 ? (
          <div className="small text-muted">
            {rows.length === 0
              ? '아직 올린 사진이 없어요. 사진을 올려 두면 비슷한 날씨에 입었던 옷을 여기서 골라 드릴게요.'
              : `${label}(${weather.min}~${weather.max}°)과 어울리는 지난 기록이 아직 없어요. 비슷한 날씨에 입은 옷을 기록해 두면 여기에 나와요.`}
          </div>
        ) : (
          <>
            <div className="small text-muted mb-3">
              <div>{label}({weather.min}~{weather.max}°)과 비슷했던 날, 딱 좋았던 옷부터 보여 드려요.</div>
              <div>차이는 {label}이 과거보다 높으면 +, 낮으면 -예요.</div>
              <div>옆으로 밀어서 보세요.</div>
            </div>
            <div className="past-slider" tabIndex={0} aria-label="과거에 입은 옷 (옆으로 밀어서 보기)">
              {picks.slice(0, SHOW).map((p) => (
                <div key={p.log_date}><PastCard p={p} url={urls[p.photo_path]} onOpen={setOpen} /></div>
              ))}
            </div>
          </>
        )}
      </Card.Body>

      <PastModal open={open} url={open && urls[open.photo_path]} onClose={() => setOpen(null)} />
    </Card>
  )
}
