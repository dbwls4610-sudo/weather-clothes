import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, ButtonGroup, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { fetchObserved } from '../api/client'
import FeelPicker, { FeelBadge, FeelDot } from '../components/FeelPicker'
import NoteField, { NoteEditor } from '../components/NoteField'
import PlaceSelect from '../components/PlaceSelect'
import PageHeader from '../components/PageHeader'
import WeatherSnapshot from '../components/WeatherSnapshot'
import { PHOTO_BUCKET, isSupabaseReady, supabase } from '../lib/supabase'
import { friendlyError, saveOutfitLog } from '../lib/outfitPhotos'
import { recommendDay, recommendOutfit } from '../lib/outfit'
import { placeById, placeLabel } from '../lib/places'
import { dayLabel, iconOf, todayKey, todaySnapshot } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

// 내가 올린 옷 사진 모아 보기 — 최근 날짜가 위로
const toYmd = (isoDate) => isoDate.replaceAll('-', '')
const yearOf = (isoDate) => isoDate.slice(0, 4)

// 기록(최근 날짜가 먼저)을 연도별로 묶기: [{ year: '2026', items: [...] }, { year: '2025', items: [...] }]
function yearGroups(logs) {
  const groups = []
  for (const log of logs) {
    const year = yearOf(log.log_date)
    if (groups.at(-1)?.year !== year) groups.push({ year, items: [] })
    groups.at(-1).items.push(log)
  }
  return groups
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 달력으로 보기: 한 달씩, 사진을 올린 날에는 사진 칸이 보이고 누르면 자세히 봅니다
function CalendarView({ logs, onOpen, onAdd }) {
  const today = todayKey()                                  // "2026-11-02"
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const byDate = useMemo(() => Object.fromEntries(logs.map((l) => [l.log_date, l])), [logs])

  const { y, m } = cursor
  const lead = new Date(y, m, 1).getDay()                   // 1일이 무슨 요일인지 (일요일 = 0)
  const total = new Date(y, m + 1, 0).getDate()             // 그 달의 마지막 날짜
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  const keyOf = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const count = cells.filter((d) => d && byDate[keyOf(d)]).length

  // 연도 선택 목록: 가장 오래된 기록의 해부터 내년까지 (기록이 없으면 올해 -1 ~ 내년)
  const thisYear = Number(today.slice(0, 4))
  const firstYear = Math.min(thisYear - 1, y, ...logs.map((l) => Number(l.log_date.slice(0, 4))))
  const years = Array.from({ length: thisYear + 1 - firstYear + 1 }, (_, i) => firstYear + i)
  const isThisMonth = y === thisYear && m === Number(today.slice(5, 7)) - 1

  const move = (delta) => setCursor(({ y: cy, m: cm }) => {
    const d = new Date(cy, cm + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  return (
    <Card className="cal-card">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <Button variant="outline-secondary" size="sm" onClick={() => move(-1)} aria-label="이전 달"><i className="bi bi-chevron-left" /></Button>
          <div className="text-center">
            {/* 연도와 월을 골라서 바로 그 달로 이동 */}
            <div className="d-flex align-items-center justify-content-center gap-1">
              <Form.Select className="cal-select" aria-label="연도 선택" value={y} onChange={(e) => setCursor({ y: Number(e.target.value), m })}>
                {years.map((yr) => <option key={yr} value={yr}>{yr}년</option>)}
              </Form.Select>
              <Form.Select className="cal-select" aria-label="월 선택" value={m} onChange={(e) => setCursor({ y, m: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i + 1}월</option>)}
              </Form.Select>
            </div>
            <div className="small text-muted mt-1">
              {count}일 기록
              {!isThisMonth && <Button variant="link" size="sm" className="p-0 ms-2 align-baseline" onClick={() => setCursor({ y: thisYear, m: Number(today.slice(5, 7)) - 1 })}>오늘로</Button>}
            </div>
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => move(1)} aria-label="다음 달"><i className="bi bi-chevron-right" /></Button>
        </div>

        <div className="cal-grid mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center small fw-bold ${i === 0 ? 'text-danger' : i === 6 ? 'text-primary' : 'text-muted'}`}>{w}</div>
          ))}
        </div>
        <div className="cal-grid" style={{ '--cal-rows': Math.ceil(cells.length / 7) }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`blank-${i}`} />
            const key = keyOf(d)
            const log = byDate[key]
            const cls = `cal-cell${key === today ? ' cal-today' : ''}${log ? ' cal-has' : ''}`
            const num = <span className="cal-num">{d}</span>
            if (!log) {
              // 사진이 없는 날: 오늘과 지난 날짜는 눌러서 사진을 넣을 수 있고, 앞으로 올 날짜는 막아 둠
              if (key > today) return <div key={key} className={`${cls} cal-future`}>{num}</div>
              return (
                <button key={key} type="button" className={`${cls} cal-empty`} onClick={() => onAdd(key)} aria-label={`${m + 1}월 ${d}일 사진 올리기`}>
                  {num}
                  <i className="bi bi-plus-lg cal-plus" />
                </button>
              )
            }
            const w = log.weather
            return (
              <button key={key} type="button" className={cls} onClick={() => onOpen(log)} aria-label={`${m + 1}월 ${d}일 기록 보기`}>
                {log.url && <img src={log.url} alt="" className="cal-photo" loading="lazy" />}
                {num}
                <span className="cal-meta">
                  {w?.sky && <i className={`bi bi-${iconOf(w)}`} />}
                  <FeelDot value={log.feel} />
                </span>
              </button>
            )
          })}
        </div>
      </Card.Body>
    </Card>
  )
}

