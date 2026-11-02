// 입어 본 느낌: 값은 2(많이 더움) ~ 0(딱 좋음) ~ -2(많이 추움). DB 의 outfit_logs.feel 에 숫자로 저장돼요.
// 보여주는 순서도 이 배열 순서(더운 쪽이 먼저)예요. color 는 버튼·표시의 대표 색.
const FEELS = [
  { value: 2, label: '많이 더웠어요', icon: 'brightness-high', color: '#d93636' },      // 빨강
  { value: 1, label: '조금 더웠어요', icon: 'thermometer-high', color: '#ec8a1c' },     // 주황 (빨강과 구별되고 흰 배경에서도 보이는 정도)
  { value: 0, label: '딱 좋았어요', icon: 'emoji-smile', color: '#2f9e75' },           // 초록
  { value: -1, label: '조금 추웠어요', icon: 'thermometer-low', color: '#5fc0ee' },    // 연한 하늘색
  { value: -2, label: '많이 추웠어요', icon: 'snow', color: '#1f3a6b' },              // 남색
]

// 고르는 버튼들. 같은 버튼을 한 번 더 누르면 선택이 풀려요.
export default function FeelPicker({ value, onChange, disabled }) {
  return (
    <div>
      <div className="fs-6 fw-bold text-body mb-2">오늘 옷, 입어 보니 어땠나요?</div>
      <div className="d-flex flex-wrap gap-2 feel-btns" role="group" aria-label="입어 본 느낌">
        {FEELS.map((f) => {
          const on = value === f.value
          return (
            <button
              key={f.value}
              type="button"
              className="btn btn-sm"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? null : f.value)}
              style={{ borderColor: f.color, background: on ? f.color : 'transparent', color: on ? '#fff' : f.color }}
            >
              <i className={`bi bi-${f.icon} me-1`} />{f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 달력 칸 같은 좁은 곳에 쓰는 작은 색 점
export function FeelDot({ value }) {
  const f = FEELS.find((x) => x.value === value)
  if (!f) return null
  return <span className="feel-dot" style={{ background: f.color }} title={f.label} />
}

// 기록 카드에 작게 보여주는 표시
export function FeelBadge({ value }) {
  const f = FEELS.find((x) => x.value === value)
  if (!f) return null
  return (
    <span className="badge" style={{ background: f.color, color: '#fff' }}>
      <i className={`bi bi-${f.icon} me-1`} />{f.label}
    </span>
  )
}
