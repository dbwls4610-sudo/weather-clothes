import { Alert, Card, Col, Row } from 'react-bootstrap'
import OutfitCard from './OutfitCard'
import TempBadge from './TempBadge'
import { dayLabel, iconOf } from '../lib/weather'
import { recommendDay, summarizeWeek } from '../lib/outfit'

// 한 주 안에서 가장 따뜻한 날과 가장 추운 날의 최고 기온 차이가 이 값(℃) 이상이면 "겹쳐 입기" 안내를 보여 줍니다
const GAP_NOTICE = 8

// 한 주(이번주/다음주): 위쪽 요약 + 날짜별로 [왼쪽 날씨 카드 | 오른쪽 옷차림 카드]
export default function WeekCard({ days, emptyText }) {
  if (!days.length) return <Alert variant="secondary">{emptyText}</Alert>
  const s = summarizeWeek(days)

  return (
    <>
      <Card className="mb-4 border-primary week-summary">
        <Card.Body>
          <Card.Title className="fw-bold"><i className="bi bi-calendar-week me-2 text-primary" />한 주 요약</Card.Title>
          <ul className="mb-0">
            <li>
              가장 추운 날은 <b>{dayLabel(s.coldest.date)}</b>(최고 {s.coldest.max}℃),<br className="d-sm-none" />
              가장 따뜻한 날은 <b>{dayLabel(s.warmest.date)}</b>(최고 {s.warmest.max}℃)예요.
            </li>
            <li>
              {s.wetDays.length
                ? <>우산을 챙길 날: <b>{s.wetDays.map((d) => dayLabel(d.date)).join(', ')}</b></>
                : '비 소식이 없어요. 우산은 필요 없어요.'}
            </li>
            {s.gap >= GAP_NOTICE && <li>이번 기간 기온 차가 {s.gap}℃로 커요. 입고 벗기 쉬운 겹쳐 입기를 추천해요.</li>}
          </ul>
        </Card.Body>
      </Card>

      {days.map((d) => {
        const outfit = recommendDay(d)
        // 왼쪽 날씨 / 오른쪽 추천 옷차림. 폰(576px 미만)에서만 왼쪽을 좁혀 4:8 (+ theme.css 의 .week-row 좁은 화면용 글자·여백), 그보다 넓으면 5:7 그대로
        return (
          <Row key={d.date} className="g-2 g-md-3 mb-3 week-row">
            <Col xs={4} sm={5} className="wk-col-l">
              <Card className="h-100 wk-left">
                <Card.Body className="d-flex flex-column justify-content-center">
                  {/* 날짜 줄: 오른쪽 위에 기온 구간(쌀쌀함·추움 등) */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-1 mb-2">
                    <span className="fw-bold wk-date">{dayLabel(d.date)}</span>
                    <TempBadge label={outfit.label} className="wk-badge" />
                  </div>
                  <div className="d-flex align-items-center wk-main">
                    <i className={`bi bi-${iconOf(d)} display-5 text-primary me-3 wk-icon`} />
                    <div>
                      <div className="fs-5 fw-bold">
                        <span className="text-danger">{d.max}°</span> / <span className="text-primary">{d.min}°</span>
                      </div>
                      <div className="small text-muted">{d.sky}</div>
                    </div>
                    {/* 웹에서는 아이콘·기온 오른쪽에, 폰에서는 그 아래에 (theme.css 의 .wk-extra) */}
                    <div className="small text-muted wk-extra">
                      <div>강수확률 {d.pop}%</div>
                      {d.wind != null && <div>바람 {d.wind}m/s</div>}
                      {d.partial && <div>일부 시간대 기준</div>}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={8} sm={7} className="wk-col-r">
              <OutfitCard outfit={outfit} title="추천 옷차림" className="" border="" showLabel={false} tipsFirst />
            </Col>
          </Row>
        )
      })}
    </>
  )
}