// 달력에서 빈 날짜를 눌렀을 때: 그 날짜의 옷 사진을 나중에 올리기
function AddPhotoModal({ date, onClose, onSaved }) {
  const user = useAppStore((s) => s.user)
  const toast = useAppStore((s) => s.toast)
  const loadedWeather = useAppStore((s) => s.weather)
  const weatherPlace = useAppStore((s) => s.weatherPlace)
  const fileInput = useRef(null)
  const [picked, setPicked] = useState(null)   // { file, preview }
  const [feel, setFeel] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 오늘 날짜면 홈에서 불러온 예보 날씨를, 지난 날짜면 그날의 관측 날씨(가까운 관측소)를 함께 기록합니다
  const isToday = date === todayKey()
  const storePlace = useAppStore((s) => s.place)
  const [region, setRegion] = useState(placeById(storePlace) ? storePlace : 'jeju')   // 지난 날짜에 있던 지역
  // 관측 날씨 조회 결과. key 가 지금 고른 날짜·지역과 다르면 아직 불러오는 중으로 봅니다
  const [obs, setObs] = useState({ key: '', data: null, error: '' })
  const obsKey = `${date}|${region}`
  const obsStatus = isToday ? 'idle' : obs.key !== obsKey ? 'loading' : obs.data ? 'ok' : 'fail'

  useEffect(() => {
    if (isToday) return
    const spot = placeById(region)
    let cancelled = false
    fetchObserved(date, spot.lat, spot.lon)
      .then((data) => { if (!cancelled) setObs({ key: obsKey, data, error: '' }) })
      .catch((e) => { if (!cancelled) setObs({ key: obsKey, data: null, error: e.message }) })
    return () => { cancelled = true }
  }, [date, region, isToday, obsKey])

  const weather = isToday
    ? (loadedWeather
      ? todaySnapshot(loadedWeather, { label: recommendOutfit(loadedWeather.hours).label, place: weatherPlace === 'mine' ? '내 위치' : placeLabel(weatherPlace) })
      : null)
    : (obsStatus === 'ok'
      ? {
        ...obs.data, pop: null, temp: null, place: placeLabel(region),
        label: recommendDay({ min: obs.data.min, max: obs.data.max, pop: 0, wind: obs.data.wind ?? 0, rain: obs.data.rain }).label,
      }
      : null)

  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.preview) }, [picked])

  const pick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('사진 파일만 올릴 수 있어요')
    setError('')
    setPicked({ file, preview: URL.createObjectURL(file) })
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      onSaved(await saveOutfitLog({ userId: user.id, date, file: picked.file, weather, feel, note }))
      toast(`${dayLabel(toYmd(date))} 사진을 저장했어요`)
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{dayLabel(toYmd(date))} 옷 사진 올리기</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        {picked ? (
          <img src={picked.preview} alt="고른 사진 미리보기" className="outfit-photo mb-3" />
        ) : (
          <button type="button" className="outfit-drop mb-3" onClick={() => fileInput.current.click()}>
            <i className="bi bi-camera fs-1 d-block mb-1" />
            그날 입은 옷 사진 고르기
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={pick} />

        {isToday ? (
          <div className="small text-muted mb-3">
            {weather
              ? <>오늘 날씨({weather.place} · {weather.min}~{weather.max}°)도 함께 저장돼요.</>
              : <>홈에서 날씨를 먼저 불러오면 오늘 날씨도 함께 저장돼요.</>}
          </div>
        ) : (
          <div className="mb-3">
            <div className="small text-muted mb-1">그날 있던 지역 (가까운 관측소에서 잰 그날 날씨가 함께 저장돼요)</div>
            <div className="d-flex flex-wrap gap-2 mb-2"><PlaceSelect value={region} onChange={setRegion} disabled={busy} /></div>
            {obsStatus === 'loading' && <div className="small text-muted"><Spinner size="sm" className="me-2" />그날 날씨를 불러오는 중...</div>}
            {obsStatus === 'ok' && weather && <WeatherSnapshot w={weather} />}
            {obsStatus === 'fail' && (
              <Alert variant="warning" className="py-2 small mb-0">그날 날씨를 불러오지 못했어요 ({obs.error}). 날씨 없이 사진만 저장할 수도 있어요.</Alert>
            )}
          </div>
        )}

        <div className="mb-3"><FeelPicker value={feel} onChange={setFeel} disabled={busy} /></div>
        <NoteField value={note} onChange={setNote} disabled={busy} />
      </Modal.Body>
      <Modal.Footer>
        {picked && (
          <Button variant="outline-secondary" size="sm" onClick={() => fileInput.current.click()} disabled={busy}>다른 사진 고르기</Button>
        )}
        <Button onClick={save} disabled={!picked || busy || obsStatus === 'loading'}>
          {busy ? <><Spinner size="sm" className="me-2" />저장 중...</> : <><i className="bi bi-cloud-upload me-1" />저장</>}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default function MyPage() {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const toast = useAppStore((s) => s.toast)
  const [logs, setLogs] = useState(null)     // null = 불러오는 중
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)     // 크게 보는 기록
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('calendar')   // 'calendar' | 'list'
  const [adding, setAdding] = useState(null)     // 사진을 새로 올리려는 날짜 ("2026-11-01")
  const [selecting, setSelecting] = useState(false)   // 목록에서 여러 장 골라 지우는 중
  const [selected, setSelected] = useState(() => new Set())   // 고른 기록의 날짜들

  useEffect(() => {
    if (!user || !supabase) return
    let cancelled = false
    ;(async () => {
      const { data, error: e } = await supabase.from('outfit_logs').select('*').order('log_date', { ascending: false }).limit(400)
      if (cancelled) return
      if (e) {
        setError(e.message.includes('outfit_logs') ? '아직 데이터베이스 준비가 안 됐어요 (supabase/schema.sql 실행 필요)' : e.message)
        return setLogs([])
      }
      // 사진은 비공개라서 잠깐 쓸 수 있는 주소(1시간)를 한꺼번에 받아 옵니다
      const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(data.map((d) => d.photo_path), 3600)
      const urls = Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl]))
      setLogs(data.map((d) => ({ ...d, url: urls[d.photo_path] })))
    })()
    return () => { cancelled = true }
  }, [user])

  // 기록의 후기 글만 바꾸기
  const changeNote = async (log, value) => {
    setBusy(true)
    const { error: e } = await supabase.from('outfit_logs').update({ note: value }).eq('log_date', log.log_date)
    if (e) toast(friendlyError(e), 'danger')
    else {
      setLogs((all) => all.map((l) => (l.log_date === log.log_date ? { ...l, note: value } : l)))
      setOpen((o) => ({ ...o, note: value }))
    }
    setBusy(false)
  }

  // 기록의 "입어 본 느낌"만 바꾸기
  const changeFeel = async (log, value) => {
    setBusy(true)
    const { error: e } = await supabase.from('outfit_logs').update({ feel: value }).eq('log_date', log.log_date)
    if (e) toast(e.message, 'danger')
    else {
      setLogs((all) => all.map((l) => (l.log_date === log.log_date ? { ...l, feel: value } : l)))
      setOpen((o) => ({ ...o, feel: value }))
    }
    setBusy(false)
  }

  const remove = async (log) => {
    if (!window.confirm(`${dayLabel(toYmd(log.log_date))} 사진을 지울까요?`)) return
    setBusy(true)
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove([log.photo_path])
      const { error: e } = await supabase.from('outfit_logs').delete().eq('log_date', log.log_date)
      if (e) throw e
      setLogs((all) => all.filter((l) => l.log_date !== log.log_date))
      setOpen(null)
      toast('사진을 지웠어요')
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  // 목록에서 고른 기록들을 한꺼번에 지우기
  const toggleSelect = (date) => setSelected((s) => {
    const next = new Set(s)
    if (next.has(date)) next.delete(date)
    else next.add(date)
    return next
  })
  const exitSelect = () => { setSelecting(false); setSelected(new Set()) }
  const removeSelected = async () => {
    const targets = logs.filter((l) => selected.has(l.log_date))
    if (!targets.length || !window.confirm(`선택한 ${targets.length}장을 지울까요? 되돌릴 수 없어요.`)) return
    setBusy(true)
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove(targets.map((l) => l.photo_path))
      const { error: e } = await supabase.from('outfit_logs').delete().in('log_date', targets.map((l) => l.log_date))
      if (e) throw e
      setLogs((all) => all.filter((l) => !selected.has(l.log_date)))
      toast(`${targets.length}장을 지웠어요`)
      exitSelect()
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseReady) return <Alert variant="warning">Supabase 설정이 없어서 마이페이지를 쓸 수 없어요.</Alert>
  if (!authReady) return <Spinner />
  if (!user) {
    return (
      <>
        <PageHeader icon="person-circle" title="마이페이지" subtitle="내가 올린 옷 사진을 모아 볼 수 있어요." />
        <Alert variant="secondary" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          로그인하면 볼 수 있어요.
          <Button as={Link} to="/login" size="sm">로그인</Button>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader icon="person-circle" title="마이페이지" aside={user.email} subtitle="내가 올린 옷 사진을 날씨와 함께 모아 봤어요." />

      {error && <Alert variant="danger">{error}</Alert>}
      {logs === null && <Spinner />}
      {logs?.length === 0 && !error && (
        <Alert variant="secondary" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          아직 올린 사진이 없어요. 아래 달력에서 날짜를 눌러 사진을 올리거나, 홈에서 오늘 날씨와 함께 올려 보세요.
          <Button as={Link} to="/" size="sm">홈으로</Button>
        </Alert>
      )}

      {logs?.length > 0 && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="small text-muted">모두 {logs.length}장</span>
            <ButtonGroup size="sm" aria-label="보기 방식">
              <Button variant={view === 'calendar' ? 'primary' : 'outline-primary'} onClick={() => { setView('calendar'); exitSelect() }}>
                <i className="bi bi-calendar3 me-1" />달력
              </Button>
              <Button variant={view === 'list' ? 'primary' : 'outline-primary'} onClick={() => setView('list')}>
                <i className="bi bi-grid me-1" />목록
              </Button>
            </ButtonGroup>
          </div>
        </>
      )}

      {logs && (view === 'calendar' || logs.length === 0) && <CalendarView logs={logs} onOpen={setOpen} onAdd={setAdding} />}

      {/* 달력에서 빈 날짜를 눌렀을 때 */}
      {adding && (
        <AddPhotoModal
          key={adding}
          date={adding}
          onClose={() => setAdding(null)}
          onSaved={(row) => {
            setLogs((all) => [row, ...all.filter((l) => l.log_date !== row.log_date)].sort((a, b) => b.log_date.localeCompare(a.log_date)))
            setAdding(null)
          }}
        />
      )}

      {logs?.length > 0 && view === 'list' && (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            {selecting ? (
              <>
                <span className="small fw-bold me-auto">{selected.size}장 선택됨</span>
                <Button variant="outline-secondary" size="sm" onClick={() => setSelected(selected.size === logs.length ? new Set() : new Set(logs.map((l) => l.log_date)))} disabled={busy}>
                  {selected.size === logs.length ? '선택 해제' : '모두 선택'}
                </Button>
                <Button variant="danger" size="sm" onClick={removeSelected} disabled={busy || selected.size === 0}>
                  <i className="bi bi-trash me-1" />지우기
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={exitSelect} disabled={busy}>취소</Button>
              </>
            ) : (
              <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={() => setSelecting(true)}>
                <i className="bi bi-check2-square me-1" />선택
              </Button>
            )}
          </div>
          {/* 연도마다 제목 줄을 먼저 두고, 그 아래 줄부터 카드를 배열해요 (카드마다 제목을 끼우면 첫 카드가 밀려서 줄이 어긋남) */}
          {yearGroups(logs).map(({ year, items }) => (
            <section key={year} className="mb-4">
              <h5 className="fw-bold text-muted mb-3">{year}년</h5>
              <Row xs={1} sm={2} lg={3} className="g-3">
                {items.map((log) => (
                  <Col key={log.log_date}>
                    <Card className={`h-100 position-relative${selecting && selected.has(log.log_date) ? ' border-danger border-2' : ''}`}>
                      {selecting && (
                        <Form.Check
                          type="checkbox" className="position-absolute top-0 start-0 m-2 fs-4" style={{ zIndex: 2 }}
                          checked={selected.has(log.log_date)} onChange={() => toggleSelect(log.log_date)}
                          aria-label={`${dayLabel(toYmd(log.log_date))} 선택`}
                        />
                      )}
                      <button type="button" className="my-photo-btn" onClick={() => (selecting ? toggleSelect(log.log_date) : setOpen(log))} aria-label={`${dayLabel(toYmd(log.log_date))} 사진 크게 보기`}>
                        {log.url ? <img src={log.url} alt={`${log.log_date} 입은 옷`} className="my-photo" /> : <div className="my-photo d-flex align-items-center justify-content-center text-muted">사진 없음</div>}
                      </button>
                      <Card.Body>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-bold">{dayLabel(toYmd(log.log_date))}</span>
                          <FeelBadge value={log.feel} />
                        </div>
                        <WeatherSnapshot w={log.weather ?? { temp: log.temp, label: log.label, place: log.place }} />
                        {log.note && <p className="small mt-2 mb-0 note-text"><i className="bi bi-chat-left-text me-1 text-muted" />{log.note}</p>}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </section>
          ))}
        </>
      )}

      {/* 크게 보기 */}
      <Modal show={Boolean(open)} onHide={() => setOpen(null)} centered fullscreen="sm-down">
        {open && (
          <>
            <Modal.Header closeButton>
              <Modal.Title className="fs-5">{dayLabel(toYmd(open.log_date))}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {open.url && <img src={open.url} alt={`${open.log_date} 입은 옷`} className="w-100 rounded mb-3" />}
              <div className="mb-3">
                <WeatherSnapshot w={open.weather ?? { temp: open.temp, label: open.label, place: open.place }} />
              </div>
              <div className="mb-3"><FeelPicker value={open.feel ?? null} onChange={(v) => changeFeel(open, v)} disabled={busy} /></div>
              <NoteEditor key={open.log_date} value={open.note} onSave={(v) => changeNote(open, v)} disabled={busy} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-danger" size="sm" onClick={() => remove(open)} disabled={busy}>
                <i className="bi bi-trash me-1" />지우기
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  )
}
