import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { placeLabel } from '../lib/places'
import { useAppStore } from '../store/useAppStore'

const DAILY_LIMIT = 10   // 서버(supabase/schema.sql)의 하루 질문 횟수와 같아야 해요
const EXAMPLES = ['오늘 뭐 입고 나갈까?', '내일 비 오면 신발은 뭐가 좋아?', '이번 주말 서귀포 옷차림 알려줘']

export default function Agent() {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const agentLeft = useAppStore((s) => s.agentLeft)
  const loadAgentLeft = useAppStore((s) => s.loadAgentLeft)
  const weather = useAppStore((s) => s.weather)
  const weatherPlace = useAppStore((s) => s.weatherPlace)
  const [input, setInput] = useState('')
  const bottom = useRef(null)

  useEffect(() => { loadAgentLeft() }, [user, loadAgentLeft])               // 오늘 남은 질문 횟수
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages, loading])   // 새 답변이 보이게

  const header = <PageHeader icon="robot" title="AI 도우미" subtitle="지금 제주 날씨를 확인해서 입을 옷을 알려드려요" />

  if (!authReady) return <Spinner />
  if (!user) {
    return (
      <>
        {header}
        <Alert variant="secondary" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          AI 도우미는 로그인한 뒤에 이용할 수 있어요. (하루 {DAILY_LIMIT}번)
          <Button as={Link} to="/login" size="sm">로그인</Button>
        </Alert>
      </>
    )
  }

  const noLeft = agentLeft === 0
  const area = weather ? (weatherPlace === 'mine' ? '내 위치' : placeLabel(weatherPlace)) : null

  function ask(text) {
    if (!text.trim() || loading || noLeft) return
    sendMessage(text.trim())
    setInput('')
  }

  return (
    <>
      {header}

      <div className="d-flex flex-wrap justify-content-between gap-2 small text-muted mb-2">
        <span>
          <i className="bi bi-geo-alt me-1" />
          {area ? `지금 보는 지역: ${area}` : '홈에서 지역을 고르고 날씨를 보면 그 지역 기준으로 답해요 (아니면 제주시 기준)'}
        </span>
        <span>오늘 남은 질문 {agentLeft ?? '-'}/{DAILY_LIMIT}번</span>
      </div>

      <Card className="chat-box mb-3">
        <Card.Body>
          {messages.length === 0 && (
            <div>
              <div className="text-muted mb-2">이렇게 물어보세요</div>
              <div className="d-flex flex-wrap gap-2">
                {EXAMPLES.map((t) => (
                  <Button key={t} variant="outline-primary" size="sm" disabled={loading || noLeft} onClick={() => ask(t)}>{t}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.text}</div>)}
          {loading && <div className="small text-muted"><Spinner size="sm" className="me-2" />날씨를 확인하고 답변을 만드는 중...</div>}
          <div ref={bottom} />
        </Card.Body>
      </Card>

      {noLeft && <Alert variant="warning" className="py-2 small">오늘 질문 {DAILY_LIMIT}번을 모두 사용했어요. 내일 다시 이용해 주세요.</Alert>}
      <Form onSubmit={(e) => { e.preventDefault(); ask(input) }}>
        <InputGroup>
          <Form.Control value={input} maxLength={500} disabled={noLeft} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading || noLeft}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </>
  )
}
