import TempBadge from './TempBadge'
import { iconOf } from '../lib/weather'

// 사진과 함께 기록하는 날씨 한 장 요약 — 날씨 아이콘, 기온, 기온 구간, 지역, 바람, 오전/오후
// w: todaySnapshot() 이 만든 값 (예전에 저장한 기록은 sky 등이 없을 수 있어요)
export default function WeatherSnapshot({ w }) {
  const hasDay = w.sky !== undefined && w.min !== undefined
  // 지난 날짜에 나중에 올린 사진은 그날 날씨를 알 수 없어서 비어 있어요
  if (!hasDay && w.temp == null) return <div className="small text-muted"><i className="bi bi-cloud-slash me-1" />이 날의 날씨는 기록되지 않았어요</div>

  const weatherLine = [
    hasDay && (w.rain !== '없음' ? w.rain : w.sky),
    hasDay && w.pop != null && `강수확률 ${w.pop}%`,
    w.wind != null && `바람 ${w.wind}m/s`,
  ].filter(Boolean).join(', ')

  return (
    <div className="d-flex align-items-center">
      {hasDay && <i className={`bi bi-${iconOf(w)} display-5 text-primary me-3`} />}
      <div>
        <div className="d-flex align-items-center flex-wrap gap-2">
          {hasDay
            ? <span className="fs-5 fw-bold"><span className="text-danger">{w.max}°</span> / <span className="text-primary">{w.min}°</span></span>
            : <span className="fs-5 fw-bold">{w.temp}℃</span>}
          {w.label && <TempBadge label={w.label} />}
        </div>
        {/* 장소 한 줄, 그 아래에 "구름많음, 강수확률 30%, 바람 3.5m/s" 를 한 줄로 */}
        <div className="small text-muted">
          {w.place && <div>{w.place}</div>}
          {weatherLine && <div className="snap-weather">{weatherLine}</div>}
        </div>
        {(w.am || w.pm) && (
          <div className="small mt-1 d-flex flex-wrap gap-3">
            {w.am && <Half name="오전" h={w.am} />}
            {w.pm && <Half name="오후" h={w.pm} />}
          </div>
        )}
      </div>
    </div>
  )
}

function Half({ name, h }) {
  return (
    <span>
      <span className="text-muted me-1">{name}</span>
      <i className={`bi bi-${iconOf(h)} text-primary me-1`} />
      {h.rain !== '없음' ? h.rain : h.sky} {h.min}~{h.max}°
    </span>
  )
}
