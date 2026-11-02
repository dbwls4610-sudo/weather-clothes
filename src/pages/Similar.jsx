import { useEffect, useState } from 'react'
import { Alert, Button, Col, Row, Spinner } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PastCard, { PastModal } from '../components/PastCard'
import { PAST_MAX, usePastPicks } from '../lib/usePastPicks'
import { todaySnapshot, tomorrowSnapshot } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

// 비슷한 날씨에 입었던 옷을 최대 30개까지 모아 보는 페이지 (홈 카드의 "더보기"로 들어옴)
// /similar?day=today | tomorrow — 홈에서 불러온 날씨를 기준으로 합니다
export default function Similar() {
  const [params] = useSearchParams()
  const isTomorrow = params.get('day') === 'tomorrow'
  const label = isTomorrow ? '내일' : '오늘'

  const weather = useAppStore((s) => s.weather)
  const loading = useAppStore((s) => s.weatherLoading)
  const hasLastPlace = useAppStore((s) => s.hasLastPlace)
  const loadWeather = useAppStore((s) => s.loadWeather)
  const authReady = useAppStore((s) => s.authReady)
  const [open, setOpen] = useState(null)

  // 주소로 바로 들어오거나 새로고침해서 날씨가 없으면, 마지막으로 본 지역의 날씨를 불러옵니다
  useEffect(() => {
    const s = useAppStore.getState()
    if (hasLastPlace && !s.weather && !s.weatherLoading) s.loadWeather()
  }, [hasLastPlace, loadWeather])

  const snap = weather ? (isTomorrow ? tomorrowSnapshot(weather) : todaySnapshot(weather, { label: '', place: '' })) : null
  const { user, rows, picks, urls } = usePastPicks({ weather: snap, label, includeToday: isTomorrow, show: PAST_MAX })

  const header = (
    <PageHeader
      icon="images" title="비슷한 날, 내가 입었던 옷"
      subtitle={snap ? `${label}(${snap.min}~${snap.max}°)과 비슷했던 날, 딱 좋았던 옷부터 최대 ${PAST_MAX}개까지 보여 드려요.` : '비슷한 날씨에 입었던 옷을 모아 볼 수 있어요.'}
    />
  )
  const back = <Button as={Link} to="/" variant="outline-secondary" size="sm" className="mb-3"><i className="bi bi-chevron-left" /> 홈으로</Button>

  if (!authReady) return <Spinner />
  if (!user) {
    return (
      <>
        {header}
        <Alert variant="secondary" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          로그인하면 볼 수 있어요.
          <Button as={Link} to="/login" size="sm">로그인</Button>
        </Alert>
      </>
    )
  }
  if (!snap) {
    return (
      <>
        {header}
        {back}
        {loading || hasLastPlace
          ? <div className="text-muted"><Spinner size="sm" className="me-2" />날씨를 불러오는 중...</div>
          : <Alert variant="secondary">{label} 날씨를 먼저 알아야 해요. 홈에서 지역을 고르고 "날씨 보기"를 눌러 주세요.</Alert>}
      </>
    )
  }

  return (
    <>
      {header}
      {back}
      {rows === null && <Spinner />}
      {rows !== null && picks.length === 0 && (
        <Alert variant="secondary">
          {label}({snap.min}~{snap.max}°)과 어울리는 지난 기록이 아직 없어요. 비슷한 날씨에 입은 옷을 기록해 두면 여기에 나와요.
        </Alert>
      )}
      {picks.length > 0 && (
        <>
          <div className="small text-muted mb-3">모두 {picks.length}개 · 차이는 {label}이 과거보다 높으면 +, 낮으면 -예요.</div>
          <Row xs={2} md={3} lg={4} className="g-3">
            {picks.map((p) => (
              <Col key={p.log_date}><PastCard p={p} url={urls[p.photo_path]} onOpen={setOpen} /></Col>
            ))}
          </Row>
        </>
      )}

      <PastModal open={open} url={open && urls[open.photo_path]} onClose={() => setOpen(null)} />
    </>
  )
}
