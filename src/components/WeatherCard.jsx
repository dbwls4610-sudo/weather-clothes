import { Card } from 'react-bootstrap'
import { dayLabel, iconOf } from '../lib/weather'

// "20261102 1500" → "15시"
const hourLabel = (time) => `${Number(time.split(' ')[1].slice(0, 2))}시`

function HourBox({ h }) {
  return (
    <div className="border rounded p-2 small text-center">
      <div className="text-muted">{hourLabel(h.time)}</div>
      <i className={`bi bi-${iconOf(h)} fs-5`} />
      <div className="fw-bold">{h.temp}℃</div>
      <div className="text-muted">{h.pop}%</div>
    </div>
  )
}

// 오늘: hours 의 첫 시간(지금) 기준 / 내일: day(하루 요약)를 위에 보여주고 시간별은 아래에
export default function WeatherCard({ hours, day }) {
  const now = hours[0]
  return (
    <Card className="mb-4">
      <Card.Body>
        {day ? (
          <div className="d-flex align-items-center mb-3">
            <i className={`bi bi-${iconOf(day)} display-3 text-primary me-3`} />
            <div>
              <div className="fw-bold mb-1">{dayLabel(day.date)}</div>
              <div className="display-5 fw-bold">
                <span className="text-danger">{day.max}°</span> / <span className="text-primary">{day.min}°</span>
              </div>
              <div className="text-muted">
                {day.rain !== '없음' ? day.rain : day.sky} · 강수확률 {day.pop}%{day.wind != null && ` · 바람 ${day.wind}m/s`}
              </div>
            </div>
          </div>
        ) : (
          <div className="d-flex align-items-center mb-3">
            <i className={`bi bi-${iconOf(now)} display-3 text-primary me-3`} />
            <div>
              <div className="display-5 fw-bold">{now.temp}℃</div>
              <div className="text-muted">
                {now.rain !== '없음' ? now.rain : now.sky} · 강수확률 {now.pop}% · 바람 {now.wind}m/s · 습도 {now.humidity}%
              </div>
            </div>
          </div>
        )}
        {/* 시간별 예보: 옆으로 밀어서 보는 슬라이드 */}
        <div className="hour-slider" tabIndex={0} aria-label="시간별 예보 (옆으로 밀어서 보기)">
          {hours.map((h) => <HourBox key={h.time} h={h} />)}
        </div>
      </Card.Body>
    </Card>
  )
}
