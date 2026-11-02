import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Nav, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import PlaceSelect from '../components/PlaceSelect'
import WeatherCard from '../components/WeatherCard'
import OutfitCard from '../components/OutfitCard'
import OutfitPhoto from '../components/OutfitPhoto'
import PastOutfits from '../components/PastOutfits'
import WeekCard from '../components/WeekCard'
import { ping } from '../api/client'
import { isSupabaseReady } from '../lib/supabase'
import { recommendDay, recommendOutfit } from '../lib/outfit'
import { findTomorrow, splitWeeks, todaySnapshot, tomorrowSnapshot } from '../lib/weather'
import { placeLabel } from '../lib/places'
import { useAppStore } from '../store/useAppStore'

export default function Home() {
  const weather = useAppStore((s) => s.weather)
  const loading = useAppStore((s) => s.weatherLoading)
  const error = useAppStore((s) => s.weatherError)
  const loadWeather = useAppStore((s) => s.loadWeather)
  const selectPlace = useAppStore((s) => s.selectPlace)
  const place = useAppStore((s) => s.place)
  const weatherPlace = useAppStore((s) => s.weatherPlace)
  // 전에 본 지역이 있으면 홈을 열 때 바로 날씨를 불러옵니다 (이미 불러온 날씨가 있으면 그대로)
  useEffect(() => {
    const s = useAppStore.getState()
    if (s.hasLastPlace && !s.weather && !s.weatherLoading) s.loadWeather()
  }, [])
  const [tab, setTab] = useState('today')  // 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek'
  const outfit = weather && recommendOutfit(weather.hours)
  // 사진과 함께 저장하고, 비슷한 날의 옷을 고르는 데 쓰는 오늘 날씨
  const snapshot = weather && todaySnapshot(weather, { label: outfit.label, place: weatherPlace === 'mine' ? '내 위치' : placeLabel(weatherPlace) })
  const tomorrow = weather?.tomorrowHours?.length ? findTomorrow(weather.days) : null
  const weeks = weather ? splitWeeks(weather.days) : { thisWeek: [], nextWeek: [] }

  return (
    <>
      <PageHeader icon="cloud-sun" title="제주 옷차림 비서" subtitle="내 위치나 제주시·서귀포시의 동네별 날씨에 맞는 옷차림을 알려드려요." />

      <div className="d-flex flex-wrap gap-2 mb-4">
        {/* 1단계: 내 위치 / 시 선택 → 2단계: 동·읍·면 선택 (시를 고르면 시 전체 날씨부터) */}
        <PlaceSelect value={place} onChange={selectPlace} includeMine disabled={loading} />
        <Button onClick={loadWeather} disabled={loading}>
          {loading
            ? <><Spinner size="sm" className="me-2" />불러오는 중...</>
            : <><i className="bi bi-geo-alt me-2" />날씨 보기</>}
        </Button>
      </div>
      {error && <Alert variant="danger"><i className="bi bi-exclamation-triangle me-2" />{error}</Alert>}

      {weather && (
        <>
          <div className="fw-bold mb-2"><i className="bi bi-geo-alt-fill me-1 text-primary" />
            {weatherPlace === 'mine' ? '내 위치' : placeLabel(weatherPlace)}
          </div>
          <Nav variant="pills" className="mb-3" activeKey={tab} onSelect={setTab}>
            {/* as="button": 주소를 바꾸는 링크가 아니라 화면 안에서만 바뀌는 버튼 */}
            <Nav.Item><Nav.Link as="button" eventKey="today">오늘</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link as="button" eventKey="tomorrow">내일</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link as="button" eventKey="thisWeek">이번주</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link as="button" eventKey="nextWeek">다음주</Nav.Link></Nav.Item>
          </Nav>

          {tab === 'today' && (
            <>
              <WeatherCard hours={weather.hours} />
              <OutfitCard outfit={outfit} />
              <PastOutfits weather={snapshot} />
              <OutfitPhoto weather={snapshot} />
            </>
          )}
          {tab === 'tomorrow' && (tomorrow
            ? (
              <>
                <WeatherCard hours={weather.tomorrowHours} day={tomorrow} />
                <OutfitCard outfit={recommendDay(tomorrow)} />
                <PastOutfits weather={tomorrowSnapshot(weather)} label="내일" includeToday />
              </>
            )
            : <Alert variant="secondary">내일 예보를 찾지 못했어요.</Alert>)}
          {tab === 'thisWeek' && <WeekCard days={weeks.thisWeek} emptyText="이번주 남은 예보가 없어요." />}
          {tab === 'nextWeek' && (
            <WeekCard days={weeks.nextWeek} emptyText="다음주 예보는 아직 없어요. 기상청은 최대 10일 뒤까지만 예보해요." />
          )}

          {(tab === 'thisWeek' || tab === 'nextWeek') && weather.midError && (
            <Alert variant="warning" className="small">
              <i className="bi bi-info-circle me-2" />3일 이후 예보(중기예보)를 불러오지 못했어요: {weather.midError}
            </Alert>
          )}
          {(tab === 'thisWeek' || tab === 'nextWeek') && !weather.midError && (
            <div className="small text-muted mb-4">
              3일 후까지는 단기예보, 그 이후는 {weather.midRegion} 기준 중기예보예요. 기상청은 최대 10일 뒤까지만 예보해서 다음주는 일부만 보일 수 있어요.
            </div>
          )}
        </>
      )}

      <Checks />
    </>
  )
}

// 동작 체크 — 개발 중에 설정이 잘 됐는지 확인하는 용도
function Checks() {
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

  useEffect(() => {
    ping()
      .then((d) => setApi({
        state: d.hasDataKey ? 'ok' : 'fail',
        msg: `서버 OK · 공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}`,
      }))
      .catch(() => setApi({ state: 'fail', msg: 'npm run dev 가 아니라 vercel dev 로 실행했는지 확인' }))
  }, [])

  const db = isSupabaseReady
    ? { state: 'ok', msg: '환경변수 설정됨' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / ANON_KEY 를 넣으세요' }

  return (
    <>
      <h6 className="fw-bold text-muted mt-5 mb-3"><i className="bi bi-clipboard-check me-2" />동작 체크</h6>
      <Row xs={1} md={3} className="g-3">
        <Col><Check title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" /></Col>
        <Col><Check title="Supabase" {...db} /></Col>
        <Col><Check title="서버 함수 /api" {...api} /></Col>
      </Row>
    </>
  )
}

function Check({ title, state, msg }) {
  const icon = { ok: 'check-circle-fill text-success', fail: 'x-circle-fill text-danger', wait: 'hourglass-split text-muted' }[state]
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="fw-bold mb-1"><i className={`bi bi-${icon} me-2`} />{title}</div>
        <div className="small text-muted">{msg}</div>
      </Card.Body>
    </Card>
  )
}
