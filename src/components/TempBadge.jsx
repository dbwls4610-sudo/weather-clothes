import { labelColor } from '../lib/outfit'

// '쌀쌀함' '추움' 같은 기온 구간 배지 — 구간마다 정해진 색(빨강·주황·노랑·초록·하늘·파랑…)으로 보입니다
export default function TempBadge({ label, className = '' }) {
  const { bg, fg } = labelColor(label)
  return (
    <span className={`badge ${className}`} style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  )
}
