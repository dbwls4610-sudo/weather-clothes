import { useEffect, useState } from 'react'
import { Card, Col, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { ping } from '../api/client'
import { isSupabaseReady } from '../lib/supabase'

// 홈 = 소개 + "동작 체크" (React · Supabase 설정 · 서버 함수/Claude 키 확인)
export default function Home() {
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

  useEffect(() => {
    ping()
      .then((d) => setApi({ state: 'ok', msg: `OK · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}` }))
      .catch(() => setApi({ state: 'fail', msg: 'npm run dev 가 아니라 vercel dev 로 실행했는지 확인' }))
  }, [])

  const db = isSupabaseReady
    ? { state: 'ok', msg: '환경변수 설정됨' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / ANON_KEY 를 넣으세요' }

  return (
    <>
      <PageHeader icon="cloud-sun" title="제주 옷차림 알리미" subtitle="오늘 제주 날씨에 맞는 옷차림을 알려드려요." />
      {/* TODO: 날씨 조회 · 옷차림 추천 기능이 들어갈 자리 */}
      <h5 className="fw-bold mb-3"><i className="bi bi-clipboard-check me-2" />동작 체크</h5>
      <Row xs={1} md={3} className="g-3">
        <Col><Check title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" /></Col>
        <Col><Check title="Supabase" {...db} /></Col>
        <Col><Check title="서버 함수 /api · Claude" {...api} /></Col>
      </Row>
    </>
  )
}

function Check({ title, state, msg }) {
  const icon = { ok: 'check-circle-fill text-success', fail: 'x-circle-fill text-danger', wait: 'hourglass-split text-muted' }[state]
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="fw-bold mb-1"><i className={`bi bi-${icon} me-2`} />{title}</div>
        <div className="small text-muted">{msg}</div>
      </Card.Body>
    </Card>
  )
}
