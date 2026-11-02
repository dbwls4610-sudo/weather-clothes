import { Button, Card, Modal } from 'react-bootstrap'
import { FeelBadge } from './FeelPicker'
import WeatherSnapshot from './WeatherSnapshot'
import { dayLabel } from '../lib/weather'

const toYmd = (isoDate) => isoDate.replaceAll('-', '')

// 과거와 오늘의 최고/최저 두 줄. 글자 폭이 달라도 숫자와 "/" 가 세로로 같은 자리에 오도록 칸(grid)으로 맞춤
//   과거: 17 / 8
//   오늘: 16 / 14   (숫자와 "/" 는 각자 칸의 가운데)
//   차이: -1 / +6   (오늘 − 과거, 진하게. + 는 빨강, - 는 파랑)
// strong 은 "차이" 줄: 진하게, 숫자는 + 면 빨강 / - 면 파랑 (0 은 기본 색)
const diffColor = (v) => (String(v).startsWith('+') ? ' diff-plus' : String(v).startsWith('-') ? ' diff-minus' : '')
function TempRow({ name, t, strong }) {
  const num = (v) => `temp-num${strong ? ` fw-bold text-body${diffColor(v)}` : ''}`
  return (
    <>
      <span className={strong ? 'fw-bold text-body' : ''}>{name}:</span>
      <span className={num(t.max)}>{t.max ?? '-'}</span>
      <span>{t.min != null ? '/' : ''}</span>
      <span className={num(t.min)}>{t.min ?? ''}</span>
    </>
  )
}

// 오늘 − 과거 (화면에 보이는 반올림한 숫자끼리 빼서, 눈으로 계산해도 맞음). +2 / -3 / 0. 최고·최저가 없는 예전 기록은 null
const signed = (n) => (n > 0 ? `+${n}` : String(n))
function diffOf(p) {
  const a = p.pastTemps, b = p.todayTemps
  if (a.max == null || a.min == null || b.max == null || b.min == null) return null
  return { max: signed(b.max - a.max), min: signed(b.min - a.min) }
}
function TempCompare({ p }) {
  const diff = diffOf(p)
  return (
    <div className="temp-compare small text-muted">
      <TempRow name="과거" t={p.pastTemps} />
      <TempRow name={p.todayName} t={p.todayTemps} />
      {diff && <TempRow name="차이" t={diff} strong />}
    </div>
  )
}

// "비슷한 날, 내가 입었던 옷" 카드 한 장 — 홈의 슬라이드와 더보기 페이지가 함께 씀
// p: recommendPast() 가 돌려준 기록, url: 사진 주소, onOpen: 누르면 자세히 보기
export default function PastCard({ p, url, onOpen }) {
  return (
    <Card className="h-100">
      <button type="button" className="my-photo-btn" onClick={() => onOpen(p)} aria-label={`${dayLabel(toYmd(p.log_date))} 기록 보기`}>
        {url ? <img src={url} alt={`${p.log_date} 입은 옷`} className="my-photo" /> : <div className="my-photo" />}
      </button>
      <Card.Body className="p-2">
        <div className="small fw-bold text-nowrap">{dayLabel(toYmd(p.log_date))}</div>
        {/* 느낌 표시는 항상 날짜 아래 줄. 느낌을 안 적은 기록도 줄 높이는 같게 비워 둠 */}
        <div className="mb-1 feel-row"><FeelBadge value={p.feel} /></div>
        <TempCompare p={p} />
      </Card.Body>
    </Card>
  )
}

// 카드를 눌렀을 때 뜨는 자세히 보기 창 (open 이 null 이면 닫힘)
export function PastModal({ open, url, onClose }) {
  return (
    <Modal show={Boolean(open)} onHide={onClose} centered fullscreen="sm-down">
      {open && (
        <>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5">{dayLabel(toYmd(open.log_date))}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {url && <img src={url} alt={`${open.log_date} 입은 옷`} className="w-100 rounded mb-3" />}
            <div className="mb-3">
              <WeatherSnapshot w={open.weather ?? { temp: open.temp, label: open.label, place: open.place }} />
            </div>
            <div className="d-flex align-items-center gap-2 mb-2"><FeelBadge value={open.feel} /></div>
            <div className="mb-2"><TempCompare p={open} /></div>
            {open.note && <p className="mb-0 note-text-full"><i className="bi bi-chat-left-text me-1 text-muted" />{open.note}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" size="sm" onClick={onClose}>닫기</Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}
