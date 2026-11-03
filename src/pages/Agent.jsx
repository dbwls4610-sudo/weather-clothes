import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import AgentPastCards from '../components/AgentPastCards'
import PageHeader from '../components/PageHeader'
import { placeLabel } from '../lib/places'
import { useAppStore } from '../store/useAppStore'

const DAILY_LIMIT = 10   // 서버(supabase/schema.sql)의 하루 질문 횟수와 같아야 해요
const EXAMPLES = ['내일 뭐 입고 나갈까?', '오늘과 비슷한 날 내가 입었던 옷은?', '이번 주말 서귀포 옷차림 알려줘']

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
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`msg ${m.role}`}>{m.text}</div>
              {/* 실제로 기상청 예보를 조회해서 답했을 때만 표시 */}
              {m.tools?.includes('get_weather') && (
                <div className="small text-muted mb-2"><i className="bi bi-cloud-check me-1" />기상청 예보를 확인하고 답했어요</div>
              )}
              {/* 비슷한 날 기록을 참고했으면 그 기록의 사진 카드 (사진은 내 화면에서만 불러옴) */}
              {m.past?.length > 0 && <AgentPastCards items={m.past} />}
            </div>
          ))}
          {loading && <div className="small text-muted"><Spinner size="sm" className="me-2" />날씨를 확인하고 답변을 만드는 중...</div>}
          <div ref={bottom} />
        </Card.Body>
      </Card>

      {noLeft && <Alert variant="warning" className="py-2 small">오늘 질문 {DAILY_LIMIT}번을 모두 사용했어요. 내일 다시 이용해 주세요.</Alert>}
      <div className="small text-muted mb-2">
        <i className="bi bi-shield-lock me-1" />
        내 기록(날짜·날씨·느낌·후기 글)은 추천에만 쓰이고, <b>옷 사진은 AI에게 보내지 않아요.</b> 사진은 답변 아래 카드에서 내 화면으로만 불러와요.
      </div>
      <Form onSubmit={(e) => { e.preventDefault(); ask(input) }}>
        <InputGroup>
          <Form.Control value={input} maxLength={500} disabled={noLeft} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading || noLeft}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </>
  )
}
