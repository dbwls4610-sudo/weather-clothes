import { Card } from 'react-bootstrap'
import { dayLabel, hourIconOf, iconOf } from '../lib/weather'

// "20261102 1500" → "15시"
const hourLabel = (time) => `${Number(time.split(' ')[1].slice(0, 2))}시`

function HourBox({ h }) {
  const { icon, kind, title } = hourIconOf(h)   // 낮 해 / 밤 달 / 일출·일몰 아이콘
  return (
    <div className={`border rounded p-2 small text-center hour-box hour-${kind}`}>
      <div className="text-muted">{hourLabel(h.time)}</div>
      <i className={`bi bi-${icon} fs-5 hour-icon`} title={title} />
      <div className="fw-bold">{h.temp}℃</div>
      <div className="text-muted">{h.pop}%</div>
    </div>
  )
}

// 시간별 기온 꺾은선 그래프: 각 시간 카드 바로 아래에 그 시간의 기온 높이로 점을 찍고 점끼리 선으로 잇습니다.
// 축·눈금·숫자는 그리지 않고 높낮이만 보여줘요. 카드와 같은 폭의 칸(.hour-col)을 쓰니 점이 카드 바로 아래에 옵니다.
function TempLine({ temps }) {
  const n = temps.length
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  // 높은 기온일수록 위. 위아래에 여백(15%)을 두어 점이 잘리지 않게 하고, 기온이 모두 같으면 가운데에 놓음
  const y = (t) => (hi === lo ? 50 : 15 + ((hi - t) / (hi - lo)) * 70)
  return (
    <div className="hour-chart" role="img" aria-label="시간별 기온 변화 그래프">
      <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" aria-hidden="true">
        <polyline points={temps.map((t, i) => `${i + 0.5},${y(t)}`).join(' ')} fill="none" className="hour-line" />
      </svg>
      {temps.map((t, i) => <span key={i} className="hour-dot" style={{ left: `${((i + 0.5) / n) * 100}%`, top: `${y(t)}%` }} />)}
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
          <div className="wx-head mb-3">
            <i className={`bi bi-${iconOf(day)} display-3 text-primary wx-icon`} />
            <div className="wx-main">
              <div className="fw-bold mb-1">{dayLabel(day.date)}</div>
              <div className="display-5 fw-bold">
                <span className="text-danger">{day.max}°</span> / <span className="text-primary">{day.min}°</span>
              </div>
            </div>
            <div className="text-muted wx-detail">
              {day.rain !== '없음' ? day.rain : day.sky} · 강수확률 {day.pop}%{day.wind != null && ` · 바람 ${day.wind}m/s`}
            </div>
          </div>
        ) : (
          <div className="wx-head mb-3">
            <i className={`bi bi-${hourIconOf(now).icon} display-3 hour-icon wx-icon hour-${hourIconOf(now).kind}`} />
            <div className="wx-main">
              <div className="display-5 fw-bold">{now.temp}℃</div>
            </div>
            <div className="text-muted wx-detail">
              {now.rain !== '없음' ? now.rain : now.sky} · 강수확률 {now.pop}% · 바람 {now.wind}m/s · 습도 {now.humidity}%
            </div>
          </div>
        )}
        {/* 시간별 예보: 옆으로 밀어서 보는 슬라이드 */}
        <div className="hour-slider" tabIndex={0} aria-label="시간별 예보 (옆으로 밀어서 보기)">
          {/* 카드 줄과 그래프를 한 덩어리(track)로 묶어서 같이 밀리고, 칸 폭이 같아 점이 카드 아래에 맞아요 */}
          <div className="hour-track" style={{ width: `calc(${hours.length} * var(--hour-col))` }}>
            <div className="hour-cards">
              {hours.map((h) => <div key={h.time} className="hour-col"><HourBox h={h} /></div>)}
            </div>
            {hours.length > 1 && <TempLine temps={hours.map((h) => h.temp)} />}
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
