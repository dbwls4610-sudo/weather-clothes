import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import FeelPicker from './FeelPicker'
import NoteField, { NoteEditor } from './NoteField'
import WeatherSnapshot from './WeatherSnapshot'
import { PHOTO_BUCKET as BUCKET, isSupabaseReady, supabase } from '../lib/supabase'
import { friendlyError, saveOutfitLog } from '../lib/outfitPhotos'
import { todayKey } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

// 오늘 입은 옷 사진 올리기 — 로그인한 사용자만. 하루에 한 장, 그날의 날씨(기온·구간·지역)와 함께 저장
// weather: todaySnapshot() 이 만든 오늘 날씨 (기온·하늘·바람·오전/오후·기온 구간·지역)
export default function OutfitPhoto({ weather }) {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const toast = useAppStore((s) => s.toast)
  const date = todayKey()
  const fileInput = useRef(null)
  const [saved, setSaved] = useState(null)      // 오늘 이미 올린 기록 { photo_path, label, temp, place, url }
  const [picked, setPicked] = useState(null)    // 고른 사진 { file, preview }
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [feel, setFeel] = useState(null)        // 사진을 올리기 전에 고른 느낌 (-2 ~ 2, 안 골라도 돼요)
  const [note, setNote] = useState('')          // 사진을 올리기 전에 쓴 한 줄 후기 (안 써도 돼요)

  // 로그인하면 오늘 올린 사진이 있는지 불러옵니다
  useEffect(() => {
    if (!user || !supabase) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error: e } = await supabase.from('outfit_logs').select('*').eq('log_date', date).maybeSingle()
      if (cancelled) return
      if (e) {
        setError(e.message.includes('outfit_logs') ? '아직 데이터베이스 준비가 안 됐어요 (supabase/schema.sql 실행 필요)' : e.message)
      } else if (data) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(data.photo_path, 3600)
        if (!cancelled) setSaved({ ...data, url: signed?.signedUrl })
      } else {
        setSaved(null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, date])

  // 고른 미리보기 주소는 쓰고 나면 정리
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.preview) }, [picked])

  if (!isSupabaseReady || !authReady) return null

  if (!user) {
    return (
      <Card className="mb-4">
        <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div><i className="bi bi-camera me-2 text-primary" />로그인하면 <b>오늘 입은 옷 사진</b>을 날씨와 함께 기록할 수 있어요.</div>
          <Button as={Link} to="/login" size="sm"><i className="bi bi-box-arrow-in-right me-1" />로그인</Button>
        </Card.Body>
      </Card>
    )
  }

  const pick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('사진 파일만 올릴 수 있어요')
    setError('')
    setFeel(saved?.feel ?? null)   // 사진을 바꿀 때는 전에 고른 느낌과 후기를 이어받음
    setNote(saved?.note ?? '')
    setPicked({ file, preview: URL.createObjectURL(file) })
  }

  // 이미 올린 사진의 느낌만 바꾸기 (사진은 다시 올리지 않음)
  const changeFeel = async (value) => {
    setBusy(true)
    setError('')
    const { error: e } = await supabase.from('outfit_logs').update({ feel: value }).eq('log_date', date)
    if (e) setError(friendlyError(e))
    else setSaved((s) => ({ ...s, feel: value }))
    setBusy(false)
  }

  // 이미 올린 기록의 후기만 바꾸기
  const changeNote = async (value) => {
    setBusy(true)
    setError('')
    const { error: e } = await supabase.from('outfit_logs').update({ note: value }).eq('log_date', date)
    if (e) setError(friendlyError(e))
    else setSaved((s) => ({ ...s, note: value }))
    setBusy(false)
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const row = await saveOutfitLog({ userId: user.id, date, file: picked.file, weather, feel, note })
      setSaved(row)
      setPicked(null)
      toast('오늘의 옷 사진을 저장했어요')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('오늘 올린 사진을 지울까요?')) return
    setBusy(true)
    setError('')
    try {
      await supabase.storage.from(BUCKET).remove([saved.photo_path])
      const { error: e } = await supabase.from('outfit_logs').delete().eq('log_date', date)
      if (e) throw e
      setSaved(null)
      toast('사진을 지웠어요')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title className="fw-bold">
          <i className="bi bi-camera me-2 text-primary" />오늘 입은 옷
        </Card.Title>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        {loading && <Spinner size="sm" />}

        {/* 고른 사진 미리보기 → 저장 */}
        {picked && (
          <div>
            <img src={picked.preview} alt="고른 사진 미리보기" className="outfit-photo mb-2" />
            <div className="small text-muted mb-3">저장하면 오늘 날씨(기온·하늘·바람·지역)도 함께 기록돼요.</div>
            <div className="mb-3"><FeelPicker value={feel} onChange={setFeel} disabled={busy} /></div>
            <div className="mb-3"><NoteField value={note} onChange={setNote} disabled={busy} /></div>
            <div className="d-flex gap-2">
              <Button onClick={save} disabled={busy}>
                {busy ? <><Spinner size="sm" className="me-2" />저장 중...</> : <><i className="bi bi-cloud-upload me-1" />저장</>}
              </Button>
              <Button variant="outline-secondary" onClick={() => setPicked(null)} disabled={busy}>취소</Button>
            </div>
          </div>
        )}

        {/* 오늘 이미 올린 사진 */}
        {!picked && saved && (
          <div>
            {saved.url && <img src={saved.url} alt="오늘 입은 옷" className="outfit-photo mb-2" />}
            <div className="mb-3">
              <div className="small text-muted mb-1">기록한 날씨</div>
              {/* weather 는 새 기록의 전체 날씨, 예전 기록은 기온·구간·지역만 있어요 */}
              <WeatherSnapshot w={saved.weather ?? { temp: saved.temp, label: saved.label, place: saved.place }} />
            </div>
            <div className="mb-3"><FeelPicker value={saved.feel ?? null} onChange={changeFeel} disabled={busy} /></div>
            <div className="mb-3"><NoteEditor key={saved.log_date} value={saved.note} onSave={changeNote} disabled={busy} /></div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" onClick={() => fileInput.current.click()} disabled={busy}>
                <i className="bi bi-arrow-repeat me-1" />다른 사진으로 바꾸기
              </Button>
              <Button variant="outline-danger" size="sm" onClick={remove} disabled={busy}>
                <i className="bi bi-trash me-1" />지우기
              </Button>
            </div>
          </div>
        )}

        {/* 아직 안 올렸을 때 */}
        {!picked && !saved && !loading && (
          <button type="button" className="outfit-drop" onClick={() => fileInput.current.click()}>
            <i className="bi bi-camera fs-1 d-block mb-1" />
            오늘 입은 옷 사진 올리기
          </button>
        )}

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={pick} />
      </Card.Body>
    </Card>
  )
}
