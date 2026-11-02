import { Alert, Card, Col, Row } from 'react-bootstrap'
import OutfitCard from './OutfitCard'
import TempBadge from './TempBadge'
import { dayLabel, iconOf } from '../lib/weather'
import { recommendDay, summarizeWeek } from '../lib/outfit'

// 한 주(이번주/다음주): 위쪽 요약 + 날짜별로 [왼쪽 날씨 카드 | 오른쪽 옷차림 카드]
export default function WeekCard({ days, emptyText }) {
  if (!days.length) return <Alert variant="secondary">{emptyText}</Alert>
  const s = summarizeWeek(days)

  return (
    <>
      <Card className="mb-4 border-primary">
        <Card.Body>
          <Card.Title className="fw-bold"><i className="bi bi-calendar-week me-2 text-primary" />한 주 요약</Card.Title>
          <ul className="mb-0">
            <li>
              가장 추운 날은 <b>{dayLabel(s.coldest.date)}</b>(최저 {s.coldest.min}℃),
              가장 따뜻한 날은 <b>{dayLabel(s.warmest.date)}</b>(최고 {s.warmest.max}℃)예요.
            </li>
            <li>
              {s.wetDays.length
                ? <>우산을 챙길 날: <b>{s.wetDays.map((d) => dayLabel(d.date)).join(', ')}</b></>
                : '비 소식이 없어요. 우산은 필요 없어요.'}
            </li>
            {s.gap >= 10 && <li>이번 기간 기온 차가 {s.gap}℃로 커요. 입고 벗기 쉬운 겹쳐 입기를 추천해요.</li>}
          </ul>
        </Card.Body>
      </Card>

      {days.map((d) => {
        const outfit = recommendDay(d)
        return (
          <Row key={d.date} className="g-3 mb-3">
            <Col md={5}>
              <Card className="h-100">
                <Card.Body className="d-flex flex-column justify-content-center">
                  <div className="fw-bold mb-2">{dayLabel(d.date)}</div>
                  <div className="d-flex align-items-center">
                    <i className={`bi bi-${iconOf(d)} display-5 text-primary me-3`} />
                    <div>
                      <div className="fs-5 fw-bold">
                        <span className="text-danger">{d.max}°</span> / <span className="text-primary">{d.min}°</span>
                      </div>
                      <div className="small text-muted">{d.sky}</div>
                    </div>
                    {/* 날씨 오른쪽에 기온 구간(쌀쌀함·추움 등) */}
                    <TempBadge label={outfit.label} className="ms-auto fs-6" />
                  </div>
                  <div className="small text-muted mt-2">
                    강수확률 {d.pop}%{d.wind != null && ` · 바람 ${d.wind}m/s`}
                    {d.partial && <div>일부 시간대 기준</div>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <OutfitCard outfit={outfit} title="추천 옷차림" className="" showLabel={false} />
            </Col>
          </Row>
        )
      })}
    </>
  )
}
